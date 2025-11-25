// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// 1. Import the necessary function for Firestore
import { getFirestore } from "firebase/firestore";
// 4. ADD: Import the necessary function for Firebase Storage
import { getStorage } from "firebase/storage";
// 7. ADD: Import the necessary function for Firebase Authentication
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB10u72cOS9UgQFSXKx509PuCCl8kFbFZo",
  authDomain: "emart-ecommerce.firebaseapp.com",
  projectId: "emart-ecommerce",
  storageBucket: "emart-ecommerce.firebasestorage.app",
  messagingSenderId: "730402982718",
  appId: "1:730402982718:web:0258d0fb6e4c092554fa6f",
  measurementId: "G-SFHKTQVX9B"
};

// Initialize Firebase App and Analytics
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 2. Initialize Firestore and get a reference to the service
const db = getFirestore(app);

// 5. ADD: Initialize Firebase Storage and get a reference to the service
const storage = getStorage(app);

// 7. ADD: Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// 3. Export the 'db' variable so it can be used in Customer.jsx
// 6. ADD: Export the 'storage' variable so it can be used in AddProduct.jsx
// 8. ADD: Export the 'auth' variable so the user can be authenticated in components
export { db, storage, auth };