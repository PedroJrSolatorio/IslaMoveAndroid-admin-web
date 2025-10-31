import React from 'react';
import { User, Menu } from 'lucide-react';

export default function Header({ currentUser, toggleSidebar, isSidebarOpen }) {
  return (
    <div className="bg-white shadow-sm border-b px-6 py-4 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className='flex items-center space-x-4'>
          <button
            onClick={toggleSidebar}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <Menu className='w-6 h-6' />
          </button>
          <h1 className="text-2xl font-semibold text-gray-900">Admin Dashboard</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{currentUser?.email}</p>
            <p className="text-xs text-gray-500">Administrator</p>
          </div>
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}