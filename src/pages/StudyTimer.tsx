import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, onSnapshot, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store/useStore';
import { formatTime } from '../lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Play, Square } from 'lucide-react';

export function StudyTimer() {
  const { user } = useStore();
  const [sessions, setSessions] = useState<any[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'study_sessions'),
      where('userId', '==', user.uid),
      orderBy('startTime', 'desc')
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSessions(data);
    });
    return () => unsub();
  }, [user]);

  // Timer logic with localStorage persistence
  useEffect(() => {
    const storedStart = localStorage.getItem('studyStartTime');
    if (storedStart) {
      setIsActive(true);
      const start = new Date(storedStart).getTime();
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    } else if (isActive) {
      const start = Date.now() - (elapsed * 1000);
      const interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isActive]);

  const toggleTimer = async () => {
    if (isActive) {
      // Stop timer
      setIsActive(false);
      const startTimeStr = localStorage.getItem('studyStartTime');
      localStorage.removeItem('studyStartTime');
      
      if (startTimeStr && user) {
        const startTime = new Date(startTimeStr);
        const endTime = new Date();
        const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        
        if (duration > 60) { // Only save if > 1 minute
          try {
            await addDoc(collection(db, 'study_sessions'), {
              userId: user.uid,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              duration,
              note,
              createdAt: new Date().toISOString()
            });
            toast.success('Sesi belajar disimpan!');
          } catch (error) {
            toast.error('Gagal menyimpan sesi.');
          }
        } else {
          toast.error('Sesi terlalu singkat (kurang dari 1 menit) tidak disimpan.');
        }
      }
      setElapsed(0);
      setNote('');
    } else {
      // Start timer
      setIsActive(true);
      localStorage.setItem('studyStartTime', new Date().toISOString());
      toast.success('Timer dimulai!');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-3xl text-center">
        <h2 className="text-2xl font-bold mb-8">Timer Belajar</h2>
        
        <div className="text-6xl md:text-8xl font-mono font-bold text-blue-400 mb-8 tracking-wider">
          {formatTime(elapsed)}
        </div>

        {isActive && (
          <div className="mb-6 max-w-md mx-auto">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors text-center"
              placeholder="Sedang belajar apa?"
            />
          </div>
        )}

        <button
          onClick={toggleTimer}
          className={`inline-flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-lg transition-all ${
            isActive 
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]' 
              : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
          }`}
        >
          {isActive ? (
            <><Square fill="currentColor" /> Selesai</>
          ) : (
            <><Play fill="currentColor" /> Mulai Belajar</>
          )}
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
        <h3 className="text-xl font-bold mb-4">Riwayat Belajar</h3>
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <p className="text-slate-400 text-center py-4">Belum ada rekor belajar.</p>
          ) : (
            sessions.map(session => (
              <div key={session.id} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5">
                <div>
                  <p className="font-medium text-white">
                    {session.startTime && !isNaN(new Date(session.startTime).getTime()) 
                      ? format(new Date(session.startTime), 'EEEE, dd MMM yyyy', { locale: id }) 
                      : 'Tanggal tidak valid'}
                  </p>
                  <p className="text-xs text-slate-400">
                    {session.startTime && !isNaN(new Date(session.startTime).getTime()) ? format(new Date(session.startTime), 'HH:mm') : '??:??'} 
                    {' - '}
                    {session.endTime && !isNaN(new Date(session.endTime).getTime()) ? format(new Date(session.endTime), 'HH:mm') : '??:??'}
                    {session.note && ` • ${session.note}`}
                  </p>
                </div>
                <div className="font-bold text-blue-400 font-mono">
                  {formatTime(session.duration)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
