// Shared application state and helpers.
let appState = {
      currentUser: null,
      authMode: 'login',
      sessions: [],
      customTricks: [],
      sessionItems: [],
      calcSlots: [],
      deletingTrickId: null,
      charts: {}
    };


    function safeSetInnerHTML(id, html) {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    }


    function safeSetTextContent(id, text) {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    }

    window.addEventListener('DOMContentLoaded', () => {
      const logDateEl = document.getElementById('logDate');
      if (logDateEl) logDateEl.value = new Date().toISOString().split('T')[0];

      const progMonthEl = document.getElementById('progMonth');
      if (progMonthEl) progMonthEl.value = new Date().toISOString().slice(0, 7);
      
      const savedTheme = localStorage.getItem('slalom_theme') || 'dark';
      applyTheme(savedTheme);

      initSessionItems();
      renderCalcSlots();

      const overlay = document.getElementById('authOverlay');
      if (overlay) overlay.style.display = 'flex';
    });

window.addEventListener('DOMContentLoaded', async () => {
  const savedTheme = localStorage.getItem('slalom_theme') || 'dark';
  applyTheme(savedTheme);

  // Keep the existing in-memory session state behavior.
  initSessionItems();
  renderCalcSlots();

  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.style.display = 'flex';

  await switchTab('dashboard');
});


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


    async function handleAuthSubmit(e) {
      e.preventDefault();
      const u = document.getElementById('authUsername').value.trim();
      const p = document.getElementById('authPassword').value.trim();
      const skaterName = document.getElementById('authSkaterName').value.trim();
      const btn = document.getElementById('authSubmitBtn');

      if (!u || !p) {
        showToast('Please enter both username and password.', 'warning');
        return;
      }

      if (appState.authMode === 'register' && !skaterName) {
        showToast('Please enter your full skater name.', 'warning');
        return;
      }

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span>${appState.authMode === 'register' ? 'Creating...' : 'Verifying...'}</span>`;
      }

      try {
        if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === "YOUR_APPS_SCRIPT_WEB_APP_URL") {
          throw new Error('Google Apps Script URL is not configured.');
        }

        const payload = { username: u, password: p, skaterName: skaterName };
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: appState.authMode, payload: payload })
        });

        const json = await response.json();

        if (json.status === 'success') {
          if (appState.authMode === 'register') {
            showToast('Registration successful! You can now log in.', 'success');
            switchAuthMode('login');
          } else {
            appState.currentUser = json.user;
            appState.sessions = json.data.sessions || [];
            appState.customTricks = json.data.customTricks || [];

            showToast(`Protocol initiated: Welcome ${appState.currentUser.skaterName}`, 'success');
            onAuthSuccess();
          }
        } else {
          showToast(json.message || 'Action failed.', 'error');
        }

      } catch (err) {
        console.error('Auth Error:', err);
        showToast(err.message || 'Error connecting to Google Sheets backend.', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<span>${appState.authMode === 'register' ? 'Create Protocol' : 'Log In'}</span>`;
        }
      }
    }


    function onAuthSuccess() {
      const overlay = document.getElementById('authOverlay');
      if (overlay) overlay.style.display = 'none';

      safeSetTextContent('headerSkaterName', appState.currentUser.skaterName);

      const logSkater = document.getElementById('logSkater');
      if (logSkater) logSkater.value = appState.currentUser.skaterName;

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

      const overlay = document.getElementById('authOverlay');
      if (overlay) overlay.style.display = 'flex';

      showToast('Logged out of Liquid Glass.', 'success');
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
    const response = await fetch(`pages/${page}.html`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Failed to load ${page}.html (${response.status})`);
    container.innerHTML = await response.text();
    container.dataset.page = tabId;

    // Initialize controls belonging to the newly loaded page.
    if (tabId === 'log') {
      const logDateEl = document.getElementById('logDate');
      if (logDateEl && !logDateEl.value) logDateEl.value = new Date().toISOString().split('T')[0];
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
    if (tabId === 'calc') updateComboCalculator();

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
