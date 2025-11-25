// BulkUploadPage.jsx
import React, { useState } from 'react';
import { FiUploadCloud, FiFileText, FiDownload, FiCheckCircle } from 'react-icons/fi';

export default function BulkUploadPage() {
  const [file, setFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const requiredFields = [
    "Product Name",
    "Category",
    "Subcategory",
    "Price",
    "Description",
    "Image URL (optional)"
  ];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragOver(true);
    } else if (e.type === "dragleave") {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (file) {
      alert(`Uploading file: ${file.name}`);
      // Add actual upload logic here (e.g., Axios post request)
      setFile(null); // Clear file after simulated upload
    } else {
      alert("Please select a file first.");
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
      <div className="bulk-upload-container bg-white rounded-lg shadow-xl p-6">

        {/* Header */}
        <div className="flex items-center pb-4 border-b border-gray-100 mb-6">
          <FiUploadCloud className="w-5 h-5 mr-2 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-800">Bulk Product Upload</h2>
        </div>

        <p className="text-gray-600 mb-6">
          Upload multiple products using **CSV or Excel files**.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Upload Section (Col 1 & 2) */}
          <div className="lg:col-span-2">
            <div 
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`p-10 border-4 border-dashed rounded-lg transition-colors duration-300 cursor-pointer ${
                isDragOver ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-white'
              }`}
            >
              <input
                type="file"
                id="bulk-upload-file"
                onChange={handleFileChange}
                className="hidden"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              />
              <label htmlFor="bulk-upload-file" className="flex flex-col items-center justify-center text-center space-y-3">
                <FiUploadCloud className={`w-12 h-12 ${isDragOver ? 'text-purple-600' : 'text-gray-400'}`} />
                <p className="text-sm font-semibold text-gray-700">
                  {file ? `File Selected: ${file.name}` : "Drop files here or click to upload"}
                </p>
                <p className="text-xs text-gray-500">
                  CSV or Excel file up to 10MB
                </p>
              </label>
            </div>

            <button
              onClick={handleUpload}
              className="w-full mt-4 p-4 text-lg font-semibold bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-lg transition-all shadow-lg"
              disabled={!file}
            >
              Upload Products
            </button>
          </div>

          {/* Template and Required Fields (Col 3) */}
          <div className="lg:col-span-1 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-md font-semibold text-blue-700 mb-3">Download Template</h3>
            <p className="text-sm text-blue-600 mb-4">
              Download our template to ensure your data is formatted correctly.
            </p>
            <div className="flex flex-col space-y-3 mb-6">
              <a 
                href="/templates/excel_template.xlsx" 
                download 
                className="px-4 py-2 text-sm font-semibold bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center justify-center shadow-md"
              >
                <FiDownload className="w-4 h-4 mr-2" />
                Download Excel Template
              </a>
              <a 
                href="/templates/csv_template.csv" 
                download 
                className="px-4 py-2 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center justify-center shadow-md"
              >
                <FiFileText className="w-4 h-4 mr-2" />
                Download CSV Template
              </a>
            </div>

            <h3 className="text-md font-semibold text-gray-700 mb-3 border-t pt-3">Required Fields:</h3>
            <ul className="space-y-2">
              {requiredFields.map((field) => (
                <li key={field} className="flex items-start text-sm text-gray-600">
                  <FiCheckCircle className="w-4 h-4 mr-2 mt-1 text-green-500 flex-shrink-0" />
                  {field}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}