import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import { 
    collection, 
    query, 
    orderBy, 
    onSnapshot, 
    doc, 
    updateDoc, 
    deleteDoc,
    getDoc 
} from "firebase/firestore";
import { db } from "../../firerbase";
import { 
    FiUser, 
    FiRefreshCw, 
    FiAlertTriangle, 
    FiClock, 
    FiPackage, 
    FiXCircle, 
    FiCheckCircle, 
    FiPhone, 
    FiTag,
    FiEdit,
    FiTrash2,
    FiSave, 
    FiDollarSign, 
    FiFileText,
    FiCheck 
} from "react-icons/fi";

// Format Firestore timestamp
const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
        return date.toLocaleString();
    } catch {
        return "Invalid Date";
    }
};

// --- SUCCESS NOTIFICATION TOAST (Unchanged) ---
const SuccessNotificationToast = ({ message, onClose }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000); 
            return () => clearTimeout(timer);
        }
    }, [message, onClose]);

    if (!message) return null;

    return (
        <div className="fixed bottom-5 right-5 z-[200]">
            <div className="bg-green-600 text-white p-4 rounded-lg shadow-xl flex items-center space-x-3 transition-opacity duration-300">
                <FiCheck className="w-5 h-5" />
                <span className="font-medium">{message}</span>
            </div>
        </div>
    );
};


// --- INLINE EDIT COMPONENT (UPDATED to include offerPrice) ---

const InlineEditForm = ({ productData, onSave, onCancel, onSaveSuccess }) => {
    const [formData, setFormData] = useState({
        // Initialize with productData, ensuring offerPrice is included
        ...productData,
        // Ensure price fields are strings for input type="number" to work nicely
        price: String(productData.price || 0),
        offerPrice: String(productData.offerPrice || 0), 
    });
    const [isSaving, setIsSaving] = useState(false);
    const [editError, setEditError] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setEditError(null);

        if (!formData.name || !formData.price) {
            setEditError("Product Name and Price are required.");
            setIsSaving(false);
            return;
        }

        try {
            const productRef = doc(db, "oldee", formData.id);
            
            const updatedData = {
                ...formData,
                // Ensure price fields are stored as numbers in Firestore
                price: Number(formData.price),
                offerPrice: Number(formData.offerPrice || 0), // Handle null/empty and convert to number
                updatedAt: new Date(),
            };

            await updateDoc(productRef, updatedData);
            
            onSaveSuccess(`Product "${formData.name}" updated successfully!`); 
            onSave(); 

        } catch (e) {
            console.error("Error updating product:", e);
            setEditError(`Failed to save changes: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
                
                <h2 className="text-2xl font-bold text-gray-900 mb-4 border-b pb-2">
                    <FiEdit className="inline w-6 h-6 mr-2 text-blue-600" />
                    Edit Product: <span className="text-blue-600">{productData.name}</span>
                </h2>

                {editError && (
                    <div className="p-3 mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
                        <FiAlertTriangle className="h-5 w-5 inline mr-2" />
                        <span className="text-sm">{editError}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    
                    {/* Name, Price, Offer Price, Negotiation, Status */}
                    <div className="grid grid-cols-5 gap-4">
                        <div className="col-span-1">
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Product Name</label>
                            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 p-2 block w-full border border-gray-300 rounded-md" />
                        </div>
                        <div className="col-span-1">
                            <label htmlFor="price" className="block text-sm font-medium text-gray-700">Original Price (₹)</label>
                            <input type="number" name="price" id="price" value={formData.price} onChange={handleChange} required className="mt-1 p-2 block w-full border border-gray-300 rounded-md" />
                        </div>
                        <div className="col-span-1">
                            <label htmlFor="offerPrice" className="block text-sm font-medium text-gray-700">Offer Price (₹)</label>
                            <input type="number" name="offerPrice" id="offerPrice" value={formData.offerPrice} onChange={handleChange} className="mt-1 p-2 block w-full border border-gray-300 rounded-md" placeholder="e.g., 16500" />
                        </div>
                        <div className="col-span-1">
                            <label htmlFor="negotiation" className="block text-sm font-medium text-gray-700">Negotiation</label>
                            <select id="negotiation" name="negotiation" value={formData.negotiation} onChange={handleChange} className="mt-1 p-2 block w-full border border-gray-300 rounded-md bg-white">
                                <option value="Fixed">Fixed Price</option>
                                <option value="Negotiable">Negotiable</option>
                            </select>
                        </div>
                        <div className="col-span-1">
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                            <select id="status" name="status" value={formData.status} onChange={handleChange} className="mt-1 p-2 block w-full border border-gray-300 rounded-md bg-white">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="Pending">Pending Review</option>
                            </select>
                        </div>
                    </div>
                    {/* ... (Rest of the form remains unchanged) ... */}

                    {/* Description and Contact/Address */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700">Contact Number</label>
                            <input type="text" name="contactNumber" id="contactNumber" value={formData.contactNumber} onChange={handleChange} className="mt-1 p-2 block w-full border border-gray-300 rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                            <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="mt-1 p-2 block w-full border border-gray-300 rounded-md" />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea id="description" name="description" rows="3" value={formData.description} onChange={handleChange} className="mt-1 p-2 block w-full border border-gray-300 rounded-md"></textarea>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-100"
                        >
                            <FiXCircle className="w-5 h-5 mr-2" /> Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className={`flex items-center px-4 py-2 rounded-md text-white ${isSaving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {isSaving ? (
                                <>
                                    <FiRefreshCw className="w-5 h-5 animate-spin mr-2" /> Saving...
                                </>
                            ) : (
                                <>
                                    <FiSave className="w-5 h-5 mr-2" /> Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- DELETE CONFIRMATION MODAL COMPONENT (Unchanged) ---

const DeleteConfirmationModal = ({ product, onConfirm, onCancel, isDeleting }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-[100]">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 transform transition-all duration-300 scale-100">
                <div className="flex flex-col items-center space-y-4">
                    <FiTrash2 className="w-12 h-12 text-red-500" />
                    <h3 className="text-xl font-bold text-gray-900">Confirm Deletion</h3>
                    <p className="text-sm text-gray-600 text-center">
                        Are you sure you want to permanently delete **"{product.name}"**? This action cannot be undone.
                    </p>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                    <button
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition duration-150"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white ${isDeleting ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700'} transition duration-150`}
                    >
                        {isDeleting ? (
                            <FiRefreshCw className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <FiTrash2 className="w-4 h-4 mr-2" />
                        )}
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- MAIN COMPONENT: OldeeProductsPage (Mostly Unchanged) ---

const OldeeProductsPage = () => {
    const [products, setProducts] = useState([]); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    
    const [notification, setNotification] = useState(null); 
    
    const [productToDelete, setProductToDelete] = useState(null); 
    const [editingProduct, setEditingProduct] = useState(null); 

    const navigate = useNavigate();

    // Fetch ALL products (Unchanged)
    useEffect(() => {
        try {
            const q = query(
                collection(db, "oldee"),
                orderBy("createdAt", "desc") 
            );

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const list = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    }));

                    setProducts(list);
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

    // --- Handlers ---

    // Update Status (Unchanged)
    const handleUpdateStatus = async (productId, currentStatus) => {
        setProcessingId(productId);
        const newStatus = currentStatus === "active" ? "inactive" : "active"; 
        try {
            const ref = doc(db, "oldee", productId);
            await updateDoc(ref, {
                status: newStatus,
                updatedAt: new Date(),
            });
        } catch (e) {
            console.error(`Error updating product status to ${newStatus}:`, e);
        } finally {
            setProcessingId(null);
        }
    };

    // Open Edit Form (Unchanged)
    const handleEditProduct = async (productId) => {
        setProcessingId(productId);
        try {
            const docRef = doc(db, "oldee", productId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setEditingProduct({ id: docSnap.id, ...docSnap.data() }); 
            } else {
                setNotification("Product to edit not found.");
            }
        } catch (err) {
            console.error("Error fetching product for edit:", err);
            setNotification("Failed to load product for editing.");
        } finally {
            setProcessingId(null);
        }
    };
    
    // Open Delete Confirmation Modal (Unchanged)
    const handleDeleteClick = (product) => {
        setProductToDelete(product);
    };

    // Final Delete Action (Unchanged)
    const finalizeDeleteProduct = async () => {
        if (!productToDelete) return;

        const productId = productToDelete.id;
        setProcessingId(productId); 

        try {
            const ref = doc(db, "oldee", productId);
            await deleteDoc(ref);
            setNotification(`Product "${productToDelete.name}" successfully deleted.`); 
            setProductToDelete(null); 
        } catch (e) {
            console.error("Error deleting document:", e);
            setNotification(`Failed to delete product: ${e.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    // Function to set success notification message (Unchanged)
    const handleSuccessNotification = (message) => {
        setNotification(message);
    };


    // --- UI RENDERING ---

    if (loading) {
        return (
            <div className="flex justify-center items-center p-16 min-h-screen bg-gray-50">
                <FiRefreshCw className="w-8 h-8 text-indigo-600 animate-spin mr-3" />
                <span className="text-xl text-gray-700">Loading all products...</span>
            </div>
        );
    }

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
                                                        {/* Display offer price in the list view */}
                                                        {product.offerPrice && product.offerPrice !== product.price && (
                                                            <div className="text-xs text-red-500 font-medium">Offer: ₹{product.offerPrice}</div>
                                                        )}
                                                        <div className="text-xs text-gray-400 mt-1 truncate max-w-xs">{product.description || 'No description.'}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* DETAILS CELL */}
                                            <td className="px-6 py-4 text-sm text-gray-700">
                                                <div className="mb-2">
                                                    <span className={`font-bold uppercase text-xs px-2 py-1 rounded-full ${
                                                            product.status === 'active' ? 'bg-green-100 text-green-700' :
                                                            product.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        <FiTag className="inline w-3 h-3 mr-1" />{product.status || 'N/A'}
                                                    </span>
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

                                            {/* DATES CELL */}
                                            <td className="px-6 py-4 text-center text-sm text-gray-500">
                                                <p><span className="font-medium text-gray-700">Created:</span> {formatDate(product.createdAt)}</p>
                                                <p className="mt-1 text-xs"><span className="font-medium text-gray-700">Published:</span> {formatDate(product.publishedAt)}</p>
                                            </td>

                                            {/* ACTIONS CELL */}
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col space-y-2"> 
                                                    
                                                    {/* Status Toggle Button */}
                                                    <button
                                                        onClick={() => handleUpdateStatus(product.id, product.status)}
                                                        disabled={processingId === product.id || product.status === 'rejected'}
                                                        className={`text-white px-3 py-2 rounded-lg disabled:opacity-50 text-sm font-medium transition duration-150 ease-in-out ${
                                                            product.status === 'active' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                                                        }`}
                                                    >
                                                        {processingId === product.id ? (
                                                            <FiRefreshCw className="w-4 h-4 animate-spin inline mr-1" />
                                                        ) : (
                                                            <>
                                                                {product.status === 'active' ? (<FiXCircle className="inline w-4 h-4 mr-1" />) : (<FiCheckCircle className="inline w-4 h-4 mr-1" />)}
                                                                {product.status === 'active' ? 'Deactivate' : 'Activate'}
                                                            </>
                                                        )}
                                                    </button>

                                                    {/* Edit Button */}
                                                    <button
                                                        onClick={() => handleEditProduct(product.id)}
                                                        disabled={processingId === product.id}
                                                        className="flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition duration-150 ease-in-out"
                                                    >
                                                        <FiEdit className="w-4 h-4 mr-1" />
                                                        Edit
                                                    </button>
                                                    
                                                    {/* Delete Button */}
                                                    <button
                                                        onClick={() => handleDeleteClick(product)}
                                                        disabled={processingId === product.id}
                                                        className="flex items-center justify-center bg-gray-400 hover:bg-gray-500 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition duration-150 ease-in-out"
                                                    >
                                                        {processingId === product.id ? (
                                                            <FiRefreshCw className="w-4 h-4 animate-spin inline mr-1" />
                                                        ) : (
                                                            <FiTrash2 className="w-4 h-4 mr-1" />
                                                        )}
                                                        Delete
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
            
            {/* CONDITIONAL RENDER OF MODALS */}
            {editingProduct && (
                <InlineEditForm 
                    productData={editingProduct}
                    onSave={() => setEditingProduct(null)} 
                    onCancel={() => setEditingProduct(null)}
                    onSaveSuccess={handleSuccessNotification} 
                />
            )}

            {productToDelete && (
                <DeleteConfirmationModal
                    product={productToDelete}
                    onConfirm={finalizeDeleteProduct}
                    onCancel={() => setProductToDelete(null)}
                    isDeleting={processingId === productToDelete.id} 
                />
            )}

            {/* SUCCESS TOAST */}
            <SuccessNotificationToast 
                message={notification} 
                onClose={() => setNotification(null)} 
            />

        </div>
    );
};

export default OldeeProductsPage;