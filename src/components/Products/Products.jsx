import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom"; // Keep navigate for Add/Edit
import { 
    doc, 
    getDoc, 
    collection,
    query,
    orderBy,
    onSnapshot,
} from "firebase/firestore";

// Icon imports
import { 
    ArrowDownTrayIcon, 
    PlusIcon,
    MagnifyingGlassIcon, 
    CubeIcon,
    EyeIcon,
    PencilSquareIcon,
    PhotoIcon,
    TagIcon,
    BuildingStorefrontIcon,
    CurrencyRupeeIcon,
    ArchiveBoxIcon,
    ArrowLeftIcon, 
    ClockIcon 
} from '@heroicons/react/20/solid'; 

// IMPORTANT: Adjust this path to the correct location of your Firebase config file
import { db } from "../../../firerbase"; 

// ==========================================================
// 1. PRODUCT LIST COMPONENT (Products)
//    - Now handles state for integrated detail view.
// ==========================================================

const initialProducts = [];

const Products = () => {
    // NEW STATE: Tracks the ID of the product currently selected for viewing
    const [selectedProductId, setSelectedProductId] = useState(null); 
    
    const [products, setProducts] = useState(initialProducts);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); 

    const navigate = useNavigate();

    // --- Data Fetching (Real-time Listener) ---
    useEffect(() => {
        try {
            const productsQuery = query(
                collection(db, "products"),
                orderBy("createdAt", "desc")
            );

            const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
                const productsList = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setProducts(productsList);
                setLoading(false);
            }, 
            (err) => {
                console.error("Error fetching products:", err);
                setError("Failed to load products. Check console for details.");
                setLoading(false);
            });

            return () => unsubscribe(); 

        } catch (err) {
            console.error("Error setting up product listener:", err);
            setError("Failed to initialize database connection.");
            setLoading(false);
        }
    }, []);

    // --- Filtering & Handlers ---
    const filteredProducts = products.filter(product =>
        product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatVariants = (variants) => {
        if (!variants || variants.length === 0) {
            return <span className="text-gray-400 italic text-sm">N/A</span>;
        }
        const displayVariants = variants.slice(0, 3).join(", ");
        return variants.length > 3 ? `${displayVariants}, ...` : displayVariants;
    };

    const handleAddProduct = () => navigate("/products/add");
    
    // MODIFIED: Sets the state to show the detail view on the same page
    const handleViewProduct = (productId) => setSelectedProductId(productId);
    
    const handleEditProduct = (productId) => navigate(`/products/edit/${productId}`);
    const handleDownloadExcel = () => alert("Functionality to download Excel is pending...");
    
    // NEW: Handler to close the detail view and return to the list
    const handleCloseView = () => setSelectedProductId(null); 

    // Get first product image or placeholder
    const getProductImage = (product) => {
        if (product.imageUrls && product.imageUrls.length > 0 && product.imageUrls[0].url) {
            return product.imageUrls[0].url;
        }
        return "https://via.placeholder.com/80x80/f3f4f6/9ca3af?text=No+Image";
    };

    // --- Loading/Error States ---
    if (loading) {
        return (
            <div className="flex justify-center items-center p-16 min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <div className="text-lg font-medium text-indigo-600">Loading Products...</div>
                    <p className="text-gray-500 text-sm mt-2">Fetching your inventory data</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
                <div className="text-center p-10 bg-red-50 border-l-4 border-red-500 text-red-700 max-w-lg shadow-lg rounded-xl">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CubeIcon className="h-8 w-8 text-red-500" />
                    </div>
                    <h3 className="font-bold text-xl mb-2">Operation Failed</h3>
                    <p>{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="mt-4 bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }
    
    // --- CONDITIONAL RENDER: Show Detail View if a product is selected ---
    if (selectedProductId) {
        return (
            <IntegratedProductView 
                productId={selectedProductId} 
                onClose={handleCloseView} 
                navigate={navigate} // Pass navigate for edit action
            />
        );
    }

    // --- Main List Render ---
    return (
        <div className="p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
            <div className="max-w-7xl mx-auto">

                {/* Header Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full mb-4">
                        <CubeIcon className="h-10 w-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                        Product Inventory
                    </h1>
                    <p className="text-gray-600 text-lg">Manage and organize your product catalog</p>
                </div>

                {/* Stats and Actions Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-6 lg:space-y-0">
                        {/* Stats */}
                        <div className="flex items-center space-x-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-indigo-600">{products.length}</div>
                                <div className="text-sm text-gray-500">Total Products</div>
                            </div>
                            <div className="h-12 w-px bg-gray-200"></div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-600">
                                    {products.filter(p => p.stock > 10).length}
                                </div>
                                <div className="text-sm text-gray-500">In Stock</div>
                            </div>
                            <div className="h-12 w-px bg-gray-200"></div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-yellow-600">
                                    {products.filter(p => p.stock > 0 && p.stock <= 10).length}
                                </div>
                                <div className="text-sm text-gray-500">Low Stock</div>
                            </div>
                        </div>

                        {/* Search and Actions */}
                        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                            {/* Search Input */}
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search products..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-4 py-3 border border-gray-300 rounded-xl w-full sm:w-80 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                                />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex space-x-3">
                                <button
                                    onClick={handleDownloadExcel}
                                    className="flex items-center space-x-2 bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-600 transition-all duration-200 transform hover:scale-[1.02] shadow-md"
                                >
                                    <ArrowDownTrayIcon className="h-5 w-5" />
                                    <span>Export</span>
                                </button>

                                <button
                                    onClick={handleAddProduct}
                                    className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-500/50 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02]"
                                >
                                    <PlusIcon className="h-5 w-5" />
                                    <span>Add Product</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Products Grid/Table */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    {/* Table Header */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                <BuildingStorefrontIcon className="h-5 w-5 mr-2 text-indigo-600" />
                                Product Catalog
                            </h3>
                            <span className="text-sm text-gray-500">
                                Showing {filteredProducts.length} of {products.length} products
                            </span>
                        </div>
                    </div>

                    {/* Products List */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">PRODUCT</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">DETAILS</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">PRICING</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">STOCK</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">VARIANTS</th>
                                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">ACTIONS</th>
                                </tr>
                            </thead>

                            <tbody className="bg-white divide-y divide-gray-100">
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-indigo-50/30 transition-colors duration-150">
                                        
                                        {/* PRODUCT COLUMN */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-4">
                                                <div className="flex-shrink-0">
                                                    <img
                                                        src={getProductImage(product)}
                                                        alt={product.name}
                                                        className="w-16 h-16 rounded-xl object-cover border border-gray-200 shadow-sm"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-gray-900 text-lg hover:text-indigo-600 cursor-pointer transition-colors"
                                                         onClick={() => handleViewProduct(product.id)} // Added view handler on name click too
                                                    >
                                                        {product.name || 'Untitled Product'}
                                                    </div>
                                                    <div className="text-sm text-gray-500 truncate max-w-xs">
                                                        {product.description || "No description available"}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* DETAILS COLUMN */}
                                        <td className="px-6 py-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <TagIcon className="h-4 w-4 mr-2 text-blue-500" />
                                                    <span className="font-medium">{product.sku || '-'}</span>
                                                </div>
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <BuildingStorefrontIcon className="h-4 w-4 mr-2 text-green-500" />
                                                    <span>{product.brand?.name || product.brand || '-'}</span>
                                                </div>
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <ArchiveBoxIcon className="h-4 w-4 mr-2 text-purple-500" />
                                                    <span>{product.category?.name || product.category || '-'}</span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* PRICING COLUMN */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-lg font-bold text-green-700">
                                                <CurrencyRupeeIcon className="h-5 w-5 mr-1" />
                                                {Number(product.price || 0).toFixed(2)}
                                            </div>
                                        </td>

                                        {/* STOCK COLUMN */}
                                        <td className="px-6 py-4 text-center">
                                            {product.stock > 10 ? (
                                                <span className="inline-flex items-center px-3 py-1.5 text-sm font-semibold bg-green-100 text-green-800 rounded-full border border-green-200">
                                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                                    {product.stock} in stock
                                                </span>
                                            ) : product.stock > 0 ? (
                                                <span className="inline-flex items-center px-3 py-1.5 text-sm font-semibold bg-yellow-100 text-yellow-800 rounded-full border border-yellow-200">
                                                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                                                    Low Stock ({product.stock})
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-3 py-1.5 text-sm font-semibold bg-red-100 text-red-800 rounded-full border border-red-200">
                                                    <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                                                    Out of stock
                                                </span>
                                            )}
                                        </td>

                                        {/* VARIANTS COLUMN */}
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="text-sm text-gray-700">
                                                    <span className="font-medium">Colors:</span> {formatVariants(product.colorVariants)}
                                                </div>
                                                <div className="text-sm text-gray-700">
                                                    <span className="font-medium">Sizes:</span> {formatVariants(product.sizeVariants)}
                                                </div>
                                            </div>
                                        </td>
                                        
                                        {/* ACTIONS COLUMN */}
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center space-x-2">
                                                <button 
                                                    onClick={() => handleViewProduct(product.id)}
                                                    className="flex items-center space-x-1 bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors duration-200 font-medium text-sm"
                                                    title="View Product"
                                                >
                                                    <EyeIcon className="h-4 w-4" />
                                                    <span>View</span>
                                                </button>
                                                
                                                <button 
                                                    onClick={() => handleEditProduct(product.id)}
                                                    className="flex items-center space-x-1 bg-green-50 text-green-600 hover:bg-green-100 px-3 py-2 rounded-lg transition-colors duration-200 font-medium text-sm"
                                                    title="Edit Product"
                                                >
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                    <span>Edit</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Empty State */}
                    {filteredProducts.length === 0 && (
                        <div className="text-center p-16 border-t border-gray-200">
                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CubeIcon className="h-12 w-12 text-gray-400" />
                            </div>
                            <p className="text-2xl font-semibold text-gray-600 mb-2">No Products Found</p>
                            <p className="text-gray-500 mb-6 max-w-md mx-auto">
                                {products.length > 0 && searchTerm 
                                    ? `No products match "${searchTerm}". Try a different search term.`
                                    : "Start building your product catalog by adding your first product."
                                }
                            </p>
                            {products.length === 0 && (
                                <button
                                    onClick={handleAddProduct}
                                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-colors inline-flex items-center space-x-2"
                                >
                                    <PlusIcon className="h-5 w-5" />
                                    <span>Add Your First Product</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ==========================================================
// 2. DETAIL CARD UTILITY COMPONENT
// ==========================================================

const DetailCard = ({ icon: Icon, title, values }) => (
    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
        <h3 className="flex items-center text-lg font-semibold text-gray-800 border-b pb-2 mb-2">
            <Icon className="h-5 w-5 mr-2 text-indigo-500" />
            {title}
        </h3>
        <dl className="space-y-1">
            {values.map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                    <dt className="text-gray-500">{label}:</dt>
                    <dd className="font-medium text-gray-700 max-w-[60%] text-right">{value}</dd>
                </div>
            ))}
        </dl>
    </div>
);


// ==========================================================
// 3. INTEGRATED PRODUCT VIEW COMPONENT 
//    (Modified from ProductView to use props instead of React Router hooks)
// ==========================================================
const IntegratedProductView = ({ productId, onClose, navigate }) => {
    // Note: This component is placed inside the Products component's render logic, 
    // so it receives productId, onClose, and navigate as props.
    
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // --- Data Fetching ---
    useEffect(() => {
        if (!productId) {
            setError("No product ID provided.");
            setLoading(false);
            return;
        }

        const fetchProduct = async () => {
            try {
                const docRef = doc(db, "products", productId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setProduct({ id: docSnap.id, ...docSnap.data() });
                } else {
                    setError(`Product with ID ${productId} not found.`);
                }
            } catch (err) {
                console.error("Error fetching product details:", err);
                setError("Failed to load product details due to a database error.");
            } finally {
                setLoading(false);
            }
        };
        
        // Reset state before fetching new product details
        setProduct(null);
        setLoading(true);
        setError(null);
        
        fetchProduct();
    }, [productId]); // Re-run effect when productId changes

    // --- Utility Functions ---
    const formatVariants = (variants) => {
        if (!variants || variants.length === 0) {
            return 'None';
        }
        return variants.join(", ");
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        try {
            // Converts Firestore Timestamp object to readable date string
            const date = timestamp.toDate(); 
            return date.toLocaleString();
        } catch (e) {
            return String(timestamp);
        }
    };
    
    // --- UI: Loading State ---
    if (loading) {
        return (
            <div className="flex justify-center items-center p-16 min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
                <div className="text-lg font-medium text-indigo-600">Loading Product Details...</div>
            </div>
        );
    }

    // --- UI: Error/Not Found State ---
    if (error || !product) {
        return (
            <div className="text-center p-10 bg-red-50 border-l-4 border-red-500 text-red-700 mx-auto max-w-lg mt-10 shadow-lg rounded-xl">
                <h3 className="font-bold text-xl mb-2">Error</h3>
                <p>{error || "Product data is missing or inaccessible."}</p>
                <button 
                    onClick={onClose} // Use the prop to go back to the list
                    className="mt-4 bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors"
                >
                    Back to Products List
                </button>
            </div>
        );
    }

    // --- UI: Main Component Render ---
    return (
        <div className="p-8 bg-gradient-to-br from-gray-50 to-blue-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                
                {/* Header and Actions */}
                <div className="flex justify-between items-center mb-6">
                    <button 
                        onClick={onClose} // Use the prop to go back to the list
                        className="flex items-center text-indigo-600 hover:text-indigo-800 transition duration-150"
                    >
                        <ArrowLeftIcon className="h-5 w-5 mr-1" />
                        <span className="font-medium">Back to Products List</span>
                    </button>
                    <button
                        onClick={() => navigate(`/products/edit/${product.id}`)}
                        className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-xl font-semibold shadow-md hover:bg-green-600 transition"
                    >
                        <PencilSquareIcon className="h-5 w-5" />
                        <span>Edit Product</span>
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                    
                    {/* Main Product Info and Image */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 border-b pb-6 mb-6">
                        
                        {/* Image Gallery */}
                        <div className="lg:col-span-1">
                            <h3 className="flex items-center text-xl font-semibold text-gray-800 mb-4">
                                <PhotoIcon className="h-6 w-6 mr-2 text-indigo-500" />
                                Product Images
                            </h3>
                            <img
                                src={product.imageUrls?.[0]?.url || "https://via.placeholder.com/400x400/f3f4f6/9ca3af?text=No+Image"}
                                alt={product.name}
                                className="w-full h-auto rounded-xl object-cover shadow-lg border border-gray-200"
                            />
                            <div className="flex space-x-2 mt-4 overflow-x-auto">
                                {product.imageUrls?.slice(0, 4).map((img, i) => (
                                    <img 
                                        key={i} 
                                        src={img.url} 
                                        alt={`Thumbnail ${i + 1}`} 
                                        className="w-16 h-16 object-cover rounded-lg cursor-pointer border-2 border-transparent hover:border-indigo-500 transition"
                                    />
                                ))}
                                {product.imageUrls?.length > 4 && (
                                     <div className="w-16 h-16 flex items-center justify-center text-gray-500 text-sm border rounded-lg bg-gray-50">
                                        +{product.imageUrls.length - 4}
                                     </div>
                                )}
                            </div>
                        </div>

                        {/* Pricing & Inventory Card */}
                        <div className="lg:col-span-2 p-6 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
                             <h3 className="flex items-center text-xl font-semibold text-gray-800 mb-6 border-b pb-3">
                                <CurrencyRupeeIcon className="h-6 w-6 mr-2 text-green-600" />
                                Pricing & Inventory
                            </h3>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b pb-2">
                                    <div className="text-lg text-gray-600">Regular Price</div>
                                    <div className="text-2xl font-bold text-green-700 flex items-center">
                                        <CurrencyRupeeIcon className="h-5 w-5 mr-0.5" />
                                        {Number(product.price || 0).toFixed(2)}
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center border-b pb-2">
                                    <div className="text-lg text-gray-600">Stock Quantity</div>
                                    <span className="inline-flex items-center px-3 py-1 text-sm font-semibold bg-green-100 text-green-800 rounded-full">
                                        {product.stock || 0} units
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <div className="text-lg text-gray-600">Stock Status</div>
                                    {product.stock > 10 ? (
                                        <span className="inline-flex items-center px-3 py-1 text-sm font-semibold bg-green-500 text-white rounded-full">
                                            In Stock
                                        </span>
                                    ) : product.stock > 0 ? (
                                        <span className="inline-flex items-center px-3 py-1 text-sm font-semibold bg-yellow-500 text-white rounded-full">
                                            Low Stock
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-3 py-1 text-sm font-semibold bg-red-500 text-white rounded-full">
                                            Out of Stock
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Description and Identification/Classification Cards */}
                    <div className="border-b pb-6 mb-6">
                         <h3 className="text-2xl font-semibold text-gray-900 mb-4">Product Overview</h3>
                         <p className="text-gray-700 bg-indigo-50 p-4 rounded-lg italic">
                            {product.description || "No detailed product description available."}
                         </p>
                    </div>

                    {/* Technical Specifications - Organized using the DetailCard component */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                        
                        {/* Detail Card 1: Identification */}
                        <DetailCard 
                            icon={TagIcon} 
                            title="Product Identification" 
                            values={[
                                ['SKU', product.sku || 'N/A'],
                                ['HSN Code', product.hsnCode || 'N/A'],
                                ['Seller ID', product.sellerId || 'N/A'], // Assuming sellerId is a field
                                ['Status', product.status || 'N/A'],
                            ]}
                        />

                        {/* Detail Card 2: Classification */}
                        <DetailCard 
                            icon={ArchiveBoxIcon} 
                            title="Classification" 
                            values={[
                                ['Brand', product.brand?.name || product.brand || 'N/A'],
                                ['Category', product.category?.name || 'N/A'], 
                                ['Sub-Category', product.subCategory?.name || 'N/A'],
                            ]}
                        />

                        {/* Detail Card 3: Variants */}
                        <DetailCard 
                            icon={PhotoIcon} 
                            title="Variants" 
                            values={[
                                ['Colors', formatVariants(product.colorVariants)],
                                ['Sizes/Storage', formatVariants(product.sizeVariants)]
                            ]}
                        />

                        {/* Detail Card 4: Timestamps */}
                        <DetailCard 
                            icon={ClockIcon} 
                            title="Timeline" 
                            values={[
                                ['Created At', formatDate(product.createdAt)],
                                ['Last Updated', formatDate(product.updatedAt)],
                            ]}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};


// Default export remains the Products list component
export default Products;