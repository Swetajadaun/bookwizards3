import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDwW_sikqiizN9YB1pU6Gc2oUFjMcOh7qU",
    authDomain: "book-wizards-238ba.firebaseapp.com",
    projectId: "book-wizards-238ba",
    storageBucket: "book-wizards-238ba.firebasestorage.app",
    messagingSenderId: "386785728265",
    appId: "1:386785728265:web:ca8f3a247d59c8c93fe5d8",
    measurementId: "G-27K0J65RBH"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);