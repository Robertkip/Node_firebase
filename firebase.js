import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAJiJ2vtDPrU09w7mLEwndj_Bjez4GaUno",
  authDomain: "do-not-resuscitate-me.firebaseapp.com",
  projectId: "do-not-resuscitate-me",
  storageBucket: "do-not-resuscitate-me.firebasestorage.app",
  messagingSenderId: "679305254244",
  appId: "1:679305254244:web:d9a1b3f775533d1abc5671"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

module.exports = { db }