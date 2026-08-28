// Training history functionality.


    function renderHistory() {
      const container = document.getElementById('historyList');
      if (!container || !appState.currentUser) return;

      if (appState.sessions.length === 0) {
        container.innerHTML = `
          <div class="skeleton-card">
            <div class="skeleton skeleton-title" style="width:45%;"></div>
            <div class="skeleton skeleton-text"></div>
            <div class="skeleton skeleton-text" style="width:70%;"></div>
          </div>
        `;
      }

      const typeEl = document.getElementById('histType');
      const typeFilter = typeEl ? typeEl.value : 'ALL';

      const monthEl = document.getElementById('histMonth');
      const monthFilter = monthEl ? monthEl.value : '';

      const dateEl = document.getElementById('histDate');
      const dateFilter = dateEl ? dateEl.value : '';

      const filtered = appState.sessions.filter(s => {
        const currentSkater = String(appState.currentUser.skaterName || appState.currentUser.username || '').toLowerCase();
        const recordSkater = String(s.skaterName || s.skatername || s.userId || s.userid || '').toLowerCase();
        if (currentSkater && recordSkater && currentSkater !== recordSkater) return false;

        const sType = s.sessionType || s.sessiontype || 'Single';
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
          const completedTricks = (snapshot.items || []).filter(it => it.completed).length;
          const totalTricks = (snapshot.items || []).length;
          const isValid = completedTricks >= 9;

          return `
            <div class="history-item" style="border-left:3px solid #fb7185;">
              <div class="history-header">
                <div>
                  <div class="history-title">🎭 ${s.trickName || 'Performance Routine'}</div>
                  <div style="font-size:0.75rem; color:var(--on-surface-muted); margin-top:2px;">
                    ${s.date} • <span class="badge badge-perf">Performance</span> 
                    <span class="badge ${isValid ? 'badge-combo' : 'badge-danger'}">
                      ${completedTricks}/${totalTricks} Completed ${isValid ? '✓' : '(Min 9 Req.)'}
                    </span>
                  </div>
                </div>
                <div>
                  <span class="badge badge-combo">${s.performanceScore || 0} pts</span>
                </div>
              </div>
              <div class="history-stats">
                <span>🎯 Base Completed: ${completedTricks}</span>
                <span>✨ Smoothness: ${s.smoothnessScore || 0}</span>
                <span>⚡ Footwork: ${s.footworkScore || 0}</span>
              </div>
              ${snapshot.items && snapshot.items.length > 0 ? `
                <div class="history-perf-pills">
                  ${snapshot.items.map(it => `
                    <span class="history-perf-pill ${it.completed ? 'is-done' : 'is-missed'}">
                      ${it.completed ? '✓' : '✗'} ${it.name || 'Trick'}
                    </span>
                  `).join('')}
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
              <div>
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