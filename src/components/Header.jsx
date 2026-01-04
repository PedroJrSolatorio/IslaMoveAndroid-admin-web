import React from "react";
import { User, Menu } from "lucide-react";

export default function Header({ currentUser, toggleSidebar, isSidebarOpen }) {
  return (
    <div className="bg-white shadow-sm border-b px-3 sm:px-4 lg:px-6 py-3 lg:py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
          <button
            onClick={toggleSidebar}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <h1 className="!text-lg md:!text-2xl lg:!text-5xl font-semibold text-gray-900">
            Admin Dashboard
          </h1>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900 truncate max-w-[150px] lg:max-w-none">
              {currentUser?.email}
            </p>
            <p className="text-xs text-gray-500">Administrator</p>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
