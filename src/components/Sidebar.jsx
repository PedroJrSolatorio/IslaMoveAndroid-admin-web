import React from "react";
import { signOut } from "firebase/auth";
import {
  BarChart3,
  CheckCircle,
  Users,
  MapPin,
  Settings,
  TrendingUp,
  LogOut,
  RefreshCcw,
  X,
} from "lucide-react";
import { auth } from "../config/firebase";

export default function Sidebar({
  currentScreen,
  setCurrentScreen,
  isOpen,
  onClose,
}) {
  const menuItems = [
    { id: "home", label: "Dashboard", icon: BarChart3 },
    { id: "verification", label: "User Verification", icon: CheckCircle },
    { id: "renewal", label: "Document Renewal", icon: RefreshCcw },
    { id: "users", label: "Manage Users", icon: Users },
    { id: "monitoring", label: "Live Monitoring", icon: MapPin },
    { id: "config", label: "System Config", icon: Settings },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
  ];

  const handleNavigation = (screenId) => {
    setCurrentScreen(screenId);
    // Auto-close on mobile after selection
    if (onClose) {
      onClose();
    }
  };

  // Desktop: Expandable sidebar (w-64 or w-20)
  // Mobile: Overlay drawer (full slide in/out)
  const sidebarWidthClass = isOpen ? "w-64" : "w-20";

  return (
    <>
      {/* Mobile Overlay - Only shows on mobile when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 bg-white shadow-lg flex flex-col transition-all duration-300 z-40
          
          ${/* Mobile: slide in/out from left */ ""}
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          w-64
          
          ${/* Desktop: always visible, expandable width */ ""}
          lg:translate-x-0
          ${isOpen ? "lg:w-64" : "lg:w-20"}
        `}
      >
        {/* Sidebar Header/Logo Area */}
        <div className="p-4 lg:p-6 border-b flex items-center justify-between lg:justify-center h-16 lg:h-20 overflow-hidden">
          <div className="flex items-center space-x-3">
            {/* Logo */}
            {!isOpen ? (
              <img
                src="../src/assets/ic_launcher.png"
                alt="Islamove Logo"
                className="w-8 h-8 object-contain hidden lg:block"
              />
            ) : (
              <>
                <img
                  src="../src/assets/ic_launcher.png"
                  alt="Islamove Logo"
                  className="w-8 h-8 object-contain"
                />
                <h2 className="text-lg lg:text-xl font-bold text-gray-900 whitespace-nowrap">
                  Islamove Admin
                </h2>
              </>
            )}
          </div>

          {/* Close button - Mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentScreen === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`
                  w-full flex items-center rounded-lg transition-colors
                  ${/* Mobile: always show labels */ ""}
                  space-x-3 justify-start px-3 py-3
                  
                  ${/* Desktop: conditional layout */ ""}
                  lg:${
                    isOpen
                      ? "space-x-3 justify-start px-4"
                      : "justify-center px-4"
                  }
                  
                  ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-50"
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {/* Label: Always visible on mobile, conditional on desktop */}
                <span
                  className={`font-medium whitespace-nowrap lg:${
                    isOpen ? "block" : "hidden"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Sign Out Button */}
        <div className="p-3 lg:p-4 border-t">
          <button
            onClick={() => signOut(auth)}
            className={`
              w-full flex items-center rounded-lg transition-colors
              text-red-600 hover:bg-red-50
              ${/* Mobile: always show label */ ""}
              space-x-3 justify-start px-3 py-3
              
              ${/* Desktop: conditional layout */ ""}
              lg:${
                isOpen ? "space-x-3 justify-start px-4" : "justify-center px-4"
              }
            `}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {/* Conditional visibility for the label */}
            <span
              className={`font-medium whitespace-nowrap lg:${
                isOpen ? "block" : "hidden"
              }`}
            >
              Sign Out
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
