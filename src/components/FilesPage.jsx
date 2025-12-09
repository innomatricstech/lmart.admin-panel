// FileDashboard.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { db, storage } from "../../firerbase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
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
} from "react-icons/fi";

const getFileIcon = (fileType) => {
  const type = (fileType || "").toLowerCase();

  if (
    type.includes("image") ||
    type.includes("png") ||
    type.includes("jpg") ||
    type.includes("jpeg")
  ) {
    return <FiImage className="w-5 h-5 text-purple-600" />;
  } else if (type.includes("pdf")) {
    return <FiFileText className="w-5 h-5 text-red-600" />;
  } else {
    return <FiFile className="w-5 h-5 text-gray-600" />;
  }
};

const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

// Helper to trigger actual browser download (no new tab)
const triggerDownload = (url, name) => {
  const a = document.createElement("a");
  a.href = url;
  a.download = name || "download";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const StatCard = ({ title, value, icon: Icon, bgColor, iconColor }) => (
  <div
    className={`p-4 rounded-xl shadow-lg flex items-center justify-between h-24 ${bgColor}`}
  >
    <div className="flex flex-col">
      <h3 className="text-sm font-semibold text-white/90">{title}</h3>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
    <Icon className={`w-8 h-8 ${iconColor}`} />
  </div>
);

// User Files View Component
const UserFilesView = ({ user, onClose, onUpload, onDownloadAll, onDeleteAll }) => {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadError(null);

    const uniqueFileId = uuidv4();
    const storageRef = ref(
      storage,
      `uploadfile/${user.uploadDocId}/${selectedFile.name}_${uniqueFileId}`
    );

    try {
      const snapshot = await uploadBytes(storageRef, selectedFile);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const fileMetadata = {
        fileId: uniqueFileId,
        originalName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        downloads: 0,
        uploadedAt: Timestamp.fromDate(new Date()),
        storagePath: snapshot.ref.fullPath,
        downloadURL,
      };

      const userDoc = doc(db, "uploadfile", user.uploadDocId);

      await updateDoc(userDoc, {
        files: arrayUnion(fileMetadata),
      }).catch(async () => {
        await setDoc(userDoc, {
          customerId: user.uploadDocId,
          customerName: user.customerName,
          files: [fileMetadata],
          createdAt: Timestamp.fromDate(new Date()),
        });
      });

      // Refresh user data
      onUpload();
      setSelectedFile(null);
      setShowUploadForm(false);
    } catch (err) {
      setUploadError("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-xl font-bold flex items-center">
              <FiUser className="w-5 h-5 mr-2 text-blue-600" />
              {user.customerName}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Email: {user.customerEmail} | User ID:{" "}
              <span className="font-mono text-xs">{user.uploadDocId}</span>
            </p>
            <p className="text-sm text-gray-600">
              Total Files: {user.totalFiles} | Total Size: {user.totalSize} | 
              Downloads: {user.totalDownloads}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl"
          >
            &times;
          </button>
        </div>

        <div className="p-6">
          {/* File List */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-4">Files List</h4>
            {user.individualFiles.length > 0 ? (
              <div className="space-y-3">
                {user.individualFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center flex-1">
                      {getFileIcon(file.type)}
                      <div className="ml-3">
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-gray-500">
                          {file.type} • {formatBytes(file.size)} • {file.downloads} downloads
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => triggerDownload(file.downloadURL, file.name)}
                        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition"
                        title="Download"
                      >
                        <FiDownload />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FiFile className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No files uploaded yet</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center border-t pt-6">
            <div className="flex space-x-3">
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition"
              >
                <FiUploadCloud className="inline w-4 h-4 mr-2" />
                Upload File
              </button>
              
              {user.totalFiles > 0 && (
                <>
                  <button
                    onClick={onDownloadAll}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
                  >
                    <FiDownload className="inline w-4 h-4 mr-2" />
                    Download All ({user.totalFiles})
                  </button>
                  
                  <button
                    onClick={onDeleteAll}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                  >
                    <FiDelete className="inline w-4 h-4 mr-2" />
                    Delete All
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Upload Form */}
          {showUploadForm && (
            <div className="mt-6 p-4 border rounded-lg bg-gray-50">
              <h5 className="font-medium mb-3">Upload New File</h5>
              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="border rounded p-2 flex-1"
                />
                {selectedFile && (
                  <span className="text-sm text-gray-600">
                    {selectedFile.name} ({formatBytes(selectedFile.size)})
                  </span>
                )}
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
              {uploadError && (
                <p className="text-red-600 text-sm mt-2">{uploadError}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function FileDashboard({ onSelectUser }) {
  const [files, setFiles] = useState([]); 
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [uploadError, setUploadError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [showAllFiles, setShowAllFiles] = useState(false); // Toggle between summary and detailed view
  const [allFilesList, setAllFilesList] = useState([]); // Flattened list of all files

  const currentUserId = "USER_LOGGED_IN_12345"; 
  const fileInputRef = useRef(null);

  const showStatus = (message, isError = false) => {
    setStatusMessage({ message, isError });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const fetchFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const snapshot = await getDocs(collection(db, "uploadfile"));
      const uploadSummaries = [];
      const flattenedFiles = [];

      snapshot.forEach((docSnap) => {
        const docId = docSnap.id;
        const data = docSnap.data();

        const individualFiles = Array.isArray(data.files) ? data.files : [];

        const totalSizeInBytes = individualFiles.reduce(
          (sum, f) => sum + (f.fileSize || 0),
          0
        );
        const totalDownloads = individualFiles.reduce(
          (sum, f) => sum + (f.downloads || 0),
          0
        );

        const latestUpload =
          individualFiles.length > 0
            ? individualFiles[individualFiles.length - 1].uploadedAt?.toDate?.()
                .toLocaleString() || "N/A"
            : data.createdAt?.toDate?.().toLocaleString() || "N/A";

        const userSummary = {
          uploadDocId: docId,
          customerName: data.customerName || "N/A",
          customerEmail: data.customerEmail || "N/A",
          totalFiles: individualFiles.length,
          totalDownloads: totalDownloads,
          totalSize: formatBytes(totalSizeInBytes),
          rawTotalSize: totalSizeInBytes,
          latestUpload: latestUpload,
          individualFiles: individualFiles.map((file) => ({
            ...file,
            uploadDocId: docId,
            id: file.fileId,
            name: file.originalName,
            size: file.fileSize,
            type: file.fileType,
          })),
        };

        uploadSummaries.push(userSummary);

        // Flatten files for detailed view
        individualFiles.forEach(file => {
          flattenedFiles.push({
            ...file,
            uploadDocId: docId,
            id: file.fileId,
            name: file.originalName,
            size: file.fileSize,
            type: file.fileType,
            customerName: data.customerName || "N/A",
            customerEmail: data.customerEmail || "N/A",
            uploadedAt: file.uploadedAt?.toDate?.().toLocaleString() || "N/A",
            downloads: file.downloads || 0,
          });
        });
      });

      setFiles(uploadSummaries);
      setAllFilesList(flattenedFiles);
    } catch (err) {
      console.error("Error fetching summaries:", err);
      setError("Failed to fetch upload summaries: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUploadForUser = (userId) => {
    const user = files.find(f => f.uploadDocId === userId);
    if (user) {
      setSelectedUser(user);
    }
  };
  
  // Download all files as ZIP
  const handleDownloadAllFiles = async (user) => {
    if (user.totalFiles === 0) {
      showStatus("No files to download for this user.", true);
      return;
    }

    setDownloadingAll(true);
    showStatus(`Preparing ${user.totalFiles} files for download...`);

    try {
      const zip = new JSZip();
      let downloadedCount = 0;

      // Create a folder for the user
      const userFolder = zip.folder(`${user.customerName}_${user.uploadDocId}`);

      // Download each file and add to zip
      for (const file of user.individualFiles) {
        try {
          const response = await fetch(file.downloadURL);
          const blob = await response.blob();
          userFolder.file(file.name, blob);
          downloadedCount++;
          
          // Update progress in status
          showStatus(`Downloaded ${downloadedCount}/${user.totalFiles} files...`);
        } catch (err) {
          console.error(`Failed to download ${file.name}:`, err);
        }
      }

      // Generate and download the zip file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `${user.customerName}_files_${Date.now()}.zip`);
      
      // Update download counts in Firestore
      const userDoc = doc(db, "uploadfile", user.uploadDocId);
      const snap = await getDoc(userDoc);
      const filesArray = snap.data().files || [];
      
      const updatedFiles = filesArray.map(f => ({
        ...f,
        downloads: (f.downloads || 0) + 1
      }));
      
      await updateDoc(userDoc, { files: updatedFiles });
      
      // Update local state
      fetchFiles();
      
      showStatus(`Successfully downloaded ${downloadedCount} files for ${user.customerName}.`);
    } catch (err) {
      console.error("Failed to create zip:", err);
      showStatus("Failed to download files: " + err.message, true);
    } finally {
      setDownloadingAll(false);
    }
  };
  
  // Handle delete all files
  const handleDeleteAllUserFiles = async (user) => {
    if (user.totalFiles === 0) {
      showStatus("No files to delete for this user.", true);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ALL ${user.totalFiles} files for ${user.customerName}? This action cannot be undone.`)) {
      return;
    }

    try {
      showStatus(`Deleting ${user.totalFiles} files for ${user.customerName}...`);

      // Delete each file from storage
      for (const file of user.individualFiles) {
        try {
          await deleteObject(ref(storage, file.storagePath));
        } catch (err) {
          console.error(`Failed to delete ${file.name} from storage:`, err);
        }
      }

      // Delete the document from Firestore
      const userDoc = doc(db, "uploadfile", user.uploadDocId);
      await updateDoc(userDoc, {
        files: []
      });

      // Update local state
      fetchFiles();
      setSelectedUser(null);
      
      showStatus(`Successfully deleted all files for ${user.customerName}.`);
    } catch (err) {
      console.error("Failed to delete user files:", err);
      showStatus("Failed to delete files: " + err.message, true);
    }
  };

  const filteredFiles = files.filter(
    (summary) =>
      summary.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      summary.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      summary.uploadDocId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAllFiles = allFilesList.filter(
    (file) =>
      file.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.uploadDocId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalFiles = files.reduce((sum, s) => sum + s.totalFiles, 0);
  const totalDownloads = files.reduce((sum, s) => sum + s.totalDownloads, 0);
  const totalSize = formatBytes(
    files.reduce((sum, s) => sum + s.rawTotalSize, 0)
  );

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <FiFileText className="w-6 h-6 mr-3 text-red-600" /> Global File
        Dashboard
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Files"
          value={totalFiles}
          icon={FiFileText}
          bgColor="bg-purple-600"
          iconColor="text-white"
        />
        <StatCard
          title="Total Size"
          value={totalSize}
          icon={FiUploadCloud}
          bgColor="bg-green-600"
          iconColor="text-white"
        />
        <StatCard
          title="Total Downloads"
          value={totalDownloads}
          icon={FiDownload}
          bgColor="bg-orange-600"
          iconColor="text-white"
        />
      </div>

      {/* View Toggle */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAllFiles(false)}
            className={`px-4 py-2 rounded-lg transition ${!showAllFiles ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            <FiUser className="inline w-4 h-4 mr-2" />
            User Summary
          </button>
          <button
            onClick={() => setShowAllFiles(true)}
            className={`px-4 py-2 rounded-lg transition ${showAllFiles ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            <FiFileText className="inline w-4 h-4 mr-2" />
            All Files ({totalFiles})
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {statusMessage && (
        <div
          className={`p-2 mt-2 rounded ${
            statusMessage.isError
              ? "bg-red-200 text-red-800"
              : "bg-green-200 text-green-800"
          }`}
        >
          {statusMessage.message}
        </div>
      )}
      {uploadError && (
        <div className="p-2 mt-2 rounded bg-red-200 text-red-800">
          {uploadError}
        </div>
      )}
      {error && (
        <div className="p-2 mt-2 rounded bg-red-200 text-red-800">
          Error: {error}
        </div>
      )}

      {/* Search */}
      <div className="my-4 relative">
        <FiSearch className="absolute left-3 top-3 text-gray-400" />
        <input
          className="border rounded w-full p-3 pl-10 focus:ring-purple-500 focus:border-purple-500"
          placeholder={showAllFiles ? "Search by File Name, Customer Name, or User ID" : "Search by Customer Name, Email, or User ID"}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* User Summary View */}
      {!showAllFiles && (
        <div className="overflow-x-auto mt-4 bg-white rounded shadow-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                {[
                  "Customer Name",
                  "Total Files",
                  "Total Size",
                  "Downloads",
                  "Last Upload",
                  "User ID",
                  "Actions",
                ].map((t) => (
                  <th
                    key={t}
                    className="px-4 py-3 text-left font-medium text-gray-600"
                  >
                    {t}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredFiles.length ? (
                filteredFiles.map((summary) => (
                  <tr
                    key={summary.uploadDocId}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 font-semibold">
                      {summary.customerName}
                    </td>
                    <td className="px-4 py-3">{summary.totalFiles}</td>
                    <td className="px-4 py-3">{summary.totalSize}</td>
                    <td className="px-4 py-3">{summary.totalDownloads}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {summary.latestUpload}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {summary.uploadDocId}
                    </td>

                    {/* ACTIONS */}
                    <td className="px-4 py-3 flex space-x-2">
                      <button
                        onClick={() => setSelectedUser(summary)}
                        className="p-2 bg-purple-500 hover:bg-purple-600 text-white rounded transition duration-150"
                        title="View Files"
                      >
                        <FiEye />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-6 text-gray-500">
                    No users found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* All Files Detailed View */}
      {showAllFiles && (
        <div className="overflow-x-auto mt-4 bg-white rounded shadow-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                {[
                  "File Name",
                  "Type",
                  "Size",
                  "Downloads",
                  "Customer",
                  "User ID",
                  "Uploaded At",
                  "Action",
                ].map((t) => (
                  <th
                    key={t}
                    className="px-4 py-3 text-left font-medium text-gray-600"
                  >
                    {t}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredAllFiles.length ? (
                filteredAllFiles.map((file) => (
                  <tr
                    key={`${file.uploadDocId}-${file.id}`}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 flex items-center">
                      {getFileIcon(file.type)}{" "}
                      <span className="ml-2 truncate max-w-xs">
                        {file.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {file.type.split('/')[1] || file.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatBytes(file.size)}</td>
                    <td className="px-4 py-3">{file.downloads}</td>
                    <td className="px-4 py-3 font-medium">
                      {file.customerName}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">
                      {file.uploadDocId}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {file.uploadedAt}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => triggerDownload(file.downloadURL, file.name)}
                        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition"
                        title="Download"
                      >
                        <FiDownload />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-6 text-gray-500">
                    No files found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-10 text-gray-600">
          <FiLoader className="w-6 h-6 animate-spin inline-block mr-2" />{" "}
          {showAllFiles ? "Loading Files..." : "Loading User Summaries..."}
        </div>
      )}

      {/* User Files Modal */}
      {selectedUser && (
        <UserFilesView
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpload={fetchFiles}
          onDownloadAll={() => handleDownloadAllFiles(selectedUser)}
          onDeleteAll={() => handleDeleteAllUserFiles(selectedUser)}
        />
      )}\
    </div>
  );
}