import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, onSnapshot, addDoc, orderBy, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { MessageCircleCode, Send, Copy, Users, Edit2, Trash2, X, Image as ImageIcon, Video, Link as LinkIcon, Camera, Upload, Maximize2 } from 'lucide-react';

export function Chat() {
  const { user } = useStore();
  const [myChatId, setMyChatId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [sessionList, setSessionList] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  
  const [newMessage, setNewMessage] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'link' | ''>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
        const newId = Math.random().toString(16).substring(2, 8).toUpperCase();
        await setDoc(userRef, { chatId: newId }, { merge: true });
        setMyChatId(newId);
      }
    };
    
    initChatId();
  }, [user]);

  // Listen to session list
  useEffect(() => {
    if (!myChatId) return;
    const q = query(
      collection(db, 'chat_sessions'),
      where('participants', 'array-contains', myChatId),
      orderBy('updatedAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setSessionList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [myChatId]);

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

  const handleStartChat = async (e?: React.FormEvent, tid?: string) => {
    e?.preventDefault();
    const target = (tid || targetId).trim().toUpperCase();
    if (!target || target === myChatId) {
      toast.error('ID Chat tidak valid');
      return;
    }
    
    // Create a deterministic session ID based on both chat IDs
    const sortedIds = [myChatId, target].sort();
    const sessionId = `${sortedIds[0]}_${sortedIds[1]}`;
    
    // Upsert session
    await setDoc(doc(db, 'chat_sessions', sessionId), {
      participants: [myChatId, target],
      updatedAt: new Date().toISOString()
    }, { merge: true });

    setActiveSession(sessionId);
    setTargetId(target);
    toast.success(`Terhubung dengan ID: ${target}`);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !mediaUrl) || !activeSession || !user) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      if (editingMsgId) {
        await updateDoc(doc(db, 'chat_messages', editingMsgId), {
          text,
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
          updatedAt: new Date().toISOString()
        });
        setEditingMsgId(null);
      } else {
        await addDoc(collection(db, 'chat_messages'), {
          sessionId: activeSession,
          senderId: myChatId,
          text,
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
          createdAt: new Date().toISOString()
        });
        // update session last updated
        await setDoc(doc(db, 'chat_sessions', activeSession), {
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
      setMediaUrl('');
      setMediaType('');
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      toast.error('Gagal mengirim pesan');
    }
  };

  const handleDeleteMsg = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Hapus chat ini?')) return;
    try {
      await import('firebase/firestore').then(({ deleteDoc }) => deleteDoc(doc(db, 'chat_messages', id)));
    } catch (err) {
      toast.error('Gagal hapus pesan');
    }
  };

  const copyMyId = () => {
    navigator.clipboard.writeText(myChatId);
    toast.success('ID Chat disalin!');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setMediaUrl(dataUrl);
        setMediaType('image');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto h-[calc(100dvh-5rem)] md:h-[calc(100dvh-8rem)] min-h-[500px] flex flex-col overscroll-none"
    >
      <div className="flex items-center gap-3 mb-6 shrink-0 pt-2">
        <div className="w-12 h-12 bg-teal-500/20 rounded-2xl flex items-center justify-center">
          <MessageCircleCode className="text-teal-400" size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Anonymous Chat</h2>
          <p className="text-slate-400 text-sm">Chat aman hanya menggunakan ID, tanpa nama.</p>
        </div>
      </div>

      {!activeSession ? (
        <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
          <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-2xl flex flex-col h-full overflow-y-auto">
            <div className="mb-6 shrink-0">
              <p className="text-slate-400 mb-2">ID Chat Kamu</p>
              <div 
                onClick={copyMyId}
                className="text-3xl md:text-4xl font-mono font-bold tracking-[0.2em] text-teal-400 bg-black/20 py-4 rounded-2xl cursor-pointer hover:bg-black/30 transition-colors flex items-center justify-center gap-4 group"
                title="Klik untuk menyalin"
              >
                {myChatId || '......'}
                <Copy size={20} className="opacity-0 group-hover:opacity-100 transition-opacity text-teal-500 hidden md:block" />
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">Bagikan ID ini ke temanmu</p>
            </div>

            <form onSubmit={(e) => handleStartChat(e)} className="mt-2 shrink-0">
              <p className="text-slate-400 mb-2">Mulai Chat Baru</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="ID Teman..."
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

            <div className="mt-8 flex-1">
              <p className="text-slate-400 mb-4 border-b border-white/10 pb-2">Riwayat Chat</p>
              <div className="space-y-2">
                {sessionList.map(session => {
                  const otherId = session.participants.find((p: string) => p !== myChatId);
                  return (
                    <div 
                      key={session.id}
                      onClick={() => handleStartChat(undefined, otherId)}
                      className="p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 cursor-pointer transition-colors flex justify-between items-center"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-500/10 rounded-full flex items-center justify-center text-teal-400">
                          <Users size={18} />
                        </div>
                        <div>
                          <p className="font-bold font-mono tracking-wider">{otherId}</p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(session.updatedAt), 'dd MMM yyyy', { locale: id })}
                          </p>
                        </div>
                      </div>
                      <Send size={16} className="text-slate-600" />
                    </div>
                  );
                })}
                {sessionList.length === 0 && (
                  <p className="text-center text-slate-500 text-sm italic py-4">Belum ada obrolan.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl relative">
          {/* Chat Header */}
          <div className="bg-black/20 p-4 border-b border-white/10 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-500/20 rounded-full flex items-center justify-center">
                <Users className="text-teal-400" size={20} />
              </div>
              <div>
                <p className="font-bold text-white tracking-widest font-mono">{targetId.toUpperCase()}</p>
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Terhubung
                </p>
              </div>
            </div>
            <button 
              onClick={() => setActiveSession(null)}
              className="text-slate-400 hover:text-white text-sm bg-white/5 px-4 py-2 rounded-xl transition-colors shrink-0"
            >
              Kembali
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 relative min-h-0">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                Belum ada pesan. Kirim pesan untuk memulai!
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === myChatId;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group relative`}>
                    {isMe && (
                      <div className="absolute top-1/2 -translate-y-1/2 right-full mr-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingMsgId(msg.id);
                            setNewMessage(msg.text);
                            setMediaUrl(msg.mediaUrl || '');
                            setMediaType(msg.mediaType || '');
                          }}
                          className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteMsg(msg.id, e)}
                          className="p-1.5 bg-red-500/20 text-red-500 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                    <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-3 ${
                      isMe 
                        ? 'bg-teal-600 text-white rounded-tr-sm' 
                        : 'bg-white/10 text-slate-200 rounded-tl-sm'
                    }`}>
                      {msg.mediaUrl && msg.mediaType === 'image' && (
                        <div 
                          className="mb-2 rounded-xl overflow-hidden cursor-zoom-in"
                          onClick={() => setSelectedImage(msg.mediaUrl)}
                        >
                          <img src={msg.mediaUrl} alt="Chat media" className="w-full h-auto max-h-48 object-cover" />
                        </div>
                      )}
                      
                      {msg.mediaUrl && msg.mediaType === 'video' && (
                        <div className="mb-2 rounded-xl overflow-hidden">
                          <video src={msg.mediaUrl} controls className="w-full h-auto max-h-48 rounded" />
                        </div>
                      )}
                      
                      {msg.mediaUrl && msg.mediaType === 'link' && (
                        <a 
                          href={msg.mediaUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="block mb-2 text-teal-200 underline break-all"
                        >
                          {msg.mediaUrl}
                        </a>
                      )}
                      
                      {msg.text && <p className="break-words font-light">{msg.text}</p>}
                      <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-teal-200' : 'text-slate-400'}`}>
                        {format(new Date(msg.createdAt), 'HH:mm')}
                        {msg.updatedAt && <span className="ml-1 italic">(diedit)</span>}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 md:p-4 bg-black/20 border-t border-white/10 shrink-0">
            {mediaType && (
              <div className="mb-2 p-2 bg-black/40 rounded-xl flex gap-2 items-center text-xs">
                {mediaUrl.startsWith('data:image') ? (
                  <div className="flex-1 text-emerald-400 truncate px-2">Gambar siap dikirim</div>
                ) : (
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    placeholder={`URL ${mediaType === 'image' ? 'Gambar' : mediaType === 'video' ? 'Video' : 'Link'}`}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-white"
                  />
                )}
                <button type="button" onClick={() => {setMediaType(''); setMediaUrl('');}} className="text-red-400 p-1"><X size={14}/></button>
              </div>
            )}
            <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
              <div className="flex gap-1 md:gap-2">
                <button type="button" onClick={() => setMediaType('image')} className={`p-2 rounded-lg transition-colors ${mediaType === 'image' && !mediaUrl.startsWith('data:image') ? 'bg-teal-500/20 text-teal-400' : 'text-slate-400 hover:bg-white/10'}`}>
                  <ImageIcon size={18} />
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} className={`p-2 rounded-lg transition-colors ${mediaUrl.startsWith('data:image') ? 'bg-teal-500/20 text-teal-400' : 'text-slate-400 hover:bg-white/10'}`}>
                  <Upload size={18} />
                </button>
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
              </div>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={editingMsgId ? "Edit pesan..." : "Ketik pesan rahasia..."}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-teal-500 transition-colors"
                onFocus={() => {
                  setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 300);
                }}
              />
              {editingMsgId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingMsgId(null);
                    setNewMessage('');
                    setMediaUrl('');
                    setMediaType('');
                  }}
                  className="bg-red-500/20 text-red-500 p-3 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              )}
              <button
                type="submit"
                disabled={(!newMessage.trim() && !mediaUrl)}
                className="bg-teal-500 hover:bg-teal-600 text-white p-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
              >
                <Send size={20} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setSelectedImage(null)}
          >
            <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
              <X size={32} />
            </button>
            <motion.img 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage} 
              alt="Full size" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}