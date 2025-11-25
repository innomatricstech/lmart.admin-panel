// RecentOrdersTable.jsx
import React, { useState } from 'react';
import { FiSearch, FiClock, FiEye } from 'react-icons/fi';

// --- Sample Data for Recent Orders (mimicking the screenshot) ---
const initialRecentOrders = [
  { id: '69158bdb044a94d851126d61353', customer: 'naveen', amount: 444, status: 'Pending', date: '13/11/2025' },
  { id: '691559e7427448fa119c4d17', customer: 'Dashrath yadav', amount: 250, status: 'Processing', date: '13/11/2025' },
  { id: '691441441739717399e6757d62c', customer: 'Dashrath yadav', amount: 78000, status: 'Processing', date: '12/11/2025' },
  { id: '691431d1d8dbb496f481d6c7f4', customer: 'Dashrath yadav', amount: 3530, status: 'Processing', date: '12/11/2025' },
  { id: '6911d0c390798e798e7485cd6', customer: 'Dashrath yadav', amount: 450, status: 'Delivered', date: '10/11/2025' },
  { id: '6911d0f81d6062d8dba154e524f', customer: 'Parmesh', amount: 450, status: 'Processing', date: '10/11/2025' },
  { id: '6911d7a83d8234d23c2e127757', customer: 'Tanish', amount: 4000, status: 'Processing', date: '10/11/2025' },
  { id: '6910c11ec1c24bc3b63c3b0e4e6', customer: 'santosh', amount: 260, status: 'Delivered', date: '9/11/2025' },
  { id: '6912c0c1c24bc3b63c3b0e4e7', customer: 'Tanish', amount: 700, status: 'Processing', date: '9/11/2025' },
];

// Helper to format currency
const formatPrice = (price) => `₹${Number(price).toLocaleString('en-IN')}`;

// Helper to get status pill styling
const getStatusClasses = (status) => {
  switch (status) {
    case 'Pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'Processing':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Delivered':
      return 'bg-green-100 text-green-800 border-green-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export default function RecentOrdersTable() {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtering logic
  const filteredOrders = initialRecentOrders.filter(order =>
    order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const OrderRow = ({ order }) => (
    <tr className="border-b hover:bg-gray-50 transition-colors">
      {/* ORDER ID */}
      <td className="p-4 text-sm text-blue-600 hover:underline cursor-pointer font-medium">
        {order.id}
      </td>

      {/* CUSTOMER */}
      <td className="p-4 text-sm font-medium text-gray-800">{order.customer}</td>

      {/* AMOUNT */}
      <td className="p-4 text-sm font-bold text-gray-900">{formatPrice(order.amount)}</td>

      {/* STATUS */}
      <td className="p-4">
        <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusClasses(order.status)}`}>
          {order.status}
        </span>
      </td>

      {/* DATE */}
      <td className="p-4 text-xs text-gray-500">{order.date}</td>

      {/* ACTIONS */}
      <td className="p-4">
        <button className="flex items-center justify-center px-3 py-1 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors">
          <FiEye className="w-4 h-4 mr-1" />
          View
        </button>
      </td>
    </tr>
  );

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
      <div className="orders-container bg-white rounded-lg shadow-xl p-6">

        {/* Header and Search Bar */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <FiClock className="w-5 h-5 mr-2 text-blue-600" /> Recent Orders
          </h2>
          <div className="relative w-full max-w-xs ml-4">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search name or order ID"
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
                  <td colSpan="6" className="p-6 text-center text-gray-500">
                    No recent orders found matching your search term.
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