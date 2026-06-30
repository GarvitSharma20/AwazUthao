import { useState, useEffect } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User as FirebaseUser 
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, updateDoc, onSnapshot } from "firebase/firestore";
import { auth, db, googleProvider } from "../firebase/config";

export interface UserProfile {
  uid: string;
  name: string;
  email: string | null;
  photoURL: string | null;
  points: number;
  level: string;
  badges: string[];
  issuesReported: number;
  issuesVerified: number;
  isAdmin: boolean;
  role?: "citizen" | "officer" | "thekedar";
  wards?: string;
  department?: string;
  city?: string;
  state?: string;
  joinedAt?: any;
  isOnline?: boolean;
  lastActive?: any;
}

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      // Clean up previous subscription
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      if (firebaseUser) {
        setLoading(true);
        const userDocRef = doc(db, "users", firebaseUser.uid);

        unsubscribeFirestore = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            const isEmailAdmin = firebaseUser.email === "admin@awazuthao.com" || firebaseUser.email?.endsWith(".gov.in");
            let needsUpdate = false;
            const updatePayload: any = {};

            if (isEmailAdmin && !data.isAdmin) {
              updatePayload.isAdmin = true;
              needsUpdate = true;
            }

            if ((data.role === "thekedar" || data.role === "officer") && !data.isOnline) {
              updatePayload.isOnline = true;
              needsUpdate = true;
            }

            if (needsUpdate) {
              try {
                await updateDoc(userDocRef, updatePayload);
              } catch (e) {
                console.warn("Could not update user snapshot flags:", e);
              }
            }

            setUser({ ...data, ...updatePayload, uid: firebaseUser.uid });
            setLoading(false);
          } else {
            // Document doesn't exist, create it with initial profile values
            const isEmailAdmin = firebaseUser.email === "admin@awazuthao.com" || firebaseUser.email?.endsWith(".gov.in");
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || (isEmailAdmin ? "Municipal Administrator" : "Citizen"),
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL,
              points: 0,
              level: isEmailAdmin ? "Administrator" : "Civic Rookie",
              badges: [],
              issuesReported: 0,
              issuesVerified: 0,
              isAdmin: !!isEmailAdmin,
              role: isEmailAdmin ? "officer" : "citizen",
            };

            try {
              await setDoc(userDocRef, {
                ...newProfile,
                joinedAt: serverTimestamp(),
              });
            } catch (error) {
              console.error("Error setting up user profile in Firestore:", error);
            }
            // onSnapshot will handle setting user state once the document is created
          }
        }, (error) => {
          console.error("Error in profile snapshot listener:", error);
          const isEmailAdmin = firebaseUser.email === "admin@awazuthao.com" || firebaseUser.email?.endsWith(".gov.in");
          setUser({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || (isEmailAdmin ? "Municipal Administrator" : "Citizen"),
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL,
            points: 0,
            level: isEmailAdmin ? "Administrator" : "Civic Rookie",
            badges: [],
            issuesReported: 0,
            issuesVerified: 0,
            isAdmin: !!isEmailAdmin,
          });
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
      }
    };
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error("Google Sign-In failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOutUser = async () => {
    setLoading(true);
    try {
      if (user?.uid && (user.role === "thekedar" || user.role === "officer")) {
        const userDocRef = doc(db, "users", user.uid);
        try {
          await updateDoc(userDocRef, { isOnline: false });
        } catch (e) {
          console.warn("Could not set user offline during sign out:", e);
        }
      }

      const sessionId = localStorage.getItem("awazuthao_session_id");
      if (sessionId) {
        const sessionRef = doc(db, "sessions", sessionId);
        try {
          await updateDoc(sessionRef, {
            isActive: false,
            lastActive: new Date().toISOString()
          });
        } catch (e) {
          console.warn("Could not mark session inactive in DB", e);
        }
        localStorage.removeItem("awazuthao_session_id");
      }
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Sign-Out failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    signInWithGoogle,
    signOutUser,
  };
}
