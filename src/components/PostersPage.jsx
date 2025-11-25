// PostersPage.jsx
import React, { useState } from 'react';
import { FiImage, FiUploadCloud, FiDelete, FiXCircle } from 'react-icons/fi';

// --- Sample Data for Posters ---
const initialPosters = [
  { id: 1, title: 'Poster', date: '27/11/2025, 4:52 PM', imageUrl: 'https://via.placeholder.com/300x200?text=Poster+1' },
  { id: 2, title: 'Poster', date: '25/10/2025, 9:06 PM', imageUrl: '/mnt/data/dashboard_poster_example.jpg' }, // Placeholder for the actual image in the screenshot
  { id: 3, title: 'Poster', date: '14/10/2025, 11:25 AM', imageUrl: 'https://via.placeholder.com/300x200?text=Poster+3' },
  { id: 4, title: 'Poster', date: '14/10/2025, 11:25 AM', imageUrl: 'https://via.placeholder.com/300x200?text=Poster+4' },
];

export default function PostersPage() {
  const [posters, setPosters] = useState(initialPosters);
  const [posterTitle, setPosterTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  const handleAddPoster = (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Please select a file to upload.");
      return;
    }

    // Simulate upload and adding a new poster
    const newPoster = {
      id: Date.now(),
      title: posterTitle || 'Poster',
      date: new Date().toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }),
      imageUrl: URL.createObjectURL(selectedFile),
    };

    setPosters([newPoster, ...posters]);
    setPosterTitle('');
    setSelectedFile(null);
    document.getElementById('poster-file-upload').value = null; // Reset file input
  };

  const handleDeletePoster = (id) => {
    if (window.confirm("Are you sure you want to delete this poster?")) {
      setPosters(posters.filter(p => p.id !== id));
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 bg-gray-100 min-h-screen">
      <div className="posters-container bg-white rounded-lg shadow-xl p-6">

        {/* Header */}
        <div className="flex items-center pb-4 border-b border-gray-100 mb-6">
          <FiImage className="w-5 h-5 mr-2 text-red-600" />
          <h2 className="text-xl font-bold text-gray-800">Poster Manager</h2>
        </div>

        {/* --- Upload Form --- */}
        <form onSubmit={handleAddPoster} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="md:col-span-1">
            <label htmlFor="poster-title" className="block text-sm font-medium text-gray-700">
              Title (optional)
            </label>
            <input
              type="text"
              id="poster-title"
              placeholder="Poster title"
              value={posterTitle}
              onChange={(e) => setPosterTitle(e.target.value)}
              className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div className="md:col-span-2 flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Image</label>
            <input
              type="file"
              id="poster-file-upload"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <span className="text-sm text-gray-500 whitespace-nowrap">
              {selectedFile ? selectedFile.name : 'No file selected.'}
            </span>
          </div>

          <button
            type="submit"
            className="md:col-span-1 px-4 py-2 text-sm font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors shadow-md flex items-center justify-center"
            disabled={!selectedFile}
          >
            <FiUploadCloud className="w-4 h-4 mr-2" />
            Add Poster
          </button>
        </form>

        {/* --- Poster Gallery --- */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Posters ({posters.length})</h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {posters.length > 0 ? (
              posters.map((poster) => (
                <div key={poster.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden relative">
                  {/* Image */}
                  <img
                    src={poster.imageUrl}
                    alt={poster.title}
                    className="w-full h-36 object-cover"
                    onError={(e) => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/300x200?text=Image+Error'; }}
                  />

                  {/* Info */}
                  <div className="p-3 text-center">
                    <p className="font-semibold text-sm text-gray-800">{poster.title}</p>
                    <p className="text-xs text-gray-500 mb-3">{poster.date}</p>
                    
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeletePoster(poster.id)}
                      className="w-full flex items-center justify-center py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors shadow-sm"
                    >
                      <FiXCircle className="w-4 h-4 mr-1" />
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full p-8 text-center text-gray-500 border border-dashed rounded-lg">
                No posters have been uploaded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}