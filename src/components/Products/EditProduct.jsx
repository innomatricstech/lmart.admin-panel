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
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

import ProductUpdateSuccessModal from './ProductUpdateSuccessModal';

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

  const uniqueColors = new Set(product.variants.map(v => v.color).filter(Boolean));
  const uniqueSizes = new Set(product.variants.map(v => v.size).filter(Boolean));

  uniqueColors.forEach(color => keywords.add(color.toLowerCase()));
  uniqueSizes.forEach(size => keywords.add(size.toLowerCase()));

  if (product.productTag) keywords.add(product.productTag.toLowerCase());

  return Array.from(keywords).filter(k => k.length > 0 && k.length <= 50);
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

  const [categoriesList, setCategoriesList] = useState([]);
  const [subcategoriesList, setSubcategoriesList] = useState([]);

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

  const [newVariant, setNewVariant] = useState({
    color: '',
    size: '',
    price: '',
    offerPrice: '',
    stock: '',
  });

  const [mainImageState, setMainImageState] = useState(null);
  const [galleryImagesState, setGalleryImagesState] = useState([]);
  const [videoFileState, setVideoFileState] = useState(null);
  const [imagesToDelete, setImagesToDelete] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [message, setMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [activeSection, setActiveSection] = useState('basic');

  const filteredCategories = categoriesList.filter(cat =>
    !productData.productTag || (cat.label && cat.label.toLowerCase() === productData.productTag.toLowerCase())
  );

  const filteredSubcategories = subcategoriesList
    .filter(sub =>
      !productData.productTag || (sub.label && sub.label.toLowerCase() === productData.productTag.toLowerCase())
    )
    .filter(sub => !productData.category || sub.categoryId === productData.category);

  useEffect(() => {
    const fetchProductData = async () => {
      setLoadingData(true);
      try {
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

        const docRef = doc(db, "products", productId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();

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
              isExisting: true,
            });
          }

          setGalleryImagesState(galleryImages.map(img => ({
            url: img.url,
            color: img.color || '',
            name: img.name,
            id: `gallery-${img.path}`,
            path: img.path,
            isMain: false,
            isExisting: true,
          })));

          if (data.videoUrl && data.videoPath) {
            setVideoFileState({
              url: data.videoUrl,
              name: data.videoUrl.split('/').pop().split('?')[0],
              id: `video-${data.videoPath}`,
              path: data.videoPath,
              isExisting: true,
            });
          }
        } else {
          setMessage("No such product found.");
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setMessage("Failed to load product data.");
      }
      setLoadingData(false);
    };
    fetchProductData();
  }, [productId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "productTag") {
      setProductData(prev => ({ ...prev, [name]: value, category: '', subCategory: '' }));
      return;
    }
    if (name === "category") {
      setProductData(prev => ({ ...prev, category: value, subCategory: '' }));
    } else {
      setProductData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleVariantEdit = (variantId, field, value) => {
    setProductData(prev => ({
      ...prev,
      variants: prev.variants.map(v =>
        v.variantId === variantId ? { ...v, [field]: value } : v
      )
    }));
  };

  const handleNewVariantChange = (e) => {
    const { name, value } = e.target;
    setNewVariant(prev => ({ ...prev, [name]: value }));
  };

  const handleAddVariant = () => {
    const { color, size, price, offerPrice, stock } = newVariant;
    const cleanColor = color.trim() || 'N/A';
    const cleanSize = size.trim().toUpperCase() || 'N/A';
    const cleanPrice = parseFloat(price) || 0;
    const cleanOfferPrice = offerPrice ? parseFloat(offerPrice) : null;
    const cleanStock = parseInt(stock, 10) || 0;

    if (cleanOfferPrice !== null && cleanOfferPrice >= cleanPrice) {
      setMessage("Offer Price must be lower than Price.");
      return;
    }

    const newVariantObject = {
      variantId: Date.now().toString(),
      color: cleanColor,
      size: cleanSize,
      price: cleanPrice,
      offerPrice: cleanOfferPrice,
      stock: cleanStock,
    };

    setProductData(prev => ({ ...prev, variants: [...prev.variants, newVariantObject] }));
    setNewVariant({ color: '', size: '', price: '', offerPrice: '', stock: '' });
  };

  const removeVariant = (variantId) => {
    setProductData(prev => ({
      ...prev,
      variants: prev.variants.filter(v => v.variantId !== variantId),
    }));
  };

  const availableColors = Array.from(new Set(productData.variants.map(v => v.color))).filter(c => c && c !== 'N/A');

  const handleMainImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (mainImageState?.isExisting) setImagesToDelete(prev => [...prev, mainImageState.path]);
      setMainImageState({
        file,
        url: URL.createObjectURL(file),
        color: '',
        name: file.name,
        id: `main-${Date.now()}`,
        isMain: true,
        isExisting: false,
      });
    }
  };

  const handleGalleryImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    const newImages = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      color: '',
      name: file.name,
      id: `gallery-${Date.now()}-${Math.random()}`,
      isMain: false,
      isExisting: false,
    }));
    setGalleryImagesState(prev => [...prev, ...newImages]);
  };

  const handleColorChangeOnImage = (id, newColor) => {
    if (mainImageState?.id === id) {
      setMainImageState(prev => ({ ...prev, color: newColor }));
    } else {
      setGalleryImagesState(prev => prev.map(img => img.id === id ? { ...img, color: newColor } : img));
    }
  };

  const removeMainImage = () => {
    if (mainImageState?.isExisting) setImagesToDelete(prev => [...prev, mainImageState.path]);
    setMainImageState(null);
  };

  const removeGalleryImage = (id) => {
    const img = galleryImagesState.find(p => p.id === id);
    if (img?.isExisting) setImagesToDelete(prev => [...prev, img.path]);
    setGalleryImagesState(prev => prev.filter(p => p.id !== id));
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (videoFileState?.isExisting) setImagesToDelete(prev => [...prev, videoFileState.path]);
      setVideoFileState({
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        id: `video-${Date.now()}`,
        isExisting: false,
      });
    }
  };

  const removeVideo = () => {
    if (videoFileState?.isExisting) setImagesToDelete(prev => [...prev, videoFileState.path]);
    setVideoFileState(null);
  };

  const handleModalClose = useCallback((shouldNavigate) => {
    setShowSuccessModal(false);
    if (shouldNavigate) navigate('/products');
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await Promise.all(imagesToDelete.map(async (path) => {
        try { await deleteObject(ref(storage, path)); } catch (e) { }
      }));

      let imageUrls = [];
      let mainDownloadURL = '';
      let videoDownloadURL = videoFileState?.url || null;
      let videoStoragePath = videoFileState?.path || null;

      if (mainImageState) {
        if (!mainImageState.isExisting) {
          const path = `products/${Date.now()}_main_${mainImageState.file.name}`;
          const sRef = ref(storage, path);
          await uploadBytes(sRef, mainImageState.file);
          mainDownloadURL = await getDownloadURL(sRef);
          imageUrls.push({ url: mainDownloadURL, name: mainImageState.name, path, isMain: true, color: mainImageState.color });
        } else {
          mainDownloadURL = mainImageState.url;
          imageUrls.push({ ...mainImageState });
        }
      }

      for (const img of galleryImagesState) {
        if (!img.isExisting) {
          const path = `products/${Date.now()}_gallery_${img.file.name}`;
          const sRef = ref(storage, path);
          await uploadBytes(sRef, img.file);
          const url = await getDownloadURL(sRef);
          imageUrls.push({ url, name: img.name, path, isMain: false, color: img.color });
        } else {
          imageUrls.push({ ...img });
        }
      }

      if (videoFileState && !videoFileState.isExisting) {
        videoStoragePath = `products/${Date.now()}_video_${videoFileState.file.name}`;
        const sRef = ref(storage, videoStoragePath);
        await uploadBytes(sRef, videoFileState.file);
        videoDownloadURL = await getDownloadURL(sRef);
      }

      const selectedCat = categoriesList.find(c => c.id === productData.category);
      const selectedSub = subcategoriesList.find(s => s.id === productData.subCategory);

      const productToUpdate = {
        ...productData,
        category: { id: productData.category, name: selectedCat?.name || '' },
        subCategory: productData.subCategory ? { id: productData.subCategory, name: selectedSub?.name || '' } : null,
        imageUrls,
        mainImageUrl: mainDownloadURL,
        videoUrl: videoDownloadURL,
        videoPath: videoStoragePath,
        searchKeywords: generateSearchKeywords({ ...productData, category: { name: selectedCat?.name }, subCategory: { name: selectedSub?.name } }),
        updatedAt: new Date(),
      };

      await updateDoc(doc(db, "products", productId), productToUpdate);
      setShowSuccessModal(true);
    } catch (error) {
      console.error(error);
      setMessage("Update failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-center">
              <FiAlertCircle className="text-red-500 mr-3" />
              <p className="text-red-700">{message}</p>
            </div>
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
                  />
                  <InputField
                    icon={<FiUser className="text-orange-500" />}
                    label="Seller ID"
                    name="sellerId"
                    value={productData.sellerId}
                    onChange={handleChange}
                    placeholder="Enter seller ID"
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
                  />
                  <InputField
                    icon={<FiTag className="text-blue-500" />}
                    label="Brand"
                    name="brand"
                    value={productData.brand}
                    onChange={handleChange}
                    placeholder="Enter brand"
                  />
                  <InputField
                    icon={<FiTag className="text-blue-500" />}
                    label="HSN Code"
                    name="hsnCode"
                    value={productData.hsnCode}
                    onChange={handleChange}
                    placeholder="Enter HSN code"
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
                    disabled={!productData.category}
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
                    />
                    <input
                      placeholder="Size"
                      value={newVariant.size}
                      onChange={handleNewVariantChange}
                      name="size"
                      className="border border-purple-200 bg-white p-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <input
                      placeholder="Price"
                      type="number"
                      value={newVariant.price}
                      onChange={handleNewVariantChange}
                      name="price"
                      className="border border-purple-200 bg-white p-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <input
                      placeholder="Offer Price"
                      type="number"
                      value={newVariant.offerPrice}
                      onChange={handleNewVariantChange}
                      name="offerPrice"
                      className="border border-purple-200 bg-white p-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <input
                      placeholder="Stock"
                      type="number"
                      value={newVariant.stock}
                      onChange={handleNewVariantChange}
                      name="stock"
                      className="border border-purple-200 bg-white p-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:scale-105 transition-all duration-300"
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
                          />
                          <input
                            value={v.size}
                            onChange={(e) => handleVariantEdit(v.variantId, 'size', e.target.value)}
                            className="border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-200 p-2 rounded"
                          />
                          <input
                            type="number"
                            value={v.price}
                            onChange={(e) => handleVariantEdit(v.variantId, 'price', e.target.value)}
                            className="border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-200 p-2 rounded"
                          />
                          <input
                            type="number"
                            value={v.offerPrice || ''}
                            onChange={(e) => handleVariantEdit(v.variantId, 'offerPrice', e.target.value)}
                            className="border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-200 p-2 rounded text-red-500"
                          />
                          <input
                            type="number"
                            value={v.stock}
                            onChange={(e) => handleVariantEdit(v.variantId, 'stock', e.target.value)}
                            className="border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-200 p-2 rounded"
                          />
                          <button
                            type="button"
                            onClick={() => removeVariant(v.variantId)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors duration-200 flex items-center justify-center"
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

            {/* Media Section */}
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
                      className={`border-2 ${mainImageState
                          ? 'border-solid border-gray-200'
                          : 'border-dashed border-gray-300 hover:border-orange-400'
                        } rounded-2xl p-4 text-center transition-all duration-300 h-48 flex flex-col justify-center items-center cursor-pointer relative bg-gradient-to-br from-gray-50 to-white`}
                    >
                      {mainImageState ? (
                        <>
                          <img
                            src={mainImageState.url}
                            alt="Main product"
                            className="h-32 w-auto object-contain rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={removeMainImage}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors duration-200 shadow-lg"
                          >
                            <FiX />
                          </button>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center">
                            <FiUpload className="text-2xl text-orange-500" />
                          </div>
                          <p className="text-gray-600">Click to upload main image</p>
                          <input type="file" className="hidden" onChange={handleMainImageChange} />
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
                      className={`border-2 ${videoFileState
                          ? 'border-solid border-gray-200'
                          : 'border-dashed border-gray-300 hover:border-orange-400'
                        } rounded-2xl p-4 text-center transition-all duration-300 h-48 flex flex-col justify-center items-center cursor-pointer relative bg-gradient-to-br from-gray-50 to-white`}
                    >
                      {videoFileState ? (
                        <>
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mb-3">
                            <FiVideo className="text-2xl text-blue-500" />
                          </div>
                          <p className="text-sm text-gray-600 truncate max-w-full px-4">{videoFileState.name}</p>
                          <button
                            type="button"
                            onClick={removeVideo}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors duration-200 shadow-lg"
                          >
                            <FiX />
                          </button>
                        </>
                      ) : (
                        <label className="cursor-pointer flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center">
                            <FiVideo className="text-2xl text-blue-500" />
                          </div>
                          <p className="text-gray-600">Click to upload video</p>
                          <input type="file" className="hidden" onChange={handleVideoChange} />
                        </label>
                      )}
                    </div>
                  </div>
                </div>

                {/* Gallery Images */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FiImage className="text-amber-500" />
                      Gallery Images
                    </label>
                    <span className="text-sm text-gray-500 bg-amber-50 px-3 py-1 rounded-full">
                      {galleryImagesState.length} images
                    </span>
                  </div>

                  <label className="block border-2 border-dashed border-gray-300 hover:border-orange-400 rounded-2xl p-6 text-center cursor-pointer bg-gradient-to-br from-gray-50 to-white transition-all duration-300">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center">
                        <FiPlus className="text-2xl text-amber-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Add Gallery Images</p>
                        <p className="text-sm text-gray-500">Upload multiple images</p>
                      </div>
                    </div>
                    <input type="file" multiple className="hidden" onChange={handleGalleryImageChange} />
                  </label>

                  {galleryImagesState.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {galleryImagesState.map(img => (
                        <div
                          key={img.id}
                          className="relative bg-white rounded-xl border border-gray-200 p-3 hover:shadow-lg transition-all duration-300 group"
                        >
                          <img
                            src={img.url}
                            alt="Gallery"
                            className="h-32 w-full object-cover rounded-lg mb-2"
                          />
                          <select
                            value={img.color}
                            onChange={(e) => handleColorChangeOnImage(img.id, e.target.value)}
                            className="w-full text-xs p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          >
                            <option value="">No Color</option>
                            {availableColors.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(img.id)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-all duration-300 opacity-0 group-hover:opacity-100 shadow-lg"
                          >
                            <FiX className="text-sm" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-300"
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