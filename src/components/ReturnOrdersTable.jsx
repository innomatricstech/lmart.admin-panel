// ReturnOrdersTable.jsx
import React, { useState } from 'react';
import { FiSearch, FiArchive, FiCheckCircle } from 'react-icons/fi';

// --- Sample Data for Return Orders ---
// Note: This data structure includes 'reason' and 'returnAction' fields.
const initialReturnOrdersData = [
  { id: 1, customer: 'Tanish', email: 'tanishkarmann13@gmail.com', phone: '9000444139', address: 'sindagi', items: '1 Items\n3 Layer Ribbon Batches\nBrand— | SKL/U | HSN—', amount: '13', date: '10/11/2025', reason: '', returnAction: 'Approved' },
  { id: 2, customer: 'Dashrath Yadav', email: 'dashrathsing2003@gmail.com', phone: '7415096947', address: 'Whitefield Bangalore', items: '1 Items\n2 Layer Ribbon Batches\nBrand— | SKL/U | HSN—', amount: '5', date: '5/11/2025', reason: 'Sorry for that / have another project', returnAction: 'Approved' },
  { id: 3, customer: 'Dashrath Yadav', email: 'dashrathsing2003@gmail.com', phone: '7415096947', address: 'Whitefield Bangalore', items: '1 Items\nLetter Head (Min Order qty 10 books)\nBrand— | SKL/U | HSN—', amount: '350', date: '5/11/2025', reason: 'cibmm.', returnAction: 'Approved' },
  { id: 4, customer: 'Lmart', email: 'dashrathsing2003@gmail.com', phone: '7415096947', address: 'Whitefield Bangalore', items: '1 Items\nDashrath yadav\nBrand— | SKL/U | HSN—', amount: '600', date: '4/11/2025', reason: 'zuchyij', returnAction: 'Processed' },
  { id: 5, customer: 'Dashrath Yadav', email: 'parmesh@gmail.com', phone: '7415096947', address: 'Whitefield Bangalore', items: '1 Items\nDashrath yadav', amount: '300', date: '4/11/2025', reason: 'please change this product', returnAction: 'Processed' },
  { id: 6, customer: 'Dashrath Yadav', email: 'parmesh@gmail.com', phone: '07415096947', address: 'Whitefield Bangalore', items: '1 Items\nDashrath yadav', amount: '300', date: '4/11/2025', reason: 'no need updated', returnAction: 'Approved' },
];

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

  // Filtering logic
  const filteredOrders = initialReturnOrdersData.filter(order =>
    order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.phone.includes(searchTerm) ||
    order.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.id.toString().includes(searchTerm)
  );

  const ReturnOrderRow = ({ order }) => {
    const initials = order.customer.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const contactInfo = `${order.email}\n${order.phone}`;
    const avatarColor = ['#800080', '#dc3545', '#3d85c6'][order.id % 3];
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
          {contactInfo}
        </td>

        {/* ADDRESS */}
        <td className="p-4 text-xs text-gray-600 whitespace-pre-line">
          {order.address.replace(/, /g, '\n')}
        </td>

        {/* ITEMS */}
        <td className="p-4 text-xs text-gray-600 whitespace-pre-line">
          {order.items}
        </td>

        {/* AMOUNT */}
        <td className="p-4 font-bold text-green-600 text-sm">
          {formatAmount(order.amount)}
        </td>

        {/* REASON (New Column) */}
        <td className="p-4 text-xs text-gray-600 max-w-xs overflow-hidden text-ellipsis">
          {order.reason || 'N/A'}
        </td>

        {/* DATE */}
        <td className="p-4 text-xs text-gray-500">
          {order.date}
        </td>

        {/* ACTIONS (Modified to show status tag) */}
        <td className="p-4">
          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${actionClasses}`}>
            {order.returnAction}
          </span>
        </td>
      </tr>
    );
  };

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
      <div className="orders-container bg-white rounded-lg shadow-xl p-6">

        {/* Header and Action Button */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-purple-700 flex items-center">
            <FiArchive className="w-5 h-5 mr-2 text-purple-600" /> Return Orders
          </h2>
          <button className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-md">
            Download Returns Excel
          </button>
        </div>

        {/* Search Bar */}
        <div className="mt-4 mb-6 relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name or order ID..."
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
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => <ReturnOrderRow key={order.id} order={order} />)
              ) : (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-gray-500">
                    No return orders found matching your search term.
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