/**
 * TM-FAST (SWR)
 * High-performance Track Machine Surveillance, Fleet Reliability & Repetitive Defect Analytics
 * South Western Railway / Indian Railways Specialized Track Machine Module
 */

(function () {
  'use strict';

  // Available Categories (Canonical single RBMV category)
  const MACHINE_CATEGORIES = [
    'CSM', 'DTE', 'DUO', 'UNI/PCTM', 'MPT', 'BCM', 'SBCM/FRM',
    'BRM', 'SQRS', 'T28', 'DGS', 'UTV', 'SRGM/RGM', 'RBMV', 'MDU'
  ];

  // Category Full Names & Descriptions
  const CATEGORY_FULL_NAMES = {
    'CSM': 'Continuous Action Tamping',
    'DTE': 'Dynamic Track Equalizer',
    'DUO': 'Duomatic Two Sleeper Tamping',
    'UNI/PCTM': 'Points & Crossing Tamping',
    'MPT': 'Multi-Purpose Tamping',
    'BCM': 'Ballast Cleaning Machine',
    'SBCM/FRM': 'Shoulder Cleaning / Formation Rehabilitation',
    'BRM': 'Ballast Regulating Machine',
    'SQRS': 'Quick Relaying System',
    'T28': 'Turnout Renewal',
    'DGS': 'Dynamic Track Stabilizer',
    'UTV': 'Utility Track Vehicle',
    'SRGM/RGM': 'Switch Rail Grinding Machine / Rail Grinding Machine',
    'RBMV': 'Rail Borne Maintenance Vehicle',
    'MDU': 'Muck Disposal Unit'
  };

  function getCategoryFullName(cat) {
    if (!cat) return '';
    if (cat === 'SRGM/RGM' || cat === 'SRGM / RGM' || cat === 'SRGM' || cat === 'RGM') {
      return 'Switch Rail Grinding Machine / Rail Grinding Machine';
    }
    return CATEGORY_FULL_NAMES[cat] || cat;
  }

  // Helper: check if machine or category belongs to Crane-equipped fleet (UTV / RBMV)
  function isCraneMachine(identifier) {
    if (!identifier) return false;
    const str = String(identifier).trim().toUpperCase();
    return str === 'UTV' || str === 'RBMV' || str === 'RMBV' || 
           str.startsWith('UTV') || str.startsWith('RBMV') || str.startsWith('RMBV');
  }

  // Month name lookup dictionary
  const OVERNIGHT_MONTH_MAP = {
    jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
    apr: 4, april: 4, may: 5, june: 6, jun: 6,
    jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
    oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12
  };

  // Helper: check if a date string represents an overnight block (e.g. 16/17-11-2025, 04/05-06-2026, 4/5-6-2026)
  function isOvernightDate(val) {
    if (!val) return false;
    return parseOvernightDate(val) !== null;
  }

  // Helper: parse an overnight block date into structured parts (D1, D2, MM, YYYY)
  // Represents a block that started on D1-MM-YYYY and ended on D2-MM-YYYY
  function parseOvernightDate(val) {
    if (!val) return null;
    const s = String(val).trim().replace(/[`'"]/g, '').trim();
    // Matches: 16/17-11-2025, 16/17/11/2025, 16-17-11-2025, 16-17/11/2025, 16/17.11.2025, 16/17-Nov-2025, 4/5-6-2026, etc.
    const m = s.match(/^(\d{1,2})\s*[\/\-]\s*(\d{1,2})\s*[\/\-\. ]\s*([A-Za-z]+|\d{1,2})\s*[\/\-\. ]\s*(\d{2,4})(?:[ T](\d{2}:\d{2}(?::\d{2})?)?)?/);
    if (!m) return null;
    const d1 = parseInt(m[1], 10);
    const d2 = parseInt(m[2], 10);
    let mm = NaN;
    if (/^\d+$/.test(m[3])) {
      mm = parseInt(m[3], 10);
    } else {
      const mn = m[3].toLowerCase();
      mm = OVERNIGHT_MONTH_MAP[mn] || NaN;
    }
    let yyyy = parseInt(m[4], 10);
    if (isNaN(d1) || isNaN(d2) || isNaN(mm) || isNaN(yyyy)) return null;
    if (yyyy < 100) yyyy += 2000;
    if (d1 < 1 || d1 > 31 || d2 < 1 || d2 > 31 || mm < 1 || mm > 12) return null;

    const padD1 = String(d1).padStart(2, '0');
    const padD2 = String(d2).padStart(2, '0');
    const padMm = String(mm).padStart(2, '0');

    // Handle month boundary for start date if d1 > d2 (e.g. 31/01-11-2025: started Oct 31, ended Nov 1)
    let sYear = yyyy;
    let sMonth = mm;
    if (d1 > d2) {
      sMonth = mm - 1;
      if (sMonth < 1) {
        sMonth = 12;
        sYear -= 1;
      }
    }
    const padSm = String(sMonth).padStart(2, '0');

    return {
      d1, d2, mm, yyyy,
      padD1, padD2, padMm,
      startDateIso: `${sYear}-${padSm}-${padD1}`,
      endDateIso: `${yyyy}-${padMm}-${padD2}`,
      formatted: `${padD1}/${padD2}-${padMm}-${yyyy}`
    };
  }

  // Helper: Build canonical overnight block date string (D1D1/D2D2-MM-YYYY) from 2 calendar ISO dates
  function buildOvernightDateString(startIso, endIso) {
    if (!startIso) return '';
    const sParts = String(startIso).split('-');
    if (sParts.length !== 3) return '';
    const d1 = sParts[2].padStart(2, '0');
    const mm1 = sParts[1].padStart(2, '0');
    const yyyy1 = sParts[0];

    if (!endIso) {
      return `${d1}/${d1}-${mm1}-${yyyy1}`;
    }
    const eParts = String(endIso).split('-');
    if (eParts.length !== 3) {
      return `${d1}/${d1}-${mm1}-${yyyy1}`;
    }
    const d2 = eParts[2].padStart(2, '0');
    const mm2 = eParts[1].padStart(2, '0');
    const yyyy2 = eParts[0];

    return `${d1}/${d2}-${mm2}-${yyyy2}`;
  }

  // Universal Date Formatter: Strictly DD-MM-YYYY or DD/DD-MM-YYYY for Overnight Blocks
  function formatDateDisplay(val) {
    if (!val || val === 'N/A' || val === '-' || val === '--' || val === 'NA' || val === 'Not Set') return '--';
    const s = String(val).trim().replace(/[`'"]/g, '').trim();
    if (/^(active|under repair|nil|none|ongoing)$/i.test(s) || s.toLowerCase().includes('active')) {
      return s;
    }

    // 1. Overnight Block Date: D1D1/D2D2-MM-YYYY (e.g. 16/17-11-2025, 04/05-06-2026, 4/5-6-2026, 16-17/11/2025, 16/17/11/2025)
    // Preserves all digits accurately without dropping day 1 or day 2
    const ov = parseOvernightDate(s);
    if (ov) {
      return ov.formatted;
    }

    // 2. Handle Excel serial numbers (e.g. 45180 -> 11-09-2023)
    if (/^\d{5}$/.test(s)) {
      const serial = parseInt(s, 10);
      const dt = new Date((serial - 25569) * 86400 * 1000);
      if (!isNaN(dt.getTime())) {
        const dd = String(dt.getUTCDate()).padStart(2, '0');
        const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const yyyy = dt.getUTCFullYear();
        return `${dd}-${mm}-${yyyy}`;
      }
    }

    // 3. Match YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD (optionally with time)
    const isoMatch = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T](\d{2}:\d{2}(?::\d{2})?)?)?/);
    if (isoMatch) {
      const yyyy = isoMatch[1];
      const mm = isoMatch[2].padStart(2, '0');
      const dd = isoMatch[3].padStart(2, '0');
      return `${dd}-${mm}-${yyyy}`;
    }

    // 4. Match DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY (optionally with time)
    const dmyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[ T](\d{2}:\d{2}(?::\d{2})?)?)?/);
    if (dmyMatch) {
      const dd = dmyMatch[1].padStart(2, '0');
      const mm = dmyMatch[2].padStart(2, '0');
      const yyyy = dmyMatch[3];
      return `${dd}-${mm}-${yyyy}`;
    }

    // 5. Match DD-MM-YY or DD/MM/YY or DD.MM.YY
    const dmyShortMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
    if (dmyShortMatch) {
      const dd = dmyShortMatch[1].padStart(2, '0');
      const mm = dmyShortMatch[2].padStart(2, '0');
      const yyyy = '20' + dmyShortMatch[3];
      return `${dd}-${mm}-${yyyy}`;
    }

    // 6. Date object / timestamp fallback
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
      const dd = String(parsed.getDate()).padStart(2, '0');
      const mm = String(parsed.getMonth() + 1).padStart(2, '0');
      const yyyy = parsed.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
    return s;
  }

  // ==========================================================================
  // THEME MANAGEMENT: WHITE MODE (LIGHT) / INDUSTRIAL NIGHT DARK MODE
  // ==========================================================================
  const THEME_STORAGE_KEY = 'TM_THEME_PREFERENCE';

  function getCurrentTheme() {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || 
             document.documentElement.getAttribute('data-theme') || 
             'dark';
    } catch (e) {
      return document.documentElement.getAttribute('data-theme') || 'dark';
    }
  }

  function setTheme(theme, showNotification = true) {
    const validTheme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', validTheme);
    if (document.body) {
      document.body.setAttribute('data-theme', validTheme);
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, validTheme);
    } catch (e) {
      console.warn('Unable to persist theme preference:', e);
    }

    updateThemeUI(validTheme);

    // Re-render active charts if initialized
    if (typeof AppState !== 'undefined' && AppState && AppState.charts && typeof renderCharts === 'function') {
      try {
        const fails = (typeof getFilteredFailures === 'function') ? getFilteredFailures() : (AppState.failures || []);
        renderCharts(fails);
      } catch (err) {}
    }

    if (showNotification && typeof showToast === 'function') {
      showToast(validTheme === 'light' ? '☀️ Switched to Crisp White Mode' : '🌙 Switched to Industrial Dark Mode');
    }
  }

  function toggleTheme() {
    const curr = getCurrentTheme();
    const next = curr === 'light' ? 'dark' : 'light';
    setTheme(next, true);
  }

  function updateThemeUI(theme) {
    const isLight = theme === 'light';

    // 1. Login card segmented choice buttons
    const btnDarkLogin = document.getElementById('loginThemeDarkBtn');
    const btnLightLogin = document.getElementById('loginThemeLightBtn');
    if (btnDarkLogin) {
      if (isLight) btnDarkLogin.classList.remove('active');
      else btnDarkLogin.classList.add('active');
    }
    if (btnLightLogin) {
      if (isLight) btnLightLogin.classList.add('active');
      else btnLightLogin.classList.remove('active');
    }

    // 2. Login top-right corner toggle button
    const loginTopIcon = document.getElementById('loginTopThemeIcon');
    const loginTopLabel = document.getElementById('loginTopThemeLabel');
    if (loginTopIcon) loginTopIcon.textContent = isLight ? '🌙' : '☀️';
    if (loginTopLabel) loginTopLabel.textContent = isLight ? 'Dark Mode' : 'White Mode';

    // 3. Main header session chip toggle button
    const headerIcon = document.getElementById('btnHeaderThemeIcon');
    const headerLabel = document.getElementById('btnHeaderThemeLabel');
    if (headerIcon) headerIcon.textContent = isLight ? '🌙' : '☀️';
    if (headerLabel) headerLabel.textContent = isLight ? 'Dark Mode' : 'White Mode';
  }

  function initTheme() {
    const saved = getCurrentTheme();
    setTheme(saved, false);
  }

  // ==========================================================================
  // AUTHENTICATION & ROLE-BASED ACCESS CONTROL (SWR TM-FAST)
  // ==========================================================================
  const AUTH_STORAGE_KEY = 'TM_FAST_USERS_V4';
  const SESSION_STORAGE_KEY = 'TM_FAST_SESSION_V4';

  const DEFAULT_USERS = {
    'admin1@zbdypr': {
      userId: 'admin1@zbdypr',
      password: 'admin1abcd',
      name: 'USER 1 (Admin)',
      role: 'ADMIN'
    },
    'admin2@zbdypr': {
      userId: 'admin2@zbdypr',
      password: 'admin2pqrs',
      name: 'USER 2 (Admin)',
      role: 'ADMIN'
    },
    'axentm@zbdypr': {
      userId: 'axentm@zbdypr',
      password: 'axentm1',
      name: 'USER 3 (AXEN/TM)',
      role: 'VIEWER'
    },
    'cetm@hqubl': {
      userId: 'cetm@hqubl',
      password: 'cetmswr',
      name: 'USER 4 (CE/TM)',
      role: 'VIEWER'
    },
    'dtycetmypr': {
      userId: 'dtycetmypr',
      password: 'dtycetm@zbdypr',
      name: 'USER 5 (Dy.CE/TM)',
      role: 'VIEWER'
    }
  };

  // User ID alias mapper for resilient login
  function resolveUserId(input) {
    if (!input) return '';
    const clean = input.trim().toLowerCase().replace(/[\s\-_]/g, '');
    if (clean === 'admin1' || clean === 'user1' || clean === 'admin1@zbdypr' || clean.startsWith('admin1@')) {
      return 'admin1@zbdypr';
    }
    if (clean === 'admin2' || clean === 'user2' || clean === 'admin2@zbdypr' || clean.startsWith('admin2@')) {
      return 'admin2@zbdypr';
    }
    if (clean === 'axentm' || clean === 'axen' || clean === 'user3' || clean === 'axentm@zbdypr' || clean.startsWith('axentm@')) {
      return 'axentm@zbdypr';
    }
    if (clean === 'cetm' || clean === 'ce' || clean === 'user4' || clean === 'cetm@hqubl' || clean.startsWith('cetm@')) {
      return 'cetm@hqubl';
    }
    if (clean === 'dtycetmypr' || clean === 'dycetmypr' || clean === 'dycetm' || clean === 'dtycetm' || clean === 'user5' || clean === 'dtycetm@zbdypr' || clean === 'dycetm@zbdypr' || clean.startsWith('dtycetm') || clean.startsWith('dycetm')) {
      return 'dtycetmypr';
    }
    return input.trim().toLowerCase();
  }

  let AppUsers = JSON.parse(JSON.stringify(DEFAULT_USERS));
  let CurrentUser = null;

  function loadAuthUsers() {
    try {
      // Clean legacy cache from previous test iterations
      localStorage.removeItem('TM_FAST_USERS_V2');
      localStorage.removeItem('TM_FAST_USERS_V3');
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.keys(DEFAULT_USERS).forEach(uid => {
          if (!parsed[uid] || parsed[uid].password === 'newpass2026' || parsed[uid].password === 'axen2026') {
            parsed[uid] = JSON.parse(JSON.stringify(DEFAULT_USERS[uid]));
          }
        });
        AppUsers = parsed;
      } else {
        AppUsers = JSON.parse(JSON.stringify(DEFAULT_USERS));
        saveAuthUsers();
      }
    } catch (e) {
      console.warn('Error loading auth users:', e);
      AppUsers = JSON.parse(JSON.stringify(DEFAULT_USERS));
    }
  }

  function saveAuthUsers() {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(AppUsers));
    } catch (e) {
      console.error('Error saving auth users to localStorage:', e);
    }
    if (typeof CloudSync !== 'undefined' && CloudSync.isConfigured && CloudSync.db) {
      try {
        CloudSync.db.ref('tm_auth').set(AppUsers);
      } catch (err) {
        console.warn('Error syncing auth to cloud:', err);
      }
    }
  }

  function resetAuthUsersToDefault() {
    AppUsers = JSON.parse(JSON.stringify(DEFAULT_USERS));
    saveAuthUsers();
    showToast('Reset user credentials to official Indian Railways default passwords.');
    const errBox = document.getElementById('loginErrorMessage');
    if (errBox) errBox.style.display = 'none';
  }

  function checkSession() {
    loadAuthUsers();
    try {
      const sess = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
      if (sess) {
        const parsed = JSON.parse(sess);
        if (AppUsers[parsed.userId]) {
          CurrentUser = AppUsers[parsed.userId];
          applyUserSession(CurrentUser);
          return true;
        }
      }
    } catch (e) {
      console.warn('Session check error:', e);
    }
    showLoginOverlay();
    return false;
  }

  function showLoginOverlay() {
    CurrentUser = null;
    document.body.classList.remove('role-admin');
    document.body.classList.remove('role-viewer');
    const overlay = document.getElementById('loginOverlay');
    const container = document.getElementById('appContainer');
    const chip = document.getElementById('userSessionChip');
    if (overlay) overlay.classList.add('active');
    if (container) container.style.display = 'none';
    if (chip) chip.style.display = 'none';
    const err = document.getElementById('loginErrorMessage');
    if (err) err.style.display = 'none';
    if (typeof switchLoginCardTab === 'function') {
      switchLoginCardTab('login');
    }
    updateThemeUI(getCurrentTheme());
  }

  function applyUserSession(user) {
    CurrentUser = user;
    const overlay = document.getElementById('loginOverlay');
    const container = document.getElementById('appContainer');
    const chip = document.getElementById('userSessionChip');
    const userDisplay = document.getElementById('loggedInUserDisplay');
    const roleDisplay = document.getElementById('loggedInRoleDisplay');

    if (overlay) overlay.classList.remove('active');
    if (container) container.style.display = 'block';
    if (chip) chip.style.display = 'inline-flex';

    if (userDisplay) userDisplay.textContent = user.userId;
    if (roleDisplay) {
      roleDisplay.textContent = user.role;
      roleDisplay.className = 'role-badge ' + (user.role === 'ADMIN' ? 'admin' : 'viewer');
    }

    if (user.role === 'ADMIN') {
      document.body.classList.add('role-admin');
      document.body.classList.remove('role-viewer');
    } else {
      document.body.classList.add('role-viewer');
      document.body.classList.remove('role-admin');
    }

    updateThemeUI(getCurrentTheme());

    try {
      const sessData = JSON.stringify({ userId: user.userId, role: user.role, loggedInAt: Date.now() });
      sessionStorage.setItem(SESSION_STORAGE_KEY, sessData);
      localStorage.setItem(SESSION_STORAGE_KEY, sessData);
    } catch (e) {}

    renderAll();
  }

  function handleLogin() {
    loadAuthUsers();
    const idInput = document.getElementById('loginUserId');
    const passInput = document.getElementById('loginPassword');
    const errBox = document.getElementById('loginErrorMessage');
    if (!idInput || !passInput) return;

    const rawId = idInput.value.trim();
    const uId = resolveUserId(rawId);
    const pass = passInput.value.trim();

    if (!rawId || !pass) {
      if (errBox) {
        errBox.textContent = 'Please enter both User ID and Password.';
        errBox.style.display = 'block';
      }
      return;
    }

    const account = AppUsers[uId] || DEFAULT_USERS[uId];
    if (account && (account.password === pass || account.password.toLowerCase() === pass.toLowerCase())) {
      if (errBox) errBox.style.display = 'none';
      passInput.value = '';
      applyUserSession(account);
      showToast(`Welcome, ${account.name}! Logged in as ${account.role}.`);
    } else {
      if (errBox) {
        errBox.textContent = `Invalid credentials for "${rawId}". Expected official password or click a quick-select chip above.`;
        errBox.style.display = 'block';
      }
    }
  }

  function logout() {
    if (confirm('Are you sure you want to log out of TM-FAST?')) {
      try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        localStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (e) {}
      showLoginOverlay();
      showToast('Logged out successfully.');
    }
  }

  function openChangePasswordModal() {
    if (!CurrentUser) return;
    const userDisplay = document.getElementById('changePassUserDisplay');
    if (userDisplay) userDisplay.textContent = `${CurrentUser.userId} (${CurrentUser.name})`;
    const currInput = document.getElementById('currentPasswordInput');
    const newInput = document.getElementById('newPasswordInput');
    const confInput = document.getElementById('confirmNewPasswordInput');
    const err = document.getElementById('changePassError');
    if (currInput) currInput.value = '';
    if (newInput) newInput.value = '';
    if (confInput) confInput.value = '';
    if (err) err.style.display = 'none';
    openModal('changePasswordModal');
  }

  function handleChangePassword() {
    if (!CurrentUser) return;
    const currInput = document.getElementById('currentPasswordInput');
    const newInput = document.getElementById('newPasswordInput');
    const confInput = document.getElementById('confirmNewPasswordInput');
    const errBox = document.getElementById('changePassError');

    const curr = currInput ? currInput.value.trim() : '';
    const newP = newInput ? newInput.value.trim() : '';
    const conf = confInput ? confInput.value.trim() : '';

    if (curr !== CurrentUser.password) {
      if (errBox) {
        errBox.textContent = 'Current password does not match.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (!newP || newP.length < 4) {
      if (errBox) {
        errBox.textContent = 'New password must be at least 4 characters long.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (newP !== conf) {
      if (errBox) {
        errBox.textContent = 'New password and confirmation do not match.';
        errBox.style.display = 'block';
      }
      return;
    }

    // Update password
    AppUsers[CurrentUser.userId].password = newP;
    CurrentUser.password = newP;
    saveAuthUsers();
    closeModal('changePasswordModal');
    showToast('Password updated successfully!');
  }

  function switchLoginCardTab(tab) {
    const loginView = document.getElementById('loginViewContainer');
    const changePwView = document.getElementById('loginChangePwContainer');
    const tabLogin = document.getElementById('tabBtnLogin');
    const tabChangePw = document.getElementById('tabBtnChangePw');
    const err = document.getElementById('loginErrorMessage');
    const changeErr = document.getElementById('loginChangeError');
    const changeSuccess = document.getElementById('loginChangeSuccess');
    const topTabLabel = document.getElementById('loginTopRightTabLabel');

    if (err) err.style.display = 'none';
    if (changeErr) changeErr.style.display = 'none';
    if (changeSuccess) changeSuccess.style.display = 'none';

    if (tab === 'changepw') {
      if (loginView) loginView.style.display = 'none';
      if (changePwView) changePwView.style.display = 'block';
      if (tabLogin) tabLogin.classList.remove('active');
      if (tabChangePw) tabChangePw.classList.add('active');
      if (topTabLabel) topTabLabel.textContent = '🔒 Portal Sign In';
      const typedId = document.getElementById('loginUserId')?.value.trim().toLowerCase();
      const select = document.getElementById('loginChangeUserSelect');
      if (select && typedId && AppUsers[typedId]) {
        select.value = typedId;
      }
    } else {
      if (loginView) loginView.style.display = 'block';
      if (changePwView) changePwView.style.display = 'none';
      if (tabLogin) tabLogin.classList.add('active');
      if (tabChangePw) tabChangePw.classList.remove('active');
      if (topTabLabel) topTabLabel.textContent = '🔑 Change Password';
    }
  }

  function toggleLoginTabShortcut() {
    const changePwView = document.getElementById('loginChangePwContainer');
    const isChangePw = changePwView && changePwView.style.display === 'block';
    switchLoginCardTab(isChangePw ? 'login' : 'changepw');
  }

  function fillLoginCredentials(userId) {
    loadAuthUsers();
    switchLoginCardTab('login');
    const idInput = document.getElementById('loginUserId');
    const passInput = document.getElementById('loginPassword');
    const canonicalId = resolveUserId(userId);
    if (idInput) idInput.value = canonicalId;
    if (passInput) {
      const acc = AppUsers[canonicalId] || DEFAULT_USERS[canonicalId];
      if (acc && acc.password) {
        passInput.value = acc.password;
      }
      passInput.focus();
    }
    const errBox = document.getElementById('loginErrorMessage');
    if (errBox) errBox.style.display = 'none';
    showToast(`Loaded ${canonicalId} credentials.`);
  }

  function toggleLoginPasswordVisibility() {
    const passInput = document.getElementById('loginPassword');
    const toggleIcon = document.getElementById('togglePasswordIcon');
    if (!passInput) return;
    if (passInput.type === 'password') {
      passInput.type = 'text';
      if (toggleIcon) toggleIcon.textContent = '🙈';
    } else {
      passInput.type = 'password';
      if (toggleIcon) toggleIcon.textContent = '👁️';
    }
  }

  function handleLoginChangePassword() {
    loadAuthUsers();
    const userSelect = document.getElementById('loginChangeUserSelect');
    const currInput = document.getElementById('loginChangeCurrentPassword');
    const newInput = document.getElementById('loginChangeNewPassword');
    const confInput = document.getElementById('loginChangeConfirmPassword');
    const errBox = document.getElementById('loginChangeError');
    const successBox = document.getElementById('loginChangeSuccess');

    if (errBox) errBox.style.display = 'none';
    if (successBox) successBox.style.display = 'none';

    const uid = userSelect ? userSelect.value : '';
    const curr = currInput ? currInput.value.trim() : '';
    const newP = newInput ? newInput.value.trim() : '';
    const conf = confInput ? confInput.value.trim() : '';

    if (!uid || !AppUsers[uid]) {
      if (errBox) {
        errBox.textContent = 'Please select a valid user account.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (!curr) {
      if (errBox) {
        errBox.textContent = 'Please enter your current password.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (curr !== AppUsers[uid].password) {
      if (errBox) {
        errBox.textContent = 'Current password does not match for this account.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (!newP || newP.length < 4) {
      if (errBox) {
        errBox.textContent = 'New password must be at least 4 characters long.';
        errBox.style.display = 'block';
      }
      return;
    }

    if (newP !== conf) {
      if (errBox) {
        errBox.textContent = 'New password and confirmation do not match.';
        errBox.style.display = 'block';
      }
      return;
    }

    // Update password
    AppUsers[uid].password = newP;
    if (CurrentUser && CurrentUser.userId === uid) {
      CurrentUser.password = newP;
    }
    saveAuthUsers();

    if (currInput) currInput.value = '';
    if (newInput) newInput.value = '';
    if (confInput) confInput.value = '';

    if (successBox) {
      successBox.textContent = `Password updated successfully for ${AppUsers[uid].name}! You can now sign in.`;
      successBox.style.display = 'block';
    }

    showToast(`Password updated for ${uid}!`, false);

    setTimeout(() => {
      switchLoginCardTab('login');
      const loginIdInput = document.getElementById('loginUserId');
      const loginPassInput = document.getElementById('loginPassword');
      if (loginIdInput) loginIdInput.value = uid;
      if (loginPassInput) loginPassInput.focus();
    }, 1500);
  }

  function isUserAdmin() {
    return CurrentUser && CurrentUser.role === 'ADMIN';
  }

  // Default SWR Machine Fleet Mapping (Authentic fleet from SWR divisional folders)
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
      { id: 'UNIMAT-8269', model: 'Unimat 08-475 3S Points & Crossing Tamper', division: 'SBC', depot: 'YPR / BYPL', year: 2017, status: 'FIT' }
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
    'SRGM/RGM': [],
    'RBMV': [
      { id: 'RBMV-006', model: 'Rail Borne Maintenance Vehicle RBMV-006', division: 'SBC', depot: 'SBC', year: 2025, status: 'FIT' }
    ],
    'MDU': [
      { id: 'MDU-57218', model: 'Muck Disposal Unit 57218', division: 'UBL', depot: 'UBL', year: 2023, status: 'FIT' },
      { id: 'MDU-57220', model: 'Muck Disposal Unit 57220', division: 'UBL', depot: 'UBL', year: 2023, status: 'FIT' },
      { id: 'MDU-57222', model: 'Muck Disposal Unit 57222', division: 'UBL', depot: 'UBL', year: 2023, status: 'FIT' }
    ]
  };

  let FLEET_DIRECTORY = (typeof window !== 'undefined' && window.REAL_SWR_FLEET_DATA && window.REAL_SWR_FLEET_DATA.fleetDirectory)
    ? JSON.parse(JSON.stringify(window.REAL_SWR_FLEET_DATA.fleetDirectory))
    : JSON.parse(JSON.stringify(DEFAULT_FLEET_DIRECTORY));

  // Authentic Initial Failures
  const INITIAL_FAILURES = (typeof window !== 'undefined' && window.REAL_SWR_FLEET_DATA && window.REAL_SWR_FLEET_DATA.failures)
    ? window.REAL_SWR_FLEET_DATA.failures
    : [];

  // Local Storage Keys (v15 TM-FAST authentic fleet with strictly normalized DD-MM-YYYY dates and purged bogus rows)
  const STORAGE_KEY = 'TM_FAILURE_SURVEILLANCE_DATA_V15_DDMMYYYY';
  const FLEET_STORAGE_KEY = 'TM_FAILURE_FLEET_DIRECTORY_V15_DDMMYYYY';
  const HRM_STORAGE_KEY = 'TM_HRM_DATA_V17_COMPLETE_HEALED';

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
    selectedCategory: 'ALL',      // Default to Fleet Overview
    selectedMachine: 'UNIMAT-8269', // Default to active machine so HRM is immediately rendered!
    selectedDivision: 'ALL',      // Division Filter: ALL, SBC, MYS, UBL
    activeTab: 'hrm-view',        // TAB 1: History Register Module (HRM) as requested!
    searchQuery: '',
    statusFilter: 'ALL',
    subsystemFilter: 'ALL',
    chronologicalSortOrder: 'DESC', // 'DESC' (latest first) or 'ASC' (oldest first)
    historyDivisionFilter: 'ALL',
    historyBlockFilter: 'ALL',
    historyPeriodFilter: 'ALL',
    historyCategoryFilter: 'ALL',
    historyMachineFilter: 'ALL',
    historyStartDate: '',
    historyEndDate: '',
    historyLimit: 100,
    kpiScope: 'FY_2026_27', // Default Surveillance Highlights Scope: Current Financial Year 2026-27 (01.04.2026 to Present)
    charts: {}
  };

  // Initialization
  function initApp() {
    initTheme();
    loadAuthUsers();
    loadDataset();
    setupCategoryPills();
    updateMachineDropdown();
    updateHistoryMachineDropdown('ALL');
    setupEventListeners();
    renderAll();
    // Initialize Central Cloud Database Synchronization (Firebase)
    if (typeof CloudSync !== 'undefined') {
      CloudSync.init();
    }
    checkSession();
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
        'TM_FAILURE_SURVEILLANCE_DATA_V12_SBC_ALL', 'TM_FAILURE_FLEET_DIRECTORY_V12_SBC_ALL',
        'TM_FAILURE_SURVEILLANCE_DATA_V14_FAST', 'TM_FAILURE_FLEET_DIRECTORY_V14_FAST', 'TM_HRM_DATA_V14_FAST',
        'TM_HRM_DATA_V1', 'TM_HRM_DATA_V2', 'TM_HRM_DATA_V3', 'TM_HRM_DATA_V5_RBMV_UTV2', 'TM_HRM_DATA_V6_SBC_ALL', 'TM_HRM_DATA_V15_DDMMYYYY', 'TM_HRM_DATA_V16_ORDINAL_IOH_POH'
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

      // Purge any stale RMBV duplicate from fleet directory
      delete FLEET_DIRECTORY['RMBV'];

      // Always guarantee SRGM/RGM category exists
      if (!FLEET_DIRECTORY['SRGM/RGM']) FLEET_DIRECTORY['SRGM/RGM'] = [];

      // Always guarantee canonical machines from DEFAULT_FLEET_DIRECTORY exist
      Object.keys(DEFAULT_FLEET_DIRECTORY).forEach(cat => {
        if (!FLEET_DIRECTORY[cat]) FLEET_DIRECTORY[cat] = [];
        DEFAULT_FLEET_DIRECTORY[cat].forEach(defM => {
          if (!FLEET_DIRECTORY[cat].some(m => m.id === defM.id)) {
            FLEET_DIRECTORY[cat].push(JSON.parse(JSON.stringify(defM)));
          }
        });
      });

      // Normalize models in FLEET_DIRECTORY
      Object.keys(FLEET_DIRECTORY).forEach(cat => {
        FLEET_DIRECTORY[cat].forEach(m => {
          if (m.model && m.model.includes('Mobile Diagnostic Unit')) {
            m.model = m.model.replace('Mobile Diagnostic Unit', 'Muck Disposal Unit');
          }
          if (m.model && m.model.includes('4S Points')) {
            m.model = m.model.replace('4S Points', '3S Points');
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

      // Normalize any RMBV and SRGM/RGM category in failures
      AppState.failures.forEach(f => {
        if (f.category === 'RMBV') f.category = 'RBMV';
        if (f.category === 'SRGM' || f.category === 'RGM' || f.category === 'SRGM / RGM') f.category = 'SRGM/RGM';
      });

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
        try {
          HRM_DATA = JSON.parse(storedHrm);
        } catch (e) {
          HRM_DATA = {};
        }
      } else if (typeof window !== 'undefined' && window.REAL_SWR_FLEET_DATA && window.REAL_SWR_FLEET_DATA.historyRegisters) {
        HRM_DATA = JSON.parse(JSON.stringify(window.REAL_SWR_FLEET_DATA.historyRegisters));
      }

      // Proactively heal and guarantee 100% complete HRM data across ALL 22 authentic SWR fleet machines
      // If any machine is missing, erased, corrupted, or has empty items, immediately retrieve and replace with authentic records
      if (typeof window !== 'undefined' && window.REAL_SWR_FLEET_DATA && window.REAL_SWR_FLEET_DATA.historyRegisters) {
        Object.keys(window.REAL_SWR_FLEET_DATA.historyRegisters).forEach(mId => {
          healMachineHrm(mId);
        });
      }

      // Synchronize and enforce all chronological IOH and POH ordinals across all machines
      ensureAllHrmOrdinals(HRM_DATA);
      saveHrmData();

      // Sanitize failures: filter out any header/bogus rows
      AppState.failures = AppState.failures.filter(f => {
        if (!f || !f.id) return false;
        if (f.id === 'INC-DUO-8128-1062' || f.id === 'INC-FRM-57160-1541' || f.id === 'INC-MPT-12008-1659' || f.id === 'INC-MDU-57222-1557') return false;
        if (f.dateOfFailure === 'DESCRIPTION OF FAILURE' || f.natureOfFailure === 'REMARKS') return false;
        if (f.dateOfFailure === 'NA' && f.natureOfFailure === 'NA' && f.description === 'NA') return false;
        return true;
      });

      // Ensure every record has strictly normalized DD-MM-YYYY dates & remarks
      AppState.failures.forEach(f => {
        // Auto-detect and handle shifted column where date was put in natureOfFailure
        if (typeof f.natureOfFailure === 'string' && /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(f.natureOfFailure.trim())) {
          const dStr = String(f.dateOfFailure).trim();
          if (!/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(dStr) && !/^\d{4}-\d{2}-\d{2}/.test(dStr)) {
            const temp = f.dateOfFailure;
            f.dateOfFailure = f.natureOfFailure;
            f.natureOfFailure = temp;
            if (f.description === f.dateOfFailure) f.description = temp;
          }
        }

        if (f.dateOfFailure) f.dateOfFailure = formatDateDisplay(f.dateOfFailure);
        if (f.breakdownTime) f.breakdownTime = formatDateDisplay(f.breakdownTime);
        else f.breakdownTime = f.dateOfFailure;
        if (f.dateOfRectification && !/^(active|under repair|nil)$/i.test(f.dateOfRectification)) {
          f.dateOfRectification = formatDateDisplay(f.dateOfRectification);
        }
        if (f.fitTime && !/^(active|under repair|nil)$/i.test(f.fitTime)) {
          f.fitTime = formatDateDisplay(f.fitTime);
        }

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

  // ==========================================================================
  // CENTRAL CLOUD DATABASE SYNCHRONIZATION ENGINE (Firebase Realtime DB)
  // ==========================================================================
  const CloudSync = {
    isConfigured: false,
    isConnected: false,
    db: null,
    isSyncingFromRemote: false,

    init() {
      const cfg = (typeof window !== 'undefined') ? window.FIREBASE_CONFIG : null;
      if (!cfg || !cfg.apiKey || cfg.apiKey.includes('PASTE_') || !cfg.databaseURL || cfg.databaseURL.includes('PASTE_')) {
        this.updateIndicator('local', 'Cloud: Local Storage');
        return;
      }

      if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK not loaded, running in Local mode.');
        this.updateIndicator('local', 'Cloud: SDK Offline');
        return;
      }

      try {
        this.updateIndicator('connecting', 'Cloud: Connecting...');
        if (!firebase.apps.length) {
          firebase.initializeApp(cfg);
        }
        this.db = firebase.database();
        this.isConfigured = true;

        // Monitor connection status via .info/connected
        this.db.ref('.info/connected').on('value', snap => {
          this.isConnected = snap.val() === true;
          if (this.isConnected) {
            this.updateIndicator('connected', 'Cloud Sync: Live');
            console.log('Firebase Cloud Realtime Database connected successfully.');
          } else {
            this.updateIndicator('offline', 'Cloud: Reconnecting...');
          }
        });

        // Initialize cloud listeners
        this.setupCloudListeners();
      } catch (err) {
        console.error('Firebase initialization error:', err);
        this.updateIndicator('offline', 'Cloud: Config Error');
      }
    },

    updateIndicator(status, text) {
      const ind = document.getElementById('cloudSyncIndicator');
      const txt = document.getElementById('cloudStatusText');
      if (ind) {
        ind.className = 'cloud-sync-indicator ' + status;
      }
      if (txt) {
        txt.innerText = text;
      }
    },

    setupCloudListeners() {
      if (!this.db) return;

      // 1. Listen for Failures Database
      this.db.ref('tm_failures').on('value', snapshot => {
        const val = snapshot.val();
        if (val) {
          let remoteList = [];
          if (Array.isArray(val)) {
            remoteList = val;
          } else if (typeof val === 'object') {
            remoteList = Object.values(val);
          }
          if (remoteList.length > 0) {
            this.isSyncingFromRemote = true;
            AppState.failures = remoteList;
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState.failures));
            } catch (e) {}
            classifyRepetitiveFailures(AppState.failures);
            updateMachineDropdown();
            renderAll();
            this.isSyncingFromRemote = false;
          }
        } else {
          // Cloud node is empty, seed initial dataset
          this.seedInitialData();
        }
      });

      // 2. Listen for HRM Database
      this.db.ref('tm_hrm').on('value', snapshot => {
        const val = snapshot.val();
        if (val && typeof val === 'object') {
          this.isSyncingFromRemote = true;
          HRM_DATA = val;
          if (typeof window !== 'undefined' && window.REAL_SWR_FLEET_DATA && window.REAL_SWR_FLEET_DATA.historyRegisters) {
            Object.keys(window.REAL_SWR_FLEET_DATA.historyRegisters).forEach(mId => {
              healMachineHrm(mId);
            });
          }
          ensureAllHrmOrdinals(HRM_DATA);
          try {
            localStorage.setItem(HRM_STORAGE_KEY, JSON.stringify(HRM_DATA));
          } catch (e) {}
          renderHrmView();
          this.isSyncingFromRemote = false;
        } else if (!val && HRM_DATA && Object.keys(HRM_DATA).length > 0) {
          try { this.db.ref('tm_hrm').set(HRM_DATA).catch(() => {}); } catch (e) {}
        }
      });

      // 3. Listen for Fleet Directory
      this.db.ref('tm_fleet').on('value', snapshot => {
        const val = snapshot.val();
        if (val && typeof val === 'object') {
          this.isSyncingFromRemote = true;
          FLEET_DIRECTORY = val;
          try {
            localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(FLEET_DIRECTORY));
          } catch (e) {}
          setupCategoryPills();
          updateMachineDropdown();
          this.isSyncingFromRemote = false;
        } else if (!val && FLEET_DIRECTORY) {
          try { this.db.ref('tm_fleet').set(FLEET_DIRECTORY).catch(() => {}); } catch (e) {}
        }
      });

      // 4. Listen for User Accounts & Password Updates
      this.db.ref('tm_auth').on('value', snapshot => {
        const val = snapshot.val();
        if (val && typeof val === 'object') {
          Object.keys(val).forEach(uid => {
            if (AppUsers[uid]) {
              AppUsers[uid].password = val[uid].password || AppUsers[uid].password;
            } else {
              AppUsers[uid] = val[uid];
            }
          });
          try {
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(AppUsers));
          } catch (e) {}
          if (CurrentUser && AppUsers[CurrentUser.userId]) {
            CurrentUser = AppUsers[CurrentUser.userId];
          }
        } else if (!val) {
          this.db.ref('tm_auth').set(AppUsers);
        }
      });
    },

    seedInitialData() {
      if (!this.db || !AppState.failures || AppState.failures.length === 0) return;
      console.log('Seeding initial authentic SWR dataset to Firebase Cloud...');
      this.db.ref('tm_failures').set(AppState.failures);
      if (HRM_DATA) this.db.ref('tm_hrm').set(HRM_DATA);
      if (FLEET_DIRECTORY) this.db.ref('tm_fleet').set(FLEET_DIRECTORY);
      this.db.ref('tm_auth').set(AppUsers);
    },

    pushFailures() {
      if (!this.isConfigured || !this.db || this.isSyncingFromRemote) return;
      try {
        this.db.ref('tm_failures').set(AppState.failures);
      } catch (e) {
        console.error('Error syncing failures to cloud:', e);
      }
    },

    pushHrm() {
      if (!this.isConfigured || !this.db || this.isSyncingFromRemote) return;
      try {
        this.db.ref('tm_hrm').set(HRM_DATA);
      } catch (e) {
        console.error('Error syncing HRM to cloud:', e);
      }
    },

    pushFleet() {
      if (!this.isConfigured || !this.db || this.isSyncingFromRemote) return;
      try {
        this.db.ref('tm_fleet').set(FLEET_DIRECTORY);
      } catch (e) {
        console.error('Error syncing fleet to cloud:', e);
      }
    }
  };

  function saveDataset() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(AppState.failures));
      localStorage.setItem(FLEET_STORAGE_KEY, JSON.stringify(FLEET_DIRECTORY));
    } catch (e) {
      console.error('Error saving data to localStorage:', e);
    }
    if (typeof CloudSync !== 'undefined' && CloudSync.isConfigured) {
      CloudSync.pushFailures();
      CloudSync.pushFleet();
    }
  }

  function saveHrmData() {
    try {
      localStorage.setItem(HRM_STORAGE_KEY, JSON.stringify(HRM_DATA));
    } catch (e) {
      console.error('Error saving HRM data to localStorage:', e);
    }
    if (typeof CloudSync !== 'undefined' && CloudSync.isConfigured) {
      CloudSync.pushHrm();
    }
  }

  // ==========================================================================
  // INTELLIGENT SEMANTIC DEFECT SURVEILLANCE & REPETITIVE FAILURE ENGINE
  // ==========================================================================
  const CANONICAL_DEFECT_FAMILIES = [
    { id: 'SQUEEZE_CYL', name: 'Squeezing Cylinder Defect', pat: /squeez\w*\s+cyl|male\s+squeez|female\s+squeez|inner\s+squeez|outer\s+squeez|big\s+squeez|small\s+squeez|hzs-ds|squeezing\s+cyl|squeezing\s+piston/i, sym: /seal|leak|burst|cut|worn|pressure|damage|oil/i },
    { id: 'VIB_SHAFT', name: 'Tamping Vibration Shaft / Bearing Failure', pat: /vibrat\w*\s+shaft|vibrat\w*\s+unit|vibrat\w*\s+bearing|eccentric\s+shaft|main\s+bearing\s+flange/i, sym: /shaft|bearing|cut|seiz|damage|vibrat|flange|noise|hot|smoke/i },
    { id: 'SPRING_CORD', name: 'Tamping Transducer Spring / Cord Wire Cut', pat: /tamping\s+bank\s+(?:cord\s+wire|spring)|tras?nducer\s+spring|cord\s+wire|hty2-00-12/i, sym: /cut|broken|damage|wire|spring|snapped/i },
    { id: 'PIN_35MM', name: 'Tamping 35mm Extension Joint Pin Failure', pat: /35\s*mm\s+pin|23067096|extension\s+joint/i, sym: /pin|cut|broken|joint/i },
    { id: 'TOOL_ARM', name: 'Tamping Tool Holder / Squeezing Arm Defect', pat: /tool\s+tilting|squeezing\s+arm|tool\s+holder|tamping\s+arm|tamping\s+tool/i, sym: /cut|broken|arm|cylinder|pin|wear|loose|fallen|bolt/i },
    { id: 'TRANSDUCER', name: 'Lining / Leveling Transducer & Potentiometer Defect', pat: /tras?nducer|potentiometer|depth\s+transducer|lining\s+potentiometer|lining\s+disturbance|slewed/i, sym: /signal|malfunction|output|potentiometer|transducer|fluctuat|slewed|disturbance/i },
    { id: 'CARDAN_SHAFT', name: 'Cardan / Propeller Shaft Defect', pat: /card[ao]n\s+shaft|propeller\s+shaft|flange\s+yoke|intermediate\s+shaft/i, sym: /groove|cut|yoke|broken|shaft|bolt|dummy|noise/i },
    { id: 'AXLE_GEARBOX', name: 'Axle Drive & Gearbox Defect', pat: /axle\s+(?:1|2|3|4|gear\s*box)|axle\s+drive|revers\w*\s+gearbox|axle\s+clutch/i, sym: /stuck|gearbox|drive|leak|noise|seiz|clutch\s+pressure|drop/i },
    { id: 'ENGINE_RPM', name: 'Engine RPM & Governor Fluctuation', pat: /rpm\s+(?:fluct|stuck|higher|hunt|meter|cable|motor)|governor|147901|control\s+rod/i, sym: /rpm|stuck|hunting|fluct|speed|high\s+rpm|control\s+rod|cable/i },
    { id: 'ENGINE_START', name: 'Engine Starting & Cranking Troubles', pat: /engine\s+(?:not\s+start|shut\s+down|stopped|crank)|starter\s+motor|self\s+starter/i, sym: /start|crank|shut\s*down|stopped|cranking/i },
    { id: 'ENGINE_COOLING', name: 'Engine Radiator, Water Pump & Fan Defect', pat: /radiator|fan\s+hub|water\s+pump|coolant|pulley.*belt|radiator\s+fan/i, sym: /leak|belt|bolt|cut|fan|pulley|temp|cool|broken/i },
    { id: 'ENGINE_FUEL', name: 'Engine Fuel System & PT Pump Failure', pat: /pt\s+pump|fuel\s+(?:pump|inject|supply|pipe)|fuel\s+line/i, sym: /fuel|diesel|leak|shaft|coupler|calibrat|jammed/i },
    { id: 'AIR_COMPRESSOR', name: 'Air Compressor & Pneumatic Braking Defect', pat: /air\s+compressor|unloader\s+valve|brake\s+cylinder|direct\s+brake|pneumatic\s+system/i, sym: /air|compressor|pressure|unloader|brake|build|releasing|leak/i },
    { id: 'HYD_HOSE', name: 'Hydraulic High Pressure Hose Burst / Leak', pat: /hyd\w*\s+hose|driving\s+hose|16r02|4r02|dash\s+no\s*16|high\s+pressure\s+hose/i, sym: /hose|burst|leak|punct|crimp|fitting|end\s+fitting/i },
    { id: 'HYD_VALVE', name: 'Hydraulic DC / Proportional Valve Malfunction', pat: /dc\s+valve|solenoid\s+valve|proportional\s+valve|relief\s+valve|lifting\s+valve/i, sym: /valve|elbow|leak|stick|solenoid|malfunction|output/i },
    { id: 'HYD_PRESSURE', name: 'Hydraulic System Pressure & Pump Failure', pat: /hydraulic\s+system\s+pressure|hyd\w*\s+pump|variable\s+pump/i, sym: /pressure|pump|cavitat|flow|unable\s+to\s+develop/i },
    { id: 'CONVEYOR', name: 'Conveyor System & Swivel Belt Defect', pat: /waste\s+conveyor|transfer\s+conveyor|conveyor\s+belt|conveyor\s+roller|swivel\s+belt|main\s+conveyor/i, sym: /conveyor|bearing|belt|roller|motor|pasting|layer|stuck|rotation/i },
    { id: 'CUTTER_CHAIN', name: 'Cutter Chain, Bar & Sprocket Failure', pat: /cutter\s+chain|cutter\s+bar|sprocket|guide\s+trough|cutter\s+gearbox/i, sym: /chain|sprocket|bar|fell|bolt|broken|roller|guide\s+plate/i },
    { id: 'ALTERNATOR_BAT', name: 'Alternator & Battery Charging Failure', pat: /alternator|dynamo|batter(?:y|ies)/i, sym: /charg|alternator|battery|voltage|low\s+charge/i },
    { id: 'ELECTRICAL_HMI', name: 'Electrical Control Panel, Relay & HMI Defect', pat: /hmi|display\s+unit|control\s+panel|proximity\s+switch|relay\s+pcb|u111|u156/i, sym: /hmi|hang|display|panel|sensor|switch|relay|glowing/i }
  ];

  const PART_CODE_REGEX = /\b(?:hty2-00-12|23067096|hzs-ds[\w.-]*|16r02|4r02|147901|w\.33\.200|3240743|5413187|3067459|3005962|4026171|66219|67532|1308\s*tvh|gh506|hy830|hy6rsj|09d090|ke\s*127)\b/gi;

  function extractFailureFeatures(f) {
    // Primary text: strictly what happened in the incident (natureOfFailure and description)
    const compClean = (f.component || '').replace(/\(P\/N:[\s\S]*?\)/gi, '').trim();
    const primaryTxt = ((f.natureOfFailure || '') + ' ' + compClean + ' ' + (f.description || '')).toLowerCase();
    const fullTxt = (primaryTxt + ' ' + (f.rootCause || '') + ' ' + (f.actionTaken || '') + ' ' + (f.partNo || '') + ' ' + (f.sparesUsed || '')).toLowerCase();

    // Part codes: can be anywhere in full text or partNo
    const codes = [];
    let m;
    PART_CODE_REGEX.lastIndex = 0;
    while ((m = PART_CODE_REGEX.exec(fullTxt)) !== null) {
      codes.push(m[0].toLowerCase());
    }

    // Matched families: based on primary text of the actual incident!
    const families = [];
    CANONICAL_DEFECT_FAMILIES.forEach(fam => {
      if (fam.pat.test(primaryTxt) && fam.sym.test(primaryTxt)) {
        families.push(fam);
      }
    });

    return { primaryTxt, fullTxt, codes, families };
  }

  function areFailuresRepetitive(a, b) {
    if (a.machineNo !== b.machineNo) return null;

    // Check shared specific part codes
    if (a._features && b._features && a._features.codes.length > 0 && b._features.codes.length > 0) {
      for (let ca of a._features.codes) {
        if (b._features.codes.includes(ca)) {
          return 'Shared Part Code: ' + ca.toUpperCase();
        }
      }
    }

    // Check shared component family
    if (a._features && b._features) {
      for (let fa of a._features.families) {
        for (let fb of b._features.families) {
          if (fa.id === fb.id) {
            return fa.name;
          }
        }
      }
    }

    return null;
  }

  // Repetitive Failure Surveillance Algorithm (Semantic Defect Matching)
  function classifyRepetitiveFailures(list) {
    if (!list || !Array.isArray(list)) return;

    // 1. Column shift auto-repair (e.g. DUO-8128)
    list.forEach(f => {
      const dVal = String(f.dateOfFailure || f.breakdownTime || f.date || '');
      const natVal = String(f.natureOfFailure || '');
      const isNatDate = /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(natVal.trim());
      const isDDate = /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(dVal.trim()) || /^\d{4}-\d{2}-\d{2}/.test(dVal.trim());
      if (isNatDate && !isDDate) {
        f.dateOfFailure = natVal;
        f.breakdownTime = natVal;
        f.natureOfFailure = dVal;
        f.description = dVal;
      }
    });

    // 2. Extract semantic defect features & reset flags
    list.forEach(f => {
      f.isRepetitive = false;
      f.repeatCount = 1;
      f.defectFamily = '';
      f.repetitiveReason = '';
      f._features = extractFailureFeatures(f);
    });

    // 3. Group by machine
    const byMachine = {};
    list.forEach(f => {
      const mId = f.machineNo;
      if (!byMachine[mId]) byMachine[mId] = [];
      byMachine[mId].push(f);
    });

    // 4. Discover connected defect recurrence clusters on each machine
    Object.keys(byMachine).forEach(mId => {
      const recs = byMachine[mId];
      const n = recs.length;
      const adj = Array.from({ length: n }, () => []);

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const reason = areFailuresRepetitive(recs[i], recs[j]);
          if (reason) {
            adj[i].push({ idx: j, reason });
            adj[j].push({ idx: i, reason });
          }
        }
      }

      const visited = new Array(n).fill(false);
      for (let i = 0; i < n; i++) {
        if (!visited[i] && adj[i].length > 0) {
          const cluster = [];
          const queue = [i];
          visited[i] = true;
          let clusterReason = adj[i][0].reason;

          while (queue.length > 0) {
            const curr = queue.shift();
            cluster.push(recs[curr]);
            adj[curr].forEach(edge => {
              if (!visited[edge.idx]) {
                visited[edge.idx] = true;
                queue.push(edge.idx);
                if (!clusterReason) clusterReason = edge.reason;
              }
            });
          }

          if (cluster.length >= 2) {
            cluster.forEach(c => {
              c.isRepetitive = true;
              c.repeatCount = Math.max(c.repeatCount || 1, cluster.length);
              c.defectFamily = clusterReason;
              c.repetitiveReason = `Recurring ${clusterReason} on ${mId} (${cluster.length}x cases)`;
            });
          }
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
        if (cat === 'SRGM/RGM' || cat === 'SRGM / RGM') {
          return f.category === 'SRGM/RGM' || f.category === 'SRGM / RGM' || f.category === 'SRGM' || f.category === 'RGM';
        }
        return f.category === cat;
      }).length;
      const displayLabel = (cat === 'SRGM/RGM' || cat === 'SRGM / RGM') ? 'SRGM / RGM' : cat;
      const fullName = getCategoryFullName(cat);
      pill.innerHTML = `<span>${displayLabel}</span><span class="pill-badge">${count}</span>`;
      pill.title = `${displayLabel} (${fullName})`;
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
        const catLabel = (AppState.selectedCategory === 'SRGM/RGM' || AppState.selectedCategory === 'SRGM / RGM')
          ? 'SRGM / RGM (Switch Rail Grinding / Rail Grinding)'
          : `${AppState.selectedCategory} Category`;
        metaContainer.innerHTML = `
          <span class="meta-chip">Scope: <strong>${catLabel}</strong></span>
          <span class="meta-chip" style="color: var(--gold-400);">Fleet: <strong>0 Machines Registered</strong></span>
          <button class="btn btn-primary-gold" onclick="window.TM_APP.openUploadModalForCategory('${AppState.selectedCategory}')" style="padding: 6px 14px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 6px;">
            <span>➕ Upload History Sheet for ${catLabel}</span>
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
        <span class="meta-chip">Total Incidents: <strong>${fails.length}</strong></span>
        ${isRepair ? `<span class="meta-status-badge status-repair-pill">⚠️ UNDER SITE REPAIR</span>` : `<span class="meta-status-badge status-fit-pill">✅ CURRENTLY FIT</span>`}
        ${repeats > 0 ? `<span class="meta-status-badge status-repetitive-pill">🚨 ${repeats} Repetitive Defect Cases</span>` : ''}
      `;
    }
  }

  // Filter failures based on Category, Machine, Search, Subsystem, and Status
  function getFilteredFailures() {
    return AppState.failures.filter(f => {
      // Category match (supporting both RBMV/RMBV and SRGM/RGM aliases)
      if (AppState.selectedCategory !== 'ALL') {
        const isRbmvMatch = (AppState.selectedCategory === 'RBMV' || AppState.selectedCategory === 'RMBV') && 
                            (f.category === 'RBMV' || f.category === 'RMBV');
        const isSrgmMatch = (AppState.selectedCategory === 'SRGM/RGM' || AppState.selectedCategory === 'SRGM / RGM') &&
                            (f.category === 'SRGM/RGM' || f.category === 'SRGM / RGM' || f.category === 'SRGM' || f.category === 'RGM');
        if (f.category !== AppState.selectedCategory && !isRbmvMatch && !isSrgmMatch) {
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

  // Get failures for the highlights KPI strip & Fleet Surveillance (scoped to selected category & division across all machines)
  function getFleetFailuresForKPIs() {
    return AppState.failures.filter(f => {
      // Category match
      if (AppState.selectedCategory !== 'ALL') {
        const isRbmvMatch = (AppState.selectedCategory === 'RBMV' || AppState.selectedCategory === 'RMBV') && 
                            (f.category === 'RBMV' || f.category === 'RMBV');
        const isSrgmMatch = (AppState.selectedCategory === 'SRGM/RGM' || AppState.selectedCategory === 'SRGM / RGM') &&
                            (f.category === 'SRGM/RGM' || f.category === 'SRGM / RGM' || f.category === 'SRGM' || f.category === 'RGM');
        if (f.category !== AppState.selectedCategory && !isRbmvMatch && !isSrgmMatch) {
          return false;
        }
      }
      // Division match
      if (AppState.selectedDivision !== 'ALL') {
        const div = (f.division || '').toUpperCase();
        if (!div.includes(AppState.selectedDivision)) {
          return false;
        }
      }
      return true;
    });
  }

  // Render KPIs, Surveillance Banner, Charts and Tables
  function renderAll() {
    const filtered = getFilteredFailures();
    const kpiFailures = getFleetFailuresForKPIs();

    renderKPIs(kpiFailures);
    renderSurveillanceAlerts(kpiFailures);
    renderTable(getAllMachineIncidentsChronological());
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

  // Indian Railways Financial Year Definitions
  const FINANCIAL_YEARS = {
    'FY_2026_27': {
      id: 'FY_2026_27',
      label: 'FY 2026-27 (Current)',
      fullLabel: 'Current Financial Year 2026-27 (01-04-2026 to Present)',
      shortName: 'FY 2026-27',
      start: new Date(2026, 3, 1, 0, 0, 0).getTime(), // 01.04.2026 00:00:00
      end: new Date(2027, 2, 31, 23, 59, 59).getTime()  // 31.03.2027 23:59:59
    },
    'FY_2025_26': {
      id: 'FY_2025_26',
      label: 'FY 2025-26',
      fullLabel: 'Financial Year 2025-26 (01-04-2025 to 31-03-2026)',
      shortName: 'FY 2025-26',
      start: new Date(2025, 3, 1, 0, 0, 0).getTime(), // 01.04.2025 00:00:00
      end: new Date(2026, 2, 31, 23, 59, 59).getTime()  // 31.03.2026 23:59:59
    },
    'FY_2024_25': {
      id: 'FY_2024_25',
      label: 'FY 2024-25',
      fullLabel: 'Financial Year 2024-25 (01-04-2024 to 31-03-2025)',
      shortName: 'FY 2024-25',
      start: new Date(2024, 3, 1, 0, 0, 0).getTime(), // 01.04.2024 00:00:00
      end: new Date(2025, 2, 31, 23, 59, 59).getTime()  // 31.03.2025 23:59:59
    },
    'FY_2023_24': {
      id: 'FY_2023_24',
      label: 'FY 2023-24',
      fullLabel: 'Financial Year 2023-24 (01-04-2023 to 31-03-2024)',
      shortName: 'FY 2023-24',
      start: new Date(2023, 3, 1, 0, 0, 0).getTime(), // 01.04.2023 00:00:00
      end: new Date(2024, 2, 31, 23, 59, 59).getTime()  // 31.03.2024 23:59:59
    },
    'FY_2022_23': {
      id: 'FY_2022_23',
      label: 'FY 2022-23',
      fullLabel: 'Financial Year 2022-23 (01-04-2022 to 31-03-2023)',
      shortName: 'FY 2022-23',
      start: new Date(2022, 3, 1, 0, 0, 0).getTime(), // 01.04.2022 00:00:00
      end: new Date(2023, 2, 31, 23, 59, 59).getTime()  // 31.03.2023 23:59:59
    }
  };

  // Helper: Determine if failure falls strictly in a selected Financial Year or ALL
  function isFailureInFY(f, fyKey) {
    if (!f) return false;
    if (!fyKey || fyKey === 'ALL') return true;
    if (fyKey === 'FY') fyKey = 'FY_2026_27';
    const conf = FINANCIAL_YEARS[fyKey];
    if (!conf) return true;
    const rng = getFailureDateRange(f);
    if (!rng.startTs) return false;
    return rng.startTs <= conf.end && rng.endTs >= conf.start;
  }

  // Set Financial Year Surveillance Scope ('FY_2026_27', 'FY_2025_26', 'FY_2024_25', 'FY_2023_24', 'FY_2022_23', 'ALL')
  function setKpiScope(scope) {
    if (scope === 'FY') scope = 'FY_2026_27';
    AppState.kpiScope = scope;

    const fyButtons = [
      { id: 'btnScopeFY2026_27', key: 'FY_2026_27' },
      { id: 'btnScopeFY2025_26', key: 'FY_2025_26' },
      { id: 'btnScopeFY2024_25', key: 'FY_2024_25' },
      { id: 'btnScopeFY2023_24', key: 'FY_2023_24' },
      { id: 'btnScopeFY2022_23', key: 'FY_2022_23' },
      { id: 'btnScopeAll', key: 'ALL' }
    ];

    fyButtons.forEach(b => {
      const el = document.getElementById(b.id);
      if (el) el.classList.toggle('active', AppState.kpiScope === b.key);
    });

    const labelEl = document.getElementById('kpiScopePeriodLabel');
    if (labelEl) {
      if (AppState.kpiScope === 'ALL') {
        labelEl.textContent = 'All-Time Cumulative Historical Dataset';
      } else if (FINANCIAL_YEARS[AppState.kpiScope]) {
        labelEl.textContent = FINANCIAL_YEARS[AppState.kpiScope].fullLabel;
      } else {
        labelEl.textContent = 'Current Financial Year 2026-27 (01-04-2026 to Present)';
      }
    }

    const kpiFailures = getFleetFailuresForKPIs();
    renderKPIs(kpiFailures);
    renderBlockVsNonBlockChart(kpiFailures);
    renderSurveillanceAlerts(kpiFailures);

    const toastName = (AppState.kpiScope === 'ALL')
      ? 'All Historical Logs'
      : (FINANCIAL_YEARS[AppState.kpiScope] ? FINANCIAL_YEARS[AppState.kpiScope].shortName : 'Current Financial Year');
    showToast(`Surveillance Highlights Period: ${toastName}`);
  }

  // Render KPI Counter Strip
  function renderKPIs(list) {
    const isAllScope = (AppState.kpiScope === 'ALL');
    const fyKey = isAllScope ? null : (AppState.kpiScope === 'FY' ? 'FY_2026_27' : AppState.kpiScope);
    const kpiList = isAllScope ? list : list.filter(f => isFailureInFY(f, fyKey));
    const fyShort = isAllScope ? 'All-Time' : (FINANCIAL_YEARS[fyKey] ? FINANCIAL_YEARS[fyKey].shortName : 'FY 2026-27');

    const totalFailures = kpiList.length;
    const activeRepairs = kpiList.filter(f => f.status === 'UNDER REPAIR').length;

    // 1. Total Monitored Machines vs 87 Total SWR Machines (Always show total updated machines / 87 machines)
    const TOTAL_SWR_FLEET = 87;
    const allMonitoredSet = new Set();
    if (typeof FLEET_DIRECTORY !== 'undefined') {
      Object.keys(FLEET_DIRECTORY).forEach(c => {
        (FLEET_DIRECTORY[c] || []).forEach(m => {
          if (m.id || m.machineNo) allMonitoredSet.add(m.id || m.machineNo);
        });
      });
    }
    AppState.failures.forEach(f => {
      if (f.machineNo) allMonitoredSet.add(f.machineNo);
    });
    const totalMonitoredCount = allMonitoredSet.size || 22;
    const currentMonitoredSet = new Set(list.map(f => f.machineNo));
    const currentCategoryMonitored = currentMonitoredSet.size;

    // 2. Count Repetitive Cases for currently scoped fleet
    const repeatFailures = kpiList.filter(f => f.isRepetitive).length;

    // 3. Count Cases Occurred In Block vs Not In Block
    let inBlockCount = 0;
    let nonBlockCount = 0;
    kpiList.forEach(f => {
      const b = String(f.whetherInBlock || '').toUpperCase().trim();
      if (b === 'YES' || b.includes('BLOCK') || b === 'Y') {
        inBlockCount++;
      } else {
        nonBlockCount++;
      }
    });

    // Populate DOM elements
    const elTot = document.getElementById('kpiTotalFailures');
    if (elTot) elTot.textContent = totalFailures;
    const elTotSub = document.getElementById('kpiTotalFailuresSubtext');
    if (elTotSub) {
      elTotSub.textContent = isAllScope
        ? (AppState.selectedCategory !== 'ALL' ? `All-time (${AppState.selectedCategory} fleet)` : 'All-Time Cumulative Dataset')
        : (AppState.selectedCategory !== 'ALL' ? `${fyShort} (${AppState.selectedCategory} fleet)` : `${fyShort} (${FINANCIAL_YEARS[fyKey] ? FINANCIAL_YEARS[fyKey].label : '1 Apr - 31 Mar'})`);
    }

    const elAct = document.getElementById('kpiActiveRepairs');
    if (elAct) elAct.textContent = activeRepairs;
    const elActSub = document.getElementById('kpiActiveRepairsSubtext');
    if (elActSub) {
      elActSub.textContent = isAllScope
        ? (activeRepairs === 0 ? 'All site breakdowns rectified' : `${activeRepairs} currently under active repair`)
        : (activeRepairs === 0 ? `All site breakdowns rectified in ${fyShort}` : `${activeRepairs} under active repair in ${fyShort}`);
    }

    // Machines Monitored vs 87 Total (Always show total updated machines / 87 machines)
    const elMon = document.getElementById('kpiMonitoredMachines');
    if (elMon) elMon.textContent = totalMonitoredCount;
    const elTotFleet = document.getElementById('kpiTotalFleetMachines');
    if (elTotFleet) elTotFleet.textContent = TOTAL_SWR_FLEET;
    const elMonSub = document.getElementById('kpiMonitoredSubtext');
    if (elMonSub) {
      if (AppState.selectedCategory !== 'ALL') {
        elMonSub.textContent = `${totalMonitoredCount} updated machines (${currentCategoryMonitored} in ${AppState.selectedCategory}) vs ${TOTAL_SWR_FLEET} total SWR fleet`;
      } else {
        elMonSub.textContent = `${totalMonitoredCount} updated machines with complete history vs ${TOTAL_SWR_FLEET} total SWR fleet`;
      }
    }

    // Fleet Repetitive Cases
    const elRep = document.getElementById('kpiFleetRepeatCases');
    if (elRep) elRep.textContent = repeatFailures;
    const elRepSub = document.getElementById('kpiFleetRepeatSubtext');
    if (elRepSub) {
      if (isAllScope) {
        elRepSub.textContent = AppState.selectedCategory !== 'ALL'
          ? `All-time recurring defects in ${AppState.selectedCategory} fleet`
          : `All-time recurring defect incidents across monitored fleet`;
      } else {
        elRepSub.textContent = AppState.selectedCategory !== 'ALL'
          ? `Recurring defects in ${AppState.selectedCategory} fleet (${fyShort})`
          : `Recurring defect incidents in ${fyShort}`;
      }
    }

    // Block vs Non-Block Cases
    const elInBlock = document.getElementById('kpiInBlockCases');
    if (elInBlock) elInBlock.textContent = inBlockCount;
    const elNonBlock = document.getElementById('kpiNonBlockCases');
    if (elNonBlock) elNonBlock.textContent = nonBlockCount;
    const elBlockSub = document.getElementById('kpiBlockSubtext');
    if (elBlockSub) {
      if (isAllScope) {
        elBlockSub.textContent = AppState.selectedCategory !== 'ALL'
          ? `All-time: In Block vs Non-Block (${AppState.selectedCategory})`
          : `All-time traffic block operational impact`;
      } else {
        elBlockSub.textContent = AppState.selectedCategory !== 'ALL'
          ? `${fyShort}: In Block vs Non-Block (${AppState.selectedCategory})`
          : `${fyShort} traffic block operational impact`;
      }
    }
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

    // 5. Scroll to and pulse the row + highlight complete cluster
    setTimeout(() => {
      // Clear any existing highlights across all desks
      document.querySelectorAll('.highlight-pulse-row, .highlight-cluster-row').forEach(el => {
        el.classList.remove('highlight-pulse-row', 'highlight-cluster-row');
      });

      // Find all related failures on that machine in that subsystem desk
      const isCrane = isCraneMachine(machineNo) || isCraneMachine(AppState.selectedCategory);
      const relatedFails = AppState.failures.filter(f => {
        if (f.machineNo !== machineNo) return false;
        
        // Match desk
        const fSub = (f.subsystem || '').toLowerCase();
        let fDesk = 'Engine';
        if (fSub.includes('tamp') || fSub.includes('crane') || fSub.includes('cutter')) {
          fDesk = isCrane ? 'Crane' : 'Tamping Unit';
        } else if (fSub.includes('mech')) {
          fDesk = 'Mechanical';
        } else if (fSub.includes('hyd')) {
          fDesk = 'Hydraulic';
        } else if (fSub.includes('pneum') || fSub.includes('air') || fSub.includes('brake')) {
          fDesk = 'Pneumatic';
        } else if (fSub.includes('elec')) {
          fDesk = 'Electrical';
        }

        if (fDesk !== deskKey) return false;

        // If exact target
        if (target && f.id === target.id) return true;

        // If repetitive flag is set on both
        if (target && target.isRepetitive && f.isRepetitive) return true;

        // If matching part number
        if (target && target.partNo && target.partNo !== '-' && f.partNo && f.partNo !== '-' &&
            target.partNo.trim().toLowerCase() === f.partNo.trim().toLowerCase()) {
          return true;
        }

        // Check keyword overlap in failure nature / description
        if (target) {
          const tWords = ((target.natureOfFailure || '') + ' ' + (target.description || '')).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3);
          const fWords = ((f.natureOfFailure || '') + ' ' + (f.description || '')).toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3);
          const common = tWords.filter(w => fWords.includes(w) && !['with', 'from', 'done', 'checked', 'replaced', 'working', 'failure', 'during'].includes(w));
          if (common.length >= 2) return true;
        }

        return false;
      });

      // Highlight the entire cluster
      let primaryRowEl = null;
      relatedFails.forEach(rf => {
        const rEl = document.getElementById(`failureRow-${rf.id}`);
        if (rEl) {
          rEl.classList.add('highlight-cluster-row');
          if (target && rf.id === target.id) {
            rEl.classList.add('highlight-pulse-row');
            primaryRowEl = rEl;
          }
        }
      });

      // Fallback if primary row wasn't found by ID
      if (!primaryRowEl && target) {
        const rows = document.querySelectorAll(`#${targetTab} tbody tr`);
        rows.forEach(r => {
          if ((target.description && r.innerText.includes(target.description.substring(0, 25))) ||
              (target.natureOfFailure && r.innerText.includes(target.natureOfFailure.substring(0, 25)))) {
            r.classList.add('highlight-pulse-row');
            primaryRowEl = r;
          }
        });
      }

      // Display the cluster banner
      const bannerEl = document.getElementById(`clusterBanner-${deskKey}`);
      if (bannerEl) {
        bannerEl.style.display = 'flex';
        bannerEl.className = 'cluster-banner active';
        bannerEl.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 20px;">🔁</span>
            <div>
              <div style="font-weight: 700; color: #ffd700; font-size: 13px;">
                Repetitive Defect Cluster: ${relatedFails.length} recurring cases highlighted for ${machineNo} (${deskKey})
              </div>
              <div class="cluster-banner-subtext" style="font-size: 11px;">
                All repetitive incidents sharing this failure pattern or component are highlighted below
              </div>
            </div>
          </div>
          <button class="btn btn-dim" onclick="window.TM_APP.clearClusterHighlight('${deskKey}')" style="padding: 4px 10px; font-size: 11px; margin-left: auto;">
            ✕ Clear Highlights
          </button>
        `;
      }

      if (primaryRowEl) {
        primaryRowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast(`Highlighted complete list of ${relatedFails.length} repetitive failures on ${machineNo} (${deskKey})`);
      } else {
        showToast(`Selected ${machineNo} ${deskKey} failure desk (${relatedFails.length} cluster cases)`);
      }
    }, 180);
  }

  // Clear repetitive cluster highlights
  function clearClusterHighlight(deskKey) {
    document.querySelectorAll('.highlight-pulse-row, .highlight-cluster-row').forEach(el => {
      el.classList.remove('highlight-pulse-row', 'highlight-cluster-row');
    });
    if (deskKey) {
      const b = document.getElementById(`clusterBanner-${deskKey}`);
      if (b) b.style.display = 'none';
    } else {
      document.querySelectorAll('.cluster-banner').forEach(b => b.style.display = 'none');
    }
  }

  // Indian Railways Current Financial Year (FY 2026-27: April 1st 2026 to March 31st 2027)
  const FY_2026_START = new Date(2026, 3, 1, 0, 0, 0).getTime(); // 01.04.2026 00:00:00
  const FY_2026_END = new Date(2027, 2, 31, 23, 59, 59).getTime();   // 31.03.2027 23:59:59

  // Helper: Determine if failure falls strictly in Current Financial Year (FY 2026-27)
  function isFailureInCurrentFY(f) {
    if (!f) return false;
    return isFailureInFY(f, 'FY_2026_27');
  }

  // Timestamp extractor for precise chronological sorting & Financial Year filtering
  function getFailureTimestamp(f) {
    if (!f) return 0;
    let dVal = f.dateOfFailure || f.breakdownTime || f.date || '';
    let natVal = f.natureOfFailure || '';

    // Auto-detect and handle shifted column where date was put in natureOfFailure
    if (typeof natVal === 'string' && (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(natVal.trim()) || isOvernightDate(natVal))) {
      const dStr = String(dVal).trim();
      if (!/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(dStr) && !/^\d{4}-\d{2}-\d{2}/.test(dStr) && !isOvernightDate(dStr)) {
        dVal = natVal;
      }
    }

    if (typeof dVal === 'number') {
      if (dVal > 30000 && dVal < 60000) {
        return (dVal - 25569) * 86400 * 1000;
      }
      return dVal;
    }
    const str = String(dVal).trim().replace(/[`'"]/g, '');
    if (!str) return 0;

    // Handle overnight block date format (e.g. 16/17-11-2025, 04/05-06-2026, 4/5-6-2026)
    // Anchored to the start date night (d1)
    const ov = parseOvernightDate(str);
    if (ov) {
      let sYear = ov.yyyy;
      let sMonth = ov.mm - 1;
      if (ov.d1 > ov.d2) {
        sMonth = ov.mm - 2;
        if (sMonth < 0) {
          sMonth = 12;
          sYear -= 1;
        }
      }
      const dt = new Date(sYear, sMonth, ov.d1, 0, 0, 0);
      if (!isNaN(dt.getTime())) return dt.getTime();
    }

    // Handle 5-digit Excel serial numbers
    if (/^\d{5}$/.test(str)) {
      return (parseInt(str, 10) - 25569) * 86400 * 1000;
    }

    // Standard ISO format (YYYY-MM-DD)
    if (str.includes('-') && str.split('-')[0].length === 4) {
      const parsed = Date.parse(str);
      if (!isNaN(parsed)) return parsed;
    }

    // Parse DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const parts = str.split(/[-/.]/);
    if (parts.length === 3) {
      let day = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      if (day > 1000) {
        year = day;
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      }
      const dt = new Date(year, month, day);
      if (!isNaN(dt.getTime())) return dt.getTime();
    }

    const parsedFallback = Date.parse(str);
    if (!isNaN(parsedFallback)) return parsedFallback;
    return 0;
  }

  // Helper: Get exact start and end timestamps covering the entire duration/block of a failure
  function getFailureDateRange(f) {
    if (!f) return { startTs: 0, endTs: 0 };
    let dVal = f.dateOfFailure || f.breakdownTime || f.date || '';
    const str = String(dVal).trim().replace(/[`'"]/g, '');
    const ov = parseOvernightDate(str);
    if (ov) {
      let sYear = ov.yyyy;
      let sMonth = ov.mm - 1;
      if (ov.d1 > ov.d2) {
        sMonth = ov.mm - 2;
        if (sMonth < 0) {
          sMonth = 11;
          sYear -= 1;
        }
      }
      const startDt = new Date(sYear, sMonth, ov.d1, 0, 0, 0);
      const endDt = new Date(ov.yyyy, ov.mm - 1, ov.d2, 23, 59, 59);
      const startTs = !isNaN(startDt.getTime()) ? startDt.getTime() : 0;
      const endTs = !isNaN(endDt.getTime()) ? endDt.getTime() : startTs;
      return { startTs, endTs };
    }

    const ts = getFailureTimestamp(f);
    if (!ts) return { startTs: 0, endTs: 0 };
    const dt = new Date(ts);
    const startDt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0);
    const endDt = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 23, 59, 59);
    return {
      startTs: startDt.getTime(),
      endTs: endDt.getTime()
    };
  }

  // Get All Machine Failures Across Entire Application in Strict Chronological Order
  function getAllMachineIncidentsChronological() {
    // 1. Start with ALL failures available in the app across all machines and categories
    let list = AppState.failures.slice();

    // 2. Financial Year Period filter (ALL, FY_2026_27, FY_2025_26, FY_2024_25, FY_2023_24, FY_2022_23)
    if (AppState.historyPeriodFilter && AppState.historyPeriodFilter !== 'ALL') {
      const p = (AppState.historyPeriodFilter === 'FY') ? 'FY_2026_27' : AppState.historyPeriodFilter;
      list = list.filter(f => isFailureInFY(f, p));
    }

    // 3. Machine Category Filter (Category wise)
    if (AppState.historyCategoryFilter && AppState.historyCategoryFilter !== 'ALL') {
      const cat = AppState.historyCategoryFilter;
      list = list.filter(f => {
        if (cat === 'RBMV' || cat === 'RMBV') {
          return f.category === 'RBMV' || f.category === 'RMBV';
        }
        if (cat === 'SBCM/FRM' || cat === 'SBCM' || cat === 'FRM') {
          return f.category === 'SBCM' || f.category === 'FRM' || f.category === 'SBCM/FRM';
        }
        if (cat === 'SRGM/RGM' || cat === 'SRGM / RGM' || cat === 'SRGM' || cat === 'RGM') {
          return f.category === 'SRGM' || f.category === 'RGM' || f.category === 'SRGM/RGM' || f.category === 'SRGM / RGM';
        }
        return f.category === cat;
      });
    }

    // 4. Machine Number Filter (Machine wise)
    if (AppState.historyMachineFilter && AppState.historyMachineFilter !== 'ALL') {
      const mId = AppState.historyMachineFilter.toUpperCase().trim();
      list = list.filter(f => (f.machineNo || '').toUpperCase().trim() === mId);
    }

    // 5. Particular Date Range Search (From Date & To Date)
    if (AppState.historyStartDate) {
      const sParts = AppState.historyStartDate.split('-'); // YYYY-MM-DD
      if (sParts.length === 3) {
        const sTs = new Date(parseInt(sParts[0], 10), parseInt(sParts[1], 10) - 1, parseInt(sParts[2], 10), 0, 0, 0).getTime();
        list = list.filter(f => {
          const rng = getFailureDateRange(f);
          return (rng.endTs || rng.startTs) >= sTs;
        });
      }
    }
    if (AppState.historyEndDate) {
      const eParts = AppState.historyEndDate.split('-'); // YYYY-MM-DD
      if (eParts.length === 3) {
        const eTs = new Date(parseInt(eParts[0], 10), parseInt(eParts[1], 10) - 1, parseInt(eParts[2], 10), 23, 59, 59).getTime();
        list = list.filter(f => {
          const rng = getFailureDateRange(f);
          return (rng.startTs || rng.endTs) <= eTs;
        });
      }
    }

    // 6. Division filter for history table (defaults to ALL)
    if (AppState.historyDivisionFilter && AppState.historyDivisionFilter !== 'ALL') {
      list = list.filter(f => (f.division || '').toUpperCase().includes(AppState.historyDivisionFilter));
    }

    // 7. Operational Block filter (ALL, IN_BLOCK, NON_BLOCK, OVERNIGHT)
    if (AppState.historyBlockFilter && AppState.historyBlockFilter !== 'ALL') {
      if (AppState.historyBlockFilter === 'IN_BLOCK') {
        list = list.filter(f => {
          const b = String(f.whetherInBlock || '').toUpperCase();
          return b === 'YES' || b.includes('BLOCK') || b === 'Y';
        });
      } else if (AppState.historyBlockFilter === 'NON_BLOCK') {
        list = list.filter(f => {
          const b = String(f.whetherInBlock || '').toUpperCase();
          return b !== 'YES' && !b.includes('BLOCK') && b !== 'Y';
        });
      } else if (AppState.historyBlockFilter === 'OVERNIGHT') {
        list = list.filter(f => isOvernightDate(f.dateOfFailure || f.breakdownTime || f.date));
      }
    }

    // 4. Status filter (ALL, UNDER REPAIR, FIT)
    if (AppState.statusFilter && AppState.statusFilter !== 'ALL') {
      list = list.filter(f => f.status === AppState.statusFilter);
    }

    // 5. Subsystem filter
    if (AppState.subsystemFilter && AppState.subsystemFilter !== 'ALL') {
      list = list.filter(f => f.subsystem === AppState.subsystemFilter);
    }

    // 6. Search query
    if (AppState.searchQuery) {
      const q = AppState.searchQuery.toLowerCase();
      list = list.filter(f => {
        const str = `${f.machineNo} ${f.category} ${f.division} ${f.subsystem} ${f.component} ${f.natureOfFailure} ${f.description} ${f.rootCause} ${f.stepsTaken} ${f.actionTaken} ${f.correctiveMeasures} ${f.section}`.toLowerCase();
        return str.includes(q);
      });
    }

    // 7. Strict Chronological Ordering
    list.sort((a, b) => {
      const tA = getFailureTimestamp(a);
      const tB = getFailureTimestamp(b);
      if (tA === 0 && tB === 0) return 0;
      if (tA === 0) return 1;
      if (tB === 0) return -1;
      if (AppState.chronologicalSortOrder === 'ASC') {
        return tA - tB;
      }
      return tB - tA; // default DESC (latest first)
    });

    return list;
  }

  // Render Failure History Table (Chronological Master Timeline)
  function renderTable(list) {
    const tbody = document.getElementById('failureTableBody');
    const emptyState = document.getElementById('tableEmptyState');
    const pagBar = document.getElementById('historyPaginationBar');
    const visEl = document.getElementById('historyVisibleCount');
    const totEl = document.getElementById('historyTotalCount');
    const btnLoadMore = document.getElementById('btnLoadMoreIncidents');
    const btnShowAll = document.getElementById('btnShowAllIncidents');
    const badgeAll = document.getElementById('badgeAllFailures');
    const badgeSummary = document.getElementById('allIncidentsSummaryBadge');

    if (badgeAll) badgeAll.textContent = AppState.failures.length;
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!list || list.length === 0) {
      if (emptyState) {
        emptyState.style.display = 'block';
        emptyState.innerHTML = `
          <div style="font-size: 32px; margin-bottom: 10px;">🔍</div>
          <div class="empty-state-title" style="font-size: 15px; font-weight: 600;">No failure records found matching current timeline filters</div>
          <div class="empty-state-sub" style="font-size: 12px; margin-top: 4px;">Try clearing your search query or setting status / block filters to 'All'.</div>
        `;
      }
      if (pagBar) pagBar.style.display = 'none';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (pagBar) pagBar.style.display = 'flex';

    const totalCount = list.length;
    const limit = AppState.historyLimit || 100;
    const itemsToRender = list.slice(0, limit);

    if (visEl) visEl.textContent = itemsToRender.length;
    if (totEl) totEl.textContent = totalCount;
    if (badgeSummary) {
      badgeSummary.textContent = `Chronological Order · ${totalCount} Incidents (${AppState.chronologicalSortOrder === 'ASC' ? 'Oldest to Newest ⬆️' : 'Newest to Oldest ⬇️'})`;
    }
    const sortSelect = document.getElementById('historySortOrderSelect');
    if (sortSelect) {
      sortSelect.value = AppState.chronologicalSortOrder;
    }
    const btnSort = document.getElementById('btnToggleSort');
    if (btnSort) {
      btnSort.textContent = AppState.chronologicalSortOrder === 'ASC' 
        ? '📅 Sort: Oldest First ⬆️' 
        : '📅 Sort: Latest First ⬇️';
    }

    if (btnLoadMore) {
      if (itemsToRender.length < totalCount) {
        btnLoadMore.style.display = 'inline-flex';
        btnLoadMore.textContent = `⬇️ Load Next 100 Incidents (${totalCount - itemsToRender.length} remaining)`;
      } else {
        btnLoadMore.style.display = 'none';
      }
    }
    if (btnShowAll) {
      btnShowAll.style.display = itemsToRender.length < totalCount ? 'inline-flex' : 'none';
    }

    itemsToRender.forEach((f, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'table-row-main';
      tr.id = `allIncRow-${f.id}`;

      const isRep = f.isRepetitive;
      const isUnderRepair = f.status === 'UNDER REPAIR';
      const subClass = getSubsystemClass(f.subsystem);

      const inBlockStr = String(f.whetherInBlock || '').toUpperCase().trim();
      const isBlockYes = inBlockStr === 'YES' || inBlockStr.includes('BLOCK') || inBlockStr === 'Y';

      tr.innerHTML = `
        <td><strong>#${idx + 1}</strong></td>
        <td>
          <div class="table-machine-text" style="font-weight: 700; font-size: 13.5px;">${f.machineNo}</div>
          <div style="display: flex; gap: 5px; align-items: center; margin-top: 3px;">
            <span style="font-size: 11px; color: var(--gold-400); font-weight: 600;">${f.category}</span>
            <span class="div-badge ${getDivisionClass(f.division)}">${f.division || 'SBC'}</span>
          </div>
        </td>
        <td>
          <div class="table-date-text" style="font-size: 12.5px; font-weight: 700;">📅 ${escapeHtml(formatDateDisplay(f.dateOfFailure || f.breakdownTime))}</div>
          <div class="table-sub-text" style="font-size: 11px; margin-top: 2px;">${escapeHtml(f.section || 'Block Section')}</div>
        </td>
        <td>
          <span class="table-subsystem-pill ${subClass}">
            ${f.subsystem || 'Mechanical'}
          </span>
          <div class="table-comp-text" style="font-size: 11px; margin-top: 3px;">${escapeHtml(f.component || '')}</div>
        </td>
        <td style="max-width: 280px;">
          <div class="table-desc-text" style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(f.natureOfFailure || f.description || '')}">
            ${escapeHtml(f.natureOfFailure || f.description || '')}
          </div>
          ${isRep ? `<span style="display:inline-block; font-size:10px; color:#ffab91; background:rgba(255,112,67,0.2); padding:1px 6px; border-radius:3px; margin-top:3px; border:1px solid rgba(255,112,67,0.4); cursor:pointer;" onclick="window.TM_APP.highlightFailure('${f.id}', '${f.subsystem}', '${f.machineNo}')" title="Click to navigate & highlight this recurring defect in subsystem desk">🔁 ${f.repeatCount || 2}x Recurring Defect</span>` : ''}
        </td>
        <td>
          ${isBlockYes
            ? `<span class="badge" style="background:rgba(239,68,68,0.22); color:#fca5a5; border:1px solid rgba(239,68,68,0.5); font-size:10.5px; font-weight:700;">⚠️ IN BLOCK</span>`
            : `<span class="badge" style="background:rgba(59,130,246,0.18); color:#93c5fd; border:1px solid rgba(59,130,246,0.35); font-size:10.5px; font-weight:600;">NOT IN BLOCK</span>`
          }
        </td>
        <td>
          <span style="font-family: var(--font-mono); font-weight: 700; color: ${f.downHours > 6 ? '#ff8a65' : 'var(--pista-300)'};">
            ${f.downHours ? f.downHours + ' hrs' : (f.totalDownDays !== undefined && f.totalDownDays !== null ? f.totalDownDays + ' days' : '0 hrs')}
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
            🔍 Details
          </button>
          ${(isUnderRepair && isUserAdmin()) ? `
            <button class="btn btn-secondary-pista admin-only" style="padding: 5px 10px; font-size: 11.5px; margin-left: 4px;" onclick="window.TM_APP.openMarkFitModal('${f.id}')">
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
        <td colspan="9">
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
                  Breakdown: ${formatDateDisplay(f.breakdownTime)}<br>
                  Site Arrival / Troubleshooting: ${formatDateDisplay(f.arrivalTroubleshootTime)}<br>
                  Spares Arranged: ${formatDateDisplay(f.sparesArrangedTime)}<br>
                  Machine Fit Certified: ${formatDateDisplay(f.fitTime)}<br>
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

  // Interactive controls for history view
  function toggleChronologicalSort() {
    AppState.chronologicalSortOrder = AppState.chronologicalSortOrder === 'ASC' ? 'DESC' : 'ASC';
    const select = document.getElementById('historySortOrderSelect');
    if (select) select.value = AppState.chronologicalSortOrder;
    const btn = document.getElementById('btnToggleSort');
    if (btn) {
      btn.textContent = AppState.chronologicalSortOrder === 'ASC' 
        ? '📅 Sort: Oldest First ⬆️' 
        : '📅 Sort: Latest First ⬇️';
    }
    renderTable(getAllMachineIncidentsChronological());
    showToast(`Chronological Order: ${AppState.chronologicalSortOrder === 'ASC' ? 'Oldest to Newest' : 'Newest to Oldest'}`);
  }

  function onSortSelectChange(val) {
    AppState.chronologicalSortOrder = (val === 'ASC') ? 'ASC' : 'DESC';
    const select = document.getElementById('historySortOrderSelect');
    if (select) select.value = AppState.chronologicalSortOrder;
    const btn = document.getElementById('btnToggleSort');
    if (btn) {
      btn.textContent = AppState.chronologicalSortOrder === 'ASC' 
        ? '📅 Sort: Oldest First ⬆️' 
        : '📅 Sort: Latest First ⬇️';
    }
    renderTable(getAllMachineIncidentsChronological());
    showToast(`Chronological Order: ${AppState.chronologicalSortOrder === 'ASC' ? 'Oldest to Newest' : 'Newest to Oldest'}`);
  }

  // Update history machine dropdown options based on selected category
  function updateHistoryMachineDropdown(cat) {
    const machSelect = document.getElementById('historyMachineFilterSelect');
    if (!machSelect) return;
    const prevVal = machSelect.value;
    machSelect.innerHTML = '';

    const allOpt = document.createElement('option');
    allOpt.value = 'ALL';
    allOpt.textContent = '🚜 All Individual Machines';
    machSelect.appendChild(allOpt);

    const machineMap = new Map();
    // Collect from FLEET_DIRECTORY
    if (typeof FLEET_DIRECTORY !== 'undefined') {
      Object.keys(FLEET_DIRECTORY).forEach(c => {
        const isCatMatch = (cat === 'ALL') || (c === cat) ||
                           (cat === 'RBMV' && c === 'RMBV') ||
                           (cat === 'SBCM/FRM' && (c === 'SBCM' || c === 'FRM')) ||
                           ((cat === 'SRGM/RGM' || cat === 'SRGM / RGM') && (c === 'SRGM' || c === 'RGM' || c === 'SRGM/RGM' || c === 'SRGM / RGM'));
        if (isCatMatch) {
          (FLEET_DIRECTORY[c] || []).forEach(m => {
            const mId = m.id || m.machineNo;
            if (mId && !machineMap.has(mId.toUpperCase())) {
              machineMap.set(mId.toUpperCase(), { id: mId, model: m.model || c });
            }
          });
        }
      });
    }
    // Also include from failures
    AppState.failures.forEach(f => {
      const fCat = f.category || '';
      const isCatMatch = (cat === 'ALL') || (fCat === cat) ||
                         (cat === 'RBMV' && (fCat === 'RBMV' || fCat === 'RMBV')) ||
                         (cat === 'SBCM/FRM' && (fCat === 'SBCM' || fCat === 'FRM')) ||
                         ((cat === 'SRGM/RGM' || cat === 'SRGM / RGM') && (fCat === 'SRGM' || fCat === 'RGM' || fCat === 'SRGM/RGM' || fCat === 'SRGM / RGM'));
      if (isCatMatch && f.machineNo) {
        const up = f.machineNo.toUpperCase();
        if (!machineMap.has(up)) {
          machineMap.set(up, { id: f.machineNo, model: f.category || '' });
        }
      }
    });

    const sortedMachines = Array.from(machineMap.values()).sort((a, b) => a.id.localeCompare(b.id));
    allOpt.textContent = `🚜 All Individual Machines (${sortedMachines.length})`;

    sortedMachines.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.id} (${m.model})`;
      machSelect.appendChild(opt);
    });

    if (prevVal && machineMap.has(prevVal.toUpperCase())) {
      machSelect.value = prevVal;
      AppState.historyMachineFilter = prevVal;
    } else {
      machSelect.value = 'ALL';
      AppState.historyMachineFilter = 'ALL';
    }
  }

  function onHistoryCategoryFilterChange(cat) {
    AppState.historyCategoryFilter = cat || 'ALL';
    updateHistoryMachineDropdown(AppState.historyCategoryFilter);
    AppState.historyLimit = 100;
    renderTable(getAllMachineIncidentsChronological());
  }

  function onHistoryDateRangeChange() {
    const startEl = document.getElementById('historyStartDate');
    const endEl = document.getElementById('historyEndDate');
    AppState.historyStartDate = startEl ? startEl.value.trim() : '';
    AppState.historyEndDate = endEl ? endEl.value.trim() : '';
    AppState.historyLimit = 100;
    renderTable(getAllMachineIncidentsChronological());
  }

  function clearHistoryDateRange() {
    const startEl = document.getElementById('historyStartDate');
    const endEl = document.getElementById('historyEndDate');
    if (startEl) startEl.value = '';
    if (endEl) endEl.value = '';
    AppState.historyStartDate = '';
    AppState.historyEndDate = '';
    AppState.historyLimit = 100;
    renderTable(getAllMachineIncidentsChronological());
    showToast('Date range filter cleared');
  }

  function onHistoryFilterChange() {
    const periodSelect = document.getElementById('historyPeriodFilterSelect');
    const divSelect = document.getElementById('historyDivisionFilterSelect');
    const blockSelect = document.getElementById('historyBlockFilterSelect');
    const statSelect = document.getElementById('statusFilterSelect');
    const subSelect = document.getElementById('subsystemFilterSelect');
    const machSelect = document.getElementById('historyMachineFilterSelect');

    if (periodSelect) AppState.historyPeriodFilter = periodSelect.value;
    if (divSelect) AppState.historyDivisionFilter = divSelect.value;
    if (blockSelect) AppState.historyBlockFilter = blockSelect.value;
    if (statSelect) AppState.statusFilter = statSelect.value;
    if (subSelect) AppState.subsystemFilter = subSelect.value;
    if (machSelect) AppState.historyMachineFilter = machSelect.value;

    AppState.historyLimit = 100;
    renderTable(getAllMachineIncidentsChronological());
  }

  function showMoreIncidents() {
    AppState.historyLimit = (AppState.historyLimit || 100) + 100;
    renderTable(getAllMachineIncidentsChronological());
  }

  function showAllIncidents() {
    AppState.historyLimit = 99999;
    renderTable(getAllMachineIncidentsChronological());
    showToast('Showing all incidents in chronological order.');
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
  function getChartThemeColors() {
    const isLight = (getCurrentTheme() === 'light');
    return {
      isLight,
      textColor: isLight ? '#111827' : '#e5ece6',
      mutedTextColor: isLight ? '#374151' : '#a4bba9',
      axisColor: isLight ? '#1b5e20' : '#93c572',
      gridColor: isLight ? 'rgba(0, 0, 0, 0.22)' : 'rgba(255, 255, 255, 0.08)',
      angleLineColor: isLight ? 'rgba(0, 0, 0, 0.28)' : 'rgba(255, 255, 255, 0.12)',
      radarBg: isLight ? 'rgba(46, 125, 50, 0.42)' : 'rgba(147, 197, 114, 0.28)',
      radarBorder: isLight ? '#1b5e20' : '#93c572',
      radarPointBg: isLight ? '#8c6307' : '#ffd700',
      doughnutBorder: isLight ? '#ffffff' : '#121c16',
      tooltipBg: isLight ? 'rgba(255, 255, 255, 0.98)' : 'rgba(12, 20, 16, 0.95)',
      tooltipTitle: isLight ? '#946200' : '#ffd700',
      tooltipBody: isLight ? '#111827' : '#e5ece6',
      tooltipBorder: isLight ? '#2e7d32' : '#93c572'
    };
  }

  function renderCharts(list) {
    if (typeof Chart === 'undefined') return;
    const safeList = list || (typeof getFilteredFailures === 'function' ? getFilteredFailures() : AppState.failures) || [];

    renderCategoryComparisonChart(safeList);
    renderDivisionDistributionChart(safeList);
    renderSubsystemChart(safeList);
    renderBlockVsNonBlockChart(safeList);

    const activeM = (AppState.selectedMachine && AppState.selectedMachine !== 'ALL')
      ? AppState.selectedMachine
      : getActiveMachineId();
    renderMachineRadarChart(activeM);
    renderMachinePercentDonutChart(activeM);
  }

  // Chart 1: Category / Fleet Breakdown Comparison (Total Incidents)
  function renderCategoryComparisonChart(list) {
    const ctx = document.getElementById('chartCategoryComparison');
    if (!ctx) return;

    if (AppState.charts.category) {
      AppState.charts.category.destroy();
    }

    const themeColors = getChartThemeColors();

    // Tally by category
    const catLabels = MACHINE_CATEGORIES.map(c => (c === 'SRGM/RGM' ? 'SRGM / RGM' : c));
    const counts = MACHINE_CATEGORIES.map(c => {
      if (c === 'RBMV') return AppState.failures.filter(f => f.category === 'RBMV' || f.category === 'RMBV').length;
      if (c === 'SRGM/RGM') return AppState.failures.filter(f => f.category === 'SRGM/RGM' || f.category === 'SRGM / RGM' || f.category === 'SRGM' || f.category === 'RGM').length;
      return AppState.failures.filter(f => f.category === c).length;
    });

    AppState.charts.category = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: catLabels,
        datasets: [
          {
            label: 'Total Incidents',
            data: counts,
            backgroundColor: themeColors.isLight ? 'rgba(46, 125, 50, 0.85)' : 'rgba(147, 197, 114, 0.75)',
            borderColor: themeColors.isLight ? '#1b5e20' : '#93c572',
            borderWidth: 1.5,
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: themeColors.textColor, font: { size: 11, family: 'Segoe UI', weight: '600' } }
          },
          tooltip: {
            backgroundColor: themeColors.tooltipBg,
            titleColor: themeColors.tooltipTitle,
            bodyColor: themeColors.tooltipBody,
            borderColor: themeColors.tooltipBorder,
            borderWidth: 1
          }
        },
        scales: {
          x: {
            ticks: { color: themeColors.textColor, font: { size: 10, weight: '600' } },
            grid: { color: themeColors.gridColor }
          },
          y: {
            ticks: { color: themeColors.axisColor, stepSize: 1, font: { weight: '600' } },
            title: { display: true, text: 'Total Incidents', color: themeColors.axisColor, font: { weight: 'bold' } },
            grid: { color: themeColors.gridColor }
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

    const themeColors = getChartThemeColors();

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
          borderColor: themeColors.doughnutBorder,
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
              color: themeColors.textColor,
              font: { size: 11, family: 'Segoe UI', weight: '600' },
              boxWidth: 12
            }
          },
          tooltip: {
            backgroundColor: themeColors.tooltipBg,
            titleColor: themeColors.tooltipTitle,
            bodyColor: themeColors.tooltipBody,
            borderColor: themeColors.tooltipBorder,
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

    const themeColors = getChartThemeColors();

    const subsystemCounts = {};
    list.forEach(f => {
      const sub = f.subsystem || 'Mechanical';
      subsystemCounts[sub] = (subsystemCounts[sub] || 0) + 1;
    });

    const labels = Object.keys(subsystemCounts);
    const data = Object.values(subsystemCounts);

    const colors = [
      '#2e7d32', // Pista
      '#d4af37', // Gold
      '#2563eb', // Blue
      '#dc2626', // Red
      '#9333ea', // Purple
      '#0d9488', // Teal
      '#ea580c', // Orange
      '#475569'  // Slate
    ];

    AppState.charts.subsystem = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: themeColors.doughnutBorder,
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
            labels: { color: themeColors.textColor, font: { size: 11, weight: '600' }, boxWidth: 12 }
          },
          tooltip: {
            backgroundColor: themeColors.tooltipBg,
            titleColor: themeColors.tooltipTitle,
            bodyColor: themeColors.tooltipBody,
            borderColor: themeColors.tooltipBorder,
            borderWidth: 1
          }
        },
        cutout: '62%'
      }
    });
  }

  // Helper: Subsystem percentage contribution calculation for a machine
  function getMachineSubsystemStats(mId) {
    const isCrane = isCraneMachine(mId) || isCraneMachine(getMachineInfo(mId)?.category);
    const subLabels = ['Engine', isCrane ? 'Crane' : 'Tamping Unit', 'Mechanical', 'Hydraulic', 'Pneumatic', 'Electrical'];
    
    let fails = (mId && mId !== 'ALL') 
      ? AppState.failures.filter(f => f.machineNo === mId)
      : AppState.failures;

    const counts = {
      'Engine': 0,
      'Tamping/Crane': 0,
      'Mechanical': 0,
      'Hydraulic': 0,
      'Pneumatic': 0,
      'Electrical': 0
    };

    fails.forEach(f => {
      const s = (f.subsystem || '').toLowerCase();
      const sheet = (f.sheet || '').toLowerCase();
      if (s.includes('engine') || s.includes('diesel') || s.includes('fuel')) {
        counts['Engine']++;
      } else if (s.includes('tamp') || s.includes('crane') || s.includes('cutter') || sheet.includes('crane')) {
        counts['Tamping/Crane']++;
      } else if (s.includes('mech') || sheet.includes('mech')) {
        counts['Mechanical']++;
      } else if (s.includes('hyd')) {
        counts['Hydraulic']++;
      } else if (s.includes('pneu') || s.includes('air') || s.includes('brake')) {
        counts['Pneumatic']++;
      } else if (s.includes('elec')) {
        counts['Electrical']++;
      } else {
        counts['Mechanical']++;
      }
    });

    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    const percentages = subLabels.map((lbl, idx) => {
      const key = idx === 1 ? 'Tamping/Crane' : lbl;
      const count = counts[key] || 0;
      return total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0;
    });

    const countsList = subLabels.map((lbl, idx) => {
      const key = idx === 1 ? 'Tamping/Crane' : lbl;
      return counts[key] || 0;
    });

    return {
      subLabels,
      percentages,
      countsList,
      total,
      isCrane
    };
  }

  // Machine-Wise Radar Graph: Multi-axis percentage contribution
  function renderMachineRadarChart(mId) {
    const ctx = document.getElementById('chartMachineRadar');
    if (!ctx) return;

    if (AppState.charts.machineRadar) {
      AppState.charts.machineRadar.destroy();
    }

    const themeColors = getChartThemeColors();
    const stats = getMachineSubsystemStats(mId);

    // Update title
    const titleEl = document.getElementById('titleMachineRadar');
    if (titleEl) {
      titleEl.textContent = `${mId || 'Fleet'} Subsystem Failure Contribution Radar`;
    }

    AppState.charts.machineRadar = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: stats.subLabels,
        datasets: [{
          label: `${mId || 'Selected Machine'} (% Contribution)`,
          data: stats.percentages,
          backgroundColor: themeColors.radarBg,
          borderColor: themeColors.radarBorder,
          borderWidth: 2.5,
          pointBackgroundColor: themeColors.radarPointBg,
          pointBorderColor: themeColors.doughnutBorder,
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: themeColors.radarPointBg,
          pointRadius: 5,
          pointHoverRadius: 7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: themeColors.textColor, font: { size: 11, family: 'Segoe UI', weight: '600' } }
          },
          tooltip: {
            backgroundColor: themeColors.tooltipBg,
            titleColor: themeColors.tooltipTitle,
            bodyColor: themeColors.tooltipBody,
            borderColor: themeColors.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: function (context) {
                const idx = context.dataIndex;
                const pct = stats.percentages[idx];
                const cnt = stats.countsList[idx];
                return ` ${context.label}: ${pct}% (${cnt} cases)`;
              }
            }
          }
        },
        scales: {
          r: {
            angleLines: { color: themeColors.angleLineColor, lineWidth: 2 },
            grid: { color: themeColors.gridColor, lineWidth: 1.8 },
            pointLabels: {
              color: themeColors.textColor,
              font: { size: 12, weight: '700', family: 'Segoe UI' }
            },
            ticks: {
              color: themeColors.textColor,
              backdropColor: 'transparent',
              stepSize: 20,
              font: { weight: '700' }
            },
            suggestedMin: 0,
            suggestedMax: Math.max(...stats.percentages, 50) + 10
          }
        }
      }
    });
  }

  // Machine-Wise Percentage Contribution Breakdown (Donut Chart)
  function renderMachinePercentDonutChart(mId) {
    const ctx = document.getElementById('chartMachinePercentDonut');
    if (!ctx) return;

    if (AppState.charts.machinePercentDonut) {
      AppState.charts.machinePercentDonut.destroy();
    }

    const themeColors = getChartThemeColors();
    const stats = getMachineSubsystemStats(mId);

    // Update title
    const titleEl = document.getElementById('titleMachinePercent');
    if (titleEl) {
      titleEl.textContent = `${mId || 'Selected Machine'} Category Failure Contribution (%)`;
    }

    const colors = [
      '#ea580c', // Engine (Orange)
      '#d97706', // Tamping/Crane (Gold/Amber)
      '#16a34a', // Mechanical (Green)
      '#2563eb', // Hydraulic (Blue)
      '#0891b2', // Pneumatic (Cyan)
      '#9333ea'  // Electrical (Purple)
    ];

    AppState.charts.machinePercentDonut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: stats.subLabels.map((lbl, i) => `${lbl} (${stats.percentages[i]}%)`),
        datasets: [{
          data: stats.percentages,
          backgroundColor: colors,
          borderColor: themeColors.doughnutBorder,
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: themeColors.textColor,
              font: { size: 11, family: 'Segoe UI', weight: '600' },
              boxWidth: 12
            }
          },
          tooltip: {
            backgroundColor: themeColors.tooltipBg,
            titleColor: themeColors.tooltipTitle,
            bodyColor: themeColors.tooltipBody,
            borderColor: themeColors.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: function (context) {
                const idx = context.dataIndex;
                const pct = stats.percentages[idx];
                const cnt = stats.countsList[idx];
                return ` ${stats.subLabels[idx]}: ${pct}% (${cnt} of ${stats.total} incidents)`;
              }
            }
          }
        },
        cutout: '58%'
      }
    });

    // Update label & dropdown
    const labelEl = document.getElementById('radarMachineLabel');
    if (labelEl) labelEl.textContent = mId || 'Entire Fleet';

    updateRadarMachineSelect(mId);
  }

  function updateRadarMachineSelect(selectedId) {
    const selectEl = document.getElementById('radarMachineSelect');
    if (!selectEl) return;
    
    // Check if options already populated
    if (selectEl.options.length === 0) {
      const allMachines = [];
      Object.keys(FLEET_DIRECTORY).forEach(cat => {
        FLEET_DIRECTORY[cat].forEach(m => {
          if (!allMachines.some(x => x.id === m.id)) {
            allMachines.push(m);
          }
        });
      });

      allMachines.sort((a, b) => a.id.localeCompare(b.id));

      allMachines.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = `${m.id} (${m.division} • ${m.category || (m.model ? m.model.substring(0, 18) : '')})`;
        selectEl.appendChild(opt);
      });
    }

    if (selectedId) {
      selectEl.value = selectedId;
    }
  }

  function onRadarMachineChange(mId) {
    if (!mId) return;
    renderMachineRadarChart(mId);
    renderMachinePercentDonutChart(mId);
  }

  // Chart 4: Fleet Operational Surveillance: In Block vs Non-Block & Repetitive Defect Breakdown
  function renderBlockVsNonBlockChart(list) {
    const ctx = document.getElementById('chartBlockVsNonBlock');
    if (!ctx) return;

    if (AppState.charts.blockVsNonBlock) {
      AppState.charts.blockVsNonBlock.destroy();
    }

    const themeColors = getChartThemeColors();

    const isAllScope = (AppState.kpiScope === 'ALL');
    const fyKey = isAllScope ? null : (AppState.kpiScope === 'FY' ? 'FY_2026_27' : AppState.kpiScope);
    const targetPool = isAllScope
      ? AppState.failures
      : AppState.failures.filter(f => isFailureInFY(f, fyKey));

    const categoriesWithIncidents = MACHINE_CATEGORIES.filter(cat => {
      if (cat === 'SRGM/RGM') {
        return targetPool.some(f => f.category === 'SRGM/RGM' || f.category === 'SRGM / RGM' || f.category === 'SRGM' || f.category === 'RGM');
      }
      return targetPool.some(f => f.category === cat);
    });

    const inBlockData = [];
    const nonBlockData = [];
    const repetitiveData = [];

    categoriesWithIncidents.forEach(cat => {
      const catFailures = targetPool.filter(f => {
        if (cat === 'SRGM/RGM') {
          return f.category === 'SRGM/RGM' || f.category === 'SRGM / RGM' || f.category === 'SRGM' || f.category === 'RGM';
        }
        return f.category === cat;
      });
      let inBlock = 0;
      let nonBlock = 0;
      let rep = 0;

      catFailures.forEach(f => {
        const b = String(f.whetherInBlock || '').toUpperCase().trim();
        if (b === 'YES' || b.includes('BLOCK') || b === 'Y') {
          inBlock++;
        } else {
          nonBlock++;
        }
        if (f.isRepetitive) {
          rep++;
        }
      });

      inBlockData.push(inBlock);
      nonBlockData.push(nonBlock);
      repetitiveData.push(rep);
    });

    AppState.charts.blockVsNonBlock = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: categoriesWithIncidents.map(c => (c === 'SRGM/RGM' ? 'SRGM / RGM' : c)),
        datasets: [
          {
            label: 'In Traffic Block (⚠️ Operational Impact)',
            data: inBlockData,
            backgroundColor: 'rgba(239, 68, 68, 0.85)',
            borderColor: '#ef4444',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'Not In Block (Depot / Stabling / Transit)',
            data: nonBlockData,
            backgroundColor: 'rgba(59, 130, 246, 0.85)',
            borderColor: '#3b82f6',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: 'Repetitive Cases (🔁 Recurring Defects)',
            data: repetitiveData,
            backgroundColor: themeColors.isLight ? 'rgba(180, 130, 20, 0.85)' : 'rgba(212, 175, 55, 0.85)',
            borderColor: themeColors.isLight ? '#b38b18' : '#d4af37',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: themeColors.textColor,
              font: { size: 11, weight: '600' },
              boxWidth: 14
            }
          },
          tooltip: {
            backgroundColor: themeColors.tooltipBg,
            titleColor: themeColors.tooltipTitle,
            bodyColor: themeColors.tooltipBody,
            borderColor: themeColors.tooltipBorder,
            borderWidth: 1
          }
        },
        scales: {
          x: {
            stacked: false,
            ticks: { color: themeColors.textColor, font: { weight: '600', size: 10 } },
            grid: { color: themeColors.gridColor }
          },
          y: {
            stacked: false,
            ticks: { color: themeColors.textColor, stepSize: 10, font: { weight: '600' } },
            title: { display: true, text: 'Recorded Incidents', color: themeColors.textColor, font: { weight: 'bold' } },
            grid: { color: themeColors.gridColor }
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
      opt.textContent = (cat === 'SRGM/RGM') ? 'SRGM / RGM (Switch Rail Grinding / Rail Grinding)' : cat;
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
    if (!isUserAdmin()) {
      showToast('View-Only Access: Uploading requires Admin privileges.', true);
      return;
    }
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
    if (!isUserAdmin()) {
      showToast('View-Only Access: Uploading requires Admin privileges.', true);
      return;
    }
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

    // 1. Overnight Block Date check FIRST (e.g. 16/17-11-2025, 04/05-06-2026, 16-17/11/2025, 16/17/11/2025)
    // Preserves both day digits accurately without dropping day 1 or day 2
    const ov = parseOvernightDate(s);
    if (ov) {
      return ov.formatted;
    }

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
              const match = cellStr.match(/(?:UNI|PCTM|CSM|DTE|DUO|MPT|BCM|FRM|SBCM|BRM|SQRS|T28|T-28|DGS|UTV|SRGM|RGM|RBMV|RMBV|MDU)[\s\-_]*\d+/i);
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
        if (/(?:UNI|PCTM|CSM|DTE|DUO|MPT|BCM|FRM|SBCM|BRM|SQRS|T28|DGS|UTV|SRGM|RGM|RBMV|RMBV|MDU|\d)/i.test(baseName)) {
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
    if (!isUserAdmin()) {
      showToast('View-Only Access: Uploading requires Admin privileges.', true);
      return 0;
    }

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
    if (m.includes('SRGM') || m.includes('RGM')) return 'SRGM/RGM';
    if (m.includes('RBMV') || m.includes('RMBV')) return 'RBMV';
    if (m.includes('MDU')) return 'MDU';
    return AppState.selectedCategory !== 'ALL' ? AppState.selectedCategory : 'CSM';
  }

  function calculateDurationHours(start, end) {
    if (!start || !end) return 0;
    const startTs = typeof start === 'number' ? start : getFailureTimestamp({ dateOfFailure: start });
    const endTs = typeof end === 'number' ? end : getFailureTimestamp({ dateOfFailure: end });
    if (startTs > 0 && endTs > 0 && endTs >= startTs) {
      const diff = (endTs - startTs) / (1000 * 60 * 60);
      return parseFloat(diff.toFixed(2));
    }
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
    const targetMach = isCrane ? `${targetCat}-001` : (targetCat.includes('/') ? `${targetCat.split('/')[0]}-001` : `${targetCat}-901`);

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

  // Get Ordinal Suffix (1st, 2nd, 3rd, 4th, 5th, etc.)
  function getOrdinalSuffix(n) {
    const num = parseInt(n, 10) || 1;
    const j = num % 10, k = num % 100;
    if (j === 1 && k !== 11) return num + 'st';
    if (j === 2 && k !== 12) return num + 'nd';
    if (j === 3 && k !== 13) return num + 'rd';
    return num + 'th';
  }

  // Parse Date string or Excel serial to timestamp for strict chronological sorting
  function parseRecordTimestamp(rec) {
    if (!rec) return 0;
    if (rec.sortTimestamp) return rec.sortTimestamp;
    const s = (rec.isoDate || rec.displayDate || rec.rawDate || '').toString().trim();
    if (!s || /^(na|nil|not done|not done yet|_|-)$/i.test(s)) return 0;

    // Overnight block date: D1D1/D2D2-MM-YYYY
    const ov = parseOvernightDate(s);
    if (ov) {
      let sYear = ov.yyyy;
      let sMonth = ov.mm - 1;
      if (ov.d1 > ov.d2) {
        sMonth = ov.mm - 2;
        if (sMonth < 0) {
          sMonth = 11;
          sYear -= 1;
        }
      }
      return new Date(sYear, sMonth, ov.d1).getTime();
    }

    // DD[-/. ]MM[-/. ]YYYY
    const dmyMatch = s.match(/\b(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})\b/);
    if (dmyMatch) {
      return new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10)).getTime();
    }
    // YYYY-MM-DD
    const isoMatch = s.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
    if (isoMatch) {
      return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10)).getTime();
    }
    // Excel 5-digit serial
    if (/^\d{5}$/.test(s)) {
      const serial = parseInt(s, 10);
      return new Date((serial - 25569) * 86400 * 1000).getTime();
    }
    // 4-digit year fallback
    const yMatch = s.match(/\b(19\d{2}|20\d{2})\b/);
    if (yMatch) {
      return new Date(parseInt(yMatch[1], 10), 0, 1).getTime();
    }
    return 0;
  }

  // Convert various date representations to standard YYYY-MM-DD for HTML input[type=date]
  function toIsoDate(dStr) {
    if (!dStr) return '';
    const s = dStr.toString().trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const ov = parseOvernightDate(s);
    if (ov) return ov.startDateIso;
    const dmy = s.match(/\b(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})\b/);
    if (dmy) {
      const d = dmy[1].padStart(2, '0');
      const m = dmy[2].padStart(2, '0');
      const y = dmy[3];
      return `${y}-${m}-${d}`;
    }
    if (/^\d{5}$/.test(s)) {
      const serial = parseInt(s, 10);
      const dt = new Date((serial - 25569) * 86400 * 1000);
      if (!isNaN(dt.getTime())) return dt.toISOString().substring(0, 10);
    }
    return '';
  }

  // Synchronize and enforce chronological ordinals: (1st IOH), (2nd IOH), ... or (1st POH), (2nd POH), ...
  function syncHrmItemOrdinals(it) {
    if (!it || !it.title) return;
    const isIoh = /IOH/i.test(it.title);
    const isPoh = /POH/i.test(it.title);
    if (!isIoh && !isPoh) return;

    const kind = isIoh ? 'IOH' : 'POH';
    if (!Array.isArray(it.records)) it.records = [];

    // Filter valid overhaul records with parsed timestamps
    const validRecs = [];
    it.records.forEach((r, idx) => {
      const ts = parseRecordTimestamp(r);
      if (ts > 0) {
        r.sortTimestamp = ts;
        validRecs.push({ r, ts, origIdx: idx });
      }
    });

    // Sort valid records chronologically (earliest to latest)
    validRecs.sort((a, b) => a.ts - b.ts);

    // Assign chronological ordinal bracket
    validRecs.forEach((entry, k) => {
      const ord = getOrdinalSuffix(k + 1);
      const computedTag = `(${ord} ${kind})`;
      const r = entry.r;

      if (!r.userOrdinalTag) {
        r.ordinalTag = computedTag;
      } else {
        r.ordinalTag = r.userOrdinalTag;
      }

      // Ensure remarks contains the tag
      if (!r.remarks || /^(na|nil|-)$/i.test(r.remarks.trim())) {
        r.remarks = r.ordinalTag;
      } else {
        if (/\([ci]?p?ioh-?\d+\)/i.test(r.remarks)) {
          r.remarks = r.remarks.replace(/\([ci]?p?ioh-?\d+\)/gi, r.ordinalTag);
        } else if (!r.remarks.includes(r.ordinalTag) && !/\(\d+(st|nd|rd|th)\s+(IOH|POH)\)/i.test(r.remarks)) {
          r.remarks = `${r.ordinalTag} ${r.remarks}`;
        }
      }
    });

    // Recompute present values (latest date)
    if (it.records.length > 0) {
      let latest = null;
      if (validRecs.length > 0) {
        latest = validRecs[validRecs.length - 1].r;
      } else {
        latest = it.records[it.records.length - 1];
      }
      if (latest) {
        it.presentDate = latest.displayDate || latest.isoDate || latest.rawDate || 'NA';
        it.presentEngineHours = latest.engineHours || 'NA';
        it.presentRemarks = latest.remarks || latest.ordinalTag || 'NA';
      }
    }
  }

  // Ensure all machines' HRM data has chronological ordinals
  function ensureAllHrmOrdinals(hrmData) {
    if (!hrmData || typeof hrmData !== 'object') return;
    Object.keys(hrmData).forEach(mId => {
      const m = hrmData[mId];
      if (m && Array.isArray(m.items)) {
        m.items.forEach(it => {
          if (/IOH|POH/i.test(it.title)) {
            syncHrmItemOrdinals(it);
          }
        });
      }
    });
  }

  // Helper: Retrieve authentic History Register record for any machine from official database
  function getAuthenticHrm(machineId) {
    if (!machineId || typeof window === 'undefined' || !window.REAL_SWR_FLEET_DATA || !window.REAL_SWR_FLEET_DATA.historyRegisters) {
      return null;
    }
    const regs = window.REAL_SWR_FLEET_DATA.historyRegisters;
    if (regs[machineId]) return regs[machineId];

    const normId = machineId.trim().toUpperCase().replace(/\s+/g, '-');
    if (regs[normId]) return regs[normId];

    const noHyphenId = machineId.trim().toUpperCase().replace(/[-_ ]/g, '');
    for (let k of Object.keys(regs)) {
      if (k.replace(/[-_ ]/g, '').toUpperCase() === noHyphenId) {
        return regs[k];
      }
    }
    return null;
  }

  // Self-Healing Mechanism: Proactively restore missing, erased, or incomplete HRM records from authentic workbooks
  function healMachineHrm(mId, forceAuthentic = false) {
    const authentic = getAuthenticHrm(mId);
    if (!authentic) {
      if (!HRM_DATA[mId]) {
        const mInfo = getMachineInfo(mId);
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
            presentRemarks: 'NA',
            records: []
          }))
        };
        return true;
      }
      return false;
    }

    if (forceAuthentic || !HRM_DATA[mId] || !Array.isArray(HRM_DATA[mId].items) || HRM_DATA[mId].items.length === 0) {
      HRM_DATA[mId] = JSON.parse(JSON.stringify(authentic));
      if (Array.isArray(HRM_DATA[mId].items)) {
        HRM_DATA[mId].items.forEach(it => {
          if (/IOH|POH/i.test(it.title)) syncHrmItemOrdinals(it);
        });
      }
      return true;
    }

    const current = HRM_DATA[mId];
    let repaired = false;

    // Check if canonical has items that are missing or erased in current
    if (current.items.length < authentic.items.length) {
      const mergedItems = JSON.parse(JSON.stringify(authentic.items));
      current.items.forEach(curIt => {
        const match = mergedItems.find(aIt => aIt.itemNum === curIt.itemNum || aIt.title.trim().toUpperCase() === curIt.title.trim().toUpperCase());
        if (match && curIt.records && curIt.records.length > (match.records ? match.records.length : 0)) {
          match.records = curIt.records;
          match.presentDate = curIt.presentDate;
          match.presentEngineHours = curIt.presentEngineHours;
          match.presentRemarks = curIt.presentRemarks;
        }
      });
      current.items = mergedItems;
      repaired = true;
    } else {
      // Check each item: if authentic has records/presentDate but current has NA or empty records, heal it!
      authentic.items.forEach(authIt => {
        const curIt = current.items.find(i => i.itemNum === authIt.itemNum || i.title.trim().toUpperCase() === authIt.title.trim().toUpperCase());
        if (curIt) {
          const authHasData = (authIt.records && authIt.records.length > 0) || (authIt.presentDate && authIt.presentDate !== 'NA' && authIt.presentDate !== '_');
          const curIsEmpty = (!curIt.records || curIt.records.length === 0) && (!curIt.presentDate || curIt.presentDate === 'NA' || curIt.presentDate === '');
          if (authHasData && curIsEmpty) {
            curIt.presentDate = authIt.presentDate;
            curIt.presentEngineHours = authIt.presentEngineHours;
            curIt.presentRemarks = authIt.presentRemarks;
            curIt.records = JSON.parse(JSON.stringify(authIt.records || []));
            repaired = true;
          } else if (authIt.records && authIt.records.length > 0 && (!curIt.records || curIt.records.length < authIt.records.length)) {
            curIt.records = JSON.parse(JSON.stringify(authIt.records));
            if (!curIt.presentDate || curIt.presentDate === 'NA') curIt.presentDate = authIt.presentDate;
            if (!curIt.presentEngineHours || curIt.presentEngineHours === 'NA') curIt.presentEngineHours = authIt.presentEngineHours;
            if (!curIt.presentRemarks || curIt.presentRemarks === 'NA') curIt.presentRemarks = authIt.presentRemarks;
            repaired = true;
          }
        }
      });
    }

    if (!current.commissioningDate || current.commissioningDate === '2016-01-01') {
      if (authentic.commissioningDate) {
        current.commissioningDate = authentic.commissioningDate;
        current.commissioningRaw = authentic.commissioningRaw;
        repaired = true;
      }
    }

    if (Array.isArray(current.items)) {
      current.items.forEach(it => {
        if (/IOH|POH/i.test(it.title)) syncHrmItemOrdinals(it);
      });
    }

    return repaired;
  }

  // Retrieve and Restore All History Register data across all 22 SWR fleet machines
  function retrieveAndRestoreAllHrm(forceAll = true) {
    if (typeof window === 'undefined' || !window.REAL_SWR_FLEET_DATA || !window.REAL_SWR_FLEET_DATA.historyRegisters) {
      showToast('Error: Authentic SWR fleet history database not loaded.', true);
      return;
    }

    const regKeys = Object.keys(window.REAL_SWR_FLEET_DATA.historyRegisters);
    let repairedCount = 0;

    regKeys.forEach(mId => {
      const repaired = healMachineHrm(mId, forceAll);
      if (repaired) repairedCount++;
    });

    ensureAllHrmOrdinals(HRM_DATA);
    saveHrmData();
    renderHrmView();

    showToast(`⚡ Successfully retrieved and replaced missing History Register records across all ${regKeys.length} SWR fleet machines!`);
  }

  // Render History Register Module (Tab 1)
  function renderHrmView() {
    const mId = getActiveMachineId();
    const mInfo = getMachineInfo(mId);

    // Auto-heal active machine if erased, missing, or incomplete
    const wasHealed = healMachineHrm(mId);
    if (wasHealed) {
      saveHrmData();
    }

    const hrm = HRM_DATA[mId] || {
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
        presentRemarks: 'NA',
        records: []
      }))
    };
    if (!HRM_DATA[mId]) {
      HRM_DATA[mId] = hrm;
      saveHrmData();
    }

    // Guarantee ordinals for this machine's items
    if (hrm && Array.isArray(hrm.items)) {
      hrm.items.forEach(it => {
        if (/IOH|POH/i.test(it.title)) {
          syncHrmItemOrdinals(it);
        }
      });
    }

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
      const displayDate = formatDateDisplay(hrm.commissioningDate || hrm.commissioningRaw);
      ageSubEl.textContent = `Commissioned on ${displayDate} • Dynamic age as on today (${formatDateDisplay(new Date().toISOString().substring(0, 10))})`;
    }

    const commDateEl = document.getElementById('hrmDisplayCommDate');
    if (commDateEl) commDateEl.textContent = formatDateDisplay(hrm.commissioningDate || hrm.commissioningRaw);

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

      // For IOH and POH items, calculate latest chronological ordinal tag for display in present row
      let latestTag = '';
      if (/IOH|POH/i.test(it.title) && it.records && it.records.length > 0) {
        const validRecs = it.records.filter(r => parseRecordTimestamp(r) > 0);
        if (validRecs.length > 0) {
          validRecs.sort((a, b) => parseRecordTimestamp(a) - parseRecordTimestamp(b));
          const latestRec = validRecs[validRecs.length - 1];
          latestTag = latestRec.ordinalTag || `(${getOrdinalSuffix(validRecs.length)} ${/IOH/i.test(it.title) ? 'IOH' : 'POH'})`;
        }
      }

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
            <span>${escapeHtml(formatDateDisplay(it.presentDate))}</span>
            ${latestTag && it.presentDate && it.presentDate !== 'NA' && !/^(not done|not done yet|nil|_|-)$/i.test(it.presentDate) ? `
              <span class="badge badge-gold" style="font-size: 11px; font-weight: 700; background: rgba(228, 193, 83, 0.22); color: #e4c153; border: 1px solid rgba(228, 193, 83, 0.45); padding: 2px 7px; border-radius: 4px; margin-left: 6px;">
                ${escapeHtml(latestTag)}
              </span>
            ` : ''}
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
          ${isUserAdmin() ? `
          <div style="display: flex; gap: 5px; align-items: center; flex-wrap: wrap;">
            <button class="btn btn-secondary-pista" onclick="window.TM_APP.openAddHrmEntryModal(${idx})" style="padding: 4px 8px; font-size: 11px;" title="Add new overhaul record or entry">
              ➕ Add
            </button>
            <button class="btn btn-dim" onclick="window.TM_APP.openEditHrmPresentModal(${idx})" style="padding: 4px 8px; font-size: 11px;" title="Edit present entry details anytime">
              ✏️ Edit
            </button>
            <button class="hrm-btn-delete" onclick="window.TM_APP.deletePresentHrmEntry('${mId}', ${idx})" style="padding: 4px 8px; font-size: 11px;" title="Delete present entry">
              🗑️
            </button>
          </div>
          ` : `<span class="view-only-tag" style="font-size: 11px;">View Only</span>`}
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
                <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 3px; flex-wrap: wrap;">
                  <span style="color: var(--pista-300); font-weight: 700; font-size: 11.5px;">📅 ${escapeHtml(formatDateDisplay(rec.displayDate || rec.isoDate || rec.rawDate))}</span>
                  ${rec.ordinalTag ? `
                    <span class="badge" style="background: rgba(228, 193, 83, 0.22); color: #e4c153; border: 1px solid rgba(228, 193, 83, 0.45); font-weight: 700; font-size: 11px; padding: 2px 7px; border-radius: 4px;">
                      ${escapeHtml(rec.ordinalTag)}
                    </span>
                  ` : ''}
                  ${rec.engineHours ? `<span style="color: var(--gold-300); font-family: var(--font-mono); font-size: 11.5px;">⏱️ ${escapeHtml(rec.engineHours)} EH</span>` : ''}
                </div>
                <div class="hrm-rec-remarks" style="font-size: 11px;">${escapeHtml((rec.remarks && rec.remarks.trim() !== '' && rec.remarks.trim() !== '-' && !/^(no|nil)$/i.test(rec.remarks.trim())) ? rec.remarks.trim() : 'NA')}</div>
              </div>
              ${isUserAdmin() ? `
              <div style="display: flex; gap: 4px; align-items: center;">
                <button class="btn btn-dim" onclick="window.TM_APP.openEditHrmRecordModal('${mId}', ${idx}, '${rec.id}')" style="padding: 3px 6px; font-size: 11px;" title="Edit this historical entry anytime">
                  ✏️
                </button>
                <button class="hrm-btn-delete" onclick="window.TM_APP.deleteHrmRecord('${mId}', ${idx}, '${rec.id}')" style="padding: 3px 6px; font-size: 11px;" title="Delete this entry">
                  🗑️
                </button>
              </div>
              ` : ''}
            </div>
          `;
        });

        drawerTr.innerHTML = `
          <td colspan="7" style="padding: 0;">
            <div class="hrm-history-drawer">
              <div style="font-size: 12px; font-weight: 700; color: var(--gold-400); margin-bottom: 6px; display: flex; justify-content: space-between;">
                <span>Detailed Overhaul &amp; Replacement Audit History (Chronological Ordinals):</span>
                ${isUserAdmin() ? '<span class="admin-hint-sub" style="font-size: 11px;">Click ✏️ to edit or 🗑️ to delete any individual entry anytime</span>' : ''}
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
          <td colspan="11" class="desk-empty-cell" style="text-align: center; padding: 42px;">
            <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
            <div style="font-size: 15px; font-weight: 700; color: var(--pista-300);">No ${effectiveSubsystem} Failures Recorded for Machine ${mId}</div>
            <div class="desk-empty-sub" style="font-size: 12px; margin-top: 4px;">Subsystem is operating with zero recorded breakdown down days.</div>
            <button class="btn btn-primary-gold admin-only" onclick="window.TM_APP.openLogModalForSubsystem('${effectiveSubsystem}')" style="margin-top: 14px; font-size: 11.5px; padding: 6px 14px;">
              ➕ Log First ${effectiveSubsystem} Failure
            </button>
          </td>
        </tr>
      `;
    } else {
      subFailures.forEach((f, idx) => {
        const rowSl = f.slNo || (idx + 1);
        const failDate = formatDateDisplay(f.dateOfFailure || f.breakdownTime);
        const fitDate = (f.status === 'UNDER REPAIR' || (!f.dateOfRectification && !f.fitTime)) ? '⚠️ Active' : formatDateDisplay(f.dateOfRectification || f.fitTime);
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
            <td style="font-size: 12px; line-height: 1.45; max-width: 260px;" class="desk-desc-cell">
              <div style="font-weight: 500;">${escapeHtml(descText)}</div>
            </td>
            <td style="font-size: 12px; line-height: 1.45; max-width: 240px;" class="desk-action-cell">
              <div>${escapeHtml(actionText)}</div>
            </td>
            <td>
              ${partNoText !== '-' ? `<span class="badge-part-no">${escapeHtml(partNoText)}</span>` : '<span class="text-subtle" style="font-size:11px;">-</span>'}
            </td>
            <td style="font-size: 11.5px; max-width: 180px;" class="desk-remarks-cell">
              <div>${escapeHtml(remarksText)}</div>
            </td>
            <td style="text-align: center;">
              ${f.isRepetitive ? `
                <span class="badge-rep-yes" onclick="window.TM_APP.highlightFailure('${f.id}', '${effectiveSubsystem}', '${mId}')" title="Click to highlight recurring defect #${rowSl} cluster">
                  🔁 YES
                </span>
              ` : `
                <span class="badge-rep-no">NO</span>
              `}
            </td>
            <td style="text-align: center;">
              ${isUserAdmin() ? `
              <div style="display: flex; gap: 5px; justify-content: center; align-items: center;">
                <button class="btn btn-dim" onclick="window.TM_APP.openEditFailureModal('${f.id}')" style="padding: 4px 8px; font-size: 11px;" title="Edit failure record">✏️</button>
                <button class="hrm-btn-delete" onclick="window.TM_APP.deleteFailureRecord('${f.id}')" style="padding: 4px 8px; font-size: 11px;" title="Delete failure record">🗑️</button>
              </div>
              ` : `<span class="view-only-tag" style="font-size: 11px;">View Only</span>`}
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
            <button class="btn btn-secondary-pista admin-only" onclick="window.TM_APP.openLogModalForSubsystem('${effectiveSubsystem}')" style="padding: 6px 14px; font-size: 12px;">
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

        <div id="clusterBanner-${effectiveSubsystem}" class="cluster-banner" style="display: none; margin-bottom: 14px;"></div>

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
    const bAll = document.getElementById('badgeAllFailures');
    if (bAll) bAll.textContent = AppState.failures.length;
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
          <div class="search-empty-title" style="font-size: 15px; font-weight: 700;">No references found for "${escapeHtml(query)}"</div>
          <div class="search-empty-sub" style="font-size: 12px; margin-top: 4px;">
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
                ${isUserAdmin() ? `
                <button class="btn btn-dim" onclick="window.TM_APP.openEditFailureModal('${r.id}')" style="padding: 4px 8px; font-size: 11.5px;" title="Edit failure record">
                  <span>✏️</span>
                </button>
                ` : ''}
              </div>
            </div>

            <div class="search-details-grid">
              <div class="search-field-block" style="grid-column: span 2;">
                <div class="search-field-label">Detailed Description of Failure</div>
                <div class="search-field-value search-field-primary" style="font-size: 13px; font-weight: 500;">
                  ${highlightKeyword(r.description, query)}
                </div>
              </div>

              <div class="search-field-block" style="grid-column: span 2;">
                <div class="search-field-label">Action Taken &amp; Spares Consumed</div>
                <div class="search-field-value search-field-secondary">
                  ${highlightKeyword(r.actionTaken, query)}
                </div>
              </div>

              <div class="search-field-block">
                <div class="search-field-label">Failure &amp; Rectification Dates</div>
                <div class="search-field-value">
                  <div>📅 Breakdown: <strong>${highlightKeyword(formatDateDisplay(r.dateOfFailure), query)}</strong></div>
                  <div>📅 Restored: <strong style="color: ${String(r.dateOfRectification).includes('Active') ? '#e4c153' : '#93c572'};">${highlightKeyword(formatDateDisplay(r.dateOfRectification), query)}</strong></div>
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
                  ${r.partNo !== '-' ? `<span class="badge-part-no">${highlightKeyword(r.partNo, query)}</span>` : '<span class="part-none-recorded">None Recorded</span>'}
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
                <div class="search-field-value search-field-primary" style="font-size: 13px; font-weight: 600;">
                  ${highlightKeyword(r.title, query)}
                </div>
              </div>

              <div class="search-field-block">
                <div class="search-field-label">Present Attention Date</div>
                <div class="search-field-value">
                  <span class="hrm-date-badge"><span>📅</span><span>${highlightKeyword(formatDateDisplay(r.presentDate), query)}</span></span>
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
                <div class="search-field-value search-field-secondary">
                  ${highlightKeyword(r.presentRemarks, query)}
                  ${r.historicalCount > 0 ? `<div class="search-hist-count" style="font-size: 11px; margin-top: 4px;">(${r.historicalCount} historical maintenance interventions in archive)</div>` : ''}
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
    if (!isUserAdmin()) {
      showToast('View-Only Access: Editing commissioning date requires Admin privileges.', true);
      return;
    }
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

  function onHrmModalItemChanged() {
    const mId = document.getElementById('hrmModalMachineId').value || getActiveMachineId();
    const itemIndex = parseInt(document.getElementById('hrmModalItemSelect').value, 10);
    const hrm = HRM_DATA[mId];
    if (!hrm || !hrm.items[itemIndex]) return;

    const it = hrm.items[itemIndex];
    const isOverhaul = /IOH|POH/i.test(it.title);
    const ordGroup = document.getElementById('hrmModalOrdinalGroup');
    if (ordGroup) {
      ordGroup.style.display = isOverhaul ? 'block' : 'none';
    }

    const recId = document.getElementById('hrmModalRecordId').value;
    if (!recId && isOverhaul) {
      autoSuggestOrdinal();
    }
  }

  function onHrmModalDateChanged() {
    const recId = document.getElementById('hrmModalRecordId').value;
    if (!recId) {
      autoSuggestOrdinal();
    }
  }

  function autoSuggestOrdinal() {
    const mId = document.getElementById('hrmModalMachineId').value || getActiveMachineId();
    const itemIndex = parseInt(document.getElementById('hrmModalItemSelect').value, 10);
    const hrm = HRM_DATA[mId];
    if (!hrm || !hrm.items[itemIndex]) return;

    const it = hrm.items[itemIndex];
    const isIoh = /IOH/i.test(it.title);
    const isPoh = /POH/i.test(it.title);
    if (!isIoh && !isPoh) return;

    const kind = isIoh ? 'IOH' : 'POH';
    const isOvernight = document.getElementById('hrmModalIsOvernight')?.checked;
    let dateVal = '';
    if (isOvernight) {
      const sDate = document.getElementById('hrmModalStartDate')?.value;
      const eDate = document.getElementById('hrmModalEndDate')?.value;
      dateVal = buildOvernightDateString(sDate, eDate);
      if (!dateVal) dateVal = document.getElementById('hrmModalDateInput')?.value || '';
    } else {
      dateVal = document.getElementById('hrmModalDateInput')?.value || '';
    }
    const inputTs = parseRecordTimestamp({ isoDate: dateVal, rawDate: dateVal, displayDate: dateVal });

    const validRecs = (it.records || []).filter(r => parseRecordTimestamp(r) > 0);
    const recId = document.getElementById('hrmModalRecordId').value;
    const others = recId ? validRecs.filter(r => r.id !== recId) : validRecs;

    let earlierCount = 0;
    others.forEach(r => {
      if (parseRecordTimestamp(r) <= inputTs) {
        earlierCount++;
      }
    });

    const nextOrdinalNumber = inputTs > 0 ? (earlierCount + 1) : (others.length + 1);
    const ordTag = `(${getOrdinalSuffix(nextOrdinalNumber)} ${kind})`;

    const ordInput = document.getElementById('hrmModalOrdinalInput');
    if (ordInput) {
      ordInput.value = ordTag;
    }
  }

  function openAddHrmEntryModal(itemIndex = 0) {
    if (!isUserAdmin()) {
      showToast('View-Only Access: Adding/editing HRM entries requires Admin privileges.', true);
      return;
    }
    const mId = getActiveMachineId();
    const hrm = HRM_DATA[mId];
    if (!hrm) return;

    document.getElementById('hrmModalMachineId').value = mId;
    document.getElementById('hrmModalRecordId').value = '';

    const titleEl = document.getElementById('hrmModalTitle');
    if (titleEl) {
      titleEl.innerHTML = `<span>➕ Add New Entry to History Register Module</span>`;
    }

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

    const activeIt = hrm.items[itemIndex];
    const isOverhaul = activeIt && /IOH|POH/i.test(activeIt.title);

    // Reset overnight block toggle
    const chkOvernight = document.getElementById('hrmModalIsOvernight');
    if (chkOvernight) chkOvernight.checked = false;
    onHrmOvernightToggleChanged();

    // Set default date to today in YYYY-MM-DD
    const dateInput = document.getElementById('hrmModalDateInput');
    if (dateInput) {
      dateInput.value = new Date().toISOString().substring(0, 10);
    }

    const ehInput = document.getElementById('hrmModalEhInput');
    if (ehInput) {
      ehInput.value = '';
    }

    const ordGroup = document.getElementById('hrmModalOrdinalGroup');
    const ordInput = document.getElementById('hrmModalOrdinalInput');
    const remarksInput = document.getElementById('hrmModalRemarksInput');

    if (isOverhaul) {
      if (ordGroup) ordGroup.style.display = 'block';
      const kind = /IOH/i.test(activeIt.title) ? 'IOH' : 'POH';
      const validRecs = (activeIt.records || []).filter(r => parseRecordTimestamp(r) > 0);
      const nextNum = validRecs.length + 1;
      const tag = `(${getOrdinalSuffix(nextNum)} ${kind})`;
      if (ordInput) ordInput.value = tag;
      if (remarksInput) remarksInput.value = `${tag} `;
    } else {
      if (ordGroup) ordGroup.style.display = 'none';
      if (ordInput) ordInput.value = '';
      if (remarksInput) remarksInput.value = '';
    }

    openModal('hrmEntryModal');
  }

  function openEditHrmRecordModal(mId, itemIndex, recordId) {
    if (!isUserAdmin()) {
      showToast('View-Only Access: Adding/editing HRM entries requires Admin privileges.', true);
      return;
    }
    const hrm = HRM_DATA[mId];
    if (!hrm || !hrm.items[itemIndex]) return;

    const it = hrm.items[itemIndex];
    const rec = (it.records || []).find(r => r.id === recordId);
    if (!rec) return;

    document.getElementById('hrmModalMachineId').value = mId;
    document.getElementById('hrmModalRecordId').value = recordId;

    const titleEl = document.getElementById('hrmModalTitle');
    if (titleEl) {
      titleEl.innerHTML = `<span>✏️ Edit HRM Record • ${escapeHtml(it.title)}</span>`;
    }

    const select = document.getElementById('hrmModalItemSelect');
    if (select) {
      select.innerHTML = '';
      hrm.items.forEach((item, idx) => {
        const opt = document.createElement('option');
        opt.value = idx;
        opt.textContent = `${item.itemNum || (idx + 1)}. ${item.title}`;
        if (idx === itemIndex) opt.selected = true;
        select.appendChild(opt);
      });
    }

    const chkOvernight = document.getElementById('hrmModalIsOvernight');
    const dVal = rec.displayDate || rec.rawDate || rec.isoDate || '';
    const ov = parseOvernightDate(dVal);
    if (ov) {
      if (chkOvernight) chkOvernight.checked = true;
      const sDate = document.getElementById('hrmModalStartDate');
      const eDate = document.getElementById('hrmModalEndDate');
      if (sDate) sDate.value = ov.startDateIso;
      if (eDate) eDate.value = ov.endDateIso;
      onHrmOvernightToggleChanged();
    } else {
      if (chkOvernight) chkOvernight.checked = false;
      onHrmOvernightToggleChanged();
      const dateInput = document.getElementById('hrmModalDateInput');
      if (dateInput) {
        const iso = toIsoDate(dVal);
        dateInput.value = iso || new Date().toISOString().substring(0, 10);
      }
    }

    const ehInput = document.getElementById('hrmModalEhInput');
    if (ehInput) {
      ehInput.value = (rec.engineHours && rec.engineHours !== 'NA') ? rec.engineHours : '';
    }

    const isOverhaul = /IOH|POH/i.test(it.title);
    const ordGroup = document.getElementById('hrmModalOrdinalGroup');
    const ordInput = document.getElementById('hrmModalOrdinalInput');
    const remarksInput = document.getElementById('hrmModalRemarksInput');

    if (isOverhaul) {
      if (ordGroup) ordGroup.style.display = 'block';
      if (ordInput) ordInput.value = rec.ordinalTag || '';
    } else {
      if (ordGroup) ordGroup.style.display = 'none';
      if (ordInput) ordInput.value = '';
    }

    if (remarksInput) {
      remarksInput.value = (rec.remarks && rec.remarks !== 'NA') ? rec.remarks : '';
    }

    openModal('hrmEntryModal');
  }

  function openEditHrmPresentModal(itemIndex = 0) {
    const mId = getActiveMachineId();
    const hrm = HRM_DATA[mId];
    if (!hrm || !hrm.items[itemIndex]) return;

    const it = hrm.items[itemIndex];
    if (it.records && it.records.length > 0) {
      const validRecs = it.records.filter(r => parseRecordTimestamp(r) > 0);
      if (validRecs.length > 0) {
        validRecs.sort((a, b) => parseRecordTimestamp(a) - parseRecordTimestamp(b));
        const latest = validRecs[validRecs.length - 1];
        openEditHrmRecordModal(mId, itemIndex, latest.id);
        return;
      }
      openEditHrmRecordModal(mId, itemIndex, it.records[it.records.length - 1].id);
    } else {
      openAddHrmEntryModal(itemIndex);
    }
  }

  function handleHrmEntrySubmit(event) {
    event.preventDefault();
    if (!isUserAdmin()) {
      showToast('View-Only Access: Adding/editing HRM entries requires Admin privileges.', true);
      return;
    }
    const mId = document.getElementById('hrmModalMachineId').value || getActiveMachineId();
    const itemIndex = parseInt(document.getElementById('hrmModalItemSelect').value, 10);
    const recordId = document.getElementById('hrmModalRecordId').value;

    const isOvernight = document.getElementById('hrmModalIsOvernight')?.checked;
    let dateVal = '';
    if (isOvernight) {
      const sDate = document.getElementById('hrmModalStartDate')?.value;
      const eDate = document.getElementById('hrmModalEndDate')?.value;
      dateVal = buildOvernightDateString(sDate, eDate);
      if (!dateVal) dateVal = document.getElementById('hrmModalDateInput')?.value || '';
    } else {
      dateVal = document.getElementById('hrmModalDateInput')?.value || '';
    }
    const ov = parseOvernightDate(dateVal);
    const isoVal = ov ? ov.startDateIso : toIsoDate(dateVal);

    const ehVal = document.getElementById('hrmModalEhInput').value.trim();
    const rawRem = document.getElementById('hrmModalRemarksInput').value.trim();
    const remarksVal = (rawRem && rawRem !== '-' && !/^(no|nil)$/i.test(rawRem)) ? rawRem : 'NA';
    const ordVal = document.getElementById('hrmModalOrdinalInput') ? document.getElementById('hrmModalOrdinalInput').value.trim() : '';

    if (!HRM_DATA[mId] || !HRM_DATA[mId].items[itemIndex]) {
      showToast('Error: Machine HRM record not found', true);
      return;
    }

    const it = HRM_DATA[mId].items[itemIndex];
    if (!it.records) it.records = [];

    if (recordId) {
      // Edit existing record
      const existingRec = it.records.find(r => r.id === recordId);
      if (existingRec) {
        existingRec.rawDate = dateVal;
        existingRec.isoDate = isoVal;
        existingRec.displayDate = dateVal;
        existingRec.engineHours = ehVal || 'NA';
        if (ordVal) {
          existingRec.userOrdinalTag = ordVal;
          existingRec.ordinalTag = ordVal;
        }
        existingRec.remarks = remarksVal;
        existingRec.sortTimestamp = parseRecordTimestamp(existingRec);
      }
    } else {
      // Add new record
      const newRec = {
        id: `rec_${mId}_it${itemIndex}_${Date.now()}`,
        colPair: 'USER-ENTRY',
        rawDate: dateVal,
        isoDate: isoVal,
        displayDate: dateVal,
        engineHours: ehVal || 'NA',
        userOrdinalTag: ordVal || null,
        ordinalTag: ordVal || null,
        remarks: remarksVal,
        sortTimestamp: parseRecordTimestamp({ isoDate: isoVal, rawDate: dateVal, displayDate: dateVal })
      };
      it.records.push(newRec);
    }

    // Sync ordinals chronologically and update present values
    syncHrmItemOrdinals(it);

    // If non-overhaul item or only 1 record, compute present values
    if (!/IOH|POH/i.test(it.title)) {
      const isoRecs = it.records.filter(r => r.isoDate).sort((a, b) => a.isoDate.localeCompare(b.isoDate));
      const latest = isoRecs.length > 0 ? isoRecs[isoRecs.length - 1] : it.records[it.records.length - 1];
      it.presentDate = latest.displayDate || latest.isoDate || dateVal;
      it.presentEngineHours = latest.engineHours || ehVal || 'NA';
      it.presentRemarks = latest.remarks || remarksVal || 'NA';
    }

    saveHrmData();
    renderHrmView();
    closeModal('hrmEntryModal');
    showToast(`Saved record in '${it.title}' for ${mId}`);
  }

  function deleteHrmRecord(mId, itemIndex, recordId) {
    if (!isUserAdmin()) {
      showToast('View-Only Access: Deleting HRM records requires Admin privileges.', true);
      return;
    }
    if (!confirm('Are you sure you want to delete this historical record?')) return;

    const hrm = HRM_DATA[mId];
    if (!hrm || !hrm.items[itemIndex]) return;

    const it = hrm.items[itemIndex];
    it.records = it.records.filter(r => r.id !== recordId);

    // Sync ordinals chronologically and update present values
    if (/IOH|POH/i.test(it.title)) {
      syncHrmItemOrdinals(it);
      if (it.records.length === 0) {
        it.presentDate = 'NA';
        it.presentEngineHours = 'NA';
        it.presentRemarks = 'NA';
      }
    } else {
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
    }

    saveHrmData();
    renderHrmView();
    showToast(`Record deleted from '${it.title}'`);
  }

  function deletePresentHrmEntry(mId, itemIndex) {
    if (!isUserAdmin()) {
      showToast('View-Only Access: Deleting HRM entries requires Admin privileges.', true);
      return;
    }
    const hrm = HRM_DATA[mId];
    if (!hrm || !hrm.items[itemIndex]) return;
    const it = hrm.items[itemIndex];

    if (!confirm(`Are you sure you want to delete the present entry for '${it.title}'?`)) return;

    if (it.records && it.records.length > 0) {
      it.records.pop();
      if (/IOH|POH/i.test(it.title)) {
        syncHrmItemOrdinals(it);
        if (it.records.length === 0) {
          it.presentDate = 'NA';
          it.presentEngineHours = 'NA';
          it.presentRemarks = 'NA';
        }
      } else {
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

    healMachineHrm(mId, true);
    saveHrmData();
    renderHrmView();
    showToast(`Reset ${mId} HRM to authentic workbook records.`);
  }

  async function exportCurrentHrm() {
    const mId = getActiveMachineId();
    const hrm = HRM_DATA[mId];
    if (!hrm) return;

    const rows = hrm.items.map(it => {
      let latestTag = '';
      if (/IOH|POH/i.test(it.title) && it.records && it.records.length > 0) {
        const validRecs = it.records.filter(r => parseRecordTimestamp(r) > 0);
        if (validRecs.length > 0) {
          validRecs.sort((a, b) => parseRecordTimestamp(a) - parseRecordTimestamp(b));
          const latestRec = validRecs[validRecs.length - 1];
          latestTag = latestRec.ordinalTag || `(${getOrdinalSuffix(validRecs.length)} ${/IOH/i.test(it.title) ? 'IOH' : 'POH'})`;
        }
      }

      const dateExport = (latestTag && it.presentDate && it.presentDate !== 'NA' && !/^(not done|nil|_|-)$/i.test(it.presentDate))
        ? `${it.presentDate} ${latestTag}`
        : it.presentDate;

      return {
        'Item No': it.itemNum,
        'Parameter Description': it.title,
        'Date': dateExport,
        '@ Engine Hours': it.presentEngineHours,
        'Technical Remarks / Spares': it.presentRemarks,
        'Total Historical Records Logged': it.records ? it.records.length : 0
      };
    });

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
    if (!isUserAdmin()) {
      showToast('View-Only Access: Logging failures requires Admin privileges.', true);
      return;
    }
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
    if (!isUserAdmin()) {
      showToast('View-Only Access: Deleting failure records requires Admin privileges.', true);
      return;
    }
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
    if (!isUserAdmin()) {
      showToast('View-Only Access: Deleting machines requires Admin privileges.', true);
      return;
    }
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
        <div><strong>Division:</strong> <span class="pista-text" style="font-weight: 600;">${escapeHtml(mInfo ? mInfo.division : 'SWR')}</span></div>
        <div><strong>Model:</strong> <span class="modal-field-value">${escapeHtml(mInfo ? mInfo.model : 'Track Machine')}</span></div>
        <div><strong>Failure Incidents:</strong> <span class="alert-text" style="font-weight: 700;">${mFailures.length} recorded cases</span></div>
        <div><strong>History Register:</strong> <span class="${mHrm ? 'pista-text' : 'modal-field-value'}" style="font-weight: 700;">${mHrm ? '16 Items Present' : 'No HRM Log'}</span></div>
      </div>
    `;
  }

  function confirmDeleteMachine() {
    if (!isUserAdmin()) {
      showToast('View-Only Access: Deleting machines requires Admin privileges.', true);
      return;
    }
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

  // ==========================================================================
  // OVERNIGHT TRAFFIC BLOCK (D1/D2-MM-YYYY) CALENDAR EVENT HANDLERS
  // ==========================================================================
  function onOvernightToggleChanged() {
    const isOvernight = document.getElementById('formIsOvernightBlock')?.checked;
    const badge = document.getElementById('formOvernightBadge');
    const singleBreakdownGroup = document.getElementById('formSingleBreakdownGroup');
    const overnightContainer = document.getElementById('formOvernightDateContainer');
    const bDate = document.getElementById('formBreakdownDate');
    const sDate = document.getElementById('formOvernightStartDate');
    const eDate = document.getElementById('formOvernightEndDate');
    const inBlockSelect = document.getElementById('formWhetherInBlock');

    if (badge) badge.style.display = isOvernight ? 'inline-block' : 'none';
    if (singleBreakdownGroup) singleBreakdownGroup.style.display = isOvernight ? 'none' : 'block';
    if (overnightContainer) overnightContainer.style.display = isOvernight ? 'block' : 'none';

    if (isOvernight) {
      if (bDate) bDate.required = false;
      if (sDate) sDate.required = true;
      if (eDate) eDate.required = true;

      // Populate Start Date if empty
      if (sDate && !sDate.value) {
        if (bDate && bDate.value) {
          sDate.value = bDate.value;
        } else {
          sDate.value = new Date().toISOString().substring(0, 10);
        }
      }
      // Populate End Date if empty (default to Start Date + 1 day)
      if (sDate && sDate.value && eDate && !eDate.value) {
        const d = new Date(sDate.value);
        d.setDate(d.getDate() + 1);
        eDate.value = d.toISOString().substring(0, 10);
      }
      // Auto-set Traffic Block to YES if currently NO
      if (inBlockSelect && inBlockSelect.value === 'NO') {
        inBlockSelect.value = 'YES';
      }
      updateOvernightPreview();
    } else {
      if (bDate) {
        bDate.required = true;
        if (sDate && sDate.value && !bDate.value) {
          bDate.value = sDate.value;
        }
      }
      if (sDate) sDate.required = false;
      if (eDate) eDate.required = false;
    }
  }

  function onOvernightStartChanged() {
    const sDate = document.getElementById('formOvernightStartDate');
    const eDate = document.getElementById('formOvernightEndDate');
    if (sDate && sDate.value && eDate) {
      // Auto-advance End Date to Start Date + 1 day
      const d = new Date(sDate.value);
      d.setDate(d.getDate() + 1);
      eDate.value = d.toISOString().substring(0, 10);
    }
    updateOvernightPreview();
  }

  function onOvernightEndChanged() {
    updateOvernightPreview();
  }

  function updateOvernightPreview() {
    const sDate = document.getElementById('formOvernightStartDate')?.value;
    const eDate = document.getElementById('formOvernightEndDate')?.value;
    const previewEl = document.getElementById('formOvernightPreview');
    if (!previewEl) return;
    if (sDate && eDate) {
      previewEl.textContent = buildOvernightDateString(sDate, eDate);
    } else if (sDate) {
      previewEl.textContent = buildOvernightDateString(sDate, sDate);
    } else {
      previewEl.textContent = '--';
    }
  }

  // HRM Modal Overnight Handlers
  function onHrmOvernightToggleChanged() {
    const isOvernight = document.getElementById('hrmModalIsOvernight')?.checked;
    const badge = document.getElementById('hrmOvernightBadge');
    const overnightContainer = document.getElementById('hrmOvernightDateContainer');
    const singleDateGroup = document.getElementById('hrmSingleDateGroup');
    const singleDateInput = document.getElementById('hrmModalDateInput');
    const sDate = document.getElementById('hrmModalStartDate');
    const eDate = document.getElementById('hrmModalEndDate');

    if (badge) badge.style.display = isOvernight ? 'inline-block' : 'none';
    if (singleDateGroup) singleDateGroup.style.display = isOvernight ? 'none' : 'block';
    if (overnightContainer) overnightContainer.style.display = isOvernight ? 'block' : 'none';

    if (singleDateInput) {
      singleDateInput.required = !isOvernight;
    }

    if (isOvernight) {
      if (sDate && !sDate.value) {
        if (singleDateInput && singleDateInput.value) {
          sDate.value = singleDateInput.value;
        } else {
          sDate.value = new Date().toISOString().substring(0, 10);
        }
      }
      if (sDate && sDate.value && eDate && !eDate.value) {
        const d = new Date(sDate.value);
        d.setDate(d.getDate() + 1);
        eDate.value = d.toISOString().substring(0, 10);
      }
      updateHrmOvernightPreview();
    }
  }

  function onHrmOvernightStartChanged() {
    const sDate = document.getElementById('hrmModalStartDate');
    const eDate = document.getElementById('hrmModalEndDate');
    if (sDate && sDate.value && eDate) {
      const d = new Date(sDate.value);
      d.setDate(d.getDate() + 1);
      eDate.value = d.toISOString().substring(0, 10);
    }
    updateHrmOvernightPreview();
  }

  function onHrmOvernightEndChanged() {
    updateHrmOvernightPreview();
  }

  function updateHrmOvernightPreview() {
    const sDate = document.getElementById('hrmModalStartDate')?.value;
    const eDate = document.getElementById('hrmModalEndDate')?.value;
    const previewEl = document.getElementById('hrmOvernightPreview');
    if (!previewEl) return;
    if (sDate && eDate) {
      previewEl.textContent = buildOvernightDateString(sDate, eDate);
    } else if (sDate) {
      previewEl.textContent = buildOvernightDateString(sDate, sDate);
    } else {
      previewEl.textContent = '--';
    }
  }

  function openEditFailureModal(id) {
    if (!isUserAdmin()) {
      showToast('View-Only Access: Editing failure records requires Admin privileges.', true);
      return;
    }
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

    // Handle Date of Failure (Calendar & Overnight Block Detection)
    const bDate = document.getElementById('formBreakdownDate');
    const chkOvernight = document.getElementById('formIsOvernightBlock');
    const sDate = document.getElementById('formOvernightStartDate');
    const eDate = document.getElementById('formOvernightEndDate');

    const failDateVal = f.dateOfFailure || f.breakdownTime || '';
    const ov = parseOvernightDate(failDateVal);

    if (ov) {
      if (chkOvernight) chkOvernight.checked = true;
      if (sDate) sDate.value = ov.startDateIso;
      if (eDate) eDate.value = ov.endDateIso;
      onOvernightToggleChanged();
    } else {
      if (chkOvernight) chkOvernight.checked = false;
      onOvernightToggleChanged();
      if (bDate) bDate.value = failDateVal ? (toIsoDate(failDateVal) || failDateVal.substring(0, 10)) : '';
    }

    const fDate = document.getElementById('formFitDate');
    if (fDate) {
      const fitVal = f.dateOfRectification || f.fitTime || '';
      fDate.value = fitVal ? (toIsoDate(fitVal) || fitVal.substring(0, 10)) : '';
    }

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
        } else if (tab === 'history-view') {
          renderTable(getAllMachineIncidentsChronological());
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
        AppState.historyLimit = 100;
        renderTable(getAllMachineIncidentsChronological());
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
    if (!isUserAdmin()) {
      showToast('View-Only Access: Logging failures requires Admin privileges.', true);
      return;
    }
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
      opt.textContent = (c === 'SRGM/RGM') ? 'SRGM / RGM (Switch Rail Grinding / Rail Grinding)' : c;
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

    // Reset overnight toggle and fields
    const chkOvernight = document.getElementById('formIsOvernightBlock');
    if (chkOvernight) chkOvernight.checked = false;
    onOvernightToggleChanged();

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
    if (!isUserAdmin()) {
      showToast('View-Only Access: Marking machines fit requires Admin privileges.', true);
      return;
    }
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
    if (!isUserAdmin()) {
      showToast('View-Only Access: Saving failures requires Admin privileges.', true);
      return;
    }
    const incidentId = document.getElementById('formIncidentId').value;
    const cat = document.getElementById('formCategory').value;
    let mach = document.getElementById('formMachineNo').value;

    if (mach === 'CUSTOM') {
      mach = prompt('Please enter the Machine Number (e.g. UNI-8370):') || `${cat}-999`;
    }

    const isOvernight = document.getElementById('formIsOvernightBlock')?.checked;
    const bEl = document.getElementById('formBreakdownDate');
    const fEl = document.getElementById('formFitDate');
    let failDate = '';
    let fitDate = fEl ? fEl.value.trim() : '';

    if (isOvernight) {
      const sDate = document.getElementById('formOvernightStartDate')?.value;
      const eDate = document.getElementById('formOvernightEndDate')?.value;
      failDate = buildOvernightDateString(sDate, eDate);
      if (!failDate && bEl) failDate = bEl.value.trim();
      if (!fitDate && eDate) fitDate = eDate;
    } else {
      failDate = bEl ? bEl.value.trim() : '';
    }

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
    // Authentication & RBAC Control
    handleLogin,
    logout,
    openChangePasswordModal,
    handleChangePassword,
    switchLoginCardTab,
    toggleLoginTabShortcut,
    fillLoginCredentials,
    handleLoginChangePassword,
    toggleLoginPasswordVisibility,
    resetAuthUsersToDefault,
    resolveUserId,
    isUserAdmin,
    getCurrentUser: () => CurrentUser,
    getAppUsers: () => AppUsers,
    // Theme Mode Switcher (White / Light Mode and Dark Mode)
    setTheme,
    toggleTheme,
    getCurrentTheme,
    updateThemeUI,
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
    getHrmData: () => HRM_DATA,
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
    openEditHrmRecordModal,
    openEditHrmPresentModal,
    autoSuggestOrdinal,
    onHrmModalItemChanged,
    onHrmModalDateChanged,
    handleHrmEntrySubmit,
    deleteHrmRecord,
    deletePresentHrmEntry,
    resetMachineHrm,
    retrieveAndRestoreAllHrm,
    healMachineHrm,
    getHrmData: () => HRM_DATA,
    exportCurrentHrm,
    openLogModalForSubsystem,
    saveFailureFromForm,
    deleteFailureRecord,
    openEditFailureModal,
    renderHrmView,
    renderSubsystemDesk,
    updateTabBadges,
    highlightFailure,
    clearClusterHighlight,
    // Machine Radar & Percentage Breakdown Methods
    onRadarMachineChange,
    renderMachineRadarChart,
    renderMachinePercentDonutChart,
    // Overnight Block (D1/D2-MM-YYYY) Methods & Helpers
    isOvernightDate,
    parseOvernightDate,
    buildOvernightDateString,
    getFailureDateRange,
    onOvernightToggleChanged,
    onOvernightStartChanged,
    onOvernightEndChanged,
    updateOvernightPreview,
    onHrmOvernightToggleChanged,
    onHrmOvernightStartChanged,
    onHrmOvernightEndChanged,
    updateHrmOvernightPreview,
    // Universal Date & Search Methods
    formatDateDisplay,
    // Universal Search Methods
    performUniversalSearch,
    renderUniversalSearchResults,
    setUniversalSearchFilter,
    setUniversalSearchQuery,
    focusUniversalSearch,
    clearUniversalSearch,
    jumpToSearchResult,
    exportSearchResultsToExcel,
    getUniversalSearchState: () => universalSearchState,
    // Financial Year Surveillance Scope Methods
    setKpiScope,
    isFailureInCurrentFY,
    isFailureInFY,
    getFinancialYears: () => FINANCIAL_YEARS,
    // All Machine Incidents Chronological Master Timeline & Filter Methods
    toggleChronologicalSort,
    onSortSelectChange,
    onHistoryFilterChange,
    onHistoryCategoryFilterChange,
    updateHistoryMachineDropdown,
    onHistoryDateRangeChange,
    clearHistoryDateRange,
    showMoreIncidents,
    showAllIncidents,
    getAllMachineIncidentsChronological,
    renderTable,
    getAppState: () => AppState,
    selectCategory,
    populateModalCategories
  };

  // Launch on DOM ready
  document.addEventListener('DOMContentLoaded', initApp);
})();
