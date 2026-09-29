document.addEventListener('DOMContentLoaded', () => {
  const filterBtns = document.querySelectorAll('.pending-btn, .history-btn');
  const tabContents = document.querySelectorAll('.pending-header, .history-header');
  const tableBody = document.getElementById('credential-table-body');
  const filterLotInput = document.getElementById('filter-lot');
  const filterBlockInput = document.getElementById('filter-block');
  const filterHomeownerInput = document.getElementById('filter-homeowner');
  const searchBtn = document.getElementById('search-btn');
  const clearBtn = document.getElementById('clear-btn');
  const sendBtn = document.getElementById('send-btn');
  const downloadBtn = document.getElementById('download-btn');
  const deleteSelectedCredentialBtn = document.getElementById('delete-selected-credential-btn');
  const selectAllCheckbox = document.getElementById('select-all');

  // Modal 相關 DOM
  const letterModalOverlay = document.getElementById('letter-modal-overlay');
  const closeLetterBtn = document.getElementById('letter-modal-close-btn');
  const letterAddress = document.getElementById('letter-address');
  const letterName = document.getElementById('letter-name');
  const letterAccount = document.getElementById('letter-account');
  const letterPassword = document.getElementById('letter-password');
  const letterLoginQr = document.getElementById('letter-login-qr');

  const PENDING_KEY = 'casa-milan-account-credential-pending';
  const SENT_KEY = 'casa-milan-account-credential-sent';
  const PENDING_INITIALIZED_KEY = 'casa-milan-account-credential-pending-initialized';

  const normalizeText = (value) => String(value ?? '').trim().toLowerCase();

  const readListFromStorage = (key) => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  };

  const writeListToStorage = (key, list) => {
    localStorage.setItem(key, JSON.stringify(list));
  };

  const getHomeowners = () => readListFromStorage('casa-milan-homeowners');

  const ensurePendingRecords = () => {
    const isInitialized = localStorage.getItem(PENDING_INITIALIZED_KEY) === 'true';
    let pendingRecords = readListFromStorage(PENDING_KEY);

    if (!isInitialized && localStorage.getItem(PENDING_KEY) === null) {
      const credentialRecords = readListFromStorage('casa-milan-account-credential-records');
      pendingRecords = credentialRecords;
      writeListToStorage(PENDING_KEY, pendingRecords);
      localStorage.setItem(PENDING_INITIALIZED_KEY, 'true');
    }

    return pendingRecords.filter((record) => record.role !== 'Family Member');
  };

  const getSentRecords = () => readListFromStorage(SENT_KEY)
    .filter((record) => record.role !== 'Family Member');

  const updateBulkDeleteButton = () => {
    if (deleteSelectedCredentialBtn) {
      deleteSelectedCredentialBtn.hidden = !tableBody.querySelector('.row-checkbox:checked');
    }
  };

  const setActiveTab = (tabName) => {
    const isPendingTab = tabName === 'pending';

    if (sendBtn) sendBtn.hidden = !isPendingTab;

    filterBtns.forEach((btn) => {
      const isPendingBtn = btn.classList.contains('pending-btn');
      btn.classList.toggle('active', isPendingTab ? isPendingBtn : !isPendingBtn);
    });

    tabContents.forEach((content) => {
      const contentId = content.id || '';
      const shouldShow = isPendingTab ? contentId === 'pending-header' : contentId === 'history-header';
      content.classList.toggle('active', shouldShow);
    });

    renderAccountNoticeRecords();
  };

  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target || '';
      const nextTab = target === 'history-header' ? 'sent' : 'pending';
      setActiveTab(nextTab);
    });
  });

  const getFamilyMembersForRepresentative = (entry) => {
    const homeowners = getHomeowners();
    const matched = homeowners.find((homeowner) => {
      return homeowner.blockNo === entry.blockNo && homeowner.lotNo === entry.lotNo;
    });

    return Array.isArray(matched?.familyMembers) ? matched.familyMembers : [];
  };

  const renderFamilyMemberRows = (familyMembers, parentAddress) => {
    if (!familyMembers || familyMembers.length === 0) return [];

    return familyMembers.map((member) => {
      const row = document.createElement('tr');
      row.className = 'family-member-row';
      row.hidden = true;
      const fullName = [member.firstName, member.middleName, member.lastName].filter(Boolean).join(' ') || 'Family Member';
      
      row.dataset.name = fullName;
      row.dataset.address = parentAddress || '';

      row.innerHTML = `
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td>${member.firstName || ''}</td>
        <td>${member.middleName || ''}</td>
        <td>${member.lastName || ''}</td>
        <td>${member.email || ''}</td>
        <td>${member.createdAt ? new Date(member.createdAt).toLocaleString() : ''}</td>
        <td>Family Member</td>
        <td class="action-cell">
          <button type="button" class="action-icon-btn view-btn" title="View">
            <i class="ri-eye-line"></i>
          </button>
          <button type="button" class="action-icon-btn delete-btn" title="Delete">
            <i class="ri-delete-bin-line"></i>
          </button>
        </td>
      `;
      return row;
    });
  };

  const saveCurrentTabEntries = (nextEntries) => {
    const isPendingTab = document.querySelector('.pending-btn')?.classList.contains('active') ?? true;
    if (isPendingTab) {
      writeListToStorage(PENDING_KEY, nextEntries);
      writeListToStorage('casa-milan-account-credential-records', nextEntries);
    } else {
      writeListToStorage(SENT_KEY, nextEntries);
    }
  };

  const renderAccountNoticeRecords = () => {
    if (!tableBody) return;

    const isPendingTab = document.querySelector('.pending-btn')?.classList.contains('active') ?? true;
    const entries = (isPendingTab ? ensurePendingRecords() : getSentRecords())
      .filter((entry) => entry.role !== 'Family Member');
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

    tableBody.innerHTML = '';

    filtered.forEach((entry, index) => {
      const actualIndex = entries.indexOf(entry);
      const representativeRow = document.createElement('tr');
      representativeRow.className = 'representative-row';
      representativeRow.dataset.sourceIndex = String(actualIndex);

      const fullName = [entry.firstName, entry.middleName, entry.lastName].filter(Boolean).join(' ') || 'Resident';
      const address = entry.address || `Block ${entry.blockNo || ''} Lot ${entry.lotNo || ''}`;

      // 將資料存入 row dataset，便於 View 彈窗精準讀取
      representativeRow.dataset.name = fullName;
      representativeRow.dataset.address = address;

      representativeRow.innerHTML = `
        <td><input type="checkbox" class="row-checkbox" data-source-index="${actualIndex}" /></td>
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
          <button type="button" class="action-icon-btn delete-btn" title="Delete">
            <i class="ri-delete-bin-line"></i>
          </button>
          <button type="button" class="action-icon-btn view-btn" title="View">
            <i class="ri-eye-line"></i>
          </button>
        </td>
      `;

      const checkbox = representativeRow.querySelector('.row-checkbox');
      const deleteBtn = representativeRow.querySelector('.delete-btn');

      if (checkbox) {
        checkbox.addEventListener('change', () => {
          if (selectAllCheckbox) {
            const checkedCount = tableBody.querySelectorAll('.row-checkbox:checked').length;
            const totalCount = tableBody.querySelectorAll('.row-checkbox').length;
            selectAllCheckbox.checked = totalCount > 0 && checkedCount === totalCount;
          }
          updateBulkDeleteButton();
        });
      }

      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          const currentEntries = isPendingTab ? ensurePendingRecords() : getSentRecords();
          const sourceIndex = Number(representativeRow.dataset.sourceIndex);
          const nextEntries = currentEntries.filter((_, idx) => idx !== sourceIndex);
          saveCurrentTabEntries(nextEntries);
          renderAccountNoticeRecords();
        });
      }

      tableBody.appendChild(representativeRow);
    });

    if (selectAllCheckbox) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.onchange = () => {
        const rowCheckboxes = tableBody.querySelectorAll('.row-checkbox');
        rowCheckboxes.forEach((checkboxElement) => {
          checkboxElement.checked = selectAllCheckbox.checked;
        });
        updateBulkDeleteButton();
      };
    }
    updateBulkDeleteButton();
  };

  // 【核心功能 1】：點擊 View 按鈕彈出信件並同步 Address 與 Name
  if (tableBody) {
    tableBody.addEventListener('click', (e) => {
      const viewBtn = e.target.closest('.view-btn');
      if (!viewBtn) return;

      const row = viewBtn.closest('tr');
      const targetName = row.dataset.name || 'Resident';
      const targetAddress = row.dataset.address || 'Casa Milan, QC';

      // 同步寫入 Modal 內容
      if (letterName) letterName.textContent = targetName;
      if (letterAddress) letterAddress.textContent = targetAddress;

      // 產生模擬專屬帳號 (例如依據姓名縮寫或隨機產生)
      const mockAccount = 'CM' + Math.floor(100000 + Math.random() * 900000);
      const mockPass = 'pass' + Math.floor(1000 + Math.random() * 9000);
      if (letterAccount) letterAccount.textContent = mockAccount;
      if (letterPassword) letterPassword.textContent = mockPass;

      // 更新 Login QR Code 內容
      if (letterLoginQr) {
        letterLoginQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=ACCOUNT:${mockAccount},PASS:${mockPass}`;
      }

      // 開啟彈窗
      if (letterModalOverlay) {
        letterModalOverlay.style.display = 'flex';
        letterModalOverlay.style.pointerEvents = 'auto';
      }
    });
  }

  // 【核心功能 2】：關閉彈窗
  const closeLetterModal = () => {
    if (letterModalOverlay) {
      letterModalOverlay.style.display = 'none';
      letterModalOverlay.style.pointerEvents = 'none';
    }
  };

  if (closeLetterBtn) {
    closeLetterBtn.addEventListener('click', closeLetterModal);
  }

  if (downloadBtn) {
    downloadBtn.addEventListener('click', async () => {
      if (!window.html2canvas || !window.jspdf?.jsPDF) {
        window.alert('PDF download is unavailable until the PDF libraries finish loading.');
        return;
      }

      const letterCard = document.querySelector('.credentials-card');
      if (!letterCard) return;

      if (letterModalOverlay?.style.display !== 'flex') {
        const selectedRow = tableBody.querySelector('.row-checkbox:checked')?.closest('tr');
        if (!selectedRow) {
          window.alert('Please select a credential record or open its letter before downloading.');
          return;
        }

        if (letterName) letterName.textContent = selectedRow.dataset.name || 'Resident';
        if (letterAddress) letterAddress.textContent = selectedRow.dataset.address || 'Casa Milan, QC';
        const account = 'CM' + Math.floor(100000 + Math.random() * 900000);
        const password = 'pass' + Math.floor(1000 + Math.random() * 9000);
        if (letterAccount) letterAccount.textContent = account;
        if (letterPassword) letterPassword.textContent = password;
        if (letterLoginQr) {
          letterLoginQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=ACCOUNT:${account},PASS:${password}`;
        }
        if (letterModalOverlay) {
          letterModalOverlay.style.display = 'flex';
          letterModalOverlay.style.pointerEvents = 'auto';
        }
      }

      const closeButton = letterCard.querySelector('.letter-close-btn');
      if (closeButton) closeButton.style.visibility = 'hidden';

      try {
        const canvas = await window.html2canvas(letterCard, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true
        });
        const pdf = new window.jspdf.jsPDF({
          orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save('account-credentials-letter.pdf');
      } catch (error) {
        window.alert('The credential letter could not be downloaded.');
      } finally {
        if (closeButton) closeButton.style.visibility = '';
      }
    });
  }

  if (letterModalOverlay) {
    letterModalOverlay.addEventListener('click', (e) => {
      if (e.target === letterModalOverlay) {
        closeLetterModal();
      }
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      const pendingRecords = ensurePendingRecords();
      const selectedIndexMap = [...tableBody.querySelectorAll('.row-checkbox:checked')].map((checkbox) =>
        Number(checkbox.dataset.sourceIndex)
      );
      const selectedRecords = selectedIndexMap.map((sourceIndex) => pendingRecords[sourceIndex]).filter(Boolean);

      if (!selectedRecords.length) {
        window.alert('Please select at least one pending record before sending.');
        return;
      }

      const remainingPending = pendingRecords.filter((_, index) => !selectedIndexMap.includes(index));
      const sentRecords = getSentRecords();
      const movedRecords = selectedRecords.map((record) => ({
        ...record,
        sentAt: new Date().toISOString(),
        status: 'Sent'
      }));

      writeListToStorage(PENDING_KEY, remainingPending);
      writeListToStorage('casa-milan-account-credential-records', remainingPending);
      writeListToStorage(SENT_KEY, [...movedRecords, ...sentRecords]);
      localStorage.setItem(PENDING_INITIALIZED_KEY, 'true');

      renderAccountNoticeRecords();
    });
  }

  if (deleteSelectedCredentialBtn) {
    deleteSelectedCredentialBtn.addEventListener('click', () => {
      const isPendingTab = document.querySelector('.pending-btn')?.classList.contains('active') ?? true;
      const currentEntries = isPendingTab ? ensurePendingRecords() : getSentRecords();
      const selectedIndexes = [...tableBody.querySelectorAll('.row-checkbox:checked')]
        .map((checkbox) => Number(checkbox.dataset.sourceIndex));
      if (selectedIndexes.length === 0) return;
      if (!window.confirm('Are you sure you want to delete the selected credential records?')) return;

      const selectedSet = new Set(selectedIndexes);
      saveCurrentTabEntries(currentEntries.filter((_, index) => !selectedSet.has(index)));
      renderAccountNoticeRecords();
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener('click', renderAccountNoticeRecords);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (filterLotInput) filterLotInput.value = '';
      if (filterBlockInput) filterBlockInput.value = '';
      if (filterHomeownerInput) filterHomeownerInput.value = '';
      renderAccountNoticeRecords();
    });
  }

  [filterLotInput, filterBlockInput, filterHomeownerInput].forEach((input) => {
    if (!input) return;
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        renderAccountNoticeRecords();
      }
    });
  });

  window.addEventListener('storage', (event) => {
    if ([PENDING_KEY, SENT_KEY, 'casa-milan-account-credential-records'].includes(event.key)) {
      renderAccountNoticeRecords();
    }
  });

  setActiveTab('pending');
});