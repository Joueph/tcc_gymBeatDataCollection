import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, initializeAuth, type Auth, type Persistence } from "firebase/auth";
import * as FirebaseAuth from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

type FirebaseServices = {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
};

type FirebaseAuthWithReactNativePersistence = typeof FirebaseAuth & {
  getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
};

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let cachedServices: FirebaseServices | null = null;

export const isFirebaseConfigured = () =>
  Object.values(firebaseConfig).every((value) => typeof value === "string" && value.length > 0);

export const getFirebaseServices = (): FirebaseServices | null => {
  if (cachedServices) {
    return cachedServices;
  }

  if (!isFirebaseConfigured()) {
    return null;
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  let auth: Auth;

  try {
    const getReactNativePersistence = (FirebaseAuth as FirebaseAuthWithReactNativePersistence).getReactNativePersistence;

    if (!getReactNativePersistence) {
      throw new Error("React Native Firebase Auth persistence is unavailable in this environment.");
    }

    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(app);
  }

  cachedServices = {
    app,
    auth,
    db: getFirestore(app),
  };

  return cachedServices;
};
