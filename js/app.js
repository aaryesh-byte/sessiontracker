// Shared application state and helpers.
let appState = {
      currentUser: null,
      authMode: 'login',
      isAuthenticating: false,
      recoveryStep: 'request', // 'request' | 'verify' | 'reset'
      recoveryEmail: '',
      resetToken: '',
      resendCooldownSec: 0,
      resendInterval: null,
      sessions: [],
      customTricks: [],
      sessionItems: [],
      calcSlots: [],
      deletingTrickId: null,
      charts: {}
    };

async function handleAuthSubmit(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      if (appState.isAuthenticating) return false;

      const uEl = document.getElementById('authUsername');
      const pEl = document.getElementById('authPassword');
      const sEl = document.getElementById('authSkaterName');
      const btn = document.getElementById('authSubmitBtn');

      const u = uEl ? uEl.value.trim() : '';
      const p = pEl ? pEl.value.trim() : '';
      const skaterName = sEl ? sEl.value.trim() : '';

      if (!u || !p) {
        showToast('Please enter both username and password.', 'warning');
        return false;
      }

      if (appState.authMode === 'register' && !skaterName) {
        showToast('Please enter your full skater name.', 'warning');
        return false;
      }

      appState.isAuthenticating = true;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span>⏳ ${appState.authMode === 'register' ? 'Creating Account...' : 'Verifying...'}</span>`;
      }

      try {
        if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === "YOUR_APPS_SCRIPT_WEB_APP_URL") {
          throw new Error('Google Apps Script URL is not configured in js/config.js.');
        }

        const payload = { username: u, password: p, skaterName: skaterName };
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: appState.authMode, payload: payload })
        });

        const json = await response.json();

        if (json.status === 'success') {
          const authenticatedUser = json.user || {
            username: u,
            skaterName: skaterName || u,
            userId: u
          };

          appState.currentUser = authenticatedUser;
          appState.sessions = (json.data && Array.isArray(json.data.sessions)) ? json.data.sessions : [];
          appState.customTricks = (json.data && Array.isArray(json.data.customTricks)) ? json.data.customTricks : [];

          if (appState.authMode === 'register') {
            showToast(`Registration complete: Welcome ${authenticatedUser.skaterName}!`, 'success');
          } else {
            showToast(`Welcome back, ${authenticatedUser.skaterName}!`, 'success');
          }

          onAuthSuccess();
        } else {
          const rawMsg = (json.message || '').toLowerCase();

          if (rawMsg.includes('password') || rawMsg.includes('invalid credential') || rawMsg.includes('wrong pass')) {
            showToast('Incorrect password. Please enter your password again.', 'error');
            if (pEl) {
              pEl.value = '';
              pEl.focus();
            }
          } else if (rawMsg.includes('already exists') || rawMsg.includes('duplicate')) {
            showToast('Username already exists. Please choose a different username.', 'error');
          } else if (rawMsg.includes('not found') || rawMsg.includes('no user') || rawMsg.includes('does not exist')) {
            showToast('Account not found. Please verify username or register.', 'error');
          } else {
            showToast(json.message || 'Authentication failed. Please try again.', 'error');
          }
        }

      } catch (err) {
        console.error('Auth Error:', err);
        showToast(err.message || 'Network error connecting to backend.', 'error');
      } finally {
        appState.isAuthenticating = false;
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<span>${appState.authMode === 'register' ? 'Create Protocol' : 'Log In'}</span>`;
        }
      }

      return false;
    }
  
    function safeSetInnerHTML(id, html) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    }

    function safeSetTextContent(id, text) {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    }

    window.addEventListener('DOMContentLoaded', () => {
      const savedTheme = localStorage.getItem('slalom_theme') || 'dark';
      applyTheme(savedTheme);

      const loginForm = document.getElementById('loginForm');
      if (loginForm) {
        loginForm.addEventListener('submit', handleAuthSubmit);
      }

      initSessionItems();

      // Attach Forgot Password UI dynamically inside #authOverlay card
      const authCard = document.querySelector('.auth-card');
      if (authCard && !document.getElementById('recoveryWrap')) {
        const recoveryWrap = document.createElement('div');
        recoveryWrap.id = 'recoveryWrap';
        recoveryWrap.style.display = 'none';
        recoveryWrap.innerHTML = `
          <!-- STEP 1: Request OTP -->
          <div id="recoveryStepRequest">
            <form onsubmit="return handleRequestOtpSubmit(event)">
              <div class="form-group">
                <label>Recovery Email</label>
                <input type="email" id="recoveryEmailInput" placeholder="email@example.com" required>
              </div>
              <button type="submit" id="btnSendOtp" class="btn" style="margin-top:8px;">Send OTP</button>
              <a class="forgot-link" onclick="switchAuthMode('login')">← Back to Login</a>
            </form>
          </div>

          <!-- STEP 2: Verify OTP -->
          <div id="recoveryStepVerify" style="display:none;">
            <form onsubmit="return handleVerifyOtpSubmit(event)">
              <div class="form-group">
                <label>Enter 6-Digit Code</label>
                <input type="text" id="recoveryOtpInput" class="otp-input" maxlength="6" pattern="\\d{6}" placeholder="••••••" required>
              </div>
              <button type="submit" id="btnVerifyOtp" class="btn" style="margin-top:8px;">Verify OTP</button>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                <a class="forgot-link" onclick="switchAuthMode('login')">Cancel</a>
                <button type="button" id="btnResendOtp" class="btn btn-secondary btn-sm" onclick="handleRequestOtpSubmit(event)">Resend OTP</button>
              </div>
            </form>
          </div>

          <!-- STEP 3: Reset Password -->
          <div id="recoveryStepReset" style="display:none;">
            <form onsubmit="return handleResetPasswordSubmit(event)">
              <div class="form-group">
                <label>New Password</label>
                <input type="password" id="recoveryNewPassword" placeholder="Enter new password" required>
              </div>
              <div class="form-group">
                <label>Confirm New Password</label>
                <input type="password" id="recoveryConfirmPassword" placeholder="Confirm new password" required>
              </div>
              <button type="submit" id="btnResetPassword" class="btn" style="margin-top:8px;">Reset Password</button>
            </form>
          </div>
        `;
        authCard.appendChild(recoveryWrap);

        // Append Forgot Password button to the login form
        if (loginForm && !document.getElementById('linkForgotPassword')) {
          const forgotLink = document.createElement('a');
          forgotLink.id = 'linkForgotPassword';
          forgotLink.className = 'forgot-link';
          forgotLink.textContent = 'Forgot Password?';
          forgotLink.onclick = () => switchAuthMode('recovery');
          loginForm.appendChild(forgotLink);
        }
      }

      // Add Recovery Email Modal to document body
      if (!document.getElementById('recoveryEmailModal')) {
        const recModal = document.createElement('div');
        recModal.id = 'recoveryEmailModal';
        recModal.className = 'modal-overlay';
        recModal.innerHTML = `
          <div class="glass-card" style="max-width:380px; width:100%;">
            <div class="card-title">
              <span>✉️ Recovery Email</span>
              <button type="button" onclick="closeRecoveryEmailModal()" style="background:none; border:none; color:var(--on-surface-muted); font-size:1.2rem; cursor:pointer;">✕</button>
            </div>
            <p style="font-size:0.8125rem; color:var(--on-surface-muted); margin-bottom:14px;">
              Associate a recovery email with your account to securely reset your password if you ever forget it.
            </p>
            <form onsubmit="return handleSaveRecoveryEmail(event)">
              <div class="form-group">
                <label>Recovery Email</label>
                <input type="email" id="userRecoveryEmailInput" placeholder="name@example.com" required>
              </div>
              <div style="display:flex; gap:10px; margin-top:14px;">
                <button type="button" class="btn btn-secondary" onclick="closeRecoveryEmailModal()">Cancel</button>
                <button type="submit" id="btnSaveRecoveryEmail" class="btn">Save Recovery Email</button>
              </div>
            </form>
          </div>
        `;
        document.body.appendChild(recModal);
      }

      // Add Settings / Recovery Email button to user header pill
      const userPill = document.querySelector('.user-pill');
      if (userPill && !document.getElementById('btnOpenRecoverySettings')) {
        const btnSetting = document.createElement('button');
        btnSetting.id = 'btnOpenRecoverySettings';
        btnSetting.className = 'btn btn-secondary btn-sm';
        btnSetting.innerHTML = '⚙️ Email';
        btnSetting.title = 'Configure Recovery Email';
        btnSetting.onclick = openRecoveryEmailModal;
        userPill.insertBefore(btnSetting, userPill.firstChild);
      }

      const overlay = document.getElementById('authOverlay');
      if (overlay) overlay.style.display = 'flex';
    });

    window.handleAuthSubmit = handleAuthSubmit;
    window.switchAuthMode = switchAuthMode;
    window.showRecoveryStep = showRecoveryStep;
    window.handleRequestOtpSubmit = handleRequestOtpSubmit;
    window.handleVerifyOtpSubmit = handleVerifyOtpSubmit;
    window.handleResetPasswordSubmit = handleResetPasswordSubmit;
    window.openRecoveryEmailModal = openRecoveryEmailModal;
    window.closeRecoveryEmailModal = closeRecoveryEmailModal;
    window.handleSaveRecoveryEmail = handleSaveRecoveryEmail;
    window.togglePasswordVisibility = togglePasswordVisibility;
    window.logout = logout;
    window.toggleTheme = toggleTheme;


    function applyTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('slalom_theme', theme);

      const isDark = theme === 'dark';
      safeSetTextContent('themeBtnIcon', isDark ? '☀️' : '🌙');

      Chart.defaults.color = isDark ? '#83958c' : '#52635a';
      Chart.defaults.borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

      const dashTab = document.getElementById('tab-dashboard');
      if (appState.currentUser && dashTab && dashTab.classList.contains('active')) {
        renderAnalytics();
      }
    }


    function toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      applyTheme(current === 'light' ? 'dark' : 'light');
    }


    function showToast(message, type = 'warning') {
      const container = document.getElementById('toastContainer');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `<span>${type === 'success' ? '⚡' : type === 'error' ? '🚨' : '⚠️'}</span><span>${message}</span>`;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    }


    function togglePasswordVisibility() {
      const pwd = document.getElementById('authPassword');
      if (pwd) pwd.type = pwd.type === 'password' ? 'text' : 'password';
    }


    function switchAuthMode(mode) {
      appState.authMode = mode;
      const authTabs = document.querySelector('.auth-tabs');
      const loginForm = document.getElementById('loginForm');
      const recoveryWrap = document.getElementById('recoveryWrap');

      if (mode === 'recovery') {
        if (authTabs) authTabs.style.display = 'none';
        if (loginForm) loginForm.style.display = 'none';
        if (recoveryWrap) recoveryWrap.style.display = 'block';
        showRecoveryStep('request');
        return;
      }

      if (authTabs) authTabs.style.display = 'flex';
      if (loginForm) loginForm.style.display = 'block';
      if (recoveryWrap) recoveryWrap.style.display = 'none';

      const isReg = mode === 'register';
      const btnLogin = document.getElementById('btnAuthLoginTab');
      if (btnLogin) btnLogin.classList.toggle('active', !isReg);

      const btnReg = document.getElementById('btnAuthRegisterTab');
      if (btnReg) btnReg.classList.toggle('active', isReg);

      safeSetTextContent('authSubtitleText', isReg ? 'Create a new skater protocol account' : 'Sign in to access your freestyle protocol');

      const skaterField = document.getElementById('skaterNameField');
      if (skaterField) skaterField.style.display = isReg ? 'block' : 'none';

      safeSetInnerHTML('authSubmitBtn', `<span>${isReg ? 'Create Protocol' : 'Log In'}</span>`);
    }

    function showRecoveryStep(step) {
      appState.recoveryStep = step;
      const reqView = document.getElementById('recoveryStepRequest');
      const verView = document.getElementById('recoveryStepVerify');
      const rstView = document.getElementById('recoveryStepReset');

      if (reqView) reqView.style.display = step === 'request' ? 'block' : 'none';
      if (verView) verView.style.display = step === 'verify' ? 'block' : 'none';
      if (rstView) rstView.style.display = step === 'reset' ? 'block' : 'none';

      if (step === 'request') {
        safeSetTextContent('authSubtitleText', 'Enter recovery email to receive a code');
      } else if (step === 'verify') {
        safeSetTextContent('authSubtitleText', 'Enter the 6-digit code sent to your email');
      } else if (step === 'reset') {
        safeSetTextContent('authSubtitleText', 'Create and confirm your new password');
      }
    }

    async function handleRequestOtpSubmit(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (appState.isAuthenticating) return false;

      const emailEl = document.getElementById('recoveryEmailInput');
      const email = emailEl ? emailEl.value.trim().toLowerCase() : (appState.recoveryEmail || '');

      if (!email) {
        showToast('Please enter your recovery email.', 'warning');
        return false;
      }

      appState.isAuthenticating = true;
      const btnSend = document.getElementById('btnSendOtp');
      const btnResend = document.getElementById('btnResendOtp');

      if (btnSend) { btnSend.disabled = true; btnSend.textContent = 'Sending OTP...'; }
      if (btnResend) { btnResend.disabled = true; btnResend.textContent = 'Sending...'; }

      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'requestOtp', payload: { email: email } })
        });

        const json = await response.json();

        if (json.status === 'success') {
          appState.recoveryEmail = email;
          showToast(json.message, 'success');
          startResendCountdown(60);
          showRecoveryStep('verify');
        } else {
          showToast(json.message || 'Unable to send verification code.', 'error');
        }
      } catch (err) {
        console.error('OTP Request Error:', err);
        showToast('Failed to connect to backend server.', 'error');
      } finally {
        appState.isAuthenticating = false;
        if (btnSend) { btnSend.disabled = false; btnSend.textContent = 'Send OTP'; }
        if (btnResend && appState.resendCooldownSec <= 0) {
          btnResend.disabled = false;
          btnResend.textContent = 'Resend OTP';
        }
      }
      return false;
    }

    function startResendCountdown(seconds) {
      appState.resendCooldownSec = seconds;
      const resendBtn = document.getElementById('btnResendOtp');
      if (appState.resendInterval) clearInterval(appState.resendInterval);

      if (resendBtn) {
        resendBtn.disabled = true;
        resendBtn.textContent = `Resend Code (${appState.resendCooldownSec}s)`;
      }

      appState.resendInterval = setInterval(() => {
        appState.resendCooldownSec--;
        if (resendBtn) {
          if (appState.resendCooldownSec > 0) {
            resendBtn.textContent = `Resend Code (${appState.resendCooldownSec}s)`;
          } else {
            resendBtn.disabled = false;
            resendBtn.textContent = 'Resend OTP';
            clearInterval(appState.resendInterval);
          }
        }
      }, 1000);
    }

    async function handleVerifyOtpSubmit(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      const otpEl = document.getElementById('recoveryOtpInput');
      const otp = otpEl ? otpEl.value.trim() : '';

      if (!otp || otp.length < 6) {
        showToast('Please enter the 6-digit verification code.', 'warning');
        return false;
      }

      const btn = document.getElementById('btnVerifyOtp');
      if (btn) { btn.disabled = true; btn.textContent = 'Verifying...'; }

      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'verifyOtp',
            payload: { email: appState.recoveryEmail, otp: otp }
          })
        });
        const json = await response.json();

        if (json.status === 'success') {
          appState.resetToken = json.resetToken;
          showToast('Code verified!', 'success');
          showRecoveryStep('reset');
        } else {
          showToast(json.message || 'Verification failed.', 'error');
        }
      } catch (err) {
        showToast('Verification failed due to network error.', 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Verify OTP'; }
      }
      return false;
    }

    async function handleResetPasswordSubmit(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      const p1 = (document.getElementById('recoveryNewPassword') || {}).value || '';
      const p2 = (document.getElementById('recoveryConfirmPassword') || {}).value || '';

      if (!p1) {
        showToast('Password cannot be empty.', 'warning');
        return false;
      }
      if (p1 !== p2) {
        showToast('Passwords do not match.', 'error');
        return false;
      }

      const btn = document.getElementById('btnResetPassword');
      if (btn) { btn.disabled = true; btn.textContent = 'Updating Password...'; }

      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'resetPassword',
            payload: { resetToken: appState.resetToken, newPassword: p1 }
          })
        });
        const json = await response.json();

        if (json.status === 'success') {
          showToast('Password reset successfully. You can now sign in with your new password.', 'success');
          appState.resetToken = '';
          appState.recoveryEmail = '';
          switchAuthMode('login');
        } else {
          showToast(json.message || 'Error updating password.', 'error');
        }
      } catch (err) {
        showToast('Error connecting to backend.', 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Reset Password'; }
      }
      return false;
    }

    function openRecoveryEmailModal() {
      const modal = document.getElementById('recoveryEmailModal');
      const input = document.getElementById('userRecoveryEmailInput');
      if (input && appState.currentUser) {
        input.value = appState.currentUser.recoveryEmail || '';
      }
      if (modal) modal.style.display = 'flex';
    }

    function closeRecoveryEmailModal() {
      const modal = document.getElementById('recoveryEmailModal');
      if (modal) modal.style.display = 'none';
    }

    async function handleSaveRecoveryEmail(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      const input = document.getElementById('userRecoveryEmailInput');
      const email = input ? input.value.trim() : '';

      if (!email) {
        showToast('Please enter an email address.', 'warning');
        return false;
      }

      const btn = document.getElementById('btnSaveRecoveryEmail');
      if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'updateRecoveryEmail',
            payload: {
              username: appState.currentUser.username,
              skaterName: appState.currentUser.skaterName,
              email: email
            }
          })
        });
        const json = await response.json();

        if (json.status === 'success') {
          appState.currentUser.recoveryEmail = email;
          showToast('Recovery email saved successfully!', 'success');
          closeRecoveryEmailModal();
        } else {
          showToast(json.message || 'Failed to save recovery email.', 'error');
        }
      } catch (err) {
        showToast('Network error saving recovery email.', 'error');
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Save Recovery Email'; }
      }
      return false;
    }


    function onAuthSuccess() {
      const overlay = document.getElementById('authOverlay');
      if (overlay) overlay.style.display = 'none';

      const skaterName = (appState.currentUser && (appState.currentUser.skaterName || appState.currentUser.username)) || 'Skater';

      safeSetTextContent('headerSkaterName', skaterName);

      const logSkater = document.getElementById('logSkater');
      if (logSkater) logSkater.value = skaterName;

      populateProgressTrickFilter();
      renderSessionItems();

      switchTab('dashboard');
    }

    function logout() {
      appState.currentUser = null;
      appState.sessions = [];
      appState.customTricks = [];

      const u = document.getElementById('authUsername');
      if (u) u.value = '';
      const p = document.getElementById('authPassword');
      if (p) p.value = '';
      const s = document.getElementById('authSkaterName');
      if (s) s.value = '';

      const pageContainer = document.getElementById('pageContainer');
      if (pageContainer) pageContainer.innerHTML = '';

      safeSetTextContent('headerSkaterName', 'Skater: -');

      const overlay = document.getElementById('authOverlay');
      if (overlay) overlay.style.display = 'flex';

      showToast('Logged out of RollSync.', 'success');
    }

async function switchTab(tabId, el) {
  const pageMap = {
    dashboard: 'dashboard',
    log: 'training',
    history: 'history',
    tricks: 'custom-tricks',
    calc: 'combo-calculator'
  };
  const page = pageMap[tabId];
  if (!page) return;

  document.querySelectorAll('.bottom-nav .nav-item').forEach(n => n.classList.remove('active'));
  const indexMap = { dashboard: 0, log: 1, calc: 2, history: 3, tricks: 4 };
  const navItems = document.querySelectorAll('.bottom-nav .nav-item');
  if (navItems[indexMap[tabId]]) navItems[indexMap[tabId]].classList.add('active');

  const container = document.getElementById('pageContainer');
  if (!container) return;

  try {
    container.innerHTML = `
      <div class="skeleton-card">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text" style="width:80%;"></div>
      </div>
      <div class="skeleton-card">
        <div class="skeleton skeleton-title" style="width:40%;"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text" style="width:65%;"></div>
      </div>
    `;

    const response = await fetch(`pages/${page}.html`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load ${page}.html (${response.status})`);
    container.innerHTML = await response.text();
    container.dataset.page = tabId;

    const tabContent = container.querySelector('.tab-content');
    if (tabContent) tabContent.classList.add('active');

    // Initialize controls belonging to the newly loaded page.
    if (tabId === 'log') {
      const logDateEl = document.getElementById('logDate');
      if (logDateEl && !logDateEl.value) logDateEl.value = new Date().toISOString().split('T')[0];
      const logSkater = document.getElementById('logSkater');
      if (logSkater) {
        if (appState.currentUser && (appState.currentUser.skaterName || appState.currentUser.username)) {
          logSkater.value = appState.currentUser.skaterName || appState.currentUser.username;
        } else {
          logSkater.value = '';
        }
      }
      renderSessionItems();
    }
    if (tabId === 'dashboard') {
      const progMonthEl = document.getElementById('progMonth');
      if (progMonthEl && !progMonthEl.value) progMonthEl.value = new Date().toISOString().slice(0, 7);
      populateProgressTrickFilter();
      renderAnalytics();
    }
    if (tabId === 'history') renderHistory();
    if (tabId === 'tricks') renderCustomTricksList();
    if (tabId === 'calc') renderCalcSlots();

    // Re-apply theme after injecting page markup.
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(theme);
  } catch (error) {
    console.error('Page load error:', error);
    container.innerHTML = `<div class="glass-card empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Could not load this section. Please run the project through a local web server such as VS Code Live Server.</div></div>`;
  }
}


    function getAllTricks() {
      if (!appState.currentUser) return PREDEFINED_TRICKS;
      const userCustom = appState.customTricks.filter(t => 
        String(t.skaterName || t.skatername).toLowerCase() === String(appState.currentUser.skaterName).toLowerCase()
      );
      return [...PREDEFINED_TRICKS, ...userCustom];
    }
