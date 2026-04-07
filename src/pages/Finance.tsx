import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Target, TrendingUp, Wifi } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export function Finance() {
  const { user } = useStore();
  const [records, setRecords] = useState<any[]>([]);
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Investment Goal State
  const [goal, setGoal] = useState<any>(null);
  const [isSettingGoal, setIsSettingGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalAmount, setGoalAmount] = useState('');

  // Internet Usage State
  const [internetUsage, setInternetUsage] = useState<any[]>([]);
  const [gbAmount, setGbAmount] = useState('');
  const [isSubmittingGb, setIsSubmittingGb] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Records listener
    const q = query(
      collection(db, 'finances'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(data);
    });

    // Goal listener
    const qGoal = query(
      collection(db, 'investment_goals'),
      where('userId', '==', user.uid)
    );
    const unsubGoal = onSnapshot(qGoal, (snap) => {
      if (!snap.empty) {
        setGoal({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setGoal(null);
      }
    });

    // Internet Usage listener
    const qInternet = query(
      collection(db, 'internet_usage'),
      where('userId', '==', user.uid),
      orderBy('date', 'asc')
    );
    const unsubInternet = onSnapshot(qInternet, (snap) => {
      const data = snap.docs.map(doc => {
        const docData = doc.data();
        const date = docData.date ? new Date(docData.date) : new Date();
        return {
          id: doc.id,
          ...docData,
          displayDate: !isNaN(date.getTime()) ? format(date, 'dd MMM') : '??'
        };
      });
      setInternetUsage(data);
    });

    return () => {
      unsub();
      unsubGoal();
      unsubInternet();
    };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category || !user) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'finances'), {
        userId: user.uid,
        type,
        amount: Number(amount),
        category,
        note,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      toast.success('Catatan keuangan berhasil ditambahkan!');
      setAmount('');
      setCategory('');
      setNote('');
    } catch (error) {
      toast.error('Gagal menambahkan catatan.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalTitle || !goalAmount || !user) return;
    
    try {
      if (goal) {
        await updateDoc(doc(db, 'investment_goals', goal.id), {
          title: goalTitle,
          targetAmount: Number(goalAmount),
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'investment_goals'), {
          userId: user.uid,
          title: goalTitle,
          targetAmount: Number(goalAmount),
          updatedAt: new Date().toISOString()
        });
      }
      setIsSettingGoal(false);
      toast.success('Tujuan investasi disimpan!');
    } catch (error) {
      toast.error('Gagal menyimpan tujuan investasi.');
    }
  };

  const handleAddInternetUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gbAmount || !user) return;

    setIsSubmittingGb(true);
    try {
      await addDoc(collection(db, 'internet_usage'), {
        userId: user.uid,
        gbAmount: Number(gbAmount),
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });
      toast.success('Pembelian paket internet dicatat!');
      setGbAmount('');
    } catch (error) {
      toast.error('Gagal mencatat paket internet.');
    } finally {
      setIsSubmittingGb(false);
    }
  };

  const totalInvestment = records
    .filter(r => r.type === 'investment')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const progressPercentage = goal ? Math.min((totalInvestment / goal.targetAmount) * 100, 100) : 0;

  // Prepare data for investment chart
  const investmentData = records
    .filter(r => r.type === 'investment')
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    })
    .reduce((acc: any[], curr) => {
      const dateObj = curr.date ? new Date(curr.date) : null;
      if (!dateObj || isNaN(dateObj.getTime())) return acc;
      
      const date = format(dateObj, 'dd MMM');
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.amount += curr.amount;
      } else {
        acc.push({ date, amount: curr.amount });
      }
      return acc;
    }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
        <h2 className="text-2xl font-bold mb-6">Catat Keuangan</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`p-3 rounded-xl border transition-all ${type === 'expense' ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`p-3 rounded-xl border transition-all ${type === 'income' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
            >
              Pendapatan
            </button>
            <button
              type="button"
              onClick={() => setType('savings')}
              className={`p-3 rounded-xl border transition-all ${type === 'savings' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
            >
              Tabungan
            </button>
            <button
              type="button"
              onClick={() => setType('investment')}
              className={`p-3 rounded-xl border transition-all ${type === 'investment' ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
            >
              Investasi
            </button>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Jumlah (Rp)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="0"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm text-slate-400 mb-1">Kategori / Untuk apa?</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Makan, Transport, dll"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Catatan Tambahan (Opsional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="..."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium p-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </button>
        </form>
      </div>

      {/* Investment Goal Section */}
      <div className="bg-gradient-to-br from-purple-500/10 to-purple-900/10 border border-purple-500/20 p-6 rounded-3xl">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2 text-purple-400">
            <Target size={24} /> Tujuan Investasi
          </h3>
          {!isSettingGoal && (
            <button 
              onClick={() => {
                setGoalTitle(goal?.title || '');
                setGoalAmount(goal?.targetAmount?.toString() || '');
                setIsSettingGoal(true);
              }}
              className="text-sm text-purple-300 hover:text-white transition-colors"
            >
              {goal ? 'Edit Tujuan' : 'Set Tujuan'}
            </button>
          )}
        </div>

        {isSettingGoal ? (
          <form onSubmit={handleSetGoal} className="space-y-4 bg-black/20 p-4 rounded-2xl">
            <div>
              <label className="block text-sm text-purple-300 mb-1">Nama Tujuan</label>
              <input
                type="text"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                className="w-full bg-white/5 border border-purple-500/30 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="Beli Rumah, Dana Pensiun, dll"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-purple-300 mb-1">Target Dana (Rp)</label>
              <input
                type="number"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                className="w-full bg-white/5 border border-purple-500/30 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="100000000"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-medium p-3 rounded-xl transition-colors"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => setIsSettingGoal(false)}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium p-3 rounded-xl transition-colors"
              >
                Batal
              </button>
            </div>
          </form>
        ) : goal ? (
          <div>
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-sm text-purple-300">{goal.title}</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(totalInvestment)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-purple-300">Target</p>
                <p className="text-sm font-medium text-purple-200">{formatCurrency(goal.targetAmount)}</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-black/40 rounded-full h-4 mb-2 overflow-hidden border border-purple-500/20">
              <motion.div 
                className="bg-gradient-to-r from-purple-600 to-purple-400 h-4 rounded-full relative"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </motion.div>
            </div>
            <p className="text-right text-xs text-purple-300 font-mono">{progressPercentage.toFixed(1)}% Tercapai</p>

            {/* Investment Chart */}
            {investmentData.length > 0 && (
              <div className="mt-6 h-48">
                <p className="text-sm text-purple-300 mb-2">Grafik Investasi</p>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={investmentData}>
                    <defs>
                      <linearGradient id="colorInvest" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#a855f7' }}
                      formatter={(value: number) => [formatCurrency(value), 'Investasi']}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorInvest)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-purple-300 mb-4">Kamu belum menetapkan tujuan investasi.</p>
            <button
              onClick={() => setIsSettingGoal(true)}
              className="bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/50 text-purple-300 px-6 py-2 rounded-xl transition-colors"
            >
              Mulai Tetapkan Tujuan
            </button>
          </div>
        )}
      </div>

      {/* Internet Usage Section */}
      <div className="bg-gradient-to-br from-teal-500/10 to-teal-900/10 border border-teal-500/20 p-6 rounded-3xl">
        <h3 className="text-xl font-bold flex items-center gap-2 text-teal-400 mb-4">
          <Wifi size={24} /> Penggunaan Internet
        </h3>
        
        <form onSubmit={handleAddInternetUsage} className="flex gap-2 mb-6">
          <input
            type="number"
            value={gbAmount}
            onChange={(e) => setGbAmount(e.target.value)}
            className="flex-1 bg-white/5 border border-teal-500/30 rounded-xl p-3 text-white focus:outline-none focus:border-teal-500 transition-colors"
            placeholder="Beli berapa GB?"
            required
            step="0.1"
          />
          <button
            type="submit"
            disabled={isSubmittingGb}
            className="bg-teal-500 hover:bg-teal-600 text-white font-medium px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            Catat
          </button>
        </form>

        {internetUsage.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={internetUsage}>
                <defs>
                  <linearGradient id="colorWifi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="displayDate" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#2dd4bf' }}
                  formatter={(value: number) => [`${value} GB`, 'Pembelian']}
                />
                <Area type="step" dataKey="gbAmount" stroke="#2dd4bf" strokeWidth={3} fillOpacity={1} fill="url(#colorWifi)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-teal-300 text-center py-4 text-sm">Belum ada catatan pembelian internet.</p>
        )}
      </div>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
        <h3 className="text-xl font-bold mb-4">Riwayat Keuangan</h3>
        <div className="space-y-3">
          {records.length === 0 ? (
            <p className="text-slate-400 text-center py-4">Belum ada catatan.</p>
          ) : (
            records.map(record => (
              <div key={record.id} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                <div>
                  <p className="font-medium text-white">{record.category}</p>
                  <p className="text-xs text-slate-400">
                    {record.date && !isNaN(new Date(record.date).getTime()) 
                      ? format(new Date(record.date), 'dd MMM yyyy, HH:mm', { locale: id }) 
                      : 'Tanggal tidak valid'}
                    {record.note && ` • ${record.note}`}
                  </p>
                </div>
                <div className={`font-bold ${
                  record.type === 'expense' ? 'text-red-400' : 
                  record.type === 'income' ? 'text-emerald-400' : 
                  record.type === 'savings' ? 'text-blue-400' : 'text-purple-400'
                }`}>
                  {record.type === 'expense' ? '-' : '+'}{formatCurrency(record.amount)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
