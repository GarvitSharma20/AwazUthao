import { useEffect, useState, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import UploadModal from "./UploadModal";
import { getOrCreateSessionId, clearLocalSession, parseUserAgent } from "../utils/sessionHelper";
import { doc, setDoc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { toast } from "react-hot-toast";

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const { user, loading, signOutUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/login");
      } else {
        // Contractor login restricted from normal citizen pages
        if (user.role === "thekedar") {
          const forbiddenForThekedar = ["/home", "/feed", "/report", "/admin"];
          if (forbiddenForThekedar.includes(currentPath)) {
            toast.error("Contractor access only. Redirected to Contractor Desk.");
            navigate("/contractor");
          }
        } else {
          const isEmailAdmin = user.isAdmin || user.email === "admin@awazuthao.com" || user.email?.endsWith(".gov.in") || user.role === "officer";
          if (isEmailAdmin) {
            // Authorized officers/admins are restricted to /admin and /profile only!
            const forbiddenForAdmin = ["/home", "/feed", "/report"];
            if (forbiddenForAdmin.includes(currentPath)) {
              navigate("/admin");
            }
          } else {
            // Citizen restricted from admin dashboard unless verified
            if (currentPath === "/admin") {
              toast.error("Access denied. Admin portal only.");
              navigate("/home");
            }
          }
        }
      }
    }
  }, [user, loading, currentPath, navigate]);

  // Session handling effect
  useEffect(() => {
    if (loading || !user) return;

    const sessionId = getOrCreateSessionId(user.uid);
    const sessionRef = doc(db, "sessions", sessionId);

    let unsubscribeSessionListener: (() => void) | null = null;

    const initSession = async () => {
      try {
        const parsedUA = parseUserAgent(navigator.userAgent);
        
        // Try to fetch session first
        const sessionDoc = await getDoc(sessionRef);
        
        if (!sessionDoc.exists() || !sessionDoc.data()?.isActive) {
          // Register a fresh active session
          await setDoc(sessionRef, {
            id: sessionId,
            userId: user.uid,
            userEmail: user.email,
            browser: parsedUA.browser,
            os: parsedUA.os,
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            isActive: true,
            ipPlaceholder: "Active Session"
          });
        } else {
          // Update last active time
          await updateDoc(sessionRef, {
            lastActive: new Date().toISOString()
          });
        }

        // Set up real-time listener to detect if this session is revoked
        unsubscribeSessionListener = onSnapshot(sessionRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.isActive === false) {
              // Session was revoked!
              toast.error("Security Alert: Your session was terminated.", {
                id: "session-revoked-toast",
                duration: 5000
              });
              clearLocalSession(user.uid);
              signOutUser();
              navigate("/login");
            }
          } else {
            // Document deleted
            toast.error("Security Alert: Session expired or cleared.", {
              id: "session-deleted-toast",
              duration: 5000
            });
            clearLocalSession(user.uid);
            signOutUser();
            navigate("/login");
          }
        }, (error) => {
          console.warn("Session listener terminated or permission denied:", error);
        });
      } catch (err) {
        console.error("Failed to initialize active session tracking:", err);
      }
    };

    initSession();

    // Setup periodic heartbeats to update session active status
    const heartbeatInterval = setInterval(() => {
      try {
        updateDoc(sessionRef, {
          lastActive: new Date().toISOString()
        });
      } catch (e) {
        console.warn("Heartbeat update failed", e);
      }
    }, 120000); // 2 minutes heartbeat

    return () => {
      if (unsubscribeSessionListener) {
        unsubscribeSessionListener();
      }
      clearInterval(heartbeatInterval);
    };
  }, [user, loading, signOutUser, navigate]);

  // Loading state with a simple stylish loading spinner
  if (loading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-primary/25 border-t-primary rounded-full animate-spin mb-3" />
        <p className="text-slate-500 font-medium text-sm">Synchronizing account...</p>
      </div>
    );
  }

  // If loading is done but no user is authenticated, render nothing while redirecting
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative font-sans antialiased overflow-x-hidden">
      {/* Dynamic Global Top Header */}
      <Navbar />

      {/* Main Page Canvas area */}
      <main className="flex-1 w-full max-w-md mx-auto pt-14 pb-24 px-4 box-border">
        {children}
      </main>

      {/* Dynamic Bottom Tab Bar */}
      <BottomNav />

      {/* Dynamic Overlay Upload Form Modal */}
      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </div>
  );
}
