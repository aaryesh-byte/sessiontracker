// Custom trick functionality.


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


    function renderCustomTricksList() {
      const container = document.getElementById('customTricksList');
      if (!container || !appState.currentUser) return;

      const userCustom = appState.customTricks.filter(t => 
        String(t.skaterName || t.skatername).toLowerCase() === String(appState.currentUser.skaterName).toLowerCase()
      );

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
