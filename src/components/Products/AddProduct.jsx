import React, { useState, useEffect } from 'react';
import {
  FiPackage,
  FiCamera,
  FiDollarSign,
  FiTag,
  FiLayers,
  FiDroplet,
  FiPlus,
  FiCheck,
  FiShoppingBag,
  FiX,
  FiRefreshCw,
  FiChevronDown,
  FiFileText,
  FiUpload,
  FiUser, 
  FiZap,
} from 'react-icons/fi';

// Assuming you have imported and configured your Firebase app instance:
import { db, storage } from "../../../firerbase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";


// *** REUSABLE KEYWORD GENERATION FUNCTION *** (UNMODIFIED)
const generateSearchKeywords = (product) => {
  const keywords = new Set();
  const lowerName = product.name.toLowerCase();
  
  // 1. Full/Partial Name
  for (let i = 1; i <= lowerName.length; i++) {
    keywords.add(lowerName.substring(0, i));
  }
  
  // 2. Split Name/Description by space (for word-level search)
  const nameWords = lowerName.split(/\s+/).filter(word => word.length > 1);
  nameWords.forEach(word => {
    for (let i = 1; i <= word.length; i++) {
      keywords.add(word.substring(0, i));
    }
  });

  const fields = [product.brand, product.sku, product.hsnCode];
  fields.forEach(field => {
    const lowerField = (field || '').toLowerCase().trim();
    if (lowerField) {
      keywords.add(lowerField);
      for (let i = 1; i <= Math.min(lowerField.length, 5); i++) {
        keywords.add(lowerField.substring(0, i));
      }
    }
  });

  if (product.category.name) keywords.add(product.category.name.toLowerCase());
  if (product.subCategory && product.subCategory.name) keywords.add(product.subCategory.name.toLowerCase());

  // 3. Add variant colors/sizes
  const uniqueColors = new Set(product.variants.map(v => v.color).filter(Boolean));
  const uniqueSizes = new Set(product.variants.map(v => v.size).filter(Boolean));
  
  uniqueColors.forEach(color => keywords.add(color.toLowerCase()));
  uniqueSizes.forEach(size => keywords.add(size.toLowerCase()));
  
  // 4. Add new productTag (your new field)
  if (product.productTag) keywords.add(product.productTag.toLowerCase());

  return Array.from(keywords).filter(k => k.length > 0 && k.length <= 50);
};


// List of available product tags/labels
const PRODUCT_TAG_OPTIONS = [
    { value: '', label: 'Select Product Label' }, // Removed (Required)
    { value: 'E-Store', label: 'E-Store' }, // <-- Corrected case to E-Store
    { value: 'Local Market', label: 'Local Market' },
    { value: 'Printing', label: 'Printing' },
    { value: 'Oldee', label: 'Oldee' },
  
];

// *** NEW IMAGE OBJECT STRUCTURE ***
// { file: File, url: string (local preview URL), color: string, name: string (file name), id: string (unique ID) }

const AddProductPage = () => {
    // --- STATE FOR FETCHED DATA ---
    const [categoriesList, setCategoriesList] = useState([]);
    const [subcategoriesList, setSubcategoriesList] = useState([]);

    // --- FORM DATA STATE ---
    const [productData, setProductData] = useState({
        name: '',
        description: '',
        sku: '',
        hsnCode: '',
        brand: '',
        category: '', 
        subCategory: '', 
        sellerId: '',
        productTag: '', 
        variants: [], 
    });

    // --- VARIANT MANAGEMENT STATE (UNMODIFIED) ---
    const [newVariant, setNewVariant] = useState({
        color: '',
        size: '',
        price: '',
        offerPrice: '',
        stock: '',
    });

    // --- IMAGE MANAGEMENT STATE (MODIFIED) ---
    // Stores the main image object. Color is initially an empty string.
    const [mainImageFile, setMainImageFile] = useState(null); 
    // Array of objects. Color is initially an empty string.
    const [galleryFiles, setGalleryFiles] = useState([]); 

    // --- OTHER UTILITY STATES (UNMODIFIED) ---
    const [loading, setLoading] = useState(false); 
    const [loadingData, setLoadingData] = useState(false); 
    const [message, setMessage] = useState('');

    
    // 🚨 STEP 1: CALCULATE FILTERED CATEGORIES (Case-Insensitive Filter)
    // Categories are only filtered if a productTag is selected
    const filteredCategories = categoriesList.filter(cat => 
        // Only filter if productTag is set
        !productData.productTag || (cat.label && cat.label.toLowerCase() === productData.productTag.toLowerCase())
    );

    // --- FETCH CATEGORIES AND SUBCATEGORIES ---
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoadingData(true);
            try {
                // Fetch all categories and subcategories on mount.
                const [catSnapshot, subSnap] = await Promise.all([
                    getDocs(collection(db, "categories")),
                    getDocs(collection(db, "subcategories"))
                ]);
                
                // Assuming category documents contain a 'label' field
                const fetchedCats = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCategoriesList(fetchedCats);

                // Assuming subcategory documents contain 'label' and 'categoryId' fields
                const fetchedSubCats = subSnap.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().subcategory, // Renamed to 'name' for JSX usage consistency
                    ...doc.data()
                }));
                setSubcategoriesList(fetchedSubCats);
            } catch (err) {
                console.error("Error fetching initial data:", err);
                setMessage("❌ Failed to load categories and subcategories.");
            }
            setLoadingData(false);
        };

        fetchInitialData();
    }, []);

    // 🚨 STEP 2: CALCULATE FILTERED SUBCATEGORIES (Case-Insensitive Label Filter + Category ID Filter)
    const filteredSubcategories = subcategoriesList
        .filter(sub => 
            // Case-insensitive Label filter (only filter if productTag is set)
            !productData.productTag || (sub.label && sub.label.toLowerCase() === productData.productTag.toLowerCase())
        ) 
        // Only filter by category if a category is selected
        .filter(sub => !productData.category || sub.categoryId === productData.category);


    // --- PRODUCT & CATEGORY CHANGE HANDLER (UPDATED for productTag) ---
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "productTag") {
            setProductData(prev => ({ 
                ...prev, 
                [name]: value,
                // Reset category/subCategory when the label changes
                category: '',
                subCategory: '',
            }));
            return;
        }
        
        if (name === "category") {
            // Logic to find the new default subCategory ID, respecting the current productTag (Label)
            
            // 1. Filter subcategories by the new category ID
            const subsByCat = subcategoriesList.filter(sub => sub.categoryId === value);
            
            // 2. Further filter by the current productTag (Label) - Now case-insensitive
            const subsByCatAndLabel = subsByCat.filter(sub => 
                !productData.productTag || (sub.label && productData.productTag && sub.label.toLowerCase() === productData.productTag.toLowerCase())
            );
            
            // Set the first available subcategory as the default, or empty
            const newSubCatId = subsByCatAndLabel.length > 0 ? subsByCatAndLabel[0].id : '';

            setProductData(prev => ({
                ...prev,
                category: value,
                subCategory: newSubCatId, 
            }));
        } else {
            setProductData(prev => ({ ...prev, [name]: value }));
        }
    };

    // --- VARIANT LOGIC (UPDATED: Removed mandatory validation) ---
    const handleNewVariantChange = (e) => {
        const { name, value } = e.target;
        setNewVariant(prev => ({ ...prev, [name]: value }));
    };

    const handleAddVariant = () => {
        const { color, size, price, offerPrice, stock } = newVariant;
        const cleanColor = color.trim();
        const cleanSize = size.trim().toUpperCase();
        // Allow empty values since mandatory is removed, but use 0 for number fields if empty
        const cleanPrice = price ? parseFloat(price) : 0;
        const cleanOfferPrice = offerPrice ? parseFloat(offerPrice) : null;
        const cleanStock = stock ? parseInt(stock, 10) : 0;

        // Simplified Validation (Only checking for impossible states)
        if (cleanOfferPrice !== null && cleanOfferPrice > 0 && cleanOfferPrice >= cleanPrice) {
            setMessage("❌ Variant Offer Price cannot be greater than or equal to the regular Price.");
            return;
        }

        // Check for duplicate variant (same color and size) - Still good to keep this
        const exists = productData.variants.some(
            v => v.color.toLowerCase() === cleanColor.toLowerCase() && v.size.toLowerCase() === cleanSize.toLowerCase()
        );

        if (exists && cleanColor && cleanSize) { // Only check if both are provided
            setMessage("❌ A variant with this Color and Size already exists.");
            return;
        }

        // Check if at least Color or Size is provided before adding
        if (!cleanColor && !cleanSize && cleanPrice === 0 && cleanStock === 0) {
            setMessage("❌ Please provide at least Color, Size, Price, or Stock to add a variant.");
            return;
        }


        const newVariantObject = {
            variantId: Date.now().toString(), // Simple unique ID
            color: cleanColor || 'N/A', // Set to N/A if empty
            size: cleanSize || 'N/A', // Set to N/A if empty
            price: cleanPrice,
            offerPrice: cleanOfferPrice,
            stock: cleanStock,
        };

        setProductData(prev => ({
            ...prev,
            variants: [...prev.variants, newVariantObject],
        }));

        setNewVariant({ color: '', size: '', price: '', offerPrice: '', stock: '' });
        setMessage("✅ New variant added successfully.");
    };

    const removeVariant = (variantId) => {
        setProductData(prev => ({
            ...prev,
            variants: prev.variants.filter(v => v.variantId !== variantId),
        }));
        setMessage("✅ Variant removed.");
    };
    
    // List of all unique colors currently available in variants
    const availableColors = Array.from(new Set(productData.variants.map(v => v.color))).filter(c => c.trim() !== '' && c.trim() !== 'N/A');

    // --- IMAGE MANAGEMENT LOGIC (UNMODIFIED) ---
    
    // Handles Main Image upload (stores File and creates local URL)
    const handleMainImageChange = (e) => {
        const file = e.target.files ? e.target.files[0] : null;
        if (file) {
            setMainImageFile({
                file: file,
                url: URL.createObjectURL(file), 
                color: '', // Initially no color assigned
                name: file.name,
                id: `main-${Date.now()}` // Unique ID for tracking
            }); 
            setMessage(`✅ Main Image uploaded: ${file.name}.`); // Removed: Please assign a color
        } else {
            setMainImageFile(null); 
        }
        e.target.value = null; // Reset input
    };
    
    // Handles Gallery Images upload (allows multiple selection)
    const handleGalleryImageChange = (e) => {
        const files = Array.from(e.target.files || []);
        
        const newImages = files.map(file => ({
            file: file,
            url: URL.createObjectURL(file), 
            color: '', // Initially no color assigned
            name: file.name,
            id: `gallery-${Date.now()}-${Math.random()}` // Unique ID for tracking
        }));

        // Prevent adding files that are already in the gallery list
        const uniqueNewImages = newImages.filter(newImg => 
            !galleryFiles.some(existingImg => existingImg.name === newImg.name && existingImg.file.size === newImg.file.size)
        );

        setGalleryFiles(prev => [...prev, ...uniqueNewImages]);
        setMessage(`✅ Added ${uniqueNewImages.length} gallery image(s).`); // Removed: Please assign colors.
        e.target.value = null; 
    };

    // New handler for updating color on image preview
    const handleColorChangeOnImage = (id, newColor) => {
        // Check if it's the main image
        if (mainImageFile && mainImageFile.id === id) {
            setMainImageFile(prev => ({
                ...prev,
                color: newColor
            }));
        } else {
            // Check gallery images
            setGalleryFiles(prev => 
                prev.map(img => 
                    img.id === id ? { ...img, color: newColor } : img
                )
            );
        }
    };


    // Removes the Main Image
    const removeMainImage = () => {
        // Clean up the object URL to free memory (optional but good practice)
        if (mainImageFile && mainImageFile.url) URL.revokeObjectURL(mainImageFile.url);
        setMainImageFile(null);
        if (document.getElementById("mainImageFile")) document.getElementById("mainImageFile").value = "";
        setMessage("✅ Main Image removed.");
    };

    // Removes a Gallery Image
    const removeGalleryImage = (idToRemove) => {
        const imageObject = galleryFiles.find(p => p.id === idToRemove);
        if (imageObject && imageObject.url) URL.revokeObjectURL(imageObject.url); // Clean up
        setGalleryFiles(prevFiles => prevFiles.filter(p => p.id !== idToRemove));
        setMessage("✅ Gallery image removed.");
    };

    // --- SUBMIT HANDLER (UPDATED for non-mandatory fields) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        // 1. Basic Validation (Simplified: No required fields)
        // Leaving Name empty might cause issues, but for now, no hard requirement.
        
        // Check for required images only if variants/images are added (Removed)
        // const allImages = [mainImageFile, ...galleryFiles];

        // 2. Color Assignment Validation (Removed)
        // const unassignedImage = allImages.find(img => !img.color || img.color.trim() === '');
        // if (unassignedImage) {
        //     setMessage(`❌ Image "${unassignedImage.name}" must have a Color assigned from the variants list.`);
        //     return;
        // }


        setLoading(true);

        try {
            // --- 3. UPLOAD IMAGES ---
            let imageUrls = [];
            let mainDownloadURL = '';

            // A. Main Image Upload (Only if file exists)
            if (mainImageFile) {
                const mainFile = mainImageFile.file;
                const mainFileName = `products/${Date.now()}_main_${mainFile.name}`;
                const mainStorageRef = ref(storage, mainFileName);
                await uploadBytes(mainStorageRef, mainFile);
                mainDownloadURL = await getDownloadURL(mainStorageRef);

                imageUrls.push({
                    url: mainDownloadURL,
                    name: mainFile.name,
                    path: mainFileName,
                    type: 'file',
                    isMain: true,
                    color: mainImageFile.color, // Color assigned from state (can be empty)
                });
            }

            // B. Gallery Images Upload (Only if files exist)
            for (const imageObject of galleryFiles) {
                const galleryFile = imageObject.file;
                const galleryFileName = `products/${Date.now()}_gallery_${galleryFile.name}`;
                const galleryStorageRef = ref(storage, galleryFileName);
                await uploadBytes(galleryStorageRef, galleryFile);
                const galleryDownloadURL = await getDownloadURL(galleryStorageRef);

                imageUrls.push({
                    url: galleryDownloadURL,
                    name: galleryFile.name,
                    path: galleryFileName,
                    type: 'file',
                    isMain: false,
                    color: imageObject.color, // Color assigned from state (can be empty)
                });
            }

            // --- 4. PREPARE DATA FOR FIRESTORE ---
            // Use the globally fetched list for finding category/subcategory details
            const selectedCategory = categoriesList.find(cat => cat.id === productData.category);
            const selectedSubCategory = subcategoriesList.find(sub => sub.id === productData.subCategory);

            const tempProductForKeywords = {
                ...productData,
                category: {
                    id: productData.category || '', // Use empty string if not selected
                    name: selectedCategory ? selectedCategory.name : 'Unknown',
                },
                subCategory: productData.subCategory ? {
                    id: productData.subCategory,
                    name: selectedSubCategory ? selectedSubCategory.name : 'N/A',
                } : null,
            };

            const productToSave = {
                name: productData.name || '', // Not mandatory
                description: productData.description || '',
                sku: productData.sku || '',
                hsnCode: productData.hsnCode || '',
                brand: productData.brand || '',
                category: tempProductForKeywords.category,
                subCategory: tempProductForKeywords.subCategory,
                sellerId: productData.sellerId || '', // Not mandatory
                productTag: productData.productTag || '', // Not mandatory
                variants: productData.variants,
                
                imageUrls: imageUrls,
                mainImageUrl: mainDownloadURL, // Will be empty string if no main image uploaded
                
                searchKeywords: generateSearchKeywords(tempProductForKeywords),
                createdAt: new Date(),
                updatedAt: new Date(),
                status: 'Active', 
            };

            // --- 5. SAVE TO FIRESTORE ---
            const docRef = await addDoc(collection(db, "products"), productToSave);

            // --- 6. CLEANUP AND SUCCESS ---
            setMessage(`✅ Product "${productData.name || 'Untitled Product'}" added successfully with ID: ${docRef.id}`);

        } catch (error) {
            console.error("Firebase submission error:", error);
            setMessage(`❌ Failed to add product: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };


    const isFormDisabled = loading || loadingData;
    const isSuccess = message.startsWith("✅");
    const messageClass = isSuccess
        ? "bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 text-green-700"
        : "bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 text-red-700";

    // Combine all images for preview display
    const allImages = [
        ...(mainImageFile ? [{ ...mainImageFile, isMain: true }] : []),
        ...galleryFiles.map(img => ({ ...img, isMain: false }))
    ];

    // =======================================================================
    // JSX RENDERING 
    // =======================================================================

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-gray-900 flex items-center justify-center space-x-3">
                        <FiShoppingBag className="w-8 h-8 text-blue-600" />
                        <span>Add New Product</span>
                    </h1>
                    <p className="text-gray-500 mt-2">Enter the details, variants, and images for the new product listing.</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    {loadingData && (
                        <div className="p-4 flex items-center bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700">
                         <FiRefreshCw className="w-5 h-5 animate-spin mr-3" />
                         <span className="font-medium">Loading initial setup data...</span>
                        </div>
                    )}
                    
                    {message && (
                        <div className={`p-4 flex items-center ${messageClass}`}>
                          {isSuccess ? <FiCheck className="w-5 h-5 mr-3" /> : <FiX className="w-5 h-5 mr-3" />}
                          <span className="font-medium">{message}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="p-8 space-y-8">

                        {/* BASIC INFORMATION */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                                <FiPackage className="w-6 h-6 mr-3 text-blue-600" />
                                Basic Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <input
                                    type="text"
                                    name="name"
                                    value={productData.name}
                                    onChange={handleChange}
                                    // *** REMOVED: required ***
                                    placeholder="Product Name" 
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-lg"
                                    disabled={isFormDisabled}
                                />
                                <div className="relative">
                                    <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        name="sellerId"
                                        value={productData.sellerId}
                                        onChange={handleChange}
                                        // *** REMOVED: required ***
                                        placeholder="Seller ID" 
                                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                        disabled={isFormDisabled}
                                    />
                                </div>
                                
                                <div className="hidden md:block"></div> 
                            </div>
                        </div>
                        
                        {/* PRODUCT DESCRIPTION */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                                <FiFileText className="w-6 h-6 mr-3 text-red-600" />
                                Product Description
                            </h3>
                            <textarea
                                name="description"
                                value={productData.description}
                                onChange={handleChange}
                                placeholder="Detailed description of the product..."
                                rows="4"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200"
                                disabled={isFormDisabled}
                            />
                        </div>

                        {/* PRODUCT DETAILS (IDENTIFIERS) */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                                <FiTag className="w-6 h-6 mr-3 text-purple-600" />
                                Product Identifiers
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <input
                                    type="text"
                                    name="sku"
                                    value={productData.sku}
                                    onChange={handleChange}
                                    placeholder="SKU Code"
                                    className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                    disabled={isFormDisabled}
                                />
                                <input
                                    type="text"
                                    name="brand"
                                    value={productData.brand}
                                    onChange={handleChange}
                                    placeholder="Brand Name"
                                    className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                    disabled={isFormDisabled}
                                />
                                <input
                                    type="text"
                                    name="hsnCode"
                                    value={productData.hsnCode}
                                    onChange={handleChange}
                                    placeholder="HSN Code"
                                    className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                                    disabled={isFormDisabled}
                                />
                            </div>
                        </div>

                        {/* CATEGORY SELECTION (MODIFIED FOR SINGLE LINE) */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                                <FiLayers className="w-6 h-6 mr-3 text-green-600" />
                                Category Selection
                            </h3>

                            {/* *** START: Single Line Dropdowns *** */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                
                                {/* 1. Product Label Select */}
                                <div className="relative">
                                    <FiTag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                    <select
                                        name="productTag"
                                        value={productData.productTag}
                                        onChange={handleChange}
                                        // *** REMOVED: required ***
                                        className="appearance-none w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                                        disabled={isFormDisabled}
                                    >
                                        {PRODUCT_TAG_OPTIONS.map(option => (
                                            <option key={option.value} value={option.value} disabled={false}> 
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                {/* 2. Category Select */}
                                <div className="relative">
                                    <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                    <select
                                        name="category"
                                        value={productData.category}
                                        onChange={handleChange}
                                        // *** REMOVED: required ***
                                        className="appearance-none w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                                        disabled={isFormDisabled || filteredCategories.length === 0}
                                    >
                                        <option value="">Select Category</option> 
                                        {/* Use filteredCategories (Label-filtered) */}
                                        {filteredCategories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                    {/* Removed conditional messages below inputs to save space */}
                                </div>
                                
                                {/* 3. SubCategory Select */}
                                <div className="relative">
                                    <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                    <select
                                        name="subCategory"
                                        value={productData.subCategory}
                                        onChange={handleChange}
                                        className="appearance-none w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                                        disabled={isFormDisabled || filteredSubcategories.length === 0}
                                    >
                                        <option value="">Select Subcategory</option>
                                        {/* Use filteredSubcategories (Label AND Category ID filtered) */}
                                        {filteredSubcategories.map(subCat => (
                                            <option key={subCat.id} value={subCat.id}>{subCat.name}</option>
                                        ))}
                                    </select>
                                    {/* Removed conditional messages below inputs to save space */}
                                </div>
                            </div>
                            {/* *** END: Single Line Dropdowns *** */}
                        </div>


                        {/* --- PRODUCT VARIANT MANAGEMENT (Color/Size/Price/Stock) (MODIFIED: Removed required markers) --- */}
                        <div className="space-y-6 border p-6 rounded-xl bg-orange-50 border-orange-200">
                            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                              <FiDroplet className="w-6 h-6 mr-3 text-orange-600" />
                              Product Variants (Color, Size, Price, Stock)
                            </h3>
                            
                            {/* Variant Input Form */}
                            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end border-b pb-4 mb-4">
                              <input
                                type="text"
                                name="color"
                                value={newVariant.color}
                                onChange={handleNewVariantChange}
                                placeholder="Color"
                                className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                                disabled={isFormDisabled}
                              />
                              <input
                                type="text"
                                name="size"
                                value={newVariant.size}
                                onChange={handleNewVariantChange}
                                placeholder="Size" // Removed *
                                className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                                disabled={isFormDisabled}
                              />
                              <div className="relative col-span-2 md:col-span-1">
                                <FiDollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                  type="number"
                                  name="price"
                                  value={newVariant.price}
                                  onChange={handleNewVariantChange}
                                  placeholder="Price (₹)" // Removed *
                                  min="0"
                                  step="0.01"
                                  className="w-full pl-8 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                                  disabled={isFormDisabled}
                                />
                              </div>
                              <div className="relative col-span-2 md:col-span-1">
                                <FiZap className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                  type="number"
                                  name="offerPrice"
                                  value={newVariant.offerPrice}
                                  onChange={handleNewVariantChange}
                                  placeholder="Offer (₹)"
                                  min="0"
                                  step="0.01"
                                  className="w-full pl-8 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                                  disabled={isFormDisabled}
                                />
                              </div>
                              <input
                                type="number"
                                name="stock"
                                value={newVariant.stock}
                                onChange={handleNewVariantChange}
                                placeholder="Stock" // Removed *
                                min="0"
                                className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                                disabled={isFormDisabled}
                              />
                              <button
                                type="button"
                                onClick={handleAddVariant}
                                className="px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center space-x-1"
                                disabled={isFormDisabled}
                              >
                                <FiPlus className="w-4 h-4" />
                                <span className="hidden md:inline">Add</span>
                              </button>
                            </div>
                            
                            {/* Variant List */}
                            {productData.variants.length > 0 && (
                              <div className="space-y-3 pt-2">
                                <h4 className="text-sm font-semibold text-gray-700">Current Variants ({productData.variants.length})</h4>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                  <div className="grid grid-cols-5 md:grid-cols-6 text-xs font-bold text-gray-600 bg-gray-100 p-2">
                                      <span className="col-span-1">Color</span>
                                      <span className="col-span-1">Size</span>
                                      <span className="col-span-1">Price</span>
                                      <span className="col-span-1">Offer Price</span>
                                      <span className="col-span-1">Stock</span>
                                      <span className="col-span-1 text-right">Action</span>
                                  </div>
                                  {productData.variants.map((v) => (
                                      <div key={v.variantId} className="grid grid-cols-5 md:grid-cols-6 text-sm p-2 border-t border-gray-200 hover:bg-white transition-colors items-center">
                                          <span className="col-span-1 font-medium">{v.color}</span>
                                          <span className="col-span-1 font-medium">{v.size}</span>
                                          <span className="col-span-1">₹{v.price.toFixed(2)}</span>
                                          <span className="col-span-1 text-red-600">{v.offerPrice ? `₹${v.offerPrice.toFixed(2)}` : '-'}</span>
                                          <span className="col-span-1">{v.stock}</span>
                                          <span className="col-span-1 text-right">
                                              <button
                                                  type="button"
                                                  onClick={() => removeVariant(v.variantId)}
                                                  className="text-red-500 hover:text-red-700 p-1 rounded disabled:opacity-50"
                                                  disabled={isFormDisabled}
                                              >
                                                  <FiX className="w-4 h-4" />
                                              </button>
                                          </span>
                                      </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>


                        {/* --- IMAGE UPLOAD SECTION (MODIFIED: Removed required markers) --- */}
                        <div className="space-y-6 border p-6 rounded-xl bg-pink-50 border-pink-200">
                            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                                <FiCamera className="w-6 h-6 mr-3 text-pink-600" />
                                Image Upload & Color Assignment
                            </h3>
                            
                            {availableColors.length === 0 && (
                                <div className="p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
                                    <p className="font-semibold">ℹ️ Note:</p>
                                    <p className="text-sm">Adding a **Color** to a **Product Variant** will enable the color assignment dropdown for images.</p>
                                </div>
                            )}

                            {/* Main Image Control */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="border-2 border-dashed border-pink-300 rounded-xl p-4 text-center hover:border-pink-500 transition-colors duration-200 bg-white">
                                    <FiUpload className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                                    <label htmlFor="mainImageFile" className="cursor-pointer">
                                        <span className="text-md font-medium text-gray-700 block mb-1">Upload Main Product Image</span>
                                        <p className="text-gray-500 text-xs">(Optional Color Assignment)</p>
                                        <input 
                                            type="file"
                                            id="mainImageFile"
                                            accept="image/*"
                                            onChange={handleMainImageChange}
                                            className="hidden"
                                            disabled={isFormDisabled}
                                        />
                                    </label>
                                </div>

                                {/* Gallery Images Control */}
                                <div className="border-2 border-dashed border-blue-300 rounded-xl p-4 text-center hover:border-blue-500 transition-colors duration-200 bg-white">
                                    <FiCamera className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                                    <label htmlFor="galleryImages" className="cursor-pointer">
                                        <span className="text-md font-medium text-gray-700 block mb-1">Upload Gallery Images (N number)</span>
                                        <p className="text-gray-500 text-xs">(Optional Color Assignment)</p>
                                        <input 
                                            type="file"
                                            id="galleryImages"
                                            multiple
                                            accept="image/*"
                                            onChange={handleGalleryImageChange}
                                            className="hidden"
                                            disabled={isFormDisabled}
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Image Previews with Dropdown Color Assignment */}
                            {allImages.length > 0 && (
                                <div className="mt-4 p-4 border border-gray-300 rounded-lg bg-white">
                                    <p className="text-sm font-bold text-gray-700 mb-3">Image Previews ({allImages.length}):</p>
                                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                                        {allImages.map((image) => (
                                            <div 
                                                key={image.id} 
                                                className={`relative rounded-lg overflow-hidden shadow-md group border-2 ${image.isMain ? 'border-yellow-500 ring-2 ring-yellow-300' : (image.color ? 'border-green-500' : 'border-gray-300')}`}
                                            >
                                                <img
                                                    src={image.url}
                                                    alt={image.name}
                                                    className="w-full h-20 object-cover"
                                                />
                                                
                                                <span className={`absolute top-0 left-0 text-white text-xs font-bold px-2 py-1 rounded-br-lg z-10 ${image.isMain ? 'bg-yellow-600' : 'bg-pink-600'}`}>
                                                    {image.isMain ? 'MAIN' : 'GALLERY'}
                                                </span>
                                                
                                                <button
                                                    type="button"
                                                    onClick={() => image.isMain ? removeMainImage() : removeGalleryImage(image.id)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 z-20"
                                                    title="Remove Image"
                                                    disabled={isFormDisabled}
                                                >
                                                    <FiX className="w-3 h-3" />
                                                </button>
                                                
                                                {/* Color Assignment Dropdown */}
                                                <div className="p-1 bg-gray-50 border-t border-gray-200">
                                                    <div className="relative">
                                                        <FiChevronDown className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 pointer-events-none" />
                                                        <select
                                                            value={image.color || ''}
                                                            onChange={(e) => handleColorChangeOnImage(image.id, e.target.value)}
                                                            className={`appearance-none w-full text-xs py-1 pl-1 pr-4 border rounded ${image.color ? 'border-green-400 text-green-700' : 'border-gray-400 text-gray-700'}`}
                                                            disabled={isFormDisabled || availableColors.length === 0}
                                                            title={image.color ? `Color: ${image.color}` : 'Assign Color'}
                                                        >
                                                            <option value="">-- Assign Color (Optional) --</option>
                                                            {availableColors.map(color => (
                                                                <option key={color} value={color}>
                                                                    {color}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <p className="text-xs text-gray-600 truncate pt-1 font-medium" title={image.name}>
                                                      {image.name}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                          </div>

                        {/* SUBMIT BUTTON (UNMODIFIED) */}
                        <button
                          type="submit"
                          disabled={isFormDisabled}
                          className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl shadow-lg font-semibold text-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-3"
                        >
                          {loading ? (
                            <>
                              <FiRefreshCw className="w-5 h-5 animate-spin" />
                              <span>Processing & Uploading...</span>
                            </>
                          ) : (
                            <>
                              <FiPlus className="w-6 h-6" />
                              <span>Add Product to Database</span>
                            </>
                          )}
                        </button>

                    </form>
                </div>
            </div>

            
        </div>
    );
  };

  export default AddProductPage;