import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Wallet, Timer, StickyNote, UserCircle, CalendarDays, Users, Newspaper, BotMessageSquare, LogOut, Shield, Briefcase, Gamepad2, Quote, MessageCircleCode, Trash2, AlertTriangle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { logout, db } from '../firebase';
import { collection, query, where, getDocs, deleteDoc, doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'finance', label: 'Keuangan', icon: Wallet },
  { id: 'study', label: 'Belajar', icon: Timer },
  { id: 'notes', label: 'Catatan', icon: StickyNote },
  { id: 'quotes', label: 'Kutipan', icon: Quote },
  { id: 'character', label: 'Karakter', icon: UserCircle },
  { id: 'days360', label: 'Days 360', icon: CalendarDays },
  { id: 'social_profile', label: 'Profil Sosial', icon: Users },
  { id: 'social_feed', label: 'Beranda', icon: Newspaper },
  { id: 'chat', label: 'Chat', icon: MessageCircleCode },
  { id: 'sherly_ai', label: 'Sherly AI', icon: BotMessageSquare },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { activeTab, setActiveTab, user } = useStore();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isPortofolioPinOpen, setIsPortofolioPinOpen] = useState(false);
  const [portofolioPinInput, setPortofolioPinInput] = useState('');
  const [isCheckingPin, setIsCheckingPin] = useState(false);

  const handlePortofolioClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Anda harus login terlebih dahulu');
      return;
    }
    setIsPortofolioPinOpen(true);
  };

  const verifyPortofolioPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsCheckingPin(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data().pinHash === portofolioPinInput) {
        toast.success('Akses Diberikan');
        setIsPortofolioPinOpen(false);
        setPortofolioPinInput('');
        window.open('https://naufalstudio.netlify.app/', '_blank', 'noopener,noreferrer');
      } else {
        toast.error('PIN Salah');
      }
    } catch (error) {
      toast.error('Gagal memverifikasi PIN');
    } finally {
      setIsCheckingPin(false);
    }
  };

  const handleResetData = async () => {
    if (!user) return;
    setIsResetting(true);
    try {
      const collections = [
        'finances', 'study_sessions', 'private_notes', 'character_logs',
        'investment_goals', 'project_days', 'internet_usage', 'quotes',
        'social_posts', 'social_comments'
      ];

      for (const col of collections) {
        const q = query(collection(db, col), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, col, d.id)));
        await Promise.all(deletePromises);
      }

      toast.success('Semua data berhasil direset!');
      setIsResetModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error('Gagal mereset data.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-white/30 flex flex-col md:flex-row">
      {/* Sidebar / Bottom Nav */}
      <nav className="md:w-64 bg-black border-r border-white/10 flex flex-col justify-between p-4 z-50 fixed bottom-0 w-full md:relative md:h-screen">
        <div className="hidden md:block mb-8">
          <h1 className="text-2xl font-bold text-white">
            MyLife
          </h1>
          <p className="text-xs text-slate-400 mt-1">0.0.1</p>
        </div>

        <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto pb-2 md:pb-0 hide-scrollbar flex-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 whitespace-nowrap md:whitespace-normal ${
                  isActive
                    ? 'bg-white/20 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                    : 'text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
                title={tab.label}
              >
                <Icon size={20} className="shrink-0" />
                <span className="font-medium text-sm md:text-base md:block hidden">{tab.label}</span>
              </button>
            );
          })}
          
          <div className="hidden md:block w-full h-px bg-white/10 my-2"></div>
          <div className="md:hidden w-px h-8 bg-white/10 mx-2 self-center shrink-0"></div>
          
          <div className="flex items-center gap-2 md:justify-center px-2 md:px-0">
            <a href="https://cyber-security-sherly.netlify.app/" target="_blank" rel="noopener noreferrer" title="Cyber Security" className="flex items-center justify-center p-3 rounded-xl transition-all duration-300 shrink-0 text-slate-400 hover:bg-white/10 hover:text-white">
              <Shield size={20} />
            </a>
            <button onClick={handlePortofolioClick} title="Portofolio" className="flex items-center justify-center p-3 rounded-xl transition-all duration-300 shrink-0 text-slate-400 hover:bg-white/10 hover:text-white">
              <Briefcase size={20} />
            </button>
            <a href="https://deteksi-kekacauan-neuron.netlify.app/" target="_blank" rel="noopener noreferrer" title="Game Neuron" className="flex items-center justify-center p-3 rounded-xl transition-all duration-300 shrink-0 text-slate-400 hover:bg-white/10 hover:text-white">
              <Gamepad2 size={20} />
            </a>
          </div>

          <div className="md:hidden w-px h-8 bg-white/10 mx-2 self-center shrink-0"></div>
          
          <div className="flex md:hidden items-center gap-1 px-2 shrink-0">
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="flex items-center justify-center p-3 rounded-xl text-orange-400 hover:bg-orange-500/10 transition-colors"
              title="Reset Semua Data"
            >
              <Trash2 size={20} />
            </button>
            <button
              onClick={logout}
              className="flex items-center justify-center p-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
              title="Keluar"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className="hidden md:flex flex-col gap-4 mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2">
            <img src={user?.photoURL || ''} alt="Profile" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user?.displayName}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={logout}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={18} />
              <span className="font-medium text-sm">Keluar</span>
            </button>
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-orange-400 hover:bg-orange-500/10 transition-colors"
            >
              <Trash2 size={18} />
              <span className="font-medium text-sm">Reset</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-5xl mx-auto h-full">
          {children}
        </div>
      </main>

      {/* Reset Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111] border border-white/10 p-6 rounded-3xl max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-4 text-orange-400">
              <div className="p-3 bg-orange-500/20 rounded-2xl">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Reset Semua Data?</h3>
            </div>
            <p className="text-slate-400 mb-6">
              Apakah kamu yakin ingin menghapus <strong>semua</strong> data yang telah disimpan? (Keuangan, Catatan, Profil, dll). Tindakan ini <strong>tidak dapat dibatalkan</strong>.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
                className="flex-1 px-4 py-3 rounded-xl font-medium bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleResetData}
                disabled={isResetting}
                className="flex-1 px-4 py-3 rounded-xl font-medium bg-orange-500 hover:bg-orange-600 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isResetting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Trash2 size={18} />
                    Hapus Semua
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Portofolio PIN Modal */}
      {isPortofolioPinOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#111] border border-white/10 p-6 rounded-3xl max-w-sm w-full shadow-2xl text-center"
          >
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="text-blue-400" size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Akses Portofolio</h3>
            <p className="text-slate-400 mb-6 text-sm">
              Masukkan PIN yang sama dengan PIN keamanan catatanmu.
            </p>
            <form onSubmit={verifyPortofolioPin} className="space-y-4">
              <input
                type="password"
                value={portofolioPinInput}
                onChange={(e) => setPortofolioPinInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-center text-2xl tracking-[0.5em] text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="••••"
                maxLength={6}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsPortofolioPinOpen(false); setPortofolioPinInput(''); }}
                  disabled={isCheckingPin}
                  className="flex-1 px-4 py-3 rounded-xl font-medium bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isCheckingPin || !portofolioPinInput}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium p-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isCheckingPin ? 'Memeriksa...' : 'Buka Kunci'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
