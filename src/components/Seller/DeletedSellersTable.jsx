// DeletedSellersTable.jsx
import React, { useState } from 'react';
import { FiXCircle, FiUsers } from 'react-icons/fi';

// --- Sample Data for Deleted Sellers ---
const initialDeletedSellersData = [
  { id: 1, name: 'new', email: 'new@gmail.com', deletedAt: '5/11/2025, 7:09:48 pm' },
  { id: 2, name: 'newseller', email: 'newseller@gmail.com', deletedAt: '5/11/2025, 1:00:33 pm' },
  { id: 3, name: 'deve', email: 'deve@gmail.com', deletedAt: '5/11/2025, 12:17:55 pm' },
  { id: 4, name: 'dbs', email: 'dshort001@gmail.com', deletedAt: '5/11/2025, 12:16:33 pm' },
  { id: 5, name: 'ghk', email: 'dshort001@gmail.com', deletedAt: '5/11/2025, 12:04:22 pm' },
];

export default function DeletedSellersTable() {
  // Since the image doesn't show search/filtering, we display the list directly.
  const [deletedSellers] = useState(initialDeletedSellersData);

  const SellerRow = ({ seller }) => (
    <tr className="border-b hover:bg-gray-50 transition-colors">
      {/* NAME */}
      <td className="p-4 text-sm font-medium text-gray-900">{seller.name}</td>

      {/* EMAIL */}
      <td className="p-4 text-sm text-gray-600">{seller.email}</td>

      {/* DELETED AT */}
      <td className="p-4 text-xs font-medium text-red-600">
        {seller.deletedAt}
      </td>
    </tr>
  );

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
      {/* Container with Red Background at the top for emphasis (as seen in screenshot) */}
      <div className="bg-red-100 border border-red-300 p-4 rounded-lg mb-6 shadow-sm">
        <h2 className="text-xl font-bold text-red-700 flex items-center">
          <FiXCircle className="w-5 h-5 mr-2 text-red-600" /> Deleted Sellers ({deletedSellers.length})
        </h2>
        <p className="text-sm text-red-600 mt-1">
          These seller accounts have been permanently removed or disabled.
        </p>
      </div>

      <div className="orders-container bg-white rounded-lg shadow-xl p-6">

        {/* Sellers Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['NAME', 'EMAIL', 'DELETED AT'].map(header => (
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
              {deletedSellers.length > 0 ? (
                deletedSellers.map(seller => <SellerRow key={seller.id} seller={seller} />)
              ) : (
                <tr>
                  <td colSpan="3" className="p-6 text-center text-gray-500">
                    No deleted sellers found.
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