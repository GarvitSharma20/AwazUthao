import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyA8DJX3wJ4IHrYG6VAxwdgBqTviYXdKlWI",
  authDomain: "gen-lang-client-0696602291.firebaseapp.com",
  projectId: "gen-lang-client-0696602291",
  storageBucket: "gen-lang-client-0696602291.firebasestorage.app",
  messagingSenderId: "524533956595",
  appId: "1:524533956595:web:a9bb66b22ce4e76541dc86",
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence/cache enabled
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, "ai-studio-209d48e7-d781-4f1d-af27-682494ef039a");

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
