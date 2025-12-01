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


// *** REUSABLE KEYWORD GENERATION FUNCTION ***
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

  // 3. Brand, SKU, HSN
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
  // Collect all unique colors and sizes from variants
  const uniqueColors = new Set(product.variants.map(v => v.color).filter(Boolean));
  const uniqueSizes = new Set(product.variants.map(v => v.size).filter(Boolean));
  
  uniqueColors.forEach(color => keywords.add(color.toLowerCase()));
  uniqueSizes.forEach(size => keywords.add(size.toLowerCase()));

  return Array.from(keywords).filter(k => k.length > 0 && k.length <= 50);
};
// **********************************************


const AddProductPage = () => {
  // --- STATE FOR FETCHED DATA ---
  const [categoriesList, setCategoriesList] = useState([]);
  const [subcategoriesList, setSubcategoriesList] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // --- 1. FORM DATA STATE (UPDATED for variant structure) ---
  const [productData, setProductData] = useState({
    name: '',
    description: '',
    sku: '',
    hsnCode: '',
    brand: '',
    category: '',    
    subCategory: '', 
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

  // --- IMAGE & COLOR ASSOCIATION STATES ---
  const [mainImageFile, setMainImageFile] = useState(null); // { file: File, color: string, url: string }
  const [galleryFiles, setGalleryFiles] = useState([]); // Array of { file: File, color: string, url: string }
  const [isColorSelectionModalOpen, setIsColorSelectionModalOpen] = useState(false);
  const [currentImageFileToAssign, setCurrentImageFileToAssign] = useState(null); // The raw File object being processed
  const [tempColorAssignment, setTempColorAssignment] = useState(''); // Color selected in the modal


  // --- OTHER UTILITY STATES ---
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 1. --- FETCH CATEGORIES AND SUBCATEGORIES (UNCHANGED) ---
  useEffect(() => {
    const fetchCategoriesData = async () => {
        setLoadingData(true);
        try {
          // ... (Category/Subcategory fetching logic remains the same) ...
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
            const newFilteredSubs = fetchedSubCats.filter(sub => sub.categoryId === defaultCatId);
            const defaultSubCatId = newFilteredSubs.length > 0 ? newFilteredSubs[0].id : '';
  
            setProductData(prev => ({
              ...prev,
              category: defaultCatId,
              subCategory: defaultSubCatId,
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

  // 2. --- CHANGE INPUT HANDLER (for productData fields) ---
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

  // --- VARIANT LOGIC ---
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
      variantId: Date.now().toString(), // Simple unique ID for keying/tracking
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

    // Reset new variant input
    setNewVariant({ color: '', size: '', price: '', offerPrice: '', stock: '' });
    setMessage("✅ Variant added successfully.");
  };

  const removeVariant = (variantId) => {
    setProductData(prev => ({
      ...prev,
      variants: prev.variants.filter(v => v.variantId !== variantId),
    }));
    setMessage("✅ Variant removed.");
  };

  // --- IMAGE HANDLERS AND COLOR MODAL LOGIC ---
  
  // List of all unique colors currently available in variants
  const availableColors = Array.from(new Set(productData.variants.map(v => v.color)));

  const openColorModal = (file) => {
    setCurrentImageFileToAssign(file);
    setTempColorAssignment(availableColors.length > 0 ? availableColors[0] : '');
    setIsColorSelectionModalOpen(true);
  };

  const assignColorAndProcessImage = (file, color) => {
    const fileWithColor = {
      file: file,
      color: color,
      url: URL.createObjectURL(file), // Create object URL for preview
      name: file.name,
    };

    if (mainImageFile && mainImageFile.file === file) {
      // Re-assigning color for the main image
      setMainImageFile(fileWithColor);
    } else if (galleryFiles.some(p => p.file === file)) {
      // Re-assigning color for an existing gallery image
      setGalleryFiles(prev => prev.map(p => p.file === file ? fileWithColor : p));
    } else {
      // New image being assigned
      if (mainImageFile === null) {
        setMainImageFile(fileWithColor);
        setMessage(`✅ Main image assigned to color: ${color}`);
      } else {
        setGalleryFiles(prev => [...prev, fileWithColor]);
        setMessage(`✅ Gallery image added and assigned to color: ${color}`);
      }
    }
  };

  const handleModalSubmit = (isMain = false) => {
    if (!tempColorAssignment) {
      setMessage("❌ Please select or enter a color to assign to the image.");
      return;
    }
    
    const colorToAssign = tempColorAssignment.trim();

    assignColorAndProcessImage(currentImageFileToAssign, colorToAssign);

    // If the color isn't in any existing variant, add it as a color-only variant placeholder
    if (!productData.variants.some(v => v.color.toLowerCase() === colorToAssign.toLowerCase())) {
        const placeholderVariant = {
            variantId: `ph-${Date.now()}`,
            color: colorToAssign,
            size: 'N/A', // Placeholder size
            price: 0,
            offerPrice: null,
            stock: 0,
        };
        setProductData(prev => ({
            ...prev,
            variants: [...prev.variants, placeholderVariant],
        }));
    }

    setIsColorSelectionModalOpen(false);
    setCurrentImageFileToAssign(null);
    setTempColorAssignment('');
  };
  
  const handleMainImageChange = (e) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      openColorModal(file);
    }
    e.target.value = null; // Reset input
  };
    
  const removeMainImage = () => {
    setMainImageFile(null);
    setMessage("✅ Main image removed.");
  };


  const handleGalleryImageChange = (e) => {
      const files = Array.from(e.target.files || []);
      files.forEach(file => openColorModal(file));
      e.target.value = null; // Clear the file input value after selection
  };
    
  const removeGalleryImage = (fileToRemove) => {
      setGalleryFiles(prevFiles => prevFiles.filter(p => p.file !== fileToRemove));
      setMessage("✅ Gallery image removed.");
  };


  // 5. --- SUBMIT HANDLER ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    
    // VALIDATION CHECKS
    if (loadingData) {
      setMessage("❌ Data is still loading. Please wait.");
      return;
    }

    if (!productData.name || !productData.category || !productData.sellerId) {
      setMessage("❌ Please fill out Product Name, Category, and Seller ID fields.");
      return;
    }

    if (productData.variants.length === 0) {
        setMessage("❌ Please add at least one **Product Variant** (Color/Size/Price/Stock).");
        return;
    }
    
    if (!mainImageFile) {
        setMessage("❌ Please upload a **Main Product Image** and assign a color.");
        return;
    }
    
    setLoading(true);

    try {
        const finalImageUrls = [];
        let mainImageUrl = null;
        
        // --- 1. HANDLE MAIN IMAGE UPLOAD ---
        const mainFile = mainImageFile.file;
        const mainFileName = `products/${Date.now()}_main_${mainFile.name}`;
        const mainStorageRef = ref(storage, mainFileName);
        const mainSnapshot = await uploadBytes(mainStorageRef, mainFile);
        mainImageUrl = await getDownloadURL(mainSnapshot.ref);
        
        const mainImageObject = { 
            url: mainImageUrl, 
            name: mainFile.name, 
            path: mainFileName, 
            type: 'file',
            isMain: true,
            color: mainImageFile.color, // ✨ NEW FIELD
        };
        
        finalImageUrls.push(mainImageObject);

        // --- 2. HANDLE GALLERY IMAGE UPLOAD/COLLECTION ---
        for (const imageObject of galleryFiles) {
            const file = imageObject.file;
            const color = imageObject.color;
            
            const fileName = `products/${Date.now()}_gallery_${file.name}`;
            const storageRef = ref(storage, fileName);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            const imageUploadObject = { 
                url: downloadURL, 
                name: file.name, 
                path: fileName, 
                type: 'file',
                isMain: false,
                color: color, // ✨ NEW FIELD
            };
            
            finalImageUrls.push(imageUploadObject);
        }

        // Look up names for display and store both ID and Name
        const selectedCategory = categoriesList.find(cat => cat.id === productData.category);
        const selectedSubCategory = subcategoriesList.find(sub => sub.id === productData.subCategory);

        // Create a temporary object with category/subcategory names for keyword generation
        // Also includes variants for keyword generation
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


        // Product data to upload to Firestore
        const productToAdd = {
          name: productData.name,
          description: productData.description,
          sku: productData.sku || `SKU-${Date.now()}`,
          hsnCode: productData.hsnCode,
          brand: productData.brand,
          category: tempProductForKeywords.category, 
          subCategory: tempProductForKeywords.subCategory,
          // Removed single price/stock fields
          
          variants: productData.variants, // ✨ NEW VARIANTS ARRAY
          
          imageUrls: finalImageUrls, // Full list with isMain flag and color
          mainImageUrl: mainImageUrl, 
          searchKeywords: searchKeywords, 
          createdAt: new Date(),
          updatedAt: new Date(),
          status: 'active',
          sellerId: productData.sellerId, 
        };

        // 1. Upload to Firestore
        const docRef = await addDoc(collection(db, "products"), productToAdd);
        
        const newProductId = docRef.id;

        // 2. Use updateDoc to set the generated ID as an internal field
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
          sellerId: '', 
          variants: [], // Reset variants
        });
        
        // Reset image states
        setMainImageFile(null);
        setGalleryFiles([]);
        setNewVariant({ color: '', size: '', price: '', offerPrice: '', stock: '' });

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
            <p className="text-gray-600 text-lg">Input details, variants, and images</p>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Product Name */}
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
                    {/* SELLER ID INPUT */}
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
                      {categoriesList.length === 0 ? (
                        <option value="">{loadingData ? "Loading categories..." : "No categories found"}</option>
                      ) : (
                        categoriesList.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))
                      )}
                    </select>
                  </div>
                  
                  {/* SubCategory Select */}
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
                    Product Images (Assign Color to Each) *
                </h3>
                
                {/* Main Image File Upload */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-bold text-pink-700 mb-2">Main Image (Per Color)</h4>
                        <div className="border-2 border-dashed border-pink-300 rounded-xl p-6 text-center hover:border-pink-500 transition-colors duration-200 bg-white">
                            <FiUpload className="w-8 h-8 text-pink-400 mx-auto mb-3" />
                            <label className="cursor-pointer">
                                <span className="text-lg font-medium text-gray-700 block mb-1">Upload Main Image File</span>
                                <p className="text-gray-500 text-sm">(Must be associated with a color)</p>
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
                    </div>
                    
                    {/* Main Image Preview */}
                    {mainImageFile && (
                        <div className="mt-4 md:mt-0 p-4 border border-pink-400 rounded-lg bg-white relative">
                            <p className="text-sm font-bold text-pink-700 mb-2">Main Image Preview:</p>
                            <div className="relative w-40 h-40 rounded-lg overflow-hidden shadow-md">
                                <img
                                    src={mainImageFile.url}
                                    alt="Main Image Preview"
                                    className="w-full h-full object-cover"
                                />
                                <span className="absolute bottom-0 left-0 bg-pink-600 text-white text-xs font-bold px-2 py-1 rounded-tr-lg">MAIN</span>
                                <span className="absolute top-0 right-0 bg-pink-800 text-white text-xs font-bold px-2 py-1 rounded-bl-lg">{mainImageFile.color}</span>
                            </div>
                            <p className="text-xs text-gray-600 mt-2 truncate font-medium" title={mainImageFile.name}>{mainImageFile.name}</p>
                            <button
                                type="button"
                                onClick={removeMainImage}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors disabled:opacity-50"
                                title="Remove Main Image"
                                disabled={isFormDisabled}
                            >
                                <FiX className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Gallery Image File Upload */}
                <div className="mt-6">
                    <h4 className="font-bold text-blue-700 mb-2">Gallery Images (Per Color)</h4>
                    <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors duration-200 bg-white">
                        <FiUpload className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                        <label className="cursor-pointer">
                            <span className="text-lg font-medium text-gray-700 block mb-1">Upload Gallery Image Files</span>
                            <p className="text-gray-500 text-sm">(Select multiple files, each will require color assignment)</p>
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
                
                {/* Gallery Image Previews */}
                {galleryFiles.length > 0 && (
                    <div className="mt-4 p-4 border border-blue-400 rounded-lg bg-white">
                        <p className="text-sm font-bold text-blue-700 mb-3">Gallery Previews ({galleryFiles.length}):</p>
                        <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                            {galleryFiles.map((image, index) => (
                                <div 
                                    key={`gallery-img-${image.name}-${index}`} 
                                    className="relative rounded-lg overflow-hidden shadow-md group border border-gray-200"
                                >
                                    <img
                                        src={image.url}
                                        alt={`Gallery Preview ${index + 1}`}
                                        className="w-full h-20 object-cover"
                                    />
                                    <span className="absolute top-0 right-0 bg-blue-800 text-white text-xs font-bold px-2 py-1 rounded-bl-lg z-10">{image.color}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeGalleryImage(image.file)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 z-20"
                                        title="Remove Gallery Image"
                                        disabled={isFormDisabled}
                                    >
                                        <FiX className="w-3 h-3" />
                                    </button>
                                    <p className="text-xs text-gray-600 truncate p-1 bg-gray-50 font-medium" title={image.name}>
                                      {image.name}
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
        
        {/* --- COLOR SELECTION MODAL --- */}
        {isColorSelectionModalOpen && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md space-y-4">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center">
                        <FiCamera className="w-5 h-5 mr-2 text-pink-600" />
                        Assign Color to Image
                    </h3>
                    <p className="text-sm text-gray-600">
                        Please select the color variant this image belongs to.
                    </p>
                    
                    {availableColors.length > 0 && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Choose from existing colors:</label>
                            <select
                                value={tempColorAssignment}
                                onChange={(e) => setTempColorAssignment(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            >
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
                                // If the file was for the main image, clear the input
                                if (document.getElementById("mainImageFile")) document.getElementById("mainImageFile").value = "";
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
                            Assign Color
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    );
  };

  export default AddProductPage;