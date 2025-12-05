// ReturnOrdersTable.jsx

import React, { useState, useEffect } from 'react';
import { FiSearch, FiArchive } from 'react-icons/fi';
import { collectionGroup, getDocs, query } from 'firebase/firestore';
import { db } from "../../firerbase";

// Helper to format currency
const formatAmount = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

const getActionStyles = (action) => {
  switch (action) {
    case 'Approved':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'Processed':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
};

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
        const ordersQuery = query(collectionGroup(db, "orders"));
        const snapshot = await getDocs(ordersQuery);

        const returnsList = [];

        snapshot.forEach((doc) => {
          const data = doc.data();

          // ⭐ ONLY SHOW REFUNDED ORDERS
          if (data.status === "Refunded") {

            const path = doc.ref.path.split("/");
            const userId = path[1] ?? "unknown_user";

            returnsList.push({
              firestoreId: doc.id,
              userId,
              ...data,
              reason: data.reason || "No reason provided",
              returnAction: data.returnAction || "Processed",
              amount: data.amount || 0,
              items: Array.isArray(data.items)
                ? data.items.map(i => `${i.quantity} × ${i.name}`).join("\n")
                : "N/A",
              date: data.createdAt?.toDate()?.toLocaleDateString("en-IN") || "N/A",
            });
          }
        });

        // Sort by latest return
        returnsList.sort((a, b) => {
          const da = a.createdAt?.toDate?.() || 0;
          const db = b.createdAt?.toDate?.() || 0;
          return db - da;
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
    const avatarColor = ['#800080', '#dc3545', '#3d85c6'][order.firestoreId.length % 3];
    const actionClasses = getActionStyles(order.returnAction);

    return (
      <tr className="border-b hover:bg-gray-50 transition-colors">
        {/* CUSTOMER */}
        <td className="p-4 text-sm font-semibold text-gray-800 flex items-center">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white mr-3 text-xs"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
          {order.customer}
        </td>

        {/* CONTACT */}
        <td className="p-4 text-xs text-gray-600 whitespace-pre-line">
          {order.email}\n{order.phone}
        </td>

        {/* ADDRESS */}
        <td className="p-4 text-xs text-gray-600 whitespace-pre-line">
          {order.address}
        </td>

        {/* ITEMS */}
        <td className="p-4 text-xs text-gray-600 whitespace-pre-line">
          {order.items}
        </td>

        {/* AMOUNT */}
        <td className="p-4 font-bold text-green-600 text-sm">
          {formatAmount(order.amount)}
        </td>

        {/* REASON */}
        <td className="p-4 text-xs text-gray-600 max-w-xs">
          {order.reason}
        </td>

        {/* DATE */}
        <td className="p-4 text-xs text-gray-500">
          {order.date}
        </td>

        {/* RETURN ACTION */}
        <td className="p-4">
          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${actionClasses}`}>
            {order.returnAction}
          </span>
        </td>
      </tr>
    );
  };

  // -------------------------------------------------------
  // RENDER UI
  // -------------------------------------------------------
  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
      <div className="orders-container bg-white rounded-lg shadow-xl p-6">

        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-purple-700 flex items-center">
            <FiArchive className="w-5 h-5 mr-2 text-purple-600" /> Return Orders (Refunded Only)
          </h2>

          <button className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md">
            Download Returns Excel
          </button>
        </div>

        {/* Search */}
        <div className="mt-4 mb-6 relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-2/3 md:w-1/2 p-3 pl-10 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 transition-colors text-sm"
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['CUSTOMER', 'CONTACT', 'ADDRESS', 'ITEMS', 'AMOUNT', 'REASON', 'DATE', 'ACTION'].map(header => (
                  <th
                    key={header}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-gray-500">Loading return orders...</td>
                </tr>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map(order => (
                  <ReturnOrderRow key={order.firestoreId} order={order} />
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-gray-500">
                    No refunded orders found.
                  </td>
                </tr>
              )}
            </tbody>

          </table>
        </div>

      </div>
    </div>
  );
}
