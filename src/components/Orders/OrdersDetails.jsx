import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiShoppingBag, FiUser, FiMail, FiPhone, FiMapPin, FiCalendar } from 'react-icons/fi';
import { doc, getDoc } from 'firebase/firestore'; 
import { db } from '../../../firerbase'; 

// Helper functions (formatAmount, formatFirestoreTimestamp, formatOrderItems) remain the same...

const formatAmount = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

const formatFirestoreTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
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
  return new Date(timestamp).toLocaleDateString('en-IN');
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
      const discount = item.originalPrice && item.price ? 
        ` (${Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}% off)` : '';
      
      const variant = [
        item.selectedColor, 
        item.selectedSize, 
        item.selectedMaterial,
        item.selectedRam
      ].filter(v => v && v.trim() !== '').join(', ');

      const lineItem = item.lineItemKey ? `\n   Line Item: ${item.lineItemKey}` : '';
      const description = item.description ? `\n   Desc: ${item.description}` : '';
      
      return `${index + 1}. ${name} (x${quantity}) - ${price}${originalPrice ? ` was ${originalPrice}${discount}` : ''}\n   ${variant ? `[${variant}]` : 'No variant'}${lineItem}${description}`;
    }).join('\n');
  }
  if (typeof items === 'object' && items !== null) {
    return JSON.stringify(items, null, 2);
  }
  return 'Data structure for items is unexpected.';
};

export const OrderDetail = () => {
  // 🛑 FIX: Expecting both userId and orderId from the nested route parameter
  const { userId, orderId } = useParams(); 
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId || !userId) {
        setLoading(false);
        setError("No Order ID or User ID provided in the URL. Check your routing setup for nested paths.");
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        // 🛑 CORE FIX: Build the path to the subcollection: 'users/{userId}/orders/{orderId}'
        const orderRef = doc(db, 'users', userId, 'orders', orderId); 
        const docSnap = await getDoc(orderRef);

        if (docSnap.exists()) {
          const orderData = docSnap.data();
          const customerInfo = orderData.customerInfo || {};
          setOrder({ 
            id: docSnap.id, 
            userId: userId, 
            ...orderData,
            customer: orderData.customer || customerInfo.name || 'N/A',
            email: orderData.email || customerInfo.email || 'N/A',
            phone: orderData.phone || customerInfo.phone || 'N/A',
            address: orderData.address || 
              `${customerInfo.address || ''}, ${customerInfo.city || ''} - ${customerInfo.pincode || ''}`.replace(/^,\s*/, '')
          });
        } else {
          setError(`No order found with ID: ${orderId} for user ${userId}`);
        }
      } catch (err) {
        console.error("Error fetching order:", err);
        setError("Failed to load order details. Please check your Firebase connection, permissions, and routing.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [userId, orderId]); 

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
      </div>
    );
  }
  
  if (!order) return null;

  const totalOriginalPrice = order.items?.reduce((sum, item) => sum + (item.originalPrice || item.price || 0) * (item.quantity || 1), 0) || 0;
  const totalDiscountedPrice = order.amount || 0;
  const totalDiscount = totalOriginalPrice - totalDiscountedPrice;

  return (
    <div className="p-6 lg:p-8 bg-white min-h-screen">
      <div className="max-w-6xl mx-auto bg-gray-50 rounded-xl shadow-2xl p-8 border border-gray-200">
        
        {/* Header with Order ID and Status */}
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
          <div className="mt-4 md:mt-0">
            <span className={`px-4 py-2 text-sm font-semibold rounded-full ${order.status === 'success' ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-100 text-red-700 border border-red-300'}`}>
              {order.status === 'success' ? '✅ Payment Successful' : order.status || 'Processing'}
            </span>
          </div>
        </div>

        {/* Customer & General Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          
          {/* Customer Info Card */}
          <div className="p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-4">
              <FiUser className="w-5 h-5 mr-2 text-red-500" /> Customer Info
            </h2>
            <div className="space-y-3">
              <p className="text-gray-700">
                <span className="font-medium text-gray-900 block text-sm">Name:</span> 
                {order.customer}
              </p>
              <p className="text-gray-700">
                <span className="font-medium text-gray-900 block text-sm">Email:</span> 
                <div className="flex items-center">
                  <FiMail className="w-4 h-4 mr-2 text-gray-400" />
                  {order.email}
                </div>
              </p>
              <p className="text-gray-700">
                <span className="font-medium text-gray-900 block text-sm">Phone:</span> 
                <div className="flex items-center">
                  <FiPhone className="w-4 h-4 mr-2 text-gray-400" />
                  {order.phone}
                </div>
              </p>
            </div>
            {order.userId && (
              <p className="text-gray-700 mt-4 pt-3 border-t border-gray-100 text-sm">
                <span className="font-medium text-gray-900 block text-sm">User ID:</span> 
                <span className="font-mono text-xs">{order.userId}</span>
              </p>
            )}
          </div>

          {/* Order Summary Card */}
          <div className="p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
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
                  <span className="font-medium text-gray-900 block text-sm">Discount:</span> 
                  <span className="text-red-500 font-semibold">- {formatAmount(totalDiscount)}</span>
                </p>
              )}
            </div>
          </div>

          {/* Shipping Address Card */}
          <div className="p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-4">
              <FiMapPin className="w-5 h-5 mr-2 text-red-500" /> Shipping Address
            </h2>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-medium text-gray-900 block text-sm">Address:</span> 
                {order.customerInfo?.address || 'N/A'}
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
          </div>
        </div>

        {/* Items Ordered */}
        <div className="mb-8 p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-4">
            📦 Items Ordered ({order.items?.length || 0} items)
          </h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-auto">
              {formatOrderItems(order.items)}
            </pre>
          </div>
          
          {/* Additional Order Information */}
          {(order.createdAt || order.customerInfo?.latitude) && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {order.createdAt && (
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-900">Created:</span> {formatFirestoreTimestamp(order.createdAt)}
                  </p>
                )}
                {order.customerInfo?.latitude && order.customerInfo?.longitude && (
                  <p className="text-gray-700">
                    <span className="font-medium text-gray-900">Location:</span> 
                    {order.customerInfo.latitude}, {order.customerInfo.longitude}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          {/* Back Button */}
          <Link 
            to="/orders" 
            className="px-6 py-3 bg-gray-300 hover:bg-gray-400 text-gray-900 rounded-lg font-semibold transition-colors inline-flex items-center justify-center"
          >
            ← Back to Orders List
          </Link>
          
          {/* Action Buttons (Placeholder for functionality) */}
          <button className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors">
            Print Invoice
          </button>
          <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
            Contact Customer
          </button>
        </div>
      </div>
    </div>
  );
};