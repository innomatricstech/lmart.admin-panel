import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firerbase";
import { FiUser, FiRefreshCw, FiAlertTriangle, FiClock, FiPackage, FiXCircle, FiCheckCircle, FiPhone, FiTag } from "react-icons/fi";

// Format Firestore timestamp
const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
        return timestamp.toDate().toLocaleString();
    } catch {
        // Fallback for non-standard timestamps
        return new Date(timestamp.seconds * 1000).toLocaleString();
    }
};

const OldeeProductsPage = () => {
    // State holds all products
    const [products, setProducts] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processingId, setProcessingId] = useState(null);

    // useNavigate is unused but kept in case navigation is re-added
    const navigate = useNavigate(); 

    // Fetch ALL products by removing the 'where' filter
    useEffect(() => {
        try {
            const q = query(
                collection(db, "oldee"),
                // The query requires a composite index if you use orderBy on 'createdAt' without a 'where' clause, or if you apply a filter later.
                orderBy("createdAt", "desc") 
            );

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const list = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }));

                    setProducts(list); // Set all fetched products
                    setLoading(false);
                },
                (err) => {
                    console.error("Error loading all Oldee products:", err);
                    setError("Failed to load all products.");
                    setLoading(false);
                }
            );

            return () => unsubscribe();
        } catch (err) {
            console.error("Listener init error:", err);
            setError("Database connection error.");
            setLoading(false);
        }
    }, []);

    // Update product status - Toggles between 'active' and 'inactive'
    const handleUpdateStatus = async (productId, currentStatus) => {
        setProcessingId(productId);
        // Toggle the status between 'active' and 'inactive'
        const newStatus = currentStatus === "active" ? "inactive" : "active"; 
        try {
            const ref = doc(db, "oldee", productId);
            await updateDoc(ref, {
                status: newStatus,
                updatedAt: new Date(),
            });
            // 🚨 REMOVED: alert(`Product updated to: ${newStatus}`);
        } catch (e) {
            console.error(`Error updating product status to ${newStatus}:`, e);
            // 🚨 REMOVED: alert(`Failed to update product: ${e.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    // LOADING UI
    if (loading) {
        return (
            <div className="flex justify-center items-center p-16 min-h-screen bg-gray-50">
                <FiRefreshCw className="w-8 h-8 text-indigo-600 animate-spin mr-3" />
                <span className="text-xl text-gray-700">Loading all products...</span>
            </div>
        );
    }

    // ERROR UI
    if (error) {
        return (
            <div className="p-10 bg-red-50 border-l-4 border-red-500 text-red-700 max-w-lg mx-auto mt-10 rounded-lg">
                <FiAlertTriangle className="h-6 w-6 inline mr-2" />
                <h3 className="font-bold text-xl mb-2">Error</h3>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">

                {/* HEADER */}
                <div className="flex items-center space-x-4 mb-8 border-b pb-4">
                    <FiUser className="w-10 h-10 text-purple-600" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">All Oldee Products</h1>
                        
                    </div>
                </div>

                {/* COUNTER */}
                <div className="bg-white rounded-xl shadow p-6 mb-8">
                    <div className="flex items-center">
                        <FiClock className="w-6 h-6 text-indigo-600 mr-3" />
                        <span className="text-xl font-semibold text-gray-700">
                            {products.length} Total Products Loaded
                        </span>
                    </div>
                </div>

                {/* TABLE */}
                <div className="bg-white shadow-xl rounded-xl border border-gray-200">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Product & Price</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Details & Contact</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Dates</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">Action</th> 
                                </tr>
                            </thead>

                            <tbody className="bg-white divide-y divide-gray-100">
                                {products.length > 0 ? (
                                    products.map((product) => (
                                        <tr key={product.id} className="hover:bg-gray-50">

                                            {/* PRODUCT CELL */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <img
                                                        src={product.imageURLs?.[0] || "https://via.placeholder.com/80"}
                                                        alt={product.name}
                                                        className="w-12 h-12 rounded-lg border object-cover"
                                                    />
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{product.name}</div>
                                                        <div className="text-sm text-gray-500">
                                                            <span className="font-bold">₹{product.price || 'N/A'}</span> 
                                                            <span className="ml-2 text-xs">({product.negotiation || 'Fixed'})</span>
                                                        </div>
                                                        {/* Description snippet */}
                                                        <div className="text-xs text-gray-400 mt-1 truncate max-w-xs">{product.description || 'No description.'}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* STATUS & DETAILS (Now Details & Contact) */}
                                            <td className="px-6 py-4 text-sm text-gray-700">
                                                <div className="mb-2">
                                                    {/* Status Badge */}
                                                    <span className={`font-bold uppercase text-xs px-2 py-1 rounded-full ${
                                                         product.status === 'active' ? 'bg-green-100 text-green-700' :
                                                         product.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                                         'bg-red-100 text-red-700'
                                                    }`}>
                                                        <FiTag className="inline w-3 h-3 mr-1" />{product.status || 'N/A'}
                                                    </span>
                                                    {/* Sold Status */}
                                                    {product.isSold ? (
                                                        <span className="ml-2 font-bold uppercase text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">SOLD</span>
                                                    ) : (
                                                        <span className="ml-2 font-medium text-xs text-green-500">Available</span>
                                                    )}
                                                </div>
                                                <p className="font-medium text-gray-900">Seller: {product.seller?.displayName || product.sellerId || 'N/A'}</p>
                                                <p className="text-xs text-gray-500">Email: {product.seller?.email || 'N/A'}</p>
                                                <p className="text-xs text-gray-500">Address: {product.address || 'N/A'}</p>
                                                <p className="mt-1">
                                                    <FiPhone className="inline w-3 h-3 mr-1 text-gray-500" />
                                                    <span className="font-medium">Contact:</span> {product.contactNumber || 'N/A'}
                                                </p>
                                            </td>

                                            {/* DATES (Created and Published) */}
                                            <td className="px-6 py-4 text-center text-sm text-gray-500">
                                                <p><span className="font-medium text-gray-700">Created:</span> {formatDate(product.createdAt)}</p>
                                                <p className="mt-1 text-xs"><span className="font-medium text-gray-700">Published:</span> {formatDate(product.publishedAt)}</p>
                                            </td>

                                            {/* ACTIONS (Status Toggle ONLY) */}
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center"> 
                                                    {/* Status Toggle Button */}
                                                    <button
                                                        onClick={() => handleUpdateStatus(product.id, product.status)}
                                                        // Disable if currently processing OR if status is explicitly 'rejected'
                                                        disabled={processingId === product.id || product.status === 'rejected'}
                                                        className={`text-white px-3 py-2 rounded-lg disabled:opacity-50 text-sm font-medium ${
                                                            product.status === 'active' 
                                                            ? 'bg-red-500 hover:bg-red-600' 
                                                            : 'bg-green-500 hover:bg-green-600'
                                                        }`}
                                                    >
                                                        {processingId === product.id ? (
                                                            <FiRefreshCw className="w-4 h-4 animate-spin inline mr-1" />
                                                        ) : (
                                                            <>
                                                                {product.status === 'active' ? (
                                                                    <FiXCircle className="inline w-4 h-4 mr-1" />
                                                                ) : (
                                                                    <FiCheckCircle className="inline w-4 h-4 mr-1" />
                                                                )}
                                                                {/* Default is 'Activate' when not 'active' */}
                                                                {product.status === 'active' ? 'Deactivate' : 'Activate'}
                                                            </>
                                                        )}
                                                        
                                                    </button>

                                                </div>
                                            </td>

                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="py-16 text-center text-gray-500">
                                            <FiPackage className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                            <p className="text-lg font-medium">No products found.</p>
                                            <p className="text-sm">Check your Firestore "oldee" collection.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default OldeeProductsPage;