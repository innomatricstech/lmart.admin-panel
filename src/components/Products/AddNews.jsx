import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom"; 
import {
    FiFileText,
    FiTag,
    FiCalendar,
    FiImage,
    FiVideo,
    FiX,
    FiSave,
    FiUpload,
    FiRefreshCw,
    FiPlus,
    FiChevronDown,
    FiTrash2,
    FiGlobe
} from 'react-icons/fi';
import { 
    collection, 
    doc,
    setDoc,
    getDocs,
    serverTimestamp
} from "firebase/firestore";
import { 
    ref,
    uploadBytes,
    getDownloadURL
} from "firebase/storage";
import { db, storage } from "../../../firerbase"; 

const AddNewsToday = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: '',
        excerpt: '',
        category: '',
        date: '',
        image: null,
        video: null,
    });

    const [imagePreview, setImagePreview] = useState(null);
    const [videoPreview, setVideoPreview] = useState(null);

    const [allCategories, setAllCategories] = useState([]);
    const [showCategoryInput, setShowCategoryInput] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [loadingCategories, setLoadingCategories] = useState(false);

    const isFormDisabled = isSaving;

    // -------------------------
    // Fetch Categories
    // -------------------------
    useEffect(() => {
        fetchExistingCategories();
    }, []);

    const fetchExistingCategories = async () => {
        try {
            setLoadingCategories(true);
            const snapshot = await getDocs(collection(db, "news"));
            const categories = new Set();

            snapshot.docs.forEach(doc => {
                if (doc.data().category) {
                    categories.add(doc.data().category.trim());
                }
            });

            setAllCategories([...categories].sort());
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingCategories(false);
        }
    };

    // -------------------------
    // Handlers
    // -------------------------
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, image: file }));
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleVideoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, video: file }));
            setVideoPreview(URL.createObjectURL(file));
        }
    };

    const handleRemoveImage = () => {
        URL.revokeObjectURL(imagePreview);
        setFormData(prev => ({ ...prev, image: null }));
        setImagePreview(null);
    };

    const handleRemoveVideo = () => {
        URL.revokeObjectURL(videoPreview);
        setFormData(prev => ({ ...prev, video: null }));
        setVideoPreview(null);
    };

    const handleAddCategory = () => {
        if (!newCategory.trim()) return;

        const trimmed = newCategory.trim();
        if (!allCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
            setAllCategories(prev => [...prev, trimmed].sort());
        }

        setFormData(prev => ({ ...prev, category: trimmed }));
        setNewCategory('');
        setShowCategoryInput(false);
    };

    const handleCancel = () => {
        if (window.confirm("Unsaved data will be lost. Continue?")) {
            navigate('/news/view');
        }
    };

    // -------------------------
    // SAVE NEWS
    // -------------------------
    const handleSave = async (e) => {
        e.preventDefault();

        if (!formData.title || !formData.excerpt || !formData.category || !formData.date) {
            setSaveMessage("Please fill all required fields.");
            return;
        }

        setIsSaving(true);
        setSaveMessage('');

        try {
            let imageUrl = null, imagePath = null;
            let videoUrl = null, videoPath = null;

            // Upload Image
            if (formData.image) {
                imagePath = `news/images/${Date.now()}_${formData.image.name}`;
                const imageRef = ref(storage, imagePath);
                await uploadBytes(imageRef, formData.image);
                imageUrl = await getDownloadURL(imageRef);
            }

            // Upload Video
            if (formData.video) {
                videoPath = `news/videos/${Date.now()}_${formData.video.name}`;
                const videoRef = ref(storage, videoPath);
                await uploadBytes(videoRef, formData.video);
                videoUrl = await getDownloadURL(videoRef);
            }

            const docRef = doc(collection(db, "news"));

            await setDoc(docRef, {
                id: docRef.id,
                title: formData.title.trim(),
                excerpt: formData.excerpt.trim(),
                category: formData.category.trim(),
                date: formData.date,
                imageUrl,
                imagePath,
                videoUrl,
                videoPath,
                createdAt: serverTimestamp(),
            });

            setSaveMessage("News article added successfully!");
            setTimeout(() => navigate('/news/view'), 1200);

        } catch (error) {
            console.error(error);
            setSaveMessage("Failed to save news. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    // -------------------------
    // UI
    // -------------------------
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg">
                        <FiGlobe className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Add News Today
                    </h1>
                    <p className="text-gray-600 mt-2">Share the latest updates with your audience</p>
                </div>

                {/* Main Form Card */}
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-8">
                        {/* Status Message */}
                        {saveMessage && (
                            <div className={`mb-6 p-4 rounded-lg ${saveMessage.includes('✅') || saveMessage.includes('successfully') 
                                ? 'bg-green-50 text-green-700 border border-green-200' 
                                : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                <div className="flex items-center">
                                    {saveMessage.includes('✅') || saveMessage.includes('successfully') ? (
                                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                    {saveMessage.replace('❌', '').replace('✅', '')}
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSave} className="space-y-8">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <FiFileText className="inline mr-2" />
                                    News Title *
                                </label>
                                <input
                                    type="text"
                                    name="title"
                                    placeholder="Enter a compelling headline..."
                                    value={formData.title}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                                    required
                                    disabled={isFormDisabled}
                                />
                            </div>

                            {/* Category Section */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <FiTag className="inline mr-2" />
                                    Category *
                                </label>
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <select
                                            name="category"
                                            value={formData.category}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none transition duration-200"
                                            required
                                            disabled={isFormDisabled}
                                        >
                                            <option value="">Select a category</option>
                                            {loadingCategories ? (
                                                <option disabled>Loading categories...</option>
                                            ) : (
                                                allCategories.map((c, i) => (
                                                    <option key={i} value={c}>{c}</option>
                                                ))
                                            )}
                                        </select>
                                        <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowCategoryInput(!showCategoryInput)}
                                        className="px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition duration-200 flex items-center whitespace-nowrap"
                                        disabled={isFormDisabled}
                                    >
                                        <FiPlus className="mr-2" />
                                        New Category
                                    </button>
                                </div>
                                
                                {showCategoryInput && (
                                    <div className="mt-3 p-4 bg-blue-50 rounded-xl border border-blue-200 animate-fadeIn">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newCategory}
                                                onChange={(e) => setNewCategory(e.target.value)}
                                                placeholder="Enter new category name"
                                                className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                disabled={isFormDisabled}
                                            />
                                            <button
                                                type="button"
                                                onClick={handleAddCategory}
                                                className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition duration-200"
                                                disabled={isFormDisabled}
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Media Upload Section */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    <FiImage className="inline mr-2" />
                                    Media Uploads
                                </label>
                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Image Upload */}
                                    <div className="relative">
                                        {!imagePreview ? (
                                            <label className={`block border-2 border-dashed ${isFormDisabled ? 'border-gray-300 bg-gray-50' : 'border-blue-300 hover:border-blue-500 hover:bg-blue-50'} rounded-2xl p-6 text-center cursor-pointer transition duration-200 group`}>
                                                <div className="flex flex-col items-center justify-center h-40">
                                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition duration-200">
                                                        <FiImage className="w-6 h-6 text-blue-600" />
                                                    </div>
                                                    <p className="text-gray-700 font-medium mb-1">Upload Image</p>
                                                    <p className="text-sm text-gray-500">JPG, PNG, or WebP</p>
                                                    <p className="text-xs text-gray-400 mt-2">Click or drag to upload</p>
                                                </div>
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    hidden 
                                                    onChange={handleImageChange} 
                                                    disabled={isFormDisabled}
                                                />
                                            </label>
                                        ) : (
                                            <div className="relative rounded-2xl overflow-hidden shadow-lg">
                                                <img 
                                                    src={imagePreview} 
                                                    alt="preview" 
                                                    className="w-full h-48 object-contain"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveImage}
                                                    className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition duration-200 shadow-lg"
                                                    disabled={isFormDisabled}
                                                >
                                                    <FiX className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Video Upload */}
                                    <div className="relative">
                                        {!videoPreview ? (
                                            <label className={`block border-2 border-dashed ${isFormDisabled ? 'border-gray-300 bg-gray-50' : 'border-purple-300 hover:border-purple-500 hover:bg-purple-50'} rounded-2xl p-6 text-center cursor-pointer transition duration-200 group`}>
                                                <div className="flex flex-col items-center justify-center h-40">
                                                    <div className="w-12 h-12 bg-gradient-to-r from-purple-100 to-purple-200 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition duration-200">
                                                        <FiVideo className="w-6 h-6 text-purple-600" />
                                                    </div>
                                                    <p className="text-gray-700 font-medium mb-1">Upload Video</p>
                                                    <p className="text-sm text-gray-500">MP4, MOV, or AVI</p>
                                                    <p className="text-xs text-gray-400 mt-2">Click or drag to upload</p>
                                                </div>
                                                <input 
                                                    type="file" 
                                                    accept="video/*" 
                                                    hidden 
                                                    onChange={handleVideoChange} 
                                                    disabled={isFormDisabled}
                                                />
                                            </label>
                                        ) : (
                                            <div className="relative rounded-2xl overflow-hidden shadow-lg">
                                                <video 
                                                    src={videoPreview} 
                                                    controls 
                                                    className="w-full h-48 object-cover bg-black"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveVideo}
                                                    className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition duration-200 shadow-lg"
                                                    disabled={isFormDisabled}
                                                >
                                                    <FiX className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <FiFileText className="inline mr-2" />
                                    News Content *
                                </label>
                                <textarea
                                    name="excerpt"
                                    rows="5"
                                    placeholder="Write your news content here..."
                                    value={formData.excerpt}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 resize-none"
                                    required
                                    disabled={isFormDisabled}
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    <FiCalendar className="inline mr-2" />
                                    Publication Date *
                                </label>
                                <input
                                    type="text"
                                    name="date"
                                    placeholder="DD/MM/YYYY"
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                                    required
                                    disabled={isFormDisabled}
                                />
                                <p className="text-sm text-gray-500 mt-1">Format: Day/Month/Year (e.g., 25/12/2023)</p>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className={`px-6 py-3 border ${isFormDisabled ? 'border-gray-300 text-gray-400' : 'border-gray-300 text-gray-700 hover:bg-gray-50'} rounded-xl font-medium transition duration-200`}
                                    disabled={isFormDisabled}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isFormDisabled}
                                    className={`px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-purple-700 transition duration-200 flex items-center ${isFormDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isSaving ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <FiSave className="mr-2" />
                                            Publish News
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Info Footer */}
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>Fields marked with * are required</p>
                    <p className="mt-1">All uploaded media will be stored securely</p>
                </div>
            </div>

            {/* Add custom animations */}
            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default AddNewsToday;