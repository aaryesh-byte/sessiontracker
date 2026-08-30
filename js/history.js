// Training history functionality.


    function renderHistory() {
      const container = document.getElementById('historyList');
      if (!container || !appState.currentUser) return;

      const userRecords = typeof getUserFilteredSessions === 'function' ? getUserFilteredSessions() : appState.sessions;

      if (userRecords.length === 0) {
        container.innerHTML = `<div class="glass-card empty-state"><div class="empty-icon">📜</div><div class="empty-text">No practice sessions logged yet.</div><button class="btn" style="max-width:200px; margin:0 auto;" onclick="switchTab('log')">Log Training Session</button></div>`;
        return;
      }

      const typeEl = document.getElementById('histType');
      const typeFilter = typeEl ? typeEl.value : 'ALL';

      const monthEl = document.getElementById('histMonth');
      const monthFilter = monthEl ? monthEl.value : '';

      const dateEl = document.getElementById('histDate');
      const dateFilter = dateEl ? dateEl.value : '';

      const filtered = userRecords.filter(s => {
        const sType = s.sessionType || 'Single';
        if (typeFilter !== 'ALL' && sType !== typeFilter) return false;
        if (dateFilter) {
          if (s.date !== dateFilter) return false;
        } else if (monthFilter && !String(s.date).startsWith(monthFilter)) {
          return false;
        }
        return true;
      });

      if (filtered.length === 0) {
        container.innerHTML = `<div class="glass-card empty-state"><div class="empty-icon">📜</div><div class="empty-text">No practice sessions logged yet.</div><button class="btn" style="max-width:200px; margin:0 auto;" onclick="switchTab('log')">Log Training Session</button></div>`;
        return;
      }

      container.innerHTML = filtered.map(s => {
        const sType = s.sessionType || s.sessiontype || 'Single';
        const isRest = sType === 'Rest' || (s.trickName || s.trickname) === 'Rest Day';
        const isPerformance = sType === 'Performance' || (s.category || '') === 'PERFORMANCE';
        const isCombo = sType === 'Combo';
        const success = s.successRate || s.successrate || 0;
        const target = s.targetCones || s.targetcones || 0;
        const completed = s.completedCones || s.completedcones || 0;
        const missed = s.missedCones || s.kickedmissedcones || s.missedcones || 0;
        const connected = s.connectedCompletion || s.connectedcompletion || 'N/A';

        if (isPerformance) {
          const snapshot = s.performanceSnapshot || { items: [] };

          let scoreData = { completedCount: 0, totalIndividualTricks: 0, isValid: false, totalScore: s.performanceScore || 0, smoothness: s.smoothnessScore || 0, footwork: s.footworkScore || 0 };
          if (typeof PERFORMANCE_SCORING_CONFIG !== 'undefined' && PERFORMANCE_SCORING_CONFIG.calculatePerformanceScore) {
            scoreData = PERFORMANCE_SCORING_CONFIG.calculatePerformanceScore(snapshot);
          } else {
            scoreData.completedCount = s.completedCones || 0;
            scoreData.totalIndividualTricks = s.targetCones || (snapshot.items ? snapshot.items.length : 0);
            scoreData.isValid = scoreData.completedCount >= 9;
          }

          const completedTricks = scoreData.completedCount;
          const totalTricks = scoreData.totalIndividualTricks || (snapshot.items ? snapshot.items.length : 0);
          const isValid = scoreData.isValid;
          const totalPts = s.performanceScore || scoreData.totalScore || 0;
          const smoothnessVal = s.smoothnessScore !== undefined && s.smoothnessScore !== null ? s.smoothnessScore : scoreData.smoothness;
          const footworkVal = s.footworkScore !== undefined && s.footworkScore !== null ? s.footworkScore : scoreData.footwork;

          return `
            <div class="history-item" style="border-left:3px solid #fb7185;">
              <div class="history-header">
                <div>
                  <div class="history-title">🎭 ${s.trickName || 'Performance Routine'}</div>
                  <div style="font-size:0.75rem; color:var(--on-surface-muted); margin-top:2px;">
                    ${s.date} • <span class="badge badge-perf">Performance</span> 
                    <span class="badge ${isValid ? 'badge-combo' : 'badge-danger'}">
                      ${completedTricks}/${PERFORMANCE_SCORING_CONFIG.minCompletedTricksRequired || 9} Completed ${isValid ? '✓' : '(Min 9 Req.)'}
                    </span>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="generateDailySummaryFromHistory('${s.date}')" title="Generate coach summary for ${s.date}">📋 Summary</button>
                  <span class="badge badge-combo">${totalPts} pts</span>
                </div>
              </div>
              <div class="history-stats">
                <span>🎯 Tricks Completed: ${completedTricks} / ${totalTricks}</span>
                <span>✨ Smoothness: ${smoothnessVal}</span>
                <span>⚡ Footwork: ${footworkVal}</span>
              </div>
              ${snapshot.items && snapshot.items.length > 0 ? `
                <div class="history-perf-items-container" style="margin-top:10px;">
                  ${snapshot.items.map((it, itemIdx) => {
                    const isCombo = it.type === 'combo';
                    if (isCombo) {
                      const comboList = Array.isArray(it.comboTricks) ? it.comboTricks.filter(Boolean) : (it.name ? it.name.split(' → ').filter(Boolean) : []);
                      const subStatus = it.comboSubCompleted || {};
                      return `
                        <div class="history-perf-combo-card" style="background:var(--bg-surface); border:1px solid var(--border-razor); border-radius:var(--radius-md); padding:8px 10px; margin-bottom:6px;">
                          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                            <span style="font-family:var(--font-mono); font-size:0.75rem; font-weight:700; color:var(--on-surface);">
                              #${itemIdx + 1} [Combo • ${comboList.length} Tricks] ${it.name || 'Combo Sequence'}
                            </span>
                            <span class="badge ${it.completed ? 'badge-combo' : 'badge-danger'}" style="font-size:0.6rem; padding:2px 6px;">
                              ${it.completed ? 'COMBO COMPLETE' : 'PARTIAL / INCOMPLETE'}
                            </span>
                          </div>
                          <div class="history-perf-pills">
                            ${comboList.map((subName, sIdx) => {
                              const isSubDone = subStatus[sIdx] === true || (subStatus[sIdx] === undefined && it.completed === true);
                              return `
                                <span class="history-perf-pill ${isSubDone ? 'is-done' : 'is-missed'}">
                                  ${isSubDone ? '✓' : '✗'} ${subName}
                                </span>
                              `;
                            }).join('')}
                          </div>
                        </div>
                      `;
                    } else {
                      return `
                        <div class="history-perf-pills" style="margin-bottom:4px;">
                          <span class="history-perf-pill ${it.completed ? 'is-done' : 'is-missed'}">
                            ${it.completed ? '✓' : '✗'} #${itemIdx + 1} ${it.name || it.trickName || 'Trick'}
                          </span>
                        </div>
                      `;
                    }
                  }).join('')}
                </div>
              ` : ''}
              ${s.notes ? `<div style="font-size:0.8125rem; color:var(--on-surface); margin-top:8px; font-style:italic; border-top:1px solid var(--border-razor); padding-top:6px;">"${s.notes}"</div>` : ''}
            </div>
          `;
        }

        if (isRest) {
          return `
            <div class="history-item" style="border-left:3px solid #f59e0b;">
              <div class="history-header">
                <div>
                  <div class="history-title">🟡 Rest &amp; Recovery Day</div>
                  <div style="font-size:0.75rem; color:var(--on-surface-muted); margin-top:2px;">
                    ${s.date} • <span class="badge badge-rest">Rest Day</span>
                  </div>
                </div>
              </div>
              <div style="font-size:0.8125rem; color:var(--on-surface); font-style:italic; margin-top:4px;">
                "${s.notes || 'Intentional Recovery'}"
              </div>
            </div>
          `;
        }

        const tAttempts = Number(s.targetAttempts || s.targetattempts || 0);
        const cAttempts = Number(s.completedAttempts || s.completedattempts || 0);
        const attRate = tAttempts > 0 ? Math.min(100, Math.round((cAttempts / tAttempts) * 100)) : null;

        return `
          <div class="history-item">
            <div class="history-header">
              <div>
                <div class="history-title">${s.trickName || s.trickname}</div>
                <div style="font-size:0.75rem; color:var(--on-surface-muted); margin-top:2px;">
                  ${s.date} • <span class="badge ${isCombo ? 'badge-combo' : 'badge-category'}">${isCombo ? 'Combo' : s.category}</span> <span class="badge badge-family">Fam ${s.family}</span>
                </div>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="generateDailySummaryFromHistory('${s.date}')" title="Generate coach summary for ${s.date}">📋 Summary</button>
                <span class="badge" style="background:${success >= 80 ? 'rgba(0, 255, 194, 0.15)' : 'rgba(245, 158, 11, 0.15)'}; color:${success >= 80 ? 'var(--primary)' : '#fbbf24'}; border: 1px solid ${success >= 80 ? 'var(--primary-dim)' : 'rgba(245, 158, 11, 0.3)'}">
                  ${success}% Success
                </span>
              </div>
            </div>
            <div class="history-stats">
              <span>🎯 Target: ${target}</span>
              <span>✅ Completed: ${completed}</span>
              <span>⚠️ Missed: ${missed}</span>
              <span>🚨 Falls: ${s.falls}</span>
              ${tAttempts > 0 ? `<span style="color:var(--primary); font-weight:700;">🔄 Attempts: ${cAttempts}/${tAttempts} (${attRate}%)</span>` : ''}
              ${isCombo && connected !== 'N/A' ? `<span style="font-weight:700; color:var(--primary);">🔗 Connected: ${connected}</span>` : ''}
            </div>
            ${s.notes ? `<div style="font-size:0.8125rem; color:var(--on-surface); margin-top:8px; font-style:italic; border-top:1px solid var(--border-razor); padding-top:6px;">"${s.notes}"</div>` : ''}
          </div>
        `;
      }).join('');
    }

    function clearHistoryDateFilter() {
      const dateEl = document.getElementById('histDate');
      if (dateEl) dateEl.value = '';
      const monthEl = document.getElementById('histMonth');
      if (monthEl) monthEl.value = '';
      renderHistory();
    }
    function generateDailySummaryFromHistory(dateKey) {
      if (!appState.currentUser || !appState.sessions) return;
      const userRecords = typeof getUserFilteredSessions === 'function' ? getUserFilteredSessions() : appState.sessions;
      
      const daySessions = userRecords.filter(s => s.date === dateKey);

      if (daySessions.length === 0) {
        showToast(`No training sessions found for ${dateKey}`, 'warning');
        return;
      }

      const summaryText = typeof generateCoachSummaryText === 'function' ? 
        generateCoachSummaryText(daySessions, dateKey) : `Training summary for ${dateKey}`;

      if (typeof displayFormattedSummaryModal === 'function') {
        displayFormattedSummaryModal(`Training Summary (${dateKey})`, summaryText);
      }
    }

    function getWeekRange(dateInput) {
      const d = dateInput ? new Date(dateInput) : new Date();
      const day = d.getDay();
      const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
      
      const mon = new Date(d.setDate(diffToMon));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);

      const monStr = mon.toISOString().split('T')[0];
      const sunStr = sun.toISOString().split('T')[0];

      return { monday: monStr, sunday: sunStr, monDate: mon, sunDate: sun };
    }

    function handleGenerateWeeklySummaryClick() {
      if (!appState.currentUser || !appState.sessions) return;
      const picker = document.getElementById('histWeeklyPicker');
      const targetDate = (picker && picker.value) ? picker.value : new Date().toISOString().split('T')[0];

      const weekRange = getWeekRange(targetDate);
      const userRecords = typeof getUserFilteredSessions === 'function' ? getUserFilteredSessions() : appState.sessions;

      const weekSessions = userRecords.filter(s => {
        return s.date && s.date >= weekRange.monday && s.date <= weekRange.sunday;
      });

      if (weekSessions.length === 0) {
        showToast(`No training logged for week ${weekRange.monday} to ${weekRange.sunday}`, 'warning');
        return;
      }

      const summaryText = generateWeeklyReportText(weekSessions, weekRange);
      if (typeof displayFormattedSummaryModal === 'function') {
        displayFormattedSummaryModal(`Weekly Training Report (${weekRange.monday} → ${weekRange.sunday})`, summaryText);
      }
    }

    function generateWeeklyReportText(weekSessions, weekRange) {
      const lines = [];
      const fMon = typeof formatSummaryDate === 'function' ? formatSummaryDate(weekRange.monday) : weekRange.monday;
      const fSun = typeof formatSummaryDate === 'function' ? formatSummaryDate(weekRange.sunday) : weekRange.sunday;

      lines.push(`Weekly Training Report: ${fMon} – ${fSun}`);
      lines.push('====================================');
      lines.push('');

      // Group sessions by distinct date
      const dateMap = {};
      weekSessions.forEach(s => {
        if (!dateMap[s.date]) dateMap[s.date] = [];
        dateMap[s.date].push(s);
      });

      const sortedDates = Object.keys(dateMap).sort();

      sortedDates.forEach(d => {
        const dayItems = dateMap[d];
        const isRest = dayItems.some(s => (s.sessionType || s.sessiontype) === 'Rest' || (s.trickName || s.trickname) === 'Rest Day');

        if (isRest) {
          const rRec = dayItems.find(s => (s.sessionType || s.sessiontype) === 'Rest' || (s.trickName || s.trickname) === 'Rest Day');
          lines.push(typeof formatSummaryDate === 'function' ? formatSummaryDate(d) : d);
          lines.push('Rest & Recovery Day');
          if (rRec && rRec.notes) lines.push(`Note: "${rRec.notes}"`);
          lines.push('------------------------------------');
          lines.push('');
        } else {
          const daySummary = typeof generateCoachSummaryText === 'function' ? 
            generateCoachSummaryText(dayItems, d) : `Training completed on ${d}`;
          lines.push(daySummary);
          lines.push('------------------------------------');
          lines.push('');
        }
      });

      // Overall weekly volume summary
      const uniqueTrainingDays = new Set(
        weekSessions.filter(s => (s.sessionType || s.sessiontype) !== 'Rest' && (s.trickName || s.trickname) !== 'Rest Day')
                    .map(s => s.date)
      ).size;
      const totalRestDays = new Set(
        weekSessions.filter(s => (s.sessionType || s.sessiontype) === 'Rest' || (s.trickName || s.trickname) === 'Rest Day')
                    .map(s => s.date)
      ).size;

      lines.push('Weekly Summary:');
      lines.push(`- Active Training Days: ${uniqueTrainingDays}`);
      if (totalRestDays > 0) lines.push(`- Rest Days: ${totalRestDays}`);

      return lines.join('\n');
    }

    window.generateDailySummaryFromHistory = generateDailySummaryFromHistory;
    window.handleGenerateWeeklySummaryClick = handleGenerateWeeklySummaryClick;
    window.generateWeeklyReportText = generateWeeklyReportText;