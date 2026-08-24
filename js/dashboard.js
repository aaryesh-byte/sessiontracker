// Dashboard/progress functionality.


    let isSyncingData = false;

    async function syncUserDataFromSheets() {
      if (!appState.currentUser || isSyncingData) return;

      const btn = document.getElementById('btnSyncDashboard');
      isSyncingData = true;

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '🔄 Syncing...';
      }

      try {
        if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === "YOUR_APPS_SCRIPT_WEB_APP_URL") {
          throw new Error('Google Apps Script URL is not configured in js/config.js.');
        }

        const activeSkater = appState.currentUser.skaterName || appState.currentUser.username;
        const activeUsername = appState.currentUser.username || appState.currentUser.skaterName;

        const payload = {
          skaterName: activeSkater,
          username: activeUsername,
          userId: activeSkater
        };

        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'syncUserData',
            payload: payload
          })
        });

        const json = await response.json();

        if (json.status === 'success' && json.data) {
          appState.sessions = Array.isArray(json.data.sessions) ? json.data.sessions : [];
          appState.customTricks = Array.isArray(json.data.customTricks) ? json.data.customTricks : [];

          populateProgressTrickFilter();
          renderAnalytics();

          const histContainer = document.getElementById('historyList');
          if (histContainer) renderHistory();

          const custContainer = document.getElementById('customTricksList');
          if (custContainer) renderCustomTricksList();

          showToast('Data synced with RollSync Cloud!', 'success');
        } else {
          showToast(json.message || 'Unable to sync data from backend.', 'error');
          renderAnalytics();
        }
      } catch (err) {
        console.error('Sync Error:', err);
        showToast(err.message || 'Unable to connect with the backend.', 'error');
        renderAnalytics();
      } finally {
        isSyncingData = false;
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '🔄 Sync Data';
        }
      }
    }

    function populateProgressTrickFilter() {
      const select = document.getElementById('progTrick');
      if (!select || !appState.currentUser) return;

      const searchInput = document.getElementById('progTrickSearch');
      const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';

      const skaterSessions = appState.sessions.filter(s => 
        String(s.skaterName || s.skatername || s.userid).toLowerCase() === String(appState.currentUser.skaterName).toLowerCase()
      );
      const uniqueTricks = [...new Map(skaterSessions.map(item => [item.trickName || item.trickname, item])).values()];

      select.innerHTML = '<option value="ALL">All Practice Items & Combos</option>';
      uniqueTricks.forEach(t => {
        const name = t.trickName || t.trickname;
        if (!searchVal || name.toLowerCase().includes(searchVal)) {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          select.appendChild(opt);
        }
      });
    }


    function onTimeRangeFilterChange() {
      const rangeEl = document.getElementById('progTimeRange');
      const val = rangeEl ? rangeEl.value : 'THIS_MONTH';

      const specMonth = document.getElementById('groupSpecificMonth');
      if (specMonth) specMonth.style.display = val === 'SPECIFIC_MONTH' ? 'block' : 'none';

      const custRange = document.getElementById('groupCustomRange');
      if (custRange) custRange.style.display = val === 'CUSTOM_RANGE' ? 'grid' : 'none';

      renderAnalytics();
    }


    function renderAnalytics() {
      if (!appState.currentUser) return;

      const timeRangeEl = document.getElementById('progTimeRange');
      const timeRange = timeRangeEl ? timeRangeEl.value : 'THIS_MONTH';

      const monthEl = document.getElementById('progMonth');
      const selectedMonth = monthEl ? monthEl.value : '';

      const startEl = document.getElementById('progStartDate');
      const startDate = startEl ? startEl.value : '';

      const endEl = document.getElementById('progEndDate');
      const endDate = endEl ? endEl.value : '';

      const catEl = document.getElementById('progCategory');
      const selectedCat = catEl ? catEl.value : 'ALL';

      const trickEl = document.getElementById('progTrick');
      const selectedTrick = trickEl ? trickEl.value : 'ALL';

      const now = new Date();

      const filtered = appState.sessions.filter(s => {
        const skaterMatch = String(s.skaterName || s.skatername || s.userid).toLowerCase() === String(appState.currentUser.skaterName).toLowerCase();
        if (!skaterMatch) return false;

        const sessionDate = new Date(s.date);
        if (timeRange === 'TODAY') {
          const todayStr = new Date().toISOString().split('T')[0];
          if (s.date !== todayStr) return false;
        } else if (timeRange === 'THIS_WEEK') {
          const diffDays = Math.ceil(Math.abs(now - sessionDate) / (1000 * 60 * 60 * 24));
          if (diffDays > 7) return false;
        } else if (timeRange === 'THIS_MONTH') {
          if (sessionDate.getMonth() !== now.getMonth() || sessionDate.getFullYear() !== now.getFullYear()) return false;
        } else if (timeRange === 'SPECIFIC_MONTH') {
          if (selectedMonth && !String(s.date).startsWith(selectedMonth)) return false;
        } else if (timeRange === 'CUSTOM_RANGE') {
          if (startDate && s.date < startDate) return false;
          if (endDate && s.date > endDate) return false;
        }

        if (selectedCat !== 'ALL' && s.category !== selectedCat) return false;
        if (selectedTrick !== 'ALL' && (s.trickName || s.trickname) !== selectedTrick) return false;

        return true;
      });

      const totalSessions = filtered.length;
      const totalTarget = filtered.reduce((acc, curr) => acc + Number(curr.targetCones || curr.targetcones), 0);
      const totalCompleted = filtered.reduce((acc, curr) => acc + Number(curr.completedCones || curr.completedcones), 0);
      const totalFalls = filtered.reduce((acc, curr) => acc + Number(curr.falls), 0);
      const avgSuccess = totalTarget > 0 ? ((totalCompleted / totalTarget) * 100).toFixed(1) : '0';

      const comboSessions = filtered.filter(s => (s.sessionType === 'Combo' || s.sessiontype === 'Combo') && s.connectedCompletion && s.connectedCompletion !== 'N/A');
      let avgConnected = '0';
      if (comboSessions.length > 0) {
        const sumConn = comboSessions.reduce((acc, curr) => acc + parseFloat(curr.connectedCompletion || 0), 0);
        avgConnected = (sumConn / comboSessions.length).toFixed(1);
      }

      safeSetTextContent('mSessions', totalSessions);
      safeSetTextContent('mSuccess', `${avgSuccess}%`);
      safeSetTextContent('mCompleted', totalCompleted);
      safeSetTextContent('mFalls', totalFalls);
      safeSetTextContent('mConnected', `${avgConnected}%`);

      renderChartSuccessRate(filtered);
      renderChartCones(filtered);
      renderChartTricks(filtered);
      renderChartFalls(filtered);
    }


    function getSafeCanvasContext(canvasId) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return null;
      if (!canvas.offsetParent && canvas.offsetWidth === 0 && canvas.offsetHeight === 0) return null;
      try {
        return canvas.getContext('2d');
      } catch(e) { return null; }
    }


    function destroyChartInstance(key) {
      if (appState.charts[key]) {
        try { appState.charts[key].destroy(); } catch(e) {}
        appState.charts[key] = null;
      }
    }


    function renderChartSuccessRate(sessions) {
      const ctx = getSafeCanvasContext('chartSuccessRate');
      if (!ctx) return;
      destroyChartInstance('successRate');

      const grouped = {};
      sessions.slice().reverse().forEach(s => {
        if (!grouped[s.date]) grouped[s.date] = { target: 0, completed: 0 };
        grouped[s.date].target += Number(s.targetCones || s.targetcones);
        grouped[s.date].completed += Number(s.completedCones || s.completedcones);
      });

      const labels = Object.keys(grouped);
      const data = labels.map(d => ((grouped[d].completed / grouped[d].target) * 100).toFixed(1));

      appState.charts.successRate = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Cone Success Rate %',
            data: data,
            borderColor: '#00ffc2',
            backgroundColor: 'rgba(0, 255, 194, 0.12)',
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#00ffc2'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
      });
    }


    function renderChartCones(sessions) {
      const ctx = getSafeCanvasContext('chartCones');
      if (!ctx) return;
      destroyChartInstance('cones');

      const grouped = {};
      sessions.slice().reverse().forEach(s => {
        if (!grouped[s.date]) grouped[s.date] = { target: 0, completed: 0 };
        grouped[s.date].target += Number(s.targetCones || s.targetcones);
        grouped[s.date].completed += Number(s.completedCones || s.completedcones);
      });

      const labels = Object.keys(grouped);

      appState.charts.cones = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            { label: 'Target Cones', data: labels.map(d => grouped[d].target), borderColor: '#83958c', backgroundColor: 'transparent', borderWidth: 2, tension: 0.3 },
            { label: 'Completed Cones', data: labels.map(d => grouped[d].completed), borderColor: '#00ffc2', backgroundColor: 'rgba(0, 255, 194, 0.12)', fill: true, borderWidth: 2, tension: 0.3 }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }


    function renderChartTricks(sessions) {
      const ctx = getSafeCanvasContext('chartTricks');
      if (!ctx) return;
      destroyChartInstance('tricks');

      const trickStats = {};
      sessions.forEach(s => {
        const name = s.trickName || s.trickname;
        if (!trickStats[name]) trickStats[name] = { target: 0, completed: 0 };
        trickStats[name].target += Number(s.targetCones || s.targetcones);
        trickStats[name].completed += Number(s.completedCones || s.completedcones);
      });

      const labels = Object.keys(trickStats);
      const data = labels.map(l => ((trickStats[l].completed / trickStats[l].target) * 100).toFixed(1));

      appState.charts.tricks = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Avg Success %',
            data: data,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.12)',
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 4
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }
      });
    }


    function renderChartFalls(sessions) {
      const ctx = getSafeCanvasContext('chartFalls');
      if (!ctx) return;
      destroyChartInstance('falls');

      const grouped = {};
      sessions.slice().reverse().forEach(s => {
        if (!grouped[s.date]) grouped[s.date] = 0;
        grouped[s.date] += Number(s.falls);
      });

      const labels = Object.keys(grouped);

      appState.charts.falls = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Falls Count',
            data: labels.map(d => grouped[d]),
            borderColor: '#f87171',
            backgroundColor: 'rgba(248, 113, 113, 0.12)',
            fill: true,
            tension: 0.35,
            borderWidth: 2
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
      });
    }