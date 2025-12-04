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
} from "lucide-react";
import { auth } from "../config/firebase";

export default function Sidebar({ currentScreen, setCurrentScreen, isOpen }) {
  const menuItems = [
    { id: "home", label: "Dashboard", icon: BarChart3 },
    { id: "verification", label: "User Verification", icon: CheckCircle },
    { id: "renewal", label: "Document Renewal", icon: RefreshCcw },
    { id: "users", label: "Manage Users", icon: Users },
    { id: "monitoring", label: "Live Monitoring", icon: MapPin },
    { id: "config", label: "System Config", icon: Settings },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
  ];

  const sidebarWidthClass = isOpen ? "w-64" : "w-20";
  const labelVisibilityClass = isOpen ? "opacity-100" : "opacity-0 absolute";

  return (
    // Apply conditional width and transition
    <div
      className={`fixed inset-y-0 left-0 bg-white shadow-lg flex flex-col transition-all duration-300 z-20 ${sidebarWidthClass}`}
    >
      {/* Sidebar Header/Logo Area */}
      <div className="p-6 border-b flex items-center justify-center h-20 overflow-hidden">
        <h2
          className={`text-xl font-bold text-gray-900 whitespace-nowrap transition-opacity duration-300 ${labelVisibilityClass}`}
        >
          Islamove Admin
        </h2>
        {!isOpen && (
          // Small version of the logo/icon when collapsed
          <img
            src="../src/assets/ic_launcher.png"
            alt="Islamove Logo"
            className="w-8 h-8 object-contain"
          />
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentScreen(item.id)}
              className={`w-full flex items-center ${
                isOpen ? "space-x-3 justify-start" : "justify-center"
              } px-4 py-3 rounded-lg transition-colors group ${
                currentScreen === item.id
                  ? "bg-blue-50 text-blue-600"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {/* Conditional visibility for the label */}
              <span
                className={`font-medium whitespace-nowrap transition-opacity duration-200 ${
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
      <div className="p-4 border-t">
        <button
          onClick={() => signOut(auth)}
          className={`w-full flex items-center ${
            isOpen ? "space-x-3 justify-start" : "justify-center"
          } px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {/* Conditional visibility for the label */}
          <span
            className={`font-medium whitespace-nowrap transition-opacity duration-200 ${
              isOpen ? "block" : "hidden"
            }`}
          >
            Sign Out
          </span>
        </button>
      </div>
    </div>
  );
}
