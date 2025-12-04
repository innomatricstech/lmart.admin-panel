// DeliveredOrdersTable.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiCheckCircle, FiShoppingBag } from 'react-icons/fi';
import { collection, getDocs, query, where } from 'firebase/firestore'; 
import { db } from '../../../firerbase'; 

// NOTE: Shared Helper Functions (formatAmount, formatFirestoreTimestamp, getItemDisplay) 
// and the OrderRow component are assumed to be defined/imported 
// or included directly as shown in CancelledOrdersTable.jsx for a single-file solution.

export const DeliveredOrdersTable = () => {
    // const initialOrdersData = ... // REMOVE SAMPLE DATA
    const [orders, setOrders] = useState([]);
    const [filteredOrders, setFilteredOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchOrders = async () => {
            setLoading(true);
            setError(null);
            try {
                const ordersRef = collection(db, 'orders');
                // Filter by 'Delivered' status
                const q = query(ordersRef, where('status', '==', 'Delivered')); 
                
                const querySnapshot = await getDocs(q);
                
                const ordersList = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    const customerInfo = data.customerInfo || {};

                    return {
                        id: doc.id,
                        ...data,
                        customer: data.customer || customerInfo.name || 'Unknown Customer',
                        email: data.email || customerInfo.email || 'N/A',
                        phone: data.phone || customerInfo.phone || 'N/A',
                        address: data.address || 
                            `${customerInfo.address || ''}, ${customerInfo.city || ''} - ${customerInfo.pincode || ''}`.replace(/^,\s*/, '')
                    };
                });
                
                setOrders(ordersList);
                setFilteredOrders(ordersList);
            } catch (err) {
                console.error("Error fetching delivered orders:", err);
                setError("Failed to load delivered orders. Check Firebase connection/permissions.");
            } finally {
                setLoading(false);
            }
        };

        fetchOrders();
    }, []); 

    useEffect(() => {
        // Search logic remains the same
        if (searchTerm === '') {
            setFilteredOrders(orders);
            return;
        }

        const lowerCaseSearch = searchTerm.toLowerCase();
        const result = orders.filter(order => {
            const searchFields = [
                order.customer, order.email, order.phone, order.address, 
                order.orderId || order.id, 
                JSON.stringify(order.items)
            ].join(' ').toLowerCase();
            
            return searchFields.includes(lowerCaseSearch);
        });
        setFilteredOrders(result);
    }, [searchTerm, orders]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 bg-white rounded-lg shadow-xl p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
                <p className="ml-4 text-gray-700 font-medium">Loading Delivered Orders...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-full mx-auto mt-4">
                <strong className="font-bold">Error!</strong>
                <span className="block sm:inline ml-2">{error}</span>
            </div>
        );
    }

    return (
        <div className="flex-1 p-6 lg:p-8 bg-white min-h-screen">
            <div className="orders-container bg-white rounded-lg shadow-xl p-6 border border-gray-200">
                
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-green-700 flex items-center">
                        <FiCheckCircle className="w-5 h-5 mr-2 text-green-600" /> 
                        Delivered Orders ({orders.length})
                    </h2>
                    <button className="px-4 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-md">
                        Download Report
                    </button>
                </div>

                <div className="mt-4 mb-6 relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search name, email, phone, address, order ID, or items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-2/3 md:w-1/2 p-3 pl-10 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 transition-colors text-sm bg-white text-gray-900"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                {['CUSTOMER', 'CONTACT', 'ADDRESS', 'ITEMS', 'AMOUNT', 'DATE', 'ACTIONS'].map(header => (
                                    <th
                                        key={header}
                                        className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"
                                    >
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredOrders.length > 0 ? (
                                filteredOrders.map(order => <OrderRow key={order.id} order={order} />)
                            ) : (
                                <tr>
                                    <td colSpan="7" className="p-6 text-center text-gray-500">
                                        <FiCheckCircle className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                        <p>
                                            {searchTerm 
                                                ? "No delivered orders found matching your search term." 
                                                : "No delivered orders available in the database."
                                            }
                                        </p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};