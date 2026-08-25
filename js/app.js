// Shared application state and helpers.
let appState = {
      currentUser: null,
      authMode: 'login',
      isAuthenticating: false,
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

      const overlay = document.getElementById('authOverlay');
      if (overlay) overlay.style.display = 'flex';
    });

    window.handleAuthSubmit = handleAuthSubmit;
    window.switchAuthMode = switchAuthMode;
    window.togglePasswordVisibility = togglePasswordVisibility;
    window.logout = logout;
    window.toggleTheme = toggleTheme;

    function openEditorialProfilePanel() {
      if (!appState.currentUser) return;
      let modal = document.getElementById('editorialProfileModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'editorialProfileModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
      }

      const skaterName = appState.currentUser.skaterName || appState.currentUser.username || 'Skater';
      const userRecords = appState.sessions.filter(s =>
        String(s.skaterName || s.skatername || s.userid || '').toLowerCase() === String(skaterName).toLowerCase()
      );

      const trainingSessions = userRecords.filter(s => (s.sessionType || s.sessiontype) !== 'Rest' && (s.trickName || s.trickname) !== 'Rest Day');
      const restSessions = userRecords.filter(s => (s.sessionType || s.sessiontype) === 'Rest' || (s.trickName || s.trickname) === 'Rest Day');

      const totalSessions = trainingSessions.length;
      const totalRestDays = new Set(restSessions.map(s => s.date).filter(Boolean)).size;
      const singleTricks = trainingSessions.filter(s => (s.sessionType || s.sessiontype) !== 'Combo').length;
      const comboTricks = trainingSessions.filter(s => (s.sessionType || s.sessiontype) === 'Combo').length;
      const totalFalls = trainingSessions.reduce((acc, curr) => acc + Number(curr.falls || 0), 0);

      // Best performances
      let bestTrickName = 'None';
      let bestTrickCones = 0;
      let bestComboName = 'None';
      let bestComboCones = 0;
      let highestConeSingleAttempt = 0;
      let bestSuccessRate = 0;

      trainingSessions.forEach(s => {
        const cones = Number(s.completedCones || s.completedcones || 0);
        const rate = parseFloat(s.successRate || s.successrate || 0);
        const isCombo = (s.sessionType || s.sessiontype) === 'Combo';

        if (cones > highestConeSingleAttempt) highestConeSingleAttempt = cones;
        if (rate > bestSuccessRate) bestSuccessRate = rate;

        if (!isCombo) {
          if (cones > bestTrickCones) {
            bestTrickCones = cones;
            bestTrickName = s.trickName || s.trickname;
          }
        } else {
          if (cones > bestComboCones) {
            bestComboCones = cones;
            bestComboName = s.trickName || s.trickname;
          }
        }
      });

      const streakData = typeof calculateSkaterStreaks === 'function' ? calculateSkaterStreaks() : { current: 0, longest: 0, trainingDays: 0, thisMonthDays: 0, mostRecentDate: 'None' };

      modal.innerHTML = `
        <div class="profile-editorial-wrap">
          <div class="profile-editorial-header">
            <div style="display:flex; align-items:center; gap:14px;">
              <div class="profile-editorial-avatar">🛼</div>
              <div>
                <h2 style="font-family:var(--font-display); font-size:1.4rem; font-weight:800; line-height:1.2;">${skaterName}</h2>
                <div class="label-caps" style="color:var(--primary); margin-top:2px;">ATHLETE PROTOCOL • ID: ${appState.currentUser.username || skaterName}</div>
              </div>
            </div>
            <button type="button" class="cal-nav-btn" onclick="closeEditorialProfilePanel()" style="width:36px; height:36px;" title="Close Profile">✕</button>
          </div>

          <div class="profile-editorial-grid">
            <!-- Hero Streak Card -->
            <div class="mag-card mag-col-6 mag-hero-card">
              <div class="mag-card-label">🔥 Current Training Streak</div>
              <div class="mag-card-value">${streakData.current} <span style="font-size:1rem; font-weight:600;">Days</span></div>
              <div class="mag-card-sub">Longest Record: <strong>${streakData.longest} Consecutive Days</strong></div>
            </div>

            <!-- Active Training Days -->
            <div class="mag-card mag-col-6">
              <div class="mag-card-label">🗓️ Training Volume</div>
              <div class="mag-card-value">${streakData.trainingDays} <span style="font-size:1rem; font-weight:600;">Days</span></div>
              <div class="mag-card-sub">This Month: <strong>${streakData.thisMonthDays} days</strong> • Rest Days: <strong>${totalRestDays} logged</strong></div>
            </div>

            <!-- Best Trick -->
            <div class="mag-card mag-col-6">
              <div class="mag-card-label">🎯 Best Trick Record</div>
              <div style="font-family:var(--font-display); font-weight:700; font-size:1.1rem; color:var(--on-surface); margin-top:4px;">${bestTrickName}</div>
              <div class="mag-card-sub" style="color:var(--primary); font-weight:700;">${bestTrickCones} cones completed</div>
            </div>

            <!-- Best Combo -->
            <div class="mag-card mag-col-6">
              <div class="mag-card-label">🔗 Best Combo Record</div>
              <div style="font-family:var(--font-display); font-weight:700; font-size:1.1rem; color:var(--on-surface); margin-top:4px;">${bestComboName}</div>
              <div class="mag-card-sub" style="color:var(--primary); font-weight:700;">${bestComboCones} cones completed</div>
            </div>

            <!-- Metrics Column -->
            <div class="mag-card mag-col-4">
              <div class="mag-card-label">Total Drills</div>
              <div class="mag-card-value" style="font-size:1.3rem;">${totalSessions}</div>
              <div class="mag-card-sub">${singleTricks} single / ${comboTricks} combo</div>
            </div>

            <div class="mag-card mag-col-4">
              <div class="mag-card-label">Peak Success</div>
              <div class="mag-card-value" style="font-size:1.3rem;">${bestSuccessRate}%</div>
              <div class="mag-card-sub">Best attempt rate</div>
            </div>

            <div class="mag-card mag-col-4">
              <div class="mag-card-label">Falls / Impacts</div>
              <div class="mag-card-value" style="font-size:1.3rem; color:#f87171;">${totalFalls}</div>
              <div class="mag-card-sub">Recorded impacts</div>
            </div>
          </div>
        </div>
      `;

      modal.style.display = 'flex';
    }

    function closeEditorialProfilePanel() {
      const modal = document.getElementById('editorialProfileModal');
      if (modal) modal.style.display = 'none';
    }

    window.openEditorialProfilePanel = openEditorialProfilePanel;
    window.closeEditorialProfilePanel = closeEditorialProfilePanel;

    function openSkaterProfileModal() {
      if (!appState.currentUser) return;
      let modal = document.getElementById('skaterProfileModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'skaterProfileModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
      }

      const skaterName = appState.currentUser.skaterName || appState.currentUser.username || 'Skater';
      const userSessions = appState.sessions.filter(s =>
        String(s.skaterName || s.skatername || s.userid).toLowerCase() === String(skaterName).toLowerCase()
      );

      const totalSessions = userSessions.length;
      const uniqueDays = new Set(userSessions.map(s => s.date).filter(Boolean)).size;
      const totalTricks = userSessions.filter(s => (s.sessionType || s.sessiontype) !== 'Combo').length;
      const totalCombos = userSessions.filter(s => (s.sessionType || s.sessiontype) === 'Combo').length;
      const uniqueTricks = new Set(userSessions.map(s => s.trickName || s.trickname).filter(Boolean)).size;
      const totalCompletedCones = userSessions.reduce((acc, curr) => acc + Number(curr.completedCones || curr.completedcones || 0), 0);

      const streaks = typeof calculateSkaterStreaks === 'function' ? calculateSkaterStreaks() : { current: 0, longest: 0 };

      // Calculate Milestones
      const milestoneDefinitions = [
        { id: 'm1', icon: '🎉', title: 'First Training Session', desc: 'Log your very first practice session', achieved: totalSessions >= 1 },
        { id: 'm2', icon: '🏆', title: '10 Training Sessions', desc: 'Complete 10 logged sessions', achieved: totalSessions >= 10 },
        { id: 'm3', icon: '🚀', title: '50 Training Sessions', desc: 'Reach 50 practice sessions milestone', achieved: totalSessions >= 50 },
        { id: 'm4', icon: '🔥', title: '3-Day Streak', desc: 'Train for 3 consecutive days', achieved: streaks.longest >= 3 },
        { id: 'm5', icon: '🔥', title: '7-Day Streak', desc: 'Maintain a 1-week continuous streak', achieved: streaks.longest >= 7 },
        { id: 'm6', icon: '🔥', title: '30-Day Master Streak', desc: 'Log training for 30 consecutive days', achieved: streaks.longest >= 30 },
        { id: 'm7', icon: '🛼', title: '10 Tricks Practiced', desc: 'Practice 10 unique trick drills', achieved: uniqueTricks >= 10 },
        { id: 'm8', icon: '🛼', title: '25 Tricks Practiced', desc: 'Expand repertoire to 25 unique items', achieved: uniqueTricks >= 25 },
        { id: 'm9', icon: '⚡', title: '100 Cones Conquered', desc: 'Accumulate 100 successfully completed cones', achieved: totalCompletedCones >= 100 },
        { id: 'm10', icon: '⚡', title: '500 Cones Conquered', desc: 'Accumulate 500 successfully completed cones', achieved: totalCompletedCones >= 500 },
        { id: 'm11', icon: '🎯', title: '10 Training Days', desc: 'Log practice across 10 unique days', achieved: uniqueDays >= 10 },
        { id: 'm12', icon: '🎯', title: '30 Training Days', desc: 'Log practice across 30 unique days', achieved: uniqueDays >= 30 }
      ];

      const achievedCount = milestoneDefinitions.filter(m => m.achieved).length;

      modal.innerHTML = `
        <div class="glass-card" style="max-width:540px; width:100%;">
          <div class="card-title">
            <span>👤 Skater Profile</span>
            <button type="button" onclick="closeSkaterProfileModal()" style="background:none; border:none; color:var(--on-surface-muted); font-size:1.2rem; cursor:pointer;">✕</button>
          </div>

          <div style="display:flex; align-items:center; gap:14px; margin-bottom:16px;">
            <div style="width:52px; height:52px; border-radius:50%; background:var(--primary-dark); border:2px solid var(--primary); display:flex; align-items:center; justify-content:center; font-size:1.6rem;">
              🛼
            </div>
            <div>
              <h3 style="font-size:1.2rem; font-weight:800;">${skaterName}</h3>
              <div class="label-caps" style="color:var(--primary);">Protocol ID: ${appState.currentUser.username || skaterName}</div>
            </div>
          </div>

          <div class="metrics-grid" style="grid-template-columns:repeat(3, 1fr); margin-bottom:16px;">
            <div class="metric-card" style="padding:10px;">
              <div class="metric-label">Sessions</div>
              <div class="metric-value" style="font-size:1.2rem;">${totalSessions}</div>
            </div>
            <div class="metric-card" style="padding:10px;">
              <div class="metric-label">Active Days</div>
              <div class="metric-value" style="font-size:1.2rem;">${uniqueDays}</div>
            </div>
            <div class="metric-card" style="padding:10px;">
              <div class="metric-label">Max Streak</div>
              <div class="metric-value" style="font-size:1.2rem;">${streaks.longest}d</div>
            </div>
          </div>

          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
              <span class="card-title" style="margin-bottom:0; font-size:0.95rem;">🎖️ Journey Milestones</span>
              <span class="badge badge-combo">${achievedCount} / ${milestoneDefinitions.length} Unlocked</span>
            </div>

            <div class="milestones-grid">
              ${milestoneDefinitions.map(m => `
                <div class="milestone-card ${m.achieved ? 'achieved' : 'locked'}">
                  <div class="milestone-badge">${m.icon}</div>
                  <div>
                    <div class="milestone-text-title">${m.title}</div>
                    <div class="milestone-text-desc">${m.achieved ? '✓ Achieved' : m.desc}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      modal.style.display = 'flex';
    }

    function closeSkaterProfileModal() {
      const modal = document.getElementById('skaterProfileModal');
      if (modal) modal.style.display = 'none';
    }


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


    function onAuthSuccess() {
      const overlay = document.getElementById('authOverlay');
      if (overlay) overlay.style.display = 'none';

      const skaterName = (appState.currentUser && (appState.currentUser.skaterName || appState.currentUser.username)) || 'Skater';

      safeSetTextContent('headerSkaterName', skaterName);

      // Clean up standalone header buttons
      document.querySelectorAll('.theme-toggle-btn, .btn-logout, #themeToggleBtn, #logoutBtn, #btnHeaderProfileIcon, #btnOpenProfileModal').forEach(el => el.remove());

      // Mount the single Top-Right Hamburger Menu
      const userPill = document.querySelector('.user-pill');
      if (userPill) {
        userPill.style.position = 'relative';

        if (!document.getElementById('btnHeaderHamburger')) {
          const btnHamburger = document.createElement('button');
          btnHamburger.id = 'btnHeaderHamburger';
          btnHamburger.className = 'btn-hamburger';
          btnHamburger.type = 'button';
          btnHamburger.title = 'Menu';
          btnHamburger.innerHTML = `<span></span><span></span><span></span>`;
          btnHamburger.onclick = toggleHeaderDropdown;

          const dropdown = document.createElement('div');
          dropdown.id = 'headerDropdownMenu';
          dropdown.className = 'header-dropdown-menu';
          dropdown.innerHTML = `
            <button type="button" class="dropdown-item" onclick="handleMenuAction('profile')">
              <span>👤</span><span>Profile</span>
            </button>
            <button type="button" class="dropdown-item" onclick="handleMenuAction('theme')">
              <span>🌓</span><span>Change Theme</span>
            </button>
            <div class="dropdown-divider"></div>
            <button type="button" class="dropdown-item dropdown-item-danger" onclick="handleMenuAction('logout')">
              <span>🚪</span><span>Logout</span>
            </button>
          `;

          userPill.appendChild(btnHamburger);
          userPill.appendChild(dropdown);

          document.addEventListener('click', (e) => {
            if (!userPill.contains(e.target)) {
              dropdown.classList.remove('active');
            }
          });
        }
      }

      const logSkater = document.getElementById('logSkater');
      if (logSkater) logSkater.value = skaterName;

      populateProgressTrickFilter();
      initSessionItems();

      switchTab('dashboard');
    }

    function toggleHeaderDropdown(e) {
      if (e) e.stopPropagation();
      const menu = document.getElementById('headerDropdownMenu');
      if (menu) menu.classList.toggle('active');
    }

    function handleMenuAction(action) {
      const menu = document.getElementById('headerDropdownMenu');
      if (menu) menu.classList.remove('active');

      if (action === 'profile') {
        if (typeof openEditorialProfilePanel === 'function') openEditorialProfilePanel();
        else if (typeof openSkaterProfileModal === 'function') openSkaterProfileModal();
      } else if (action === 'theme') {
        toggleTheme();
      } else if (action === 'logout') {
        logout();
      }
    }

    window.toggleHeaderDropdown = toggleHeaderDropdown;
    window.handleMenuAction = handleMenuAction;

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
    calc: 'combo-calculator',
    log: 'training',
    history: 'history',
    tricks: 'custom-tricks'
  };
  const page = pageMap[tabId];
  if (!page) return;

  // Enforce instant scroll to top on every page transition
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  document.querySelectorAll('.bottom-nav .nav-item').forEach(n => n.classList.remove('active'));
  // Layout: Dash (0) | Build (1) | Train (2) | History (3) | Matrix (4)
  const indexMap = { dashboard: 0, calc: 1, log: 2, history: 3, tricks: 4 };
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
    // Initialize controls belonging to the newly loaded page.
    if (tabId === 'log') {
      const todayIso = new Date().toISOString().split('T')[0];
      const logDateEl = document.getElementById('logDate');
      if (logDateEl) {
        logDateEl.max = todayIso;
        if (!logDateEl.value) logDateEl.value = todayIso;
      }
      const logRestDateEl = document.getElementById('logRestDate');
      if (logRestDateEl) {
        logRestDateEl.max = todayIso;
        if (!logRestDateEl.value) logRestDateEl.value = todayIso;
      }
      const logSkater = document.getElementById('logSkater');
      if (logSkater) {
        if (appState.currentUser && (appState.currentUser.skaterName || appState.currentUser.username)) {
          logSkater.value = appState.currentUser.skaterName || appState.currentUser.username;
        } else {
          logSkater.value = '';
        }
      }

      if (!appState.sessionItems || appState.sessionItems.length === 0) {
        initSessionItems();
      } else {
        renderSessionItems();
      }
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
