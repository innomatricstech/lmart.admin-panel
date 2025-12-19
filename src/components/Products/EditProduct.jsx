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
  FiVideo,
  FiImage,
  FiGrid,
  FiInfo,
  FiAlertCircle,
  FiBox
} from 'react-icons/fi';

import { db, storage } from "../../../firerbase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import ProductUpdateSuccessModal from './ProductUpdateSuccessModal';

const normalizeFetchedImages = (data) => {
  // BULK UPLOAD CASE (array of strings)
  if (Array.isArray(data.imageUrls) && typeof data.imageUrls[0] === "string") {
    return data.imageUrls.map((url, index) => ({
      url,
      name: `bulk-image-${index}`,
      path: "",
      color: "",
      isMain: index === 0,   // first image = main
      isExisting: true,
    }));
  }

  // MANUAL UPLOAD CASE (already objects)
  if (Array.isArray(data.imageUrls) && typeof data.imageUrls[0] === "object") {
    return data.imageUrls;
  }

  // FALLBACK
  if (data.mainImageUrl) {
    return [{
      url: data.mainImageUrl,
      name: "main-image",
      path: "",
      color: "",
      isMain: true,
      isExisting: true,
    }];
  }

  return [];
};

// *** REUSABLE KEYWORD GENERATION FUNCTION ***
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
  const lowerField = String(field || '').toLowerCase().trim();
  if (lowerField) {
    keywords.add(lowerField);
    for (let i = 1; i <= Math.min(lowerField.length, 5); i++) {
      keywords.add(lowerField.substring(0, i));
    }
  }
});


  if (product.category.name) keywords.add(product.category.name.toLowerCase());
  if (product.subCategory && product.subCategory.name) keywords.add(product.subCategory.name.toLowerCase());

  const uniqueColors = new Set(product.variants.map(v => v.color).filter(Boolean));
  const uniqueSizes = new Set(product.variants.map(v => v.size).filter(Boolean));
  
  uniqueColors.forEach(color => keywords.add(color.toLowerCase()));
  uniqueSizes.forEach(size => keywords.add(size.toLowerCase()));
  
  if (product.productTag) keywords.add(product.productTag.toLowerCase());

  return Array.from(keywords).filter(k => k.length > 0 && k.length <= 50);
};

// *** NORMALIZE IMAGES FUNCTION ***
const normalizeImages = (imageUrls, mainImageUrl) => {
  if (Array.isArray(imageUrls) && imageUrls.length > 0) {
    return imageUrls;
  }

  if (mainImageUrl) {
    return [{
      url: mainImageUrl,
      isMain: true,
      color: "",
      name: "main-image",
      path: "",
      isExisting: true,
    }];
  }

  return [];
};

const PRODUCT_TAG_OPTIONS = [
  { value: '', label: 'Select Product Label', icon: <FiTag /> },
  { value: 'E-Store', label: 'E-Store', icon: <FiZap /> },
  { value: 'Local Market', label: 'Local Market', icon: <FiBox /> },
  { value: 'Printing', label: 'Printing', icon: <FiImage /> },
];

const EditProductPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();

  // State for fetched data
  const [categoriesList, setCategoriesList] = useState([]);
  const [subcategoriesList, setSubcategoriesList] = useState([]);

  // Form data state
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

  // Variant management state
  const [newVariant, setNewVariant] = useState({
    color: '',
    size: '',
    price: '',
    offerPrice: '',
    stock: '',
  });

  // Image & Video management state
  const [mainImageFile, setMainImageFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [imagesToDelete, setImagesToDelete] = useState([]);
  const [videoToDelete, setVideoToDelete] = useState(null);

  // Other utility states
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [message, setMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');

  // Calculate filtered categories/subcategories
  const filteredCategories = categoriesList.filter(cat => 
    !productData.productTag || (cat.label && cat.label.toLowerCase() === productData.productTag.toLowerCase())
  );

  const filteredSubcategories = subcategoriesList
    .filter(sub => 
      !productData.productTag || (sub.label && sub.label.toLowerCase() === productData.productTag.toLowerCase())
    )
    .filter(sub => !productData.category || sub.categoryId === productData.category);

  // Function to create image object
  const createImageObject = (imgData, isMain = false, isExisting = true) => {
    return {
      url: imgData.url,
      name: imgData.name || (isMain ? 'main-image' : 'gallery-image'),
      path: imgData.path || '',
      color: imgData.color || '',
      id: imgData.path ? `img-${imgData.path}` : `img-${Date.now()}-${Math.random()}`,
      isExisting: isExisting,
      isMain: isMain,
      // Add file property only for new uploads
      file: isExisting ? undefined : imgData.file
    };
  };

  // Fetch product data
  useEffect(() => {
    const fetchProductData = async () => {
      setLoadingData(true);
      try {
        // Fetch categories and subcategories
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

        // Fetch product data
        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

          // Set product data
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

          // Handle images - matching AddProductPage structure
          const fetchedImages = normalizeFetchedImages(data);

          console.log("Fetched images from DB:", fetchedImages);
          
          // Find main image 
        const mainImage = fetchedImages.find(img => img.isMain) || fetchedImages[0];
const galleryImages = fetchedImages.filter(img => !img.isMain);

if (mainImage?.url) {
  setMainImageFile(createImageObject(mainImage, true, true));
}

if (galleryImages.length > 0) {
  setGalleryFiles(
    galleryImages.map(img => createImageObject(img, false, true))
  );
}

          // Set video (if exists)
          if (data.videoUrl) {
            setVideoFile({
              url: data.videoUrl,
              name: data.videoUrl.split('/').pop().split('?')[0] || 'product-video',
              path: data.videoPath || '',
              id: `video-${data.videoPath || Date.now()}`,
              isExisting: true,
            });
          }

        } else {
          setMessage("❌ No such product found.");
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setMessage("❌ Failed to load product data.");
      }
      setLoadingData(false);
    };
    fetchProductData();
  }, [productId]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      // Cleanup function to revoke object URLs
      if (mainImageFile && mainImageFile.url && !mainImageFile.isExisting) {
        URL.revokeObjectURL(mainImageFile.url);
      }
      
      galleryFiles.forEach(img => {
        if (img.url && !img.isExisting) {
          URL.revokeObjectURL(img.url);
        }
      });
      
      if (videoFile && videoFile.url && !videoFile.isExisting) {
        URL.revokeObjectURL(videoFile.url);
      }
    };
  }, [mainImageFile, galleryFiles, videoFile]);

  // Product & category change handler
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

  // Variant handlers
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

  const handleVariantEdit = (variantId, field, value) => {
    setProductData(prev => ({
      ...prev,
      variants: prev.variants.map(v =>
        v.variantId === variantId ? { ...v, [field]: value } : v
      )
    }));
  };

  const removeVariant = (variantId) => {
    setProductData(prev => ({
      ...prev,
      variants: prev.variants.filter(v => v.variantId !== variantId),
    }));
    setMessage("✅ Variant removed.");
  };

  const availableColors = Array.from(new Set(productData.variants.map(v => v.color))).filter(c => c.trim() !== '' && c.trim() !== 'N/A');

  // Image management logic
  const handleMainImageChange = (e) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      // Revoke old URL if replacing
      if (mainImageFile && mainImageFile.url && !mainImageFile.isExisting) {
        URL.revokeObjectURL(mainImageFile.url);
      }
      
      // Mark existing image for deletion if it exists
      if (mainImageFile && mainImageFile.isExisting && mainImageFile.path) {
        setImagesToDelete(prev => [...prev, mainImageFile.path]);
      }

      const previewUrl = URL.createObjectURL(file);
      console.log("Main image preview URL created:", previewUrl);
      
      setMainImageFile({
        file: file,
        url: previewUrl,
        name: file.name,
        color: '',
        id: `main-${Date.now()}`,
        isExisting: false,
        isMain: true,
      });
      setMessage(`✅ Main Image uploaded: ${file.name}.`);
    } else {
      setMainImageFile(null);
    }
    e.target.value = null;
  };

  // FIXED: Bulk upload gallery images handler
  const handleGalleryImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;
    
    console.log("Selected gallery files:", files.length);
    
    const newImages = files.map(file => {
      // Generate a preview URL for the file
      const previewUrl = URL.createObjectURL(file);
      console.log(`Created preview URL for ${file.name}:`, previewUrl);
      
      return {
        file: file,
        url: previewUrl,
        color: '',
        name: file.name,
        id: `gallery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        isExisting: false,
        isMain: false,
      };
    });

    // Filter out duplicates by file name
    const uniqueNewImages = newImages.filter(newImg => {
      return !galleryFiles.some(existingImg => 
        existingImg.name === newImg.name && 
        existingImg.isExisting === false
      );
    });

    if (uniqueNewImages.length > 0) {
      setGalleryFiles(prev => [...prev, ...uniqueNewImages]);
      setMessage(`✅ Added ${uniqueNewImages.length} gallery image(s).`);
      console.log("Added gallery images:", uniqueNewImages);
    } else {
      setMessage("⚠️ Some images were duplicates and not added.");
    }
    
    // Reset the file input
    e.target.value = null;
  };

  const handleColorChangeOnImage = (id, newColor) => {
    // Check if it's main image
    if (mainImageFile && mainImageFile.id === id) {
      setMainImageFile(prev => ({ ...prev, color: newColor }));
    } else {
      // It's a gallery image
      setGalleryFiles(prev => 
        prev.map(img => 
          img.id === id ? { ...img, color: newColor } : img
        )
      );
    }
  };

  const removeMainImage = () => {
    if (mainImageFile) {
      // Mark for deletion if it's an existing image
      if (mainImageFile.isExisting && mainImageFile.path) {
        setImagesToDelete(prev => [...prev, mainImageFile.path]);
      }
      
      // Revoke object URL if it's a new file
      if (mainImageFile.url && !mainImageFile.isExisting) {
        URL.revokeObjectURL(mainImageFile.url);
      }
      
      setMainImageFile(null);
    }
    if (document.getElementById("mainImageFile")) {
      document.getElementById("mainImageFile").value = "";
    }
    setMessage("✅ Main Image removed.");
  };

  const removeGalleryImage = (idToRemove) => {
    const imageObject = galleryFiles.find(p => p.id === idToRemove);
    if (imageObject) {
      console.log("Removing gallery image:", imageObject);
      
      // Mark for deletion if it's an existing image
      if (imageObject.isExisting && imageObject.path) {
        setImagesToDelete(prev => [...prev, imageObject.path]);
      }
      
      // Revoke object URL if it's a new file
      if (imageObject.url && !imageObject.isExisting) {
        URL.revokeObjectURL(imageObject.url);
      }
      
      setGalleryFiles(prevFiles => prevFiles.filter(p => p.id !== idToRemove));
      setMessage("✅ Gallery image removed.");
    }
  };

  // Video management logic
  const handleVideoChange = (e) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      // Revoke old URL if replacing
      if (videoFile && videoFile.url && !videoFile.isExisting) {
        URL.revokeObjectURL(videoFile.url);
      }
      
      // Mark existing video for deletion
      if (videoFile && videoFile.isExisting && videoFile.path) {
        setVideoToDelete(videoFile.path);
      }

      setVideoFile({
        file: file,
        url: URL.createObjectURL(file),
        name: file.name,
        id: `video-${Date.now()}`,
        isExisting: false,
      });
      setMessage(`✅ Product Video uploaded: ${file.name}.`);
    } else {
      setVideoFile(null);
    }
    e.target.value = null;
  };

  const removeVideo = () => {
    if (videoFile) {
      // Mark for deletion if it's an existing video
      if (videoFile.isExisting && videoFile.path) {
        setVideoToDelete(videoFile.path);
      }
      
      // Revoke object URL if it's a new file
      if (videoFile.url && !videoFile.isExisting) {
        URL.revokeObjectURL(videoFile.url);
      }
      
      setVideoFile(null);
    }
    if (document.getElementById("videoFile")) {
      document.getElementById("videoFile").value = "";
    }
    setMessage("✅ Product Video removed.");
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      // 1. Delete old images/videos marked for removal
      const deletePromises = [];
      
      // Delete old images
      imagesToDelete.forEach(path => {
        if (path) {
          deletePromises.push(deleteObject(ref(storage, path)).catch(err => {
            console.warn("Failed to delete image:", err);
          }));
        }
      });
      
      // Delete old video
      if (videoToDelete) {
        deletePromises.push(deleteObject(ref(storage, videoToDelete)).catch(err => {
          console.warn("Failed to delete video:", err);
        }));
      }
      
      await Promise.all(deletePromises);

      // 2. Upload new main image if it exists and is new
      let mainDownloadURL = mainImageFile?.isExisting ? mainImageFile.url : null;
      let mainImagePath = mainImageFile?.isExisting ? mainImageFile.path : null;
      
      if (mainImageFile && !mainImageFile.isExisting) {
        const mainFile = mainImageFile.file;
        const mainFileName = `products/${Date.now()}_main_${mainFile.name.replace(/\s+/g, "_")}`;
        const mainStorageRef = ref(storage, mainFileName);
        await uploadBytes(mainStorageRef, mainFile);
        mainDownloadURL = await getDownloadURL(mainStorageRef);
        mainImagePath = mainFileName;
      }

      // 3. Upload new gallery images
      let imageUrls = [];
      
      // Add main image to imageUrls array
      if (mainImageFile) {
        const mainImageObject = {
          url: mainDownloadURL || mainImageFile.url,
          name: mainImageFile.name,
          path: mainImagePath || mainImageFile.path,
          type: 'file',
          isMain: true,
          color: mainImageFile.color || '',
        };
        imageUrls.push(mainImageObject);
      }

      // Upload and add gallery images
      for (const imageObject of galleryFiles) {
        if (!imageObject.isExisting) {
          // Upload new gallery image
          const galleryFile = imageObject.file;
          const galleryFileName = `products/${Date.now()}_gallery_${galleryFile.name.replace(/\s+/g, "_")}`;
          const galleryStorageRef = ref(storage, galleryFileName);
          await uploadBytes(galleryStorageRef, galleryFile);
          const galleryDownloadURL = await getDownloadURL(galleryStorageRef);

          imageUrls.push({
            url: galleryDownloadURL,
            name: galleryFile.name,
            path: galleryFileName,
            type: "file",
            isMain: false,
            color: imageObject.color || "",
          });
        } else {
          // Keep existing gallery image
          imageUrls.push({
            url: imageObject.url,
            name: imageObject.name,
            path: imageObject.path,
            type: 'file',
            isMain: false,
            color: imageObject.color || "",
          });
        }
      }

      // 4. Upload new video if exists
      let videoDownloadURL = videoFile?.isExisting ? videoFile.url : null;
      let videoStoragePath = videoFile?.isExisting ? videoFile.path : null;
      
      if (videoFile && !videoFile.isExisting) {
        const file = videoFile.file;
        const fileName = `products/${Date.now()}_video_${file.name.replace(/\s+/g, "_")}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, file);
        videoDownloadURL = await getDownloadURL(storageRef);
        videoStoragePath = fileName;
      }

      // 5. Prepare data for Firestore
      const selectedCategory = categoriesList.find(cat => cat.id === productData.category);
      const selectedSubCategory = subcategoriesList.find(sub => sub.id === productData.subCategory);

      const finalMainImage = mainDownloadURL || 
                           imageUrls.find(img => img.isMain)?.url || 
                           imageUrls[0]?.url || 
                           null;

      const normalizedImages = normalizeImages(imageUrls, finalMainImage);

 const productToUpdate = {
  name: productData.name,
  description: productData.description,
  sku: productData.sku,
  hsnCode: productData.hsnCode,   // ✅ FIXED
  brand: productData.brand,

  category: selectedCategory
    ? { id: selectedCategory.id, name: selectedCategory.name }
    : null,

  subCategory: selectedSubCategory
    ? { id: selectedSubCategory.id, name: selectedSubCategory.name }
    : null,

  sellerId: productData.sellerId || "Admin",
  productTag: productData.productTag,

  mainImageUrl: finalMainImage || null,
  imageUrls: normalizedImages,

  videoUrl: videoDownloadURL || null,
  videoPath: videoStoragePath || null,

  variants: productData.variants || [],

  imageStatus: "completed",
  status: "Active",

  searchKeywords: generateSearchKeywords({
    ...productData,
    category: { name: selectedCategory?.name || "" },
    subCategory: selectedSubCategory
      ? { name: selectedSubCategory.name }
      : null,
  }),

  updatedAt: serverTimestamp(),
};


      console.log("Updating product with data:", productToUpdate);

      // 6. Update in Firestore
      await updateDoc(doc(db, "products", productId), productToUpdate);

      // 7. Success
      setShowSuccessModal(true);
      setMessage("✅ Product updated successfully!");

    } catch (error) {
      console.error("Firebase update error:", error);
      setMessage(`❌ Failed to update product: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Modal handler
  const handleModalClose = useCallback((shouldNavigate) => {
    setShowSuccessModal(false);
    if (shouldNavigate) navigate('/products');
  }, [navigate]);

  // UI Components
  const SectionButton = ({ id, icon, label, active }) => (
    <button
      type="button"
      onClick={() => setActiveSection(id)}
      className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-300 ${active === id
          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-200'
          : 'bg-white text-gray-600 hover:bg-gray-50 hover:shadow-md'
        }`}
    >
      {icon}
      {label}
    </button>
  );

  const InputField = ({ icon, label, ...props }) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        {icon}
        {label}
      </label>
      <input
        className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
        {...props}
      />
    </div>
  );

  const SelectField = ({ icon, label, children, ...props }) => (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        {icon}
        {label}
      </label>
      <select
        className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300 bg-white"
        {...props}
      >
        {children}
      </select>
    </div>
  );

  const isFormDisabled = loading || loadingData;

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <FiRefreshCw className="animate-spin text-4xl text-orange-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading product data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <FiEdit className="text-orange-500" />
              Edit Product
            </h1>
            <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-full shadow-sm">
              Product ID: <span className="font-mono text-orange-600">{productId}</span>
            </div>
          </div>
          <p className="text-gray-600">Update product details, media, and variants</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <SectionButton id="basic" icon={<FiPackage />} label="Basic Info" active={activeSection} />
          <SectionButton id="details" icon={<FiInfo />} label="Details" active={activeSection} />
          <SectionButton id="variants" icon={<FiDroplet />} label="Variants" active={activeSection} />
          <SectionButton id="media" icon={<FiCamera />} label="Media" active={activeSection} />
          <SectionButton id="categories" icon={<FiLayers />} label="Categories" active={activeSection} />
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center ${
            message.startsWith('✅') 
              ? 'bg-green-50 border-l-4 border-green-500 text-green-700'
              : 'bg-red-50 border-l-4 border-red-500 text-red-700'
          }`}>
            {message.startsWith('✅') ? <FiCheck className="mr-3" /> : <FiAlertCircle className="mr-3" />}
            <p>{message}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {/* Basic Info Section */}
            {(activeSection === 'basic' || activeSection === 'all') && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-gradient-to-b from-orange-400 to-amber-400 rounded-full"></div>
                  <h2 className="text-xl font-bold text-gray-800">Basic Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <InputField
                    icon={<FiPackage className="text-orange-500" />}
                    label="Product Name"
                    name="name"
                    value={productData.name}
                    onChange={handleChange}
                    placeholder="Enter product name"
                    required
                    disabled={isFormDisabled}
                  />
                  <InputField
                    icon={<FiUser className="text-orange-500" />}
                    label="Seller ID"
                    name="sellerId"
                    value={productData.sellerId}
                    onChange={handleChange}
                    placeholder="Enter seller ID"
                    disabled={isFormDisabled}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <FiFileText className="text-orange-500" />
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={productData.description}
                    onChange={handleChange}
                    placeholder="Enter detailed product description"
                    rows="4"
                    className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                    disabled={isFormDisabled}
                  />
                </div>
              </div>
            )}

            {/* Details Section */}
            {(activeSection === 'details' || activeSection === 'all') && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-cyan-400 rounded-full"></div>
                  <h2 className="text-xl font-bold text-gray-800">Product Details</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <InputField
                    icon={<FiTag className="text-blue-500" />}
                    label="SKU"
                    name="sku"
                    value={productData.sku}
                    onChange={handleChange}
                    placeholder="Enter SKU"
                    disabled={isFormDisabled}
                  />
                  <InputField
                    icon={<FiTag className="text-blue-500" />}
                    label="Brand"
                    name="brand"
                    value={productData.brand}
                    onChange={handleChange}
                    placeholder="Enter brand"
                    disabled={isFormDisabled}
                  />
                  <InputField
                    icon={<FiTag className="text-blue-500" />}
                    label="HSN Code"
                    name="hsnCode"
                    value={productData.hsnCode}
                    onChange={handleChange}
                    placeholder="Enter HSN code"
                    disabled={isFormDisabled}
                  />
                </div>
              </div>
            )}

            {/* Categories Section */}
            {(activeSection === 'categories' || activeSection === 'all') && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-gradient-to-b from-green-400 to-emerald-400 rounded-full"></div>
                  <h2 className="text-xl font-bold text-gray-800">Categories & Label</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <SelectField
                    icon={<FiTag className="text-green-500" />}
                    label="Product Label"
                    name="productTag"
                    value={productData.productTag}
                    onChange={handleChange}
                    disabled={isFormDisabled}
                  >
                    {PRODUCT_TAG_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    icon={<FiLayers className="text-green-500" />}
                    label="Category"
                    name="category"
                    value={productData.category}
                    onChange={handleChange}
                    disabled={isFormDisabled || filteredCategories.length === 0}
                  >
                    <option value="">Select Category</option>
                    {filteredCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </SelectField>

                  <SelectField
                    icon={<FiGrid className="text-green-500" />}
                    label="Subcategory"
                    name="subCategory"
                    value={productData.subCategory}
                    onChange={handleChange}
                    disabled={isFormDisabled || !productData.category}
                  >
                    <option value="">Select Subcategory</option>
                    {filteredSubcategories.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </SelectField>
                </div>
              </div>
            )}

            {/* Variants Section */}
            {(activeSection === 'variants' || activeSection === 'all') && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full"></div>
                    <h2 className="text-xl font-bold text-gray-800">Product Variants</h2>
                  </div>
                  <div className="text-sm text-gray-500 bg-purple-50 px-3 py-1 rounded-full">
                    {productData.variants.length} variants
                  </div>
                </div>

                {/* Add New Variant */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-100">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FiPlus className="text-purple-500" />
                    Add New Variant
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
                    <input
                      placeholder="Color"
                      value={newVariant.color}
                      onChange={handleNewVariantChange}
                      name="color"
                      className="border border-purple-200 bg-white p-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={isFormDisabled}
                    />
                    <input
                      placeholder="Size"
                      value={newVariant.size}
                      onChange={handleNewVariantChange}
                      name="size"
                      className="border border-purple-200 bg-white p-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={isFormDisabled}
                    />
                    <input
                      placeholder="Price"
                      type="number"
                      value={newVariant.price}
                      onChange={handleNewVariantChange}
                      name="price"
                      className="border border-purple-200 bg-white p-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={isFormDisabled}
                    />
                    <input
                      placeholder="Offer Price"
                      type="number"
                      value={newVariant.offerPrice}
                      onChange={handleNewVariantChange}
                      name="offerPrice"
                      className="border border-purple-200 bg-white p-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={isFormDisabled}
                    />
                    <input
                      placeholder="Stock"
                      type="number"
                      value={newVariant.stock}
                      onChange={handleNewVariantChange}
                      name="stock"
                      className="border border-purple-200 bg-white p-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={isFormDisabled}
                    />
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isFormDisabled}
                    >
                      <FiPlus className="text-lg" />
                      Add
                    </button>
                  </div>
                </div>

                {/* Variants List */}
                {productData.variants.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="grid grid-cols-6 gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 text-sm font-medium text-gray-700">
                      <div>Color</div>
                      <div>Size</div>
                      <div>Price</div>
                      <div>Offer</div>
                      <div>Stock</div>
                      <div>Actions</div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {productData.variants.map((v, index) => (
                        <div
                          key={v.variantId}
                          className={`grid grid-cols-6 gap-4 p-4 items-center border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            } hover:bg-gray-50 transition-colors duration-200`}
                        >
                          <input
                            value={v.color}
                            onChange={(e) => handleVariantEdit(v.variantId, 'color', e.target.value)}
                            className="border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-200 p-2 rounded"
                            disabled={isFormDisabled}
                          />
                          <input
                            value={v.size}
                            onChange={(e) => handleVariantEdit(v.variantId, 'size', e.target.value)}
                            className="border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-200 p-2 rounded"
                            disabled={isFormDisabled}
                          />
                          <input
                            type="number"
                            value={v.price}
                            onChange={(e) => handleVariantEdit(v.variantId, 'price', e.target.value)}
                            className="border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-200 p-2 rounded"
                            disabled={isFormDisabled}
                          />
                          <input
                            type="number"
                            value={v.offerPrice || ''}
                            onChange={(e) => handleVariantEdit(v.variantId, 'offerPrice', e.target.value)}
                            className="border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-200 p-2 rounded text-red-500"
                            disabled={isFormDisabled}
                          />
                          <input
                            type="number"
                            value={v.stock}
                            onChange={(e) => handleVariantEdit(v.variantId, 'stock', e.target.value)}
                            className="border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-200 p-2 rounded"
                            disabled={isFormDisabled}
                          />
                          <button
                            type="button"
                            onClick={() => removeVariant(v.variantId)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors duration-200 flex items-center justify-center disabled:opacity-50"
                            disabled={isFormDisabled}
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Media Section - FIXED GALLERY DISPLAY */}
            {(activeSection === 'media' || activeSection === 'all') && (
              <div className="space-y-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-gradient-to-b from-amber-400 to-orange-400 rounded-full"></div>
                  <h2 className="text-xl font-bold text-gray-800">Media Management</h2>
                </div>

                {/* Main Image & Video */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Main Image */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FiCamera className="text-amber-500" />
                      Main Image
                    </label>
                    <div
                      className={`border-2 ${mainImageFile
                          ? 'border-solid border-gray-200'
                          : 'border-dashed border-gray-300 hover:border-orange-400'
                        } rounded-2xl p-4 text-center transition-all duration-300 h-48 flex flex-col justify-center items-center cursor-pointer relative bg-gradient-to-br from-gray-50 to-white`}
                    >
                      {mainImageFile ? (
                        <>
                          <div className="h-32 w-full flex items-center justify-center">
                            <img
                              src={mainImageFile.url}
                              alt="Main product"
                              className="h-full w-full object-contain rounded-lg"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                const parent = e.target.parentElement;
                                parent.innerHTML = `
                                  <div class="flex flex-col items-center justify-center h-full w-full text-gray-400">
                                    <FiImage class="w-10 h-10 mb-2" />
                                    <span class="text-xs">Image not available</span>
                                  </div>
                                `;
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={removeMainImage}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors duration-200 shadow-lg disabled:opacity-50"
                            disabled={isFormDisabled}
                          >
                            <FiX />
                          </button>
                          {mainImageFile.isExisting && (
                            <span className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                              Existing
                            </span>
                          )}
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center">
                            <FiUpload className="text-2xl text-orange-500" />
                          </div>
                          <p className="text-gray-600">Click to upload main image</p>
                          <input 
                            type="file" 
                            className="hidden" 
                            onChange={handleMainImageChange} 
                            accept="image/*"
                            id="mainImageFile"
                            disabled={isFormDisabled}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Video */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FiVideo className="text-amber-500" />
                      Product Video
                    </label>
                    <div
                      className={`border-2 ${videoFile
                          ? 'border-solid border-gray-200'
                          : 'border-dashed border-gray-300 hover:border-orange-400'
                        } rounded-2xl p-4 text-center transition-all duration-300 h-48 flex flex-col justify-center items-center cursor-pointer relative bg-gradient-to-br from-gray-50 to-white`}
                    >
                      {videoFile ? (
                        <>
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mb-3">
                            <FiVideo className="text-2xl text-blue-500" />
                          </div>
                          <p className="text-sm text-gray-600 truncate max-w-full px-4">{videoFile.name}</p>
                          <button
                            type="button"
                            onClick={removeVideo}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors duration-200 shadow-lg disabled:opacity-50"
                            disabled={isFormDisabled}
                          >
                            <FiX />
                          </button>
                          {videoFile.isExisting && (
                            <span className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                              Existing
                            </span>
                          )}
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center">
                            <FiVideo className="text-2xl text-blue-500" />
                          </div>
                          <p className="text-gray-600">Click to upload video</p>
                          <input 
                            type="file" 
                            className="hidden" 
                            onChange={handleVideoChange} 
                            accept="video/*"
                            id="videoFile"
                            disabled={isFormDisabled}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                {/* Gallery Images - FIXED BULK UPLOAD DISPLAY */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FiImage className="text-amber-500" />
                      Gallery Images
                    </label>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 bg-amber-50 px-3 py-1 rounded-full">
                        {galleryFiles.length} images
                      </span>
                      {galleryFiles.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            // Clear only new images, keep existing ones
                            const existingImages = galleryFiles.filter(img => img.isExisting);
                            const newImages = galleryFiles.filter(img => !img.isExisting);
                            
                            // Revoke object URLs for new images
                            newImages.forEach(img => {
                              if (img.url) {
                                URL.revokeObjectURL(img.url);
                              }
                            });
                            
                            setGalleryFiles(existingImages);
                            setMessage("✅ All new gallery images cleared.");
                          }}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded disabled:opacity-50"
                          disabled={isFormDisabled}
                        >
                          Clear New
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Upload Area */}
                  <div className="space-y-4">
                    {/* Upload Button */}
                    <div className="relative">
                      <label className={`block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
                        isFormDisabled 
                          ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
                          : 'border-orange-300 hover:border-orange-500 bg-gradient-to-br from-orange-50 to-white hover:shadow-md'
                      }`}>
                        <div className="flex flex-col items-center gap-4">
                          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                            isFormDisabled 
                              ? 'bg-gray-200' 
                              : 'bg-gradient-to-br from-orange-100 to-amber-100 shadow-md'
                          }`}>
                            <FiUpload className={`text-3xl ${
                              isFormDisabled ? 'text-gray-400' : 'text-orange-500'
                            }`} />
                          </div>
                          <div>
                            <p className={`font-semibold text-lg mb-1 ${
                              isFormDisabled ? 'text-gray-400' : 'text-gray-800'
                            }`}>
                              {galleryFiles.length === 0 ? 'Upload Gallery Images' : 'Add More Images'}
                            </p>
                            <p className={`text-sm ${
                              isFormDisabled ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              Click to select multiple images
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              Supports: JPG, PNG, WebP
                            </p>
                          </div>
                        </div>
                        <input 
                          type="file" 
                          multiple 
                          className="hidden" 
                          onChange={handleGalleryImageChange} 
                          accept="image/*"
                          id="galleryImages"
                          disabled={isFormDisabled}
                        />
                      </label>
                    </div>

                    {/* Gallery Images Display */}
                    {galleryFiles.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <FiImage className="mr-2" />
                          Image Previews ({galleryFiles.length})
                          <span className="ml-2 text-xs text-gray-500">
                            ({galleryFiles.filter(img => img.isExisting).length} existing, 
                            {galleryFiles.filter(img => !img.isExisting).length} new)
                          </span>
                        </h3>
                        
                        {/* Existing Images */}
                        {galleryFiles.filter(img => img.isExisting).length > 0 && (
                          <div className="mb-6">
                            <h4 className="text-xs font-medium text-gray-600 mb-2 flex items-center">
                              <FiCheck className="w-3 h-3 mr-1 text-green-500" />
                              Existing Images ({galleryFiles.filter(img => img.isExisting).length})
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                              {galleryFiles
                                .filter(img => img.isExisting)
                                .map((img, index) => (
                                  <div
                                    key={img.id}
                                    className="relative bg-white rounded-xl border border-green-200 shadow-sm hover:shadow-lg transition-all duration-300 group"
                                  >
                                    {/* Image Preview */}
                                    <div className="h-32 w-full flex items-center justify-center bg-gray-50 rounded-t-xl overflow-hidden">
                                      {img.url ? (
                                        <img
                                          src={img.url}
                                          alt={`Gallery ${index + 1}: ${img.name}`}
                                          className="h-full w-full object-cover"
                                          onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.style.display = 'none';
                                            const parent = e.target.parentElement;
                                            parent.innerHTML = `
                                              <div class="flex flex-col items-center justify-center h-full w-full text-gray-400">
                                                <FiImage class="w-8 h-8 mb-1" />
                                                <span class="text-xs">Image not loading</span>
                                              </div>
                                            `;
                                          }}
                                        />
                                      ) : (
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                          <FiImage className="w-8 h-8 mb-1" />
                                          <span className="text-xs">No preview</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Image Info & Controls */}
                                    <div className="p-3 border-t border-green-100 bg-green-50">
                                      <div className="flex justify-between items-start mb-2">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                          <FiCheck className="w-3 h-3 mr-1" />
                                          Existing
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => removeGalleryImage(img.id)}
                                          className="text-red-500 hover:text-red-700 p-1"
                                          disabled={isFormDisabled}
                                          title="Remove image"
                                        >
                                          <FiTrash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                      
                                      {/* Color selector */}
                                      <div className="mb-2">
                                        <select
                                          value={img.color || ''}
                                          onChange={(e) => handleColorChangeOnImage(img.id, e.target.value)}
                                          className="w-full text-xs p-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-green-500 focus:border-transparent bg-white"
                                          disabled={isFormDisabled || availableColors.length === 0}
                                        >
                                          <option value="">-- Select Color --</option>
                                          {availableColors.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                          ))}
                                        </select>
                                      </div>
                                      
                                      {/* Image name */}
                                      <p 
                                        className="text-xs text-gray-800 font-medium truncate" 
                                        title={img.name}
                                      >
                                        {img.name}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                        
                        {/* New Images */}
                        {galleryFiles.filter(img => !img.isExisting).length > 0 && (
                          <div>
                            <h4 className="text-xs font-medium text-gray-600 mb-2 flex items-center">
                              <FiUpload className="w-3 h-3 mr-1 text-blue-500" />
                              New Uploads ({galleryFiles.filter(img => !img.isExisting).length})
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                              {galleryFiles
                                .filter(img => !img.isExisting)
                                .map((img, index) => (
                                  <div
                                    key={img.id}
                                    className="relative bg-white rounded-xl border border-blue-200 shadow-sm hover:shadow-lg transition-all duration-300 group"
                                  >
                                    {/* Image Number */}
                                    <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                                      New {index + 1}
                                    </div>
                                    
                                    {/* Image Preview */}
                                    <div className="h-32 w-full flex items-center justify-center bg-gray-50 rounded-t-xl overflow-hidden">
                                      {img.url ? (
                                        <img
                                          src={img.url}
                                          alt={`New upload ${index + 1}: ${img.name}`}
                                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                          onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.style.display = 'none';
                                            const parent = e.target.parentElement;
                                            parent.innerHTML = `
                                              <div class="flex flex-col items-center justify-center h-full w-full text-gray-400">
                                                <FiImage class="w-8 h-8 mb-1" />
                                                <span class="text-xs">Preview error</span>
                                              </div>
                                            `;
                                          }}
                                        />
                                      ) : (
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                          <FiImage className="w-8 h-8 mb-1" />
                                          <span className="text-xs">No preview</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Image Info & Controls */}
                                    <div className="p-3 border-t border-blue-100">
                                      {/* Remove button */}
                                      <button
                                        type="button"
                                        onClick={() => removeGalleryImage(img.id)}
                                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-all duration-300 shadow-md"
                                        disabled={isFormDisabled}
                                        title="Remove image"
                                      >
                                        <FiX className="w-3 h-3" />
                                      </button>
                                      
                                      {/* Color selector */}
                                      <div className="mb-2">
                                        <select
                                          value={img.color || ''}
                                          onChange={(e) => handleColorChangeOnImage(img.id, e.target.value)}
                                          className="w-full text-xs p-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                                          disabled={isFormDisabled || availableColors.length === 0}
                                        >
                                          <option value="">-- Select Color --</option>
                                          {availableColors.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                          ))}
                                        </select>
                                      </div>
                                      
                                      {/* Image name */}
                                      <p 
                                        className="text-xs text-gray-800 font-medium truncate mb-1" 
                                        title={img.name}
                                      >
                                        {img.name}
                                      </p>
                                      
                                      {/* File size */}
                                      {img.file && (
                                        <p className="text-xs text-gray-500">
                                          {(img.file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Show All Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setActiveSection(activeSection === 'all' ? 'basic' : 'all')}
                className="text-orange-600 hover:text-orange-700 font-medium flex items-center gap-2"
              >
                {activeSection === 'all' ? 'Show Section by Section' : 'Show All Sections'}
                <FiChevronDown className={`transition-transform duration-300 ${activeSection === 'all' ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={isFormDisabled}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <FiRefreshCw className="animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <FiSave />
                    Update Product
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/products')}
                className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 disabled:opacity-50"
                disabled={isFormDisabled}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

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