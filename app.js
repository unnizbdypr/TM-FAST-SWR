/**
 * TM-FAILURE ANALYSIS AND SURVEILLANCE TOOL
 * High-performance Track Machine Surveillance, MTTR & Repetitive Failure Analytics
 * Indian Railways / SWR Specialized Track Machine Maintenance Module
 */

(function () {
  'use strict';

  // Available Categories (as specified)
  const MACHINE_CATEGORIES = [
    'CSM', 'DTE', 'DUO', 'UNI/PCTM', 'MPT', 'BCM', 'SBCM/FRM',
    'BRM', 'SQRS', 'T28', 'DGS', 'UTV', 'RMBV', 'MDU'
  ];

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
      { id: 'BCM-400', model: 'RM-80 High Output Ballast Cleaner', division: 'UBL', depot: 'UBL', year: 2018, status: 'FIT' }
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
      { id: 'UTV-001', model: 'Utility Track Vehicle UTV-001', division: 'UBL', depot: 'UBL', year: 2018, status: 'FIT' }
    ],
    'RMBV': [],
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

  // Local Storage Keys (v5 strict authentic fleet & dynamic fleet registration)
  const STORAGE_KEY = 'TM_FAILURE_SURVEILLANCE_DATA_V5_STRICT_FLEET';
  const FLEET_STORAGE_KEY = 'TM_FAILURE_FLEET_DIRECTORY_V5_STRICT';

  // Divisional Colors Mapping (SBC Blue, MYS Green, UBL Maroon)
  const DIVISION_COLORS = {
    'SBC': { color: '#2563eb', light: '#60a5fa', name: 'Bengaluru (SBC)' },
    'MYS': { color: '#16a34a', light: '#4ade80', name: 'Mysuru (MYS)' },
    'UBL': { color: '#800000', light: '#f87171', name: 'Hubballi (UBL)' }
  };

  // State Management
  const AppState = {
    failures: [],
    selectedCategory: 'UNI/PCTM', // Default to Unimat to highlight user's core focus!
    selectedMachine: 'ALL',
    selectedDivision: 'ALL',      // Division Filter: ALL, SBC, MYS, UBL
    activeTab: 'fleet-view',
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
      ['TM_FAILURE_SURVEILLANCE_DATA', 'TM_FAILURE_SURVEILLANCE_DATA_V2', 'TM_FAILURE_SURVEILLANCE_DATA_V3', 'TM_FAILURE_SURVEILLANCE_DATA_V4'].forEach(k => {
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

  // Repetitive Failure Surveillance Algorithm
  function classifyRepetitiveFailures(list) {
    // Sort chronologically
    list.sort((a, b) => new Date(a.breakdownTime) - new Date(b.breakdownTime));

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
        let repeatCount = 1;
        const curDate = new Date(records[i].breakdownTime).getTime();

        for (let j = 0; j < i; j++) {
          const prevDate = new Date(records[j].breakdownTime).getTime();
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

        if (repeatCount > 1) {
          records[i].isRepetitive = true;
          records[i].repeatCount = repeatCount;
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

      const count = AppState.failures.filter(f => f.category === cat).length;
      pill.innerHTML = `<span>${cat}</span><span class="pill-badge">${count}</span>`;
      pill.addEventListener('click', () => selectCategory(cat));
      container.appendChild(pill);
    });
  }

  // Select Category Handler
  function selectCategory(category) {
    AppState.selectedCategory = category;
    AppState.selectedMachine = 'ALL';

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
      // Category match
      if (AppState.selectedCategory !== 'ALL' && f.category !== AppState.selectedCategory) {
        return false;
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
    repeatCases.slice(0, 6).forEach(f => {
      const key = `${f.machineNo}-${f.subsystem}`;
      if (seen.has(key)) return;
      seen.add(key);

      const card = document.createElement('div');
      card.className = 'repeat-item-card';
      card.innerHTML = `
        <span class="repeat-count-tag">${f.repeatCount || 2}x REPEAT</span>
        <div class="repeat-text-block">
          <strong>${f.machineNo} [${f.category}]</strong> • ${f.subsystem}
          <span>${f.component || f.natureOfFailure.substring(0, 45)}...</span>
        </div>
      `;
      card.addEventListener('click', () => {
        AppState.selectedMachine = f.machineNo;
        document.getElementById('machineSelect').value = f.machineNo;
        updateMachineContextMeta();
        renderAll();
      });
      repeatContainer.appendChild(card);
    });
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
          <div style="font-size: 12px; color: #cbd8cf;">${f.breakdownTime || 'N/A'}</div>
          <div style="font-size: 11px; color: #7f9587;">${f.section || 'Block Section'}</div>
        </td>
        <td>
          <span class="table-subsystem-pill ${subClass}">
            ${f.subsystem || 'Mechanical'}
          </span>
          <div style="font-size: 11px; color: #8da494; margin-top: 3px;">${f.component || ''}</div>
        </td>
        <td style="max-width: 280px;">
          <div style="font-weight: 600; color: #e5ece6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(f.natureOfFailure)}">
            ${escapeHtml(f.natureOfFailure)}
          </div>
          ${isRep ? `<span style="display:inline-block; font-size:10px; color:#ffab91; background:rgba(255,112,67,0.2); padding:1px 6px; border-radius:3px; margin-top:3px; border:1px solid rgba(255,112,67,0.4);">🔁 ${f.repeatCount || 2}x Recurring Defect</span>` : ''}
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

  // Helper: Retrieve fleet machines registered for a specific category
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
              const match = cellStr.match(/(?:UNI|PCTM|CSM|DTE|DUO|MPT|BCM|FRM|SBCM|BRM|SQRS|T28|T-28|DGS|UTV|RMBV|MDU)[\s\-_]*\d+/i);
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
        if (/(?:UNI|PCTM|CSM|DTE|DUO|MPT|BCM|FRM|SBCM|BRM|SQRS|T28|DGS|UTV|RMBV|MDU|\d)/i.test(baseName)) {
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

    // 5. Detect Multi-Sheet SWR Structure
    const failureSheets = workbook.SheetNames.filter(s => {
      const up = s.toUpperCase();
      return !up.includes('HISTORY') && (
        up.includes('TAMP') || up.includes('ENG') || up.includes('MECH') ||
        up.includes('PNEUM') || up.includes('ELEC') || up.includes('HYD') ||
        up.includes('CRANE') || up.includes('CUTTER') || up.includes('FAIL')
      );
    });

    if (failureSheets.length > 0) {
      // Multi-sheet SWR format
      failureSheets.forEach(sheetName => {
        const sUpper = sheetName.toUpperCase();
        let subsystem = 'Mechanical';
        if (sUpper.includes('TAMP')) subsystem = 'Tamping Unit';
        else if (sUpper.includes('ENG')) subsystem = 'Engine';
        else if (sUpper.includes('MECH')) subsystem = 'Mechanical/Structure';
        else if (sUpper.includes('HYD')) subsystem = 'Hydraulic';
        else if (sUpper.includes('PNEUM')) subsystem = 'Pneumatic';
        else if (sUpper.includes('ELEC')) subsystem = 'Electrical';
        else if (sUpper.includes('CRANE')) subsystem = 'Mechanical/Structure';

        const ws = workbook.Sheets[sheetName];
        if (!ws) return;

        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (!rows || rows.length === 0) return;

        // Detect header row across first 5 rows (requiring multiple columns to avoid title banners)
        let headerRowIdx = -1;
        for (let r = 0; r < Math.min(rows.length, 5); r++) {
          const rowStrings = (rows[r] || []).map(x => String(x).toLowerCase().trim());
          const nonEmpty = rowStrings.filter(s => s.length > 0);
          if (nonEmpty.length >= 3) {
            const hasDesc = rowStrings.some(s => s.includes('description') || s.includes('nature') || s.includes('defect'));
            const hasFailAndOther = rowStrings.some(s => s.includes('failure')) && rowStrings.some(s2 => s2.includes('date') || s2.includes('action') || s2.includes('part') || s2.includes('down') || s2.includes('sl'));
            if (hasDesc || hasFailAndOther) {
              headerRowIdx = r;
              break;
            }
          }
        }
        if (headerRowIdx === -1) {
          headerRowIdx = rows.length > 1 ? 1 : 0;
        }

        const headers = (rows[headerRowIdx] || []).map(x => String(x).toLowerCase().trim());
        let colDesc = headers.findIndex(h => /description|nature|defect/i.test(h));
        let colFailDate = headers.findIndex(h => /date.*fail|fail.*date|date of failure/i.test(h));
        let colFitDate = headers.findIndex(h => /rectif|fit.*date/i.test(h));
        let colDown = headers.findIndex(h => /down|days.*taken|how many days/i.test(h));
        let colBlock = headers.findIndex(h => /block/i.test(h));
        let colPart = headers.findIndex(h => /part name|part.*name|component/i.test(h));
        let colPartNo = headers.findIndex(h => /part no|part.*num|drawing/i.test(h));
        let colAction = headers.findIndex(h => /action|steps/i.test(h));
        let colSpares = headers.findIndex(h => /spare|material/i.test(h));

        if (colDesc === -1) {
          colDesc = headers.findIndex(h => h.includes('failure'));
          if (colDesc === -1 && headers.length >= 5) colDesc = 5;
        }

        for (let r = headerRowIdx + 1; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length === 0) continue;

          const descVal = colDesc !== -1 && row[colDesc] !== undefined ? String(row[colDesc]).trim() : '';
          if (!descVal || descVal.length < 3 || /^\d+$/.test(descVal) || /^(tamping|mechanical|pneumatic|electrical|hydraulic|engine)/i.test(descVal)) {
            continue;
          }

          const rawFailDate = colFailDate !== -1 ? row[colFailDate] : '';
          const rawFitDate = colFitDate !== -1 ? row[colFitDate] : '';
          const rawDown = colDown !== -1 ? row[colDown] : '';
          const blockVal = colBlock !== -1 ? String(row[colBlock] || '').trim() : '';
          const partVal = colPart !== -1 ? String(row[colPart] || '').trim() : '';
          const partNoVal = colPartNo !== -1 ? String(row[colPartNo] || '').trim() : '';
          const actionVal = colAction !== -1 ? String(row[colAction] || '').trim() : '';
          const sparesVal = colSpares !== -1 ? String(row[colSpares] || '').trim() : '';

          let failDateStr = formatExcelDate(rawFailDate);
          if (!failDateStr) {
            const d = new Date(Date.now() - (importedCount + 1) * 7 * 86400000);
            failDateStr = d.toISOString().substring(0, 10);
          }

          let fitDateStr = formatExcelDate(rawFitDate);

          let downDays = 0;
          if (rawDown !== undefined && rawDown !== null && String(rawDown).trim() !== '') {
            const numMatch = String(rawDown).match(/[\d\.]+/);
            if (numMatch) downDays = parseFloat(numMatch[0]) || 0;
          }
          const downHours = downDays < 40 ? parseFloat((downDays * 24).toFixed(1)) : downDays;

          if (!fitDateStr && failDateStr) {
            if (downDays > 0) {
              const fDate = new Date(failDateStr);
              fDate.setDate(fDate.getDate() + Math.ceil(downDays));
              fitDateStr = fDate.toISOString().substring(0, 10);
            } else {
              fitDateStr = failDateStr;
            }
          }

          let compName = partVal;
          if (!compName) {
            compName = descVal.split(/[,.\n]/)[0].substring(0, 45);
          }
          if (partNoVal && partNoVal !== '-' && !compName.includes(partNoVal)) {
            compName += ` (P/N: ${partNoVal})`;
          }

          let correctiveMeasures = `Enforce periodic scheduled maintenance and torque checking for ${subsystem} components. Check lubrication schedule.`;
          const subLower = subsystem.toLowerCase();
          if (subLower.includes('engine')) {
            correctiveMeasures = 'Daily coolant, belt tension, and oil pressure monitoring protocol before block clearing.';
          } else if (subLower.includes('tamp')) {
            correctiveMeasures = 'Regular 100-hr tamping bank greasing, NAS oil cleanliness testing, and vibration bolt torquing.';
          } else if (subLower.includes('hyd')) {
            correctiveMeasures = 'Periodic return-line filter replacement (every 250 engine hours) and hydraulic hose abrasion inspection.';
          } else if (subLower.includes('pneum')) {
            correctiveMeasures = 'Purge auto-drain reservoirs daily and replace desiccant canisters at 6-month intervals.';
          }

          const incident = {
            id: `IR-${chosenDivision}-${chosenMachine.replace(/[^A-Za-z0-9]/g, '')}-${Date.now() % 100000}-${importedCount + 1}`,
            machineNo: chosenMachine,
            category: chosenCategory,
            division: chosenDivision,
            section: blockVal ? `Block Section (${blockVal})` : `${chosenDivision} Track Machine Jurisdiction`,
            breakdownTime: failDateStr,
            arrivalTroubleshootTime: failDateStr,
            sparesArrangedTime: '',
            fitTime: fitDateStr,
            downHours: downHours > 0 ? downHours : 4.0,
            subsystem: subsystem,
            component: compName || 'Subassembly',
            natureOfFailure: descVal,
            isRepetitive: false,
            repeatCount: 1,
            rootCause: `Operational stress / fatigue on ${compName || subsystem}.`,
            stepsTaken: actionVal || `Component inspected on site. Rectification and trials completed. Block status: ${blockVal || 'Cleared'}.`,
            correctiveMeasures: correctiveMeasures,
            sparesUsed: sparesVal || (partVal ? `${partVal} ${partNoVal}`.trim() : 'Standard maintenance spares'),
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
  function processExcelFile(file) {
    if (!file) return;

    if (typeof XLSX === 'undefined') {
      showToast('Error: SheetJS Excel library is not available.', true);
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const importedCount = parseWorkbookData(workbook, file.name);

        if (importedCount === 0) {
          showToast('No valid failure records found in uploaded file. Please verify sheet structure.', true);
        }
      } catch (err) {
        console.error('Error parsing Excel:', err);
        showToast('Error reading Excel spreadsheet: ' + err.message, true);
      }
    };
    reader.readAsArrayBuffer(file);
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

      if (typeof XLSX === 'undefined') {
        showToast('SheetJS parser is not available.', true);
        return;
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

  // Download Sample Excel Template
  function downloadExcelTemplate() {
    if (typeof XLSX === 'undefined') {
      showToast('SheetJS not ready for template generation.', true);
      return;
    }

    const templateRows = [
      {
        'Machine No': 'UNI-8361',
        'Category': 'UNI/PCTM',
        'Division': 'SBC',
        'Section': 'BYPL - KJM',
        'Breakdown Time': '2026-09-22 02:30',
        'Fit Time': '2026-09-22 06:45',
        'Down Hours': 4.25,
        'Subsystem': 'Hydraulic',
        'Component': 'Tamping Bank Tilt Cylinder',
        'Nature of Failure': 'High pressure gland seal leakage during turnout tamping',
        'Root Cause': 'Thermal stress and worn Viton O-ring seal',
        'Steps Taken': 'Manifold drained, replaced Viton seals, pressure tested at 140 bar',
        'Corrective Measures': 'Enforce NAS 7 oil cleanliness protocol and replace return line filter',
        'Spares Used': 'Plasser Viton Seal Kit #4301.12, Tellus 68 Oil (30L)',
        'Status': 'FIT',
        'Certified By': 'SSE/TM/BYPL'
      },
      {
        'Machine No': 'CSM-952',
        'Category': 'CSM',
        'Division': 'SBC',
        'Section': 'WFD - DKN',
        'Breakdown Time': '2026-09-22 01:15',
        'Fit Time': '',
        'Down Hours': 0,
        'Subsystem': 'Drive & Transmission',
        'Component': 'ZF Gearbox Charging Pump',
        'Nature of Failure': 'Sluggish satellite drive and high temperature alarm',
        'Root Cause': 'Oil cooler fins choked with ballast dust',
        'Steps Taken': 'Under cleaning and pressure checking on siding',
        'Corrective Measures': 'Daily compressed air jetting of oil coolers before block',
        'Spares Used': 'ZF Suction Filter Kit',
        'Status': 'UNDER REPAIR',
        'Certified By': 'Site JE/TM'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Failure_Template');

    XLSX.writeFile(wb, 'TM_Failure_History_Template.xlsx');
    showToast('Downloaded sample Excel template: TM_Failure_History_Template.xlsx');
  }

  // Export Filtered Failure History to Excel
  function exportFilteredToExcel() {
    if (typeof XLSX === 'undefined') {
      showToast('SheetJS not ready for export.', true);
      return;
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

    // View tabs switcher
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        AppState.activeTab = tab;

        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        const activePane = document.getElementById(tab);
        if (activePane) activePane.classList.add('active');

        // Re-render charts on tab switch to recalculate container dimensions
        setTimeout(() => {
          renderCharts(getFilteredFailures());
        }, 100);
      });
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

    // Set current time for breakdown
    const nowStr = new Date().toISOString().substring(0, 16);
    document.getElementById('formBreakdownTime').value = nowStr;

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
    document.getElementById('formBreakdownTime').value = incident.breakdownTime || '';
    document.getElementById('formFitTime').value = new Date().toISOString().substring(0, 16);
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

    const breakdownTime = document.getElementById('formBreakdownTime').value.replace('T', ' ');
    const fitTime = document.getElementById('formFitTime').value.replace('T', ' ');
    const status = document.getElementById('formStatus').value;

    let downHours = 0;
    if (fitTime && breakdownTime) {
      downHours = calculateDurationHours(breakdownTime, fitTime);
    } else {
      downHours = parseFloat(calculateDurationHours(breakdownTime, new Date().toISOString().substring(0, 16).replace('T', ' ')));
    }

    const record = {
      id: incidentId || `FL-${Date.now()}`,
      machineNo: mach.trim(),
      category: cat,
      division: document.getElementById('formDivision').value,
      section: document.getElementById('formSection').value,
      breakdownTime: breakdownTime,
      arrivalTroubleshootTime: breakdownTime,
      sparesArrangedTime: '',
      fitTime: status === 'FIT' ? fitTime : '',
      downHours: downHours,
      subsystem: document.getElementById('formSubsystem').value,
      component: document.getElementById('formComponent').value,
      natureOfFailure: document.getElementById('formNature').value,
      isRepetitive: false,
      repeatCount: 1,
      rootCause: document.getElementById('formRootCause').value,
      stepsTaken: document.getElementById('formStepsTaken').value,
      correctiveMeasures: document.getElementById('formCorrective').value,
      sparesUsed: document.getElementById('formSpares').value,
      status: status,
      certifiedBy: document.getElementById('formCertifiedBy').value
    };

    if (incidentId) {
      // Update existing
      const idx = AppState.failures.findIndex(f => f.id === incidentId);
      if (idx !== -1) {
        AppState.failures[idx] = record;
        showToast(`Updated failure record for ${record.machineNo}`);
      }
    } else {
      // Add new
      AppState.failures.unshift(record);
      showToast(`Logged new breakdown for ${record.machineNo}`);
    }

    classifyRepetitiveFailures(AppState.failures);
    saveDataset();
    setupCategoryPills();
    updateMachineDropdown();
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
      showToast('Database reset to official SWR track machine fleet records (strictly 19 authentic machines, 684 incidents).');
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
    resetToDefaultData,
    getAppState: () => AppState,
    getFleetDirectory: () => FLEET_DIRECTORY,
    getMachineInfo
  };

  // Launch on DOM ready
  document.addEventListener('DOMContentLoaded', initApp);
})();
