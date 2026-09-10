import { db, isFirebaseConfigured } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, writeBatch, query, where, onSnapshot } from 'firebase/firestore';
import { getUserSession, clearUserSession } from './authSession';

// Real-time listener registry for Firebase singletons
const activeListeners: Record<string, () => void> = {};

export const mergeArraysById = (primary: any[], secondary: any[]) => {
  if (!Array.isArray(primary) && !Array.isArray(secondary)) return [];
  if (!Array.isArray(primary)) return Array.isArray(secondary) ? secondary : [];
  if (!Array.isArray(secondary)) return primary;

  const map = new Map<string, any>();
  
  secondary.forEach((item, index) => {
    if (!item) return;
    const key = item.id ? String(item.id).trim().toLowerCase() : `item_sec_${index}_${JSON.stringify(item)}`;
    map.set(key, item);
  });

  primary.forEach((item, index) => {
    if (!item) return;
    const key = item.id ? String(item.id).trim().toLowerCase() : `item_prim_${index}_${JSON.stringify(item)}`;
    map.set(key, item);
  });

  return Array.from(map.values());
};

const setupRealtimeListener = (key: string) => {
  if (!isFirebaseConfigured || activeListeners[key]) return;
  try {
    const singletonRef = doc(db, 'singletons', key);
    const unsub = onSnapshot(singletonRef, (snapshot) => {
      if (snapshot.exists() && snapshot.data()?.data !== undefined) {
        const snapPayload = snapshot.data();
        const serverData = snapPayload.data;
        window.dispatchEvent(new CustomEvent('db_updated', { detail: { key, data: serverData } }));
      }
    }, (err: any) => {
      if (err?.code !== 'unavailable') {
        console.warn(`Realtime snapshot error for ${key}:`, err?.message || err);
      }
    });

    // Also listen to collection changes for dailyWorkUploads
    if (key === 'dailyWorkUploads') {
      const colUnsub = onSnapshot(collection(db, 'dailyWorkUploads'), (colSnap) => {
        if (!colSnap.empty) {
          const list = colSnap.docs.map(d => ({ ...d.data(), id: d.id }));
          
          let deletedIds: string[] = [];
          try {
            const rawDeleted = localStorage.getItem('dailyWorkUploads_deleted');
            if (rawDeleted) deletedIds = JSON.parse(rawDeleted);
          } catch (_) {}

          let localUploads: any[] = [];
          try {
            const rawLocal = localStorage.getItem('dailyWorkUploads');
            if (rawLocal) localUploads = JSON.parse(rawLocal);
          } catch (_) {}

          const merged = mergeArraysById(list, localUploads).filter(u => !deletedIds.includes(u.id));
          merged.sort((a: any, b: any) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
          
          try {
            localStorage.setItem('dailyWorkUploads', JSON.stringify(merged));
          } catch (_) {}

          window.dispatchEvent(new CustomEvent('db_updated', { detail: { key: 'dailyWorkUploads', data: merged } }));
        }
      }, (err: any) => {
        if (err?.code !== 'unavailable') {
          console.warn("Realtime dailyWorkUploads collection error:", err?.message || err);
        }
      });
      activeListeners[`${key}_col`] = colUnsub;
    }

    // Also listen to collection changes for courses / post library
    if (key === 'courses') {
      const colUnsub = onSnapshot(collection(db, 'courses'), (colSnap) => {
        if (!colSnap.empty) {
          const list = colSnap.docs.map(d => ({ ...d.data(), id: d.id }));
          
          let deletedIds: string[] = [];
          try {
            const rawDeleted = localStorage.getItem('courses_deleted');
            if (rawDeleted) deletedIds = JSON.parse(rawDeleted);
          } catch (_) {}

          let localCourses: any[] = [];
          try {
            const rawLocal = localStorage.getItem('courses');
            if (rawLocal) localCourses = JSON.parse(rawLocal);
          } catch (_) {}

          const merged = mergeArraysById(list, localCourses).filter(u => !deletedIds.includes(String(u.id)));
          merged.sort((a: any, b: any) => {
            const timeA = new Date(a.createdAt || a.date || a.updatedAt || 0).getTime() || 0;
            const timeB = new Date(b.createdAt || b.date || b.updatedAt || 0).getTime() || 0;
            return timeB - timeA;
          });
          
          try {
            localStorage.setItem('courses', JSON.stringify(merged));
          } catch (_) {}

          window.dispatchEvent(new CustomEvent('db_updated', { detail: { key: 'courses', data: merged } }));
        }
      }, (err: any) => {
        if (err?.code !== 'unavailable') {
          console.warn("Realtime courses collection error:", err?.message || err);
        }
      });
      activeListeners[`${key}_col`] = colUnsub;
    }

    // Also listen to collection changes for staffs / employees
    if (key === 'staffs') {
      const colUnsub = onSnapshot(collection(db, 'staffs'), (colSnap) => {
        if (!colSnap.empty) {
          const list = colSnap.docs.map(d => ({ ...d.data(), id: d.id }));
          
          let deletedIds: string[] = [];
          try {
            const rawDeleted = localStorage.getItem('staffs_deleted');
            if (rawDeleted) deletedIds = JSON.parse(rawDeleted);
          } catch (_) {}

          let localStaffs: any[] = [];
          try {
            const rawLocal = localStorage.getItem('staffs');
            if (rawLocal) localStaffs = JSON.parse(rawLocal);
          } catch (_) {}

          const merged = mergeArraysById(list, localStaffs).filter(u => !deletedIds.includes(String(u.id)));
          
          try {
            localStorage.setItem('staffs', JSON.stringify(merged));
          } catch (_) {}

          window.dispatchEvent(new CustomEvent('db_updated', { detail: { key: 'staffs', data: merged } }));
        }
      }, (err: any) => {
        if (err?.code !== 'unavailable') {
          console.warn("Realtime staffs collection error:", err?.message || err);
        }
      });
      activeListeners[`${key}_col`] = colUnsub;
    }

    activeListeners[key] = unsub;
  } catch (e) {
    console.warn(`Failed to setup realtime listener for ${key}:`, e);
  }
};

// --- Database Health & Usage Tracking ---
export interface DbMetrics {
  date: string;
  readsToday: number;
  writesToday: number;
  cachedReadsToday: number;
  totalReadsAllTime: number;
  totalWritesAllTime: number;
  lastWriteTime: string | null;
  lastReadTime: string | null;
  isFirebaseConnected?: boolean;
  healthStatus?: string;
  healthScore?: number;
}

const getStoredMetrics = (): DbMetrics => {
  const todayStr = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem('dbMetricsStats');
    if (raw) {
      const parsed: DbMetrics = JSON.parse(raw);
      if (parsed.date !== todayStr) {
        return {
          date: todayStr,
          readsToday: 0,
          writesToday: 0,
          cachedReadsToday: 0,
          totalReadsAllTime: parsed.totalReadsAllTime || 0,
          totalWritesAllTime: parsed.totalWritesAllTime || 0,
          lastWriteTime: parsed.lastWriteTime || null,
          lastReadTime: parsed.lastReadTime || null,
        };
      }
      return parsed;
    }
  } catch (e) {}

  return {
    date: todayStr,
    readsToday: 0,
    writesToday: 0,
    cachedReadsToday: 0,
    totalReadsAllTime: 0,
    totalWritesAllTime: 0,
    lastWriteTime: null,
    lastReadTime: null,
  };
};

const recordReadOperation = (count: number = 1) => {
  if (count <= 0) return;
  const metrics = getStoredMetrics();
  const now = new Date().toLocaleTimeString();
  
  metrics.readsToday += count;
  metrics.totalReadsAllTime += count;
  metrics.lastReadTime = now;
  try {
    localStorage.setItem('dbMetricsStats', JSON.stringify(metrics));
  } catch (e) {}
};

const recordWriteOperation = (count: number = 1) => {
  if (count <= 0) return;
  const metrics = getStoredMetrics();
  const now = new Date().toLocaleTimeString();
  
  metrics.writesToday += count;
  metrics.totalWritesAllTime += count;
  metrics.lastWriteTime = now;
  try {
    localStorage.setItem('dbMetricsStats', JSON.stringify(metrics));
  } catch (e) {}
};

export const getDbHealthMetrics = (): DbMetrics => {
  const metrics = getStoredMetrics();
  return {
    ...metrics,
    isFirebaseConnected: isFirebaseConfigured,
    healthStatus: isFirebaseConfigured ? "Direct Database Connection" : "Local Database Storage",
    healthScore: 100
  };
};

export const resetDbHealthMetrics = () => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const reset: DbMetrics = {
    date: todayStr,
    readsToday: 0,
    writesToday: 0,
    cachedReadsToday: 0,
    totalReadsAllTime: 0,
    totalWritesAllTime: 0,
    lastWriteTime: null,
    lastReadTime: null,
  };
  localStorage.setItem('dbMetricsStats', JSON.stringify(reset));
  return reset;
};

// Direct Database Fetcher without caching layers
const getData = async (key: string, defaultValue: any) => {
  setupRealtimeListener(key);

  if (isFirebaseConfigured) {
    try {
      const fetchFirebase = async () => {
        // 1. Fetch from singletons collection in database
        try {
          const singletonRef = doc(db, 'singletons', key);
          const singletonSnap = await getDoc(singletonRef);
          if (singletonSnap.exists() && singletonSnap.data()?.data !== undefined) {
            const snapData = singletonSnap.data();
            return snapData.data;
          }
        } catch (singErr: any) {
          if (singErr?.code === 'unavailable' || singErr?.message?.includes('offline')) {
            return null;
          }
          console.warn(`Error fetching singleton ${key}:`, singErr?.message || singErr);
        }

        // 2. Fetch from direct collection if singleton is not present
        if (Array.isArray(defaultValue) || ['forms', 'students', 'zoomLinks', 'formSubmissions', 'classes', 'subjects'].includes(key)) {
          try {
            const querySnapshot = await getDocs(collection(db, key));
            if (!querySnapshot.empty) {
              const colData = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id }));
              if (colData.length > 0) {
                // Keep singleton in sync
                setDoc(doc(db, 'singletons', key), { data: colData, updatedAt: Date.now() }, { merge: false }).catch(() => {});
                return colData;
              }
            }
          } catch (colErr: any) {
            if (colErr?.code !== 'unavailable') {
              console.warn(`Error fetching collection ${key}:`, colErr?.message || colErr);
            }
          }
        }

        return null;
      };

      const timeoutMs = 2500;
      const fbData = await Promise.race([
        fetchFirebase(),
        new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs))
      ]);

      if (fbData !== null && fbData !== undefined) {
        recordReadOperation(1);
        return fbData;
      }
    } catch (error: any) {
      console.warn(`Firebase error fetching ${key}.`, error);
    }
  }

  // Fallback to local store on computer if network fails or offline
  try {
    const rawValue = localStorage.getItem(key);
    if (rawValue && rawValue !== 'undefined' && rawValue !== 'null') {
      recordReadOperation(1);
      return JSON.parse(rawValue);
    }
  } catch (e) {
    console.warn(`Error reading stored data for ${key}:`, e);
  }

  recordReadOperation(1);
  return defaultValue;
};

// Direct Database Saver - writes directly to Cloud Database and local store
const saveData = async (key: string, data: any) => {
  const cleanData = JSON.parse(JSON.stringify(data ?? null));
  const now = Date.now();

  recordWriteOperation(1);

  // Store in local computer database
  try {
    localStorage.setItem(key, JSON.stringify(cleanData));
    localStorage.setItem(`${key}_lastSavedAt`, String(now));
  } catch (e) {
    console.warn(`Failed to save ${key} to storage.`, e);
  }

  // Dispatch custom event for immediate UI updates
  window.dispatchEvent(new CustomEvent('db_updated', { detail: { key, data: cleanData } }));

  if (isFirebaseConfigured) {
    try {
      const singletonRef = doc(db, 'singletons', key);
      await setDoc(singletonRef, { data: cleanData, updatedAt: now }, { merge: false });

      // If key is students/forms/staffs/etc., sync individual documents cleanly
      if (Array.isArray(cleanData) && ['forms', 'students', 'staffs', 'employeeTasks', 'dailyWorkUploads', 'zoomLinks', 'formSubmissions'].includes(key)) {
        for (const item of cleanData.slice(0, 100)) {
          if (item && item.id) {
            setDoc(doc(db, key, String(item.id)), { ...item, updatedAt: item.updatedAt || new Date().toISOString() }, { merge: true }).catch(() => {});
          }
        }
      }
    } catch (error: any) {
      console.warn(`Firebase sync warning for ${key}:`, error?.message || error);
    }
  }
};

export const getAdminSettings = () => getData('adminSettings', {
  username: "agaramdhines",
  password: "0756452527Dd",
  email: "Ddhinesnivas111@gmail.com",
  profileImage: "/logo.png",
  instituteName: "Agaram Dhines Online Academy"
});
export const saveAdminSettings = (settings: any) => saveData('adminSettings', settings);

export const getHomePageContent = () => getData('homePageContent', {
  heroTagText: "New Version 2.0 Released",
  heroTitle: "WELCOME TO AGARAM DHINES ONLINE ACADEMY",
  button1Text: "வகுப்புகள் பற்றி அறிந்து கொள்ள",
  button1Url: "https://www.agaramdhines.lk/courses/",
  button2Text: "Visit agaramdhines.lk",
  button2Url: "https://www.agaramdhines.lk",
  button3Text: "Login Portal",
  slides: [
    {
      id: "default-1",
      image: "https://img.freepik.com/free-vector/flat-design-e-learning-concept-with-laptop_23-2148593003.jpg",
      title: "Welcome to Agaram Dhines Academy",
      subtitle: "Learn from anywhere, anytime.",
      isActive: true
    },
    {
      id: "default-2",
      image: "https://img.freepik.com/free-vector/online-education-banner-template_23-2149005626.jpg",
      title: "New Classes Starting Soon!",
      subtitle: "Enroll now for the upcoming semester.",
      isActive: true
    },
    {
      id: "default-3",
      image: "https://img.freepik.com/free-vector/gradient-back-school-sale-banner-template_23-2149045028.jpg",
      title: "Special Discount on Zoom Classes",
      subtitle: "Get up to 20% off on early registration.",
      isActive: true
    }
  ],
  navItems: [
    { id: 'Home', name: 'Home', link: '#' },
    { id: 'WEBSITE', name: 'WEBSITE', link: 'https://www.agaramdhines.lk/' },
    { id: 'COURSES', name: 'COURSES', link: 'https://www.agaramdhines.lk/courses/' },
    { id: 'ZOOM CLASS', name: 'ZOOM CLASS', link: 'https://www.agaramdhines.lk/category/%e0%ae%a4%e0%ae%ae%e0%ae%bf%e0%ae%b4%e0%af%8d-zoom-class-06-to-11/' },
    { id: 'REGISTRATION', name: 'REGISTRATION', link: 'https://www.agaramdhines.lk/lp-profile/' },
    { id: 'YOUTUBE', name: 'YOUTUBE', link: 'https://www.youtube.com/@agaramdhines' },
    { id: 'Login', name: 'Login', link: '#login' }
  ],
  noticeBanner: "",
  showNoticeBanner: false,
  noticeBoardTitle: "புதிய அறிவிப்புகள் / Notice Board",
  notices: [
    {
      id: "notice-1",
      title: "தரம் 06 - 11 புதிய தமிழ் Zoom வகுப்புகள் ஆரம்பம்",
      date: "2026-07-27",
      type: "Important",
      content: "புதிய தவணைக்கான தமிழ் ஆன்லைன் நேரலை Zoom வகுப்புகள் வெற்றிகரமாக ஆரம்பமாகியுள்ளது. மாணவர்கள் உடனே இணையலாம்.",
      link: "https://www.agaramdhines.lk/courses/",
      isPinned: true
    },
    {
      id: "notice-2",
      title: "தரம் 11 சிறப்பு வினா விடை கருத்தரங்கு",
      date: "2026-07-25",
      type: "Event",
      content: "வரவிருக்கும் சாதாரண தரப் பரீட்சைக்கான மாதிரி வினாத்தாள் கலந்துரையாடல் வெள்ளி மற்றும் சனிக்கிழமைகளில் நடைபெறும்.",
      link: "",
      isPinned: false
    }
  ],
  footerDescription: "The ultimate education management ERP with all advance features to run your institution smoothly.",
  facebookUrl: "https://facebook.com",
  twitterUrl: "https://twitter.com",
  instagramUrl: "https://instagram.com",
  playStoreUrl: "https://play.google.com",
  appStoreUrl: "https://apple.com",
  contactPhone: "0778054232",
  contactWhatsapp: "94778054232",
  contactEmail: "Ddhinesnivas111@gmail.com"
});

export const saveHomePageContent = (content: any) => saveData('homePageContent', content);

export const getChatbotSettings = () => getData('chatbotSettings', {
  grade06: {
    title: "தரம் 06",
    subjects: [
      {
        id: "g06_tamil",
        name: "தமிழ்",
        teacher: "Mr. Dhines",
        fee: "Rs. 1300",
        startDate: "புதிய வகுப்புகள் ஆரம்பம்! நவீன தொழில்நுட்பத்துடன் தமிழை எளிதாகக் கற்க இணையுங்கள்.",
        time: "திங்கள், ஞாயிறு (Mon, Sun): 5.30 PM - 6.30 PM",
        features: "AI தொழில்நுட்பம் & தனிப்பட்ட கவனம்!",
        contact: "0778054232",
        whatsappLink: "https://chat.whatsapp.com/I0u8we2kPKO5SrQRBpk3CN",
        registrationLink: "",
        imageLink: ""
      }
    ]
  },
  grade07: {
    title: "தரம் 07",
    subjects: [
      {
        id: "g07_tamil",
        name: "தமிழ்",
        teacher: "Mr. Dhines",
        fee: "Rs. 1300",
        startDate: "புதிய வகுப்புகள் ஆரம்பம்! நவீன தொழில்நுட்பத்துடன் தமிழை கற்க இணையுங்கள்.",
        time: "புதன் (Wednesday): 5.30 PM - 6.30 PM",
        features: "AI தொழில்நுட்பம் & தனிப்பட்ட கவனம்!",
        contact: "0778054232",
        whatsappLink: "https://chat.whatsapp.com/LxJ5QcqOAXaFtpHdf2YoTD",
        registrationLink: "",
        imageLink: ""
      }
    ]
  },
  grade08: {
    title: "தரம் 08",
    subjects: [
      {
        id: "g08_tamil",
        name: "தமிழ்",
        teacher: "Mr. Dhines",
        fee: "Rs. 1300",
        startDate: "புதிய வகுப்புகள் ஆரம்பம்! நவீன தொழில்நுட்பத்துடன் தமிழை கற்க இணையுங்கள்.",
        time: "வியாழன் (Thursday): 5.30 PM - 7.30 PM",
        features: "AI தொழில்நுட்பம் & தனிப்பட்ட கவனம்!",
        contact: "0778054232",
        whatsappLink: "https://chat.whatsapp.com/Hyd9B73RaLj1H3GU2jCJKa",
        registrationLink: "",
        imageLink: ""
      }
    ]
  },
  grade09: {
    title: "தரம் 09",
    subjects: [
      {
        id: "g09_tamil",
        name: "தமிழ்",
        teacher: "Mr. Dhines",
        fee: "Rs. 1300",
        startDate: "புதிய வகுப்புகள் ஆரம்பம்! நவீன தொழில்நுட்பத்துடன் தமிழை கற்க இணையுங்கள்.",
        time: "ஞாயிறு (Sunday): 6.30 PM - 8.30 PM",
        features: "AI தொழில்நுட்பம் & தனிப்பட்ட கவனம்!",
        contact: "0778054232",
        whatsappLink: "https://chat.whatsapp.com/Lv4GRdFdggdKPel8Cvf1DC",
        registrationLink: "",
        imageLink: ""
      }
    ]
  },
  grade10: {
    title: "தரம் 10",
    subjects: [
      {
        id: "g10_tamil",
        name: "தமிழ்",
        teacher: "Mr. Dhines",
        fee: "Rs. 1500",
        startDate: "புதிய வகுப்புகள் ஆரம்பம். சிறந்த பெறுபேறுகளைப் பெற இப்போதே இணையுங்கள்!",
        time: "Theory: வெள்ளி & சனி (6.30 PM - 7.30 PM) | Paper Class: செவ்வாய் (9.00 PM - 10.30 PM)",
        features: "பாடவிளக்கம் + PDF Notes + Recordings அனைத்தும் உண்டு!",
        contact: "0778054232",
        whatsappLink: "https://chat.whatsapp.com/LAlOco0VwbvDtpoONNjdIC",
        registrationLink: "",
        imageLink: ""
      }
    ]
  },
  grade11: {
    title: "தரம் 11",
    subjects: [
      {
        id: "g11_tamil",
        name: "தமிழ்",
        teacher: "Mr. Dhines",
        fee: "Rs. 1500",
        startDate: "புதிய வகுப்புகள் ஆரம்பம். சிறந்த பெறுபேறுகளைப் பெற இப்போதே இணையுங்கள்!",
        time: "Theory: வெள்ளி & சனி (6.30 PM - 7.30 PM) | Paper Class: செவ்வாய் (9.00 PM - 10.30 PM)",
        features: "பாடவிளக்கம் + PDF Notes + Recordings அனைத்தும் உண்டு!",
        contact: "0778054232",
        whatsappLink: "https://chat.whatsapp.com/LAlOco0VwbvDtpoONNjdIC",
        registrationLink: "",
        imageLink: ""
      }
    ]
  },
    fees: {
    items: [
      { label: "தரம் 06 - 09 வரை", amount: "Rs. 1300" },
      { label: "தரம் 10 - 11", amount: "Rs. 1500" },
      { label: "வினா விடை வகுப்பு", amount: "Rs. 1500" },
      { label: "30 நாள் பாடநெறி", amount: "Rs. 6000" },
      { label: "வினா விடை பாடநெறி", amount: "Rs. 6000" }
    ],
    noteTitle: "கட்டண விபரங்கள்",
    noteDescription: "அகரம் தினேஸ் Online Academy வழங்கும் 2026 ஆம் கல்வி ஆண்டிற்கான முதலாம் தவணை தமிழ் வகுப்புகள். தமிழ் மற்றும் ஆங்கில மொழிமூல (Tamil & English Medium) மாணவர்களுக்கானது.",
    noteFooter: "குறிப்பு: முற்பதிவு கட்டணம் செலுத்தி வகுப்பில் இணைய முடியும்."
  },
  contact: {
    whatsapp: "0778054232",
    phone: "0778054232",
    message: "எந்தவொரு சந்தேகங்களுக்கும் எங்களை தொடர்பு கொள்ளவும்:"
  }
});
export const saveChatbotSettings = (settings: any) => saveData('chatbotSettings', settings);

export const getPasswordRequests = () => getData('passwordRequests', []);
export const savePasswordRequests = (requests: any) => saveData('passwordRequests', requests);

export const normalizeSub = (str: string) => {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/\(தரம்\s*\d+\)/gi, '')
    .replace(/\(grade\s*\d+\)/gi, '')
    .replace(/தரம்\s*\d+/gi, '')
    .replace(/grade\s*\d+/gi, '')
    .replace(/[\(\)\-\:\,\.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export const getCanonicalSubject = (s: string): string => {
  if (!s) return "";
  let clean = s.trim().toLowerCase()
    .replace(/\((?:தரம்|grade)\s*\d+\)/gi, ' ')
    .replace(/\b(?:தரம்|grade)\s*\d+\b/gi, ' ')
    .replace(/\b(?:o\/l|a\/l|ol|al)\b/gi, ' ')
    .replace(/[\(\)\[\]\-–—:,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (
    (clean.includes("30 நாள்") || clean.includes("30 days") || clean.includes("30-day") || clean.includes("30 day")) &&
    (clean.includes("15") || clean.includes("15 30") || clean.includes("15 - 30") || clean.includes("15 தொடக்கம் 30") || clean.includes("இரண்டாம் பகுதி") || clean.includes("part 2"))
  ) {
    return "tamil_30_days_part2";
  }

  if (clean.includes("30 நாள்") || clean.includes("30 days") || clean.includes("30-day") || clean.includes("30 day")) {
    return "tamil_30_days";
  }

  // 2026 Question & Answer / Paper Class (Strictly isolated from general Q&A and other courses)
  if (
    (clean.includes("2026") || clean.includes("26") || s.includes("2026") || s.includes("26")) &&
    (clean.includes("வினா விடை") || clean.includes("வினாவிடை") || clean.includes("வினா-விடை") || 
     clean.includes("paper class") || clean.includes("பேப்பர் கிளாஸ்") || clean.includes("q&a") || 
     clean.includes("வினாத்தாள்") || clean.includes("மாதிரி வினா") || clean.includes("வினாக்கள்") ||
     clean.includes("past paper") || clean.includes("model paper") || clean.includes("வினா பத்திரம்"))
  ) {
    return "tamil_q_and_a_2026";
  }

  if (
    clean.includes("வினா விடை") || clean.includes("வினாவிடை") || clean.includes("வினா-விடை") || 
    clean.includes("paper class") || clean.includes("பேப்பர் கிளாஸ்") || clean.includes("q&a") || 
    clean.includes("வினாத்தாள்") || clean.includes("மாதிரி வினா") || clean.includes("வினாக்கள்") ||
    clean.includes("past paper") || clean.includes("model paper")
  ) {
    return "tamil_q_and_a";
  }

  // Language & Literature combinations (e.g., தமிழ் மொழி இலக்கியம், தமிழ் மொழியும் இலக்கியமும்) -> Standard Tamil
  if ((clean.includes("மொழி") || clean.includes("மொழியும்")) && clean.includes("இலக்கிய") && !clean.includes("நயம்") && !clean.includes("nayam")) {
    return "tamil";
  }

  // Literature / இலக்கிய நயம் (Tamil Literature Aesthetic Appreciation, including 20-day course)
  if (
    clean.includes("இலக்கிய நயம்") || 
    clean.includes("நயம்") || 
    clean.includes("nayam") || 
    clean.includes("literature") ||
    (clean.includes("இலக்கிய") && !clean.includes("மொழி"))
  ) {
    return "tamil_literature";
  }

  if (clean.includes("மொழி வளம்") || clean.includes("வளம்") || clean.includes("game")) {
    return "tamil_game";
  }

  if (clean.includes("தமிழ்") || clean.includes("tamil")) {
    return "tamil";
  }

  if (clean.includes("விஞ்ஞானம்") || clean.includes("science") || clean.includes("அறிவியல்")) {
    return "science";
  }

  if (clean.includes("கணிதம்") || clean.includes("maths") || clean.includes("mathematics") || clean.includes("கணிதவியல்")) {
    return "maths";
  }

  if (clean.includes("ஆங்கிலம்") || clean.includes("english")) {
    return "english";
  }

  if (clean.includes("வரலாறு") || clean.includes("history")) {
    return "history";
  }

  if (clean.includes("ict") || clean.includes("தகவல் தொடர்பாடல்") || clean.includes("தகவல் தொழில்நுட்பம்") || clean.includes("computer") || clean.includes("கணினி")) {
    return "ict";
  }

  if (clean.includes("வர்த்தகம்") || clean.includes("வணிக") || clean.includes("commerce") || clean.includes("கணக்கியல்") || clean.includes("accounting") || clean.includes("business")) {
    return "commerce";
  }

  if (clean.includes("புவியியல்") || clean.includes("geography")) {
    return "geography";
  }

  if (clean.includes("குடிமை") || clean.includes("குடியியல்") || clean.includes("civics")) {
    return "civics";
  }

  if (clean.includes("சமயம்") || clean.includes("இந்து சமயம்") || clean.includes("சைவ சமயம்") || clean.includes("இஸ்லாம்") || clean.includes("கிறிஸ்தவம்") || clean.includes("religion") || clean.includes("hinduism") || clean.includes("islam") || clean.includes("christianity")) {
    return "religion";
  }

  if (clean.includes("சுகாதாரம்") || clean.includes("உடற்கல்வி") || clean.includes("health") || clean.includes("physical education")) {
    return "health";
  }

  if (clean.includes("சித்திரம்") || clean.includes("art") || clean.includes("கலை")) {
    return "art";
  }

  if (clean.includes("சங்கீதம்") || clean.includes("இசை") || clean.includes("music")) {
    return "music";
  }

  if (clean.includes("நடனம்") || clean.includes("dance") || clean.includes("பரதநாட்டியம்")) {
    return "dance";
  }

  if (clean.includes("நாடகம்") || clean.includes("drama")) {
    return "drama";
  }

  if (clean === "all" || clean === "general" || clean === "public" || clean === "அனைத்து" || clean === "அனைத்து பாடங்களும்" || clean === "பொது" || clean === "all subjects" || clean === "uncategorized" || clean === "e-learning") {
    return "ALL_WILDCARD";
  }

  return clean;
};

export const areSubjectsMatching = (itemSub: string, studentSub: string): boolean => {
  if (!itemSub || !studentSub) return false;
  const rawItem = String(itemSub).trim().toLowerCase();
  const rawSt = String(studentSub).trim().toLowerCase();

  if (rawItem === rawSt) return true;

  const wildcards = ["all", "general", "public", "e-learning", "uncategorized", "அனைத்து", "அனைத்து பாடங்களும்", "all subjects", "பொது"];
  if (wildcards.includes(rawItem) || wildcards.includes(rawSt)) return true;

  const cleanItem = rawItem.replace(/[\(\)\[\]\-–—:,]/g, ' ').replace(/\s+/g, ' ').trim();
  const cleanSt = rawSt.replace(/[\(\)\[\]\-–—:,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleanItem === cleanSt) return true;

  const canonItem = getCanonicalSubject(rawItem);
  const canonSt = getCanonicalSubject(rawSt);

  if (canonItem && canonSt) {
    if (canonItem === "ALL_WILDCARD" || canonSt === "ALL_WILDCARD") return true;
    if (canonItem === canonSt) return true;
    return false;
  }

  return false;
};

export const sanitizeSubjectList = (subs: any[]): string[] => {
  if (!Array.isArray(subs)) return [];
  const map = new Map<string, string>();
  subs.forEach((s: any) => {
    if (!s) return;
    let name = String(s).trim();
    if (!name) return;
    if (name.toLowerCase() === "tamil") {
      name = "தமிழ்";
    }
    const lower = name.toLowerCase();
    if (
      lower === "இலக்கிய நயம்" ||
      lower === "இலக்கிய நயம் (தரம் 11)" ||
      lower === "தமிழ் இலக்கிய நயம் (தரம் 11)" ||
      lower === "தமிழ் இலக்கிய நயம் 20 நாள் பாடநெறி" ||
      lower === "தமிழ் இலக்கிய நயம் 20 நாள்" ||
      lower === "இலக்கிய நயம் 20 நாள் பாடநெறி" ||
      lower === "இலக்கிய நயம் 20 நாள்" ||
      lower.includes("இலக்கிய நயம் 20 நாள்")
    ) {
      name = "தமிழ் இலக்கிய நயம்";
    }
    const lowerKey = name.toLowerCase();
    if (!map.has(lowerKey)) {
      map.set(lowerKey, name);
    }
  });
  return Array.from(map.values());
};

// --- Student Data Sanitization, Deduplication & Tombstone Registry ---

// --- Student Data Sanitization & Lossless Persistence ---

export const deduplicateAndSanitizeStudents = (students: any[]): any[] => {
  if (!Array.isArray(students)) return [];

  const map = new Map<string, any>();

  students.forEach((student: any, index: number) => {
    if (!student || typeof student !== 'object') return;

    // Determine strict unique key: strictly unique student ID, or generated composite key
    const rawId = student.id !== undefined && student.id !== null ? String(student.id).trim() : '';
    const key = rawId ? rawId.toLowerCase() : `student_entry_${student.studentCode || ''}_${student.rollNo || ''}_${student.name || ''}_${student.grade || ''}_${student.phone || ''}_${index}`.toLowerCase();

    const studentCleanSubjects = sanitizeSubjectList(student.subjects || student.enrolledClasses || []);

    if (map.has(key)) {
      const existing = map.get(key);
      const mergedSubjects = sanitizeSubjectList([...(existing.subjects || existing.enrolledClasses || []), ...studentCleanSubjects]);
      map.set(key, {
        ...existing,
        ...student,
        id: existing.id || rawId || ("STU" + Math.floor(100000 + Math.random() * 900000)),
        name: student.name || existing.name || "Student",
        rollNo: student.rollNo !== undefined && student.rollNo !== null ? String(student.rollNo).trim() : (existing.rollNo || ''),
        username: student.username || existing.username || student.rollNo || "student",
        grade: student.grade || existing.grade || '',
        subjects: mergedSubjects,
        enrolledClasses: mergedSubjects,
        zoomBlocked: Boolean(student.zoomBlocked !== undefined ? student.zoomBlocked : existing.zoomBlocked)
      });
    } else {
      const cleanStudent = {
        ...student,
        id: rawId || ("STU" + Math.floor(100000 + Math.random() * 900000)),
        name: student.name ? String(student.name).trim() : "Student",
        rollNo: student.rollNo !== undefined && student.rollNo !== null ? String(student.rollNo).trim() : '',
        username: student.username ? String(student.username).trim() : (student.rollNo ? String(student.rollNo).trim() : "student"),
        password: student.password || "1234",
        grade: student.grade ? String(student.grade).trim() : '',
        phone: student.phone !== undefined && student.phone !== null ? String(student.phone).trim() : '',
        email: student.email ? String(student.email).trim() : '',
        district: student.district ? String(student.district).trim() : '',
        guardianName: student.guardianName ? String(student.guardianName).trim() : '',
        address: student.address ? String(student.address).trim() : '',
        dob: student.dob ? String(student.dob).trim() : '',
        gender: student.gender ? String(student.gender).trim() : '',
        image: student.image || '',
        subjects: studentCleanSubjects,
        enrolledClasses: studentCleanSubjects,
        zoomBlocked: Boolean(student.zoomBlocked)
      };
      map.set(key, cleanStudent);
    }
  });

  return Array.from(map.values());
};

export const getStudents = async (): Promise<any[]> => {
  // Read directly from database
  const raw = await getData('students', []);
  if (Array.isArray(raw)) {
    return deduplicateAndSanitizeStudents(raw);
  }
  return [];
};

export const saveStudents = async (students: any) => {
  const cleanList = deduplicateAndSanitizeStudents(Array.isArray(students) ? students : []);
  const res = await saveData('students', cleanList);
  return res;
};

export const deleteStudent = async (id: string | number) => {
  const targetId = String(id).trim().toLowerCase();
  const currentStudents = await getStudents();

  // Strictly filter out only the exact student by ID
  const updatedStudents = (currentStudents || []).filter((s: any) => {
    if (!s) return false;
    const sId = String(s.id || '').trim().toLowerCase();
    return sId !== targetId;
  });

  await saveData('students', updatedStudents);

  try {
    const session = getUserSession();
    if (session) {
      const sessId = String(session?.id || session?.student_id || '').trim().toLowerCase();
      if (sessId === targetId) {
        clearUserSession();
      }
    }
  } catch (_) {}

  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'students', String(id)));
    } catch (_) {}
  }

  return updatedStudents;
};

export const isZoomLinkExpired = (link: any, bufferHours = 2): boolean => {
  if (!link) return false;

  // 1. If explicit datetime is provided (e.g. "2026-09-09T10:00:00" or "2026-09-09 10:00")
  if (link.datetime) {
    const classTime = new Date(link.datetime).getTime();
    if (!isNaN(classTime)) {
      // Buffer: link remains accessible during class and up to bufferHours (default 2 hours) after scheduled time
      const expiry = classTime + (bufferHours * 60 * 60 * 1000);
      return Date.now() > expiry;
    }
  }

  // 2. If date + endTime or startTime is provided
  if (link.date) {
    const timeStr = link.endTime || link.startTime || "23:59";
    const combinedStr = `${link.date}T${timeStr.length === 5 ? timeStr : timeStr.padStart(5, '0')}`;
    const classTime = new Date(combinedStr).getTime();
    if (!isNaN(classTime)) {
      const expiry = classTime + (bufferHours * 60 * 60 * 1000);
      return Date.now() > expiry;
    }
  }

  return false;
};

export const getZoomLinks = async () => {
  const rawLinks = await getData('zoomLinks', []);
  const links = Array.isArray(rawLinks) ? rawLinks : [];

  // Filter out any links whose class ended more than 2 hours ago
  const activeLinks = links.filter(l => !isZoomLinkExpired(l, 2));
  const expiredLinks = links.filter(l => isZoomLinkExpired(l, 2));

  // Auto-delete expired Zoom links from database so they don't linger
  if (expiredLinks.length > 0) {
    if (isFirebaseConfigured) {
      expiredLinks.forEach(exp => {
        if (exp?.id) {
          deleteDoc(doc(db, 'zoomLinks', String(exp.id))).catch(() => {});
        }
      });
    }
    saveData('zoomLinks', activeLinks).catch(() => {});
  }

  return activeLinks;
};
export const saveZoomLinks = (links: any) => saveData('zoomLinks', Array.isArray(links) ? links : []);

export const getCourses = async (): Promise<any[]> => {
  setupRealtimeListener('courses');

  let deletedIds: string[] = [];
  try {
    const rawDeleted = localStorage.getItem('courses_deleted');
    if (rawDeleted) deletedIds = JSON.parse(rawDeleted);
  } catch (_) {}

  let localCourses: any[] = [];
  try {
    const rawLocal = localStorage.getItem('courses');
    if (rawLocal) {
      localCourses = JSON.parse(rawLocal);
    }
  } catch (_) {}

  let remoteCourses: any[] = [];

  if (isFirebaseConfigured) {
    try {
      const querySnapshot = await getDocs(collection(db, 'courses'));
      if (!querySnapshot.empty) {
        remoteCourses = querySnapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id
        }));
      }
    } catch (fbErr) {
      console.warn("Firestore collection query for courses:", fbErr);
    }

    try {
      const singletonSnap = await getDoc(doc(db, 'singletons', 'courses'));
      if (singletonSnap.exists() && Array.isArray(singletonSnap.data()?.data)) {
        remoteCourses = mergeArraysById(remoteCourses, singletonSnap.data().data);
      }
    } catch (_) {}
  }

  // Merge remote and local so newly created posts in local are NEVER discarded
  let combined = mergeArraysById(remoteCourses, localCourses);
  if (deletedIds.length > 0) {
    combined = combined.filter(c => !deletedIds.includes(String(c.id)));
  }

  if (combined.length > 0) {
    combined.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.date || a.updatedAt || 0).getTime() || 0;
      const timeB = new Date(b.createdAt || b.date || b.updatedAt || 0).getTime() || 0;
      return timeB - timeA;
    });
    try {
      localStorage.setItem('courses', JSON.stringify(combined));
    } catch (_) {}
    return combined;
  }

  const raw = await getData('courses', null);
  if (raw && Array.isArray(raw) && raw.length > 0) {
    return raw.filter(c => !deletedIds.includes(String(c.id)));
  }

  return [];
};

export const saveCourses = async (courses: any[]) => {
  const cleanList = Array.isArray(courses) ? courses : [];

  // Remove saved item IDs from deleted tombstone list if they were re-saved
  try {
    const rawDeleted = localStorage.getItem('courses_deleted');
    if (rawDeleted) {
      const deletedIds: string[] = JSON.parse(rawDeleted);
      const savedIds = cleanList.map(s => String(s.id));
      const cleanedDeleted = deletedIds.filter(d => !savedIds.includes(d));
      localStorage.setItem('courses_deleted', JSON.stringify(cleanedDeleted));
    }

    localStorage.setItem('courses', JSON.stringify(cleanList));
    localStorage.setItem('courses_lastSavedAt', String(Date.now()));
  } catch (e) {
    console.warn("Error caching courses locally:", e);
  }

  // Dispatch UI update immediately with cleanList
  window.dispatchEvent(new CustomEvent('db_updated', { detail: { key: 'courses', data: cleanList } }));

  // Fast Parallel Save to Firebase Firestore collection and singleton
  if (isFirebaseConfigured) {
    try {
      const savePromises = cleanList.map(item => {
        if (item && item.id) {
          return setDoc(doc(db, 'courses', String(item.id)), {
            ...item,
            updatedAt: Date.now()
          }, { merge: true });
        }
        return Promise.resolve();
      });

      // Also update singleton in background
      savePromises.push(
        setDoc(doc(db, 'singletons', 'courses'), {
          data: cleanList,
          updatedAt: Date.now()
        }, { merge: false })
      );

      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));
      await Promise.race([Promise.all(savePromises), timeoutPromise]);
    } catch (fbErr: any) {
      console.warn("Firebase saveCourses warning:", fbErr?.message || fbErr);
    }
  }
};

export const deleteCourse = async (id: string) => {
  const targetId = String(id);
  // Mark in tombstone
  try {
    const rawDeleted = localStorage.getItem('courses_deleted') || '[]';
    const deletedIds: string[] = JSON.parse(rawDeleted);
    if (!deletedIds.includes(targetId)) {
      deletedIds.push(targetId);
      localStorage.setItem('courses_deleted', JSON.stringify(deletedIds.slice(-200)));
    }
  } catch (_) {}

  const current = await getCourses();
  const updated = current.filter(c => String(c.id) !== targetId);
  await saveCourses(updated);

  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'courses', targetId));
    } catch (e) {
      console.warn("Error deleting course document from Firebase:", e);
    }
  }
  return updated;
};

export const getCourseMaterials = async () => {
  const raw = await getData('courseMaterials', []);
  if (!Array.isArray(raw)) return [];
  let changed = false;
  const sanitized = raw.map(item => {
    if (!item) return item;
    let itemChanged = false;
    let subject = item.subject;
    if (typeof subject === 'string' && subject.trim().toLowerCase() === 'tamil') {
      subject = 'தமிழ்';
      itemChanged = true;
    }
    let subjects = item.subjects;
    if (Array.isArray(subjects)) {
      const cleanSubs = sanitizeSubjectList(subjects);
      if (JSON.stringify(cleanSubs) !== JSON.stringify(subjects)) {
        subjects = cleanSubs;
        itemChanged = true;
      }
    }
    if (itemChanged) {
      changed = true;
      return { ...item, subject, subjects };
    }
    return item;
  });
  if (changed) {
    saveData('courseMaterials', sanitized).catch(() => {});
  }
  return sanitized;
};
export const saveCourseMaterials = (materials: any) => saveData('courseMaterials', materials);

export const getYoutubeLinks = async () => {
  const links = await getData('youtubeLinks', []);
  if (!Array.isArray(links)) return [];
  let changed = false;
  const sanitized = links.map(item => {
    if (!item) return item;
    let itemChanged = false;
    let subject = item.subject;
    if (typeof subject === 'string' && subject.trim().toLowerCase() === 'tamil') {
      subject = 'தமிழ்';
      itemChanged = true;
    }
    let subjects = item.subjects;
    if (Array.isArray(subjects)) {
      const cleanSubs = sanitizeSubjectList(subjects);
      if (JSON.stringify(cleanSubs) !== JSON.stringify(subjects)) {
        subjects = cleanSubs;
        itemChanged = true;
      }
    }
    if (itemChanged) {
      changed = true;
      return { ...item, subject, subjects };
    }
    return item;
  });
  if (changed) {
    saveData('youtubeLinks', sanitized).catch(() => {});
  }
  return sanitized;
};
export const saveYoutubeLinks = (links: any) => saveData('youtubeLinks', links);

export const getFees = () => getData('fees', []);
export const saveFees = (fees: any) => saveData('fees', fees);

export interface StudentMenuLabels {
  subjects: string;
  recording: string;
  homework: string;
  attendance: string;
  elearning: string;
  marks: string;
  course_materials: string;
  rules: string;
  fees: string;
  chat: string;
  whatsapp: string;
}

export const DEFAULT_STUDENT_MENU_LABELS: StudentMenuLabels = {
  subjects: "My Subjects",
  recording: "Tamil Game",
  homework: "Homework",
  attendance: "Attendance",
  elearning: "E-Learning",
  marks: "Marks",
  course_materials: "Course Material & PDF",
  rules: "Rules",
  fees: "Fees",
  chat: "Live Chat",
  whatsapp: "WhatsApp"
};

export const getStudentMenuLabels = async (): Promise<StudentMenuLabels> => {
  const custom = await getData('studentMenuLabels', {});
  return { ...DEFAULT_STUDENT_MENU_LABELS, ...(custom || {}) };
};

export const saveStudentMenuLabels = async (labels: Partial<StudentMenuLabels>) => {
  return saveData('studentMenuLabels', labels);
};

export const getAttendance = () => getData('attendance', []);
export const saveAttendance = (attendance: any) => saveData('attendance', attendance);

export const getSchedule = () => getData('schedule', []);
export const saveSchedule = (schedule: any) => saveData('schedule', schedule);

export const getClassLinks = () => getData('classLinks', {});
export const saveClassLinks = (links: any) => saveData('classLinks', links);

export const getCourseWebsiteLinks = async () => {
  const links = await getData('courseWebsiteLinks', {});
  const defaultLinks = {
    "30 DAY'S TAMIL COURSE": "https://www.agaramdhines.lk/courses/30-%e0%ae%a8%e0%ae%be%e0%ae%9f%e0%af%8d%e0%ae%95%e0%ae%b3%e0%ae%bf%e0%ae%b2%e0%af%8d-o-l-%e0%ae%a4%e0%ae%ae%e0%ae%bf%e0%ae%b4%e0%af%8d-2026-dec/",
    "தரம் 06": "https://www.agaramdhines.lk/courses/",
    "தரம் 07": "https://www.agaramdhines.lk/courses/",
    "தரம் 08": "https://www.agaramdhines.lk/courses/",
    "தரம் 09": "https://www.agaramdhines.lk/courses/",
    "தரம் 10": "https://www.agaramdhines.lk/courses/",
    "தரம் 11": "https://www.agaramdhines.lk/courses/"
  };
  const merged = { ...defaultLinks, ...(links || {}) };
  if (!links || !links["30 DAY'S TAMIL COURSE"]) {
    saveData('courseWebsiteLinks', merged);
  }
  return merged;
};
export const saveCourseWebsiteLinks = (links: any) => saveData('courseWebsiteLinks', links);

export const getClasses = async () => {
  const rawClasses = await getData('classes', []);
  if (!Array.isArray(rawClasses)) return [];
  const classMap = new Map<string, any>();
  let hasDuplicates = false;
  let hasChanged = false;
  rawClasses.forEach((item: any) => {
    if (!item) return;
    const key = (item.name || item.id || '').toString().trim().toLowerCase();
    if (!key) return;

    const rawSubs = Array.isArray(item.subjects) ? item.subjects : (item.subject ? [item.subject] : []);
    const cleanSubs = sanitizeSubjectList(rawSubs);
    if (JSON.stringify(cleanSubs) !== JSON.stringify(item.subjects)) {
      hasChanged = true;
    }
    const updatedItem = { ...item, subjects: cleanSubs };

    if (classMap.has(key)) {
      hasDuplicates = true;
      const existing = classMap.get(key);
      classMap.set(key, { ...existing, ...updatedItem, id: existing.id || item.id });
    } else {
      classMap.set(key, updatedItem);
    }
  });
  const deduped = Array.from(classMap.values());
  if (hasDuplicates || hasChanged) {
    saveData('classes', deduped).catch(() => {});
  }
  return deduped;
};
export const saveClasses = async (classes: any) => {
  const res = await saveData('classes', classes);
  return res;
};

export const getHomework = () => getData('homework', []);
export const saveHomework = (homework: any) => saveData('homework', homework);

export const getStaffs = async (): Promise<any[]> => {
  setupRealtimeListener('staffs');

  let deletedIds: string[] = [];
  try {
    const rawDeleted = localStorage.getItem('staffs_deleted');
    if (rawDeleted) deletedIds = JSON.parse(rawDeleted);
  } catch (_) {}

  let localStaffs: any[] = [];
  try {
    const rawLocal = localStorage.getItem('staffs');
    if (rawLocal) {
      localStaffs = JSON.parse(rawLocal);
    }
  } catch (_) {}

  let remoteStaffs: any[] = [];

  if (isFirebaseConfigured) {
    try {
      const querySnapshot = await getDocs(collection(db, 'staffs'));
      if (!querySnapshot.empty) {
        remoteStaffs = querySnapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id
        }));
      }
    } catch (fbErr) {
      console.warn("Firestore collection query for staffs:", fbErr);
    }

    try {
      const singletonSnap = await getDoc(doc(db, 'singletons', 'staffs'));
      if (singletonSnap.exists() && Array.isArray(singletonSnap.data()?.data)) {
        remoteStaffs = mergeArraysById(remoteStaffs, singletonSnap.data().data);
      }
    } catch (_) {}
  }

  // Merge remote and local so newly created or existing staff are NEVER lost
  let combined = mergeArraysById(remoteStaffs, localStaffs);
  if (deletedIds.length > 0) {
    combined = combined.filter(s => !deletedIds.includes(String(s.id)));
  }

  if (combined.length > 0) {
    try {
      localStorage.setItem('staffs', JSON.stringify(combined));
    } catch (_) {}
    return combined;
  }

  const raw = await getData('staffs', []);
  if (raw && Array.isArray(raw) && raw.length > 0) {
    return raw.filter(s => !deletedIds.includes(String(s.id)));
  }

  return [];
};

export const saveStaffs = async (staffs: any[]) => {
  const cleanList = Array.isArray(staffs) ? staffs : [];

  // Remove saved item IDs from deleted tombstone list if they were re-saved
  try {
    const rawDeleted = localStorage.getItem('staffs_deleted');
    if (rawDeleted) {
      const deletedIds: string[] = JSON.parse(rawDeleted);
      const savedIds = cleanList.map(s => String(s.id));
      const cleanedDeleted = deletedIds.filter(d => !savedIds.includes(d));
      localStorage.setItem('staffs_deleted', JSON.stringify(cleanedDeleted));
    }

    localStorage.setItem('staffs', JSON.stringify(cleanList));
    localStorage.setItem('staffs_lastSavedAt', String(Date.now()));
  } catch (e) {
    console.warn("Error caching staffs locally:", e);
  }

  // Dispatch UI update immediately with cleanList
  window.dispatchEvent(new CustomEvent('db_updated', { detail: { key: 'staffs', data: cleanList } }));

  // Fast Parallel Save to Firebase Firestore collection and singleton
  if (isFirebaseConfigured) {
    try {
      const savePromises = cleanList.map(item => {
        if (item && item.id) {
          return setDoc(doc(db, 'staffs', String(item.id)), {
            ...item,
            updatedAt: Date.now()
          }, { merge: true });
        }
        return Promise.resolve();
      });

      // Also update singleton in background
      savePromises.push(
        setDoc(doc(db, 'singletons', 'staffs'), {
          data: cleanList,
          updatedAt: Date.now()
        }, { merge: false })
      );

      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));
      await Promise.race([Promise.all(savePromises), timeoutPromise]);
    } catch (fbErr: any) {
      console.warn("Firebase saveStaffs warning:", fbErr?.message || fbErr);
    }
  }
};

export const deleteStaff = async (id: string | number) => {
  const targetId = String(id);
  // Mark in tombstone
  try {
    const rawDeleted = localStorage.getItem('staffs_deleted') || '[]';
    const deletedIds: string[] = JSON.parse(rawDeleted);
    if (!deletedIds.includes(targetId)) {
      deletedIds.push(targetId);
      localStorage.setItem('staffs_deleted', JSON.stringify(deletedIds.slice(-200)));
    }
  } catch (_) {}

  const current = await getStaffs();
  const updated = current.filter(s => String(s.id) !== targetId);
  await saveStaffs(updated);

  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'staffs', targetId));
    } catch (e) {
      console.warn("Error deleting staff document from Firebase:", e);
    }
  }
  return updated;
};

export const getStaffAttendance = () => getData('staffAttendance', []);
export const saveStaffAttendance = (attendance: any) => saveData('staffAttendance', attendance);

export interface EmployeeTask {
  id: string;
  staffId: string;
  staffName: string;
  title: string;
  category: 'Typing & Data Entry' | 'Graphic Design' | 'Question Paper' | 'Course Material' | 'Thumbnails & Media' | 'Other';
  description?: string;
  assignedDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  completedDate?: string; // YYYY-MM-DD
  status: 'Pending' | 'In Progress' | 'Completed' | 'Under Review';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  workCount?: number; // e.g. 10 pages, 5 banners
  workUnit?: string; // e.g. 'Pages', 'Banners', 'Papers', 'Videos'
  fileUrl?: string; // attachment or output link
  driveLink?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  fileData?: string; // base64 data URL for direct download
  completionNotes?: string;
  verifiedByAdmin?: boolean;
}

export const getEmployeeTasks = async (): Promise<EmployeeTask[]> => {
  const raw = await getData('employeeTasks', null);
  if (raw && Array.isArray(raw)) return raw;

  // Sample initial tasks for demonstration
  const initialTasks: EmployeeTask[] = [
    {
      id: 'task_1',
      staffId: '1773337820220',
      staffName: 'Dhivya',
      title: 'தரம் 11 தமிழ் வினாத்தாள் தட்டச்சு (Grade 11 Tamil Model Paper Typing)',
      category: 'Question Paper',
      description: 'தரம் 11 முதலாம் தவணை தமிழ் மாதிரி வினாத்தாள் 8 பக்கங்கள் தட்டச்சு செய்து PDF வடிவமைப்பு செய்தல்.',
      assignedDate: '2026-08-01',
      dueDate: '2026-08-10',
      completedDate: '2026-08-08',
      status: 'Completed',
      priority: 'High',
      workCount: 8,
      workUnit: 'Pages',
      driveLink: 'https://drive.google.com/',
      completionNotes: 'முழுமையாக தட்டச்சு செய்து பிழைதிருத்தம் முடிக்கப்பட்டது.'
    },
    {
      id: 'task_2',
      staffId: '1773337820220',
      staffName: 'Dhivya',
      title: 'YouTube தம்பனைல் & பதாகை வடிவமைப்பு (YouTube Thumbnail & Social Poster)',
      category: 'Graphic Design',
      description: '30 நாள் தமிழ் பாடநெறி புதிய வகுப்புகளுக்கான கவர்ச்சிகரமான 5 தம்பனைல்கள் வடிவமைப்பு.',
      assignedDate: '2026-08-12',
      dueDate: '2026-08-18',
      completedDate: '2026-08-16',
      status: 'Completed',
      priority: 'Medium',
      workCount: 5,
      workUnit: 'Thumbnails',
      driveLink: 'https://drive.google.com/',
      completionNotes: 'அனைத்து தம்பனைல்களும் HD தரத்தில் வழங்கப்பட்டுள்ளன.'
    },
    {
      id: 'task_3',
      staffId: '1773337820220',
      staffName: 'Dhivya',
      title: 'இலக்கணக் குறிப்புகள் ஆவணத் தயாரிப்பு (Grammar Notes Layout & Formatting)',
      category: 'Course Material',
      description: 'தமிழ் இலக்கணம் பகுதி 1-5 பாடக் குறிப்புகள் தட்டச்சு மற்றும் அச்சிடத்தக்க வடிவமைப்பு.',
      assignedDate: '2026-08-20',
      dueDate: '2026-08-28',
      status: 'In Progress',
      priority: 'High',
      workCount: 15,
      workUnit: 'Pages',
      completionNotes: 'பக்கம் 1 முதல் 10 வரை தட்டச்சு நிறைவடைந்துள்ளது.'
    }
  ];

  await saveData('employeeTasks', initialTasks);
  return initialTasks;
};

export const saveEmployeeTasks = (tasks: EmployeeTask[]) => saveData('employeeTasks', tasks);

export interface DailyWorkUpload {
  id: string;
  staffId: string;
  staffName: string;
  title: string;
  category: 'Typing & Data Entry' | 'Graphic Design' | 'Question Paper' | 'Course Material' | 'Thumbnails & Media' | 'Other';
  date: string; // YYYY-MM-DD
  fileName: string;
  fileType: string; // 'application/pdf' | 'application/msword' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' | 'image/jpeg' | 'image/png'
  fileSize: number; // in bytes
  fileData?: string; // base64 data URI
  fileUrl?: string; // drive/cloud link if applicable
  driveLink?: string; // Optional Google Drive link alongside direct file upload
  workCount?: number; // e.g. 5 pages / 2 banners
  workUnit?: string; // 'Pages', 'Banners', 'Papers', 'Designs', 'Files'
  notes?: string;
  status: 'Pending' | 'Approved' | 'Needs Revision';
  adminNotes?: string;
  createdAt: string; // ISO string
  hasChunks?: boolean;
  chunkCount?: number;
}

export const getDailyWorkUploads = async (): Promise<DailyWorkUpload[]> => {
  setupRealtimeListener('dailyWorkUploads');

  let deletedIds: string[] = [];
  try {
    const rawDeleted = localStorage.getItem('dailyWorkUploads_deleted');
    if (rawDeleted) deletedIds = JSON.parse(rawDeleted);
  } catch (_) {}

  let localUploads: DailyWorkUpload[] = [];
  try {
    const rawLocal = localStorage.getItem('dailyWorkUploads');
    if (rawLocal) {
      localUploads = JSON.parse(rawLocal);
    }
  } catch (_) {}

  let remoteUploads: DailyWorkUpload[] = [];

  if (isFirebaseConfigured) {
    try {
      const querySnapshot = await getDocs(collection(db, 'dailyWorkUploads'));
      if (!querySnapshot.empty) {
        remoteUploads = querySnapshot.docs.map((docSnap) => ({
          ...(docSnap.data() as DailyWorkUpload),
          id: docSnap.id
        }));
      }
    } catch (fbErr) {
      console.warn("Firestore collection query for dailyWorkUploads:", fbErr);
    }

    try {
      const singletonSnap = await getDoc(doc(db, 'singletons', 'dailyWorkUploads'));
      if (singletonSnap.exists() && Array.isArray(singletonSnap.data()?.data)) {
        remoteUploads = mergeArraysById(remoteUploads, singletonSnap.data().data);
      }
    } catch (_) {}
  }

  // Merge remote and local so newly uploaded items in local are NEVER discarded
  let combined = mergeArraysById(remoteUploads, localUploads);
  if (deletedIds.length > 0) {
    combined = combined.filter(u => !deletedIds.includes(u.id));
  }

  if (combined.length > 0) {
    combined.sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
    try {
      localStorage.setItem('dailyWorkUploads', JSON.stringify(combined));
    } catch (_) {}
    return combined;
  }

  const raw = await getData('dailyWorkUploads', null);
  if (raw && Array.isArray(raw) && raw.length > 0) {
    return raw.filter(u => !deletedIds.includes(u.id));
  }

  // Sample initial daily uploads
  const sampleUploads: DailyWorkUpload[] = [
    {
      id: 'upload_1',
      staffId: '1773337820220',
      staffName: 'Dhivya',
      title: 'Grade 11 Tamil Model Paper - Section A & B',
      category: 'Question Paper',
      date: new Date().toISOString().slice(0, 10),
      fileName: 'Grade11_Tamil_Model_Paper_2026.pdf',
      fileType: 'application/pdf',
      fileSize: 245000,
      workCount: 8,
      workUnit: 'Pages',
      notes: 'தரம் 11 மாதிரி வினாத்தாள் தட்டச்சு முடிந்து சரிபார்க்கப்பட்டுள்ளது.',
      status: 'Approved',
      adminNotes: 'Excellent work. Formatting is clean.',
      createdAt: new Date().toISOString()
    },
    {
      id: 'upload_2',
      staffId: '1773337820220',
      staffName: 'Dhivya',
      title: 'YouTube Thumbnail Design - Day 15 Course',
      category: 'Graphic Design',
      date: new Date().toISOString().slice(0, 10),
      fileName: 'Tamil_Course_Day15_Thumbnail.png',
      fileType: 'image/png',
      fileSize: 850000,
      workCount: 2,
      workUnit: 'Thumbnails',
      notes: 'YouTube Banner & Poster exported in 1080p HD format.',
      status: 'Approved',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    }
  ];

  await saveData('dailyWorkUploads', sampleUploads);
  return sampleUploads;
};

export const saveDailyWorkUploads = async (uploads: DailyWorkUpload[]) => {
  // 1. Safe local storage save (strip heavy base64 to prevent storage quotas)
  let safeList: DailyWorkUpload[] = [];
  try {
    safeList = uploads.map(u => {
      if (u.fileData && u.fileData.length > 50000) {
        const { fileData, ...rest } = u;
        return rest;
      }
      return u;
    });

    // Remove saved item IDs from deleted tombstone list if they were re-saved
    const rawDeleted = localStorage.getItem('dailyWorkUploads_deleted');
    if (rawDeleted) {
      const deletedIds: string[] = JSON.parse(rawDeleted);
      const savedIds = safeList.map(s => s.id);
      const cleanedDeleted = deletedIds.filter(d => !savedIds.includes(d));
      localStorage.setItem('dailyWorkUploads_deleted', JSON.stringify(cleanedDeleted));
    }

    localStorage.setItem('dailyWorkUploads', JSON.stringify(safeList));
    localStorage.setItem('dailyWorkUploads_lastSavedAt', String(Date.now()));
  } catch (e) {
    console.warn("LocalStorage save warning:", e);
  }

  // 2. Dispatch UI update immediately with safeList
  window.dispatchEvent(new CustomEvent('db_updated', { detail: { key: 'dailyWorkUploads', data: safeList } }));

  // 3. Fast Parallel Save to Firebase Firestore collection and singleton
  if (isFirebaseConfigured) {
    try {
      const cleanUploads = safeList.map(item => {
        const copy: any = { ...item };
        if (copy.fileData && copy.fileData.length > 50000) {
          delete copy.fileData;
        }
        return copy;
      });

      // Write recent items in parallel
      const savePromises = cleanUploads.slice(0, 100).map(item => {
        if (item && item.id) {
          return setDoc(doc(db, 'dailyWorkUploads', String(item.id)), {
            ...item,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
        return Promise.resolve();
      });

      // Also update singleton in parallel
      savePromises.push(
        setDoc(doc(db, 'singletons', 'dailyWorkUploads'), {
          data: cleanUploads,
          updatedAt: Date.now()
        }, { merge: false })
      );

      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 3000));
      await Promise.race([Promise.all(savePromises), timeoutPromise]);
    } catch (fbErr: any) {
      console.warn("Firebase saveDailyWorkUploads warning:", fbErr?.message || fbErr);
    }
  }
};

export const deleteDailyWorkUpload = async (id: string) => {
  // Mark in tombstone
  try {
    const rawDeleted = localStorage.getItem('dailyWorkUploads_deleted') || '[]';
    const deletedIds: string[] = JSON.parse(rawDeleted);
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('dailyWorkUploads_deleted', JSON.stringify(deletedIds.slice(-200)));
    }
  } catch (_) {}

  const current = await getDailyWorkUploads();
  const updated = current.filter(u => u.id !== id);
  await saveDailyWorkUploads(updated);

  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'dailyWorkUploads', id));
      // Also delete from file chunks if any
      const { deleteFileChunksFromFirestore, deleteFileFromIndexedDB } = await import('./fileStorage');
      deleteFileChunksFromFirestore(id).catch(() => {});
      deleteFileFromIndexedDB(id).catch(() => {});
    } catch (_) {}
  }
  return updated;
};



export const getDeletedSubjectsList = (): string[] => {
  try {
    const raw = localStorage.getItem('subjects_deleted');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(s => String(s).trim().toLowerCase()).filter(Boolean);
    }
  } catch (_) {}
  return [];
};

export const markSubjectDeleted = (idOrName: string) => {
  if (!idOrName) return;
  const clean = String(idOrName).trim().toLowerCase();
  try {
    const list = getDeletedSubjectsList();
    if (!list.includes(clean)) {
      list.push(clean);
      const capped = list.slice(-500);
      localStorage.setItem('subjects_deleted', JSON.stringify(capped));
      if (isFirebaseConfigured) {
        setDoc(doc(db, 'singletons', 'subjects_deleted'), { data: capped, updatedAt: Date.now() }, { merge: true }).catch(() => {});
      }
    }
  } catch (_) {}
};

export const unmarkSubjectDeleted = (idOrName: string) => {
  if (!idOrName) return;
  const clean = String(idOrName).trim().toLowerCase();
  try {
    const list = getDeletedSubjectsList();
    const updated = list.filter(item => item !== clean);
    localStorage.setItem('subjects_deleted', JSON.stringify(updated));
    if (isFirebaseConfigured) {
      setDoc(doc(db, 'singletons', 'subjects_deleted'), { data: updated, updatedAt: Date.now() }, { merge: true }).catch(() => {});
    }
  } catch (_) {}
};

export const getSubjects = async (): Promise<any[]> => {
  const rawList = await getData('subjects', null);
  const deletedSet = new Set(getDeletedSubjectsList());

  // Consolidate redundant variants into single "தமிழ் இலக்கிய நயம்"
  const redundantIlakkiaNayamVariants = new Set([
    "இலக்கிய நயம்",
    "இலக்கிய நயம் (தரம் 11)",
    "தமிழ் இலக்கிய நயம் (தரம் 11)",
    "தமிழ் இலக்கிய நயம் 20 நாள் பாடநெறி",
    "தமிழ் இலக்கிய நயம் 20 நாள்",
    "இலக்கிய நயம் 20 நாள் பாடநெறி",
    "இலக்கிய நயம் 20 நாள்",
    "இலக்கிய நயம் 20 நாள் பாடநெறி (தரம் 11)"
  ]);

  const map = new Map<string, any>();

  // 1. Core Default Subjects (always available unless user explicitly clicked delete)
  const defaultSubjects = [
    { id: "sub_tamil_main", name: "தமிழ்", category: "Main", fee: "0" },
    { id: "sub_1", name: "தமிழ் வினா விடை", category: "Sub", fee: "500", grade: "தரம் 11" },
    { id: "sub_2", name: "30 நாள் தமிழ் பாடநெறி (தரம் 11)", category: "Sub", fee: "6000", grade: "தரம் 11" },
    { id: "sub_3", name: "தமிழ் மொழி இலக்கியம்", category: "Main", fee: "0", grade: "தரம் 11" },
    { id: "sub_4", name: "தமிழ் மொழி வளம் (GAME)", category: "Main", fee: "0" },
    { id: "sub_5", name: "30 நாள் (15 - 30) வது நாள்", category: "Sub", fee: "3000", grade: "தரம் 11" },
    { id: "sub_6", name: "தமிழ் இலக்கிய நயம்", category: "Sub", fee: "4000", grade: "தரம் 11" }
  ];

  for (const s of defaultSubjects) {
    const nameKey = String(s.name).trim().toLowerCase();
    const idKey = String(s.id).trim().toLowerCase();
    if (!deletedSet.has(nameKey) && !deletedSet.has(idKey)) {
      map.set(nameKey, s);
    }
  }

  // 2. Overlay / Merge stored records from Firestore / LocalStorage
  if (Array.isArray(rawList)) {
    for (const item of rawList) {
      if (!item) continue;
      const nameStr = typeof item === 'string' ? item : item.name;
      if (!nameStr) continue;
      let rawName = String(nameStr).replace(/\s+/g, ' ').trim();
      if (!rawName) continue;

      if (redundantIlakkiaNayamVariants.has(rawName)) {
        rawName = "தமிழ் இலக்கிய நயம்";
      }
      if (rawName.toLowerCase() === "tamil") {
        rawName = "தமிழ்";
      }

      const idStr = String(typeof item === 'object' && item.id ? item.id : '').trim().toLowerCase();
      const nameKey = rawName.toLowerCase();

      // If marked deleted by user, remove it
      if (deletedSet.has(idStr) || deletedSet.has(nameKey)) {
        map.delete(nameKey);
        continue;
      }

      if (!map.has(nameKey)) {
        map.set(nameKey, {
          id: (typeof item === 'object' && item.id) ? String(item.id) : `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: rawName,
          category: (typeof item === 'object' && item.category) ? item.category : "Main",
          fee: (typeof item === 'object' && item.fee !== undefined) ? String(item.fee) : "0",
          grade: (typeof item === 'object' && item.grade) ? item.grade : "தரம் 11"
        });
      } else if (typeof item === 'object') {
        const existing = map.get(nameKey);
        map.set(nameKey, { ...existing, ...item, name: rawName });
      }
    }
  }

  return Array.from(map.values());
};

export const saveSubjects = async (subjects: any) => {
  const cleanList = Array.isArray(subjects) ? subjects.filter(Boolean) : [];

  // Remove saved subjects from deleted tombstones
  cleanList.forEach(s => {
    if (s?.id) unmarkSubjectDeleted(String(s.id));
    if (s?.name) unmarkSubjectDeleted(String(s.name));
  });

  // Local caching
  try {
    localStorage.setItem('subjects', JSON.stringify(cleanList));
    localStorage.setItem('subjects_lastSavedAt', String(Date.now()));
  } catch (e) {
    console.warn("Error caching subjects locally:", e);
  }

  // Dispatch UI update
  window.dispatchEvent(new CustomEvent('db_updated', { detail: { key: 'subjects', data: cleanList } }));

  // Cloud Firestore saving
  if (isFirebaseConfigured) {
    try {
      const now = Date.now();
      const savePromises: Promise<any>[] = [
        setDoc(doc(db, 'singletons', 'subjects'), {
          data: cleanList,
          updatedAt: now
        }, { merge: false })
      ];

      for (const item of cleanList) {
        if (item && item.id) {
          savePromises.push(
            setDoc(doc(db, 'subjects', String(item.id)), {
              ...item,
              updatedAt: now
            }, { merge: true })
          );
        }
      }

      await Promise.race([
        Promise.all(savePromises),
        new Promise(resolve => setTimeout(resolve, 3500))
      ]);
    } catch (fbErr: any) {
      console.warn("Firebase saveSubjects warning:", fbErr?.message || fbErr);
    }
  }

  return cleanList;
};

export const deleteSubject = async (id: string, name?: string) => {
  const targetId = String(id || '').trim();
  const targetName = String(name || '').trim().toLowerCase();

  // 1. Record in persistent deleted blacklist
  if (targetId) markSubjectDeleted(targetId);
  if (targetName) markSubjectDeleted(targetName);

  // 2. Filter out from current subjects
  const current = await getSubjects();
  const updated = current.filter(s => {
    const sId = String(s?.id || '').trim();
    const sName = String(s?.name || '').trim().toLowerCase();
    if (targetId && sId === targetId) return false;
    if (targetName && sName === targetName) return false;
    return true;
  });

  // 3. Save clean list to storage and singleton
  await saveSubjects(updated);

  // 4. Delete document permanently from Firestore collection
  if (isFirebaseConfigured) {
    try {
      if (targetId) {
        deleteDoc(doc(db, 'subjects', targetId)).catch(() => {});
      }
      if (targetName) {
        const querySnapshot = await getDocs(collection(db, 'subjects'));
        querySnapshot.forEach(docSnap => {
          const data = docSnap.data();
          const docName = String(data?.name || '').trim().toLowerCase();
          if (docName === targetName || docSnap.id === targetId) {
            deleteDoc(doc(db, 'subjects', docSnap.id)).catch(() => {});
          }
        });
      }
    } catch (err) {
      console.warn("Firebase deleteSubject warning:", err);
    }
  }

  return updated;
};

export const syncSubjectsFromRecords = async () => {
  const currentSubjects = await getSubjects();
  const deletedSet = new Set(getDeletedSubjectsList());
  const map = new Map<string, any>();

  // Keep existing current subjects
  currentSubjects.forEach(s => {
    if (s?.name) {
      map.set(String(s.name).trim().toLowerCase(), s);
    }
  });

  // Harvest missing non-deleted subjects from students
  try {
    const rawStudents = await getData('students', []);
    if (Array.isArray(rawStudents)) {
      rawStudents.forEach((st: any) => {
        const subs = Array.isArray(st?.subjects) ? st.subjects : (Array.isArray(st?.enrolledClasses) ? st.enrolledClasses : []);
        subs.forEach((subName: any) => {
          if (!subName || typeof subName !== 'string') return;
          let cleanName = subName.trim();
          if (cleanName.toLowerCase() === "tamil") cleanName = "தமிழ்";
          const key = cleanName.toLowerCase();
          if (cleanName && !deletedSet.has(key) && !map.has(key)) {
            map.set(key, {
              id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              name: cleanName,
              category: 'Main',
              fee: '0',
              grade: st?.grade || 'தரம் 11'
            });
          }
        });
      });
    }
  } catch (_) {}

  // Harvest missing non-deleted subjects from classes
  try {
    const rawClasses = await getData('classes', []);
    if (Array.isArray(rawClasses)) {
      rawClasses.forEach((c: any) => {
        const subs = Array.isArray(c?.subjects) ? c.subjects : (c?.subject ? [c.subject] : []);
        subs.forEach((subName: any) => {
          if (!subName || typeof subName !== 'string') return;
          let cleanName = subName.trim();
          if (cleanName.toLowerCase() === "tamil") cleanName = "தமிழ்";
          const key = cleanName.toLowerCase();
          if (cleanName && !deletedSet.has(key) && !map.has(key)) {
            map.set(key, {
              id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              name: cleanName,
              category: 'Main',
              fee: '0',
              grade: c?.name || 'தரம் 11'
            });
          }
        });
      });
    }
  } catch (_) {}

  const merged = Array.from(map.values());
  await saveSubjects(merged);
  return merged;
};

export const getIncomeExpense = () => getData('incomeExpense', []);
export const saveIncomeExpense = (data: any) => saveData('incomeExpense', data);

export const getGrades = () => getData('grades', []);
export const saveGrades = (grades: any) => saveData('grades', grades);

export const getTimeTable = () => getData('timetable', []);
export const saveTimeTable = (timetable: any) => saveData('timetable', timetable);

export const getExamMarks = () => getData('examMarks', []);
export const saveExamMarks = (marks: any) => saveData('examMarks', marks);

export const getWebPosts = () => getData('webPosts', []);
export const saveWebPosts = (posts: any) => saveData('webPosts', posts);

export const getExamSettings = () => getData('examSettings', []);
export const saveExamSettings = (settings: any) => saveData('examSettings', settings);

export const getAnnouncements = () => getData('announcements', []);
export const saveAnnouncements = (announcements: any) => saveData('announcements', announcements);

export const getBehaviourRecords = () => getData('behaviourRecords', []);
export const saveBehaviourRecords = (records: any) => saveData('behaviourRecords', records);

export const getQuestionPapers = () => getData('questionPapers', []);
export const saveQuestionPapers = (papers: any) => saveData('questionPapers', papers);

export interface TermExamItem {
  id: string;
  termName: string;
  examName: string;
  subject?: string;
  grades: string[]; // e.g. ["தரம் 06", "தரம் 07"] or ["All"]
  examDate: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  totalMarks?: number;
  passMarks?: number;
  examLink?: string; // Google Drive, Google Forms, YouTube, Web Post, External
  linkType?: 'google_form' | 'google_drive' | 'youtube' | 'webpost' | 'external' | 'pdf';
  thumbnail?: string; // image url or base64 poster
  paperPdf?: string; // paper pdf file / url
  solutionPdf?: string; // solution/results pdf file / url
  instructions?: string;
  createdAt: string;
}

export interface ExamSubmissionItem {
  id: string;
  examId: string;
  examName: string;
  termName: string;
  subject: string;
  studentId: string;
  studentName: string;
  rollNo?: string;
  grade: string;
  obtained: number;
  total: number;
  percentage: number;
  gradeLetter: string;
  remarks?: string;
  status: 'submitted' | 'verified';
  submittedAt: string;
}

export const getTermExams = async (): Promise<TermExamItem[]> => (await getData('termExams', [])) as TermExamItem[];
export const saveTermExams = (exams: TermExamItem[]) => saveData('termExams', exams);

export const getExamSubmissions = async (): Promise<ExamSubmissionItem[]> => (await getData('examSubmissions', [])) as ExamSubmissionItem[];
export const saveExamSubmissions = (submissions: ExamSubmissionItem[]) => saveData('examSubmissions', submissions);


export const SRI_LANKA_DISTRICTS = [
  "யாழ்ப்பாணம் (Jaffna)",
  "கிளிநொச்சி (Kilinochchi)",
  "முல்லைத்தீவு (Mullaitivu)",
  "வவுனியா (Vavuniya)",
  "மன்னார் (Mannar)",
  "மட்டக்களப்பு (Batticaloa)",
  "திருகோணமலை (Trincomalee)",
  "அம்பாறை (Ampara)",
  "கண்டி (Kandy)",
  "மாத்தளை (Matale)",
  "நுவரெலியா (Nuwara Eliya)",
  "கொழும்பு (Colombo)",
  "கம்பஹா (Gampaha)",
  "களுத்துறை (Kalutara)",
  "காலி (Galle)",
  "மாத்தறை (Matara)",
  "அம்பாந்தோட்டை (Hambantota)",
  "குருணாகல் (Kurunegala)",
  "புத்தளம் (Puttalam)",
  "அநுராதபுரம் (Anuradhapura)",
  "பொலன்னறுவை (Polonnaruwa)",
  "பதுளை (Badulla)",
  "மொணராகலை (Monaragala)",
  "இரத்தினபுரி (Ratnapura)",
  "கேகாலை (Kegalle)"
];

export interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'district' | 'grade' | 'textarea' | 'radio' | 'checkbox' | 'phone' | 'email' | 'date';
  required: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
}

export interface CustomForm {
  id: string;
  title: string;
  description: string;
  category: 'admission' | 'exam' | 'contact' | 'feedback' | 'general';
  status: 'active' | 'closed';
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
  themeColor?: string;
  headerImage?: string; // Image URL or Base64 data URL (up to 3MB)
  instituteSubtitle?: string; // e.g. "agrandinesh online academy" or "Agaram Dhines Online Academy"
  descriptionPoints?: string[]; // Up to 3 key bullet points for concise display and WhatsApp previews
  successMessage?: string;
  maxSubmissionsPerPhone?: number; // 1 = One submission only (Default), 2 = Up to 2 submissions, 0 = Unlimited
  preventDuplicatePhone?: boolean; // Default true
  phoneFieldId?: string; // ID of the phone field in form
}

export interface FormSubmission {
  id: string;
  formId: string;
  formTitle: string;
  studentName?: string;
  rollNo?: string;
  district?: string;
  grade?: string;
  phone?: string;
  email?: string;
  data: Record<string, any>;
  submittedAt: string;
  status?: 'new' | 'reviewed' | 'enrolled';
}

export const normalizePhoneNumber = (raw: string): string => {
  if (!raw) return '';
  const digits = String(raw).replace(/[^0-9]/g, '');
  // Extract last 9 digits for Sri Lankan phone numbers (e.g. 778054232 from 0778054232 or +94778054232)
  return digits.length >= 9 ? digits.slice(-9) : digits;
};

const DEFAULT_FORMS: CustomForm[] = [
  {
    id: "form_admission_2026",
    title: "மாணவர் சேர்க்கைப் படிவம் (Student Admission & Registration 2026)",
    description: "அகரம் தினேஸ் தமிழ் ஆன்லைன் அகாடமியின் புதிய தவணை தமிழ் வகுப்புகளுக்கான நேரடி பதிவுப் படிவம். அனைத்து விபரங்களையும் சரியாக பூர்த்தி செய்யவும்.",
    instituteSubtitle: "agrandinesh online academy",
    headerImage: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1200&auto=format&fit=crop",
    descriptionPoints: [
      "இலங்கையின் 25 மாவட்ட மாணவர்களுக்கான நேரடி தமிழ் இணையவழி வகுப்புகள்.",
      "தவணைப் பரீட்சை வினாத்தாள் பயிற்சிகள் மற்றும் உடனடி Zoom இணைப்புகள்.",
      "ஒரு மாணவருக்கு ஒரு பதிவு மட்டுமே அனுமதிக்கப்படும் (Single Verified Entry)."
    ],
    category: "admission",
    status: "active",
    themeColor: "#1e3a8a",
    successMessage: "உங்கள் சேர்க்கைப் பதிவு வெற்றிகரமாக பெறப்பட்டது! எமது நிர்வாகப் பிரிவு விரைவில் உங்களைத் தொடர்பு கொள்ளும்.",
    maxSubmissionsPerPhone: 1,
    preventDuplicatePhone: true,
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
    fields: [
      { id: "f_name", label: "மாணவரின் முழுப் பெயர் (Student Full Name)", type: "text", required: true, placeholder: "உதாரணம்: K. தினேஸ் அல்லது K. Dhines" },
      { id: "f_phone", label: "WhatsApp / தொடர்பு இலக்கம் (Mobile Phone)", type: "phone", required: true, placeholder: "0778054232" },
      { id: "f_district", label: "மாவட்டம் (District)", type: "district", required: true },
      { id: "f_grade", label: "தரம் / வகுப்பு (Grade / Class)", type: "grade", required: true },
      { id: "f_school", label: "பாடசாலை (School Name)", type: "text", required: false, placeholder: "பாடசாலையின் பெயர்" },
      { id: "f_parent", label: "பெற்றோர் / பாதுகாவலர் பெயர் (Parent / Guardian Name)", type: "text", required: false },
      { id: "f_email", label: "மின்னஞ்சல் (Email Address)", type: "email", required: false, placeholder: "example@gmail.com" },
      { id: "f_address", label: "முகவரி (Residential Address)", type: "textarea", required: false, placeholder: "முகவரியை உள்ளிடவும்" },
      { id: "f_remarks", label: "கூடுதல் குறிப்புகள் / கேள்விகள் (Special Notes / Inquiries)", type: "textarea", required: false }
    ]
  },
  {
    id: "form_exam_reg_2026",
    title: "மாதிரி வினாத்தாள் & பரீட்சைப் பதிவுப் படிவம் (Exam Registration)",
    description: "தரம் 06 முதல் 11 வரையிலான தமிழ் மாதிரி வினாத்தாள் பரீட்சை மற்றும் வினா விடை கருத்தரங்கில் பங்கேற்க விரும்பும் மாணவர்களுக்கான பதிவுப் படிவம்.",
    instituteSubtitle: "agrandinesh online academy",
    headerImage: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=1200&auto=format&fit=crop",
    descriptionPoints: [
      "தரம் 6 - 11 மாணவர்களுக்கான விசேட மாதிரி வினாத்தாள் தொகுப்பு.",
      "தேர்வு வழிகாட்டல் மற்றும் விடைத்தாள் திருத்தக் கருத்தரங்கு.",
      "WhatsApp ஊடாக பரீட்சை அட்டவணை மற்றும் Zoom இணைப்பு பகிரப்படும்."
    ],
    category: "exam",
    status: "active",
    themeColor: "#b91c1c",
    successMessage: "பரீட்சைக்கான உங்கள் விண்ணப்பம் பதிவு செய்யப்பட்டுள்ளது! தேர்வுத் திகதி மற்றும் Zoom இணைப்பு WhatsApp ஊடாக அனுப்பப்படும்.",
    maxSubmissionsPerPhone: 1,
    preventDuplicatePhone: true,
    createdAt: "2026-08-21T00:00:00.000Z",
    updatedAt: "2026-08-21T00:00:00.000Z",
    fields: [
      { id: "f_name", label: "மாணவரின் பெயர் (Student Name)", type: "text", required: true, placeholder: "பெயரை உள்ளிடவும்" },
      { id: "f_roll", label: "அகாடமி பதிவு எண் / Roll Number (இருப்பின்)", type: "text", required: false, placeholder: "STU1234 அல்லது 1001" },
      { id: "f_district", label: "மாவட்டம் (District)", type: "district", required: true },
      { id: "f_grade", label: "தரம் (Grade)", type: "grade", required: true },
      { id: "f_phone", label: "WhatsApp இலக்கம் (WhatsApp Number)", type: "phone", required: true, placeholder: "07xxxxxxxx" },
      { id: "f_exam_type", label: "பங்கேற்க விரும்பும் தேர்வு (Exam / Paper Choice)", type: "select", required: true, options: ["மாதிரித் தேர்வு (Model Exam Paper)", "வினா விடை கருத்தரங்கு (Q&A Seminar)", "30 நாள் தமிழ் விசேட பரீட்சை (30-Day Tamil Exam)"] },
      { id: "f_notes", label: "விசேட குறிப்புகள் (Any Special Requirements)", type: "textarea", required: false }
    ]
  },
  {
    id: "form_contact_feedback",
    title: "பொதுத் தொடர்பு & கருத்துப் படிவம் (General Inquiries & Feedback)",
    description: "வகுப்புகள், கட்டண விபரங்கள் அல்லது உங்கள் ஆலோசனைகளை நேரடியாக எமக்குத் தெரிவிக்க இந்தப் படிவத்தைப் பயன்படுத்தவும்.",
    instituteSubtitle: "agrandinesh online academy",
    headerImage: "https://images.unsplash.com/photo-1577495508048-b635879837f1?q=80&w=1200&auto=format&fit=crop",
    descriptionPoints: [
      "வகுப்புகள் மற்றும் கட்டண விபரங்கள் தொடர்பான ஆலோசனைகள்.",
      "அகாடமி நிர்வாகக் குழுவின் நேரடி வழிகாட்டல் மற்றும் உதவி.",
      "விரைவான WhatsApp / தொலைபேசி பதில் சேவை."
    ],
    category: "contact",
    status: "active",
    themeColor: "#047857",
    successMessage: "உங்கள் கருத்து / வினவல் பெறப்பட்டது. எங்கள் நிர்வாகக் குழு விரைவில் உங்களுக்கு பதிலளிக்கும்.",
    maxSubmissionsPerPhone: 2,
    preventDuplicatePhone: true,
    createdAt: "2026-08-22T00:00:00.000Z",
    updatedAt: "2026-08-22T00:00:00.000Z",
    fields: [
      { id: "f_name", label: "உங்கள் பெயர் (Your Name)", type: "text", required: true },
      { id: "f_phone", label: "தொலைபேசி / WhatsApp இலக்கம்", type: "phone", required: true },
      { id: "f_district", label: "மாவட்டம் (District)", type: "district", required: true },
      { id: "f_topic", label: "கருத்துப் பிரிவு (Subject / Topic)", type: "select", required: true, options: ["வகுப்பு விபரம் (Class Details)", "கட்டணம் தொடர்பானவை (Fee Inquiries)", "சான்றிதழ் மற்றும் ஆவணங்கள் (Certificates)", "கருத்து / ஆலோசனை (Suggestions / Feedback)", "இதர விபரங்கள் (Other)"] },
      { id: "f_message", label: "உங்கள் செய்தி அல்லது வினவல் (Message / Inquiry)", type: "textarea", required: true, placeholder: "உங்கள் செய்தியை விரிவாக உள்ளிடவும்..." }
    ]
  }
];

// Instant Fast Form Fetch (Zero Delay for Students)
export const getFastFormById = (formId: string): CustomForm | null => {
  // Check local storage directly
  try {
    const raw = localStorage.getItem('forms');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const found = parsed.find((f: any) => f.id === formId);
        if (found) return found;
      }
    }
  } catch (e) {}

  // Check default template fallback
  return DEFAULT_FORMS.find(f => f.id === formId) || null;
};

// Asynchronous Form Fetch with Direct Firestore Document Lookup (Ensures phone and computer sync 100%)
export const getFormByIdAsync = async (formId: string): Promise<CustomForm | null> => {
  const fast = getFastFormById(formId);
  if (fast) return fast;

  if (isFirebaseConfigured && formId) {
    try {
      // 1. Direct document read from Firestore collection 'forms'
      const docRef = doc(db, 'forms', formId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = { ...docSnap.data(), id: docSnap.id } as CustomForm;
        // Update singleton list
        const currentForms = await getForms();
        if (!currentForms.some(f => f.id === formId)) {
          const updated = [data, ...currentForms];
          try {
            localStorage.setItem('forms', JSON.stringify(updated));
          } catch (e) {}
          saveForms(updated).catch(() => {});
        }
        return data;
      }
    } catch (e) {
      console.warn("Direct form fetch error:", e);
    }
  }

  // 2. Fetch full list as fallback
  const allForms = await getForms();
  return allForms.find(f => f.id === formId) || null;
};

export const getForms = async (): Promise<CustomForm[]> => {
  let list: CustomForm[] = [];

  // 1. Get from singletons / localStorage
  const fromSingleton = await getData('forms', null);
  if (Array.isArray(fromSingleton) && fromSingleton.length > 0) {
    list = [...fromSingleton];
  }

  // 2. In Firebase, query collection('forms') and merge any forms created across other devices/sessions
  if (isFirebaseConfigured) {
    try {
      const colSnap = await getDocs(collection(db, 'forms'));
      if (!colSnap.empty) {
        const colForms = colSnap.docs.map(d => ({ ...d.data(), id: d.id } as CustomForm));
        list = mergeArraysById(colForms, list);
      }
    } catch (e) {
      console.warn("Error querying forms collection:", e);
    }

    // Check specific known active form ID 'form_1787409164685' if not yet present in list
    if (!list.some(f => f.id === 'form_1787409164685')) {
      try {
        const specificSnap = await getDoc(doc(db, 'forms', 'form_1787409164685'));
        if (specificSnap.exists()) {
          const specData = { ...specificSnap.data(), id: specificSnap.id } as CustomForm;
          list.unshift(specData);
        }
      } catch (e) {}
    }
  }

  // 3. Fallback: Check if formSubmissions contain any formId (e.g. form_1787409164685) not in list
  try {
    const rawSubs = localStorage.getItem('formSubmissions');
    const subsToCheck = rawSubs ? JSON.parse(rawSubs) : [];
    if (Array.isArray(subsToCheck)) {
      for (const sub of subsToCheck) {
        if (sub && sub.formId && !list.some(f => f.id === sub.formId)) {
          // Direct fetch from Firestore doc
          let foundDoc = false;
          if (isFirebaseConfigured) {
            try {
              const dSnap = await getDoc(doc(db, 'forms', sub.formId));
              if (dSnap.exists()) {
                list.push({ ...dSnap.data(), id: dSnap.id } as CustomForm);
                foundDoc = true;
              }
            } catch (e) {}
          }
          // If still missing, reconstruct valid form item from submission
          if (!foundDoc) {
            list.push({
              id: sub.formId,
              title: sub.formTitle || `Online Registration Form (${sub.formId})`,
              description: "மாணவர் சேர்க்கை & பரீட்சைக்கான இணையவழி பதிவுப் படிவம்.",
              instituteSubtitle: "agrandinesh online academy",
              category: "admission",
              status: "active",
              themeColor: "#1e3a8a",
              headerImage: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1200&auto=format&fit=crop",
              fields: [
                { id: "f_name", label: "மாணவரின் முழுப் பெயர் (Student Full Name)", type: "text", required: true },
                { id: "f_phone", label: "WhatsApp / தொடர்பு இலக்கம்", type: "phone", required: true },
                { id: "f_district", label: "மாவட்டம் (District)", type: "district", required: true },
                { id: "f_grade", label: "தரம் / வகுப்பு (Grade)", type: "grade", required: true }
              ],
              createdAt: sub.submittedAt || new Date().toISOString(),
              updatedAt: sub.submittedAt || new Date().toISOString()
            });
          }
        }
      }
    }
  } catch (e) {}

  if (list.length === 0) {
    list = DEFAULT_FORMS;
    await saveData('forms', DEFAULT_FORMS);
  }

  try {
    localStorage.setItem('forms', JSON.stringify(list));
  } catch (e) {}

  return list;
};

export const saveForms = async (forms: CustomForm[]): Promise<void> => {
  const clean = Array.isArray(forms) ? forms : [];
  
  // Also write individual form documents to Firestore
  if (isFirebaseConfigured) {
    try {
      for (const form of clean) {
        if (form && form.id) {
          const docRef = doc(db, 'forms', String(form.id));
          await setDoc(docRef, { ...form, updatedAt: form.updatedAt || new Date().toISOString() }, { merge: true });
        }
      }
    } catch (e) {
      console.warn("Error saving individual form docs to Firebase:", e);
    }
  }

  return saveData('forms', clean);
};

export const deleteForm = async (formId: string): Promise<CustomForm[]> => {
  const targetId = String(formId || '').trim();
  const forms = await getForms();
  const updatedForms = forms.filter(f => String(f.id).trim() !== targetId);
  
  if (isFirebaseConfigured && targetId) {
    try {
      await deleteDoc(doc(db, 'forms', targetId));
    } catch (e) {
      console.warn("Error deleting form doc from Firestore:", e);
    }
  }

  await saveData('forms', updatedForms);

  // Also clean up and permanently delete submissions for this form
  const submissions = await getFormSubmissions();
  const toDeleteSubs = submissions.filter(s => String(s.formId).trim() === targetId);
  const updatedSubmissions = submissions.filter(s => String(s.formId).trim() !== targetId);
  
  if (isFirebaseConfigured) {
    for (const sub of toDeleteSubs) {
      if (sub && sub.id) {
        deleteDoc(doc(db, 'formSubmissions', String(sub.id))).catch(() => {});
      }
    }
  }

  await saveData('formSubmissions', updatedSubmissions);

  return updatedForms;
};

export const extractSubmissionFields = (
  form: CustomForm | undefined,
  payload: Record<string, any>,
  existing?: Partial<FormSubmission>
): {
  studentName: string;
  rollNo: string;
  district: string;
  grade: string;
  phone: string;
  email: string;
} => {
  const data = payload || {};
  let studentName = existing?.studentName || '';
  let rollNo = existing?.rollNo || '';
  let district = existing?.district || '';
  let grade = existing?.grade || '';
  let phone = existing?.phone || '';
  let email = existing?.email || '';

  // 1. If form is defined, check field definitions (by type, label, or id)
  if (form && Array.isArray(form.fields)) {
    for (const field of form.fields) {
      const val = data[field.id];
      if (val === undefined || val === null || String(val).trim() === '') continue;
      const strVal = String(val).trim();
      const lbl = (field.label || '').toLowerCase();

      // Phone
      if (!phone && (field.type === 'phone' || field.id === form.phoneFieldId || /phone|mobile|whatsapp|தொடர்பு|தொலைபேசி|இலக்கம்/i.test(lbl))) {
        phone = strVal;
      }
      // District
      if (!district && (field.type === 'district' || /district|மாவட்டம்/i.test(lbl))) {
        district = strVal;
      }
      // Grade
      if (!grade && (field.type === 'grade' || /grade|class|வகுப்பு|தரம்/i.test(lbl))) {
        grade = strVal;
      }
      // Student Name
      if (!studentName && (field.type === 'text' || field.type === 'textarea') && /பெயர்|name|மாணவர்|student/i.test(lbl) && !/பாடசாலை|school|பெற்றோர்|parent|பரீட்சை|exam/i.test(lbl)) {
        studentName = strVal;
      }
      // Roll No
      if (!rollNo && /roll|பதிவு\s*எண்|குறியீடு|index/i.test(lbl)) {
        rollNo = strVal;
      }
      // Email
      if (!email && (field.type === 'email' || /email|மின்னஞ்சல்|mail/i.test(lbl))) {
        email = strVal;
      }
    }
  }

  // 2. Direct key heuristics across payload
  for (const [key, rawVal] of Object.entries(data)) {
    if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') continue;
    const val = String(rawVal).trim();
    const k = key.toLowerCase();

    // Phone detection
    if (!phone) {
      if (/phone|mobile|whatsapp|தொடர்பு|தொலைபேசி/i.test(k)) {
        phone = val;
      } else {
        const cleanDigits = val.replace(/[^0-9]/g, '');
        if (cleanDigits.length >= 9 && cleanDigits.length <= 12 && (cleanDigits.startsWith('07') || cleanDigits.startsWith('7') || cleanDigits.startsWith('947') || cleanDigits.startsWith('01') || cleanDigits.startsWith('02') || cleanDigits.startsWith('03') || cleanDigits.startsWith('04') || cleanDigits.startsWith('05') || cleanDigits.startsWith('06') || cleanDigits.startsWith('08') || cleanDigits.startsWith('09'))) {
          phone = val;
        }
      }
    }

    // District detection
    if (!district) {
      if (/district|மாவட்டம்/i.test(k)) {
        district = val;
      } else {
        const match = SRI_LANKA_DISTRICTS.find(d => d.toLowerCase().includes(val.toLowerCase()) || val.toLowerCase().includes(d.toLowerCase().split(' ')[0]));
        if (match) {
          district = match;
        }
      }
    }

    // Grade detection
    if (!grade) {
      if (/grade|class|வகுப்பு|தரம்/i.test(k)) {
        grade = val;
      } else if (/^(தரம்\s*\d+|grade\s*\d+|o\/l|a\/l|தரம்\s*0?[6-9]|தரம்\s*1[0-1])/i.test(val)) {
        grade = val;
      }
    }

    // Student Name detection
    if (!studentName) {
      if (/name|பெயர்|மாணவர்|student|f_name/i.test(k) && !/parent|school|பாடசாலை|பெற்றோர்/i.test(k)) {
        studentName = val;
      }
    }

    // Roll No detection
    if (!rollNo && /roll|reg|பதிவு|index/i.test(k)) {
      rollNo = val;
    }

    // Email detection
    if (!email) {
      if (/email|mail|மின்னஞ்சல்/i.test(k) || (val.includes('@') && val.includes('.'))) {
        email = val;
      }
    }
  }

  // 3. Fallback for Name if still empty: take first non-empty text string that isn't phone, district, grade or email
  if (!studentName) {
    for (const [key, rawVal] of Object.entries(data)) {
      if (typeof rawVal === 'string' && rawVal.trim().length > 1) {
        const str = rawVal.trim();
        if (str !== phone && str !== district && str !== grade && str !== email && !str.includes('@') && !/^\d+$/.test(str)) {
          studentName = str;
          break;
        }
      }
    }
  }

  return {
    studentName: studentName.trim(),
    rollNo: rollNo.trim(),
    district: district.trim(),
    grade: grade.trim(),
    phone: phone.trim(),
    email: email.trim()
  };
};

export const getFormSubmissions = async (): Promise<FormSubmission[]> => {
  let list: FormSubmission[] = [];

  // 1. Fetch from singletons / localStorage
  const fromSingleton = await getData('formSubmissions', []);
  if (Array.isArray(fromSingleton) && fromSingleton.length > 0) {
    list = [...fromSingleton];
  }

  // 2. Fetch all individual submissions from Firestore collection 'formSubmissions' to ensure multi-device live submissions are always included
  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(collection(db, 'formSubmissions'));
      if (!snap.empty) {
        const colSubs = snap.docs.map(d => ({ ...d.data(), id: d.id } as FormSubmission));
        list = mergeArraysById(colSubs, list);
      }
    } catch (e) {
      console.warn("Error fetching formSubmissions collection:", e);
    }
  }

  if (list.length === 0) return [];

  // Auto-heal any past submissions that have missing top-level fields
  const forms = await getForms();
  let hasRepairs = false;

  const healed = list.map(sub => {
    if (!sub) return sub;
    const form = forms.find(f => f.id === sub.formId);
    const extracted = extractSubmissionFields(form, sub.data || {}, sub);
    
    if (
      (!sub.studentName && extracted.studentName) ||
      (!sub.district && extracted.district) ||
      (!sub.grade && extracted.grade) ||
      (!sub.phone && extracted.phone) ||
      (!sub.email && extracted.email) ||
      (!sub.formTitle && form?.title)
    ) {
      hasRepairs = true;
      return {
        ...sub,
        formTitle: sub.formTitle || form?.title || "Online Registration Form",
        studentName: sub.studentName || extracted.studentName,
        rollNo: sub.rollNo || extracted.rollNo,
        district: sub.district || extracted.district,
        grade: sub.grade || extracted.grade,
        phone: sub.phone || extracted.phone,
        email: sub.email || extracted.email,
      };
    }
    return sub;
  });

  // Sort by newest submittedAt timestamp descending
  healed.sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());

  try {
    localStorage.setItem('formSubmissions', JSON.stringify(healed));
  } catch (e) {}

  if (hasRepairs && isFirebaseConfigured) {
    saveData('formSubmissions', healed).catch(() => {});
  }

  return healed;
};

export const saveFormSubmissions = async (submissions: FormSubmission[]): Promise<void> => {
  const clean = Array.isArray(submissions) ? submissions : [];
  
  if (isFirebaseConfigured) {
    try {
      for (const sub of clean.slice(0, 50)) {
        if (sub && sub.id) {
          setDoc(doc(db, 'formSubmissions', String(sub.id)), sub, { merge: true }).catch(() => {});
        }
      }
    } catch (e) {}
  }

  return saveData('formSubmissions', clean);
};

export const deleteFormSubmission = async (submissionId: string): Promise<FormSubmission[]> => {
  const targetId = String(submissionId || '').trim();
  const submissions = await getFormSubmissions();
  
  // Filter out any item matching targetId (by id or trimmed id)
  const updated = submissions.filter(s => {
    if (!s) return false;
    const sId = String(s.id || '').trim();
    return sId !== targetId;
  });

  // 1. Explicitly delete doc from Firestore collection if exists
  if (isFirebaseConfigured && targetId) {
    try {
      await deleteDoc(doc(db, 'formSubmissions', targetId));
    } catch (e) {
      console.warn("Firestore delete submission doc error:", e);
    }
  }

  // 2. Clear and rewrite local storage
  try {
    localStorage.setItem('formSubmissions', JSON.stringify(updated));
  } catch (e) {}

  // 3. Overwrite singletons/formSubmissions in Firestore
  if (isFirebaseConfigured) {
    try {
      const singletonRef = doc(db, 'singletons', 'formSubmissions');
      await setDoc(singletonRef, { data: updated, updatedAt: Date.now() }, { merge: false });
    } catch (e) {
      console.warn("Firestore singleton delete update error:", e);
    }
  }

  window.dispatchEvent(new CustomEvent('db_updated', { detail: { key: 'formSubmissions', data: updated } }));

  return updated;
};

export const deleteAllFormSubmissions = async (formId?: string): Promise<FormSubmission[]> => {
  const submissions = await getFormSubmissions();
  let remaining: FormSubmission[] = [];
  let toDelete: FormSubmission[] = [];

  if (formId && formId !== 'all') {
    const targetFormId = String(formId).trim();
    remaining = submissions.filter(s => String(s.formId).trim() !== targetFormId);
    toDelete = submissions.filter(s => String(s.formId).trim() === targetFormId);
  } else {
    remaining = [];
    toDelete = [...submissions];
  }

  // 1. Delete all individual documents from Firestore collection
  if (isFirebaseConfigured) {
    for (const sub of toDelete) {
      if (sub && sub.id) {
        deleteDoc(doc(db, 'formSubmissions', String(sub.id))).catch(() => {});
      }
    }
  }

  await saveData('formSubmissions', remaining);
  return remaining;
};

export const purgeDatabaseCache = async (): Promise<void> => {
  // Trigger sync with Firestore
  if (isFirebaseConfigured) {
    try {
      await syncDatabaseWithCloud(true);
    } catch (e) {}
  }
};

export const checkPhoneSubmissionStatus = async (formId: string, rawPhone: string) => {
  if (!rawPhone || !formId) {
    return { count: 0, maxLimit: 1, isAllowed: true, submissions: [], preventDuplicates: true, reason: '' };
  }
  const normalized = normalizePhoneNumber(rawPhone);
  if (!normalized) {
    return { count: 0, maxLimit: 1, isAllowed: true, submissions: [], preventDuplicates: true, reason: '' };
  }

  const [forms, existingSubmissions] = await Promise.all([
    getForms(),
    getFormSubmissions()
  ]);

  const form = forms.find(f => f.id === formId);
  const maxLimit = form?.maxSubmissionsPerPhone !== undefined ? form.maxSubmissionsPerPhone : 1;
  const preventDuplicates = form?.preventDuplicatePhone !== false;

  const userSubmissions = existingSubmissions.filter(s => {
    if (s.formId !== formId) return false;
    const subPhone = normalizePhoneNumber(s.phone || s.data?.f_phone || s.data?.phone || s.data?.whatsapp || '');
    return subPhone === normalized;
  });

  const count = userSubmissions.length;
  const isAllowed = !preventDuplicates || maxLimit === 0 || count < maxLimit;
  let reason = '';
  if (!isAllowed) {
    if (maxLimit === 1) {
      reason = "இந்த தொலைபேசி இலக்கத்தைப் பயன்படுத்தி ஏற்கனவே ஒரு பதிவு சமர்ப்பிக்கப்பட்டுள்ளது (1 submission per phone only).";
    } else {
      reason = `இந்த தொலைபேசி இலக்கத்திற்கான அதிகபட்ச சமர்ப்பிப்பு வரம்பை (${maxLimit} முறைகள்) எட்டிவிட்டது.`;
    }
  }

  return {
    count,
    maxLimit,
    isAllowed,
    submissions: userSubmissions,
    preventDuplicates,
    reason
  };
};

export const submitFormResponse = async (formId: string, payload: Record<string, any>): Promise<FormSubmission> => {
  const forms = await getForms();
  const form = forms.find(f => f.id === formId);
  const formTitle = form ? form.title : "Custom Form Submission";

  if (form && form.status === 'closed') {
    throw new Error("மன்னிக்கவும், இந்தப் படிவம் தற்போது புதிய சமர்ப்பிப்புகளை ஏற்றுக்கொள்ளவில்லை (This form is closed).");
  }

  // Auto-detect standard fields dynamically using field types, labels and values
  const extracted = extractSubmissionFields(form, payload);
  const { studentName, rollNo, district, grade, phone, email } = extracted;

  // Duplicate Phone Number & Submission Limits Check
  const maxAllowed = form?.maxSubmissionsPerPhone !== undefined ? form.maxSubmissionsPerPhone : 1;
  const preventDuplicates = form?.preventDuplicatePhone !== false;

  const existingSubmissions = await getFormSubmissions();

  if (phone && preventDuplicates && maxAllowed > 0) {
    const normalizedInputPhone = normalizePhoneNumber(phone);
    const matches = existingSubmissions.filter(s => {
      if (s.formId !== formId) return false;
      const sPhone = normalizePhoneNumber(s.phone || s.data?.f_phone || s.data?.phone || s.data?.whatsapp || '');
      return sPhone === normalizedInputPhone;
    });

    if (matches.length >= maxAllowed) {
      if (maxAllowed === 1) {
        throw new Error(`இந்த தொலைபேசி இலக்கம் (${phone}) ஏற்கனவே பதிவு செய்யப்பட்டுள்ளது. இந்தப் படிவத்தில் ஒரு முறை மட்டுமே (1 time only) பதிவு செய்ய முடியும். ஏதேனும் மாற்றம் செய்ய வேண்டியிருப்பின் நிர்வாகியைத் தொடர்பு கொள்ளவும்.`);
      } else {
        throw new Error(`இந்த தொலைபேசி இலக்கம் (${phone}) ஏற்கனவே ${matches.length} முறை பதிவு செய்யப்பட்டுள்ளது. அதிகபட்ச வரம்பு (${maxAllowed} முறை) முடிவடைந்தது.`);
      }
    }
  }

  const newSubmission: FormSubmission = {
    id: "sub_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    formId,
    formTitle,
    studentName,
    rollNo,
    district,
    grade,
    phone,
    email,
    data: payload,
    submittedAt: new Date().toISOString(),
    status: 'new'
  };

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, 'formSubmissions', newSubmission.id), newSubmission);
    } catch (e) {
      console.warn("Direct Firestore submission write error:", e);
    }
  }

  const updated = [newSubmission, ...existingSubmissions];
  await saveFormSubmissions(updated);

  return newSubmission;
};

export const syncDatabaseWithCloud = async (_forceRefresh: boolean = false): Promise<void> => {
  // Re-fetch essential collections directly from database
  await Promise.all([
    getData('students', []),
    getData('fees', []),
    getData('forms', DEFAULT_FORMS),
    getData('formSubmissions', [])
  ]);
};

export const getNotifications = (grade: string) => {
  if (isFirebaseConfigured) {
    // We return a query that can be used with onSnapshot
    return query(collection(db, 'notifications'), where('grade', '==', grade));
  }
  return null;
};

export const addNotification = async (notification: { grade: string, title: string, message: string, type: string, createdAt: string }) => {
  if (isFirebaseConfigured) {
    const docRef = doc(collection(db, 'notifications'));
    await setDoc(docRef, { ...notification, id: docRef.id });
  } else {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    notifications.push({ ...notification, id: Date.now().toString() });
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }
};

export const getChatMessages = () => getData('chatMessages', []);
export const saveChatMessages = (messages: any) => saveData('chatMessages', messages);

export const initDB = async () => {
  await getStudents();
  await getStaffs();
  
  if (!isFirebaseConfigured) {
    const zoomLinks = await getZoomLinks();
    if (!zoomLinks || zoomLinks.length === 0) {
      await saveZoomLinks([
        { id: "1", grade: "தரம் 10", title: "Tamil Live Class", link: "https://zoom.us/j/123456789", datetime: "2026-03-05T10:00" }
      ]);
    }
    
    const courses = await getCourses();
    if (!courses || courses.length === 0) {
      await saveCourses([]);
    }
    
    const youtubeLinks = await getYoutubeLinks();
    if (!youtubeLinks || youtubeLinks.length === 0) {
      await saveYoutubeLinks([
        { id: "1", title: "Tamil Chapter 1", link: "https://www.youtube.com/watch?v=12345", folder: "General", grade: "தரம் 10", date: new Date().toISOString() }
      ]);
    }
    
    const schedule = await getSchedule();
    if (!schedule || schedule.length === 0) {
      await saveSchedule([
        { id: "1", grade: "தரம் 10", day: "Monday", time: "08:00 AM", subject: "Tamil", link: "https://zoom.us/j/123" }
      ]);
    }
    
    const classLinks = await getClassLinks();
    if (!classLinks || Object.keys(classLinks).length === 0) {
      await saveClassLinks({});
    }
    
    const homework = await getHomework();
    if (!homework || homework.length === 0) {
      await saveHomework([
        {
          id: "1",
          grade: "தரம் 10",
          title: "Tamil Chapter 1 Exercise",
          description: "Complete all exercises at the end of Chapter 1.",
          date: new Date().toISOString().split('T')[0]
        }
      ]);
    }
  }
};

// மாணவரின் கட்டண விபரத்தைப் பெற
export const getStudentPayments = async (studentId: string) => {
  if (isFirebaseConfigured) {
    try {
      const q = query(collection(db, "payments"), where("student_id", "==", studentId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.warn("Firebase error fetching student payments:", error);
    }
  }
  return [];
};

export const ALL_BACKUP_COLLECTIONS = [
  'adminSettings', 'homePageContent', 'chatbotSettings', 'passwordRequests',
  'students', 'zoomLinks', 'courses', 'courseMaterials', 'youtubeLinks',
  'fees', 'attendance', 'schedule', 'classLinks', 'courseWebsiteLinks',
  'classes', 'homework', 'staffs', 'staffAttendance', 'subjects',
  'incomeExpense', 'grades', 'timetable', 'examMarks', 'webPosts',
  'examSettings', 'announcements', 'behaviourRecords', 'questionPapers',
  'chatMessages', 'forms', 'formSubmissions', 'employeeTasks', 'dailyWorkUploads'
];

export interface BackupOptions {
  pathPrefix?: string;
  selectedCollections?: string[];
  dateFilter?: {
    enabled: boolean;
    startDate?: string;
    endDate?: string;
  };
  note?: string;
}

export const exportCustomPathBackup = async (options: BackupOptions = {}) => {
  const targetCollections = (options.selectedCollections && options.selectedCollections.length > 0)
    ? options.selectedCollections
    : ALL_BACKUP_COLLECTIONS;

  const pathPrefix = options.pathPrefix?.trim() || "Backups/Auto_Date";
  const backupData: Record<string, any> = {};

  for (const key of targetCollections) {
    try {
      let rawData = await getData(key, null);
      
      // Apply date filtering if enabled and data is an array
      if (options.dateFilter?.enabled && Array.isArray(rawData)) {
        const start = options.dateFilter.startDate ? new Date(options.dateFilter.startDate).getTime() : 0;
        const end = options.dateFilter.endDate ? new Date(options.dateFilter.endDate + 'T23:59:59.999Z').getTime() : Infinity;

        rawData = rawData.filter((item: any) => {
          if (!item) return false;
          const itemDateStr = item.date || item.paymentDate || item.examDate || item.createdAt || item.timestamp;
          if (!itemDateStr) return true; // Keep items without date (e.g. Master records)
          const itemTime = new Date(itemDateStr).getTime();
          if (isNaN(itemTime)) return true;
          return itemTime >= start && itemTime <= end;
        });
      }

      backupData[key] = rawData;
    } catch (e) {
      console.error(`Error backing up collection ${key}:`, e);
    }
  }

  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-GB") + " " + now.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true });

  return {
    system: "Agaram Dhines Online Academy",
    version: "2.0",
    path: pathPrefix,
    exportDate: now.toISOString(),
    exportDateFormatted: dateFormatted,
    note: options.note || "Date & Path Backup",
    dateFilter: options.dateFilter || { enabled: false },
    includedCollections: targetCollections,
    data: backupData
  };
};

export const exportFullSystemBackup = async () => {
  return exportCustomPathBackup({
    pathPrefix: "Backups/Full_System",
    selectedCollections: ALL_BACKUP_COLLECTIONS,
    note: "Full System Backup"
  });
};

export const restoreCustomPathBackup = async (backupPayload: any, selectedKeysToRestore?: string[]) => {
  if (!backupPayload || typeof backupPayload !== 'object' || !backupPayload.data) {
    throw new Error('செல்லுபடியற்ற காப்புப்பிரதி கோப்பு (Invalid backup file format)');
  }
  const dataMap = backupPayload.data;
  const allowedKeys = selectedKeysToRestore && selectedKeysToRestore.length > 0
    ? selectedKeysToRestore
    : Object.keys(dataMap);

  const restoredList: string[] = [];

  for (const key of allowedKeys) {
    if (ALL_BACKUP_COLLECTIONS.includes(key) && dataMap[key] !== null && dataMap[key] !== undefined) {
      await saveData(key, dataMap[key]);
      restoredList.push(key);
    }
  }
  return {
    success: true,
    restoredCollections: restoredList,
    totalRestored: restoredList.length
  };
};

export const restoreFullSystemBackup = async (backupPayload: any) => {
  return restoreCustomPathBackup(backupPayload);
};

export const getSystemBackups = async () => {
  return getData('systemBackups', []);
};

export const saveSystemBackupSnapshot = async (options: string | BackupOptions = "Manual Backup") => {
  const backupOptions: BackupOptions = typeof options === 'string'
    ? { note: options, pathPrefix: "Backups/" + new Date().toISOString().split('T')[0] }
    : options;

  const fullBackup = await exportCustomPathBackup(backupOptions);
  const existingBackups = await getData('systemBackups', []);
  
  const newSnapshot = {
    id: "backup_" + Date.now(),
    path: fullBackup.path,
    dateStr: fullBackup.exportDate,
    formattedDate: fullBackup.exportDateFormatted,
    note: fullBackup.note,
    dateFilter: fullBackup.dateFilter,
    includedCollections: fullBackup.includedCollections,
    data: fullBackup.data
  };

  const updatedList = [newSnapshot, ...(Array.isArray(existingBackups) ? existingBackups : [])].slice(0, 30); // keep last 30 date backups
  await saveData('systemBackups', updatedList);
  return newSnapshot;
};

export const deleteSystemBackupSnapshot = async (id: string) => {
  const existingBackups = await getData('systemBackups', []);
  if (Array.isArray(existingBackups)) {
    const updated = existingBackups.filter((b: any) => b.id !== id);
    await saveData('systemBackups', updated);
  }
};

