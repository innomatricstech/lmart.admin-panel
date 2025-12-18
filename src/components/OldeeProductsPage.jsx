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
    getDoc,
    setDoc,
    addDoc,
    getDocs,
    writeBatch 
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
    FiCheck,
    FiPlus,
    FiX,
    FiMoreVertical
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

// --- SUCCESS NOTIFICATION TOAST ---
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

// --- CATEGORY MANAGEMENT MODAL ---
const CategoryManagementModal = ({ categories, onAddCategory, onEditCategory, onDeleteCategory, onClose }) => {
    const [newCategory, setNewCategory] = useState("");
    const [editingCategory, setEditingCategory] = useState(null);
    const [editValue, setEditValue] = useState("");
    const [categoryToDelete, setCategoryToDelete] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState("");

    const handleAddCategory = async () => {
        if (!newCategory.trim()) {
            setError("Category name cannot be empty");
            return;
        }

        const trimmedCategory = newCategory.trim();
        
        if (categories.some(cat => cat.toLowerCase() === trimmedCategory.toLowerCase())) {
            setError("Category already exists");
            return;
        }

        setIsAdding(true);
        setError("");
        
        try {
            await onAddCategory(trimmedCategory);
            setNewCategory("");
        } catch (err) {
            setError(`Failed to add category: ${err.message}`);
        } finally {
            setIsAdding(false);
        }
    };

    const handleEditClick = (category) => {
        setEditingCategory(category);
        setEditValue(category);
        setError("");
    };

    const handleSaveEdit = async () => {
        if (!editValue.trim()) {
            setError("Category name cannot be empty");
            return;
        }

        const trimmedValue = editValue.trim();
        
        if (categories.some(cat => cat.toLowerCase() === trimmedValue.toLowerCase() && cat !== editingCategory)) {
            setError("Category already exists");
            return;
        }

        if (trimmedValue === editingCategory) {
            setEditingCategory(null);
            setError("");
            return;
        }

        setIsEditing(true);
        setError("");
        
        try {
            await onEditCategory(editingCategory, trimmedValue);
            setEditingCategory(null);
            setEditValue("");
        } catch (err) {
            setError(`Failed to update category: ${err.message}`);
        } finally {
            setIsEditing(false);
        }
    };

    const handleDeleteClick = (category) => {
        setCategoryToDelete(category);
    };

    const handleConfirmDelete = async () => {
        if (!categoryToDelete) return;
        
        try {
            await onDeleteCategory(categoryToDelete);
            setCategoryToDelete(null);
        } catch (err) {
            setError(`Failed to delete category: ${err.message}`);
        }
    };

    const handleCancelEdit = () => {
        setEditingCategory(null);
        setEditValue("");
        setError("");
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            if (editingCategory) {
                handleSaveEdit();
            } else {
                handleAddCategory();
            }
        }
    };

    // Confirmation Modal for Category Deletion
    const DeleteCategoryConfirmation = () => {
        if (!categoryToDelete) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-[150]">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6">
                    <div className="flex flex-col items-center space-y-4">
                        <FiTrash2 className="w-12 h-12 text-red-500" />
                        <h3 className="text-xl font-bold text-gray-900">Delete Category</h3>
                        <p className="text-sm text-gray-600 text-center">
                            Are you sure you want to delete the category <strong>"{categoryToDelete}"</strong>?
                            <br />
                            <span className="text-red-500 font-medium">Products using this category will keep it, but it won't be available for new products.</span>
                        </p>
                    </div>
                    
                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            onClick={() => setCategoryToDelete(null)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmDelete}
                            className="flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700"
                        >
                            <FiTrash2 className="w-4 h-4 mr-2" />
                            Delete Category
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center z-[100]">
                <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Manage Categories</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <FiX className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Add Category Section */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Add New Category</label>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Enter new category name"
                                className="flex-1 p-2 border border-gray-300 rounded-md"
                                disabled={isAdding || isEditing}
                            />
                            <button
                                onClick={handleAddCategory}
                                disabled={isAdding || isEditing || !newCategory.trim()}
                                className={`px-4 py-2 rounded-md text-white ${isAdding ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-50`}
                            >
                                {isAdding ? (
                                    <FiRefreshCw className="w-5 h-5 animate-spin" />
                                ) : (
                                    <FiPlus className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Categories List */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">Existing Categories ({categories.length})</h3>
                        <div className="max-h-80 overflow-y-auto border rounded-lg">
                            {categories.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No categories yet. Add your first category!</p>
                            ) : (
                                <div className="divide-y">
                                    {categories.map((category, index) => (
                                        <div
                                            key={index}
                                            className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between group"
                                        >
                                            {editingCategory === category ? (
                                                <div className="flex-1 flex items-center space-x-2">
                                                    <input
                                                        type="text"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onKeyPress={handleKeyPress}
                                                        className="flex-1 p-2 border border-gray-300 rounded-md text-sm"
                                                        autoFocus
                                                    />
                                                    <button
                                                        onClick={handleSaveEdit}
                                                        disabled={isEditing}
                                                        className={`px-3 py-2 rounded-md text-white ${isEditing ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700'}`}
                                                    >
                                                        {isEditing ? (
                                                            <FiRefreshCw className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            'Save'
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex items-center">
                                                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-sm font-medium">
                                                            {index + 1}
                                                        </span>
                                                        <span className="ml-3 text-gray-800">{category}</span>
                                                    </div>
                                                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEditClick(category)}
                                                            className="p-1 text-blue-600 hover:text-blue-800"
                                                            title="Edit category"
                                                        >
                                                            <FiEdit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(category)}
                                                            className="p-1 text-red-600 hover:text-red-800"
                                                            title="Delete category"
                                                        >
                                                            <FiTrash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <DeleteCategoryConfirmation />
        </>
    );
};

// --- INLINE EDIT COMPONENT ---
const InlineEditForm = ({ productData, onSave, onCancel, onSaveSuccess, categories }) => {
    const [formData, setFormData] = useState({
        ...productData,
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
                price: Number(formData.price),
                offerPrice: Number(formData.offerPrice || 0),
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
                            <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                            <select 
                                id="category" 
                                name="category" 
                                value={formData.category || ""} 
                                onChange={handleChange} 
                                className="mt-1 p-2 block w-full border border-gray-300 rounded-md bg-white"
                            >
                                <option value="">Select Category</option>
                                {categories.map((category, index) => (
                                    <option key={index} value={category}>
                                        {category}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                            <select id="status" name="status" value={formData.status} onChange={handleChange} className="mt-1 p-2 block w-full border border-gray-300 rounded-md bg-white">
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="Pending">Pending Review</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700">Contact Number</label>
                            <input type="text" name="contactNumber" id="contactNumber" value={formData.contactNumber} onChange={handleChange} className="mt-1 p-2 block w-full border border-gray-300 rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                            <input type="text" name="address" id="address" value={formData.address} onChange={handleChange} className="mt-1 p-2 block w-full border border-gray-300 rounded-md" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                        <textarea id="description" name="description" rows="3" value={formData.description} onChange={handleChange} className="mt-1 p-2 block w-full border border-gray-300 rounded-md"></textarea>
                    </div>

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

// --- DELETE CONFIRMATION MODAL (Product) ---
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

// --- MAIN COMPONENT: OldeeProductsPage ---
const OldeeProductsPage = () => {
    const [products, setProducts] = useState([]); 
    const [categories, setCategories] = useState([]); 
    const [categoryDocs, setCategoryDocs] = useState([]); // Store full category documents
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [notification, setNotification] = useState(null); 
    const [productToDelete, setProductToDelete] = useState(null); 
    const [editingProduct, setEditingProduct] = useState(null); 
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    const navigate = useNavigate();

    // Fetch ALL products
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

    // Fetch categories from Firestore
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const categoriesRef = collection(db, "oldee_categories");
                const querySnapshot = await getDocs(categoriesRef);
                
                const categoriesList = [];
                const docsList = [];
                
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    categoriesList.push(data.name);
                    docsList.push({ id: doc.id, ...data });
                });
                
                // Sort categories alphabetically
                const sortedCategories = categoriesList.sort();
                const sortedDocs = docsList.sort((a, b) => 
                    a.name.localeCompare(b.name)
                );
                
                setCategories(sortedCategories);
                setCategoryDocs(sortedDocs);
                
                // If no categories exist, add default ones
                if (sortedCategories.length === 0) {
                    await initializeDefaultCategories();
                }
            } catch (err) {
                console.error("Error fetching categories:", err);
                // Set default categories if fetch fails
                const defaultCats = ["Electronics", "Furniture", "Vehicles", "Books", "Fashion", "Appliances", "Others"];
                setCategories(defaultCats);
            }
        };

        fetchCategories();
    }, []);

    // Initialize default categories
    const initializeDefaultCategories = async () => {
        const defaultCategories = [
            "Electronics", "Furniture", "Vehicles", "Books", 
            "Fashion", "Appliances", "Sports", "Toys & Games", 
            "Home & Garden", "Music & Instruments", "Others"
        ];

        try {
            const batch = writeBatch(db);
            
            for (const categoryName of defaultCategories) {
                const newDocRef = doc(collection(db, "oldee_categories"));
                batch.set(newDocRef, {
                    name: categoryName,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    isDefault: true
                });
            }
            
            await batch.commit();
            
            const newDocs = defaultCategories.map(name => ({ 
                id: `temp-${name}`, 
                name, 
                createdAt: new Date(), 
                updatedAt: new Date(),
                isDefault: true 
            }));
            
            setCategories(defaultCategories);
            setCategoryDocs(newDocs);
            
        } catch (err) {
            console.error("Error initializing categories:", err);
        }
    };

    // Add new category to Firestore
    const handleAddCategory = async (categoryName) => {
        try {
            // Add to Firestore
            const docRef = await addDoc(collection(db, "oldee_categories"), {
                name: categoryName,
                createdAt: new Date(),
                updatedAt: new Date(),
                isDefault: false
            });

            // Update local state
            const newCategory = { id: docRef.id, name: categoryName, createdAt: new Date(), updatedAt: new Date() };
            const updatedCategories = [...categories, categoryName].sort();
            const updatedDocs = [...categoryDocs, newCategory].sort((a, b) => 
                a.name.localeCompare(b.name)
            );
            
            setCategories(updatedCategories);
            setCategoryDocs(updatedDocs);
            
            // Show success notification
            setNotification(`Category "${categoryName}" added successfully!`);
            
            return true;
        } catch (err) {
            console.error("Error adding category:", err);
            throw err;
        }
    };

    // Edit existing category
    const handleEditCategory = async (oldName, newName) => {
        try {
            // Find the category document
            const categoryDoc = categoryDocs.find(doc => doc.name === oldName);
            
            if (!categoryDoc) {
                throw new Error("Category not found");
            }

            // Update in Firestore
            const categoryRef = doc(db, "oldee_categories", categoryDoc.id);
            await updateDoc(categoryRef, {
                name: newName,
                updatedAt: new Date()
            });

            // Update local state
            const updatedCategories = categories.map(cat => 
                cat === oldName ? newName : cat
            ).sort();
            
            const updatedDocs = categoryDocs.map(doc => 
                doc.name === oldName ? { ...doc, name: newName, updatedAt: new Date() } : doc
            ).sort((a, b) => a.name.localeCompare(b.name));
            
            setCategories(updatedCategories);
            setCategoryDocs(updatedDocs);

            // Update all products that use this category
            await updateProductsCategory(oldName, newName);
            
            setNotification(`Category updated from "${oldName}" to "${newName}" successfully!`);
            
            return true;
        } catch (err) {
            console.error("Error editing category:", err);
            throw err;
        }
    };

    // Update products when category name changes
    const updateProductsCategory = async (oldCategory, newCategory) => {
        try {
            const productsToUpdate = products.filter(product => product.category === oldCategory);
            
            if (productsToUpdate.length > 0) {
                const batch = writeBatch(db);
                
                productsToUpdate.forEach(product => {
                    const productRef = doc(db, "oldee", product.id);
                    batch.update(productRef, {
                        category: newCategory,
                        updatedAt: new Date()
                    });
                });
                
                await batch.commit();
                setNotification(`${productsToUpdate.length} products updated with new category name.`);
            }
        } catch (err) {
            console.error("Error updating products category:", err);
            // Don't throw error here, just log it
        }
    };

    // Delete category
    const handleDeleteCategory = async (categoryName) => {
        try {
            // Find the category document
            const categoryDoc = categoryDocs.find(doc => doc.name === categoryName);
            
            if (!categoryDoc) {
                throw new Error("Category not found");
            }

            // Don't allow deletion of default categories if you want
            if (categoryDoc.isDefault) {
                setNotification("Default categories cannot be deleted.");
                return;
            }

            // Delete from Firestore
            const categoryRef = doc(db, "oldee_categories", categoryDoc.id);
            await deleteDoc(categoryRef);

            // Update local state
            const updatedCategories = categories.filter(cat => cat !== categoryName);
            const updatedDocs = categoryDocs.filter(doc => doc.name !== categoryName);
            
            setCategories(updatedCategories);
            setCategoryDocs(updatedDocs);
            
            setNotification(`Category "${categoryName}" deleted successfully!`);
            
            return true;
        } catch (err) {
            console.error("Error deleting category:", err);
            throw err;
        }
    };

    // Update Status
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

    // Open Edit Form
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
    
    // Open Delete Confirmation Modal
    const handleDeleteClick = (product) => {
        setProductToDelete(product);
    };

    // Final Delete Action (stores in deleted_oldee)
    const finalizeDeleteProduct = async () => {
        if (!productToDelete) return;

        const productId = productToDelete.id;
        setProcessingId(productId); 

        try {
            // Copy to deleted_oldee collection
            const deletedProductRef = doc(db, "deleted_oldee", productId);
            
            const deletedProductData = {
                ...productToDelete,
                deletedAt: new Date(),
                deletedBy: "admin",
                originalCollection: "oldee",
                deletionReason: "Admin deletion"
            };

            await setDoc(deletedProductRef, deletedProductData);
            
            // Delete from original collection
            const originalRef = doc(db, "oldee", productId);
            await deleteDoc(originalRef);
            
            setNotification(`Product "${productToDelete.name}" moved to deleted collection.`); 
            setProductToDelete(null); 
        } catch (e) {
            console.error("Error moving/deleting product:", e);
            setNotification(`Failed to delete product: ${e.message}`);
        } finally {
            setProcessingId(null);
        }
    };

    // Function to set success notification message
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
                <div className="flex items-center justify-between mb-8 border-b pb-4">
                    <div className="flex items-center space-x-4">
                        <FiUser className="w-10 h-10 text-purple-600" />
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">All Oldee Products</h1>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCategoryModal(true)}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-150"
                    >
                        <FiTag className="w-5 h-5 mr-2" />
                        Manage Categories ({categories.length})
                    </button>
                </div>

                {/* COUNTER & CATEGORY STATS */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow p-6">
                        <div className="flex items-center">
                            <FiClock className="w-6 h-6 text-indigo-600 mr-3" />
                            <div>
                                <span className="text-xl font-semibold text-gray-700">
                                    {products.length} Total Products
                                </span>
                                <p className="text-sm text-gray-500">Loaded from Firestore</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow p-6">
                        <div className="flex items-center">
                            <FiPackage className="w-6 h-6 text-blue-600 mr-3" />
                            <div>
                                <span className="text-xl font-semibold text-gray-700">
                                    {categories.length} Categories
                                </span>
                                <p className="text-sm text-gray-500">Click "Manage Categories" to edit</p>
                            </div>
                        </div>
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
                                                        {/* Display category */}
                                                        {product.category && (
                                                            <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full inline-block mt-1">
                                                                {product.category}
                                                            </div>
                                                        )}
                                                        {/* Display offer price */}
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
                    categories={categories}
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

            {showCategoryModal && (
                <CategoryManagementModal
                    categories={categories}
                    onAddCategory={handleAddCategory}
                    onEditCategory={handleEditCategory}
                    onDeleteCategory={handleDeleteCategory}
                    onClose={() => setShowCategoryModal(false)}
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