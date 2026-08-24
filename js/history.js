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

      const catEl = document.getElementById('histCat');
      const catFilter = catEl ? catEl.value : 'ALL';

      const famEl = document.getElementById('histFam');
      const famFilter = famEl ? famEl.value : 'ALL';

      const monthEl = document.getElementById('histMonth');
      const monthFilter = monthEl ? monthEl.value : '';

      const dateEl = document.getElementById('histDate');
      const dateFilter = dateEl ? dateEl.value : '';

      const filtered = appState.sessions.filter(s => {
        const skaterMatch = String(s.skaterName || s.skatername || s.userid).toLowerCase() === String(appState.currentUser.skaterName).toLowerCase();
        if (!skaterMatch) return false;

        const sType = s.sessionType || s.sessiontype || 'Single';
        if (typeFilter !== 'ALL' && sType !== typeFilter) return false;
        if (catFilter !== 'ALL' && s.category !== catFilter) return false;
        if (famFilter !== 'ALL' && s.family !== famFilter) return false;
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
        const success = s.successRate || s.successrate;
        const target = s.targetCones || s.targetcones;
        const completed = s.completedCones || s.completedcones;
        const missed = s.missedCones || s.kickedmissedcones || s.missedcones;
        const connected = s.connectedCompletion || s.connectedcompletion || 'N/A';
        const isCombo = (s.sessionType || s.sessiontype) === 'Combo';

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
              ${isCombo ? `<span style="font-weight:700; color:var(--primary);">🔗 Connected: ${connected}</span>` : ''}
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