import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom"; 
import {
    FiFileText,
    FiTag,
    FiCalendar,
    FiImage,
    FiX,
    FiSave,
    FiUpload,
    FiRefreshCw,
    FiPlus,
    FiChevronDown
} from 'react-icons/fi';
import { 
    collection, 
    doc,
    setDoc,
    getDocs,
    serverTimestamp,
    query,
    orderBy
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
        image: null      
    });

    const [allCategories, setAllCategories] = useState([]); // Store all unique categories from existing news
    const [showCategoryInput, setShowCategoryInput] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [imagePreview, setImagePreview] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [loadingCategories, setLoadingCategories] = useState(false);

    const isFormDisabled = isSaving;

    // Fetch all unique categories from existing news
    useEffect(() => {
        fetchExistingCategories();
    }, []);

    const fetchExistingCategories = async () => {
        try {
            setLoadingCategories(true);
            const newsCollectionRef = collection(db, "news");
            const snapshot = await getDocs(newsCollectionRef);
            
            // Extract unique categories from all news
            const categoriesSet = new Set();
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (data.category && data.category.trim()) {
                    categoriesSet.add(data.category.trim());
                }
            });
            
            // Convert Set to Array and sort alphabetically
            const uniqueCategories = Array.from(categoriesSet).sort();
            setAllCategories(uniqueCategories);
            
        } catch (error) {
            console.error("Error fetching categories:", error);
        } finally {
            setLoadingCategories(false);
        }
    };

    // -------------------------
    // Category Handler
    // -------------------------
    const handleAddCategory = () => {
        if (!newCategory.trim()) {
            setSaveMessage("❌ Please enter a category name.");
            return;
        }

        setIsAddingCategory(true);
        try {
            const trimmedCategory = newCategory.trim();
            
            // Check if category already exists
            const categoryExists = allCategories.some(
                cat => cat.toLowerCase() === trimmedCategory.toLowerCase()
            );
            
            if (!categoryExists) {
                // Add to local state if it's new
                setAllCategories(prev => [...prev, trimmedCategory].sort());
            }
            
            // Set the category in the form
            setFormData(prev => ({ ...prev, category: trimmedCategory }));
            
            // Reset and close
            setNewCategory('');
            setShowCategoryInput(false);
            setSaveMessage(`✅ Category "${trimmedCategory}" added!`);
            
            setTimeout(() => {
                setSaveMessage('');
            }, 2000);
            
        } catch (error) {
            console.error("Error adding category:", error);
            setSaveMessage(`❌ Failed to add category: ${error.message}`);
        } finally {
            setIsAddingCategory(false);
        }
    };

    // -------------------------
    // Input Handlers
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

    const handleRemoveImage = () => {
        if (formData.image) URL.revokeObjectURL(imagePreview);
        setFormData(prev => ({ ...prev, image: null }));
        setImagePreview(null);
    };

    const handleCancel = () => {
        if (window.confirm("Are you sure you want to cancel? Any unsaved data will be lost.")) {
            navigate('/news/view');
        }
    };

    // -------------------------
    // Submit Handler
    // -------------------------
    const handleSave = async (e) => {
        e.preventDefault();

        if (!formData.title || !formData.excerpt || !formData.date || !formData.category) {
            setSaveMessage("❌ Please fill in all required fields.");
            return;
        }

        setIsSaving(true);
        setSaveMessage('');

        try {
            let imageUrl = null;
            let imagePath = null;
            
            // Upload image if available
            if (formData.image) {
                const imageFile = formData.image;
                const fileName = `news/${Date.now()}_${imageFile.name}`;
                const storageRef = ref(storage, fileName);

                const snapshot = await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(snapshot.ref);
                imagePath = fileName;
            }

            const newsCollectionRef = collection(db, "news");
            const docRef = doc(newsCollectionRef);
            const newsId = docRef.id;
            
            const newNewsData = {
                id: newsId,
                title: formData.title.trim(),
                excerpt: formData.excerpt.trim(),
                category: formData.category.trim(),
                date: formData.date,
                imageUrl,
                imagePath,
                createdAt: serverTimestamp(),
            };

            await setDoc(docRef, newNewsData);

            setSaveMessage(`✅ News article added successfully!`);

            setTimeout(() => {
                navigate('/news/view');
            }, 1200);

        } catch (error) {
            console.error("Error adding news:", error);
            setSaveMessage(`❌ Failed to add news: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-full mb-4">
                        <FiFileText className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
                        Add News Today
                    </h1>
                    <p className="text-gray-600 text-lg">Create and publish a new news article</p>
                </div>

                {saveMessage && (
                    <div 
                        className={`p-4 mb-6 border-l-4 rounded-lg shadow-sm 
                            ${saveMessage.startsWith("✅") ? "bg-green-100 border-green-500 text-green-700" : "bg-red-100 border-red-500 text-red-700"}`}
                    >
                        {saveMessage}
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <form onSubmit={handleSave} className="space-y-6">

                        {/* Title + Category */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            <div>
                                <label htmlFor="title" className="block text-lg font-medium text-gray-700 mb-2">
                                    Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="Enter news headline or title"
                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl 
                                            focus:ring-blue-500 focus:border-blue-500"
                                    disabled={isFormDisabled}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="category" className="block text-lg font-medium text-gray-700 mb-2 flex items-center">
                                    <FiTag className="w-5 h-5 mr-2 text-purple-600" />
                                    Category <span className="text-red-500">*</span>
                                </label>
                                
                                <div className="space-y-2">
                                    <div className="flex space-x-2">
                                        {/* Category Dropdown */}
                                        <div className="relative flex-1">
                                            <select
                                                id="category"
                                                name="category"
                                                value={formData.category}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl 
                                                        focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white cursor-pointer"
                                                disabled={isFormDisabled || loadingCategories}
                                                required
                                            >
                                                <option value="">Select a category</option>
                                                {loadingCategories ? (
                                                    <option disabled>Loading categories...</option>
                                                ) : allCategories.length === 0 ? (
                                                    <option disabled>No categories found. Add one below.</option>
                                                ) : (
                                                    allCategories.map((category, index) => (
                                                        <option key={index} value={category}>
                                                            {category}
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                            <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                        </div>
                                        
                                        {/* Add New Category Button */}
                                        <button
                                            type="button"
                                            onClick={() => setShowCategoryInput(true)}
                                            className="flex-shrink-0 px-4 py-3 bg-purple-600 text-white rounded-xl 
                                                    hover:bg-purple-700 transition-colors flex items-center"
                                            disabled={isFormDisabled}
                                            title="Add New Category"
                                        >
                                            <FiPlus className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Or type manually option */}
                                    <div className="flex items-center">
                                        {/* <span className="text-sm text-gray-500 mr-2">or</span>
                                        <input
                                            type="text"
                                            value={formData.category}
                                            onChange={handleChange}
                                            placeholder="Type custom category"
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg 
                                                    focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            disabled={isFormDisabled}
                                        /> */}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Add Category Input Field - Shows when button is clicked */}
                        {showCategoryInput && (
                            <div className="bg-purple-50 border-l-4 border-purple-500 rounded-xl p-4 mb-6">
                                <h3 className="text-lg font-semibold text-purple-800 mb-3 flex items-center">
                                    <FiPlus className="w-5 h-5 mr-2" />
                                    Add New Category
                                </h3>
                                <div className="flex space-x-2">
                                    <input
                                        type="text"
                                        value={newCategory}
                                        onChange={(e) => setNewCategory(e.target.value)}
                                        placeholder="Enter new category name"
                                        className="flex-grow px-4 py-3 border-2 border-purple-300 rounded-xl 
                                                focus:ring-purple-500 focus:border-purple-500"
                                        disabled={isAddingCategory}
                                        autoFocus
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddCategory();
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCategory}
                                        className="px-6 py-3 bg-purple-600 text-white rounded-xl 
                                                hover:bg-purple-700 transition-colors disabled:opacity-50"
                                        disabled={isAddingCategory || !newCategory.trim()}
                                    >
                                        {isAddingCategory ? 'Adding...' : 'Add'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowCategoryInput(false);
                                            setNewCategory('');
                                        }}
                                        className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl 
                                                hover:bg-gray-50 transition-colors"
                                        disabled={isAddingCategory}
                                    >
                                        Cancel
                                    </button>
                                </div>
                                <p className="text-sm text-purple-600 mt-2">
                                    This category will be added to the dropdown for future use.
                                </p>
                            </div>
                        )}

                        {/* Image Upload */}
                        <div>
                            <label className="block text-lg font-medium text-gray-700 mb-2 flex items-center">
                                <FiImage className="w-5 h-5 mr-2 text-red-600" />
                                Featured Image
                            </label>

                            {!imagePreview ? (
                                <label 
                                    htmlFor="image-upload" 
                                    className="block cursor-pointer border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors"
                                >
                                    <FiUpload className="mx-auto w-10 h-10 text-gray-400 mb-2" />
                                    <p className="text-gray-600">Click or drag an image here to upload</p>
                                    <input 
                                        type="file" 
                                        id="image-upload" 
                                        name="image"
                                        accept="image/*"
                                        className="hidden" 
                                        onChange={handleImageChange}
                                        disabled={isFormDisabled}
                                    />
                                </label>
                            ) : (
                                <div className="relative w-full h-48 rounded-xl overflow-hidden shadow-lg border-2 border-green-500">
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={handleRemoveImage}
                                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                                        title="Remove Image"
                                    >
                                        <FiX className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Excerpt */}
                        <div>
                            <label htmlFor="excerpt" className="block text-lg font-medium text-gray-700 mb-2">
                                Excerpt / Content <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="excerpt"
                                name="excerpt"
                                value={formData.excerpt}
                                onChange={handleChange}
                                rows="5"
                                placeholder="Write a brief excerpt or the full news content"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                                disabled={isFormDisabled}
                                required
                            />
                        </div>

                        {/* Date */}
                        <div>
                            <label htmlFor="date" className="block text-lg font-medium text-gray-700 mb-2 flex items-center">
                                <FiCalendar className="w-5 h-5 mr-2 text-green-600" />
                                Publication Date (DD/MM/YYYY) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                placeholder="e.g., 25/11/2025"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                                disabled={isFormDisabled}
                                required
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-4 pt-4">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="flex items-center justify-center space-x-3 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold text-lg w-full sm:w-auto"
                                disabled={isSaving || isAddingCategory}
                            >
                                <FiX className="w-5 h-5" />
                                <span>Cancel</span>
                            </button>

                            <button
                                type="submit"
                                className="flex items-center justify-center space-x-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] text-lg w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isSaving || isAddingCategory}
                            >
                                {isSaving ? (
                                    <>
                                        <FiRefreshCw className="w-5 h-5 animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <FiSave className="w-5 h-5" />
                                        <span>Save News</span>
                                    </>
                                )}
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddNewsToday;