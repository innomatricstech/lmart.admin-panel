import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiShoppingBag, FiEdit, FiX, FiCheckCircle, FiDownload } from 'react-icons/fi';
import {
    collectionGroup,
    query,
    getDocs,
    doc,
    updateDoc,
    Timestamp
} from 'firebase/firestore'; 
import { db } from '../../../firerbase'; 


// --- Helper Functions ---
const formatAmount = (amount) => Number(amount || 0); // Use raw number for CSV calculation/formatting
const formatDisplayAmount = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const formatFirestoreTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Prioritize ISO string for export/unambiguous dating
    if (timestamp.toDate) {
        return timestamp.toDate().toISOString(); 
    }
    try {
        const date = new Date(timestamp);
        if (!isNaN(date)) {
            return date.toISOString();
        }
    } catch(e) {
        return 'Invalid Date';
    }
    return 'N/A';
};

// ===================================
// ⚙️ NEW FUNCTION: CSV EXPORT LOGIC
// ===================================
const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';

    // 1. Define Headers
    const headers = [
        "Order ID", "User ID", "Customer Name", "Email", "Phone", 
        "Address", "Pincode", "Total Items Count", "Total Amount (INR)", 
        "Status", "Order Date (ISO)", "Last Updated (ISO)"
    ];
    
    // Simple utility to sanitize data for CSV (removes commas, double quotes)
    const sanitize = (value) => {
        if (value === null || value === undefined) return '';
        let str = String(value);
        return `"${str.replace(/"/g, '""')}"`;
    };

    const csvRows = [];
    
    // Add headers row
    csvRows.push(headers.map(sanitize).join(','));

    // 2. Map data rows
    for (const order of data) {
        // Safely extract item count
        const itemCount = Array.isArray(order.items) ? order.items.length : 0;
        
        const row = [
            order.orderId || order.id,
            order.userId,
            order.customer,
            order.email,
            order.phone,
            order.address.replace(/\n/g, ' '), // Remove newlines from address
            order.customerInfo?.pincode || '',
            itemCount,
            formatAmount(order.amount), // Use the raw amount number here
            order.status || 'Pending',
            formatFirestoreTimestamp(order.createdAt || order.date),
            formatFirestoreTimestamp(order.updatedAt || order.createdAt || order.date),
        ];
        
        csvRows.push(row.map(sanitize).join(','));
    }

    return csvRows.join('\n');
};

const triggerDownload = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
// --- End CSV Export Logic ---


const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'];

// --- Modal Component (No change, repeated for completeness) ---
const StatusChangeModal = ({ order, currentStatus, onSave, onClose }) => {
    const [newStatus, setNewStatus] = useState(currentStatus);

    const handleSave = () => {
        onSave(order.userId, order.id, newStatus);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center">
                        <FiEdit className="mr-2 text-red-500" /> Change Status for Order #{order.orderId || order.id.substring(0, 6)}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <FiX className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-2">
                        Customer: <span className="font-semibold text-gray-800">{order.customer}</span>
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                        Current Status: <span className="font-bold text-red-600">{currentStatus}</span>
                    </p>

                    <label htmlFor="newStatus" className="block text-sm font-medium text-gray-700 mb-2">
                        Select New Status:
                    </label>
                    <select
                        id="newStatus"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md shadow-sm border"
                    >
                        {ORDER_STATUSES.map(status => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={newStatus === currentStatus}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-md ${
                            newStatus === currentStatus
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700'
                        }`}
                    >
                        <FiCheckCircle className="inline w-4 h-4 mr-1" /> Confirm Change
                    </button>
                </div>
            </div>
        </div>
    );
};


// ===================================
// 📦 Main Component: OrdersTable
// ===================================
const OrdersTable = () => {
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null); 

    // Status Update Logic (unchanged)
    const updateOrderStatus = async (userId, orderId, newStatus) => {
        // ... (existing update logic) ...
        if (!userId || userId === 'unknown_user') {
            console.error(`Attempted update failed: Missing or invalid userId for order ${orderId}.`);
            alert("Error: Cannot update order status. User ID is invalid/missing (Likely a Legacy Order).");
            return;
        }
        
        const currentOrder = orders.find(o => o.id === orderId && o.userId === userId);
        if (!currentOrder || newStatus === currentOrder.status) return;
        
        const oldStatus = currentOrder.status;
        const oldUpdatedAt = currentOrder.updatedAt;

        try {
            const newTimestamp = Timestamp.fromDate(new Date());

            const updatedOrders = orders.map(order => 
                order.id === orderId && order.userId === userId 
                    ? { ...order, status: newStatus, updatedAt: newTimestamp } 
                    : order
            );
            setOrders(updatedOrders);
            
            const orderRef = doc(db, 'users', userId, 'orders', orderId);
            await updateDoc(orderRef, {
                status: newStatus,
                updatedAt: newTimestamp
            });
            
            console.log(`Order ${orderId} status updated to: ${newStatus}`);
        } catch (error) {
            console.error("Error updating order status:", error);
            alert("Failed to update status. Check console for details and refresh."); 
            setOrders(prevOrders => prevOrders.map(order => 
                order.id === orderId && order.userId === userId 
                    ? { ...order, status: oldStatus, updatedAt: oldUpdatedAt } 
                    : order
            ));
        }
    };


    // Data Fetching Logic (unchanged)
    const fetchOrders = useCallback(async () => {
        setLoading(true);
        if (!db) {
            console.error("Firebase DB is not initialized.");
            setLoading(false);
            return;
        }
        
        try {
            const ordersGroupRef = query(collectionGroup(db, 'orders'));
            const querySnapshot = await getDocs(ordersGroupRef);
            
            const ordersList = []; 
            
            querySnapshot.docs.forEach(doc => {
                
                const rawPath = doc.ref.path;
                const pathSegments = rawPath.replace(/^\/|\/$/g, '').split('/');
                
                let userId = 'unknown_user'; 

                const usersIndex = pathSegments.indexOf('users');
                
                if (usersIndex !== -1 && pathSegments.length > usersIndex + 1) {
                    userId = pathSegments[usersIndex + 1];
                }
                
                if (userId === 'unknown_user') {
                    return; 
                }

                const orderData = doc.data();
                const customerInfo = orderData.customerInfo || {};
                
                const fullAddress = orderData.address || 
                    [customerInfo.address, customerInfo.city]
                        .filter(Boolean)
                        .join(', ') || 'N/A';
                
                ordersList.push({
                    id: doc.id,
                    userId: userId, 
                    linkToDetail: `/orders/${userId}/${doc.id}`, 
                    ...orderData,
                    customer: orderData.customer || customerInfo.name || 'Unknown Customer',
                    email: orderData.email || customerInfo.email || 'N/A',
                    phone: orderData.phone || customerInfo.phone || 'N/A',
                    address: fullAddress,
                    customerInfo: customerInfo // Keep customerInfo for pincode export
                });
            });
            
            ordersList.sort((a, b) => {
                const dateA = (a.createdAt || a.date)?.toDate ? (a.createdAt || a.date).toDate().getTime() : 0;
                const dateB = (b.createdAt || b.date)?.toDate ? (b.createdAt || a.date).toDate().getTime() : 0;
                return dateB - dateA;
            });

            setOrders(ordersList);
            setFilteredOrders(ordersList); 
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    // Search and Filter logic (unchanged)
    useEffect(() => {
        if (searchTerm === '') {
            setFilteredOrders(orders);
            return;
        }

        const lowerCaseSearch = searchTerm.toLowerCase();
        const result = orders.filter(order => {
            const searchFields = [
                order.customer, order.email, order.phone, order.address, 
                order.orderId, order.id, order.customerInfo?.name, 
                order.customerInfo?.city, order.customerInfo?.pincode,
                (typeof order.items === 'string' ? order.items : JSON.stringify(order.items || ''))
            ];
            
            return searchFields.some(field => field && field.toString().toLowerCase().includes(lowerCaseSearch));
        });
        setFilteredOrders(result);
    }, [searchTerm, orders]);

    // ===================================
    // ⬇️ New Download Handler
    // ===================================
    const handleDownloadReport = () => {
        if (filteredOrders.length === 0) {
            alert("No orders to download in the current view.");
            return;
        }
        
        const csvContent = convertToCSV(filteredOrders);
        const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const filename = `Orders_Report_${date}.csv`;
        
        triggerDownload(csvContent, filename);
    };


    // --- OrderRow Component (unchanged) ---
    const OrderRow = ({ order }) => {
        const initials = (order.customer || 'O').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        const contactInfo = `${order.email || 'N/A'}\n${order.phone || 'N/A'}`;
        const avatarColor = ['#d946ef', '#10b981', '#3b82f6'][order.id.length % 3]; 

        const itemsDisplay = order.items 
            ? (Array.isArray(order.items) 
                ? `${order.items.length} item(s)` 
                : (typeof order.items === 'string' ? order.items.substring(0, 50) + '...' : 'View Details'))
            : 'No items';

        const displayDate = order.date || order.createdAt;
        const formattedDate = displayDate 
            ? formatFirestoreTimestamp(displayDate) 
            : 'N/A';
        
        const getStatusStyles = (status) => {
            if (status === 'Delivered') return 'bg-green-100 border-green-300 text-green-700';
            if (status === 'Cancelled' || status === 'Refunded') return 'bg-red-100 border-red-300 text-red-700';
            if (status === 'Shipped') return 'bg-blue-100 border-blue-300 text-blue-700';
            if (status === 'Processing') return 'bg-yellow-100 border-yellow-300 text-yellow-700';
            return 'bg-gray-100 border-gray-300 text-gray-700';
        };

        const isUnupdatable = order.userId === 'unknown_user'; 

        return (
            <tr className="border-b hover:bg-gray-50 transition-colors">
                <td className="p-4 text-sm font-semibold text-gray-800 flex items-center">
                    <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white mr-3 text-xs flex-shrink-0"
                        style={{ backgroundColor: avatarColor }}
                    >
                        {initials}
                    </div>
                    <div>
                        <div>{order.customer}</div>
                        {order.orderId && (
                            <div className="text-xs text-gray-500 font-mono mt-1">
                                ID: #{order.orderId}
                            </div>
                        )}
                        <div className="text-xs text-gray-400 font-mono italic">
                            User: {order.userId.substring(0, 6)}...
                        </div>
                    </div>
                </td>

                <td className="p-4 text-xs text-gray-600 whitespace-pre-line">
                    {contactInfo}
                </td>

                <td className="p-4 text-xs text-gray-600">
                    <div className="whitespace-pre-line">
                        {order.address || 'N/A'}
                    </div>
                    {order.customerInfo?.pincode && (
                        <div className="text-xs text-gray-500 mt-1">
                            Pincode: {order.customerInfo.pincode}
                        </div>
                    )}
                </td>

                <td className="p-4 text-xs text-gray-600">
                    {itemsDisplay}
                </td>
                
                <td className="p-4 text-xs text-gray-600">
                    <button
                        onClick={() => setSelectedOrder(order)}
                        disabled={isUnupdatable}
                        className={`p-1 text-sm border rounded shadow-sm hover:shadow-md transition-all flex items-center ${getStatusStyles(order.status)}
                            ${isUnupdatable ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-opacity-75'}
                        `}
                        title={isUnupdatable ? 'Cannot update: User ID missing' : 'Click to change status'}
                    >
                        <FiEdit className="w-3 h-3 mr-1" />
                        {order.status || 'Pending'}
                    </button>
                </td>

                <td className="p-4 font-bold text-green-600 text-sm">
                    {formatDisplayAmount(order.amount || 0)}
                </td>

                <td className="p-4 text-xs text-gray-500">
                    {formattedDate}
                </td>

                <td className="p-4">
                    <Link 
                        to={order.linkToDetail} 
                        className="px-3 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded transition-colors shadow-md inline-block text-center"
                    >
                        View Details
                    </Link>
                </td>
            </tr>
        );
    };
    // --- End OrderRow Component ---

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-xl p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                <p className="ml-4 text-gray-700 font-medium">Loading Orders...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
            {selectedOrder && (
                <StatusChangeModal
                    order={selectedOrder}
                    currentStatus={selectedOrder.status || 'Pending'}
                    onSave={updateOrderStatus}
                    onClose={() => setSelectedOrder(null)}
                />
            )}
            
            <div className="orders-container bg-white rounded-lg shadow-xl p-6 border border-gray-200">
                
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-red-700 flex items-center">
                        <FiShoppingBag className="w-5 h-5 mr-2 text-red-600" /> 
                        All Orders ({orders.length})
                    </h2>
                    {/* BUTTON: Integrated the download handler */}
                    <button 
                        onClick={handleDownloadReport}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md"
                    >
                        <FiDownload className="w-4 h-4" /> Download Orders CSV
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
                                {['CUSTOMER', 'CONTACT', 'ADDRESS', 'ITEMS', 'STATUS', 'AMOUNT', 'DATE', 'ACTIONS'].map(header => (
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
                                filteredOrders.map(order => <OrderRow key={`${order.userId}-${order.id}`} order={order} />)
                            ) : (
                                <tr>
                                    <td colSpan="8" className="p-6 text-center text-gray-500">
                                        <FiShoppingBag className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                        <p>
                                            {searchTerm 
                                                ? "No orders found matching your search term." 
                                                : "No orders available in the database."
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

export default OrdersTable;