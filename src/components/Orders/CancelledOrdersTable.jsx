// CancelledOrdersTable.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiXCircle, FiShoppingBag, FiTruck, FiClock, FiCheckCircle } from 'react-icons/fi';
import { collection, getDocs, query, where } from 'firebase/firestore'; // Import Firestore functions
import { db } from '../../../firerbase'; // Assuming correct path to Firebase config

// --- Shared Helper Functions ---
const formatAmount = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

const formatFirestoreTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate) {
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    }
    return new Date(timestamp).toLocaleDateString('en-IN');
};

const getItemDisplay = (items) => {
    if (!items) return 'No items';
    if (Array.isArray(items)) {
        return `${items.length} item(s)`;
    }
    if (typeof items === 'string') {
        return items.substring(0, 50) + '...';
    }
    return 'View Details';
};

// --- OrderRow Component (Reusable) ---
const OrderRow = ({ order }) => {
    const initials = (order.customer || 'O').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const contactInfo = `${order.email || 'N/A'}\n${order.phone || 'N/A'}`;
    const avatarColor = ['#d946ef', '#10b981', '#3b82f6'][order.id.length % 3]; 

    const itemsDisplay = getItemDisplay(order.items);

    const displayDate = order.date || order.createdAt;
    const formattedDate = displayDate ? formatFirestoreTimestamp(displayDate) : 'N/A';
    
    const getStatusStyles = (status) => {
        switch(status) {
            case 'Delivered':
            case 'success':
                return 'bg-green-100 text-green-700 border border-green-300';
            case 'Processing':
            case 'Pending':
                return 'bg-yellow-100 text-yellow-700 border border-yellow-300';
            case 'Shipped':
                return 'bg-blue-100 text-blue-700 border border-blue-300';
            case 'Cancelled':
                return 'bg-red-100 text-red-700 border border-red-300';
            default:
                return 'bg-gray-100 text-gray-700 border border-gray-300';
        }
    };

    return (
        <tr className="border-b hover:bg-gray-50 transition-colors">
            <td className="p-4 text-sm font-semibold text-gray-800 flex items-center">
                <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white mr-3 text-xs"
                    style={{ backgroundColor: avatarColor }}
                >
                    {initials}
                </div>
                <div>
                    <div>{order.customer}</div>
                    {order.orderId && (
                        <div className="text-xs text-gray-500 font-mono mt-1">#{order.orderId}</div>
                    )}
                </div>
            </td>
            <td className="p-4 text-xs text-gray-600 whitespace-pre-line">{contactInfo}</td>
            <td className="p-4 text-xs text-gray-600">
                <div className="whitespace-pre-line">{order.address || 'N/A'}</div>
                {order.customerInfo?.pincode && (
                    <div className="text-xs text-gray-500 mt-1">Pincode: {order.customerInfo.pincode}</div>
                )}
            </td>
            <td className="p-4 text-xs text-gray-600">{itemsDisplay}</td>
            <td className="p-4 font-bold text-green-600 text-sm">
                {formatAmount(order.amount || 0)}
                {order.status && (
                    <div className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${getStatusStyles(order.status)}`}>
                        {order.status}
                    </div>
                )}
            </td>
            <td className="p-4 text-xs text-gray-500">{formattedDate}</td>
            <td className="p-4">
                <Link 
                    to={`/orders/${order.id}`} 
                    className="px-3 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded transition-colors shadow-md inline-block text-center"
                >
                    View Details
                </Link>
            </td>
        </tr>
    );
};

// --- Main Component ---
export const CancelledOrdersTable = () => {
    // const initialOrdersData = ... // REMOVE SAMPLE DATA
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            setError(null);
            try {
                const ordersRef = collection(db, 'orders');
                // Filter by 'Cancelled' status
                const q = query(ordersRef, where('status', '==', 'Cancelled')); 
                
                const querySnapshot = await getDocs(q);
                
                const ordersList = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    const customerInfo = data.customerInfo || {};

                    return {
                        id: doc.id,
                        ...data,
                        customer: data.customer || customerInfo.name || 'Unknown Customer',
                        email: data.email || customerInfo.email || 'N/A',
                        phone: data.phone || customerInfo.phone || 'N/A',
                        address: data.address || 
                            `${customerInfo.address || ''}, ${customerInfo.city || ''} - ${customerInfo.pincode || ''}`.replace(/^,\s*/, '')
                    };
                });
                
                setOrders(ordersList);
                setFilteredOrders(ordersList);
            } catch (err) {
                console.error("Error fetching cancelled orders:", err);
                setError("Failed to load cancelled orders. Check Firebase connection/permissions.");
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []); 

    useEffect(() => {
        // Search logic remains the same, but operates on live data
        if (searchTerm === '') {
            setFilteredOrders(orders);
            return;
        }

        const lowerCaseSearch = searchTerm.toLowerCase();
        const result = orders.filter(order => {
            const searchFields = [
                order.customer, order.email, order.phone, order.address, 
                order.orderId || order.id, 
                JSON.stringify(order.items)
            ].join(' ').toLowerCase();
            
            return searchFields.includes(lowerCaseSearch);
        });
        setFilteredOrders(result);
    }, [searchTerm, orders]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-xl p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                <p className="ml-4 text-gray-700 font-medium">Loading Cancelled Orders...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-full mx-auto mt-4">
                <strong className="font-bold">Error!</strong>
                <span className="block sm:inline ml-2">{error}</span>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 lg:p-8 bg-white min-h-screen">
            <div className="orders-container bg-white rounded-lg shadow-xl p-6 border border-gray-200">
                
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-red-700 flex items-center">
                        <FiXCircle className="w-5 h-5 mr-2 text-red-600" /> 
                        Cancelled Orders ({orders.length})
                    </h2>
                    <button className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md">
                        Download Report
                    </button>
                </div>

                <div className="mt-4 mb-6 relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search name, email, phone, address, order ID, or items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-2/3 md:w-1/2 p-3 pl-10 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 transition-colors text-sm bg-white text-gray-900"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                {['CUSTOMER', 'CONTACT', 'ADDRESS', 'ITEMS', 'AMOUNT', 'DATE', 'ACTIONS'].map(header => (
                                    <th
                                        key={header}
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"
                                    >
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map(order => <OrderRow key={order.id} order={order} />)
                            ) : (
                                <tr>
                                    <td colSpan="7" className="p-6 text-center text-gray-500">
                                        <FiXCircle className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                        <p>
                                            {searchTerm 
                                                ? "No cancelled orders found matching your search term." 
                                                : "No cancelled orders available in the database."
                                            }
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};