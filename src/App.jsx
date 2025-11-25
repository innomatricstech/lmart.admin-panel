// App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useNavigate } from "react-router-dom";

// Layout components
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";

// Customers
import CustomerDirectory from "./components/Customer";

// Orders
import OrdersTable from "./components/Orders/OrdersTable";
import PendingOrdersTable from "./components/Orders/PendingOrdersTable";
import ProcessingOrdersTable from "./components/Orders/ProcessingOrdersTable";
import ShippedOrdersTable from "./components/Orders/ShippedOrdersTable";
import DeliveredOrdersTable from "./components/Orders/DeliveredOrdersTable";
import CancelledOrdersTable from "./components/Orders/CancelledOrdersTable";
import ReturnOrdersTable from "./components/ReturnOrdersTable";

// Others
import EarningsPage from "./components/EarningsPage";
import FilesPage from "./components/FilesPage";
import PostersPage from "./components/PostersPage";
import BannerPage from "./components/BannerPage";
import RecentOrdersTable from "./components/RecentOrdersTable";
import BulkUploadPage from "./components/BulkUploadPage";
import NotificationsPage from "./components/NotificationsPage";

// Sellers
import ViewProductsPage from "./components/Seller/ViewProductsPage";
import DeletedSellersTable from "./components/Seller/DeletedSellersTable";

// Products
import Products from "./components/Products/Products";
import AddProductPage from "./components/Products/AddProduct";
import EditProductPage from "./components/Products/EditProduct";
import ManageSubcategories from "./components/Products/ManageSubcategories";
import ManageCategories from "./components/Products/ManageCategories";
import ViewNews from "./components/Products/ViewNews";
import AddNewsToday from "./components/Products/AddNews";

// Login
import LoginPage from "./components/LoginPage";

// Placeholder Component
const Placeholder = ({ title }) => (
  <div className="p-6 bg-white rounded-lg shadow">
    <h1 className="text-2xl font-bold">{title}</h1>
    <p className="mt-2 text-gray-600">This is a placeholder page.</p>
  </div>
);


// ----------------------
// DASHBOARD LAYOUT
// ----------------------
const DashboardLayout = ({ sidebarOpen, setSidebarOpen, toggleSidebar, onLogout }) => {
  return (
    <div className="flex h-screen bg-gray-50">

      {/* Sidebar */}
      <div
        className={`
          ${sidebarOpen ? "fixed inset-y-0 left-0 z-30" : "hidden"}
          lg:block lg:static
        `}
      >
        <Sidebar onCloseSidebar={() => setSidebarOpen(false)} onLogout={onLogout} />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};


// ----------------------
// MAIN APP COMPONENT
// ----------------------
function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // IMPORTANT: Persisted login check
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!localStorage.getItem("adminUser")   // TRUE if user exists in localStorage
  );

  // Ensure React state syncs with localStorage login
  useEffect(() => {
    if (localStorage.getItem("adminUser")) {
      setIsLoggedIn(true);
    }
  }, []);

  // Sidebar toggle for mobile
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // Authentication handlers
  const handleLogin = () => {
    setIsLoggedIn(true);   // persist handled by LoginPage already
  };

  const handleLogout = () => {
    localStorage.removeItem("adminUser");
    setIsLoggedIn(false);
  };


  return (
    <Router>
      <Routes>

        {/* PUBLIC ROUTES */}
        <Route path="/login" element={
          isLoggedIn ? <Navigate to="/" replace /> : <LoginPage onLogin={handleLogin} />
        } />

        <Route path="/forgot-password" element={<Placeholder title="Forgot Password" />} />


        {/* PROTECTED ROUTES */}
        <Route
          path="/"
          element={
            isLoggedIn ? (
              <DashboardLayout
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
                toggleSidebar={toggleSidebar}
                onLogout={handleLogout}
              />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        >

          {/* Dashboard Home */}
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />

          {/* Customers */}
          <Route path="customers" element={<CustomerDirectory />} />

          {/* Orders */}
          <Route path="orders/all" element={<OrdersTable />} />
          <Route path="orders/pending" element={<PendingOrdersTable />} />
          <Route path="orders/processing" element={<ProcessingOrdersTable />} />
          <Route path="orders/shipped" element={<ShippedOrdersTable />} />
          <Route path="orders/delivered" element={<DeliveredOrdersTable />} />
          <Route path="orders/cancelled" element={<CancelledOrdersTable />} />
          <Route path="return-orders" element={<ReturnOrdersTable />} />
          <Route path="recent-orders" element={<RecentOrdersTable />} />

          {/* Financial */}
          <Route path="earnings" element={<EarningsPage />} />
          <Route path="files" element={<FilesPage />} />
          <Route path="posters" element={<PostersPage />} />
          <Route path="banner" element={<BannerPage />} />
          <Route path="bulk-upload" element={<BulkUploadPage />} />
          <Route path="notifications" element={<NotificationsPage />} />

          {/* Sellers */}
          <Route path="sellers/all" element={<ViewProductsPage />} />
          <Route path="sellers/delete" element={<DeletedSellersTable />} />
          <Route path="sellers/add" element={<Placeholder title="Add Seller" />} />

          {/* Products */}
          <Route path="products" element={<Navigate to="view" replace />} />
          <Route path="products/view" element={<Products />} />
          <Route path="products/add" element={<AddProductPage />} />
          <Route path="products/edit/:productId" element={<EditProductPage />} />
          <Route path="products/subcategories" element={<ManageSubcategories />} />
          <Route path="products/categories" element={<ManageCategories />} />
          <Route path="products/news" element={<ViewNews />} />
          <Route path="products/news/add" element={<AddNewsToday />} />

          {/* 404 inside protected area */}
          <Route path="*" element={<Placeholder title="404 — Page not found" />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;
