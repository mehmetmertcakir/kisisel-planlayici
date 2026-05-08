import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Plus, Image as ImageIcon, CheckCircle, Circle, Trash2, BookOpen, X, PenTool, Clock, Moon, Sun, Search, Star, Droplet, Book, Activity, Tag, User, LogOut } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
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

const HABIT_LIST = [
  { id: 'water', label: 'Su İç', icon: Droplet, activeClass: 'text-blue-600 bg-blue-100 dark:bg-blue-500/30 dark:text-blue-300' },
  { id: 'read', label: 'Kitap Oku', icon: Book, activeClass: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/30 dark:text-emerald-300' },
  { id: 'workout', label: 'Egzersiz', icon: Activity, activeClass: 'text-orange-600 bg-orange-100 dark:bg-orange-500/30 dark:text-orange-300' }
];

const CATEGORIES = ['Kişisel', 'İş', 'Okul', 'Ev'];
const CATEGORY_COLORS = { 'Kişisel': 'bg-purple-100 text-purple-700', 'İş': 'bg-blue-100 text-blue-700', 'Okul': 'bg-yellow-100 text-yellow-700', 'Ev': 'bg-emerald-100 text-emerald-700' };

const MOODS = [
  { id: 'harika', emoji: '🤩', label: 'Harika' }, { id: 'iyi', emoji: '😊', label: 'İyi' }, { id: 'sakin', emoji: '😌', label: 'Sakin' }, { id: 'uzgun', emoji: '😔', label: 'Üzgün' }, { id: 'stresli', emoji: '😡', label: 'Stresli' }
];

export default function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [journals, setJournals] = useState({});
  const [moods, setMoods] = useState({});
  const [dailyHabits, setDailyHabits] = useState({});

  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [newTaskImage, setNewTaskImage] = useState(null);
  const [newTaskEndDate, setNewTaskEndDate] = useState('');
  const [newTaskEndTime, setNewTaskEndTime] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Kişisel');
  const [newTaskImportant, setNewTaskImportant] = useState(false);
  
  const [showDeadline, setShowDeadline] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fileInputRef = useRef(null);
  const timerRef = useRef(null);

  const loginWithGoogle = async () => { try { await signInWithPopup(auth, new GoogleAuthProvider()); } catch (err) { console.error(err); } };
  const handleLogout = async () => { try { await signOut(auth); await signInAnonymously(auth); } catch (err) { console.error(err); } };

  useEffect(() => { signInAnonymously(auth).catch(console.error); return onAuthStateChanged(auth, setUser); }, []);

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
    return () => { unsubTasks(); unsubJournals(); unsubMoods(); unsubHabits(); };
  }, [user]);

  const currentDateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const displayDate = currentDate.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim() || !user) return;
    const newTask = {
      id: Date.now().toString(), dateStr: currentDateStr, time: newTaskTime || 'Tüm Gün', text: newTaskText,
      completed: false, image: newTaskImage, endDate: newTaskEndDate || null, endTime: newTaskEndTime || null,
      category: newTaskCategory, isImportant: newTaskImportant
    };
    await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'tasks', newTask.id), newTask);
    setNewTaskText(''); setNewTaskTime(''); setNewTaskEndDate(''); setNewTaskEndTime('');
    setNewTaskImportant(false); setShowDeadline(false); setNewTaskImage(null);
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
  const progressPercent = todaysTasks.length ? Math.round((todaysTasks.filter(t => t.completed).length / todaysTasks.length) * 100) : 0;
  const currentHabits = dailyHabits[currentDateStr] || [];
  const searchResultsTasks = searchQuery.trim() ? tasks.filter(t => t.text.toLowerCase().includes(searchQuery.toLowerCase())) : [];
  const searchResultsJournals = searchQuery.trim() ? Object.entries(journals).filter(([date, text]) => text.toLowerCase().includes(searchQuery.toLowerCase())) : [];

  const formatDisplayDate = (dateStr) => { if (!dateStr) return ''; const [y, m, d] = dateStr.split('-'); return `${d}.${m}.${y}`; };
  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 font-sans">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <header className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-xl font-bold flex items-center gap-2 text-indigo-600"><BookOpen /> Günlüğüm & Planlayıcım</h1>
            <div className="flex items-center gap-2">
              <button onClick={() => {const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d);}} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl"><ChevronLeft className="w-5 h-5"/></button>
              <span className="font-semibold cursor-pointer" onClick={() => setCurrentDate(new Date())}>{displayDate}</span>
              <button onClick={() => {const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d);}} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl"><ChevronRight className="w-5 h-5"/></button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl">{darkMode ? <Sun className="w-5 h-5 text-amber-400"/> : <Moon className="w-5 h-5"/>}</button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm min-h-[500px] flex flex-col">
              <h2 className="text-xl font-bold mb-4 flex gap-2 items-center"><CheckCircle className="text-indigo-500"/> Görevler</h2>
              
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {HABIT_LIST.map(h => (
                  <button key={h.id} onClick={() => toggleHabit(h.id)} className={`px-3 py-1.5 rounded-xl text-xs font-bold flex gap-1 items-center ${((dailyHabits[currentDateStr]||[]).includes(h.id)) ? h.activeClass : 'bg-slate-100 dark:bg-slate-700'}`}>
                    <h.icon className="w-4 h-4"/> {h.label}
                  </button>
                ))}
              </div>

              <form onSubmit={addTask} className="mb-6 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border dark:border-slate-700">
                <div className="flex gap-2 mb-2">
                  <input type="time" value={newTaskTime} onChange={e=>setNewTaskTime(e.target.value)} className="rounded-xl px-3 py-2 border dark:bg-slate-800 dark:border-slate-600" />
                  <input type="text" placeholder="Görev ekle..." value={newTaskText} onChange={e=>setNewTaskText(e.target.value)} className="flex-1 rounded-xl px-4 py-2 border dark:bg-slate-800 dark:border-slate-600" />
                </div>
                <div className="flex gap-2 justify-between">
                  <div className="flex gap-2">
                    <button type="button" onClick={()=>setNewTaskImportant(!newTaskImportant)} className={`p-2 rounded-lg ${newTaskImportant?'bg-amber-100 text-amber-600':'bg-slate-200 dark:bg-slate-700'}`}><Star className="w-4 h-4"/></button>
                    <button type="button" onClick={()=>setShowDeadline(!showDeadline)} className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700"><Clock className="w-4 h-4"/></button>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                    <button type="button" onClick={()=>fileInputRef.current.click()} className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700"><ImageIcon className="w-4 h-4"/></button>
                  </div>
                  <button type="submit" disabled={!newTaskText} className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex gap-1 items-center disabled:opacity-50"><Plus className="w-4 h-4"/> Ekle</button>
                </div>
              </form>

              <div className="flex-1 overflow-y-auto space-y-3">
                {todaysTasks.map(t => (
                  <div key={t.id} className={`flex gap-3 p-4 rounded-2xl border ${t.completed ? 'opacity-50' : ''} ${t.isImportant ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20' : 'dark:border-slate-700'}`}>
                    <button onClick={()=>toggleTask(t.id)} className={t.completed ? 'text-green-500' : 'text-slate-400'}>{t.completed ? <CheckCircle/> : <Circle/>}</button>
                    <div className="flex-1">
                      <div className="flex gap-2 mb-1"><span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 rounded">{t.time}</span></div>
                      <p className={t.completed ? 'line-through' : ''}>{t.text}</p>
                      {t.image && <img src={t.image} className="mt-2 rounded-xl h-24 object-cover" alt="görev"/>}
                    </div>
                    <button onClick={()=>deleteTask(t.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-5 h-5"/></button>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm min-h-[500px] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex gap-2 items-center text-rose-500"><BookOpen/> Günlük</h2>
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                  {MOODS.map(m => <button key={m.id} onClick={()=>selectMood(m.id)} className={`text-xl p-1 ${moods[currentDateStr]===m.id ? 'scale-125 bg-white dark:bg-slate-600 rounded-lg shadow-sm' : 'opacity-50'}`}>{m.emoji}</button>)}
                </div>
              </div>
              <textarea value={journals[currentDateStr]||''} onChange={handleJournalChange} placeholder="Sevgili günlük..." className="flex-1 w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl resize-none outline-none dark:text-white" />
            </section>
          </div>
          
        </div>
      </div>
    </div>
  );
}