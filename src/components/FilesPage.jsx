// FilesPage.jsx
import React, { useState } from 'react';
import { 
  FiFileText, 
  FiDownload, 
  FiUploadCloud, 
  FiDelete, 
  FiImage, 
  FiFile, 
  FiSearch // <--- FIX: Added FiSearch
} from 'react-icons/fi';

// --- Sample Data for Files Table ---
const initialFilesData = [
  { id: 1, name: 'Generated Image September 28, 2025 - 6.47PM.png', type: 'PNG', size: '1.64 MB', downloads: 0, uploaded: '5/11/2025' },
  { id: 2, name: 'Q3_Sales_Report.pdf', type: 'PDF', size: '3.1 MB', downloads: 15, uploaded: '1/11/2025' },
  { id: 3, name: 'Website_Backup_10-25.zip', type: 'ZIP', size: '234 MB', downloads: 5, uploaded: '25/10/2025' },
  { id: 4, name: 'Product_Catalog_2026.xlsx', type: 'XLSX', size: '5.2 MB', downloads: 8, uploaded: '15/10/2025' },
  { id: 5, name: 'Dashboard_Mockup.jpg', type: 'JPG', size: '0.8 MB', downloads: 3, uploaded: '10/10/2025' },
];

// Component for the file stats summary cards
const StatCard = ({ title, value, icon: Icon, bgColor, iconColor }) => (
  <div className={`p-4 rounded-xl shadow-lg flex items-center justify-between h-24 ${bgColor}`}>
    <div className="flex flex-col">
      <h3 className="text-sm font-semibold text-white/90">{title}</h3>
      <p className="text-xl font-bold text-white">{value}</p>
    </div>
    <Icon className={`w-8 h-8 ${iconColor}`} />
  </div>
);

// Helper to determine icon based on file type
const getFileIcon = (fileType) => {
  switch (fileType.toLowerCase()) {
    case 'png':
    case 'jpg':
    case 'jpeg':
      return <FiImage className="w-5 h-5 text-purple-600" />;
    case 'pdf':
      return <FiFileText className="w-5 h-5 text-red-600" />;
    default:
      return <FiFile className="w-5 h-5 text-gray-600" />;
  }
};

export default function FilesPage() {
  const [files, setFiles] = useState(initialFilesData);
  const [searchTerm, setSearchTerm] = useState('');

  // Simple hardcoded stats for the cards, matching the screenshot's look
  const totalFiles = files.length;
  const totalSize = "NaN undefined"; 
  const downloads = "0"; 

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
      <div className="orders-container bg-white rounded-lg shadow-xl p-6">

        {/* Header */}
        <div className="flex items-center pb-4 border-b border-gray-100">
          <FiFileText className="w-5 h-5 mr-2 text-red-600" />
          <h2 className="text-xl font-bold text-gray-800">Files Dashboard</h2>
        </div>

        {/* --- 3 Summary Cards --- */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
          <StatCard
            title="TOTAL FILES"
            value={totalFiles}
            icon={FiFileText}
            bgColor="bg-purple-500"
            iconColor="text-white/70"
          />
          <StatCard
            title="TOTAL SIZE"
            value={totalSize}
            icon={FiUploadCloud}
            bgColor="bg-green-500"
            iconColor="text-white/70"
          />
          <StatCard
            title="DOWNLOADS"
            value={downloads}
            icon={FiDownload}
            bgColor="bg-orange-500"
            iconColor="text-white/70"
          />
        </div>

        {/* --- Recent Downloads Section --- */}
        <div className="mt-8">
          <div className="flex items-center justify-between pb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              Recent Downloads
            </h3>
            <button className="px-4 py-2 text-sm font-semibold bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-md flex items-center">
                <FiDownload className="w-4 h-4 mr-2" />
                Download History
            </button>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-sm mb-6">
            <div className="flex items-center font-semibold text-blue-700 mb-2">
              <FiDownload className="w-4 h-4 mr-2" />
              Files are downloaded to your browser's default download folder
            </div>
            <p className="text-blue-600 mb-3">
              Tip: You can change your browser's download settings to specify a custom folder
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-blue-600">
              <p>For Chrome: Settings → Advanced → Downloads → Location</p>
              <p>For Firefox: Settings → General → Files and Applications</p>
            </div>
          </div>
        </div>
        
        {/* --- Upload Files Section --- */}
        <div className="flex justify-between items-center py-4 border-t border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800">Upload Files</h3>
            <button className="px-4 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-md">
                Choose Files
            </button>
        </div>

        {/* --- All Files Table --- */}
        <div className="mt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">All Files ({totalFiles})</h3>
            
            {/* Search Bar for Files */}
            <div className="mb-4 relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by file name or type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-2/3 md:w-1/2 p-3 pl-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                />
            </div>


            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {['FILE', 'TYPE', 'SIZE', 'DOWNLOADS', 'UPLOADED', 'ACTIONS'].map(header => (
                                <th
                                    key={header}
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredFiles.length > 0 ? (
                            filteredFiles.map(file => (
                                <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                                    {/* FILE NAME */}
                                    <td className="p-4 text-sm font-medium text-gray-900 flex items-center">
                                        {getFileIcon(file.type)}
                                        <span className="ml-2">{file.name}</span>
                                    </td>

                                    {/* TYPE */}
                                    <td className="p-4 text-xs font-medium text-gray-600">
                                        {file.type}
                                    </td>

                                    {/* SIZE */}
                                    <td className="p-4 text-xs text-gray-600">
                                        {file.size}
                                    </td>

                                    {/* DOWNLOADS */}
                                    <td className="p-4 text-xs text-gray-600">
                                        {file.downloads}
                                    </td>

                                    {/* UPLOADED */}
                                    <td className="p-4 text-xs text-gray-500">
                                        {file.uploaded}
                                    </td>

                                    {/* ACTIONS */}
                                    <td className="p-4 flex space-x-2">
                                        <button 
                                            className="px-3 py-1 text-xs font-semibold bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                                        >
                                            <FiDownload className="w-4 h-4" />
                                        </button>
                                        <button 
                                            className="px-3 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                                        >
                                            <FiDelete className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="p-6 text-center text-gray-500">
                                    No files found matching your search term.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
}