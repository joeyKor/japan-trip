// ===== User Name Elements =====
const USER_NAME_KEY = 'japan_trip_user_name';
const welcomeText = document.getElementById('welcomeText');
const userChip = document.getElementById('userChip');
const userNameDisplay = document.getElementById('userNameDisplay');
const changeNameBtn = document.getElementById('changeNameBtn');
const nameModal = document.getElementById('nameModal');
const nameForm = document.getElementById('nameForm');
const nameInput = document.getElementById('nameInput');
const nameError = document.getElementById('nameError');
const cancelNameBtn = document.getElementById('cancelNameBtn');

// ===== Views & Navigation =====
const homeView = document.getElementById('homeView');
const scheduleView = document.getElementById('scheduleView');
const adminView = document.getElementById('adminView');
const openScheduleBtn = document.getElementById('openScheduleBtn');
const backHomeBtn = document.getElementById('backHomeBtn');
const dayTabsEl = document.getElementById('dayTabs');
const scheduleContentEl = document.getElementById('scheduleContent');

// ===== Admin Elements =====
const ADMIN_PIN = '0000';
const openAdminModalBtn = document.getElementById('openAdminModalBtn');
const adminAuthModal = document.getElementById('adminAuthModal');
const adminAuthForm = document.getElementById('adminAuthForm');
const adminPinInput = document.getElementById('adminPinInput');
const adminPinError = document.getElementById('adminPinError');
const cancelAdminModalBtn = document.getElementById('cancelAdminModalBtn');
const adminBackBtn = document.getElementById('adminBackBtn');
const adminRefreshBtn = document.getElementById('adminRefreshBtn');
const adminTotalCount = document.getElementById('adminTotalCount');
const modeByNameBtn = document.getElementById('modeByNameBtn');
const modeByDateBtn = document.getElementById('modeByDateBtn');
const adminFilterChips = document.getElementById('adminFilterChips');
const adminStatusBox = document.getElementById('adminStatusBox');
const adminContent = document.getElementById('adminContent');

// ===== GPS Elements =====
const getGpsBtn = document.getElementById('getGpsBtn');
const btnText = getGpsBtn.querySelector('.btn-text');
const statusText = document.getElementById('statusText');
const resultCard = document.getElementById('resultCard');
const errorBox = document.getElementById('errorBox');

const latValue = document.getElementById('latValue');
const lngValue = document.getElementById('lngValue');
const accValue = document.getElementById('accValue');
const altValue = document.getElementById('altValue');
const speedValue = document.getElementById('speedValue');
const timestampEl = document.getElementById('timestamp');
const copyBtn = document.getElementById('copyBtn');
const mapsLink = document.getElementById('mapsLink');
const syncStatusEl = document.getElementById('syncStatus');

let lastCoords = null;
let selectedDay = getDefaultDay(); // 1..5 or 'all'
let adminLocations = [];
let adminMode = 'name'; // 'name' | 'date'
let adminFilterValue = 'all';
let isAdminAuthenticated = false;

const TYPE_META = {
  flight: { label: '✈️ 항공', cls: 'type-flight' },
  move: { label: '🚌 이동', cls: 'type-move' },
  meal: { label: '🍽️ 식사', cls: 'type-meal' },
  spot: { label: '🗺️ 탐방', cls: 'type-spot' },
  hotel: { label: '🏨 숙소', cls: 'type-hotel' },
  key: { label: '⭐ 주요 일정', cls: 'type-key' },
  free: { label: '✨ 자유시간', cls: 'type-free' },
};

function getDefaultDay() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayKey = `${mm}-${dd}`;
  const match = SCHEDULE_DATA.find((d) => d.monthDay === todayKey);
  return match ? match.day : 1;
}

// ===== View Switching =====
function showView(viewName, updateHash = true) {
  const isSchedule = viewName === 'schedule';
  const isAdmin = viewName === 'admin';

  homeView.classList.toggle('hidden', isSchedule || isAdmin);
  scheduleView.classList.toggle('hidden', !isSchedule);
  adminView.classList.toggle('hidden', !isAdmin);

  if (isSchedule) {
    renderScheduleTabs();
    renderScheduleContent();
  } else if (isAdmin) {
    loadAdminLocations();
  }

  window.scrollTo({ top: 0, behavior: 'instant' });

  if (updateHash) {
    const targetHash = isSchedule ? '#schedule' : isAdmin ? '#admin' : '#home';
    if (location.hash !== targetHash) {
      history.pushState({ view: viewName }, '', targetHash);
    }
  }
}

openScheduleBtn.addEventListener('click', () => showView('schedule', true));
backHomeBtn.addEventListener('click', () => showView('home', true));
adminBackBtn.addEventListener('click', () => showView('home', true));

window.addEventListener('popstate', () => {
  if (location.hash === '#schedule') {
    showView('schedule', false);
  } else if (location.hash === '#admin' && isAdminAuthenticated) {
    showView('admin', false);
  } else {
    showView('home', false);
  }
});

// ===== Schedule Rendering =====
function renderScheduleTabs() {
  dayTabsEl.innerHTML = '';

  SCHEDULE_DATA.forEach((dayInfo) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `day-tab${selectedDay === dayInfo.day ? ' active' : ''}`;
    btn.innerHTML = `
      <span class="tab-day">${dayInfo.day}일차</span>
      <span class="tab-date">${dayInfo.date}(${dayInfo.weekday})</span>
    `;
    btn.addEventListener('click', () => {
      selectedDay = dayInfo.day;
      renderScheduleTabs();
      renderScheduleContent();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    dayTabsEl.appendChild(btn);
  });

  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = `day-tab${selectedDay === 'all' ? ' active' : ''}`;
  allBtn.innerHTML = `
    <span class="tab-day">전체</span>
    <span class="tab-date">5일간</span>
  `;
  allBtn.addEventListener('click', () => {
    selectedDay = 'all';
    renderScheduleTabs();
    renderScheduleContent();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  dayTabsEl.appendChild(allBtn);
}

function createDaySection(dayInfo) {
  const section = document.createElement('article');
  section.className = 'day-section';

  const noteHtml = dayInfo.note
    ? `<div class="day-note">📌 비고: ${dayInfo.note}</div>`
    : '';

  const itemsHtml = dayInfo.items
    .map((item) => {
      const meta = TYPE_META[item.type] || TYPE_META.move;
      const highlightCls = item.highlight ? ' is-highlight' : '';
      return `
        <li class="timeline-item${highlightCls}">
          <div class="time-col">
            <span class="time-badge">${item.time}</span>
          </div>
          <div class="detail-col">
            <span class="type-tag ${meta.cls}">${meta.label}</span>
            <p class="event-title">${item.title}</p>
          </div>
        </li>
      `;
    })
    .join('');

  section.innerHTML = `
    <div class="day-banner">
      <div class="day-banner-top">
        <h2 class="day-title">제${dayInfo.day}일 · ${dayInfo.date}(${dayInfo.weekday})</h2>
        <span class="region-pill">${dayInfo.region}</span>
      </div>
      ${noteHtml}
    </div>
    <ol class="timeline">
      ${itemsHtml}
    </ol>
  `;

  return section;
}

function renderScheduleContent() {
  scheduleContentEl.innerHTML = '';

  const targetDays =
    selectedDay === 'all'
      ? SCHEDULE_DATA
      : SCHEDULE_DATA.filter((d) => d.day === selectedDay);

  targetDays.forEach((dayInfo) => {
    scheduleContentEl.appendChild(createDaySection(dayInfo));
  });
}

// ===== GPS Logic =====
function setLoading(isLoading) {
  getGpsBtn.disabled = isLoading;
  btnText.textContent = isLoading ? 'GPS 신호 수신 중...' : '현재 GPS 정보 가져오기';
  if (isLoading) {
    statusText.textContent = '위치를 확인하고 있습니다...';
  }
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
  statusText.textContent = '위치 확인 실패';
}

function clearError() {
  errorBox.textContent = '';
  errorBox.classList.add('hidden');
}

function formatTime(ms) {
  const date = new Date(ms);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function setSyncStatus(type, message) {
  syncStatusEl.className = `sync-status is-${type}`;
  syncStatusEl.textContent = message;
}

async function uploadLocationToFirebase(position) {
  const { latitude, longitude, accuracy, altitude, speed } = position.coords;
  const userName = getSavedUserName() || '이름 없음';

  setSyncStatus('saving', '☁️ Firebase 서버에 위치 등록 중...');

  try {
    const result = await saveLocationToFirebase({
      name: userName,
      latitude,
      longitude,
      accuracy,
      altitude,
      speed,
      timestamp: position.timestamp,
    });

    if (result.status === 'unconfigured') {
      setSyncStatus('warn', '⚠️ firebase-config.js에 Firebase 설정을 입력하면 자동 등록됩니다.');
    } else {
      setSyncStatus('success', `✅ ${userName}님의 위치가 Firebase에 등록되었습니다.`);
    }
  } catch (err) {
    console.error('Firebase 저장 오류:', err);
    setSyncStatus('error', '❌ Firebase 등록에 실패했습니다. 설정 및 네트워크를 확인해 주세요.');
  }
}

function handleSuccess(position) {
  const { latitude, longitude, accuracy, altitude, speed } = position.coords;
  lastCoords = { latitude, longitude };

  latValue.textContent = latitude.toFixed(6);
  lngValue.textContent = longitude.toFixed(6);
  accValue.textContent = accuracy != null ? `±${Math.round(accuracy)} m` : '정보 없음';
  altValue.textContent = altitude != null ? `${altitude.toFixed(1)} m` : '정보 없음';
  speedValue.textContent = speed != null ? `${(speed * 3.6).toFixed(1)} km/h` : '정보 없음';
  timestampEl.textContent = `${formatTime(position.timestamp)} 기준`;

  mapsLink.href = `https://www.google.com/maps?q=${latitude},${longitude}`;

  clearError();
  resultCard.classList.remove('hidden');
  statusText.textContent = 'GPS 정보를 성공적으로 가져왔습니다.';
  setLoading(false);

  uploadLocationToFirebase(position);
}

function handleError(error) {
  setLoading(false);

  switch (error.code) {
    case error.PERMISSION_DENIED:
      showError('위치 권한이 거부되었습니다. 브라우저 설정에서 위치 접근을 허용해 주세요.');
      break;
    case error.POSITION_UNAVAILABLE:
      showError('현재 위치 정보를 가져올 수 없습니다. GPS가 켜져 있는지 확인해 주세요.');
      break;
    case error.TIMEOUT:
      showError('위치 확인 시간이 초과되었습니다. 실외나 창가에서 다시 시도해 주세요.');
      break;
    default:
      showError(`알 수 없는 오류가 발생했습니다. (${error.message})`);
  }
}

function requestGps() {
  clearError();

  if (!('geolocation' in navigator)) {
    showError('이 브라우저는 GPS(Geolocation API)를 지원하지 않습니다.');
    return;
  }

  if (!window.isSecureContext) {
    showError('보안 연결(HTTPS 또는 localhost)에서만 GPS를 사용할 수 있습니다.');
    return;
  }

  setLoading(true);

  navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
  });
}

async function copyCoordinates() {
  if (!lastCoords) return;
  const text = `${lastCoords.latitude.toFixed(6)}, ${lastCoords.longitude.toFixed(6)}`;

  try {
    await navigator.clipboard.writeText(text);
    const original = copyBtn.textContent;
    copyBtn.textContent = '복사 완료!';
    setTimeout(() => {
      copyBtn.textContent = original;
    }, 1500);
  } catch {
    showError(`클립보드 복사에 실패했습니다. 좌표: ${text}`);
  }
}

getGpsBtn.addEventListener('click', requestGps);
copyBtn.addEventListener('click', copyCoordinates);

// ===== User Name Persistence =====
function getSavedUserName() {
  try {
    return (localStorage.getItem(USER_NAME_KEY) || '').trim();
  } catch {
    return '';
  }
}

function saveUserName(name) {
  try {
    localStorage.setItem(USER_NAME_KEY, name);
  } catch {
    // 스토리지 접근 불가 환경에서는 메모리에서만 유지
  }
}

function applyUserNameUI(name) {
  if (!name) return;
  userNameDisplay.textContent = `👤 ${name}님`;
  welcomeText.textContent = `${name}님, 즐거운 일본 여행 되세요!`;
  userChip.classList.remove('hidden');
}

function openNameModal(allowCancel) {
  const current = getSavedUserName();
  nameInput.value = current;
  nameError.classList.add('hidden');
  nameError.textContent = '';
  cancelNameBtn.classList.toggle('hidden', !allowCancel);
  nameModal.classList.remove('hidden');
  setTimeout(() => nameInput.focus(), 50);
}

function closeNameModal() {
  nameModal.classList.add('hidden');
}

nameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const trimmed = nameInput.value.trim();

  if (!trimmed) {
    nameError.textContent = '이름을 입력해 주세요.';
    nameError.classList.remove('hidden');
    nameInput.focus();
    return;
  }

  saveUserName(trimmed);
  applyUserNameUI(trimmed);
  closeNameModal();
});

changeNameBtn.addEventListener('click', () => openNameModal(true));
cancelNameBtn.addEventListener('click', closeNameModal);

// ===== Admin Modal & Location Dashboard =====
function openAdminAuthModal() {
  adminPinInput.value = '';
  adminPinError.textContent = '';
  adminPinError.classList.add('hidden');
  adminAuthModal.classList.remove('hidden');
  setTimeout(() => adminPinInput.focus(), 50);
}

function closeAdminAuthModal() {
  adminAuthModal.classList.add('hidden');
}

openAdminModalBtn.addEventListener('click', () => {
  if (isAdminAuthenticated) {
    showView('admin', true);
  } else {
    openAdminAuthModal();
  }
});

cancelAdminModalBtn.addEventListener('click', closeAdminAuthModal);

adminAuthForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const pin = adminPinInput.value.trim();

  if (pin !== ADMIN_PIN) {
    adminPinError.textContent = '관리자 번호가 올바르지 않습니다.';
    adminPinError.classList.remove('hidden');
    adminPinInput.select();
    return;
  }

  isAdminAuthenticated = true;
  closeAdminAuthModal();
  showView('admin', true);
});

function formatDateKey(ms) {
  if (!ms) return '날짜 없음';
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  return `${y}-${m}-${day} (${weekdays[d.getDay()]})`;
}

function formatDateTimeShort(ms) {
  if (!ms) return '-';
  const d = new Date(ms);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${m}.${day} ${hh}:${mm}:${ss}`;
}

function formatTimeOnly(ms) {
  if (!ms) return '-';
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function setAdminStatus(message, isError = false) {
  if (!message) {
    adminStatusBox.classList.add('hidden');
    adminStatusBox.textContent = '';
    adminStatusBox.classList.remove('is-error');
    return;
  }
  adminStatusBox.textContent = message;
  adminStatusBox.classList.toggle('is-error', isError);
  adminStatusBox.classList.remove('hidden');
}

async function loadAdminLocations() {
  adminContent.innerHTML = '';
  adminFilterChips.innerHTML = '';
  setAdminStatus('Firebase에서 위치 기록을 불러오는 중...');

  try {
    adminLocations = await fetchLocationsFromFirebase();
    adminTotalCount.textContent = `${adminLocations.length}건`;

    if (adminLocations.length === 0) {
      setAdminStatus('아직 등록된 위치 정보가 없습니다.');
      return;
    }

    setAdminStatus('');
    adminFilterValue = 'all';
    renderAdminDashboard();
  } catch (err) {
    console.error('관리자 위치 조회 오류:', err);
    setAdminStatus(
      '위치 기록을 불러오지 못했습니다. Firebase Firestore 규칙(read 허용) 및 네트워크를 확인해 주세요.',
      true
    );
  }
}

function getGroupKey(item) {
  return adminMode === 'name' ? item.name : formatDateKey(item.timestampMs);
}

function renderAdminDashboard() {
  modeByNameBtn.classList.toggle('active', adminMode === 'name');
  modeByNameBtn.setAttribute('aria-selected', String(adminMode === 'name'));
  modeByDateBtn.classList.toggle('active', adminMode === 'date');
  modeByDateBtn.setAttribute('aria-selected', String(adminMode === 'date'));

  // 그룹화
  const groupMap = new Map();
  adminLocations.forEach((item) => {
    const key = getGroupKey(item);
    if (!groupMap.has(key)) {
      groupMap.set(key, []);
    }
    groupMap.get(key).push(item);
  });

  const groupKeys = Array.from(groupMap.keys());
  if (adminMode === 'name') {
    groupKeys.sort((a, b) => a.localeCompare(b, 'ko'));
  } else {
    // 날짜별은 최신 날짜가 먼저 오도록 정렬
    groupKeys.sort((a, b) => b.localeCompare(a));
  }

  // 필터 칩 렌더링
  adminFilterChips.innerHTML = '';

  const allChip = document.createElement('button');
  allChip.type = 'button';
  allChip.className = `filter-chip${adminFilterValue === 'all' ? ' active' : ''}`;
  allChip.textContent = `전체 (${adminLocations.length})`;
  allChip.addEventListener('click', () => {
    adminFilterValue = 'all';
    renderAdminDashboard();
  });
  adminFilterChips.appendChild(allChip);

  groupKeys.forEach((key) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `filter-chip${adminFilterValue === key ? ' active' : ''}`;
    chip.textContent = `${key} (${groupMap.get(key).length})`;
    chip.addEventListener('click', () => {
      adminFilterValue = key;
      renderAdminDashboard();
    });
    adminFilterChips.appendChild(chip);
  });

  // 그룹 목록 렌더링
  adminContent.innerHTML = '';
  const visibleKeys =
    adminFilterValue === 'all'
      ? groupKeys
      : groupKeys.filter((k) => k === adminFilterValue);

  visibleKeys.forEach((key) => {
    const records = groupMap.get(key) || [];
    const groupEl = document.createElement('article');
    groupEl.className = 'admin-group';

    const recordsHtml = records
      .map((rec) => {
        const hasCoords =
          Number.isFinite(rec.latitude) && Number.isFinite(rec.longitude);
        const latStr = hasCoords ? rec.latitude.toFixed(6) : '-';
        const lngStr = hasCoords ? rec.longitude.toFixed(6) : '-';
        const accStr = rec.accuracy != null ? ` · ±${Math.round(rec.accuracy)}m` : '';
        const mapUrl = hasCoords
          ? `https://www.google.com/maps?q=${rec.latitude},${rec.longitude}`
          : '#';

        const primaryLabel =
          adminMode === 'name'
            ? formatDateTimeShort(rec.timestampMs)
            : `👤 ${rec.name}`;
        const timeLabel =
          adminMode === 'name'
            ? `👤 ${rec.name}`
            : formatTimeOnly(rec.timestampMs);

        return `
          <li class="admin-record">
            <div class="record-top">
              <span class="record-primary">${primaryLabel}</span>
              <span class="record-time">${timeLabel}</span>
            </div>
            <div class="record-meta">
              <span class="record-coords">${latStr}, ${lngStr}${accStr}</span>
              <a class="record-map-btn" href="${mapUrl}" target="_blank" rel="noopener noreferrer">
                🗺️ 구글 지도
              </a>
            </div>
          </li>
        `;
      })
      .join('');

    const titlePrefix = adminMode === 'name' ? '👤 ' : '📅 ';
    groupEl.innerHTML = `
      <div class="admin-group-header">
        <h2 class="admin-group-title">${titlePrefix}${key}</h2>
        <span class="admin-group-count">${records.length}건</span>
      </div>
      <ul class="admin-list">
        ${recordsHtml}
      </ul>
    `;

    adminContent.appendChild(groupEl);
  });
}

modeByNameBtn.addEventListener('click', () => {
  adminMode = 'name';
  adminFilterValue = 'all';
  renderAdminDashboard();
});

modeByDateBtn.addEventListener('click', () => {
  adminMode = 'date';
  adminFilterValue = 'all';
  renderAdminDashboard();
});

adminRefreshBtn.addEventListener('click', loadAdminLocations);

// 초기 실행: 저장된 이름 확인 및 해시 상태 반영
const savedName = getSavedUserName();
if (savedName) {
  applyUserNameUI(savedName);
} else {
  openNameModal(false);
}

if (location.hash === '#schedule') {
  showView('schedule', false);
}
