import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB-c_utKbHIt4064ipmByHhCe8JaTTXH2I",
  authDomain: "book-wizard-40dc2.firebaseapp.com",
  projectId: "book-wizard-40dc2",
  storageBucket: "book-wizard-40dc2.firebasestorage.app",
  messagingSenderId: "652532694457",
  appId: "1:652532694457:web:3f8a957103142265d50a68",
  measurementId: "G-N1YPL5M9H4"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);