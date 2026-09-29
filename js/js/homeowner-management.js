const dropdownMap = [
  { btnId: 'community-setting-btn', menuId: 'community-setting-dropdown' },
  { btnId: 'community-service-btn', menuId: 'community-service-dropdown' },
  { btnId: 'amenity-service-btn', menuId: 'amenity-service-dropdown' },
  { btnId: 'account-management-btn', menuId: 'account-management-dropdown' }
];

const STORAGE_KEY = 'casa-milan-sidebar-open-groups';

// 側邊欄展開狀態處理
const getOpenGroups = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    return new Set();
  }
};

const saveOpenGroups = (openGroups) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...openGroups]));
};

const setDropdownOpenState = (menu, button, shouldOpen) => {
  menu.classList.toggle('open', shouldOpen);
  button.classList.toggle('active', shouldOpen);
};

const getCurrentPageMatchesDropdown = (menu) => {
  const currentPath = window.location.pathname.toLowerCase();
  return Array.from(menu.querySelectorAll('a')).some((link) => {
    const href = link.getAttribute('href');
    if (!href) return false;
    const normalizedHref = href.toLowerCase();
    return currentPath === normalizedHref || currentPath.endsWith(normalizedHref);
  });
};

document.addEventListener('DOMContentLoaded', () => {
  const openGroups = getOpenGroups();
  dropdownMap.forEach((item) => {
    const button = document.getElementById(item.btnId);
    const menu = document.getElementById(item.menuId);
    if (!button || !menu) return;

    const shouldOpenOnLoad = getCurrentPageMatchesDropdown(menu) || openGroups.has(item.btnId);
    setDropdownOpenState(menu, button, shouldOpenOnLoad);
    if (shouldOpenOnLoad) {
      openGroups.add(item.btnId);
    }

    button.addEventListener('click', (event) => {
      event.preventDefault();
      const isOpen = menu.classList.contains('open');
      const nextOpenState = !isOpen;
      setDropdownOpenState(menu, button, nextOpenState);
      if (nextOpenState) {
        openGroups.add(item.btnId);
      } else {
        openGroups.delete(item.btnId);
      }
      saveOpenGroups(openGroups);
    });

    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        openGroups.add(item.btnId);
        saveOpenGroups(openGroups);
      });
    });
  });
  saveOpenGroups(openGroups);
});

// 格式轉換：將 Homeowner 轉換為其他頁面所需結構
const mapGeneratedDataForPages = (homeowners) => {
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
    outstandingBalance: homeowner.outstandingBalance || '0',
    ownershipStatus: homeowner.ownershipStatus
  }));

  return { createAccountRecords, credentialRecords, unitRecords };
};

const HOMEOWNER_DATA_GENERATED_KEY = 'casa-milan-homeowner-data-generated';

// 同步衍生資料至 localStorage（供 Create Account、Credential Notice 與 Unit 頁面使用）
const syncDerivedHomeownerData = (homeowners) => {
  const normalizedHomeowners = Array.isArray(homeowners) ? homeowners : [];
  const { createAccountRecords, credentialRecords, unitRecords } = mapGeneratedDataForPages(normalizedHomeowners);
  const recordKey = (record) => [
    record.blockNo || '',
    record.lotNo || '',
    record.firstName || '',
    record.middleName || '',
    record.lastName || '',
    record.role || ''
  ].join('|');
  const mergeRecords = (storageKey, records, replaceFamilyMembers = false) => {
    let existingRecords = [];
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existingRecords = Array.isArray(saved) ? saved : [];
    } catch {
      existingRecords = [];
    }

    const generatedKeys = new Set(records.map(recordKey));
    const generatedUnits = new Set(
      records
        .filter((record) => record.role !== 'Family Member')
        .map((record) => `${record.blockNo || ''}|${record.lotNo || ''}`)
    );
    const retainedRecords = existingRecords.filter((record) => {
      const isReplacedFamilyMember = replaceFamilyMembers &&
        record.role === 'Family Member' &&
        generatedUnits.has(`${record.blockNo || ''}|${record.lotNo || ''}`);
      return !generatedKeys.has(recordKey(record)) && !isReplacedFamilyMember;
    });
    localStorage.setItem(storageKey, JSON.stringify([...retainedRecords, ...records]));
  };

  mergeRecords('casa-milan-create-account-records', createAccountRecords);
  mergeRecords('casa-milan-account-credential-records', credentialRecords, true);
  mergeRecords('casa-milan-unit-records', unitRecords);

  // 同步更新 notice 頁面使用的 pending 資料
  mergeRecords('casa-milan-account-credential-pending', credentialRecords, true);
  localStorage.setItem('casa-milan-account-credential-pending-initialized', 'true');

  sessionStorage.setItem(HOMEOWNER_DATA_GENERATED_KEY, 'true');
  localStorage.setItem(HOMEOWNER_DATA_GENERATED_KEY, 'true');
};

const removeDerivedHomeownerData = (homeowners) => {
  const records = Array.isArray(homeowners) ? homeowners : [];
  const derivedKeys = [
    'casa-milan-create-account-records',
    'casa-milan-account-credential-records',
    'casa-milan-account-credential-pending',
    'casa-milan-unit-records'
  ];
  const matchesHomeowner = (record, homeowner) => {
    const sameUnit =
      (record.blockNo || '') === (homeowner.blockNo || '') &&
      (record.lotNo || '') === (homeowner.lotNo || '');
    if (!sameUnit) return false;

    if (record.role === 'Family Member') {
      const belongsToHomeowner = [
        ['parentFirstName', 'firstName'],
        ['parentMiddleName', 'middleName'],
        ['parentLastName', 'lastName']
      ].every(([recordField, homeownerField]) =>
        (record[recordField] || '') === (homeowner[homeownerField] || '')
      );
      if (belongsToHomeowner) return true;
    }

    const recordHasName = [record.firstName, record.middleName, record.lastName]
      .some((value) => String(value || '').trim() !== '');
    if (!recordHasName) return true;

    return ['firstName', 'middleName', 'lastName'].every((field) =>
      (record[field] || '') === (homeowner[field] || '')
    );
  };

  derivedKeys.forEach((storageKey) => {
    let storedRecords = [];
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      storedRecords = Array.isArray(saved) ? saved : [];
    } catch {
      storedRecords = [];
    }

    const remainingRecords = storedRecords.filter((record) =>
      !records.some((homeowner) => matchesHomeowner(record, homeowner))
    );
    localStorage.setItem(storageKey, JSON.stringify(remainingRecords));
  });
};

const updateGeneratedFamilyMemberData = (homeowner) => {
  const credentialKeys = [
    'casa-milan-account-credential-records',
    'casa-milan-account-credential-pending'
  ];
  const sameUnit = (record) =>
    (record.blockNo || '') === (homeowner.blockNo || '') &&
    (record.lotNo || '') === (homeowner.lotNo || '');
  const currentFamilyRecords = (Array.isArray(homeowner.familyMembers) ? homeowner.familyMembers : [])
    .map((member) => ({
      blockNo: homeowner.blockNo,
      lotNo: homeowner.lotNo,
      address: homeowner.address,
      firstName: member.firstName,
      middleName: member.middleName,
      lastName: member.lastName,
      email: member.email,
      contactNumber: member.contactNumber,
      createdAt: member.createdAt || new Date().toISOString(),
      role: 'Family Member',
      credentialStatus: 'Pending',
      parentFirstName: homeowner.firstName,
      parentMiddleName: homeowner.middleName,
      parentLastName: homeowner.lastName
    }));

  credentialKeys.forEach((storageKey) => {
    let records = [];
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      records = Array.isArray(saved) ? saved : [];
    } catch {
      records = [];
    }

    const remainingRecords = records.filter((record) =>
      !(sameUnit(record) && record.role === 'Family Member')
    );
    localStorage.setItem(storageKey, JSON.stringify([...remainingRecords, ...currentFamilyRecords]));
  });
};

const getGeneratedCredentialRecords = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('casa-milan-account-credential-records') || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

const hasGeneratedHomeownerData = (homeowner) => {
  const storageKeys = [
    'casa-milan-account-credential-records',
    'casa-milan-create-account-records',
    'casa-milan-unit-records'
  ];

  return storageKeys.some((storageKey) => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(saved) && saved.some((record) =>
        record.role !== 'Family Member' &&
        (record.blockNo || '') === (homeowner.blockNo || '') &&
        (record.lotNo || '') === (homeowner.lotNo || '')
      );
    } catch {
      return false;
    }
  });
};

/* Add Homeowner Modal & Table Logic */
document.addEventListener('DOMContentLoaded', () => {
  const addHomeownerForm = document.getElementById('add-homeowner-form');
  const tableBody = document.getElementById('homeowner-table-body');
  const modalOverlay = document.getElementById('add-homeowner-modal-overlay');
  const addHomeownerBtn = document.getElementById('add-btn');
  const deleteSelectedBtn = document.getElementById('delete-selected-btn');
  const generateBtn = document.getElementById('generate-btn');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const addFamilyMemberBtn = document.getElementById('add-family-member');
  const familyMemberList = document.getElementById('family-member-list');
  const addVehicleBtn = document.getElementById('add-vehicle');
  const vehicleList = document.getElementById('vehicle-list');
  const filterLotInput = document.getElementById('filter-lot');
  const filterBlockInput = document.getElementById('filter-block');
  const filterHomeownerInput = document.getElementById('filter-homeowner');
  const searchBtn = document.getElementById('search-btn');
  const clearBtn = document.getElementById('clear-btn');
  const importBtn = document.getElementById('import-btn');
  
  if (!addHomeownerForm || !tableBody) return;

  const STORAGE_KEY = 'casa-milan-homeowners';
  let pendingFamilyMembers = [];
  let pendingVehicles = [];
  let editingHomeownerIndex = null;
  let editingFamilyMemberIndex = null;
  let editingVehicleIndex = null;

  const updateBulkDeleteButton = () => {
    if (deleteSelectedBtn) {
      deleteSelectedBtn.hidden = !tableBody.querySelector('.row-checkbox:checked');
    }
  };

  const collapseExpandedRows = () => {
    tableBody.querySelectorAll('.row-checkbox').forEach((checkbox) => {
      checkbox.checked = false;
      checkbox.closest('tr')?.classList.remove('selected');
    });
    tableBody.querySelectorAll('.family-member-row').forEach((row) => {
      row.hidden = true;
    });
    const selectAllCheckbox = document.getElementById('select-all');
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
    updateBulkDeleteButton();
  };

  const getHomeowners = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  };

  // 【修改】：儲存時僅儲存住戶本身，不直接對其他介面同步衍生資料
  const saveHomeowners = (homeowners) => {
    const normalizedHomeowners = Array.isArray(homeowners)
      ? homeowners.map((homeowner) => ({
          ...homeowner,
          createdAt: homeowner.createdAt || new Date().toISOString(),
          role: homeowner.role || 'Representative',
          email: homeowner.email || '',
          firstName: homeowner.firstName || '',
          middleName: homeowner.middleName || '',
          lastName: homeowner.lastName || '',
          address: homeowner.address || '',
          blockNo: homeowner.blockNo || '',
          lotNo: homeowner.lotNo || ''
        }))
      : [];

    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedHomeowners));
  };

  const clearFamilyMemberForm = () => {
    const fields = [
      'family-first-name',
      'family-middle-name',
      'family-last-name',
      'relationship',
      'family-contact',
      'family-email'
    ];
    fields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  };

  const clearVehicleForm = () => {
    const fields = ['model', 'plate-number', 'hoa-sticker'];
    fields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  };

  const normalizeText = (value) => String(value ?? '').trim().toLowerCase();

  const getFilteredHomeowners = () => {
    const homeowners = getHomeowners();
    const lotFilter = normalizeText(filterLotInput?.value);
    const blockFilter = normalizeText(filterBlockInput?.value);
    const homeownerFilter = normalizeText(filterHomeownerInput?.value);

    return homeowners.filter((homeowner) => {
      const matchesLot = !lotFilter || normalizeText(homeowner.lotNo).includes(lotFilter);
      const matchesBlock = !blockFilter || normalizeText(homeowner.blockNo).includes(blockFilter);
      const fullName = [homeowner.firstName, homeowner.middleName, homeowner.lastName].join('');
      const matchesHomeowner = !homeownerFilter || normalizeText(fullName).includes(homeownerFilter);

      return matchesLot && matchesBlock && matchesHomeowner;
    });
  };

  const closeModal = () => {
    if (modalOverlay) {
      modalOverlay.style.display = 'none';
      modalOverlay.style.pointerEvents = 'none';
    }
    if (addHomeownerForm) {
      addHomeownerForm.reset();
    }
    pendingFamilyMembers = [];
    pendingVehicles = [];
    editingHomeownerIndex = null;
    editingFamilyMemberIndex = null;
    editingVehicleIndex = null;
    renderFamilyMemberCards();
    renderVehicleCards();
  };

  const openModal = () => {
    if (modalOverlay) {
      modalOverlay.style.display = 'flex';
      modalOverlay.style.pointerEvents = 'auto';
    }
  };

  if (addHomeownerBtn) {
    addHomeownerBtn.addEventListener('click', openModal);
  }

  // 【核心修改】：只有點擊 Generate 按鈕時，才會同步現有全部住戶資料到其它介面
  if (generateBtn) {
    generateBtn.addEventListener('click', () => {
      const currentHomeowners = getHomeowners();
      const selectedIndexes = [...tableBody.querySelectorAll('.row-checkbox:checked')]
        .map((checkbox) => Number(checkbox.closest('tr')?.dataset.index))
        .filter((index) => Number.isInteger(index) && currentHomeowners[index]);
      const selectedHomeowners = selectedIndexes.map((index) => currentHomeowners[index]);

      if (selectedHomeowners.length === 0) {
        window.alert('Please select at least one homeowner before generating data.');
        return;
      }

      syncDerivedHomeownerData(selectedHomeowners);
      renderStoredHomeowners();
      window.alert('Selected homeowner data generated and synced to Create Account, Account Credentials, and Unit Management.');
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeModal);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeModal);
  }

  const flushDraftFamilyMember = () => {
    const existingMember = editingFamilyMemberIndex !== null
      ? pendingFamilyMembers[editingFamilyMemberIndex]
      : null;
    const member = {
      firstName: document.getElementById('family-first-name')?.value.trim() || '',
      middleName: document.getElementById('family-middle-name')?.value.trim() || '',
      lastName: document.getElementById('family-last-name')?.value.trim() || '',
      relationship: document.getElementById('relationship')?.value.trim() || '',
      contactNumber: document.getElementById('family-contact')?.value.trim() || '',
      email: document.getElementById('family-email')?.value.trim() || '',
      createdAt: existingMember?.createdAt || new Date().toISOString()
    };

    const hasData = Object.values(member).some((value) => value !== '');
    if (!hasData) return;

    if (editingFamilyMemberIndex !== null) {
      pendingFamilyMembers[editingFamilyMemberIndex] = member;
      editingFamilyMemberIndex = null;
    } else {
      pendingFamilyMembers.push(member);
    }

    clearFamilyMemberForm();
    renderFamilyMemberCards();
  };

  const flushDraftVehicle = () => {
    const vehicle = {
      model: document.getElementById('model')?.value.trim() || '',
      plateNumber: document.getElementById('plate-number')?.value.trim() || '',
      hoaSticker: document.getElementById('hoa-sticker')?.value.trim() || ''
    };

    const hasData = Object.values(vehicle).some((value) => value !== '');
    if (!hasData) return;

    if (editingVehicleIndex !== null) {
      pendingVehicles[editingVehicleIndex] = vehicle;
      editingVehicleIndex = null;
    } else {
      pendingVehicles.push(vehicle);
    }

    clearVehicleForm();
    renderVehicleCards();
  };

  const renderFamilyMemberCards = () => {
    if (!familyMemberList) return;
    familyMemberList.innerHTML = '';

    pendingFamilyMembers.forEach((member, index) => {
      const card = document.createElement('div');
      card.className = 'sub-item-card';
      const nameText =
        [member.firstName, member.middleName, member.lastName].filter(Boolean).join(' ') ||
        `Family Member ${index + 1}`;

      card.innerHTML = `
        <div class="sub-item-header">
          <div class="sub-item-header-left">
            <input type="checkbox" class="sub-item-toggle" checked />
            <span>${nameText}</span>
          </div>
          <div class="sub-item-actions">
            <button type="button" class="sub-item-action-btn sub-item-edit-btn">Edit</button>
            <button type="button" class="sub-item-action-btn sub-item-delete-btn">Delete</button>
          </div>
        </div>
        <div class="sub-item-details">
          <div class="sub-item-detail-item"><strong>First Name</strong><span>${member.firstName || '-'}</span></div>
          <div class="sub-item-detail-item"><strong>Middle Name</strong><span>${member.middleName || '-'}</span></div>
          <div class="sub-item-detail-item"><strong>Last Name</strong><span>${member.lastName || '-'}</span></div>
          <div class="sub-item-detail-item"><strong>Relationship</strong><span>${member.relationship || '-'}</span></div>
          <div class="sub-item-detail-item"><strong>Contact Number</strong><span>${member.contactNumber || '-'}</span></div>
          <div class="sub-item-detail-item"><strong>Email</strong><span>${member.email || '-'}</span></div>
        </div>
      `;

      const toggle = card.querySelector('.sub-item-toggle');
      const details = card.querySelector('.sub-item-details');
      toggle.addEventListener('change', () => {
        details.classList.toggle('hidden', !toggle.checked);
      });

      const editBtn = card.querySelector('.sub-item-edit-btn');
      editBtn.addEventListener('click', () => {
        editingFamilyMemberIndex = index;
        document.getElementById('family-first-name').value = member.firstName || '';
        document.getElementById('family-middle-name').value = member.middleName || '';
        document.getElementById('family-last-name').value = member.lastName || '';
        document.getElementById('relationship').value = member.relationship || '';
        document.getElementById('family-contact').value = member.contactNumber || '';
        document.getElementById('family-email').value = member.email || '';
      });

      const deleteBtn = card.querySelector('.sub-item-delete-btn');
      deleteBtn.addEventListener('click', () => {
        pendingFamilyMembers.splice(index, 1);
        renderFamilyMemberCards();
      });

      familyMemberList.appendChild(card);
    });
  };

  const renderVehicleCards = () => {
    if (!vehicleList) return;
    vehicleList.innerHTML = '';

    pendingVehicles.forEach((vehicle, index) => {
      const card = document.createElement('div');
      card.className = 'sub-item-card';
      const nameText = vehicle.model || `Vehicle ${index + 1}`;

      card.innerHTML = `
        <div class="sub-item-header">
          <div class="sub-item-header-left">
            <input type="checkbox" class="sub-item-toggle" checked />
            <span>${nameText}</span>
          </div>
          <div class="sub-item-actions">
            <button type="button" class="sub-item-action-btn sub-item-edit-btn">Edit</button>
            <button type="button" class="sub-item-action-btn sub-item-delete-btn">Delete</button>
          </div>
        </div>
        <div class="sub-item-details">
          <div class="sub-item-detail-item"><strong>Model</strong><span>${vehicle.model || '-'}</span></div>
          <div class="sub-item-detail-item"><strong>Plate Number</strong><span>${vehicle.plateNumber || '-'}</span></div>
          <div class="sub-item-detail-item"><strong>HOA Sticker</strong><span>${vehicle.hoaSticker || '-'}</span></div>
        </div>
      `;

      const toggle = card.querySelector('.sub-item-toggle');
      const details = card.querySelector('.sub-item-details');
      toggle.addEventListener('change', () => {
        details.classList.toggle('hidden', !toggle.checked);
      });

      const editBtn = card.querySelector('.sub-item-edit-btn');
      editBtn.addEventListener('click', () => {
        editingVehicleIndex = index;
        document.getElementById('model').value = vehicle.model || '';
        document.getElementById('plate-number').value = vehicle.plateNumber || '';
        document.getElementById('hoa-sticker').value = vehicle.hoaSticker || '';
      });

      const deleteBtn = card.querySelector('.sub-item-delete-btn');
      deleteBtn.addEventListener('click', () => {
        pendingVehicles.splice(index, 1);
        renderVehicleCards();
      });

      vehicleList.appendChild(card);
    });
  };

  if (addFamilyMemberBtn) {
    addFamilyMemberBtn.addEventListener('click', flushDraftFamilyMember);
  }

  if (addVehicleBtn) {
    addVehicleBtn.addEventListener('click', flushDraftVehicle);
  }

  const populateFormForEdit = (homeowner) => {
    if (!addHomeownerForm || !homeowner) return;
    document.getElementById('block-no').value = homeowner.blockNo || '';
    document.getElementById('lot-no').value = homeowner.lotNo || '';
    document.getElementById('lot-area').value = homeowner.lotArea || '';
    document.getElementById('address').value = homeowner.address || '';
    document.getElementById('first-name').value = homeowner.firstName || '';
    document.getElementById('middle-name').value = homeowner.middleName || '';
    document.getElementById('last-name').value = homeowner.lastName || '';
    document.getElementById('contact-number').value = homeowner.contactNumber || '';
    document.getElementById('email').value = homeowner.email || '';
    document.getElementById('ownership-status').value = homeowner.ownershipStatus || '';
    document.getElementById('homeowner-since').value = homeowner.homeownerSince || '';

    pendingFamilyMembers = Array.isArray(homeowner.familyMembers) ? [...homeowner.familyMembers] : [];
    pendingVehicles = Array.isArray(homeowner.vehicles) ? [...homeowner.vehicles] : [];

    editingFamilyMemberIndex = null;
    editingVehicleIndex = null;
    renderFamilyMemberCards();
    renderVehicleCards();
  };

  const renderStoredHomeowners = (expandedIndexes = []) => {
    if (!tableBody) return;
    const homeowners = getFilteredHomeowners();
    tableBody.innerHTML = '';
    updateBulkDeleteButton();

    homeowners.forEach((homeowner, index) => {
      const originalIndex = getHomeowners().findIndex((item) => item === homeowner);
      const displayedIndex = originalIndex >= 0 ? originalIndex : index;

      const mainRow = document.createElement('tr');
      mainRow.dataset.index = displayedIndex;
      mainRow.innerHTML = `
        <td><input type="checkbox" class="row-checkbox" /></td>
        <td>${index + 1}</td>
        <td>${homeowner.blockNo || ''}</td>
        <td>${homeowner.lotNo || ''}</td>
        <td>${homeowner.address || ''}</td>
        <td>${homeowner.firstName || ''}</td>
        <td>${homeowner.middleName || ''}</td>
        <td>${homeowner.lastName || ''}</td>
        <td class="action-cell">
          <button type="button" class="action-icon-btn edit-btn" title="Reset">
            <i class="ri-pencil-line"></i>
          </button>
          <button type="button" class="action-icon-btn delete-btn" title="Remove">
            <i class="ri-delete-bin-line"></i>
          </button>
        </td>
      `;

      const familyDetails = Array.isArray(homeowner.familyMembers) ? homeowner.familyMembers : [];
      const familyRows = familyDetails.map((member, familyIndex) => {
        const familyRow = document.createElement('tr');
        familyRow.className = 'family-member-row';
        familyRow.hidden = true;
        familyRow.innerHTML = `
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td>${member.firstName || ''}</td>
          <td>${member.middleName || ''}</td>
          <td>${member.lastName || ''}</td>
          <td class="action-cell">
            <button type="button" class="action-icon-btn family-edit-btn" title="Reset family member">
              <i class="ri-pencil-line"></i>
            </button>
            <button type="button" class="action-icon-btn family-delete-btn" title="Remove family member">
              <i class="ri-delete-bin-line"></i>
            </button>
          </td>
        `;

        familyRow.querySelector('.family-edit-btn').addEventListener('click', () => {
          editingHomeownerIndex = displayedIndex;
          editingFamilyMemberIndex = familyIndex;
          populateFormForEdit(homeowner);
          document.getElementById('family-first-name').value = member.firstName || '';
          document.getElementById('family-middle-name').value = member.middleName || '';
          document.getElementById('family-last-name').value = member.lastName || '';
          document.getElementById('relationship').value = member.relationship || '';
          document.getElementById('family-contact').value = member.contactNumber || '';
          document.getElementById('family-email').value = member.email || '';
          openModal();
        });

        familyRow.querySelector('.family-delete-btn').addEventListener('click', () => {
          if (!window.confirm('Are you sure you want to delete this family member?')) return;
          const homeowners = getHomeowners();
          const storedHomeowner = homeowners[displayedIndex];
          if (!storedHomeowner || !Array.isArray(storedHomeowner.familyMembers)) return;

          storedHomeowner.familyMembers.splice(familyIndex, 1);
          saveHomeowners(homeowners);
          if (hasGeneratedHomeownerData(storedHomeowner)) {
            syncDerivedHomeownerData([storedHomeowner]);
          }
          renderStoredHomeowners([displayedIndex]);
        });

        return familyRow;
      });

      bindRowEvents(mainRow, familyRows);
      tableBody.appendChild(mainRow);
      familyRows.forEach((familyRow) => tableBody.appendChild(familyRow));

      if (expandedIndexes.includes(displayedIndex)) {
        const checkbox = mainRow.querySelector('.row-checkbox');
        if (checkbox) {
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event('change'));
        }
      }
    });
  };

  if (addHomeownerForm) {
    addHomeownerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      flushDraftFamilyMember();
      flushDraftVehicle();

      const homeowner = {
        blockNo: document.getElementById('block-no').value.trim(),
        lotNo: document.getElementById('lot-no').value.trim(),
        lotArea: document.getElementById('lot-area').value.trim(),
        address: document.getElementById('address').value.trim(),
        firstName: document.getElementById('first-name').value.trim(),
        middleName: document.getElementById('middle-name').value.trim(),
        lastName: document.getElementById('last-name').value.trim(),
        contactNumber: document.getElementById('contact-number').value.trim(),
        email: document.getElementById('email').value.trim(),
        ownershipStatus: document.getElementById('ownership-status').value.trim(),
        homeownerSince: document.getElementById('homeowner-since').value.trim(),
        familyMembers: [...pendingFamilyMembers],
        vehicles: [...pendingVehicles]
      };

      const homeowners = getHomeowners();
      const previousHomeowner = editingHomeownerIndex !== null
        ? homeowners[editingHomeownerIndex]
        : null;
      const hasGeneratedRecord = Boolean(previousHomeowner && hasGeneratedHomeownerData(previousHomeowner));
      if (editingHomeownerIndex !== null && homeowners[editingHomeownerIndex]) {
        homeowners[editingHomeownerIndex] = homeowner;
      } else {
        homeowners.push(homeowner);
      }

      saveHomeowners(homeowners);
      if (hasGeneratedRecord) {
        const unitChanged = previousHomeowner.blockNo !== homeowner.blockNo ||
          previousHomeowner.lotNo !== homeowner.lotNo;
        if (unitChanged) removeDerivedHomeownerData([previousHomeowner]);
        syncDerivedHomeownerData([homeowner]);
      } else {
        removeDerivedHomeownerData([previousHomeowner, homeowner].filter(Boolean));
      }
      renderStoredHomeowners(editingHomeownerIndex !== null ? [editingHomeownerIndex] : []);
      closeModal();
    });
  }

  function bindRowEvents(row, detailRows) {
    const rows = Array.isArray(detailRows) ? detailRows : detailRows ? [detailRows] : [];
    const editBtn = row.querySelector('.edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        const homeowners = getHomeowners();
        const rowIndex = Number(row.dataset.index);
        if (Number.isInteger(rowIndex) && homeowners[rowIndex]) {
          editingHomeownerIndex = rowIndex;
          populateFormForEdit(homeowners[rowIndex]);
          openModal();
        }
      });
    }

    const deleteBtn = row.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        const homeowners = getHomeowners();
        const rowIndex = Number(row.dataset.index);
        const homeowner = homeowners[rowIndex];
        if (rowIndex >= 0 && homeowner) {
          if (!window.confirm('Are you sure you want to delete this homeowner?')) return;

          homeowners.splice(rowIndex, 1);
          saveHomeowners(homeowners);
          removeDerivedHomeownerData([homeowner]);
        }
        renderStoredHomeowners();
      });
    }

    const checkbox = row.querySelector('.row-checkbox');
    if (checkbox) {
      checkbox.addEventListener('change', () => {
        row.classList.toggle('selected', checkbox.checked);
        rows.forEach((detailRow) => {
          detailRow.hidden = !checkbox.checked;
        });
        updateBulkDeleteButton();
      });
    }
  }

  const selectAllCheckbox = document.getElementById('select-all');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', () => {
      tableBody.querySelectorAll('.row-checkbox').forEach((checkbox) => {
        checkbox.checked = selectAllCheckbox.checked;
        checkbox.dispatchEvent(new Event('change'));
      });
      updateBulkDeleteButton();
    });
  }

  if (deleteSelectedBtn) {
    deleteSelectedBtn.addEventListener('click', () => {
      const selectedIndexes = [...tableBody.querySelectorAll('.row-checkbox:checked')]
        .map((checkbox) => Number(checkbox.closest('tr')?.dataset.index))
        .filter((index) => Number.isInteger(index));
      if (selectedIndexes.length === 0) return;
      if (!window.confirm('Are you sure you want to delete the selected homeowners?')) return;

      const homeowners = getHomeowners();
      const selectedHomeowners = selectedIndexes
        .map((index) => homeowners[index])
        .filter(Boolean);
      selectedHomeowners.forEach((homeowner) => removeDerivedHomeownerData([homeowner]));
      const selectedSet = new Set(selectedIndexes);
      saveHomeowners(homeowners.filter((_, index) => !selectedSet.has(index)));
      renderStoredHomeowners();
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      renderStoredHomeowners();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (filterLotInput) filterLotInput.value = '';
      if (filterBlockInput) filterBlockInput.value = '';
      if (filterHomeownerInput) filterHomeownerInput.value = '';
      renderStoredHomeowners();
    });
  }

  [filterLotInput, filterBlockInput, filterHomeownerInput].forEach((input) => {
    if (!input) return;
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        renderStoredHomeowners();
      }
    });
  });

  renderFamilyMemberCards();
  renderVehicleCards();
  renderStoredHomeowners();

  const parseCsvLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current.trim());
    return values;
  };

  const normalizeImportKey = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

  const getImportRecordValue = (record, aliases) => {
    const normalized = Object.entries(record).reduce((acc, [key, value]) => {
      acc[normalizeImportKey(key)] = value;
      return acc;
    }, {});

    for (const alias of aliases) {
      const key = normalizeImportKey(alias);
      if (Object.prototype.hasOwnProperty.call(normalized, key)) {
        return normalized[key];
      }
    }

    return '';
  };

  const parseImportedHomeowners = (fileText, fileName) => {
    const lowerName = (fileName || '').toLowerCase();

    if (lowerName.endsWith('.json')) {
      const data = JSON.parse(fileText);
      const list = Array.isArray(data) ? data : Array.isArray(data.homeowners) ? data.homeowners : [];
      return list.map((item) => ({
        blockNo: item.blockNo || item.block || item['Block No.'] || '',
        lotNo: item.lotNo || item.lot || item['Lot No.'] || '',
        lotArea: item.lotArea || item['Lot Area'] || '',
        address: item.address || item['Address'] || '',
        firstName: item.firstName || item.firstname || item['First Name'] || '',
        middleName: item.middleName || item.middlename || item['Middle Name'] || '',
        lastName: item.lastName || item.lastname || item['Last Name'] || '',
        contactNumber: item.contactNumber || item.phone || item['Contact Number'] || '',
        email: item.email || item['Email'] || '',
        ownershipStatus: item.ownershipStatus || item['Ownership Status'] || '',
        homeownerSince: item.homeownerSince || item['Homeowner Since'] || '',
        familyMembers: Array.isArray(item.familyMembers) ? item.familyMembers : [],
        vehicles: Array.isArray(item.vehicles) ? item.vehicles : []
      }));
    }

    const lines = fileText.split(/\r?\n/).filter((line) => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]).map((header) => header.trim());
    const mappedRows = lines.slice(1).map((line) => {
      const rowValues = parseCsvLine(line);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = rowValues[index] || '';
      });
      return row;
    });

    return mappedRows
      .map((row) => {
        const record = {
          blockNo: getImportRecordValue(row, ['blockNo', 'Block No.', 'block', 'block number']),
          lotNo: getImportRecordValue(row, ['lotNo', 'Lot No.', 'lot', 'lot number']),
          lotArea: getImportRecordValue(row, ['lotArea', 'Lot Area']),
          address: getImportRecordValue(row, ['address', 'Address']),
          firstName: getImportRecordValue(row, ['firstName', 'First Name', 'firstname']),
          middleName: getImportRecordValue(row, ['middleName', 'Middle Name', 'middlename']),
          lastName: getImportRecordValue(row, ['lastName', 'Last Name', 'lastname']),
          contactNumber: getImportRecordValue(row, ['contactNumber', 'Contact Number', 'phone', 'contact']),
          email: getImportRecordValue(row, ['email', 'Email']),
          ownershipStatus: getImportRecordValue(row, ['ownershipStatus', 'Ownership Status']),
          homeownerSince: getImportRecordValue(row, ['homeownerSince', 'Homeowner Since', 'homeowner since'])
        };

        const hasAnyData = Object.values(record).some((value) => String(value).trim() !== '');
        if (!hasAnyData) return null;

        return {
          ...record,
          familyMembers: [],
          vehicles: []
        };
      })
      .filter(Boolean);
  };

  const ensureImportFileInput = () => {
    const existingInput = document.getElementById('homeowner-import-file-input');
    if (existingInput) return existingInput;

    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'homeowner-import-file-input';
    input.accept = '.csv,.json';
    input.hidden = true;
    input.addEventListener('change', async (event) => {
      const [file] = event.target.files || [];
      if (!file) return;

      try {
        const text = await file.text();
        const importedRows = parseImportedHomeowners(text, file.name);

        if (!importedRows.length) {
          window.alert('No valid homeowner data was found in the selected file.');
          return;
        }

        const currentHomeowners = getHomeowners();
        const mergedHomeowners = [...currentHomeowners, ...importedRows];
        saveHomeowners(mergedHomeowners);
        renderStoredHomeowners();
        window.alert(`${importedRows.length} homeowner record(s) imported successfully.`);
      } catch (error) {
        console.error('Import failed:', error);
        window.alert('The file could not be imported. Please check the CSV/JSON format and try again.');
      } finally {
        event.target.value = '';
      }
    });

    document.body.appendChild(input);
    return input;
  };

  if (importBtn) {
    importBtn.addEventListener('click', () => {
      const input = ensureImportFileInput();
      input.click();
    });
  }
  
  
});

