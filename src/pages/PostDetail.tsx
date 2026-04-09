import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot, collection, query, where, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Heart, ArrowLeft, Send, Expand, Maximize2, X, Eye, Trash2 } from 'lucide-react';

export function PostDetail({ postId }: { postId: string }) {
  const { user, setViewPostId } = useStore();
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;

    // Listen to the specific post
    const unsubPost = onSnapshot(doc(db, 'social_posts', postId), (docSnap) => {
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() });
      } else {
        setPost(null);
        toast.error('Postingan tidak ditemukan atau telah dihapus.');
        setViewPostId(null);
      }
    });

    // Listen to comments for this post
    const qComments = query(
      collection(db, 'social_comments'),
      where('postId', '==', postId)
    );
    const unsubComments = onSnapshot(qComments, (snap) => {
      const fetchedComments = snap.docs.map(c => ({ id: c.id, ...c.data() }));
      fetchedComments.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      setComments(fetchedComments);
    });

    return () => {
      unsubPost();
      unsubComments();
    };
  }, [postId, setViewPostId]);

  const handleLike = async () => {
    if (!post || !user) return;
    try {
      const likedBy = post.likedBy || [];
      let newLikedBy = [...likedBy];
      
      if (newLikedBy.includes(user.uid)) {
        // Unlike
        newLikedBy = newLikedBy.filter(uid => uid !== user.uid);
      } else {
        // Like
        newLikedBy.push(user.uid);
      }
      
      await updateDoc(doc(db, 'social_posts', postId), {
        likedBy: newLikedBy,
        likesCount: newLikedBy.length
      });
    } catch (error: any) {
      console.error("Gagal like", error);
      toast.error('Gagal menyukai: ' + (error.message || 'Error tidak diketahui'));
    }
  };

  const handleDeletePost = async () => {
    if (!confirm('Hapus postingan ini?')) return;
    try {
      await deleteDoc(doc(db, 'social_posts', postId));
      toast.success('Postingan dihapus');
      setViewPostId(null);
    } catch (error: any) {
      console.error("Gagal hapus:", error);
      toast.error('Gagal menghapus postingan: ' + (error.message || 'Error tidak diketahui'));
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !post) return;

    try {
      await addDoc(collection(db, 'social_comments'), {
        postId,
        userId: user.uid,
        authorName: user.displayName || 'User',
        authorPhoto: user.photoURL || '',
        content: newComment,
        createdAt: new Date().toISOString(),
        isBot: false
      });
      
      setNewComment('');
    } catch (error) {
      toast.error('Gagal mengirim komentar.');
    }
  };

  if (!post) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasLiked = post.likedBy?.includes(user?.uid);
  const likesDisplay = post.likedBy ? post.likedBy.length : (post.likesCount || 0);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-3xl mx-auto pb-10"
    >
      <button 
        onClick={() => setViewPostId(null)}
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 p-2 rounded-xl transition-colors bg-white/5 hover:bg-white/10 w-fit"
      >
        <ArrowLeft size={20} />
        Kembali
      </button>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 md:p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
        {/* Post Meta */}
        <div className="flex items-center gap-4 mb-6">
          <img src={post.authorPhoto || 'https://via.placeholder.com/60'} alt="Author" className="w-14 h-14 rounded-full object-cover border-2 border-white/10" referrerPolicy="no-referrer" />
          <div>
            <div className="text-xl font-bold flex items-center gap-2">
              {post.authorName}
              {post.isBot && <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full">BOT</span>}
            </div>
            <p className="text-sm text-slate-400 mt-1">
              {post.createdAt && !isNaN(new Date(post.createdAt).getTime()) 
                ? format(new Date(post.createdAt), 'dd MMMM yyyy, HH:mm', { locale: id }) 
                : 'Baru saja'}
            </p>
          </div>
          {user?.uid === post.userId && (
            <button 
              onClick={handleDeletePost}
              className="ml-auto p-3 bg-red-500/20 text-red-500 rounded-2xl hover:bg-red-500/30 transition-colors"
              title="Hapus Postingan"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>
        
        {/* Post Content */}
        <p className="whitespace-pre-wrap mb-6 text-lg text-slate-200 leading-relaxed font-light">
          {post.content}
        </p>
        
        {/* Post Media */}
        {post.mediaUrl && post.mediaType === 'image' && (
          <div 
            className="mb-8 rounded-2xl overflow-hidden bg-black/40 relative group cursor-zoom-in"
            onClick={() => setSelectedImage(post.mediaUrl)}
          >
            <img src={post.mediaUrl} alt="Post media" className="w-full h-auto max-h-[600px] object-contain transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Maximize2 className="text-white drop-shadow-xl" size={48} />
            </div>
          </div>
        )}
        
        {post.mediaUrl && post.mediaType === 'video' && (
          <div className="mb-8 rounded-2xl overflow-hidden bg-black/40 shadow-xl">
            <video src={post.mediaUrl} controls className="w-full h-auto max-h-[600px] rounded-2xl" />
          </div>
        )}
        
        {post.mediaUrl && post.mediaType === 'link' && (
          <a 
            href={post.mediaUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-3 mb-8 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400 hover:bg-blue-500/20 transition-colors group break-all"
          >
            <div className="p-3 bg-blue-500/20 rounded-xl group-hover:bg-blue-500/30 transition-colors">
              <ArrowLeft size={24} className="rotate-[135deg]" />
            </div>
            <span className="text-lg font-medium underline-offset-4 group-hover:underline">{post.mediaUrl}</span>
          </a>
        )}

        {/* Post Actions */}
        <div className="flex gap-6 py-4 border-y border-white/10 text-slate-300">
          <button 
            onClick={handleLike}
            className={`flex items-center gap-2 hover:text-red-400 transition-colors ${hasLiked ? 'text-red-400' : ''}`}
          >
            <Heart size={24} className={hasLiked ? 'fill-red-400 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]' : ''} />
            <span className="font-bold text-lg">{likesDisplay.toLocaleString()}</span>
          </button>
          <div className="flex items-center gap-2 text-slate-400">
            <Eye size={24} />
            <span className="font-bold text-lg">{(post.viewersCount || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-8 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">Komentar <span className="text-slate-400 font-normal text-base">({comments.length})</span></h3>
          
          <form 
            onSubmit={handleComment} 
            className="flex gap-4 mb-8"
          >
            <img src={user?.photoURL || 'https://via.placeholder.com/40'} alt="You" className="w-12 h-12 rounded-full border border-white/10" referrerPolicy="no-referrer" />
            <div className="flex-1 relative">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Tulis pendapatmu..."
                className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-5 pr-14 text-white focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
              />
              <button 
                type="submit"
                disabled={!newComment.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-xl text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 disabled:opacity-50 transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </form>

          <div className="space-y-5">
            {comments.map(comment => (
              <div key={comment.id} className="flex gap-4 group">
                <img src={comment.authorPhoto || 'https://via.placeholder.com/40'} alt="Author" className="w-10 h-10 rounded-full mt-1 border border-white/5" referrerPolicy="no-referrer" />
                <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none px-5 py-4 flex-1 hover:bg-white/10 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold flex items-center gap-2">
                      {comment.authorName}
                      {comment.isBot && <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded-full">BOT</span>}
                    </div>
                    <span className="text-xs text-slate-500">
                      {format(new Date(comment.createdAt), 'dd MMM, HH:mm', { locale: id })}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed font-light">{comment.content}</p>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="text-center text-slate-500 py-4 italic">Belum ada komentar, jadilah yang pertama!</p>
            )}
          </div>
        </div>
      </div>

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
            <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors bg-white/10 p-2 rounded-xl">
              <X size={32} />
            </button>
            <motion.img 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={selectedImage} 
              alt="Full size" 
              className="max-w-full max-h-full object-contain rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)]"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
