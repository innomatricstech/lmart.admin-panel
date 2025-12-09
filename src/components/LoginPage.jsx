import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBarChart2, FiLock, FiMail } from 'react-icons/fi';

import { db } from "../../firerbase";
import { collection, query, where, getDocs } from "firebase/firestore";

const PRIMARY_RED = "bg-gradient-to-r from-red-600 to-red-700";
const HOVER_RED = "hover:from-red-700 hover:to-red-800";
const LOGIN_BUTTON_CLASS = `${PRIMARY_RED} ${HOVER_RED} w-full p-3 rounded-lg text-white font-bold flex items-center justify-center transition-all duration-300 shadow-lg mt-4`;

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const q = query(
        collection(db, "admin"),
        where("email", "==", email),
        where("password", "==", password)
      );

      const result = await getDocs(q);

      if (!result.empty) {
        const docSnap = result.docs[0];
        const admin = docSnap.data();

        // Construct clean admin object
        const adminData = {
          uid: docSnap.id,
          name: admin.name,
          email: admin.email,
          password: admin.password,
          photoURL: admin.photoURL || null
        };

        // Save safely
        localStorage.setItem("adminUser", JSON.stringify(adminData));

        // Pass full data to App.js
        onLogin(adminData);

        navigate("/", { replace: true });
      } else {
        setError("Invalid email or password");
      }

    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8 border border-gray-200">
        
        <div className="text-center mb-8">
          <div className="inline-block p-4 rounded-full bg-red-600/10 border border-red-200 shadow-md">
            <FiBarChart2 className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-4">
            Admin Dashboard Login
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sign in to manage your inventory and orders
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@imart.in"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <button type="submit" className={LOGIN_BUTTON_CLASS} disabled={isLoading}>
            {isLoading ? "Loading..." : "Login"}
          </button>
        </form>

      </div>
    </div>
  );
}
