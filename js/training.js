// Training session functionality.


    function initSessionItems() {
      appState.sessionItems = [
        { id: Date.now(), type: 'single', trickName: 'Crazy', category: 'OTHERS', family: 'E', target: 20, completed: 16, missed: 4, falls: 0, notes: '', searchFilter: '' }
      ];
      renderSessionItems();
    }


    function addSessionItem(type) {
      const id = Date.now() + Math.random();
      if (type === 'single') {
        appState.sessionItems.push({ id, type: 'single', trickName: 'Toe Christie', category: 'SITTING', family: 'A', target: 20, completed: 15, missed: 5, falls: 1, notes: '', searchFilter: '' });
      } else {
        appState.sessionItems.push({ id, type: 'combo', trickName: 'Crazy → Nelson → Mabrouk', category: 'OTHERS', family: 'E', target: 20, completed: 14, missed: 6, totalAttempts: 10, connectedAttempts: 7, falls: 1, notes: '', searchFilter: '' });
      }
      renderSessionItems();
    }


    function removeSessionItem(index) {
      if (appState.sessionItems.length <= 1) {
        showToast('A training session requires at least one practice item.', 'warning');
        return;
      }
      appState.sessionItems.splice(index, 1);
      renderSessionItems();
    }


    function renderSessionItems() {
      const container = document.getElementById('sessionItemsContainer');
      if (!container) return;
      const allTricks = getAllTricks();

      container.innerHTML = appState.sessionItems.map((item, idx) => {
        const isCombo = item.type === 'combo';
        const searchVal = (item.searchFilter || '').toLowerCase();
        
        const filteredTricks = allTricks.filter(t => {
          const name = (t.name || t.trickname || '').toLowerCase();
          return name.includes(searchVal);
        });

        return `
          <div class="session-item-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <span class="badge ${isCombo ? 'badge-combo' : 'badge-family'}">Item #${idx + 1}: ${isCombo ? 'Combo Sequence' : 'Individual Drill'}</span>
              ${appState.sessionItems.length > 1 ? `<button type="button" onclick="removeSessionItem(${idx})" style="background:rgba(239, 68, 68, 0.15); border:1px solid rgba(239, 68, 68, 0.3); color:#f87171; padding:2px 8px; border-radius:var(--radius-pill); font-weight:700; font-size:0.7rem; cursor:pointer;">✕ Remove</button>` : ''}
            </div>

            ${!isCombo ? `
              <div class="row-2">
                <div class="form-group">
                  <label>Select Trick</label>
                  <div class="search-bar-wrap">
                    <span class="search-icon">🔍</span>
                    <input type="text" class="search-input" placeholder="Search trick..." value="${item.searchFilter || ''}" oninput="onSessionItemSearchInput(${idx}, this.value)">
                  </div>
                  <select id="itemTrickSelect_${idx}" onchange="onSessionItemTrickChange(${idx}, this.value)">
                    ${filteredTricks.map(t => {
                      const name = t.name || t.trickname;
                      return `<option value="${name}" ${name === item.trickName ? 'selected' : ''}>${name} (${t.category} - Fam ${t.family})</option>`;
                    }).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Category / Family</label>
                  <input type="text" value="${item.category} (Fam ${item.family})" readonly style="background:var(--bg-container-high); font-weight:700;">
                </div>
              </div>
            ` : `
              <div class="form-group">
                <label>Combo Sequence Name</label>
                <input type="text" value="${item.trickName}" oninput="appState.sessionItems[${idx}].trickName = this.value" placeholder="e.g. Crazy → Nelson → Mabrouk">
              </div>
            `}

            <div class="row-3">
              <div class="form-group">
                <label>Target Cones</label>
                <input type="number" min="1" value="${item.target}" oninput="appState.sessionItems[${idx}].target = parseInt(this.value)||0; autoCalcItemMissed(${idx});">
              </div>
              <div class="form-group">
                <label>Completed</label>
                <input type="number" min="0" value="${item.completed}" oninput="appState.sessionItems[${idx}].completed = parseInt(this.value)||0; autoCalcItemMissed(${idx});">
              </div>
              <div class="form-group">
                <label>Kicked/Missed</label>
                <input type="number" id="itemMissed_${idx}" min="0" value="${item.missed}" oninput="appState.sessionItems[${idx}].missed = parseInt(this.value)||0;">
              </div>
            </div>

            ${isCombo ? `
              <div class="row-2">
                <div class="form-group">
                  <label>Total Attempts</label>
                  <input type="number" min="1" value="${item.totalAttempts || 10}" oninput="appState.sessionItems[${idx}].totalAttempts = parseInt(this.value)||1;">
                </div>
                <div class="form-group">
                  <label>Connected Attempts</label>
                  <input type="number" min="0" value="${item.connectedAttempts || 7}" oninput="appState.sessionItems[${idx}].connectedAttempts = parseInt(this.value)||0;">
                </div>
              </div>
            ` : ''}

            <div class="row-2">
              <div class="form-group" style="margin-bottom:0;">
                <label>Falls Count</label>
                <input type="number" min="0" value="${item.falls}" oninput="appState.sessionItems[${idx}].falls = parseInt(this.value)||0;">
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label>Item Notes</label>
                <input type="text" value="${item.notes || ''}" oninput="appState.sessionItems[${idx}].notes = this.value;" placeholder="Specific notes for this drill">
              </div>
            </div>
          </div>
        `;
      }).join('');
    }


    function onSessionItemSearchInput(idx, value) {
      const item = appState.sessionItems[idx];
      if (!item) return;

      item.searchFilter = value || '';
      const searchVal = item.searchFilter.toLowerCase().trim();
      const select = document.getElementById(`itemTrickSelect_${idx}`);
      if (!select) return;

      const allTricks = getAllTricks();
      const filteredTricks = allTricks.filter(t => {
        const name = (t.name || t.trickname || '').toLowerCase();
        return name.includes(searchVal);
      });

      select.innerHTML = `
        <option value="">-- Choose Trick --</option>
        ${filteredTricks.map(t => {
          const name = t.name || t.trickname;
          return `<option value="${name}" ${name === item.trickName ? 'selected' : ''}>${name} (${t.category} - Fam ${t.family})</option>`;
        }).join('')}
      `;
    }


    function onSessionItemTrickChange(idx, selectedTrickName) {
      const allTricks = getAllTricks();
      const trickObj = allTricks.find(t => (t.name || t.trickname) === selectedTrickName);
      if (trickObj) {
        appState.sessionItems[idx].trickName = selectedTrickName;
        appState.sessionItems[idx].category = trickObj.category;
        appState.sessionItems[idx].family = trickObj.family;
        renderSessionItems();
      }
    }


    function autoCalcItemMissed(idx) {
      const item = appState.sessionItems[idx];
      if (item && item.target >= item.completed) {
        item.missed = item.target - item.completed;
        const el = document.getElementById(`itemMissed_${idx}`);
        if (el) el.value = item.missed;
      }
    }


    async function handleMultiSessionSubmit(e) {
      e.preventDefault();
      const dateEl = document.getElementById('logDate');
      const date = dateEl ? dateEl.value : new Date().toISOString().split('T')[0];

      const notesEl = document.getElementById('logSessionGlobalNotes');
      const globalNotes = notesEl ? notesEl.value.trim() : '';
      const sessionId = 'SESS-' + Date.now();

      if (!appState.sessionItems || appState.sessionItems.length === 0) {
        showToast('Please add at least one practice item to the session.', 'warning');
        return;
      }

      const formattedPayloadItems = appState.sessionItems.map(item => {
        const target = item.target || 20;
        const completed = item.completed || 0;
        const missed = item.missed || 0;
        const isCombo = item.type === 'combo';
        
        let connRate = 'N/A';
        if (isCombo) {
          const tot = item.totalAttempts || 1;
          const conn = item.connectedAttempts || 0;
          connRate = ((conn / tot) * 100).toFixed(1) + '%';
        }

        return {
          sessionId: sessionId,
          date: date,
          sessionType: isCombo ? 'Combo' : 'Single',
          skaterName: appState.currentUser.skaterName,
          userId: appState.currentUser.skaterName,
          trickName: item.trickName,
          category: item.category || 'OTHERS',
          family: item.family || 'Custom',
          targetCones: target,
          completedCones: completed,
          missedCones: missed,
          falls: item.falls || 0,
          successRate: parseFloat(((completed / target) * 100).toFixed(1)),
          connectedCompletion: connRate,
          notes: item.notes || globalNotes
        };
      });

      formattedPayloadItems.forEach(rec => appState.sessions.unshift(rec));

      if (APPS_SCRIPT_URL && APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_WEB_APP_URL") {
        try {
          fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              action: 'logSession',
              payload: {
                sessionId: sessionId,
                date: date,
                skaterName: appState.currentUser.skaterName,
                userId: appState.currentUser.skaterName,
                sessionNotes: globalNotes,
                items: formattedPayloadItems
              }
            })
          });
        } catch(err) { console.error('API Error:', err); }
      }

      showToast(`Training session saved with ${formattedPayloadItems.length} practice item(s)!`, 'success');
      if (notesEl) notesEl.value = '';
      initSessionItems();
      populateProgressTrickFilter();
      switchTab('dashboard');
    }
