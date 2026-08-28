// Training session functionality.


    function initSessionItems() {
      appState.sessionItems = [
        {
          id: Date.now() + Math.random(),
          type: 'single',
          isCollapsed: false,
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
      appState.sessionPerformances = [];
      renderSessionItems();
      renderSessionPerformanceSection();
    }

    function toggleSessionItemCollapse(idx) {
      if (appState.sessionItems[idx]) {
        appState.sessionItems[idx].isCollapsed = !appState.sessionItems[idx].isCollapsed;
        renderSessionItems();
      }
    }

    function addSessionItem(type) {
      const id = Date.now() + Math.random();
      if (type === 'single') {
        appState.sessionItems.push({
          id,
          type: 'single',
          isCollapsed: false,
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
          isCollapsed: false,
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

    // Performance Session Handlers (Allows multiple Performance runs in 1 session)
    function addPerformanceToSession() {
      if (!appState.sessionPerformances) appState.sessionPerformances = [];
      const master = getMasterPerformance();
      const allTricks = getAllTricks();

      // Deep clone master performance into a temporary session snapshot
      const newSnapshot = {
        id: 'perf-run-' + Date.now() + Math.random(),
        title: `Performance Run #${appState.sessionPerformances.length + 1}`,
        smoothness: 0,
        footwork: 0,
        notes: '',
        isCollapsed: false,
        items: (master && master.items && master.items.length > 0) ? JSON.parse(JSON.stringify(master.items)) : [
          { id: 'pitem-1', type: 'single', name: allTricks[0] ? (allTricks[0].name || allTricks[0].trickname) : 'Butterfly', category: 'OTHERS', family: 'B', completed: false },
          { id: 'pitem-2', type: 'single', name: allTricks[1] ? (allTricks[1].name || allTricks[1].trickname) : 'Nelson', category: 'OTHERS', family: 'E', completed: false }
        ]
      };

      appState.sessionPerformances.push(newSnapshot);
      renderSessionPerformanceSection();
      showToast(`Added Performance #${appState.sessionPerformances.length} to session.`, 'success');
    }

    function removePerformanceFromSession(perfIdx) {
      if (!appState.sessionPerformances || !appState.sessionPerformances[perfIdx]) return;
      appState.sessionPerformances.splice(perfIdx, 1);
      renderSessionPerformanceSection();
    }

    function toggleSessionPerformanceCollapse(perfIdx) {
      if (appState.sessionPerformances && appState.sessionPerformances[perfIdx]) {
        appState.sessionPerformances[perfIdx].isCollapsed = !appState.sessionPerformances[perfIdx].isCollapsed;
        renderSessionPerformanceSection();
      }
    }

    function toggleSessionPerfItemCompletion(perfIdx, itemIdx) {
      if (!appState.sessionPerformances || !appState.sessionPerformances[perfIdx] || !appState.sessionPerformances[perfIdx].items[itemIdx]) return;
      appState.sessionPerformances[perfIdx].items[itemIdx].completed = !appState.sessionPerformances[perfIdx].items[itemIdx].completed;
      renderSessionPerformanceSection();
    }

    function addSessionPerfItem(perfIdx, type) {
      if (!appState.sessionPerformances || !appState.sessionPerformances[perfIdx]) return;
      const id = 'pitem-' + Date.now();
      const allTricks = getAllTricks();
      if (type === 'combo') {
        appState.sessionPerformances[perfIdx].items.push({
          id,
          type: 'combo',
          name: 'Butterfly → Nelson',
          comboTricks: ['Butterfly', 'Nelson'],
          category: 'OTHERS',
          family: 'Custom',
          completed: false
        });
      } else {
        const def = allTricks[0] || { name: 'Butterfly', category: 'OTHERS', family: 'B' };
        appState.sessionPerformances[perfIdx].items.push({
          id,
          type: 'single',
          name: def.name || def.trickname,
          category: def.category,
          family: def.family,
          completed: false
        });
      }
      renderSessionPerformanceSection();
    }

    function removeSessionPerfItem(perfIdx, itemIdx) {
      if (!appState.sessionPerformances || !appState.sessionPerformances[perfIdx]) return;
      appState.sessionPerformances[perfIdx].items.splice(itemIdx, 1);
      renderSessionPerformanceSection();
    }

    function onSessionPerfItemTrickChange(perfIdx, itemIdx, trickName) {
      if (!appState.sessionPerformances || !appState.sessionPerformances[perfIdx] || !appState.sessionPerformances[perfIdx].items[itemIdx]) return;
      const allTricks = getAllTricks();
      const trickObj = allTricks.find(t => (t.name || t.trickname) === trickName);
      const it = appState.sessionPerformances[perfIdx].items[itemIdx];
      it.name = trickName;
      if (trickObj) {
        it.category = trickObj.category;
        it.family = trickObj.family;
      }
      renderSessionPerformanceSection();
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

      const select = document.getElementById(`comboTrickSelect_${itemIdx}_${slotIdx}`);
      if (!select) return;

      const slot = item.slots[slotIdx];
      const allTricks = getAllTricks();
      const filtered = allTricks.filter(t => {
        const matchCat = (slot.categoryFilter === 'ALL' || t.category === slot.categoryFilter);
        const matchFam = (slot.familyFilter === 'ALL' || t.family === slot.familyFilter);
        return matchCat && matchFam && matchTrickKeywords(t.name || t.trickname, value);
      });

      let optionsHtml = `<option value="" ${!slot.selectedTrick ? 'selected' : ''} disabled>-- Choose Trick --</option>`;

      if (slot.selectedTrick && !filtered.some(t => (t.name || t.trickname) === slot.selectedTrick)) {
        optionsHtml += `<option value="${slot.selectedTrick}" selected>${slot.selectedTrick} (${slot.category || 'OTHERS'} - Fam ${slot.family || 'Custom'})</option>`;
      }

      optionsHtml += filtered.map(t => {
        const name = t.name || t.trickname;
        return `<option value="${name}" ${name === slot.selectedTrick ? 'selected' : ''}>${name} (${t.category} - Fam ${t.family})</option>`;
      }).join('');

      select.innerHTML = optionsHtml;
      select.value = slot.selectedTrick || '';
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
          <div class="empty-state" style="padding:14px 10px; border:1px dashed var(--border-razor); border-radius:var(--radius-md); margin-bottom:10px;">
            <div class="empty-text" style="margin-bottom:0; font-size:0.75rem;">No individual drills added.</div>
          </div>
        `;
        return;
      }

      container.innerHTML = appState.sessionItems.map((item, idx) => {
        const isCombo = item.type === 'combo';
        const isCollapsed = !!item.isCollapsed;
        const displayName = isCombo ? (item.trickName || 'Combo Sequence') : (item.trickName || 'Select Trick');

        const filteredTricks = allTricks.filter(t => t && matchTrickKeywords(t.name || t.trickname, item.searchFilter || ''));
        const hasMatch = item.trickName ? filteredTricks.some(t => t && (t.name || t.trickname) === item.trickName) : false;

        return `
          <div class="session-item-card ${isCollapsed ? 'is-collapsed' : ''}">
            <div class="session-item-header" onclick="toggleSessionItemCollapse(${idx})">
              <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
                <span class="collapse-arrow">${isCollapsed ? '▶' : '▼'}</span>
                <span class="badge ${isCombo ? 'badge-combo' : 'badge-family'}">#${idx + 1} ${isCombo ? 'Combo' : 'Trick'}</span>
                <span class="collapsed-item-preview" title="${displayName}">${displayName}</span>
              </div>
              <button type="button" onclick="event.stopPropagation(); removeSessionItem(${idx})" style="background:rgba(239, 68, 68, 0.15); border:1px solid rgba(239, 68, 68, 0.3); color:#f87171; padding:2px 8px; border-radius:var(--radius-pill); font-weight:700; font-size:0.6875rem; cursor:pointer;">✕ Remove</button>
            </div>

            ${!isCollapsed ? `
              <div class="session-item-body">
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
                        ${item.trickName && !hasMatch ? `<option value="${item.trickName}" selected>${item.trickName} (${item.category} - Fam ${item.family})</option>` : ''}
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
                    ${(() => {
                      const pastCombos = getUserPastCombos();
                      if (pastCombos.length === 0) return '';
                      return `
                        <div class="combo-suggestions-wrap">
                          <div class="combo-suggestions-header">
                            <div class="combo-suggestions-title">💡 Previously Logged Combos</div>
                            <span style="font-size:0.65rem; color:var(--on-surface-muted);">Tap to load</span>
                          </div>
                          <div class="combo-suggestions-chips">
                            ${pastCombos.map(comboName => `
                              <button type="button" class="combo-chip" onclick="applySuggestedCombo(${idx}, '${comboName.replace(/'/g, "\\'")}')" title="Load: ${comboName}">
                                <span>🔗</span> ${comboName}
                              </button>
                            `).join('')}
                          </div>
                        </div>
                      `;
                    })()}

                    <div class="label-caps" style="margin-bottom:8px; color:var(--primary);">Combo Independent Trick Slots</div>
                    
                    ${(item.slots || []).map((slot, sIdx) => {
                      const sFiltered = allTricks.filter(t => {
                        const mCat = (slot.categoryFilter === 'ALL' || t.category === slot.categoryFilter);
                        const mFam = (slot.familyFilter === 'ALL' || t.family === slot.familyFilter);
                        return mCat && mFam && matchTrickKeywords(t.name || t.trickname, slot.searchFilter);
                      });
                      const hasSlotMatch = sFiltered.some(t => (t.name || t.trickname) === slot.selectedTrick);

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
                          ${slot.selectedTrick && !hasSlotMatch ? `<option value="${slot.selectedTrick}" selected>${slot.selectedTrick} (${slot.category} - Fam ${slot.family})</option>` : ''}
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
            ` : ''}
          </div>
        `;
      }).join('');
    }

    function renderSessionPerformanceSection() {
      const container = document.getElementById('sessionPerformanceContainer');
      if (!container) return;

      if (!appState.sessionPerformances || appState.sessionPerformances.length === 0) {
        container.innerHTML = '';
        return;
      }

      const allTricks = getAllTricks();

      container.innerHTML = appState.sessionPerformances.map((perf, pIdx) => {
        const isCollapsed = !!perf.isCollapsed;
        const scoreData = PERFORMANCE_SCORING_CONFIG.calculatePerformanceScore(perf);

        return `
          <div class="session-item-card perf-session-card ${isCollapsed ? 'is-collapsed' : ''}" style="margin-bottom:12px;">
            <div class="session-item-header" onclick="toggleSessionPerformanceCollapse(${pIdx})">
              <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
                <span class="collapse-arrow">${isCollapsed ? '▶' : '▼'}</span>
                <span class="badge badge-perf">🎭 Performance #${pIdx + 1}</span>
                <span class="badge ${scoreData.isValid ? 'badge-combo' : 'badge-danger'}">
                  ${scoreData.completedCount} / ${PERFORMANCE_SCORING_CONFIG.minCompletedTricksRequired} Completed ${scoreData.isValid ? '✓' : '(Min 9 Req.)'}
                </span>
              </div>
              <button type="button" onclick="event.stopPropagation(); removePerformanceFromSession(${pIdx})" style="background:rgba(239, 68, 68, 0.15); border:1px solid rgba(239, 68, 68, 0.3); color:#f87171; padding:2px 8px; border-radius:var(--radius-pill); font-weight:700; font-size:0.6875rem; cursor:pointer;">✕ Remove</button>
            </div>

            ${!isCollapsed ? `
              <div class="session-item-body" style="margin-top:10px;">
                <div style="font-size:0.75rem; color:var(--on-surface-muted); margin-bottom:10px;">
                  Session Run #${pIdx + 1}: Mark completion and swap components for today's run without modifying master configuration.
                </div>

                <!-- Score Summary Strip -->
                <div class="perf-score-strip">
                  <div>
                    <span class="label-caps">Base Trick Pts</span>
                    <div class="perf-strip-val">${scoreData.basePoints}</div>
                  </div>
                  <div>
                    <span class="label-caps">Smoothness</span>
                    <div class="perf-strip-val">${scoreData.smoothness}</div>
                  </div>
                  <div>
                    <span class="label-caps">Footwork</span>
                    <div class="perf-strip-val">${scoreData.footwork}</div>
                  </div>
                  <div>
                    <span class="label-caps">Est. Score</span>
                    <div class="perf-strip-val" style="color:var(--primary);">${scoreData.totalScore}</div>
                  </div>
                </div>

                <!-- Trick & Combo Checklist -->
                <div class="perf-items-list" style="margin:12px 0;">
                  ${(perf.items || []).map((item, itIdx) => `
                    <div class="perf-item-row ${item.completed ? 'is-complete' : 'is-incomplete'}">
                      <label class="perf-checkbox-label">
                        <input type="checkbox" ${item.completed ? 'checked' : ''} onchange="toggleSessionPerfItemCompletion(${pIdx}, ${itIdx})">
                        <span class="perf-custom-check"></span>
                      </label>
                      <div style="flex:1; min-width:0;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                          <span style="font-family:var(--font-mono); font-size:0.75rem; font-weight:700; color:var(--on-surface);">
                            #${itIdx + 1} [${item.type === 'combo' ? 'Combo' : 'Trick'}] ${item.name || 'Unassigned'}
                          </span>
                          <span class="badge ${item.completed ? 'badge-combo' : 'badge-family'}" style="font-size:0.6rem; padding:2px 6px;">
                            ${item.completed ? 'COMPLETE' : 'INCOMPLETE'}
                          </span>
                        </div>
                        <div class="row-2" style="margin-top:6px;">
                          <select style="font-size:0.75rem; padding:4px 8px;" onchange="onSessionPerfItemTrickChange(${pIdx}, ${itIdx}, this.value)">
                            <option value="">-- Swap Trick for Run #${pIdx + 1} --</option>
                            ${allTricks.map(t => {
                              const name = t.name || t.trickname;
                              return `<option value="${name}" ${name === item.name ? 'selected' : ''}>${name} (${t.category} - Fam ${t.family})</option>`;
                            }).join('')}
                          </select>
                          <button type="button" onclick="removeSessionPerfItem(${pIdx}, ${itIdx})" style="background:none; border:none; color:#f87171; font-size:0.7rem; cursor:pointer; text-align:right;">✕ Remove</button>
                        </div>
                      </div>
                    </div>
                  `).join('')}
                </div>

                <div style="display:flex; gap:8px; margin-bottom:12px;">
                  <button type="button" class="btn btn-secondary btn-sm" onclick="addSessionPerfItem(${pIdx}, 'single')">+ Add Trick</button>
                  <button type="button" class="btn btn-secondary btn-sm" onclick="addSessionPerfItem(${pIdx}, 'combo')">+ Add Combo</button>
                </div>

                <div class="row-2">
                  <div class="form-group">
                    <label>Smoothness Score (Judged / Self)</label>
                    <input type="number" min="0" max="20" step="0.5" placeholder="e.g. 8.5" value="${perf.smoothness || ''}" oninput="appState.sessionPerformances[${pIdx}].smoothness = parseFloat(this.value) || 0; renderSessionPerformanceSection();">
                  </div>
                  <div class="form-group">
                    <label>Footwork &amp; Flow Score</label>
                    <input type="number" min="0" max="20" step="0.5" placeholder="e.g. 7.0" value="${perf.footwork || ''}" oninput="appState.sessionPerformances[${pIdx}].footwork = parseFloat(this.value) || 0; renderSessionPerformanceSection();">
                  </div>
                </div>

                <div class="form-group" style="margin-bottom:0;">
                  <label>Run #${pIdx + 1} Notes</label>
                  <input type="text" placeholder="e.g. Routine run-through notes" value="${perf.notes || ''}" oninput="appState.sessionPerformances[${pIdx}].notes = this.value;">
                </div>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    }

    window.toggleSessionItemCollapse = toggleSessionItemCollapse;
    window.addPerformanceToSession = addPerformanceToSession;
    window.removePerformanceFromSession = removePerformanceFromSession;
    window.toggleSessionPerformanceCollapse = toggleSessionPerformanceCollapse;
    window.toggleSessionPerfItemCompletion = toggleSessionPerfItemCompletion;
    window.addSessionPerfItem = addSessionPerfItem;
    window.removeSessionPerfItem = removeSessionPerfItem;
    window.onSessionPerfItemTrickChange = onSessionPerfItemTrickChange;

    function onSessionItemSearchInput(idx, value) {
      const item = appState.sessionItems[idx];
      if (!item) return;

      item.searchFilter = value || '';
      const select = document.getElementById(`itemTrickSelect_${idx}`);
      if (!select) return;

      const allTricks = getAllTricks();
      const filteredTricks = allTricks.filter(t => matchTrickKeywords(t.name || t.trickname, value));

      let optionsHtml = `<option value="" ${!item.trickName ? 'selected' : ''} disabled>-- Choose Trick --</option>`;

      if (item.trickName && !filteredTricks.some(t => (t.name || t.trickname) === item.trickName)) {
        optionsHtml += `<option value="${item.trickName}" selected>${item.trickName} (${item.category} - Fam ${item.family})</option>`;
      }

      optionsHtml += filteredTricks.map(t => {
        const name = t.name || t.trickname;
        return `<option value="${name}" ${name === item.trickName ? 'selected' : ''}>${name} (${t.category} - Fam ${t.family})</option>`;
      }).join('');

      select.innerHTML = optionsHtml;
      select.value = item.trickName || '';
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

      const hasItems = appState.sessionItems && appState.sessionItems.length > 0 && appState.sessionItems.some(i => i.trickName || (i.slots && i.slots.some(s => s.selectedTrick)));
      const hasPerf = appState.sessionPerformance && appState.sessionPerformance.items && appState.sessionPerformance.items.length > 0;

      if (!hasItems && !hasPerf) {
        showToast('Please add at least one trick drill, combo, or Performance before saving this session.', 'warning');
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

      const formattedPayloadItems = [];

      // Format individual trick and combo items
      (appState.sessionItems || []).forEach(item => {
        if (!item.trickName && (!item.slots || !item.slots.some(s => s.selectedTrick))) return;
        const target = Number(item.target || 0);
        const completed = Number(item.completed || 0);
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

        formattedPayloadItems.push({
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
          successRate: target > 0 ? parseFloat(((completed / target) * 100).toFixed(1)) : 0,
          connectedCompletion: connRate,
          notes: item.notes || globalNotes
        });
      });

      // Format all session Performance snapshots included in this training log
      if (appState.sessionPerformances && appState.sessionPerformances.length > 0) {
        appState.sessionPerformances.forEach((perf, pIdx) => {
          if (!perf.items || perf.items.length === 0) return;
          const perfScore = PERFORMANCE_SCORING_CONFIG.calculatePerformanceScore(perf);
          const perfRecord = {
            sessionId: sessionId,
            date: date,
            sessionType: 'Performance',
            skaterName: activeSkater,
            userId: activeSkater,
            trickName: `Performance Run #${pIdx + 1} (2 min)`,
            category: 'PERFORMANCE',
            family: perfScore.isValid ? 'Valid' : 'Incomplete',
            targetCones: perf.items.length,
            completedCones: perfScore.completedCount,
            missedCones: perf.items.length - perfScore.completedCount,
            falls: 0,
            successRate: perf.items.length > 0 ? parseFloat(((perfScore.completedCount / perf.items.length) * 100).toFixed(1)) : 0,
            connectedCompletion: 'N/A',
            performanceSnapshot: JSON.parse(JSON.stringify(perf)),
            performanceScore: perfScore.totalScore,
            smoothnessScore: perfScore.smoothness,
            footworkScore: perfScore.footwork,
            notes: perf.notes || globalNotes
          };
          formattedPayloadItems.push(perfRecord);
        });
      }

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
    // Extract unique saved combos exclusively for the active logged-in user
    function getUserPastCombos() {
      if (!appState.currentUser || !appState.sessions) return [];
      const activeSkater = String(appState.currentUser.skaterName || appState.currentUser.username || '').toLowerCase();
      
      const userComboSessions = appState.sessions.filter(s => {
        const skaterMatch = String(s.skaterName || s.skatername || s.userid || '').toLowerCase() === activeSkater;
        const isCombo = (s.sessionType || s.sessiontype) === 'Combo';
        const name = s.trickName || s.trickname || '';
        return skaterMatch && isCombo && name && name.includes(' → ');
      });

      const uniqueNames = [...new Set(userComboSessions.map(s => s.trickName || s.trickname))];
      return uniqueNames.slice(0, 10);
    }

    // Apply a clicked past combo into the active combo builder slots
    function applySuggestedCombo(itemIdx, comboSequenceStr) {
      const item = appState.sessionItems[itemIdx];
      if (!item || !comboSequenceStr) return;

      const trickNames = comboSequenceStr.split(' → ').map(s => s.trim()).filter(Boolean);
      if (trickNames.length === 0) return;

      const allTricks = getAllTricks();
      item.slots = trickNames.map(name => {
        const found = allTricks.find(t => (t.name || t.trickname) === name);
        return {
          categoryFilter: 'ALL',
          familyFilter: 'ALL',
          searchFilter: '',
          selectedTrick: name,
          category: found ? found.category : 'OTHERS',
          family: found ? found.family : 'Custom'
        };
      });

      item.trickName = comboSequenceStr;
      renderSessionItems();
      showToast(`Loaded combo: ${comboSequenceStr}`, 'success');
    }

    window.getUserPastCombos = getUserPastCombos;
    window.applySuggestedCombo = applySuggestedCombo;
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