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
    LogOut 
} from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error, info) {
        console.error("Dashboard Error:", error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h2>
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

const StatCard = ({ title, value, icon: Icon, bgColor, textColor, statusText, statusColor, badgeIcon: BadgeIcon }) => (
    <div className={`p-4 ${bgColor} rounded-xl shadow-md flex flex-col justify-between h-32`}>
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
    </div>
);

const OrderRow = ({ order }) => (
    <tr className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
        <td className="py-3 px-2">
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
                    {order.name.charAt(0).toUpperCase()}
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
            <button className="bg-purple-500 text-white text-sm px-3 py-1 rounded-lg hover:bg-purple-600 transition-colors shadow">
                View Details
            </button>
        </td>
    </tr>
);

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

const recentOrdersData = [
    { name: "Naveen", email: "tarapur.naveen@gmail.com", phone: "9093778333", amount: "₹444", items: 1, date: "13/11/2025" },
    { name: "Dashrath Yadav", email: "dashrathkumarbdg2000@gmail.com", phone: "7415090947", amount: "₹250", items: 1, date: "13/11/2025" },
    { name: "Dashrath Yadav", email: "dashrathkumarbdg2000@gmail.com", phone: "7415090947", amount: "₹78,000", items: 1, date: "12/11/2025" },
    { name: "Dashrath Yadav", email: "dashrathkumarbdg2000@gmail.com", phone: "7415090947", amount: "₹3,530", items: 1, date: "12/11/2025" },
    { name: "Dashrath Yadav", email: "dashrathkumarbdg2000@gmail.com", phone: "7415090947", amount: "₹450", items: 1, date: "10/11/2025" },
    { name: "Parmesh", email: "parmeshkumarbdg2000@gmail.com", phone: "7415090944", amount: "₹450", items: 1, date: "10/11/2025" },
    { name: "Amit Sharma", email: "amit.sharma@example.com", phone: "9876543210", amount: "₹1,200", items: 3, date: "09/11/2025" },
    { name: "Priya Singh", email: "priya.singh@example.com", phone: "9000011111", amount: "₹850", items: 2, date: "08/11/2025" },
    { name: "Ravi Kumar", email: "ravi.kumar@test.com", phone: "8765432109", amount: "₹5,100", items: 5, date: "07/11/2025" }
];

function AdminDashboardContent() {
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filteredOrders, setFilteredOrders] = useState(recentOrdersData);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 1500);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        const filtered = recentOrdersData.filter(order =>
            order.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.phone.includes(searchTerm) ||
            order.amount.includes(searchTerm)
        );
        setFilteredOrders(filtered);
    }, [searchTerm]);

    if (isLoading) return <LoadingSkeleton />;

    return (
        <div className="w-full bg-gray-100 font-sans antialiased"><main className="w-full max-w-7xl mx-auto p-4 md:p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900">Admin Dashboard</h1>
                    <p className="text-sm text-gray-500">Welcome back! Here's an overview of your store's performance.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <StatCard title="Total Customers" value="12" icon={Users} bgColor="bg-blue-100" textColor="text-blue-600" statusText="• Active Users" statusColor="text-green-500" badgeIcon={Menu} />
                    <StatCard title="Total Orders" value="21" icon={ShoppingCart} bgColor="bg-green-100" textColor="text-green-600" statusText="• All Time" statusColor="text-gray-500" badgeIcon={Box} />
                    <StatCard title="Total Revenue" value="₹94,712" icon={DollarSign} bgColor="bg-purple-100" textColor="text-purple-600" statusText="• This Month" statusColor="text-green-500" badgeIcon={ChevronDown} />
                    <StatCard title="Pending Orders" value="1" icon={Clock} bgColor="bg-yellow-100" textColor="text-yellow-600" statusText="• Needs Action" statusColor="text-red-500" badgeIcon={Clock} />
                    <StatCard title="Total Products" value="15" icon={Box} bgColor="bg-indigo-100" textColor="text-indigo-600" statusText="• Active Products" statusColor="text-green-500" badgeIcon={Box} />
                </div>

                <section className="bg-white p-4 rounded-xl shadow-lg mt-2 h-[60vh] overflow-y-auto">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <h2 className="text-xl font-semibold text-gray-800">Recent Orders</h2>
                        <div className="flex items-center space-x-2 border rounded-full px-3 py-1 bg-gray-50 w-full sm:w-auto">
                            <Search className="w-4 h-4 text-gray-400" />
                            <input type="text" placeholder="Search name, phone, or amount..." className="bg-transparent focus:outline-none text-sm w-full" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm("")} className="text-gray-500 hover:text-gray-700 p-1"><X className="w-4 h-4" /></button>
                            )}
                        </div>
                    </div>

                    <div className="w-full overflow-x-auto">
                        <table className="min-w-full text-left">
                            <thead className="text-gray-500 text-sm font-medium border-b bg-white sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="py-3 px-2 min-w-[200px]">CUSTOMER INFO</th>
                                    <th className="py-3 px-2 min-w-[120px]">ITEMS & AMOUNT</th>
                                    <th className="py-3 px-2 min-w-[120px]">PAYMENT DATE</th>
                                    <th className="py-3 px-2 min-w-[100px]">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.length === 0 ? (
                                    <tr><td colSpan="4" className="text-center py-8 text-gray-500">No orders found.</td></tr>
                                ) : (
                                    filteredOrders.map((order, index) => <OrderRow key={index} order={order} />)
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t text-sm text-gray-600">
                        <div>Showing <span className="font-semibold">{filteredOrders.length}</span> of <span className="font-semibold">{recentOrdersData.length}</span> total orders</div>
                        {searchTerm && <button onClick={() => setSearchTerm("")} className="text-purple-600 hover:text-purple-800">Clear search</button>}
                    </div>
                </section>
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
