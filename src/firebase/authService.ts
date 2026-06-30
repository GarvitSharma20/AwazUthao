import { auth, db } from "./config";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

// 1. Log in an existing citizen
export const loginWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    throw new Error(error.message || "Failed to sign in. Please verify credentials.");
  }
};

// 2. Register a new citizen, contractor (thekedar), or municipal officer
export const registerWithEmail = async (
  email: string, 
  password: string, 
  name?: string, 
  role: "citizen" | "thekedar" | "officer" = "citizen", 
  wards?: string,
  department?: string,
  city?: string,
  state?: string
) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (name && user) {
      try {
        await updateProfile(user, { displayName: name });
      } catch (profileErr) {
        console.warn("Could not set displayName on Firebase Auth user:", profileErr);
      }
    }

    // Pre-create user document in Firestore to prevent "Citizen" fallback
    const isOfficer = role === "officer" || email === "admin@awazuthao.com" || email?.endsWith(".gov.in");
    const userDocRef = doc(db, "users", user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      name: name || (isOfficer ? "Municipal Officer" : role === "thekedar" ? "Contractor" : "Citizen"),
      email: email,
      photoURL: user.photoURL || null,
      points: 0,
      level: isOfficer ? "Municipal Officer" : role === "thekedar" ? "Authorized Contractor" : "Civic Rookie",
      badges: [],
      issuesReported: 0,
      issuesVerified: 0,
      isAdmin: !!isOfficer,
      role: isOfficer ? "officer" : role,
      ...(role === "thekedar" ? { 
        wards: wards || "", 
        department: department || "General",
        city: city || "Agra",
        state: state || "Uttar Pradesh"
      } : {}),
      ...(role === "officer" ? { 
        department: department || "SuperAdmin",
        city: city || "Agra",
        state: state || "Uttar Pradesh"
      } : {}),
      joinedAt: serverTimestamp()
    });

    return user;
  } catch (error: any) {
    throw new Error(error.message || "Registration failed. Try a stronger password.");
  }
};
