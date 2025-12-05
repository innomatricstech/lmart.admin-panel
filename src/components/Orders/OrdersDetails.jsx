import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiShoppingBag, FiUser, FiMail, FiPhone, FiMapPin, FiCalendar, FiArrowLeft, FiEdit } from 'react-icons/fi';
import { 
    doc, 
    getDoc, 
    updateDoc, 
    Timestamp 
} from 'firebase/firestore'; 
import { db } from '../../../firerbase'; 


// --- Helper Functions ---

const formatAmount = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

const formatFirestoreTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Check if it's a Firestore Timestamp object
    if (timestamp.toDate) {
        const date = timestamp.toDate();
        return date.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    // Attempt to convert if it's a standard JS Date object or ISO string
    try {
        const date = new Date(timestamp);
        if (!isNaN(date)) {
            return date.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    } catch(e) {
        return 'Invalid Date';
    }
    return 'N/A';
};

const formatOrderItems = (items) => {
    if (!items) {
        return 'No items listed.';
    }
    if (typeof items === 'string') {
        return items;
    }
    if (Array.isArray(items)) {
        if (items.length === 0) return 'No items listed.';
        return items.map((item, index) => {
            const name = item.name || 'Untitled Product';
            const quantity = item.quantity || 1;
            const price = formatAmount(item.price || 0);
            const originalPrice = item.originalPrice ? formatAmount(item.originalPrice) : '';
            const discount = item.originalPrice && item.price && item.originalPrice > item.price ? 
                ` (${Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% off)` : '';
            
            const variant = [
                item.selectedColor, 
                item.selectedSize, 
                item.selectedMaterial,
                item.selectedRam
            ].filter(v => v && v.trim() !== '').join(', ');

            const description = item.description ? `\n    Desc: ${item.description}` : '';
            
            return `${index + 1}. ${name} (x${quantity}) - ${price}${originalPrice ? ` was ${originalPrice}${discount}` : ''}\n    ${variant ? `[${variant}]` : 'No variant'}${description}`;
        }).join('\n');
    }
    if (typeof items === 'object' && items !== null) {
        return JSON.stringify(items, null, 2);
    }
    return 'Data structure for items is unexpected.';
};


// ----------------------------------------------------------------------
// --- OrderDetail Component (View Details) ---
// ----------------------------------------------------------------------

const OrderDetail = () => { // Defined without 'export' keyword here
    // userId will be 'unknown_user' for root collection orders, which is fine for display
    const { userId, orderId } = useParams(); 
    const navigate = useNavigate();
    
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'];
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const isLegacyOrder = userId === 'unknown_user';

    // Function to update order status in Firestore and local state
    const updateOrderStatus = async (newStatus) => {
        // Validation Guard: Prevents update attempts on root collection orders
        if (isLegacyOrder || !orderId || !order || newStatus === order.status) {
             if (isLegacyOrder) {
                 alert("Cannot update order. This is a Legacy Order stored in the root collection.");
             }
             return; 
        }

        const oldStatus = order.status;
        const oldUpdatedAt = order.updatedAt;

        setIsUpdatingStatus(true);
        try {
            const newTimestamp = Timestamp.fromDate(new Date());

            // 1. Optimistically update local state 
            setOrder(prevOrder => prevOrder ? { ...prevOrder, status: newStatus, updatedAt: newTimestamp } : null);

            // 2. Update Firestore - PATH IS CORRECT: users/{userId}/orders/{orderId}
            const orderRef = doc(db, 'users', userId, 'orders', orderId);
            await updateDoc(orderRef, {
                status: newStatus,
                updatedAt: newTimestamp 
            });
            
            console.log(`Order ${orderId} status updated to: ${newStatus} for user ${userId}`);
        } catch (err) {
            console.error("Error updating order status:", err);
            alert(`Failed to update status to ${newStatus}. Error: ${err.message}. Please check the console.`);
            // 3. Rollback local state on failure
            setOrder(prevOrder => prevOrder ? { ...prevOrder, status: oldStatus, updatedAt: oldUpdatedAt } : null);
        } finally {
            setIsUpdatingStatus(false);
        }
    };


    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId || !db) { 
                setLoading(false);
                setError("Configuration Error: Missing Order ID or Firebase DB instance.");
                return;
            }

            setLoading(true);
            setError(null);
            
            try {
                let orderRef;
                if (isLegacyOrder) {
                    // Path for root collection order (Cannot be updated)
                    orderRef = doc(db, 'orders', orderId);
                } else {
                    // Path for subcollection order (Can be updated)
                    orderRef = doc(db, 'users', userId, 'orders', orderId); 
                }
                
                const docSnap = await getDoc(orderRef);

                if (docSnap.exists()) {
                    const orderData = docSnap.data();
                    const customerInfo = orderData.customerInfo || {};

                    const fullAddress = orderData.address || 
                        [customerInfo.address, customerInfo.city, customerInfo.pincode]
                            .filter(Boolean)
                            .join(', ') || 'N/A';

                    setOrder({ 
                        id: docSnap.id, 
                        userId: userId, 
                        ...orderData,
                        customer: orderData.customer || customerInfo.name || 'N/A',
                        email: orderData.email || customerInfo.email || 'N/A',
                        phone: orderData.phone || customerInfo.phone || 'N/A',
                        address: fullAddress
                    });
                } else {
                    setError(`No order found with ID: ${orderId} in the expected location.`);
                }
            } catch (err) {
                console.error("Error fetching order:", err);
                setError("Failed to load order details. Please check your Firebase connection, permissions, and routing.");
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [userId, orderId, isLegacyOrder]); 
    
    // Function to handle printing/downloading the invoice
    const handlePrintInvoice = () => {
        window.print();
    };

    // Function to go back to orders list
    const handleBackToList = () => {
        navigate('/orders/all'); 
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-xl p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                <p className="ml-4 text-gray-700 font-medium">Loading Order <span className="font-mono">{orderId}</span>...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-4xl mx-auto mt-10">
                <strong className="font-bold">Error!</strong>
                <span className="block sm:inline ml-2">{error}</span>
                <button 
                    onClick={handleBackToList}
                    className="ml-4 text-red-500 underline"
                >
                    Back to list
                </button>
            </div>
        );
    }
    
    if (!order) return null;

    const totalOriginalPrice = order.items?.reduce((sum, item) => sum + (item.originalPrice || item.price || 0) * (item.quantity || 1), 0) || 0;
    const totalDiscountedPrice = order.amount || 0;
    const totalDiscount = totalOriginalPrice - totalDiscountedPrice;

    return (
        <div className="p-6 lg:p-8 bg-gray-100 min-h-screen">
            <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-2xl p-8 border border-gray-200">
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-6 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-red-600 flex items-center">
                            Order Details
                            <span className="text-lg font-mono text-gray-600 ml-3">#{order.orderId || order.id}</span>
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Payment ID: <span className="font-mono">{order.paymentId || 'N/A'}</span>
                        </p>
                    </div>
                    
                    <div className="mt-4 md:mt-0 flex items-center gap-3">
                        {isLegacyOrder && (
                            <span className="text-sm font-semibold px-3 py-1 bg-red-100 text-red-700 rounded-lg border border-red-300">
                                ⚠️ Legacy Order (Cannot Update Status)
                            </span>
                        )}
                        <FiEdit className="w-5 h-5 text-gray-400" />
                        <select
                            value={order.status || 'Pending'}
                            onChange={(e) => updateOrderStatus(e.target.value)}
                            disabled={isUpdatingStatus || isLegacyOrder}
                            className={`px-4 py-2 text-sm font-semibold rounded-lg border shadow-sm transition-colors
                                ${order.status === 'Delivered' ? 'bg-green-100 border-green-300 text-green-700' : 
                                    order.status === 'Cancelled' || order.status === 'Refunded' ? 'bg-red-100 border-red-300 text-red-700' : 
                                    'bg-yellow-100 border-yellow-300 text-yellow-700'}
                                ${isLegacyOrder ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                            `}
                            title={isLegacyOrder ? 'Cannot update status for legacy orders.' : 'Change order status'}
                        >
                            {ORDER_STATUSES.map(status => (
                                <option key={status} value={status} disabled={isLegacyOrder}>
                                    {status} {isUpdatingStatus && status === order.status ? '(Updating...)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    
                    <div className="p-5 bg-white rounded-lg border border-gray-200 shadow-md">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-4">
                            <FiUser className="w-5 h-5 mr-2 text-red-500" /> Customer Info
                        </h2>
                        <div className="space-y-3">
                            {/* FIX 1: Changed <p> to <div> for Name */}
                            <div className="text-gray-700">
                                <span className="font-medium text-gray-900 block text-sm">Name:</span> 
                                {order.customer}
                            </div>
                            
                            {/* FIX 2: Changed <p> to <div> for Email */}
                            <div className="text-gray-700">
                                <span className="font-medium text-gray-900 block text-sm">Email:</span> 
                                <div className="flex items-center">
                                    <FiMail className="w-4 h-4 mr-2 text-gray-400" />
                                    {order.email}
                                </div>
                            </div>
                            
                            {/* FIX 3: Changed <p> to <div> for Phone */}
                            <div className="text-gray-700">
                                <span className="font-medium text-gray-900 block text-sm">Phone:</span> 
                                <div className="flex items-center">
                                    <FiPhone className="w-4 h-4 mr-2 text-gray-400" />
                                    {order.phone}
                                </div>
                            </div>
                        </div>
                        {order.userId && !isLegacyOrder && (
                            <p className="text-gray-700 mt-2 text-xs border-t pt-2">
                                <span className="font-medium text-gray-900">User ID:</span> {order.userId}
                            </p>
                        )}
                    </div>

                    <div className="p-5 bg-white rounded-lg border border-gray-200 shadow-md">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-4">
                            <FiShoppingBag className="w-5 h-5 mr-2 text-red-500" /> Order Summary
                        </h2>
                        <div className="space-y-3">
                            <p className="text-gray-700">
                                <span className="font-medium text-gray-900 block text-sm">Order Date:</span> 
                                <div className="flex items-center">
                                    <FiCalendar className="w-4 h-4 mr-2 text-gray-400" />
                                    {formatFirestoreTimestamp(order.date || order.createdAt)}
                                </div>
                            </p>
                            <p className="text-gray-700">
                                <span className="font-medium text-gray-900 block text-sm">Total Amount:</span> 
                                <div className="flex items-center">
                                    <span className="text-green-600 font-bold text-xl">{formatAmount(order.amount || 0)}</span>
                                    {totalDiscount > 0 && (
                                        <span className="ml-2 text-sm text-red-500 line-through">{formatAmount(totalOriginalPrice)}</span>
                                    )}
                                </div>
                            </p>
                            {totalDiscount > 0 && (
                                <p className="text-gray-700">
                                    <span className="font-medium text-gray-900 block text-sm">Discount Saved:</span> 
                                    <span className="text-red-500 font-semibold">- {formatAmount(totalDiscount)}</span>
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="p-5 bg-white rounded-lg border border-gray-200 shadow-md">
                        <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-4">
                            <FiMapPin className="w-5 h-5 mr-2 text-red-500" /> Shipping Address
                        </h2>
                        <div className="space-y-2">
                            <p className="text-gray-700">
                                <span className="font-medium text-gray-900 block text-sm">Address:</span> 
                                {order.address}
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                                <p className="text-gray-700">
                                    <span className="font-medium text-gray-900 block text-sm">City:</span> 
                                    {order.customerInfo?.city || 'N/A'}
                                </p>
                                <p className="text-gray-700">
                                    <span className="font-medium text-gray-900 block text-sm">Pincode:</span> 
                                    {order.customerInfo?.pincode || 'N/A'}
                                </p>
                            </div>
                        </div>
                        {order.customerInfo?.latitude && order.customerInfo?.longitude && (
                                <p className="text-gray-700 mt-2 text-xs border-t pt-2">
                                    <span className="font-medium text-gray-900">GPS Coords:</span> 
                                    {order.customerInfo.latitude.toFixed(4)}, {order.customerInfo.longitude.toFixed(4)}
                                </p>
                        )}
                    </div>
                </div>

                <div className="mb-8 p-5 bg-white rounded-lg border border-gray-200 shadow-md">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-4">
                        📦 Items Ordered ({order.items?.length || 0} items)
                    </h2>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-auto">
                            {formatOrderItems(order.items)}
                        </pre>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Timestamps</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {order.createdAt && (
                                <p className="text-gray-700">
                                    <span className="font-medium text-gray-900">Created At:</span> {formatFirestoreTimestamp(order.createdAt)}
                                </p>
                            )}
                            {order.updatedAt && (
                                <p className="text-gray-700">
                                    <span className="font-medium text-gray-900">Last Updated At:</span> {formatFirestoreTimestamp(order.updatedAt)}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                    <button 
                        onClick={handleBackToList}
                        className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-semibold transition-colors inline-flex items-center justify-center shadow-md"
                    >
                        <FiArrowLeft className="w-5 h-5 mr-2" /> Back to Orders List
                    </button>
                    
                    <button 
                        onClick={handlePrintInvoice}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors shadow-md"
                    >
                        Print/Download Invoice
                    </button>
                    {/* <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-md">
                        Contact Customer
                    </button> */}
                </div>
            </div>
        </div>
    );
};

export default OrderDetail; // FIX: Added default export