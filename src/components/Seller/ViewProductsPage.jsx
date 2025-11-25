// ViewProductsPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiPackage, FiEye, FiEdit2, FiTrash2 } from 'react-icons/fi';

// --- Sample Data for Products ---
const initialProductsData = [
  { id: 101, name: '2 Layer Ribbon Batches', category: 'Ribbon', seller: 'Localmarket', price: 5, stock: 150, date: '15/11/2025' },
  { id: 102, name: 'T Shirt (Red, Large)', category: 'Apparel', seller: 'naveen', price: 444, stock: 85, date: '15/11/2025' },
  { id: 103, name: 'iPhone 17 Pro Max', category: 'Electronics', seller: 'Dashrath yadav', price: 78000, stock: 12, date: '12/11/2025' },
  { id: 104, name: 'Woman Dress (Genou)', category: 'Apparel', seller: 'Dashrath yadav', price: 250, stock: 200, date: '13/11/2025' },
  { id: 105, name: 'Letter Head (10 books)', category: 'Printing', seller: 'Tanish', price: 550, stock: 300, date: '09/11/2025' },
  { id: 106, name: 'Book: The Martian', category: 'Books', seller: 'Parmesh', price: 450, stock: 50, date: '10/11/2025' },
];

// Helper to format currency
const formatPrice = (price) => `₹${Number(price).toLocaleString('en-IN')}`;

export default function ViewProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState(initialProductsData);

  // Apply search term filter
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.seller.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.id.toString().includes(searchTerm)
  );
  
  const handleDelete = (id) => {
      if (window.confirm(`Are you sure you want to delete Product ID: ${id}?`)) {
          setProducts(products.filter(p => p.id !== id));
      }
  };

  const ProductRow = ({ product }) => (
    <tr className="border-b hover:bg-gray-50 transition-colors">
      {/* PRODUCT ID */}
      <td className="p-4 text-sm font-medium text-gray-400">#{product.id}</td>

      {/* NAME */}
      <td className="p-4 text-sm font-semibold text-gray-800">{product.name}</td>

      {/* CATEGORY */}
      <td className="p-4 text-xs text-gray-600">{product.category}</td>

      {/* SELLER */}
      <td className="p-4 text-xs text-blue-600 font-medium">{product.seller}</td>

      {/* PRICE */}
      <td className="p-4 font-bold text-green-600 text-sm">{formatPrice(product.price)}</td>

      {/* STOCK */}
      <td className="p-4 text-xs font-semibold" style={{ color: product.stock < 50 ? 'red' : 'green' }}>
        {product.stock}
      </td>

      {/* DATE ADDED */}
      <td className="p-4 text-xs text-gray-500">{product.date}</td>

      {/* ACTIONS */}
      <td className="p-4 flex space-x-2">
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
          onClick={() => handleDelete(product.id)}
          className="p-2 text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
          title="Delete Product"
        >
          <FiTrash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );

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
          />
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['ID', 'NAME', 'CATEGORY', 'SELLER', 'PRICE', 'STOCK', 'DATE ADDED', 'ACTIONS'].map(header => (
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
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => <ProductRow key={product.id} product={product} />)
              ) : (
                <tr>
                  <td colSpan="8" className="p-6 text-center text-gray-500">
                    No products found matching your search term.
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