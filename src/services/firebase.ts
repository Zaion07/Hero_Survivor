import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyABa1ep0-X6KlDsQD_8rxWkaN0_KDfQnz0",
  authDomain: "herosurvivor-f14bb.firebaseapp.com",
  projectId: "herosurvivor-f14bb",
  storageBucket: "herosurvivor-f14bb.firebasestorage.app",
  messagingSenderId: "422470393699",
  appId: "1:422470393699:web:6804ad50de7d250187bd56"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);