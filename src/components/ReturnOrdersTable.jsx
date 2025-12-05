// ReturnOrdersTable.jsx

import React, { useState, useEffect } from 'react';
import { FiSearch, FiArchive, FiClock, FiFileText } from 'react-icons/fi';
import { collectionGroup, getDocs, query } from 'firebase/firestore';
import { db } from "../../firerbase";

/* ------------------------------------
    Helper Functions
------------------------------------ */

// Helper to format currency (Indian Rupees)
const formatAmount = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

// Helper to format date from Firestore Timestamp
const formatFirestoreTimestamp = (timestamp) => {
    if (!timestamp) return "N/A";
    if (typeof timestamp.toDate === "function") {
        return timestamp
            .toDate()
            .toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
    }
    const d = new Date(timestamp);
    return !isNaN(d)
        ? d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
        : "Invalid Date";
};

// Enhanced color styles for Return Action Chip
const getActionStyles = (action) => {
    switch (action?.toLowerCase()) {
        case 'approved':
            return 'bg-green-100 text-green-700 border-green-300';
        case 'processed':
            return 'bg-blue-100 text-blue-700 border-blue-300';
        case 'pending':
            return 'bg-yellow-100 text-yellow-700 border-yellow-300';
        case 'rejected':
            return 'bg-red-100 text-red-700 border-red-300';
        default:
            return 'bg-gray-100 text-gray-700 border-gray-300';
    }
};

// Component for the Return Action Tag
const ReturnActionChip = ({ action }) => {
    const classes = getActionStyles(action);
    return (
        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${classes} shadow-sm min-w-[100px] text-center`}>
            {action || 'Unknown'}
        </span>
    );
};


/* ------------------------------------
    Main Component
------------------------------------ */
export default function ReturnOrdersTable() {
    const [searchTerm, setSearchTerm] = useState('');
    const [returnOrders, setReturnOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // -------------------------------------------------------
    // FETCH RETURN (REFUNDED) ORDERS FROM FIREBASE
    // -------------------------------------------------------
    useEffect(() => {
        const fetchReturnOrders = async () => {
            try {
                // Using collectionGroup to query 'orders' subcollections across all users
                const ordersQuery = query(
                    collectionGroup(db, "orders"),
                );
                const snapshot = await getDocs(ordersQuery);

                const returnsList = [];

                snapshot.forEach((doc) => {
                    const data = doc.data();

                    // ⭐ ONLY SHOW REFUNDED ORDERS (Case-insensitive check added for robustness)
                    if (data.status?.toLowerCase() === "refunded") {

                        const path = doc.ref.path.split("/");
                        const userId = path[1] ?? "unknown_user";
                        const customerInfo = data.customerInfo || {};

                        returnsList.push({
                            firestoreId: doc.id,
                            userId,
                            ...data,
                            customer: customerInfo.name || data.customer || 'Unknown Customer',
                            email: customerInfo.email || data.email || 'N/A',
                            phone: customerInfo.phone || data.phone || 'N/A',
                            address: customerInfo.address || data.address || 'N/A',
                            reason: data.reason || "No reason provided", // <-- REASON IS FETCHED HERE
                            returnAction: data.returnAction || "Processed", 
                            amount: data.amount || 0,
                            items: Array.isArray(data.items)
                                ? data.items.map(i => `${i.quantity} × ${i.name}`).join("\n")
                                : (typeof data.items === 'string' ? data.items : "N/A"),
                            date: formatFirestoreTimestamp(data.createdAt || data.date),
                            createdAt: data.createdAt, 
                        });
                    }
                });

                // Sort by newest return date (descending)
                returnsList.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
                    const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
                    return dateB - dateA; // Newest first
                });

                setReturnOrders(returnsList);
            } catch (err) {
                console.error("Error fetching return orders:", err);
            }

            setLoading(false);
        };

        fetchReturnOrders();
    }, []);

    // -------------------------------------------------------
    // SEARCH FILTER
    // -------------------------------------------------------
    const filteredOrders = returnOrders.filter(order =>
        order.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.phone?.includes(searchTerm) ||
        order.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.firestoreId?.includes(searchTerm)
    );

    // -------------------------------------------------------
    // TABLE ROW
    // -------------------------------------------------------
    const ReturnOrderRow = ({ order }) => {
        const initials = order.customer?.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
        const avatarColor = ['#7c3aed', '#f97316', '#10b981'][order.firestoreId.length % 3];

        return (
            <tr className="border-b border-gray-100 group hover:bg-gradient-to-r from-purple-50/50 to-white transition-all duration-200">
                
                {/* CUSTOMER */}
                <td className="p-4 text-sm font-semibold text-gray-800 flex items-center min-w-[200px]">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white mr-4 text-sm font-bold shadow-md ring-2 ring-gray-100"
                        style={{ backgroundColor: avatarColor, backgroundImage: `linear-gradient(45deg, ${avatarColor}, ${avatarColor}B0)` }}
                    >
                        {initials}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{order.customer}</span>
                        <span className="text-xs text-gray-400 font-medium mt-0.5" title={order.firestoreId}>
                            Order ID: {order.firestoreId.substring(0, 8)}...
                        </span>
                    </div>
                </td>

                {/* CONTACT */}
                <td className="p-4 text-xs text-gray-600 min-w-[150px]">
                    <p className="font-medium text-gray-700 truncate" title={order.email}>{order.email}</p>
                    <p className="text-gray-500 mt-0.5">{order.phone}</p>
                </td>

                {/* ADDRESS */}
                <td className="p-4 text-xs text-gray-500 max-w-[250px] min-w-[200px] truncate" title={order.address}>
                    {order.address}
                </td>

                {/* ITEMS */}
                <td className="p-4 text-xs text-gray-500 whitespace-pre-line font-mono max-w-[150px]">
                    <div className='max-h-12 overflow-hidden text-ellipsis'>
                        {order.items}
                    </div>
                </td>

                {/* AMOUNT (Refunded) */}
                <td className="p-4 font-extrabold text-red-600 text-lg min-w-[100px]">
                    {formatAmount(order.amount)}
                </td>

                {/* 🔴 REASON: THIS IS WHERE THE RETURN REASON IS DISPLAYED 🔴 */}
                {/* <td className="p-4 text-xs text-gray-700 max-w-xs min-w-[200px]">
                    <div className='max-h-12 overflow-hidden text-ellipsis italic'>
                        "{order.reason}" 
                    </div>
                </td> */}

                {/* DATE */}
                <td className="p-4 text-xs text-gray-500 font-medium min-w-[100px]">
                    {order.date}
                </td>

                {/* RETURN ACTION */}
                <td className="p-4 min-w-[120px]">
                    <ReturnActionChip action={order.returnAction} />
                </td>
            </tr>
        );
    };

    // -------------------------------------------------------
    // RENDER UI
    // -------------------------------------------------------
    return (
        <div className="flex-1 p-4 lg:p-8 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen font-sans">
            <div className="orders-container bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">

                {/* Header & Actions */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-gray-100 bg-white">
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center mb-3 md:mb-0">
                        <FiArchive className="w-6 h-6 mr-3 text-purple-600" /> Return Orders
                        <span className="ml-3 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                            {returnOrders.length} Total
                        </span>
                    </h2>

                    {/* <button className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center space-x-2">
                        <FiFileText className="w-4 h-4" />
                        <span>Export Returns</span>
                    </button> */}
                </div>

                {/* Search */}
                <div className="p-6 pt-4 relative border-b border-gray-100">
                    <FiSearch className="absolute left-9 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search customer name, email, phone, or reason..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-1/2 p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors text-sm shadow-inner bg-gray-50"
                    />
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">
                            <tr>
                                {/* NOTE: 'REASON' is included as a header */}
                                {['CUSTOMER', 'CONTACT', 'ADDRESS', 'ITEMS', 'REFUND AMOUNT', 'DATE', 'ACTION'].map(header => (
                                    <th
                                        key={header}
                                        className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap"
                                    >
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="bg-white divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center text-gray-500 text-lg">
                                        <FiClock className="w-8 h-8 mx-auto text-purple-400 mb-3 animate-spin" />
                                        Fetching refunded orders...
                                    </td>
                                </tr>
                            ) : filteredOrders.length > 0 ? (
                                filteredOrders.map(order => (
                                    <ReturnOrderRow key={order.firestoreId} order={order} />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="p-12 text-center text-gray-500 text-lg">
                                        <FiArchive className="w-8 h-8 mx-auto text-gray-400 mb-3" />
                                        No refunded orders found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                {!loading && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50/50 text-sm text-gray-600 flex justify-end">
                        <span className="font-medium">Showing {filteredOrders.length} returns.</span>
                    </div>
                )}
            </div>
        </div>
    );
}