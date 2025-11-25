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
    FiRefreshCw
} from 'react-icons/fi';

// 1. IMPORT NECESSARY FIREBASE FUNCTIONS (Updated imports for doc and setDoc)
import { 
    collection, 
    onSnapshot,
    doc,        // Required to generate a document reference with a specific ID
    setDoc,     // Required to save the document using the generated ID
    serverTimestamp     // To get the server time for 'createdAt'
} from "firebase/firestore";
import { 
    ref,                // To create storage references
    uploadBytes,        // To upload the file
    getDownloadURL      // To get the public URL of the uploaded file
} from "firebase/storage";

// IMPORTANT: Ensure your firerbase.js exports 'db' (Firestore) and 'storage' (Storage)
import { db, storage } from "../../../firerbase"; 

const AddNewsToday = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        title: '',
        excerpt: '',
        subcategory: '', 
        date: '',        
        image: null      
    });

    const [imagePreview, setImagePreview] = useState(null);

    // subcategories state
    const [subcategories, setSubcategories] = useState([]);
    const [isLoadingSubcategories, setIsLoadingSubcategories] = useState(true);
    const [subcategoriesError, setSubcategoriesError] = useState(null);

    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // ----------------------------------------------------
    // 1. DATA FETCHING (Subcategories)
    // ----------------------------------------------------
    useEffect(() => {
        const subcategoriesCollectionRef = collection(db, "subcategories");
        // Using onSnapshot to keep up-to-date and handle initial load
        const unsubscribe = onSnapshot(
            subcategoriesCollectionRef, 
            (snapshot) => {
                const subs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    name: doc.data().subcategory || doc.id // Use 'subcategory' field or ID as name
                }));
                setSubcategories(subs);
                setIsLoadingSubcategories(false);
            }, 
            (error) => {
                console.error("Error fetching subcategories:", error);
                setSubcategoriesError("Failed to load subcategories.");
                setIsLoadingSubcategories(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // ----------------------------------------------------
    // 2. INPUT HANDLERS
    // ----------------------------------------------------
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
            navigate('/products/news');
        }
    };

    const resetForm = () => {
        setFormData({
            title: '',
            excerpt: '',
            subcategory: '',
            date: '',
            image: null
        });
        handleRemoveImage();
    };

    // ----------------------------------------------------
    // 3. SUBMIT HANDLER (ID is created and stored as a field)
    // ----------------------------------------------------
    const handleSave = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.excerpt || !formData.date || !formData.subcategory) {
            setSaveMessage("❌ Please fill in all required fields.");
            return;
        }

        setIsSaving(true);
        setSaveMessage('');

        try {
            let imageUrl = null;
            let imagePath = null;
            
            // 1. Image Upload
            if (formData.image) {
                const imageFile = formData.image;
                // Generate a unique file name
                const fileName = `news/${Date.now()}_${imageFile.name}`;
                const storageRef = ref(storage, fileName);

                const snapshot = await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(snapshot.ref);
                imagePath = fileName;
            }

            const newsCollectionRef = collection(db, "news");
            
            // 🔑 REFACTOR: Generate Document ID/Reference first
            const docRef = doc(newsCollectionRef); // Generates a unique ID
            const newsId = docRef.id; // Get the generated ID
            
            // 2. Prepare Data for Firestore, INCLUDING the ID as a field
            const newNewsData = {
                // The ID is now explicitly stored inside the document
                id: newsId, 
                
                title: formData.title.trim(),
                excerpt: formData.excerpt.trim(),
                subcategory: formData.subcategory, 
                date: formData.date,               
                imageUrl: imageUrl,
                imagePath: imagePath,
                createdAt: serverTimestamp(), 
            };

            // 3. Save to Firestore using setDoc with the predefined docRef
            await setDoc(docRef, newNewsData);

            setSaveMessage(`✅ News article added successfully! ID: ${newsId}`);
            
            // Redirect after successful save
            setTimeout(() => {
                navigate('/products/news');
            }, 1500);

        } catch (error) {
            console.error("Error adding news:", error);
            setSaveMessage(`❌ Failed to add news: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };
    
    const isFormDisabled = isSaving || isLoadingSubcategories;

    // ----------------------------------------------------
    // 4. UI RETURN
    // ----------------------------------------------------
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

                        {/* Title */}
                        <div>
                            <label htmlFor="title" className="block text-lg font-medium text-gray-700 mb-2">Title <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="Enter news headline or title"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500"
                                disabled={isFormDisabled}
                                required
                            />
                        </div>

                        {/* Excerpt/Content */}
                        <div>
                            <label htmlFor="excerpt" className="block text-lg font-medium text-gray-700 mb-2">Excerpt / Content <span className="text-red-500">*</span></label>
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

                        {/* Subcategory and Date */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            {/* Subcategory */}
                            <div>
                                <label htmlFor="subcategory" className="block text-lg font-medium text-gray-700 mb-2 flex items-center">
                                    <FiTag className="w-5 h-5 mr-2 text-purple-600" />
                                    Subcategory <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        id="subcategory"
                                        name="subcategory"
                                        value={formData.subcategory}
                                        onChange={handleChange}
                                        className="appearance-none w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-white pr-10"
                                        disabled={isFormDisabled}
                                        required
                                    >
                                        <option value="" disabled>Select Subcategory</option>
                                        {isLoadingSubcategories && <option disabled>Loading...</option>}
                                        {subcategoriesError && <option disabled>Error loading</option>}
                                        {subcategories.map(sub => (
                                            <option key={sub.id} value={sub.name}>{sub.name}</option> 
                                        ))}
                                    </select>
                                </div>
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

                        </div>

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

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-4 pt-4">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="flex items-center justify-center space-x-3 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-semibold text-lg w-full sm:w-auto"
                                disabled={isSaving}
                            >
                                <FiX className="w-5 h-5" />
                                <span>Cancel</span>
                            </button>

                            <button
                                type="submit"
                                className="flex items-center justify-center space-x-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] text-lg w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={isSaving} 
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