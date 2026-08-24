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
      charts: {},
      tutorialStep: 0
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

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleAuthSubmit);
  }

  initSessionItems();

  const overlay = document.getElementById('authOverlay');
  if (overlay) overlay.style.display = 'flex';

  await switchTab('dashboard');
});

window.handleAuthSubmit = handleAuthSubmit;
window.switchAuthMode = switchAuthMode;
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


    function onAuthSuccess(isNewUser = false) {
      const overlay = document.getElementById('authOverlay');
      if (overlay) overlay.style.display = 'none';

      safeSetTextContent('headerSkaterName', appState.currentUser.skaterName);

      const logSkater = document.getElementById('logSkater');
      if (logSkater) logSkater.value = appState.currentUser.skaterName;

      populateProgressTrickFilter();
      renderSessionItems();

      switchTab('dashboard');

      const userKey = `slalom_tutorial_completed_${String(appState.currentUser.username || appState.currentUser.skaterName).toLowerCase()}`;
      const hasCompleted = localStorage.getItem(userKey);

      if (isNewUser && !hasCompleted) {
        startTutorial();
      }
    }

    const TUTORIAL_STEPS = [
      {
        title: 'Performance Dashboard',
        category: 'Analytics',
        body: 'Your central command view. Displays real-time total practice volume, average cone success rates, connected completion rates, and falls over time.',
        tab: 'dashboard'
      },
      {
        title: 'Log Training Session',
        category: 'Training',
        body: 'Log full practice sessions on any date. A single session can include multiple individual drills and multiple combo sequences together.',
        tab: 'log'
      },
      {
        title: 'Individual Trick Logging',
        category: 'Training',
        body: 'Track individual drills with precise Target Cones, Completed Cones, Missed/Kicked Cones, and Falls count.',
        tab: 'log'
      },
      {
        title: 'Combo Training Builder',
        category: 'Training',
        body: 'Build multi-slot combo sequences with independent category and family filters for each position, recording connected attempt rates.',
        tab: 'log'
      },
      {
        title: 'Combo Calculator & Matrix',
        category: 'Matrix 2026',
        body: 'Simulate combo combinations position-by-position to determine official estimated score ranges and get AI Matrix upgrade suggestions.',
        tab: 'calc'
      },
      {
        title: 'Progress Graphs & Metrics',
        category: 'Analytics',
        body: 'Interactive visual graphs for cone success rates over time, target vs completed cones, item progress, and fall frequency.',
        tab: 'dashboard'
      },
      {
        title: 'Training History & Date Filters',
        category: 'History',
        body: 'Filter and inspect past sessions by exact calendar date, month, practice category, or difficulty family.',
        tab: 'history'
      },
      {
        title: 'Custom Tricks Catalog',
        category: 'Matrix',
        body: 'Create custom tricks with intelligent duplicate and similarity detection against the official Matrix.',
        tab: 'tricks'
      },
      {
        title: 'Cloud Sync',
        category: 'Data Protocol',
        body: 'Keep all your practice logs and custom tricks synchronized with the Google Sheets backend at any time.',
        tab: 'dashboard'
      },
      {
        title: 'Navigation & Account',
        category: 'Protocol',
        body: 'Switch between dark and light themes, inspect live skater credentials, and navigate cleanly across all modules.',
        tab: 'dashboard'
      }
    ];

    function startTutorial() {
      appState.tutorialStep = 0;
      showTutorialStep(0);
      const tutEl = document.getElementById('tutorialOverlay');
      if (tutEl) tutEl.style.display = 'flex';
    }

    function showTutorialStep(idx) {
      const step = TUTORIAL_STEPS[idx];
      if (!step) return;

      safeSetTextContent('tutStepBadge', `Step ${idx + 1} of ${TUTORIAL_STEPS.length}`);
      safeSetTextContent('tutCategoryBadge', step.category);
      safeSetTextContent('tutTitle', step.title);
      safeSetTextContent('tutBody', step.body);

      const nextBtn = document.getElementById('tutNextBtn');
      if (nextBtn) {
        nextBtn.textContent = (idx === TUTORIAL_STEPS.length - 1) ? 'Finish Walkthrough 🚀' : 'Next Step →';
      }

      switchTab(step.tab);
    }

    function nextTutorialStep() {
      appState.tutorialStep++;
      if (appState.tutorialStep >= TUTORIAL_STEPS.length) {
        finishTutorial();
      } else {
        showTutorialStep(appState.tutorialStep);
      }
    }

    function skipTutorial() {
      finishTutorial();
    }

    function finishTutorial() {
      const tutEl = document.getElementById('tutorialOverlay');
      if (tutEl) tutEl.style.display = 'none';

      if (appState.currentUser) {
        const userKey = `slalom_tutorial_completed_${String(appState.currentUser.username || appState.currentUser.skaterName).toLowerCase()}`;
        localStorage.setItem(userKey, 'true');
      }
      showToast('Tutorial complete! Welcome to your protocol.', 'success');
      switchTab('dashboard');
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
