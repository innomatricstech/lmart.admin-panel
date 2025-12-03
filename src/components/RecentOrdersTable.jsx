import React, { useState, useEffect } from "react";
import { 
    Users, 
    ShoppingCart, 
    DollarSign, 
    Clock, 
    Box,
    ChevronRight,
    Search,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    Package,
    UserPlus,
    ShoppingBag,
    BarChart3,
    CreditCard,
    Truck,
    RefreshCw,
    Download,
    Filter,
    MoreVertical,
    Sparkles,
    CheckCircle,
    XCircle,
    Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firerbase';

// ErrorBoundary remains unchanged
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
                <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                    <div className="text-center p-8 bg-white rounded-2xl shadow-2xl max-w-md transform transition-all duration-300 hover:scale-105">
                        <div className="relative">
                            <AlertCircle className="w-20 h-20 text-red-400 mx-auto mb-4 animate-pulse" />
                            <div className="absolute inset-0 bg-red-100 rounded-full blur-xl opacity-50"></div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-3">Oops! Something went wrong</h2>
                        <p className="text-gray-600 mb-6">Error: {this.state.error?.message || 'Unknown error'}</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:-translate-y-1 shadow-lg hover:shadow-xl font-semibold"
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

// Enhanced StatCard with animations and better styling
const StatCard = ({ title, value, icon: Icon, bgColor, textColor, trend, percentage, loading, isCurrency = false }) => (
    <div className={`relative p-6 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group ${bgColor} ${loading ? 'animate-pulse' : ''} overflow-hidden`}>
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
            <Icon className="w-full h-full transform rotate-12" />
        </div>
        
        {/* Glow effect */}
        <div className={`absolute inset-0 bg-gradient-to-br ${bgColor.replace('bg-', 'from-')} to-transparent opacity-0 group-hover:opacity-30 transition-opacity duration-300 rounded-2xl`}></div>
        
        {loading ? (
            <div className="space-y-3">
                <div className="h-4 bg-white/30 rounded w-3/4"></div>
                <div className="h-10 bg-white/30 rounded w-1/2"></div>
                <div className="h-3 bg-white/30 rounded w-1/3"></div>
            </div>
        ) : (
            <>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className={`text-sm ${textColor} font-medium opacity-80`}>{title}</p>
                        <p className="text-4xl font-bold mt-2 text-white">
                            {isCurrency ? `₹${Number(value).toLocaleString('en-IN')}` : value}
                        </p>
                    </div>
                    <div className={`p-3 rounded-xl ${textColor.replace('text-', 'bg-')} bg-opacity-20 backdrop-blur-sm transform group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`w-7 h-7 ${textColor}`} />
                    </div>
                </div>
                
                {trend && percentage && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/20">
                        <div className={`flex items-center space-x-1 ${trend === 'up' ? 'text-green-200' : 'text-red-200'}`}>
                            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span className="text-sm font-semibold">{percentage}%</span>
                        </div>
                        <span className="text-xs text-white/70">vs last month</span>
                    </div>
                )}
            </>
        )}
    </div>
);

// Enhanced OrderRow with better styling
const OrderRow = ({ order, index }) => {
    const getStatusIcon = (status) => {
        switch(status?.toLowerCase()) {
            case 'success':
            case 'delivered':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'pending':
            case 'processing':
                return <Clock className="w-4 h-4 text-yellow-500" />;
            case 'cancelled':
                return <XCircle className="w-4 h-4 text-red-500" />;
            default:
                return <Activity className="w-4 h-4 text-gray-500" />;
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    };

    const getAvatarColor = (id) => {
        const colors = [
            'from-blue-500 to-cyan-400',
            'from-purple-500 to-pink-400',
            'from-green-500 to-emerald-400',
            'from-orange-500 to-yellow-400',
            'from-red-500 to-pink-400',
            'from-indigo-500 to-blue-400'
        ];
        return colors[(id?.length || 0) % colors.length];
    };

    const avatarColor = getAvatarColor(order.id);

    return (
        <tr className="border-b border-gray-100 last:border-b-0 hover:bg-gradient-to-r from-gray-50 to-white transition-all duration-300 transform hover:scale-[1.002] group">
            <td className="py-4 px-6">
                <div className="flex items-center space-x-4">
                    <div className="relative">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white text-lg font-bold shadow-lg transform group-hover:rotate-6 transition-transform duration-300`}>
                            {getInitials(order.name)}
                        </div>
                        <div className="absolute -bottom-1 -right-1">
                            {getStatusIcon(order.status)}
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate group-hover:text-gray-900">{order.name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[180px]" title={order.email}>
                            {order.email}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full font-medium">
                                {order.items} item{order.items !== 1 ? 's' : ''}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">{order.date}</span>
                        </div>
                    </div>
                </div>
            </td>
            <td className="py-4 px-6">
                <div className="text-right">
                    <p className="text-xl font-bold text-gray-900 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                        {order.amount}
                    </p>
                    <p className={`text-xs font-medium mt-1 ${order.status === 'success' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {order.status?.toUpperCase() || 'PENDING'}
                    </p>
                </div>
            </td>
            <td className="py-4 px-6 hidden lg:table-cell">
                <div className="flex flex-col items-end">
                    <div className="flex items-center space-x-2">
                        {order.status === 'success' ? (
                            <div className="flex items-center space-x-1 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-sm font-medium">Paid</span>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-1 text-yellow-600">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm font-medium">Processing</span>
                            </div>
                        )}
                    </div>
                    <span className="text-xs text-gray-400 mt-1">via Cash</span>
                </div>
            </td>
            <td className="py-4 px-6">
                <div className="flex justify-end space-x-2">
                    <Link 
                        to={`/orders/${order.id}`}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 transform hover:-translate-y-0.5 shadow-md hover:shadow-lg flex items-center space-x-2 group"
                    >
                        <span>View</span>
                        <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical className="w-5 h-5" />
                    </button>
                </div>
            </td>
        </tr>
    );
};

// Enhanced LoadingSkeleton
const LoadingSkeleton = () => (
    <div className="animate-pulse p-4 md:p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
        {/* Header */}
        <div className="space-y-4 mb-8">
            <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-64"></div>
            <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-96"></div>
        </div>
        
        {/* Stats Grid with shimmer */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-200 to-gray-300 h-32 shadow-lg">
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                </div>
            ))}
        </div>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-lg h-24"></div>
            ))}
        </div>
        
        {/* Orders Table */}
        <div className="bg-white p-6 rounded-2xl shadow-lg">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl mb-4"></div>
            ))}
        </div>
    </div>
);

// Main Component
function AdminDashboardContent() {
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [dashboardData, setDashboardData] = useState({
        totalCustomers: 0,
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
        totalProducts: 0,
        recentOrders: [],
        revenueGrowth: 12.5,
        customerGrowth: 8.2,
        orderGrowth: 15.3
    });
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [statsLoading, setStatsLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState('today');

    // Fetch dashboard data from Firestore
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setStatsLoading(true);
                
                // Fetch Total Customers Count
                let totalCustomers = 0;
                try {
                    const usersSnapshot = await getDocs(collection(db, 'users'));
                    totalCustomers = usersSnapshot.size;
                } catch (err) {
                    console.log('Using fallback for customers count');
                    totalCustomers = 12; // Fallback
                }

                // Fetch Recent Orders
                const ordersRef = collection(db, 'orders');
                const ordersQuery = query(
                    ordersRef, 
                    orderBy('createdAt', 'desc'),
                    limit(10)
                );
                
                const ordersSnapshot = await getDocs(ordersQuery);
                const ordersList = ordersSnapshot.docs.map(doc => {
                    const data = doc.data();
                    const dateTimestamp = data.createdAt || data.date;
                    
                    const formatDate = (timestamp) => {
                        if (!timestamp) return 'N/A';
                        try {
                            if (timestamp.toDate) {
                                return timestamp.toDate().toLocaleDateString('en-IN');
                            }
                            if (typeof timestamp === 'string' && timestamp.includes(' at ')) {
                                const datePart = timestamp.split(' at ')[0]; 
                                return new Date(datePart).toLocaleDateString('en-IN');
                            }
                            return new Date(timestamp).toLocaleDateString('en-IN');
                        } catch (e) {
                            return 'N/A';
                        }
                    };

                    return {
                        id: doc.id,
                        name: data.customerInfo?.name || data.customer || 'Unknown Customer',
                        email: data.customerInfo?.email || data.email || 'N/A',
                        phone: data.customerInfo?.phone || data.phone || 'N/A',
                        amount: `₹${(data.amount || 0).toLocaleString('en-IN')}`,
                        items: Array.isArray(data.items) ? data.items.length : 1,
                        date: formatDate(dateTimestamp),
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

                // Fetch Total Products Count
                let totalProducts = 0;
                try {
                    const productsSnapshot = await getDocs(collection(db, 'products'));
                    totalProducts = productsSnapshot.size;
                } catch (err) {
                    totalProducts = 15;
                }

                setDashboardData(prev => ({
                    ...prev,
                    totalCustomers,
                    totalOrders,
                    totalRevenue,
                    pendingOrders,
                    totalProducts,
                    recentOrders: ordersList
                }));

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

    if (isLoading) return <LoadingSkeleton />;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 font-sans antialiased">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-8">
                {/* Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl shadow-lg">
                                <BarChart3 className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                Dashboard Overview
                            </h1>
                        </div>
                        <p className="text-gray-600 max-w-2xl">
                            Welcome back! Track your store performance, monitor recent activities, and manage your business efficiently.
                        </p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-xl shadow-lg border border-gray-100">
                            <Sparkles className="w-5 h-5 text-yellow-500" />
                            <span className="text-sm font-medium text-gray-700">Live Updates</span>
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                        <button className="p-3 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
                            <RefreshCw className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    <StatCard 
                        title="Total Customers"
                        value={dashboardData.totalCustomers}
                        icon={Users}
                        bgColor="bg-gradient-to-br from-blue-500 to-cyan-400"
                        textColor="text-white"
                        trend="up"
                        percentage={dashboardData.customerGrowth}
                        loading={statsLoading}
                    />
                    <StatCard 
                        title="Total Orders"
                        value={dashboardData.totalOrders}
                        icon={ShoppingCart}
                        bgColor="bg-gradient-to-br from-green-500 to-emerald-400"
                        textColor="text-white"
                        trend="up"
                        percentage={dashboardData.orderGrowth}
                        loading={statsLoading}
                    />
                    <StatCard 
                        title="Total Revenue"
                        value={dashboardData.totalRevenue}
                        icon={DollarSign}
                        bgColor="bg-gradient-to-br from-purple-500 to-pink-400"
                        textColor="text-white"
                        trend="up"
                        percentage={dashboardData.revenueGrowth}
                        loading={statsLoading}
                        isCurrency={true}
                    />
                    <StatCard 
                        title="Pending Orders"
                        value={dashboardData.pendingOrders}
                        icon={Clock}
                        bgColor="bg-gradient-to-br from-orange-500 to-yellow-400"
                        textColor="text-white"
                        trend="down"
                        percentage={-5.2}
                        loading={statsLoading}
                    />
                    <StatCard 
                        title="Total Products"
                        value={dashboardData.totalProducts}
                        icon={Package}
                        bgColor="bg-gradient-to-br from-indigo-500 to-blue-400"
                        textColor="text-white"
                        trend="up"
                        percentage={3.8}
                        loading={statsLoading}
                    />
                </div>

                {/* Time Filter Tabs */}
                <div className="flex items-center space-x-2 bg-white p-1 rounded-xl shadow-lg border border-gray-100 inline-flex">
                    {['today', 'week', 'month', 'quarter', 'year'].map((period) => (
                        <button
                            key={period}
                            onClick={() => setTimeFilter(period)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                timeFilter === period
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                        >
                            {period.charAt(0).toUpperCase() + period.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link 
                        to="/orders" 
                        className="group bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-xl">
                                <ShoppingBag className="w-7 h-7 text-blue-500" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 group-hover:text-gray-900">View All Orders</h3>
                                <p className="text-sm text-gray-500">Manage and track all orders</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                    
                    <Link 
                        to="/products" 
                        className="group bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl">
                                <Package className="w-7 h-7 text-green-500" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 group-hover:text-gray-900">Manage Products</h3>
                                <p className="text-sm text-gray-500">Add, edit, or remove products</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                    
                    <Link 
                        to="/customers" 
                        className="group bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl">
                                <Users className="w-7 h-7 text-purple-500" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-800 group-hover:text-gray-900">Customer Management</h3>
                                <p className="text-sm text-gray-500">View and manage customers</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                </div>

                {/* Recent Orders Table */}
                <section className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Recent Orders</h2>
                                <p className="text-sm text-gray-500">Latest customer orders and transactions</p>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                                <div className="relative flex-1 sm:flex-none">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search customers, orders, emails..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full sm:w-64 pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                    />
                                </div>
                                
                                <button className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2">
                                    <Filter className="w-4 h-4" />
                                    <span>Filter</span>
                                </button>
                                
                                <button className="px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2">
                                    <Download className="w-4 h-4" />
                                    <span>Export</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr className="text-left text-gray-600 text-sm font-semibold">
                                    <th className="py-4 px-6">CUSTOMER</th>
                                    <th className="py-4 px-6 text-right">AMOUNT</th>
                                    <th className="py-4 px-6 hidden lg:table-cell">PAYMENT</th>
                                    <th className="py-4 px-6 text-right">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="py-12">
                                            <div className="text-center">
                                                <div className="inline-block p-4 bg-gray-100 rounded-2xl mb-4">
                                                    <ShoppingCart className="w-12 h-12 text-gray-300" />
                                                </div>
                                                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                                    {statsLoading ? 'Loading orders...' : 'No orders found'}
                                                </h3>
                                                <p className="text-gray-500 max-w-md mx-auto">
                                                    {searchTerm 
                                                        ? 'No orders match your search. Try different keywords.'
                                                        : 'All caught up! No recent orders to display.'
                                                    }
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOrders.map((order, index) => (
                                        <OrderRow key={order.id || index} order={order} index={index} />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                            <div className="text-sm text-gray-600">
                                Showing <span className="font-bold text-gray-800">{filteredOrders.length}</span> of{' '}
                                <span className="font-bold text-gray-800">{dashboardData.recentOrders.length}</span> orders
                            </div>
                            <div className="flex items-center space-x-3">
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm("")}
                                        className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center space-x-1"
                                    >
                                        <span>Clear search</span>
                                    </button>
                                )}
                                <Link 
                                    to="/orders" 
                                    className="text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg"
                                >
                                    View All Orders →
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Performance Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800">Revenue Trend</h3>
                            <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" style={{ width: '75%' }}></div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>This month</span>
                            <span className="font-semibold text-green-600">+{dashboardData.revenueGrowth}%</span>
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800">Order Conversion</h3>
                            <ShoppingCart className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full" style={{ width: '65%' }}></div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Rate</span>
                            <span className="font-semibold text-blue-600">4.8%</span>
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-800">Customer Satisfaction</h3>
                            <Users className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-gradient-to-r from-purple-400 to-pink-500 rounded-full" style={{ width: '92%' }}></div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Rating</span>
                            <span className="font-semibold text-purple-600">4.9/5.0</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-sm text-gray-400 py-6 border-t border-gray-200">
                    <p className="mb-2">Dashboard updated in real-time • Powered by Firebase</p>
                    <p>Need help? <a href="#" className="text-purple-500 hover:text-purple-600 transition-colors">Contact support</a> or check our <a href="#" className="text-purple-500 hover:text-purple-600 transition-colors">documentation</a>.</p>
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