import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, orderBy, limit, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Heart, MessageCircle, Send, Filter, X, Maximize2, Eye, Trash2 } from 'lucide-react';

export function SocialFeed() {
  const { user, setViewPostId } = useStore();
  const [posts, setPosts] = useState<any[]>([]);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const postsRef = useRef(posts);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    if (!user) return;

    // Fetch all posts and filter in memory to avoid index requirements
    const q = query(
      collection(db, 'social_posts'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    
    let commentUnsubs: (() => void)[] = [];

    const unsubPosts = onSnapshot(q, (snap) => {
      const postsData = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((post: any) => post.isBot === false);
      
      setPosts(postsData);
      
      // Cleanup previous comment listeners
      commentUnsubs.forEach(unsub => unsub());
      commentUnsubs = [];

      // Fetch comments for these posts
      postsData.forEach(post => {
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
    });

    return () => {
      unsubPosts();
      commentUnsubs.forEach(unsub => unsub());
    };
  }, [user]);

  // Bot simulation removed as requested
  useEffect(() => {
    // No-op
  }, []);

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
      className={`bg-[#0a0a0a] sm:bg-white/5 sm:backdrop-blur-md sm:border sm:border-white/10 sm:rounded-3xl mb-6 transition-all ${!isDetail ? 'cursor-pointer' : ''} group relative overflow-hidden`}
      onClick={() => !isDetail && setViewPostId(post.id)}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={post.authorPhoto || 'https://via.placeholder.com/40'} alt="Author" className="w-10 h-10 rounded-full object-cover border border-white/20" referrerPolicy="no-referrer" />
          <div>
            <div className="font-bold text-[15px] flex items-center gap-2 text-white">
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
        {user?.uid === post.userId && (
          <button 
            onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>
      
      {/* Media Content - Full width */}
      {post.mediaUrl && post.mediaType === 'image' && (
        <div 
          className="relative group bg-zinc-900 flex items-center justify-center w-full"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedImage(post.mediaUrl);
          }}
        >
          <img src={post.mediaUrl} alt="Post media" className="w-full max-h-[600px] object-cover" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="text-white" size={32} />
          </div>
        </div>
      )}
      
      {post.mediaUrl && post.mediaType === 'video' && (
        <div className="bg-zinc-900 w-full" onClick={(e) => e.stopPropagation()}>
          <video src={post.mediaUrl} controls className="w-full max-h-[600px] object-cover" />
        </div>
      )}
      
      {post.mediaUrl && post.mediaType === 'link' && (
        <div className="px-4 pb-2" onClick={(e) => e.stopPropagation()}>
          <a 
            href={post.mediaUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="block p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 hover:underline break-all"
          >
            {post.mediaUrl}
          </a>
        </div>
      )}

      {/* Action Icons */}
      <div className="p-4 pb-2 flex gap-4 text-slate-200">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            handleLike(post);
          }}
          className={`hover:text-red-500 hover:scale-110 active:scale-95 transition-all ${hasLiked ? 'text-red-500' : ''}`}
        >
          <Heart size={26} className={hasLiked ? 'fill-red-500 text-red-500' : ''} />
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            if (isDetail) return;
            setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }));
          }}
          className="hover:scale-110 active:scale-95 transition-all"
        >
          <MessageCircle size={26} className="transform scale-x-[-1]" />
        </button>
        <button className="hover:scale-110 active:scale-95 transition-all" onClick={(e) => e.stopPropagation()}>
          <Send size={26} className="-rotate-12" />
        </button>
        <div className="flex-1"></div>
        <div className="flex items-center gap-2 text-slate-400" title="Views">
          <Eye size={22} />
        </div>
      </div>

      {/* Likes Count & Viewers */}
      <div className="px-4 font-bold text-[14px] text-white flex gap-4 mb-1">
        <span>{likesDisplay.toLocaleString()} suka</span>
        <span className="text-slate-400 font-normal">{viewersDisplay.toLocaleString()} tayangan</span>
      </div>

      {/* Caption */}
      <div className="px-4 text-[14px] text-slate-100 whitespace-pre-wrap leading-relaxed">
        <span className="font-bold mr-2 text-white">{post.authorName}</span>
        {post.content}
      </div>

      {/* Comments Section */}
      <div className="px-4 py-2">
        {(!expandedComments[post.id] && !isDetail && comments[post.id]?.length > 0) && (
          <button 
            className="text-slate-400 text-[14px] hover:text-slate-300"
            onClick={(e) => {
              e.stopPropagation();
              setExpandedComments(prev => ({ ...prev, [post.id]: true }));
            }}
          >
            Lihat semua {comments[post.id]?.length} komentar
          </button>
        )}
        
        {(expandedComments[post.id] || isDetail) && (
          <div className="space-y-1 mt-2 mb-2">
            {comments[post.id]?.map(comment => (
              <div key={comment.id} className="text-[14px] flex items-start gap-2">
                <span className="font-bold text-white whitespace-nowrap">
                  {comment.authorName}
                  {comment.isBot && <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded-full ml-1 font-normal">BOT</span>}
                </span>
                <span className="text-slate-200">{comment.content}</span>
              </div>
            ))}
          </div>
        )}

        {/* Comment Input */}
        <form 
          onSubmit={(e) => handleComment(e, post.id)} 
          className="flex gap-3 items-center mt-3 border-t border-white/10 pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <img src={user?.photoURL || 'https://via.placeholder.com/30'} alt="You" className="w-7 h-7 rounded-full object-cover border border-white/20" referrerPolicy="no-referrer" />
          <input
            type="text"
            value={newComment[post.id] || ''}
            onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
            placeholder="Tambahkan komentar..."
            className="flex-1 bg-transparent border-none text-[14px] text-white focus:outline-none focus:ring-0 p-0 placeholder-slate-500"
          />
          {newComment[post.id] && (
            <button 
              type="submit"
              className="text-blue-500 font-bold text-[14px] disabled:opacity-50"
            >
              Kirim
            </button>
          )}
        </form>
      </div>
    </div>
  )};

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-[470px] mx-auto pb-10"
    >
      <div className="mb-6 px-4 mt-2 sm:px-0 flex justify-between items-center">
        <h2 className="text-2xl font-bold font-['Instagram_Sans'] tracking-tight">Beranda</h2>
      </div>

      <div className="space-y-0 sm:space-y-6">
        {posts.map(post => renderPost(post))}
        {posts.length === 0 && (
          <p className="text-center text-slate-400 py-8">
            Belum ada postingan di beranda.
          </p>
        )}
      </div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-10"
            onClick={() => setSelectedImage(null)}
          >
            <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
              <X size={32} />
            </button>
            <motion.img 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              src={selectedImage} 
              alt="Full size" 
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
