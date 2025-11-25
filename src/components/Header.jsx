import React, { useState, useEffect } from 'react';
import { FiChevronDown, FiMenu, FiBarChart2 } from 'react-icons/fi';

export default function Header({ onToggleSidebar }) {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);

  // Load user data from localStorage
  useEffect(() => {
    const userData = localStorage.getItem("adminUser");
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
      <div className="flex items-center justify-between px-6 py-4">

        {/* Left Section — Menu + Dashboard Title */}
        <div className="flex items-center space-x-4">
          <button 
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 lg:hidden"
          >
            <FiMenu className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex items-center space-x-2">
            <FiBarChart2 className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-800">Dashboard</h1>
          </div>
        </div>

        {/* Right Section — User Profile */}
        <div className="relative">
          <button 
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            {/* Avatar Image */}
            <img 
              src={user?.photoURL || "/default-avatar.png"}
              alt="User Avatar"
              className="w-8 h-8 rounded-full object-cover"
            />

            {/* User Info */}
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-900">{user?.name || "Admin User"}</p>
              <p className="text-xs text-gray-500">{user?.email || "admin@imart.in"}</p>
            </div>

            <FiChevronDown 
              className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                isProfileDropdownOpen ? 'rotate-180' : 'rotate-0'
              }`}
            />
          </button>

          {/* Dropdown */}
          {isProfileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
              <a href="#profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Profile
              </a>
              <a href="#settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Settings
              </a>
              <a href="#help" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                Help & Support
              </a>

              <div className="border-t border-gray-200 my-1"></div>

              <a href="#logout" className="block px-4 py-2 text-sm text-red-600 hover:bg-gray-50">
                Logout
              </a>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
