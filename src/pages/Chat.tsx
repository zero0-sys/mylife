import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, onSnapshot, addDoc, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { MessageCircleCode, Send, Copy, Users } from 'lucide-react';

export function Chat() {
  const { user } = useStore();
  const [myChatId, setMyChatId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize or fetch user's Chat ID
  useEffect(() => {
    if (!user) return;
    
    const initChatId = async () => {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists() && userSnap.data().chatId) {
        setMyChatId(userSnap.data().chatId);
      } else {
        // Generate a random 6-character hex ID
        const newId = Math.random().toString(16).substring(2, 8).toUpperCase();
        await setDoc(userRef, { chatId: newId }, { merge: true });
        setMyChatId(newId);
      }
    };
    
    initChatId();
  }, [user]);

  // Listen to messages when a session is active
  useEffect(() => {
    if (!activeSession) return;

    const q = query(
      collection(db, 'chat_messages'),
      where('sessionId', '==', activeSession),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(data);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsub();
  }, [activeSession]);

  const handleStartChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId.trim() || targetId.toUpperCase() === myChatId) {
      toast.error('ID Chat tidak valid');
      return;
    }
    
    // Create a deterministic session ID based on both chat IDs
    const sortedIds = [myChatId, targetId.toUpperCase()].sort();
    const sessionId = `${sortedIds[0]}_${sortedIds[1]}`;
    setActiveSession(sessionId);
    toast.success(`Terhubung dengan ID: ${targetId.toUpperCase()}`);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeSession || !user) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'chat_messages'), {
        sessionId: activeSession,
        senderId: myChatId,
        text,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      toast.error('Gagal mengirim pesan');
    }
  };

  const copyMyId = () => {
    navigator.clipboard.writeText(myChatId);
    toast.success('ID Chat disalin!');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col"
    >
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <div className="w-12 h-12 bg-teal-500/20 rounded-2xl flex items-center justify-center">
          <MessageCircleCode className="text-teal-400" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Anonymous Chat</h2>
          <p className="text-slate-400 text-sm">Chat aman hanya menggunakan ID, tanpa nama.</p>
        </div>
      </div>

      {!activeSession ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] w-full max-w-md text-center shadow-2xl">
            <div className="mb-8">
              <p className="text-slate-400 mb-2">ID Chat Kamu</p>
              <div 
                onClick={copyMyId}
                className="text-4xl font-mono font-bold tracking-[0.2em] text-teal-400 bg-black/20 py-4 rounded-2xl cursor-pointer hover:bg-black/30 transition-colors flex items-center justify-center gap-4 group"
                title="Klik untuk menyalin"
              >
                {myChatId || '......'}
                <Copy size={20} className="opacity-0 group-hover:opacity-100 transition-opacity text-teal-500" />
              </div>
              <p className="text-xs text-slate-500 mt-2">Bagikan ID ini ke temanmu untuk mulai chat</p>
            </div>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#0f172a] px-4 text-sm text-slate-500">ATAU</span>
              </div>
            </div>

            <form onSubmit={handleStartChat} className="mt-4">
              <p className="text-slate-400 mb-2 text-left">Mulai Chat Baru</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="Masukkan ID Teman..."
                  className="flex-1 bg-black/20 border border-white/10 rounded-xl p-3 text-white font-mono uppercase focus:outline-none focus:border-teal-500 transition-colors"
                  maxLength={6}
                  required
                />
                <button
                  type="submit"
                  className="bg-teal-500 hover:bg-teal-600 text-white px-6 rounded-xl font-bold transition-colors"
                >
                  Mulai
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
          {/* Chat Header */}
          <div className="bg-black/20 p-4 border-b border-white/10 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-500/20 rounded-full flex items-center justify-center">
                <Users className="text-teal-400" size={20} />
              </div>
              <div>
                <p className="font-bold text-white">Chat dengan {targetId.toUpperCase()}</p>
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Terhubung
                </p>
              </div>
            </div>
            <button 
              onClick={() => setActiveSession(null)}
              className="text-slate-400 hover:text-white text-sm bg-white/5 px-4 py-2 rounded-xl transition-colors"
            >
              Tutup Chat
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                Belum ada pesan. Kirim pesan untuk memulai!
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === myChatId;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl p-3 ${
                      isMe 
                        ? 'bg-teal-500 text-white rounded-tr-sm' 
                        : 'bg-white/10 text-slate-200 rounded-tl-sm'
                    }`}>
                      <p className="break-words">{msg.text}</p>
                      <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-teal-200' : 'text-slate-400'}`}>
                        {format(new Date(msg.createdAt), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-black/20 border-t border-white/10 shrink-0">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Ketik pesan rahasia..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-teal-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-teal-500 hover:bg-teal-600 text-white p-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}