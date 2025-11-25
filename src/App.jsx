import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";

// Import Firebase config
import { auth, db } from "./config/firebase";

// Import Components
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";

// Import Screens (Pages)
import LoginScreen from "./pages/LoginScreen";
import HomeScreen from "./pages/HomeScreen";
import VerificationScreen from "./pages/VerificationScreen";
import DriverDetailsScreen from "./pages/DriverDetailsScreen";
import DocumentDetailsScreen from "./pages/DocumentDetailsScreen";
import ManageUsersScreen from "./pages/ManageUsersScreen";
import LiveMonitoringScreen from "./pages/LiveMonitoringScreen";
import SystemConfigScreen from "./pages/SystemConfigScreen";
import AnalyticsScreen from "./pages/AnalyticsScreen";
import UserDetailScreen from "./pages/UserDetailScreen";
import DocumentDetailsScreen2 from "./pages/DocumentDetailsScreen2";
import TripHistoryScreen from "./pages/TripHistoryScreen";

// ==================== MAIN APP ====================
export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState("home");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Navigation state for detail screens
  const [navigationState, setNavigationState] = useState({
    userId: null,
    documentType: null,
    documentTitle: null,
    userType: null,
    isStudentVerification: false,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch user document to check userType
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().userType === "ADMIN") {
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

  // Navigation handlers
  const handleNavigateToDetails = (userId, userType) => {
    setNavigationState({
      userId,
      userType,
      isStudentVerification: userType === "passenger",
      documentType: null,
      documentTitle: null,
    });
    setCurrentScreen("details");
  };

  const handleNavigateToDocument = (
    userId,
    documentType,
    documentTitle,
    userType
  ) => {
    console.log("=== NAVIGATE TO DOCUMENT ===");
    console.log("userId:", userId);
    console.log("documentType:", documentType);
    console.log("documentTitle:", documentTitle);
    console.log("userType:", userType);

    setNavigationState({
      userId,
      documentType,
      documentTitle,
      userType,
      isStudentVerification: userType === "passenger",
    });
    setCurrentScreen("document");
  };

  const handleNavigateBack = () => {
    console.log("=== NAVIGATE BACK ===");
    console.log("Current screen:", currentScreen);
    console.log("Current navigationState:", navigationState);

    if (currentScreen === "document") {
      // From document back to details
      setCurrentScreen("details");
    } else if (currentScreen === "details") {
      // From details back to verification
      setCurrentScreen("verification");
      setNavigationState({
        userId: null,
        documentType: null,
        documentTitle: null,
        userType: null,
        isStudentVerification: false,
      });
    } else {
      // Default back behavior
      setCurrentScreen("home");
    }
  };

  // Helper function to render the current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case "home":
        return <HomeScreen onNavigate={setCurrentScreen} />;

      case "verification":
        return (
          <VerificationScreen onNavigateToDetails={handleNavigateToDetails} />
        );

      case "details":
        console.log("=== RENDERING DETAILS ===");
        console.log("navigationState:", navigationState);
        return (
          <DriverDetailsScreen
            driverId={navigationState.userId}
            isStudentVerification={navigationState.isStudentVerification}
            onNavigateBack={handleNavigateBack}
            onNavigateToDocument={handleNavigateToDocument}
          />
        );

      case "document":
        return (
          <DocumentDetailsScreen
            userId={navigationState.userId}
            documentType={navigationState.documentType}
            documentTitle={navigationState.documentTitle}
            userType={navigationState.userType}
            onNavigateBack={handleNavigateBack}
          />
        );

      case "users":
        return (
          <ManageUsersScreen
            onNavigateToUserDetail={(userId) => {
              setSelectedUserId(userId);
              setCurrentScreen("userDetail");
            }}
          />
        );

      case "userDetail":
        return (
          <UserDetailScreen
            userId={selectedUserId}
            onNavigateBack={() => setCurrentScreen("users")}
            onNavigateToTripHistory={(userId) => {
              setSelectedUserId(userId);
              setCurrentScreen("tripHistory");
            }}
            onNavigateToDocumentDetails={(userId, docType, docTitle) => {
              setNavigationState({
                userId,
                documentType: docType,
                documentTitle: docTitle,
                userType: null,
              });
              setCurrentScreen("documentDetails2");
            }}
          />
        );

      case "tripHistory":
        return (
          <TripHistoryScreen
            userId={selectedUserId}
            onNavigateBack={() => setCurrentScreen("userDetail")}
          />
        );

      case "documentDetails2":
        return (
          <DocumentDetailsScreen2
            userId={navigationState.userId}
            documentType={navigationState.documentType}
            documentTitle={navigationState.documentTitle}
            userType={navigationState.userType}
            onNavigateBack={() => setCurrentScreen("userDetail")}
          />
        );

      case "reports":
        return (
          <ManageUsersScreen
            onNavigateToUserDetail={(userId) => {
              setSelectedUserId(userId);
              setCurrentScreen("userDetail");
            }}
          />
        );

      case "monitoring":
        return <LiveMonitoringScreen />;

      case "config":
        return <SystemConfigScreen />;

      case "analytics":
        return <AnalyticsScreen />;

      default:
        return <HomeScreen />;
    }
  };

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

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen bg-gray-50 overflow-hidden">
      <Sidebar
        currentScreen={currentScreen}
        setCurrentScreen={(screen) => {
          setCurrentScreen(screen);
          // Reset navigation state when changing main screens
          if (screen !== "details" && screen !== "document") {
            setNavigationState({
              userId: null,
              documentType: null,
              documentTitle: null,
              userType: null,
              isStudentVerification: false,
            });
          }
        }}
        isOpen={isSidebarOpen}
      />
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
          isSidebarOpen ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        <Header
          currentUser={currentUser}
          toggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isSidebarOpen={isSidebarOpen}
        />
        <div className="flex-1 overflow-auto">{renderScreen()}</div>
      </div>
    </div>
  );
}
