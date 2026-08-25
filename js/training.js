// Training session functionality.


    function initSessionItems() {
      appState.sessionItems = [
        {
          id: Date.now() + Math.random(),
          type: 'single',
          trickName: '',
          category: '',
          family: '',
          target: '',
          completed: '',
          missed: '',
          falls: 0,
          notes: '',
          searchFilter: ''
        }
      ];
      renderSessionItems();
    }

    function addSessionItem(type) {
      const id = Date.now() + Math.random();
      if (type === 'single') {
        appState.sessionItems.push({
          id,
          type: 'single',
          trickName: '',
          category: '',
          family: '',
          target: '',
          completed: '',
          missed: '',
          falls: 0,
          notes: '',
          searchFilter: ''
        });
      } else {
        appState.sessionItems.push({
          id,
          type: 'combo',
          trickName: '',
          slots: [
            { categoryFilter: 'ALL', familyFilter: 'ALL', searchFilter: '', selectedTrick: '', category: '', family: '' },
            { categoryFilter: 'ALL', familyFilter: 'ALL', searchFilter: '', selectedTrick: '', category: '', family: '' }
          ],
          target: '',
          completed: '',
          missed: '',
          totalAttempts: '',
          connectedAttempts: '',
          falls: 0,
          notes: ''
        });
      }
      renderSessionItems();
    }

    function removeSessionItem(index) {
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

      if (!appState.sessionItems || appState.sessionItems.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="padding:20px 10px; border:1px dashed var(--border-razor); border-radius:var(--radius-md); margin-bottom:10px;">
            <div class="empty-text" style="margin-bottom:0;">No practice items added. Click below to add an individual trick drill or a combo sequence.</div>
          </div>
        `;
        return;
      }

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
              <button type="button" onclick="removeSessionItem(${idx})" style="background:rgba(239, 68, 68, 0.15); border:1px solid rgba(239, 68, 68, 0.3); color:#f87171; padding:2px 8px; border-radius:var(--radius-pill); font-weight:700; font-size:0.7rem; cursor:pointer;">✕ Remove Item</button>
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
                    <option value="" disabled ${!item.trickName ? 'selected' : ''}>-- Select a trick --</option>
                    ${filteredTricks.map(t => {
                      const name = t.name || t.trickname;
                      return `<option value="${name}" ${name === item.trickName ? 'selected' : ''}>${name} (${t.category} - Fam ${t.family})</option>`;
                    }).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label>Category / Family</label>
                  <input type="text" value="${item.category ? item.category + ' (Fam ' + item.family + ')' : ''}" placeholder="Auto-detected from trick" readonly style="background:var(--bg-container-high); font-weight:700;">
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
                          <option value="" disabled ${!slot.selectedTrick ? 'selected' : ''}>-- Add a trick to your combo --</option>
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
                <input type="number" min="1" placeholder="Enter target cones" value="${item.target !== undefined && item.target !== '' ? item.target : ''}" oninput="appState.sessionItems[${idx}].target = this.value === '' ? '' : parseInt(this.value, 10); autoCalcItemMissed(${idx});">
              </div>
              <div class="form-group">
                <label>Completed</label>
                <input type="number" min="0" placeholder="Enter completed cones" value="${item.completed !== undefined && item.completed !== '' ? item.completed : ''}" oninput="appState.sessionItems[${idx}].completed = this.value === '' ? '' : parseInt(this.value, 10); autoCalcItemMissed(${idx});">
              </div>
              <div class="form-group">
                <label>Kicked/Missed</label>
                <input type="number" id="itemMissed_${idx}" min="0" placeholder="Missed cones" value="${item.missed !== undefined && item.missed !== '' ? item.missed : ''}" oninput="appState.sessionItems[${idx}].missed = this.value === '' ? '' : parseInt(this.value, 10);">
              </div>
            </div>

            ${isCombo ? `
              <div class="row-2">
                <div class="form-group">
                  <label>Total Attempts</label>
                  <input type="number" min="1" placeholder="e.g. 10" value="${item.totalAttempts !== undefined && item.totalAttempts !== '' ? item.totalAttempts : ''}" oninput="appState.sessionItems[${idx}].totalAttempts = this.value === '' ? '' : parseInt(this.value, 10);">
                </div>
                <div class="form-group">
                  <label>Connected Attempts</label>
                  <input type="number" min="0" placeholder="e.g. 7" value="${item.connectedAttempts !== undefined && item.connectedAttempts !== '' ? item.connectedAttempts : ''}" oninput="appState.sessionItems[${idx}].connectedAttempts = this.value === '' ? '' : parseInt(this.value, 10);">
                </div>
              </div>
            ` : ''}

            <div class="row-2">
              <div class="form-group" style="margin-bottom:0;">
                <label>Falls Count</label>
                <input type="number" min="0" placeholder="e.g. 0" value="${item.falls !== undefined && item.falls !== '' ? item.falls : ''}" oninput="appState.sessionItems[${idx}].falls = this.value === '' ? '' : parseInt(this.value, 10);">
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
      if (!appState.sessionItems[idx]) return;
      const allTricks = getAllTricks();
      const trickObj = allTricks.find(t => (t.name || t.trickname) === selectedTrickName);
      if (trickObj) {
        appState.sessionItems[idx].trickName = selectedTrickName;
        appState.sessionItems[idx].category = trickObj.category;
        appState.sessionItems[idx].family = trickObj.family;
        renderSessionItems();
      } else {
        appState.sessionItems[idx].trickName = selectedTrickName;
      }
    }


    function autoCalcItemMissed(idx) {
      const item = appState.sessionItems[idx];
      if (item && item.target !== '' && item.completed !== '' && item.target >= item.completed) {
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

      // Strict validation: Prevent future dates
      const todayStr = new Date().toISOString().split('T')[0];
      if (date > todayStr) {
        showToast('You cannot log training for a future date.', 'warning');
        return;
      }

      const notesEl = document.getElementById('logSessionGlobalNotes');
      const globalNotes = notesEl ? notesEl.value.trim() : '';
      const sessionId = 'SESS-' + Date.now();

      if (!appState.sessionItems || appState.sessionItems.length === 0) {
        showToast('Please add at least one trick or combo before saving this session.', 'warning');
        return;
      }

      // Validate every session item thoroughly to prevent blank/fake saves
      for (let i = 0; i < appState.sessionItems.length; i++) {
        const item = appState.sessionItems[i];
        const isCombo = item.type === 'combo';

        if (!isCombo) {
          if (!item.trickName || item.trickName.trim() === '') {
            showToast(`Please select a trick for Item #${i + 1}.`, 'warning');
            return;
          }
        } else {
          const validSlots = (item.slots || []).filter(s => s.selectedTrick && s.selectedTrick.trim() !== '');
          if (validSlots.length < 2) {
            showToast(`Please select at least 2 tricks for Combo #${i + 1}.`, 'warning');
            return;
          }
        }

        if (item.target === '' || item.target === undefined || isNaN(Number(item.target)) || Number(item.target) <= 0) {
          showToast(`Please enter a valid target cone count (> 0) for Item #${i + 1}.`, 'warning');
          return;
        }

        if (item.completed === '' || item.completed === undefined || isNaN(Number(item.completed)) || Number(item.completed) < 0) {
          showToast(`Please enter a valid completed cone count for Item #${i + 1}.`, 'warning');
          return;
        }
      }

      const formattedPayloadItems = appState.sessionItems.map(item => {
        const target = Number(item.target);
        const completed = Number(item.completed);
        const missed = item.missed !== '' && item.missed !== undefined ? Number(item.missed) : Math.max(0, target - completed);
        const isCombo = item.type === 'combo';
        
        let connRate = 'N/A';
        let comboName = item.trickName;
        let comboCat = item.category || 'OTHERS';
        let comboFam = item.family || 'Custom';

        if (isCombo) {
          const tot = item.totalAttempts !== '' && item.totalAttempts !== undefined ? Math.max(1, Number(item.totalAttempts)) : 1;
          const conn = item.connectedAttempts !== '' && item.connectedAttempts !== undefined ? Number(item.connectedAttempts) : 0;
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
          falls: item.falls !== '' && item.falls !== undefined ? Number(item.falls) : 0,
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
      
      const summaryStats = calculateSessionSummary(formattedPayloadItems, date);
      initSessionItems();
      populateProgressTrickFilter();
      showSessionSummaryModal(summaryStats);
    }

    function calculateSessionSummary(items, date) {
      let totalTarget = 0;
      let totalCompleted = 0;
      let totalMissed = 0;
      let singleCount = 0;
      let comboCount = 0;
      let bestItem = null;
      let bestScore = -1;

      items.forEach(it => {
        totalTarget += it.targetCones;
        totalCompleted += it.completedCones;
        totalMissed += it.missedCones;

        if (it.sessionType === 'Combo') comboCount++;
        else singleCount++;

        if (it.completedCones > bestScore) {
          bestScore = it.completedCones;
          bestItem = it.trickName;
        }
      });

      const overallSuccess = totalTarget > 0 ? ((totalCompleted / totalTarget) * 100).toFixed(1) : 0;

      return {
        date,
        totalItems: items.length,
        singleCount,
        comboCount,
        totalTarget,
        totalCompleted,
        totalMissed,
        overallSuccess,
        bestItem: bestItem || 'N/A',
        bestScore: Math.max(0, bestScore)
      };
    }

    function showSessionSummaryModal(summary) {
      let modal = document.getElementById('sessionSummaryModal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sessionSummaryModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="glass-card" style="max-width:400px; width:100%; text-align:center;">
          <div style="font-size:2.2rem; margin-bottom:4px;">🏁</div>
          <div class="headline-lg" style="color:var(--primary); margin-bottom:4px;">SESSION COMPLETE ✓</div>
          <div class="label-caps">${summary.date}</div>

          <div class="metrics-grid" style="grid-template-columns:repeat(3, 1fr); margin:16px 0 14px 0;">
            <div class="metric-card" style="padding:10px;">
              <div class="metric-label">Tricks</div>
              <div class="metric-value" style="font-size:1.25rem;">${summary.singleCount}</div>
            </div>
            <div class="metric-card" style="padding:10px;">
              <div class="metric-label">Combos</div>
              <div class="metric-value" style="font-size:1.25rem;">${summary.comboCount}</div>
            </div>
            <div class="metric-card" style="padding:10px;">
              <div class="metric-label">Success</div>
              <div class="metric-value" style="font-size:1.25rem;">${summary.overallSuccess}%</div>
            </div>
          </div>

          <div style="background:var(--bg-container); border:1px solid var(--border-razor); border-radius:var(--radius-md); padding:12px; margin-bottom:16px; text-align:left;">
            <div class="label-caps" style="color:var(--primary);">🌟 Best Performance</div>
            <div style="font-size:0.95rem; font-weight:700; margin-top:2px;">${summary.bestItem}</div>
            <div style="font-size:0.75rem; color:var(--on-surface-muted); margin-top:2px;">Completed: ${summary.bestScore} cones</div>
          </div>

          <button type="button" class="btn" onclick="closeSessionSummaryModal()">Go to Dashboard</button>
        </div>
      `;

      modal.style.display = 'flex';
    }

    function closeSessionSummaryModal() {
      const modal = document.getElementById('sessionSummaryModal');
      if (modal) modal.style.display = 'none';
      switchTab('dashboard');
    }

    window.closeSessionSummaryModal = closeSessionSummaryModal;
    window.handleRestDaySubmit = handleRestDaySubmit;
    // Global bindings to ensure dynamically loaded HTML handlers execute reliably
    window.initSessionItems = initSessionItems;
    window.addSessionItem = addSessionItem;
    window.removeSessionItem = removeSessionItem;
    window.addComboSlot = addComboSlot;
    window.removeComboSlot = removeComboSlot;
    window.onComboSlotFilterChange = onComboSlotFilterChange;
    window.onComboSlotSearchInput = onComboSlotSearchInput;
    window.onComboSlotTrickChange = onComboSlotTrickChange;
    window.onSessionItemSearchInput = onSessionItemSearchInput;
    window.onSessionItemTrickChange = onSessionItemTrickChange;
    window.autoCalcItemMissed = autoCalcItemMissed;
    window.handleMultiSessionSubmit = handleMultiSessionSubmit;
async function handleRestDaySubmit(e) {
      if (e) { e.preventDefault(); e.stopPropagation(); }

      if (!appState.currentUser) {
        showToast('Please sign in to log activity.', 'error');
        return false;
      }

      const activeSkater = appState.currentUser.skaterName || appState.currentUser.username;
      const dateEl = document.getElementById('logRestDate');
      const notesEl = document.getElementById('logRestNotes');

      const date = dateEl ? dateEl.value : '';
      const notes = notesEl ? notesEl.value.trim() : '';

      if (!date) {
        showToast('Please select a date for your rest day.', 'warning');
        return false;
      }

      // Strict validation: Prevent future dates
      const todayStr = new Date().toISOString().split('T')[0];
      if (date > todayStr) {
        showToast('You cannot log training for a future date.', 'warning');
        return false;
      }

      const restPayload = {
        sessionId: 'REST-' + Date.now(),
        date: date,
        sessionType: 'Rest',
        skaterName: activeSkater,
        userId: activeSkater,
        trickName: 'Rest Day',
        category: 'REST',
        family: '-',
        targetCones: 0,
        completedCones: 0,
        missedCones: 0,
        falls: 0,
        successRate: 0,
        connectedCompletion: 'N/A',
        notes: notes || 'Intentional Recovery'
      };

      appState.sessions.unshift(restPayload);

      if (APPS_SCRIPT_URL && APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_WEB_APP_URL") {
        try {
          fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              action: 'logSession',
              payload: {
                sessionId: restPayload.sessionId,
                date: date,
                skaterName: activeSkater,
                userId: activeSkater,
                sessionNotes: notes || 'Rest Day',
                items: [restPayload]
              }
            })
          });
        } catch(err) { console.error('API Error:', err); }
      }

      showToast(`Rest day recorded for ${date}!`, 'success');
      if (notesEl) notesEl.value = '';
      switchTab('dashboard');
      return false;
    }

    window.handleRestDaySubmit = handleRestDaySubmit;