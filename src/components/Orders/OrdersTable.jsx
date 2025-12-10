import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
    FiSearch, 
    FiShoppingBag, 
    FiEdit, 
    FiX, 
    FiCheckCircle, 
    FiDownload, 
    FiUser, 
    FiCalendar, 
    FiDollarSign, 
    FiEye // <-- ADDED for View Details
} from 'react-icons/fi';
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
const formatAmount = (amount) => Number(amount || 0);
const formatDisplayAmount = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

/**
 * Converts Firestore Timestamp or raw date object to a human-readable string.
 */
const formatDisplayDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    let date;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else {
        try {
            date = new Date(timestamp);
            if (isNaN(date)) return 'Invalid Date';
        } catch(e) {
            return 'Invalid Date';
        }
    }
    // Format to 'Dec 10, 2025'
    return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * Keeps the original formatting for CSV export purposes.
 */
const formatFirestoreTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
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


// CSV EXPORT FUNCTIONS
const convertToCSV = (data) => {
    if (!data || data.length === 0) return '';

    const headers = [
        "Order ID", "User ID", "Customer Name", "Email", "Phone", 
        "Address", "Pincode", "Total Items Count", "Total Amount (INR)", 
        "Status", "Order Date (ISO)", "Last Updated (ISO)"
    ];

    const sanitize = (value) => {
        if (value === null || value === undefined) return '';
        let str = String(value);
        return `"${str.replace(/"/g, '""')}"`;
    };

    const csvRows = [];
    csvRows.push(headers.map(sanitize).join(','));

    for (const order of data) {
        const itemCount = Array.isArray(order.items) ? order.items.length : 0;

        const row = [
            order.orderId || order.id,
            order.userId,
            order.customer,
            order.email,
            order.phone,
            (order.address || '').replace(/\n/g, ' '),
            order.customerInfo?.pincode || '',
            itemCount,
            formatAmount(order.amount),
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


const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'];

// --- NEW STATUS BADGE COMPONENT for visual appeal ---
const StatusBadge = ({ status }) => {
    let colorClass = 'bg-gray-200 text-gray-800';
    let icon = null;

    switch (status) {
        case 'Delivered':
            colorClass = 'bg-green-100 text-green-700 font-medium';
            icon = <FiCheckCircle className="mr-1" />;
            break;
        case 'Shipped':
            colorClass = 'bg-indigo-100 text-indigo-700 font-medium';
            icon = <FiDownload className="mr-1 transform rotate-90" />;
            break;
        case 'Processing':
            colorClass = 'bg-yellow-100 text-yellow-700 animate-pulse';
            icon = <FiEdit className="mr-1" />;
            break;
        case 'Cancelled':
        case 'Refunded':
            colorClass = 'bg-red-100 text-red-700 font-medium line-through';
            icon = <FiX className="mr-1" />;
            break;
        case 'Pending':
        default:
            colorClass = 'bg-blue-100 text-blue-700';
            icon = <FiShoppingBag className="mr-1" />;
            break;
    }

    return (
        <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full shadow-sm ${colorClass}`}>
            {icon}
            {status}
        </span>
    );
};


// Status change modal (Improved styling)
const StatusChangeModal = ({ order, currentStatus, onSave, onClose }) => {
    const [newStatus, setNewStatus] = useState(currentStatus);

    const handleSave = () => {
        onSave(order.userId, order.id, newStatus);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100 opacity-100">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h3 className="text-xl font-extrabold text-gray-900 flex items-center">
                        <FiEdit className="mr-2 text-red-600" /> Change Status
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition">
                        <FiX className="w-6 h-6 text-gray-500 hover:text-gray-700" />
                    </button>
                </div>

                <div className="mb-6 space-y-3">
                    <p className="text-sm text-gray-700">Order ID: <b className="font-mono text-gray-900">{order.orderId || order.id.substring(0, 8)}</b></p>
                    <p className="text-sm text-gray-700">Customer: <b className="text-gray-900">{order.customer}</b></p>
                    
                    <div className="flex items-center text-sm text-gray-700">
                        Current Status: 
                        <span className="ml-2">
                           <StatusBadge status={currentStatus} />
                        </span>
                    </div>

                    <label className="block text-sm font-medium pt-3 text-gray-800">Select New Status:</label>
                    <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="border border-gray-300 p-3 w-full rounded-lg focus:ring-red-500 focus:border-red-500 transition shadow-sm"
                    >
                        {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button onClick={onClose} className="px-5 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={newStatus === currentStatus}
                        className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 transition font-medium shadow-md hover:shadow-lg"
                    >
                        Confirm Change
                    </button>
                </div>
            </div>
        </div>
    );
};


// MAIN COMPONENT
const OrdersTable = () => {

    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);

    // UPDATE ORDER STATUS
    const updateOrderStatus = async (userId, orderId, newStatus) => {
        if (!userId || userId === 'unknown_user') {
            alert("Error: Cannot update status. User ID missing.");
            return;
        }

        try {
            const newTimestamp = Timestamp.fromDate(new Date());
            // Firestore path to the specific order document
            const orderRef = doc(db, 'users', userId, 'orders', orderId); 
            await updateDoc(orderRef, { status: newStatus, updatedAt: newTimestamp });

            // Update local state to reflect the change
            setOrders(prev =>
                prev.map(o =>
                    o.id === orderId ? { ...o, status: newStatus, updatedAt: newTimestamp } : o
                )
            );
        } catch (err) {
            console.error("Firebase update failed:", err);
            alert("Failed to update the order status.");
        }
    };


    // FETCH ORDERS
    const fetchOrders = useCallback(async () => {
        setLoading(true);

        try {
            // Uses collectionGroup to query 'orders' subcollections across all 'users'
            const ordersGroupRef = query(collectionGroup(db, 'orders')); 
            const querySnapshot = await getDocs(ordersGroupRef);

            const ordersList = [];

            querySnapshot.docs.forEach(docSnap => {
                const rawPath = docSnap.ref.path;
                const parts = rawPath.split("/");
                const userIndex = parts.indexOf("users");

                let userId = "unknown_user";
                // Extract the user ID from the document path
                if (userIndex !== -1) userId = parts[userIndex + 1]; 

                if (userId === "unknown_user") return;

                const data = docSnap.data();
                const customerInfo = data.customerInfo || {};

                ordersList.push({
                    id: docSnap.id,
                    userId,
                    linkToDetail: `/orders/${userId}/${docSnap.id}`,
                    ...data,
                    // Standardize customer data retrieval
                    customer: data.customer || customerInfo.name || "Unknown",
                    email: data.email || customerInfo.email || "N/A",
                    phone: data.phone || customerInfo.phone || "N/A",
                    address: data.address || customerInfo.address || "N/A",
                    customerInfo
                });
            });

            // Sort by creation date (newest first)
            ordersList.sort((a, b) => {
                const tA = a.createdAt?.toDate()?.getTime() || 0;
                const tB = b.createdAt?.toDate()?.getTime() || 0;
                return tB - tA;
            });

            setOrders(ordersList);
            setFilteredOrders(ordersList);

        } catch (e) {
            console.error("Error fetching orders:", e);
        } finally {
            setLoading(false);
        }

    }, []);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);


    // SEARCH Filter Logic
    useEffect(() => {
        if (!searchTerm) return setFilteredOrders(orders);

        const s = searchTerm.toLowerCase();

        const f = orders.filter(o =>
            [
                o.customer,
                o.email,
                o.phone,
                o.address,
                o.id,
                o.customerInfo?.pincode,
                o.status
            ]
                .filter(Boolean)
                .some(v => v.toString().toLowerCase().includes(s))
        );

        setFilteredOrders(f);
    }, [searchTerm, orders]);


    // CSV DOWNLOAD
    const handleDownloadReport = () => {
        if (!filteredOrders.length) return alert("No orders to download.");

        const csv = convertToCSV(filteredOrders);
        const date = new Date().toISOString().slice(0, 10);
        triggerDownload(csv, `Orders_Report_${date}.csv`);
    };


    // ============================================
    // UPDATED ORDER ROW Component
    // ============================================
    const OrderRow = ({ order }) => {

        const navigate = useNavigate();

        const initials = (order.customer || 'O')
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase();

        const handleRowClick = () => navigate(order.linkToDetail);

        return (
            <tr
                className="border-b border-gray-100 hover:bg-red-50/50 cursor-pointer transition duration-150 ease-in-out"
                onClick={handleRowClick}
            >

                {/* CUSTOMER & ID */}
                <td className="p-4 text-sm flex items-center">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-md font-semibold mr-3 shadow-md"
                        style={{ background: "#ef4444" }} // Red-600
                    >
                        {initials}
                    </div>
                    <div>
                        <div className="font-semibold text-gray-900">{order.customer}</div>
                        <div className="text-xs text-gray-500 font-mono">#{order.id.substring(0, 8)}</div>
                    </div>
                </td>

                {/* CONTACT */}
                <td className="p-4 text-xs text-gray-600">
                    <div className='flex items-center space-x-1'><span className='text-red-500'>&#9993;</span><span>{order.email}</span></div>
                    <div className='flex items-center space-x-1'><span className='text-red-500'>&#9742;</span><span>{order.phone}</span></div>
                </td>

                {/* ADDRESS */}
                <td className="p-4 text-xs text-gray-600 max-w-xs">{order.address}</td>

                {/* ITEMS */}
                <td className="p-4 text-sm font-medium text-gray-700">
                    {Array.isArray(order.items) ? `${order.items.length}` : "0"} <span className='text-gray-500'>items</span>
                </td>

                {/* STATUS BADGE & BUTTON */}
                <td className="p-4">
                    <div
                         onClick={(e) => {
                            e.stopPropagation(); 
                            setSelectedOrder(order);
                        }}
                        className='inline-block' 
                    >
                        <StatusBadge status={order.status || "Pending"} />
                    </div>
                </td>

                {/* AMOUNT */}
                <td className="p-4 text-red-600 font-extrabold text-md">
                    {formatDisplayAmount(order.amount)}
                </td>

                {/* DATE */}
                <td className="p-4 text-xs text-gray-500">
                    <div className='flex items-center'>
                       <FiCalendar className="mr-1 text-gray-400" />
                       {formatDisplayDate(order.createdAt)}
                    </div>
                </td>

                {/* VIEW DETAILS BUTTON (Now using FiEye) */}
                <td className="p-4 text-center">
                    <button
                        onClick={(e) => {
                            e.stopPropagation(); 
                            navigate(order.linkToDetail);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full transition"
                        title="View Order Details"
                    >
                        <FiEye className='w-4 h-4' /> {/* The desired 'View' icon */}
                    </button>
                </td>
            </tr>
        );
    };


    // UI RENDER
    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-96 bg-white rounded-xl shadow-lg m-6">
                <div className="animate-spin h-10 w-10 border-4 border-red-600 border-t-transparent rounded-full mb-4"></div>
                <p className="text-lg font-medium text-gray-700">Fetching all orders...</p>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">

            {selectedOrder && (
                <StatusChangeModal
                    order={selectedOrder}
                    currentStatus={selectedOrder.status}
                    onSave={updateOrderStatus}
                    onClose={() => setSelectedOrder(null)}
                />
            )}

            <div className="bg-white p-8 rounded-xl shadow-2xl">

                {/* HEADER */}
                <div className="flex justify-between items-center pb-6 border-b border-gray-200 mb-6">
                    <h2 className="text-3xl font-extrabold text-gray-900 flex items-center">
                        <FiShoppingBag className="mr-3 text-red-600" />
                        Order Management 
                        <span className="text-red-600 ml-2">({orders.length})</span>
                    </h2>

                    <button
                        onClick={handleDownloadReport}
                        className="bg-red-600 text-white px-5 py-2.5 rounded-lg flex items-center text-sm font-medium hover:bg-red-700 transition shadow-md"
                    >
                        <FiDownload className="mr-2" />
                        Download Report
                    </button>
                </div>

                {/* SEARCH */}
                <div className="mb-6 relative">
                    <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by customer name, order ID, status, or contact..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="border border-gray-300 rounded-lg w-full p-3 pl-12 text-gray-700 focus:ring-red-500 focus:border-red-500 transition shadow-sm"
                    />
                </div>


                {/* TABLE */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {['Customer/ID', 'Contact Info', 'Shipping Address', 'Qty', 'Status', 'Total Amount', 'Order Date', 'Details'].map(h => (
                                    <th key={h} className="p-4 text-left text-xs font-semibold uppercase text-gray-500 tracking-wider">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map(order => (
                                    <OrderRow key={`${order.userId}-${order.id}`} order={order} />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="text-center p-12 text-lg text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <FiX className="w-8 h-8 text-red-400 mb-2" />
                                            No orders match your search criteria.
                                        </div>
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