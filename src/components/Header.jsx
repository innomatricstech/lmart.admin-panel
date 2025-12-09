import React, { useState, useEffect } from "react";
import { FiChevronDown, FiMenu, FiBarChart2 } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

export default function Header({ onToggleSidebar, onLogout, user }) {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setAdmin(user || null);
  }, [user]);

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-10">
      <div className="flex items-center justify-between px-6 py-4">

        {/* Left */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
          >
            <FiMenu className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex items-center space-x-2">
            <FiBarChart2 className="w-5 h-5 text-blue-600" />
            <h1 className="text-lg font-semibold text-gray-800">Dashboard</h1>
          </div>
        </div>

        {/* Right */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100"
          >
            <img
              src={admin?.photoURL || "/default-avatar.png"}
              className="w-8 h-8 rounded-full object-cover"
            />

            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold">{admin?.name}</p>
              <p className="text-xs text-gray-500">{admin?.email}</p>
            </div>

            <FiChevronDown
              className={`w-4 h-4 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white shadow rounded-lg border py-1">
              
              <button
                onClick={() => {
                  navigate("/profile");
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-100"
              >
                Profile
              </button>

              <div className="border-t my-1"></div>

              <button
                onClick={() => {
                  onLogout();
                  navigate("/login");
                }}
                className="w-full px-4 py-2 text-left text-red-600 hover:bg-gray-100"
              >
                Logout
              </button>

            </div>
          )}
        </div>

      </div>
    </header>
  );
}
