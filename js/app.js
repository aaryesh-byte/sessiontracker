// Shared application state and helpers.
let appState = {
      currentUser: null,
      authMode: 'login',
      isAuthenticating: false,
      sessions: [],
      customTricks: [],
      masterPerformances: {}, // Keyed by username/skaterName
      sessionPerformance: null, // Temporary session performance snapshot
      sessionItems: [],
      deletingTrickId: null,
      charts: {}
    };
// Deterministic profile picture calculator: stable index 1 to 5 from assets folder
function getDeterministicProfilePic(identifier) {
  const str = String(identifier || '').trim().toLowerCase();
  if (!str) return 'assets/profile1.png';

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const index = (Math.abs(hash) % 5) + 1;
  return `assets/profile${index}.png`;
}

function handleUsernameAvatarInput(val) {
  const img = document.getElementById('authDynamicAvatarImg');
  const label = document.getElementById('authVisualUserLabel');
  if (!img) return;

  const targetSrc = getDeterministicProfilePic(val);
  const trimmed = (val || '').trim();

  if (label) {
    label.textContent = trimmed ? trimmed.toUpperCase() : 'SKATER PROTOCOL';
  }

  // Smooth transition when the image source changes
  if (img.getAttribute('data-current') !== targetSrc) {
    img.classList.add('avatar-fading');
    setTimeout(() => {
      img.src = targetSrc;
      img.setAttribute('data-current', targetSrc);
      img.classList.remove('avatar-fading');
    }, 120);
  }
}

window.handleUsernameAvatarInput = handleUsernameAvatarInput;
window.getDeterministicProfilePic = getDeterministicProfilePic;

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
            userId: String(u || '').toLowerCase()
          };
          if (authenticatedUser && authenticatedUser.userId !== undefined && authenticatedUser.userId !== null) {
            authenticatedUser.userId = String(authenticatedUser.userId);
          }

          appState.currentUser = authenticatedUser;
          appState.sessions = (json.data && Array.isArray(json.data.sessions)) ? normalizeSessionRecords(json.data.sessions) : [];
          appState.customTricks = (json.data && Array.isArray(json.data.customTricks)) ? json.data.customTricks : [];
          
          // Cloud database is 100% the SINGLE SOURCE OF TRUTH for Master Performance
          const userKey = String(authenticatedUser.userId || authenticatedUser.username || authenticatedUser.skaterName || '').toLowerCase();
          if (json.data && json.data.masterPerformance && typeof json.data.masterPerformance === 'object' && Array.isArray(json.data.masterPerformance.items) && json.data.masterPerformance.items.length > 0) {
            appState.masterPerformances[userKey] = json.data.masterPerformance;
          } else {
            delete appState.masterPerformances[userKey];
            if (typeof getMasterPerformance === 'function') {
              appState.masterPerformances[userKey] = getMasterPerformance();
            }
          }

          if (appState.authMode === 'register') {
            showToast(`Registration complete: Welcome ${authenticatedUser.skaterName}!`, 'success');
          } else {
            showToast(`Welcome back, ${authenticatedUser.skaterName}!`, 'success');
          }

          onAuthSuccess();
        }
         else {
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
// Helper to format date strings cleanly
    function formatNormalizedDate(dateVal) {
      if (!dateVal) return '';
      if (typeof dateVal === 'string') return dateVal.includes('T') ? dateVal.split('T')[0] : dateVal.trim();
      if (dateVal instanceof Date) {
        const yyyy = dateVal.getFullYear();
        const mm = String(dateVal.getMonth() + 1).padStart(2, '0');
        const dd = String(dateVal.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
      return String(dateVal).split('T')[0];
    }

// Canonical data normalizer to eradicate 'undefined' and unparsed JSON across all devices
    function normalizeSessionRecords(rawRecords) {
      if (!Array.isArray(rawRecords)) return [];

      const standardRows = [];
      const perfRowsBySession = {};

      rawRecords.forEach(r => {
        const sType = r.sessionType || r.sessiontype || 'Single';
        if (sType === 'Performance') {
          const sId = r.sessionId || r.sessionid || ('SESS-' + Date.now());
          let meta = {};
          const rawPerf = r.performanceData || r.performancedata || '';
          if (rawPerf && typeof rawPerf === 'string' && rawPerf.trim().startsWith('{')) {
            try { meta = JSON.parse(rawPerf); } catch(e) {}
          } else if (typeof rawPerf === 'object') {
            meta = rawPerf;
          }
          const runKey = sId + '_' + (meta.runIndex !== undefined ? meta.runIndex : (meta.perfTitle || 'run0'));
          if (!perfRowsBySession[runKey]) perfRowsBySession[runKey] = [];
          perfRowsBySession[runKey].push(r);
        } else {
          standardRows.push(r);
        }
      });

      const normalizedStandards = standardRows.map(r => {
        const sType = r.sessionType || r.sessiontype || 'Single';
        const tName = r.trickName || r.trickname || r.trickcombo || (sType === 'Rest' ? 'Rest Day' : 'Training Drill');
        const targetCones = r.targetCones !== undefined ? Number(r.targetCones) : Number(r.targetcones || 0);
        const completedCones = r.completedCones !== undefined ? Number(r.completedCones) : Number(r.completedcones || 0);
        const targetAttempts = r.targetAttempts !== undefined ? Number(r.targetAttempts) : Number(r.targetattempts || 10);
        const completedAttempts = r.completedAttempts !== undefined ? Number(r.completedAttempts) : Number(r.completedattempts || 0);

        let cleanNotes = String(r.notes || '').trim();
        if (cleanNotes.startsWith('{') && cleanNotes.endsWith('}')) {
          try {
            const parsed = JSON.parse(cleanNotes);
            cleanNotes = parsed.userNotes || parsed.notes || '';
          } catch(e) {}
        }

        return {
          sessionId: r.sessionId || r.sessionid || ('SESS-' + Date.now()),
          userId: r.userId || r.userid || '',
          skaterName: r.skaterName || r.skatername || '',
          date: formatNormalizedDate(r.date),
          sessionType: sType,
          trickName: tName,
          category: r.category || 'OTHERS',
          family: r.family || 'Custom',
          targetCones: targetCones,
          completedCones: completedCones,
          missedCones: r.missedCones !== undefined ? Number(r.missedCones) : Number(r.missedcones || 0),
          falls: Number(r.falls || 0),
          successRate: r.successRate !== undefined ? Number(r.successRate) : Number(r.successrate || (targetCones > 0 ? parseFloat(((completedCones / targetCones) * 100).toFixed(1)) : 0)),
          connectedCompletion: r.connectedCompletion || r.connectedcompletion || 'N/A',
          targetAttempts: targetAttempts,
          completedAttempts: completedAttempts,
          performanceScore: 0,
          smoothnessScore: 0,
          footworkScore: 0,
          performanceSnapshot: null,
          notes: cleanNotes
        };
      });

      const normalizedPerfs = Object.keys(perfRowsBySession).map(runKey => {
        const rows = perfRowsBySession[runKey];
        if (rows.length === 0) return null;

        const firstRow = rows[0];
        const sId = firstRow.sessionId || firstRow.sessionid || ('SESS-' + Date.now());
        let pSnapshot = firstRow.performanceSnapshot || null;
        let pScore = firstRow.performanceScore !== undefined ? Number(firstRow.performanceScore) : (firstRow.performancescore !== undefined ? Number(firstRow.performancescore) : 0);
        let sScore = firstRow.smoothnessScore !== undefined ? Number(firstRow.smoothnessScore) : (firstRow.smoothnessscore !== undefined ? Number(firstRow.smoothnessscore) : 0);
        let fScore = firstRow.footworkScore !== undefined ? Number(firstRow.footworkScore) : (firstRow.footworkscore !== undefined ? Number(firstRow.footworkscore) : 0);
        let cleanNotes = String(firstRow.notes || '').trim();

        if (cleanNotes.startsWith('{') && cleanNotes.endsWith('}')) {
          try {
            const parsed = JSON.parse(cleanNotes);
            cleanNotes = parsed.userNotes || parsed.notes || '';
          } catch(e) {}
        }

        // If single row has embedded performanceSnapshot object or JSON string
        if (rows.length === 1 && (pSnapshot || firstRow.performanceData || firstRow.performancedata)) {
          const rawPerf = firstRow.performanceData || firstRow.performancedata || '';
          if (rawPerf) {
            let pObj = null;
            if (typeof rawPerf === 'string' && rawPerf.trim().startsWith('{')) {
              try { pObj = JSON.parse(rawPerf); } catch(e) {}
            } else if (typeof rawPerf === 'object') {
              pObj = rawPerf;
            }
            if (pObj) {
              if (pObj.performanceScore !== undefined) pScore = Number(pObj.performanceScore);
              if (pObj.smoothnessScore !== undefined) sScore = Number(pObj.smoothnessScore);
              if (pObj.footworkScore !== undefined) fScore = Number(pObj.footworkScore);
              if (pObj.snapshot) pSnapshot = pObj.snapshot;
            }
          }

          if (typeof pSnapshot === 'string' && pSnapshot.trim().startsWith('{')) {
            try { pSnapshot = JSON.parse(pSnapshot); } catch(e) {}
          }

          if (pSnapshot && typeof pSnapshot === 'object' && Array.isArray(pSnapshot.items) && pSnapshot.items.length > 0) {
            if (sScore === 0 && pSnapshot.smoothness !== undefined) sScore = Number(pSnapshot.smoothness);
            if (fScore === 0 && pSnapshot.footwork !== undefined) fScore = Number(pSnapshot.footwork);
            if (!cleanNotes && pSnapshot.notes) cleanNotes = String(pSnapshot.notes).trim();

            const scoreCalc = (typeof PERFORMANCE_SCORING_CONFIG !== 'undefined' && PERFORMANCE_SCORING_CONFIG.calculatePerformanceScore) ?
              PERFORMANCE_SCORING_CONFIG.calculatePerformanceScore(pSnapshot) :
              { totalIndividualTricks: pSnapshot.items.length, completedCount: pSnapshot.items.filter(i => i.completed).length, totalScore: pScore };

            if (pScore === 0 || pScore !== scoreCalc.totalScore) pScore = scoreCalc.totalScore;
            if (sScore === 0 && scoreCalc.smoothness !== undefined) sScore = scoreCalc.smoothness;
            if (fScore === 0 && scoreCalc.footwork !== undefined) fScore = scoreCalc.footwork;

            return {
              sessionId: sId,
              userId: firstRow.userId || firstRow.userid || '',
              skaterName: firstRow.skaterName || firstRow.skatername || '',
              date: formatNormalizedDate(firstRow.date),
              sessionType: 'Performance',
              trickName: firstRow.trickName || firstRow.trickname || 'Performance Run #1 (2 min)',
              category: 'PERFORMANCE',
              family: scoreCalc.completedCount >= 9 ? 'Valid' : 'Incomplete',
              targetCones: scoreCalc.totalIndividualTricks,
              completedCones: scoreCalc.completedCount,
              missedCones: Math.max(0, scoreCalc.totalIndividualTricks - scoreCalc.completedCount),
              falls: Number(firstRow.falls || 0),
              successRate: scoreCalc.totalIndividualTricks > 0 ? parseFloat(((scoreCalc.completedCount / scoreCalc.totalIndividualTricks) * 100).toFixed(1)) : 0,
              connectedCompletion: 'N/A',
              targetAttempts: scoreCalc.totalIndividualTricks,
              completedAttempts: scoreCalc.completedCount,
              performanceScore: pScore,
              smoothnessScore: sScore,
              footworkScore: fScore,
              performanceSnapshot: pSnapshot,
              notes: cleanNotes
            };
          }
        }

        // Reconstruct from structured multi-row performance items
        const itemsByOrder = {};
        rows.forEach(r => {
          let meta = {};
          const rawPerf = r.performanceData || r.performancedata || '';
          if (rawPerf && typeof rawPerf === 'string' && rawPerf.trim().startsWith('{')) {
            try { meta = JSON.parse(rawPerf); } catch(e) {}
          } else if (typeof rawPerf === 'object') {
            meta = rawPerf;
          }

          if (meta.runNotes) cleanNotes = meta.runNotes;
          if (meta.perfScore !== undefined) pScore = Number(meta.perfScore);
          if (meta.smoothness !== undefined) sScore = Number(meta.smoothness);
          if (meta.footwork !== undefined) fScore = Number(meta.footwork);
          if (r.notes && !cleanNotes) cleanNotes = String(r.notes).trim();

          const orderKey = meta.order !== undefined ? meta.order : Object.keys(itemsByOrder).length;
          if (!itemsByOrder[orderKey]) {
            itemsByOrder[orderKey] = {
              id: meta.itemId || ('pitem-' + orderKey),
              type: meta.type || (meta.comboName ? 'combo' : 'single'),
              name: meta.comboName || r.trickName || r.trickname,
              category: r.category || 'OTHERS',
              family: r.family || 'Custom',
              rows: []
            };
          }
          itemsByOrder[orderKey].rows.push({ row: r, meta: meta });
        });

        const reconstructedItems = Object.keys(itemsByOrder).sort((a, b) => Number(a) - Number(b)).map(orderKey => {
          const group = itemsByOrder[orderKey];
          if (group.type === 'combo') {
            const comboTricks = [];
            const comboSubCompleted = {};
            group.rows.sort((a, b) => Number(a.meta.subIndex || 0) - Number(b.meta.subIndex || 0)).forEach((rObj, idx) => {
              comboTricks.push(rObj.row.trickName || rObj.row.trickname);
              const isDone = Boolean(rObj.meta.isSubDone !== undefined ? rObj.meta.isSubDone : (Number(rObj.row.completedCones || rObj.row.completedcones || 0) > 0));
              comboSubCompleted[idx] = isDone;
            });
            const allDone = comboTricks.length > 0 && comboTricks.every((_, i) => comboSubCompleted[i] === true);
            return {
              id: group.id,
              type: 'combo',
              name: group.name,
              comboTricks: comboTricks,
              category: group.category,
              family: group.family,
              completed: allDone,
              comboSubCompleted: comboSubCompleted
            };
          } else {
            const rObj = group.rows[0];
            const isDone = Boolean(rObj.meta.completed !== undefined ? rObj.meta.completed : (Number(rObj.row.completedCones || rObj.row.completedcones || 0) > 0));
            return {
              id: group.id,
              type: 'single',
              name: rObj.row.trickName || rObj.row.trickname,
              category: group.category,
              family: group.family,
              completed: isDone
            };
          }
        });

        let totalIndividual = 0;
        let completedIndividual = 0;
        reconstructedItems.forEach(it => {
          if (it.type === 'combo') {
            const c = it.comboTricks.length;
            totalIndividual += c;
            for (let i = 0; i < c; i++) {
              if (it.comboSubCompleted && it.comboSubCompleted[i] === true) completedIndividual++;
            }
          } else {
            totalIndividual += 1;
            if (it.completed) completedIndividual += 1;
          }
        });

        const reconstructedSnap = {
          id: sId,
          title: firstRow.trickName || firstRow.trickname || 'Performance Run #1 (2 min)',
          smoothness: sScore,
          footwork: fScore,
          notes: cleanNotes,
          items: reconstructedItems
        };

        if (typeof PERFORMANCE_SCORING_CONFIG !== 'undefined' && PERFORMANCE_SCORING_CONFIG.calculatePerformanceScore) {
          const calc = PERFORMANCE_SCORING_CONFIG.calculatePerformanceScore(reconstructedSnap);
          pScore = calc.totalScore;
        }

        return {
          sessionId: sId,
          userId: firstRow.userId || firstRow.userid || '',
          skaterName: firstRow.skaterName || firstRow.skatername || '',
          date: formatNormalizedDate(firstRow.date),
          sessionType: 'Performance',
          trickName: firstRow.trickName || firstRow.trickname || 'Performance Run #1 (2 min)',
          category: 'PERFORMANCE',
          family: completedIndividual >= 9 ? 'Valid' : 'Incomplete',
          targetCones: totalIndividual,
          completedCones: completedIndividual,
          missedCones: Math.max(0, totalIndividual - completedIndividual),
          falls: Number(firstRow.falls || 0),
          successRate: totalIndividual > 0 ? parseFloat(((completedIndividual / totalIndividual) * 100).toFixed(1)) : 0,
          connectedCompletion: 'N/A',
          targetAttempts: totalIndividual,
          completedAttempts: completedIndividual,
          performanceScore: pScore,
          smoothnessScore: sScore,
          footworkScore: fScore,
          performanceSnapshot: reconstructedSnap,
          notes: cleanNotes
        };
      }).filter(Boolean);

      return [...normalizedStandards, ...normalizedPerfs];
    }

    window.normalizeSessionRecords = normalizeSessionRecords;
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
      const userRecords = typeof getUserFilteredSessions === 'function' ? getUserFilteredSessions() : appState.sessions;

      const trainingRecords = userRecords.filter(s => (s.sessionType || s.sessiontype) !== 'Rest' && (s.trickName || s.trickname) !== 'Rest Day');
      const restSessions = userRecords.filter(s => (s.sessionType || s.sessiontype) === 'Rest' || (s.trickName || s.trickname) === 'Rest Day');

      // Group by calendar date: 1 calendar day = 1 training session
      const totalTrainingSessions = new Set(trainingRecords.map(s => s.date).filter(Boolean)).size;
      const totalRestDays = new Set(restSessions.map(s => s.date).filter(Boolean)).size;
      const singleTricks = trainingRecords.filter(s => (s.sessionType || s.sessiontype) === 'Single').length;
      const comboTricks = trainingRecords.filter(s => (s.sessionType || s.sessiontype) === 'Combo').length;
      const perfSessions = trainingRecords.filter(s => (s.sessionType || s.sessiontype) === 'Performance').length;
      const totalFalls = trainingRecords.reduce((acc, curr) => acc + Number(curr.falls || 0), 0);

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
              <div class="mag-card-label">Training Sessions</div>
              <div class="mag-card-value" style="font-size:1.3rem;">${totalTrainingSessions}</div>
              <div class="mag-card-sub">${singleTricks} single / ${comboTricks} combo / ${perfSessions} perf</div>
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
// 1. WORLD SKATE STANDARD — DETAILED RULES VIEWER
    function openWorldSkateRulesModal(sectionAnchor) {
      let modal = document.getElementById('worldSkateRulesModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'worldSkateRulesModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="rulebook-modal-wrap">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px; border-bottom:1px solid var(--border-razor); padding-bottom:12px;">
            <div>
              <h2 style="font-family:var(--font-display); font-size:1.35rem; font-weight:800; color:var(--primary);">📖 World Skate Inline Freestyle Rules 2026</h2>
              <div class="label-caps" style="margin-top:2px;">Freestyle Slalom Classic Official Regulations</div>
            </div>
            <button type="button" class="cal-nav-btn" onclick="closeWorldSkateRulesModal()" style="width:34px; height:34px;">✕</button>
          </div>

          <!-- Section 1: Competition Area -->
          <div class="rule-block">
            <div class="rule-block-title">🏟️ 1. Competition Area &amp; Course Requirements</div>
            <div class="rule-text-content">
              <ul>
                <li><strong>3 Cone Lines</strong> parallel to each other, spaced <strong>2 meters</strong> apart.</li>
                <li><strong>50 cm Line</strong>: 20 Cones (closest to judges).</li>
                <li><strong>80 cm Line</strong>: 20 Cones (center line, base execution standard).</li>
                <li><strong>120 cm Line</strong>: 14 Cones (furthest from judges).</li>
                <li>The center of each cone line must align with the judges' table.</li>
                <li><strong>Course Requirement</strong>: Skaters must perform in all three cone lines and cross every cone interval.</li>
              </ul>
            </div>
          </div>

          <!-- Section 2: Competition Regulations & Starting Order -->
          <div class="rule-block">
            <div class="rule-block-title">📋 2. Competition Regulations &amp; Starting Order</div>
            <div class="rule-text-content">
              <ul>
                <li><strong>Rounds</strong>: Standard single round. Qualification rounds added when skater volume is high. Top-ranked skaters may be prequalified.</li>
                <li><strong>Starting Order</strong>: Determined by latest International World Ranking, lowest ranked performing first. Unranked skaters perform first in random order.</li>
                <li>Qualification and Final performance regulations and grading criteria are identical.</li>
              </ul>
            </div>
          </div>

          <!-- Section 3: Timing -->
          <div class="rule-block">
            <div class="rule-block-title">⏱️ 3. Timing Regulations</div>
            <div class="rule-text-content">
              <ul>
                <li><strong>Allowed Duration</strong>: <strong>105 seconds – 120 seconds</strong> (1 min 45 sec to 2 min).</li>
                <li><strong>Start</strong>: Timing begins when the music starts (music starts when the skater signals readiness).</li>
                <li><strong>End</strong>: Timing stops when the skater signals completion or the music stops.</li>
                <li><strong>Timing Penalty</strong>: Runs finishing under 105s or exceeding 120s receive a <strong>10-point penalty</strong>.</li>
              </ul>
            </div>
          </div>

          <!-- Section 4: Clothing & Performance Behaviour -->
          <div class="rule-block">
            <div class="rule-block-title">🥋 4. Clothing, Behaviour &amp; Music Regulations</div>
            <div class="rule-text-content">
              <ul>
                <li><strong>Clothing</strong>: Must be dignified, appropriate for sport, and not overly revealing. Props are strictly prohibited (results in disqualification).</li>
                <li><strong>Accessories</strong>: Integral costume accessories (hairbands, wristbands) permitted; deliberate removal or throwing constitutes a prop violation.</li>
                <li><strong>Behaviour</strong>: Disrespectful, insulting, or unsportsmanlike movements toward judges result in penalties or disqualification.</li>
                <li><strong>Music Neutrality</strong>: Must respect Olympic Charter Rule 50 (political and religious neutrality; no racist, political, violent, or offensive content). Late music submission incurs a 10-point penalty.</li>
              </ul>
            </div>
          </div>

          <!-- Section 5: Grading & Score (anchor: grading) -->
          <div class="rule-block" id="ruleSectionGrading">
            <div class="rule-block-title">🎯 5. Grading Components &amp; Score (Max 130 Points)</div>
            <div class="rule-text-content">
              <ul>
                <li><strong>Technique Score (10 – 60 Points)</strong>: Evaluates slalom trick difficulty based on the Tricks Matrix, execution speed, continuity, variety across families, and freestyle footwork. Must successfully execute at least <strong>8 tricks</strong>.</li>
                <li><strong>Artistic Score (0 – 70 Points)</strong>: Evaluates body performance/synchronization, musical expression/rhythm matching, and strategic trick management across lines. Guideline range: Technique Score ±10 pts.</li>
                <li><strong>Final Score</strong>: (Technique + Artistic) − Penalty Deductions. Processed using the Victory Point System for judge rankings.</li>
              </ul>
            </div>
          </div>

          <!-- Section 6: Trick Standards & Execution -->
          <div class="rule-block">
            <div class="rule-block-title">⚡ 6. Trick Standard, Minimums &amp; Footwork</div>
            <div class="rule-text-content">
              <ul>
                <li><strong>Minimum Execution</strong>: Non-spinning tricks require at least <strong>4 cones</strong>; spinning tricks require at least <strong>3 rotations</strong>.</li>
                <li><strong>Baseline standard</strong> assumes smoothness and average speed on an <strong>80 cm cone line</strong>.</li>
                <li>Transitions and foot switches between families must be continuous without pauses. Unclear execution, touching during jumps, or loss of trajectory invalidates the trick.</li>
              </ul>
            </div>
          </div>

          <!-- Section 7: Trick Families -->
          <div class="rule-block">
            <div class="rule-block-title">🛼 7. The Five Trick Families</div>
            <div class="rule-text-content">
              <ul>
                <li><strong>Sitting</strong>: Squatting position with waist at or below knee level throughout the cone passage.</li>
                <li><strong>Jumping</strong>: Both feet must be airborne simultaneously during the interval.</li>
                <li><strong>Spinning</strong>: At least one wheel touching while rotating, remaining within the cone line.</li>
                <li><strong>Wheeling</strong>: Linear forward or backward movement with only one wheel touching the ground.</li>
                <li><strong>Others</strong>: Technical slalom patterns, eagles, and footwork outside the four main families.</li>
              </ul>
            </div>
          </div>

          <!-- Section 8: Penalties Reference -->
          <div class="rule-block">
            <div class="rule-block-title">⚠️ 8. Penalties &amp; Deductions Reference</div>
            <div class="rule-text-content">
              <ul>
                <li><strong>Moved/Kicked Cone</strong>: <strong>−1 point</strong> for each cone moved enough to reveal its center point mark.</li>
                <li><strong>Missed Intervals</strong>: <strong>−5 points</strong> if more than 5 intervals are missed during the run.</li>
                <li><strong>Loss of Balance</strong>: <strong>−0.5 to −1.5 points</strong> per occurrence.</li>
                <li><strong>Falls</strong>: <strong>−2 points</strong> (light fall) to <strong>−5 points</strong> (heavy impact fall).</li>
                <li><strong>Missing Tricks / Families</strong>: <strong>−2 points</strong> per trick under 8; <strong>−3 points</strong> per missing required trick family.</li>
                <li><strong>Internal Interruption</strong>: <strong>−5 points</strong> (performance judged up to stopping point).</li>
              </ul>
            </div>
          </div>
        </div>
      `;

      modal.style.display = 'flex';

      if (sectionAnchor === 'grading') {
        setTimeout(() => {
          const el = document.getElementById('ruleSectionGrading');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }

    function closeWorldSkateRulesModal() {
      const modal = document.getElementById('worldSkateRulesModal');
      if (modal) modal.style.display = 'none';
    }

    // 2. TRICKS MATRIX — OFFICIAL IMAGE VIEWER
    function openMatrixImageModal() {
      let modal = document.getElementById('matrixImageModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'matrixImageModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="matrix-image-modal-wrap">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-razor); padding-bottom:12px;">
            <div style="text-align:left;">
              <h2 style="font-family:var(--font-display); font-size:1.25rem; font-weight:800; color:var(--primary);">📊 Freestyle Slalom Tricks Matrix 2026</h2>
              <div class="label-caps" style="margin-top:2px;">Appendix A: Official Difficulty &amp; Family Ratings</div>
            </div>
            <button type="button" class="cal-nav-btn" onclick="closeMatrixImageModal()" style="width:34px; height:34px;">✕</button>
          </div>

          <div class="matrix-img-container">
            <img src="assets/trickmatrix.png" class="matrix-full-img" alt="Official Freestyle Slalom Tricks Matrix 2026" onerror="this.alt='Matrix image not found at assets/trickmatrix.png';">
          </div>
        </div>
      `;

      modal.style.display = 'flex';
    }

    function closeMatrixImageModal() {
      const modal = document.getElementById('matrixImageModal');
      if (modal) modal.style.display = 'none';
    }

    window.openWorldSkateRulesModal = openWorldSkateRulesModal;
    window.closeWorldSkateRulesModal = closeWorldSkateRulesModal;
    window.openMatrixImageModal = openMatrixImageModal;
    window.closeMatrixImageModal = closeMatrixImageModal;

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
      const userSessions = typeof getUserFilteredSessions === 'function' ? getUserFilteredSessions() : appState.sessions;

      const trainingDays = new Set(userSessions.filter(s => (s.sessionType || s.sessiontype) !== 'Rest' && (s.trickName || s.trickname) !== 'Rest Day').map(s => s.date).filter(Boolean)).size;
      const uniqueDays = new Set(userSessions.map(s => s.date).filter(Boolean)).size;
      const totalTricks = userSessions.filter(s => (s.sessionType || s.sessiontype) === 'Single').length;
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
              <div class="metric-value" style="font-size:1.2rem;">${trainingDays}</div>
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

      safeSetTextContent('authHeadingText', isReg ? 'Create Account' : 'Sign In');
      safeSetTextContent('authSubtitleText', isReg ? 'Register a new skater protocol profile' : 'Access your inline freestyle protocol & records');
      safeSetTextContent('authSwitchPrompt', isReg ? 'Already have an account?' : "Don't have an account?");
      safeSetTextContent('authSwitchBtn', isReg ? 'Log In' : 'Sign Up');

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
  // Standard Layout: Dash (0) | Train (1) | History (2) | Custom Tricks (3)
  const indexMap = { dashboard: 0, log: 1, history: 2, tricks: 3 };
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
