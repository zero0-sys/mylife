import React, { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Toaster } from 'react-hot-toast';
import { auth, db, getRedirectResult } from './firebase';
import { useStore } from './store/useStore';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';

// Pages
import { Dashboard } from './pages/Dashboard';
import { Finance } from './pages/Finance';
import { StudyTimer } from './pages/StudyTimer';
import { PrivateNotes } from './pages/PrivateNotes';
import { Quotes } from './pages/Quotes';
import { Character } from './pages/Character';
import { Days360 } from './pages/Days360';
import { SocialProfile } from './pages/SocialProfile';
import { SocialFeed } from './pages/SocialFeed';
import { Chat } from './pages/Chat';
import { SherlyAI } from './pages/SherlyAI';

export default function App() {
  const { user, setUser, isAuthReady, setAuthReady, activeTab } = useStore();

  useEffect(() => {
    // Handle redirect result from Google sign-in (completes the redirect flow)
    getRedirectResult(auth).catch((error) => {
      console.error("Redirect sign-in error:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Ensure user document exists
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          const userData: any = {
            uid: currentUser.uid,
            email: currentUser.email,
            createdAt: new Date().toISOString(),
          };
          if (currentUser.displayName) userData.displayName = currentUser.displayName;
          if (currentUser.photoURL) userData.photoURL = currentUser.photoURL;
          
          await setDoc(userRef, userData);
        }
      }
      
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [setUser, setAuthReady]);

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <div className="absolute inset-0 border-2 border-white/10 rounded-full"></div>
          <div className="absolute inset-0 border-2 border-white border-t-transparent border-l-transparent rounded-full animate-[spin_1.5s_linear_infinite]"></div>
          <div className="absolute inset-4 border-2 border-white/30 border-b-transparent border-r-transparent rounded-full animate-[spin_2s_linear_infinite_reverse]"></div>
          <div className="absolute inset-8 border-2 border-white border-t-transparent rounded-full animate-[spin_3s_linear_infinite]"></div>
          <div className="w-4 h-4 bg-white rounded-full animate-pulse shadow-[0_0_15px_rgba(255,255,255,0.8)]"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'finance': return <Finance />;
      case 'study': return <StudyTimer />;
      case 'notes': return <PrivateNotes />;
      case 'quotes': return <Quotes />;
      case 'character': return <Character />;
      case 'days360': return <Days360 />;
      case 'social_profile': return <SocialProfile />;
      case 'social_feed': return <SocialFeed />;
      case 'chat': return <Chat />;
      case 'sherly_ai': return <SherlyAI />;
      default: return <Dashboard />;
    }
  };

  return (
    <>
      <Toaster position="top-center" toastOptions={{
        style: {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          color: '#fff',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }
      }} />
      <Layout>
        {renderContent()}
      </Layout>
    </>
  );
}
