// Custom trick functionality.


    function normalizeTrickName(str) {
      return String(str || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .trim();
    }

    function calculateLevenshteinSimilarity(s1, s2) {
      const longer = s1.length >= s2.length ? s1 : s2;
      const shorter = s1.length < s2.length ? s1 : s2;
      if (longer.length === 0) return 1.0;

      const costs = [];
      for (let i = 0; i <= longer.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= shorter.length; j++) {
          if (i === 0) {
            costs[j] = j;
          } else if (j > 0) {
            let newValue = costs[j - 1];
            if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
        if (i > 0) costs[shorter.length] = lastValue;
      }
      return (longer.length - costs[shorter.length]) / parseFloat(longer.length);
    }

    async function handleCustomTrickSubmit(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      const nameEl = document.getElementById('custName');
      const catEl = document.getElementById('custCat');
      const famEl = document.getElementById('custFam');

      const name = nameEl ? nameEl.value.trim() : '';
      const category = catEl ? catEl.value : 'OTHERS';
      const family = famEl ? famEl.value : 'Custom';

      if (!name) {
        showToast('Please enter a custom trick name.', 'warning');
        return false;
      }

      const allTricks = getAllTricks();
      const normInput = normalizeTrickName(name);

      // 1. Exact match check
      const exactMatch = allTricks.find(t => normalizeTrickName(t.name || t.trickname) === normInput);
      if (exactMatch) {
        showToast('This trick already exists. Please use the existing trick instead.', 'error');
        return false;
      }

      // 2. Similar name check
      const similarMatch = allTricks.find(t => {
        const normTarget = normalizeTrickName(t.name || t.trickname);
        return calculateLevenshteinSimilarity(normInput, normTarget) >= 0.8;
      });

      if (similarMatch) {
        showToast('A similar trick already exists in the trick matrix. Please check the existing tricks before creating a custom trick.', 'warning');
      }

      const customTrick = {
        id: 'CUST-' + Date.now(),
        trickid: 'CUST-' + Date.now(),
        trickname: name,
        name: name,
        category: category,
        family: family,
        type: 'Custom',
        skaterName: appState.currentUser.skaterName
      };

      appState.customTricks.push(customTrick);

      if (APPS_SCRIPT_URL && APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_WEB_APP_URL") {
        try {
          fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'addCustomTrick', payload: customTrick })
          });
        } catch(err) { console.error('API Error:', err); }
      }

      showToast(`Custom trick "${name}" created!`, 'success');
      if (nameEl) nameEl.value = '';

      renderCustomTricksList();
      renderSessionItems();
      return false;
    }


    function openEditCustomModal(trickId) {
      const trick = appState.customTricks.find(t => (t.id === trickId || t.trickid === trickId));
      if (!trick) return;

      const editId = document.getElementById('editTrickId');
      if (editId) editId.value = trick.id || trick.trickid;

      const editName = document.getElementById('editTrickName');
      if (editName) editName.value = trick.name || trick.trickname;

      const editCat = document.getElementById('editTrickCategory');
      if (editCat) editCat.value = trick.category || 'OTHERS';

      const editFam = document.getElementById('editTrickFamily');
      if (editFam) editFam.value = trick.family || 'Custom';

      const modal = document.getElementById('editCustomModal');
      if (modal) modal.style.display = 'flex';
    }


    function closeEditCustomModal() {
      const modal = document.getElementById('editCustomModal');
      if (modal) modal.style.display = 'none';
    }


    async function handleEditCustomTrickSubmit(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }

      const trickId = document.getElementById('editTrickId').value;
      const newName = document.getElementById('editTrickName').value.trim();
      const newCategory = document.getElementById('editTrickCategory').value;
      const newFamily = document.getElementById('editTrickFamily') ? document.getElementById('editTrickFamily').value : 'Custom';

      if (!newName) return false;

      const targetIndex = appState.customTricks.findIndex(t => (t.id === trickId || t.trickid === trickId));
      if (targetIndex !== -1) {
        appState.customTricks[targetIndex].name = newName;
        appState.customTricks[targetIndex].trickname = newName;
        appState.customTricks[targetIndex].category = newCategory;
        appState.customTricks[targetIndex].family = newFamily;
      }

      if (APPS_SCRIPT_URL && APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_WEB_APP_URL") {
        try {
          fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              action: 'editCustomTrick',
              payload: { id: trickId, trickName: newName, category: newCategory, family: newFamily, skaterName: appState.currentUser.skaterName }
            })
          });
        } catch(err) { console.error('API Edit Error:', err); }
      }

      showToast(`Custom trick updated to "${newName}"`, 'success');
      closeEditCustomModal();
      renderCustomTricksList();
      renderSessionItems();
      return false;
    }


    function openDeleteConfirmModal(trickId) {
      const trick = appState.customTricks.find(t => (t.id === trickId || t.trickid === trickId));
      if (!trick) return;

      appState.deletingTrickId = trickId;
      safeSetTextContent('deleteModalMessage', `Are you sure you want to delete "${trick.name || trick.trickname}"?`);

      const btnDelete = document.getElementById('btnConfirmDelete');
      if (btnDelete) btnDelete.onclick = () => executeDeleteCustomTrick(trickId);

      const modal = document.getElementById('confirmDeleteModal');
      if (modal) modal.style.display = 'flex';
    }


    function closeDeleteConfirmModal() {
      appState.deletingTrickId = null;
      const modal = document.getElementById('confirmDeleteModal');
      if (modal) modal.style.display = 'none';
    }


    async function executeDeleteCustomTrick(trickId) {
      closeDeleteConfirmModal();

      appState.customTricks = appState.customTricks.filter(t => (t.id !== trickId && t.trickid !== trickId));

      if (APPS_SCRIPT_URL && APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_WEB_APP_URL") {
        try {
          fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              action: 'deleteCustomTrick',
              payload: { id: trickId, skaterName: appState.currentUser.skaterName }
            })
          });
        } catch(err) { console.error('API Delete Error:', err); }
      }

      showToast('Custom trick deleted.', 'success');
      renderCustomTricksList();
      renderSessionItems();
    }
// =======================================================
    // MASTER PERFORMANCE ROUTINE MANAGER (CUSTOM TRICKS PAGE)
    // =======================================================
    let isMasterPerformanceEditing = false;
    let tempMasterPerformanceDraft = null;

    function getMasterPerformance() {
      if (!appState.currentUser) {
        return { title: '2-Minute Performance Routine', items: [], smoothness: 0, footwork: 0 };
      }
      const userKey = (appState.currentUser.userId || appState.currentUser.username || appState.currentUser.skaterName || '').toLowerCase();
      if (!appState.masterPerformances[userKey]) {
        appState.masterPerformances[userKey] = {
          title: '2-Minute Performance Routine',
          items: [],
          smoothness: 0,
          footwork: 0
        };
      }
      return appState.masterPerformances[userKey];
    }

    async function saveMasterPerformance(perfObj) {
      if (!appState.currentUser) return;
      const userKey = (appState.currentUser.userId || appState.currentUser.username || appState.currentUser.skaterName || '').toLowerCase();
      const activeSkater = appState.currentUser.skaterName || appState.currentUser.username;
      
      const cleanClone = JSON.parse(JSON.stringify(perfObj));
      appState.masterPerformances[userKey] = cleanClone;

      if (APPS_SCRIPT_URL && APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_WEB_APP_URL") {
        try {
          const res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              action: 'saveMasterPerformance',
              payload: {
                userId: userKey,
                skaterName: activeSkater,
                masterPerformance: cleanClone
              }
            })
          });
          const json = await res.json();
          if (json.status === 'success') {
            showToast('Master Performance saved to RollSync Cloud!', 'success');
          }
        } catch(err) {
          console.error('Cloud Sync Error for Master Performance:', err);
          showToast('Failed to sync Master Performance to backend.', 'error');
        }
      }
    }

    function toggleMasterPerfItemCollapse(idx) {
      if (tempMasterPerformanceDraft && tempMasterPerformanceDraft.items[idx]) {
        tempMasterPerformanceDraft.items[idx].isCollapsed = !tempMasterPerformanceDraft.items[idx].isCollapsed;
        renderMasterPerformancePanel();
      }
    }

    window.toggleMasterPerfItemCollapse = toggleMasterPerfItemCollapse;

    function enterMasterPerformanceEditMode() {
      const master = getMasterPerformance();
      tempMasterPerformanceDraft = JSON.parse(JSON.stringify(master));
      isMasterPerformanceEditing = true;
      renderMasterPerformancePanel();
    }

    function cancelMasterPerformanceEditMode() {
      tempMasterPerformanceDraft = null;
      isMasterPerformanceEditing = false;
      renderMasterPerformancePanel();
    }

    function saveAndUpdateMasterPerformance() {
      if (!tempMasterPerformanceDraft) return;
      saveMasterPerformance(tempMasterPerformanceDraft);
      tempMasterPerformanceDraft = null;
      isMasterPerformanceEditing = false;
      renderMasterPerformancePanel();
      showToast('Master Performance saved and locked.', 'success');
    }

    function addMasterPerfTrick(type) {
      if (!tempMasterPerformanceDraft) return;

      if (type === 'combo') {
        tempMasterPerformanceDraft.items.push({
          id: 'mpc-' + Date.now() + Math.random(),
          type: 'combo',
          name: '',
          comboTricks: ['', ''],
          category: 'OTHERS',
          family: 'Custom',
          basePoints: 6,
          completed: true
        });
      } else {
        tempMasterPerformanceDraft.items.push({
          id: 'mp-' + Date.now() + Math.random(),
          type: 'single',
          name: '',
          category: 'OTHERS',
          family: 'E',
          basePoints: 2,
          completed: true
        });
      }
      renderMasterPerformancePanel();
    }

    function removeMasterPerfItem(idx) {
      if (!tempMasterPerformanceDraft || !tempMasterPerformanceDraft.items[idx]) return;
      tempMasterPerformanceDraft.items.splice(idx, 1);
      renderMasterPerformancePanel();
    }

    function moveMasterPerfItem(idx, direction) {
      if (!tempMasterPerformanceDraft) return;
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= tempMasterPerformanceDraft.items.length) return;
      const temp = tempMasterPerformanceDraft.items[idx];
      tempMasterPerformanceDraft.items[idx] = tempMasterPerformanceDraft.items[targetIdx];
      tempMasterPerformanceDraft.items[targetIdx] = temp;
      renderMasterPerformancePanel();
    }

    function onMasterPerfSingleSearch(idx, query) {
      if (tempMasterPerformanceDraft && tempMasterPerformanceDraft.items[idx]) {
        tempMasterPerformanceDraft.items[idx].searchQuery = query || '';
      }
      const select = document.getElementById(`masterPerfSingleSelect_${idx}`);
      if (!select) return;

      const allTricks = getAllTricks();
      const currentSelected = (tempMasterPerformanceDraft && tempMasterPerformanceDraft.items[idx]) ? tempMasterPerformanceDraft.items[idx].name : '';

      const filtered = allTricks.filter(t => matchTrickKeywords(t.name || t.trickname, query));

      // Keep current selection option in list even if not matching search, so the browser doesn't auto-select the first match
      let optionsHtml = `<option value="" ${!currentSelected ? 'selected' : ''} disabled>-- Choose Trick --</option>`;
      
      if (currentSelected && !filtered.some(t => (t.name || t.trickname) === currentSelected)) {
        const selObj = allTricks.find(t => (t.name || t.trickname) === currentSelected) || { name: currentSelected, category: 'OTHERS', family: 'E' };
        optionsHtml += `<option value="${currentSelected}" selected>${currentSelected} (${selObj.category} - Fam ${selObj.family})</option>`;
      }

      optionsHtml += filtered.map(t => {
        const name = t.name || t.trickname;
        return `<option value="${name}" ${name === currentSelected ? 'selected' : ''}>${name} (${t.category} - Fam ${t.family})</option>`;
      }).join('');

      select.innerHTML = optionsHtml;
      select.value = currentSelected || '';
    }

    function onMasterPerfSingleChange(idx, trickName) {
      if (!tempMasterPerformanceDraft || !tempMasterPerformanceDraft.items[idx]) return;
      const allTricks = getAllTricks();
      const trickObj = allTricks.find(t => (t.name || t.trickname) === trickName);
      tempMasterPerformanceDraft.items[idx].name = trickName;
      if (trickObj) {
        tempMasterPerformanceDraft.items[idx].category = trickObj.category;
        tempMasterPerformanceDraft.items[idx].family = trickObj.family;
        tempMasterPerformanceDraft.items[idx].basePoints = PERFORMANCE_SCORING_CONFIG.basePointsByFamily[trickObj.family] || 2;
      }
      renderMasterPerformancePanel();
    }

    function addSubTrickToMasterCombo(perfItemIdx) {
      if (!tempMasterPerformanceDraft || !tempMasterPerformanceDraft.items[perfItemIdx]) return;
      const item = tempMasterPerformanceDraft.items[perfItemIdx];
      if (!item.comboTricks) item.comboTricks = [];
      item.comboTricks.push('');
      renderMasterPerformancePanel();
    }

    function removeSubTrickFromMasterCombo(perfItemIdx, subIdx) {
      if (!tempMasterPerformanceDraft || !tempMasterPerformanceDraft.items[perfItemIdx]) return;
      const item = tempMasterPerformanceDraft.items[perfItemIdx];
      if (!item.comboTricks || item.comboTricks.length <= 2) {
        showToast('A performance combo must contain at least two tricks.', 'warning');
        return;
      }
      item.comboTricks.splice(subIdx, 1);
      item.name = item.comboTricks.filter(Boolean).join(' → ');
      renderMasterPerformancePanel();
    }

    function moveSubTrickInMasterCombo(perfItemIdx, subIdx, direction) {
      if (!tempMasterPerformanceDraft || !tempMasterPerformanceDraft.items[perfItemIdx]) return;
      const item = tempMasterPerformanceDraft.items[perfItemIdx];
      const target = subIdx + direction;
      if (target < 0 || target >= item.comboTricks.length) return;
      const temp = item.comboTricks[subIdx];
      item.comboTricks[subIdx] = item.comboTricks[target];
      item.comboTricks[target] = temp;
      item.name = item.comboTricks.filter(Boolean).join(' → ');
      renderMasterPerformancePanel();
    }

    function onMasterComboSubTrickSearch(perfItemIdx, subIdx, query) {
      if (tempMasterPerformanceDraft && tempMasterPerformanceDraft.items[perfItemIdx]) {
        if (!tempMasterPerformanceDraft.items[perfItemIdx].subSearchQueries) {
          tempMasterPerformanceDraft.items[perfItemIdx].subSearchQueries = {};
        }
        tempMasterPerformanceDraft.items[perfItemIdx].subSearchQueries[subIdx] = query || '';
      }

      const select = document.getElementById(`masterComboSubSelect_${perfItemIdx}_${subIdx}`);
      if (!select) return;

      const allTricks = getAllTricks();
      const currentItem = tempMasterPerformanceDraft && tempMasterPerformanceDraft.items[perfItemIdx];
      const currentSelected = (currentItem && currentItem.comboTricks) ? currentItem.comboTricks[subIdx] : '';

      const filtered = allTricks.filter(t => matchTrickKeywords(t.name || t.trickname, query));

      let optionsHtml = `<option value="" ${!currentSelected ? 'selected' : ''} disabled>-- Choose Trick --</option>`;

      if (currentSelected && !filtered.some(t => (t.name || t.trickname) === currentSelected)) {
        const selObj = allTricks.find(t => (t.name || t.trickname) === currentSelected) || { name: currentSelected, category: 'OTHERS', family: 'E' };
        optionsHtml += `<option value="${currentSelected}" selected>${currentSelected} (${selObj.category} - Fam ${selObj.family})</option>`;
      }

      optionsHtml += filtered.map(t => {
        const name = t.name || t.trickname;
        return `<option value="${name}" ${name === currentSelected ? 'selected' : ''}>${name} (${t.category} - Fam ${t.family})</option>`;
      }).join('');

      select.innerHTML = optionsHtml;
      select.value = currentSelected || '';
    }

    function onMasterComboSubTrickChange(perfItemIdx, subIdx, trickName) {
      if (!tempMasterPerformanceDraft || !tempMasterPerformanceDraft.items[perfItemIdx]) return;
      const item = tempMasterPerformanceDraft.items[perfItemIdx];
      if (!item.comboTricks) item.comboTricks = [];
      item.comboTricks[subIdx] = trickName;
      item.name = item.comboTricks.filter(Boolean).join(' → ');
      renderMasterPerformancePanel();
    }

    function renderMasterPerformancePanel() {
      const container = document.getElementById('masterPerformancePanelContainer');
      if (!container || !appState.currentUser) return;

      const master = isMasterPerformanceEditing ? tempMasterPerformanceDraft : getMasterPerformance();
      const allTricks = getAllTricks();
      const hasItems = master && master.items && master.items.length > 0;
      const totalCount = hasItems ? master.items.length : 0;

      // EMPTY STATE
      if (!hasItems && !isMasterPerformanceEditing) {
        container.innerHTML = `
          <div class="glass-card perf-master-card" style="border-left:4px solid #fb7185;">
            <div class="perf-master-header">
              <div>
                <div class="card-title" style="margin-bottom:2px; color:#fb7185;">🎭 Master Performance Routine</div>
                <div class="label-caps">Saved 2-Minute Competition Program Configuration</div>
              </div>
              <span class="badge badge-warning">No Performance Set</span>
            </div>

            <div class="empty-state" style="padding:24px 16px;">
              <div class="empty-icon" style="font-size:2rem;">🎭</div>
              <div class="empty-text" style="margin-bottom:12px;">No Performance set yet. Create your saved 2-minute master routine here to automatically deploy in daily training logs.</div>
              <button type="button" class="btn btn-secondary btn-sm" onclick="enterMasterPerformanceEditMode()" style="border-color:#fb7185; color:#fb7185; margin:0 auto; max-width:200px;">
                + Add Performance
              </button>
            </div>
          </div>
        `;
        return;
      }

      // LOCKED READ-ONLY VIEW
      if (!isMasterPerformanceEditing) {
        container.innerHTML = `
          <div class="glass-card perf-master-card" style="border-left:4px solid #fb7185;">
            <div class="perf-master-header">
              <div>
                <div class="card-title" style="margin-bottom:2px; color:#fb7185;">🎭 Master Performance Routine</div>
                <div class="label-caps">Saved 2-Minute Program (Locked / Read-Only)</div>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="badge ${totalCount >= 9 ? 'badge-combo' : 'badge-warning'}">
                  ${totalCount} / 9 Configured Tricks ${totalCount >= 9 ? '✓' : ''}
                </span>
                <button type="button" class="btn btn-secondary btn-sm" onclick="enterMasterPerformanceEditMode()" style="border-color:#fb7185; color:#fb7185;">
                  ✏️ Edit Performance
                </button>
              </div>
            </div>

            <p style="font-size:0.8125rem; color:var(--on-surface-muted); margin-bottom:14px;">
              This is your saved master configuration. When you log a training session, you will get a session-specific copy that you can adapt without affecting this master setup.
            </p>

            <div class="perf-master-locked-list">
              ${master.items.map((item, idx) => {
                const isCombo = item.type === 'combo';
                return `
                  <div class="perf-master-locked-row">
                    <span style="font-family:var(--font-mono); font-size:0.75rem; font-weight:700; width:28px; color:var(--primary);">#${idx + 1}</span>
                    <span class="badge ${isCombo ? 'badge-combo' : 'badge-family'}" style="font-size:0.65rem;">${isCombo ? 'Combo' : 'Trick'}</span>
                    <div style="flex:1; font-size:0.875rem; font-weight:600; color:var(--on-surface);">
                      ${item.name || 'Untitled Component'}
                    </div>
                    <span class="label-caps" style="font-size:0.65rem;">${item.category || 'OTHERS'}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
        return;
      }

      // ACTIVE EDITING STATE WITH FULL COMBO BUILDER
      container.innerHTML = `
        <div class="glass-card perf-master-card" style="border-left:4px solid #fb7185;">
          <div class="perf-master-header">
            <div>
              <div class="card-title" style="margin-bottom:2px; color:#fb7185;">🎭 Editing Master Performance</div>
              <div class="label-caps" style="color:#fb7185;">Edit Mode Active • Unsaved Changes</div>
            </div>
            <div style="display:flex; gap:8px;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="cancelMasterPerformanceEditMode()">Cancel</button>
              <button type="button" class="btn btn-sm" onclick="saveAndUpdateMasterPerformance()" style="background:#fb7185; color:#111416;">Save &amp; Update</button>
            </div>
          </div>

          <div id="masterPerfItemsList" style="margin-top:12px;">
            ${master.items.length === 0 ? `
              <div class="empty-state" style="padding:16px 0;">
                <div class="empty-text">No tricks added yet. Use the buttons below to add tricks or combos.</div>
              </div>
            ` : master.items.map((item, idx) => {
              const isCombo = item.type === 'combo';
              const isCollapsed = !!item.isCollapsed;
              const displayName = isCombo ? (item.name || 'Combo Sequence') : (item.name || 'Individual Trick');

              if (!isCombo) {
                const sQuery = item.searchQuery || '';
                const filtered = allTricks.filter(t => matchTrickKeywords(t.name || t.trickname, sQuery));
                const hasMatch = filtered.some(t => (t.name || t.trickname) === item.name);

                return `
                  <div class="perf-master-row ${isCollapsed ? 'is-collapsed' : ''}">
                    <div class="perf-master-item-head" onclick="toggleMasterPerfItemCollapse(${idx})">
                      <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
                        <span class="collapse-arrow">${isCollapsed ? '▶' : '▼'}</span>
                        <div class="perf-order-controls" onclick="event.stopPropagation()">
                          <button type="button" class="btn-icon-tiny" onclick="moveMasterPerfItem(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} title="Move Up">▲</button>
                          <button type="button" class="btn-icon-tiny" onclick="moveMasterPerfItem(${idx}, 1)" ${idx === master.items.length - 1 ? 'disabled' : ''} title="Move Down">▼</button>
                        </div>
                        <span style="font-family:var(--font-mono); font-size:0.75rem; font-weight:700;">#${idx + 1}</span>
                        <span class="badge badge-family" style="font-size:0.65rem;">Trick</span>
                        <span class="collapsed-item-preview" title="${displayName}">${displayName}</span>
                      </div>
                      <button type="button" onclick="event.stopPropagation(); removeMasterPerfItem(${idx})" class="btn-icon-danger" title="Remove Trick">✕ Remove</button>
                    </div>

                    ${!isCollapsed ? `
                      <div class="perf-slot-controls-wrap" style="margin-top:8px;">
                        <div class="perf-search-input-wrap">
                          <span class="perf-search-icon">🔍</span>
                          <input type="text" class="perf-search-input" placeholder="Search trick (e.g. Christie)..." value="${sQuery}" oninput="onMasterPerfSingleSearch(${idx}, this.value)">
                        </div>
                        <select id="masterPerfSingleSelect_${idx}" class="perf-select" onchange="onMasterPerfSingleChange(${idx}, this.value)">
                          <option value="" disabled ${!item.name ? 'selected' : ''}>-- Choose Trick --</option>
                          ${item.name && !hasMatch ? `<option value="${item.name}" selected>${item.name} (${item.category} - Fam ${item.family})</option>` : ''}
                          ${filtered.map(t => {
                            const name = t.name || t.trickname;
                            return `<option value="${name}" ${name === item.name ? 'selected' : ''}>${name} (${t.category} - Fam ${t.family})</option>`;
                          }).join('')}
                        </select>
                      </div>
                    ` : ''}
                  </div>
                `;
              }

              // PERFORMANCE COMBO BUILDER CARD (COLLAPSIBLE)
              const comboTricks = item.comboTricks || (item.name ? item.name.split(' → ') : ['', '']);
              return `
                <div class="perf-master-combo-card ${isCollapsed ? 'is-collapsed' : ''}">
                  <div class="perf-master-combo-header" onclick="toggleMasterPerfItemCollapse(${idx})">
                    <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
                      <span class="collapse-arrow">${isCollapsed ? '▶' : '▼'}</span>
                      <div class="perf-order-controls" onclick="event.stopPropagation()">
                        <button type="button" class="btn-icon-tiny" onclick="moveMasterPerfItem(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} title="Move Up">▲</button>
                        <button type="button" class="btn-icon-tiny" onclick="moveMasterPerfItem(${idx}, 1)" ${idx === master.items.length - 1 ? 'disabled' : ''} title="Move Down">▼</button>
                      </div>
                      <span style="font-family:var(--font-mono); font-size:0.75rem; font-weight:700;">#${idx + 1}</span>
                      <span class="badge badge-combo" style="font-size:0.65rem;">Combo (${comboTricks.filter(Boolean).length} tricks)</span>
                      <span class="collapsed-item-preview" title="${displayName}">${displayName}</span>
                    </div>
                    <button type="button" onclick="event.stopPropagation(); removeMasterPerfItem(${idx})" class="btn-icon-danger">✕ Remove</button>
                  </div>

                  ${!isCollapsed ? `
                    <div class="perf-combo-subtricks-list" style="margin-top:8px;">
                      ${comboTricks.map((subName, sIdx) => {
                        const subQuery = (item.subSearchQueries && item.subSearchQueries[sIdx]) || '';
                        const filtered = allTricks.filter(t => matchTrickKeywords(t.name || t.trickname, subQuery));
                        const hasMatch = filtered.some(t => (t.name || t.trickname) === subName);

                        return `
                          <div class="perf-combo-subtrick-row">
                            <div class="perf-order-controls">
                              <button type="button" class="btn-icon-tiny" onclick="moveSubTrickInMasterCombo(${idx}, ${sIdx}, -1)" ${sIdx === 0 ? 'disabled' : ''} title="Move Up">▲</button>
                              <button type="button" class="btn-icon-tiny" onclick="moveSubTrickInMasterCombo(${idx}, ${sIdx}, 1)" ${sIdx === comboTricks.length - 1 ? 'disabled' : ''} title="Move Down">▼</button>
                            </div>
                            <span style="font-family:var(--font-mono); font-size:0.7rem; color:var(--on-surface-muted); width:18px; flex-shrink:0;">${sIdx + 1}.</span>
                            <div class="perf-slot-controls-wrap">
                              <div class="perf-search-input-wrap">
                                <span class="perf-search-icon">🔍</span>
                                <input type="text" class="perf-search-input" placeholder="Search combo trick (e.g. Christie)..." value="${subQuery}" oninput="onMasterComboSubTrickSearch(${idx}, ${sIdx}, this.value)">
                              </div>
                              <select id="masterComboSubSelect_${idx}_${sIdx}" class="perf-select" onchange="onMasterComboSubTrickChange(${idx}, ${sIdx}, this.value)">
                                <option value="" disabled ${!subName ? 'selected' : ''}>-- Choose Trick --</option>
                                ${subName && !hasMatch ? `<option value="${subName}" selected>${subName}</option>` : ''}
                                ${filtered.map(t => {
                                  const name = t.name || t.trickname;
                                  return `<option value="${name}" ${name === subName ? 'selected' : ''}>${name} (${t.category} - Fam ${t.family})</option>`;
                                }).join('')}
                              </select>
                            </div>
                            ${comboTricks.length > 2 ? `<button type="button" onclick="removeSubTrickFromMasterCombo(${idx}, ${sIdx})" class="btn-icon-danger" style="font-size:0.75rem; flex-shrink:0;">✕</button>` : ''}
                          </div>
                        `;
                      }).join('')}
                    </div>

                    <button type="button" class="btn btn-secondary btn-sm" onclick="addSubTrickToMasterCombo(${idx})" style="font-size:0.6875rem; padding:4px 10px; margin-top:6px;">
                      + Add Trick to Combo
                    </button>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>

          <div style="display:flex; gap:10px; margin-top:14px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="addMasterPerfTrick('single')">+ Add Trick</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="addMasterPerfTrick('combo')">+ Add Combo</button>
          </div>
        </div>
      `;
    }

    window.enterMasterPerformanceEditMode = enterMasterPerformanceEditMode;
    window.cancelMasterPerformanceEditMode = cancelMasterPerformanceEditMode;
    window.saveAndUpdateMasterPerformance = saveAndUpdateMasterPerformance;
    window.addSubTrickToMasterCombo = addSubTrickToMasterCombo;
    window.removeSubTrickFromMasterCombo = removeSubTrickFromMasterCombo;
    window.moveSubTrickInMasterCombo = moveSubTrickInMasterCombo;
    window.onMasterComboSubTrickChange = onMasterComboSubTrickChange;
    window.onMasterPerfSingleChange = onMasterPerfSingleChange;
    window.onMasterPerfSingleSearch = onMasterPerfSingleSearch;
    window.onMasterComboSubTrickSearch = onMasterComboSubTrickSearch;
    window.getMasterPerformance = getMasterPerformance;
    window.saveMasterPerformance = saveMasterPerformance;
    window.addMasterPerfTrick = addMasterPerfTrick;
    window.removeMasterPerfItem = removeMasterPerfItem;
    window.moveMasterPerfItem = moveMasterPerfItem;
    window.renderMasterPerformancePanel = renderMasterPerformancePanel;

    window.getMasterPerformance = getMasterPerformance;
    window.saveMasterPerformance = saveMasterPerformance;
    window.addMasterPerfTrick = addMasterPerfTrick;
    window.removeMasterPerfItem = removeMasterPerfItem;
    window.moveMasterPerfItem = moveMasterPerfItem;
    window.onMasterPerfItemChange = onMasterPerfItemChange;
    window.renderMasterPerformancePanel = renderMasterPerformancePanel;

    function renderCustomTricksList() {
      const container = document.getElementById('customTricksList');
      if (!container || !appState.currentUser) return;

      if (!appState.customTricks) {
        container.innerHTML = `
          <div class="skeleton skeleton-text" style="height:36px; margin-bottom:8px;"></div>
          <div class="skeleton skeleton-text" style="height:36px;"></div>
        `;
        return;
      }

      const userCustom = appState.customTricks.filter(t => 
        String(t.skaterName || t.skatername).toLowerCase() === String(appState.currentUser.skaterName).toLowerCase()
      );

      renderMasterPerformancePanel();

      if (userCustom.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">💡</div><div class="empty-text">No custom tricks created yet. Use the form above to add personal tricks.</div></div>`;
        return;
      }

      container.innerHTML = userCustom.map(t => {
        const id = t.id || t.trickid;
        return `
          <div style="padding:12px 0; border-bottom:1px solid var(--border-razor); display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="font-size:0.875rem;">${t.name || t.trickname}</strong>
              <div style="font-size:0.75rem; color:var(--on-surface-muted); margin-top:2px;">${t.category} • Family ${t.family}</div>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge badge-custom">Custom</span>
              <button class="btn btn-secondary btn-sm" onclick="openEditCustomModal('${id}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="openDeleteConfirmModal('${id}')">Delete</button>
            </div>
          </div>
        `;
      }).join('');
    }
