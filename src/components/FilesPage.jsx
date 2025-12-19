import React, { useState, useEffect, useCallback } from "react";
import { db, storage } from "../../firerbase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  arrayUnion,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  FiFileText,
  FiDownload,
  FiUploadCloud,
  FiDelete,
  FiSearch,
  FiLoader,
  FiImage,
  FiFile,
  FiEye,
  FiUser,
  FiShield,
  FiCheckCircle,
  FiMail,
  FiPhone,
  FiCalendar,
  FiPackage,
  FiBarChart2,
  FiHardDrive,
  FiChevronRight,
  FiAlertCircle,
  FiClock,
  FiTrendingUp,
} from "react-icons/fi";
import { 
  MdEmail, 
  MdPhone, 
  MdPerson, 
  MdStorage, 
  MdDownload 
} from "react-icons/md";

// --- Helper Functions ---

const getFileIcon = (fileType) => {
  const type = (fileType || "").toLowerCase();
  if (type.includes("image")) return <FiImage className="w-5 h-5 text-purple-500" />;
  if (type.includes("pdf")) return <FiFileText className="w-5 h-5 text-red-500" />;
  if (type.includes("word") || type.includes("doc")) return <FiFile className="w-5 h-5 text-blue-500" />;
  if (type.includes("excel") || type.includes("xls")) return <FiFile className="w-5 h-5 text-green-500" />;
  if (type.includes("zip") || type.includes("rar")) return <FiPackage className="w-5 h-5 text-yellow-500" />;
  return <FiFile className="w-5 h-5 text-gray-500" />;
};

const getStatusBadge = (status) => {
  const statusConfig = {
    "Active": { color: "bg-emerald-100 text-emerald-800", icon: <FiCheckCircle className="w-3 h-3" /> },
    "Pending": { color: "bg-amber-100 text-amber-800", icon: <FiClock className="w-3 h-3" /> },
    "Inactive": { color: "bg-gray-100 text-gray-800", icon: <FiAlertCircle className="w-3 h-3" /> },
    "Admin Uploaded": { color: "bg-blue-100 text-blue-800", icon: <FiShield className="w-3 h-3" /> },
    "Customer Uploaded": { color: "bg-indigo-100 text-indigo-800", icon: <FiUser className="w-3 h-3" /> },
  };
  
  const config = statusConfig[status] || statusConfig["Active"];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon}
      {status}
    </span>
  );
};

const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const safeToDate = (dateValue) => {
  if (!dateValue) return new Date(0);
  if (typeof dateValue.toDate === "function") return dateValue.toDate();
  return new Date(dateValue);
};

const formatDate = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const StatCard = ({ title, value, icon: Icon, bgColor, iconColor, trend, trendValue }) => (
  <div className={`p-6 rounded-2xl shadow-lg ${bgColor} relative overflow-hidden`}>
    <div className="relative z-10">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-white/90 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {trend && (
            <div className="flex items-center mt-2 text-white/80 text-sm">
              {trend === "up" ? <FiTrendingUp className="mr-1" /> : "↓"}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-white/20 ${iconColor}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  </div>
);

// --- Customer Details Card ---
const CustomerDetailCard = ({ customer }) => (
  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
          <FiUser className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-lg">{customer.customerName}</h3>
          <div className="flex items-center gap-2 mt-1">
            {getStatusBadge(customer.status || "Active")}
            <span className="text-xs text-gray-500 font-mono px-2 py-1 bg-gray-100 rounded">
              ID: {customer.uploadDocId?.substring(0, 8)}...
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-gray-600">
        <MdEmail className="w-4 h-4 text-blue-500" />
        <span className="text-sm">{customer.customerEmail || "No email"}</span>
      </div>
      {/* <div className="flex items-center gap-3 text-gray-600">
        <MdPhone className="w-4 h-4 text-green-500" />
        <span className="text-sm">{customer.customerPhone || "No phone"}</span>
      </div> */}
      <div className="flex items-center gap-3 text-gray-600">
        <FiCalendar className="w-4 h-4 text-purple-500" />
        <span className="text-sm">Joined: {customer.joinDate ? formatDate(customer.joinDate) : "N/A"}</span>
      </div>
      <div className="flex items-center gap-3 text-gray-600">
        <FiHardDrive className="w-4 h-4 text-amber-500" />
        <span className="text-sm">Storage used: {customer.totalSize || "0 MB"}</span>
      </div>
    </div>
  </div>
);

// --- User Files View Component (Modal) ---
const UserFilesView = ({ user, onClose, onUpload }) => {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);

    const uniqueFileId = uuidv4();
    const storageRef = ref(storage, `uploadfile/${user.uploadDocId}/${selectedFile.name}_${uniqueFileId}`);

    try {
      const snapshot = await uploadBytes(storageRef, selectedFile);
      const adminFile = await getDownloadURL(snapshot.ref);

      const fileMetadata = {
        fileId: uniqueFileId,
        originalName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        downloads: 0,
        uploadedAt: Timestamp.now(),
        storagePath: snapshot.ref.fullPath,
        adminFile,
        adminUploaded: true,
        status: "Admin Uploaded",
      };

      const userDoc = doc(db, "uploadfile", user.uploadDocId);
      const docSnap = await getDoc(userDoc);

      if (docSnap.exists()) {
        await updateDoc(userDoc, { files: arrayUnion(fileMetadata) });
      } else {
        await setDoc(userDoc, {
          customerId: user.uploadDocId,
          customerName: user.customerName,
          customerEmail: user.customerEmail,
          // customerPhone: user.customerPhone,
          files: [fileMetadata],
          createdAt: Timestamp.now(),
        });
      }

      onUpload();
      setSelectedFile(null);
      setShowUploadForm(false);
    } catch (err) {
      setUploadError("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const filteredFiles = user.individualFiles.filter(file => {
    if (activeTab === "all") return true;
    if (activeTab === "admin") return file.adminUploaded;
    if (activeTab === "customer") return !file.adminUploaded;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <FiUser className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{user.customerName}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <MdEmail className="w-4 h-4" /> {user.customerEmail}
                    </span>
                    {/* {user.customerPhone && (
                      <span className="flex items-center gap-1">
                        <MdPhone className="w-4 h-4" /> {user.customerPhone}
                      </span>
                    )} */}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="px-3 py-1 bg-gray-100 rounded-full">
                  📁 {user.totalFiles} files
                </span>
                <span className="px-3 py-1 bg-gray-100 rounded-full">
                  📥 {user.totalDownloads} downloads
                </span>
                <span className="px-3 py-1 bg-gray-100 rounded-full">
                  💾 {user.totalSize}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl p-2 hover:bg-gray-100 rounded-lg">
              &times;
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Customer Details */}
          <div className="w-1/3 border-r p-6 bg-gray-50">
            <CustomerDetailCard customer={user} />
            
            <div className="mt-6">
              <h4 className="font-semibold text-gray-700 mb-3">Quick Actions</h4>
              <button 
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 mb-3"
              >
                <FiUploadCloud /> Upload File as Admin
              </button>
              
              {showUploadForm && (
                <div className="p-4 border border-blue-200 rounded-xl bg-blue-50 mt-3">
                  <div className="space-y-3">
                    <input 
                      type="file" 
                      onChange={(e) => setSelectedFile(e.target.files[0])} 
                      className="w-full text-sm p-2 border rounded-lg"
                    />
                    <button 
                      onClick={handleUpload} 
                      disabled={!selectedFile || uploading}
                      className="w-full bg-green-500 text-white px-4 py-2 rounded-lg disabled:opacity-50 hover:bg-green-600 transition"
                    >
                      {uploading ? "Uploading..." : "Upload File"}
                    </button>
                    {uploadError && <p className="text-red-500 text-xs">{uploadError}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Files */}
          <div className="w-2/3 p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                {["all", "admin", "customer"].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-all ${
                      activeTab === tab 
                        ? 'bg-white shadow text-blue-600' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab} ({tab === "all" ? user.individualFiles.length : 
                           tab === "admin" ? user.individualFiles.filter(f => f.adminUploaded).length :
                           user.individualFiles.filter(f => !f.adminUploaded).length})
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {filteredFiles.length === 0 ? (
                <div className="text-center py-12">
                  <FiFile className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No files found</p>
                </div>
              ) : (
                filteredFiles.map((file) => (
                  <div key={file.id} className="group p-4 border rounded-xl hover:shadow-md transition-all duration-200 bg-white hover:border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-blue-50 transition">
                          {getFileIcon(file.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 truncate">{file.name}</span>
                            {file.adminUploaded ? getStatusBadge("Admin Uploaded") : getStatusBadge("Customer Uploaded")}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <FiHardDrive className="w-3 h-3" /> {formatBytes(file.size)}
                            </span>
                            <span className="flex items-center gap-1">
                              <FiCalendar className="w-3 h-3" /> {formatDate(file.uploadedAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MdDownload className="w-3 h-3" /> {file.downloads || 0} downloads
                            </span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => window.open(file.downloadURL, '_blank')}
                        className="ml-4 p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <FiDownload size={20} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Dashboard Component ---
export default function FileDashboard() {
  const [files, setFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [allFilesList, setAllFilesList] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'latestUpload', direction: 'desc' });

  const fetchFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      const snapshot = await getDocs(collection(db, "uploadfile"));
      const summaries = [];
      const flat = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const docId = docSnap.id;
        let individualFiles = Array.isArray(data.files) ? data.files : [];

        individualFiles.sort((a, b) => safeToDate(b.uploadedAt) - safeToDate(a.uploadedAt));

        const latestFile = individualFiles[0];
        const userSummary = {
          uploadDocId: docId,
          customerName: data.customerName || "Unknown Customer",
          customerEmail: data.customerEmail || "No email",
          customerPhone: data.customerPhone || "No phone",
          joinDate: data.createdAt || data.joinDate,
          status: data.status || "Active",
          totalFiles: individualFiles.length,
          totalDownloads: individualFiles.reduce((sum, f) => sum + (f.downloads || 0), 0),
          totalSize: formatBytes(individualFiles.reduce((sum, f) => sum + (f.fileSize || 0), 0)),
          rawTotalSize: individualFiles.reduce((sum, f) => sum + (f.fileSize || 0), 0),
          latestUpload: latestFile ? safeToDate(latestFile.uploadedAt) : null,
          latestUploadStr: latestFile ? safeToDate(latestFile.uploadedAt).toLocaleString() : "No Files",
          individualFiles: individualFiles.map(f => ({
            ...f,
            id: f.fileId,
            name: f.originalName,
            type: f.fileType,
            size: f.fileSize,
            uploadedAt: f.uploadedAt,
          }))
        };

        summaries.push(userSummary);
        individualFiles.forEach(f => flat.push({ ...f, customerName: data.customerName, uploadDocId: docId }));
      });

      setFiles(summaries);
      setAllFilesList(flat);
    } catch (err) {
      console.error("Dashboard Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedUsers = [...files].sort((a, b) => {
    if (sortConfig.key === 'customerName') {
      return sortConfig.direction === 'asc' 
        ? a.customerName.localeCompare(b.customerName)
        : b.customerName.localeCompare(a.customerName);
    }
    if (sortConfig.key === 'latestUpload') {
      return sortConfig.direction === 'asc'
        ? (a.latestUpload || 0) - (b.latestUpload || 0)
        : (b.latestUpload || 0) - (a.latestUpload || 0);
    }
    if (sortConfig.key === 'totalFiles') {
      return sortConfig.direction === 'asc'
        ? a.totalFiles - b.totalFiles
        : b.totalFiles - a.totalFiles;
    }
    return 0;
  });

  const filteredUsers = sortedUsers.filter(u => 
    u.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.uploadDocId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.customerPhone && u.customerPhone.includes(searchTerm))
  );

  const totalStorage = files.reduce((sum, user) => sum + user.rawTotalSize, 0);
  const avgFilesPerUser = files.length > 0 ? (allFilesList.length / files.length).toFixed(1) : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <FiFileText className="w-7 h-7 text-white" />
              </div>
              File Management Dashboard
            </h1>
            <p className="text-gray-500 mt-2">Manage customer files, track uploads, and monitor storage usage</p>
          </div>
          <button 
            onClick={fetchFiles}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl flex items-center gap-2 transition"
          >
            <FiLoader className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Total Customers" 
            value={files.length} 
            icon={FiUser} 
            bgColor="bg-gradient-to-br from-indigo-500 to-indigo-600"
            iconColor="text-indigo-200"
          />
          <StatCard 
            title="Total Files" 
            value={allFilesList.length} 
            icon={FiFile} 
            bgColor="bg-gradient-to-br from-emerald-500 to-emerald-600"
            iconColor="text-emerald-200"
            trend="up"
            trendValue="+12%"
          />
          <StatCard 
            title="Admin Uploads" 
            value={allFilesList.filter(f => f.adminUploaded).length} 
            icon={FiShield} 
            bgColor="bg-gradient-to-br from-blue-500 to-blue-600"
            iconColor="text-blue-200"
          />
          <StatCard 
            title="Total Storage" 
            value={formatBytes(totalStorage)} 
            icon={MdStorage} 
            bgColor="bg-gradient-to-br from-purple-500 to-purple-600"
            iconColor="text-purple-200"
          />
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Files per User</p>
                <p className="text-2xl font-bold text-gray-900">{avgFilesPerUser}</p>
              </div>
              <FiBarChart2 className="w-8 h-8 text-gray-300" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Downloads</p>
                <p className="text-2xl font-bold text-gray-900">
                  {files.reduce((sum, user) => sum + user.totalDownloads, 0)}
                </p>
              </div>
              <FiDownload className="w-8 h-8 text-gray-300" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {files.filter(u => u.status === "Active").length}
                </p>
              </div>
              <FiCheckCircle className="w-8 h-8 text-gray-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  placeholder="Search by name, email, phone, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 ml-4">
              <span className="px-3 py-1 bg-gray-100 rounded-full">
                {filteredUsers.length} of {files.length} users
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left">
                  <button 
                    onClick={() => handleSort('customerName')}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Customer Details
                    {sortConfig.key === 'customerName' && (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button 
                    onClick={() => handleSort('totalFiles')}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Files & Stats
                    {sortConfig.key === 'totalFiles' && (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <button 
                    onClick={() => handleSort('latestUpload')}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Latest Activity
                    {sortConfig.key === 'latestUpload' && (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 text-left">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</span>
                </th>
                <th className="px-6 py-4 text-right">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <FiLoader className="animate-spin w-8 h-8 text-blue-500 mb-3" />
                      <p className="text-gray-500">Loading dashboard data...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12">
                    <div className="flex flex-col items-center">
                      <FiSearch className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-gray-500">No customers found</p>
                      <p className="text-gray-400 text-sm mt-1">Try adjusting your search terms</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.uploadDocId} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                          <FiUser className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{user.customerName}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                            <MdEmail className="w-3 h-3" />
                            {user.customerEmail}
                          </div>
                          {/* {user.customerPhone && (
                            <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                              <MdPhone className="w-3 h-3" />
                              {user.customerPhone}
                            </div>
                          )} */}
                          <div className="text-[10px] text-gray-400 font-mono mt-1">
                            ID: {user.uploadDocId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                            {user.totalFiles} files
                          </div>
                          <div className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                            {user.totalDownloads} downloads
                          </div>
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <FiHardDrive className="w-3 h-3" />
                          {user.totalSize}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {user.latestUpload ? formatDate(user.latestUpload) : "No activity"}
                      </div>
                      {user.latestUpload && (
                        <div className="text-xs text-gray-400 mt-1">
                          {Math.floor((Date.now() - user.latestUpload.getTime()) / (1000 * 60 * 60 * 24))} days ago
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end">
                        <button 
                          onClick={() => setSelectedUser(user)}
                          className="px-4 py-2 bg-gradient-to-r from-gray-50 to-white border border-gray-200 text-gray-700 hover:text-blue-600 hover:border-blue-200 hover:from-blue-50 rounded-xl transition-all text-sm font-medium flex items-center gap-2 group-hover:shadow-sm"
                        >
                          <FiEye /> View Details
                          <FiChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Files Modal */}
      {selectedUser && (
        <UserFilesView 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
          onUpload={fetchFiles}
        />
      )}
    </div>
  );
}