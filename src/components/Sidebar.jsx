// components/Sidebar.jsx 
import React, { useState, useEffect } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";

import {
  FiBarChart2, FiUsers, FiShoppingBag, FiArchive, FiDollarSign,
  FiBox, FiFileText, FiImage, FiMenu, FiPackage, FiClock,
  FiUploadCloud, FiLogOut, FiChevronUp, FiBell, FiX, FiUserPlus, FiRss
} from "react-icons/fi";

const PRIMARY_RED = "bg-gradient-to-r from-red-600 to-red-700";
const HOVER_RED = "hover:from-red-700 hover:to-red-800";
const LOGOUT_BUTTON_CLASS = `${PRIMARY_RED} ${HOVER_RED} w-full p-3 rounded-xl text-white font-bold flex items-center justify-center transition-all duration-300 shadow-xl`;

const ACTIVE_BG = "bg-purple-100/70 backdrop-blur-md"; 
const ACTIVE_TEXT = "text-purple-800 font-bold";
const ACTIVE_ICON_COLOR = "text-purple-600";
const HOVER_BASE = "hover:bg-gray-100/70";
const DEFAULT_TEXT_COLOR = "text-gray-600";

const SidebarLinkButton = ({ children, isActive }) => (
  <div
    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-300 group font-semibold text-sm 
      ${isActive 
        ? `${ACTIVE_BG} ${ACTIVE_TEXT} shadow-lg shadow-purple-200/50` 
        : `${HOVER_BASE} text-gray-700`}
    `}
  >
    {children}
  </div>
);

const DropdownLink = ({ text, isSubActive, to, onClick }) => (
  <Link to={to} onClick={onClick} className="w-full">
    <div
      className={`w-full text-left p-2 pl-5 rounded-lg text-sm border-l-4 transition-all font-medium
        ${isSubActive
          ? `bg-blue-100/80 border-blue-600 text-blue-800 font-semibold` 
          : `border-transparent ${DEFAULT_TEXT_COLOR} ${HOVER_BASE} hover:text-gray-900`}
      `}
    >
      {text}
    </div>
  </Link>
);

export default function Sidebar({ onCloseSidebar, onLogout }) {

  const location = useLocation();
  const [openDropdown, setOpenDropdown] = useState(null);

  // Logout confirmation modal
  const [showConfirm, setShowConfirm] = useState(false);

  const toggleDropdown = (key) => {
    setOpenDropdown((prev) => (prev === key ? null : key));
  };

  const handleLogoutConfirmed = () => {
    localStorage.removeItem("adminUser");
    if (onLogout) onLogout();
    if (onCloseSidebar) onCloseSidebar();
  };

  const navigationItems = [
    { text: "Overview", icon: FiBarChart2, key: "Overview", path: "/" },
    { text: "Customers", icon: FiUsers, key: "Customers", path: "/customers" },

    {
      text: "Orders", icon: FiShoppingBag, key: "Orders", path: "/orders/all", hasDropdown: true,
      dropdownContent: [
        { text: "All Orders", path: "/orders/all" },
        { text: "Pending", path: "/orders/pending" },
        { text: "Processing", path: "/orders/processing" },
        { text: "Shipped", path: "/orders/shipped" },
        { text: "Delivered", path: "/orders/delivered" },
        { text: "Cancelled", path: "/orders/cancelled" },
      ],
    },

    { text: "Return Orders", icon: FiArchive, key: "Return Orders", path: "/return-orders" },
    { text: "Earnings", icon: FiDollarSign, key: "Earnings", path: "/earnings" },

    // PRODUCTS MENU (Corrected)
    {
      text: "Products", icon: FiBox, key: "Products", path: "/products/view", hasDropdown: true,
      dropdownContent: [
        { text: "View Products", path: "/products/view" },
        { text: "Add Product", path: "/products/add" },
        { text: "Manage Categories", path: "/products/categories" },
        { text: "Manage Subcategories", path: "/products/subcategories" },
      ],
    },

    // NEWS MENU (Corrected + new parent path "/news")
    {
      text: "Market News",
      icon: FiRss,
      key: "News",
      path: "/news",          // FIXED
      hasDropdown: true,
      dropdownContent: [
        { text: "View Market News", path: "/news/view" },
        { text: "Add News Today", path: "/news/add" },
      ],
    },

    { text: "Files", icon: FiFileText, key: "Files", path: "/files" },
    { text: "Posters", icon: FiImage, key: "Posters", path: "/posters" },

    {
      text: "Sellers", icon: FiPackage, key: "Sellers", path: "/sellers/all", hasDropdown: true,
      dropdownContent: [
        { text: "Sellers", path: "/sellers/all" },
        { text: "Delete Seller", path: "/sellers/delete" },
      ],
    },

    { text: "Recent Orders", icon: FiClock, key: "Recent Orders", path: "/recent-orders" },
    { text: "Bulk Upload", icon: FiUploadCloud, key: "Bulk Upload", path: "/bulk-upload" },
  ];

  return (
    <>
      {/* Sidebar */}
      <aside className="w-64 bg-white/90 backdrop-blur-xl border-r border-gray-100 shadow-2xl h-screen flex flex-col">

        {/* Header */}
        <div className="py-5 px-4 bg-white/80 backdrop-blur-md flex items-center justify-between border-b border-gray-200 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-full bg-red-600/10 border border-red-200">
              <FiBarChart2 className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-sm font-extrabold tracking-widest text-gray-900">ADMIN DASHBOARD</h2>
          </div>

          <button className="lg:hidden p-2 rounded-full hover:bg-red-100" onClick={onCloseSidebar}>
            <FiX className="w-5 h-5 text-red-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar">
          {navigationItems.map((item) => {
            const isOpen = openDropdown === item.key;

            // Improved parent active logic
            const parentActive =
              item.hasDropdown
                ? location.pathname.startsWith(item.path.split("/")[1] ? `/${item.path.split("/")[1]}` : item.path) ||
                  item.dropdownContent.some(sub =>
                    location.pathname.startsWith(sub.path.split("/")[1] ? `/${sub.path.split("/")[1]}` : sub.path)
                  )
                : location.pathname === item.path;

            return (
              <div key={item.key} className="mb-1">

                <div className="flex items-center justify-between gap-2">
                  <NavLink
                    to={item.path || "#"}
                    end={!item.hasDropdown}
                    className={({ isActive }) => `flex-1 ${isActive || parentActive ? "text-gray-900" : "text-gray-700"}`}
                    onClick={(e) => {
                      if (item.hasDropdown) {
                        toggleDropdown(item.key);
                        e.preventDefault();
                      } else {
                        onCloseSidebar && onCloseSidebar();
                      }
                    }}
                  >
                    <SidebarLinkButton isActive={parentActive}>
                      <div className="flex items-center">
                        <item.icon className={`w-5 h-5 mr-3 ${parentActive ? ACTIVE_ICON_COLOR : "text-gray-500"}`} />
                        <span>{item.text}</span>
                      </div>

                      {item.hasDropdown && (
                        <FiChevronUp
                          className={`w-4 h-4 transition-transform ${
                            isOpen ? "rotate-0" : "rotate-180"
                          } text-gray-600`}
                        />
                      )}
                    </SidebarLinkButton>
                  </NavLink>
                </div>

                {/* Dropdown */}
                {item.hasDropdown && (
                  <div className={`transition-all duration-300 ${isOpen || parentActive ? "max-h-96 mt-2" : "max-h-0"} overflow-hidden`}>
                    <div className="pl-4 py-1 space-y-1 border-l-2 border-gray-200 ml-5">
                      {item.dropdownContent.map((sub) => {
                        const subActive = location.pathname === sub.path;
                        return (
                          <DropdownLink
                            key={sub.text}
                            text={sub.text}
                            to={sub.path}
                            isSubActive={subActive}
                            onClick={() => onCloseSidebar && onCloseSidebar()}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200 bg-white/80 backdrop-blur-md shadow-inner-top">
          <button
            className={LOGOUT_BUTTON_CLASS}
            onClick={() => setShowConfirm(true)}
          >
            <FiLogOut className="w-5 h-5 mr-2" />
            Logout
          </button>
        </div>

      </aside>

      {/* Logout Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-[999]">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-80 text-center">
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              Confirm Logout
            </h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to logout?
            </p>

            <div className="flex justify-between gap-4">
              <button
                className="flex-1 py-2 rounded-lg border font-semibold text-gray-700 hover:bg-gray-100"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </button>

              <button
                className="flex-1 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
                onClick={handleLogoutConfirmed}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
