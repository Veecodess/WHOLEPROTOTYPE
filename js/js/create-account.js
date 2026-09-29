document.addEventListener('DOMContentLoaded', () => {
  const filterBtns = document.querySelectorAll('.resident-filter-btn, .admin-filter-btn');
  const adminTabPanel = document.getElementById('admin-tab-panel');
  const homeownerTabPanel = document.getElementById('homeowner-tab-panel');
  const adminTableContainer = document.getElementById('admin-table-container');
  const homeownerTableContainer = document.getElementById('homeowner-table-container');
  const adminActions = document.getElementById('admin-actions');
  const filterLotInput = document.getElementById('filter-lot');
  const filterBlockInput = document.getElementById('filter-block');
  const filterHomeownerInput = document.getElementById('filter-homeowner');
  const searchBtn = document.getElementById('search-btn');
  const clearBtn = document.getElementById('clear-btn');
  const adminTableBody = document.getElementById('admin-table-body');
  const homeownerTableBody = document.getElementById('homeowner-table-body');
  const selectAllAdminCheckbox = document.getElementById('select-all-admin');
  const selectAllHomeownerCheckbox = document.getElementById('select-all-homeowner');
  const deleteSelectedAdminBtn = document.getElementById('delete-selected-admin-btn');
  const deleteSelectedHomeownerBtn = document.getElementById('delete-selected-homeowner-btn');
  const adminHomeownerNameInput = document.getElementById('admin-homeowner-name');
  const homeownerNameOptions = document.getElementById('homeowner-name-options');
  const addAdminForm = document.getElementById('add-admin-form');
  const addAdminBtn = document.getElementById('add-btn');
  const addAdminModalOverlay = document.getElementById('add-admin-modal-overlay');
  const adminCancelBtn = document.getElementById('admin-cancel-btn');

  const closeAdminModal = () => {
    addAdminModalOverlay?.classList.remove('is-open');
  };

  addAdminBtn?.addEventListener('click', () => {
    addAdminModalOverlay?.classList.add('is-open');
    updateHomeownerNameOptions();
  });

  adminCancelBtn?.addEventListener('click', closeAdminModal);
  addAdminModalOverlay?.addEventListener('click', (event) => {
    if (event.target === addAdminModalOverlay) closeAdminModal();
  });

  const normalizeText = (value) => String(value ?? '').trim().toLowerCase();

  const readStorageList = (key) => {
    try {
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  // 取得住戶建立帳號的資料清單（優先取衍生清單，若無則從原住戶清單轉換）
  const getCreateAccountRecords = () => {
    return readStorageList('casa-milan-create-account-records');
  };

  const getHomeownerName = (record) =>
    [record.firstName, record.middleName, record.lastName].filter(Boolean).join(' ');

  const updateHomeownerNameOptions = () => {
    if (!homeownerNameOptions) return;
    const query = normalizeText(adminHomeownerNameInput?.value);
    const names = getCreateAccountRecords()
      .filter((record) => record.role !== 'Family Member')
      .map(getHomeownerName)
      .filter((name) => !query || normalizeText(name).includes(query));
    homeownerNameOptions.innerHTML = [...new Set(names)]
      .map((name) => `<option value="${name}"></option>`)
      .join('');
  };

  if (adminHomeownerNameInput) {
    adminHomeownerNameInput.addEventListener('input', () => {
      if (filterHomeownerInput) filterHomeownerInput.value = adminHomeownerNameInput.value;
      updateHomeownerNameOptions();
      renderHomeownerRecords();
    });
  }

  // 精確對齊 12 個 <td> 欄位結構，避免任何錯位
  const renderTableRows = (tbody, entries) => {
    if (!tbody) return;

    const lotFilter = normalizeText(filterLotInput?.value);
    const blockFilter = normalizeText(filterBlockInput?.value);
    const homeownerFilter = normalizeText(filterHomeownerInput?.value);

    const filtered = entries.filter((entry) => {
      const fullName = [entry.firstName, entry.middleName, entry.lastName].join(' ');
      const matchesLot = !lotFilter || normalizeText(entry.lotNo).includes(lotFilter);
      const matchesBlock = !blockFilter || normalizeText(entry.blockNo).includes(blockFilter);
      const matchesHomeowner = !homeownerFilter || normalizeText(fullName).includes(homeownerFilter);
      return matchesLot && matchesBlock && matchesHomeowner;
    });

    tbody.innerHTML = filtered.map((entry, index) => `
      <tr data-source-index="${entries.indexOf(entry)}">
        <td><input type="checkbox" class="row-checkbox" /></td>
        <td>${index + 1}</td>
        <td>${entry.blockNo || ''}</td>
        <td>${entry.lotNo || ''}</td>
        <td>${entry.address || ''}</td>
        <td>${entry.firstName || ''}</td>
        <td>${entry.middleName || ''}</td>
        <td>${entry.lastName || ''}</td>
        <td>${entry.email || ''}</td>
        <td>${entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}</td>
        <td>${entry.role || 'Representative'}</td>
        <td class="action-cell">
          <button type="button" class="action-icon-btn action-text-btn reset-action-btn edit-btn" title="Reset">
            Reset
          </button>
          <button type="button" class="action-icon-btn action-text-btn remove-action-btn delete-btn" title="Remove">
            Remove
          </button>
        </td>
      </tr>
    `).join('');

    const selectAllCheckbox = tbody.id === 'admin-table-body'
      ? selectAllAdminCheckbox
      : selectAllHomeownerCheckbox;
    const rowCheckboxes = [...tbody.querySelectorAll('.row-checkbox')];
    rowCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const checkedCount = rowCheckboxes.filter((item) => item.checked).length;
        if (selectAllCheckbox) {
          selectAllCheckbox.checked = rowCheckboxes.length > 0 && checkedCount === rowCheckboxes.length;
        }
      });
    });
    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.onchange = () => {
        rowCheckboxes.forEach((checkbox) => {
          checkbox.checked = selectAllCheckbox.checked;
        });
        if (deleteSelectedBtn) deleteSelectedBtn.hidden = !selectAllCheckbox.checked;
      };
    }
    const deleteSelectedBtn = tbody.id === 'admin-table-body'
      ? deleteSelectedAdminBtn
      : deleteSelectedHomeownerBtn;
    if (deleteSelectedBtn) {
      deleteSelectedBtn.hidden = !rowCheckboxes.some((checkbox) => checkbox.checked);
    }
  };

  const renderAdminRecords = () => {
    const tbody = document.getElementById('admin-table-body') ||
                  document.querySelector('#admin-tab-panel tbody') ||
                  document.querySelector('.admin-table tbody');
    const adminRecords = readStorageList('casa-milan-admin-records');
    renderTableRows(tbody, adminRecords);
  };

  const renderHomeownerRecords = () => {
    const tbody = document.getElementById('homeowner-table-body') ||
                  document.querySelector('#homeowner-tab-panel tbody') ||
                  document.querySelector('.homeowner-table tbody');
    const entries = getCreateAccountRecords();
    renderTableRows(tbody, entries);
  };

  const bindBulkDelete = (button, tableBody, storageKey) => {
    if (!button || !tableBody) return;
    tableBody.addEventListener('change', (event) => {
      if (event.target.classList.contains('row-checkbox')) {
        button.hidden = !tableBody.querySelector('.row-checkbox:checked');
      }
    });
    button.addEventListener('click', () => {
      const selectedIndexes = [...tableBody.querySelectorAll('.row-checkbox:checked')]
        .map((checkbox) => Number(checkbox.closest('tr')?.dataset.sourceIndex))
        .filter((index) => Number.isInteger(index));
      if (selectedIndexes.length === 0) return;
      const confirmationMessage = storageKey === 'casa-milan-create-account-records'
        ? 'Are you sure you want to remove the selected account(s)?'
        : 'Are you sure you want to remove the selected admin account(s)?';
      if (!window.confirm(confirmationMessage)) return;

      const records = readStorageList(storageKey);
      const selectedSet = new Set(selectedIndexes);
      localStorage.setItem(storageKey, JSON.stringify(records.filter((_, index) => !selectedSet.has(index))));
      button.hidden = true;
      if (storageKey === 'casa-milan-admin-records') {
        renderAdminRecords();
      } else {
        renderHomeownerRecords();
      }
    });
  };

  bindBulkDelete(deleteSelectedAdminBtn, adminTableBody, 'casa-milan-admin-records');
  bindBulkDelete(deleteSelectedHomeownerBtn, document.getElementById('homeowner-table-body'), 'casa-milan-create-account-records');

  if (addAdminForm) {
    addAdminForm.addEventListener('submit', (event) => {
      event.preventDefault();

      const homeownerName = normalizeText(adminHomeownerNameInput?.value);
      const homeowner = getCreateAccountRecords()
        .filter((record) => record.role !== 'Family Member')
        .find((record) => normalizeText(getHomeownerName(record)) === homeownerName);
      const role = document.getElementById('admin-role')?.value || '';

      if (!homeowner) {
        window.alert('Please select a homeowner from the generated homeowner records.');
        return;
      }
      if (!role) {
        window.alert('Please select an admin role.');
        return;
      }

      const adminRecords = readStorageList('casa-milan-admin-records');
      const alreadyAdded = adminRecords.some((record) =>
        record.blockNo === homeowner.blockNo &&
        record.lotNo === homeowner.lotNo &&
        normalizeText(record.firstName) === normalizeText(homeowner.firstName) &&
        normalizeText(record.lastName) === normalizeText(homeowner.lastName)
      );

      if (alreadyAdded) {
        window.alert('This homeowner is already listed as an admin.');
        return;
      }

      adminRecords.push({
        ...homeowner,
        role,
        createdAt: homeowner.createdAt || new Date().toISOString()
      });
      localStorage.setItem('casa-milan-admin-records', JSON.stringify(adminRecords));
      addAdminForm.reset();
      if (filterHomeownerInput) filterHomeownerInput.value = '';
      closeAdminModal();
      toggleTableView('admin');
      renderAdminRecords();
    });
  }

  if (adminTableBody) {
    adminTableBody.addEventListener('click', (event) => {
      if (event.target.closest('.edit-btn')) {
        window.alert('Reset Password Email has been sent.');
        return;
      }

      const deleteBtn = event.target.closest('.delete-btn');
      if (!deleteBtn) return;

      const row = deleteBtn.closest('tr');
      const recordIndex = Number(row?.dataset.sourceIndex);
      const adminRecords = readStorageList('casa-milan-admin-records');

      if (!Number.isInteger(recordIndex) || !adminRecords[recordIndex]) return;
      if (!window.confirm('Are you sure you want to delete this admin account?')) return;

      adminRecords.splice(recordIndex, 1);
      localStorage.setItem('casa-milan-admin-records', JSON.stringify(adminRecords));
      renderAdminRecords();
    });
  }

  if (homeownerTableBody) {
    homeownerTableBody.addEventListener('click', (event) => {
      if (event.target.closest('.edit-btn')) {
        window.alert('Reset Password Email has been sent.');
        return;
      }

      const deleteBtn = event.target.closest('.delete-btn');
      if (!deleteBtn) return;

      const row = deleteBtn.closest('tr');
      const recordIndex = Number(row?.dataset.sourceIndex);
      const homeownerRecords = readStorageList('casa-milan-create-account-records');
      if (!Number.isInteger(recordIndex) || !homeownerRecords[recordIndex]) return;
      if (!window.confirm('Are you sure you want to remove this account?')) return;

      homeownerRecords.splice(recordIndex, 1);
      localStorage.setItem('casa-milan-create-account-records', JSON.stringify(homeownerRecords));
      renderHomeownerRecords();
    });
  }

  const toggleTableView = (selectedTab) => {
    const isAdmin = selectedTab === 'admin';

    filterBtns.forEach((btn) => {
      const isActive = (isAdmin && btn.classList.contains('admin-filter-btn')) || (!isAdmin && btn.classList.contains('resident-filter-btn'));
      btn.classList.toggle('active', isActive);
    });

    if (adminTabPanel) adminTabPanel.hidden = !isAdmin;
    if (homeownerTabPanel) homeownerTabPanel.hidden = isAdmin;
    if (adminActions) adminActions.hidden = !isAdmin;
    if (adminTableContainer) adminTableContainer.hidden = !isAdmin;
    if (homeownerTableContainer) homeownerTableContainer.hidden = isAdmin;
  };

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const selectedTab = btn.classList.contains('admin-filter-btn') ? 'admin' : 'homeowner';
      if (homeownerTableContainer) homeownerTableContainer.classList.remove('manage-mode');
      toggleTableView(selectedTab);
      if (selectedTab === 'admin') {
        renderAdminRecords();
      } else {
        renderHomeownerRecords();
      }
    });
  });

  const adminManageBtn = document.getElementById('admin-manage-btn');
  if (adminManageBtn) {
    adminManageBtn.addEventListener('click', () => {
      if (adminTableContainer) adminTableContainer.classList.add('manage-mode');
      renderAdminRecords();
    });
  }

  const homeownerManageBtn = document.getElementById('homeowner-manage-btn');
  if (homeownerManageBtn) {
    homeownerManageBtn.addEventListener('click', () => {
      if (homeownerTableContainer) homeownerTableContainer.classList.add('manage-mode');
      renderHomeownerRecords();
    });
  }

  const refreshTables = () => {
    renderAdminRecords();
    renderHomeownerRecords();
  };

  if (searchBtn) {
    searchBtn.addEventListener('click', refreshTables);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (filterLotInput) filterLotInput.value = '';
      if (filterBlockInput) filterBlockInput.value = '';
      if (filterHomeownerInput) filterHomeownerInput.value = '';
      refreshTables();
    });
  }

  [filterLotInput, filterBlockInput, filterHomeownerInput].forEach((input) => {
    if (!input) return;
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        refreshTables();
      }
    });
  });

  window.addEventListener('storage', (event) => {
    if (event.key === 'casa-milan-homeowners' ||
        event.key === 'casa-milan-create-account-records' ||
        event.key === 'casa-milan-admin-records') {
      refreshTables();
    }
  });

  // 1. 立即初始化檢視狀態
  toggleTableView('homeowner');
  refreshTables();

  // 2. 核心修正：延遲 50ms 再次覆蓋執行，防止其他非同步腳本在初始化時渲染舊欄位
  setTimeout(() => {
    refreshTables();
  }, 50);
});



