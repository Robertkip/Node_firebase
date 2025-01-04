import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAZsKuR3yXWhG_YsEaPpk5atfo0fJGvuPI",
  authDomain: "masterdemo-69bd6.firebaseapp.com",
  projectId: "masterdemo-69bd6",
  storageBucket: "masterdemo-69bd6.firebasestorage.app",
  messagingSenderId: "80988593799",
  appId: "1:80988593799:web:7230ad0c00527ef351e222",
  measurementId: "G-DWLVQX479Z"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

module.exports = { db }