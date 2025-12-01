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
  FiLink,
} from 'react-icons/fi';
import { useParams, useNavigate } from 'react-router-dom';

// 🚨 IMPORTANT: Ensure this path is correct for your project
import { db, storage } from "../../../firerbase"; 

import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";


// ========= Search Keyword Generator (Copied from AddProduct) =========
const generateSearchKeywords = (product) => {
  const keywords = new Set();
  const lowerName = product.name.toLowerCase();

  for (let i = 1; i <= lowerName.length; i++) {
    keywords.add(lowerName.substring(0, i));
  }

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

  // Use the new variants structure for color/size keywords
  const uniqueColors = new Set(product.variants.map(v => v.color).filter(Boolean));
  const uniqueSizes = new Set(product.variants.map(v => v.size).filter(Boolean));
  
  uniqueColors.forEach(color => keywords.add(color.toLowerCase()));
  uniqueSizes.forEach(size => keywords.add(size.toLowerCase()));

  return Array.from(keywords).filter(k => k.length > 0 && k.length <= 50);
};
// ===========================================


const EditProductPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();

  // --- STATE FOR FETCHED DATA ---
  const [categoriesList, setCategoriesList] = useState([]);
  const [subcategoriesList, setSubcategoriesList] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // --- FORM DATA STATE (STORES IDs/Strings) ---
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    sku: '',
    hsnCode: '',
    brand: '',
    category: '', // Stores category ID string
    subCategory: '', // Stores subcategory ID string
    sellerId: '', 
    variants: [], // Array of { variantId, color, size, price, offerPrice, stock }
  });

  // --- VARIANT MANAGEMENT STATE ---
  const [newVariant, setNewVariant] = useState({
    color: '',
    size: '',
    price: '',
    offerPrice: '',
    stock: '',
  });

  // --- IMAGE MANAGEMENT STATE (Refactored for Edit Page) ---
  // Tracks existing images loaded from Firestore
  const [existingImageUrls, setExistingImageUrls] = useState([]); // Array of { url, name, path, type, isMain, color }
  // Tracks new files selected for upload
  const [newImageFiles, setNewImageFiles] = useState([]); // Array of { file: File, color: string, url: string, isMain: boolean, name: string }
  
  // --- COLOR ASSIGNMENT MODAL STATES ---
  const [isColorSelectionModalOpen, setIsColorSelectionModalOpen] = useState(false);
  const [currentImageFileToAssign, setCurrentImageFileToAssign] = useState(null); // The raw File object being processed
  const [tempColorAssignment, setTempColorAssignment] = useState(''); // Color selected in the modal
  const [isAssigningMain, setIsAssigningMain] = useState(false); // Flag if the current assignment is for a new main image

  // --- OTHER UTILITY STATES ---
  const [loading, setLoading] = useState(false); // For submit process
  const [message, setMessage] = useState('');

  // ========= FETCH DATA & INITIALIZE STATE (Critical Mapping Logic) =========
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      setMessage('');

      try {
        // 1. Fetch Categories and Subcategories
        const [catSnapshot, subSnap] = await Promise.all([
            getDocs(collection(db, "categories")),
            getDocs(collection(db, "subcategories"))
        ]);
        
        const fetchedCats = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCategoriesList(fetchedCats);

        const fetchedSubCats = subSnap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().subcategory,
          ...doc.data()
        }));
        setSubcategoriesList(fetchedSubCats);
        
        // 2. Fetch Product data
        if (productId) {
          const productDocRef = doc(db, "products", productId);
          const snap = await getDoc(productDocRef);

          if (snap.exists()) {
            const data = snap.data();
            
            // ⭐ CRITICAL MAPPING: Map fetched data to new variant/image structure
            setProductData({
              name: data.name || '',
              description: data.description || '',
              sku: data.sku || '',
              hsnCode: data.hsnCode || '',
              brand: data.brand || '',
              category: data.category?.id || '', 
              subCategory: data.subCategory?.id || '',
              sellerId: data.sellerId || '',
              variants: data.variants || [], // New variants array
            });

            // ⭐ CRITICAL IMAGE MAPPING: Load all existing image objects
            setExistingImageUrls(data.imageUrls || []);

          } else {
            console.warn(`Product ID ${productId} not found in Firestore.`);
            setMessage("❌ Product not found. Redirecting...");
            setTimeout(() => navigate("/products/view"), 1500);
          }
        } else {
              setMessage("❌ No Product ID provided in the URL.");
        }

      } catch (err) {
        console.error("Error fetching data during component initialization:", err);
        setMessage("❌ Failed to load product data due to a network or database error.");
      }

      setLoadingData(false);
    };

    fetchData();
  }, [productId, navigate]); 
  // ===================================================================

  // Filter subcategories based on the currently selected category ID
  const filteredSubcategories = subcategoriesList.filter(
    sub => sub.categoryId === productData.category
  );


  // --- PRODUCT & CATEGORY CHANGE HANDLER ---
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "category") {
      const newFilteredSubs = subcategoriesList.filter(sub => sub.categoryId === value);
      const newSubCatId = newFilteredSubs.length > 0 ? newFilteredSubs[0].id : '';

      setProductData(prev => ({
        ...prev,
        category: value,
        subCategory: newSubCatId, 
      }));
    } else {
      setProductData(prev => ({ ...prev, [name]: value }));
    }
  };


  // --- VARIANT LOGIC (Copied from AddProduct) ---
  const handleNewVariantChange = (e) => {
    const { name, value } = e.target;
    setNewVariant(prev => ({ ...prev, [name]: value }));
  };

  const handleAddVariant = () => {
    const { color, size, price, offerPrice, stock } = newVariant;
    const cleanColor = color.trim();
    const cleanSize = size.trim().toUpperCase();
    const cleanPrice = parseFloat(price);
    const cleanOfferPrice = offerPrice ? parseFloat(offerPrice) : null;
    const cleanStock = parseInt(stock, 10);

    // Basic Validation
    if (!cleanColor || !cleanSize || isNaN(cleanPrice) || isNaN(cleanStock) || cleanStock < 0) {
      setMessage("❌ Please fill out valid Color, Size, Price, and Stock for the variant.");
      return;
    }

    if (cleanOfferPrice !== null && cleanOfferPrice >= cleanPrice) {
      setMessage("❌ Variant Offer Price cannot be greater than or equal to the regular Price.");
      return;
    }
    
    // Check for duplicate variant (same color and size)
    const exists = productData.variants.some(
      v => v.color.toLowerCase() === cleanColor.toLowerCase() && v.size.toLowerCase() === cleanSize.toLowerCase()
    );

    if (exists) {
      setMessage("❌ A variant with this Color and Size already exists.");
      return;
    }

    const newVariantObject = {
      variantId: Date.now().toString(), // Simple unique ID
      color: cleanColor,
      size: cleanSize,
      price: cleanPrice,
      offerPrice: cleanOfferPrice,
      stock: cleanStock,
    };

    setProductData(prev => ({
      ...prev,
      variants: [...prev.variants, newVariantObject],
    }));

    setNewVariant({ color: '', size: '', price: '', offerPrice: '', stock: '' });
    setMessage("✅ New variant added successfully. Remember to save the product.");
  };

  const removeVariant = (variantId) => {
    setProductData(prev => ({
      ...prev,
      variants: prev.variants.filter(v => v.variantId !== variantId),
    }));
    setMessage("✅ Variant removed. Remember to save the product.");
  };
  
  // List of all unique colors currently available in variants
  const availableColors = Array.from(new Set(productData.variants.map(v => v.color)));


  // --- IMAGE MANAGEMENT LOGIC (Adapted from AddProduct) ---
  const openColorModal = (file, isMain = false) => {
    setCurrentImageFileToAssign(file);
    setIsAssigningMain(isMain);
    // Try to pre-select the first available color
    setTempColorAssignment(availableColors.length > 0 ? availableColors[0] : '');
    setIsColorSelectionModalOpen(true);
  };

  const handleModalSubmit = () => {
    const file = currentImageFileToAssign;
    const color = tempColorAssignment.trim();
    const isMain = isAssigningMain;

    if (!color) {
      setMessage("❌ Please select or enter a color to assign to the image.");
      return;
    }
    
    const imageWithColor = {
      file: file,
      color: color,
      url: URL.createObjectURL(file), 
      name: file.name,
      isMain: isMain, // Assign main status based on modal context
    };

    // If a new main image is being assigned, demote any existing main file in the newImageFiles array
    if (isMain) {
        // Demote main status from existing files if a new one is set
        setNewImageFiles(prev => prev.map(img => ({...img, isMain: false})));
        // Also demote main status from existing uploaded images
        setExistingImageUrls(prev => prev.map(img => ({...img, isMain: false})));
    }
    
    // Add the new file to the newImageFiles state
    setNewImageFiles(prev => {
        // Check if the file is already in the list (e.g., if re-assigning color)
        const exists = prev.some(p => p.file === file);
        if (exists) {
            return prev.map(p => p.file === file ? imageWithColor : p);
        } else {
            return [...prev, imageWithColor];
        }
    });
    
    // Automatically add a placeholder variant if the color is new
    if (!productData.variants.some(v => v.color.toLowerCase() === color.toLowerCase())) {
        const placeholderVariant = {
            variantId: `ph-${Date.now()}`,
            color: color,
            size: 'N/A', 
            price: 0,
            offerPrice: null,
            stock: 0,
        };
        setProductData(prev => ({
            ...prev,
            variants: [...prev.variants, placeholderVariant],
        }));
    }

    setMessage(`✅ Image assigned to color: ${color} and isMain: ${isMain}. Remember to save.`);
    setIsColorSelectionModalOpen(false);
    setCurrentImageFileToAssign(null);
    setTempColorAssignment('');
    setIsAssigningMain(false);
  };
  
  const handleMainImageChange = (e) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      openColorModal(file, true); // True marks it as main
    }
    e.target.value = null; // Reset input
  };

  const handleGalleryImageChange = (e) => {
      const files = Array.from(e.target.files || []);
      files.forEach(file => openColorModal(file, false)); // False marks it as gallery
      e.target.value = null; 
  };
    
  // Removes an image that was fetched from Firestore
  const removeExistingImage = (imageObject) => {
      // If the removed image was main, warn the user
      if (imageObject.isMain) {
          setMessage("⚠️ The main image was removed. Please mark an existing or new image as main before saving.");
      }
      setExistingImageUrls(prev => prev.filter(img => img.url !== imageObject.url));
      setMessage("✅ Existing image removed. Remember to save.");
  };

  // Removes a newly selected file (not yet uploaded)
  const removeNewImage = (fileToRemove) => {
      setNewImageFiles(prevFiles => prevFiles.filter(p => p.file !== fileToRemove));
      setMessage("✅ New image file discarded. Remember to save.");
  };

  // Function to set an *existing* image as the main image
  const setExistingImageAsMain = (imageObject) => {
      // Demote all existing and new images
      setExistingImageUrls(prev => prev.map(img => ({ ...img, isMain: false })));
      setNewImageFiles(prev => prev.map(img => ({ ...img, isMain: false })));
      
      // Promote the selected existing image
      setExistingImageUrls(prev => prev.map(img => 
          img.url === imageObject.url ? { ...img, isMain: true } : img
      ));
      setMessage(`✅ Image assigned as NEW MAIN for color ${imageObject.color}. Remember to save.`);
  }

  // Function to set a *new file* image as the main image
  const setNewImageAsMain = (imageObject) => {
      // Demote all existing and new images
      setExistingImageUrls(prev => prev.map(img => ({ ...img, isMain: false })));
      setNewImageFiles(prev => prev.map(img => ({ ...img, isMain: false })));

      // Promote the selected new file
      setNewImageFiles(prev => prev.map(img =>
          img.file === imageObject.file ? { ...img, isMain: true } : img
      ));
      setMessage(`✅ New file assigned as MAIN for color ${imageObject.color}. Remember to save.`);
  }

  const allImages = [...existingImageUrls, ...newImageFiles];
  const mainImage = allImages.find(img => img.isMain);


  // 3. --- SUBMIT HANDLER (Refactored) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    // ... (Validation and loading setup) ...
    if (loadingData) return;
    if (!productData.name || !productData.category || !productData.sellerId) {
      setMessage("❌ Please fill out Name, Category, and Seller ID fields.");
      return;
    }
    if (productData.variants.length === 0) {
        setMessage("❌ Please add at least one Product Variant (Color/Size/Price/Stock).");
        return;
    }
    if (!mainImage) {
        setMessage("❌ Please ensure one image is marked as the **Main Image** before saving.");
        return;
    }

    setLoading(true);

    try {
      let finalImageUrls = existingImageUrls.filter(img => img.url); // Start with existing, non-removed images

      // --- 1. UPLOAD NEW IMAGE FILES ---
      let uploadedNewImageUrls = [];
      for (const imageObject of newImageFiles) {
        const file = imageObject.file;
        const fileName = `products/${Date.now()}_${imageObject.isMain ? 'main' : 'gallery'}_${file.name}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        uploadedNewImageUrls.push({ 
            url: downloadURL, 
            name: file.name, 
            path: fileName, 
            type: 'file',
            isMain: imageObject.isMain,
            color: imageObject.color,
        });
      }
      
      finalImageUrls = [...finalImageUrls, ...uploadedNewImageUrls];

      // --- 2. PREPARE DATA FOR FIRESTORE ---
      const selectedCategory = categoriesList.find(cat => cat.id === productData.category);
      const selectedSubCategory = subcategoriesList.find(sub => sub.id === productData.subCategory);
      const currentMainImageUrl = finalImageUrls.find(img => img.isMain)?.url || null;


      const tempProductForKeywords = {
        ...productData, 
        category: {
          id: productData.category,
          name: selectedCategory ? selectedCategory.name : 'Unknown',
        },
        subCategory: productData.subCategory ? {
          id: productData.subCategory,
          name: selectedSubCategory ? selectedSubCategory.name : 'N/A', 
        } : null,
      };

      const productToUpdate = {
        name: productData.name,
        description: productData.description,
        sku: productData.sku,
        hsnCode: productData.hsnCode,
        brand: productData.brand,
        category: tempProductForKeywords.category, 
        subCategory: tempProductForKeywords.subCategory,
        sellerId: productData.sellerId,
        variants: productData.variants, // Save the new/updated variants
        
        imageUrls: finalImageUrls, // Save the combined, updated image list
        mainImageUrl: currentMainImageUrl, // Single field for quick lookup
        searchKeywords: generateSearchKeywords(tempProductForKeywords),
        updatedAt: new Date(),
      };

      // Update the document
      const productDocRef = doc(db, "products", productId);
      await updateDoc(productDocRef, productToUpdate);

      // --- 3. CLEANUP AND SUCCESS ---
      setMessage(`✅ Product "${productData.name}" updated successfully!`);
      // Update state to reflect newly uploaded files as 'existing'
      setExistingImageUrls(finalImageUrls);
      setNewImageFiles([]); 

    } catch (error) {
      console.error("Firebase update error:", error);
      setMessage(`❌ Failed to update product: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isFormDisabled = loading || loadingData;
  const isSuccess = message.startsWith("✅");
  const messageClass = isSuccess
    ? "bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 text-green-700"
    : "bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 text-red-700";
  
  // =======================================================================
  // JSX RENDERING 
  // =======================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-yellow-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-gray-900 flex items-center justify-center space-x-3">
                <FiShoppingBag className="w-8 h-8 text-yellow-600" />
                <span>Edit Product: {productData.name || 'Loading...'}</span>
            </h1>
            <p className="text-gray-500 mt-2">Modify the details and variants of the existing product.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {loadingData && (
              <div className="p-4 flex items-center bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700">
               <FiRefreshCw className="w-5 h-5 animate-spin mr-3" />
               <span className="font-medium">Loading existing product data...</span>
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
                  required
                  placeholder="Product Name *"
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
                        required
                        placeholder="Seller ID *"
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                        disabled={isFormDisabled}
                    />
                </div>
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

            {/* CATEGORY SELECTION */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                  <FiLayers className="w-6 h-6 mr-3 text-green-600" />
                  Category Selection
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Category Select */}
                  <div className="relative">
                    <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                    <select
                      name="category"
                      value={productData.category}
                      onChange={handleChange}
                      className="appearance-none w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                      disabled={isFormDisabled}
                    >
                       <option value="" disabled>Select Category *</option>
                      {categoriesList.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* SubCategory Select */}
                  <div className="relative">
                    <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                    <select
                      name="subCategory"
                      value={productData.subCategory}
                      onChange={handleChange}
                      className="appearance-none w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                      disabled={isFormDisabled || filteredSubcategories.length === 0}
                    >
                      <option value="">Select Subcategory (Optional)</option>
                      {filteredSubcategories.map(subCat => (
                        <option key={subCat.id} value={subCat.id}>{subCat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>


            {/* --- PRODUCT VARIANT MANAGEMENT (Color/Size/Price/Stock) --- */}
            <div className="space-y-6 border p-6 rounded-xl bg-orange-50 border-orange-200">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                  <FiDroplet className="w-6 h-6 mr-3 text-orange-600" />
                  Product Variants (Color, Size, Price, Stock) *
                </h3>
                
                {/* Variant Input Form */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-end border-b pb-4 mb-4">
                  <input
                    type="text"
                    name="color"
                    value={newVariant.color}
                    onChange={handleNewVariantChange}
                    placeholder="Color *"
                    className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500"
                    disabled={isFormDisabled}
                  />
                  <input
                    type="text"
                    name="size"
                    value={newVariant.size}
                    onChange={handleNewVariantChange}
                    placeholder="Size *"
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
                      placeholder="Price (₹) *"
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
                    placeholder="Stock *"
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


            {/* --- IMAGE UPLOAD SECTION (WITH COLOR ASSOCIATION) --- */}
            <div className="space-y-6 border p-6 rounded-xl bg-pink-50 border-pink-200">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                    <FiCamera className="w-6 h-6 mr-3 text-pink-600" />
                    Image Management (Assign Color to Each) *
                </h3>

                {/* Main/Gallery Upload Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="border-2 border-dashed border-pink-300 rounded-xl p-4 text-center hover:border-pink-500 transition-colors duration-200 bg-white">
                        <FiUpload className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                        <label className="cursor-pointer">
                            <span className="text-md font-medium text-gray-700 block mb-1">Upload New Main Image</span>
                            <p className="text-gray-500 text-xs">(Will demote current main image)</p>
                            <input 
                                type="file"
                                id="newMainImageFile"
                                accept="image/*"
                                onChange={handleMainImageChange}
                                className="hidden"
                                disabled={isFormDisabled}
                            />
                        </label>
                    </div>

                    <div className="border-2 border-dashed border-blue-300 rounded-xl p-4 text-center hover:border-blue-500 transition-colors duration-200 bg-white">
                        <FiLink className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                        <label className="cursor-pointer">
                            <span className="text-md font-medium text-gray-700 block mb-1">Upload New Gallery Images</span>
                            <p className="text-gray-500 text-xs">(Each file needs color assignment)</p>
                            <input 
                                type="file"
                                id="newGalleryImages"
                                multiple
                                accept="image/*"
                                onChange={handleGalleryImageChange}
                                className="hidden"
                                disabled={isFormDisabled}
                            />
                        </label>
                    </div>
                </div>

                {/* Image Previews (Existing + New) */}
                {(existingImageUrls.length > 0 || newImageFiles.length > 0) && (
                    <div className="mt-4 p-4 border border-gray-300 rounded-lg bg-white">
                        <p className="text-sm font-bold text-gray-700 mb-3">All Images ({allImages.length}):</p>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                            {allImages.map((image, index) => (
                                <div 
                                    key={`img-${image.url || image.name}-${index}`} 
                                    className={`relative rounded-lg overflow-hidden shadow-md group border-2 ${image.isMain ? 'border-yellow-500 ring-2 ring-yellow-300' : 'border-gray-200'}`}
                                >
                                    <img
                                        src={image.url}
                                        alt={`Image ${index + 1}`}
                                        className="w-full h-20 object-cover"
                                        onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/150?text=Error"; }}
                                    />
                                    
                                    <span className={`absolute top-0 left-0 text-white text-xs font-bold px-2 py-1 rounded-br-lg z-10 ${image.isMain ? 'bg-yellow-600' : 'bg-pink-600'}`}>
                                        {image.isMain ? 'MAIN' : 'GALLERY'}
                                    </span>
                                    <span className="absolute bottom-0 right-0 bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded-tl-lg z-10">{image.color}</span>

                                    <button
                                        type="button"
                                        onClick={() => image.file ? removeNewImage(image.file) : removeExistingImage(image)}
                                        className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 z-20"
                                        title="Remove Image"
                                        disabled={isFormDisabled}
                                    >
                                        <FiX className="w-3 h-3" />
                                    </button>

                                    {!image.isMain && (
                                        <button
                                            type="button"
                                            onClick={() => image.file ? setNewImageAsMain(image) : setExistingImageAsMain(image)}
                                            className="absolute top-1 right-7 bg-green-500 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 z-20"
                                            title="Set as Main"
                                            disabled={isFormDisabled}
                                        >
                                            <FiTag className="w-3 h-3" />
                                        </button>
                                    )}

                                    <p className="text-xs text-gray-600 truncate p-1 bg-gray-50 font-medium" title={image.name}>
                                      {image.name.length > 10 ? image.name.substring(0, 7) + '...' : image.name}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>


            {/* -------- SUBMIT -------- */}
            <button
              type="submit"
              disabled={loading || loadingData}
              className="w-full py-4 bg-gradient-to-r from-yellow-600 to-green-600 hover:from-yellow-700 hover:to-green-700 text-white rounded-xl text-lg font-semibold flex items-center justify-center space-x-3 shadow-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <>
                  <FiRefreshCw className="animate-spin" />
                  <span>Updating Product...</span>
                </>
              ) : (
                <>
                  <FiCheck className="w-6 h-6" />
                  <span>Save Changes</span>
                </>
              )}
            </button>

          </form>
        </div>
      </div>
       {/* --- COLOR SELECTION MODAL --- */}
        {isColorSelectionModalOpen && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md space-y-4">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center">
                        <FiCamera className="w-5 h-5 mr-2 text-pink-600" />
                        Assign Color to New Image
                    </h3>
                    <p className="text-sm text-gray-600">
                        Please select the color variant this image belongs to. This image will be a **{isAssigningMain ? 'MAIN' : 'GALLERY'}** image.
                    </p>
                    
                    {availableColors.length > 0 && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Choose from existing variant colors:</label>
                            <select
                                value={tempColorAssignment}
                                onChange={(e) => setTempColorAssignment(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="" disabled>Select a color...</option>
                                {availableColors.map(color => (
                                    <option key={color} value={color}>{color}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Or enter a new color:</label>
                        <input
                            type="text"
                            placeholder="Enter Color Name"
                            value={tempColorAssignment}
                            onChange={(e) => setTempColorAssignment(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => {
                                setIsColorSelectionModalOpen(false);
                                setCurrentImageFileToAssign(null);
                                setTempColorAssignment('');
                                setIsAssigningMain(false);
                            }}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleModalSubmit}
                            disabled={!tempColorAssignment.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            Assign Color & Add
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default EditProductPage;