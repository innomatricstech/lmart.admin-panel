// EditSellerPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    FiUser, FiMail, FiPhone, FiMapPin, FiSave, 
    FiLoader, FiXCircle, FiCheckCircle 
} from 'react-icons/fi';

// 🚨 IMPORTANT: Ensure this path is correct for your project
import { db } from "../../../firerbase"; 
import { doc, getDoc, updateDoc } from "firebase/firestore";

export default function EditSellerPage() {
    // Get the seller ID from the URL (e.g., /sellers/edit/123)
    const { id } = useParams();
    const navigate = useNavigate();

    const [seller, setSeller] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    // --- 1. Fetch Seller Data (View Logic) ---
    useEffect(() => {
        const fetchSeller = async () => {
            setLoading(true);
            setError(null);
            try {
                const docRef = doc(db, "sellers", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    // Set the form state with current seller data
                    setSeller({ 
                        id: docSnap.id, 
                        ...docSnap.data() 
                    });
                } else {
                    setError("No seller found with this ID.");
                }
            } catch (err) {
                console.error("Error fetching seller:", err);
                setError("Failed to load seller data. Please check connection.");
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchSeller();
        }
    }, [id]);

    // Handle form field changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setSeller(prevSeller => ({
            ...prevSeller,
            [name]: value,
        }));
    };

    // --- 2. Update Seller Data (Edit Logic) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const sellerRef = doc(db, "sellers", id);
            
            // Only update the fields that are directly editable on the form
            await updateDoc(sellerRef, {
                name: seller.name,
                email: seller.email,
                phone: seller.phone,
                city: seller.city,
                // Add any other editable fields here
            });

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000); // Hide success message after 3 seconds
            
        } catch (err) {
            console.error("Error updating seller:", err);
            setError("Failed to save changes. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    // --- Conditional Rendering ---
    
    if (loading) {
        return (
            <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen flex justify-center items-start pt-20">
                <FiLoader className="w-8 h-8 animate-spin mr-3 text-blue-500" />
                <p className="text-xl text-gray-600 font-semibold">Loading Seller Data...</p>
            </div>
        );
    }

    if (error && !seller) {
        return (
            <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
                <div className="p-6 bg-red-100 border-l-4 border-red-500 text-red-800 rounded-lg shadow-md">
                    <p className="font-bold">Error Loading Seller:</p>
                    <p>{error}</p>
                    <button 
                        onClick={() => navigate('/sellers')} 
                        className="mt-3 px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                        Go Back to List
                    </button>
                </div>
            </div>
        );
    }
    
    if (!seller) return null; // Should be covered by error state, but good practice

    return (
        <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl mx-auto">
                
                <h2 className="text-3xl font-extrabold text-gray-900 mb-6 flex items-center">
                    <FiUser className="w-7 h-7 mr-3 text-blue-600" /> 
                    Edit Seller: {seller.name}
                </h2>
                <p className="text-sm text-gray-500 mb-8">
                    Editing record for Seller ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded text-gray-700">{seller.id}</span>
                </p>

                {/* Success Message */}
                {success && (
                    <div className="p-4 mb-4 bg-green-100 border-l-4 border-green-500 text-green-700 rounded-lg flex items-center shadow-md">
                        <FiCheckCircle className="w-5 h-5 mr-3" />
                        <span className="font-semibold">Changes saved successfully!</span>
                    </div>
                )}
                
                {/* Error Message */}
                {error && (
                    <div className="p-4 mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded-lg flex items-center shadow-md">
                        <FiXCircle className="w-5 h-5 mr-3" />
                        <span className="font-semibold">Save Error: </span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name Field */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 flex items-center">
                            <FiUser className="w-4 h-4 mr-2" /> Seller Name
                        </label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            value={seller.name || ''}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    
                    {/* Email Field */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 flex items-center">
                            <FiMail className="w-4 h-4 mr-2" /> Email Address
                        </label>
                        <input
                            type="email"
                            name="email"
                            id="email"
                            value={seller.email || ''}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Phone Field */}
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 flex items-center">
                            <FiPhone className="w-4 h-4 mr-2" /> Phone Number
                        </label>
                        <input
                            type="tel"
                            name="phone"
                            id="phone"
                            value={seller.phone || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* City Field */}
                    <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700 flex items-center">
                            <FiMapPin className="w-4 h-4 mr-2" /> City / Location
                        </label>
                        <input
                            type="text"
                            name="city"
                            id="city"
                            value={seller.city || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Save Button */}
                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:bg-blue-300"
                        >
                            {saving ? (
                                <>
                                    <FiLoader className="w-5 h-5 animate-spin mr-2" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <FiSave className="w-5 h-5 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}