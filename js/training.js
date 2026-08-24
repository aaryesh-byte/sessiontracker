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
        appState.sessionItems.push({
          id,
          type: 'combo',
          trickName: '',
          slots: [
            { categoryFilter: 'SITTING', familyFilter: 'ALL', searchFilter: '', selectedTrick: 'Toe Christie', category: 'SITTING', family: 'A' },
            { categoryFilter: 'WHEELING', familyFilter: 'ALL', searchFilter: '', selectedTrick: 'Toe FWD Wheeling', category: 'WHEELING', family: 'C' },
            { categoryFilter: 'SPINNING', familyFilter: 'ALL', searchFilter: '', selectedTrick: 'Italian', category: 'SPINNING', family: 'E' }
          ],
          target: 20,
          completed: 14,
          missed: 6,
          totalAttempts: 10,
          connectedAttempts: 7,
          falls: 1,
          notes: ''
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

    function addComboSlot(itemIdx) {
      const item = appState.sessionItems[itemIdx];
      if (!item || !item.slots) return;
      item.slots.push({ categoryFilter: 'ALL', familyFilter: 'ALL', searchFilter: '', selectedTrick: '', category: 'OTHERS', family: 'E' });
      renderSessionItems();
    }

    function removeComboSlot(itemIdx, slotIdx) {
      const item = appState.sessionItems[itemIdx];
      if (!item || !item.slots) return;
      if (item.slots.length <= 2) {
        showToast('A combo sequence requires at least two trick slots.', 'warning');
        return;
      }
      item.slots.splice(slotIdx, 1);
      renderSessionItems();
    }

    function onComboSlotFilterChange(itemIdx, slotIdx, filterType, value) {
      const item = appState.sessionItems[itemIdx];
      if (!item || !item.slots || !item.slots[slotIdx]) return;
      item.slots[slotIdx][filterType] = value;
      renderSessionItems();
    }

    function onComboSlotSearchInput(itemIdx, slotIdx, value) {
      const item = appState.sessionItems[itemIdx];
      if (!item || !item.slots || !item.slots[slotIdx]) return;
      item.slots[slotIdx].searchFilter = value || '';

      const searchVal = (value || '').toLowerCase().trim();
      const select = document.getElementById(`comboTrickSelect_${itemIdx}_${slotIdx}`);
      if (!select) return;

      const slot = item.slots[slotIdx];
      const allTricks = getAllTricks();
      const filtered = allTricks.filter(t => {
        const matchCat = (slot.categoryFilter === 'ALL' || t.category === slot.categoryFilter);
        const matchFam = (slot.familyFilter === 'ALL' || t.family === slot.familyFilter);
        const name = (t.name || t.trickname || '').toLowerCase();
        return matchCat && matchFam && (!searchVal || name.includes(searchVal));
      });

      select.innerHTML = `
        <option value="">-- Choose Trick --</option>
        ${filtered.map(t => {
          const name = t.name || t.trickname;
          return `<option value="${name}" ${name === slot.selectedTrick ? 'selected' : ''}>${name} (${t.category} - Fam ${t.family})</option>`;
        }).join('')}
      `;
    }

    function onComboSlotTrickChange(itemIdx, slotIdx, trickName) {
      const item = appState.sessionItems[itemIdx];
      if (!item || !item.slots || !item.slots[slotIdx]) return;
      const allTricks = getAllTricks();
      const trickObj = allTricks.find(t => (t.name || t.trickname) === trickName);
      if (trickObj) {
        item.slots[slotIdx].selectedTrick = trickName;
        item.slots[slotIdx].category = trickObj.category;
        item.slots[slotIdx].family = trickObj.family;
      } else {
        item.slots[slotIdx].selectedTrick = trickName;
      }
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
              <span class="badge ${isCombo ? 'badge-combo' : 'badge-family'}">Item #${idx + 1}: ${isCombo ? 'Combo Sequence Builder' : 'Individual Drill'}</span>
              ${appState.sessionItems.length > 1 ? `<button type="button" onclick="removeSessionItem(${idx})" style="background:rgba(239, 68, 68, 0.15); border:1px solid rgba(239, 68, 68, 0.3); color:#f87171; padding:2px 8px; border-radius:var(--radius-pill); font-weight:700; font-size:0.7rem; cursor:pointer;">✕ Remove Item</button>` : ''}
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
              <div style="margin-bottom:12px;">
                <div class="label-caps" style="margin-bottom:8px; color:var(--primary);">Combo Independent Trick Slots</div>
                
                ${(item.slots || []).map((slot, sIdx) => {
                  const sSearch = (slot.searchFilter || '').toLowerCase();
                  const sFiltered = allTricks.filter(t => {
                    const mCat = (slot.categoryFilter === 'ALL' || t.category === slot.categoryFilter);
                    const mFam = (slot.familyFilter === 'ALL' || t.family === slot.familyFilter);
                    const mName = (t.name || t.trickname || '').toLowerCase();
                    return mCat && mFam && (!sSearch || mName.includes(sSearch));
                  });

                  return `
                    <div style="padding:10px; background:var(--bg-surface); border:1px solid var(--border-razor); border-radius:var(--radius-md); margin-bottom:8px;">
                      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <span style="font-family:var(--font-mono); font-size:0.75rem; font-weight:700;">Position #${sIdx + 1}: ${slot.selectedTrick || 'Unselected'}</span>
                        ${item.slots.length > 2 ? `<button type="button" onclick="removeComboSlot(${idx}, ${sIdx})" style="background:none; border:none; color:#f87171; cursor:pointer; font-size:0.75rem;">✕ Remove Slot</button>` : ''}
                      </div>
                      <div class="row-2" style="margin-bottom:6px;">
                        <div class="form-group" style="margin-bottom:0;">
                          <label>Category</label>
                          <select style="font-size:0.75rem; padding:6px 8px;" onchange="onComboSlotFilterChange(${idx}, ${sIdx}, 'categoryFilter', this.value)">
                            <option value="ALL" ${slot.categoryFilter === 'ALL' ? 'selected' : ''}>All Categories</option>
                            <option value="SITTING" ${slot.categoryFilter === 'SITTING' ? 'selected' : ''}>Sitting</option>
                            <option value="WHEELING" ${slot.categoryFilter === 'WHEELING' ? 'selected' : ''}>Wheeling</option>
                            <option value="SPINNING" ${slot.categoryFilter === 'SPINNING' ? 'selected' : ''}>Spinning</option>
                            <option value="JUMPING" ${slot.categoryFilter === 'JUMPING' ? 'selected' : ''}>Jumping</option>
                            <option value="OTHERS" ${slot.categoryFilter === 'OTHERS' ? 'selected' : ''}>Others</option>
                          </select>
                        </div>
                        <div class="form-group" style="margin-bottom:0;">
                          <label>Family</label>
                          <select style="font-size:0.75rem; padding:6px 8px;" onchange="onComboSlotFilterChange(${idx}, ${sIdx}, 'familyFilter', this.value)">
                            <option value="ALL" ${slot.familyFilter === 'ALL' ? 'selected' : ''}>All Families</option>
                            <option value="A" ${slot.familyFilter === 'A' ? 'selected' : ''}>Family A</option>
                            <option value="B" ${slot.familyFilter === 'B' ? 'selected' : ''}>Family B</option>
                            <option value="C" ${slot.familyFilter === 'C' ? 'selected' : ''}>Family C</option>
                            <option value="D" ${slot.familyFilter === 'D' ? 'selected' : ''}>Family D</option>
                            <option value="E" ${slot.familyFilter === 'E' ? 'selected' : ''}>Family E</option>
                          </select>
                        </div>
                      </div>
                      <div class="form-group" style="margin-bottom:0;">
                        <div class="search-bar-wrap" style="margin-bottom:4px;">
                          <span class="search-icon" style="font-size:0.75rem;">🔍</span>
                          <input type="text" class="search-input" style="padding:6px 6px 6px 28px; font-size:0.75rem;" placeholder="Search trick in position..." value="${slot.searchFilter || ''}" oninput="onComboSlotSearchInput(${idx}, ${sIdx}, this.value)">
                        </div>
                        <select id="comboTrickSelect_${idx}_${sIdx}" style="font-size:0.75rem; padding:6px 8px;" onchange="onComboSlotTrickChange(${idx}, ${sIdx}, this.value)">
                          <option value="">-- Choose Trick --</option>
                          ${sFiltered.map(t => {
                            const name = t.name || t.trickname;
                            return `<option value="${name}" ${name === slot.selectedTrick ? 'selected' : ''}>${name} (${t.category} - Fam ${t.family})</option>`;
                          }).join('')}
                        </select>
                      </div>
                    </div>
                  `;
                }).join('')}

                <button type="button" class="btn btn-secondary btn-sm" onclick="addComboSlot(${idx})" style="margin-top:4px; font-size:0.7rem; padding:4px 10px;">+ Add Position Slot</button>
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

      if (!appState.currentUser || (!appState.currentUser.skaterName && !appState.currentUser.username)) {
        showToast('Error: No active skater profile found. Please sign in.', 'error');
        return;
      }

      const activeSkater = appState.currentUser.skaterName || appState.currentUser.username;

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
        let comboName = item.trickName;
        let comboCat = item.category || 'OTHERS';
        let comboFam = item.family || 'Custom';

        if (isCombo) {
          const tot = item.totalAttempts || 1;
          const conn = item.connectedAttempts || 0;
          connRate = ((conn / tot) * 100).toFixed(1) + '%';

          if (item.slots && item.slots.length > 0) {
            const validSlots = item.slots.filter(s => s.selectedTrick);
            comboName = validSlots.map(s => s.selectedTrick).join(' → ');
            if (validSlots[0]) {
              comboCat = validSlots[0].category || 'OTHERS';
              comboFam = validSlots[0].family || 'Custom';
            }
          }
        }

        return {
          sessionId: sessionId,
          date: date,
          sessionType: isCombo ? 'Combo' : 'Single',
          skaterName: activeSkater,
          userId: activeSkater,
          trickName: comboName || (isCombo ? 'Combo Sequence' : item.trickName),
          category: comboCat,
          family: comboFam,
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
