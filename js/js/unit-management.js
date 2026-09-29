document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('unit-table-body');
  const filterLotInput = document.getElementById('filter-lot');
  const filterBlockInput = document.getElementById('filter-block');
  const searchBtn = document.getElementById('search-btn');
  const clearBtn = document.getElementById('clear-btn');
  const selectAllCheckbox = document.getElementById('select-all');
  const deleteSelectedUnitBtn = document.getElementById('delete-selected-unit-btn');

  // Modal 相關 DOM
  const detailModalOverlay = document.getElementById('unit-detail-modal-overlay');
  const closeDetailBtn = document.getElementById('unit-modal-close-btn');
  const addressTitle = document.getElementById('unit-modal-title') || document.getElementById('unit-detail-address');
  const unitHomeownerList = document.getElementById('unit-homeowner-list');
  const unitBillingList = document.getElementById('unit-billing-list');

  // 當前彈窗檢視的戶主資料快取
  let currentViewingHomeowner = null;
  let isSelectingAll = false;

  const updateBulkDeleteButton = () => {
    if (deleteSelectedUnitBtn) {
      deleteSelectedUnitBtn.hidden = !tableBody.querySelector('.row-checkbox:checked');
    }
  };

  const normalizeText = (value) => String(value ?? '').trim().toLowerCase();

  const getHomeowners = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('casa-milan-homeowners') || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  };

  const saveAllHomeowners = (homeowners) => {
    localStorage.setItem('casa-milan-homeowners', JSON.stringify(homeowners));
    renderUnitRecords();
  };

  const rebuildDerivedRecordsFromHomeowners = () => {
    const homeowners = getHomeowners();
    const createAccountRecords = homeowners.map((homeowner) => ({
      blockNo: homeowner.blockNo,
      lotNo: homeowner.lotNo,
      address: homeowner.address,
      firstName: homeowner.firstName,
      middleName: homeowner.middleName,
      lastName: homeowner.lastName,
      email: homeowner.email,
      contactNumber: homeowner.contactNumber,
      createdAt: homeowner.createdAt || new Date().toISOString(),
      role: homeowner.role || 'Representative',
      ownershipStatus: homeowner.ownershipStatus,
      accountStatus: homeowner.accountStatus || 'Pending'
    }));

    const credentialRecords = homeowners.map((homeowner) => ({
      blockNo: homeowner.blockNo,
      lotNo: homeowner.lotNo,
      address: homeowner.address,
      firstName: homeowner.firstName,
      middleName: homeowner.middleName,
      lastName: homeowner.lastName,
      email: homeowner.email,
      contactNumber: homeowner.contactNumber,
      createdAt: homeowner.createdAt || new Date().toISOString(),
      role: homeowner.role || 'Representative',
      credentialStatus: homeowner.credentialStatus || 'Pending'
    }));

    const unitRecords = homeowners.map((homeowner) => ({
      blockNo: homeowner.blockNo,
      lotNo: homeowner.lotNo,
      address: homeowner.address,
      firstName: homeowner.firstName,
      middleName: homeowner.middleName,
      lastName: homeowner.lastName,
      outstandingBalance: homeowner.outstandingBalance ?? '0',
      ownershipStatus: homeowner.ownershipStatus
    }));

    localStorage.setItem('casa-milan-create-account-records', JSON.stringify(createAccountRecords));
    localStorage.setItem('casa-milan-account-credential-records', JSON.stringify(credentialRecords));
    localStorage.setItem('casa-milan-unit-records', JSON.stringify(unitRecords));
  };

  const removeDerivedHomeownerRecord = (entry) => {
    const storageKeys = [
      'casa-milan-create-account-records',
      'casa-milan-account-credential-records',
      'casa-milan-account-credential-pending',
      'casa-milan-unit-records'
    ];
    const matchesEntry = (record) =>
      (record.blockNo || '') === (entry.blockNo || '') &&
      (record.lotNo || '') === (entry.lotNo || '');

    storageKeys.forEach((storageKey) => {
      let records = [];
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
        records = Array.isArray(saved) ? saved : [];
      } catch {
        records = [];
      }
      localStorage.setItem(storageKey, JSON.stringify(records.filter((record) => !matchesEntry(record))));
    });
  };

  const deleteHomeownerRecord = (entry) => {
    const homeowners = getHomeowners();
    const nextHomeowners = homeowners.filter((homeowner) => {
      const sameBlock = (homeowner.blockNo || '') === (entry.blockNo || '');
      const sameLot = (homeowner.lotNo || '') === (entry.lotNo || '');
      const sameName = !entry.firstName ||
        (homeowner.firstName || '').toLowerCase() === (entry.firstName || '').toLowerCase();
      return !(sameBlock && sameLot && sameName);
    });

    saveAllHomeowners(nextHomeowners);
    removeDerivedHomeownerRecord(entry);
    renderUnitRecords();
  };

  const bindRowEvents = (row, detailRows) => {
    const rows = Array.isArray(detailRows) ? detailRows : detailRows ? [detailRows] : [];
    const checkbox = row.querySelector('.row-checkbox');
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        row.classList.toggle('selected', checkbox.checked);
        rows.forEach((detailRow) => {
          detailRow.hidden = !checkbox.checked;
        });
        if (selectAllCheckbox && !isSelectingAll) {
          const rowCheckboxes = tableBody.querySelectorAll('.row-checkbox');
          const checkedCount = tableBody.querySelectorAll('.row-checkbox:checked').length;
          selectAllCheckbox.checked = rowCheckboxes.length > 0 && checkedCount === rowCheckboxes.length;
        }
        updateBulkDeleteButton();
      });
    }
  };

  if (selectAllCheckbox) {
    selectAllCheckbox.onchange = () => {
      const shouldSelect = selectAllCheckbox.checked;
      isSelectingAll = true;
      tableBody.querySelectorAll('.row-checkbox').forEach((checkbox) => {
        checkbox.checked = shouldSelect;
        checkbox.dispatchEvent(new Event('change'));
      });
      isSelectingAll = false;
      selectAllCheckbox.checked = shouldSelect;
      updateBulkDeleteButton();
    };
  }

  if (deleteSelectedUnitBtn) {
    deleteSelectedUnitBtn.addEventListener('click', () => {
      const selectedIndexes = [...tableBody.querySelectorAll('.row-checkbox:checked')]
        .map((checkbox) => Number(checkbox.closest('tr')?.dataset.index))
        .filter((index) => Number.isInteger(index));
      if (selectedIndexes.length === 0) return;
      if (!window.confirm('Are you sure you want to delete the selected property data?')) return;

      const entries = JSON.parse(localStorage.getItem('casa-milan-unit-records') || '[]');
      selectedIndexes
        .map((index) => entries[index])
        .filter(Boolean)
        .forEach((entry) => deleteHomeownerRecord(entry));
      updateBulkDeleteButton();
      renderUnitRecords();
    });
  }

  // 動態渲染 Unit Detail Modal 內部資料
  const populateUnitModal = (matchedHomeowner) => {
    if (!matchedHomeowner) return;
    currentViewingHomeowner = matchedHomeowner;

    // 1. 設定彈窗頂部地址
    if (addressTitle) {
      addressTitle.textContent = matchedHomeowner.address || `Block ${matchedHomeowner.blockNo} Lot ${matchedHomeowner.lotNo}`;
    }

    // 2. 整合該單位成員清單（戶主 + 家庭成員）
    if (unitHomeownerList) {
      const rows = [];

      // 戶主 (Representative)
      const repName = [matchedHomeowner.firstName, matchedHomeowner.middleName, matchedHomeowner.lastName]
        .filter(Boolean)
        .join(' ');

      if (repName) {
        rows.push(`
          <tr data-type="representative">
            <td class="col-name">${repName}</td>
            <td class="col-email">${matchedHomeowner.email ? `<a href="mailto:${matchedHomeowner.email}" class="link-email">${matchedHomeowner.email}</a>` : '-'}</td>
            <td class="col-phone">${matchedHomeowner.contactNumber || '-'}</td>
            <td class="col-rel">${matchedHomeowner.role || 'Representative'}</td>
            <td class="text-center">
              <button type="button" class="action-icon-btn unit-sub-edit-btn" title="Edit"><i class="ri-pencil-line"></i></button>
              <button type="button" class="action-icon-btn unit-sub-delete-btn" title="Delete"><i class="ri-delete-bin-line"></i></button>
            </td>
          </tr>
        `);
      }

      // 家庭成員 (Family Members)
      if (Array.isArray(matchedHomeowner.familyMembers)) {
        matchedHomeowner.familyMembers.forEach((fm, index) => {
          const fmName = [fm.firstName, fm.middleName, fm.lastName].filter(Boolean).join(' ') || 'Family Member';
          rows.push(`
            <tr data-type="family" data-index="${index}">
              <td class="col-name">${fmName}</td>
              <td class="col-email">${fm.email ? `<a href="mailto:${fm.email}" class="link-email">${fm.email}</a>` : '-'}</td>
              <td class="col-phone">${fm.contactNumber || '-'}</td>
              <td class="col-rel">${fm.relationship || 'Member'}</td>
              <td class="text-center">
                <button type="button" class="action-icon-btn unit-sub-edit-btn" title="Edit"><i class="ri-pencil-line"></i></button>
                <button type="button" class="action-icon-btn unit-sub-delete-btn" title="Delete"><i class="ri-delete-bin-line"></i></button>
              </td>
            </tr>
          `);
        });
      }

      unitHomeownerList.innerHTML = rows.length > 0
        ? rows.join('')
        : `<tr><td colspan="5" class="text-center" style="padding: 1.5rem; color: #888;">No occupant records found.</td></tr>`;
    }

    // 3. 渲染 Billing History
    if (unitBillingList) {
      const balance = Number(matchedHomeowner.outstandingBalance || 0);
      const sinceYear = matchedHomeowner.homeownerSince ? new Date(matchedHomeowner.homeownerSince).getFullYear() : 2026;
      const statusBadge = balance > 0
        ? `<span class="status-badge overdue">Overdue</span>`
        : `<span class="status-badge paid">Paid</span>`;

      unitBillingList.innerHTML = `
        <tr>
          <td>${sinceYear}</td>
          <td>${new Date().toLocaleDateString()}</td>
          <td>₱${balance}</td>
          <td>Yearly</td>
          <td>${statusBadge}</td>
        </tr>
      `;
    }
  };

  // 【核心功能】：監聽 Unit Modal 內部的 Edit 與 Delete 點擊事件
  if (unitHomeownerList) {
    unitHomeownerList.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.unit-sub-edit-btn');
      const deleteBtn = e.target.closest('.unit-sub-delete-btn');
      if (!editBtn && !deleteBtn) return;

      const row = (editBtn || deleteBtn).closest('tr');
      const memberType = row.dataset.type; // 'representative' 或 'family'
      const memberIndex = Number(row.dataset.index);

      const homeowners = getHomeowners();
      const targetIndex = homeowners.findIndex(
        (h) => String(h.blockNo) === String(currentViewingHomeowner.blockNo) &&
               String(h.lotNo) === String(currentViewingHomeowner.lotNo)
      );

      if (targetIndex === -1) return;
      const targetHomeowner = homeowners[targetIndex];

      // --- 1. 刪除邏輯 (Delete) ---
      if (deleteBtn) {
        const confirmDelete = window.confirm('Are you sure you want to remove this member?');
        if (!confirmDelete) return;

        if (memberType === 'representative') {
          // 清除 Representative 主要欄位資訊
          targetHomeowner.firstName = '';
          targetHomeowner.middleName = '';
          targetHomeowner.lastName = '';
          targetHomeowner.email = '';
          targetHomeowner.contactNumber = '';
        } else if (memberType === 'family') {
          // 移除家庭成員陣列中指定項目
          if (Array.isArray(targetHomeowner.familyMembers)) {
            targetHomeowner.familyMembers.splice(memberIndex, 1);
          }
        }

        saveAllHomeowners(homeowners);
        populateUnitModal(targetHomeowner); // 重新渲染當前彈窗
      }

      // --- 2. 編輯邏輯 (Edit) ---
      if (editBtn) {
        if (memberType === 'representative') {
          const currentFullName = [targetHomeowner.firstName, targetHomeowner.middleName, targetHomeowner.lastName].filter(Boolean).join(' ');
          const newName = window.prompt('Enter Full Name (First [Middle] Last):', currentFullName);
          if (newName === null) return;

          const newEmail = window.prompt('Enter Email:', targetHomeowner.email || '');
          if (newEmail === null) return;

          const newPhone = window.prompt('Enter Phone/Contact Number:', targetHomeowner.contactNumber || '');
          if (newPhone === null) return;

          const nameParts = newName.trim().split(/\s+/);
          targetHomeowner.firstName = nameParts[0] || '';
          if (nameParts.length === 2) {
            targetHomeowner.middleName = '';
            targetHomeowner.lastName = nameParts[1];
          } else if (nameParts.length > 2) {
            targetHomeowner.middleName = nameParts.slice(1, -1).join(' ');
            targetHomeowner.lastName = nameParts[nameParts.length - 1];
          } else {
            targetHomeowner.middleName = '';
            targetHomeowner.lastName = '';
          }

          targetHomeowner.email = newEmail.trim();
          targetHomeowner.contactNumber = newPhone.trim();
        } else if (memberType === 'family') {
          const fm = targetHomeowner.familyMembers[memberIndex];
          if (!fm) return;

          const currentFullName = [fm.firstName, fm.middleName, fm.lastName].filter(Boolean).join(' ');
          const newName = window.prompt('Enter Full Name:', currentFullName);
          if (newName === null) return;

          const newEmail = window.prompt('Enter Email:', fm.email || '');
          if (newEmail === null) return;

          const newPhone = window.prompt('Enter Contact Number:', fm.contactNumber || '');
          if (newPhone === null) return;

          const newRel = window.prompt('Enter Relationship:', fm.relationship || '');
          if (newRel === null) return;

          const nameParts = newName.trim().split(/\s+/);
          fm.firstName = nameParts[0] || '';
          fm.middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(' ') : '';
          fm.lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
          fm.email = newEmail.trim();
          fm.contactNumber = newPhone.trim();
          fm.relationship = newRel.trim();
        }

        saveAllHomeowners(homeowners);
        populateUnitModal(targetHomeowner); // 重新渲染當前彈窗
      }
    });
  }

  // 渲染主列表表格
  const renderUnitRecords = () => {
    if (!tableBody) return;

    let entries = JSON.parse(localStorage.getItem('casa-milan-unit-records') || '[]');

    const lotFilter = normalizeText(filterLotInput?.value);
    const blockFilter = normalizeText(filterBlockInput?.value);

    const filtered = entries.filter((entry) => {
      const matchesLot = !lotFilter || normalizeText(entry.lotNo).includes(lotFilter);
      const matchesBlock = !blockFilter || normalizeText(entry.blockNo).includes(blockFilter);
      return matchesLot && matchesBlock;
    });

    tableBody.innerHTML = '';

    filtered.forEach((entry, index) => {
      const homeowners = getHomeowners();
      const matched = homeowners.find((h) => h.blockNo === entry.blockNo && h.lotNo === entry.lotNo);
      const representativeName = [matched?.firstName, matched?.middleName, matched?.lastName]
        .filter(Boolean)
        .join(' ');
      const familyMembers = Array.isArray(matched?.familyMembers) ? matched.familyMembers : [];
      const row = document.createElement('tr');
      row.dataset.index = entries.indexOf(entry);
      row.dataset.block = entry.blockNo || '';
      row.dataset.lot = entry.lotNo || '';

      row.innerHTML = `
        <td><input type="checkbox" class="row-checkbox" /></td>
        <td>${index + 1}</td>
        <td>${entry.blockNo || ''}</td>
        <td>${entry.lotNo || ''}</td>
        <td>${entry.address || ''}</td>
        <td>${representativeName}</td>
        <td>${entry.outstandingBalance ?? 0}</td>
        <td class="action-cell">
          <button type="button" class="action-icon-btn edit-btn" title="Edit">
            <i class="ri-edit-line"></i>
          </button>
          <button type="button" class="action-icon-btn delete-btn" title="Delete">
            <i class="ri-delete-bin-line"></i>
          </button>
        </td>
      `;

      const familyRows = familyMembers.map((member) => {
        const familyRow = document.createElement('tr');
        familyRow.className = 'family-member-row';
        familyRow.hidden = true;
        const familyName = [member.firstName, member.middleName, member.lastName].filter(Boolean).join(' ');
        familyRow.innerHTML = `
          <td></td><td></td><td></td><td></td><td></td>
          <td>${familyName || 'Family Member'}</td>
          <td></td><td></td>
        `;
        return familyRow;
      });

      const deleteBtn = row.querySelector('.delete-btn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteHomeownerRecord(entry));
      }

      bindRowEvents(row, familyRows);
      tableBody.appendChild(row);
      familyRows.forEach((familyRow) => tableBody.appendChild(familyRow));
    });

    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    updateBulkDeleteButton();
  };

  // 監聽表格 Edit 按鈕開啟彈窗
  if (tableBody) {
    tableBody.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.edit-btn');
      if (!editBtn) return;

      const row = editBtn.closest('tr');
      const blockNo = row.dataset.block;
      const lotNo = row.dataset.lot;

      const homeowners = getHomeowners();
      const matchedHomeowner = homeowners.find(
        (h) => String(h.blockNo) === String(blockNo) && String(h.lotNo) === String(lotNo)
      );

      if (matchedHomeowner) {
        populateUnitModal(matchedHomeowner);

        if (detailModalOverlay) {
          detailModalOverlay.style.display = 'flex';
          detailModalOverlay.style.pointerEvents = 'auto';
        }
      }
    });
  }

  // 關閉彈窗
  const closeUnitModal = () => {
    if (detailModalOverlay) {
      detailModalOverlay.style.display = 'none';
      detailModalOverlay.style.pointerEvents = 'none';
    }
    currentViewingHomeowner = null;
  };

  if (closeDetailBtn) {
    closeDetailBtn.addEventListener('click', closeUnitModal);
  }

  if (detailModalOverlay) {
    detailModalOverlay.addEventListener('click', (e) => {
      if (e.target === detailModalOverlay) {
        closeUnitModal();
      }
    });
  }

  // 搜尋與篩選事件
  if (searchBtn) {
    searchBtn.addEventListener('click', renderUnitRecords);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (filterLotInput) filterLotInput.value = '';
      if (filterBlockInput) filterBlockInput.value = '';
      renderUnitRecords();
    });
  }

  [filterLotInput, filterBlockInput].forEach((input) => {
    if (!input) return;
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        renderUnitRecords();
      }
    });
  });

  window.addEventListener('storage', (event) => {
    if (event.key === 'casa-milan-unit-records' || event.key === 'casa-milan-homeowners') {
      renderUnitRecords();
    }
  });

  renderUnitRecords();
});