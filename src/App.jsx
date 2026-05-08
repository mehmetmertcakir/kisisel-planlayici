import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Plus, Image as ImageIcon, CheckCircle, Circle, Trash2, BookOpen, X, PenTool, Clock, Moon, Sun, Search, Star, Droplet, Book, Activity, Tag, User, LogOut, Code, Leaf, Timer } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

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
const appId = 'benim-planlayicim';

// GÜNCELLENMİŞ ALIŞKANLIK LİSTESİ
const HABIT_LIST = [
  { id: 'water', label: 'Su İç', icon: Droplet, activeClass: 'text-blue-600 bg-blue-100 dark:bg-blue-500/30 dark:text-blue-300' },
  { id: 'python', label: 'Python Çalış', icon: Code, activeClass: 'text-amber-600 bg-amber-100 dark:bg-amber-500/30 dark:text-amber-300' },
  { id: 'plants', label: 'Bitkileri Sula', icon: Leaf, activeClass: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/30 dark:text-emerald-300' },
  { id: 'workout', label: 'Egzersiz', icon: Activity, activeClass: 'text-orange-600 bg-orange-100 dark:bg-orange-500/30 dark:text-orange-300' }
];

// GÜNCELLENMİŞ VARDİYA VE EKİP ETİKETLERİ
const CATEGORIES = ['Kişisel', 'İş', 'Okul', 'Ev', 'Sabah Vardiyası', 'Akşam Vardiyası', 'Gece Vardiyası', 'İrem Nur', 'Mert'];
const CATEGORY_COLORS = {
  'Kişisel': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'İş': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Okul': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'Ev': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Sabah Vardiyası': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'Akşam Vardiyası': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Gece Vardiyası': 'bg-slate-700 text-slate-100 dark:bg-slate-900/50 dark:text-slate-300',
  'İrem Nur': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'Mert': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
};

const MOODS = [
  { id: 'harika', emoji: '🤩', label: 'Harika' },
  { id: 'iyi', emoji: '😊', label: 'İyi' },
  { id: 'sakin', emoji: '😌', label: 'Sakin' },
  { id: 'uzgun', emoji: '😔', label: 'Üzgün' },
  { id: 'stresli', emoji: '😡', label: 'Stresli' }
];

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [journals, setJournals] = useState({});
  const [moods, setMoods] = useState({});
  const [dailyHabits, setDailyHabits] = useState({});
  const [countdowns, setCountdowns] = useState([]);

  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskImage, setNewTaskImage] = useState(null);
  const [newTaskImportant, setNewTaskImportant] = useState(false);
  const [newTaskCategory, setNewTaskCategory] = useState('Kişisel');
  
  const [newCountdownTitle, setNewCountdownTitle] = useState('');
  const [newCountdownDate, setNewCountdownDate] = useState('');
  const [showCountdownForm, setShowCountdownForm] = useState(false);

  const [darkMode, setDarkMode] = useState(false);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);

  const loginWithGoogle = async () => {
    try { await signInWithPopup(auth, new GoogleAuthProvider()); } 
    catch (err) { console.error("Giriş Hatası:", err); }
  };

  const handleLogout = async () => {
    try { await signOut(auth); setUser(null); setTasks([]); setJournals({}); setCountdowns([]); } 
    catch (err) { console.error(err); }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
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

    const unsubHabits = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'habits'), (snap) => {
      const loaded = {}; snap.docs.forEach(d => loaded[d.id] = d.data().completed || []); setDailyHabits(loaded);
    });

    const unsubCountdowns = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'countdowns'), (snap) => {
      const loaded = snap.docs.map(doc => doc.data());
      loaded.sort((a, b) => new Date(a.date) - new Date(b.date));
      setCountdowns(loaded);
    });

    return () => { unsubTasks(); unsubJournals(); unsubMoods(); unsubHabits(); unsubCountdowns(); };
  }, [user]);

  const currentDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const displayDate = currentDate.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim() || !user) return;
    const newTask = {
      id: Date.now().toString(), dateStr: currentDateStr, time: newTaskTime || 'Tüm Gün', text: newTaskText,
      completed: false, image: newTaskImage, isImportant: newTaskImportant, category: newTaskCategory
    };
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', newTask.id), newTask);
    setNewTaskText(''); setNewTaskTime(''); setNewTaskImportant(false); setNewTaskImage(null); setNewTaskCategory('Kişisel');
  };

  const addCountdown = async (e) => {
    e.preventDefault();
    if (!newCountdownTitle || !newCountdownDate || !user) return;
    const newItem = { id: Date.now().toString(), title: newCountdownTitle, date: newCountdownDate };
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'countdowns', newItem.id), newItem);
    setNewCountdownTitle(''); setNewCountdownDate(''); setShowCountdownForm(false);
  };

  const deleteCountdown = async (id) => {
    if (user) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'countdowns', id));
  };

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

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 font-sans">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <header className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-xl font-bold flex items-center gap-2 text-indigo-600">
              <BookOpen /> Günlüğüm & Planlayıcım
            </h1>
            
            <div className="flex items-center gap-2">
              <button onClick={() => {const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d);}} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl">
                <ChevronLeft className="w-5 h-5"/>
              </button>
              <span className="font-semibold cursor-pointer" onClick={() => setCurrentDate(new Date())}>{displayDate}</span>
              <button onClick={() => {const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d);}} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl">
                <ChevronRight className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              {user ? (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 p-1.5 rounded-xl">
                  <img src={user.photoURL} alt="Profil" className="w-6 h-6 rounded-full" />
                  <span className="text-sm font-semibold hidden sm:inline">{user.displayName?.split(' ')[0]}</span>
                  <button onClick={handleLogout} className="text-slate-500 hover:text-rose-500 p-1" title="Çıkış Yap">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button onClick={loginWithGoogle} className="flex items-center gap-1.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 px-3 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-200">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Giriş Yap</span>
                </button>
              )}
              
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl">
                {darkMode ? <Sun className="w-5 h-5 text-amber-400"/> : <Moon className="w-5 h-5"/>}
              </button>
            </div>
          </header>

          {!user && (
            <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 p-8 rounded-3xl text-center font-medium border border-indigo-100 dark:border-indigo-800 shadow-sm flex flex-col items-center gap-4">
              <User className="w-12 h-12 opacity-50" />
              <p className="text-lg">Görevlerini kaydetmek ve tüm cihazlarından senkronize erişmek için lütfen yukarıdan Giriş Yapın.</p>
            </div>
          )}

          {user && (
            <div className="space-y-6">
              
              {/* GERİ SAYIM WIDGET ALANI */}
              <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                {countdowns.map(c => {
                   const diffTime = new Date(c.date) - new Date();
                   const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                   return (
                      <div key={c.id} className="min-w-[150px] bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 rounded-2xl shadow-md relative group">
                         <button onClick={() => deleteCountdown(c.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4"/></button>
                         <h3 className="text-xs font-medium opacity-80 mb-1">{c.title}</h3>
                         <div className="text-2xl font-bold flex items-end gap-1">
                            {diffDays > 0 ? diffDays : 0} <span className="text-sm font-normal opacity-80 mb-1">gün kaldı</span>
                         </div>
                      </div>
                   )
                })}

                {!showCountdownForm ? (
                  <button onClick={() => setShowCountdownForm(true)} className="min-w-[150px] border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:text-indigo-500 hover:border-indigo-500 transition-colors p-4">
                    <Plus className="w-6 h-6 mb-1"/>
                    <span className="text-xs font-semibold">Geri Sayım Ekle</span>
                  </button>
                ) : (
                  <div className="min-w-[300px] p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
                    <div className="flex gap-2 items-center text-indigo-500 font-semibold mb-1"><Timer className="w-4 h-4"/> Yeni Sayaç</div>
                    <input type="text" placeholder="Neyi bekliyoruz?" value={newCountdownTitle} onChange={e=>setNewCountdownTitle(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-indigo-500"/>
                    <div className="flex gap-2">
                      <input type="date" value={newCountdownDate} onChange={e=>setNewCountdownDate(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm outline-none focus:border-indigo-500"/>
                      <button onClick={addCountdown} className="bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-indigo-700">Ekle</button>
                      <button onClick={()=>setShowCountdownForm(false)} className="bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-rose-500 px-2 rounded-xl"><X className="w-4 h-4"/></button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm min-h-[500px] flex flex-col">
                  <h2 className="text-xl font-bold mb-4 flex gap-2 items-center"><CheckCircle className="text-indigo-500"/> Görevler</h2>
                  
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    {HABIT_LIST.map(h => (
                      <button key={h.id} onClick={() => toggleHabit(h.id)} className={`px-3 py-1.5 rounded-xl text-xs font-bold flex gap-1 items-center whitespace-nowrap ${((dailyHabits[currentDateStr]||[]).includes(h.id)) ? h.activeClass : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                        <h.icon className="w-4 h-4"/> {h.label}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={addTask} className="mb-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div className="flex flex-col sm:flex-row gap-2 mb-3">
                      <input type="time" value={newTaskTime} onChange={e=>setNewTaskTime(e.target.value)} className="rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800" />
                      <div className="relative">
                        <select value={newTaskCategory} onChange={(e) => setNewTaskCategory(e.target.value)} className={`appearance-none outline-none border border-slate-200 dark:border-slate-600 text-sm font-semibold rounded-xl pl-8 pr-8 py-2.5 cursor-pointer w-full sm:w-auto ${CATEGORY_COLORS[newTaskCategory] || 'bg-white dark:bg-slate-800'}`}>
                          {CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white">{cat}</option>)}
                        </select>
                        <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                      </div>
                      <input type="text" placeholder="Ne planlıyorsun?" value={newTaskText} onChange={e=>setNewTaskText(e.target.value)} className="flex-1 rounded-xl px-4 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 outline-none focus:border-indigo-500" />
                    </div>
                    <div className="flex gap-2 justify-between">
                      <div className="flex gap-2">
                        <button type="button" onClick={()=>setNewTaskImportant(!newTaskImportant)} className={`p-2 rounded-lg transition-colors ${newTaskImportant?'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400':'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-400'}`}><Star className="w-4 h-4"/></button>
                        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                        <button type="button" onClick={()=>fileInputRef.current.click()} className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-indigo-500"><ImageIcon className="w-4 h-4"/></button>
                      </div>
                      <button type="submit" disabled={!newTaskText} className="bg-indigo-600 text-white px-5 py-2 rounded-xl flex gap-2 items-center font-semibold disabled:opacity-50 hover:bg-indigo-700"><Plus className="w-4 h-4"/> Ekle</button>
                    </div>
                  </form>

                  <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                    {todaysTasks.map(t => (
                      <div key={t.id} className={`group flex gap-3 p-4 rounded-2xl border transition-all ${t.completed ? 'opacity-50 bg-slate-50 dark:bg-slate-900/30 border-transparent' : ''} ${t.isImportant && !t.completed ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20' : 'dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                        <button onClick={()=>toggleTask(t.id)} className={`mt-0.5 ${t.completed ? 'text-green-500' : 'text-slate-300 dark:text-slate-600 hover:text-indigo-500'}`}>{t.completed ? <CheckCircle/> : <Circle/>}</button>
                        <div className="flex-1">
                          <div className="flex gap-2 mb-1.5 flex-wrap">
                            {t.time && <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-2 py-0.5 rounded-md">{t.time}</span>}
                            {t.category && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${t.completed ? 'bg-slate-200 text-slate-500' : CATEGORY_COLORS[t.category]}`}>{t.category}</span>}
                          </div>
                          <p className={`font-medium ${t.completed ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{t.text}</p>
                          {t.image && <img src={t.image} className="mt-3 rounded-xl max-h-32 object-cover border border-slate-100 dark:border-slate-700" alt="görev"/>}
                        </div>
                        <button onClick={()=>deleteTask(t.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm min-h-[500px] flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold flex gap-2 items-center text-rose-500"><BookOpen/> Günlük</h2>
                    <div className="flex gap-1 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-700">
                      {MOODS.map(m => <button key={m.id} onClick={()=>selectMood(m.id)} className={`text-xl sm:text-2xl p-1 transition-transform ${moods[currentDateStr]===m.id ? 'scale-110 bg-white dark:bg-slate-700 rounded-lg shadow-sm' : 'opacity-50 hover:opacity-100'}`} title={m.label}>{m.emoji}</button>)}
                    </div>
                  </div>
                  <div className="flex-1 relative rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-700/60 bg-[#fefdfb] dark:bg-slate-900/50">
                    <div className="absolute inset-0 pointer-events-none opacity-[0.15] dark:opacity-[0.05]" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, #64748b 31px, #64748b 32px)', backgroundSize: '100% 32px', marginTop: '8px' }}></div>
                    <textarea value={journals[currentDateStr]||''} onChange={handleJournalChange} placeholder="Bugün neler hissettin? Buraya dökebilirsin..." className="w-full h-full p-6 bg-transparent resize-none outline-none text-slate-700 dark:text-slate-200 font-medium relative z-10 custom-scrollbar" style={{ lineHeight: '32px' }} />
                  </div>
                </section>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}