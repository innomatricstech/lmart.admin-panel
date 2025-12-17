import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  collection,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../../firerbase";
import {
  Upload,
  FileSpreadsheet,
  Database,
  CheckCircle,
  AlertCircle,
  Loader2,
  X
} from "lucide-react";

const BulkUploadPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [notification, setNotification] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileRef = useRef();

  // ===============================
  // 1️⃣ EXCEL → JSON
  // ===============================
  const handleExcelUpload = (e) => {
    const file = e.target.files ? e.target.files[0] : e.dataTransfer?.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      showNotification("Please upload a valid Excel file", "error");
      return;
    }

    setLoading(true);
    setUploadProgress(30);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        const transformed = transformExcelToJSON(rows);
        setProducts(transformed);
        setUploadProgress(100);
        
        showNotification(
          `Successfully loaded ${transformed.length} products from Excel`,
          "success"
        );
      } catch (error) {
        showNotification("Error reading Excel file", "error");
        console.error(error);
      } finally {
        setLoading(false);
        setTimeout(() => setUploadProgress(0), 1000);
      }
    };

    reader.onerror = () => {
      showNotification("Error reading file", "error");
      setLoading(false);
      setUploadProgress(0);
    };

    reader.readAsArrayBuffer(file);
  };

  // Drag and drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleExcelUpload(e);
  };

  // ===============================
  // 2️⃣ TRANSFORM EXCEL → FIRESTORE FORMAT
  // ===============================
  const transformExcelToJSON = (rows) => {
    const skuMap = {};

    rows.forEach((row, index) => {
      const sku = row.SKU || `SKU-${Date.now()}-${index}`;

      if (!skuMap[sku]) {
        skuMap[sku] = {
          baseInfo: {
            sku,
            name: row.Name || "",
            description: row.Description || "",
            brand: row.Brand || "",
            hsnCode: row.HSNCode || "",
            sellerId: row.SellerId || "",
            status: "Active",
            productTag: row.ProductTag || 'General',
            category: row.CategoryID
              ? { id: row.CategoryID, name: row.CategoryID }
              : null,
            subCategory: row.SubCategoryID
              ? { id: row.SubCategoryID, name: row.SubCategoryID }
              : null,
            searchKeywords: generateKeywords(
              row.Name,
              sku,
              row.Brand,
              row.HSNCode
            )
          },
          pendingImages: {
            main: row.MainImageURL || null,
            gallery: row.GalleryImages
              ? row.GalleryImages
                  .split('|')
                  .map(url => url.trim())
                  .filter(url => url)
              : []
          },
          variants: []
        };
      }

      skuMap[sku].variants.push({
        variantId: `${Date.now()}-${index}`,
        color: row.Variant_Color || "",
        size: row.Variant_Size || "",
        price: Number(row.Variant_Price) || 0,
        offerPrice: row.Variant_OfferPrice
          ? Number(row.Variant_OfferPrice)
          : null,
        stock: Number(row.Variant_Stock) || 0
      });
    });

    return Object.values(skuMap);
  };

  // ===============================
  // 3️⃣ SEARCH KEYWORDS
  // ===============================
 const generateKeywords = (name, sku, brand, hsn) => {
  const set = new Set();

  [name, sku, brand, hsn].forEach((v) => {
    if (v === undefined || v === null) return;

    const value = String(v).toLowerCase(); // 🔥 FIX

    value.split(" ").forEach((word) => {
      for (let i = 1; i <= word.length; i++) {
        set.add(word.substring(0, i));
      }
    });
  });

  return Array.from(set);
};

  // ===============================
  // 4️⃣ JSON → DATABASE
  // ===============================
  const saveToDatabase = async () => {
    if (products.length === 0) return;

    setLoading(true);
    setUploadProgress(0);

    try {
      const uploadRef = await addDoc(collection(db, "productUploads"), {
        totalProducts: products.length,
        uploadedAt: serverTimestamp(),
        status: "processing"
      });

      let processed = 0;
      for (const product of products) {
        await addDoc(collection(db, "products"), {
          ...product.baseInfo,
          variants: product.variants,
          uploadId: uploadRef.id,
          sourceImages: {
            main: product.pendingImages.main,
            gallery: product.pendingImages.gallery
          },
          mainImageUrl: null,
          imageUrls: [],
          imageStatus: "pending",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        processed++;
        setUploadProgress(Math.round((processed / products.length) * 100));
      }

      showNotification(
        `Successfully uploaded ${products.length} products. Images are being processed in the background.`,
        "success"
      );
      
      setProducts([]);
    } catch (error) {
      showNotification("Error saving products to database", "error");
      console.error(error);
    } finally {
      setLoading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  // ===============================
  // NOTIFICATION SYSTEM
  // ===============================
  const showNotification = (message, type = "info") => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  // ===============================
  // UI COMPONENTS
  // ===============================
  const Notification = ({ message, type, onClose }) => {
    const bgColor = type === "error" ? "bg-red-50 border-red-200" 
                  : type === "success" ? "bg-green-50 border-green-200" 
                  : "bg-blue-50 border-blue-200";
    
    const iconColor = type === "error" ? "text-red-500" 
                    : type === "success" ? "text-green-500" 
                    : "text-blue-500";
    
    const Icon = type === "error" ? AlertCircle : CheckCircle;

    return (
      <div className={`fixed top-6 right-6 z-50 min-w-[300px] max-w-md border rounded-lg shadow-lg p-4 ${bgColor} animate-slideIn`}>
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{message}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // ===============================
  // MAIN UI
  // ===============================
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bulk Product Upload</h1>
          <p className="text-gray-600 mt-2">Upload Excel files to add multiple products at once</p>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="max-w-3xl mx-auto">
            {/* Drag & Drop Area */}
            <div
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <FileSpreadsheet className="w-8 h-8 text-blue-600" />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Drop your Excel file here
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Supports .xlsx and .xls files with product information
                  </p>
                </div>

                <input
                  type="file"
                  accept=".xlsx,.xls"
                  ref={fileRef}
                  onChange={handleExcelUpload}
                  className="hidden"
                  id="file-upload"
                />
                
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={loading}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {loading ? "Processing..." : "Browse Files"}
                </button>
                
                <p className="text-sm text-gray-500 mt-2">
                  or drag and drop your file
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            {uploadProgress > 0 && (
              <div className="mt-8">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Results & Actions */}
            {products.length > 0 && (
              <div className="mt-8 bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      Ready to Import
                    </h4>
                    <p className="text-gray-600">
                      {products.length} products loaded from Excel
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setProducts([]);
                        showNotification("Products list cleared", "info");
                      }}
                      className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Clear
                    </button>
                    
                    <button
                      onClick={saveToDatabase}
                      disabled={loading}
                      className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Database className="w-4 h-4" />
                          Import Products
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Preview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="text-sm text-gray-600">Total Products</div>
                    <div className="text-2xl font-bold text-gray-900">{products.length}</div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="text-sm text-gray-600">Total Variants</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {products.reduce((sum, p) => sum + p.variants.length, 0)}
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border">
                    <div className="text-sm text-gray-600">Image URLs</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {products.reduce((sum, p) => sum + p.pendingImages.gallery.length + (p.pendingImages.main ? 1 : 0), 0)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            
          </div>
        </div>
      </div>

      {/* Notification Popup */}
      {notification && (
        <Notification
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      {/* Global Styles for Animation */}
      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default BulkUploadPage;