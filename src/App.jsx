import React, { useState, useRef, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, Calendar, Plus, Image as ImageIcon, 
  CheckCircle, Circle, Trash2, BookOpen, X, Clock, 
  Star, Droplet, Book, Activity, Tag, 
  User, LogOut, Code, Leaf, Timer, BarChart3, TrendingUp,
  Award, CheckCircle2, Coffee, Heart, Sparkles, Monitor
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithCustomToken, 
  onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup,
  setPersistence, browserLocalPersistence
} from 'firebase/auth';
import { 
  getFirestore, collection, onSnapshot, 
  doc, setDoc, deleteDoc 
} from 'firebase/firestore';

// --- FİREBASE AYARLARI ---
const firebaseConfig = {
  apiKey: "AIzaSyC_1GSrfrnAsLhOdkwYoRmjZFDKsLyC3Mg",
  authDomain: "planlayici-484848.firebaseapp.com",
  projectId: "planlayici-484848",
  storageBucket: "planlayici-484848.firebasestorage.app",
  messagingSenderId: "238118360689",
  appId: "1:238118360689:web:dacb560b1081674190add0",
  measurementId: "G-NSPSEBRGNJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'benim-planlayicim';

// --- SABİT DEĞERLER VE HARİTALAMALAR ---
const ICON_MAP = { Activity, Droplet, Book, Code, Leaf, Coffee, Heart, Star, Sparkles, Monitor };

const HABIT_COLORS = [
  { id: 'blue', text: 'text-blue-400', bg: 'bg-blue-950/40', border: 'border-blue-900/50' },
  { id: 'emerald', text: 'text-emerald-400', bg: 'bg-emerald-950/40', border: 'border-emerald-900/50' },
  { id: 'rose', text: 'text-rose-400', bg: 'bg-rose-950/40', border: 'border-rose-900/50' },
  { id: 'amber', text: 'text-amber-400', bg: 'bg-amber-950/40', border: 'border-amber-900/50' },
  { id: 'purple', text: 'text-purple-400', bg: 'bg-purple-950/40', border: 'border-purple-900/50' }
];

const CATEGORIES = ['Kişisel', 'İş', 'Okul', 'Ev', 'Sabah Vardiyası', 'Akşam Vardiyası', 'Gece Vardiyası', 'İrem Nur', 'Mert'];
const CATEGORY_COLORS = {
  'Kişisel': 'bg-purple-950/30 text-purple-400 border border-purple-900/50',
  'İş': 'bg-blue-950/30 text-blue-400 border border-blue-900/50',
  'Okul': 'bg-yellow-950/30 text-yellow-400 border border-yellow-900/50',
  'Ev': 'bg-emerald-950/30 text-emerald-400 border border-emerald-900/50',
  'Sabah Vardiyası': 'bg-orange-950/30 text-orange-400 border border-orange-900/50',
  'Akşam Vardiyası': 'bg-indigo-950/30 text-indigo-400 border border-indigo-900/50',
  'Gece Vardiyası': 'bg-zinc-900 text-zinc-300 border border-zinc-800',
  'İrem Nur': 'bg-pink-950/30 text-pink-400 border border-pink-900/50',
  'Mert': 'bg-teal-950/30 text-teal-400 border border-teal-900/50'
};

const MOODS = [
  { id: 'harika', emoji: '🤩', label: 'Harika', color: 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50' },
  { id: 'iyi', emoji: '😊', label: 'İyi', color: 'bg-blue-950/30 text-blue-400 border-blue-900/50' },
  { id: 'sakin', emoji: '😌', label: 'Sakin', color: 'bg-purple-950/30 text-purple-400 border-purple-900/50' },
  { id: 'uzgun', emoji: '😔', label: 'Üzgün', color: 'bg-zinc-900 text-zinc-400 border-zinc-800' },
  { id: 'stresli', emoji: '😡', label: 'Stresli', color: 'bg-rose-950/30 text-rose-400 border-rose-900/50' }
];

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true); // YÜKLEME EKRANI İÇİN YENİ STATE
  
  const [tasks, setTasks] = useState([]);
  const [journals, setJournals] = useState({});
  const [moods, setMoods] = useState({});
  const [dailyHabits, setDailyHabits] = useState({});
  const [customHabits, setCustomHabits] = useState([]);
  const [countdowns, setCountdowns] = useState([]);

  // Görev Formu
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Kişisel');
  const [newTaskImportant, setNewTaskImportant] = useState(false);
  const [newTaskImage, setNewTaskImage] = useState(null);
  
  // Geri Sayım Formu
  const [newCountdownTitle, setNewCountdownTitle] = useState('');
  const [newCountdownDate, setNewCountdownDate] = useState('');
  const [showCountdownForm, setShowCountdownForm] = useState(false);

  // Alışkanlık Formu
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [isEditHabitMode, setIsEditHabitMode] = useState(false);
  const [newHabitLabel, setNewHabitLabel] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('Activity');
  const [newHabitColor, setNewHabitColor] = useState('blue');

  const [activeTab, setActiveTab] = useState('tasks');
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);

  const loginWithGoogle = async () => {
    try { 
      await setPersistence(auth, browserLocalPersistence); // Giriş yaparken de kalıcılığı garantile
      await signInWithPopup(auth, new GoogleAuthProvider()); 
    } 
    catch (err) { console.error("Giriş Hatası:", err); }
  };

  const handleLogout = async () => {
    try { 
      await signOut(auth); 
      setUser(null); setTasks([]); setJournals({}); setCountdowns([]); setCustomHabits([]);
    } catch (err) { console.error(err); }
  };

  // --- OTURUM KALICILIĞI KESİN ÇÖZÜM ---
  useEffect(() => {
    let unsubscribe;

    const initAuth = async () => {
      try {
        // 1. KURAL: Tarayıcı kapatılsa da sekme yenilense de oturumun kalıcı olmasını zorla
        await setPersistence(auth, browserLocalPersistence);

        // 2. KURAL: Canvas önizleme ortamındaysak geçici test girişi yap
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token && !auth.currentUser) {
          try { await signInWithCustomToken(auth, __initial_auth_token); } catch(e) {}
        }

        // 3. KURAL: Oturum durumunu dinle ve hesabı bulunca yükleme ekranını (spinner) kapat
        unsubscribe = onAuthStateChanged(auth, (currentUser) => { 
          setUser(currentUser); 
          setIsAuthChecking(false); // Firebase veriyi okudu, artık ekranı gösterebiliriz!
        });

      } catch (error) { 
        console.error("Auth init error:", error); 
        setIsAuthChecking(false);
      }
    };
    
    initAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const unsubTasks = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'tasks'), (snap) => {
      const loaded = snap.docs.map(doc => doc.data());
      loaded.sort((a, b) => (b.isImportant - a.isImportant) || (a.time || '').localeCompare(b.time || ''));
      setTasks(loaded);
    });

    const unsubJournals = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'journals'), (snap) => {
      const loaded = {}; snap.docs.forEach(d => loaded[d.id] = d.data().text); setJournals(loaded);
    });

    const unsubMoods = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'moods'), (snap) => {
      const loaded = {}; snap.docs.forEach(d => loaded[d.id] = d.data().moodId); setMoods(loaded);
    });

    const unsubDailyHabits = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'habits'), (snap) => {
      const loaded = {}; snap.docs.forEach(d => loaded[d.id] = d.data().completed || []); setDailyHabits(loaded);
    });

    const unsubCustomHabits = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'customHabits'), (snap) => {
      const loaded = snap.docs.map(doc => doc.data());
      loaded.sort((a, b) => a.label.localeCompare(b.label));
      setCustomHabits(loaded);
    });

    const unsubCountdowns = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'countdowns'), (snap) => {
      const loaded = snap.docs.map(doc => doc.data());
      loaded.sort((a, b) => new Date(a.date) - new Date(b.date));
      setCountdowns(loaded);
    });

    return () => { unsubTasks(); unsubJournals(); unsubMoods(); unsubDailyHabits(); unsubCustomHabits(); unsubCountdowns(); };
  }, [user]);

  const currentDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const displayDate = currentDate.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim() || !user) return;
    const newTask = {
      id: Date.now().toString(), dateStr: currentDateStr, time: newTaskTime || 'Tüm Gün', 
      text: newTaskText, completed: false, isImportant: newTaskImportant, category: newTaskCategory, image: newTaskImage
    };
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', newTask.id), newTask);
    setNewTaskText(''); setNewTaskTime(''); setNewTaskImportant(false); setNewTaskCategory('Kişisel'); setNewTaskImage(null);
  };

  const addCountdown = async (e) => {
    e.preventDefault();
    if (!newCountdownTitle || !newCountdownDate || !user) return;
    const newItem = { id: Date.now().toString(), title: newCountdownTitle, date: newCountdownDate };
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'countdowns', newItem.id), newItem);
    setNewCountdownTitle(''); setNewCountdownDate(''); setShowCountdownForm(false);
  };
  const deleteCountdown = async (id) => { if (user) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'countdowns', id)); };

  const addCustomHabit = async (e) => {
    e.preventDefault();
    if (!newHabitLabel.trim() || !user) return;
    const newHabit = {
      id: Date.now().toString(),
      label: newHabitLabel,
      icon: newHabitIcon,
      color: newHabitColor
    };
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'customHabits', newHabit.id), newHabit);
    setNewHabitLabel(''); setShowHabitForm(false);
  };
  const deleteCustomHabit = async (id) => { if (user) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'customHabits', id)); };

  const toggleTask = async (id) => { const t = tasks.find(x => x.id === id); if (t && user) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', id), { ...t, completed: !t.completed }); };
  const deleteTask = async (id) => { if (user) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', id)); };
  
  const toggleHabit = async (id) => {
    if (!user) return;
    const current = dailyHabits[currentDateStr] || [];
    const newH = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'habits', currentDateStr), { completed: newH });
  };
  
  const selectMood = async (moodId) => { if (user) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'moods', currentDateStr), { moodId }); };
  
  const handleJournalChange = (e) => {
    const text = e.target.value; setJournals(prev => ({ ...prev, [currentDateStr]: text }));
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => { if (user) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'journals', currentDateStr), { text }); }, 1000);
  };

  const handleImageUpload = (e) => {
    if (e.target.files[0]) {
      const reader = new FileReader(); reader.onloadend = () => setNewTaskImage(reader.result); reader.readAsDataURL(e.target.files[0]);
    }
  };

  const todaysTasks = tasks.filter(t => t.dateStr === currentDateStr);
  const totalCompletedTasks = tasks.filter(t => t.completed).length;
  const completionRate = tasks.length > 0 ? Math.round((totalCompletedTasks / tasks.length) * 100) : 0;
  const currentHabits = dailyHabits[currentDateStr] || [];

  // --- YÜKLEME EKRANI ---
  // Firebase giriş bilgisini okuyana kadar bu şık bekleme ekranı gösterilir
  if (isAuthChecking) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center text-zinc-500 gap-4 selection:bg-indigo-500/30">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-semibold text-sm animate-pulse tracking-wide">Oturum bilgileri kontrol ediliyor...</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col font-sans bg-black text-zinc-200 selection:bg-indigo-500/30">
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* --- ÜST MENÜ (HEADER) --- */}
        <header className="bg-[#0a0a0a] border-b border-zinc-900 px-4 sm:px-6 py-3 flex items-center justify-between z-20 shrink-0 shadow-lg">
          <div className="flex items-center gap-3 text-indigo-500">
            <div className="bg-indigo-950/40 border border-indigo-900/50 p-2 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold hidden sm:block tracking-tight text-zinc-100">Planlayıcım</h1>
          </div>
          
          <div className="flex items-center gap-2 bg-[#111] p-1.5 rounded-2xl border border-zinc-800 shadow-inner">
            <button onClick={() => {const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d);}} className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-xl transition-all"><ChevronLeft className="w-5 h-5"/></button>
            <div className="flex items-center gap-2 px-2 md:px-4 cursor-pointer" onClick={() => setCurrentDate(new Date())}>
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span className="font-bold text-sm sm:text-base whitespace-nowrap text-zinc-100">{displayDate}</span>
            </div>
            <button onClick={() => {const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d);}} className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 rounded-xl transition-all"><ChevronRight className="w-5 h-5"/></button>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            {user && !user.isAnonymous ? (
              <div className="flex items-center gap-2 bg-[#111] p-1.5 rounded-2xl border border-zinc-800">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profil" className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-cover" />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">{user.email?.charAt(0).toUpperCase() || 'U'}</div>
                )}
                <span className="text-sm font-bold hidden sm:inline px-1 text-zinc-300">{user.displayName?.split(' ')[0] || 'Kullanıcı'}</span>
                <button onClick={handleLogout} className="text-zinc-500 hover:text-rose-500 p-1.5 rounded-xl hover:bg-zinc-800 transition-colors" title="Çıkış Yap">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={loginWithGoogle} className="flex items-center gap-2 bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm transition-colors border border-indigo-500/50">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Giriş Yap</span>
              </button>
            )}
          </div>
        </header>

        {/* --- ANA İÇERİK ALANI --- */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* YAN MENÜ (SIDEBAR) */}
          <nav className="bg-[#0a0a0a] border-r border-zinc-900 w-full md:w-24 lg:w-64 shrink-0 flex md:flex-col p-2 md:p-4 gap-2 z-10 overflow-x-auto md:overflow-y-auto">
            <button onClick={() => setActiveTab('tasks')} className={`flex flex-col lg:flex-row items-center lg:justify-start gap-2 lg:gap-3 p-3 rounded-2xl transition-all ${activeTab === 'tasks' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/30' : 'text-zinc-500 hover:bg-zinc-900 border border-transparent'}`}>
              <CheckCircle2 className="w-6 h-6" />
              <span className="text-[10px] lg:text-sm font-bold">İşler</span>
            </button>
            <button onClick={() => setActiveTab('journal')} className={`flex flex-col lg:flex-row items-center lg:justify-start gap-2 lg:gap-3 p-3 rounded-2xl transition-all ${activeTab === 'journal' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'text-zinc-500 hover:bg-zinc-900 border border-transparent'}`}>
              <BookOpen className="w-6 h-6" />
              <span className="text-[10px] lg:text-sm font-bold">Günlük</span>
            </button>
            <button onClick={() => setActiveTab('stats')} className={`flex flex-col lg:flex-row items-center lg:justify-start gap-2 lg:gap-3 p-3 rounded-2xl transition-all ${activeTab === 'stats' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'text-zinc-500 hover:bg-zinc-900 border border-transparent'}`}>
              <BarChart3 className="w-6 h-6" />
              <span className="text-[10px] lg:text-sm font-bold">Analiz</span>
            </button>
          </nav>

          {/* DİNAMİK İÇERİK SEKME ALANI */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-6">

              {(!user || user.isAnonymous) && (
                <div className="bg-indigo-950/20 text-indigo-400 p-6 rounded-3xl text-center font-medium border border-indigo-900/50 flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in zoom-in duration-500">
                  <User className="w-10 h-10 opacity-60 shrink-0" />
                  <p className="text-sm sm:text-base">Görevlerini kalıcı olarak kaydetmek ve senkronize erişmek için lütfen <b>Google ile Giriş Yapın.</b></p>
                </div>
              )}

              {/* 1. SEKME: GÖREVLER VE ALIŞKANLIKLAR */}
              {activeTab === 'tasks' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                  
                  {/* Geri Sayım Widget'ları */}
                  <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                    {countdowns.map(c => {
                      const diffTime = new Date(c.date) - new Date();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return (
                        <div key={c.id} className="min-w-[160px] bg-gradient-to-br from-indigo-900 to-purple-900 text-indigo-100 p-4 rounded-3xl shadow-lg border border-indigo-800/50 relative group">
                          <button onClick={() => deleteCountdown(c.id)} className="absolute top-3 right-3 bg-black/40 hover:bg-rose-500/80 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all"><X className="w-3 h-3"/></button>
                          <h3 className="text-xs font-semibold text-indigo-300 mb-1 line-clamp-1">{c.title}</h3>
                          <div className="text-3xl font-black flex items-baseline gap-1">
                            {diffDays > 0 ? diffDays : 0} <span className="text-sm font-medium opacity-60">gün</span>
                          </div>
                        </div>
                      )
                    })}
                    {!showCountdownForm ? (
                      <button onClick={() => setShowCountdownForm(true)} className="min-w-[160px] border border-dashed border-zinc-800 bg-[#0a0a0a] rounded-3xl flex flex-col items-center justify-center text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/50 transition-all p-4">
                        <Timer className="w-8 h-8 mb-2 opacity-50"/>
                        <span className="text-xs font-bold">Sayaç Ekle</span>
                      </button>
                    ) : (
                      <div className="min-w-[280px] p-4 bg-[#111] rounded-3xl border border-zinc-800 shadow-xl flex flex-col gap-3">
                        <div className="flex gap-2 items-center text-indigo-400 font-bold text-sm"><Timer className="w-4 h-4"/> Yeni Hedef</div>
                        <input type="text" placeholder="Neyi bekliyoruz?" value={newCountdownTitle} onChange={e=>setNewCountdownTitle(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500/50 text-zinc-200 placeholder-zinc-600"/>
                        <div className="flex gap-2">
                          <input type="date" value={newCountdownDate} onChange={e=>setNewCountdownDate(e.target.value)} className="flex-1 bg-black border border-zinc-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500/50 text-zinc-200"/>
                          <button onClick={addCountdown} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700">Ekle</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* DİNAMİK ALIŞKANLIK ÇUBUĞU */}
                  <div className="bg-[#0a0a0a] rounded-3xl p-4 sm:p-5 border border-zinc-900 relative">
                    <div className="flex justify-between items-center mb-3">
                      <h2 className="text-sm font-bold text-zinc-500 flex items-center gap-2 uppercase tracking-wider">
                        <Award className="w-4 h-4" /> Alışkanlıklar
                      </h2>
                      <div className="flex gap-2">
                        {customHabits.length > 0 && (
                          <button onClick={() => setIsEditHabitMode(!isEditHabitMode)} className={`text-xs font-bold px-2 py-1 rounded-lg border transition-colors ${isEditHabitMode ? 'bg-amber-950/30 text-amber-500 border-amber-900/50' : 'bg-transparent text-zinc-500 border-transparent hover:bg-zinc-900 hover:text-zinc-300'}`}>
                            {isEditHabitMode ? 'Tamamla' : 'Düzenle'}
                          </button>
                        )}
                        <button onClick={() => setShowHabitForm(!showHabitForm)} className="text-xs font-bold px-2 py-1 rounded-lg border border-transparent hover:bg-zinc-900 hover:text-zinc-300 text-zinc-500 flex items-center gap-1">
                          <Plus className="w-3 h-3"/> Ekle
                        </button>
                      </div>
                    </div>

                    {showHabitForm && (
                      <form onSubmit={addCustomHabit} className="mb-4 p-4 bg-[#111] border border-zinc-800 rounded-2xl animate-in fade-in slide-in-from-top-2">
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1 space-y-3">
                            <input type="text" placeholder="Yeni alışkanlık adı..." value={newHabitLabel} onChange={e=>setNewHabitLabel(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500/50 text-zinc-200 placeholder-zinc-600 font-medium" />
                            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                              {Object.keys(ICON_MAP).map(iconName => {
                                const IconComp = ICON_MAP[iconName];
                                return (
                                  <button type="button" key={iconName} onClick={()=>setNewHabitIcon(iconName)} className={`p-2.5 rounded-xl border transition-all shrink-0 ${newHabitIcon === iconName ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-400' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>
                                    <IconComp className="w-4 h-4"/>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                          <div className="flex flex-col justify-between gap-3">
                            <div className="flex gap-2">
                              {HABIT_COLORS.map(c => (
                                <button type="button" key={c.id} onClick={()=>setNewHabitColor(c.id)} className={`w-8 h-8 rounded-full border-2 transition-all ${c.bg} ${newHabitColor === c.id ? 'border-zinc-300 scale-110' : 'border-transparent'}`}></button>
                              ))}
                            </div>
                            <div className="flex justify-end gap-2">
                              <button type="button" onClick={()=>setShowHabitForm(false)} className="px-3 py-2 text-xs font-bold text-zinc-500 hover:text-zinc-300">İptal</button>
                              <button type="submit" disabled={!newHabitLabel.trim()} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50">Oluştur</button>
                            </div>
                          </div>
                        </div>
                      </form>
                    )}

                    {customHabits.length === 0 && !showHabitForm ? (
                      <div className="text-center py-6 text-zinc-600 text-sm font-medium border border-dashed border-zinc-800 rounded-2xl">
                        Henüz bir alışkanlık eklemedin. Sağ üstten yeni bir tane oluştur!
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        {customHabits.map(h => {
                          const isDone = currentHabits.includes(h.id);
                          const IconComp = ICON_MAP[h.icon] || Activity;
                          const colorObj = HABIT_COLORS.find(c => c.id === h.color) || HABIT_COLORS[0];
                          
                          return (
                            <div key={h.id} className="relative group">
                              <button onClick={() => !isEditHabitMode && toggleHabit(h.id)} disabled={isEditHabitMode} className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all border ${isDone && !isEditHabitMode ? `${colorObj.bg} ${colorObj.text} ${colorObj.border} scale-105` : 'bg-black text-zinc-400 border-zinc-800 hover:border-zinc-700'} ${isEditHabitMode ? 'opacity-50 cursor-default' : ''}`}>
                                <IconComp className={`w-4 h-4 sm:w-5 sm:h-5 ${isDone && !isEditHabitMode ? '' : 'opacity-60'}`}/> {h.label}
                              </button>
                              {isEditHabitMode && (
                                <button onClick={() => deleteCustomHabit(h.id)} className="absolute -top-2 -right-2 bg-rose-600 text-white p-1 rounded-full shadow-md hover:bg-rose-700 animate-in zoom-in">
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Görev Ekleme ve Liste */}
                  <div className="bg-[#0a0a0a] rounded-3xl p-5 sm:p-6 border border-zinc-900">
                    <form onSubmit={addTask} className="mb-6 flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input type="time" value={newTaskTime} onChange={e=>setNewTaskTime(e.target.value)} className="bg-black border border-zinc-800 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:border-indigo-500/50 text-zinc-200 w-full sm:w-32" />
                        <div className="relative flex-1 sm:flex-none">
                          <select value={newTaskCategory} onChange={(e) => setNewTaskCategory(e.target.value)} className={`appearance-none outline-none border rounded-2xl pl-10 pr-8 py-3 text-sm font-bold cursor-pointer w-full transition-colors ${CATEGORY_COLORS[newTaskCategory] || 'bg-black text-zinc-300 border-zinc-800'}`}>
                            {CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-black text-zinc-300">{cat}</option>)}
                          </select>
                          <Tag className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 opacity-60 pointer-events-none" />
                        </div>
                        <div className="relative flex-1">
                          <input type="text" placeholder="Ne planlıyorsun?" value={newTaskText} onChange={e=>setNewTaskText(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl pl-4 pr-12 py-3 text-sm font-medium outline-none focus:border-indigo-500/50 text-zinc-200 placeholder-zinc-600" />
                          <button type="button" onClick={()=>setNewTaskImportant(!newTaskImportant)} className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition-colors ${newTaskImportant ? 'text-amber-500 bg-amber-950/30' : 'text-zinc-500 hover:bg-zinc-800'}`}>
                            <Star className={`w-4 h-4 ${newTaskImportant ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                        <div className="flex gap-2">
                           <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                           <button type="button" onClick={()=>fileInputRef.current.click()} className="bg-[#111] border border-zinc-800 text-zinc-400 hover:bg-zinc-800 rounded-2xl px-4 flex items-center justify-center transition-colors">
                             <ImageIcon className="w-5 h-5"/>
                           </button>
                           <button type="submit" disabled={!newTaskText.trim()} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-6 py-3 font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors border border-indigo-500/50">
                             <Plus className="w-5 h-5"/> <span className="hidden sm:inline">Ekle</span>
                           </button>
                        </div>
                      </div>
                      {newTaskImage && (
                        <div className="relative inline-block mt-2 w-fit">
                           <img src={newTaskImage} alt="Önizleme" className="h-16 rounded-xl border border-zinc-700 object-cover" />
                           <button type="button" onClick={() => setNewTaskImage(null)} className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1"><X className="w-3 h-3"/></button>
                        </div>
                      )}
                    </form>

                    <div className="space-y-3">
                      {todaysTasks.length === 0 ? (
                        <div className="text-center py-10 opacity-40 flex flex-col items-center gap-3">
                          <CheckCircle className="w-12 h-12 text-zinc-600" />
                          <p className="font-medium text-sm text-zinc-400">Bugün için planlanmış bir görev yok.</p>
                        </div>
                      ) : (
                        todaysTasks.map(t => (
                          <div key={t.id} className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all ${t.completed ? 'bg-black/50 border-zinc-900 opacity-50' : t.isImportant ? 'bg-amber-950/10 border-amber-900/50' : 'bg-black border-zinc-800 hover:border-zinc-700'}`}>
                            <button onClick={()=>toggleTask(t.id)} className={`shrink-0 transition-transform active:scale-90 ${t.completed ? 'text-emerald-500' : 'text-zinc-600 hover:text-indigo-400'}`}>
                              {t.completed ? <CheckCircle className="w-7 h-7" /> : <Circle className="w-7 h-7" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold text-base sm:text-lg truncate transition-all ${t.completed ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>{t.text}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {t.time && <span className="text-[10px] font-bold bg-zinc-900 text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded-lg flex items-center gap-1"><Clock className="w-3 h-3"/> {t.time}</span>}
                                {t.category && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${t.completed ? 'bg-zinc-900 text-zinc-600 border border-zinc-800' : CATEGORY_COLORS[t.category]}`}>{t.category}</span>}
                              </div>
                              {t.image && <img src={t.image} className="mt-3 rounded-xl max-h-32 object-cover border border-zinc-800" alt="görev"/>}
                            </div>
                            <button onClick={()=>deleteTask(t.id)} className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-rose-500 hover:bg-rose-950/30 rounded-xl transition-all">
                              <Trash2 className="w-5 h-5"/>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. SEKME: GÜNLÜK (JOURNAL) */}
              {activeTab === 'journal' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-[#0a0a0a] rounded-3xl p-6 border border-zinc-900 min-h-[600px] flex flex-col">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <h2 className="text-2xl font-bold flex gap-2 items-center text-rose-500">
                      <BookOpen className="w-7 h-7"/> Günlüğüm
                    </h2>
                    <div className="flex gap-1.5 bg-black p-2 rounded-2xl border border-zinc-800 overflow-x-auto">
                      {MOODS.map(m => (
                        <button key={m.id} onClick={()=>selectMood(m.id)} className={`text-2xl sm:text-3xl p-1.5 transition-all ${moods[currentDateStr]===m.id ? 'scale-110 bg-zinc-900 rounded-xl' : 'opacity-30 hover:opacity-100 grayscale hover:grayscale-0'}`} title={m.label}>
                          {m.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex-1 relative rounded-2xl overflow-hidden bg-[#050505] border border-zinc-900">
                    <div className="absolute inset-0 pointer-events-none opacity-[0.1]" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #3f3f46 31px, #3f3f46 32px)', backgroundSize: '100% 32px', marginTop: '8px' }}></div>
                    <textarea value={journals[currentDateStr]||''} onChange={handleJournalChange} placeholder="Bugün nasıl hissediyorsun? Düşüncelerini buraya dökebilirsin..." className="w-full h-full p-6 sm:p-8 bg-transparent resize-none outline-none text-zinc-300 text-lg font-medium relative z-10 custom-scrollbar placeholder:text-zinc-700" style={{ lineHeight: '32px' }} />
                  </div>
                  <div className="mt-4 text-right text-xs font-bold text-zinc-600">
                    {journals[currentDateStr] ? `${journals[currentDateStr].length} Karakter` : 'Yazmaya Başla'}
                  </div>
                </div>
              )}

              {/* 3. SEKME: İSTATİSTİKLER */}
              {activeTab === 'stats' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-[#0a0a0a] p-6 rounded-3xl border border-zinc-900 flex flex-col items-center justify-center text-center gap-2">
                      <div className="w-12 h-12 bg-indigo-950/30 text-indigo-500 rounded-full flex items-center justify-center mb-2 border border-indigo-900/50"><CheckCircle2 className="w-6 h-6"/></div>
                      <span className="text-3xl font-black text-zinc-100">{totalCompletedTasks}</span>
                      <span className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Tamamlanan Görev</span>
                    </div>
                    
                    <div className="bg-[#0a0a0a] p-6 rounded-3xl border border-zinc-900 flex flex-col items-center justify-center text-center gap-2">
                      <div className="w-12 h-12 bg-emerald-950/30 text-emerald-500 rounded-full flex items-center justify-center mb-2 border border-emerald-900/50"><TrendingUp className="w-6 h-6"/></div>
                      <span className="text-3xl font-black text-zinc-100">%{completionRate}</span>
                      <span className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Tüm Zamanlar Başarısı</span>
                    </div>

                    <div className="bg-[#0a0a0a] p-6 rounded-3xl border border-zinc-900 flex flex-col items-center justify-center text-center gap-2 sm:col-span-2 lg:col-span-1">
                      <div className="w-12 h-12 bg-amber-950/30 text-amber-500 rounded-full flex items-center justify-center mb-2 border border-amber-900/50"><Award className="w-6 h-6"/></div>
                      <span className="text-3xl font-black text-zinc-100">{Object.keys(dailyHabits).length}</span>
                      <span className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Aktif Gün Sayısı</span>
                    </div>
                  </div>

                  <div className="bg-[#0a0a0a] p-6 rounded-3xl border border-zinc-900">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-zinc-100"><Activity className="w-5 h-5 text-indigo-500"/> Alışkanlık Performansı (Tüm Zamanlar)</h3>
                    <div className="space-y-5">
                      {customHabits.length === 0 ? (
                        <p className="text-sm text-zinc-600 font-medium">Performans ölçümü için görevler sekmesinden alışkanlık ekle.</p>
                      ) : (
                        customHabits.map(h => {
                          const colorObj = HABIT_COLORS.find(c => c.id === h.color) || HABIT_COLORS[0];
                          const totalDaysDone = Object.values(dailyHabits).filter(habits => habits.includes(h.id)).length;
                          const maxDays = Object.keys(dailyHabits).length || 1; 
                          const percent = Math.round((totalDaysDone / maxDays) * 100);
                          const IconComp = ICON_MAP[h.icon] || Activity;
                          
                          return (
                            <div key={h.id}>
                              <div className="flex justify-between items-end mb-2">
                                <span className="font-bold flex items-center gap-2 text-zinc-300"><IconComp className={`w-4 h-4 ${colorObj.text}`}/> {h.label}</span>
                                <span className="text-xs font-bold text-zinc-500">{totalDaysDone} Gün (%{percent})</span>
                              </div>
                              <div className="h-3 bg-black border border-zinc-800 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-1000 ${colorObj.bg.replace('/40', '')}`} style={{ width: `${percent}%` }}></div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>

                  <div className="bg-[#0a0a0a] p-6 rounded-3xl border border-zinc-900">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-zinc-100"><BarChart3 className="w-5 h-5 text-rose-500"/> Ruh Hali Dağılımı</h3>
                    <div className="flex flex-wrap gap-3">
                      {MOODS.map(m => {
                        const count = Object.values(moods).filter(id => id === m.id).length;
                        if (count === 0) return null;
                        return (
                          <div key={m.id} className={`flex-1 min-w-[100px] p-4 rounded-2xl flex flex-col items-center justify-center text-center gap-1 border ${m.color}`}>
                            <span className="text-3xl">{m.emoji}</span>
                            <span className="font-bold text-xl text-zinc-100">{count}</span>
                            <span className="text-xs font-semibold uppercase opacity-80">{m.label}</span>
                          </div>
                        )
                      })}
                      {Object.keys(moods).length === 0 && (
                        <div className="w-full text-center py-8 text-zinc-600 font-medium border border-dashed border-zinc-800 rounded-2xl">Henüz bir ruh hali kaydedilmemiş.</div>
                      )}
                    </div>
                  </div>

                </div>
              )}

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}