import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FiSearch, FiPackage, FiEye, FiEdit2, FiTrash2, 
  FiBox, FiDollarSign, FiRefreshCw, FiAlertTriangle 
} from 'react-icons/fi';

// 🚨 IMPORTANT: Ensure this path is correct for your project
import { db } from "../../../firerbase"; 
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";

// Helper to format currency
const formatPrice = (price) => `₹${Number(price).toLocaleString('en-IN')}`;

// Helper to calculate summary metrics from variants (RETAINED)
const calculateProductSummary = (variants) => {
    if (!variants || variants.length === 0) {
        return { totalStock: 0, minPrice: 0, variantCount: 0 };
    }
    
    const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    // Find the minimum price, handling potential null/undefined values
    const prices = variants.map(v => v.offerPrice || v.price).filter(p => p !== null && p !== undefined);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

    return { totalStock, minPrice, variantCount: variants.length };
};


export default function ViewProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  // 1. New State for loading and error
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. Fetch data on component mount
  useEffect(() => {
    fetchProducts();
  }, []); // Run once on mount

  // 3. Implement the fetch function
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      // 🚨 CRITICAL: Use the correct collection name ("products")
      const querySnapshot = await getDocs(collection(db, "products"));
      const fetchedProducts = querySnapshot.docs.map(doc => ({
        // Use doc.id as the product ID
        id: doc.id,
        ...doc.data(),
        // Ensure date field is present or use a fallback
        date: doc.data().createdAt ? new Date(doc.data().createdAt.toDate()).toLocaleDateString() : 'N/A',
      }));
      setProducts(fetchedProducts);
    } catch (err) {
      console.error("Error fetching products:", err);
      setError("Failed to load products. Please check your Firebase connection and rules.");
    } finally {
      setLoading(false);
    }
  };
  
  // 4. Update handleDelete to use Firestore deleteDoc
  const handleDelete = async (id, name) => {
      if (window.confirm(`Are you sure you want to permanently delete product "${name}" (ID: ${id})? This action cannot be undone.`)) {
          setLoading(true);
          try {
              // Delete document from Firestore
              await deleteDoc(doc(db, "products", id));
              
              // Update local state by removing the product
              setProducts(prevProducts => prevProducts.filter(p => p.id !== id));
              console.log(`Product ${id} deleted successfully.`);
          } catch (err) {
              console.error("Error deleting product:", err);
              setError("Failed to delete product. Please try again.");
          } finally {
              setLoading(false);
          }
      }
  };

  // Apply search term filter (Uses fetched data)
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || // Use safe chaining for nested fields
    product.sellerId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.id.toString().includes(searchTerm)
  );
  
  // --- Product Row Component ---
  const ProductRow = ({ product }) => {
    const { totalStock, minPrice, variantCount } = calculateProductSummary(product.variants);

    return (
      <tr className="border-b hover:bg-gray-50 transition-colors">
        {/* PRODUCT ID */}
        <td className="p-4 text-sm font-medium text-gray-400">#{product.id}</td>

        {/* NAME */}
        <td className="p-4 text-sm font-semibold text-gray-800">{product.name}</td>

        {/* CATEGORY */}
        <td className="p-4 text-xs text-gray-600">{product.category?.name || 'N/A'}</td>

        {/* SELLER */}
        <td className="p-4 text-xs text-blue-600 font-medium">{product.sellerId || 'N/A'}</td>

        {/* VARIANTS */}
        <td className="p-4 text-xs font-semibold text-purple-600">
            {variantCount} Variant(s)
        </td>
        
        {/* PRICE */}
        <td className="p-4 font-bold text-green-600 text-sm flex items-center space-x-1">
            <FiDollarSign className="w-4 h-4" />
            <span>{formatPrice(minPrice)}</span>
        </td>

        {/* TOTAL STOCK */}
        <td className="p-4 text-xs font-semibold" style={{ color: totalStock < 50 ? 'red' : 'green' }}>
            <span className="flex items-center space-x-1">
                <FiBox className="w-4 h-4" />
                <span>{totalStock}</span>
            </span>
        </td>

        {/* DATE ADDED */}
        <td className="p-4 text-xs text-gray-500">{product.date}</td>

        {/* ACTIONS */}
        <td className="p-4 flex space-x-2">
          {/* Note: View and Edit links now use the Firestore document ID */}
          <Link
            to={`/products/view/${product.id}`}
            className="p-2 text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors"
            title="View Details"
          >
            <FiEye className="w-4 h-4" />
          </Link>
          <Link
            to={`/products/edit/${product.id}`}
            className="p-2 text-white bg-orange-500 hover:bg-orange-600 rounded transition-colors"
            title="Edit Product"
          >
            <FiEdit2 className="w-4 h-4" />
          </Link>
          <button
            onClick={() => handleDelete(product.id, product.name)}
            className="p-2 text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
            title="Delete Product"
            disabled={loading}
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
      <div className="products-container bg-white rounded-lg shadow-xl p-6">

        {/* Header and Add Button */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            <FiPackage className="w-5 h-5 mr-2 text-blue-600" /> View All Products
          </h2>
          <Link 
            to="/products/add" 
            className="px-4 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-md"
          >
            + Add New Product
          </Link>
        </div>

        {/* Search Bar */}
        <div className="mt-4 mb-6 relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, category, seller, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-2/3 md:w-1/2 p-3 pl-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            disabled={loading}
          />
        </div>

        {/* Loading / Error State */}
        {loading && products.length === 0 && (
          <div className="flex justify-center items-center p-10 text-lg text-gray-600">
            <FiRefreshCw className="w-6 h-6 animate-spin mr-3" />
            Loading products from database...
          </div>
        )}

        {error && (
          <div className="p-4 mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 flex items-center">
            <FiAlertTriangle className="w-5 h-5 mr-3" />
            <span>{error}</span>
            <button onClick={fetchProducts} className="ml-auto text-sm font-semibold underline">
                Retry
            </button>
          </div>
        )}

        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'NAME', 'CATEGORY', 'SELLER', 'VARIANTS', 'MIN PRICE', 'TOTAL STOCK', 'DATE ADDED', 'ACTIONS'].map(header => (
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
              {!loading && filteredProducts.length > 0 ? (
                filteredProducts.map(product => <ProductRow key={product.id} product={product} />)
              ) : (
                !loading && (
                  <tr>
                    <td colSpan="9" className="p-6 text-center text-gray-500">
                      {searchTerm ? "No products found matching your search term." : "No products available in the database."}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}