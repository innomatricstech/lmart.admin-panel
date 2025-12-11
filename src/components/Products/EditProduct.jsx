import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiPackage,
  FiCamera,
  FiDollarSign,
  FiTag,
  FiLayers,
  FiDroplet,
  FiPlus,
  FiCheck,
  FiEdit,
  FiX,
  FiRefreshCw,
  FiChevronDown,
  FiFileText,
  FiUpload,
  FiUser,
  FiZap,
  FiTrash2,
  FiSave,
  FiVideo, // 👈 ADDED VIDEO ICON
} from 'react-icons/fi';

// Assuming you have imported and configured your Firebase app instance:
import { db, storage } from "../../../firerbase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

// 👇 NEW IMPORT for the success modal
import ProductUpdateSuccessModal from './ProductUpdateSuccessModal'; 


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

  // 4. Add new productTag
  if (product.productTag) keywords.add(product.productTag.toLowerCase());

  return Array.from(keywords).filter(k => k.length > 0 && k.length <= 50);
};


// List of available product tags/labels
const PRODUCT_TAG_OPTIONS = [
    { value: '', label: 'Select Product Label' },
    { value: 'E-Store', label: 'E-Store' },
    { value: 'Local Market', label: 'Local Market' },
    { value: 'Printing', label: 'Printing' },
   
];


const EditProductPage = () => {
    const { productId } = useParams();
    const navigate = useNavigate();

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
        category: '', // Stores ID
        subCategory: '', // Stores ID
        sellerId: '',
        productTag: '',
        variants: [],
    });

    // --- VARIANT MANAGEMENT STATE ---
    const [newVariant, setNewVariant] = useState({
        color: '',
        size: '',
        price: '',
        offerPrice: '',
        stock: '',
    });

    // --- IMAGE MANAGEMENT STATE ---
    const [mainImageState, setMainImageState] = useState(null);
    const [galleryImagesState, setGalleryImagesState] = useState([]);
    // 👇 ADDED STATE FOR VIDEO
    const [videoFileState, setVideoFileState] = useState(null); 
    
    // Array to track paths of images/videos that were deleted/replaced (for cleanup)
    const [imagesToDelete, setImagesToDelete] = useState([]);


    // --- OTHER UTILITY STATES ---
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [message, setMessage] = useState('');
    // 👇 NEW STATE FOR MODAL
    const [showSuccessModal, setShowSuccessModal] = useState(false); 


    // 🚨 CATEGORY FILTERING LOGIC
    const filteredCategories = categoriesList.filter(cat =>
        !productData.productTag || (cat.label && cat.label.toLowerCase() === productData.productTag.toLowerCase())
    );

    const filteredSubcategories = subcategoriesList
        .filter(sub =>
            !productData.productTag || (sub.label && sub.label.toLowerCase() === productData.productTag.toLowerCase())
        )
        .filter(sub => !productData.category || sub.categoryId === productData.category);


    // --- FETCH DATA (PRODUCT, CATEGORIES, SUBCATEGORIES) ---
    useEffect(() => {
        const fetchProductData = async () => {
            setLoadingData(true);
            try {
                // Fetch all categories and subcategories
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

                // Fetch specific product data
                const docRef = doc(db, "products", productId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();

                    // --- 1. Map Firestore data to productData state ---
                    setProductData({
                        name: data.name || '',
                        description: data.description || '',
                        sku: data.sku || '',
                        hsnCode: data.hsnCode || '',
                        brand: data.brand || '',
                        category: data.category?.id || '',
                        subCategory: data.subCategory?.id || '',
                        sellerId: data.sellerId || '',
                        productTag: data.productTag || '',
                        variants: data.variants || [],
                    });

                    // --- 2. Map Image URLs to Image State ---
                    const fetchedImages = data.imageUrls || [];

                    const mainImage = fetchedImages.find(img => img.isMain);
                    const galleryImages = fetchedImages.filter(img => !img.isMain);

                    if (mainImage) {
                        setMainImageState({
                            url: mainImage.url,
                            color: mainImage.color || '',
                            name: mainImage.name,
                            id: `main-${mainImage.path}`,
                            path: mainImage.path,
                            isMain: true,
                            isExisting: true, // Mark as existing file/URL
                        });
                    } else {
                        setMainImageState(null);
                    }

                    setGalleryImagesState(galleryImages.map(img => ({
                        url: img.url,
                        color: img.color || '',
                        name: img.name,
                        id: `gallery-${img.path}`,
                        path: img.path,
                        isMain: false,
                        isExisting: true, // Mark as existing file/URL
                    })));
                    
                    // --- 3. Map Video URL to Video State ---
                    if (data.videoUrl && data.videoPath) {
                        setVideoFileState({
                            url: data.videoUrl,
                            name: data.videoUrl.split('/').pop().split('?')[0], // Simple way to derive a name
                            id: `video-${data.videoPath}`,
                            path: data.videoPath,
                            isExisting: true,
                        });
                    } else {
                        setVideoFileState(null);
                    }


                } else {
                    setMessage("❌ No such product found.");
                }

            } catch (err) {
                console.error("Error fetching data:", err);
                setMessage("❌ Failed to load product data for editing.");
            }
            setLoadingData(false);
        };

        fetchProductData();
    }, [productId]);


    // --- PRODUCT & CATEGORY CHANGE HANDLER (UNMODIFIED) ---
    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === "productTag") {
            setProductData(prev => ({
                ...prev,
                [name]: value,
                category: '',
                subCategory: '',
            }));
            return;
        }

        if (name === "category") {
            const subsByCat = subcategoriesList.filter(sub => sub.categoryId === value);
            const subsByCatAndLabel = subsByCat.filter(sub =>
                !productData.productTag || (sub.label && productData.productTag && sub.label.toLowerCase() === productData.productTag.toLowerCase())
            );
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

    // --- VARIANT LOGIC (UNMODIFIED) ---
    const handleNewVariantChange = (e) => {
        const { name, value } = e.target;
        setNewVariant(prev => ({ ...prev, [name]: value }));
    };

    const handleAddVariant = () => {
        const { color, size, price, offerPrice, stock } = newVariant;
        const cleanColor = color.trim();
        const cleanSize = size.trim().toUpperCase();
        const cleanPrice = price ? parseFloat(price) : 0;
        const cleanOfferPrice = offerPrice ? parseFloat(offerPrice) : null;
        const cleanStock = stock ? parseInt(stock, 10) : 0;

        if (cleanOfferPrice !== null && cleanOfferPrice > 0 && cleanOfferPrice >= cleanPrice) {
            setMessage("❌ Variant Offer Price cannot be greater than or equal to the regular Price.");
            return;
        }

        const exists = productData.variants.some(
            v => v.color.toLowerCase() === cleanColor.toLowerCase() && v.size.toLowerCase() === cleanSize.toLowerCase()
        );

        if (exists && cleanColor && cleanSize) {
            setMessage("❌ A variant with this Color and Size already exists.");
            return;
        }

        if (!cleanColor && !cleanSize && cleanPrice === 0 && cleanStock === 0) {
            setMessage("❌ Please provide at least Color, Size, Price, or Stock to add a variant.");
            return;
        }


        const newVariantObject = {
            variantId: Date.now().toString(),
            color: cleanColor || 'N/A',
            size: cleanSize || 'N/A',
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

    const availableColors = Array.from(new Set(productData.variants.map(v => v.color))).filter(c => c.trim() !== '' && c.trim() !== 'N/A');

    // --- IMAGE MANAGEMENT LOGIC ---
    const handleMainImageChange = (e) => {
        const file = e.target.files ? e.target.files[0] : null;
        if (file) {
            // If an existing main image is being replaced, mark it for deletion
            if (mainImageState && mainImageState.isExisting && mainImageState.path) {
                setImagesToDelete(prev => [...prev, mainImageState.path]);
            }
            // Clear the local URL of the old object if it was a file
            if (mainImageState && mainImageState.url && !mainImageState.isExisting) URL.revokeObjectURL(mainImageState.url);


            setMainImageState({
                file: file,
                url: URL.createObjectURL(file),
                color: '',
                name: file.name,
                id: `main-${Date.now()}`,
                isMain: true,
                isExisting: false, // It's a new file
            });
            setMessage(`✅ Main Image selected: ${file.name}.`);
        } else {
            setMainImageState(null);
        }
        e.target.value = null;
    };

    const handleGalleryImageChange = (e) => {
        const files = Array.from(e.target.files || []);

        const newImages = files.map(file => ({
            file: file,
            url: URL.createObjectURL(file),
            color: '',
            name: file.name,
            id: `gallery-${Date.now()}-${Math.random()}`,
            isMain: false,
            isExisting: false, // It's a new file
        }));

        const uniqueNewImages = newImages.filter(newImg =>
            !galleryImagesState.some(existingImg =>
                (existingImg.isExisting && existingImg.name === newImg.name) ||
                (!existingImg.isExisting && existingImg.file && newImg.file && existingImg.file.size === newImg.file.size && existingImg.name === newImg.name)
            )
        );

        setGalleryImagesState(prev => [...prev, ...uniqueNewImages]);
        setMessage(`✅ Added ${uniqueNewImages.length} new gallery image(s).`);
        e.target.value = null;
    };

    const handleColorChangeOnImage = (id, newColor) => {
        // Check if it's the main image
        if (mainImageState && mainImageState.id === id) {
            setMainImageState(prev => ({
                ...prev,
                color: newColor
            }));
        } else {
            // Check gallery images
            setGalleryImagesState(prev =>
                prev.map(img =>
                    img.id === id ? { ...img, color: newColor } : img
                )
            );
        }
    };


    const removeMainImage = () => {
        if (mainImageState) {
            // If it's an existing file, mark its path for deletion in Storage
            if (mainImageState.isExisting && mainImageState.path) {
                setImagesToDelete(prev => [...prev, mainImageState.path]);
            }
            // Clean up the object URL if it was a new file
            if (mainImageState.url && !mainImageState.isExisting) URL.revokeObjectURL(mainImageState.url);
        }

        setMainImageState(null);
        if (document.getElementById("mainImageFile")) document.getElementById("mainImageFile").value = "";
        setMessage("✅ Main Image removed.");
    };

    const removeGalleryImage = (idToRemove) => {
        const imageObject = galleryImagesState.find(p => p.id === idToRemove);
        if (imageObject) {
            // If it's an existing file, mark its path for deletion in Storage
            if (imageObject.isExisting && imageObject.path) {
                setImagesToDelete(prev => [...prev, imageObject.path]);
            }
            // Clean up the object URL if it was a new file
            if (imageObject.url && !imageObject.isExisting) URL.revokeObjectURL(imageObject.url);
        }

        setGalleryImagesState(prevFiles => prevFiles.filter(p => p.id !== idToRemove));
        setMessage("✅ Gallery image removed.");
    };

    // --- VIDEO MANAGEMENT LOGIC (NEW) ---
    const handleVideoChange = (e) => {
        const file = e.target.files ? e.target.files[0] : null;
        if (file) {
            // If an existing video is being replaced, mark it for deletion
            if (videoFileState && videoFileState.isExisting && videoFileState.path) {
                setImagesToDelete(prev => [...prev, videoFileState.path]);
            }
            // Clear the local URL of the old object if it was a file
            if (videoFileState && videoFileState.url && !videoFileState.isExisting) URL.revokeObjectURL(videoFileState.url);

            setVideoFileState({
                file: file,
                url: URL.createObjectURL(file), 
                name: file.name,
                id: `video-${Date.now()}`,
                isExisting: false, // It's a new file
            });
            setMessage(`✅ Product Video selected: ${file.name}.`); 
        } else {
            setVideoFileState(null); 
        }
        e.target.value = null; 
    };

    const removeVideo = () => {
        if (videoFileState) {
            // If it's an existing file, mark its path for deletion in Storage
            if (videoFileState.isExisting && videoFileState.path) {
                setImagesToDelete(prev => [...prev, videoFileState.path]);
            }
            // Clean up the object URL if it was a new file
            if (videoFileState.url && !videoFileState.isExisting) URL.revokeObjectURL(videoFileState.url);
        }

        setVideoFileState(null);
        if (document.getElementById("videoFile")) document.getElementById("videoFile").value = "";
        setMessage("✅ Product Video removed.");
    };
    // --- END: VIDEO MANAGEMENT LOGIC


    // 👇 MODAL HANDLER (UNMODIFIED)
    const handleModalClose = useCallback((shouldNavigate) => {
        setShowSuccessModal(false);
        setMessage(''); // Clear any lingering messages
        if (shouldNavigate) {
            navigate('/products'); // Navigate to the product list or wherever is appropriate
        }
    }, [navigate]);


    // --- SUBMIT/UPDATE HANDLER (UPDATED) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        setLoading(true);

        try {
            // --- 1. CLEAN UP DELETED ASSETS (IMAGES & VIDEOS) FROM STORAGE ---
            await Promise.all(imagesToDelete.map(async (path) => {
                try {
                    const storageRef = ref(storage, path);
                    await deleteObject(storageRef);
                    console.log(`Deleted old asset from storage: ${path}`);
                } catch (error) {
                    console.warn(`Could not delete old asset (path: ${path}). It might not exist or permissions are wrong.`, error);
                }
            }));


            // --- 2. UPLOAD NEW ASSETS & COLLECT ALL DATA ---
            let imageUrls = [];
            let mainDownloadURL = '';
            let videoDownloadURL = '';
            let videoStoragePath = '';


            // A. Handle Main Image (New Upload or Existing URL)
            if (mainImageState) {
                if (mainImageState.isExisting) {
                    mainDownloadURL = mainImageState.url;
                    imageUrls.push({
                        url: mainImageState.url,
                        name: mainImageState.name,
                        path: mainImageState.path,
                        type: 'url',
                        isMain: true,
                        color: mainImageState.color,
                    });
                } else if (mainImageState.file) {
                    const mainFile = mainImageState.file;
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
                        color: mainImageState.color,
                    });
                }
            }

            // B. Handle Gallery Images (New Uploads or Existing URLs)
            for (const imageObject of galleryImagesState) {
                if (imageObject.isExisting) {
                    imageUrls.push({
                        url: imageObject.url,
                        name: imageObject.name,
                        path: imageObject.path,
                        type: 'url',
                        isMain: false,
                        color: imageObject.color,
                    });
                } else if (imageObject.file) {
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
                        color: imageObject.color,
                    });
                }
            }

            // C. Handle Product Video (New Upload or Existing URL)
            if (videoFileState) {
                if (videoFileState.isExisting) {
                    // Existing Video - use current details
                    videoDownloadURL = videoFileState.url;
                    videoStoragePath = videoFileState.path;
                } else if (videoFileState.file) {
                    // New Video - upload
                    const file = videoFileState.file;
                    videoStoragePath = `products/${Date.now()}_video_${file.name}`;
                    const storageRef = ref(storage, videoStoragePath);
                    await uploadBytes(storageRef, file);
                    videoDownloadURL = await getDownloadURL(storageRef);
                }
            }


            // --- 3. PREPARE DATA FOR FIRESTORE UPDATE ---
            const selectedCategory = categoriesList.find(cat => cat.id === productData.category);
            const selectedSubCategory = subcategoriesList.find(sub => sub.id === productData.subCategory);

            const tempProductForKeywords = {
                ...productData,
                category: {
                    id: productData.category || '',
                    name: selectedCategory ? selectedCategory.name : 'Unknown',
                },
                subCategory: productData.subCategory ? {
                    id: productData.subCategory,
                    name: selectedSubCategory ? selectedSubCategory.name : 'N/A',
                } : null,
            };

            const productToUpdate = {
                name: productData.name || '',
                description: productData.description || '',
                sku: productData.sku || '',
                hsnCode: productData.hsnCode || '',
                brand: productData.brand || '',
                category: tempProductForKeywords.category,
                subCategory: tempProductForKeywords.subCategory,
                sellerId: productData.sellerId || '',
                productTag: productData.productTag || '',
                variants: productData.variants,

                imageUrls: imageUrls,
                mainImageUrl: mainDownloadURL,
                videoUrl: videoDownloadURL || null, // 👈 ADDED VIDEO URL
                videoPath: videoStoragePath || null, // 👈 ADDED VIDEO PATH

                searchKeywords: generateSearchKeywords(tempProductForKeywords),
                updatedAt: new Date(),
            };

            // --- 4. UPDATE FIRESTORE DOCUMENT ---
            const docRef = doc(db, "products", productId);
            await updateDoc(docRef, productToUpdate);

            // --- 5. CLEANUP AND SUCCESS ---
            setImagesToDelete([]); // Clear deletion queue after successful cleanup and update
            // Re-sync video state to show it as existing
            if (videoFileState && !videoFileState.isExisting) {
                setVideoFileState(prev => ({
                    ...prev,
                    isExisting: true,
                    url: videoDownloadURL,
                    path: videoStoragePath,
                }));
            }
            setShowSuccessModal(true); // 👇 TRIGGER THE MODAL HERE

        } catch (error) {
            console.error("Firebase submission error:", error);
            setMessage(`❌ Failed to update product: ${error.message}. Please check your Firebase rules and permissions (Storage and Firestore).`);
        } finally {
            setLoading(false);
        }
    };


    const isFormDisabled = loading || loadingData;
    const isSuccess = message.startsWith("✅");
    const messageClass = isSuccess
        ? "bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 text-green-700"
        : "bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 text-red-700";

    const allImages = [
        ...(mainImageState ? [{ ...mainImageState, isMain: true }] : []),
        ...galleryImagesState.map(img => ({ ...img, isMain: false }))
    ];


    // =======================================================================
    // JSX RENDERING 
    // =======================================================================

    if (loadingData && !message) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <FiRefreshCw className="w-8 h-8 text-blue-600 animate-spin mr-3" />
                <span className="text-xl font-medium text-gray-700">Loading product details...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-yellow-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">

                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-gray-900 flex items-center justify-center space-x-3">
                        <FiEdit className="w-8 h-8 text-yellow-600" />
                        <span>Edit Product: {productData.name || productId}</span>
                    </h1>
                    <p className="text-gray-500 mt-2">Modify the details, variants, and images for this product listing (ID: {productId}).</p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

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
                                <FiPackage className="w-6 h-6 mr-3 text-yellow-600" />
                                Basic Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <input
                                    type="text"
                                    name="name"
                                    value={productData.name}
                                    onChange={handleChange}
                                    placeholder="Product Name"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all duration-200 text-lg"
                                    disabled={isFormDisabled}
                                />
                                <div className="relative">
                                    <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        name="sellerId"
                                        value={productData.sellerId}
                                        onChange={handleChange}
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

                        {/* CATEGORY SELECTION */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                                <FiLayers className="w-6 h-6 mr-3 text-green-600" />
                                Category Selection
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                                {/* 1. Product Label Select */}
                                <div className="relative">
                                    <FiTag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                                    <select
                                        name="productTag"
                                        value={productData.productTag}
                                        onChange={handleChange}
                                        className="appearance-none w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                                        disabled={isFormDisabled}
                                    >
                                        <option value="">Select Product Label</option>
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
                                        className="appearance-none w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200"
                                        disabled={isFormDisabled || filteredCategories.length === 0}
                                    >
                                        <option value="">Select Category</option>
                                        {filteredCategories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
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
                                        {filteredSubcategories.map(subCat => (
                                            <option key={subCat.id} value={subCat.id}>{subCat.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>


                        {/* --- PRODUCT VARIANT MANAGEMENT (UNMODIFIED) --- */}
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
                                placeholder="Size"
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
                                  placeholder="Price (₹)"
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
                                placeholder="Stock"
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


                        {/* 🚨 UPDATED: MAIN MEDIA UPLOAD SECTION (INCLUDING VIDEO) */}
                        <div className="space-y-6 border p-6 rounded-xl bg-violet-50 border-violet-200">
                            <h3 className="text-xl font-semibold text-gray-800 flex items-center">
                                <FiCamera className="w-6 h-6 mr-3 text-violet-600" />
                                Product Media Management
                            </h3>

                            {availableColors.length === 0 && (
                                <div className="p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
                                    <p className="font-semibold">ℹ️ Note:</p>
                                    <p className="text-sm">Adding a **Color** to a **Product Variant** will enable the color assignment dropdown for images.</p>
                                </div>
                            )}


                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                {/* 1. Main Image Control or Preview (Fixed Height: h-30) */}
                                <div className="h-30"> 
                                    {!mainImageState ? (
                                        /* Upload Input: Entire dashed area is the clickable label */
                                        <label htmlFor="mainImageFile" className="h-full border-2 border-dashed border-pink-300 rounded-xl p-4 text-center hover:border-pink-500 transition-colors duration-200 bg-white flex flex-col justify-center cursor-pointer">
                                            <FiUpload className="w-6 h-6 text-pink-400 mx-auto mb-2" />
                                            <span className="text-md font-medium text-gray-700 block mb-1">Upload Main Product Image</span>
                                            <p className="text-gray-500 text-xs">(Recommended)</p>
                                            <input 
                                                type="file"
                                                id="mainImageFile"
                                                accept="image/*"
                                                onChange={handleMainImageChange}
                                                className="hidden"
                                                disabled={isFormDisabled}
                                            />
                                        </label>
                                    ) : (
                                        /* Image Preview: Fixed height container, image contained inside */
                                        <div 
                                            key={mainImageState.id} 
                                            className="relative rounded-xl overflow-hidden shadow-lg border-4 border-yellow-500 h-full w-full bg-gray-50 flex items-center justify-center" 
                                        >
                                            <img
                                                src={mainImageState.url}
                                                alt={mainImageState.name}
                                                className="w-full h-full object-contain" 
                                            />
                                            
                                            {/* Top-Right: Remove Button */}
                                            <button
                                                type="button"
                                                onClick={removeMainImage}
                                                className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors z-20"
                                                title="Remove Main Image"
                                                disabled={isFormDisabled}
                                            >
                                                <FiX className="w-3 h-3" />
                                            </button>
                                            
                                            {/* Bottom-Left 'Replace/Upload' Button */}
                                            <label 
                                                htmlFor="mainImageFile" 
                                                className="absolute bottom-2 left-2 bg-blue-600 text-white p-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors z-20 cursor-pointer flex items-center space-x-1"
                                                title="Replace Image"
                                            >
                                                <FiUpload className="w-4 h-4" />
                                                <span className="text-xs font-medium hidden sm:inline">Replace</span>
                                                <input 
                                                    type="file"
                                                    id="mainImageFile"
                                                    accept="image/*"
                                                    onChange={handleMainImageChange}
                                                    className="hidden"
                                                    disabled={isFormDisabled}
                                                />
                                            </label>
                                            <span className={`absolute bottom-2 right-2 text-white text-xs font-bold px-2 py-1 rounded-lg z-10 ${mainImageState.isExisting ? 'bg-gray-600' : 'bg-pink-600'}`}>
                                                {mainImageState.isExisting ? 'OLD' : 'NEW'}
                                            </span>
                                        </div>
                                    )}
                                </div>


                                {/* 2. Video Upload Control or Preview (Fixed Height: h-30) */}
                                <div className="h-30"> 
                                    {!videoFileState ? (
                                        /* Upload Input: Entire dashed area is the clickable label */
                                        <label htmlFor="videoFile" className="h-full border-2 border-dashed border-violet-300 rounded-xl p-4 text-center hover:border-violet-500 transition-colors duration-200 bg-white flex flex-col justify-center cursor-pointer">
                                            <FiVideo className="w-6 h-6 text-violet-400 mx-auto mb-2" />
                                            <span className="text-md font-medium text-gray-700 block mb-1">Upload Product Video</span>
                                            <p className="text-gray-500 text-xs">(Max 1 file)</p>
                                            <input 
                                                type="file"
                                                id="videoFile"
                                                accept="video/*"
                                                onChange={handleVideoChange}
                                                className="hidden"
                                                disabled={isFormDisabled}
                                            />
                                        </label>
                                    ) : (
                                        /* Video Preview: Fixed height container */
                                        <div className="p-3 border-4 border-violet-500 rounded-xl bg-white flex flex-col h-full shadow-lg justify-center relative">
                                            <FiVideo className="w-6 h-6 text-violet-600 flex-shrink-0 mx-auto mb-1" />
                                            <p className="font-semibold text-gray-800 truncate text-center text-sm" title={videoFileState.name}>{videoFileState.name}</p>
                                            <p className="text-xs text-gray-500 text-center">Video Ready ({videoFileState.isExisting ? 'OLD' : 'NEW'})</p>
                                            
                                            {/* Top-Right: Remove Button */}
                                            <button
                                                type="button"
                                                onClick={removeVideo}
                                                className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md hover:bg-red-600 transition-colors z-20"
                                                disabled={isFormDisabled}
                                                title="Remove Video"
                                            >
                                                <FiX className="w-3 h-3" />
                                            </button>
                                            
                                            {/* Bottom-Left 'Replace/Upload' Button for Video */}
                                            <label 
                                                htmlFor="videoFile" 
                                                className="absolute bottom-2 left-2 bg-blue-600 text-white p-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors z-20 cursor-pointer flex items-center space-x-1"
                                                title="Replace Video"
                                            >
                                                <FiUpload className="w-4 h-4" />
                                                <span className="text-xs font-medium hidden sm:inline">Replace</span>
                                                <input 
                                                    type="file"
                                                    id="videoFile"
                                                    accept="video/*"
                                                    onChange={handleVideoChange}
                                                    className="hidden"
                                                    disabled={isFormDisabled}
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>
                          </div>


                        {/* --- GALLERY IMAGE UPLOAD & PREVIEWS (MODIFIED to remove duplicate controls) --- */}
                        <div className="space-y-6 border p-6 rounded-xl bg-pink-50 border-pink-200">
                            
                            {/* Gallery Images Control (Add More Button) */}
                            <label htmlFor="galleryImages" className="cursor-pointer text-blue-600 hover:text-blue-800 text-lg font-bold flex items-center space-x-2 justify-center border-2 border-dashed border-blue-300 rounded-xl p-4 bg-white hover:border-blue-500 transition-colors duration-200">
                                <FiPlus className="w-5 h-5" /> 
                                <span>Add New Gallery Images ({galleryImagesState.length} current)</span>
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


                            {/* Image Previews with Dropdown Color Assignment */}
                            {galleryImagesState.length > 0 && (
                                <div className="mt-4 p-4 border border-gray-300 rounded-lg bg-white">
                                    <p className="text-sm font-bold text-gray-700 mb-3">Gallery Image Previews ({galleryImagesState.length}):</p>
                                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                                        {galleryImagesState.map((image) => (
                                            <div
                                                key={image.id}
                                                className={`relative rounded-lg overflow-hidden shadow-md group border-2 ${image.color ? 'border-green-500' : 'border-gray-300'} ${!image.isExisting ? 'ring-2 ring-pink-300' : ''}`}
                                            >
                                                <img
                                                    src={image.url}
                                                    alt={image.name}
                                                    className="w-full h-20 object-cover"
                                                />

                                                <span className={`absolute top-0 left-0 text-white text-xs font-bold px-2 py-1 rounded-br-lg z-10 ${image.isExisting ? 'bg-gray-600' : 'bg-pink-600'}`}>
                                                    {image.isExisting ? 'OLD' : 'NEW'}
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() => removeGalleryImage(image.id)}
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

                        {/* SUBMIT BUTTON */}
                        <button
                          type="submit"
                          disabled={isFormDisabled}
                          className="w-full py-4 px-6 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white rounded-xl shadow-lg font-semibold text-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-3"
                        >
                          {loading ? (
                            <>
                              <FiRefreshCw className="w-5 h-5 animate-spin" />
                              <span>Processing & Updating...</span>
                            </>
                          ) : (
                            <>
                              <FiSave className="w-6 h-6" />
                              <span>Update Product Details</span>
                            </>
                          )}
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/products')}
                            className="w-full py-2 px-6 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors disabled:opacity-50"
                            disabled={isFormDisabled}
                        >
                            Cancel / Go Back
                        </button>

                    </form>
                </div>
            </div>

            {/* 👇 MODAL RENDERING */}
            {showSuccessModal && (
                <ProductUpdateSuccessModal
                    productData={productData}
                    productId={productId}
                    onClose={handleModalClose}
                />
            )}


        </div>
    );
  };

  export default EditProductPage;