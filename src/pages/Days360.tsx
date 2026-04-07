import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, onSnapshot, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store/useStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
import { id } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Calendar as CalendarIcon, CheckCircle2, XCircle } from 'lucide-react';

export function Days360() {
  const { user } = useStore();
  const [records, setRecords] = useState<any[]>([]);
  const [projectName, setProjectName] = useState('');
  const [progress, setProgress] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'project_days'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecords(data);
    });
    return () => unsub();
  }, [user]);

  const handleLogProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName || !progress || !user) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'project_days'), {
        userId: user.uid,
        date: new Date().toISOString(),
        projectName,
        progress,
        nextStep,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      toast.success('Progres hari ini dicatat!');
      setProjectName('');
      setProgress('');
      setNextStep('');
    } catch (error) {
      toast.error('Gagal mencatat progres.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipDay = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'project_days'), {
        userId: user.uid,
        date: new Date().toISOString(),
        status: 'skipped',
        createdAt: new Date().toISOString()
      });
      toast.success('Hari ini dilewati (merah).');
    } catch (error) {
      toast.error('Gagal mencatat skip.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calendar Logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getRecordForDay = (date: Date) => {
    return records.find(r => {
      if (!r.date) return false;
      const d = new Date(r.date);
      return !isNaN(d.getTime()) && isSameDay(d, date);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/50">
          <CalendarIcon className="text-blue-400" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Days 360</h2>
          <p className="text-slate-400">Catat produktivitas dan progres projectmu setiap hari.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Form Section */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl h-fit">
          <h3 className="text-xl font-bold mb-4">Catat Hari Ini</h3>
          
          {getRecordForDay(today) ? (
            <div className="text-center py-8">
              <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4" />
              <p className="text-lg font-medium">Kamu sudah mencatat hari ini!</p>
              <p className="text-slate-400">Pertahankan konsistensimu besok.</p>
            </div>
          ) : (
            <form onSubmit={handleLogProgress} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Nama Project</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Misal: Belajar React, Bikin Game"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Progres Hari Ini</label>
                <textarea
                  value={progress}
                  onChange={(e) => setProgress(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors min-h-[100px]"
                  placeholder="Apa yang kamu kerjakan hari ini?"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Catatan Selanjutnya (Next Step)</label>
                <textarea
                  value={nextStep}
                  onChange={(e) => setNextStep(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors min-h-[80px]"
                  placeholder="Apa yang akan dikerjakan besok?"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium p-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  Simpan Progres
                </button>
                <button
                  type="button"
                  onClick={handleSkipDay}
                  disabled={isSubmitting}
                  className="px-4 bg-red-500/20 hover:bg-red-500/40 border border-red-500/50 text-red-400 font-medium rounded-xl transition-colors disabled:opacity-50"
                  title="Lewati hari ini (Kosong/Merah)"
                >
                  <XCircle size={24} />
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Calendar Section */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">{format(currentMonth, 'MMMM yyyy', { locale: id })}</h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                className="p-2 bg-white/5 rounded-lg hover:bg-white/10"
              >
                &lt;
              </button>
              <button 
                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                className="p-2 bg-white/5 rounded-lg hover:bg-white/10"
              >
                &gt;
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-sm font-medium text-slate-400">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {/* Empty cells for start of month */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {daysInMonth.map(day => {
              const record = getRecordForDay(day);
              const isCurrentDay = isToday(day);
              
              let bgColor = 'bg-white/5';
              let borderColor = 'border-white/10';
              
              if (record) {
                if (record.status === 'active') {
                  bgColor = 'bg-emerald-500/20';
                  borderColor = 'border-emerald-500/50';
                } else if (record.status === 'skipped') {
                  bgColor = 'bg-red-500/20';
                  borderColor = 'border-red-500/50';
                }
              }

              return (
                <div 
                  key={day.toISOString()} 
                  className={`aspect-square rounded-xl border flex items-center justify-center relative group cursor-default transition-colors ${bgColor} ${borderColor} ${isCurrentDay ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <span className={`text-sm ${record ? 'text-white font-bold' : 'text-slate-400'}`}>
                    {format(day, 'd')}
                  </span>
                  
                  {/* Tooltip */}
                  {record && record.status === 'active' && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-slate-800 border border-slate-700 rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity shadow-xl">
                      <p className="font-bold text-sm text-white mb-1">{record.projectName}</p>
                      <p className="text-xs text-slate-300 line-clamp-2">{record.progress}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 flex gap-4 text-sm text-slate-400 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500/50 border border-emerald-500"></div>
              <span>Produktif</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/50 border border-red-500"></div>
              <span>Lewati</span>
            </div>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
        <h3 className="text-xl font-bold mb-4">Riwayat Progres</h3>
        <div className="space-y-4">
          {records.filter(r => r.status === 'active').length === 0 ? (
            <p className="text-slate-400 text-center py-4">Belum ada catatan progres.</p>
          ) : (
            records.filter(r => r.status === 'active').map(record => (
              <div key={record.id} className="bg-white/5 border border-white/10 p-4 rounded-xl">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-lg text-blue-400">{record.projectName}</h4>
                  <span className="text-xs text-slate-400 bg-black/20 px-2 py-1 rounded-md">
                    {record.date && !isNaN(new Date(record.date).getTime()) 
                      ? format(new Date(record.date), 'dd MMM yyyy', { locale: id }) 
                      : 'Tanggal tidak valid'}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-slate-400 block text-xs uppercase tracking-wider mb-1">Progres:</span>
                    <p className="text-slate-200">{record.progress}</p>
                  </div>
                  {record.nextStep && (
                    <div className="pt-2 border-t border-white/10">
                      <span className="text-slate-400 block text-xs uppercase tracking-wider mb-1">Selanjutnya:</span>
                      <p className="text-slate-300 italic">{record.nextStep}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
