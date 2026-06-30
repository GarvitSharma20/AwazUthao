import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  writeBatch, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  deleteDoc,
  getDoc
} from "firebase/firestore";
import { db } from "../firebase/config";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "upvote" | "verification" | "system" | "status" | "comment" | "welcome";
  relatedId?: string;
  read: boolean;
  createdAt: any;
}

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Notification[] = [];
      let unread = 0;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: docSnap.id,
          userId: data.userId || "",
          title: data.title || "",
          message: data.message || "",
          type: data.type || "system",
          relatedId: data.relatedId,
          read: !!data.read,
          createdAt: data.createdAt,
        });
        if (!data.read) {
          unread++;
        }
      });

      setNotifications(items);
      setUnreadCount(unread);
      setLoading(false);
    }, (error) => {
      console.error("Error subscribing to notifications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Session-based welcome or returning stats notification
  useEffect(() => {
    if (!userId) return;

    const checkAndNotifySession = async () => {
      try {
        const sessionKey = `awazuthao_session_notified_${userId}`;
        if (sessionStorage.getItem(sessionKey)) {
          return;
        }

        const userDocRef = doc(db, "users", userId);
        const userSnap = await getDoc(userDocRef);

        let welcomeSeeded = false;
        if (userSnap.exists()) {
          welcomeSeeded = !!userSnap.data().welcomeSeeded;
        }

        if (!welcomeSeeded) {
          // Brand new user session - show welcome notification
          await addDoc(collection(db, "notifications"), {
            userId,
            title: "Welcome to AwazUthao! 🏙️",
            message: "Thank you for joining AwazUthao. You can now report local issues, upvote other citizens' concerns, and help make your city better!",
            type: "welcome",
            read: false,
            createdAt: serverTimestamp()
          });

          // Update user doc with welcomeSeeded = true
          if (userSnap.exists()) {
            await updateDoc(userDocRef, { welcomeSeeded: true });
          }
          
          sessionStorage.setItem(sessionKey, "true");
        } else {
          // Returning user session - show progress update of issues
          const issuesSnap = await getDocs(collection(db, "issues"));
          let resolvedCount = 0;
          let inProgressCount = 0;
          let reportedCount = 0;

          issuesSnap.forEach((docSnap) => {
            const status = docSnap.data().status;
            if (status === "Resolved") {
              resolvedCount++;
            } else if (status === "In Progress") {
              inProgressCount++;
            } else {
              reportedCount++;
            }
          });

          // Send returning session notification
          await addDoc(collection(db, "notifications"), {
            userId,
            title: "City Progress Update! 📈",
            message: `Welcome back! Our community has resolved ${resolvedCount} issues, and ${inProgressCount} issues are currently under active care. Tap to view the latest updates!`,
            type: "system",
            read: false,
            createdAt: serverTimestamp()
          });

          sessionStorage.setItem(sessionKey, "true");
        }
      } catch (err) {
        console.error("Error in checkAndNotifySession:", err);
      }
    };

    checkAndNotifySession();
  }, [userId]);

  return { notifications, unreadCount, loading };
}

// Seed helper to give users an initial welcome notification
async function seedWelcomeNotification(userId: string) {
  try {
    const q = query(collection(db, "notifications"), where("userId", "==", userId));
    const snaps = await getDocs(q);
    if (snaps.empty) {
      await addDoc(collection(db, "notifications"), {
        userId,
        title: "Welcome to AwazUthao! 🏙️",
        message: "Thank you for joining AwazUthao. You can now report local issues, upvote other citizens' concerns, and help make your city better!",
        type: "welcome",
        read: false,
        createdAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.error("Failed to seed welcome notification:", err);
  }
}

// Function to trigger notifications from any part of the app
export async function sendNotification(
  userId: string,
  title: string,
  message: string,
  type: "upvote" | "verification" | "system" | "status" | "comment" | "welcome",
  relatedId?: string
) {
  try {
    // Avoid sending notifications to ourselves
    await addDoc(collection(db, "notifications"), {
      userId,
      title,
      message,
      type,
      relatedId: relatedId || null,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error("Error adding notification:", err);
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const docRef = doc(db, "notifications", notificationId);
    await updateDoc(docRef, { read: true });
  } catch (err) {
    console.error("Error marking notification as read:", err);
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("read", "==", false)
    );
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.update(docSnap.ref, { read: true });
    });
    await batch.commit();
  } catch (err) {
    console.error("Error marking all notifications as read:", err);
  }
}

export async function clearAllNotifications(userId: string) {
  try {
    const q = query(collection(db, "notifications"), where("userId", "==", userId));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error("Error clearing notifications:", err);
  }
}
