import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from '../firebase';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Edit2, Image as ImageIcon, Link as LinkIcon, Heart, MessageCircle, Gift, Upload, Video, GraduationCap, Briefcase, Cake, Camera, X, Circle, StopCircle, Maximize2, Send, Eye, Trash2 } from 'lucide-react';

export function SocialProfile() {
  const { user, setViewPostId } = useStore();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  
  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.displayName || '');
  const [bio, setBio] = useState('');
  const [school, setSchool] = useState('');
  const [work, setWork] = useState('');
  const [birthday, setBirthday] = useState('');
  const [coverURL, setCoverURL] = useState('');
  const [danaKagetLink, setDanaKagetLink] = useState('');
  const [photoURL, setPhotoURL] = useState('');

  // New Post State
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'link' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal/Lightbox State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  
  // Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    
    // Profile listener
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile(data);
        setBio(data.bio || '');
        setSchool(data.school || '');
        setWork(data.work || '');
        setBirthday(data.birthday || '');
        setCoverURL(data.coverURL || '');
        setDanaKagetLink(data.danaKagetLink || '');
        setPhotoURL(data.photoURL || '');
      }
      setUsername(user.displayName || '');
    });

    // Posts listener
    const q = query(
      collection(db, 'social_posts'),
      where('userId', '==', user.uid)
    );
    
    let commentUnsubs: (() => void)[] = [];

    const unsubPosts = onSnapshot(q, (snap) => {
      const fetchedPosts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedPosts.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPosts(fetchedPosts);

      // Cleanup previous comment listeners
      commentUnsubs.forEach(unsub => unsub());
      commentUnsubs = [];

      // Fetch comments for these posts
      fetchedPosts.forEach(post => {
        const qComments = query(
          collection(db, 'social_comments'),
          where('postId', '==', post.id)
        );
        const unsubComment = onSnapshot(qComments, (commentSnap) => {
          const fetchedComments = commentSnap.docs.map(c => ({ id: c.id, ...c.data() }));
          fetchedComments.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          
          setComments(prev => ({
            ...prev,
            [post.id]: fetchedComments
          }));
        });
        commentUnsubs.push(unsubComment);
      });
    }, (error) => {
      console.error("Error fetching posts:", error);
    });

    return () => {
      unsubProfile();
      unsubPosts();
      commentUnsubs.forEach(unsub => unsub());
      stopCamera();
    };
  }, [user]);

  const handleLike = async (post: any) => {
    if (!user) return;
    try {
      const likedBy = post.likedBy || [];
      let newLikedBy = [...likedBy];
      if (newLikedBy.includes(user.uid)) {
        newLikedBy = newLikedBy.filter((uid: string) => uid !== user.uid);
      } else {
        newLikedBy.push(user.uid);
      }
      await updateDoc(doc(db, 'social_posts', post.id), {
        likedBy: newLikedBy,
        likesCount: newLikedBy.length
      });
    } catch (error) {
      console.error("Gagal like", error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Hapus postingan ini?')) return;
    try {
      await deleteDoc(doc(db, 'social_posts', postId));
      toast.success('Postingan dihapus');
    } catch (error: any) {
      console.error("Gagal hapus:", error);
      toast.error('Gagal menghapus postingan: ' + (error.message || 'Error tidak diketahui'));
    }
  };

  const handleComment = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    const content = newComment[postId];
    if (!content || !user) return;

    try {
      await addDoc(collection(db, 'social_comments'), {
        postId,
        userId: user.uid,
        authorName: user.displayName || 'User',
        authorPhoto: user.photoURL || '',
        content,
        createdAt: new Date().toISOString(),
        isBot: false
      });
      
      setNewComment(prev => ({ ...prev, [postId]: '' }));
    } catch (error: any) {
      console.error("Gagal mengirim komentar:", error);
      toast.error('Gagal mengirim komentar: ' + (error.message || 'Error Firebase Rules.'));
    }
  };

  const renderPost = (post: any, isDetail = false) => {
    const hasLiked = post.likedBy?.includes(user?.uid);
    const likesDisplay = post.likedBy ? post.likedBy.length : 0;
    const viewersDisplay = post.likedBy ? (post.viewersCount || 0) : 0;

    return (
    <div 
      key={post.id} 
      className={`bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-3xl transition-all ${!isDetail ? 'hover:bg-white/10 cursor-pointer' : ''} group relative`}
      onClick={() => !isDetail && setViewPostId(post.id)}
    >
      {user?.uid === post.userId && (
         <button 
           onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }}
           className="absolute top-4 right-4 p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/40 transition-colors opacity-0 group-hover:opacity-100"
         >
           <Trash2 size={16} />
         </button>
      )}
      <div className="flex items-center gap-3 mb-4">
        <img src={post.authorPhoto || 'https://via.placeholder.com/40'} alt="Author" className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
        <div>
          <div className="font-bold text-sm flex items-center gap-2">
            {post.authorName}
            {post.isBot && <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded-full">BOT</span>}
          </div>
          <p className="text-xs text-slate-400">
            {post.createdAt && !isNaN(new Date(post.createdAt).getTime()) 
              ? format(new Date(post.createdAt), 'dd MMM yyyy, HH:mm', { locale: id }) 
              : 'Baru saja'}
          </p>
        </div>
      </div>
      
      <p className="whitespace-pre-wrap mb-4 text-slate-200">{post.content}</p>
      
      {post.mediaUrl && post.mediaType === 'image' && (
        <div 
          className="mb-4 rounded-xl overflow-hidden bg-black/20 relative group"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedImage(post.mediaUrl);
          }}
        >
          <img src={post.mediaUrl} alt="Post media" className="w-full h-auto max-h-96 object-contain" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="text-white" size={32} />
          </div>
        </div>
      )}

      {post.mediaUrl && post.mediaType === 'video' && (
        <div className="mb-4 rounded-xl overflow-hidden bg-black/20" onClick={(e) => e.stopPropagation()}>
          <video src={post.mediaUrl} controls className="w-full h-auto max-h-96" />
        </div>
      )}
      
      {post.mediaUrl && post.mediaType === 'link' && (
        <a 
          href={post.mediaUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="block mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 hover:underline break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {post.mediaUrl}
        </a>
      )}

      <div className="flex gap-4 pt-3 border-t border-white/10 text-slate-400 mb-4">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleLike(post);
          }}
          className={`flex items-center gap-1 hover:text-red-400 transition-colors ${hasLiked ? 'text-red-400' : ''}`}
        >
          <Heart size={18} className={hasLiked ? 'fill-red-400 text-red-400' : ''} />
          <span className="text-sm">{likesDisplay.toLocaleString()}</span>
        </button>
        <div className="flex items-center gap-1">
          <Eye size={18} />
          <span className="text-sm">{viewersDisplay.toLocaleString()}</span>
        </div>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (isDetail) return;
            setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }));
          }}
          className="flex items-center gap-1 hover:text-blue-400 transition-colors"
        >
          <MessageCircle size={18} />
          <span className="text-sm">{comments[post.id]?.length || 0} Komentar</span>
        </button>
      </div>

      {/* Comments Section */}
      {(expandedComments[post.id] || isDetail) && (
        <div className="space-y-3 pt-3 border-t border-white/5">
          {comments[post.id]?.map(comment => (
            <div key={comment.id} className="flex gap-2">
              <img src={comment.authorPhoto || 'https://via.placeholder.com/30'} alt="Author" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
              <div className="bg-white/5 rounded-2xl rounded-tl-none p-3 flex-1">
                <div className="font-bold text-xs flex items-center gap-2 mb-1">
                  {comment.authorName}
                  {comment.isBot && <span className="bg-blue-500/20 text-blue-400 text-[8px] px-1.5 py-0.5 rounded-full">BOT</span>}
                </div>
                <p className="text-sm text-slate-300">{comment.content}</p>
              </div>
            </div>
          ))}

          <form 
            onSubmit={(e) => handleComment(e, post.id)} 
            className="flex gap-2 mt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={user?.photoURL || 'https://via.placeholder.com/30'} alt="You" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
            <div className="flex-1 relative">
              <input
                type="text"
                value={newComment[post.id] || ''}
                onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                placeholder="Tulis komentar..."
                className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-blue-500"
              />
              <button 
                type="submit"
                disabled={!newComment[post.id]}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 disabled:opacity-50"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )};

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setVideoStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraOpen(true);
    } catch (err) {
      toast.error('Gagal mengakses kamera. Pastikan izin diberikan.');
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    setIsCameraOpen(false);
    setIsRecording(false);
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      if (!video.videoWidth || !video.videoHeight) {
        toast.error('Kamera belum siap sepenuhnya, tunggu sebentar.');
        return;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      // Resize for Firestore
      const resizedCanvas = document.createElement('canvas');
      const MAX_WIDTH = 600;
      const MAX_HEIGHT = 600;
      let width = canvas.width;
      let height = canvas.height;
      
      if (width > height) {
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
      } else {
        if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
      }
      
      resizedCanvas.width = width;
      resizedCanvas.height = height;
      resizedCanvas.getContext('2d')?.drawImage(canvas, 0, 0, width, height);

      const dataUrl = resizedCanvas.toDataURL('image/jpeg', 0.7);
      setMediaUrl(dataUrl);
      setMediaType('image');
      stopCamera();
      toast.success('Foto berhasil ditangkap!');
    } catch (err) {
      console.error('Error taking photo:', err);
      toast.error('Gagal mengambil foto.');
    }
  };

  const startRecording = () => {
    if (!videoStream) return;
    recordedChunksRef.current = [];
    const mediaRecorder = new MediaRecorder(videoStream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      // For Firestore, we need a Data URL, but videos are large.
      // We'll limit the recording time or warn the user.
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        if (dataUrl.length > 1000000) {
          toast.error('Video terlalu besar untuk disimpan (Maks 1MB). Coba rekam lebih singkat.');
        } else {
          setMediaUrl(dataUrl);
          setMediaType('video');
        }
      };
      reader.readAsDataURL(blob);
      stopCamera();
    };

    mediaRecorder.start();
    setIsRecording(true);
    toast('Merekam video...', { icon: '🔴' });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      if (auth.currentUser && username !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName: username });
      }
      await updateDoc(doc(db, 'users', user.uid), {
        bio, school, work, birthday, coverURL, danaKagetLink, photoURL
      });
      setIsEditing(false);
      toast.success('Profil diperbarui!');
    } catch (error: any) {
      toast.error('Gagal memperbarui profil: ' + error.message);
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

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content || !user) return;

    setIsSubmitting(true);
    try {
      // Likes logic removed
      const likesCount = 0;
      const viewersCount = 0;

      const newPostRef = await addDoc(collection(db, 'social_posts'), {
        userId: user.uid,
        authorName: user.displayName || 'User',
        authorPhoto: user.photoURL || '',
        content,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        likedBy: [],
        likesCount: 0,
        viewersCount: 0,
        createdAt: new Date().toISOString(),
        isBot: false
      });
      
      toast.success('Status dibagikan!');
      setContent('');
      setMediaUrl('');
      setMediaType('');

      // Bot interaction removed
    } catch (error: any) {
      console.error("Error creating post:", error);
      toast.error('Gagal membagikan status: ' + (error.message || 'Ukuran file mungkin terlalu besar atau masalah izin.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBirthdayToday = () => {
    if (!profile?.birthday) return false;
    const today = new Date();
    const bday = new Date(profile.birthday);
    return today.getDate() === bday.getDate() && today.getMonth() === bday.getMonth();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 w-full"
    >
      {/* Profile Header */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 sm:rounded-3xl p-4 md:p-8">
        
        {isBirthdayToday() && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-yellow-600/40 to-fuchsia-600/40 border border-yellow-500/30 text-center animate-pulse">
            <h2 className="text-xl font-bold text-yellow-400 mb-2">🎉 Selamat Ulang Tahun! 🎉</h2>
            {profile?.danaKagetLink && (
              <a 
                href={profile.danaKagetLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 text-sm rounded-full font-bold transition-colors"
              >
                <Gift size={16} /> Ambil Hadiah Dana Kaget!
              </a>
            )}
          </div>
        )}

        <div className="flex items-center gap-4 md:gap-8 mb-6">
          <div className="flex-shrink-0">
            <div className="w-20 h-20 md:w-32 md:h-32 rounded-full p-1 bg-gradient-to-tr from-yellow-400 to-fuchsia-600">
              <img 
                src={profile?.photoURL || user?.photoURL || 'https://via.placeholder.com/150'} 
                alt="Profile" 
                className="w-full h-full rounded-full border-4 border-black object-cover bg-slate-800"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6 mb-4">
              <h2 className="text-xl md:text-2xl font-semibold">{user?.displayName}</h2>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors w-fit"
              >
                Edit Profil
              </button>
            </div>
            <div className="hidden md:flex gap-6 text-sm">
              <div><span className="font-bold">{posts.length}</span> kiriman</div>
              <div><span className="font-bold">0</span> pengikut</div>
              <div><span className="font-bold">0</span> diikuti</div>
            </div>
          </div>
        </div>

        <div className="text-sm">
          <div className="font-bold mb-1">{user?.displayName}</div>
          {profile?.bio && <p className="text-slate-200 whitespace-pre-wrap">{profile.bio}</p>}
          <div className="flex flex-col gap-1 mt-2 text-slate-400">
            {profile?.school && <span className="flex items-center gap-2"><GraduationCap size={14} className="text-blue-400" /> {profile.school}</span>}
            {profile?.work && <span className="flex items-center gap-2"><Briefcase size={14} className="text-emerald-400" /> {profile.work}</span>}
            {profile?.birthday && !isNaN(new Date(profile.birthday).getTime()) && (
              <span className="flex items-center gap-2">
                <Cake size={14} className="text-pink-400" /> 
                {format(new Date(profile.birthday), 'dd MMMM yyyy', { locale: id })}
              </span>
            )}
          </div>
        </div>

        <div className="flex md:hidden justify-around border-t border-white/10 mt-6 pt-4 text-sm text-center">
          <div><div className="font-bold">{posts.length}</div><div className="text-slate-400">kiriman</div></div>
          <div><div className="font-bold">0</div><div className="text-slate-400">pengikut</div></div>
          <div><div className="font-bold">0</div><div className="text-slate-400">diikuti</div></div>
        </div>
        
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="space-y-4 bg-black/30 p-4 rounded-xl mt-6 border border-white/5">
            <h3 className="font-bold mb-2">Edit Profil</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nama Pengguna (Username)</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Bio</label>
                <input type="text" value={bio} onChange={e => setBio(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Sekolah/Kampus</label>
                <input type="text" value={school} onChange={e => setSchool(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Pekerjaan</label>
                <input type="text" value={work} onChange={e => setWork(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tanggal Lahir</label>
                <input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">URL Foto Profil</label>
                <input type="url" value={photoURL} onChange={e => setPhotoURL(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm" placeholder="https://..." />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Link Dana Kaget (Hadiah Ultah)</label>
                <input type="url" value={danaKagetLink} onChange={e => setDanaKagetLink(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white text-sm" placeholder="https://link.dana.id/kaget?..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-lg bg-white/10 text-sm font-semibold">Batal</button>
              <button type="submit" className="px-4 py-2 rounded-lg bg-blue-500 text-sm font-semibold text-white">Simpan Profil</button>
            </div>
          </form>
        )}
      </div>

      {/* Create Post */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-3xl">
        <form onSubmit={handlePost}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Apa yang sedang kamu pikirkan?"
            className="w-full bg-transparent border-none focus:ring-0 text-white resize-none min-h-[80px] p-2"
            required
          />
          
          {mediaType && (
            <div className="mb-3 p-3 bg-black/20 rounded-xl flex gap-2 items-center">
              {mediaUrl.startsWith('data:image') ? (
                <div className="flex-1 text-sm text-emerald-400 truncate px-2">Gambar berhasil diunggah</div>
              ) : mediaUrl.startsWith('data:video') ? (
                <div className="flex-1 text-sm text-blue-400 truncate px-2">Video berhasil direkam</div>
              ) : (
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder={`Masukkan URL ${mediaType === 'image' ? 'Foto' : mediaType === 'video' ? 'Video' : 'Link'}`}
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white"
                  required
                />
              )}
              <button type="button" onClick={() => {setMediaType(''); setMediaUrl('');}} className="text-red-400 text-sm">Batal</button>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-white/10">
            <div className="flex gap-2">
              <button type="button" onClick={() => setMediaType('image')} className={`p-2 rounded-lg transition-colors ${mediaType === 'image' && !mediaUrl.startsWith('data:image') ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/10 text-slate-400'}`} title="URL Gambar">
                <ImageIcon size={20} />
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className={`p-2 rounded-lg transition-colors ${mediaUrl.startsWith('data:image') ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/10 text-slate-400'}`} title="Upload Gambar (JPG/PNG)">
                <Upload size={20} />
              </button>
              <input type="file" accept="image/png, image/jpeg, image/jpg" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
              
              <button type="button" onClick={startCamera} className="p-2 rounded-lg hover:bg-white/10 text-slate-400 transition-colors" title="Buka Kamera">
                <Camera size={20} />
              </button>

              <button type="button" onClick={() => setMediaType('video')} className={`p-2 rounded-lg transition-colors ${mediaType === 'video' && !mediaUrl.startsWith('data:video') ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/10 text-slate-400'}`} title="URL Video">
                <Video size={20} />
              </button>
              <button type="button" onClick={() => setMediaType('link')} className={`p-2 rounded-lg transition-colors ${mediaType === 'link' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/10 text-slate-400'}`} title="Tautan">
                <LinkIcon size={20} />
              </button>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !content}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Mengunggah...' : 'Posting'}
            </button>
          </div>
        </form>
      </div>

      {/* Camera Modal */}
      <AnimatePresence>
        {isCameraOpen && (
          <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4">
            <div className="relative w-full max-w-2xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-auto bg-black"
              />
              
              <div className="absolute top-4 right-4">
                <button onClick={stopCamera} className="bg-black/50 p-2 rounded-full text-white hover:bg-black/70">
                  <X size={24} />
                </button>
              </div>

              <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6">
                <button 
                  onClick={takePhoto}
                  disabled={isRecording}
                  className="bg-white text-black p-4 rounded-full hover:bg-slate-200 transition-colors disabled:opacity-50"
                  title="Ambil Foto"
                >
                  <Camera size={28} />
                </button>
                
                <button 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`${isRecording ? 'bg-red-500 animate-pulse' : 'bg-white'} text-black p-4 rounded-full hover:bg-slate-200 transition-colors`}
                  title={isRecording ? "Berhenti Rekam" : "Mulai Rekam Video"}
                >
                  {isRecording ? <StopCircle size={28} /> : <Circle size={28} className="text-red-500 fill-red-500" />}
                </button>
              </div>
            </div>
            <p className="text-slate-400 mt-4 text-sm">Pilih Ambil Foto atau Rekam Video</p>
          </div>
        )}
      </AnimatePresence>

      {/* Posts Grid */}
      <div className="border-t border-white/10 pt-4">
        <h3 className="text-center text-sm font-bold tracking-widest text-slate-400 mb-4 uppercase">Kiriman</h3>
        <div className="grid grid-cols-3 gap-1 md:gap-2">
          {posts.map(post => (
            <div 
              key={post.id}
              className="aspect-square bg-zinc-900 cursor-pointer overflow-hidden border border-white/5 relative group"
              onClick={() => setViewPostId(post.id)}
            >
              {post.mediaUrl && (post.mediaType === 'image' || post.mediaType === 'video') ? (
                post.mediaType === 'image' ? (
                  <img src={post.mediaUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                ) : (
                  <video src={post.mediaUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                )
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-2 md:p-4 text-center bg-zinc-800 text-slate-300">
                  <span className="text-[10px] md:text-sm font-medium line-clamp-4 leading-snug">{post.content}</span>
                </div>
              )}
              {/* Overlay with stats on hover */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white">
                <div className="flex items-center gap-1 font-bold text-sm">
                  <Heart size={16} className="fill-white" /> <span>{post.likedBy?.length || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {posts.length === 0 && (
          <p className="text-center text-slate-400 py-12">Belum ada kiriman.</p>
        )}
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setSelectedImage(null)}
          >
            <button className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors">
              <X size={32} />
            </button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage}
              alt="Full size"
              className="max-w-full max-h-full object-contain rounded-lg"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
