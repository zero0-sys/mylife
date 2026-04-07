import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, orderBy, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Quote, ThumbsUp, ThumbsDown, Trophy, Clock } from 'lucide-react';

export function Quotes() {
  const { user } = useStore();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Listen to quotes, ordered by points descending
    const q = query(
      collection(db, 'quotes'),
      orderBy('points', 'desc'),
      orderBy('createdAt', 'desc')
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuotes(data);
    });
    
    return () => unsub();
  }, [user]);

  const handleAddQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'quotes'), {
        userId: user.uid,
        authorName: user.displayName || 'Anonim',
        content: content.trim(),
        points: 0,
        createdAt: new Date().toISOString()
      });
      toast.success('Quotes berhasil ditambahkan!');
      setContent('');
    } catch (error) {
      toast.error('Gagal menambahkan quotes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (quoteId: string, value: number) => {
    try {
      await updateDoc(doc(db, 'quotes', quoteId), {
        points: increment(value)
      });
    } catch (error) {
      toast.error('Gagal memberikan vote.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center">
          <Quote className="text-indigo-400" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Quotes Inspiratif</h2>
          <p className="text-slate-400 text-sm">Bagikan kata-kata mutiara, tidak bisa diedit setelah diposting.</p>
        </div>
      </div>

      {/* Add Quote Form */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <form onSubmit={handleAddQuote} className="relative z-10">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tulis quotes terbaikmu hari ini..."
            className="w-full bg-black/20 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500 transition-colors h-32 resize-none text-lg font-medium"
            required
          />
          <div className="flex justify-end mt-4">
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
            >
              {isSubmitting ? 'Memposting...' : 'Posting Quotes'}
            </button>
          </div>
        </form>
      </div>

      {/* Quotes List */}
      <div className="space-y-6 mt-8">
        <AnimatePresence>
          {quotes.map((quote, index) => (
            <motion.div
              key={quote.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-[2rem] relative group overflow-hidden"
            >
              {/* Rank Badge */}
              <div className="absolute top-0 right-0 bg-indigo-500/20 text-indigo-300 px-4 py-2 rounded-bl-2xl rounded-tr-[2rem] font-bold flex items-center gap-1 text-sm border-b border-l border-white/5">
                <Trophy size={14} /> Peringkat #{index + 1}
              </div>

              <div className="flex gap-6">
                {/* Voting Column */}
                <div className="flex flex-col items-center justify-center gap-2 bg-black/20 p-3 rounded-2xl h-fit">
                  <button 
                    onClick={() => handleVote(quote.id, 1)}
                    className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-xl transition-colors"
                  >
                    <ThumbsUp size={20} />
                  </button>
                  <span className={`font-bold text-lg ${quote.points > 0 ? 'text-emerald-400' : quote.points < 0 ? 'text-red-400' : 'text-slate-300'}`}>
                    {quote.points}
                  </span>
                  <button 
                    onClick={() => handleVote(quote.id, -1)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
                  >
                    <ThumbsDown size={20} />
                  </button>
                </div>

                {/* Content Column */}
                <div className="flex-1 pt-2">
                  <Quote className="text-indigo-500/30 mb-2" size={32} />
                  <p className="text-xl md:text-2xl font-serif text-white leading-relaxed mb-6 italic">
                    "{quote.content}"
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg">
                        {quote.authorName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-indigo-300">{quote.authorName}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 bg-black/20 px-3 py-1.5 rounded-full">
                      <Clock size={12} />
                      {format(new Date(quote.createdAt), 'dd MMM yyyy, HH:mm', { locale: id })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {quotes.length === 0 && (
          <div className="text-center py-12 text-slate-400 bg-white/5 rounded-[2rem] border border-white/5">
            Belum ada quotes. Jadilah yang pertama!
          </div>
        )}
      </div>
    </motion.div>
  );
}