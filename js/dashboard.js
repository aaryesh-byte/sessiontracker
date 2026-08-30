// Dashboard/progress functionality.


    let isSyncingData = false;
let calCurrentYear = new Date().getFullYear();
let calCurrentMonth = new Date().getMonth();
let calSelectedDate = null;

    async function syncUserDataFromSheets() {
      if (!appState.currentUser || isSyncingData) return;

      const btn = document.getElementById('btnSyncDashboard');
      const label = document.getElementById('btnSyncDashboardLabel');
      isSyncingData = true;

      if (btn) {
        btn.disabled = true;
        btn.classList.add('is-syncing');
        if (label) label.textContent = 'Syncing...';
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
          appState.sessions = Array.isArray(json.data.sessions) ? normalizeSessionRecords(json.data.sessions) : [];
          appState.customTricks = Array.isArray(json.data.customTricks) ? json.data.customTricks : [];

          // 100% Cloud-Authoritative cross-device Master Performance sync
          const userKey = String(appState.currentUser.userId || activeSkater || activeUsername || '').toLowerCase();
          if (json.data.masterPerformance && typeof json.data.masterPerformance === 'object') {

          }

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
          btn.classList.remove('is-syncing');
          const label = document.getElementById('btnSyncDashboardLabel');
          if (label) label.textContent = 'Sync Data';
        }
      }
    }

    function populateProgressTrickFilter() {
      const select = document.getElementById('progTrick');
      if (!select || !appState.currentUser) return;

      const searchInput = document.getElementById('progTrickSearch');
      const searchVal = searchInput ? searchInput.value : '';

      const skaterSessions = getUserFilteredSessions();
      const uniqueTricks = [...new Map(skaterSessions.map(item => [item.trickName || item.trickname, item])).values()];

      select.innerHTML = '<option value="ALL">All Practice Items & Combos</option>';
      uniqueTricks.forEach(t => {
        const name = t.trickName || t.trickname;
        if (matchTrickKeywords(name, searchVal)) {
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

      const userSessions = getUserFilteredSessions();
      const filtered = userSessions.filter(s => {
        if (!s.date) return false;
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

      // 1 calendar day = 1 training session count
      const uniqueTrainingDays = new Set(
        filtered.filter(s => (s.sessionType || s.sessiontype) !== 'Rest' && (s.trickName || s.trickname) !== 'Rest Day')
                .map(s => s.date).filter(Boolean)
      ).size;

      const totalTarget = filtered.reduce((acc, curr) => acc + Number(curr.targetCones || curr.targetcones || 0), 0);
      const totalCompleted = filtered.reduce((acc, curr) => acc + Number(curr.completedCones || curr.completedcones || 0), 0);
      const totalFalls = filtered.reduce((acc, curr) => acc + Number(curr.falls || 0), 0);
      const avgSuccess = totalTarget > 0 ? ((totalCompleted / totalTarget) * 100).toFixed(1) : '0';

      const comboSessions = filtered.filter(s => (s.sessionType === 'Combo' || s.sessiontype === 'Combo') && s.connectedCompletion && s.connectedCompletion !== 'N/A');
      let avgConnected = '0';
      if (comboSessions.length > 0) {
        const sumConn = comboSessions.reduce((acc, curr) => acc + parseFloat(curr.connectedCompletion || 0), 0);
        avgConnected = (sumConn / comboSessions.length).toFixed(1);
      }

      safeSetTextContent('mSessions', uniqueTrainingDays);
      safeSetTextContent('mSuccess', `${avgSuccess}%`);
      safeSetTextContent('mCompleted', totalCompleted);
      safeSetTextContent('mFalls', totalFalls);
      safeSetTextContent('mConnected', `${avgConnected}%`);

      renderStreaks();
      renderTrainingCalendar();
      renderPersonalBests();

      renderChartSuccessRate(filtered);
      renderChartCones(filtered);
      renderChartTricks(filtered);
      renderChartFalls(filtered);
    }

    function getUserFilteredSessions() {
      if (!appState.currentUser || !appState.sessions) return [];
      const keys = new Set();
      if (appState.currentUser.userId) keys.add(String(appState.currentUser.userId).trim().toLowerCase());
      if (appState.currentUser.skaterName) keys.add(String(appState.currentUser.skaterName).trim().toLowerCase());
      if (appState.currentUser.username) keys.add(String(appState.currentUser.username).trim().toLowerCase());

      return appState.sessions.filter(s => {
        const recUser = String(s.userId || s.userid || s.skaterName || s.skatername || '').trim().toLowerCase();
        return keys.has(recUser);
      });
    }

    function calculateSkaterStreaks() {
      const skaterRecords = getUserFilteredSessions();
      if (skaterRecords.length === 0) {
        return { current: 0, longest: 0, trainingDays: 0, restDays: 0, thisMonthDays: 0, mostRecentDate: 'None' };
      }

      // Distinguish real training sessions from rest days (1 calendar day = 1 session)
      const trainingSessions = skaterRecords.filter(s => {
        const sType = String(s.sessionType || '').trim().toLowerCase();
        return sType !== 'rest' && s.trickName !== 'Rest Day';
      });

      const restSessions = skaterRecords.filter(s => {
        const sType = String(s.sessionType || s.sessiontype || '').trim().toLowerCase();
        return sType === 'rest' || (s.trickName || s.trickname) === 'Rest Day';
      });

      const trainingDateSet = new Set(trainingSessions.map(s => s.date).filter(Boolean));
      const restDateSet = new Set(restSessions.map(s => s.date).filter(Boolean));
      const sortedTrainingDates = Array.from(trainingDateSet).sort();

      const currentMonthStr = new Date().toISOString().slice(0, 7);
      let thisMonthDays = 0;
      trainingDateSet.forEach(d => {
        if (d.startsWith(currentMonthStr)) thisMonthDays++;
      });

      if (sortedTrainingDates.length === 0) {
        return {
          current: 0,
          longest: 0,
          trainingDays: 0,
          restDays: restDateSet.size,
          thisMonthDays: 0,
          mostRecentDate: 'None'
        };
      }

      let longest = 1;
      let tempStreak = 1;

      for (let i = 1; i < sortedTrainingDates.length; i++) {
        const prev = new Date(sortedTrainingDates[i - 1]);
        const curr = new Date(sortedTrainingDates[i]);
        const diffDays = Math.round(Math.abs(curr - prev) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
          if (tempStreak > longest) longest = tempStreak;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }

      // Calculate current active streak from today or yesterday
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      now.setDate(now.getDate() - 1);
      const yestStr = now.toISOString().split('T')[0];

      let current = 0;
      const lastTrainingDate = sortedTrainingDates[sortedTrainingDates.length - 1];

      if (lastTrainingDate === todayStr || lastTrainingDate === yestStr) {
        let runner = new Date(lastTrainingDate);
        current = 1;
        while (true) {
          runner.setDate(runner.getDate() - 1);
          const checkStr = runner.toISOString().split('T')[0];
          if (trainingDateSet.has(checkStr)) {
            current++;
          } else {
            break;
          }
        }
      }

      return {
        current,
        longest,
        trainingDays: trainingDateSet.size,
        restDays: restDateSet.size,
        thisMonthDays,
        mostRecentDate: lastTrainingDate || 'None'
      };
    }

    function renderStreaks() {
      const streaks = calculateSkaterStreaks();
      safeSetTextContent('streakCurrentVal', `${streaks.current} ${streaks.current === 1 ? 'Day' : 'Days'}`);
      safeSetTextContent('streakLongestVal', `${streaks.longest} ${streaks.longest === 1 ? 'Day' : 'Days'}`);
    }

    function navCalendar(delta) {
      calCurrentMonth += delta;
      if (calCurrentMonth > 11) {
        calCurrentMonth = 0;
        calCurrentYear++;
      } else if (calCurrentMonth < 0) {
        calCurrentMonth = 11;
        calCurrentYear--;
      }
      renderTrainingCalendar();
    }

    function renderTrainingCalendar() {
      const grid = document.getElementById('calendarGridCells');
      const title = document.getElementById('calMonthTitle');
      if (!grid || !title || !appState.currentUser) return;

      const dateObj = new Date(calCurrentYear, calCurrentMonth, 1);
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      title.textContent = `${monthNames[calCurrentMonth]} ${calCurrentYear}`;

      const userSessions = getUserFilteredSessions();

      const sessionDateMap = {};
      userSessions.forEach(s => {
        if (!s.date) return;
        if (!sessionDateMap[s.date]) sessionDateMap[s.date] = [];
        sessionDateMap[s.date].push(s);
      });

      let firstDay = dateObj.getDay() - 1;
      if (firstDay === -1) firstDay = 6;

      const totalDays = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();
      const todayStr = new Date().toISOString().split('T')[0];

      let html = '';

      for (let i = 0; i < firstDay; i++) {
        html += `<div class="cal-cell empty"></div>`;
      }

      for (let d = 1; d <= totalDays; d++) {
        const mm = String(calCurrentMonth + 1).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        const dateKey = `${calCurrentYear}-${mm}-${dd}`;
        const dayRecords = sessionDateMap[dateKey] || [];

        const isRest = dayRecords.some(r => r.sessionType === 'Rest' || r.trickName === 'Rest Day');
        const hasTraining = dayRecords.some(r => r.sessionType !== 'Rest' && r.trickName !== 'Rest Day');
        const isToday = dateKey === todayStr;
        const isSelected = dateKey === calSelectedDate;

        let classes = ['cal-cell'];
        if (hasTraining) classes.push('has-training');
        else if (isRest) classes.push('has-rest');

        if (isToday) classes.push('today');
        if (isSelected) classes.push('selected');

        let indicator = '';
        if (hasTraining) {
          indicator = `<span class="cal-fire-green" title="Training Day">🔥</span>`;
        } else if (isRest) {
          indicator = `<span class="cal-fire-yellow" title="Rest Day">🔥</span>`;
        }

        html += `
          <div class="${classes.join(' ')}" onclick="selectCalendarDate('${dateKey}')">
            <span>${d}</span>
            ${indicator}
          </div>
        `;
      }

      grid.innerHTML = html;
    }

    function selectCalendarDate(dateKey) {
      calSelectedDate = dateKey;
      renderTrainingCalendar();

      const summary = document.getElementById('calendarDaySummary');
      if (!summary || !appState.currentUser) return;

      const daySessions = getUserFilteredSessions().filter(s => s.date === dateKey);

      if (daySessions.length === 0) {
        summary.style.display = 'block';
        summary.innerHTML = `
          <div style="font-size:0.8125rem; color:var(--on-surface-muted); text-align:center; padding:6px 0;">
            No activity logged on <strong>${dateKey}</strong>. Unlogged Date.
          </div>
        `;
        return;
      }

      const isExplicitRest = daySessions.some(s => (s.sessionType || s.sessiontype) === 'Rest' || (s.trickName || s.trickname) === 'Rest Day');
      if (isExplicitRest) {
        const restRec = daySessions.find(s => (s.sessionType || s.sessiontype) === 'Rest' || (s.trickName || s.trickname) === 'Rest Day');
        summary.style.display = 'block';
        summary.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="font-size:0.875rem; color:#fbbf24;">🟡 Rest &amp; Recovery Day (${dateKey})</strong>
            <span class="badge badge-rest">Logged Rest</span>
          </div>
          <div style="font-size:0.8125rem; color:var(--on-surface); font-style:italic;">
            Note: "${restRec.notes || 'Intentional Recovery'}"
          </div>
        `;
        return;
      }

      const singleCount = daySessions.filter(s => (s.sessionType || s.sessiontype) !== 'Combo').length;
      const comboCount = daySessions.filter(s => (s.sessionType || s.sessiontype) === 'Combo').length;
      const totalCompleted = daySessions.reduce((acc, curr) => acc + Number(curr.completedCones || curr.completedcones || 0), 0);
      const avgRate = (daySessions.reduce((acc, curr) => acc + parseFloat(curr.successRate || curr.successrate || 0), 0) / daySessions.length).toFixed(1);

      summary.style.display = 'block';
      summary.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <strong style="font-size:0.875rem; color:var(--primary);">🗓️ Summary for ${dateKey}</strong>
          <button type="button" class="btn btn-secondary btn-sm" onclick="filterHistoryToDate('${dateKey}')">View in History</button>
        </div>
        <div class="history-stats" style="margin-top:0;">
          <span>🎯 Tricks: ${singleCount}</span>
          <span>🔗 Combos: ${comboCount}</span>
          <span>✅ Total Cones: ${totalCompleted}</span>
          <span>⚡ Avg Success: ${avgRate}%</span>
        </div>
      `;
    }

    function filterHistoryToDate(dateKey) {
      switchTab('history');
      setTimeout(() => {
        const histDate = document.getElementById('histDate');
        if (histDate) {
          histDate.value = dateKey;
          renderHistory();
        }
      }, 100);
    }

    function renderPersonalBests() {
      const tricksContainer = document.getElementById('pbTricksList');
      const combosContainer = document.getElementById('pbCombosList');
      if (!tricksContainer || !combosContainer || !appState.currentUser) return;

      const userSessions = getUserFilteredSessions();

      const trickBests = {};
      const comboBests = {};

      userSessions.forEach(s => {
        const name = s.trickName || s.trickname;
        if (!name) return;
        const completed = Number(s.completedCones || s.completedcones || 0);
        const isCombo = (s.sessionType || s.sessiontype) === 'Combo';

        if (!isCombo) {
          if (!trickBests[name] || completed > trickBests[name]) {
            trickBests[name] = completed;
          }
        } else {
          if (!comboBests[name] || completed > comboBests[name]) {
            comboBests[name] = completed;
          }
        }
      });

      const topTricks = Object.entries(trickBests).sort((a, b) => b[1] - a[1]).slice(0, 6);
      const topCombos = Object.entries(comboBests).sort((a, b) => b[1] - a[1]).slice(0, 6);

      tricksContainer.innerHTML = topTricks.length > 0 ? topTricks.map(([name, val]) => `
        <div class="pb-item">
          <span class="pb-name">${name}</span>
          <span class="pb-value">${val} cones</span>
        </div>
      `).join('') : '<div class="empty-state" style="padding:10px 0;"><div class="empty-text">No trick records yet.</div></div>';

      combosContainer.innerHTML = topCombos.length > 0 ? topCombos.map(([name, val]) => `
        <div class="pb-item">
          <span class="pb-name">${name}</span>
          <span class="pb-value">${val} cones</span>
        </div>
      `).join('') : '<div class="empty-state" style="padding:10px 0;"><div class="empty-text">No combo records yet.</div></div>';
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
      sessions.forEach(s => {
        if (!s.date) return;
        const sType = s.sessionType || s.sessiontype;
        if (sType === 'Rest' || (s.trickName || s.trickname) === 'Rest Day') return;

        const target = Number(s.targetCones || s.targetcones || 0);
        const completed = Number(s.completedCones || s.completedcones || 0);
        if (target <= 0) return;

        if (!grouped[s.date]) grouped[s.date] = { target: 0, completed: 0 };
        grouped[s.date].target += target;
        grouped[s.date].completed += completed;
      });

      const labels = Object.keys(grouped).sort();
      const data = labels.map(d => {
        const item = grouped[d];
        return item.target > 0 ? ((item.completed / item.target) * 100).toFixed(1) : 0;
      });

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
      sessions.forEach(s => {
        if (!s.date) return;
        const sType = s.sessionType || s.sessiontype;
        if (sType === 'Rest' || (s.trickName || s.trickname) === 'Rest Day') return;

        const target = Number(s.targetCones || s.targetcones || 0);
        const completed = Number(s.completedCones || s.completedcones || 0);

        if (!grouped[s.date]) grouped[s.date] = { target: 0, completed: 0 };
        grouped[s.date].target += target;
        grouped[s.date].completed += completed;
      });

      const labels = Object.keys(grouped).sort();

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
        const sType = s.sessionType || s.sessiontype;
        if (sType === 'Rest' || (s.trickName || s.trickname) === 'Rest Day') return;

        const name = s.trickName || s.trickname;
        if (!name) return;

        const target = Number(s.targetCones || s.targetcones || 0);
        const completed = Number(s.completedCones || s.completedcones || 0);
        if (target <= 0) return;

        if (!trickStats[name]) trickStats[name] = { target: 0, completed: 0 };
        trickStats[name].target += target;
        trickStats[name].completed += completed;
      });

      const labels = Object.keys(trickStats);
      const data = labels.map(l => {
        const item = trickStats[l];
        return item.target > 0 ? ((item.completed / item.target) * 100).toFixed(1) : 0;
      });

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
      sessions.forEach(s => {
        if (!s.date) return;
        if (!grouped[s.date]) grouped[s.date] = 0;
        grouped[s.date] += Number(s.falls || 0);
      });

      const labels = Object.keys(grouped).sort();

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
