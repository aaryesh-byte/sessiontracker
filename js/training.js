// Training session functionality.


    function initSessionItems() {
      appState.sessionItems = [
        { id: Date.now(), type: 'single', trickName: 'Crazy', category: 'OTHERS', family: 'E', categoryFilter: 'ALL', familyFilter: 'ALL', target: 20, completed: 16, missed: 4, falls: 0, notes: '', searchFilter: '' }
      ];
      renderSessionItems();
    }


    function addSessionItem(type) {
      const id = Date.now() + Math.random();
      if (type === 'single') {
        appState.sessionItems.push({ id, type: 'single', trickName: 'Toe Christie', category: 'SITTING', family: 'A', categoryFilter: 'ALL', familyFilter: 'ALL', target: 20, completed: 15, missed: 5, falls: 1, notes: '', searchFilter: '' });
      } else {
        appState.sessionItems.push({
          id,
          type: 'combo',
          trickName: 'Nelson → Mabrouk → Italian',
          category: 'SPINNING',
          family: 'E',
          comboSlots: [
            { categoryFilter: 'ALL', familyFilter: 'ALL', selectedTrick: 'Nelson', searchFilter: '' },
            { categoryFilter: 'ALL', familyFilter: 'ALL', selectedTrick: 'Mabrouk', searchFilter: '' },
            { categoryFilter: 'ALL', familyFilter: 'ALL', selectedTrick: 'Italian', searchFilter: '' }
          ],
          target: 20,
          completed: 14,
          missed: 6,
          totalAttempts: 10,
          connectedAttempts: 7,
          falls: 1,
          notes: '',
          searchFilter: ''
        });
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


    function addComboItemSlot(itemIdx) {
      const item = appState.sessionItems[itemIdx];
      if (item && item.comboSlots) {
        item.comboSlots.push({ categoryFilter: 'ALL', familyFilter: 'ALL', selectedTrick: '', searchFilter: '' });
        renderSessionItems();
      }
    }


    function removeComboItemSlot(itemIdx, slotIdx) {
      const item = appState.sessionItems[itemIdx];
      if (item && item.comboSlots && item.comboSlots.length > 1) {
        item.comboSlots.splice(slotIdx, 1);
        updateComboItemSequenceName(itemIdx);
        renderSessionItems();
      } else {
        showToast('A combo sequence must have at least one trick slot.', 'warning');
      }
    }


    function updateComboItemSequenceName(itemIdx) {
      const item = appState.sessionItems[itemIdx];
      if (item && item.comboSlots) {
        const names = item.comboSlots.map(s => s.selectedTrick).filter(n => n && n.trim() !== '');
        item.trickName = names.length > 0 ? names.join(' → ') : 'Custom Combo Sequence';
      }
    }


    function renderSessionItems() {
      const container = document.getElementById('sessionItemsContainer');
      if (!container) return;
      const allTricks = getAllTricks();

      container.innerHTML = appState.sessionItems.map((item, idx) => {
        const isCombo = item.type === 'combo';
        const searchVal = (item.searchFilter || '').toLowerCase();
        
        const filteredTricks = allTricks.filter(t => {
          const matchCat = (!item.categoryFilter || item.categoryFilter === 'ALL' || t.category === item.categoryFilter);
          const matchFam = (!item.familyFilter || item.familyFilter === 'ALL' || t.family === item.familyFilter);
          const matchSearch = !searchVal || (t.name || t.trickname || '').toLowerCase().includes(searchVal);
          return matchCat && matchFam && matchSearch;
        });

        return `
          <div class="session-item-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <span class="badge ${isCombo ? 'badge-combo' : 'badge-family'}">Item #${idx + 1}: ${isCombo ? 'Combo Sequence' : 'Individual Drill'}</span>
              ${appState.sessionItems.length > 1 ? `<button type="button" onclick="removeSessionItem(${idx})" style="background:rgba(239, 68, 68, 0.15); border:1px solid rgba(239, 68, 68, 0.3); color:#f87171; padding:2px 8px; border-radius:var(--radius-pill); font-weight:700; font-size:0.7rem; cursor:pointer;">✕ Remove</button>` : ''}
            </div>

            ${!isCombo ? `
              <div class="row-2" style="margin-bottom:8px;">
                <div class="form-group" style="margin-bottom:0;">
                  <label>Category Filter</label>
                  <select style="font-size:0.8rem; padding:8px;" onchange="appState.sessionItems[${idx}].categoryFilter = this.value; renderSessionItems();">
                    <option value="ALL" ${item.categoryFilter === 'ALL' ? 'selected' : ''}>All Categories</option>
                    <option value="OTHERS" ${item.categoryFilter === 'OTHERS' ? 'selected' : ''}>Others</option>
                    <option value="SITTING" ${item.categoryFilter === 'SITTING' ? 'selected' : ''}>Sitting</option>
                    <option value="JUMPING" ${item.categoryFilter === 'JUMPING' ? 'selected' : ''}>Jumping</option>
                    <option value="WHEELING" ${item.categoryFilter === 'WHEELING' ? 'selected' : ''}>Wheeling</option>
                    <option value="SPINNING" ${item.categoryFilter === 'SPINNING' ? 'selected' : ''}>Spinning</option>
                  </select>
                </div>
                <div class="form-group" style="margin-bottom:0;">
                  <label>Family Filter</label>
                  <select style="font-size:0.8rem; padding:8px;" onchange="appState.sessionItems[${idx}].familyFilter = this.value; renderSessionItems();">
                    <option value="ALL" ${item.familyFilter === 'ALL' ? 'selected' : ''}>All Families</option>
                    <option value="A" ${item.familyFilter === 'A' ? 'selected' : ''}>Family A</option>
                    <option value="B" ${item.familyFilter === 'B' ? 'selected' : ''}>Family B</option>
                    <option value="C" ${item.familyFilter === 'C' ? 'selected' : ''}>Family C</option>
                    <option value="D" ${item.familyFilter === 'D' ? 'selected' : ''}>Family D</option>
                    <option value="E" ${item.familyFilter === 'E' ? 'selected' : ''}>Family E</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label>Select Trick</label>
                <div class="search-bar-wrap">
                  <span class="search-icon">🔍</span>
                  <input type="text" class="search-input" placeholder="Search trick..." value="${item.searchFilter || ''}" oninput="onSessionItemSearchInput(${idx}, this.value)">
                </div>
                <select id="itemTrickSelect_${idx}" onchange="onSessionItemTrickChange(${idx}, this.value)">
                  <option value="">-- Choose Trick --</option>
                  ${filteredTricks.map(t => {
                    const name = t.name || t.trickname;
                    return `<option value="${name}" ${name === item.trickName ? 'selected' : ''}>${name} (${t.category} - Fam ${t.family})</option>`;
                  }).join('')}
                </select>
              </div>
            ` : `
              <div style="margin-bottom:12px;">
                <label style="margin-bottom:6px;">Combo Sequence Slots</label>
                ${(item.comboSlots || []).map((slot, sIdx) => {
                  const slotSearchVal = (slot.searchFilter || '').toLowerCase();
                  const slotFilteredTricks = allTricks.filter(t => {
                    const matchCat = (!slot.categoryFilter || slot.categoryFilter === 'ALL' || t.category === slot.categoryFilter);
                    const matchFam = (!slot.familyFilter || slot.familyFilter === 'ALL' || t.family === slot.familyFilter);
                    const matchSearch = !slotSearchVal || (t.name || t.trickname || '').toLowerCase().includes(slotSearchVal);
                    return matchCat && matchFam && matchSearch;
                  });

                  return `
                    <div style="padding:10px; background:var(--bg-container-high); border-radius:var(--radius-sm); margin-bottom:8px; border:1px solid var(--border-razor);">
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span style="font-size:0.75rem; font-weight:700; color:var(--primary);">Combo Slot #${sIdx + 1}</span>
                        ${(item.comboSlots.length > 1) ? `<button type="button" onclick="removeComboItemSlot(${idx}, ${sIdx})" style="background:none; border:none; color:#f87171; font-weight:700; font-size:0.7rem; cursor:pointer;">✕ Remove Slot</button>` : ''}
                      </div>

                      <div class="row-2" style="margin-bottom:6px;">
                        <div class="form-group" style="margin-bottom:0;">
                          <select style="font-size:0.75rem; padding:6px;" onchange="appState.sessionItems[${idx}].comboSlots[${sIdx}].categoryFilter = this.value; renderSessionItems();">
                            <option value="ALL" ${slot.categoryFilter === 'ALL' ? 'selected' : ''}>All Categories</option>
                            <option value="OTHERS" ${slot.categoryFilter === 'OTHERS' ? 'selected' : ''}>Others</option>
                            <option value="SITTING" ${slot.categoryFilter === 'SITTING' ? 'selected' : ''}>Sitting</option>
                            <option value="JUMPING" ${slot.categoryFilter === 'JUMPING' ? 'selected' : ''}>Jumping</option>
                            <option value="WHEELING" ${slot.categoryFilter === 'WHEELING' ? 'selected' : ''}>Wheeling</option>
                            <option value="SPINNING" ${slot.categoryFilter === 'SPINNING' ? 'selected' : ''}>Spinning</option>
                          </select>
                        </div>
                        <div class="form-group" style="margin-bottom:0;">
                          <select style="font-size:0.75rem; padding:6px;" onchange="appState.sessionItems[${idx}].comboSlots[${sIdx}].familyFilter = this.value; renderSessionItems();">
                            <option value="ALL" ${slot.familyFilter === 'ALL' ? 'selected' : ''}>All Families</option>
                            <option value="A" ${slot.familyFilter === 'A' ? 'selected' : ''}>Family A</option>
                            <option value="B" ${slot.familyFilter === 'B' ? 'selected' : ''}>Family B</option>
                            <option value="C" ${slot.familyFilter === 'C' ? 'selected' : ''}>Family C</option>
                            <option value="D" ${slot.familyFilter === 'D' ? 'selected' : ''}>Family D</option>
                            <option value="E" ${slot.familyFilter === 'E' ? 'selected' : ''}>Family E</option>
                          </select>
                        </div>
                      </div>

                      <select style="font-size:0.8rem; padding:8px;" onchange="appState.sessionItems[${idx}].comboSlots[${sIdx}].selectedTrick = this.value; updateComboItemSequenceName(${idx});">
                        <option value="">-- Select Trick for Slot #${sIdx + 1} --</option>
                        ${slotFilteredTricks.map(t => {
                          const name = t.name || t.trickname;
                          return `<option value="${name}" ${name === slot.selectedTrick ? 'selected' : ''}>${name} (${t.category} - Fam ${t.family})</option>`;
                        }).join('')}
                      </select>
                    </div>
                  `;
                }).join('')}

                <button type="button" class="btn btn-secondary btn-sm" style="margin-bottom:10px;" onclick="addComboItemSlot(${idx})">+ Add Trick Slot to Combo</button>

                <div class="form-group">
                  <label>Generated Combo Sequence Name</label>
                  <input type="text" value="${item.trickName}" oninput="appState.sessionItems[${idx}].trickName = this.value" placeholder="e.g. Crazy → Nelson → Mabrouk">
                </div>
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
        const matchCat = (!item.categoryFilter || item.categoryFilter === 'ALL' || t.category === item.categoryFilter);
        const matchFam = (!item.familyFilter || item.familyFilter === 'ALL' || t.family === item.familyFilter);
        const name = (t.name || t.trickname || '').toLowerCase();
        return matchCat && matchFam && (!searchVal || name.includes(searchVal));
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
