// Training history functionality.


function groupSessionRecords(records) {
  const sessionsMap = {};

  records.forEach(r => {
    const sId = r.sessionId || r.sessionid || r.date;
    if (!sId) return;

    if (!sessionsMap[sId]) {
      sessionsMap[sId] = {
        sessionId: sId,
        date: r.date,
        skaterName: r.skaterName || r.skatername || '',
        items: []
      };
    }
    sessionsMap[sId].items.push(r);
  });

  return Object.values(sessionsMap).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

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

  const grouped = groupSessionRecords(userRecords);

  const filtered = grouped.filter(group => {
    if (dateFilter) {
      if (group.date !== dateFilter) return false;
    } else if (monthFilter && !String(group.date).startsWith(monthFilter)) {
      return false;
    }

    if (typeFilter !== 'ALL') {
      const hasMatchingType = group.items.some(s => {
        const sType = s.sessionType || s.sessiontype || 'Single';
        if (typeFilter === 'Single') return sType === 'Single';
        if (typeFilter === 'Combo') return sType === 'Combo';
        if (typeFilter === 'Performance') return sType === 'Performance' || (s.category || '') === 'PERFORMANCE';
        return sType === typeFilter;
      });
      if (!hasMatchingType) return false;
    }

    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div class="glass-card empty-state"><div class="empty-icon">📜</div><div class="empty-text">No practice sessions logged yet.</div><button class="btn" style="max-width:200px; margin:0 auto;" onclick="switchTab('log')">Log Training Session</button></div>`;
    return;
  }

  container.innerHTML = filtered.map(group => {
    const items = group.items;
    const dateStr = group.date;

    const isRest = items.some(s => (s.sessionType || s.sessiontype) === 'Rest' || (s.trickName || s.trickname) === 'Rest Day');

    if (isRest) {
      const restRec = items.find(s => (s.sessionType || s.sessiontype) === 'Rest' || (s.trickName || s.trickname) === 'Rest Day') || items[0];
      return `
        <div class="history-item" style="border-left:3px solid #f59e0b;">
          <div class="history-header">
            <div>
              <div class="history-title">🟡 Rest &amp; Recovery Day</div>
              <div style="font-size:0.75rem; color:var(--on-surface-muted); margin-top:2px;">
                ${dateStr} • <span class="badge badge-rest">Rest Day</span>
              </div>
            </div>
            <div>
              <button type="button" class="btn btn-secondary btn-sm" onclick="generateDailySummaryFromHistory('${dateStr}')" title="Generate coach summary for ${dateStr}">📋 Summary</button>
            </div>
          </div>
          <div style="font-size:0.8125rem; color:var(--on-surface); font-style:italic; margin-top:6px;">
            "${restRec.notes || 'Intentional Recovery'}"
          </div>
        </div>
      `;
    }

    const singles = items.filter(s => (s.sessionType || s.sessiontype || 'Single') === 'Single');
    const combos = items.filter(s => (s.sessionType || s.sessiontype) === 'Combo');
    const perfs = items.filter(s => (s.sessionType || s.sessiontype) === 'Performance' || (s.category || '') === 'PERFORMANCE');

    let badgesHtml = '';
    if (singles.length > 0) badgesHtml += `<span class="badge badge-category">${singles.length} Trick${singles.length > 1 ? 's' : ''}</span> `;
    if (combos.length > 0) badgesHtml += `<span class="badge badge-combo">${combos.length} Combo${combos.length > 1 ? 's' : ''}</span> `;
    if (perfs.length > 0) badgesHtml += `<span class="badge badge-perf">${perfs.length} Performance</span> `;

    let globalNotes = items.map(s => s.notes).filter(n => n && !n.startsWith('{')).join(' • ');

    return `
      <div class="history-item">
        <div class="history-header">
          <div>
            <div class="history-title">🗓️ Training Session — ${dateStr}</div>
            <div style="font-size:0.75rem; color:var(--on-surface-muted); margin-top:2px;">
              ${badgesHtml}
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="generateDailySummaryFromHistory('${dateStr}')" title="Generate coach summary for ${dateStr}">📋 Summary</button>
          </div>
        </div>

        ${singles.length > 0 ? `
          <div style="margin-top:10px;">
            <div class="label-caps" style="color:var(--primary); margin-bottom:6px;">Individual Tricks (${singles.length})</div>
            ${singles.map(s => {
              const target = Number(s.targetCones || s.targetcones || 0);
              const completed = Number(s.completedCones || s.completedcones || 0);
              const missed = Number(s.missedCones || s.missedcones || 0);
              const success = s.successRate || s.successrate || (target > 0 ? ((completed / target) * 100).toFixed(1) : 0);
              const tAttempts = Number(s.targetAttempts || s.targetattempts || 0);
              const cAttempts = Number(s.completedAttempts || s.completedattempts || 0);

              return `
                <div style="background:var(--bg-surface); border:1px solid var(--border-razor); border-radius:var(--radius-md); padding:8px 10px; margin-bottom:6px;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:700; font-size:0.875rem;">${s.trickName || s.trickname}</span>
                    <span class="badge badge-family">Fam ${s.family || 'Custom'}</span>
                  </div>
                  <div class="history-stats" style="margin-top:4px;">
                    ${tAttempts > 0 ? `<span style="color:var(--primary); font-weight:700;">🔄 Attempts: ${cAttempts}/${tAttempts}</span>` : ''}
                    <span>✅ Cones: ${completed}/${target}</span>
                    <span>⚠️ Missed: ${missed}</span>
                    <span>🚨 Falls: ${s.falls || 0}</span>
                    <span>⚡ Rate: ${success}%</span>
                  </div>
                  ${s.notes && !s.notes.startsWith('{') ? `<div style="font-size:0.75rem; color:var(--on-surface-muted); font-style:italic; margin-top:4px;">"${s.notes}"</div>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        ${combos.length > 0 ? `
          <div style="margin-top:10px;">
            <div class="label-caps" style="color:var(--primary); margin-bottom:6px;">Trick Combos (${combos.length})</div>
            ${combos.map(s => {
              const target = Number(s.targetCones || s.targetcones || 0);
              const completed = Number(s.completedCones || s.completedcones || 0);
              const tAttempts = Number(s.targetAttempts || s.targetattempts || 0);
              const cAttempts = Number(s.completedAttempts || s.completedattempts || 0);
              const subTricks = extractComboSubTricks(s);

              return `
                <div style="background:var(--bg-surface); border:1px solid var(--border-razor); border-radius:var(--radius-md); padding:8px 10px; margin-bottom:6px;">
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:700; font-size:0.875rem; color:var(--primary);">🔗 ${s.trickName || s.trickname}</span>
                    <span class="badge badge-combo">Combo</span>
                  </div>
                  <div class="history-stats" style="margin-top:4px;">
                    ${tAttempts > 0 ? `<span style="color:var(--primary); font-weight:700;">🔄 Attempts: ${cAttempts}/${tAttempts}</span>` : ''}
                    <span>✅ Cones: ${completed}/${target}</span>
                    <span>🚨 Falls: ${s.falls || 0}</span>
                  </div>
                  ${subTricks.length > 0 ? `
                    <div style="margin-top:6px; font-size:0.75rem;">
                      <div class="label-caps" style="font-size:0.6rem;">Combo Component Breakdown</div>
                      <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:2px;">
                        ${subTricks.map((st, idx) => `<span class="badge badge-family" style="font-size:0.65rem;">#${idx+1} ${st}</span>`).join('')}
                      </div>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        ${perfs.length > 0 ? `
          <div style="margin-top:10px;">
            <div class="label-caps" style="color:#fb7185; margin-bottom:6px;">Performance Routine Runs (${perfs.length})</div>
            ${perfs.map(s => {
              const snapshot = extractPerformanceSnapshot(s) || s.performanceSnapshot || { items: [] };

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
              const perfNotes = s.notes || (snapshot && snapshot.notes) || '';

              return `
                <div style="background:var(--bg-surface); border:1px solid rgba(251, 113, 133, 0.3); border-radius:var(--radius-md); padding:10px; margin-bottom:6px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                    <strong style="font-size:0.875rem; color:#fb7185;">🎭 ${s.trickName || 'Performance Routine'}</strong>
                    <span class="badge ${isValid ? 'badge-combo' : 'badge-danger'}">
                      ${completedTricks}/${PERFORMANCE_SCORING_CONFIG.minCompletedTricksRequired || 9} Completed ${isValid ? '✓' : '(Min 9 Req.)'}
                    </span>
                  </div>

                  <div class="history-stats" style="margin-top:4px;">
                    <span>🎯 Completed: ${completedTricks} / ${totalTricks}</span>
                    <span>✨ Smoothness: ${smoothnessVal}/10</span>
                    <span>⚡ Footwork: ${footworkVal}/10</span>
                    <span style="color:var(--primary); font-weight:700;">🏆 Total: ${totalPts} pts</span>
                  </div>

                  ${snapshot.items && snapshot.items.length > 0 ? `
                    <div class="history-perf-items-container" style="margin-top:8px;">
                      ${snapshot.items.map((it, itemIdx) => {
                        const isCombo = it.type === 'combo';
                        if (isCombo) {
                          const comboList = Array.isArray(it.comboTricks) ? it.comboTricks.filter(Boolean) : (it.name ? it.name.split(' → ').filter(Boolean) : []);
                          const subStatus = it.comboSubCompleted || {};
                          return `
                            <div class="history-perf-combo-card" style="background:var(--bg-container); border:1px solid var(--border-razor); border-radius:var(--radius-md); padding:6px 8px; margin-bottom:4px;">
                              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
                                <span style="font-family:var(--font-mono); font-size:0.7rem; font-weight:700; color:var(--on-surface);">
                                  #${itemIdx + 1} [Combo • ${comboList.length} Tricks] ${it.name || 'Combo Sequence'}
                                </span>
                                <span class="badge ${it.completed ? 'badge-combo' : 'badge-danger'}" style="font-size:0.55rem; padding:1px 4px;">
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
                            <div class="history-perf-pills" style="margin-bottom:2px;">
                              <span class="history-perf-pill ${it.completed ? 'is-done' : 'is-missed'}">
                                ${it.completed ? '✓' : '✗'} #${itemIdx + 1} ${it.name || 'Trick'}
                              </span>
                            </div>
                          `;
                        }
                      }).join('')}
                    </div>
                  ` : ''}
                  ${perfNotes && !perfNotes.startsWith('{') ? `<div style="font-size:0.75rem; color:var(--on-surface-muted); font-style:italic; margin-top:6px;">"${perfNotes}"</div>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}

        ${globalNotes ? `<div style="font-size:0.8125rem; color:var(--on-surface); margin-top:8px; font-style:italic; border-top:1px solid var(--border-razor); padding-top:6px;">"${globalNotes}"</div>` : ''}
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