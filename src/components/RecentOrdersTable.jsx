// RecentOrdersTable.jsx
import React, { useState, useEffect } from 'react';
import { FiSearch, FiClock, FiEye } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from "../../firerbase"

// Helper to format currency
const formatPrice = (price) => `₹${Number(price).toLocaleString('en-IN')}`;

// Helper to format date from timestamp
const formatFirestoreDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  if (timestamp.toDate) {
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  return new Date(timestamp).toLocaleDateString('en-IN');
};

// Helper to get status pill styling
const getStatusClasses = (status) => {
  if (!status) return 'bg-gray-100 text-gray-800 border-gray-300';
  
  switch (status.toLowerCase()) {
    case 'pending':
    case 'created':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'processing':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'success':
    case 'delivered':
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'cancelled':
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

// Helper to get display status text
const getDisplayStatus = (status) => {
  if (!status) return 'Pending';
  
  switch (status.toLowerCase()) {
    case 'success':
      return 'Completed';
    case 'created':
      return 'Pending';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

export default function RecentOrdersTable() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch recent orders from Firestore
  useEffect(() => {
    const fetchRecentOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Create a query to get recent orders, ordered by date (newest first), limit to 20
        const ordersRef = collection(db, 'orders');
        const q = query(
          ordersRef, 
          orderBy('date', 'desc'),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        
        const querySnapshot = await getDocs(q);
        const ordersList = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            orderId: data.orderId || doc.id.substring(0, 8) + '...',
            customer: data.customer || data.customerInfo?.name || 'Unknown Customer',
            amount: data.amount || 0,
            status: data.status || 'pending',
            date: data.date || data.createdAt,
            email: data.email || data.customerInfo?.email || '',
            phone: data.phone || data.customerInfo?.phone || '',
            itemCount: Array.isArray(data.items) ? data.items.length : 0
          };
        });
        
        setOrders(ordersList);
        setFilteredOrders(ordersList);
      } catch (err) {
        console.error('Error fetching recent orders:', err);
        setError('Failed to load recent orders. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecentOrders();
  }, []);

  // Filter orders based on search term
  useEffect(() => {
    if (searchTerm === '') {
      setFilteredOrders(orders);
      return;
    }

    const lowerCaseSearch = searchTerm.toLowerCase();
    const result = orders.filter(order => {
      const customerName = order.customer || '';
      const orderId = order.id || '';
      const email = order.email || '';
      const phone = order.phone || '';
      const displayOrderId = order.orderId || '';
      
      return (
        customerName.toLowerCase().includes(lowerCaseSearch) ||
        orderId.toLowerCase().includes(lowerCaseSearch) ||
        displayOrderId.toLowerCase().includes(lowerCaseSearch) ||
        email.toLowerCase().includes(lowerCaseSearch) ||
        phone.includes(searchTerm)
      );
    });
    setFilteredOrders(result);
  }, [searchTerm, orders]);

  const OrderRow = ({ order }) => (
    <tr className="border-b hover:bg-gray-50 transition-colors">
      {/* ORDER ID */}
      <td className="p-4">
        <Link 
          to={`/orders/${order.id}`}
          className="text-sm text-blue-600 hover:underline font-medium cursor-pointer block"
          title="Click to view order details"
        >
          {order.orderId}
        </Link>
        {order.itemCount > 0 && (
          <span className="text-xs text-gray-500">
            {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
          </span>
        )}
      </td>

      {/* CUSTOMER */}
      <td className="p-4">
        <div className="text-sm font-medium text-gray-800">{order.customer}</div>
        {order.email && (
          <div className="text-xs text-gray-500 truncate max-w-[150px]" title={order.email}>
            {order.email}
          </div>
        )}
      </td>

      {/* AMOUNT */}
      <td className="p-4 text-sm font-bold text-gray-900">{formatPrice(order.amount)}</td>

      {/* STATUS */}
      <td className="p-4">
        <span 
          className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusClasses(order.status)}`}
          title={`Status: ${order.status}`}
        >
          {getDisplayStatus(order.status)}
        </span>
      </td>

      {/* DATE */}
      <td className="p-4 text-xs text-gray-500">
        {formatFirestoreDate(order.date)}
      </td>

      {/* ACTIONS */}
      <td className="p-4">
        <Link 
          to={`/orders/${order.id}`}
          className="flex items-center justify-center px-3 py-1 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
        >
          <FiEye className="w-4 h-4 mr-1" />
          View
        </Link>
      </td>
    </tr>
  );

  if (loading) {
    return (
      <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
        <div className="orders-container bg-white rounded-lg shadow-xl p-6">
          <div className="flex justify-between items-center pb-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <FiClock className="w-5 h-5 mr-2 text-blue-600" /> Recent Orders
            </h2>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <p className="ml-4 text-gray-700 font-medium">Loading Recent Orders...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
        <div className="orders-container bg-white rounded-lg shadow-xl p-6">
          <div className="flex justify-between items-center pb-4 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <FiClock className="w-5 h-5 mr-2 text-blue-600" /> Recent Orders
            </h2>
          </div>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mt-4">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline ml-2">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
      <div className="orders-container bg-white rounded-lg shadow-xl p-6">

        {/* Header and Search Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-gray-100 gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <FiClock className="w-5 h-5 mr-2 text-blue-600" /> Recent Orders
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Showing {filteredOrders.length} of {orders.length} orders
            </p>
          </div>
          <div className="relative w-full md:w-auto md:min-w-[300px]">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customer, order ID, email, or phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto mt-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['ORDER ID', 'CUSTOMER', 'AMOUNT', 'STATUS', 'DATE', 'ACTIONS'].map(header => (
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
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => <OrderRow key={order.id} order={order} />)
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <FiSearch className="w-12 h-12 text-gray-300 mb-4" />
                      <p className="text-gray-600 font-medium mb-2">No orders found</p>
                      <p className="text-sm text-gray-500">
                        {searchTerm 
                          ? "No recent orders match your search. Try different keywords."
                          : "No recent orders available in the database."
                        }
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Stats */}
        {filteredOrders.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800">Total Orders</h3>
                <p className="text-2xl font-bold text-blue-900">{filteredOrders.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-800">Total Value</h3>
                <p className="text-2xl font-bold text-green-900">
                  ₹{filteredOrders.reduce((sum, order) => sum + (order.amount || 0), 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-800">Avg. Order Value</h3>
                <p className="text-2xl font-bold text-purple-900">
                  ₹{filteredOrders.length > 0 
                    ? Math.round(filteredOrders.reduce((sum, order) => sum + (order.amount || 0), 0) / filteredOrders.length).toLocaleString('en-IN')
                    : '0'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}