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

let lastCoords = null;

function setLoading(isLoading) {
  getGpsBtn.disabled = isLoading;
  btnText.textContent = isLoading ? 'GPS 신호 수신 중...' : '현재 GPS 정보 가져오기';
  statusText.textContent = isLoading ? '위치를 확인하고 있습니다...' : statusText.textContent;
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
