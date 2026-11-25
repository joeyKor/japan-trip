/**
 * Firebase 콘솔(프로젝트 설정 > 일반 > 내 앱 > 웹 앱) 설정
 */
const firebaseConfig = {
  apiKey: 'AIzaSyAbd8CFBUAnYzQD_iXLIbylBrv134neBAA',
  authDomain: 'self-study-7a60b.firebaseapp.com',
  projectId: 'self-study-7a60b',
  storageBucket: 'self-study-7a60b.appspot.com',
  messagingSenderId: '428215831742',
  appId: '1:428215831742:web:66391b0286fa204e59a2ef',
};

const COLLECTION_NAME = 'japan_trip_locations';

let firestoreDb = null;

function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      !firebaseConfig.apiKey.startsWith('YOUR_') &&
      !firebaseConfig.projectId.startsWith('YOUR_')
  );
}

function getFirestoreDb() {
  if (typeof firebase === 'undefined') {
    throw new Error('Firebase SDK가 로드되지 않았습니다.');
  }
  if (!firestoreDb) {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    firestoreDb = firebase.firestore();
  }
  return firestoreDb;
}

/**
 * 위치정보와 사용자 이름을 Firestore `japan_trip_locations` 컬렉션에 등록합니다.
 */
async function saveLocationToFirebase(data) {
  if (!isFirebaseConfigured()) {
    return { status: 'unconfigured' };
  }

  const db = getFirestoreDb();
  const docRef = await db.collection(COLLECTION_NAME).add({
    name: data.name || '이름 없음',
    latitude: data.latitude,
    longitude: data.longitude,
    accuracy: data.accuracy ?? null,
    altitude: data.altitude ?? null,
    speed: data.speed ?? null,
    measuredAt: new Date(data.timestamp).toISOString(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });

  return { status: 'saved', id: docRef.id };
}

/**
 * Firestore `japan_trip_locations` 컬렉션에서 저장된 위치 기록을 최신순으로 조회합니다.
 */
async function fetchLocationsFromFirebase() {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const db = getFirestoreDb();
  const snapshot = await db.collection(COLLECTION_NAME).get();

  const items = [];
  snapshot.forEach((doc) => {
    const d = doc.data() || {};
    let timestampMs = 0;

    if (d.createdAt && typeof d.createdAt.toMillis === 'function') {
      timestampMs = d.createdAt.toMillis();
    } else if (d.measuredAt) {
      const parsed = Date.parse(d.measuredAt);
      timestampMs = Number.isNaN(parsed) ? 0 : parsed;
    }

    items.push({
      id: doc.id,
      name: (d.name || '이름 없음').trim(),
      latitude: typeof d.latitude === 'number' ? d.latitude : Number(d.latitude),
      longitude: typeof d.longitude === 'number' ? d.longitude : Number(d.longitude),
      accuracy: d.accuracy ?? null,
      altitude: d.altitude ?? null,
      speed: d.speed ?? null,
      measuredAt: d.measuredAt || null,
      timestampMs,
    });
  });

  items.sort((a, b) => b.timestampMs - a.timestampMs);
  return items;
}
