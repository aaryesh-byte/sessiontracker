// Combo calculator functionality.


    function addCalcSlot() {
      appState.calcSlots.push({ categoryFilter: 'ALL', familyFilter: 'ALL', selectedTrick: '', searchFilter: '' });
      renderCalcSlots();
    }


    function removeCalcSlot(idx) {
      appState.calcSlots.splice(idx, 1);
      renderCalcSlots();
    }


    function renderCalcSlots() {
      const container = document.getElementById('calcSlotsContainer');
      if (!container) return;

      const allTricks = getAllTricks();

      if (appState.calcSlots.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding:16px 0;"><div class="empty-text">Select a trick to build your combo.</div></div>`;
        updateComboCalculator();
        return;
      }

      container.innerHTML = appState.calcSlots.map((slot, idx) => {
        const filteredTricks = allTricks.filter(t => {
          const matchCat = (slot.categoryFilter === 'ALL' || t.category === slot.categoryFilter);
          const matchFam = (slot.familyFilter === 'ALL' || t.family === slot.familyFilter);
          return matchCat && matchFam && matchTrickKeywords(t.name || t.trickname, slot.searchFilter);
        });

        const hasSlotMatch = filteredTricks.some(t => (t.name || t.trickname) === slot.selectedTrick);

        return `
          <div class="session-item-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
              <span class="badge badge-family">Trick Slot #${idx + 1}</span>
              <button type="button" onclick="removeCalcSlot(${idx})" style="background:rgba(239, 68, 68, 0.15); border:1px solid rgba(239, 68, 68, 0.3); color:#f87171; padding:2px 8px; border-radius:var(--radius-pill); font-weight:700; font-size:0.7rem; cursor:pointer;">✕ Remove</button>
            </div>

            <div class="row-2" style="margin-bottom:8px;">
              <div class="form-group" style="margin-bottom:0;">
                <label>Category Filter</label>
                <select style="font-size:0.8rem; padding:8px;" onchange="appState.calcSlots[${idx}].categoryFilter = this.value; renderCalcSlots();">
                  <option value="ALL" ${slot.categoryFilter === 'ALL' ? 'selected' : ''}>All Categories</option>
                  <option value="OTHERS" ${slot.categoryFilter === 'OTHERS' ? 'selected' : ''}>Others</option>
                  <option value="SITTING" ${slot.categoryFilter === 'SITTING' ? 'selected' : ''}>Sitting</option>
                  <option value="JUMPING" ${slot.categoryFilter === 'JUMPING' ? 'selected' : ''}>Jumping</option>
                  <option value="WHEELING" ${slot.categoryFilter === 'WHEELING' ? 'selected' : ''}>Wheeling</option>
                  <option value="SPINNING" ${slot.categoryFilter === 'SPINNING' ? 'selected' : ''}>Spinning</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label>Family Filter</label>
                <select style="font-size:0.8rem; padding:8px;" onchange="appState.calcSlots[${idx}].familyFilter = this.value; renderCalcSlots();">
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
              <label>Select Trick for Slot #${idx + 1}</label>
              <div class="search-bar-wrap">
                <span class="search-icon">🔍</span>
                <input type="text" class="search-input" placeholder="Search trick in slot..." value="${slot.searchFilter || ''}" oninput="onCalcSlotSearchInput(${idx}, this.value)">
              </div>
              <select id="calcTrickSelect_${idx}" onchange="appState.calcSlots[${idx}].selectedTrick = this.value; updateComboCalculator();">
                <option value="" ${!slot.selectedTrick ? 'selected' : ''} disabled>-- Choose Trick --</option>
                ${slot.selectedTrick && !hasSlotMatch ? `<option value="${slot.selectedTrick}" selected>${slot.selectedTrick}</option>` : ''}
                ${filteredTricks.map(t => {
                  const name = t.name || t.trickname;
                  return `<option value="${name}" ${name === slot.selectedTrick ? 'selected' : ''}>${name} (${t.category} - Fam ${t.family})</option>`;
                }).join('')}
              </select>
            </div>
          </div>
        `;
      }).join('');

      updateComboCalculator();
    }


    function onCalcSlotSearchInput(idx, value) {
      const slot = appState.calcSlots[idx];
      if (!slot) return;

      slot.searchFilter = value || '';
      const select = document.getElementById(`calcTrickSelect_${idx}`);
      if (!select) return;

      const allTricks = getAllTricks();
      const filteredTricks = allTricks.filter(t => {
        const matchCat = (slot.categoryFilter === 'ALL' || t.category === slot.categoryFilter);
        const matchFam = (slot.familyFilter === 'ALL' || t.family === slot.familyFilter);
        return matchCat && matchFam && matchTrickKeywords(t.name || t.trickname, value);
      });

      let optionsHtml = `<option value="" ${!slot.selectedTrick ? 'selected' : ''} disabled>-- Choose Trick --</option>`;

      if (slot.selectedTrick && !filteredTricks.some(t => (t.name || t.trickname) === slot.selectedTrick)) {
        optionsHtml += `<option value="${slot.selectedTrick}" selected>${slot.selectedTrick}</option>`;
      }

      optionsHtml += filteredTricks.map(t => {
        const name = t.name || t.trickname;
        return `<option value="${name}" ${name === slot.selectedTrick ? 'selected' : ''}>${name} (${t.category} - Fam ${t.family})</option>`;
      }).join('');

      select.innerHTML = optionsHtml;
      select.value = slot.selectedTrick || '';
    }


    function updateComboCalculator() {
      const allTricks = getAllTricks();
      const validSlots = appState.calcSlots.filter(s => s && s.selectedTrick && s.selectedTrick.trim() !== '');

      if (validSlots.length === 0) {
        safeSetTextContent('calcScoreRange', '0 – 0 Points');
        safeSetInnerHTML('aiRecommendationsContainer', `
          <div class="empty-state" style="padding:16px 0;">
            <div class="empty-text">Select a trick to build your combo.</div>
          </div>
        `);
        return;
      }

      let minScore = 0;
      let maxScore = 0;

      const selectedObjects = validSlots.map(slot => {
        return allTricks.find(t => (t.name || t.trickname) === slot.selectedTrick) || { name: slot.selectedTrick, family: 'E', category: 'OTHERS' };
      });

      selectedObjects.forEach(t => {
        const pts = FAMILY_POINTS[t.family] || FAMILY_POINTS['E'];
        minScore += pts.min;
        maxScore += pts.max;
      });

      safeSetTextContent('calcScoreRange', `${minScore} – ${maxScore} Potential Points`);

      generateAIRecommendations(selectedObjects, minScore, maxScore);
    }


    function generateAIRecommendations(tricks, currentMin, currentMax) {
      const allTricks = getAllTricks();

      const targetUpgradeIdx = tricks.findIndex(t => t.family === 'E' || t.family === 'D');

      if (targetUpgradeIdx === -1) {
        safeSetInnerHTML('aiRecommendationsContainer', `
          <div style="padding:14px; background:var(--bg-container); border-radius:var(--radius-md); border:1px solid var(--border-razor);">
            <div style="font-size:0.875rem; font-weight:800; color:var(--primary);">High Technical Balance</div>
            <div style="font-size:0.8125rem; color:var(--on-surface-muted); margin-top:4px;">
              Your sequence incorporates high-tier matrix difficulty (Family A/B/C) with strong technical progression.
            </div>
          </div>
        `);
        return;
      }

      const targetTrick = tricks[targetUpgradeIdx];
      const upgradeCandidates = allTricks.filter(t => t.category === targetTrick.category && (t.family === 'C' || t.family === 'B' || t.family === 'A'));

      if (upgradeCandidates.length === 0) {
        safeSetInnerHTML('aiRecommendationsContainer', `
          <div style="padding:14px; background:var(--bg-container); border-radius:var(--radius-md); border:1px solid var(--border-razor);">
            <div style="font-size:0.875rem; font-weight:800; color:var(--primary);">Solid Combo Base</div>
          </div>
        `);
        return;
      }

      const recommendedUpgrade = upgradeCandidates[0];
      const recPts = FAMILY_POINTS[recommendedUpgrade.family];
      const origPts = FAMILY_POINTS[targetTrick.family];

      const newMin = currentMin - origPts.min + recPts.min;
      const newMax = currentMax - origPts.max + recPts.max;

      safeSetInnerHTML('aiRecommendationsContainer', `
        <div style="padding:14px; background:var(--bg-container); border-radius:var(--radius-md); border:1px solid var(--border-razor);">
          <div class="label-caps" style="color:var(--primary);">Suggested Progression Upgrade</div>
          <div style="font-size:0.875rem; margin-top:4px;">
            Replace <span style="text-decoration:line-through; color:var(--on-surface-muted);">${targetTrick.name || targetTrick.trickname}</span> (Fam ${targetTrick.family}) with <strong>${recommendedUpgrade.name || recommendedUpgrade.trickname}</strong> (Fam ${recommendedUpgrade.family})
          </div>
          <div style="font-size:0.8125rem; font-weight:700; color:var(--primary); margin-top:8px;">
            Potential Upgraded Range: ${newMin} – ${newMax} Points (+${recPts.min - origPts.min} pts)
          </div>
        </div>
      `);
    }
