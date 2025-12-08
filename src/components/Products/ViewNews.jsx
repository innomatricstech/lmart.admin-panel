import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from "react-router-dom"; 

import {
    FiTrash2,
    FiSearch,
    FiFilter,
    FiCalendar,
    FiTag,
    FiFileText,
    FiPlus,
    FiLoader,
    FiAlertTriangle,
} from 'react-icons/fi';

import { 
    collection, 
    onSnapshot, 
    query, 
    orderBy,
    deleteDoc, 
    doc 
} from "firebase/firestore";

import { db } from "../../../firerbase"; 

// 🔑 Robust Date Formatting Function to handle 'dd/mm/yyyy' string and Firestore Timestamps
const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';

    // 1. Handle Firestore Timestamp (for fields like 'createdAt')
    if (dateValue.toDate) {
        return dateValue.toDate().toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    }
    
    // 2. Handle the custom "dd/mm/yyyy" string format (for the 'date' field)
    if (typeof dateValue === 'string' && dateValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const parts = dateValue.split('/');
        // Note: Month is 0-indexed in Date constructor, so parts[1] - 1 is correct
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; 
        const year = parseInt(parts[2], 10);

        const dateObj = new Date(year, month, day);

        if (isNaN(dateObj)) return 'Invalid Date'; 
        
        return dateObj.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // 3. Fallback for other standard date formats
    try {
        const dateObj = new Date(dateValue);
        if (isNaN(dateObj)) throw new Error('Invalid Date');
         return dateObj.toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return 'Invalid Date';
    }
};

const ViewNews = () => {
    const navigate = useNavigate(); 
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSubcategory, setFilterSubcategory] = useState('');
    const [newsData, setNewsData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ----------------------------------------------------
    // 1. DATA FETCHING (Real-Time Listener)
    // ----------------------------------------------------
    useEffect(() => {
        const newsCollectionRef = collection(db, "news");
        // Sort by the 'createdAt' field in descending order to show latest first
        const newsQuery = query(newsCollectionRef, orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(
            newsQuery,
            (snapshot) => {
                const items = snapshot.docs.map(doc => ({
                    id: doc.id, 
                    ...doc.data()
                }));
                
                setNewsData(items);
                setLoading(false);
                setError(null);
                
                if (items.length === 0) {
                    setError("No news articles found in the database.");
                }
            },
            (err) => {
                console.error("Firebase fetch error:", err);
                setError("Failed to load news articles from the database.");
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []); 

    // ----------------------------------------------------
    // 2. DYNAMIC SUBCATEGORY EXTRACTION (For Filter)
    // ----------------------------------------------------
    const subcategories = useMemo(() => {
        const subs = newsData
            .map(news => news.subcategory)
            .filter(sub => sub); 
        return [...new Set(subs)].sort();
    }, [newsData]);

    // ----------------------------------------------------
    // 3. FILTERING LOGIC 
    // ----------------------------------------------------
    const filteredNews = newsData.filter(news => {
        const searchLower = searchTerm.toLowerCase();

        const matchesSearchTerm = 
            news.title?.toLowerCase().includes(searchLower) ||
            news.excerpt?.toLowerCase().includes(searchLower);

        const matchesSubcategory = filterSubcategory ? news.subcategory === filterSubcategory : true;

        return matchesSearchTerm && matchesSubcategory;
    });

    // ----------------------------------------------------
    // 4. HANDLERS
    // ----------------------------------------------------
    
    const handleDelete = async (news) => {
        if (window.confirm(`Are you sure you want to delete "${news.title}"? This action cannot be undone.`)) {
            try {
                const docRef = doc(db, "news", news.id);
                await deleteDoc(docRef);
                alert(`News "${news.title}" deleted successfully!`);
            } catch (error) {
                console.error("Error deleting news:", error);
                alert(`Failed to delete news: ${error.message}`);
            }
        }
    };
    
    const handleAddNews = () => {
        navigate('/news/add'); 
    };

    // ----------------------------------------------------
    // 5. UI RETURN
    // ----------------------------------------------------
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-4">
                        <FiFileText className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                        News Management Dashboard 🗞️
                    </h1>
                    <p className="text-gray-600 text-lg">Manage and view all news articles with real-time updates.</p>
                </div>

                {/* Main Content Card */}
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                    
                    {/* News List Section */}
                    <div className="p-8">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0">
                            <h3 className="text-2xl font-semibold text-gray-800 flex items-center">
                                <FiFileText className="w-6 h-6 mr-3 text-purple-600" />
                                News Articles
                                <span className="ml-3 bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium border border-purple-200">
                                    {loading ? '...' : `${filteredNews.length} articles`}
                                </span>
                            </h3>

                            <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                                {/* Search Input */}
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <input
                                        type="text"
                                        placeholder="Search title or excerpt..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 w-full sm:w-64 transition-shadow"
                                    />
                                </div>

                                {/* Filter by Subcategory */}
                                <div className="relative">
                                    <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <select
                                        value={filterSubcategory}
                                        onChange={(e) => setFilterSubcategory(e.target.value)}
                                        className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 w-full sm:w-48 appearance-none bg-white cursor-pointer transition-shadow"
                                        disabled={loading}
                                    >
                                        <option value="">All Categories</option>
                                        {subcategories.map((subcat) => (
                                            <option key={subcat} value={subcat}>{subcat}</option>
                                        ))}
                                    </select>
                                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                                        ▼
                                    </span>
                                </div>

                                {/* Add News Button */}
                                <button 
                                    onClick={handleAddNews}
                                    className="flex items-center justify-center space-x-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                                >
                                    <FiPlus className="w-4 h-4" />
                                    <span>Add News</span>
                                </button>
                            </div>
                        </div>

                        {/* News Table */}
                        <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-md">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-100 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-80">
                                                ARTICLE DETAILS
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-36">
                                                SUBCATEGORY
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-32">
                                                PUBLICATION DATE
                                            </th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider min-w-28">
                                                ACTION
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                                    <FiLoader className="w-8 h-8 mx-auto mb-4 text-purple-500 animate-spin" />
                                                    <p className="text-xl font-medium">Fetching articles from the cosmos...</p>
                                                </td>
                                            </tr>
                                        ) : error && filteredNews.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-12 text-center text-red-700 bg-red-50">
                                                    <FiAlertTriangle className="w-8 h-8 mx-auto mb-4 text-red-500" />
                                                    <p className="text-xl font-bold">{error}</p>
                                                    <p className="text-sm mt-1 text-red-600">Please verify your database connection or try adding an article.</p>
                                                </td>
                                            </tr>
                                        ) : filteredNews.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                                    <FiFileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                                    <p className="text-xl font-medium">No articles match your criteria.</p>
                                                    <p className="text-sm mt-1">
                                                        {searchTerm || filterSubcategory ? "Clear your search/filter to see all articles." : "Start by adding your first news article."}
                                                    </p>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredNews.map((news) => (
                                                <tr 
                                                    key={news.id} 
                                                    className="group hover:bg-purple-50 transition-colors duration-150"
                                                >
                                                    {/* ARTICLE DETAILS (Title and Excerpt) - Made more attractive */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-start">
                                                            <div className="w-3 h-3 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                                                            <div>
                                                                {/* Increased Title prominence */}
                                                                <div className="text-lg text-gray-900 group-hover:text-purple-700 transition-colors">
                                                                    {news.title || "Untitled Article"}
                                                                </div>
                                                                {/* Focused on Excerpt for description - made it italic and softer color */}
                                                                <div className="text-gray-500 text-sm italic mt-1 line-clamp-2 max-w-lg">
                                                                    {news.excerpt || "No excerpt available for this article."}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {/* SUBCATEGORY */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="inline-flex items-center px-4 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold border border-purple-300 shadow-sm">
                                                            <FiTag className="w-3.5 h-3.5 mr-1.5" />
                                                            {news.subcategory || "N/A"}
                                                        </span>
                                                    </td>
                                                    {/* DATE */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center text-gray-600">
                                                            <FiCalendar className="w-4 h-4 mr-2 text-green-500" />
                                                            <span className="text-sm font-medium text-gray-700">
                                                                {formatDate(news.date)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    {/* ACTION */}
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDelete(news);
                                                                }}
                                                                className="flex items-center space-x-1 bg-red-100 text-red-600 hover:bg-red-200 active:bg-red-300 px-3 py-2 rounded-lg transition-all duration-150 border border-red-200 shadow-sm text-sm font-medium"
                                                            >
                                                                <FiTrash2 className="w-4 h-4" />
                                                                <span>Delete</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewNews;