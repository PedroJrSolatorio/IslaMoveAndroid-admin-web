import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';

// Import Firebase config
import { auth, db } from './config/firebase'; 

// Import Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Import Screens (Pages)
import LoginScreen from './pages/LoginScreen';
import HomeScreen from './pages/HomeScreen';
import VerificationScreen from './pages/VerificationScreen';
import ManageUsersScreen from './pages/ManageUsersScreen';
import LiveMonitoringScreen from './pages/LiveMonitoringScreen';
import SystemConfigScreen from './pages/SystemConfigScreen';
import AnalyticsScreen from './pages/AnalyticsScreen';

// ==================== MAIN APP ====================
export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch user document to check userType
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().userType === 'ADMIN') {
          setCurrentUser(user);
          setIsAdmin(true);
        } else {
          // Log out non-admin users immediately
          setIsAdmin(false);
          await signOut(auth);
        }
      } else {
        setCurrentUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || !isAdmin) {
    return (
      <div className="h-screen w-screen">
        <LoginScreen />
      </div>
    );
  }

  // Helper function to render the current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <HomeScreen />;
      case 'verification':
        return <VerificationScreen />;
      case 'users':
        return <ManageUsersScreen />;
      case 'monitoring':
        return <LiveMonitoringScreen />;
      case 'config':
        return <SystemConfigScreen />;
      case 'analytics':
        return <AnalyticsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-gray-50 overflow-hidden">
      <Sidebar currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} isOpen={isSidebarOpen} />
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <Header currentUser={currentUser} toggleSidebar={() => setIsSidebarOpen(prev => !prev)} isSidebarOpen={isSidebarOpen} />
        <div className="flex-1 overflow-auto p-6">
          {renderScreen()}
        </div>
      </div>
    </div>
  );
}