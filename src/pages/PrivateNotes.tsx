import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Lock, Unlock, KeyRound, Plus, X, Image as ImageIcon, Link as LinkIcon, Video, Upload, Edit2, Trash2 } from 'lucide-react';

export function PrivateNotes() {
  const { user, pinUnlocked, setPinUnlocked } = useStore();
  const [notes, setNotes] = useState<any[]>([]);
  const [pin, setPin] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'link' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    
    // Check if user has a PIN
    const checkPin = async () => {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data().pinHash) {
        setHasPin(true);
      } else {
        setHasPin(false);
        setIsSettingPin(true);
      }
    };
    checkPin();
  }, [user]);

  useEffect(() => {
    if (!user || !pinUnlocked) return;
    
    const q = query(
      collection(db, 'private_notes'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotes(data);
    });
    return () => unsub();
  }, [user, pinUnlocked]);

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || pin.length < 4) {
      toast.error('PIN minimal 4 digit');
      return;
    }
    
    try {
      // In a real app, hash the PIN. Here we store it directly for simplicity in preview
      await updateDoc(doc(db, 'users', user.uid), {
        pinHash: pin
      });
      setHasPin(true);
      setIsSettingPin(false);
      setPinUnlocked(true);
      setPin('');
      toast.success('PIN berhasil diatur!');
    } catch (error) {
      toast.error('Gagal mengatur PIN');
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data().pinHash === pin) {
        setPinUnlocked(true);
        setPin('');
        toast.success('Catatan terbuka');
      } else {
        toast.error('PIN salah');
      }
    } catch (error) {
      toast.error('Gagal memverifikasi PIN');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setMediaUrl(dataUrl);
        setMediaType('image');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !user) return;

    setIsSubmitting(true);
    try {
      if (editingNoteId) {
        await updateDoc(doc(db, 'private_notes', editingNoteId), {
          title,
          content,
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
          updatedAt: new Date().toISOString()
        });
        toast.success('Catatan diperbarui!');
      } else {
        await addDoc(collection(db, 'private_notes'), {
          userId: user.uid,
          title,
          content,
          mediaUrl: mediaUrl || null,
          mediaType: mediaType || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        toast.success('Catatan disimpan!');
      }
      resetForm();
    } catch (error) {
      toast.error('Gagal menyimpan catatan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm('Apakah kamu yakin ingin menghapus catatan ini?')) return;
    try {
      await deleteDoc(doc(db, 'private_notes', id));
      toast.success('Catatan dihapus!');
    } catch (error) {
      toast.error('Gagal menghapus catatan.');
    }
  };

  const handleEditClick = (note: any) => {
    setEditingNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setMediaUrl(note.mediaUrl || '');
    setMediaType(note.mediaType || '');
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setMediaUrl('');
    setMediaType('');
    setEditingNoteId(null);
    setIsAdding(false);
  };

  if (!pinUnlocked) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center h-[60vh]"
      >
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="text-blue-400" size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {isSettingPin ? 'Buat PIN Keamanan' : 'Masukkan PIN'}
          </h2>
          <p className="text-slate-400 mb-6 text-sm">
            {isSettingPin 
              ? 'Buat PIN untuk mengamankan catatan pribadimu.' 
              : 'Catatan pribadimu dikunci dengan aman.'}
          </p>
          
          <form onSubmit={isSettingPin ? handleSetPin : handleUnlock} className="space-y-4">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-center text-2xl tracking-[0.5em] text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="••••"
              maxLength={6}
              autoFocus
            />
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium p-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <KeyRound size={18} />
              {isSettingPin ? 'Simpan PIN' : 'Buka Kunci'}
            </button>
          </form>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Unlock className="text-emerald-400" /> Catatan Pribadi
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => { resetForm(); setIsAdding(true); }}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-xl transition-colors flex items-center gap-2 px-4"
          >
            <Plus size={20} /> <span className="hidden md:inline">Tambah</span>
          </button>
          <button
            onClick={() => setPinUnlocked(false)}
            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-xl transition-colors"
            title="Kunci Kembali"
          >
            <Lock size={20} />
          </button>
        </div>
      </div>

      {isAdding && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl relative"
        >
          <button 
            onClick={resetForm}
            className="absolute top-6 right-6 text-slate-400 hover:text-white"
          >
            <X size={24} />
          </button>
          <h3 className="text-xl font-bold mb-4">{editingNoteId ? 'Edit Catatan' : 'Catatan Baru'}</h3>
          <form onSubmit={handleSaveNote} className="space-y-4">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="Judul Catatan"
              required
            />
            
            {mediaType && (
              <div className="flex gap-2 items-center bg-black/20 p-2 rounded-xl">
                {mediaUrl.startsWith('data:image') ? (
                  <div className="flex-1 text-sm text-emerald-400 truncate px-2">Gambar berhasil diunggah</div>
                ) : (
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-white text-sm"
                    placeholder={`URL ${mediaType === 'image' ? 'Gambar' : mediaType === 'video' ? 'Video' : 'Link'}`}
                    required
                  />
                )}
                <button type="button" onClick={() => {setMediaType(''); setMediaUrl('');}} className="text-red-400 p-2"><X size={16}/></button>
              </div>
            )}

            <div className="flex gap-2 mb-2">
              <button type="button" onClick={() => setMediaType('image')} className={`p-2 rounded-lg transition-colors ${mediaType === 'image' && !mediaUrl.startsWith('data:image') ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`} title="Tambah Foto dari URL">
                <ImageIcon size={20} />
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className={`p-2 rounded-lg transition-colors ${mediaUrl.startsWith('data:image') ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`} title="Upload Foto">
                <Upload size={20} />
              </button>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
              />
              <button type="button" onClick={() => setMediaType('video')} className={`p-2 rounded-lg transition-colors ${mediaType === 'video' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`} title="Tambah Video">
                <Video size={20} />
              </button>
              <button type="button" onClick={() => setMediaType('link')} className={`p-2 rounded-lg transition-colors ${mediaType === 'link' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`} title="Tambah Link">
                <LinkIcon size={20} />
              </button>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-blue-500 transition-colors h-32 resize-none"
              placeholder={mediaType === 'image' ? "Deskripsi foto..." : "Tulis sesuatu yang rahasia..."}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium p-3 rounded-xl transition-colors disabled:opacity-50 px-6"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Catatan'}
            </button>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {notes.length === 0 && !isAdding ? (
          <div className="col-span-full text-center py-12 text-slate-400 bg-white/5 rounded-3xl border border-white/5">
            Belum ada catatan pribadi.
          </div>
        ) : (
          notes.map(note => (
            <div key={note.id} className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl hover:bg-white/10 transition-colors group flex flex-col relative">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEditClick(note)} className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/40 transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDeleteNote(note.id)} className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/40 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>

              <h3 className="text-lg font-bold text-white mb-2 pr-20">{note.title}</h3>
              
              {note.mediaUrl && note.mediaType === 'image' && (
                <div className="mb-3 rounded-xl overflow-hidden bg-black/20">
                  <img src={note.mediaUrl} alt="Note media" className="w-full h-48 object-cover" />
                </div>
              )}
              {note.mediaUrl && note.mediaType === 'video' && (
                <div className="mb-3 rounded-xl overflow-hidden bg-black/20 p-2 flex items-center gap-2 text-blue-400">
                  <Video size={20} /> <a href={note.mediaUrl} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{note.mediaUrl}</a>
                </div>
              )}
              {note.mediaUrl && note.mediaType === 'link' && (
                <div className="mb-3 rounded-xl overflow-hidden bg-black/20 p-2 flex items-center gap-2 text-blue-400">
                  <LinkIcon size={20} /> <a href={note.mediaUrl} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">{note.mediaUrl}</a>
                </div>
              )}

              <p className="text-slate-300 text-sm mb-4 flex-1 whitespace-pre-wrap">{note.content}</p>
              <p className="text-xs text-slate-500 mt-auto">
                {format(new Date(note.updatedAt), 'dd MMM yyyy, HH:mm', { locale: id })}
              </p>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
