import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// 🔥 Credenziali fisse (senza import.meta.env)
const firebaseConfig = {
  apiKey: "AIzaSyCy3c4bz6n5H8nVBEf6LhAm3x_sjmTYLMg",
  authDomain: "puntigianna.firebaseapp.com",
  projectId: "puntigianna",
  storageBucket: "puntigianna.firebasestorage.app",
  messagingSenderId: "253672582551",
  appId: "1:253672582551:web:410a45267cb67fd62068d2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);