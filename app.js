/**
 * TM-FAILURE ANALYSIS AND SURVEILLANCE TOOL
 * High-performance Track Machine Surveillance, MTTR & Repetitive Failure Analytics
 * Indian Railways / SWR Specialized Track Machine Maintenance Module
 */

(function () {
  'use strict';

  // Available Categories (as specified, supporting both RBMV and RMBV)
  const MACHINE_CATEGORIES = [
    'CSM', 'DTE', 'DUO', 'UNI/PCTM', 'MPT', 'BCM', 'SBCM/FRM',
    'BRM', 'SQRS', 'T28', 'DGS', 'UTV', 'RBMV', 'RMBV', 'MDU'
  ];

  // Helper: check if machine or category belongs to Crane-equipped fleet (UTV / RBMV / RMBV)
  function isCraneMachine(identifier) {
    if (!identifier) return false;
    const str = String(identifier).trim().toUpperCase();
    return str === 'UTV' || str === 'RBMV' || str === 'RMBV' || 
           str.startsWith('UTV') || str.startsWith('RBMV') || str.startsWith('RMBV');
  }

  // Default SWR Machine Fleet Mapping (Exclusively the 19 authentic machines from SWR divisional folders)
  const DEFAULT_FLEET_DIRECTORY = {
    'CSM': [
      { id: 'CSM-945', model: '09-32 CSM Continuous Action Tamper', division: 'UBL', depot: 'UBL', year: 2016, status: 'FIT' }
    ],
    'DTE': [],
    'DUO': [
      { id: 'DUO-8112', model: '08-32 Duomatic Track Tamper', division: 'SBC', depot: 'SBC', year: 2015, status: 'FIT' },
      { id: 'DUO-3324', model: '08-32 Duomatic Track Tamper', division: 'MYS', depot: 'MYS', year: 2014, status: 'FIT' },
      { id: 'DUO-8128', model: '08-32 Duomatic Tamper (Ex-UBL)', division: 'MYS', depot: 'SKLR', year: 2016, status: 'FIT' }
    ],
    'UNI/PCTM': [
      { id: 'UNIMAT-8269', model: 'Unimat 08-475 4S Points & Crossing Tamper', division: 'SBC', depot: 'YPR / BYPL', year: 2017, status: 'FIT' }
    ],
    'MPT': [
      { id: 'MPT-12015', model: 'Multi-Purpose Tamper 12015', division: 'SBC', depot: 'KJM', year: 2019, status: 'FIT' },
      { id: 'MPT-12008', model: 'Multi-Purpose Tamper 12008', division: 'UBL', depot: 'UBL', year: 2020, status: 'FIT' },
      { id: 'MPT-56577', model: 'Multi-Purpose Tamper 56577', division: 'UBL', depot: 'BAY', year: 2021, status: 'FIT' },
      { id: 'MPT-56944', model: 'Multi-Purpose Tamper 56944', division: 'UBL', depot: 'BJP', year: 2022, status: 'FIT' }
    ],
    'BCM': [
      { id: 'BCM-351', model: 'RM-80 Ballast Cleaning Machine', division: 'UBL', depot: 'UBL', year: 2015, status: 'FIT' },
      { id: 'BCM-400', model: 'RM-80 High Output Ballast Cleaner', division: 'UBL', depot: 'UBL', year: 2018, status: 'FIT' },
      { id: 'BCM-56824', model: 'RM-80 Ballast Cleaning Machine 56824', division: 'SBC', depot: 'SBC / BYPL', year: 2021, status: 'FIT' }
    ],
    'SBCM/FRM': [
      { id: 'FRM-1889', model: 'Formation Rehabilitation Machine FRM-80', division: 'MYS', depot: 'MYS', year: 2016, status: 'FIT' },
      { id: 'FRM-1899', model: 'Formation Rehabilitation Machine FRM-80', division: 'UBL', depot: 'HPT', year: 2017, status: 'FIT' },
      { id: 'FRM-57160', model: 'Shoulder Ballast Cleaning Machine', division: 'UBL', depot: 'UBL', year: 2021, status: 'FIT' }
    ],
    'BRM': [],
    'SQRS': [
      { id: 'SQRS-7&8', model: 'Semi Quick Relaying System 7&8', division: 'SBC', depot: 'BYPL', year: 2018, status: 'FIT' }
    ],
    'T28': [],
    'DGS': [],
    'UTV': [
      { id: 'UTV-001', model: 'Utility Track Vehicle UTV-001', division: 'UBL', depot: 'UBL', year: 2018, status: 'FIT' },
      { id: 'UTV-002', model: 'Utility Track Vehicle UTV-002', division: 'SBC', depot: 'SBC', year: 2017, status: 'FIT' }
    ],
    'RBMV': [
      { id: 'RBMV-006', model: 'Rail Borne Maintenance Vehicle RBMV-006', division: 'SBC', depot: 'SBC', year: 2025, status: 'FIT' }
    ],
    'RMBV': [
      { id: 'RBMV-006', model: 'Rail Borne Maintenance Vehicle RBMV-006', division: 'SBC', depot: 'SBC', year: 2025, status: 'FIT' }
    ],
    'MDU': [
      { id: 'MDU-57218', model: 'Mobile Diagnostic Unit 57218', division: 'UBL', depot: 'UBL', year: 2023, status: 'FIT' },
      { id: 'MDU-57220', model: 'Mobile Diagnostic Unit 57220', division: 'UBL', depot: 'UBL', year: 2023, status: 'FIT' },
      { id: 'MDU-57222', model: 'Mobile Diagnostic Unit 57222', division: 'UBL', depot: 'UBL', year: 2023, status: 'FIT' }
    ]
  };

  let FLEET_DIRECTORY = (typeof window !== 'undefined' && window.REAL_SWR_FLEET_DATA && window.REAL_SWR_FLEET_DATA.fleetDirectory)
    ? JSON.parse(JSON.stringify(window.REAL_SWR_FLEET_DATA.fleetDirectory))
    : JSON.parse(JSON.stringify(DEFAULT_FLEET_DIRECTORY));

  // Authentic Initial Failures
  const INITIAL_FAILURES = (typeof window !== 'undefined' && window.REAL_SWR_FLEET_DATA && window.REAL_SWR_FLEET_DATA.failures)
    ? window.REAL_SWR_FLEET_DATA.failures
    : [];

  // Local Storage Keys (v12 authentic fleet with UTV-002, RBMV-006 & BCM-56824)
  const STORAGE_KEY = 'TM_FAILURE_SURVEILLANCE_DATA_V12_SBC_ALL';
  const FLEET_STORAGE_KEY = 'TM_FAILURE_FLEET_DIRECTORY_V12_SBC_ALL';
  const HRM_STORAGE_KEY = 'TM_HRM_DATA_V6_SBC_ALL';

  // History Register Module (HRM) Data Store
  let HRM_DATA = {};

  // The 16 Canonical SWR Track Machine History Register Items
  const CANONICAL_HRM_ITEMS = [
    { itemNum: "1", title: "LAST IOH DETAILS" },
    { itemNum: "2", title: "LAST POH DETAILS" },
    { itemNum: "3", title: "ENGINE MAKE & LAST REPLACED" },
    { itemNum: "4", title: "LAST TAMPING BANKS REPLACED" },
    { itemNum: "5", title: "LAST BATTERIES REPLACED" },
    { itemNum: "6", title: "LAST SELF STARTER REPLACED" },
    { itemNum: "7", title: "LAST ALTERNATOR REPLACED" },
    { itemNum: "8", title: "LAST BATTERIES REPLACED (SET 2)" },
    { itemNum: "9", title: "LAST DIESEL TANK CLEANED" },
    { itemNum: "10", title: "LAST HYD OIL TANK CLEANED" },
    { itemNum: "11", title: "LAST AIR COMPRESSOR REPLACED" },
    { itemNum: "12", title: "LAST ENGINE SERVICE ENGINEER REPORTED" },
    { itemNum: "13", title: "LAST SERVICE ENGINEER (FOR MACHINE) REPORTED" },
    { itemNum: "14", title: "LAST ZF REPLACED" },
    { itemNum: "15", title: "LAST AXLE/AXLE GEAR BOX REPLACED" },
    { itemNum: "16", title: "ANY OTHER UNSCHEDULED REPAIR" }
  ];

  // Divisional Colors Mapping (SBC Blue, MYS Green, UBL Maroon)
  const DIVISION_COLORS = {
    'SBC': { color: '#2563eb', light: '#60a5fa', name: 'Bengaluru (SBC)' },
    'MYS': { color: '#16a34a', light: '#4ade80', name: 'Mysuru (MYS)' },
    'UBL': { color: '#800000', light: '#f87171', name: 'Hubballi (UBL)' }
  };

  // State Management
  const AppState = {
    failures: [],
    selectedCategory: 'UNI/PCTM', // Default to Unimat
    selectedMachine: 'UNIMAT-8269', // Default to active machine so HRM is immediately rendered!
    selectedDivision: 'ALL',      // Division Filter: ALL, SBC, MYS, UBL
    activeTab: 'hrm-view',        // TAB 1: History Register Module (HRM) as requested!
    searchQuery: '',
    statusFilter: 'ALL',
    subsystemFilter: 'ALL',
    charts: {}
  };

  // Initialization
  function initApp() {
    loadDataset();
    setupCategoryPills();
    updateMachineDropdown();
    setupEventListeners();
    renderAll();
    // Pre-warm SheetJS in background
    if (typeof ensureXLSX === 'function') {
      ensureXLSX().catch(e => console.warn('Pre-warming SheetJS deferred:', e));
    }
  }

  // Helper: Find machine info by ID
  function getMachineInfo(mId) {
    if (!mId) return null;
    for (let c of Object.keys(FLEET_DIRECTORY)) {
      const found = FLEET_DIRECTORY[c].find(x => x.id.toUpperCase() === mId.toUpperCase());
      if (found) return found;
    }
    if (typeof window !== 'undefined' && window.REAL_SWR_FLEET_DATA && window.REAL_SWR_FLEET_DATA.machines) {
      const found = window.REAL_SWR_FLEET_DATA.machines.find(x => x.id.toUpperCase() === mId.toUpperCase());
      if (found) return found;
    }
    return null;
  }

  // Load from LocalStorage or Official SWR Fleet Database
  function loadDataset() {
    try {
      // Clean legacy cache from previous iterations
      [
        'TM_FAILURE_SURVEILLANCE_DATA', 'TM_FAILURE_SURVEILLANCE_DATA_V2', 
        'TM_FAILURE_SURVEILLANCE_DATA_V3', 'TM_FAILURE_SURVEILLANCE_DATA_V4', 
        'TM_FAILURE_SURVEILLANCE_DATA_V5_STRICT_FLEET', 'TM_FAILURE_FLEET_DIRECTORY_V5_STRICT',
        'TM_FAILURE_SURVEILLANCE_DATA_V6_STRICT_FLEET', 'TM_FAILURE_FLEET_DIRECTORY_V6_STRICT',
        'TM_FAILURE_SURVEILLANCE_DATA_V7_STRICT_FLEET', 'TM_FAILURE_FLEET_DIRECTORY_V7_STRICT',
        'TM_FAILURE_SURVEILLANCE_DATA_V8_CRANE_FLEET', 'TM_FAILURE_FLEET_DIRECTORY_V8_CRANE',
        'TM_FAILURE_SURVEILLANCE_DATA_V9_CRANE_FLEET', 'TM_FAILURE_FLEET_DIRECTORY_V9_CRANE',
        'TM_FAILURE_SURVEILLANCE_DATA_V10_RBMV_UTV2', 'TM_FAILURE_FLEET_DIRECTORY_V10_RBMV_UTV2',
        'TM_HRM_DATA_V1', 'TM_HRM_DATA_V2', 'TM_HRM_DATA_V3', 'TM_HRM_DATA_V5_RBMV_UTV2'
      ].forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });

      const storedFleet = localStorage.getItem(FLEET_STORAGE_KEY);
      if (storedFleet) {
        FLEET_DIRECTORY = JSON.parse(storedFleet);
      } else if (typeof window !== 'undefined' && window.REAL_SWR_FLEET_DATA && window.REAL_SWR_FLEET_DATA.fleetDirectory) {
        FLEET_DIRECTORY = JSON.parse(JSON.stringify(window.REAL_SWR_FLEET_DATA.fleetDirectory));
      } else {
        FLEET_DIRECTORY = JSON.parse(JSON.stringify(DEFAULT_FLEET_DIRECTORY));
      }

      // Always guarantee canonical machines from DEFAULT_FLEET_DIRECTORY exist
      Object.keys(DEFAULT_FLEET_DIRECTORY).forEach(cat => {
        if (!FLEET_DIRECTORY[cat]) FLEET_DIRECTORY[cat] = [];
        DEFAULT_FLEET_DIRECTORY[cat].forEach(defM => {
          if (!FLEET_DIRECTORY[cat].some(m => m.id === defM.id)) {
            FLEET_DIRECTORY[cat].push(JSON.parse(JSON.stringify(defM)));
          }
        });
      });

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        AppState.failures = JSON.parse(stored);
      } else if (typeof window !== 'undefined' && window.REAL_SWR_FLEET_DATA && window.REAL_SWR_FLEET_DATA.failures && window.REAL_SWR_FLEET_DATA.failures.length > 0) {
        AppState.failures = JSON.parse(JSON.stringify(window.REAL_SWR_FLEET_DATA.failures));
        saveDataset();
      } else {
        AppState.failures = JSON.parse(JSON.stringify(INITIAL_FAILURES));
        saveDataset();
      }

      // Guarantee any missing authentic machine failures are included
      if (typeof window !== 'undefined' && window.REAL_SWR_FLEET_DATA && window.REAL_SWR_FLEET_DATA.failures) {
        ['UTV-002', 'RBMV-006', 'BCM-56824'].forEach(mId => {
          const hasMachine = AppState.failures.some(f => f.machineNo === mId);
          if (!hasMachine) {
            const mFails = window.REAL_SWR_FLEET_DATA.failures.filter(f => f.machineNo === mId);
            if (mFails.length > 0) {
              AppState.failures = AppState.failures.concat(JSON.parse(JSON.stringify(mFails)));
            }
          }
        });
      }

      // Load authentic HRM data (History Register Module)
      const storedHrm = localStorage.getItem(HRM_STORAGE_KEY);
      if (storedHrm) {
        HRM_DATA = JSON.parse(storedHrm);
      } else if (typeof window !== 'undefined' && window.REAL_SWR_FLEET_DATA && window.REAL_SWR_FLEET_DATA.historyRegisters) {
        HRM_DATA = JSON.parse(JSON.stringify(window.REAL_SWR_FLEET_DATA.historyRegisters));
        saveHrmData();
      }

      // Guarantee HRM data for UTV-002, RBMV-006, and BCM-56824 is present
      if (typeof window !== 'undefined' && window.REAL_SWR_FLEET_DATA && window.REAL_SWR_FLEET_DATA.historyRegisters) {
        ['UTV-002', 'RBMV-006', 'BCM-56824'].forEach(mId => {
          if (!HRM_DATA[mId] && window.REAL_SWR_FLEET_DATA.historyRegisters[mId]) {
            HRM_DATA[mId] = JSON.parse(JSON.stringify(window.REAL_SWR_FLEET_DATA.historyRegisters[mId]));
          }
        });
      }

      // Sanitize remarks to ensure "NA" if empty, whitespace, hyphen, or literal "no"
      AppState.failures.forEach(f => {
        if (!f.remarks || f.remarks.trim() === '' || f.remarks.trim() === '-' || /^(no|nil)$/i.test(f.remarks.trim())) {
          f.remarks = 'NA';
        }
      });

      if (typeof HRM_DATA === 'object') {
        Object.keys(HRM_DATA).forEach(mId => {
          if (HRM_DATA[mId] && HRM_DATA[mId].items) {
            HRM_DATA[mId].items.forEach(it => {
              if (!it.presentRemarks || it.presentRemarks.trim() === '' || it.presentRemarks.trim() === '-' || /^(no|nil)$/i.test(it.presentRemarks.trim())) {
                it.presentRemarks = 'NA';
              }
              if (it.records && Array.isArray(it.records)) {
                it.records.forEach(r => {
                  if (!r.remarks || r.remarks.trim() === '' || r.remarks.trim() === '-' || /^(no|nil)$/i.test(r.remarks.trim())) {
                    r.remarks = 'NA';
                  }
                });
              }
            });
          }
        });
      }
    } catch (e) {
      console.error('Failed to load stored failure data, falling back:', e);
      if (typeof window !== 'undefined' && window.REAL_SWR_FLEET_DATA && window.REAL_SWR_FLEET_DATA.failures) {
        AppState.failures = JSON.parse(JSON.stringify(window.REAL_SWR_FLEET_DATA.failures));
      } else {
        AppState.failures = JSON.parse(JSON.stringify(INITIAL_FAILURES));
      }
    }

    // Run repetitive failure classification algorithm
    classifyRepetitiveFailures(AppState.failures);
  }

  function saveDataset() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState.failures));
      localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(FLEET_DIRECTORY));
    } catch (e) {
      console.error('Error saving data to localStorage:', e);
    }
  }

  function saveHrmData() {
    try {
      localStorage.setItem(HRM_STORAGE_KEY, JSON.stringify(HRM_DATA));
    } catch (e) {
      console.error('Error saving HRM data to localStorage:', e);
    }
  }

  // Repetitive Failure Surveillance Algorithm
  function classifyRepetitiveFailures(list) {
    // Sort chronologically
    list.sort((a, b) => {
      const ta = new Date(a.breakdownTime || a.dateOfFailure || 0).getTime();
      const tb = new Date(b.breakdownTime || b.dateOfFailure || 0).getTime();
      return ta - tb;
    });

    const machineMap = {};

    list.forEach(f => {
      const mId = f.machineNo;
      if (!machineMap[mId]) machineMap[mId] = [];
      machineMap[mId].push(f);
    });

    // Check each machine's incidents for repeats within 60 days
    Object.keys(machineMap).forEach(mId => {
      const records = machineMap[mId];
      for (let i = 0; i < records.length; i++) {
        let repeatCount = records[i].isRepetitive ? (records[i].repeatCount || 2) : 1;
        const rawTimeI = records[i].breakdownTime || records[i].dateOfFailure;
        const curDate = rawTimeI ? new Date(rawTimeI).getTime() : 0;

        if (curDate > 0) {
          for (let j = 0; j < i; j++) {
            const rawTimeJ = records[j].breakdownTime || records[j].dateOfFailure;
            const prevDate = rawTimeJ ? new Date(rawTimeJ).getTime() : 0;
            if (prevDate > 0) {
              const daysDiff = (curDate - prevDate) / (1000 * 60 * 60 * 24);

              // If within 60 days and same subsystem or similar component
              if (daysDiff >= 0 && daysDiff <= 60) {
                const sameSub = (records[i].subsystem || '').toLowerCase() === (records[j].subsystem || '').toLowerCase();
                const compMatch = (records[i].component || '').toLowerCase().includes((records[j].component || '').toLowerCase()) ||
                                 (records[j].component || '').toLowerCase().includes((records[i].component || '').toLowerCase());

                if (sameSub || compMatch) {
                  repeatCount++;
                }
              }
            }
          }
        }

        if (repeatCount > 1 || records[i].isRepetitive) {
          records[i].isRepetitive = true;
          records[i].repeatCount = Math.max(repeatCount, records[i].repeatCount || 2);
        }
      }
    });
  }

  // Setup Category Pills in Top Navigation Bar
  function setupCategoryPills() {
    const container = document.getElementById('categoryScrollContainer');
    if (!container) return;

    container.innerHTML = '';

    // "ALL CATEGORIES" pill
    const allPill = document.createElement('button');
    allPill.className = `category-pill ${AppState.selectedCategory === 'ALL' ? 'active' : ''}`;
    allPill.setAttribute('data-category', 'ALL');
    const allCount = AppState.failures.length;
    allPill.innerHTML = `<span>⚡ FLEET OVERVIEW</span><span class="pill-badge">${allCount}</span>`;
    allPill.addEventListener('click', () => selectCategory('ALL'));
    container.appendChild(allPill);

    // Each Category Pill
    MACHINE_CATEGORIES.forEach(cat => {
      const pill = document.createElement('button');
      pill.className = `category-pill ${AppState.selectedCategory === cat ? 'active' : ''}`;
      pill.setAttribute('data-category', cat);

      const count = AppState.failures.filter(f => {
        if (cat === 'RBMV' || cat === 'RMBV') {
          return f.category === 'RBMV' || f.category === 'RMBV';
        }
        return f.category === cat;
      }).length;
      pill.innerHTML = `<span>${cat}</span><span class="pill-badge">${count}</span>`;
      pill.addEventListener('click', () => selectCategory(cat));
      container.appendChild(pill);
    });
  }

  // Select Category Handler
  function selectCategory(category) {
    AppState.selectedCategory = category;

    // Auto-select first machine in category if available, so HRM & subsystem tabs stay focused
    if (category !== 'ALL' && FLEET_DIRECTORY[category] && FLEET_DIRECTORY[category].length > 0) {
      AppState.selectedMachine = FLEET_DIRECTORY[category][0].id;
    } else if (category === 'ALL') {
      AppState.selectedMachine = 'UNIMAT-8269';
    } else {
      AppState.selectedMachine = 'ALL';
    }

    // Update active class on pills
    document.querySelectorAll('.category-pill').forEach(pill => {
      if (pill.getAttribute('data-category') === category) {
        pill.classList.add('active');
        pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else {
        pill.classList.remove('active');
      }
    });

    updateMachineDropdown();
    renderAll();
  }

  // Select Division Handler (SBC Blue, MYS Green, UBL Maroon)
  function selectDivision(div) {
    AppState.selectedDivision = div;

    // Reset button styles
    const allBtn = document.getElementById('divBtnAll');
    const sbcBtn = document.getElementById('divBtnSBC');
    const mysBtn = document.getElementById('divBtnMYS');
    const ublBtn = document.getElementById('divBtnUBL');

    [allBtn, sbcBtn, mysBtn, ublBtn].forEach(b => {
      if (b) b.className = 'div-filter-btn';
    });

    if (div === 'ALL' && allBtn) allBtn.className = 'div-filter-btn active-all';
    if (div === 'SBC' && sbcBtn) sbcBtn.className = 'div-filter-btn active-sbc';
    if (div === 'MYS' && mysBtn) mysBtn.className = 'div-filter-btn active-mys';
    if (div === 'UBL' && ublBtn) ublBtn.className = 'div-filter-btn active-ubl';

    renderAll();
  }

  // Update Machine Dropdown when category changes
  function updateMachineDropdown() {
    const select = document.getElementById('machineSelect');
    if (!select) return;

    select.innerHTML = '';

    // Option for all machines in category
    const defaultOpt = document.createElement('option');
    defaultOpt.value = 'ALL';
    defaultOpt.textContent = AppState.selectedCategory === 'ALL' 
      ? '🌐 All Fleet Machines (Entire Fleet)' 
      : `📋 All Machines in ${AppState.selectedCategory}`;
    select.appendChild(defaultOpt);

    // Gather machines
    let machineList = [];
    if (AppState.selectedCategory === 'ALL') {
      Object.keys(FLEET_DIRECTORY).forEach(c => {
        machineList = machineList.concat(FLEET_DIRECTORY[c]);
      });
    } else if (FLEET_DIRECTORY[AppState.selectedCategory]) {
      machineList = FLEET_DIRECTORY[AppState.selectedCategory];
    }

    // Add extra machines found in failure history not in directory
    AppState.failures.forEach(f => {
      if (AppState.selectedCategory === 'ALL' || f.category === AppState.selectedCategory) {
        if (!machineList.some(m => m.id === f.machineNo)) {
          machineList.push({
            id: f.machineNo,
            model: f.category + ' Special',
            division: f.division || 'SBC',
            depot: 'Track Base',
            year: 2020,
            status: f.status
          });
        }
      }
    });

    if (AppState.selectedCategory !== 'ALL' && machineList.length === 0) {
      const emptyOpt = document.createElement('option');
      emptyOpt.value = 'NONE';
      emptyOpt.textContent = `⚠️ No machines registered in ${AppState.selectedCategory} (Upload history sheet to register)`;
      emptyOpt.disabled = true;
      select.appendChild(emptyOpt);
    } else {
      machineList.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        const fails = AppState.failures.filter(f => f.machineNo === m.id);
        const isUnderRepair = fails.some(f => f.status === 'UNDER REPAIR');
        const hasRepeat = fails.some(f => f.isRepetitive);
        
        let statusIcon = isUnderRepair ? '⚠️ [UNDER REPAIR]' : '✅ [FIT]';
        if (hasRepeat) statusIcon += ' 🔁 [REPEAT DEFECTS]';

        opt.textContent = `${m.id} (${m.model}) - ${m.division} Div ${statusIcon}`;
        if (AppState.selectedMachine === m.id) opt.selected = true;
        select.appendChild(opt);
      });
    }

    updateMachineContextMeta();
  }

  // Update Machine Metadata banner chips
  function updateMachineContextMeta() {
    const metaContainer = document.getElementById('machineMetaChips');
    if (!metaContainer) return;

    const filtered = getFilteredFailures();

    if (AppState.selectedMachine === 'ALL') {
      const catMachines = (AppState.selectedCategory !== 'ALL' && FLEET_DIRECTORY[AppState.selectedCategory]) 
        ? FLEET_DIRECTORY[AppState.selectedCategory] 
        : [];
      
      if (AppState.selectedCategory !== 'ALL' && catMachines.length === 0) {
        metaContainer.innerHTML = `
          <span class="meta-chip">Scope: <strong>${AppState.selectedCategory} Category</strong></span>
          <span class="meta-chip" style="color: var(--gold-400);">Fleet: <strong>0 Machines Registered</strong></span>
          <button class="btn btn-primary-gold" onclick="window.TM_APP.openUploadModalForCategory('${AppState.selectedCategory}')" style="padding: 6px 14px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 6px;">
            <span>➕ Upload History Sheet for ${AppState.selectedCategory}</span>
          </button>
        `;
        return;
      }

      const activeRepairs = filtered.filter(f => f.status === 'UNDER REPAIR').length;
      const repeats = filtered.filter(f => f.isRepetitive).length;

      metaContainer.innerHTML = `
        <span class="meta-chip">Scope: <strong>${AppState.selectedCategory === 'ALL' ? 'Entire Fleet' : AppState.selectedCategory}</strong></span>
        <span class="meta-chip">Monitored Machines: <strong>${new Set(filtered.map(f => f.machineNo)).size}</strong></span>
        <span class="meta-chip">Total Incidents: <strong>${filtered.length}</strong></span>
        ${activeRepairs > 0 ? `<span class="meta-status-badge status-repair-pill">⚠️ ${activeRepairs} Under Repair</span>` : `<span class="meta-status-badge status-fit-pill">✅ 100% Fit</span>`}
        ${repeats > 0 ? `<span class="meta-status-badge status-repetitive-pill">🔁 ${repeats} Repetitive Defect Cases</span>` : ''}
        ${AppState.selectedCategory !== 'ALL' ? `
          <button class="btn btn-secondary-pista" onclick="window.TM_APP.openUploadModalForCategory('${AppState.selectedCategory}')" style="padding: 5px 12px; font-size: 11px; margin-left: 6px; display: inline-flex; align-items: center; gap: 4px;">
            <span>➕ Upload More in ${AppState.selectedCategory}</span>
          </button>
        ` : ''}
      `;
    } else {
      const mId = AppState.selectedMachine;
      const fails = AppState.failures.filter(f => f.machineNo === mId);
      const isRepair = fails.some(f => f.status === 'UNDER REPAIR');
      const repeats = fails.filter(f => f.isRepetitive).length;
      const totalDown = fails.reduce((sum, f) => sum + (parseFloat(f.downHours) || 0), 0);

      const mInfo = getMachineInfo(mId);
      const divName = mInfo?.division || fails[0]?.division || 'SBC';
      const divBadgeClass = divName.includes('SBC') ? 'div-badge-sbc' : (divName.includes('MYS') ? 'div-badge-mys' : 'div-badge-ubl');
      const divIcon = divName.includes('SBC') ? '🔵' : (divName.includes('MYS') ? '🟢' : '🟤');

      metaContainer.innerHTML = `
        <span class="meta-chip">Machine: <strong>${mId}</strong></span>
        <span class="div-badge ${divBadgeClass}">${divIcon} ${divName} Division</span>
        <span class="meta-chip">${mInfo?.model || (fails[0]?.category || AppState.selectedCategory)}</span>
        <span class="meta-chip">Depot: <strong>${mInfo?.depot || divName + ' Base'}</strong></span>
        <span class="meta-chip">Total Down Time: <strong>${totalDown.toFixed(1)} hrs</strong></span>
        <span class="meta-chip">Total Incidents: <strong>${fails.length}</strong></span>
        ${isRepair ? `<span class="meta-status-badge status-repair-pill">⚠️ UNDER SITE REPAIR</span>` : `<span class="meta-status-badge status-fit-pill">✅ CURRENTLY FIT</span>`}
        ${repeats > 0 ? `<span class="meta-status-badge status-repetitive-pill">🚨 ${repeats} Repetitive Defect Cases</span>` : ''}
      `;
    }
  }

  // Filter failures based on Category, Machine, Search, Subsystem, and Status
  function getFilteredFailures() {
    return AppState.failures.filter(f => {
      // Category match (supporting both RBMV and RMBV aliases)
      if (AppState.selectedCategory !== 'ALL') {
        const isRbmvMatch = (AppState.selectedCategory === 'RBMV' || AppState.selectedCategory === 'RMBV') && 
                            (f.category === 'RBMV' || f.category === 'RMBV');
        if (f.category !== AppState.selectedCategory && !isRbmvMatch) {
          return false;
        }
      }
      // Machine match
      if (AppState.selectedMachine !== 'ALL' && f.machineNo !== AppState.selectedMachine) {
        return false;
      }
      // Division filter (SBC Blue, MYS Green, UBL Maroon)
      if (AppState.selectedDivision !== 'ALL') {
        const div = (f.division || '').toUpperCase();
        if (!div.includes(AppState.selectedDivision)) {
          return false;
        }
      }
      // Status filter
      if (AppState.statusFilter !== 'ALL' && f.status !== AppState.statusFilter) {
        return false;
      }
      // Subsystem filter
      if (AppState.subsystemFilter !== 'ALL' && f.subsystem !== AppState.subsystemFilter) {
        return false;
      }
      // Search query
      if (AppState.searchQuery) {
        const q = AppState.searchQuery.toLowerCase();
        const str = `${f.machineNo} ${f.category} ${f.subsystem} ${f.component} ${f.natureOfFailure} ${f.rootCause} ${f.stepsTaken} ${f.correctiveMeasures} ${f.section}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });
  }

  // Render KPIs, Surveillance Banner, Charts and Tables
  function renderAll() {
    const filtered = getFilteredFailures();

    renderKPIs(filtered);
    renderSurveillanceAlerts(filtered);
    renderTable(filtered);
    renderCharts(filtered);
    renderHrmView();
    renderSubsystemDesk('Engine', 'subsystemDesk-engine');
    renderSubsystemDesk('Tamping Unit', 'subsystemDesk-tamping');
    renderSubsystemDesk('Mechanical', 'subsystemDesk-mechanical');
    renderSubsystemDesk('Hydraulic', 'subsystemDesk-hydraulic');
    renderSubsystemDesk('Pneumatic', 'subsystemDesk-pneumatic');
    renderSubsystemDesk('Electrical', 'subsystemDesk-electrical');
    updateTabBadges();
  }

  // Render KPI Counter Strip
  function renderKPIs(list) {
    const totalFailures = list.length;
    const activeRepairs = list.filter(f => f.status === 'UNDER REPAIR').length;
    const repeatFailures = list.filter(f => f.isRepetitive).length;

    // Calculate MTTR (Mean Time to Repair in hours)
    const fitRecords = list.filter(f => f.status === 'FIT' && parseFloat(f.downHours) > 0);
    const totalDownHours = list.reduce((acc, f) => acc + (parseFloat(f.downHours) || 0), 0);
    const mttr = fitRecords.length > 0 ? (totalDownHours / fitRecords.length).toFixed(1) : '0.0';

    // Repetitive Failure Rate
    const repeatRate = totalFailures > 0 ? ((repeatFailures / totalFailures) * 100).toFixed(0) : '0';

    // Bad Actor Machines (machines with 2 or more failures or > 10 down hours)
    const machineFailCounts = {};
    list.forEach(f => {
      machineFailCounts[f.machineNo] = (machineFailCounts[f.machineNo] || 0) + 1;
    });
    const badActors = Object.keys(machineFailCounts).filter(m => machineFailCounts[m] >= 2).length;

    const elTot = document.getElementById('kpiTotalFailures');
    if (elTot) elTot.textContent = totalFailures;
    const elAct = document.getElementById('kpiActiveRepairs');
    if (elAct) elAct.textContent = activeRepairs;
    const elMttr = document.getElementById('kpiMTTR');
    if (elMttr) elMttr.textContent = mttr;
    const elDown = document.getElementById('kpiTotalDowntime');
    if (elDown) elDown.textContent = totalDownHours.toFixed(1);
    const elRep = document.getElementById('kpiRepeatIndex');
    if (elRep) elRep.textContent = `${repeatRate}% (${repeatFailures})`;
    const elBad = document.getElementById('kpiBadActors');
    if (elBad) elBad.textContent = badActors;
  }

  // Render Repetitive Failure & Surveillance Alert Panel
  function renderSurveillanceAlerts(list) {
    const alertCard = document.getElementById('surveillanceAlertCard');
    const repeatContainer = document.getElementById('repeatPillsContainer');
    if (!alertCard || !repeatContainer) return;

    const repeatCases = list.filter(f => f.isRepetitive);

    if (repeatCases.length === 0) {
      alertCard.style.display = 'none';
      return;
    }

    alertCard.style.display = 'block';
    repeatContainer.innerHTML = '';

    // Group repeat cases
    const seen = new Set();
    repeatCases.slice(0, 8).forEach(f => {
      const key = `${f.machineNo}-${f.subsystem}`;
      if (seen.has(key)) return;
      seen.add(key);

      const card = document.createElement('div');
      card.className = 'repeat-item-card';
      card.style.cursor = 'pointer';
      card.title = `Click to navigate & highlight recurring defect in ${f.machineNo} (${f.subsystem})`;
      card.innerHTML = `
        <span class="repeat-count-tag">${f.repeatCount || 2}x REPEAT</span>
        <div class="repeat-text-block">
          <strong>${f.machineNo} [${f.category}]</strong> • ${f.subsystem}
          <span>${escapeHtml(f.component || (f.natureOfFailure ? f.natureOfFailure.substring(0, 45) : 'Recurring Defect'))}...</span>
        </div>
        <span style="font-size: 11px; color: var(--gold-400); margin-left: auto; display: flex; align-items: center; gap: 4px; font-weight: 600; white-space: nowrap;">
          <span>Highlight</span> <span>👉</span>
        </span>
      `;
      card.addEventListener('click', () => {
        highlightFailure(f.id, f.subsystem, f.machineNo);
      });
      repeatContainer.appendChild(card);
    });
  }

  // Highlight and navigate to a specific failure entry (especially recurring defects)
  function highlightFailure(fId, subsystemKey, machineNo) {
    if (!fId) return;

    // Find failure in dataset
    let target = AppState.failures.find(f => f.id === fId);
    if (!target) {
      target = AppState.failures.find(f => String(f.id).includes(fId) || String(f.slNo) === String(fId));
    }

    if (target) {
      if (!machineNo) machineNo = target.machineNo;
      if (!subsystemKey) subsystemKey = target.subsystem;
    }

    // 1. Ensure the machine is selected
    if (machineNo && machineNo !== AppState.selectedMachine) {
      const mInfo = getMachineInfo(machineNo);
      if (mInfo && mInfo.category) {
        AppState.selectedCategory = mInfo.category;
        setupCategoryPills();
      }
      AppState.selectedMachine = machineNo;
      const machSelect = document.getElementById('machineSelect');
      if (machSelect) {
        updateMachineDropdown();
        machSelect.value = machineNo;
      }
      updateMachineContextMeta();
    }

    // 2. Map subsystem to tab
    let targetTab = 'engine-view';
    let deskKey = 'Engine';
    let deskContainerId = 'subsystemDesk-engine';
    const subLower = (subsystemKey || (target ? target.subsystem : '') || '').toLowerCase();

    if (subLower.includes('tamp') || subLower.includes('crane') || subLower.includes('cutter')) {
      targetTab = 'tamping-view';
      const isCrane = isCraneMachine(machineNo) || isCraneMachine(AppState.selectedCategory);
      deskKey = isCrane ? 'Crane' : 'Tamping Unit';
      deskContainerId = 'subsystemDesk-tamping';
    } else if (subLower.includes('mech')) {
      targetTab = 'mechanical-view';
      deskKey = 'Mechanical';
      deskContainerId = 'subsystemDesk-mechanical';
    } else if (subLower.includes('hyd')) {
      targetTab = 'hydraulic-view';
      deskKey = 'Hydraulic';
      deskContainerId = 'subsystemDesk-hydraulic';
    } else if (subLower.includes('pneum') || subLower.includes('air') || subLower.includes('brake')) {
      targetTab = 'pneumatic-view';
      deskKey = 'Pneumatic';
      deskContainerId = 'subsystemDesk-pneumatic';
    } else if (subLower.includes('elec')) {
      targetTab = 'electrical-view';
      deskKey = 'Electrical';
      deskContainerId = 'subsystemDesk-electrical';
    } else {
      targetTab = 'engine-view';
      deskKey = 'Engine';
      deskContainerId = 'subsystemDesk-engine';
    }

    // 3. Switch tab UI
    AppState.activeTab = targetTab;
    document.querySelectorAll('.tab-btn').forEach(b => {
      if (b.getAttribute('data-tab') === targetTab) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    document.querySelectorAll('.tab-pane').forEach(p => {
      if (p.id === targetTab) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    // 4. Render the corresponding subsystem desk
    renderSubsystemDesk(deskKey, deskContainerId);

    // 5. Scroll to and pulse the row
    setTimeout(() => {
      const rowId = `failureRow-${fId}`;
      let rowEl = document.getElementById(rowId);
      if (!rowEl && target) {
        // Fallback: search row by matching text or description
        const rows = document.querySelectorAll(`#${targetTab} tbody tr`);
        rows.forEach(r => {
          if ((target.description && r.innerText.includes(target.description.substring(0, 30))) ||
              (target.natureOfFailure && r.innerText.includes(target.natureOfFailure.substring(0, 30))) ||
              (target.dateOfFailure && r.innerText.includes(target.dateOfFailure))) {
            rowEl = r;
          }
        });
      }

      if (rowEl) {
        // Clear any existing pulse highlights
        document.querySelectorAll('.highlight-pulse-row').forEach(el => el.classList.remove('highlight-pulse-row'));

        rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        rowEl.classList.add('highlight-pulse-row');

        showToast(`Navigated & highlighted recurring defect on ${machineNo || 'selected machine'} (${deskKey})`);
      } else {
        showToast(`Selected ${machineNo || 'machine'} ${deskKey} failure desk`);
      }
    }, 180);
  }

  // Render Failure History Table
  function renderTable(list) {
    const tbody = document.getElementById('failureTableBody');
    const emptyState = document.getElementById('tableEmptyState');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (list.length === 0) {
      if (emptyState) {
        emptyState.style.display = 'block';
        if (AppState.selectedCategory !== 'ALL' && (!FLEET_DIRECTORY[AppState.selectedCategory] || FLEET_DIRECTORY[AppState.selectedCategory].length === 0)) {
          emptyState.innerHTML = `
            <div style="font-size: 34px; margin-bottom: 10px;">📂</div>
            <div style="font-size: 16px; font-weight: 700; color: var(--gold-400);">No Machines Registered in ${AppState.selectedCategory} Category</div>
            <div style="font-size: 12.5px; color: #cbd8cf; max-width: 480px; margin: 8px auto 14px; line-height: 1.5;">
              Upload the Indian Railways Track Machine failure history register spreadsheet (.xlsx / .xls) for this category to monitor failures, repetitive patterns, and MTTR.
            </div>
            <button class="btn btn-primary-gold" onclick="window.TM_APP.openUploadModalForCategory('${AppState.selectedCategory}')" style="padding: 8px 18px; font-size: 12.5px;">
              <span>📤 Upload History Sheet for ${AppState.selectedCategory}</span>
            </button>
          `;
        } else {
          emptyState.innerHTML = `
            <div style="font-size: 32px; margin-bottom: 10px;">🔍</div>
            <div style="font-size: 15px; font-weight: 600; color: #e5ece6;">No failure records found matching current filters</div>
            <div style="font-size: 12px; margin-top: 4px; color: #8da494;">Try adjusting your search criteria, category selection, or upload an Excel history sheet.</div>
          `;
        }
      }
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    list.forEach((f, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'table-row-main';
      tr.id = `allIncRow-${f.id}`;

      const isRep = f.isRepetitive;
      const isUnderRepair = f.status === 'UNDER REPAIR';
      const subClass = getSubsystemClass(f.subsystem);

      tr.innerHTML = `
        <td><strong>#${idx + 1}</strong></td>
        <td>
          <div style="font-weight: 700; color: #fff;">${f.machineNo}</div>
          <div style="display: flex; gap: 5px; align-items: center; margin-top: 3px;">
            <span style="font-size: 11px; color: var(--gold-400); font-weight: 600;">${f.category}</span>
            <span class="div-badge ${getDivisionClass(f.division)}">${f.division || 'SBC'}</span>
          </div>
        </td>
        <td>
          <div style="font-size: 12px; color: #cbd8cf;">${f.breakdownTime || f.dateOfFailure || 'N/A'}</div>
          <div style="font-size: 11px; color: #7f9587;">${f.section || 'Block Section'}</div>
        </td>
        <td>
          <span class="table-subsystem-pill ${subClass}">
            ${f.subsystem || 'Mechanical'}
          </span>
          <div style="font-size: 11px; color: #8da494; margin-top: 3px;">${f.component || ''}</div>
        </td>
        <td style="max-width: 280px;">
          <div style="font-weight: 600; color: #e5ece6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(f.natureOfFailure || f.description || '')}">
            ${escapeHtml(f.natureOfFailure || f.description || '')}
          </div>
          ${isRep ? `<span style="display:inline-block; font-size:10px; color:#ffab91; background:rgba(255,112,67,0.2); padding:1px 6px; border-radius:3px; margin-top:3px; border:1px solid rgba(255,112,67,0.4); cursor:pointer;" onclick="window.TM_APP.highlightFailure('${f.id}', '${f.subsystem}', '${f.machineNo}')" title="Click to navigate & highlight this recurring defect in subsystem desk">🔁 ${f.repeatCount || 2}x Recurring Defect</span>` : ''}
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-weight: 700; color: ${f.downHours > 6 ? '#ff8a65' : 'var(--pista-300)'};">
            ${f.downHours ? f.downHours + ' hrs' : 'Ongoing'}
          </span>
        </td>
        <td>
          ${isUnderRepair 
            ? `<span class="meta-status-badge status-repair-pill">⚠️ UNDER REPAIR</span>` 
            : `<span class="meta-status-badge status-fit-pill">✅ FIT</span>`
          }
        </td>
        <td style="white-space: nowrap;">
          <button class="btn btn-dim" style="padding: 5px 10px; font-size: 11.5px;" onclick="window.TM_APP.toggleDetails('${f.id}')">
            🔍 Details & Corrective
          </button>
          ${isUnderRepair ? `
            <button class="btn btn-secondary-pista" style="padding: 5px 10px; font-size: 11.5px; margin-left: 4px;" onclick="window.TM_APP.openMarkFitModal('${f.id}')">
              ✅ Mark Fit
            </button>
          ` : ''}
        </td>
      `;

      // Detail expansion drawer row
      const trDetails = document.createElement('tr');
      trDetails.id = `details-${f.id}`;
      trDetails.className = 'table-row-details';
      trDetails.innerHTML = `
        <td colspan="8">
          <div class="detail-drawer-box">
            <div>
              <div class="detail-field-group">
                <div class="detail-field-label">🔎 Exact Root Cause Diagnosis</div>
                <div class="detail-field-content">${escapeHtml(f.rootCause || 'Root cause investigation under progress by maintenance team.')}</div>
              </div>
              <div class="detail-field-group">
                <div class="detail-field-label">🛠️ Step-by-Step Restoration Actions Taken</div>
                <div class="detail-field-content">${escapeHtml(f.stepsTaken || 'Troubleshooting and replacement carried out on site.')}</div>
              </div>
              <div class="detail-field-group">
                <div class="detail-field-label">📦 Spares / Consumables Consumed</div>
                <div class="detail-field-content">${escapeHtml(f.sparesUsed || 'Standard maintenance spares')}</div>
              </div>
            </div>
            <div>
              <div class="detail-field-group corrective-box">
                <div class="detail-field-label">🛡️ Corrective Measures Taken to Avoid Recurrence in Future</div>
                <div class="detail-field-content" style="border-color: rgba(147, 197, 114, 0.3); color: #c9ecbc;">
                  ${escapeHtml(f.correctiveMeasures || 'Regular surveillance and scheduled inspection protocol enforced.')}
                </div>
              </div>
              <div class="detail-field-group">
                <div class="detail-field-label">⏱️ Restoration Lifecycle Timestamps</div>
                <div class="detail-field-content" style="font-family: var(--font-mono); font-size: 11.5px;">
                  Breakdown: ${f.breakdownTime || 'N/A'}<br>
                  Site Arrival / Troubleshooting: ${f.arrivalTroubleshootTime || 'N/A'}<br>
                  Spares Arranged: ${f.sparesArrangedTime || 'N/A'}<br>
                  Machine Fit Certified: ${f.fitTime || 'Awaiting final clearance'}<br>
                  Certified By: <strong style="color: var(--gold-400);">${f.certifiedBy || 'SSE/TM'}</strong>
                </div>
              </div>
            </div>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
      tbody.appendChild(trDetails);
    });
  }

  function getSubsystemClass(sub) {
    const s = (sub || '').toLowerCase();
    if (s.includes('hydraulic')) return 'subsystem-hydraulic';
    if (s.includes('electr')) return 'subsystem-electrical';
    if (s.includes('tamp')) return 'subsystem-tamping';
    if (s.includes('engine')) return 'subsystem-engine';
    if (s.includes('pneumatic')) return 'subsystem-pneumatic';
    if (s.includes('measure') || s.includes('sensor')) return 'subsystem-electronics';
    if (s.includes('drive') || s.includes('trans')) return 'subsystem-drive';
    return 'subsystem-mechanical';
  }

  // Get Division Badge Class (SBC Blue, MYS Green, UBL Maroon)
  function getDivisionClass(div) {
    const d = (div || '').toUpperCase();
    if (d.includes('SBC')) return 'div-badge-sbc';
    if (d.includes('MYS')) return 'div-badge-mys';
    if (d.includes('UBL')) return 'div-badge-ubl';
    return 'div-badge-sbc';
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Toggle Table Details Row
  function toggleDetails(id) {
    const row = document.getElementById(`details-${id}`);
    if (row) {
      row.classList.toggle('open');
    }
  }

  // ==========================================================================
  // CHART RENDERING (Chart.js Integration)
  // ==========================================================================
  function renderCharts(list) {
    if (typeof Chart === 'undefined') return;

    renderCategoryComparisonChart(list);
    renderDivisionDistributionChart(list);
    renderSubsystemChart(list);
    renderMTTRTimelineChart(list);
    renderBadActorsRadarChart(list);
  }

  // Chart 1: Category / Fleet Breakdown Comparison
  function renderCategoryComparisonChart(list) {
    const ctx = document.getElementById('chartCategoryComparison');
    if (!ctx) return;

    if (AppState.charts.category) {
      AppState.charts.category.destroy();
    }

    // Tally by category
    const catLabels = MACHINE_CATEGORIES;
    const counts = catLabels.map(c => AppState.failures.filter(f => f.category === c).length);
    const downHours = catLabels.map(c => {
      return AppState.failures
        .filter(f => f.category === c)
        .reduce((sum, f) => sum + (parseFloat(f.downHours) || 0), 0);
    });

    AppState.charts.category = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: catLabels,
        datasets: [
          {
            label: 'Total Incidents',
            data: counts,
            backgroundColor: 'rgba(147, 197, 114, 0.75)',
            borderColor: '#93c572',
            borderWidth: 1.5,
            borderRadius: 6,
            yAxisID: 'y'
          },
          {
            label: 'Total Down Hours',
            data: downHours,
            type: 'line',
            borderColor: '#d4af37',
            backgroundColor: 'rgba(212, 175, 55, 0.2)',
            pointBackgroundColor: '#ffd700',
            pointRadius: 4,
            borderWidth: 2.5,
            tension: 0.3,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: '#c9dbd0', font: { size: 11, family: 'Segoe UI' } }
          },
          tooltip: {
            backgroundColor: 'rgba(12, 20, 16, 0.95)',
            titleColor: '#d4af37',
            bodyColor: '#e5ece6',
            borderColor: '#93c572',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            ticks: { color: '#8da494', font: { size: 10 } },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          },
          y: {
            type: 'linear',
            position: 'left',
            ticks: { color: '#93c572', stepSize: 1 },
            title: { display: true, text: 'Failures', color: '#93c572' },
            grid: { color: 'rgba(255, 255, 255, 0.06)' }
          },
          y1: {
            type: 'linear',
            position: 'right',
            ticks: { color: '#d4af37' },
            title: { display: true, text: 'Hours Down', color: '#d4af37' },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

  // Chart: Division Failure Distribution (SBC Blue, MYS Green, UBL Maroon)
  function renderDivisionDistributionChart(list) {
    const ctx = document.getElementById('chartDivisionDistribution');
    if (!ctx) return;

    if (AppState.charts.division) {
      AppState.charts.division.destroy();
    }

    const sbcCount = AppState.failures.filter(f => (f.division || '').toUpperCase().includes('SBC')).length;
    const mysCount = AppState.failures.filter(f => (f.division || '').toUpperCase().includes('MYS')).length;
    const ublCount = AppState.failures.filter(f => (f.division || '').toUpperCase().includes('UBL')).length;

    const sbcHours = AppState.failures
      .filter(f => (f.division || '').toUpperCase().includes('SBC'))
      .reduce((sum, f) => sum + (parseFloat(f.downHours) || 0), 0);
    const mysHours = AppState.failures
      .filter(f => (f.division || '').toUpperCase().includes('MYS'))
      .reduce((sum, f) => sum + (parseFloat(f.downHours) || 0), 0);
    const ublHours = AppState.failures
      .filter(f => (f.division || '').toUpperCase().includes('UBL'))
      .reduce((sum, f) => sum + (parseFloat(f.downHours) || 0), 0);

    AppState.charts.division = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: [
          `SBC (${sbcCount} failures / ${sbcHours.toFixed(1)} hrs)`,
          `MYS (${mysCount} failures / ${mysHours.toFixed(1)} hrs)`,
          `UBL (${ublCount} failures / ${ublHours.toFixed(1)} hrs)`
        ],
        datasets: [{
          data: [sbcCount, mysCount, ublCount],
          backgroundColor: [
            '#2563eb', // SBC Blue (exact requested color)
            '#16a34a', // MYS Green (exact requested color)
            '#800000'  // UBL Maroon (exact requested color)
          ],
          borderColor: '#121c16',
          borderWidth: 2.5,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#cbd8cf',
              font: { size: 10.5, family: 'Segoe UI' },
              boxWidth: 12
            }
          },
          tooltip: {
            backgroundColor: 'rgba(12, 20, 16, 0.95)',
            titleColor: '#d4af37',
            bodyColor: '#fff',
            borderColor: '#d4af37',
            borderWidth: 1
          }
        },
        cutout: '56%'
      }
    });
  }

  // Chart 2: Subsystem Failure Distribution (Donut Chart)
  function renderSubsystemChart(list) {
    const ctx = document.getElementById('chartSubsystemDistribution');
    if (!ctx) return;

    if (AppState.charts.subsystem) {
      AppState.charts.subsystem.destroy();
    }

    const subsystemCounts = {};
    list.forEach(f => {
      const sub = f.subsystem || 'Mechanical';
      subsystemCounts[sub] = (subsystemCounts[sub] || 0) + 1;
    });

    const labels = Object.keys(subsystemCounts);
    const data = Object.values(subsystemCounts);

    const colors = [
      '#93c572', // Pista
      '#d4af37', // Gold
      '#42a5f5', // Blue
      '#ef5350', // Red
      '#ab47bc', // Purple
      '#26a69a', // Teal
      '#ffa726', // Orange
      '#78909c'  // Slate
    ];

    AppState.charts.subsystem = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: '#121c16',
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#cbd8cf', font: { size: 11 }, boxWidth: 12 }
          },
          tooltip: {
            backgroundColor: 'rgba(12, 20, 16, 0.95)',
            titleColor: '#d4af37',
            bodyColor: '#e5ece6',
            borderColor: '#93c572',
            borderWidth: 1
          }
        },
        cutout: '62%'
      }
    });
  }

  // Chart 3: Downtime & MTTR Lifecycle Trend
  function renderMTTRTimelineChart(list) {
    const ctx = document.getElementById('chartMTTRTimeline');
    if (!ctx) return;

    if (AppState.charts.mttr) {
      AppState.charts.mttr.destroy();
    }

    // Get last 10 incidents sorted chronologically
    const sorted = [...list].sort((a, b) => new Date(a.breakdownTime) - new Date(b.breakdownTime)).slice(-10);

    const labels = sorted.map(f => `${f.machineNo} (${f.breakdownTime.substring(5, 10)})`);
    const hours = sorted.map(f => parseFloat(f.downHours) || 0);

    AppState.charts.mttr = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Down Duration (Hours)',
          data: hours,
          borderColor: '#93c572',
          backgroundColor: 'rgba(147, 197, 114, 0.15)',
          fill: true,
          pointBackgroundColor: '#d4af37',
          pointBorderColor: '#fff',
          pointRadius: 5,
          tension: 0.35,
          borderWidth: 2.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#c9dbd0', font: { size: 11 } }
          },
          tooltip: {
            backgroundColor: 'rgba(12, 20, 16, 0.95)',
            titleColor: '#d4af37',
            bodyColor: '#fff',
            borderColor: '#93c572',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            ticks: { color: '#8da494', font: { size: 10 } },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          },
          y: {
            ticks: { color: '#8da494' },
            title: { display: true, text: 'Restoration Hours', color: '#93c572' },
            grid: { color: 'rgba(255, 255, 255, 0.06)' }
          }
        }
      }
    });
  }

  // Chart 4: Bad Actors & Recurrent Defect Radar / Bar
  function renderBadActorsRadarChart(list) {
    const ctx = document.getElementById('chartBadActors');
    if (!ctx) return;

    if (AppState.charts.badActors) {
      AppState.charts.badActors.destroy();
    }

    // Top machines by failure frequency
    const machineCounts = {};
    AppState.failures.forEach(f => {
      machineCounts[f.machineNo] = (machineCounts[f.machineNo] || 0) + 1;
    });

    const topMachines = Object.keys(machineCounts)
      .sort((a, b) => machineCounts[b] - machineCounts[a])
      .slice(0, 6);

    const counts = topMachines.map(m => machineCounts[m]);

    AppState.charts.badActors = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: topMachines,
        datasets: [{
          label: 'Total Incidents',
          data: counts,
          backgroundColor: [
            'rgba(255, 112, 67, 0.85)',
            'rgba(212, 175, 55, 0.85)',
            'rgba(147, 197, 114, 0.85)',
            'rgba(147, 197, 114, 0.65)',
            'rgba(147, 197, 114, 0.45)',
            'rgba(147, 197, 114, 0.35)'
          ],
          borderColor: '#d4af37',
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(12, 20, 16, 0.95)',
            titleColor: '#ff7043',
            bodyColor: '#fff',
            borderColor: '#d4af37',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            ticks: { color: '#8da494', stepSize: 1 },
            grid: { color: 'rgba(255, 255, 255, 0.05)' }
          },
          y: {
            ticks: { color: '#e5ece6', font: { weight: 'bold' } },
            grid: { display: false }
          }
        }
      }
    });
  }

  // ==========================================================================
  // EXCEL IMPORT & EXPORT ENGINE (SheetJS)
  // ==========================================================================

  // Resilient SheetJS (XLSX) asynchronous loader & availability guarantee
  function ensureXLSX() {
    if (typeof XLSX !== 'undefined' && XLSX.read && XLSX.utils) {
      return Promise.resolve(window.XLSX);
    }
    if (window._xlsxLoadingPromise) {
      return window._xlsxLoadingPromise;
    }
    window._xlsxLoadingPromise = new Promise((resolve, reject) => {
      if (typeof XLSX !== 'undefined' && XLSX.read && XLSX.utils) {
        resolve(window.XLSX);
        return;
      }
      const sources = [
        'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
        'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js',
        'assets/xlsx.full.min.js',
        'xlsx.full.min.js'
      ];
      let idx = 0;
      function tryNext() {
        if (typeof XLSX !== 'undefined' && XLSX.read && XLSX.utils) {
          resolve(window.XLSX);
          return;
        }
        if (idx >= sources.length) {
          window._xlsxLoadingPromise = null;
          reject(new Error('SheetJS (XLSX) library could not be loaded from CDNs or local assets.'));
          return;
        }
        const src = sources[idx++];
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => {
          if (typeof XLSX !== 'undefined' && XLSX.read && XLSX.utils) {
            resolve(window.XLSX);
          } else {
            tryNext();
          }
        };
        script.onerror = () => {
          tryNext();
        };
        document.head.appendChild(script);
      }
      tryNext();
    });
    return window._xlsxLoadingPromise;
  }

  // Helper: Retrieve fleet machines registered for a specific category
  function getMachinesForCategory(cat) {
    let list = [];
    if (cat === 'ALL') {
      Object.keys(FLEET_DIRECTORY).forEach(c => {
        list = list.concat(FLEET_DIRECTORY[c]);
      });
    } else if (FLEET_DIRECTORY[cat]) {
      list = [...FLEET_DIRECTORY[cat]];
    }
    AppState.failures.forEach(f => {
      if ((cat === 'ALL' || f.category === cat) && !list.some(m => m.id === f.machineNo)) {
        list.push({
          id: f.machineNo,
          model: f.category + ' Special',
          division: f.division || 'SBC',
          depot: 'Track Base',
          year: 2020,
          status: f.status
        });
      }
    });
    return list;
  }

  // Populate categories inside the Upload Modal
  function populateModalCategories() {
    const catSelect = document.getElementById('modalTargetCategory');
    if (!catSelect) return;
    const prevVal = catSelect.value;
    catSelect.innerHTML = '';
    MACHINE_CATEGORIES.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      catSelect.appendChild(opt);
    });
    if (prevVal && MACHINE_CATEGORIES.includes(prevVal)) {
      catSelect.value = prevVal;
    } else if (AppState.selectedCategory && AppState.selectedCategory !== 'ALL') {
      catSelect.value = AppState.selectedCategory;
    }
  }

  // Open Excel Upload Modal for a specific category (e.g. from empty state or pill)
  function openUploadModalForCategory(category) {
    populateModalCategories();
    const catSelect = document.getElementById('modalTargetCategory');
    const machInput = document.getElementById('modalTargetMachineInput');
    const divSelect = document.getElementById('modalTargetDivision');

    if (catSelect && category && category !== 'ALL') {
      catSelect.value = category;
    }
    if (machInput) {
      machInput.value = '';
      machInput.placeholder = `e.g. ${category || 'DTE'}-001 or Auto-Detect`;
    }
    if (divSelect && AppState.selectedDivision !== 'ALL') {
      divSelect.value = AppState.selectedDivision;
    }
    openModal('excelUploadModal');
  }

  // Open Excel Upload Modal pre-configured for the currently selected machine
  function openUploadModalForSelectedMachine() {
    populateModalCategories();
    const catSelect = document.getElementById('modalTargetCategory');
    const machInput = document.getElementById('modalTargetMachineInput');
    const divSelect = document.getElementById('modalTargetDivision');

    if (catSelect && AppState.selectedCategory && AppState.selectedCategory !== 'ALL') {
      catSelect.value = AppState.selectedCategory;
    }
    if (machInput) {
      if (AppState.selectedMachine && AppState.selectedMachine !== 'ALL') {
        machInput.value = AppState.selectedMachine;
        const mInfo = getMachineInfo(AppState.selectedMachine);
        if (mInfo && mInfo.division && divSelect) {
          divSelect.value = mInfo.division;
        }
      } else {
        machInput.value = '';
        machInput.placeholder = `e.g. ${AppState.selectedCategory !== 'ALL' ? AppState.selectedCategory : 'CSM'}-001 or Auto-Detect`;
      }
    }
    openModal('excelUploadModal');
  }

  // Category changed inside the upload modal
  function onModalCategoryChange(category) {
    const machInput = document.getElementById('modalTargetMachineInput');
    if (machInput && (!machInput.value || machInput.value.includes('-'))) {
      machInput.placeholder = `e.g. ${category}-001 or Auto-Detect`;
    }
  }

  // Excel Date parser supporting JS Date objects, Excel numeric serials, and DD.MM.YYYY / YYYY-MM-DD strings
  function formatExcelDate(val) {
    if (val === undefined || val === null || val === '') return '';
    if (val instanceof Date && !isNaN(val.getTime())) {
      return val.toISOString().substring(0, 10);
    }
    if (typeof val === 'number') {
      if (val > 25000 && val < 65000) {
        const date = new Date(Math.round((val - 25569) * 86400 * 1000));
        if (!isNaN(date.getTime())) {
          return date.toISOString().substring(0, 10);
        }
      }
    }
    const s = String(val).trim();
    const ddmmyyyy = s.match(/^(\d{1,2})[\.\/\-](\d{1,2})[\.\/\-](\d{4})/);
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, '0');
      const mon = ddmmyyyy[2].padStart(2, '0');
      const yr = ddmmyyyy[3];
      return `${yr}-${mon}-${day}`;
    }
    const yymmdd = s.match(/^(\d{4})[\.\/\-](\d{1,2})[\.\/\-](\d{1,2})/);
    if (yymmdd) {
      const yr = yymmdd[1];
      const mon = yymmdd[2].padStart(2, '0');
      const day = yymmdd[3].padStart(2, '0');
      return `${yr}-${mon}-${day}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.substring(0, 10);
    }
    return s.substring(0, 10);
  }

  // Unified Workbook Parser (supports multi-sheet IR Track Machine Failure Registers and flat spreadsheets)
  function parseWorkbookData(workbook, fileName = '') {
    let importedCount = 0;
    const newFailures = [];

    // 1. Read override values from Modal
    const modalCatSelect = document.getElementById('modalTargetCategory');
    const modalMachInput = document.getElementById('modalTargetMachineInput');
    const modalDivSelect = document.getElementById('modalTargetDivision');

    let chosenCategory = modalCatSelect ? modalCatSelect.value : '';
    let chosenMachine = modalMachInput ? modalMachInput.value.trim() : '';
    let chosenDivision = modalDivSelect ? modalDivSelect.value : 'UBL';

    // 2. If Machine is not specified, auto-detect from HISTORY REGISTER sheet or filename
    if (!chosenMachine) {
      // Check HISTORY sheet
      const historySheetName = workbook.SheetNames.find(s => s.toUpperCase().includes('HISTORY'));
      if (historySheetName) {
        const hws = workbook.Sheets[historySheetName];
        const hData = XLSX.utils.sheet_to_json(hws, { header: 1, defval: '' });
        for (let r = 0; r < Math.min(hData.length, 25); r++) {
          const row = hData[r] || [];
          for (let c = 0; c < row.length; c++) {
            const cellStr = String(row[c]).trim();
            if (/machine\s*name/i.test(cellStr)) {
              for (let k = c + 1; k < Math.min(row.length, c + 4); k++) {
                const nextVal = String(row[k] || '').trim();
                if (nextVal && !/machine/i.test(nextVal) && nextVal.length >= 3) {
                  chosenMachine = nextVal.replace(/\s+/g, '-').toUpperCase();
                  break;
                }
              }
            }
          }
          if (chosenMachine) break;
        }

        // Search any cell for machine identifier pattern
        if (!chosenMachine) {
          for (let r = 0; r < Math.min(hData.length, 25); r++) {
            const row = hData[r] || [];
            for (let c = 0; c < row.length; c++) {
              const cellStr = String(row[c]).trim();
              const match = cellStr.match(/(?:UNI|PCTM|CSM|DTE|DUO|MPT|BCM|FRM|SBCM|BRM|SQRS|T28|T-28|DGS|UTV|RBMV|RMBV|MDU)[\s\-_]*\d+/i);
              if (match) {
                chosenMachine = match[0].replace(/\s+/g, '-').toUpperCase();
                break;
              }
            }
            if (chosenMachine) break;
          }
        }
      }

      // Check filename if still not found
      if (!chosenMachine && fileName) {
        const baseName = fileName.replace(/\.[^/.]+$/, '').trim();
        if (/(?:UNI|PCTM|CSM|DTE|DUO|MPT|BCM|FRM|SBCM|BRM|SQRS|T28|DGS|UTV|RBMV|RMBV|MDU|\d)/i.test(baseName)) {
          chosenMachine = baseName.replace(/\s+/g, '-').toUpperCase();
        }
      }

      // If active selection in app is a specific machine and matches category
      if (!chosenMachine && AppState.selectedMachine !== 'ALL') {
        chosenMachine = AppState.selectedMachine;
      }

      // Fallback
      if (!chosenMachine) {
        chosenMachine = `${chosenCategory || 'TM'}-NEW-1`;
      }
    }

    // 3. Determine Category
    if (!chosenCategory || chosenCategory === 'ALL') {
      chosenCategory = detectCategory(chosenMachine);
    }

    // 4. Auto-detect Division from filename or history if default
    if (modalDivSelect && modalDivSelect.value) {
      chosenDivision = modalDivSelect.value;
    } else {
      const upperFile = (fileName || '').toUpperCase();
      if (upperFile.includes('SBC')) chosenDivision = 'SBC';
      else if (upperFile.includes('MYS')) chosenDivision = 'MYS';
      else if (upperFile.includes('UBL')) chosenDivision = 'UBL';
      else chosenDivision = AppState.selectedDivision !== 'ALL' ? AppState.selectedDivision : 'UBL';
    }

    // 4.5. Parse HISTORY REGISTER sheet to populate HRM_DATA (Tab 1)
    const historySheetName = workbook.SheetNames.find(s => s.toUpperCase().includes('HISTORY'));
    if (historySheetName) {
      const hWs = workbook.Sheets[historySheetName];
      const hRows = XLSX.utils.sheet_to_json(hWs, { header: 1, defval: '' });
      let commDate = '';
      let commRaw = '';

      // Find commissioning date in header rows
      for (let r = 0; r < Math.min(hRows.length, 12); r++) {
        const row = hRows[r] || [];
        for (let c = 0; c < row.length; c++) {
          const cellStr = String(row[c]).toLowerCase();
          if (cellStr.includes('commission')) {
            const rawVal = row[c + 1] || row[c + 2] || row[c];
            commRaw = String(rawVal || '');
            commDate = formatExcelDate(rawVal) || String(rawVal || '');
            break;
          }
        }
        if (commDate) break;
      }

      // Parse canonical items from row 4 to 25
      const parsedItems = [];
      for (let r = 3; r < Math.min(hRows.length, 25); r++) {
        const row = hRows[r] || [];
        const itemNum = String(row[0] || '').trim();
        const itemTitle = String(row[1] || '').trim();
        if (!itemTitle || itemTitle.length < 2) continue;

        const records = [];
        // Even columns (2, 4, 6, 8, ...) are Dates/Remarks, odd columns (3, 5, 7, 9, ...) are Engine Hours
        for (let col = 2; col < row.length; col += 2) {
          const dateOrRemark = row[col];
          const eh = row[col + 1];
          if ((dateOrRemark !== undefined && String(dateOrRemark).trim() !== '') || (eh !== undefined && String(eh).trim() !== '')) {
            const formattedD = formatExcelDate(dateOrRemark) || String(dateOrRemark).trim();
            const rawRem = String(dateOrRemark || '').trim();
            const recRemarks = (rawRem && rawRem !== '-' && !/^\d{4}-\d{2}-\d{2}$/.test(rawRem) && !/^(no|nil)$/i.test(rawRem)) ? rawRem : 'NA';
            records.push({
              id: `rec_${chosenMachine}_r${r}_c${col}`,
              rawDate: rawRem,
              displayDate: formattedD,
              isoDate: /^\d{4}-\d{2}-\d{2}$/.test(formattedD) ? formattedD : '',
              engineHours: String(eh || 'NA').trim(),
              remarks: recRemarks
            });
          }
        }

        let presentDate = 'NA';
        let presentEh = 'NA';
        let presentRemarks = 'NA';
        if (records.length > 0) {
          const isoRecs = records.filter(x => x.isoDate).sort((a, b) => a.isoDate.localeCompare(b.isoDate));
          const latest = isoRecs.length > 0 ? isoRecs[isoRecs.length - 1] : records[records.length - 1];
          presentDate = latest.displayDate || latest.rawDate || 'NA';
          presentEh = latest.engineHours || 'NA';
          const rawLatRem = latest.remarks || '';
          presentRemarks = (rawLatRem && rawLatRem !== '-' && rawLatRem !== 'NA' && !/^(no|nil)$/i.test(rawLatRem)) ? rawLatRem : 'NA';
        }

        parsedItems.push({
          row: r + 1,
          itemNum: itemNum || String(parsedItems.length + 1),
          title: itemTitle,
          presentDate: presentDate,
          presentEngineHours: presentEh,
          presentRemarks: presentRemarks,
          records: records
        });
      }

      if (parsedItems.length > 0) {
        HRM_DATA[chosenMachine] = {
          machineId: chosenMachine,
          machineName: chosenMachine,
          category: chosenCategory,
          division: chosenDivision,
          commissioningDate: commDate || '2016-01-01',
          commissioningRaw: commRaw,
          items: parsedItems
        };
        saveHrmData();
      }
    }

    // 5. Detect Multi-Sheet SWR Structure for Subsystem Failure Desks (Tabs 2 to 6)
    const isCrane = isCraneMachine(chosenCategory) || isCraneMachine(chosenMachine);

    const failureSheets = workbook.SheetNames.filter(s => {
      const up = s.toUpperCase().trim();
      return !up.includes('HISTORY') && (
        up.includes('CRANE') || up.includes('TAMP') || up.includes('ENG') ||
        up.includes('HYD') || up.includes('PNEUM') || up.includes('ELEC') ||
        up.includes('MECH') || up.includes('CUTTER') || up.includes('FAIL')
      );
    });

    if (failureSheets.length > 0) {
      // Multi-sheet SWR format
      failureSheets.forEach(sheetName => {
        const sUpper = sheetName.toUpperCase().trim();
        let subsystem = 'Mechanical';
        if (sUpper.includes('CRANE')) {
          subsystem = 'Crane';
        } else if (sUpper.includes('TAMP')) {
          subsystem = isCrane ? 'Crane' : 'Tamping Unit';
        } else if (sUpper.includes('ENG')) {
          subsystem = 'Engine';
        } else if (sUpper.includes('MECH')) {
          subsystem = 'Mechanical';
        } else if (sUpper.includes('HYD')) {
          subsystem = 'Hydraulic';
        } else if (sUpper.includes('PNEUM')) {
          subsystem = 'Pneumatic';
        } else if (sUpper.includes('ELEC')) {
          subsystem = 'Electrical';
        }

        const ws = workbook.Sheets[sheetName];
        if (!ws) return;

        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!rows || rows.length === 0) return;

        // Detect header row across first 6 rows
        let headerRowIdx = -1;
        for (let r = 0; r < Math.min(rows.length, 6); r++) {
          const rowStrings = (rows[r] || []).map(x => String(x).toLowerCase().trim());
          const nonEmpty = rowStrings.filter(s => s.length > 0);
          if (nonEmpty.length >= 3) {
            const hasDesc = rowStrings.some(s => s.includes('description') || s.includes('nature') || s.includes('defect') || s.includes('failure'));
            const hasDates = rowStrings.some(s => s.includes('date') || s.includes('rectification') || s.includes('down') || s.includes('action'));
            if (hasDesc || hasDates) {
              headerRowIdx = r;
              break;
            }
          }
        }
        if (headerRowIdx === -1) {
          headerRowIdx = rows.length > 1 ? 1 : 0;
        }

        const headers = (rows[headerRowIdx] || []).map(x => String(x).toLowerCase().trim());
        let colSl = headers.findIndex(h => /^sl\.?\s*no/i.test(h) || h === '#' || h === 's.no' || h === 'sno');
        let colFailDate = headers.findIndex(h => /date.*fail|fail.*date|date of failure/i.test(h));
        let colFitDate = headers.findIndex(h => /rectif|fit.*date/i.test(h));
        let colDown = headers.findIndex(h => /down|days.*taken|how many days/i.test(h));
        let colBlock = headers.findIndex(h => /block|happen in block|siding/i.test(h));
        let colDesc = headers.findIndex(h => /description|nature|defect/i.test(h));
        let colAction = headers.findIndex(h => /action.*taken|steps/i.test(h));
        let colPartNo = headers.findIndex(h => /part\s*no|part.*num|drawing/i.test(h));
        let colRemarks = headers.findIndex(h => /repetative|repeat|remarks/i.test(h));

        // Default fallbacks to standard IR column positions (A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7, I=8)
        if (colSl === -1) colSl = 0;
        if (colFailDate === -1) colFailDate = 1;
        if (colFitDate === -1) colFitDate = 2;
        if (colDown === -1) colDown = 3;
        if (colBlock === -1) colBlock = 4;
        if (colDesc === -1) colDesc = 5;
        if (colAction === -1) colAction = 6;
        if (colPartNo === -1) colPartNo = 7;
        if (colRemarks === -1 && headers.length > 8) colRemarks = 8;

        for (let r = headerRowIdx + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          const descVal = colDesc !== -1 && row[colDesc] !== undefined ? String(row[colDesc]).trim() : '';
          const rawFailDate = colFailDate !== -1 ? row[colFailDate] : '';
          if (!descVal && !rawFailDate) continue;
          if (descVal.length < 2 || /^\d+$/.test(descVal) || /^(tamping|mechanical|pneumatic|electrical|hydraulic|engine)$/i.test(descVal) ||
              /description|nature of failure/i.test(descVal) || /date.*fail|fail.*date/i.test(String(rawFailDate)) || /^sl\.?\s*no$/i.test(String(row[colSl] || ''))) {
            continue;
          }

          const slNoVal = colSl !== -1 && row[colSl] !== undefined && String(row[colSl]).trim() !== '' 
            ? String(row[colSl]).trim() 
            : String(importedCount + 1);

          const rawFitDate = colFitDate !== -1 ? row[colFitDate] : '';
          const rawDown = colDown !== -1 ? row[colDown] : '';
          const blockVal = colBlock !== -1 ? String(row[colBlock] || '').trim() : '';
          const partNoVal = colPartNo !== -1 ? String(row[colPartNo] || '').trim() : '-';
          const actionVal = colAction !== -1 ? String(row[colAction] || '').trim() : '';
          const rawRemarks = colRemarks !== -1 ? String(row[colRemarks] || '').trim() : '';
          let isRep = false;
          let remarksVal = 'NA';
          if (rawRemarks) {
            if (/yes|repeat|repetative|sl\s*no/i.test(rawRemarks)) {
              isRep = true;
              remarksVal = rawRemarks;
            } else if (/^(no|nil|-)$/i.test(rawRemarks)) {
              remarksVal = 'NA';
            } else {
              remarksVal = rawRemarks;
            }
          }

          let failDateStr = formatExcelDate(rawFailDate) || new Date().toISOString().substring(0, 10);
          let fitDateStr = formatExcelDate(rawFitDate) || failDateStr;

          let downDays = 1.0;
          if (rawDown !== undefined && rawDown !== null && String(rawDown).trim() !== '') {
            const numMatch = String(rawDown).match(/[\d\.]+/);
            if (numMatch) downDays = parseFloat(numMatch[0]) || 0;
          }
          const downHours = parseFloat((downDays * 24).toFixed(1));

          let inBlockFormatted = 'NO';
          if (blockVal) {
            const bUp = blockVal.toUpperCase();
            if (bUp.includes('YES') || bUp === 'Y' || bUp.includes('BLOCK')) inBlockFormatted = 'YES';
            else if (bUp.includes('MOVEMENT')) inBlockFormatted = 'Machine Movement';
            else inBlockFormatted = blockVal;
          }

          const incident = {
            id: `INC-${chosenMachine.replace(/[^A-Za-z0-9]/g, '')}-${Date.now() % 100000}-${importedCount + 1}`,
            machineNo: chosenMachine,
            category: chosenCategory,
            division: chosenDivision,
            subsystem: subsystem,
            sheet: sheetName,
            slNo: slNoVal,
            dateOfFailure: failDateStr,
            dateOfRectification: fitDateStr,
            breakdownTime: failDateStr,
            fitTime: fitDateStr,
            totalDownDays: downDays,
            downHours: downHours,
            whetherInBlock: inBlockFormatted,
            description: descVal,
            natureOfFailure: descVal,
            actionTaken: actionVal || 'Rectified & restored',
            stepsTaken: actionVal || 'Rectified & restored',
            partNo: (partNoVal && partNoVal !== '-') ? partNoVal : '-',
            remarks: remarksVal,
            isRepetitive: isRep,
            repeatCount: isRep ? 2 : 1,
            component: (partNoVal && partNoVal !== '-') ? `${subsystem} Component (P/N: ${partNoVal})` : `${subsystem} Component`,
            sparesUsed: (partNoVal && partNoVal !== '-') ? `Part No: ${partNoVal}` : (actionVal || 'Standard spares'),
            status: 'FIT',
            certifiedBy: `SSE/TM/${chosenDivision}`
          };

          newFailures.push(incident);
          importedCount++;
        }
      });

    } else {
      // Single-sheet flat spreadsheet parser
      const firstSheetName = workbook.SheetNames[0];
      const ws = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      rows.forEach((row, i) => {
        const getVal = (possibleKeys) => {
          for (let k of possibleKeys) {
            const matchedKey = Object.keys(row).find(x => x.trim().toLowerCase() === k.toLowerCase());
            if (matchedKey && row[matchedKey] !== '') return row[matchedKey];
          }
          return '';
        };

        let rowMach = getVal(['machine no', 'machineno', 'machine_no', 'machine', 'equipment']) || chosenMachine;
        if (!rowMach) return;
        rowMach = rowMach.toString().trim().toUpperCase().replace(/\s+/g, '-');

        const rowCat = getVal(['category', 'machine category', 'type']) || chosenCategory || detectCategory(rowMach);
        const rowDiv = getVal(['division', 'div']) || chosenDivision;
        const rawBreakdown = getVal(['breakdown time', 'breakdown_time', 'failure date', 'date', 'breakdown']);
        const rawFit = getVal(['fit time', 'fit_time', 'restoration time', 'fit date']);
        const breakdownTime = formatExcelDate(rawBreakdown) || new Date().toISOString().substring(0, 10);
        const fitTime = formatExcelDate(rawFit) || breakdownTime;
        const downHours = parseFloat(getVal(['down hours', 'down_hours', 'duration', 'hours'])) || calculateDurationHours(breakdownTime, fitTime) || 4.0;
        const subsystem = getVal(['subsystem', 'system']) || 'Mechanical';
        const component = getVal(['component', 'part', 'assembly', 'item']) || 'Subassembly';
        const nature = getVal(['nature of failure', 'failure nature', 'failure details', 'description', 'defect']) || 'Operational defect';
        const rootCause = getVal(['root cause', 'cause', 'reason']) || `Stress / fatigue on ${component}`;
        const stepsTaken = getVal(['steps taken', 'action taken', 'repair action', 'work done']) || 'Component inspected and rectified on site.';
        const corrective = getVal(['corrective measures', 'preventive action', 'measures']) || `Enforce scheduled inspection for ${subsystem}.`;
        const spares = getVal(['spares used', 'spares', 'parts replaced']) || 'Standard spares';
        const status = getVal(['status']) || (fitTime ? 'FIT' : 'UNDER REPAIR');

        const incident = {
          id: `IMP-${Date.now() % 100000}-${i + 1}`,
          machineNo: rowMach,
          category: rowCat,
          division: rowDiv,
          section: getVal(['section', 'location', 'station']) || `${rowDiv} Track Machine Base`,
          breakdownTime: breakdownTime,
          arrivalTroubleshootTime: breakdownTime,
          sparesArrangedTime: '',
          fitTime: fitTime,
          downHours: downHours,
          subsystem: subsystem,
          component: component,
          natureOfFailure: nature,
          isRepetitive: false,
          repeatCount: 1,
          rootCause: rootCause,
          stepsTaken: stepsTaken,
          correctiveMeasures: corrective,
          sparesUsed: spares,
          status: status.toUpperCase().includes('FIT') ? 'FIT' : 'UNDER REPAIR',
          certifiedBy: getVal(['certified by', 'engineer', 'supervisor']) || `SSE/TM/${rowDiv}`
        };

        newFailures.push(incident);
        importedCount++;
      });
    }

    if (newFailures.length > 0) {
      // 6. Dynamically register new machine into FLEET_DIRECTORY
      if (!FLEET_DIRECTORY[chosenCategory]) {
        FLEET_DIRECTORY[chosenCategory] = [];
      }
      let machEntry = FLEET_DIRECTORY[chosenCategory].find(m => m.id.toUpperCase() === chosenMachine.toUpperCase());
      if (!machEntry) {
        machEntry = {
          id: chosenMachine,
          category: chosenCategory,
          division: chosenDivision,
          model: `${chosenCategory} Track Machine (${chosenMachine})`,
          depot: `${chosenDivision} Base`,
          year: new Date().getFullYear(),
          status: 'FIT'
        };
        FLEET_DIRECTORY[chosenCategory].push(machEntry);
      } else {
        machEntry.division = chosenDivision;
      }

      // Update REAL_SWR_FLEET_DATA if present
      if (typeof window !== 'undefined' && window.REAL_SWR_FLEET_DATA) {
        window.REAL_SWR_FLEET_DATA.fleetDirectory = FLEET_DIRECTORY;
        if (!window.REAL_SWR_FLEET_DATA.machines) window.REAL_SWR_FLEET_DATA.machines = [];
        const mIdx = window.REAL_SWR_FLEET_DATA.machines.findIndex(m => m.id.toUpperCase() === chosenMachine.toUpperCase());
        if (mIdx === -1) {
          window.REAL_SWR_FLEET_DATA.machines.push(machEntry);
        } else {
          window.REAL_SWR_FLEET_DATA.machines[mIdx] = machEntry;
        }
      }

      // Prevent duplicates if re-uploading the same machine's history sheet
      AppState.failures = AppState.failures.filter(f => f.machineNo.toUpperCase() !== chosenMachine.toUpperCase());
      AppState.failures = newFailures.concat(AppState.failures);

      // Select newly imported category and machine
      AppState.selectedCategory = chosenCategory;
      AppState.selectedMachine = chosenMachine;

      classifyRepetitiveFailures(AppState.failures);
      saveDataset();
      setupCategoryPills();
      updateMachineDropdown();
      renderAll();

      closeModal('excelUploadModal');
      showToast(`Successfully registered ${chosenMachine} under ${chosenCategory} (${chosenDivision} Division) with ${newFailures.length} failure incidents!`);
    }

    return importedCount;
  }

  // Process Excel File Upload
  async function processExcelFile(file) {
    if (!file) return 0;

    // Reset file input value so re-uploading the same file triggers change
    const fileInput = document.getElementById('excelFileInput');
    if (fileInput) fileInput.value = '';

    if (typeof XLSX === 'undefined' || !XLSX.read) {
      showToast('Loading SheetJS Excel engine...', false);
      try {
        await ensureXLSX();
      } catch (err) {
        console.error('Error loading SheetJS:', err);
        showToast('Error: SheetJS Excel library is not available. Please check internet connection or reload.', true);
        return 0;
      }
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const importedCount = parseWorkbookData(workbook, file.name);

          if (importedCount === 0) {
            showToast('No valid failure records found in uploaded file. Please verify sheet structure.', true);
          }
          resolve(importedCount);
        } catch (err) {
          console.error('Error parsing Excel:', err);
          showToast('Error reading Excel spreadsheet: ' + err.message, true);
          reject(err);
        }
      };
      reader.onerror = function (err) {
        console.error('FileReader error:', err);
        showToast('Error reading local file: ' + err.message, true);
        reject(err);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Import directly from Google Sheets / Google Link
  async function importFromGoogleLink(customUrl) {
    const input = document.getElementById('googleSheetUrlInput');
    const url = customUrl || (input ? input.value.trim() : '');

    if (!url) {
      showToast('Please enter a valid Google Sheets URL', true);
      return;
    }

    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/) || url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      showToast('Could not extract Google Spreadsheet ID from URL. Make sure it is a valid Google link.', true);
      return;
    }

    const sheetId = match[1];
    const gidMatch = url.match(/gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    showToast('Connecting to Google Sheet and fetching failure data...', false);

    try {
      const response = await fetch(exportUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}. Please make sure the sheet is public ("Anyone with the link can view").`);
      }
      const csvText = await response.text();

      if (typeof XLSX === 'undefined' || !XLSX.read) {
        try {
          await ensureXLSX();
        } catch (e) {
          showToast('SheetJS parser is not available.', true);
          return;
        }
      }

      const workbook = XLSX.read(csvText, { type: 'string' });
      const importedCount = parseWorkbookData(workbook, 'GoogleSheetImport.csv');

      if (importedCount === 0) {
        showToast('Google Sheet connected, but no valid failure records were found.', true);
        return;
      }
    } catch (err) {
      console.error('Google Sheet Import Error:', err);
      showToast('Error importing Google Link: ' + err.message, true);
    }
  }

  function detectCategory(machineNo) {
    const m = machineNo.toUpperCase();
    if (m.includes('UNI') || m.includes('PCTM')) return 'UNI/PCTM';
    if (m.includes('CSM')) return 'CSM';
    if (m.includes('DTE')) return 'DTE';
    if (m.includes('DUO')) return 'DUO';
    if (m.includes('MPT')) return 'MPT';
    if (m.includes('BCM')) return 'BCM';
    if (m.includes('SBCM') || m.includes('FRM')) return 'SBCM/FRM';
    if (m.includes('BRM')) return 'BRM';
    if (m.includes('SQRS')) return 'SQRS';
    if (m.includes('T28') || m.includes('T-28')) return 'T28';
    if (m.includes('DGS')) return 'DGS';
    if (m.includes('UTV')) return 'UTV';
    if (m.includes('RMBV')) return 'RMBV';
    if (m.includes('MDU')) return 'MDU';
    return AppState.selectedCategory !== 'ALL' ? AppState.selectedCategory : 'CSM';
  }

  function calculateDurationHours(start, end) {
    if (!start || !end) return 0;
    const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60);
    return diff > 0 ? parseFloat(diff.toFixed(2)) : 0;
  }

  // Download Sample Excel Template (Multi-sheet authentic SWR workbook with 16 HRM items and 5 Failure Desks)
  async function downloadExcelTemplate() {
    if (typeof XLSX === 'undefined' || !XLSX.utils) {
      showToast('Loading SheetJS template engine...', false);
      try {
        await ensureXLSX();
      } catch (e) {
        showToast('SheetJS not ready for template generation.', true);
        return;
      }
    }

    const modalCat = document.getElementById('modalTargetCategory')?.value;
    const isCrane = isCraneMachine(modalCat) || isCraneMachine(AppState.selectedCategory) || isCraneMachine(AppState.selectedMachine);
    const targetCat = isCrane ? (modalCat && isCraneMachine(modalCat) ? modalCat : (isCraneMachine(AppState.selectedCategory) ? AppState.selectedCategory : 'UTV')) : (AppState.selectedCategory !== 'ALL' ? AppState.selectedCategory : 'CSM');
    const targetMach = isCrane ? `${targetCat}-001` : `${targetCat}-901`;

    const wb = XLSX.utils.book_new();

    // Standard column widths helper
    const standardCols = [
      { wch: 8 },  // Sl. No.
      { wch: 14 }, // Date of failure
      { wch: 14 }, // Date of rectification
      { wch: 15 }, // Total down days
      { wch: 18 }, // Whether occurred during block
      { wch: 45 }, // Detailed description
      { wch: 45 }, // Action taken & spares
      { wch: 20 }, // Part No.
      { wch: 20 }  // Remarks
    ];

    // 1. Sheet 1: HISTORY REGISTER (Canonical 16 items)
    const hrmRows = [
      ['INDIAN RAILWAYS - SOUTH WESTERN RAILWAY', '', '', '', ''],
      [`TRACK MACHINE FLEET HISTORY REGISTER MODULE (${targetMach})`, '', '', `CATEGORY: ${targetCat}`, ''],
      ['COMMISSIONING DATE: 2018-04-15', '', '', 'STATUS: FIT', ''],
      [],
      ['ITEM NO', 'DESCRIPTION OF PARAMETER', 'DATE OF LAST ATTENTION', 'ENGINE HOURS', 'REMARKS / SPARES USED']
    ];

    CANONICAL_HRM_ITEMS.forEach(it => {
      let desc = it.title;
      if (isCrane && it.itemNum === '4') {
        desc = 'LAST CRANE OVERHAUL / HOIST CYLINDER REPLACED';
      }
      hrmRows.push([it.itemNum, desc, '2023-05-10', '15420', 'NA']);
    });

    const wsHrm = XLSX.utils.aoa_to_sheet(hrmRows);
    wsHrm['!cols'] = [{ wch: 10 }, { wch: 50 }, { wch: 24 }, { wch: 16 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsHrm, 'HISTORY REGISTER');

    // 2. Sheet 2: ENGINE FAILURES
    const engineRows = [
      ['Sl. No.', 'Date of failure', 'Date of rectification', 'Total down days', 'Whether occurred during block', 'Detailed description of the failure', 'Action taken & Spares consumed', 'Part No. of spares consumed', 'Remarks'],
      [1, '2026-08-05', '2026-08-05', 0.5, 'NO', 'Engine fuel filter choked, low engine RPM under load', 'Replaced primary and secondary fuel filters, bled fuel line and tested on track', 'P/N: FF-5052', 'NA']
    ];
    const wsEngine = XLSX.utils.aoa_to_sheet(engineRows);
    wsEngine['!cols'] = standardCols;
    XLSX.utils.book_append_sheet(wb, wsEngine, 'ENGINE FAILURES');

    // 3. Sheet 3: CRANE FAILURES (for UTV/RBMV) OR TAMPING UNIT FAILURES (for others)
    const tab3SheetName = isCrane ? 'CRANE FAILURES' : 'TAMPING UNIT FAILURES';
    const tab3Rows = [
      ['Sl. No.', 'Date of failure', 'Date of rectification', 'Total down days', 'Whether occurred during block', 'Detailed description of the failure', 'Action taken & Spares consumed', 'Part No. of spares consumed', 'Remarks'],
      isCrane ? [
        1, '2026-08-10', '2026-08-11', 1.0, 'NO',
        'Crane boom hoisting hydraulic cylinder gland leakage during rail loading operation',
        'Replaced boom cylinder seal kit, topped hydraulic oil and tested crane under 2.5T proof load',
        'P/N: UTV-CR-2401', 'NA'
      ] : [
        1, '2026-08-15', '2026-08-16', 1.0, 'YES',
        'Tamping unit squeeze cylinder piston rod bent during turnout tamping',
        'Replaced squeeze cylinder assembly, checked working pressure at 120 bar',
        'P/N: HZ08.400', 'NA'
      ]
    ];
    const wsTab3 = XLSX.utils.aoa_to_sheet(tab3Rows);
    wsTab3['!cols'] = standardCols;
    XLSX.utils.book_append_sheet(wb, wsTab3, tab3SheetName);

    // 4. Sheet 4: MECHANICAL FAILURES
    const mechRows = [
      ['Sl. No.', 'Date of failure', 'Date of rectification', 'Total down days', 'Whether occurred during block', 'Detailed description of the failure', 'Action taken & Spares consumed', 'Part No. of spares consumed', 'Remarks'],
      [1, '2026-08-17', '2026-08-17', 0.5, 'NO', 'Work drive cardan shaft universal joint bolts loosened and shear pin sheared', 'Replaced cardan shaft shear pin, renewed high tensile bolts and torqued to 180 Nm', 'P/N: MC-CS-108', 'NA']
    ];
    const wsMech = XLSX.utils.aoa_to_sheet(mechRows);
    wsMech['!cols'] = standardCols;
    XLSX.utils.book_append_sheet(wb, wsMech, 'MECHANICAL FAILURES');

    // 5. Sheet 5: HYDRAULIC FAILURES
    const hydRows = [
      ['Sl. No.', 'Date of failure', 'Date of rectification', 'Total down days', 'Whether occurred during block', 'Detailed description of the failure', 'Action taken & Spares consumed', 'Part No. of spares consumed', 'Remarks'],
      [1, '2026-08-18', '2026-08-18', 0.5, 'NO', 'Main system hydraulic return line filter clogged indicator showing red', 'Replaced 10-micron return filter element and cleaned housing', 'P/N: HY-FLT-020', 'NA']
    ];
    const wsHyd = XLSX.utils.aoa_to_sheet(hydRows);
    wsHyd['!cols'] = standardCols;
    XLSX.utils.book_append_sheet(wb, wsHyd, 'HYDRAULIC FAILURES');

    // 6. Sheet 6: PNEUMATIC FAILURES
    const pneuRows = [
      ['Sl. No.', 'Date of failure', 'Date of rectification', 'Total down days', 'Whether occurred during block', 'Detailed description of the failure', 'Action taken & Spares consumed', 'Part No. of spares consumed', 'Remarks'],
      [1, '2026-08-22', '2026-08-22', 0.5, 'NO', 'Brake application unloader valve pneumatic leakage', 'Replaced unloader valve diaphragm and tested pressure regulator at 7 bar', 'P/N: PN-VLV-33', 'NA']
    ];
    const wsPneu = XLSX.utils.aoa_to_sheet(pneuRows);
    wsPneu['!cols'] = standardCols;
    XLSX.utils.book_append_sheet(wb, wsPneu, 'PNEUMATIC FAILURES');

    // 7. Sheet 7: ELECTRICAL FAILURES
    const elecRows = [
      ['Sl. No.', 'Date of failure', 'Date of rectification', 'Total down days', 'Whether occurred during block', 'Detailed description of the failure', 'Action taken & Spares consumed', 'Part No. of spares consumed', 'Remarks'],
      [1, '2026-08-25', '2026-08-25', 0.5, 'NO', '24V DC alternator charging failure and panel voltmeter reading zero', 'Replaced alternator carbon brush set and tensioned belt drive', 'P/N: EL-ALT-24V', 'NA']
    ];
    const wsElec = XLSX.utils.aoa_to_sheet(elecRows);
    wsElec['!cols'] = standardCols;
    XLSX.utils.book_append_sheet(wb, wsElec, 'ELECTRICAL FAILURES');

    const fileName = isCrane ? `${targetCat}_Failure_History_Template_Crane_Failures.xlsx` : `Track_Machine_Failure_History_Template.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast(`Downloaded official 7-sheet SWR template (${tab3SheetName} + Mechanical Failures): ${fileName}`);
  }

  // Export Filtered Failure History to Excel
  async function exportFilteredToExcel() {
    if (typeof XLSX === 'undefined' || !XLSX.utils) {
      showToast('Loading SheetJS export engine...', false);
      try {
        await ensureXLSX();
      } catch (e) {
        showToast('SheetJS not ready for export.', true);
        return;
      }
    }

    const filtered = getFilteredFailures();
    if (filtered.length === 0) {
      showToast('No records to export.', true);
      return;
    }

    const exportRows = filtered.map(f => ({
      'Incident ID': f.id,
      'Machine No': f.machineNo,
      'Category': f.category,
      'Division': f.division,
      'Section': f.section,
      'Breakdown Time': f.breakdownTime,
      'Fit Time': f.fitTime,
      'Down Hours': f.downHours,
      'Subsystem': f.subsystem,
      'Component': f.component,
      'Nature of Failure': f.natureOfFailure,
      'Is Repetitive?': f.isRepetitive ? `YES (${f.repeatCount}x)` : 'NO',
      'Root Cause': f.rootCause,
      'Steps Taken for Repair': f.stepsTaken,
      'Corrective Measures to Avoid in Future': f.correctiveMeasures,
      'Spares Consumed': f.sparesUsed,
      'Status': f.status,
      'Certified By': f.certifiedBy
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Failure_Analysis_Report');

    const fileName = `TM_Surveillance_Report_${AppState.selectedCategory}_${AppState.selectedMachine}_${new Date().toISOString().substring(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast(`Exported ${filtered.length} records to ${fileName}`);
  }

  // ==========================================================================
  // HISTORY REGISTER MODULE (HRM) ENGINE & DYNAMIC AGE CALCULATOR
  // ==========================================================================

  // Calculate Dynamic Machine Age in Exact Years, Months, Days (Changes Every Day)
  function calculateDynamicAge(fromDateStr, toDate = new Date()) {
    if (!fromDateStr || fromDateStr === 'NA' || fromDateStr.trim() === '') {
      return { years: 0, months: 0, days: 0, text: 'Date Not Available' };
    }
    
    let from = null;
    const s = fromDateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const parts = s.split('-');
      from = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else if (/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})$/.test(s)) {
      const m = s.match(/^(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})$/);
      from = new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
    } else {
      from = new Date(s);
    }
    
    if (!from || isNaN(from.getTime())) {
      return { years: 0, months: 0, days: 0, text: fromDateStr };
    }
    
    let y1 = from.getFullYear(), m1 = from.getMonth(), d1 = from.getDate();
    let y2 = toDate.getFullYear(), m2 = toDate.getMonth(), d2 = toDate.getDate();
    
    let years = y2 - y1;
    let months = m2 - m1;
    let days = d2 - d1;
    
    if (days < 0) {
      months--;
      const prevMonthDays = new Date(y2, m2, 0).getDate();
      days += prevMonthDays;
    }
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    if (years < 0) {
      return { years: 0, months: 0, days: 0, text: 'Commissioning Date in Future' };
    }
    
    return {
      years,
      months,
      days,
      text: `${years} Years, ${months} Months, ${days} Days`
    };
  }

  // Helper: Get active machine ID
  function getActiveMachineId() {
    if (AppState.selectedMachine && AppState.selectedMachine !== 'ALL') {
      return AppState.selectedMachine;
    }
    if (AppState.selectedCategory && AppState.selectedCategory !== 'ALL' && FLEET_DIRECTORY[AppState.selectedCategory] && FLEET_DIRECTORY[AppState.selectedCategory].length > 0) {
      return FLEET_DIRECTORY[AppState.selectedCategory][0].id;
    }
    for (let c of Object.keys(FLEET_DIRECTORY)) {
      if (FLEET_DIRECTORY[c] && FLEET_DIRECTORY[c].length > 0) {
        return FLEET_DIRECTORY[c][0].id;
      }
    }
    return 'UNIMAT-8269';
  }

  // Render History Register Module (Tab 1)
  function renderHrmView() {
    const mId = getActiveMachineId();
    const mInfo = getMachineInfo(mId);

    if (!HRM_DATA[mId]) {
      if (typeof window !== 'undefined' && window.REAL_SWR_FLEET_DATA && window.REAL_SWR_FLEET_DATA.historyRegisters && window.REAL_SWR_FLEET_DATA.historyRegisters[mId]) {
        HRM_DATA[mId] = JSON.parse(JSON.stringify(window.REAL_SWR_FLEET_DATA.historyRegisters[mId]));
      } else {
        HRM_DATA[mId] = {
          machineId: mId,
          machineName: mId,
          commissioningDate: mInfo?.commissioningDate || '2016-01-01',
          commissioningRaw: mInfo?.commissioningRaw || '',
          items: CANONICAL_HRM_ITEMS.map((c, i) => ({
            row: i + 4,
            itemNum: c.itemNum,
            title: c.title,
            presentDate: 'NA',
            presentEngineHours: 'NA',
            presentRemarks: '',
            records: []
          }))
        };
      }
    }

    const hrm = HRM_DATA[mId];

    // Update Header Card
    const catEl = document.getElementById('hrmMachineCat');
    if (catEl) catEl.textContent = mInfo?.category || AppState.selectedCategory || 'SWR';

    const divEl = document.getElementById('hrmDivisionBadge');
    if (divEl) {
      const divName = mInfo?.division || 'SBC';
      const divColor = DIVISION_COLORS[divName] || DIVISION_COLORS['SBC'];
      divEl.style.background = `rgba(${divName === 'SBC' ? '37,99,235' : (divName === 'MYS' ? '22,163,74' : '128,0,0')}, 0.2)`;
      divEl.style.color = divColor.light;
      divEl.style.border = `1px solid ${divColor.light}`;
      divEl.textContent = `${divName === 'SBC' ? '🔵' : (divName === 'MYS' ? '🟢' : '🟤')} ${divName} Division`;
    }

    const statusEl = document.getElementById('hrmStatusBadge');
    if (statusEl) {
      const fails = AppState.failures.filter(f => f.machineNo === mId);
      const isRepair = fails.some(f => f.status === 'UNDER REPAIR');
      statusEl.className = `badge ${isRepair ? 'badge-repair' : 'badge-fit'}`;
      statusEl.textContent = isRepair ? '⚠️ UNDER SITE REPAIR' : '✅ FIT FOR SERVICE';
    }

    const nameEl = document.getElementById('hrmMachineName');
    if (nameEl) nameEl.textContent = `${hrm.machineName || mId}`;

    const modelEl = document.getElementById('hrmMachineModel');
    if (modelEl) modelEl.textContent = `${mInfo?.model || 'Track Machine'} • Base Depot: ${mInfo?.depot || 'SWR Base'}`;

    // Dynamic Age Calculation
    const age = calculateDynamicAge(hrm.commissioningDate);
    const ageValEl = document.getElementById('hrmDynamicAgeValue');
    if (ageValEl) ageValEl.textContent = age.text;

    const ageSubEl = document.getElementById('hrmDynamicAgeSubtext');
    if (ageSubEl) {
      const displayDate = hrm.commissioningDate || hrm.commissioningRaw || 'N/A';
      ageSubEl.textContent = `Commissioned on ${displayDate} • Dynamic age as on today (${new Date().toLocaleDateString('en-GB')})`;
    }

    const commDateEl = document.getElementById('hrmDisplayCommDate');
    if (commDateEl) commDateEl.textContent = hrm.commissioningDate || hrm.commissioningRaw || 'Not Set';

    const inputComm = document.getElementById('inputCommDateCalendar');
    if (inputComm) inputComm.value = hrm.commissioningDate || '';

    // Render 16 Items Table
    const tbody = document.getElementById('hrmTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    hrm.items.forEach((it, idx) => {
      const tr = document.createElement('tr');
      tr.id = `hrm-row-${idx}`;

      const recordsCount = it.records ? it.records.length : 0;
      const hasHistory = recordsCount > 0;

      tr.innerHTML = `
        <td><strong style="color: var(--gold-400); font-family: var(--font-mono);">${it.itemNum || (idx + 1)}</strong></td>
        <td>
          <div class="hrm-item-title">
            <span>${escapeHtml(it.title || ('Item ' + (idx + 1)))}</span>
          </div>
        </td>
        <td>
          <span class="hrm-date-badge">
            <span>📅</span>
            <span>${escapeHtml(it.presentDate || 'NA')}</span>
          </span>
        </td>
        <td>
          <span class="hrm-eh-badge">
            <span>⏱️</span>
            <span>${escapeHtml(it.presentEngineHours || 'NA')}</span>
          </span>
        </td>
        <td>
          <div class="hrm-remarks-text" title="${escapeHtml(it.presentRemarks || '')}">
            ${escapeHtml((it.presentRemarks && it.presentRemarks.trim() !== '' && it.presentRemarks.trim() !== '-' && !/^(no|nil)$/i.test(it.presentRemarks.trim())) ? it.presentRemarks.trim() : 'NA')}
          </div>
        </td>
        <td>
          ${hasHistory ? `
            <button class="hrm-history-toggle" onclick="window.TM_APP.toggleHrmHistory('${mId}', ${idx})">
              <span>📜 ${recordsCount} ${recordsCount === 1 ? 'Record' : 'Records'}</span>
              <span id="hrmToggleArrow-${idx}">▼</span>
            </button>
          ` : `
            <span style="font-size: 11px; color: #738a7a;">No prior log</span>
          `}
        </td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
            <button class="btn btn-secondary-pista" onclick="window.TM_APP.openAddHrmEntryModal(${idx})" style="padding: 4px 8px; font-size: 11px;" title="Update date and engine hours">
              ➕ Add/Edit
            </button>
            <button class="hrm-btn-delete" onclick="window.TM_APP.deletePresentHrmEntry('${mId}', ${idx})" style="padding: 4px 8px; font-size: 11px;" title="Delete present entry">
              🗑️ Delete
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);

      // Expandable History Drawer Row
      if (hasHistory) {
        const drawerTr = document.createElement('tr');
        drawerTr.id = `hrm-drawer-${idx}`;
        drawerTr.style.display = 'none';

        let recordsHtml = '';
        it.records.forEach((rec, rIdx) => {
          recordsHtml += `
            <div class="hrm-history-item-card">
              <div>
                <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 3px;">
                  <span style="color: var(--pista-300); font-weight: 700; font-size: 11.5px;">📅 ${escapeHtml(rec.displayDate || rec.isoDate || rec.rawDate || 'N/A')}</span>
                  ${rec.engineHours ? `<span style="color: var(--gold-300); font-family: var(--font-mono); font-size: 11.5px;">⏱️ ${escapeHtml(rec.engineHours)} EH</span>` : ''}
                </div>
                <div style="font-size: 11px; color: #c4d7c8;">${escapeHtml((rec.remarks && rec.remarks.trim() !== '' && rec.remarks.trim() !== '-' && !/^(no|nil)$/i.test(rec.remarks.trim())) ? rec.remarks.trim() : 'NA')}</div>
              </div>
              <button class="hrm-btn-delete" onclick="window.TM_APP.deleteHrmRecord('${mId}', ${idx}, '${rec.id}')" title="Delete this entry">
                🗑️
              </button>
            </div>
          `;
        });

        drawerTr.innerHTML = `
          <td colspan="7" style="padding: 0;">
            <div class="hrm-history-drawer">
              <div style="font-size: 12px; font-weight: 700; color: var(--gold-400); margin-bottom: 6px; display: flex; justify-content: space-between;">
                <span>Detailed Overhaul &amp; Replacement Audit History:</span>
                <span style="font-size: 11px; color: #8fa696;">Click 🗑️ to delete any individual entry</span>
              </div>
              <div class="hrm-history-grid">
                ${recordsHtml}
              </div>
            </div>
          </td>
        `;
        tbody.appendChild(drawerTr);
      }
    });
  }

  // Render Subsystem Failure Desk (Tabs 2 to 6) - 10 Standard Columns Layout
  function renderSubsystemDesk(subsystemKey, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const mId = getActiveMachineId();
    const mInfo = getMachineInfo(mId);
    const isCrane = isCraneMachine(mId) || isCraneMachine(mInfo?.category) || isCraneMachine(AppState.selectedCategory);

    let effectiveSubsystem = subsystemKey;
    if (subsystemKey === 'Tamping Unit' || subsystemKey === 'Crane') {
      effectiveSubsystem = isCrane ? 'Crane' : 'Tamping Unit';
    }

    let subFailures = AppState.failures.filter(f => f.machineNo === mId);
    if (effectiveSubsystem === 'Engine') {
      subFailures = subFailures.filter(f => f.subsystem === 'Engine' || f.subsystem === 'Diesel Engine / Radiator / Fuel');
    } else if (effectiveSubsystem === 'Crane') {
      subFailures = subFailures.filter(f => f.subsystem === 'Crane' || f.subsystem === 'Tamping Unit' || /crane/i.test(f.subsystem || '') || /crane/i.test(f.sheet || ''));
    } else if (effectiveSubsystem === 'Tamping Unit') {
      subFailures = subFailures.filter(f => f.subsystem === 'Tamping Unit' || f.subsystem === 'Tamping Unit / Tools / Vibration' || f.subsystem === 'Cutter');
    } else if (effectiveSubsystem === 'Mechanical') {
      subFailures = subFailures.filter(f => f.subsystem === 'Mechanical' || f.subsystem === 'Mechanical/Structure' || /mech/i.test(f.subsystem || '') || /mech/i.test(f.sheet || ''));
    } else if (effectiveSubsystem === 'Hydraulic') {
      subFailures = subFailures.filter(f => (f.subsystem === 'Hydraulic' || f.subsystem === 'Hydraulic Circuit / Valves / Cylinders') && !/mech/i.test(f.subsystem || '') && !/mech/i.test(f.sheet || ''));
    } else if (effectiveSubsystem === 'Pneumatic') {
      subFailures = subFailures.filter(f => f.subsystem === 'Pneumatic' || f.subsystem === 'Pneumatics / Brakes / Air Compressor');
    } else if (effectiveSubsystem === 'Electrical') {
      subFailures = subFailures.filter(f => f.subsystem === 'Electrical' || f.subsystem === 'Electrical / Contactors / Batteries' || f.subsystem === 'Electronics & Measuring');
    }

    const totalCount = subFailures.length;
    const totalDownDays = subFailures.reduce((sum, f) => sum + (f.totalDownDays !== undefined && f.totalDownDays !== null ? parseFloat(f.totalDownDays) : ((parseFloat(f.downHours) || 0) / 24)), 0);
    const repeatCount = subFailures.filter(f => f.isRepetitive).length;

    let icon = '⚙️';
    if (effectiveSubsystem === 'Crane') icon = '🏗️';
    else if (effectiveSubsystem === 'Tamping Unit') icon = '🔨';
    else if (effectiveSubsystem === 'Mechanical') icon = '🔩';
    else if (effectiveSubsystem === 'Hydraulic') icon = '💧';
    else if (effectiveSubsystem === 'Pneumatic') icon = '💨';
    else if (effectiveSubsystem === 'Electrical') icon = '⚡';

    let tableRows = '';
    if (subFailures.length === 0) {
      tableRows = `
        <tr>
          <td colspan="11" style="text-align: center; padding: 42px; color: #8fa696;">
            <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
            <div style="font-size: 15px; font-weight: 700; color: var(--pista-300);">No ${effectiveSubsystem} Failures Recorded for Machine ${mId}</div>
            <div style="font-size: 12px; margin-top: 4px; color: #cbd8cf;">Subsystem is operating with zero recorded breakdown down days.</div>
            <button class="btn btn-primary-gold" onclick="window.TM_APP.openLogModalForSubsystem('${effectiveSubsystem}')" style="margin-top: 14px; font-size: 11.5px; padding: 6px 14px;">
              ➕ Log First ${effectiveSubsystem} Failure
            </button>
          </td>
        </tr>
      `;
    } else {
      subFailures.forEach((f, idx) => {
        const rowSl = f.slNo || (idx + 1);
        const failDate = f.dateOfFailure || f.breakdownTime || 'N/A';
        const fitDate = f.dateOfRectification || f.fitTime || '⚠️ Active';
        const dDays = (f.totalDownDays !== undefined && f.totalDownDays !== null) ? f.totalDownDays : ((parseFloat(f.downHours) || 0) / 24).toFixed(1);
        const inBlock = f.whetherInBlock || 'NO';
        const isBlockYes = (inBlock.toUpperCase() === 'YES' || inBlock.toUpperCase().includes('BLOCK'));
        const descText = f.description || f.natureOfFailure || '-';
        const actionText = f.actionTaken || f.stepsTaken || '-';
        const partNoText = (f.partNo && f.partNo !== '-') ? f.partNo : '-';
        const remarksText = (f.remarks && f.remarks.trim() !== '' && f.remarks.trim() !== '-' && !/^(no|nil)$/i.test(f.remarks.trim())) ? f.remarks.trim() : 'NA';

        tableRows += `
          <tr id="failureRow-${f.id}">
            <td style="text-align: center;">
              <strong style="color: var(--gold-400); font-family: var(--font-mono); font-size: 12px;">${escapeHtml(String(rowSl))}</strong>
            </td>
            <td>
              <span class="hrm-date-badge"><span>📅</span><span>${escapeHtml(failDate)}</span></span>
            </td>
            <td>
              <span class="hrm-date-badge">
                <span>📅</span>
                <span style="color: ${fitDate.includes('Active') ? '#e4c153' : '#93c572'};">${escapeHtml(fitDate)}</span>
              </span>
            </td>
            <td style="text-align: center;">
              <span class="hrm-eh-badge">${escapeHtml(String(dDays))} Days</span>
            </td>
            <td>
              <span class="${isBlockYes ? 'badge-block-yes' : 'badge-block-no'}">
                ${isBlockYes ? '🛑 YES' : (inBlock.toUpperCase() === 'NO' ? '🟢 NO' : escapeHtml(inBlock))}
              </span>
            </td>
            <td style="font-size: 12px; color: #fff; line-height: 1.45; max-width: 260px;">
              <div style="font-weight: 500;">${escapeHtml(descText)}</div>
            </td>
            <td style="font-size: 12px; color: #cbd8cf; line-height: 1.45; max-width: 240px;">
              <div>${escapeHtml(actionText)}</div>
            </td>
            <td>
              ${partNoText !== '-' ? `<span class="badge-part-no">${escapeHtml(partNoText)}</span>` : '<span style="color:#738a7a; font-size:11px;">-</span>'}
            </td>
            <td style="font-size: 11.5px; color: #a4bba9; max-width: 180px;">
              <div>${escapeHtml(remarksText)}</div>
            </td>
            <td style="text-align: center;">
              ${f.isRepetitive ? `
                <span class="badge-rep-yes" onclick="window.TM_APP.highlightFailure('${f.id}', '${effectiveSubsystem}')" title="Click to highlight recurring defect #${rowSl}">
                  🔁 YES
                </span>
              ` : `
                <span class="badge-rep-no">NO</span>
              `}
            </td>
            <td style="text-align: center;">
              <div style="display: flex; gap: 5px; justify-content: center; align-items: center;">
                <button class="btn btn-dim" onclick="window.TM_APP.openEditFailureModal('${f.id}')" style="padding: 4px 8px; font-size: 11px;" title="Edit failure record">✏️</button>
                <button class="hrm-btn-delete" onclick="window.TM_APP.deleteFailureRecord('${f.id}')" style="padding: 4px 8px; font-size: 11px;" title="Delete failure record">🗑️</button>
              </div>
            </td>
          </tr>
        `;
      });
    }

    container.innerHTML = `
      <div class="panel-card" style="margin-bottom: 20px;">
        <div class="panel-header">
          <div class="panel-title gold-accent">
            <span class="indicator-circle"></span>
            <span>${icon} ${effectiveSubsystem} Failures Desk • Machine ${mId}</span>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="btn btn-secondary-pista" onclick="window.TM_APP.openLogModalForSubsystem('${effectiveSubsystem}')" style="padding: 6px 14px; font-size: 12px;">
              ➕ Log ${effectiveSubsystem} Failure
            </button>
          </div>
        </div>
        
        <div class="kpi-strip" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin-bottom: 16px;">
          <div class="kpi-chip">
            <div class="kpi-title"><span>Total Recorded Incidents</span></div>
            <div class="kpi-value-row"><span class="kpi-value pista-text">${totalCount}</span><span class="kpi-unit">cases</span></div>
          </div>
          <div class="kpi-chip gold-edge">
            <div class="kpi-title"><span>Total Down Days</span></div>
            <div class="kpi-value-row"><span class="kpi-value gold-text">${totalDownDays.toFixed(1)}</span><span class="kpi-unit">days</span></div>
          </div>
          <div class="kpi-chip alert-edge">
            <div class="kpi-title"><span>Recurring Incidents</span></div>
            <div class="kpi-value-row"><span class="kpi-value alert-text">${repeatCount}</span><span class="kpi-unit">cases</span></div>
          </div>
        </div>

        <div class="table-responsive">
          <table class="custom-table" style="font-size: 12px;">
            <thead>
              <tr>
                <th style="width: 55px; text-align: center;">Sl. No.</th>
                <th style="width: 110px;">Date of Failure</th>
                <th style="width: 110px;">Date of Rectification</th>
                <th style="width: 95px; text-align: center;">Total Down Days</th>
                <th style="width: 115px;">Whether Occurred During Block</th>
                <th style="min-width: 220px;">Detailed Description of the Failure</th>
                <th style="min-width: 200px;">Action Taken &amp; Spares Consumed</th>
                <th style="width: 120px;">Part No. of Spares Consumed</th>
                <th style="min-width: 130px;">Remarks</th>
                <th style="width: 105px; text-align: center;">Is it a Repetitive Failure?</th>
                <th style="width: 90px; text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // Update live failure count badges for the 5 subsystem tabs
  function updateTabBadges() {
    const mId = getActiveMachineId();
    const mInfo = getMachineInfo(mId);
    const isCrane = isCraneMachine(mId) || isCraneMachine(mInfo?.category) || isCraneMachine(AppState.selectedCategory);

    // Dynamically update Tab 3 label & icon
    const tabBtnTampingText = document.getElementById('tabBtnTampingText');
    if (tabBtnTampingText) {
      tabBtnTampingText.innerHTML = isCrane ? '🏗️ 3. Crane Failures' : '🔨 3. Tamping Unit Failures';
    }

    const fails = AppState.failures.filter(f => f.machineNo === mId);

    const countEngine = fails.filter(f => f.subsystem === 'Engine' || f.subsystem === 'Diesel Engine / Radiator / Fuel').length;
    const countTamping = fails.filter(f => {
      if (isCrane) {
        return f.subsystem === 'Crane' || f.subsystem === 'Tamping Unit' || /crane/i.test(f.subsystem || '') || /crane/i.test(f.sheet || '');
      } else {
        return f.subsystem === 'Tamping Unit' || f.subsystem === 'Tamping Unit / Tools / Vibration' || f.subsystem === 'Cutter';
      }
    }).length;
    const countMech = fails.filter(f => f.subsystem === 'Mechanical' || f.subsystem === 'Mechanical/Structure' || /mech/i.test(f.subsystem || '') || /mech/i.test(f.sheet || '')).length;
    const countHyd = fails.filter(f => (f.subsystem === 'Hydraulic' || f.subsystem === 'Hydraulic Circuit / Valves / Cylinders') && !/mech/i.test(f.subsystem || '') && !/mech/i.test(f.sheet || '')).length;
    const countPneu = fails.filter(f => f.subsystem === 'Pneumatic' || f.subsystem === 'Pneumatics / Brakes / Air Compressor').length;
    const countElec = fails.filter(f => f.subsystem === 'Electrical' || f.subsystem === 'Electrical / Contactors / Batteries' || f.subsystem === 'Electronics & Measuring').length;

    const bEng = document.getElementById('badgeEngineFailures');
    if (bEng) bEng.textContent = countEngine;
    const bTamp = document.getElementById('badgeTampingFailures');
    if (bTamp) bTamp.textContent = countTamping;
    const bMech = document.getElementById('badgeMechanicalFailures');
    if (bMech) bMech.textContent = countMech;
    const bHyd = document.getElementById('badgeHydraulicFailures');
    if (bHyd) bHyd.textContent = countHyd;
    const bPneu = document.getElementById('badgePneumaticFailures');
    if (bPneu) bPneu.textContent = countPneu;
    const bElec = document.getElementById('badgeElectricalFailures');
    if (bElec) bElec.textContent = countElec;
  }

  // ==========================================================================
  // UNIVERSAL FLEET SEARCH MODULE
  // Automatically lists all references in detail across all machines, 6 failure desks, and HRM
  // ==========================================================================
  const universalSearchState = {
    query: '',
    activeFilter: 'ALL',
    results: []
  };

  // Helper: Highlight keyword with gold mark
  function highlightKeyword(text, keyword) {
    if (!text) return '';
    const str = String(text);
    if (!keyword || !keyword.trim()) return escapeHtml(str);
    const escapedKw = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedKw})`, 'gi');
    return escapeHtml(str).replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  // Set search query programmatically (from suggestion pills)
  function setUniversalSearchQuery(query) {
    const input = document.getElementById('universalSearchInput');
    if (input) {
      input.value = query;
      input.focus();
    }
    performUniversalSearch(query);
  }

  // Focus universal search input
  function focusUniversalSearch() {
    const card = document.getElementById('universalSearchCard');
    const input = document.getElementById('universalSearchInput');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (input) input.focus();
  }

  // Clear universal search
  function clearUniversalSearch() {
    universalSearchState.query = '';
    universalSearchState.results = [];
    universalSearchState.activeFilter = 'ALL';

    const input = document.getElementById('universalSearchInput');
    if (input) input.value = '';

    const resultsArea = document.getElementById('universalSearchResultsArea');
    if (resultsArea) {
      resultsArea.innerHTML = '';
      resultsArea.style.display = 'none';
    }

    const countBadge = document.getElementById('universalSearchCountBadge');
    if (countBadge) countBadge.style.display = 'none';

    const btnClear = document.getElementById('btnClearUniversalSearch');
    if (btnClear) btnClear.style.display = 'none';

    const btnExport = document.getElementById('btnExportSearchResults');
    if (btnExport) btnExport.style.display = 'none';

    const btnInputClear = document.getElementById('btnInputClear');
    if (btnInputClear) btnInputClear.style.display = 'none';
  }

  // Set filter within search results
  function setUniversalSearchFilter(filterType) {
    universalSearchState.activeFilter = filterType;
    renderUniversalSearchResults(universalSearchState.results, universalSearchState.query, filterType);
  }

  // Core Search Engine: Scans all machines, 6 failure desks, and HRM
  function performUniversalSearch(rawQuery, filter = null) {
    if (filter) universalSearchState.activeFilter = filter;
    const inputEl = document.getElementById('universalSearchInput');
    const inputVal = inputEl ? inputEl.value.trim() : '';
    const query = (rawQuery !== undefined && rawQuery !== null) ? String(rawQuery).trim() : (inputVal || universalSearchState.query);
    universalSearchState.query = query;

    const resultsArea = document.getElementById('universalSearchResultsArea');
    const countBadge = document.getElementById('universalSearchCountBadge');
    const btnClear = document.getElementById('btnClearUniversalSearch');
    const btnExport = document.getElementById('btnExportSearchResults');
    const btnInputClear = document.getElementById('btnInputClear');

    if (!query || query.length === 0) {
      clearUniversalSearch();
      return;
    }

    if (btnInputClear) btnInputClear.style.display = 'block';
    if (btnClear) btnClear.style.display = 'inline-flex';

    const qLower = query.toLowerCase();
    const matches = [];

    // 1. Scan Failures across ALL machines in fleet
    AppState.failures.forEach(f => {
      const matchLocations = [];
      const desc = String(f.description || f.natureOfFailure || '');
      const action = String(f.actionTaken || f.stepsTaken || '');
      const partNo = String(f.partNo || '');
      const remarks = String(f.remarks || '');
      const sl = String(f.slNo || '');
      const mach = String(f.machineNo || '');
      const sub = String(f.subsystem || '');
      const cat = String(f.category || '');
      const div = String(f.division || '');
      const failDate = String(f.dateOfFailure || f.breakdownTime || '');
      const fitDate = String(f.dateOfRectification || f.fitTime || '');

      if (desc.toLowerCase().includes(qLower)) matchLocations.push('Detailed Description');
      if (action.toLowerCase().includes(qLower)) matchLocations.push('Action Taken & Spares');
      if (partNo.toLowerCase().includes(qLower)) matchLocations.push('Part Number');
      if (remarks.toLowerCase().includes(qLower)) matchLocations.push('Remarks');
      if (mach.toLowerCase().includes(qLower)) matchLocations.push('Machine Number');
      if (sub.toLowerCase().includes(qLower)) matchLocations.push('Subsystem');
      if (cat.toLowerCase().includes(qLower)) matchLocations.push('Category');
      if (div.toLowerCase().includes(qLower)) matchLocations.push('Division');
      if (failDate.toLowerCase().includes(qLower) || fitDate.toLowerCase().includes(qLower)) matchLocations.push('Date');
      if (sl === query) matchLocations.push('Sl. No.');

      if (matchLocations.length > 0) {
        matches.push({
          type: 'FAILURE',
          id: f.id,
          machineNo: f.machineNo,
          category: f.category || getMachineInfo(f.machineNo)?.category || 'CSM',
          division: f.division || getMachineInfo(f.machineNo)?.division || 'SBC',
          subsystem: f.subsystem,
          slNo: f.slNo || '1',
          dateOfFailure: f.dateOfFailure || f.breakdownTime || 'N/A',
          dateOfRectification: f.dateOfRectification || f.fitTime || '⚠️ Active',
          totalDownDays: f.totalDownDays !== undefined && f.totalDownDays !== null ? f.totalDownDays : ((parseFloat(f.downHours) || 0) / 24).toFixed(1),
          whetherInBlock: f.whetherInBlock || 'NO',
          description: desc || '-',
          actionTaken: action || '-',
          partNo: (partNo && partNo !== '-') ? partNo : '-',
          remarks: (remarks && remarks.trim() !== '' && remarks.trim() !== '-' && !/^(no|nil)$/i.test(remarks.trim())) ? remarks.trim() : 'NA',
          isRepetitive: !!f.isRepetitive,
          matchLocations: matchLocations,
          rawRecord: f
        });
      }
    });

    // 2. Scan History Register Module (HRM) across ALL machines
    Object.keys(HRM_DATA).forEach(mId => {
      const mHrm = HRM_DATA[mId];
      if (!mHrm || !mHrm.items) return;
      const mInfo = getMachineInfo(mId);
      const cat = mHrm.category || mInfo?.category || 'CSM';
      const div = mHrm.division || mInfo?.division || 'UBL';

      mHrm.items.forEach(it => {
        const hrmMatchLocations = [];
        const title = String(it.title || '');
        const pDate = String(it.presentDate || '');
        const pEh = String(it.presentEngineHours || '');
        const pRem = String(it.presentRemarks || '');

        if (title.toLowerCase().includes(qLower)) hrmMatchLocations.push('Canonical Item Description');
        if (pRem.toLowerCase().includes(qLower)) hrmMatchLocations.push('Present Remarks');
        if (pDate.toLowerCase().includes(qLower)) hrmMatchLocations.push('Present Attention Date');
        if (pEh.toLowerCase().includes(qLower)) hrmMatchLocations.push('Engine Hours');
        if (mId.toLowerCase().includes(qLower)) hrmMatchLocations.push('Machine Number');

        // Historical records within this item
        let historicalMatches = 0;
        if (it.records && it.records.length > 0) {
          it.records.forEach(r => {
            if (String(r.remarks || '').toLowerCase().includes(qLower) ||
                String(r.rawDate || '').toLowerCase().includes(qLower) ||
                String(r.engineHours || '').toLowerCase().includes(qLower)) {
              historicalMatches++;
            }
          });
          if (historicalMatches > 0) {
            hrmMatchLocations.push(`Historical Records (${historicalMatches} log entries)`);
          }
        }

        if (hrmMatchLocations.length > 0) {
          matches.push({
            type: 'HRM',
            id: `hrm_${mId}_${it.itemNum}`,
            machineNo: mId,
            category: cat,
            division: div,
            subsystem: 'HRM',
            itemNum: it.itemNum,
            title: title,
            presentDate: pDate,
            presentEngineHours: pEh,
            presentRemarks: (pRem && pRem.trim() !== '' && pRem.trim() !== '-' && !/^(no|nil)$/i.test(pRem.trim())) ? pRem.trim() : 'NA',
            historicalCount: (it.records || []).length,
            matchLocations: hrmMatchLocations,
            rawItem: it
          });
        }
      });
    });

    universalSearchState.results = matches;
    renderUniversalSearchResults(matches, query, universalSearchState.activeFilter);
  }

  // Render Search Results Desk with rich 10-column cards
  function renderUniversalSearchResults(matches, query, activeFilter = 'ALL') {
    const resultsArea = document.getElementById('universalSearchResultsArea');
    const countBadge = document.getElementById('universalSearchCountBadge');
    const btnExport = document.getElementById('btnExportSearchResults');
    if (!resultsArea) return;

    resultsArea.style.display = 'block';

    const totalMatches = matches.length;
    if (countBadge) {
      countBadge.style.display = 'inline-block';
      countBadge.textContent = `${totalMatches} ${totalMatches === 1 ? 'match' : 'matches'}`;
    }
    if (btnExport) {
      btnExport.style.display = totalMatches > 0 ? 'inline-flex' : 'none';
    }

    if (totalMatches === 0) {
      resultsArea.innerHTML = `
        <div class="search-empty-state">
          <div style="font-size: 38px; margin-bottom: 8px;">🔍</div>
          <div style="font-size: 15px; font-weight: 700; color: #cbd8cf;">No references found for "${escapeHtml(query)}"</div>
          <div style="font-size: 12px; margin-top: 4px; color: #8fa696;">
            Try checking spelling or search using another keyword (e.g. Cardan, Alternator, Cylinder, Valve, Filter, Bearing, POH, IOH).
          </div>
        </div>
      `;
      return;
    }

    // Counts for filter pills
    const failMatches = matches.filter(m => m.type === 'FAILURE');
    const hrmMatches = matches.filter(m => m.type === 'HRM');
    const uniqueMachines = new Set(matches.map(m => m.machineNo));
    const totalDownDays = failMatches.reduce((sum, f) => sum + (parseFloat(f.totalDownDays) || 0), 0);
    const repeatCount = failMatches.filter(f => f.isRepetitive).length;

    // Subsystem counts
    const engCount = failMatches.filter(f => f.subsystem === 'Engine').length;
    const tampCount = failMatches.filter(f => f.subsystem === 'Tamping Unit' || f.subsystem === 'Crane').length;
    const mechCount = failMatches.filter(f => f.subsystem === 'Mechanical').length;
    const hydCount = failMatches.filter(f => f.subsystem === 'Hydraulic').length;
    const pneuCount = failMatches.filter(f => f.subsystem === 'Pneumatic').length;
    const elecCount = failMatches.filter(f => f.subsystem === 'Electrical').length;

    // Filter list according to activeFilter
    let filteredList = matches;
    if (activeFilter === 'FAILURES') {
      filteredList = failMatches;
    } else if (activeFilter === 'HRM') {
      filteredList = hrmMatches;
    } else if (activeFilter === 'Engine') {
      filteredList = failMatches.filter(f => f.subsystem === 'Engine');
    } else if (activeFilter === 'Tamping Unit' || activeFilter === 'Crane') {
      filteredList = failMatches.filter(f => f.subsystem === 'Tamping Unit' || f.subsystem === 'Crane');
    } else if (activeFilter === 'Mechanical') {
      filteredList = failMatches.filter(f => f.subsystem === 'Mechanical');
    } else if (activeFilter === 'Hydraulic') {
      filteredList = failMatches.filter(f => f.subsystem === 'Hydraulic');
    } else if (activeFilter === 'Pneumatic') {
      filteredList = failMatches.filter(f => f.subsystem === 'Pneumatic');
    } else if (activeFilter === 'Electrical') {
      filteredList = failMatches.filter(f => f.subsystem === 'Electrical');
    }

    // Generate Cards Markup
    let cardsHtml = '';
    filteredList.forEach(r => {
      const divBadgeClass = r.division === 'SBC' ? 'background: rgba(37,99,235,0.25); color: #60a5fa; border: 1px solid rgba(37,99,235,0.4);'
                          : r.division === 'MYS' ? 'background: rgba(22,163,74,0.25); color: #4ade80; border: 1px solid rgba(22,163,74,0.4);'
                          : 'background: rgba(128,0,0,0.3); color: #f87171; border: 1px solid rgba(153,27,27,0.5);';
      const divEmoji = r.division === 'SBC' ? '🔵' : r.division === 'MYS' ? '🟢' : '🟤';

      let subIcon = '⚙️';
      if (r.subsystem === 'Crane') subIcon = '🏗️';
      else if (r.subsystem === 'Tamping Unit') subIcon = '🔨';
      else if (r.subsystem === 'Mechanical') subIcon = '🔩';
      else if (r.subsystem === 'Hydraulic') subIcon = '💧';
      else if (r.subsystem === 'Pneumatic') subIcon = '💨';
      else if (r.subsystem === 'Electrical') subIcon = '⚡';
      else if (r.subsystem === 'HRM') subIcon = '📜';

      const matchPills = r.matchLocations.map(loc => `<span class="search-match-badge">📍 ${escapeHtml(loc)}</span>`).join(' ');

      if (r.type === 'FAILURE') {
        const isBlockYes = (r.whetherInBlock.toUpperCase() === 'YES' || r.whetherInBlock.toUpperCase().includes('BLOCK'));
        cardsHtml += `
          <div class="search-result-card" id="searchResult-${r.id}">
            <div class="search-result-top">
              <div class="search-result-meta-row">
                <span class="badge badge-subsystem" style="font-weight: 700; font-size: 12px; color: #fff;">${escapeHtml(r.machineNo)}</span>
                <span class="badge" style="background: rgba(212,175,55,0.15); color: var(--gold-400); border: 1px solid rgba(212,175,55,0.3);">${escapeHtml(r.category)}</span>
                <span class="badge" style="${divBadgeClass}">${divEmoji} ${escapeHtml(r.division)}</span>
                <span class="badge badge-gold" style="font-weight: 600;">${subIcon} ${escapeHtml(r.subsystem)} Failures</span>
                ${matchPills}
              </div>
              <div class="search-card-actions">
                <button class="btn btn-secondary-pista" onclick="window.TM_APP.jumpToSearchResult('${r.machineNo}', '${r.category}', '${r.subsystem}', '${r.id}', '')" style="padding: 4px 12px; font-size: 11.5px;">
                  <span>👉 Jump to Desk</span>
                </button>
                <button class="btn btn-dim" onclick="window.TM_APP.openEditFailureModal('${r.id}')" style="padding: 4px 8px; font-size: 11.5px;" title="Edit failure record">
                  <span>✏️</span>
                </button>
              </div>
            </div>

            <div class="search-details-grid">
              <div class="search-field-block" style="grid-column: span 2;">
                <div class="search-field-label">Detailed Description of Failure</div>
                <div class="search-field-value" style="font-size: 13px; font-weight: 500; color: #fff;">
                  ${highlightKeyword(r.description, query)}
                </div>
              </div>

              <div class="search-field-block" style="grid-column: span 2;">
                <div class="search-field-label">Action Taken &amp; Spares Consumed</div>
                <div class="search-field-value" style="color: #cbd8cf;">
                  ${highlightKeyword(r.actionTaken, query)}
                </div>
              </div>

              <div class="search-field-block">
                <div class="search-field-label">Failure &amp; Rectification Dates</div>
                <div class="search-field-value">
                  <div>📅 Breakdown: <strong>${highlightKeyword(r.dateOfFailure, query)}</strong></div>
                  <div>📅 Restored: <strong style="color: ${r.dateOfRectification.includes('Active') ? '#e4c153' : '#93c572'};">${highlightKeyword(r.dateOfRectification, query)}</strong></div>
                </div>
              </div>

              <div class="search-field-block">
                <div class="search-field-label">Downtime &amp; Operational Impact</div>
                <div class="search-field-value">
                  <div>⏱️ Down Days: <strong class="gold-text">${r.totalDownDays} Days</strong></div>
                  <div>🛑 Block Occurrence: <strong class="${isBlockYes ? 'alert-text' : 'pista-text'}">${isBlockYes ? 'YES (In Block)' : 'NO'}</strong></div>
                </div>
              </div>

              <div class="search-field-block">
                <div class="search-field-label">Part No. of Spares</div>
                <div class="search-field-value">
                  ${r.partNo !== '-' ? `<span class="badge-part-no">${highlightKeyword(r.partNo, query)}</span>` : '<span style="color:#799181;">None Recorded</span>'}
                </div>
              </div>

              <div class="search-field-block">
                <div class="search-field-label">Remarks &amp; Surveillance</div>
                <div class="search-field-value">
                  <div>${highlightKeyword(r.remarks, query)}</div>
                  <div style="margin-top: 3px;">
                    ${r.isRepetitive ? '<span class="badge-rep-yes">🔁 Recurring Defect Detected</span>' : '<span class="badge-rep-no">Isolated Incident</span>'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
      } else {
        // HRM Item Card
        cardsHtml += `
          <div class="search-result-card hrm-card" id="searchResult-${r.id}">
            <div class="search-result-top">
              <div class="search-result-meta-row">
                <span class="badge badge-subsystem" style="font-weight: 700; font-size: 12px; color: #fff;">${escapeHtml(r.machineNo)}</span>
                <span class="badge" style="background: rgba(212,175,55,0.15); color: var(--gold-400); border: 1px solid rgba(212,175,55,0.3);">${escapeHtml(r.category)}</span>
                <span class="badge" style="${divBadgeClass}">${divEmoji} ${escapeHtml(r.division)}</span>
                <span class="badge" style="background: rgba(96,165,250,0.18); color: #60a5fa; border: 1px solid rgba(96,165,250,0.35); font-weight: 600;">📜 HRM History Register</span>
                ${matchPills}
              </div>
              <div class="search-card-actions">
                <button class="btn btn-secondary-pista" onclick="window.TM_APP.jumpToSearchResult('${r.machineNo}', '${r.category}', 'HRM', '', '${r.itemNum}')" style="padding: 4px 12px; font-size: 11.5px;">
                  <span>👉 Jump to HRM Item #${escapeHtml(String(r.itemNum))}</span>
                </button>
              </div>
            </div>

            <div class="search-details-grid">
              <div class="search-field-block" style="grid-column: span 2;">
                <div class="search-field-label">Parameter Description (Canonical Item #${escapeHtml(String(r.itemNum))})</div>
                <div class="search-field-value" style="font-size: 13px; font-weight: 600; color: #fff;">
                  ${highlightKeyword(r.title, query)}
                </div>
              </div>

              <div class="search-field-block">
                <div class="search-field-label">Present Attention Date</div>
                <div class="search-field-value">
                  <span class="hrm-date-badge"><span>📅</span><span>${highlightKeyword(r.presentDate, query)}</span></span>
                </div>
              </div>

              <div class="search-field-block">
                <div class="search-field-label">Engine Hours at Attention</div>
                <div class="search-field-value">
                  <span class="hrm-eh-badge">${highlightKeyword(r.presentEngineHours, query)} EH</span>
                </div>
              </div>

              <div class="search-field-block" style="grid-column: span 2;">
                <div class="search-field-label">Present Remarks &amp; Spares Consumed</div>
                <div class="search-field-value" style="color: #cbd8cf;">
                  ${highlightKeyword(r.presentRemarks, query)}
                  ${r.historicalCount > 0 ? `<div style="font-size: 11px; margin-top: 4px; color: #8da494;">(${r.historicalCount} historical maintenance interventions in archive)</div>` : ''}
                </div>
              </div>
            </div>
          </div>
        `;
      }
    });

    // Render Container Content
    resultsArea.innerHTML = `
      <div class="search-kpi-strip">
        <div class="kpi-chip">
          <div class="kpi-title"><span>Total References</span><span>🔍</span></div>
          <div class="kpi-value-row"><span class="kpi-value pista-text">${totalMatches}</span><span class="kpi-unit">records</span></div>
        </div>
        <div class="kpi-chip gold-edge">
          <div class="kpi-title"><span>Machines Involved</span><span>🚂</span></div>
          <div class="kpi-value-row"><span class="kpi-value gold-text">${uniqueMachines.size}</span><span class="kpi-unit">units</span></div>
        </div>
        <div class="kpi-chip">
          <div class="kpi-title"><span>Cumulative Down Days</span><span>⏳</span></div>
          <div class="kpi-value-row"><span class="kpi-value">${totalDownDays.toFixed(1)}</span><span class="kpi-unit">days</span></div>
        </div>
        <div class="kpi-chip alert-edge">
          <div class="kpi-title"><span>Recurring Defects</span><span>🔁</span></div>
          <div class="kpi-value-row"><span class="kpi-value alert-text">${repeatCount}</span><span class="kpi-unit">cases</span></div>
        </div>
      </div>

      <div class="search-filter-pills">
        <span class="search-tag-label">Filter View:</span>
        <button class="search-filter-btn ${activeFilter === 'ALL' ? 'active' : ''}" onclick="window.TM_APP.setUniversalSearchFilter('ALL')">
          All References (${totalMatches})
        </button>
        <button class="search-filter-btn ${activeFilter === 'FAILURES' ? 'active' : ''}" onclick="window.TM_APP.setUniversalSearchFilter('FAILURES')">
          Failure Logs (${failMatches.length})
        </button>
        <button class="search-filter-btn ${activeFilter === 'HRM' ? 'active' : ''}" onclick="window.TM_APP.setUniversalSearchFilter('HRM')">
          HRM Module (${hrmMatches.length})
        </button>
        ${mechCount > 0 ? `<button class="search-filter-btn ${activeFilter === 'Mechanical' ? 'active' : ''}" onclick="window.TM_APP.setUniversalSearchFilter('Mechanical')">🔩 Mechanical (${mechCount})</button>` : ''}
        ${hydCount > 0 ? `<button class="search-filter-btn ${activeFilter === 'Hydraulic' ? 'active' : ''}" onclick="window.TM_APP.setUniversalSearchFilter('Hydraulic')">💧 Hydraulic (${hydCount})</button>` : ''}
        ${engCount > 0 ? `<button class="search-filter-btn ${activeFilter === 'Engine' ? 'active' : ''}" onclick="window.TM_APP.setUniversalSearchFilter('Engine')">⚙️ Engine (${engCount})</button>` : ''}
        ${tampCount > 0 ? `<button class="search-filter-btn ${activeFilter === 'Tamping Unit' ? 'active' : ''}" onclick="window.TM_APP.setUniversalSearchFilter('Tamping Unit')">🔨/🏗️ Tamping/Crane (${tampCount})</button>` : ''}
        ${pneuCount > 0 ? `<button class="search-filter-btn ${activeFilter === 'Pneumatic' ? 'active' : ''}" onclick="window.TM_APP.setUniversalSearchFilter('Pneumatic')">💨 Pneumatic (${pneuCount})</button>` : ''}
        ${elecCount > 0 ? `<button class="search-filter-btn ${activeFilter === 'Electrical' ? 'active' : ''}" onclick="window.TM_APP.setUniversalSearchFilter('Electrical')">⚡ Electrical (${elecCount})</button>` : ''}
      </div>

      <div class="search-results-list">
        ${cardsHtml}
      </div>
    `;
  }

  // Jump from search result directly to specific machine, desk & row
  function jumpToSearchResult(machineId, category, subsystem, incidentId, hrmItemNum) {
    if (!machineId) return;

    // 1. Select category and machine
    const cat = category || getMachineInfo(machineId)?.category || AppState.selectedCategory;
    AppState.selectedCategory = cat;
    AppState.selectedMachine = machineId;

    updateMachineDropdown();
    const machSelect = document.getElementById('machineSelect');
    if (machSelect) machSelect.value = machineId;
    updateMachineContextMeta();

    // 2. Select Tab
    let targetTab = 'hrm-view';
    let deskKey = 'HRM';
    let deskContainerId = 'hrm-view';

    const subLower = (subsystem || '').toLowerCase();
    if (subLower === 'hrm') {
      targetTab = 'hrm-view';
    } else if (subLower.includes('tamp') || subLower.includes('crane')) {
      targetTab = 'tamping-view';
      const isCrane = isCraneMachine(machineId) || isCraneMachine(cat);
      deskKey = isCrane ? 'Crane' : 'Tamping Unit';
      deskContainerId = 'subsystemDesk-tamping';
    } else if (subLower.includes('mech')) {
      targetTab = 'mechanical-view';
      deskKey = 'Mechanical';
      deskContainerId = 'subsystemDesk-mechanical';
    } else if (subLower.includes('hyd')) {
      targetTab = 'hydraulic-view';
      deskKey = 'Hydraulic';
      deskContainerId = 'subsystemDesk-hydraulic';
    } else if (subLower.includes('pneum') || subLower.includes('brake') || subLower.includes('air')) {
      targetTab = 'pneumatic-view';
      deskKey = 'Pneumatic';
      deskContainerId = 'subsystemDesk-pneumatic';
    } else if (subLower.includes('elec')) {
      targetTab = 'electrical-view';
      deskKey = 'Electrical';
      deskContainerId = 'subsystemDesk-electrical';
    } else {
      targetTab = 'engine-view';
      deskKey = 'Engine';
      deskContainerId = 'subsystemDesk-engine';
    }

    // 3. Update Tab UI
    AppState.activeTab = targetTab;
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === targetTab);
    });
    document.querySelectorAll('.tab-pane').forEach(p => {
      p.classList.toggle('active', p.id === targetTab);
    });

    // 4. Render specific tab
    if (targetTab === 'hrm-view') {
      renderHrmView();
    } else {
      renderSubsystemDesk(deskKey, deskContainerId);
    }
    updateTabBadges();

    // 5. Scroll to target element with pulse highlight
    setTimeout(() => {
      let targetEl = null;
      if (incidentId) {
        targetEl = document.getElementById(`failureRow-${incidentId}`);
      } else if (hrmItemNum) {
        targetEl = document.getElementById(`hrmRow-${hrmItemNum}`);
      }

      if (targetEl) {
        document.querySelectorAll('.highlight-pulse-row').forEach(el => el.classList.remove('highlight-pulse-row'));
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.classList.add('highlight-pulse-row');
        showToast(`Jumped to ${machineId} • ${subsystem}`);
      } else {
        const pane = document.getElementById(targetTab);
        if (pane) pane.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showToast(`Opened ${machineId} • ${subsystem} desk`);
      }
    }, 220);
  }

  // Export filtered search references to Excel
  async function exportSearchResultsToExcel() {
    if (typeof XLSX === 'undefined' || !XLSX.utils) {
      showToast('Loading SheetJS search export engine...', false);
      try {
        await ensureXLSX();
      } catch (e) {
        showToast('SheetJS library not ready for export.', true);
        return;
      }
    }
    if (!universalSearchState.results || universalSearchState.results.length === 0) {
      showToast('No search results to export.', true);
      return;
    }

    const wb = XLSX.utils.book_new();
    const rows = [
      ['INDIAN RAILWAYS - SOUTH WESTERN RAILWAY', '', '', '', '', '', '', '', '', '', '', ''],
      [`UNIVERSAL SEARCH RESULTS FOR KEYWORD: "${universalSearchState.query.toUpperCase()}"`, '', '', '', '', '', '', '', '', '', '', `TOTAL REFERENCES: ${universalSearchState.results.length}`],
      ['GENERATED ON: ' + new Date().toLocaleString(), '', '', '', '', '', '', '', '', '', '', ''],
      [],
      ['Sl. No.', 'Type', 'Machine No.', 'Category', 'Division', 'Subsystem / Module', 'Date / Attention Date', 'Rectification / EH', 'Down Days', 'In Block', 'Detailed Description / Parameter', 'Action Taken / Spares Consumed', 'Part No.', 'Remarks', 'Repetitive Defect', 'Matched Fields']
    ];

    universalSearchState.results.forEach((r, idx) => {
      if (r.type === 'FAILURE') {
        rows.push([
          idx + 1,
          'FAILURE INCIDENT',
          r.machineNo,
          r.category,
          r.division,
          r.subsystem,
          r.dateOfFailure,
          r.dateOfRectification,
          r.totalDownDays,
          r.whetherInBlock,
          r.description,
          r.actionTaken,
          r.partNo,
          r.remarks,
          r.isRepetitive ? 'YES' : 'NO',
          r.matchLocations.join(', ')
        ]);
      } else {
        rows.push([
          idx + 1,
          'HRM PARAMETER',
          r.machineNo,
          r.category,
          r.division,
          'HRM Item #' + r.itemNum,
          r.presentDate,
          r.presentEngineHours ? r.presentEngineHours + ' EH' : 'NA',
          'NA',
          'NA',
          r.title,
          r.presentRemarks,
          '-',
          r.presentRemarks,
          'NA',
          r.matchLocations.join(', ')
        ]);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 8 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 20 },
      { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 45 }, { wch: 45 },
      { wch: 18 }, { wch: 25 }, { wch: 14 }, { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'SEARCH RESULTS');

    const safeQuery = universalSearchState.query.replace(/[^A-Za-z0-9_-]/g, '_');
    const fileName = `Universal_Search_${safeQuery}_${new Date().toISOString().substring(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast(`Exported ${universalSearchState.results.length} search references to ${fileName}`);
  }

  // Commissioning Date Editor Handlers
  function toggleCommDateEditor(show = null) {
    const box = document.getElementById('commDateEditorBox');
    const btn = document.getElementById('btnEditCommDate');
    if (!box) return;
    const isShowing = box.style.display !== 'none';
    const next = (show !== null) ? show : !isShowing;
    box.style.display = next ? 'flex' : 'none';
    if (btn) btn.style.display = next ? 'none' : 'inline-block';
  }

  function saveCommissioningDate() {
    const mId = getActiveMachineId();
    const input = document.getElementById('inputCommDateCalendar');
    if (!input || !input.value) {
      showToast('Please select a valid commissioning date using the calendar picker', true);
      return;
    }

    const newDate = input.value;
    if (!HRM_DATA[mId]) return;

    HRM_DATA[mId].commissioningDate = newDate;
    saveHrmData();
    toggleCommDateEditor(false);
    renderHrmView();
    showToast(`Updated commissioning date for ${mId} to ${newDate}`);
  }

  function toggleHrmHistory(mId, itemIndex) {
    const drawer = document.getElementById(`hrm-drawer-${itemIndex}`);
    const arrow = document.getElementById(`hrmToggleArrow-${itemIndex}`);
    if (!drawer) return;
    if (drawer.style.display === 'none') {
      drawer.style.display = 'table-row';
      if (arrow) arrow.textContent = '▲';
    } else {
      drawer.style.display = 'none';
      if (arrow) arrow.textContent = '▼';
    }
  }

  function openAddHrmEntryModal(itemIndex = 0) {
    const mId = getActiveMachineId();
    const hrm = HRM_DATA[mId];
    if (!hrm) return;

    document.getElementById('hrmModalMachineId').value = mId;
    document.getElementById('hrmModalRecordId').value = '';

    const select = document.getElementById('hrmModalItemSelect');
    if (select) {
      select.innerHTML = '';
      hrm.items.forEach((it, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `${it.itemNum || (idx + 1)}. ${it.title}`;
        if (idx === itemIndex) opt.selected = true;
        select.appendChild(opt);
      });
    }

    // Set default date to today in YYYY-MM-DD
    const dateInput = document.getElementById('hrmModalDateInput');
    if (dateInput) {
      dateInput.value = new Date().toISOString().substring(0, 10);
    }

    const ehInput = document.getElementById('hrmModalEhInput');
    if (ehInput) {
      const activeIt = hrm.items[itemIndex];
      ehInput.value = (activeIt && activeIt.presentEngineHours && activeIt.presentEngineHours !== 'NA') ? activeIt.presentEngineHours : '';
    }

    const remarksInput = document.getElementById('hrmModalRemarksInput');
    if (remarksInput) {
      const activeIt = hrm.items[itemIndex];
      remarksInput.value = (activeIt && activeIt.presentRemarks) ? activeIt.presentRemarks : '';
    }

    openModal('hrmEntryModal');
  }

  function handleHrmEntrySubmit(event) {
    event.preventDefault();
    const mId = document.getElementById('hrmModalMachineId').value || getActiveMachineId();
    const itemIndex = parseInt(document.getElementById('hrmModalItemSelect').value, 10);
    const dateVal = document.getElementById('hrmModalDateInput').value;
    const ehVal = document.getElementById('hrmModalEhInput').value.trim();
    const rawRem = document.getElementById('hrmModalRemarksInput').value.trim();
    const remarksVal = (rawRem && rawRem !== '-' && !/^(no|nil)$/i.test(rawRem)) ? rawRem : 'NA';

    if (!HRM_DATA[mId] || !HRM_DATA[mId].items[itemIndex]) {
      showToast('Error: Machine HRM record not found', true);
      return;
    }

    const it = HRM_DATA[mId].items[itemIndex];
    if (!it.records) it.records = [];

    const newRec = {
      id: `rec_${mId}_it${itemIndex}_${Date.now()}`,
      colPair: 'USER-ENTRY',
      rawDate: dateVal,
      isoDate: dateVal,
      displayDate: dateVal,
      engineHours: ehVal || 'NA',
      remarks: remarksVal
    };

    it.records.push(newRec);

    // Recompute present values (latest date)
    const isoRecs = it.records.filter(r => r.isoDate).sort((a, b) => a.isoDate.localeCompare(b.isoDate));
    const latest = isoRecs.length > 0 ? isoRecs[isoRecs.length - 1] : it.records[it.records.length - 1];

    it.presentDate = latest.displayDate || latest.isoDate || dateVal;
    it.presentEngineHours = latest.engineHours || ehVal || 'NA';
    it.presentRemarks = latest.remarks || remarksVal || 'NA';

    saveHrmData();
    renderHrmView();
    closeModal('hrmEntryModal');
    showToast(`Added new entry to '${it.title}' for ${mId}`);
  }

  function deleteHrmRecord(mId, itemIndex, recordId) {
    if (!confirm('Are you sure you want to delete this historical record?')) return;

    const hrm = HRM_DATA[mId];
    if (!hrm || !hrm.items[itemIndex]) return;

    const it = hrm.items[itemIndex];
    it.records = it.records.filter(r => r.id !== recordId);

    // Recompute present values
    if (it.records.length > 0) {
      const isoRecs = it.records.filter(r => r.isoDate).sort((a, b) => a.isoDate.localeCompare(b.isoDate));
      const latest = isoRecs.length > 0 ? isoRecs[isoRecs.length - 1] : it.records[it.records.length - 1];
      it.presentDate = latest.displayDate || latest.isoDate || 'NA';
      it.presentEngineHours = latest.engineHours || 'NA';
      it.presentRemarks = latest.remarks || 'NA';
    } else {
      it.presentDate = 'NA';
      it.presentEngineHours = 'NA';
      it.presentRemarks = 'NA';
    }

    saveHrmData();
    renderHrmView();
    showToast(`Record deleted from '${it.title}'`);
  }

  function deletePresentHrmEntry(mId, itemIndex) {
    const hrm = HRM_DATA[mId];
    if (!hrm || !hrm.items[itemIndex]) return;
    const it = hrm.items[itemIndex];

    if (!confirm(`Are you sure you want to delete the present entry for '${it.title}'?`)) return;

    if (it.records && it.records.length > 0) {
      it.records.pop();
      if (it.records.length > 0) {
        const isoRecs = it.records.filter(r => r.isoDate).sort((a, b) => a.isoDate.localeCompare(b.isoDate));
        const latest = isoRecs.length > 0 ? isoRecs[isoRecs.length - 1] : it.records[it.records.length - 1];
        it.presentDate = latest.displayDate || latest.isoDate || 'NA';
        it.presentEngineHours = latest.engineHours || 'NA';
        it.presentRemarks = latest.remarks || 'NA';
      } else {
        it.presentDate = 'NA';
        it.presentEngineHours = 'NA';
        it.presentRemarks = 'NA';
      }
    } else {
      it.presentDate = 'NA';
      it.presentEngineHours = 'NA';
      it.presentRemarks = 'NA';
    }

    saveHrmData();
    renderHrmView();
    showToast(`Cleared present entry for '${it.title}'`);
  }

  function resetMachineHrm() {
    const mId = getActiveMachineId();
    if (!confirm(`Reset History Register Module for machine ${mId} to authentic workbook data? Any custom entries will be reverted.`)) return;

    if (typeof window !== 'undefined' && window.REAL_SWR_FLEET_DATA && window.REAL_SWR_FLEET_DATA.historyRegisters && window.REAL_SWR_FLEET_DATA.historyRegisters[mId]) {
      HRM_DATA[mId] = JSON.parse(JSON.stringify(window.REAL_SWR_FLEET_DATA.historyRegisters[mId]));
      saveHrmData();
      renderHrmView();
      showToast(`Reset ${mId} HRM to authentic workbook records.`);
    }
  }

  async function exportCurrentHrm() {
    const mId = getActiveMachineId();
    const hrm = HRM_DATA[mId];
    if (!hrm) return;

    const rows = hrm.items.map(it => ({
      'Item No': it.itemNum,
      'Parameter Description': it.title,
      'Present Date': it.presentDate,
      'Present Engine Hours': it.presentEngineHours,
      'Technical Remarks / Spares': it.presentRemarks,
      'Total Historical Records Logged': it.records ? it.records.length : 0
    }));

    if (typeof XLSX === 'undefined' || !XLSX.utils) {
      try {
        await ensureXLSX();
      } catch (e) {
        showToast('SheetJS library not available for HRM export.', true);
        return;
      }
    }

    if (typeof XLSX !== 'undefined') {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${mId}_HRM`);
      XLSX.writeFile(wb, `${mId}_History_Register_Module_${new Date().toISOString().substring(0, 10)}.xlsx`);
      showToast(`Exported HRM register for ${mId}`);
    }
  }

  function adjustSubsystemOptionsForMachine(machineIdOrCat) {
    const isCrane = isCraneMachine(machineIdOrCat);
    const optTamp = document.getElementById('optFormTampingUnit');
    const optCrane = document.getElementById('optFormCrane');
    if (optTamp && optCrane) {
      if (isCrane) {
        optCrane.style.display = '';
        optTamp.style.display = 'none';
      } else {
        optCrane.style.display = 'none';
        optTamp.style.display = '';
      }
    }
  }

  function openLogModalForSubsystem(subsystemName) {
    openLogModal();
    const mId = getActiveMachineId();
    const isCrane = isCraneMachine(mId) || isCraneMachine(AppState.selectedCategory);

    const machSelect = document.getElementById('formMachineNo');
    if (machSelect) machSelect.value = mId;

    adjustSubsystemOptionsForMachine(mId);

    const subSelect = document.getElementById('formSubsystem');
    if (subSelect) {
      if ((subsystemName === 'Crane' || subsystemName === 'Tamping Unit') && isCrane) {
        subSelect.value = 'Crane';
      } else if (subsystemName === 'Crane' || subsystemName === 'Tamping Unit') {
        subSelect.value = 'Tamping Unit';
      } else {
        for (let opt of subSelect.options) {
          if (opt.value.toLowerCase().includes(subsystemName.toLowerCase())) {
            opt.selected = true;
            break;
          }
        }
      }
    }
  }

  function deleteFailureRecord(id) {
    const f = AppState.failures.find(x => x.id === id);
    const label = f ? `entry #${f.slNo || ''} (${f.machineNo} • ${f.subsystem})` : 'this failure record';
    if (!confirm(`Are you sure you want to delete ${label}?`)) return;

    AppState.failures = AppState.failures.filter(f => f.id !== id);
    classifyRepetitiveFailures(AppState.failures);
    saveDataset();
    updateTabBadges();
    renderAll();
    showToast(`Deleted ${label}`);
  }

  // ==========================================================================
  // DELETE MACHINE DATA (UPLOADED WRONGLY)
  // ==========================================================================
  function openDeleteMachineModal(targetMachineId) {
    const mId = targetMachineId || (AppState.selectedMachine !== 'ALL' ? AppState.selectedMachine : null);
    const selectEl = document.getElementById('deleteTargetMachineSelect');
    if (!selectEl) return;

    selectEl.innerHTML = '';

    // Collect all machines across FLEET_DIRECTORY
    const allMachines = [];
    Object.keys(FLEET_DIRECTORY).forEach(cat => {
      FLEET_DIRECTORY[cat].forEach(m => {
        allMachines.push(m);
      });
    });

    // Also include any machines present in failures
    AppState.failures.forEach(f => {
      if (!allMachines.some(m => m.id.toUpperCase() === f.machineNo.toUpperCase())) {
        allMachines.push({
          id: f.machineNo,
          category: f.category || 'Special',
          division: f.division || 'SBC',
          model: `${f.category || 'Track'} Machine`
        });
      }
    });

    if (allMachines.length === 0) {
      showToast('No machines currently registered in fleet.', true);
      return;
    }

    // Sort alphabetically by ID
    allMachines.sort((a, b) => a.id.localeCompare(b.id));

    allMachines.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.id} [${m.category}] - ${m.division} Division (${m.model || 'Track Machine'})`;
      if (mId && m.id.toUpperCase() === mId.toUpperCase()) {
        opt.selected = true;
      }
      selectEl.appendChild(opt);
    });

    const chosenId = selectEl.value;
    updateDeleteMachineDetails(chosenId);
    openModal('deleteMachineModal');
  }

  function updateDeleteMachineDetails(machineId) {
    const summaryBox = document.getElementById('deleteMachineSummaryBox');
    if (!summaryBox || !machineId) return;

    const mInfo = getMachineInfo(machineId);
    const mFailures = AppState.failures.filter(f => f.machineNo.toUpperCase() === machineId.toUpperCase());
    const mHrm = HRM_DATA[machineId];

    summaryBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid var(--border-dim); padding-bottom: 6px;">
        <span style="font-weight: 700; color: var(--gold-400); font-size: 13.5px;">${escapeHtml(machineId)}</span>
        <span class="badge badge-subsystem">${escapeHtml(mInfo ? mInfo.category : 'Fleet')}</span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
        <div><strong>Division:</strong> <span style="color:var(--pista-300);">${escapeHtml(mInfo ? mInfo.division : 'SWR')}</span></div>
        <div><strong>Model:</strong> <span style="color:#cbd8cf;">${escapeHtml(mInfo ? mInfo.model : 'Track Machine')}</span></div>
        <div><strong>Failure Incidents:</strong> <span style="color:#ff8a80; font-weight:700;">${mFailures.length} recorded cases</span></div>
        <div><strong>History Register:</strong> <span style="color:${mHrm ? 'var(--pista-300)' : '#cbd8cf'};">${mHrm ? '16 Items Present' : 'No HRM Log'}</span></div>
      </div>
    `;
  }

  function confirmDeleteMachine() {
    const selectEl = document.getElementById('deleteTargetMachineSelect');
    if (!selectEl) return;
    const mId = selectEl.value;
    if (!mId) return;

    if (!confirm(`⚠️ ARE YOU SURE YOU WANT TO PERMANENTLY DELETE MACHINE ${mId}?\n\nThis will purge all failure incidents, HRM records, and remove the machine from your fleet.`)) {
      return;
    }

    // 1. Remove machine from FLEET_DIRECTORY
    Object.keys(FLEET_DIRECTORY).forEach(cat => {
      FLEET_DIRECTORY[cat] = FLEET_DIRECTORY[cat].filter(m => m.id.toUpperCase() !== mId.toUpperCase());
    });

    // Also remove from REAL_SWR_FLEET_DATA if present
    if (typeof window !== 'undefined' && window.REAL_SWR_FLEET_DATA) {
      if (window.REAL_SWR_FLEET_DATA.fleetDirectory) {
        Object.keys(window.REAL_SWR_FLEET_DATA.fleetDirectory).forEach(cat => {
          window.REAL_SWR_FLEET_DATA.fleetDirectory[cat] = window.REAL_SWR_FLEET_DATA.fleetDirectory[cat].filter(m => m.id.toUpperCase() !== mId.toUpperCase());
        });
      }
      if (window.REAL_SWR_FLEET_DATA.machines) {
        window.REAL_SWR_FLEET_DATA.machines = window.REAL_SWR_FLEET_DATA.machines.filter(m => m.id.toUpperCase() !== mId.toUpperCase());
      }
      if (window.REAL_SWR_FLEET_DATA.historyRegisters && window.REAL_SWR_FLEET_DATA.historyRegisters[mId]) {
        delete window.REAL_SWR_FLEET_DATA.historyRegisters[mId];
      }
    }

    // 2. Remove all failure records for this machine
    const failCountBefore = AppState.failures.length;
    AppState.failures = AppState.failures.filter(f => f.machineNo.toUpperCase() !== mId.toUpperCase());
    const deletedFailCount = failCountBefore - AppState.failures.length;

    // 3. Remove HRM data
    if (HRM_DATA[mId]) {
      delete HRM_DATA[mId];
      saveHrmData();
    }

    // 4. Save updated fleet and failure dataset to localStorage
    try {
      localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(FLEET_DIRECTORY));
    } catch (e) {}
    saveDataset();

    // 5. Select fallback machine in current category or another
    let nextMachine = 'ALL';
    const remainingInCat = FLEET_DIRECTORY[AppState.selectedCategory] || [];
    if (remainingInCat.length > 0) {
      nextMachine = remainingInCat[0].id;
    } else {
      // Find any machine in any category
      for (let c of Object.keys(FLEET_DIRECTORY)) {
        if (FLEET_DIRECTORY[c].length > 0) {
          AppState.selectedCategory = c;
          nextMachine = FLEET_DIRECTORY[c][0].id;
          break;
        }
      }
    }
    AppState.selectedMachine = nextMachine;

    closeModal('deleteMachineModal');

    // 6. Refresh UI
    setupCategoryPills();
    updateMachineDropdown();
    const machSelect = document.getElementById('machineSelect');
    if (machSelect) machSelect.value = nextMachine;
    updateMachineContextMeta();
    renderAll();

    showToast(`Machine ${mId} successfully deleted (${deletedFailCount} failure incidents & HRM purged).`);
  }

  function openEditFailureModal(id) {
    const f = AppState.failures.find(x => x.id === id);
    if (!f) return;
    openLogModal();
    document.getElementById('formIncidentId').value = f.id;
    document.getElementById('formCategory').value = f.category;
    populateFormMachines();
    document.getElementById('formMachineNo').value = f.machineNo;

    adjustSubsystemOptionsForMachine(f.machineNo || f.category);
    const subSelect = document.getElementById('formSubsystem');
    if (subSelect) {
      if (f.subsystem === 'Crane') {
        subSelect.value = 'Crane';
      } else {
        for (let opt of subSelect.options) {
          if (opt.value.toLowerCase().includes((f.subsystem || '').toLowerCase())) {
            opt.selected = true;
            break;
          }
        }
      }
    }

    const slInput = document.getElementById('formSlNo');
    if (slInput) slInput.value = f.slNo || '';

    const bDate = document.getElementById('formBreakdownDate');
    if (bDate) bDate.value = f.dateOfFailure || f.breakdownTime ? (f.dateOfFailure || f.breakdownTime).substring(0, 10) : '';

    const fDate = document.getElementById('formFitDate');
    if (fDate) fDate.value = f.dateOfRectification || f.fitTime ? (f.dateOfRectification || f.fitTime).substring(0, 10) : '';

    const downInput = document.getElementById('formTotalDownDays');
    if (downInput) downInput.value = (f.totalDownDays !== undefined && f.totalDownDays !== null) ? f.totalDownDays : ((parseFloat(f.downHours) || 0) / 24).toFixed(1);

    const blockSelect = document.getElementById('formWhetherInBlock');
    if (blockSelect) blockSelect.value = f.whetherInBlock || 'NO';

    const descInput = document.getElementById('formNature');
    if (descInput) descInput.value = f.description || f.natureOfFailure || '';

    const actionInput = document.getElementById('formStepsTaken');
    if (actionInput) actionInput.value = f.actionTaken || f.stepsTaken || '';

    const partInput = document.getElementById('formPartNo');
    if (partInput) partInput.value = (f.partNo && f.partNo !== '-') ? f.partNo : '';

    const remarksInput = document.getElementById('formRemarks');
    if (remarksInput) remarksInput.value = f.remarks || '';

    const repSelect = document.getElementById('formIsRepetitive');
    if (repSelect) repSelect.value = f.isRepetitive ? 'YES' : 'NO';

    const statusSelect = document.getElementById('formStatus');
    if (statusSelect) statusSelect.value = f.status || 'FIT';
  }

  // ==========================================================================
  // EVENT LISTENERS & MODAL WORKFLOWS
  // ==========================================================================
  function setupEventListeners() {
    // Machine dropdown change
    const machineSelect = document.getElementById('machineSelect');
    if (machineSelect) {
      machineSelect.addEventListener('change', (e) => {
        AppState.selectedMachine = e.target.value;
        updateMachineContextMeta();
        renderAll();
      });
    }

    // View tabs switcher (6 Machine tabs + Fleet view)
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        AppState.activeTab = tab;

        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        const activePane = document.getElementById(tab);
        if (activePane) activePane.classList.add('active');

        // Re-render tab specific content
        if (tab === 'hrm-view') {
          renderHrmView();
        } else if (tab === 'engine-view') {
          renderSubsystemDesk('Engine', 'subsystemDesk-engine');
        } else if (tab === 'tamping-view') {
          const isCrane = isCraneMachine(getActiveMachineId()) || isCraneMachine(AppState.selectedCategory);
          renderSubsystemDesk(isCrane ? 'Crane' : 'Tamping Unit', 'subsystemDesk-tamping');
        } else if (tab === 'mechanical-view') {
          renderSubsystemDesk('Mechanical', 'subsystemDesk-mechanical');
        } else if (tab === 'hydraulic-view') {
          renderSubsystemDesk('Hydraulic', 'subsystemDesk-hydraulic');
        } else if (tab === 'pneumatic-view') {
          renderSubsystemDesk('Pneumatic', 'subsystemDesk-pneumatic');
        } else if (tab === 'electrical-view') {
          renderSubsystemDesk('Electrical', 'subsystemDesk-electrical');
        } else if (tab === 'fleet-view') {
          setTimeout(() => {
            renderCharts(getFilteredFailures());
          }, 100);
        }
      });
    });

    // Universal Fleet Search Event Listeners
    const uniSearchInput = document.getElementById('universalSearchInput');
    if (uniSearchInput) {
      let debounceTimer = null;
      uniSearchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          performUniversalSearch(e.target.value);
        }, 100);
      });
      uniSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          clearUniversalSearch();
        }
      });
    }

    // Keyboard shortcut: Ctrl + K or / focuses universal search
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        focusUniversalSearch();
      }
    });

    // Search bar
    const searchInput = document.getElementById('tableSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        AppState.searchQuery = e.target.value.trim();
        renderTable(getFilteredFailures());
      });
    }

    // Status filter
    const statusSelect = document.getElementById('statusFilterSelect');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        AppState.statusFilter = e.target.value;
        renderAll();
      });
    }

    // Subsystem filter
    const subSelect = document.getElementById('subsystemFilterSelect');
    if (subSelect) {
      subSelect.addEventListener('change', (e) => {
        AppState.subsystemFilter = e.target.value;
        renderAll();
      });
    }

    // Excel Drag & Drop setup
    const dropzone = document.getElementById('excelDropzone');
    const fileInput = document.getElementById('excelFileInput');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          processExcelFile(e.target.files[0]);
        }
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
          processExcelFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Log / Update Failure Form Submit
    const failureForm = document.getElementById('failureEntryForm');
    if (failureForm) {
      failureForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveFailureFromForm();
      });
    }
  }

  // Open Log / Update Modal
  function openLogModal(presetMachine) {
    const modal = document.getElementById('failureEntryModal');
    if (!modal) return;

    // Reset form
    document.getElementById('failureEntryForm').reset();
    document.getElementById('formIncidentId').value = '';

    // Populate category dropdown
    const catSelect = document.getElementById('formCategory');
    catSelect.innerHTML = '';
    MACHINE_CATEGORIES.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      if (AppState.selectedCategory === c) opt.selected = true;
      catSelect.appendChild(opt);
    });

    // Populate machine dropdown based on selected category
    populateFormMachines();
    catSelect.addEventListener('change', populateFormMachines);

    if (presetMachine) {
      document.getElementById('formMachineNo').value = presetMachine;
    } else if (AppState.selectedMachine !== 'ALL') {
      document.getElementById('formMachineNo').value = AppState.selectedMachine;
    }

    // Set current time for breakdown (calendar date YYYY-MM-DD)
    const bInput = document.getElementById('formBreakdownDate') || document.getElementById('formBreakdownTime');
    if (bInput) bInput.value = new Date().toISOString().substring(0, 10);

    modal.classList.add('active');
  }

  function populateFormMachines() {
    const cat = document.getElementById('formCategory').value;
    const machSelect = document.getElementById('formMachineNo');
    machSelect.innerHTML = '';

    const list = FLEET_DIRECTORY[cat] || [];
    list.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.id} (${m.model})`;
      machSelect.appendChild(opt);
    });

    // Option to enter custom machine
    const customOpt = document.createElement('option');
    customOpt.value = 'CUSTOM';
    customOpt.textContent = '+ Enter Other Machine Number...';
    machSelect.appendChild(customOpt);

    adjustSubsystemOptionsForMachine(cat);
    machSelect.onchange = () => adjustSubsystemOptionsForMachine(machSelect.value || cat);
  }

  // Open Mark Fit Modal
  function openMarkFitModal(id) {
    const incident = AppState.failures.find(f => f.id === id);
    if (!incident) return;

    openLogModal();

    // Populate existing values
    document.getElementById('formIncidentId').value = incident.id;
    document.getElementById('formCategory').value = incident.category;
    populateFormMachines();
    document.getElementById('formMachineNo').value = incident.machineNo;
    document.getElementById('formDivision').value = incident.division || 'SBC';
    document.getElementById('formSection').value = incident.section || '';
    const bInput = document.getElementById('formBreakdownDate') || document.getElementById('formBreakdownTime');
    if (bInput) bInput.value = incident.breakdownTime ? incident.breakdownTime.substring(0, 10) : '';
    const fInput = document.getElementById('formFitDate') || document.getElementById('formFitTime');
    if (fInput) fInput.value = new Date().toISOString().substring(0, 10);
    document.getElementById('formSubsystem').value = incident.subsystem || 'Hydraulic';
    document.getElementById('formComponent').value = incident.component || '';
    document.getElementById('formNature').value = incident.natureOfFailure || '';
    document.getElementById('formRootCause').value = incident.rootCause || '';
    document.getElementById('formStepsTaken').value = incident.stepsTaken || '';
    document.getElementById('formCorrective').value = incident.correctiveMeasures || '';
    document.getElementById('formSpares').value = incident.sparesUsed || '';
    document.getElementById('formStatus').value = 'FIT';
    document.getElementById('formCertifiedBy').value = incident.certifiedBy || 'SSE/TM';
  }

  // Save Failure from Modal Form
  function saveFailureFromForm() {
    const incidentId = document.getElementById('formIncidentId').value;
    const cat = document.getElementById('formCategory').value;
    let mach = document.getElementById('formMachineNo').value;

    if (mach === 'CUSTOM') {
      mach = prompt('Please enter the Machine Number (e.g. UNI-8370):') || `${cat}-999`;
    }

    const bEl = document.getElementById('formBreakdownDate');
    const fEl = document.getElementById('formFitDate');
    const failDate = bEl ? bEl.value.trim() : '';
    const fitDate = fEl ? fEl.value.trim() : '';

    const downDaysInput = document.getElementById('formTotalDownDays');
    const totalDownDays = downDaysInput ? (parseFloat(downDaysInput.value) || 0) : 1;
    const downHours = parseFloat((totalDownDays * 24).toFixed(1));

    const inBlock = document.getElementById('formWhetherInBlock')?.value || 'NO';
    const desc = document.getElementById('formNature')?.value.trim() || '';
    const action = document.getElementById('formStepsTaken')?.value.trim() || '';
    const partNo = document.getElementById('formPartNo')?.value?.trim() || '-';
    const rawRem = document.getElementById('formRemarks')?.value.trim() || '';
    const remarks = (rawRem && rawRem !== '-' && !/^(no|nil)$/i.test(rawRem)) ? rawRem : 'NA';
    const isRep = document.getElementById('formIsRepetitive')?.value === 'YES';
    const status = document.getElementById('formStatus')?.value || 'FIT';
    const subsystem = document.getElementById('formSubsystem')?.value || 'Engine';
    const slNo = document.getElementById('formSlNo')?.value.trim() || '';
    const div = getMachineInfo(mach)?.division || 'SBC';

    const record = {
      id: incidentId || `INC-${mach.replace(/[^A-Za-z0-9]/g, '')}-${Date.now() % 100000}`,
      machineNo: mach.trim(),
      category: cat,
      division: div,
      subsystem: subsystem,
      slNo: slNo || '1',
      dateOfFailure: failDate,
      dateOfRectification: fitDate,
      breakdownTime: failDate,
      fitTime: fitDate,
      totalDownDays: totalDownDays,
      downHours: downHours,
      whetherInBlock: inBlock,
      description: desc,
      natureOfFailure: desc,
      actionTaken: action,
      stepsTaken: action,
      partNo: partNo,
      remarks: remarks,
      isRepetitive: isRep,
      repeatCount: isRep ? 2 : 1,
      component: (partNo && partNo !== '-') ? `${subsystem} Component (P/N: ${partNo})` : `${subsystem} Component`,
      sparesUsed: (partNo && partNo !== '-') ? `Part No: ${partNo}` : action,
      status: status,
      certifiedBy: `SSE/TM/${div}`
    };

    if (incidentId) {
      // Update existing
      const idx = AppState.failures.findIndex(f => f.id === incidentId);
      if (idx !== -1) {
        AppState.failures[idx] = record;
        showToast(`Updated failure entry #${record.slNo} for ${record.machineNo}`);
      }
    } else {
      // Add new
      AppState.failures.unshift(record);
      showToast(`Logged new failure for ${record.machineNo} (${subsystem})`);
    }

    classifyRepetitiveFailures(AppState.failures);
    saveDataset();
    setupCategoryPills();
    updateMachineDropdown();
    updateTabBadges();
    renderAll();

    closeModal('failureEntryModal');
  }

  // Modal Helpers
  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
  }

  // Toast Notification
  function showToast(message, isError = false) {
    const toast = document.getElementById('toastNotification');
    const toastText = document.getElementById('toastMessageText');
    if (!toast || !toastText) return;

    toastText.textContent = message;
    toast.style.borderLeftColor = isError ? '#ff5252' : 'var(--gold-400)';
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }

  // Reset to Factory Seed Data
  function resetToDefaultData(force = false) {
    if (force || confirm('Are you sure you want to reset failure logs to the official SWR track machine dataset? All records will be refreshed to the 684 genuine Indian Railways failure incidents.')) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(FLEET_STORAGE_KEY);
      FLEET_DIRECTORY = JSON.parse(JSON.stringify(DEFAULT_FLEET_DIRECTORY));
      if (typeof window !== 'undefined' && window.REAL_SWR_FLEET_DATA) {
        window.REAL_SWR_FLEET_DATA.fleetDirectory = JSON.parse(JSON.stringify(DEFAULT_FLEET_DIRECTORY));
      }
      loadDataset();
      setupCategoryPills();
      updateMachineDropdown();
      renderAll();
      showToast('Database reset to official SWR track machine fleet records (21 authentic machines, 732 incidents).');
    }
  }

  // Expose API for HTML Inline Handlers and Extensibility
  window.TM_APP = {
    initApp,
    selectCategory,
    selectDivision,
    openLogModal,
    openMarkFitModal,
    openModal,
    closeModal,
    openUploadModalForSelectedMachine,
    openUploadModalForCategory,
    onModalCategoryChange,
    toggleDetails,
    downloadExcelTemplate,
    exportFilteredToExcel,
    importFromGoogleLink,
    processExcelFile,
    parseWorkbookData,
    ensureXLSX,
    resetToDefaultData,
    getAppState: () => AppState,
    getFleetDirectory: () => FLEET_DIRECTORY,
    getMachineInfo,
    // Machine Deletion Methods
    openDeleteMachineModal,
    updateDeleteMachineDetails,
    confirmDeleteMachine,
    // HRM & Subsystem Methods
    toggleCommDateEditor,
    saveCommissioningDate,
    toggleHrmHistory,
    openAddHrmEntryModal,
    handleHrmEntrySubmit,
    deleteHrmRecord,
    deletePresentHrmEntry,
    resetMachineHrm,
    exportCurrentHrm,
    openLogModalForSubsystem,
    saveFailureFromForm,
    deleteFailureRecord,
    openEditFailureModal,
    renderHrmView,
    renderSubsystemDesk,
    updateTabBadges,
    highlightFailure,
    // Universal Search Methods
    performUniversalSearch,
    renderUniversalSearchResults,
    setUniversalSearchFilter,
    setUniversalSearchQuery,
    focusUniversalSearch,
    clearUniversalSearch,
    jumpToSearchResult,
    exportSearchResultsToExcel,
    getUniversalSearchState: () => universalSearchState
  };

  // Launch on DOM ready
  document.addEventListener('DOMContentLoaded', initApp);
})();
