import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, onSnapshot, addDoc, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Star, AlertCircle, Trophy, Target, CheckCircle2, Circle } from 'lucide-react';

interface CharacterLog {
  id: string;
  userId: string;
  type: 'strength' | 'weakness';
  points: number;
  description: string;
  date: string;
  createdAt: string;
  resolved: boolean;
}

export function Character() {
  const { user } = useStore();
  const [logs, setLogs] = useState<CharacterLog[]>([]);
  const [type, setType] = useState('strength');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [stats, setStats] = useState({ strength: 0, weakness: 0 });

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'character_logs'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc')
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CharacterLog));
      setLogs(data);
      
      let strength = 0;
      let weakness = 0;
      data.forEach(log => {
        if (log.type === 'strength') strength += log.points;
        if (log.type === 'weakness' && !log.resolved) weakness += log.points;
      });
      setStats({ strength, weakness });
    });
    return () => unsub();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !user) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'character_logs'), {
        userId: user.uid,
        type,
        points: Number(points),
        description,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        resolved: false
      });
      toast.success('Log karakter ditambahkan!');
      setDescription('');
      setPoints(10);
    } catch (error) {
      toast.error('Gagal menambahkan log.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleResolved = async (logId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'character_logs', logId), {
        resolved: !currentStatus
      });
      if (!currentStatus) {
        toast.success('Hebat! Kamu telah memperbaiki kekuranganmu.');
      }
    } catch (error) {
      toast.error('Gagal mengupdate status.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-900/20 border border-emerald-500/30 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="text-emerald-400" size={24} />
            <h3 className="text-xl font-bold text-emerald-400">Poin Kelebihan</h3>
          </div>
          <p className="text-4xl font-bold text-white mb-2">{stats.strength}</p>
          <p className="text-sm text-emerald-200/70">
            Kumpulkan poin ini untuk self-reward (beli makanan/berbagi).
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-red-500/20 to-red-900/20 border border-red-500/30 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-2">
            <Target className="text-red-400" size={24} />
            <h3 className="text-xl font-bold text-red-400">Poin Kekurangan</h3>
          </div>
          <p className="text-4xl font-bold text-white mb-2">{stats.weakness}</p>
          <p className="text-sm text-red-200/70">
            Semakin tinggi poin ini, semakin keras kamu harus memperbaiki diri.
          </p>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
        <h2 className="text-2xl font-bold mb-6">Catat Evaluasi Diri</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setType('strength')}
              className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${type === 'strength' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
            >
              <Star size={18} /> Kelebihan
            </button>
            <button
              type="button"
              onClick={() => setType('weakness')}
              className={`p-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${type === 'weakness' ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'border-white/10 text-slate-400 hover:bg-white/5'}`}
            >
              <AlertCircle size={18} /> Kekurangan
            </button>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Apa yang kamu lakukan?</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder={type === 'strength' ? 'Berhasil bangun pagi...' : 'Menunda pekerjaan...'}
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Bobot Poin (1-100)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full font-medium p-3 rounded-xl transition-colors disabled:opacity-50 ${
              type === 'strength' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Evaluasi'}
          </button>
        </form>
      </div>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
        <h3 className="text-xl font-bold mb-6">Riwayat Evaluasi</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Kelebihan Column */}
          <div>
            <h4 className="text-lg font-semibold text-emerald-400 mb-4 flex items-center gap-2">
              <Star size={20} /> Kelebihan
            </h4>
            <div className="space-y-3">
              {logs.filter(l => l.type === 'strength').length === 0 ? (
                <p className="text-slate-400 text-sm">Belum ada riwayat kelebihan.</p>
              ) : (
                logs.filter(l => l.type === 'strength').map(log => (
                  <div key={log.id} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-emerald-500/20">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-emerald-400">
                        <Star size={18} />
                      </div>
                      <div>
                        <p className="font-medium text-white">{log.description}</p>
                        <p className="text-xs text-slate-400">
                          {log.date && !isNaN(new Date(log.date).getTime()) 
                            ? format(new Date(log.date), 'dd MMM yyyy, HH:mm', { locale: id }) 
                            : 'Tanggal tidak valid'}
                        </p>
                      </div>
                    </div>
                    <div className="font-bold text-lg text-emerald-400">
                      +{log.points}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Kekurangan Column */}
          <div>
            <h4 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
              <AlertCircle size={20} /> Kekurangan
            </h4>
            <div className="space-y-3">
              {logs.filter(l => l.type === 'weakness').length === 0 ? (
                <p className="text-slate-400 text-sm">Belum ada riwayat kekurangan.</p>
              ) : (
                logs.filter(l => l.type === 'weakness').map(log => (
                  <div key={log.id} className={`flex justify-between items-center p-4 rounded-xl border transition-all ${log.resolved ? 'bg-slate-800/50 border-slate-700/50 opacity-60' : 'bg-white/5 border-red-500/20'}`}>
                    <div className="flex items-start gap-3">
                      <button 
                        onClick={() => toggleResolved(log.id, !!log.resolved)}
                        className={`mt-1 transition-colors ${log.resolved ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}
                        title={log.resolved ? "Tandai belum selesai" : "Tandai sudah diperbaiki"}
                      >
                        {log.resolved ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                      </button>
                      <div className={log.resolved ? 'line-through text-slate-400' : ''}>
                        <p className={`font-medium ${log.resolved ? 'text-slate-400' : 'text-white'}`}>{log.description}</p>
                        <p className="text-xs text-slate-500">
                          {log.date && !isNaN(new Date(log.date).getTime()) 
                            ? format(new Date(log.date), 'dd MMM yyyy, HH:mm', { locale: id }) 
                            : 'Tanggal tidak valid'}
                        </p>
                      </div>
                    </div>
                    <div className={`font-bold text-lg ${log.resolved ? 'text-slate-500' : 'text-red-400'}`}>
                      +{log.points}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
