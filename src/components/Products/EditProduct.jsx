import React, { useState, useEffect } from 'react';
import {
  FiPackage, FiCamera, FiDollarSign, FiTag, FiLayers, FiDroplet, FiCheck,
  FiShoppingBag, FiX, FiRefreshCw, FiLink, FiChevronDown, FiFileText, FiUpload,
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


// ========= Search Keyword Generator (Copy/Pasted from AddProduct) =========
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

  product.colorVariants.forEach(color => keywords.add(color.toLowerCase()));
  product.sizeVariants.forEach(size => keywords.add(size.toLowerCase()));

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
    price: '', // Must be string for input type="number"
    stock: '', // Must be string for input type="number"
    colorVariants: [],
    sizeVariants: [],
    imageUrls: [], // Contains objects: { url, name, type, [path] }
  });

  // --- INPUT/UTILITY STATES ---
  const [imageFiles, setImageFiles] = useState([]); // New files to upload
  const [manualColorInput, setManualColorInput] = useState('');
  const [manualSizeInput, setManualSizeInput] = useState('');
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [loading, setLoading] = useState(false); // For submit process
  const [message, setMessage] = useState('');

  // ========= FETCH DATA & INITIALIZE STATE (The fixed logic) =========
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      setMessage('');

      try {
        // 1. Fetch Categories and Subcategories (Parallel fetch for speed)
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
          // 🚨 CRITICAL CHECK: Ensure "products" is the correct collection name
          const productDocRef = doc(db, "products", productId);
          const snap = await getDoc(productDocRef);

          if (snap.exists()) {
            const data = snap.data();
            
            // ⭐ CRITICAL MAPPING: Map Firestore data to React state
            setProductData({
              name: data.name || '',
              description: data.description || '',
              sku: data.sku || '',
              hsnCode: data.hsnCode || '',
              brand: data.brand || '',
              // Extract ID from nested category object for the <select> element
              category: data.category?.id || '', 
              subCategory: data.subCategory?.id || '',
              // Convert numbers to strings for input fields 
              price: data.price != null ? String(data.price) : '', 
              stock: data.stock != null ? String(data.stock) : '',
              colorVariants: data.colorVariants || [],
              sizeVariants: data.sizeVariants || [],
              imageUrls: data.imageUrls || [],
            });
          } else {
            console.warn(`Product ID ${productId} not found in Firestore.`);
            setMessage("❌ Product not found. Redirecting...");
            setTimeout(() => navigate("/products/view"), 1500);
          }
        } else {
             setMessage("❌ No Product ID provided in the URL.");
        }

      } catch (err) {
        // 🚨 IMPORTANT: Check your browser console for this error!
        console.error("Error fetching data during component initialization:", err);
        setMessage("❌ Failed to load product data due to a network or database error.");
      }

      setLoadingData(false);
    };

    fetchData();
    // Dependency array ensures this runs only when productId or navigate changes
  }, [productId, navigate]); 
  // ===================================================================

  // Filter subcategories based on the currently selected category ID
  const filteredSubcategories = subcategoriesList.filter(
    sub => sub.categoryId === productData.category
  );


  // --- CHANGE INPUT HANDLER ---
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


  // --- VARIANT, IMAGE LOGIC (kept simple for brevity, assumed functional) ---
  const addColorVariant = () => {
    const color = manualColorInput.trim();
    if (color && !productData.colorVariants.includes(color)) {
      setProductData(prev => ({ ...prev, colorVariants: [...prev.colorVariants, color] }));
      setManualColorInput('');
    }
  };

  const addSizeVariant = () => {
    const size = manualSizeInput.trim().toUpperCase();
    if (size && !productData.sizeVariants.includes(size)) {
      setProductData(prev => ({ ...prev, sizeVariants: [...prev.sizeVariants, size] }));
      setManualSizeInput('');
    }
  };

  const removeVariant = (type, value) => {
    setProductData(prev => ({ ...prev, [type]: prev[type].filter(item => item !== value) }));
  };

  const handleImageChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImageFiles(prev => [...prev, ...files]);
      setMessage(`Added ${files.length} new files for upload.`);
    }
  };

  const removeExistingImage = (index) => {
    setProductData(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index)
    }));
  };

  const addImageUrl = () => {
    const url = manualImageUrl.trim();
    if (url && (url.startsWith('http') || url.startsWith('https')) && !productData.imageUrls.some(img => img.url === url)) {
      setProductData(prev => ({
        ...prev,
        imageUrls: [...prev.imageUrls, { url: url, name: `External-Image-${prev.imageUrls.length + 1}`, type: 'url' }]
      }));
      setManualImageUrl('');
    } else if (url) {
      setMessage("❌ Invalid or duplicate image URL.");
    }
  };
  

  // 3. --- SUBMIT HANDLER ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    // ... (Validation and loading setup, same as before) ...
    if (loadingData) return;
    if (!productData.name || !productData.price || !productData.stock || !productData.category) {
      setMessage("❌ Please fill out Name, Price, Stock, and Category fields.");
      return;
    }
    setLoading(true);

    try {
      let finalImageUrls = [...productData.imageUrls];

      // Upload new files
      for (const file of imageFiles) {
        const fileName = `products/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);

        finalImageUrls.push({ url: downloadURL, name: file.name, path: fileName, type: 'file' });
      }

      // Look up names for database structure
      const selectedCategory = categoriesList.find(cat => cat.id === productData.category);
      const selectedSubCategory = subcategoriesList.find(sub => sub.id === productData.subCategory);

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
        // Save the structure with ID and Name back to Firestore
        category: tempProductForKeywords.category, 
        subCategory: tempProductForKeywords.subCategory,
        // Convert back to number for Firestore storage
        price: parseFloat(productData.price),
        stock: parseInt(productData.stock, 10),
        colorVariants: productData.colorVariants,
        sizeVariants: productData.sizeVariants,
        imageUrls: finalImageUrls,
        searchKeywords: generateSearchKeywords(tempProductForKeywords),
        updatedAt: new Date(),
        // Note: productId field is NOT updated as it's already set by the previous step
      };

      // Update the document
      const productDocRef = doc(db, "products", productId);
      await updateDoc(productDocRef, productToUpdate);

      setMessage(`✅ Product "${productData.name}" updated successfully!`);
      setImageFiles([]); // Clear new files after successful upload

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
  // JSX RENDERING (Ensure fields are bound to productData)
  // =======================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-yellow-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        <div className="text-center mb-8">
          {/* Header JSX... */}
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
              {/* Message Icon JSX... */}
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

            {/* PRICING, STOCK & CATEGORY */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <FiLayers className="w-6 h-6 mr-3 text-green-600" />
                Pricing, Stock & Category
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

                <div className="relative">
                  <FiDollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    name="price"
                    value={productData.price} 
                    onChange={handleChange}
                    required
                    placeholder="Price (₹) *"
                    min="0"
                    step="0.01"
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                    disabled={isFormDisabled}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <input
                  type="number"
                  name="stock"
                  value={productData.stock} 
                  onChange={handleChange}
                  required
                  placeholder="Stock Quantity *"
                  min="0"
                  className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                  disabled={isFormDisabled}
                />
              </div>
            </div>

            {/* PRODUCT VARIANTS (COLOR) */}
            <div className="space-y-6">
               <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <FiDroplet className="w-6 h-6 mr-3 text-orange-600" />
                Product Variants
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* COLOR VARIANTS JSX... */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Add/Remove Color Variants</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={manualColorInput}
                      onChange={(e) => setManualColorInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColorVariant())}
                      placeholder="Enter color (e.g., Maroon)"
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      disabled={isFormDisabled}
                    />
                    <button
                      type="button"
                      onClick={addColorVariant}
                      className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                      disabled={isFormDisabled}
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {productData.colorVariants.map((color, i) => (
                      <span key={i} className="flex items-center px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                        {color}
                        <button
                          type="button"
                          className="ml-2 text-orange-600 hover:text-orange-800 disabled:opacity-50"
                          onClick={() => removeVariant("colorVariants", color)}
                          disabled={isFormDisabled}
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* SIZE VARIANTS JSX... */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Add/Remove Size Variants</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={manualSizeInput}
                      onChange={(e) => setManualSizeInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSizeVariant())}
                      placeholder="Enter size (e.g., XL)"
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isFormDisabled}
                    />
                    <button
                      type="button"
                      onClick={addSizeVariant}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                      disabled={isFormDisabled}
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {productData.sizeVariants.map((size, i) => (
                      <span key={i} className="flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {size}
                        <button
                          type="button"
                          className="ml-2 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          onClick={() => removeVariant("sizeVariants", size)}
                          disabled={isFormDisabled}
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* IMAGE MANAGEMENT (EXISTING + NEW) */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <FiCamera className="w-6 h-6 mr-3 text-pink-600" />
                Image Management
              </h3>

              {/* Existing Images */}
              {productData.imageUrls.length > 0 && (
                <div className="p-4 border rounded-xl bg-pink-50">
                  <p className="text-md font-semibold text-gray-700 mb-3">Existing Images (Click 'X' to Remove):</p>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {productData.imageUrls.map((img, i) => (
                      <div key={`existing-${i}`} className="relative group border border-pink-200 rounded-lg overflow-hidden shadow-sm">
                        <img
                          src={img.url}
                          alt={img.name}
                          className="w-full h-24 object-cover"
                          onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/150?text=Image+URL+Error"; }}
                        />

                        <button
                          type="button"
                          className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeExistingImage(i)}
                          title="Remove Image"
                          disabled={isFormDisabled}
                        >
                          <FiX className="w-4 h-4" />
                        </button>

                        <p className="text-xs p-1 truncate text-gray-600 font-medium bg-white">
                          {img.name.length > 15 ? img.name.substring(0, 12) + '...' : img.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Images / URL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* File Upload JSX... */}
                 <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 flex items-center">
                    <FiUpload className="w-4 h-4 mr-2" /> Upload New Files
                  </label>
                  <input
                    type="file"
                    id="newProductImages"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    disabled={isFormDisabled}
                  />
                  {imageFiles.length > 0 && (
                    <p className="text-xs text-blue-600">
                      {imageFiles.length} new file(s) ready to upload on save.
                    </p>
                  )}
                </div>

                {/* Manual URL Input JSX... */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 flex items-center">
                    <FiLink className="w-4 h-4 mr-2" /> Add Image URL
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="url"
                      value={manualImageUrl}
                      onChange={(e) => setManualImageUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImageUrl())}
                      placeholder="Paste image URL"
                      className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      disabled={isFormDisabled}
                    />
                    <button
                      type="button"
                      onClick={addImageUrl}
                      className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50"
                      disabled={isFormDisabled}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
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
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <FiCheck className="w-6 h-6" />
                  <span>Update Product</span>
                </>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProductPage; 