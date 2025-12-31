import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from "react-router-dom";

import {
    FiTrash2,
    FiSearch,
    FiCalendar,
    FiTag,
    FiFileText,
    FiPlus,
    FiLoader,
    FiAlertTriangle,
    FiX,
    FiImage,
    FiClock,
    FiEye,
    FiVideo,
    FiEdit2,
    FiFilter,
    FiGlobe,
    FiTrendingUp,
    FiBarChart2,
    FiDownload
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

/* ---------------- DATE FORMATTERS ---------------- */

const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';

    if (dateValue.toDate) {
        return dateValue.toDate().toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    if (typeof dateValue === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
        const [d, m, y] = dateValue.split('/');
        return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    return 'Invalid Date';
};

const formatCreationDate = (timestamp) => {
    if (!timestamp?.toDate) return 'N/A';
    return timestamp.toDate().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const getTimeAgo = (timestamp) => {
    if (!timestamp?.toDate) return '';
    const now = new Date();
    const created = timestamp.toDate();
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatCreationDate(timestamp);
};

/* ---------------- DELETE MODAL ---------------- */

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, newsItem }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full transform transition-all duration-300 scale-100 animate-fadeInUp">
                <div className="mb-6 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiAlertTriangle className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Delete Article</h3>
                    <p className="text-gray-600">
                        Are you sure you want to permanently delete this article?
                    </p>
                </div>
                
                <div className="mb-8 p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-semibold text-gray-800 mb-2">{newsItem?.title}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                            <FiTag size={14} />
                            {newsItem?.category}
                        </span>
                        <span className="flex items-center gap-1">
                            <FiCalendar size={14} />
                            {formatDate(newsItem?.date)}
                        </span>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <button 
                        onClick={onClose}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition duration-200 font-medium"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition duration-200 font-medium shadow-lg hover:shadow-xl"
                    >
                        Delete Article
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ---------------- VIEW DETAILS MODAL ---------------- */

const ViewDetailsModal = ({ isOpen, onClose, newsItem }) => {
    if (!isOpen || !newsItem) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 overflow-y-auto p-4">
            <div className="bg-white rounded-2xl max-w-4xl  w-full my-6 transform transition-all duration-300 animate-fadeInUp">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 mt-26 to-purple-600 p-6 rounded-t-2xl">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">{newsItem.title}</h2>
                            <div className="flex items-center gap-4 text-blue-100">
                                <span className="flex items-center gap-2">
                                    <FiTag size={16} />
                                    {newsItem.category}
                                </span>
                                <span className="flex items-center gap-2">
                                    <FiCalendar size={16} />
                                    {formatDate(newsItem.date)}
                                </span>
                                {newsItem.createdAt && (
                                    <span className="flex items-center gap-2">
                                        <FiClock size={16} />
                                        {getTimeAgo(newsItem.createdAt)}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="text-white hover:bg-white/20 p-2 rounded-full transition duration-200"
                        >
                            <FiX size={24} />
                        </button>
                    </div>
                </div>

                <div className="p-6 ">
                    {/* Media Section */}
                    {(newsItem.imageUrl || newsItem.videoUrl) && (
                        <div className="mb-8">
                            <div className="grid md:grid-cols-2 gap-6">
                                {newsItem.imageUrl && (
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                                            <FiImage className="text-red-600" /> Featured Image
                                        </h4>
                                        <div className="rounded-xl overflow-hidden border shadow-lg">
                                            <img
                                                src={newsItem.imageUrl}
                                                alt="news"
                                                className="w-full h-64 object-contain hover:scale-105 transition-transform duration-300"
                                            />
                                        </div>
                                    </div>
                                )}
                                
                                {newsItem.videoUrl && (
                                    <div className="space-y-2">
                                        <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                                            <FiVideo className="text-blue-600" /> Featured Video
                                        </h4>
                                        <div className="rounded-xl overflow-hidden border shadow-lg">
                                            <video
                                                src={newsItem.videoUrl}
                                                controls
                                                className="w-full h-64 bg-black"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Content Section */}
                    <div className="space-y-4">
                        <h4 className="text-xl font-bold text-gray-800 border-b pb-2">Article Content</h4>
                        <div className="prose max-w-none">
                            <p className="text-gray-700 leading-relaxed whitespace-pre-line bg-gray-50 p-6 rounded-xl">
                                {newsItem.excerpt}
                            </p>
                        </div>
                    </div>

                    {/* Metadata */}
                    {newsItem.createdAt && (
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <h5 className="text-sm font-semibold text-gray-500 mb-3">ARTICLE METADATA</h5>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <div className="text-xs text-gray-500">Published On</div>
                                    <div className="font-medium">{formatDate(newsItem.date)}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <div className="text-xs text-gray-500">Created</div>
                                    <div className="font-medium">{formatCreationDate(newsItem.createdAt)}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <div className="text-xs text-gray-500">Category</div>
                                    <div className="font-medium">{newsItem.category}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <div className="text-xs text-gray-500">Media</div>
                                    <div className="font-medium">
                                        {newsItem.imageUrl && newsItem.videoUrl ? 'Image + Video' : 
                                         newsItem.imageUrl ? 'Image Only' : 
                                         newsItem.videoUrl ? 'Video Only' : 'No Media'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
                        <button 
                            onClick={onClose}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition duration-200 font-medium"
                        >
                            Close
                        </button>
                       
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ---------------- NEWS CARD COMPONENT ---------------- */

const NewsCard = ({ news, onView, onDelete }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div 
            className="bg-white rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-2xl transition-all duration-300 overflow-hidden group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Image/Video Thumbnail */}
            <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                {news.imageUrl ? (
                    <img 
                        src={news.imageUrl} 
                        alt={news.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                ) : news.videoUrl ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="relative">
                            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                                <FiVideo className="w-8 h-8 text-white" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-3">
                                <FiFileText className="w-8 h-8 text-gray-600" />
                            </div>
                            <p className="text-gray-500 text-sm">No Media</p>
                        </div>
                    </div>
                )}
                
                {/* Category Badge */}
                <div className="absolute top-4 left-4">
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                        {news.category}
                    </span>
                </div>

                {/* Time Badge */}
                {news.createdAt && (
                    <div className="absolute top-4 right-4">
                        <span className="bg-black/70 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                            {getTimeAgo(news.createdAt)}
                        </span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-6">
                <h3 className="font-bold text-lg text-gray-800 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors duration-200">
                    {news.title}
                </h3>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {news.excerpt}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <FiCalendar size={14} />
                        {formatDate(news.date)}
                    </div>
                    
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                            onClick={onView}
                            className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition duration-200 shadow-lg hover:shadow-xl"
                            title="View Details"
                        >
                            <FiEye size={18} />
                        </button>
                        <button
                            onClick={onDelete}
                            className="p-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition duration-200 shadow-lg hover:shadow-xl"
                            title="Delete Article"
                        >
                            <FiTrash2 size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ---------------- STATS COMPONENT ---------------- */

const StatsCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
                <p className={`text-3xl font-bold ${color}`}>{value}</p>
            </div>
            <div className={`p-3 rounded-xl bg-gradient-to-br ${color.includes('blue') ? 'from-blue-100 to-blue-200' : 
                              color.includes('green') ? 'from-green-100 to-green-200' : 
                              color.includes('purple') ? 'from-purple-100 to-purple-200' : 'from-gray-100 to-gray-200'}`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
        </div>
    </div>
);

/* ---------------- MAIN COMPONENT ---------------- */

const ViewNews = () => {
    const navigate = useNavigate();

    const [newsData, setNewsData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('all');

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedNews, setSelectedNews] = useState(null);

    /* FETCH NEWS */
    useEffect(() => {
        const q = query(collection(db, "news"), orderBy("createdAt", "desc"));

        const unsub = onSnapshot(q, (snapshot) => {
            setNewsData(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });

        return () => unsub();
    }, []);

    /* FILTER */
    const filteredNews = useMemo(() => {
        const term = searchTerm.toLowerCase();
        let filtered = newsData.filter(n =>
            n.title?.toLowerCase().includes(term) ||
            n.excerpt?.toLowerCase().includes(term) ||
            n.category?.toLowerCase().includes(term)
        );

        if (activeFilter === 'withImage') {
            filtered = filtered.filter(n => n.imageUrl);
        } else if (activeFilter === 'withVideo') {
            filtered = filtered.filter(n => n.videoUrl);
        } else if (activeFilter === 'noMedia') {
            filtered = filtered.filter(n => !n.imageUrl && !n.videoUrl);
        }

        return filtered;
    }, [newsData, searchTerm, activeFilter]);

    /* STATS */
    const stats = useMemo(() => ({
        total: newsData.length,
        withImage: newsData.filter(n => n.imageUrl).length,
        withVideo: newsData.filter(n => n.videoUrl).length,
        categories: [...new Set(newsData.map(n => n.category))].length
    }), [newsData]);

    /* DELETE */
    const confirmDelete = async () => {
        await deleteDoc(doc(db, "news", selectedNews.id));
        setDeleteModalOpen(false);
    };

    return (
        <>
            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                newsItem={selectedNews}
            />

            <ViewDetailsModal
                isOpen={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                newsItem={selectedNews}
            />

            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div>
                                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    News Dashboard
                                </h1>
                                <p className="text-gray-600 mt-2">Manage and monitor all your news articles</p>
                            </div>
                            <button
                                onClick={() => navigate('/news/add')}
                                className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 font-medium whitespace-nowrap"
                            >
                                <FiPlus size={20} />
                                Add New Article
                            </button>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <StatsCard 
                                icon={FiGlobe}
                                label="Total Articles"
                                value={stats.total}
                                color="text-blue-600"
                            />
                            <StatsCard 
                                icon={FiImage}
                                label="With Images"
                                value={stats.withImage}
                                color="text-green-600"
                            />
                            <StatsCard 
                                icon={FiVideo}
                                label="With Videos"
                                value={stats.withVideo}
                                color="text-purple-600"
                            />
                            <StatsCard 
                                icon={FiBarChart2}
                                label="Categories"
                                value={stats.categories}
                                color="text-orange-600"
                            />
                        </div>
                    </div>

                    {/* Search and Filter Bar */}
                    <div className="bg-white rounded-2xl p-6 mb-6 shadow-lg">
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Search */}
                            <div className="flex-1 relative">
                                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                                    placeholder="Search articles by title, content, or category..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Filters */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setActiveFilter('all')}
                                    className={`px-4 py-3 rounded-xl font-medium transition duration-200 ${activeFilter === 'all' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setActiveFilter('withImage')}
                                    className={`px-4 py-3 rounded-xl font-medium transition duration-200 ${activeFilter === 'withImage' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    With Images
                                </button>
                                <button
                                    onClick={() => setActiveFilter('withVideo')}
                                    className={`px-4 py-3 rounded-xl font-medium transition duration-200 ${activeFilter === 'withVideo' ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    With Videos
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading ? (
                        <div className="bg-white rounded-2xl p-12 text-center">
                            <div className="inline-flex flex-col items-center">
                                <FiLoader className="animate-spin text-4xl text-blue-600 mb-4" />
                                <p className="text-gray-600">Loading news articles...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Results Count */}
                            <div className="mb-4 flex items-center justify-between">
                                <p className="text-gray-600">
                                    Showing <span className="font-bold text-blue-600">{filteredNews.length}</span> of <span className="font-bold">{newsData.length}</span> articles
                                </p>
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                                    >
                                        <FiX size={16} />
                                        Clear search
                                    </button>
                                )}
                            </div>

                            {/* Empty State */}
                            {filteredNews.length === 0 ? (
                                <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
                                    <div className="max-w-md mx-auto">
                                        <div className="w-20 h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <FiAlertTriangle className="w-10 h-10 text-gray-500" />
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">No articles found</h3>
                                        <p className="text-gray-600 mb-6">
                                            {searchTerm ? 'Try adjusting your search terms' : 'Start by adding your first news article'}
                                        </p>
                                        <button
                                            onClick={() => navigate('/news/add')}
                                            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition duration-200"
                                        >
                                            Create Your First Article
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                /* News Grid */
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3  gap-6">
                                    {filteredNews.map(news => (
                                        <NewsCard
                                            key={news.id}
                                            news={news}
                                            onView={() => {
                                                setSelectedNews(news);
                                                setViewModalOpen(true);
                                            }}
                                            onDelete={() => {
                                                setSelectedNews(news);
                                                setDeleteModalOpen(true);
                                            }}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Add custom animations */}
                <style jsx>{`
                    .line-clamp-2 {
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    }
                    @keyframes fadeInUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    .animate-fadeInUp {
                        animation: fadeInUp 0.3s ease-out;
                    }
                `}</style>
            </div>
        </>
    );
};

export default ViewNews;