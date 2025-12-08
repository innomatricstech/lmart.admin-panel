import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";

// Layout
import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import Dashboard from "./components/Dashboard.jsx";

// Customers
import CustomerDirectory from "./components/Customer.jsx";

// Orders
import OrdersTable from "./components/Orders/OrdersTable.jsx";
import OrderDetail from "./components/Orders/OrdersDetails.jsx";

import PendingOrdersTable from "./components/Orders/PendingOrdersTable.jsx";
import { ProcessingOrdersTable } from "./components/Orders/ProcessingOrdersTable.jsx";
import { ShippedOrdersTable } from "./components/Orders/ShippedOrdersTable.jsx";
import { DeliveredOrdersTable } from "./components/Orders/DeliveredOrdersTable.jsx";
import { CancelledOrdersTable } from "./components/Orders/CancelledOrdersTable.jsx";
import ReturnOrdersTable from "./components/ReturnOrdersTable.jsx";
import RecentOrdersTable from "./components/RecentOrdersTable.jsx";

// Others
import EarningsPage from "./components/EarningsPage.jsx";
// --- UPDATED IMPORT ---
import FilesManagementPage from "./components/FilesManagementPage.jsx"; // New wrapper component
// --- END UPDATED IMPORT ---
import PostersPage from "./components/PostersPage.jsx";
import BannerPage from "./components/BannerPage.jsx";
import BulkUploadPage from "./components/BulkUploadPage.jsx";
import NotificationsPage from "./components/NotificationsPage.jsx";

// Sellers
import ViewSellersPage from "./components/Seller/ViewSeller.jsx";
import DeletedSellersTable from "./components/Seller/DeletedSellersTable.jsx";
import EditSellerPage from "./components/Seller/EditSellerPage.jsx";

// Products
import Products from "./components/Products/Products.jsx";
import AddProductPage from "./components/Products/AddProduct.jsx";
import EditProductPage from "./components/Products/EditProduct.jsx";
import ManageSubcategories from "./components/Products/ManageSubcategories.jsx";
import ManageCategories from "./components/Products/ManageCategories.jsx";

// News
import ViewNews from "./components/Products/ViewNews.jsx";
import AddNewsToday from "./components/Products/AddNews.jsx";

// Login
import LoginPage from "./components/LoginPage.jsx";

// Placeholder
const Placeholder = ({ title }) => (
    <div className="p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-2 text-gray-600">This is a placeholder page.</p>
    </div>
);

// --------------------------------------
// Dashboard Layout Wrapper
// --------------------------------------
const DashboardLayout = ({ sidebarOpen, setSidebarOpen, toggleSidebar, onLogout }) => {
    return (
        <div className="flex h-screen bg-gray-50">

            {/* Sidebar */}
            <div
                className={`${sidebarOpen ? "fixed inset-y-0 left-0 z-30" : "hidden"} lg:block lg:static`}
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

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header onToggleSidebar={toggleSidebar} />
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

// --------------------------------------
// MAIN APP COMPONENT
// --------------------------------------
export default function App() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("adminUser"));

    useEffect(() => {
        if (localStorage.getItem("adminUser")) {
            setIsLoggedIn(true);
        }
    }, []);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    const handleLogin = () => setIsLoggedIn(true);
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

                    {/* Dashboard */}
                    <Route index element={<Dashboard />} />
                    <Route path="dashboard" element={<Dashboard />} />

                    {/* Customers */}
                    <Route path="customers" element={<CustomerDirectory />} />

                    {/* Orders */}
                    <Route path="orders" element={<Navigate to="all" replace />} />
                    <Route path="orders/all" element={<OrdersTable />} />
                    <Route path="orders/:userId/:orderId" element={<OrderDetail />} />
                    <Route path="orders/pending" element={<PendingOrdersTable />} />
                    <Route path="orders/processing" element={<ProcessingOrdersTable />} />
                    <Route path="orders/shipped" element={<ShippedOrdersTable />} />
                    <Route path="orders/delivered" element={<DeliveredOrdersTable />} />
                    <Route path="orders/cancelled" element={<CancelledOrdersTable />} />
                    <Route path="return-orders" element={<ReturnOrdersTable />} />
                    <Route path="recent-orders" element={<RecentOrdersTable />} />

                    {/* Financial & Other Pages */}
                    <Route path="earnings" element={<EarningsPage />} />
                    {/* --- UPDATED ROUTE --- */}
                    <Route path="files" element={<FilesManagementPage />} /> 
                    {/* --- END UPDATED ROUTE --- */}
                    <Route path="posters" element={<PostersPage />} />
                    <Route path="banner" element={<BannerPage />} />
                    <Route path="bulk-upload" element={<BulkUploadPage />} />
                    <Route path="notifications" element={<NotificationsPage />} />

                    {/* Sellers */}
                    <Route path="sellers/all" element={<ViewSellersPage />} />
                    <Route path="sellers/delete" element={<DeletedSellersTable />} />
                    <Route path="sellers/view/:id" element={<EditSellerPage />} />
                    <Route path="sellers/edit/:id" element={<EditSellerPage />} />

                    {/* Products */}
                    <Route path="products" element={<Navigate to="view" replace />} />
                    <Route path="products/view" element={<Products />} />
                    <Route path="products/add" element={<AddProductPage />} />
                    <Route path="products/edit/:productId" element={<EditProductPage />} />
                    <Route path="products/subcategories" element={<ManageSubcategories />} />
                    <Route path="products/categories" element={<ManageCategories />} />

                    {/* MARKET NEWS */}
                    <Route path="news" element={<Navigate to="view" replace />} />
                    <Route path="news/view" element={<ViewNews />} />
                    <Route path="news/add" element={<AddNewsToday />} />

                    {/* 404 */}
                    <Route path="*" element={<Placeholder title="404 — Page not found" />} />

                </Route>
            </Routes>
        </Router>
    );
}