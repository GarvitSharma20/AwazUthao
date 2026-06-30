import { useState, useEffect } from "react";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  doc, 
  updateDoc, 
  arrayUnion, 
  increment,
  serverTimestamp,
  getDocs
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { sendNotification } from "./useNotifications";
import { getSmartLocalLocation } from "../utils/locationHelper";

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: string; // Pothole, Garbage, Streetlight, Water, Road, etc.
  severity: "Critical" | "High" | "Medium" | "Resolved" | "In Progress"; 
  status: "Reported" | "In Progress" | "Resolved";
  location: {
    lat: number;
    lng: number;
  };
  ward: string;
  upvotes: number;
  upvotedBy: string[];
  verifiedBy: string[];
  reportedBy: string;
  reporterName: string;
  reporterPhoto?: string;
  imageUrl?: string;
  department: string;
  assignedOfficer?: string;
  resolvedAt?: any;
  createdAt: any;
  updatedAt: any;
  comments?: any[];
  contractorId?: string;
  contractorName?: string;
  contractorResponsibility?: string;
  budget?: number;
  deadline?: string;
  workOrderInstructions?: string;
  thekedarNotes?: string;
  thekedarPhotoUrl?: string;
  workOrderStatus?: "Assigned" | "In Progress" | "Under Verification" | "Approved";
  citizenRating?: number;
  citizenFeedback?: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// No seed issues. Fully database-driven only.

export function useIssues() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "issues"), orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const issuesList: Issue[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Skip mock seeded issues on client side to keep active feed completely free of static records
        if (data.reportedBy && (data.reportedBy.startsWith("mock_") || data.reportedBy === "mock_reporter")) {
          return;
        }
        const rawLoc = data.location;
        let parsedLoc = { lat: 20.5937, lng: 78.9629 };
        if (rawLoc) {
          const lat = typeof rawLoc.lat === "number" ? rawLoc.lat : typeof rawLoc.latitude === "number" ? rawLoc.latitude : 20.5937;
          const lng = typeof rawLoc.lng === "number" ? rawLoc.lng : typeof rawLoc.longitude === "number" ? rawLoc.longitude : 78.9629;
          parsedLoc = { lat, lng };
        }

        let finalWard = data.ward || "General";
        if (finalWard === "Ward 12 (Taj Ganj)" || finalWard.startsWith("Ward 12 (Taj Ganj)")) {
          const smartLoc = getSmartLocalLocation(parsedLoc.lat, parsedLoc.lng);
          finalWard = smartLoc.formattedAddress;
        }

        issuesList.push({
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          category: data.category || "Pothole",
          severity: data.severity || "Medium",
          status: data.status || "Reported",
          location: parsedLoc,
          ward: finalWard,
          upvotes: data.upvotes || 0,
          upvotedBy: data.upvotedBy || [],
          verifiedBy: data.verifiedBy || [],
          reportedBy: data.reportedBy || "",
          reporterName: data.reporterName || "Anonymous",
          reporterPhoto: data.reporterPhoto,
          imageUrl: data.imageUrl,
          department: data.department || "Municipal Administration",
          assignedOfficer: data.assignedOfficer,
          resolvedAt: data.resolvedAt,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          comments: data.comments || [],
          contractorId: data.contractorId,
          contractorName: data.contractorName,
          contractorResponsibility: data.contractorResponsibility,
          budget: data.budget,
          deadline: data.deadline,
          workOrderInstructions: data.workOrderInstructions,
          thekedarNotes: data.thekedarNotes,
          thekedarPhotoUrl: data.thekedarPhotoUrl,
          workOrderStatus: data.workOrderStatus,
          citizenRating: data.citizenRating,
          citizenFeedback: data.citizenFeedback,
        });
      });
      setIssues(issuesList);
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
      handleFirestoreError(err, OperationType.LIST, "issues");
    });

    return () => unsubscribe();
  }, []);

  return { issues, loading, error };
}

export async function submitIssue(
  data: Omit<Issue, "id" | "upvotes" | "upvotedBy" | "verifiedBy" | "createdAt" | "updatedAt">,
  user: { uid: string; name: string; photoURL?: string | null }
) {
  try {
    const docRef = await addDoc(collection(db, "issues"), {
      ...data,
      upvotes: 0,
      upvotedBy: [],
      verifiedBy: [],
      reportedBy: user.uid,
      reporterName: user.name,
      reporterPhoto: user.photoURL || undefined,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, "issues");
  }
}

export async function upvoteIssue(issueId: string, userId: string, reporterId?: string, issueTitle?: string) {
  try {
    const issueRef = doc(db, "issues", issueId);
    await updateDoc(issueRef, {
      upvotes: increment(1),
      upvotedBy: arrayUnion(userId),
      updatedAt: serverTimestamp()
    });

    if (reporterId && userId !== reporterId) {
      await sendNotification(
        reporterId,
        "Issue Upvoted! 👍",
        `Your reported issue "${issueTitle || "unnamed"}" received upvote support!`,
        "upvote",
        issueId
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `issues/${issueId}`);
  }
}

export async function verifyIssue(issueId: string, userId: string, reporterId?: string, issueTitle?: string) {
  try {
    const issueRef = doc(db, "issues", issueId);
    await updateDoc(issueRef, {
      verifiedBy: arrayUnion(userId),
      updatedAt: serverTimestamp()
    });

    if (reporterId && userId !== reporterId) {
      await sendNotification(
        reporterId,
        "Issue Verified! 🛡️",
        `Your reported issue "${issueTitle || "unnamed"}" has been verified by another citizen!`,
        "verification",
        issueId
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `issues/${issueId}`);
  }
}
