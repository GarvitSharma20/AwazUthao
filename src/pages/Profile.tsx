import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  where, 
  onSnapshot, 
  doc,
  updateDoc
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth, UserProfile } from "../hooks/useAuth";
import { upvoteIssue, Issue } from "../hooks/useIssues";
import { getSmartLocalLocation } from "../utils/locationHelper";
import IssueCard from "../components/IssueCard";
import { toast } from "react-hot-toast";
import UserReportsManager from "../components/UserReportsManager";
import { 
  LogOut, 
  Award, 
  Trophy, 
  FileText, 
  User as UserIcon, 
  Lock, 
  ChevronRight, 
  Loader2, 
  Sparkles, 
  MapPin,
  Flame,
  CheckCircle2,
  TrendingUp,
  Shield,
  Laptop,
  Smartphone,
  Trash2,
  ShieldAlert,
  Clock,
  Edit,
  X,
  Camera,
  HardHat,
  Briefcase,
  Star,
  Activity,
  Plus,
  Users
} from "lucide-react";

const DEPARTMENTS = [
  { id: "PWD", label: "PWD", emoji: "🛣️", desc: "Roads & Potholes" },
  { id: "Water", label: "Jal Sansthan", emoji: "💧", desc: "Water & Sewage" },
  { id: "NNSWM", label: "Nagar Nigam", emoji: "🗑️", desc: "Waste Management" },
  { id: "DVVNL", label: "DVVNL", emoji: "⚡", desc: "Power & Cables" },
  { id: "Horticulture", label: "Horticulture", emoji: "🌳", desc: "Parks & Trees" },
  { id: "General", label: "General", emoji: "🔧", desc: "Civil Repairs" },
];

interface BadgeType {
  id: string;
  name: string;
  description: string;
  emoji: string;
  condition: (user: UserProfile, myIssues: Issue[]) => boolean;
}

export default function Profile() {
  const navigate = useNavigate();
  const { user: authUser, loading: authLoading, signOutUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<UserProfile[]>([]);
  const [myIssues, setMyIssues] = useState<Issue[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  
  // Profile Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhotoURL, setEditPhotoURL] = useState("");
  const [editWards, setEditWards] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Inline Ward Edit states for Thekedar
  const [isEditingWardsInline, setIsEditingWardsInline] = useState(false);
  const [newWardInput, setNewWardInput] = useState("");

  // File Upload and Resizing
  const handleProfilePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Basic validation
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file.");
        return;
      }
      
      setIsUploadingPhoto(true);
      const loadingToast = toast.loading("Processing profile image... 📸");
      
      try {
        const compressedBase64 = await resizeAndCompressImage(file);
        setEditPhotoURL(compressedBase64);
        toast.success("Custom photo uploaded successfully! ✨", { id: loadingToast });
      } catch (err: any) {
        console.error("Error processing profile picture:", err);
        toast.error("Could not process image. Please try another one.", { id: loadingToast });
      } finally {
        setIsUploadingPhoto(false);
      }
    }
  };

  const resizeAndCompressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 250;
          const MAX_HEIGHT = 250;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.85); // 85% high quality JPEG
            resolve(dataUrl);
          } else {
            reject(new Error("Canvas context initialization failed"));
          }
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Profile Edit handlers
  const handleOpenEditModal = () => {
    if (profile) {
      setEditName(profile.name || "");
      setEditPhotoURL(profile.photoURL || "");
      setEditWards(profile.wards || "");
      setEditDepartment(profile.department || "General");
      setIsEditing(true);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("Full name cannot be blank.");
      return;
    }
    if (!authUser) return;

    setSavingProfile(true);
    try {
      const userDocRef = doc(db, "users", authUser.uid);
      const isThekedar = profile?.role === "thekedar";
      await updateDoc(userDocRef, {
        name: editName.trim(),
        photoURL: editPhotoURL.trim() || null,
        ...(isThekedar ? { wards: editWards.trim(), department: editDepartment } : {})
      });
      // Force local profile state update so user sees it right away
      setProfile(prev => prev ? { 
        ...prev, 
        name: editName.trim(), 
        photoURL: editPhotoURL.trim() || null,
        ...(isThekedar ? { wards: editWards.trim(), department: editDepartment } : {})
      } : null);
      toast.success("Profile updated successfully! ✨");
      setIsEditing(false);
    } catch (err: any) {
      console.error("Error updating profile:", err);
      toast.error("Failed to update profile. " + (err.message || ""));
    } finally {
      setSavingProfile(false);
    }
  };

  // Inline Ward Edit handlers for Thekedar
  const handleAddWardInline = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!profile || !authUser) return;
    const trimmedInput = newWardInput.trim();
    if (!trimmedInput) return;

    // Check if ward already exists (case-insensitive)
    const existingWards = profile.wards 
      ? profile.wards.split(",").map((w: string) => w.trim()).filter(Boolean)
      : [];

    if (existingWards.some((w: string) => w.toLowerCase() === trimmedInput.toLowerCase())) {
      toast.error(`Ward "${trimmedInput}" is already in your service list!`);
      return;
    }

    const updatedWardsList = [...existingWards, trimmedInput];
    const updatedWardsString = updatedWardsList.join(", ");

    try {
      const userDocRef = doc(db, "users", authUser.uid);
      await updateDoc(userDocRef, {
        wards: updatedWardsString
      });
      setProfile(prev => prev ? { ...prev, wards: updatedWardsString } : null);
      setEditWards(updatedWardsString);
      setNewWardInput("");
      toast.success(`Added ward: ${trimmedInput} 🚀`);
    } catch (error) {
      console.error("Error adding ward: ", error);
      toast.error("Failed to add ward. Please try again.");
    }
  };

  const handleDeleteWardInline = async (wardToDelete: string) => {
    if (!profile || !authUser) return;
    
    const existingWards = profile.wards 
      ? profile.wards.split(",").map((w: string) => w.trim()).filter(Boolean)
      : [];

    const updatedWardsList = existingWards.filter((w: string) => w !== wardToDelete);
    const updatedWardsString = updatedWardsList.join(", ");

    try {
      const userDocRef = doc(db, "users", authUser.uid);
      await updateDoc(userDocRef, {
        wards: updatedWardsString
      });
      setProfile(prev => prev ? { ...prev, wards: updatedWardsString } : null);
      setEditWards(updatedWardsString);
      toast.success(`Removed ward: ${wardToDelete}`);
    } catch (error) {
      console.error("Error deleting ward: ", error);
      toast.error("Failed to delete ward. Please try again.");
    }
  };

  // Revoke session handler
  const handleRevokeSession = async (sessionId: string) => {
    try {
      const sessionRef = doc(db, "sessions", sessionId);
      await updateDoc(sessionRef, {
        isActive: false,
        lastActive: new Date().toISOString()
      });
      toast.success("Session terminated successfully! 🛡️");
    } catch (err) {
      console.error(err);
      toast.error("Failed to terminate session.");
    }
  };

  // Level System Info helper
  const getLevelInfo = (points: number) => {
    if (points >= 500) {
      return { 
        name: "Ward Champion", 
        icon: "👑", 
        color: "#F59E0B", 
        bgColor: "bg-amber-50 border-amber-200 text-amber-700",
        next: null, 
        nextPoints: null 
      };
    }
    if (points >= 201) {
      return { 
        name: "Community Hero", 
        icon: "🦸", 
        color: "#8B5CF6", 
        bgColor: "bg-purple-50 border-purple-200 text-purple-700",
        next: "Ward Champion", 
        nextPoints: 500 
      };
    }
    if (points >= 51) {
      return { 
        name: "Active Citizen", 
        icon: "🏙️", 
        color: "#3B82F6", 
        bgColor: "bg-blue-50 border-blue-200 text-blue-700",
        next: "Community Hero", 
        nextPoints: 201 
      };
    }
    return { 
      name: "Civic Rookie", 
      icon: "🌱", 
      color: "#1D9E75", 
      bgColor: "bg-teal-50 border-teal-200 text-teal-700",
      next: "Active Citizen", 
      nextPoints: 51 
    };
  };

  // Define Badge definitions
  const badgeDefinitions: BadgeType[] = [
    {
      id: "first_step",
      name: "First Step",
      description: "Reported 1st civic issue",
      emoji: "🥇",
      condition: (u) => (u.issuesReported || 0) >= 1,
    },
    {
      id: "truth_teller",
      name: "Truth Teller",
      description: "Verified 5 community issues",
      emoji: "🔍",
      condition: (u) => (u.issuesVerified || 0) >= 5,
    },
    {
      id: "neighborhood_watch",
      name: "Neighborhood Watch",
      description: "Reported 10+ issues",
      emoji: "📸",
      condition: (u) => (u.issuesReported || 0) >= 10,
    },
    {
      id: "speed_reporter",
      name: "Speed Reporter",
      description: "Scanned and reported issues",
      emoji: "⚡",
      condition: (u) => (u.issuesReported || 0) >= 1,
    },
    {
      id: "problem_solver",
      name: "Problem Solver",
      description: "3 of your issues resolved",
      emoji: "🏅",
      condition: (u, issues) => {
        const resolved = issues.filter(issue => issue.status === "Resolved").length;
        return resolved >= 3;
      },
    },
    {
      id: "community_pillar",
      name: "Community Pillar",
      description: "Earned 500+ XP points",
      emoji: "👑",
      condition: (u) => (u.points || 0) >= 500,
    },
  ];

  const contractorBadgeDefinitions: BadgeType[] = [
    {
      id: "empaneled_partner",
      name: "Empaneled Partner",
      description: "Registered authorized contractor account",
      emoji: "📋",
      condition: (u) => u?.role === "thekedar",
    },
    {
      id: "groundbreaker",
      name: "Groundbreaker",
      description: "Assigned or started your first task",
      emoji: "🚜",
      condition: (u, issues) => issues.length >= 1,
    },
    {
      id: "restoration_expert",
      name: "Restoration Expert",
      description: "Successfully resolved first public grievance",
      emoji: "🔧",
      condition: (u, issues) => issues.filter(i => i.status === "Resolved").length >= 1,
    },
    {
      id: "sla_champion",
      name: "SLA Champion",
      description: "Completed 3+ dynamic resolutions on-site",
      emoji: "⏱️",
      condition: (u, issues) => issues.filter(i => i.status === "Resolved").length >= 3,
    },
    {
      id: "district_overseer",
      name: "District Overseer",
      description: "Active in 3+ service wards in your profile",
      emoji: "🗺️",
      condition: (u) => {
        const wardsCount = u?.wards 
          ? u.wards.split(",").map((w: string) => w.trim()).filter(Boolean).length 
          : 0;
        return wardsCount >= 3;
      },
    },
    {
      id: "municipal_veteran",
      name: "Municipal Veteran",
      description: "Completed 5+ issues or 10+ citizen upvotes",
      emoji: "🏆",
      condition: (u, issues) => {
        const resolved = issues.filter(i => i.status === "Resolved").length;
        const totalUpvotes = issues.reduce((acc, i) => acc + (i.upvotes || 0), 0);
        return resolved >= 5 || totalUpvotes >= 10;
      },
    }
  ];

  const [detectedCity, setDetectedCity] = useState("Agra");
  const [detectedState, setDetectedState] = useState("Uttar Pradesh");

  // Dynamic parser to extract City and State from a ward string or formatted address
  const parseCityFromWard = (wardStr: string) => {
    if (!wardStr) return null;
    const delimiters = ["•", ",", "-"];
    let parts: string[] = [wardStr];
    for (const delim of delimiters) {
      const nextParts: string[] = [];
      for (const p of parts) {
        nextParts.push(...p.split(delim));
      }
      parts = nextParts;
    }
    const cleanedParts = parts
      .map(p => p.trim())
      .filter(p => {
        const lower = p.toLowerCase();
        return (
          p.length > 0 &&
          !lower.startsWith("ward") &&
          !lower.startsWith("sector") &&
          !lower.startsWith("zone") &&
          !lower.startsWith("division") &&
          !lower.startsWith("india") &&
          lower !== "general"
        );
      });
    if (cleanedParts.length >= 2) {
      return {
        city: cleanedParts[0],
        state: cleanedParts[1]
      };
    } else if (cleanedParts.length === 1) {
      return {
        city: cleanedParts[0],
        state: null
      };
    }
    return null;
  };

  useEffect(() => {
    let active = true;

    // 1. Try to get city from loaded issues (highest priority since it determines work jurisdiction)
    if (myIssues.length > 0) {
      for (const issue of myIssues) {
        if (issue.ward) {
          const parsed = parseCityFromWard(issue.ward);
          if (parsed && parsed.city) {
            setDetectedCity(parsed.city);
            if (parsed.state) setDetectedState(parsed.state);
            return;
          }
        }
      }
    }

    // 2. Try to get city from local storage coords
    const savedLocation = localStorage.getItem("awaz_user_location");
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        if (Array.isArray(parsed) && parsed.length === 2) {
          const smartLoc = getSmartLocalLocation(parsed[0], parsed[1]);
          if (smartLoc && smartLoc.city) {
            setDetectedCity(smartLoc.city);
            if (smartLoc.state) setDetectedState(smartLoc.state);
            return;
          }
        }
      } catch (e) {}
    }

    // 3. Fallback to free IP location API lookup
    const detectIPLocation = async () => {
      try {
        const response = await fetch("https://freeipapi.com/api/json");
        if (response.ok && active) {
          const data = await response.json();
          if (data.cityName) {
            setDetectedCity(data.cityName);
            if (data.regionName) setDetectedState(data.regionName);
            return;
          }
        }
      } catch (e) {
        console.warn("FreeIPAPI failed on contractor profile:", e);
      }

      // Secondary IP lookup fallback
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (response.ok && active) {
          const data = await response.json();
          if (data.city) {
            setDetectedCity(data.city);
            if (data.region) setDetectedState(data.region);
          }
        }
      } catch (e) {
        console.warn("ipapi.co failed on contractor profile:", e);
      }
    };

    detectIPLocation();

    return () => {
      active = false;
    };
  }, [myIssues]);

  // Generates proper, culturally authentic municipal authority names dynamically
  const getMunicipalBodyName = (cityStr: string, stateStr: string) => {
    if (!cityStr) return "Municipal Corporation";
    const cleanedCity = cityStr.trim();
    const lowerCity = cleanedCity.toLowerCase();
    const lowerState = stateStr ? stateStr.trim().toLowerCase() : "";

    // Custom prominent Indian development / municipal exceptions
    if (lowerCity === "delhi" || lowerCity === "new delhi") return "Municipal Corporation of Delhi (MCD)";
    if (lowerCity === "mumbai" || lowerCity === "bombay") return "Brihanmumbai Municipal Corporation (BMC)";
    if (lowerCity === "bengaluru" || lowerCity === "bangalore") return "Bruhat Bengaluru Mahanagara Palike (BBMP)";
    if (lowerCity === "kolkata" || lowerCity === "calcutta") return "Kolkata Municipal Corporation (KMC)";
    if (lowerCity === "chennai" || lowerCity === "madras") return "Greater Chennai Corporation (GCC)";
    if (lowerCity === "hyderabad") return "Greater Hyderabad Municipal Corporation (GHMC)";
    if (lowerCity === "pune") return "Pune Municipal Corporation (PMC)";
    if (lowerCity === "noida") return "Noida Development Authority";
    if (lowerCity === "greater noida") return "Greater Noida Authority";
    if (lowerCity === "gurugram" || lowerCity === "gurgaon") return "Municipal Corporation of Gurugram (MCG)";
    if (lowerCity === "faridabad") return "Municipal Corporation of Faridabad (MCF)";
    if (lowerCity === "chandigarh") return "Municipal Corporation Chandigarh";

    // Hindi-speaking belt state matching: Uttar Pradesh, Bihar, Rajasthan, Madhya Pradesh, Uttarakhand, Chhattisgarh, Haryana, Jharkhand, Himachal Pradesh
    const isHindiBelt = 
      lowerState.includes("uttar pradesh") || 
      lowerState.includes("bihar") || 
      lowerState.includes("rajasthan") || 
      lowerState.includes("madhya pradesh") || 
      lowerState.includes("uttarakhand") || 
      lowerState.includes("chhattisgarh") || 
      lowerState.includes("haryana") || 
      lowerState.includes("jharkhand") || 
      lowerState.includes("himachal");

    if (isHindiBelt) {
      return `${cleanedCity} Nagar Nigam`;
    }

    return `${cleanedCity} Municipal Corporation`;
  };

  const getDepartmentLabel = (depKey: string) => {
    switch (depKey) {
      case "PWD":
        return "Public Works Department (PWD)";
      case "Water":
        return "Jal Sansthan (Water & Sewage)";
      case "NNSWM":
        return "Nagar Nigam Waste Management (NNSWM)";
      case "DVVNL":
        return "Power Corporation (DVVNL)";
      case "Horticulture":
        return "Horticulture Department";
      default:
        return "General / Civil Works";
    }
  };

  // 1. Sync User Profile in real-time
  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, "users", authUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      } else {
        setProfile(authUser);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error listening to user profile:", err);
      setProfile(authUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authUser]);

  // 2. Load Top 10 Leaderboard from Firestore
  useEffect(() => {
    if (authLoading || !authUser) {
      return;
    }

    const q = query(
      collection(db, "users")
    );

    const unsubscribe = onSnapshot(q, (querySnap) => {
      const list: UserProfile[] = [];
      querySnap.forEach((docSnap) => {
        list.push(docSnap.data() as UserProfile);
      });
      setLeaderboard(list);
      setLoadingLeaderboard(false);
    }, (err) => {
      console.error("Error loading leaderboard:", err);
      setLoadingLeaderboard(false);
    });

    return () => unsubscribe();
  }, [authUser, authLoading]);

  // 3. Load User's reported issues or Contractor's assigned issues
  useEffect(() => {
    if (!authUser || !profile) {
      setLoadingIssues(false);
      return;
    }

    const isThekedar = profile.role === "thekedar";
    const q = isThekedar 
      ? query(
          collection(db, "issues"),
          where("contractorId", "==", authUser.uid),
          orderBy("createdAt", "desc")
        )
      : query(
          collection(db, "issues"),
          where("reportedBy", "==", authUser.uid),
          orderBy("createdAt", "desc")
        );

    const unsubscribe = onSnapshot(q, (querySnap) => {
      const list: Issue[] = [];
      querySnap.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          title: data.title || "",
          description: data.description || "",
          category: data.category || "Pothole",
          severity: data.severity || "Medium",
          status: data.status || "Reported",
          location: data.location || { lat: 20.5937, lng: 78.9629 },
          ward: data.ward || "General",
          upvotes: data.upvotes || 0,
          upvotedBy: data.upvotedBy || [],
          verifiedBy: data.verifiedBy || [],
          reportedBy: data.reportedBy || "",
          reporterName: data.reporterName || "Anonymous",
          reporterPhoto: data.reporterPhoto,
          imageUrl: data.imageUrl,
          department: data.department || "Municipal Administration",
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      setMyIssues(list);
      setLoadingIssues(false);
    }, (err) => {
      console.error("Error loading issues for profile:", err);
      setLoadingIssues(false);
    });

    return () => unsubscribe();
  }, [authUser, profile]);

  // 4. Load Active Sessions from Firestore in real-time
  useEffect(() => {
    if (!authUser) {
      setLoadingSessions(false);
      return;
    }

    const q = query(
      collection(db, "sessions"),
      where("userId", "==", authUser.uid),
      where("isActive", "==", true)
    );

    const unsubscribe = onSnapshot(q, (querySnap) => {
      const list: any[] = [];
      querySnap.forEach((docSnap) => {
        list.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      // Sort client-side by lastActive desc
      list.sort((a, b) => {
        const timeA = new Date(a.lastActive || a.createdAt).getTime();
        const timeB = new Date(b.lastActive || b.createdAt).getTime();
        return timeB - timeA;
      });
      setSessions(list);
      setLoadingSessions(false);
    }, (err) => {
      console.error("Error loading user sessions:", err);
      setLoadingSessions(false);
    });

    return () => unsubscribe();
  }, [authUser]);

  // Handle local upvote triggers
  const handleUpvote = async (e: React.MouseEvent, issue: Issue) => {
    e.stopPropagation();
    if (!profile) return;
    try {
      await upvoteIssue(issue.id, profile.uid, issue.reportedBy, issue.title);
      toast.success("Issue upvoted!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to upvote");
    }
  };

  // Sign out user session
  const handleSignOut = async () => {
    try {
      await signOutUser();
      toast.success("Successfully logged out!");
      navigate("/login");
    } catch (err) {
      toast.error("Logout failed");
    }
  };

  // Click handler for gamified badges to show dynamic unlocking progress
  const handleBadgeClick = (badge: BadgeType) => {
    if (!profile) return;
    const isEarned = badge.condition(profile, myIssues);
    if (isEarned) {
      toast.success(`Unlocked! You have earned "${badge.name}"! ${badge.emoji}`, {
        duration: 3000,
        icon: badge.emoji,
      });
      return;
    }

    let message = "";
    if (badge.id === "first_step") {
      const remaining = 1 - (profile.issuesReported || 0);
      message = `Report ${remaining} more civic issue${remaining > 1 ? "s" : ""} to unlock "${badge.name}"!`;
    } else if (badge.id === "truth_teller") {
      const remaining = 5 - (profile.issuesVerified || 0);
      message = `Verify ${remaining} more community issue${remaining > 1 ? "s" : ""} to unlock "${badge.name}"!`;
    } else if (badge.id === "neighborhood_watch") {
      const remaining = 10 - (profile.issuesReported || 0);
      message = `Report ${remaining} more civic issue${remaining > 1 ? "s" : ""} to unlock "${badge.name}"!`;
    } else if (badge.id === "speed_reporter") {
      const remaining = 1 - (profile.issuesReported || 0);
      message = `Scan and report ${remaining} more issue to unlock "${badge.name}"!`;
    } else if (badge.id === "problem_solver") {
      const resolvedCount = myIssues.filter(i => i.status === "Resolved").length;
      const remaining = 3 - resolvedCount;
      message = `Have ${remaining} more of your reported issue${remaining > 1 ? "s" : ""} resolved by authorities to unlock "${badge.name}"!`;
    } else if (badge.id === "community_pillar") {
      const remaining = 500 - (profile.points || 0);
      message = `Earn ${remaining} more XP point${remaining > 1 ? "s" : ""} to unlock "${badge.name}"!`;
    } else {
      message = `Keep participating to unlock "${badge.name}"!`;
    }

    toast.error(message, {
      duration: 4000,
      icon: "🔒",
    });
  };

  const handleContractorBadgeClick = (badge: BadgeType) => {
    if (!profile) return;
    const isEarned = badge.condition(profile, myIssues);
    if (isEarned) {
      toast.success(`Unlocked! Certified "${badge.name}"! ${badge.emoji}`, {
        duration: 3000,
        icon: badge.emoji,
      });
      return;
    }

    let message = "";
    if (badge.id === "empaneled_partner") {
      message = `This badge is automatically unlocked upon registering your Contractor Desk account.`;
    } else if (badge.id === "groundbreaker") {
      const remaining = 1 - myIssues.length;
      message = `Be assigned or start at least ${remaining} task to unlock the "${badge.name}" certification.`;
    } else if (badge.id === "restoration_expert") {
      const resolvedCount = myIssues.filter(i => i.status === "Resolved").length;
      const remaining = 1 - resolvedCount;
      message = `Successfully resolve ${remaining} more public grievance${remaining > 1 ? "s" : ""} to unlock "${badge.name}".`;
    } else if (badge.id === "sla_champion") {
      const resolvedCount = myIssues.filter(i => i.status === "Resolved").length;
      const remaining = 3 - resolvedCount;
      message = `Resolve ${remaining} more on-site complaint${remaining > 1 ? "s" : ""} to achieve "${badge.name}" certification.`;
    } else if (badge.id === "district_overseer") {
      const wardsCount = profile.wards 
        ? profile.wards.split(",").map((w: string) => w.trim()).filter(Boolean).length 
        : 0;
      const remaining = 3 - wardsCount;
      message = `Add at least ${remaining} more service ward${remaining > 1 ? "s" : ""} in your profile section to unlock "${badge.name}".`;
    } else if (badge.id === "municipal_veteran") {
      const resolvedCount = myIssues.filter(i => i.status === "Resolved").length;
      const totalUpvotes = myIssues.reduce((acc, i) => acc + (i.upvotes || 0), 0);
      const remainingResolved = 5 - resolvedCount;
      const remainingUpvotes = 10 - totalUpvotes;
      message = `Complete ${remainingResolved} more resolved task${remainingResolved > 1 ? "s" : ""} or get ${remainingUpvotes} more citizen upvote${remainingUpvotes > 1 ? "s" : ""} to unlock the legendary "${badge.name}".`;
    } else {
      message = `Complete more high-quality municipal repairs to earn the "${badge.name}" seal.`;
    }

    toast.error(message, {
      duration: 4000,
      icon: "🔒",
    });
  };

  if (!authUser) {
    return (
      <div className="absolute inset-x-0 top-14 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <UserIcon className="w-12 h-12 text-slate-300 mb-2" />
        <h3 className="font-extrabold text-slate-700">Access Denied</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Please authenticate to access your profile.</p>
        <button
          onClick={() => navigate("/login")}
          className="mt-4 bg-primary text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md"
        >
          Sign In Now
        </button>
      </div>
    );
  }

  // Calculate current user's level info
  const activeUserPoints = profile?.points || 0;
  const levelInfo = getLevelInfo(activeUserPoints);

  // Compute progress bar width
  let progressPercentage = 100;
  if (levelInfo.nextPoints !== null) {
    progressPercentage = Math.min(100, Math.max(0, (activeUserPoints / levelInfo.nextPoints) * 100));
  }

  // Filter earned and locked badges
  const earnedBadgesCount = badgeDefinitions.filter(b => profile ? b.condition(profile, myIssues) : false).length;

  // Render a completely different profile page for "thekedar" (contractor)
  if (profile?.role === "thekedar") {
    const resolvedCount = myIssues.filter(i => i.status === "Resolved").length;
    const ongoingCount = myIssues.filter(i => i.status !== "Resolved" && i.status !== "Rejected").length;
    const totalUpvotes = myIssues.reduce((sum, issue) => sum + (issue.upvotes || 0), 0);
    const contractorEarnedBadgesCount = contractorBadgeDefinitions.filter(b => b.condition(profile, myIssues)).length;

    // Ward list dynamically parsed or edited
    const userWards = profile.wards 
      ? profile.wards.split(",").map(w => w.trim()).filter(Boolean)
      : [];

    return (
      <div className="absolute inset-x-0 top-14 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] flex flex-col bg-slate-100 font-sans overflow-y-auto animate-fade-in" id="contractor-profile-container">
        
        {/* 1. Header Area with Premium Slate/Industrial Gradient Banner */}
        <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-b-3xl pb-10 pt-6 px-4 text-white relative shrink-0 shadow-md">
          <div className="flex items-center space-x-4">
            
            {/* User Photo / Logo Avatar with HardHat overlay */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-2xl border-2 border-amber-500 overflow-hidden bg-slate-700 flex items-center justify-center font-black text-2xl shadow-inner">
                {profile?.photoURL ? (
                  <img 
                    src={profile.photoURL} 
                    alt={profile.name} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-amber-400">{profile?.name ? profile.name[0].toUpperCase() : "T"}</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-1 rounded-lg border border-slate-900 shadow-sm flex items-center justify-center">
                <HardHat className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Identity & Pill */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold truncate text-amber-400">
                  {profile?.name || "Verified Contractor"}
                </h2>
                <button 
                  onClick={handleOpenEditModal}
                  className="p-1 hover:bg-white/10 rounded-full transition-all text-amber-400 hover:text-amber-300 shrink-0 cursor-pointer"
                  title="Edit Profile"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-slate-300 text-[10px] font-semibold truncate leading-relaxed">
                {profile?.email}
              </p>
              
              {/* Contractor Verification & Status Pill */}
              <div className="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-1.5">
                <div className="inline-flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                  <Shield className="w-3 h-3 text-amber-500" />
                  <span>Verified • thekedar desk</span>
                </div>

                <button
                  onClick={async () => {
                    const newStatus = !profile?.isOnline;
                    try {
                      await updateDoc(doc(db, "users", profile.uid), { isOnline: newStatus });
                    } catch (e) {
                      console.error("Error updating online status:", e);
                    }
                  }}
                  className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border cursor-pointer select-none transition-all ${
                    profile?.isOnline 
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25" 
                      : "bg-slate-700/50 border-slate-600/50 text-slate-400 hover:bg-slate-600/50"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${profile?.isOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                  <span>{profile?.isOnline ? "Online (On Duty)" : "Offline (Off Duty)"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Work Jurisdiction Info */}
          <div className="mt-5 bg-slate-950/40 border border-slate-700/50 rounded-2xl p-3 flex flex-col gap-2.5 w-full">
            <div className="flex items-center space-x-2.5 w-full">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold shrink-0">
                🏛️
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[8px] font-black uppercase tracking-wider text-slate-400">Affiliation & Authority</span>
                <span className="block text-xs font-bold text-white truncate">
                  {getMunicipalBodyName(detectedCity, detectedState)}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2.5 w-full border-t border-slate-800/80 pt-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold shrink-0">
                🔧
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[8px] font-black uppercase tracking-wider text-slate-400">Specialist Department</span>
                <span className="block text-xs font-bold text-white truncate">
                  {getDepartmentLabel(profile?.department || "General")}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Overlapping Stat Cards Row (Industrial Slate/Amber Style) */}
        <div className="grid grid-cols-3 gap-2.5 px-4 -mt-6 relative z-10 shrink-0">
          
          {/* Resolved Works count */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-3 text-center shadow-xs animate-fade-in">
            <span className="block text-lg font-black text-emerald-600">
              {resolvedCount}
            </span>
            <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">
              Completed
            </span>
          </div>

          {/* Active Orders count */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-3 text-center shadow-xs animate-fade-in">
            <span className="block text-lg font-black text-amber-600">
              {ongoingCount}
            </span>
            <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">
              Ongoing
            </span>
          </div>

          {/* Public Appreciation Score */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-3 text-center shadow-xs animate-fade-in">
            <span className="block text-lg font-black text-[#0D6D59] flex items-center justify-center gap-0.5">
              <span>{totalUpvotes}</span>
            </span>
            <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider font-sans">
              Upvotes
            </span>
          </div>

        </div>

        {/* Main Stats and Lists Body */}
        <div className="p-4 space-y-5">
          
          {/* 🛠 * Contractor Active Work Desk Quick Link */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-sm flex items-center justify-between text-white">
            <div className="space-y-1">
              <h3 className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center space-x-1">
                <Briefcase className="w-4.5 h-4.5 text-amber-500" />
                <span>Contractor Active Work Desk</span>
              </h3>
              <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">
                Need to claim more public grievances or update your crew coordinates? Jump to your active contractor work dashboard.
              </p>
            </div>
            <button
              onClick={() => navigate("/")}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] py-2 px-3.5 rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center shrink-0 cursor-pointer whitespace-nowrap ml-3"
            >
              My Desk 🏗️
            </button>
          </div>

          {/* 4. Active Jurisdiction & Ward Pills */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span>Assigned Jurisdiction Wards</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingWardsInline(!isEditingWardsInline)}
                className="text-[9px] font-black text-amber-600 hover:text-amber-700 uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5 flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-3xs"
              >
                {isEditingWardsInline ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Done</span>
                  </>
                ) : (
                  <>
                    <Edit className="w-3 h-3" />
                    <span>Edit Wards</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3 shadow-3xs animate-fade-in">
              {/* Optional inline adding form */}
              {isEditingWardsInline && (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddWardInline();
                  }}
                  className="flex gap-2 pb-2 border-b border-slate-100"
                >
                  <input
                    type="text"
                    required
                    placeholder="Enter ward name to add..."
                    value={newWardInput}
                    onChange={(e) => setNewWardInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500 text-slate-800 placeholder-slate-400 bg-slate-50"
                  />
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] px-3 py-1.5 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </form>
              )}

              {userWards.length > 0 ? (
                <>
                  <p className="text-[10px] font-semibold text-slate-500 leading-relaxed">
                    {isEditingWardsInline 
                      ? "Manage your active service wards below. Click the (x) button on any ward to remove it from your profile."
                      : "Your agency is registered for municipal contract deployments and public grievance resolution in the following wards:"
                    }
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {userWards.map((ward, index) => (
                      <span 
                        key={index} 
                        className="inline-flex items-center space-x-1.5 bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-extrabold px-3 py-1.5 rounded-xl shadow-3xs"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{ward}</span>
                        {isEditingWardsInline && (
                          <button
                            type="button"
                            onClick={() => handleDeleteWardInline(ward)}
                            className="ml-1 text-slate-400 hover:text-red-500 p-0.5 rounded-full transition-colors cursor-pointer hover:bg-slate-100 flex items-center justify-center"
                            title={`Remove ${ward}`}
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-2 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
                    No service wards assigned or selected yet.
                  </p>
                  <div className="flex flex-col items-center gap-2">
                    {!isEditingWardsInline && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingWardsInline(true);
                        }}
                        className="inline-flex items-center space-x-1 text-[10px] font-black text-amber-600 hover:text-amber-700 underline cursor-pointer"
                      >
                        Add Service Wards Now ✏️
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 5. Completed & Assigned Work Orders Portfolio */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>Work Orders Portfolio</span>
              </h3>
              <span className="text-[9px] font-black bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                {myIssues.length} Orders
              </span>
            </div>

            <div className="space-y-2.5">
              {loadingIssues ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto mb-2" />
                  <p className="text-xs font-extrabold text-slate-500">Loading Agency Portfolio...</p>
                </div>
              ) : myIssues.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg mx-auto">📋</div>
                  <p className="text-xs font-black text-slate-600">No projects claimed yet</p>
                  <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                    Claim and resolve civic grievances from the home screen to build your civic restoration portfolio.
                  </p>
                </div>
              ) : (
                myIssues.map((issue) => (
                  <div 
                    key={issue.id}
                    onClick={() => navigate(`/issue/${issue.id}`)}
                    className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-3xs hover:border-slate-300 transition-all cursor-pointer active:scale-99 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">
                        #AWZ-{issue.id.substring(0, 6).toUpperCase()}
                      </span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        issue.status === "Resolved" 
                          ? "bg-emerald-50 border border-emerald-200 text-emerald-700" 
                          : issue.status === "In Progress" || issue.status === "Claimed"
                          ? "bg-amber-50 border border-amber-200 text-amber-700"
                          : "bg-red-50 border border-red-200 text-red-700"
                      }`}>
                        {issue.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-xs font-extrabold text-slate-800 line-clamp-1">
                        {issue.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium line-clamp-1">
                        {issue.category} • {issue.ward?.split(",")[0] || "General"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px] text-slate-400 font-bold">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
                      </span>
                      <span className="text-slate-400 flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>SLA Compliant</span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 🔐 Work Portal Sessions */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-1">
              <Lock className="w-4 h-4 text-slate-600" />
              <span>Agency Security Logs</span>
            </h3>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-3xs">
              <p className="text-[10px] font-semibold text-slate-500 leading-relaxed">
                Authorized work portal sessions currently active under this contractor license:
              </p>

              <div className="space-y-2">
                {loadingSessions ? (
                  <div className="py-4 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-amber-500 animate-spin mr-1.5" />
                    <span className="text-[10px] font-bold text-slate-400">Loading access credentials...</span>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="py-2 text-center text-xs font-bold text-slate-400">
                    No active sessions found.
                  </div>
                ) : (
                  sessions.map((sess) => {
                    const currentLocalSessId = localStorage.getItem("awaz_session_id") || localStorage.getItem("awazuthao_session_id");
                    const isCurrent = sess.id === currentLocalSessId;
                    const formattedTime = sess.lastActive ? new Date(sess.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Active Now";
                    
                    return (
                      <div 
                        key={sess.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isCurrent 
                            ? "bg-amber-50/30 border-amber-200/60 shadow-3xs" 
                            : "bg-slate-50 border-slate-100"
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          {/* Device Icon */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isCurrent ? "bg-amber-100 text-amber-800" : "bg-slate-200 text-slate-600"
                          }`}>
                            {sess.os?.toLowerCase().includes("windows") || sess.os?.toLowerCase().includes("mac") || sess.os?.toLowerCase().includes("linux") ? (
                              <Laptop className="w-4.5 h-4.5" />
                            ) : (
                              <Smartphone className="w-4.5 h-4.5" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5 flex-wrap">
                              <span>{sess.os || "Unknown Device"}</span>
                              {isCurrent && (
                                <span className="bg-amber-500 text-slate-900 font-black text-[8px] px-1.5 py-0.5 rounded-md uppercase tracking-wider scale-90 font-sans">
                                  Current
                                </span>
                              )}
                            </p>
                            <p className="text-[9px] font-semibold text-slate-500 truncate mt-0.5">
                              {sess.browser || "Unknown Browser"} • {sess.ipPlaceholder || "Authenticated"}
                            </p>
                            <p className="text-[8px] font-bold text-slate-400 flex items-center gap-0.5 mt-0.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Last active: {formattedTime}</span>
                            </p>
                          </div>
                        </div>

                        {/* Action Revoke Button */}
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(sess.id)}
                            title="Terminate session"
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer active:scale-90 shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* 5.5. Contractor Status Section (Online / Offline) */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <Users className="w-4 h-4 text-amber-500" />
              <span>👷 Contractor Duty Directory (Real-time)</span>
            </h3>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-3xs divide-y divide-slate-100 p-4 space-y-4">
              {loadingLeaderboard ? (
                <div className="py-8 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-amber-500 animate-spin mr-1.5" />
                  <span className="text-[11px] font-bold text-slate-400">Loading duty directory...</span>
                </div>
              ) : (() => {
                const contractors = leaderboard.filter(u => u.role === "thekedar");
                const onlineContractors = contractors.filter(c => c.isOnline === true);
                const offlineContractors = contractors.filter(c => !c.isOnline);

                if (contractors.length === 0) {
                  return (
                    <div className="py-6 text-center text-xs font-bold text-slate-400">
                      No registered contractors in directory yet.
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {/* Online Group */}
                    <div>
                      <div className="flex items-center space-x-1.5 mb-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                          Active & On-Duty ({onlineContractors.length})
                        </h4>
                      </div>
                      
                      {onlineContractors.length === 0 ? (
                        <p className="text-[10px] text-slate-400 font-semibold italic pl-3.5 py-1">
                          No contractors currently active.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 pl-1.5">
                          {onlineContractors.map((c) => {
                            const isCurrentUser = c.uid === profile?.uid;
                            return (
                              <div key={c.uid} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                                <div className="flex items-center space-x-2.5 min-w-0">
                                  {/* Avatar */}
                                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-500/20">
                                    {c.photoURL ? (
                                      <img src={c.photoURL} alt={c.name} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                                    ) : (
                                      <span>{c.name[0]?.toUpperCase() || "T"}</span>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center space-x-1.5">
                                      <span className="text-xs font-extrabold text-slate-800 truncate">{c.name}</span>
                                      {isCurrentUser && <span className="text-[7px] bg-emerald-500 text-white font-black px-1 rounded uppercase">YOU</span>}
                                    </div>
                                    <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tight">
                                      {c.department || "General"} • {c.city || "Unknown"}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="block text-[9px] font-black text-emerald-600 uppercase tracking-wider">● Online</span>
                                  <span className="block text-[8px] font-bold text-slate-400">{c.issuesSolved || 0} Solved</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Offline Group */}
                    <div>
                      <div className="flex items-center space-x-1.5 mb-2 border-t border-slate-100 pt-3">
                        <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          Offline & Standby ({offlineContractors.length})
                        </h4>
                      </div>
                      
                      {offlineContractors.length === 0 ? (
                        <p className="text-[10px] text-slate-400 font-semibold italic pl-3.5 py-1">
                          No inactive contractors.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 pl-1.5">
                          {offlineContractors.map((c) => {
                            const isCurrentUser = c.uid === profile?.uid;
                            return (
                              <div key={c.uid} className="flex items-center justify-between bg-slate-50/50 border border-slate-100/50 p-2.5 rounded-xl opacity-80">
                                <div className="flex items-center space-x-2.5 min-w-0">
                                  {/* Avatar */}
                                  <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                                    {c.photoURL ? (
                                      <img src={c.photoURL} alt={c.name} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                                    ) : (
                                      <span>{c.name[0]?.toUpperCase() || "T"}</span>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center space-x-1.5">
                                      <span className="text-xs font-bold text-slate-700 truncate">{c.name}</span>
                                      {isCurrentUser && <span className="text-[7px] bg-slate-400 text-white font-black px-1 rounded uppercase">YOU</span>}
                                    </div>
                                    <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tight">
                                      {c.department || "General"} • {c.city || "Unknown"}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Offline</span>
                                  <span className="block text-[8px] font-bold text-slate-400">{c.issuesSolved || 0} Solved</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 6. Sign Out Button Area */}
          <div className="pt-4 pb-8">
            <button
              onClick={handleSignOut}
              className="w-full border border-red-200 bg-red-50/50 text-red-600 hover:bg-red-50 hover:border-red-300 py-3.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-98 shadow-2xs"
              id="profile-signout-btn"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out From Contractor Desk</span>
            </button>
          </div>

        </div>

        {isEditing && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="edit-profile-modal">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-100 space-y-4 text-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
                  <span>Edit Agency Profile</span>
                </h3>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Contractor / Agency Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter agency name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors bg-slate-50 focus:bg-white text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Agency Photo URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/logo.jpg"
                    value={editPhotoURL}
                    onChange={(e) => setEditPhotoURL(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors bg-slate-50 focus:bg-white text-slate-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                    Assigned Service Wards (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Taj Ganj, Sanjay Place, Dayalbagh"
                    value={editWards}
                    onChange={(e) => setEditWards(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors bg-slate-50 focus:bg-white text-slate-800"
                  />
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-normal font-semibold">
                    💡 Separate multiple wards with a comma (,)
                  </p>
                </div>

                {profile?.role === "thekedar" && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      Work Department / Specialization
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {DEPARTMENTS.map((dept) => {
                        const isSelected = editDepartment === dept.id;
                        return (
                          <button
                            key={dept.id}
                            type="button"
                            onClick={() => setEditDepartment(dept.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between h-[64px] cursor-pointer ${
                              isSelected
                                ? "border-amber-500 bg-amber-500/10 text-amber-950 ring-1 ring-amber-500 shadow-xs"
                                : "border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50/30"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-base">{dept.emoji}</span>
                              {isSelected && (
                                <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[8px] font-black">
                                  ✓
                                </span>
                              )}
                            </div>
                            <div className="mt-1">
                              <span className="block text-[9px] font-black tracking-tight leading-none uppercase text-slate-900">
                                {dept.label}
                              </span>
                              <span className={`block text-[8px] mt-0.5 leading-none font-semibold ${isSelected ? "text-amber-800" : "text-slate-400"}`}>
                                {dept.desc}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 border border-slate-200 text-slate-500 font-bold py-2.5 px-4 rounded-xl text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile || !editName.trim()}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-slate-950 font-black py-2.5 px-4 rounded-xl text-xs shadow-xs hover:shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {savingProfile ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    );
  }

  return (
    <div className="absolute inset-x-0 top-14 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] flex flex-col bg-slate-50 font-sans overflow-y-auto animate-fade-in" id="profile-screen-container">
      
      {/* 1. Header Area with Teal Gradient Banner */}
      <div className="bg-gradient-to-b from-[#085041] to-[#0D6D59] rounded-b-3xl pb-10 pt-6 px-4 text-white relative shrink-0">
        <div className="flex items-center space-x-4">
          
          {/* User Photo / Initials Avatar */}
          <div className="w-14 h-14 rounded-full border-2 border-white/20 overflow-hidden bg-white/10 flex items-center justify-center font-black text-xl shadow-inner">
            {profile?.photoURL ? (
              <img 
                src={profile.photoURL} 
                alt={profile.name} 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <span>{profile?.name ? profile.name[0].toUpperCase() : "C"}</span>
            )}
          </div>

          {/* Identity & Pill */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-extrabold truncate">
                {profile?.name || "Citizen Reporter"}
              </h2>
              <button 
                onClick={handleOpenEditModal}
                className="p-1 hover:bg-white/15 rounded-full transition-all text-white/80 hover:text-white shrink-0 cursor-pointer"
                title="Edit Profile"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-white/75 text-[10px] font-medium truncate">
              {profile?.email || "anonymous@awazuthao.org"}
            </p>
            
            {/* Level Badge Pill */}
            <div className="flex items-center space-x-2 mt-1.5 flex-wrap gap-y-1.5">
              <div className="inline-flex items-center space-x-1.5 bg-white/25 border border-white/10 rounded-full px-2.5 py-0.5 text-[9px] font-extrabold text-white">
                <span>{profile?.role === "officer" ? "🏛️" : levelInfo.icon}</span>
                <span className="uppercase tracking-wider">
                  {profile?.role === "officer" ? `${profile.department || "Municipal Officer"} Desk` : levelInfo.name}
                </span>
              </div>

              {profile?.role === "officer" && (
                <button
                  onClick={async () => {
                    const newStatus = !profile?.isOnline;
                    try {
                      await updateDoc(doc(db, "users", profile.uid), { isOnline: newStatus });
                    } catch (e) {
                      console.error("Error updating online status:", e);
                    }
                  }}
                  className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border cursor-pointer select-none transition-all ${
                    profile?.isOnline 
                      ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30" 
                      : "bg-white/10 border-white/10 text-white/60 hover:bg-white/15"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${profile?.isOnline ? "bg-emerald-300 animate-pulse" : "bg-white/40"}`} />
                  <span>{profile?.isOnline ? "Online (On Duty)" : "Offline (Off Duty)"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Level XP Progress Slider Bar */}
        <div className="mt-5 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-extrabold text-white/90">
            <span>Leveling Progression</span>
            <span>{activeUserPoints} XP</span>
          </div>

          {/* Slider line */}
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-teal-300 rounded-full transition-all duration-500" 
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <p className="text-[9px] text-white/70 font-semibold italic text-right">
            {levelInfo.nextPoints 
              ? `${levelInfo.nextPoints - activeUserPoints} XP to next level (${levelInfo.next})` 
              : "🔥 Maximum Citizen Tier Reached!"}
          </p>
        </div>
      </div>

      {/* 2. Overlapping Stat Cards Row */}
      <div className="grid grid-cols-3 gap-2.5 px-4 -mt-6 relative z-10 shrink-0">
        
        {/* Reported Issues count */}
        <div className="bg-white rounded-xl border border-slate-100 p-3 text-center shadow-xs">
          <span className="block text-lg font-black text-[#0D6D59]">
            {profile?.issuesReported || 0}
          </span>
          <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
            Reported
          </span>
        </div>

        {/* Verified Issues count */}
        <div className="bg-white rounded-xl border border-slate-100 p-3 text-center shadow-xs">
          <span className="block text-lg font-black text-blue-600">
            {profile?.issuesVerified || 0}
          </span>
          <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
            Verified
          </span>
        </div>

        {/* Points Earned */}
        <div className="bg-white rounded-xl border border-slate-100 p-3 text-center shadow-xs">
          <span className="block text-lg font-black text-amber-500">
            {activeUserPoints}
          </span>
          <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
            Points
          </span>
        </div>

      </div>

      {/* Main Stats and Lists Body */}
      <div className="p-4 space-y-5">
        
        {/* 🛡️ Administrative Portal Redirect Quick-Link */}
        {(profile?.isAdmin || profile?.email === "admin@awazuthao.com" || profile?.email?.endsWith(".gov.in")) && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 shadow-3xs flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center space-x-1">
                <Shield className="w-4.5 h-4.5 text-emerald-700" />
                <span>Municipal Control Panel</span>
              </h3>
              <p className="text-[10px] text-emerald-600 font-semibold leading-relaxed">
                You are authenticated as an official admin. You can manage civic updates, broadcast official directives, and use AI analytics here.
              </p>
            </div>
            <button
              onClick={() => navigate("/admin")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] py-2 px-3 rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center shrink-0 cursor-pointer whitespace-nowrap ml-3"
            >
              Go to Portal ⚙️
            </button>
          </div>
        )}

        {/* 3. My Badges Grid */}
        {profile?.role !== "officer" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Award className="w-4 h-4 text-primary" />
                <span>My Achievements</span>
              </h3>
              <span className="text-[9px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                {earnedBadgesCount}/6 Earned
              </span>
            </div>

            {/* Badge cards grid */}
            <div className="grid grid-cols-3 gap-2">
              {badgeDefinitions.map((badge) => {
                const isEarned = profile ? badge.condition(profile, myIssues) : false;

                return (
                  <button 
                    key={badge.id}
                    onClick={() => handleBadgeClick(badge)}
                    className={`border rounded-xl p-2.5 text-center transition-all relative flex flex-col items-center justify-center cursor-pointer select-none duration-200 active:scale-95 ${
                      isEarned 
                        ? "bg-white border-slate-100 shadow-3xs hover:border-slate-200 hover:shadow-2xs hover:-translate-y-0.5" 
                        : "bg-slate-100/70 border-slate-200/50 opacity-70 hover:bg-slate-200/80"
                    }`}
                    id={`badge-card-${badge.id}`}
                    title={`${badge.name}: ${badge.description}`}
                  >
                    {/* Status Indicator */}
                    {!isEarned && (
                      <Lock className="w-3 h-3 text-slate-400 absolute top-1.5 right-1.5 animate-pulse" />
                    )}

                    <span className={`text-2xl mb-1 filter transition-transform duration-200 ${isEarned ? "drop-shadow-xs" : "grayscale opacity-50"}`}>
                      {badge.emoji}
                    </span>

                    <h4 className={`text-[10px] font-black leading-tight transition-colors duration-200 ${isEarned ? "text-slate-800 font-extrabold" : "text-slate-400 font-bold"}`}>
                      {badge.name}
                    </h4>
                    
                    <p className="text-[8px] text-slate-400 mt-0.5 leading-tight line-clamp-1 max-w-full">
                      {badge.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Leaderboard or Duty Directory Section */}
        <div className="space-y-2.5">
          {profile?.role === "officer" ? (
            <>
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-primary" />
                <span>🏛️ Municipal Officers Status (Real-time)</span>
              </h3>

              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden p-4 space-y-4 shadow-3xs">
                {loadingLeaderboard ? (
                  <div className="py-8 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-primary animate-spin mr-1.5" />
                    <span className="text-[11px] font-bold text-slate-400">Loading duty directory...</span>
                  </div>
                ) : (() => {
                  const officers = leaderboard.filter(u => u.role === "officer");
                  const onlineOfficers = officers.filter(o => o.isOnline === true);
                  const offlineOfficers = officers.filter(o => !o.isOnline);

                  if (officers.length === 0) {
                    return (
                      <div className="py-6 text-center text-xs font-bold text-slate-400">
                        No registered municipal officers in directory yet.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {/* Online Group */}
                      <div>
                        <div className="flex items-center space-x-1.5 mb-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                            On Duty ({onlineOfficers.length})
                          </h4>
                        </div>
                        
                        {onlineOfficers.length === 0 ? (
                          <p className="text-[10px] text-slate-400 font-semibold italic pl-3.5 py-1">
                            No officers currently on active duty.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-2 pl-1.5">
                            {onlineOfficers.map((o) => {
                              const isCurrentUser = o.uid === profile?.uid;
                              return (
                                <div key={o.uid} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                                  <div className="flex items-center space-x-2.5 min-w-0">
                                    {/* Avatar */}
                                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-500/20">
                                      {o.photoURL ? (
                                        <img src={o.photoURL} alt={o.name} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                                      ) : (
                                        <span>{o.name[0]?.toUpperCase() || "O"}</span>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center space-x-1.5">
                                        <span className="text-xs font-extrabold text-slate-800 truncate">{o.name}</span>
                                        {isCurrentUser && <span className="text-[7px] bg-primary text-white font-black px-1 rounded uppercase">YOU</span>}
                                      </div>
                                      <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tight">
                                        {o.department || "Municipal Desk"} • {o.city || "Unknown"}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="block text-[9px] font-black text-emerald-600 uppercase tracking-wider">● Online</span>
                                    <span className="block text-[8px] font-bold text-slate-400">{o.issuesSolved || 0} Solved</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Offline Group */}
                      <div>
                        <div className="flex items-center space-x-1.5 mb-2 border-t border-slate-100 pt-3">
                          <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Offline / Off Duty ({offlineOfficers.length})
                          </h4>
                        </div>
                        
                        {offlineOfficers.length === 0 ? (
                          <p className="text-[10px] text-slate-400 font-semibold italic pl-3.5 py-1">
                            No inactive officers.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-2 pl-1.5">
                            {offlineOfficers.map((o) => {
                              const isCurrentUser = o.uid === profile?.uid;
                              return (
                                <div key={o.uid} className="flex items-center justify-between bg-slate-50/50 border border-slate-100/50 p-2.5 rounded-xl opacity-80">
                                  <div className="flex items-center space-x-2.5 min-w-0">
                                    {/* Avatar */}
                                    <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0">
                                      {o.photoURL ? (
                                        <img src={o.photoURL} alt={o.name} className="w-full h-full object-cover rounded-lg" referrerPolicy="no-referrer" />
                                      ) : (
                                        <span>{o.name[0]?.toUpperCase() || "O"}</span>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center space-x-1.5">
                                        <span className="text-xs font-bold text-slate-700 truncate">{o.name}</span>
                                        {isCurrentUser && <span className="text-[7px] bg-slate-400 text-white font-black px-1 rounded uppercase">YOU</span>}
                                      </div>
                                      <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tight">
                                        {o.department || "Municipal Desk"} • {o.city || "Unknown"}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Offline</span>
                                    <span className="block text-[8px] font-bold text-slate-400">{o.issuesSolved || 0} Solved</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          ) : (
            <>
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                <Trophy className="w-4 h-4 text-amber-500" />
                <span>🏆 Citizen Ward Leaderboard</span>
              </h3>

              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs divide-y divide-slate-50">
                {loadingLeaderboard ? (
                  <div className="py-8 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-primary animate-spin mr-1.5" />
                    <span className="text-[11px] font-bold text-slate-400">Loading ranking statistics...</span>
                  </div>
                ) : (() => {
                  const displayLeaderboard = leaderboard
                    .filter(u => u.role !== "thekedar" && u.role !== "officer")
                    .sort((a, b) => (b.points || 0) - (a.points || 0))
                    .slice(0, 10);

                  if (displayLeaderboard.length === 0) {
                    return (
                      <div className="py-6 text-center text-xs font-bold text-slate-400">
                        No citizens yet. Start reporting to claim #1! 🏆
                      </div>
                    );
                  }

                  return displayLeaderboard.map((leader, index) => {
                    const rank = index + 1;
                    const isCurrentUser = leader.uid === profile?.uid;
                    const leaderLevel = getLevelInfo(leader.points || 0);

                    return (
                      <div 
                        key={leader.uid}
                        className={`flex items-center justify-between p-3 transition-colors ${
                          isCurrentUser ? "bg-teal-50/75 border-l-4 border-l-primary" : ""
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          
                          {/* Rank badge */}
                          <span className={`w-5 text-center text-xs font-black shrink-0 ${
                            rank === 1 ? "text-amber-500" : rank === 2 ? "text-slate-400" : rank === 3 ? "text-amber-700" : "text-slate-400"
                          }`}>
                            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                          </span>

                          {/* Photo / Initials */}
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-xs shrink-0">
                            {leader.photoURL ? (
                              <img src={leader.photoURL} alt={leader.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span>{leader.name[0]?.toUpperCase() || "C"}</span>
                            )}
                          </div>

                          {/* Name & tier info */}
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-slate-800 truncate flex items-center space-x-1">
                              <span>{leader.name}</span>
                              {isCurrentUser && <span className="text-[8px] bg-primary text-white font-extrabold px-1 rounded">YOU</span>}
                            </h4>
                            <span className={`text-[8px] font-extrabold px-1 rounded uppercase ${leaderLevel.bgColor}`}>
                              {leaderLevel.name}
                            </span>
                          </div>

                        </div>

                        <span className="text-xs font-black text-primary shrink-0">
                          {leader.points || 0} XP
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </>
          )}
        </div>

        {/* 5. My Reports History */}
        <UserReportsManager />

        {/* 🔐 Active Sessions & Device Security */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-1">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>Active Sessions & Device Security</span>
          </h3>

          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 shadow-3xs">
            <p className="text-[10px] font-semibold text-slate-500 leading-relaxed">
              These are devices and browsers that have logged into your AwazUthao account recently. You can revoke any session immediately.
            </p>

            <div className="space-y-2">
              {loadingSessions ? (
                <div className="py-4 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-primary animate-spin mr-1.5" />
                  <span className="text-[10px] font-bold text-slate-400">Loading active login credentials...</span>
                </div>
              ) : sessions.length === 0 ? (
                <div className="py-2 text-center text-xs font-bold text-slate-400">
                  No active sessions found.
                </div>
              ) : (
                sessions.map((sess) => {
                  const currentLocalSessId = localStorage.getItem("awazuthao_session_id");
                  const isCurrent = sess.id === currentLocalSessId;
                  const formattedTime = sess.lastActive ? new Date(sess.lastActive).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Active Now";
                  
                  return (
                    <div 
                      key={sess.id}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                        isCurrent 
                          ? "bg-teal-50/50 border-teal-100/80 shadow-3xs" 
                          : "bg-slate-50/50 border-slate-100"
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        {/* Device Icon */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isCurrent ? "bg-teal-100 text-teal-800" : "bg-slate-200/60 text-slate-600"
                        }`}>
                          {sess.os?.toLowerCase().includes("windows") || sess.os?.toLowerCase().includes("mac") || sess.os?.toLowerCase().includes("linux") ? (
                            <Laptop className="w-4.5 h-4.5" />
                          ) : (
                            <Smartphone className="w-4.5 h-4.5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5 flex-wrap">
                            <span>{sess.os || "Unknown Device"}</span>
                            {isCurrent && (
                              <span className="bg-teal-600 text-white font-black text-[8px] px-1.5 py-0.5 rounded-md uppercase tracking-wider scale-90">
                                This Device
                              </span>
                            )}
                          </p>
                          <p className="text-[9px] font-semibold text-slate-500 truncate mt-0.5">
                            {sess.browser || "Unknown Browser"} • {sess.ipPlaceholder || "Authenticated"}
                          </p>
                          <p className="text-[8px] font-bold text-slate-400 flex items-center gap-0.5 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>Last active: {formattedTime}</span>
                          </p>
                        </div>
                      </div>

                      {/* Action Revoke Button */}
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(sess.id)}
                          title="Terminate session"
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer active:scale-90 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 6. Sign Out Button Area */}
        <div className="pt-4 pb-8">
          <button
            onClick={handleSignOut}
            className="w-full border border-red-200 bg-red-50/50 text-red-600 hover:bg-red-50 hover:border-red-300 py-3.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center space-x-2 cursor-pointer transition-all active:scale-98 shadow-2xs"
            id="profile-signout-btn"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out From AwazUthao</span>
          </button>
        </div>

      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="edit-profile-modal">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl border border-slate-100 space-y-4 text-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span>Edit Profile Info</span>
              </h3>
              <button 
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors bg-slate-50 focus:bg-white text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Upload Custom Profile Pic
                </label>
                <div className="flex items-center space-x-3 bg-slate-50 border border-slate-200/80 p-3 rounded-xl">
                  {/* Preview avatar */}
                  <div className="w-12 h-12 rounded-full border-2 border-slate-200 overflow-hidden bg-white/50 flex items-center justify-center font-black text-base shrink-0 relative shadow-inner">
                    {editPhotoURL ? (
                      <img 
                        src={editPhotoURL} 
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="text-slate-400">{editName ? editName[0].toUpperCase() : "C"}</span>
                    )}
                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <label 
                      htmlFor="profile-upload-file-picker"
                      className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] py-1.5 px-3 rounded-lg cursor-pointer transition-all active:scale-95 shadow-3xs"
                    >
                      <Camera className="w-3 h-3" />
                      <span>{editPhotoURL ? "Change Photo" : "Upload Photo"}</span>
                    </label>
                    <input
                      type="file"
                      id="profile-upload-file-picker"
                      accept="image/*"
                      className="hidden"
                      onChange={handleProfilePhotoFileChange}
                      disabled={isUploadingPhoto}
                    />
                    <p className="text-[8px] text-slate-400 font-semibold leading-relaxed mt-1">
                      Supports JPG, PNG, WebP. Fits automatically.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Profile Photo URL (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/photo.jpg"
                  value={editPhotoURL}
                  onChange={(e) => setEditPhotoURL(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors bg-slate-50 focus:bg-white text-slate-800"
                />
                <p className="text-[9px] text-slate-400 leading-normal font-medium">
                  Provide an image link to set your custom avatar profile.
                </p>
              </div>

              {/* Preset Avatars for easy customization */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  Or Choose an Avatar Preset
                </label>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {[
                    "https://api.dicebear.com/7.x/adventurer/svg?seed=Lucky",
                    "https://api.dicebear.com/7.x/adventurer/svg?seed=Buddy",
                    "https://api.dicebear.com/7.x/adventurer/svg?seed=Missy",
                    "https://api.dicebear.com/7.x/adventurer/svg?seed=Cookie",
                    "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
                    "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka",
                    "https://api.dicebear.com/7.x/adventurer/svg?seed=Scooter"
                  ].map((presetUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEditPhotoURL(presetUrl)}
                      className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                        editPhotoURL === presetUrl ? "border-emerald-600 scale-110 shadow-md" : "border-transparent hover:scale-105"
                      }`}
                    >
                      <img src={presetUrl} alt="Preset avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 border border-slate-200 text-slate-500 font-bold py-2.5 px-4 rounded-xl text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile || !editName.trim()}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-xs hover:shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
