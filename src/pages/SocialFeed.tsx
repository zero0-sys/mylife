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
    } catch (error) {
      toast.error('Gagal mengirim komentar.');
    }
  };

  const renderPost = (post: any, isDetail = false) => {
    const hasLiked = post.likedBy?.includes(user?.uid);
    const likesDisplay = post.likedBy ? post.likedBy.length : (post.likesCount || 0);

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
          <span className="text-sm">{(post.viewersCount || 0).toLocaleString()}</span>
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-2xl mx-auto"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Beranda</h2>
        <p className="text-slate-400">Jelajahi postingan terbaru.</p>
      </div>

      <div className="space-y-6">
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
