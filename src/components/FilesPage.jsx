// FileDashboard.jsx
import React, { useState, useEffect, useRef } from 'react';
// 🛑 IMPORTANT: Update path to your Firebase config file
import { db, storage } from '../../firerbase'; 
import { 
  collection, getDocs, updateDoc, doc, arrayUnion, arrayRemove, getDoc, setDoc 
} from 'firebase/firestore'; 
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { 
  FiFileText, FiDownload, FiUploadCloud, FiDelete, FiSearch, FiXCircle, 
  FiAlertTriangle, FiLoader, FiEye, FiUser, FiImage, FiFile 
} from 'react-icons/fi';

// --- UTILITY FUNCTIONS EMBEDDED HERE (No external import needed) ---

/**
 * Gets a React Icon component based on file type.
 */
const getFileIcon = (fileType) => {
  const type = (fileType || '').toLowerCase();
   
  if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) {
   return <FiImage className="w-5 h-5 text-purple-600" />;
  } else if (type.includes('pdf')) {
   return <FiFileText className="w-5 h-5 text-red-600" />;
  } else {
    return <FiFile className="w-5 h-5 text-gray-600" />;
  }
};

/**
 * Formats file size in bytes into a human-readable string (KB, MB, GB).
 */
const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0 || bytes === null || typeof bytes !== 'number') return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
// --- END EMBEDDED UTILITY FUNCTIONS ---

// --- UTILITY COMPONENTS ---
const StatCard = ({ title, value, icon: Icon, bgColor, iconColor }) => (
  <div className={`p-4 rounded-xl shadow-lg flex items-center justify-between h-24 ${bgColor}`}>
    <div className="flex flex-col">
      <h3 className="text-sm font-semibold text-white/90">{title}</h3>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
    <Icon className={`w-8 h-8 ${iconColor}`} />
  </div>
);
// --------------------------------------------------------

// Assuming this is the component you referred to as 'FilesPage.jsx' in your App.jsx routes
export default function FileDashboard({ onSelectUser }) { 
  const [files, setFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [error, setError] = useState(null);

  // 🔑 Placeholder: Replace with the actual logged-in user's ID
  const currentUserId = 'USER_LOGGED_IN_12345'; 

  const fileInputRef = useRef(null);

  // --- Fetch All Files (Admin/Dashboard View) ---
  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      const filesCollectionRef = collection(db, 'uploadfile'); 
      const filesSnapshot = await getDocs(filesCollectionRef);
      
      const filesList = [];
      
      filesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const parentDocId = doc.id; 
          
          if (Array.isArray(data.files)) {
              data.files.forEach((file, index) => {
                  const uploadedDate = file.uploadedAt && file.uploadedAt.toDate 
                      ? file.uploadedAt.toDate().toLocaleDateString() 
                      : 'N/A';

                  filesList.push({
                      id: file.fileId || parentDocId + '-' + index, 
                      name: file.originalName || 'Unknown File',
                      type: file.fileType || 'N/A',
                      size: file.fileSize || 0, 
                      downloads: file.downloads || 0, 
                      uploaded: uploadedDate,
                      uploadDocId: parentDocId, 
                      storagePath: file.storagePath,
                      downloadURL: file.downloadURL,
                  });
              });
          }
      });

      setFiles(filesList);
      setError(null);
    } catch (err) {
      console.error("Firebase Fetch Error:", err);
      setError(`Failed to fetch files. Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []); 

  // --- UPLOAD HANDLER ---
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !currentUserId) {
        setUploadError("Missing file or user ID. Cannot upload.");
        return;
    }

    setUploading(true);
    setUploadError(null);
    const uniqueFileId = uuidv4();
    const storageRef = ref(storage, `uploadfile/${currentUserId}/${file.name}_${uniqueFileId}`);

    try {
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const fileMetadata = {
        fileId: uniqueFileId,
        originalName: file.name,
        fileType: file.type,
        fileSize: file.size,
        downloads: 0,
        uploadedAt: new Date(),
        storagePath: snapshot.ref.fullPath,
        downloadURL: downloadURL,
      };

      const docRef = doc(db, 'uploadfile', currentUserId);
      
      await updateDoc(docRef, {
        files: arrayUnion(fileMetadata)
      }).catch(async (e) => {
          // If update fails (doc might not exist), create it
          if (e.code === 'not-found' || e.message.includes('No document to update')) {
              await setDoc(docRef, {
                  customerId: currentUserId, 
                  customerName: 'System User', 
                  files: [fileMetadata],
                  createdAt: new Date(),
              });
          } else {
              throw e;
          }
      });

      alert(`File "${file.name}" uploaded successfully for user ${currentUserId}!`);
      await fetchFiles(); 

    } catch (err) {
      console.error("Upload Error:", err);
      setUploadError(`Failed to upload file: ${err.message}`);
    } finally {
      setUploading(false);
      event.target.value = null; 
    }
  };

  // --- DELETE HANDLER (Logic remains the same) ---
  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Are you sure you want to delete "${file.name}"? This will be permanently removed.`)) return;
    
    try {
      const docRef = doc(db, 'uploadfile', file.uploadDocId);
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists()) throw new Error("Parent document not found.");
      
      const docData = docSnapshot.data();
      const fileToRemove = docData.files.find(f => f.fileId === file.id);

      if (!fileToRemove) throw new Error("File entry not found in Firestore array.");
      
      // 1. Delete from Firebase Storage
      if (file.storagePath) {
        const storageFileRef = ref(storage, file.storagePath);
        await deleteObject(storageFileRef);
      } 

      // 2. Delete the entry from the Firestore document
      await updateDoc(docRef, {
        files: arrayRemove(fileToRemove)
      });
      
      alert(`File "${file.name}" deleted successfully!`);
      await fetchFiles(); 

    } catch (err) {
      console.error("Delete Error:", err);
      alert(`Failed to delete file: ${err.message}`);
    }
  };

  // --- DOWNLOAD HANDLER (Logic remains the same) ---
  const handleDownloadFile = async (file) => {
    if (!file.downloadURL) return alert("Error: Download URL not available.");
    
    try {
      const docRef = doc(db, 'uploadfile', file.uploadDocId);
      const docSnapshot = await getDoc(docRef);
      
      if (docSnapshot.exists()) {
          const filesArray = docSnapshot.data().files || [];
          const fileIndex = filesArray.findIndex(f => f.fileId === file.id);
          
          if (fileIndex !== -1) {
              const newFilesArray = [...filesArray];
              newFilesArray[fileIndex].downloads = (newFilesArray[fileIndex].downloads || 0) + 1;
              await updateDoc(docRef, { files: newFilesArray });
              await fetchFiles(); 
          }
      }
      window.open(file.downloadURL, '_blank');
    } catch (err) {
      console.error("Download Update Error:", err);
      window.open(file.downloadURL, '_blank');
      alert(`Could not update download count, but file will attempt to download: ${file.name}`);
    }
  };


  const totalFiles = files.length;
  const totalDownloads = files.reduce((sum, file) => sum + (file.downloads || 0), 0); 
  const totalSizeInBytes = files.reduce((sum, file) => sum + (file.size || 0), 0);
  const totalSize = formatBytes(totalSizeInBytes); 

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.uploadDocId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <FiFileText className="w-6 h-6 mr-3 text-red-600" /> Global File Dashboard ☁️
      </h2>
      
      {/* Summary Cards */}
      {!isLoading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <StatCard title="TOTAL FILES" value={totalFiles} icon={FiFileText} bgColor="bg-purple-600" iconColor="text-white/70" />
          <StatCard title="TOTAL SIZE" value={totalSize} icon={FiUploadCloud} bgColor="bg-green-600" iconColor="text-white/70" />
          <StatCard title="TOTAL DOWNLOADS" value={totalDownloads.toLocaleString()} icon={FiDownload} bgColor="bg-orange-600" iconColor="text-white/70" />
        </div>
      )}

      {/* Upload Section */}
      <div className="flex flex-col sm:flex-row justify-between items-center py-4 border-t border-b border-gray-100 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-2 sm:mb-0">
          Upload as User: <span className="text-purple-600 font-mono">{currentUserId || "N/A (Please Log In)"}</span>
        </h3>
        
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading || !currentUserId} />
        
        <button onClick={() => fileInputRef.current.click()} disabled={uploading || !currentUserId}
          className="px-4 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-md disabled:bg-purple-300 flex items-center"
        >
          <FiUploadCloud className="w-4 h-4 mr-2" /> {uploading ? 'Uploading...' : 'Choose File(s)'}
        </button>
      </div>

      {uploadError && <p className="text-red-500 text-sm mb-4 flex items-center"><FiAlertTriangle className="w-4 h-4 mr-1" /> {uploadError}</p>}
      {error && <p className="text-red-500 text-sm mb-4 flex items-center"><FiAlertTriangle className="w-4 h-4 mr-1" /> {error}</p>}


      {/* Search Bar */}
      <div className="mb-6 relative">
        <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Search by file name, type, or User ID..." value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-2/3 md:w-1/2 p-3 pl-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
        />
      </div>

      {/* Files Table */}
      {isLoading ? (
        <div className="text-center p-8 text-blue-500"><FiLoader className="w-6 h-6 inline mr-2 animate-spin" /> Loading files...</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['FILE NAME', 'TYPE', 'SIZE', 'DOWNLOADS', 'UPLOADED', 'OWNER (USER ID)', 'ACTIONS'].map(header => (
                  <th key={header} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredFiles.length > 0 ? (
                filteredFiles.map(file => (
                  <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-sm font-medium text-gray-900 flex items-center whitespace-nowrap">
                      {getFileIcon(file.type)} <span className="ml-2 truncate max-w-xs">{file.name}</span>
                    </td>
                    <td className="p-4 text-xs font-medium text-gray-600 whitespace-nowrap">{file.type || 'N/A'}</td>
                    <td className="p-4 text-xs text-gray-600 whitespace-nowrap">{formatBytes(file.size)}</td>
                    <td className="p-4 text-xs text-gray-600 whitespace-nowrap">{file.downloads}</td>
                    <td className="p-4 text-xs text-gray-500 whitespace-nowrap">{file.uploaded}</td>
                    <td className="p-4 text-xs text-gray-500 font-mono truncate max-w-xs" title={`User ID: ${file.uploadDocId}`}>
                      {file.uploadDocId}
                    </td>
                    <td className="p-4 flex space-x-2 whitespace-nowrap">
                      <button onClick={() => onSelectUser(file.uploadDocId)}
                        className="p-2 text-xs font-semibold bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors flex items-center" title="View User Details"
                      >
                          <FiEye className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDownloadFile(file)}
                        className="p-2 text-xs font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors flex items-center" title={`Download: ${file.name}`}
                      >
                        <FiDownload className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteFile(file)}
                        className="p-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded transition-colors flex items-center" title={`Delete: ${file.name}`}
                      >
                        <FiDelete className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="7" className="p-6 text-center text-gray-500">No files found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}