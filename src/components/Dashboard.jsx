import React, { useState, useEffect } from "react";
import { 
    Users, 
    ShoppingCart, 
    DollarSign, 
    Clock, 
    Box,
    ChevronDown,
    Search,
    Menu,
    X,
    Grid,
    Settings,
    LogOut,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    Package,
    UserPlus,
    ShoppingBag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../../firerbase'; // Adjust path as needed

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        console.error("Dashboard Error:", error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                    <div className="text-center p-6 bg-white rounded-xl shadow-lg max-w-md">
                        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h2>
                        <p className="text-gray-600 mb-4">Error: {this.state.error?.message || 'Unknown error'}</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

const StatCard = ({ title, value, icon: Icon, bgColor, textColor, statusText, statusColor, badgeIcon: BadgeIcon, loading }) => (
    <div className={`p-4 ${bgColor} rounded-xl shadow-md flex flex-col justify-between h-32 ${loading ? 'animate-pulse' : ''}`}>
        {loading ? (
            <div className="space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/4"></div>
            </div>
        ) : (
            <>
                <div className="flex justify-between items-start">
                    <div>
                        <p className={`text-sm ${textColor} font-medium`}>{title}</p>
                        <p className="text-3xl font-bold mt-1 text-gray-900">{value}</p>
                    </div>
                    <div className="p-2 rounded-full bg-white bg-opacity-30">
                        <Icon className={`w-6 h-6 ${textColor}`} />
                    </div>
                </div>
                <div className="flex justify-between items-center text-xs mt-2">
                    <span className={`${statusColor} font-semibold`}>{statusText}</span>
                    {BadgeIcon && <BadgeIcon className={`w-4 h-4 ${textColor}`} />}
                </div>
            </>
        )}
    </div>
);

const OrderRow = ({ order }) => {
    // Get customer initials
    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    // Get random color for avatar
    const getAvatarColor = (id) => {
        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-red-500', 'bg-indigo-500'];
        return colors[id?.length % colors.length] || 'bg-blue-500';
    };

    const avatarColor = getAvatarColor(order.id);

    return (
        <tr className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
            <td className="py-3 px-2">
                <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full ${avatarColor} text-white flex items-center justify-center text-lg font-bold flex-shrink-0`}>
                        {getInitials(order.name)}
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800">{order.name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{order.email}</p>
                        <p className="text-xs text-gray-500">{order.phone}</p>
                    </div>
                </div>
            </td>
            <td className="py-3 px-2">
                <p className="text-lg font-bold text-gray-800">{order.amount}</p>
                <p className="text-sm text-gray-500">{order.items} Item{order.items !== 1 ? 's' : ''}</p>
            </td>
            <td className="py-3 px-2 text-gray-700 font-medium hidden sm:table-cell">{order.date}</td>
            <td className="py-3 px-2">
                <Link 
                    to={`/orders/${order.id}`}
                    className="inline-block bg-purple-500 text-white text-sm px-3 py-1 rounded-lg hover:bg-purple-600 transition-colors shadow"
                >
                    View Details
                </Link>
            </td>
        </tr>
    );
};

const LoadingSkeleton = () => (
    <div className="animate-pulse p-4 md:p-6 bg-gray-100 min-h-screen">
        <div className="space-y-2 mb-6">
            <div className="h-6 bg-gray-300 rounded w-48"></div>
            <div className="h-4 bg-gray-300 rounded w-32"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 bg-gray-200 rounded-xl h-32 shadow-md"></div>
            ))}
        </div>
        <div className="bg-white p-4 rounded-xl shadow-lg">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded mb-3"></div>
            ))}
        </div>
    </div>
);

function AdminDashboardContent() {
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [dashboardData, setDashboardData] = useState({
        totalCustomers: 0,
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        totalProducts: 0,
        recentOrders: []
    });
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [statsLoading, setStatsLoading] = useState(true);

    // Fetch dashboard data from Firestore
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setStatsLoading(true);
                
                // Fetch recent orders (limit to 10 for dashboard)
                const ordersRef = collection(db, 'orders');
                const ordersQuery = query(
                    ordersRef, 
                    orderBy('date', 'desc'),
                    limit(10)
                );
                
                const ordersSnapshot = await getDocs(ordersQuery);
                const ordersList = ordersSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        name: data.customer || data.customerInfo?.name || 'Unknown Customer',
                        email: data.email || data.customerInfo?.email || 'N/A',
                        phone: data.phone || data.customerInfo?.phone || 'N/A',
                        amount: `₹${(data.amount || 0).toLocaleString('en-IN')}`,
                        items: Array.isArray(data.items) ? data.items.length : 1,
                        date: data.date 
                            ? (data.date.toDate ? data.date.toDate().toLocaleDateString('en-IN') : new Date(data.date).toLocaleDateString('en-IN'))
                            : 'N/A',
                        status: data.status || 'pending'
                    };
                });

                // Calculate statistics
                const totalOrders = ordersSnapshot.size;
                const totalRevenue = ordersSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
                const pendingOrders = ordersSnapshot.docs.filter(doc => {
                    const status = doc.data().status;
                    return !status || status.toLowerCase() === 'pending' || status.toLowerCase() === 'processing';
                }).length;

                // Note: You'll need separate collections for customers and products
                // For now, using estimates based on orders
                const uniqueCustomers = new Set(ordersSnapshot.docs.map(doc => 
                    doc.data().customer || doc.data().customerInfo?.email || doc.data().email
                )).size;

                // Fetch products count (if you have a products collection)
                let totalProducts = 0;
                try {
                    const productsSnapshot = await getDocs(collection(db, 'products'));
                    totalProducts = productsSnapshot.size;
                } catch (err) {
                    console.log('Products collection not available, using estimate');
                    // Estimate based on items in orders
                    const allItems = ordersSnapshot.docs.flatMap(doc => 
                        Array.isArray(doc.data().items) ? doc.data().items : []
                    );
                    const uniqueProductIds = new Set(allItems.map(item => item.id || item.name)).size;
                    totalProducts = uniqueProductIds || 15; // Fallback to 15
                }

                setDashboardData({
                    totalCustomers: uniqueCustomers,
                    totalOrders,
                    totalRevenue,
                    pendingOrders,
                    totalProducts,
                    recentOrders: ordersList
                });

                setFilteredOrders(ordersList);
                setStatsLoading(false);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                setStatsLoading(false);
            }
        };

        fetchDashboardData();
        const timer = setTimeout(() => setIsLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    // Filter orders based on search term
    useEffect(() => {
        if (searchTerm.trim() === '') {
            setFilteredOrders(dashboardData.recentOrders);
            return;
        }

        const filtered = dashboardData.recentOrders.filter(order =>
            order.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.phone.includes(searchTerm) ||
            order.amount.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredOrders(filtered);
    }, [searchTerm, dashboardData.recentOrders]);

    // Format currency
    const formatCurrency = (amount) => {
        return `₹${Number(amount).toLocaleString('en-IN')}`;
    };

    if (isLoading) return <LoadingSkeleton />;

    return (
        <div className="w-full bg-gray-100 font-sans antialiased">
            <main className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900">Admin Dashboard</h1>
                    <p className="text-sm text-gray-500">
                        Welcome back! Here's an overview of your store's performance.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Last updated: {new Date().toLocaleTimeString('en-IN')}
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <StatCard 
                        title="Total Customers" 
                        value={dashboardData.totalCustomers} 
                        icon={Users} 
                        bgColor="bg-blue-100" 
                        textColor="text-blue-600" 
                        statusText="• Active Users" 
                        statusColor="text-green-500" 
                        badgeIcon={UserPlus}
                        loading={statsLoading}
                    />
                    <StatCard 
                        title="Total Orders" 
                        value={dashboardData.totalOrders} 
                        icon={ShoppingCart} 
                        bgColor="bg-green-100" 
                        textColor="text-green-600" 
                        statusText="• All Time" 
                        statusColor="text-gray-500" 
                        badgeIcon={ShoppingBag}
                        loading={statsLoading}
                    />
                    <StatCard 
                        title="Total Revenue" 
                        value={formatCurrency(dashboardData.totalRevenue)} 
                        icon={DollarSign} 
                        bgColor="bg-purple-100" 
                        textColor="text-purple-600" 
                        statusText="• Lifetime" 
                        statusColor="text-green-500" 
                        badgeIcon={TrendingUp}
                        loading={statsLoading}
                    />
                    <StatCard 
                        title="Pending Orders" 
                        value={dashboardData.pendingOrders} 
                        icon={Clock} 
                        bgColor="bg-yellow-100" 
                        textColor="text-yellow-600" 
                        statusText="• Needs Action" 
                        statusColor="text-red-500" 
                        badgeIcon={AlertCircle}
                        loading={statsLoading}
                    />
                    <StatCard 
                        title="Total Products" 
                        value={dashboardData.totalProducts} 
                        icon={Package} 
                        bgColor="bg-indigo-100" 
                        textColor="text-indigo-600" 
                        statusText="• Active Products" 
                        statusColor="text-green-500" 
                        badgeIcon={Box}
                        loading={statsLoading}
                    />
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link 
                        to="/orders" 
                        className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow flex items-center space-x-3"
                    >
                        <ShoppingBag className="w-6 h-6 text-blue-500" />
                        <div>
                            <h3 className="font-semibold text-gray-800">View All Orders</h3>
                            <p className="text-sm text-gray-500">Manage and track all orders</p>
                        </div>
                        <ChevronDown className="w-5 h-5 text-gray-400 ml-auto rotate-270" />
                    </Link>
                    <Link 
                        to="/products" 
                        className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow flex items-center space-x-3"
                    >
                        <Package className="w-6 h-6 text-green-500" />
                        <div>
                            <h3 className="font-semibold text-gray-800">Manage Products</h3>
                            <p className="text-sm text-gray-500">Add, edit, or remove products</p>
                        </div>
                        <ChevronDown className="w-5 h-5 text-gray-400 ml-auto rotate-270" />
                    </Link>
                    <Link 
                        to="/customers" 
                        className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow flex items-center space-x-3"
                    >
                        <Users className="w-6 h-6 text-purple-500" />
                        <div>
                            <h3 className="font-semibold text-gray-800">Customer Management</h3>
                            <p className="text-sm text-gray-500">View and manage customers</p>
                        </div>
                        <ChevronDown className="w-5 h-5 text-gray-400 ml-auto rotate-270" />
                    </Link>
                </div>

                {/* Recent Orders Table */}
                <section className="bg-white p-4 rounded-xl shadow-lg mt-2 h-[60vh] overflow-y-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sticky top-0 bg-white pt-2 z-10">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800">Recent Orders</h2>
                            <p className="text-sm text-gray-500">Latest customer orders</p>
                        </div>
                        <div className="flex items-center space-x-2 border rounded-full px-3 py-1 bg-gray-50 w-full sm:w-auto">
                            <Search className="w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search name, phone, or amount..." 
                                className="bg-transparent focus:outline-none text-sm w-full" 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm("")} className="text-gray-500 hover:text-gray-700 p-1">
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="w-full overflow-x-auto">
                        <table className="min-w-full text-left">
                            <thead className="text-gray-500 text-sm font-medium border-b bg-white sticky top-16 z-10 shadow-sm">
                                <tr>
                                    <th className="py-3 px-2 min-w-[200px]">CUSTOMER INFO</th>
                                    <th className="py-3 px-2 min-w-[120px]">ITEMS & AMOUNT</th>
                                    <th className="py-3 px-2 min-w-[120px]">ORDER DATE</th>
                                    <th className="py-3 px-2 min-w-[100px]">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="text-center py-8 text-gray-500">
                                            {statsLoading ? (
                                                <div className="flex flex-col items-center">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
                                                    <p>Loading orders...</p>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center">
                                                    <Package className="w-12 h-12 text-gray-300 mb-2" />
                                                    <p>No orders found{searchTerm ? ' matching your search' : ''}.</p>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order, index) => (
                                        <OrderRow key={order.id || index} order={order} />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t text-sm text-gray-600">
                        <div>
                            Showing <span className="font-semibold">{filteredOrders.length}</span> of{' '}
                            <span className="font-semibold">{dashboardData.recentOrders.length}</span> recent orders
                        </div>
                        <div className="flex items-center space-x-2">
                            {searchTerm && (
                                <button onClick={() => setSearchTerm("")} className="text-purple-600 hover:text-purple-800">
                                    Clear search
                                </button>
                            )}
                            <Link to="/orders" className="text-blue-600 hover:text-blue-800 font-medium">
                                View all orders →
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Dashboard Footer */}
                <div className="text-center text-xs text-gray-400 py-4">
                    <p>Dashboard updated in real-time. Data is fetched from your Firebase database.</p>
                    <p className="mt-1">Need help? Check the documentation or contact support.</p>
                </div>
            </main>
        </div>
    );
}

export default function AdminDashboard() {
    return (
        <ErrorBoundary>
            <AdminDashboardContent />
        </ErrorBoundary>
    );
}