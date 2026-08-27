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

      if (!newName) return false;

      const targetIndex = appState.customTricks.findIndex(t => (t.id === trickId || t.trickid === trickId));
      if (targetIndex !== -1) {
        appState.customTricks[targetIndex].name = newName;
        appState.customTricks[targetIndex].trickname = newName;
        appState.customTricks[targetIndex].category = newCategory;
      }

      if (APPS_SCRIPT_URL && APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_WEB_APP_URL") {
        try {
          fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              action: 'editCustomTrick',
              payload: { id: trickId, trickName: newName, category: newCategory, skaterName: appState.currentUser.skaterName }
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
    function getMasterPerformance() {
      if (!appState.currentUser) {
        return { title: 'Master Performance', items: [], smoothness: 0, footwork: 0 };
      }
      const userKey = (appState.currentUser.skaterName || appState.currentUser.username || '').toLowerCase();
      if (!appState.masterPerformances[userKey]) {
        try {
          const stored = localStorage.getItem(`rollsync_master_perf_${userKey}`);
          if (stored) {
            appState.masterPerformances[userKey] = JSON.parse(stored);
          } else {
            appState.masterPerformances[userKey] = {
              title: '2-Minute Performance Routine',
              items: [],
              smoothness: 0,
              footwork: 0
            };
          }
        } catch(e) {
          appState.masterPerformances[userKey] = { title: '2-Minute Performance Routine', items: [], smoothness: 0, footwork: 0 };
        }
      }
      return appState.masterPerformances[userKey];
    }

    function saveMasterPerformance(perfObj) {
      if (!appState.currentUser) return;
      const userKey = (appState.currentUser.skaterName || appState.currentUser.username || '').toLowerCase();
      appState.masterPerformances[userKey] = perfObj;
      try {
        localStorage.setItem(`rollsync_master_perf_${userKey}`, JSON.stringify(perfObj));
      } catch(e) { console.error('LocalStorage error saving performance:', e); }

      if (APPS_SCRIPT_URL && APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_WEB_APP_URL") {
        try {
          fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
              action: 'saveMasterPerformance',
              payload: {
                skaterName: appState.currentUser.skaterName,
                masterPerformance: perfObj
              }
            })
          });
        } catch(err) { console.error('API master performance error:', err); }
      }
    }

    function addMasterPerfTrick(type) {
      const master = getMasterPerformance();
      const allTricks = getAllTricks();
      const defaultTrick = allTricks[0] || { name: 'Butterfly', category: 'OTHERS', family: 'B' };

      if (type === 'combo') {
        master.items.push({
          id: 'mp-' + Date.now(),
          type: 'combo',
          name: 'New Combo Sequence',
          category: 'OTHERS',
          family: 'Custom',
          basePoints: 8,
          completed: true
        });
      } else {
        master.items.push({
          id: 'mp-' + Date.now(),
          type: 'single',
          name: defaultTrick.name || defaultTrick.trickname,
          category: defaultTrick.category,
          family: defaultTrick.family,
          basePoints: PERFORMANCE_SCORING_CONFIG.basePointsByFamily[defaultTrick.family] || 2,
          completed: true
        });
      }
      saveMasterPerformance(master);
      renderMasterPerformancePanel();
    }

    function removeMasterPerfItem(idx) {
      const master = getMasterPerformance();
      master.items.splice(idx, 1);
      saveMasterPerformance(master);
      renderMasterPerformancePanel();
    }

    function moveMasterPerfItem(idx, direction) {
      const master = getMasterPerformance();
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= master.items.length) return;
      const temp = master.items[idx];
      master.items[idx] = master.items[targetIdx];
      master.items[targetIdx] = temp;
      saveMasterPerformance(master);
      renderMasterPerformancePanel();
    }

    function onMasterPerfItemChange(idx, field, value) {
      const master = getMasterPerformance();
      if (!master.items[idx]) return;

      if (field === 'name') {
        const allTricks = getAllTricks();
        const trickObj = allTricks.find(t => (t.name || t.trickname) === value);
        master.items[idx].name = value;
        if (trickObj) {
          master.items[idx].category = trickObj.category;
          master.items[idx].family = trickObj.family;
          master.items[idx].basePoints = PERFORMANCE_SCORING_CONFIG.basePointsByFamily[trickObj.family] || 2;
        }
      } else {
        master.items[idx][field] = value;
      }
      saveMasterPerformance(master);
      renderMasterPerformancePanel();
    }

    function renderMasterPerformancePanel() {
      const container = document.getElementById('masterPerformancePanelContainer');
      if (!container || !appState.currentUser) return;

      const master = getMasterPerformance();
      const allTricks = getAllTricks();
      const scoreData = PERFORMANCE_SCORING_CONFIG.calculatePerformanceScore(master);

      container.innerHTML = `
        <div class="glass-card" style="border-left:4px solid #fb7185;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div>
              <div class="card-title" style="margin-bottom:2px; color:#fb7185;">🎭 Master Performance Routine</div>
              <div class="label-caps">Saved 2-Minute Competition Program Configuration</div>
            </div>
            <span class="badge ${scoreData.totalItems >= 9 ? 'badge-combo' : 'badge-warning'}">
              ${scoreData.totalItems} / 9 Configured Tricks
            </span>
          </div>

          <p style="font-size:0.8125rem; color:var(--on-surface-muted); margin-bottom:14px;">
            Configure your master routine once. When logging daily training, you will get a session-specific copy that you can adapt without affecting this master setup.
          </p>

          <div id="masterPerfItemsList">
            ${master.items.length === 0 ? `
              <div class="empty-state" style="padding:16px 0;">
                <div class="empty-text">No tricks configured in master performance routine. Add tricks below.</div>
              </div>
            ` : master.items.map((item, idx) => `
              <div class="perf-master-row">
                <div class="perf-order-controls">
                  <button type="button" class="btn-icon-tiny" onclick="moveMasterPerfItem(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} title="Move Up">▲</button>
                  <button type="button" class="btn-icon-tiny" onclick="moveMasterPerfItem(${idx}, 1)" ${idx === master.items.length - 1 ? 'disabled' : ''} title="Move Down">▼</button>
                </div>
                <div style="font-family:var(--font-mono); font-size:0.75rem; font-weight:700; width:28px;">#${idx + 1}</div>
                <div style="flex:1; min-width:0;">
                  <select style="font-size:0.8125rem; padding:6px 10px;" onchange="onMasterPerfItemChange(${idx}, 'name', this.value)">
                    ${allTricks.map(t => {
                      const name = t.name || t.trickname;
                      return `<option value="${name}" ${name === item.name ? 'selected' : ''}>${name} (${t.category} - Fam ${t.family})</option>`;
                    }).join('')}
                  </select>
                </div>
                <span class="badge badge-family" style="font-size:0.65rem;">Fam ${item.family || 'E'}</span>
                <button type="button" onclick="removeMasterPerfItem(${idx})" class="btn-icon-danger" title="Remove Trick">✕</button>
              </div>
            `).join('')}
          </div>

          <div style="display:flex; gap:10px; margin-top:14px;">
            <button type="button" class="btn btn-secondary btn-sm" onclick="addMasterPerfTrick('single')">+ Add Performance Trick</button>
            <button type="button" class="btn btn-secondary btn-sm" onclick="addMasterPerfTrick('combo')">+ Add Performance Combo</button>
          </div>
        </div>
      `;
    }

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
