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
  FiLink,
  FiChevronDown,
  FiFileText,
  FiUpload,
} from 'react-icons/fi';

// Assuming you have imported and configured your Firebase app instance:
import { db, storage } from "../../../firerbase";
import {
  collection,
  addDoc,
  getDocs,
  // ✨ NEW IMPORTS
  doc, 
  updateDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";


// *** REUSABLE KEYWORD GENERATION FUNCTION ***
// Helper function to generate search keywords from product data
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

  // 3. Brand, SKU, HSN (add full string and partials)
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
  
  // 4. Category/Subcategory Names
  if (product.category.name) keywords.add(product.category.name.toLowerCase());
  if (product.subCategory && product.subCategory.name) keywords.add(product.subCategory.name.toLowerCase());
  
  // 5. Variants (Colors & Sizes)
  product.colorVariants.forEach(color => keywords.add(color.toLowerCase()));
  product.sizeVariants.forEach(size => keywords.add(size.toLowerCase()));

  // Filter out empty or insignificant entries and return as an array
  return Array.from(keywords).filter(k => k.length > 0 && k.length <= 50);
};
// **********************************************


const AddProductPage = () => {
  // --- STATE FOR FETCHED DATA ---
  const [categoriesList, setCategoriesList] = useState([]);
  const [subcategoriesList, setSubcategoriesList] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // --- FORM DATA STATE (STORES IDs) ---
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    sku: '',
    hsnCode: '',
    brand: '',
    category: '',    
    subCategory: '', 
    price: '',
    stock: '',
    colorVariants: [],
    sizeVariants: [],
    imageUrls: [], 
  });

  // --- INPUT/UTILITY STATES ---
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [manualColorInput, setManualColorInput] = useState('');
  const [manualSizeInput, setManualSizeInput] = useState('');
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 1. --- FETCH CATEGORIES AND SUBCATEGORIES ---
  useEffect(() => {
    const fetchCategoriesData = async () => {
      setLoadingData(true);
      try {
        const catCollectionRef = collection(db, "categories");
        const catSnapshot = await getDocs(catCollectionRef);
        const fetchedCats = catSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCategoriesList(fetchedCats);

        const subCatCollectionRef = collection(db, "subcategories");
        const subCatSnapshot = await getDocs(subCatCollectionRef);
        const fetchedSubCats = subCatSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().subcategory, 
          ...doc.data()
        }));
        setSubcategoriesList(fetchedSubCats);

        if (fetchedCats.length > 0) {
          const defaultCatId = fetchedCats[0].id;
          const defaultSubCat = fetchedSubCats.find(sub => sub.categoryId === defaultCatId);

          setProductData(prev => ({
            ...prev,
            category: defaultCatId,
            subCategory: defaultSubCat ? defaultSubCat.id : '',
          }));
        }

      } catch (error) {
        console.error("Error fetching categories data:", error);
        setMessage("❌ Failed to load categories/subcategories data.");
      } finally {
        setLoadingData(false);
      }
    };

    fetchCategoriesData();
  }, []); 

  // Filter subcategories based on the currently selected category ID
  const filteredSubcategories = subcategoriesList.filter(
    sub => sub.categoryId === productData.category
  );

  // 2. --- CHANGE INPUT HANDLER ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProductData(prevData => {
      let newState = { ...prevData, [name]: value };

      if (name === 'category') {
        const newFilteredSubs = subcategoriesList.filter(sub => sub.categoryId === value);
        const newSubCatId = newFilteredSubs.length > 0 ? newFilteredSubs[0].id : '';
        newState.subCategory = newSubCatId;
      }

      return newState;
    });
  };

  // --- VARIANT LOGIC (Same as before) ---
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

  // --- IMAGE FILE UPLOAD LOGIC (Same as before) ---
  const handleImageChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImageFiles(files);
      
      const previews = files.map(file => new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ url: reader.result, name: file.name, type: 'file', file: file });
        reader.readAsDataURL(file);
      }));
      Promise.all(previews).then(setImagePreviews);
    }
  };

  const removeImageFile = (index) => {
    const newFiles = [...imageFiles];
    const newPreviews = [...imagePreviews];
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
  };
  
  // --- MANUAL IMAGE URL LOGIC (Same as before) ---
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

  const removeImageUrl = (index) => {
    setProductData(prev => ({
      ...prev,
      imageUrls: prev.imageUrls.filter((_, i) => i !== index)
    }));
  };
  

  // 3. --- SUBMIT HANDLER (Uses addDoc and then updateDoc) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    if (loadingData) {
      setMessage("❌ Data is still loading. Please wait.");
      return;
    }

    if (!productData.name || !productData.price || !productData.stock || !productData.category) {
      setMessage("❌ Please fill out Name, Price, Stock, and Category fields.");
      return;
    }

    if (imageFiles.length === 0 && productData.imageUrls.length === 0) {
      setMessage("❌ Please upload at least one image file OR add at least one image URL.");
      return;
    }
    
    setLoading(true);

    try {
      // Start with manually added image URLs
      const finalImageUrls = [...productData.imageUrls];

      // Upload files to Firebase Storage and collect URLs
      for (const file of imageFiles) {
        const fileName = `products/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, fileName);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);

        finalImageUrls.push({ url: downloadURL, name: file.name, path: fileName, type: 'file' });
      }

      // Look up names for display and store both ID and Name
      const selectedCategory = categoriesList.find(cat => cat.id === productData.category);
      const selectedSubCategory = subcategoriesList.find(sub => sub.id === productData.subCategory);

      // Create a temporary object with category/subcategory names for keyword generation
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

      // *** GENERATE SEARCH KEYWORDS ***
      const searchKeywords = generateSearchKeywords(tempProductForKeywords);


      // Product data to upload to Firestore (without productId field initially)
      const productToAdd = {
        name: productData.name,
        description: productData.description,
        sku: productData.sku || `SKU-${Date.now()}`,
        hsnCode: productData.hsnCode,
        brand: productData.brand,
        category: tempProductForKeywords.category, 
        subCategory: tempProductForKeywords.subCategory,
        price: parseFloat(productData.price),
        stock: parseInt(productData.stock, 10),
        colorVariants: productData.colorVariants,
        sizeVariants: productData.sizeVariants,
        imageUrls: finalImageUrls,
        searchKeywords: searchKeywords, // Stored for searchability
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active'
      };

      // 1. Upload to Firestore using addDoc, which auto-generates the ID
      const docRef = await addDoc(collection(db, "products"), productToAdd);
      
      const newProductId = docRef.id;

      // 2. ✨ UPDATE: Use updateDoc to set the generated ID as an internal field
      await updateDoc(doc(db, "products", newProductId), {
          productId: newProductId
      });

      // Success message and form reset...
      setMessage(`✅ Product "${productData.name}" added successfully! Product ID: ${newProductId}`);

      const defaultCatId = categoriesList[0]?.id || '';
      const defaultSubCatId = subcategoriesList.find(sub => sub.categoryId === defaultCatId)?.id || '';

      setProductData({
        name: '', description: '', sku: '', hsnCode: '', brand: '', 
        category: defaultCatId, subCategory: defaultSubCatId, 
        price: '', stock: '', colorVariants: [], sizeVariants: [], imageUrls: []
      });
      setImageFiles([]);
      setImagePreviews([]);
      setManualColorInput('');
      setManualSizeInput('');
      setManualImageUrl('');
      
      const fileInput = document.getElementById("productImages");
      if (fileInput) fileInput.value = "";

    } catch (error) {
      console.error("Firebase error:", error);
      setMessage(`❌ Failed to add product: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isSuccess = message.startsWith("✅");
  const messageClass = isSuccess
    ? "bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 text-green-700"
    : "bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 text-red-700";
  
  const isFormDisabled = loading || loadingData;


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* ... (Header) ... */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-4">
            <FiShoppingBag className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Add New Product
          </h1>
          <p className="text-gray-600 text-lg">Input details, variants, and images (File Upload or URL)</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {loadingData && (
             <div className="p-4 flex items-center bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700">
               <FiRefreshCw className="w-5 h-5 animate-spin mr-3" />
               <span className="font-medium">Loading categories and subcategories from Firestore...</span>
             </div>
          )}

          {message && (
            <div className={`p-4 flex items-center ${messageClass}`}>
              <div className={`w-6 h-6 rounded-full ${isSuccess ? 'bg-green-500' : 'bg-red-500'} flex items-center justify-center mr-3`}>
                {isSuccess ? <FiCheck className="w-4 h-4 text-white" /> : <FiX className="w-4 h-4 text-white" />}
              </div>
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
            
            {/* ... (Rest of the form JSX is unchanged) ... */}
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
                    {categoriesList.length === 0 ? (
                      <option value="">{loadingData ? "Loading categories..." : "No categories found"}</option>
                    ) : (
                      categoriesList.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="relative">
                  {loadingData ? (
                    <div className="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-500 text-sm flex items-center h-full">
                        Loading subcategories...
                    </div>
                  ) : filteredSubcategories.length > 0 ? (
                    <>
                      <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                      <select
                        name="subCategory"
                        value={productData.subCategory}
                        onChange={handleChange}
                        className="appearance-none w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                        disabled={isFormDisabled}
                      >
                        {filteredSubcategories.map(subCat => (
                          <option key={subCat.id} value={subCat.id}>{subCat.name}</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <div className="px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-100 text-gray-500 text-sm flex items-center h-full">
                        No Subcategories Found
                    </div>
                  )}
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

            {/* PRODUCT VARIANTS (MANUAL INPUT) */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <FiDroplet className="w-6 h-6 mr-3 text-orange-600" />
                Product Variants (Manual Entry)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* COLOR VARIANTS */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Add Color Variant</label>
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
                      <FiPlus className="w-4 h-4" />
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

                {/* SIZE VARIANTS */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">Add Size Variant</label>
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
                      <FiPlus className="w-4 h-4" />
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

            {/* IMAGE UPLOAD & URL INPUT (COMBINED) */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                <FiCamera className="w-6 h-6 mr-3 text-pink-600" />
                Product Images * (File Upload or URL)
              </h3>
              
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-pink-400 transition-colors duration-200 bg-gray-50">
                <FiUpload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <label className="cursor-pointer">
                  <span className="text-lg font-medium text-gray-700 block mb-2">Upload Images from Computer</span>
                  <p className="text-gray-500 text-sm">Select multiple image files</p>
                  <input 
                    type="file"
                    id="productImages"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={isFormDisabled}
                  />
                </label>
              </div>

              <div className="space-y-3 pt-4">
                <label className="block text-lg font-semibold text-gray-700 flex items-center">
                    <FiLink className="w-5 h-5 mr-2 text-pink-500"/> Or Add Image URL Directly
                </label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    value={manualImageUrl}
                    onChange={(e) => setManualImageUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addImageUrl())}
                    placeholder="Paste direct image URL (e.g., https://example.com/image.jpg)"
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                    disabled={isFormDisabled}
                  />
                  <button
                    type="button"
                    onClick={addImageUrl}
                    className="px-4 py-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                    disabled={isFormDisabled}
                  >
                    <FiPlus className="w-5 h-5" />
                  </button>
                </div>
              </div>


              {/* COMBINED PREVIEWS/LIST */}
              {(imagePreviews.length > 0 || productData.imageUrls.length > 0) && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-3 font-semibold">
                    🖼️ Total Images Selected: {imagePreviews.length + productData.imageUrls.length}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    
                    {/* File Previews (Local) */}
                    {imagePreviews.map((preview, index) => (
                      <div key={`file-${index}`} className="relative group border-2 border-pink-200 rounded-lg overflow-hidden shadow-md">
                        <img
                          src={preview.url}
                          alt={`File Preview ${index + 1}`}
                          className="w-full h-24 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImageFile(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                          title="Remove File"
                          disabled={isFormDisabled}
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                        <p className="text-xs text-gray-600 truncate p-1 bg-pink-50 font-medium">
                          {preview.name} (File)
                        </p>
                      </div>
                    ))}
                    
                    {/* URL Previews (Manual) */}
                    {productData.imageUrls.map((image, index) => (
                      <div key={`url-${index}`} className="relative group border-2 border-purple-200 rounded-lg overflow-hidden shadow-md">
                        <img
                          src={image.url}
                          alt={`URL Preview ${index + 1}`}
                          className="w-full h-24 object-cover"
                          onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/150?text=Invalid+URL"; }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImageUrl(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                          title="Remove URL"
                          disabled={isFormDisabled}
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                        <p className="text-xs text-gray-600 truncate p-1 bg-purple-50 font-medium">
                          {image.name} (URL)
                        </p>
                      </div>
                    ))}

                  </div>
                </div>
              )}
            </div>

            {/* SUBMIT BUTTON */}
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