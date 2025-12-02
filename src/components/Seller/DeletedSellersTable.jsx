import React, { useState, useEffect } from 'react';
import { FiXCircle } from 'react-icons/fi';
// ⚠️ IMPORTANT: Replace '../path/to/firebase' with the actual path to your initialized Firebase app instance.
import { db } from '../../../firerbase'; 
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

export default function DeletedSellersTable() {
  const [deletedSellers, setDeletedSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDeletedSellers = async () => {
      try {
        setLoading(true);
        // Specify the collection name from your Firestore screenshot: 'deleted_sellers'
        const sellersCollectionRef = collection(db, 'deleted_sellers');
        
        // Create a query: Order by 'deletedAt' to show the most recent deletions first
        // 'deletedAt' is assumed to be a Firestore Timestamp field
        const q = query(sellersCollectionRef, orderBy('deletedAt', 'desc'));

        // Fetch the documents
        const querySnapshot = await getDocs(q);
        
        // Map the documents to a list of seller objects
        const sellersList = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id, // Use the document ID as the key/id
            name: data.name || 'N/A', 
            email: data.email || 'No Email',
            // Convert the Firestore Timestamp object to a readable string
            deletedAt: data.deletedAt ? data.deletedAt.toDate().toLocaleString() : 'Unknown Date',
          };
        });

        setDeletedSellers(sellersList);
        setError(null);

      } catch (e) {
        console.error("Error fetching deleted sellers: ", e);
        // Provide a user-friendly error message
        setError("Failed to load seller data. Please check your network or Firebase configuration.");
      } finally {
        setLoading(false);
      }
    };

    fetchDeletedSellers();
  }, []); // Runs only once on mount

  // Helper component for rendering a single row
  const SellerRow = ({ seller }) => (
    <tr className="border-b hover:bg-gray-50 transition-colors">
      <td className="p-4 text-sm font-medium text-gray-900">{seller.name}</td>
      <td className="p-4 text-sm text-gray-600">{seller.email}</td>
      <td className="p-4 text-xs font-medium text-red-600">
        {seller.deletedAt}
      </td>
    </tr>
  );

  // --- Conditional Rendering for Loading/Error States ---

  if (loading) {
    return (
      <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen flex justify-center items-start pt-20">
        <p className="text-gray-600 font-semibold">Loading deleted sellers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
        <div className="bg-red-500 text-white p-4 rounded-lg shadow-md">
          <h3 className="font-bold mb-2">Data Load Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // --- Main Component Rendering ---

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
      
      {/* Header Container with Red Background */}
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