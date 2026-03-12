import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCkqI_8KPmGjCZzEWR4iHXxepopjsYzVV8",
    authDomain: "tcc-datacollection.firebaseapp.com",
    projectId: "tcc-datacollection",
    storageBucket: "tcc-datacollection.firebasestorage.app",
    messagingSenderId: "435430670849",
    appId: "1:435430670849:web:933180045bcde98db27600"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
export default app;
