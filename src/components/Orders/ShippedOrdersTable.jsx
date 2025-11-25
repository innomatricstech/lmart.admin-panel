// ShippedOrdersTable.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiTruck, FiShoppingBag } from 'react-icons/fi';

// --- Sample Data ---
// Include a status field to filter by.
const initialOrdersData = [
  // These two orders match the data from your Shipped Orders screenshot
  { id: 10, customer: 'BASAVARAJ DOLLI', email: 'basavarajdolli9639@gmail.com', phone: '08277018869', address: 'Alli Colony\nBijapur\nPIN: 588102', items: '1 Items\n2 Layer Ribbon Bows\nBrand— | SKL/U | HSN—', amount: '5', date: '9/11/2025', status: 'Shipped' },
  { id: 11, customer: 'Dashrath yadav', email: 'dashrathsing2003@gmail.com', phone: '7415096947', address: 'Whitefield Bangalore\nBangalore\nPIN: 560066', items: '1 Items\nBill book\nBrand— | SKL/U | HSN—', amount: '450', date: '4/11/2025', status: 'Shipped' },
  
  // Other orders for context (must be included for routing/details to work)
  { id: 1, customer: 'naveen', email: 'naveen@email.com', phone: '966773355', address: 'dinlolgi, Shimoga, PIN: 588525', items: 'T Shirt\nBand— | SKL/U | HSN—', amount: '444', date: '15/11/2025', status: 'Pending' },
  { id: 2, customer: 'Dashrath Yadav', email: 'dashrathsing@gmail.com', phone: '7415096947', address: 'Whitefield Bangalore, PIN: 600300', items: 'woman dress\nBrand Genou | SKL/U | HSN 001', amount: '250', date: '13/11/2025', status: 'Processing' },
  { id: 3, customer: 'Tanish', email: 'tanishc@gmail.com', phone: '9000444139', address: 'sindagi\nsindagi\nPIN: 588128', items: 'Letter Head (Min Order qty 10 books)', amount: '700', date: '9/11/2025', status: 'Processing' },
  { id: 4, customer: 'Dashrath Yadav', email: 'dashrathsing@gmail.com', phone: '7415096947', address: 'Ganverat Birad, Dinlorigas, PIN: 588525', items: 'woman dress\nBrand Tanishq | SKL/U | HSN 001 M4', amount: '3530', date: '12/11/2025', status: 'Delivered' },
];

// Helper to format currency
const formatAmount = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

export default function ShippedOrdersTable() {
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Filter orders to only include 'Shipped' status
  const shippedOrders = initialOrdersData.filter(order => order.status === 'Shipped');

  // 2. Apply search term filter
  const filteredOrders = shippedOrders.filter(order =>
    order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.phone.includes(searchTerm) ||
    order.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.items.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.id.toString().includes(searchTerm)
  );

  const OrderRow = ({ order }) => {
    const initials = order.customer.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const contactInfo = `${order.email.split('\n')[0]}\n${order.phone}`;
    const avatarColor = ['#800080', '#dc3545', '#3d85c6'][order.id % 3];

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
          {contactInfo}
        </td>

        {/* ADDRESS */}
        <td className="p-4 text-xs text-gray-600 whitespace-pre-line">
          {order.address.replace(/\n/g, ', ').replace(/, /g, '\n')} {/* Keep the address multi-line */}
        </td>

        {/* ITEMS */}
        <td className="p-4 text-xs text-gray-600 whitespace-pre-line">
          {order.items}
        </td>

        {/* AMOUNT */}
        <td className="p-4 font-bold text-green-600 text-sm">
          {formatAmount(order.amount)}
        </td>

        {/* DATE */}
        <td className="p-4 text-xs text-gray-500">
          {order.date}
        </td>

        {/* ACTIONS */}
        <td className="p-4">
          <Link
            to={`/orders/${order.id}`}
            className="px-3 py-1 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors shadow-md inline-block text-center"
          >
            View Details
          </Link>
        </td>
      </tr>
    );
  };

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
      <div className="orders-container bg-white rounded-lg shadow-xl p-6">

        {/* Orders Header: Shipped Orders */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-green-700 flex items-center">
            <FiTruck className="w-5 h-5 mr-2 text-green-600" /> Shipped Orders
          </h2>
          <button className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md">
            Download Orders Excel
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-4 mb-6 relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, brand, SKU, or HSN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-2/3 md:w-1/2 p-3 pl-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
          />
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['CUSTOMER', 'CONTACT', 'ADDRESS', 'ITEMS', 'AMOUNT', 'DATE', 'ACTIONS'].map(header => (
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
                  <td colSpan="7" className="p-6 text-center text-gray-500">
                    No shipped orders found matching your search term.
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