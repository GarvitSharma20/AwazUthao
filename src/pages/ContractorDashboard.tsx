import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { 
  Briefcase, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  IndianRupee, 
  Star, 
  LogOut, 
  Camera, 
  FileText, 
  Send, 
  Calendar, 
  AlertTriangle,
  Play,
  CheckCircle,
  TrendingUp,
  HardHat,
  X,
  Sparkles,
  RefreshCw,
  Users,
  ChevronRight,
  Info
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useIssues, Issue } from "../hooks/useIssues";
import { doc, updateDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { db } from "../firebase/config";
import { sendNotification } from "../hooks/useNotifications";
import BottomNav from "../components/BottomNav";
import { getSmartLocalLocation } from "../utils/locationHelper";

export default function ContractorDashboard() {
  const { user, loading: authLoading, signOutUser } = useAuth();
  const { issues, loading: issuesLoading } = useIssues();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/login");
      } else if (user.role !== "thekedar") {
        toast.error("Unauthorized. Only municipal contractors can access the Contractor Desk!");
        navigate("/home");
      }
    }
  }, [user, authLoading, navigate]);

  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "completed">("all");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [progressNotes, setProgressNotes] = useState("");
  const [workPhoto, setWorkPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // Filter issues assigned to this specific contractor
  const contractorIssues = issues.filter(
    (issue) => (issue as any).contractorId === user?.uid
  );

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

    // 1. Try to get city from assigned issues (highest priority since it determines work jurisdiction)
    if (contractorIssues.length > 0) {
      for (const issue of contractorIssues) {
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
        console.warn("FreeIPAPI failed on contractor desk:", e);
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
        console.warn("ipapi.co failed on contractor desk:", e);
      }
    };

    detectIPLocation();

    return () => {
      active = false;
    };
  }, [contractorIssues]);

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
      // Typically major cities are "Nagar Nigam", smaller are "Nagar Palika" or "Nagar Panchayat"
      return `${cleanedCity} Nagar Nigam`;
    }

    // Default to dynamic English naming convention used across India
    return `${cleanedCity} Municipal Corporation`;
  };

  // Statistics calculation
  const stats = {
    assigned: contractorIssues.filter((i) => i.status === "Reported" || (i as any).workOrderStatus === "Assigned").length,
    inProgress: contractorIssues.filter((i) => i.status === "In Progress" && (i as any).workOrderStatus === "In Progress").length,
    completed: contractorIssues.filter((i) => (i as any).workOrderStatus === "Under Verification").length,
    resolved: contractorIssues.filter((i) => i.status === "Resolved" && (i as any).workOrderStatus === "Approved").length,
    avgRating: (() => {
      const ratedIssues = contractorIssues.filter((i) => (i as any).citizenRating);
      if (ratedIssues.length === 0) return 0;
      const sum = ratedIssues.reduce((acc, i) => acc + (Number((i as any).citizenRating) || 0), 0);
      return parseFloat((sum / ratedIssues.length).toFixed(1));
    })()
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      toast.success("Successfully logged out from Contractor Desk.");
      navigate("/login");
    } catch (e) {
      toast.error("Logout failed.");
    }
  };

  const handleStartWork = async (issueId: string, issueTitle: string) => {
    const toastId = toast.loading("Updating work order status...");
    try {
      const issueRef = doc(db, "issues", issueId);
      await updateDoc(issueRef, {
        status: "In Progress",
        workOrderStatus: "In Progress",
        updatedAt: serverTimestamp()
      });

      // Send notification to reporter/citizen
      const issueObj = contractorIssues.find(i => i.id === issueId);
      if (issueObj?.reportedBy) {
        await sendNotification(
          issueObj.reportedBy,
          "Contractor Started Work! 🏗️",
          `Contractor "${user?.name}" has arrived at site and started work on: "${issueTitle}".`,
          "status",
          issueId
        );
      }

      toast.success(`Work officially started! Keep ${detectedCity} clean. 🛠️`, { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Failed to start work.", { id: toastId });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo is too large. Please select an image under 5MB.");
      return;
    }

    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setWorkPhoto(reader.result as string);
      setUploadingPhoto(false);
      toast.success("Ground-level proof photo loaded successfully!");
    };
    reader.onerror = () => {
      toast.error("Error reading file.");
      setUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const handlePostProgressUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    if (!progressNotes.trim()) {
      toast.error("Please describe your progress.");
      return;
    }

    const toastId = toast.loading("Posting update...");
    try {
      const issueRef = doc(db, "issues", selectedIssue.id);
      
      const updateData = {
        updatedAt: serverTimestamp(),
        thekedarLatestNotes: progressNotes.trim(),
        comments: arrayUnion({
          id: `cmt_${Date.now()}`,
          authorId: user?.uid || "contractor",
          authorName: `${user?.name || "Contractor"} (Thekedar)`,
          authorPhoto: user?.photoURL || null,
          role: "thekedar",
          text: `👷 Progress Update: ${progressNotes.trim()}`,
          createdAt: new Date().toISOString()
        })
      };

      await updateDoc(issueRef, updateData);

      // Send notification to reporter/citizen
      if (selectedIssue.reportedBy) {
        await sendNotification(
          selectedIssue.reportedBy,
          "Work Progress Update 👷",
          `Contractor posted update: "${progressNotes.trim()}"`,
          "status",
          selectedIssue.id
        );
      }

      toast.success("Progress update posted successfully!", { id: toastId });
      setProgressNotes("");
      setIsUpdateModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to post progress update.", { id: toastId });
    }
  };

  const handleSubmitCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    if (!completionNotes.trim()) {
      toast.error("Please specify resolution notes.");
      return;
    }
    if (!workPhoto) {
      toast.error("Please upload a ground-level completion photo as proof.");
      return;
    }

    const toastId = toast.loading("Submitting completion report...");
    try {
      const issueRef = doc(db, "issues", selectedIssue.id);
      
      const updateData = {
        workOrderStatus: "Under Verification",
        thekedarNotes: completionNotes.trim(),
        thekedarPhotoUrl: workPhoto,
        updatedAt: serverTimestamp(),
        comments: arrayUnion({
          id: `cmt_${Date.now()}`,
          authorId: user?.uid || "contractor",
          authorName: `${user?.name || "Contractor"} (Thekedar)`,
          authorPhoto: user?.photoURL || null,
          role: "thekedar",
          text: `🏁 Completed & Ready for Inspection: ${completionNotes.trim()}`,
          createdAt: new Date().toISOString()
        })
      };

      await updateDoc(issueRef, updateData);

      // Send notification to reporter/citizen
      if (selectedIssue.reportedBy) {
        await sendNotification(
          selectedIssue.reportedBy,
          "Work Completed! 🎉",
          `Work is done on "${selectedIssue.title}". Subject to official inspection.`,
          "status",
          selectedIssue.id
        );
      }

      toast.success("Completion report sent to authority officer! Great job. 🌟", { id: toastId });
      setCompletionNotes("");
      setWorkPhoto(null);
      setIsSubmitModalOpen(false);
      setSelectedIssue(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit completion.", { id: toastId });
    }
  };

  const filteredIssues = contractorIssues.filter((issue) => {
    const statusVal = (issue as any).workOrderStatus || issue.status;
    if (activeFilter === "all") return true;
    if (activeFilter === "pending") {
      return (
        statusVal === "Assigned" ||
        statusVal === "In Progress" ||
        (issue.status === "Reported" && (issue as any).contractorId) ||
        issue.status === "In Progress"
      ) && statusVal !== "Under Verification" && statusVal !== "Approved" && issue.status !== "Resolved";
    }
    if (activeFilter === "completed") {
      return statusVal === "Under Verification" || statusVal === "Approved" || issue.status === "Resolved";
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans select-none pb-24 text-slate-800">
      {/* Premium Elegant Sticky Header */}
      <header className="h-16 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-xs fixed top-0 left-0 right-0 z-50 px-4 md:px-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-100 ring-2 ring-emerald-50">
            <HardHat className="w-5 h-5" />
          </div>
          <div>
            <span className="font-black text-sm text-slate-800 tracking-tight block">
              {getMunicipalBodyName(detectedCity, detectedState)}
            </span>
            <span className="text-[10px] text-emerald-600 font-extrabold block uppercase tracking-wider">
              Contractor Desk • thekedar
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3.5">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-slate-800 block">
              {user?.name}
            </span>
            <span className="text-[9px] text-slate-400 font-bold block">
              UID: {user?.uid.substring(0, 8)}
            </span>
          </div>
          
          <div className="h-8 w-[1px] bg-slate-100 hidden sm:block"></div>

          <button 
            onClick={handleLogout}
            className="flex items-center justify-center p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 hover:bg-rose-50 hover:border-rose-200/80 hover:text-rose-600 text-slate-500 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body Layout */}
      <main className="flex-1 w-full max-w-md mx-auto pt-20 px-4 box-border space-y-5">
        
        {/* Contractor Welcome Dashboard Card - Refined Elegance */}
        <div className="bg-gradient-to-br from-slate-900 via-[#1E293B] to-[#0F172A] text-white rounded-3xl p-5 shadow-xl relative overflow-hidden border border-slate-800">
          <div className="absolute right-0 bottom-0 opacity-15 pointer-events-none translate-x-4 translate-y-4">
            <HardHat className="w-44 h-44 text-emerald-500" />
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
          
          <div className="z-10 relative space-y-3">
            <div className="flex items-center justify-between">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase px-2.5 py-1 rounded-full tracking-wider flex items-center space-x-1 shadow-inner">
                <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>OFFICIAL GOVT PARTNER</span>
              </span>
              <span className="text-[9px] text-slate-400 font-semibold tracking-wider bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-700">
                ACTIVE 🟢
              </span>
            </div>
            
            <div className="space-y-1">
              <span className="text-slate-400 font-bold text-xs">Namaste 🙏</span>
              <h2 className="text-xl font-extrabold tracking-tight text-white">Welcome, {user?.name || "Partner"}!</h2>
              <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                Let's speed up {detectedCity}'s civic restoration. Respond quickly, maintain your rating, and submit completion reports with verified on-ground photos.
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Statistics Bento Grid - Modern with Visual Weight */}
        <div className="grid grid-cols-2 gap-3">
          
          {/* Card 1: Active Assignments */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs hover:shadow-sm hover:border-slate-200/80 transition-all flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                <Briefcase className="w-4.5 h-4.5" />
              </div>
              <span className="text-[10px] text-orange-600 font-black px-2 py-0.5 rounded-full bg-orange-50/50 uppercase tracking-widest">
                TASKS
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-black block uppercase tracking-wider">Active Orders</span>
              <span className="text-2xl font-black text-slate-800 tracking-tight leading-none mt-1 block">
                {stats.assigned + stats.inProgress}
              </span>
            </div>
          </div>

          {/* Card 2: Average Citizen Rating */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs hover:shadow-sm hover:border-slate-200/80 transition-all flex flex-col justify-between space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
                <Star className="w-4.5 h-4.5 fill-amber-400 text-amber-500" />
              </div>
              <span className="text-[10px] text-amber-600 font-black px-2 py-0.5 rounded-full bg-amber-50/50 uppercase tracking-widest">
                QUALITY
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-black block uppercase tracking-wider">Avg Rating</span>
              <div className="flex items-baseline space-x-1 mt-1">
                <span className="text-2xl font-black text-slate-800 tracking-tight leading-none block">
                  {stats.avgRating === 0 ? "N/A" : `${stats.avgRating}`}
                </span>
                {stats.avgRating > 0 && <span className="text-[10px] text-slate-400 font-bold">/ 5</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-emerald-50/50 rounded-2xl p-3 border border-emerald-100/60 flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-[10.5px] text-emerald-800 font-medium leading-relaxed">
            Need work orders? Citizens file complaints via the Citizen Portal, and Municipal Officers assign them directly to registered contractors here.
          </p>
        </div>

        {/* Filter Segment tabs - Sleek Horizontal Nav */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center space-x-1.5">
              <span>My Assignments</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                {contractorIssues.length}
              </span>
            </h3>
          </div>
          
          <div className="flex space-x-1 overflow-x-auto pb-1 scrollbar-none snap-x snap-mandatory">
            {(["all", "pending", "completed"] as const).map((filter) => {
              const isActive = activeFilter === filter;
              const label = 
                filter === "all" ? "All Orders" :
                filter === "pending" ? "Pending Work" : "Completed Work";
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-3.5 py-1.5 text-[11px] font-black rounded-xl transition-all cursor-pointer border shrink-0 snap-start ${
                    isActive 
                      ? "bg-slate-900 text-white border-slate-900 shadow-sm shadow-slate-300" 
                      : "bg-white text-slate-500 border-slate-200/80 hover:border-slate-300 hover:text-slate-800"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Work Orders List */}
        {issuesLoading ? (
          <div className="py-16 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <RefreshCw className="w-7 h-7 animate-spin text-emerald-500" />
            <p className="text-xs font-bold text-slate-500">Syncing with {getMunicipalBodyName(detectedCity, detectedState)} server...</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center space-y-4 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400 border border-slate-100">
              <HardHat className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-slate-700 font-extrabold text-sm">No work orders here</h4>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed max-w-[260px] mx-auto">
                No contracts matched the "<strong>{activeFilter === "all" ? "All Orders" : activeFilter === "pending" ? "Pending Work" : "Completed Work"}</strong>" category. When municipal admin assigns work, it will pop up on your desk instantly.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredIssues.map((issue) => {
              const isAssigned = (issue as any).workOrderStatus === "Assigned" || (issue.status === "Reported" && (issue as any).contractorId);
              const isInProgress = (issue as any).workOrderStatus === "In Progress" || issue.status === "In Progress";
              const isUnderVerification = (issue as any).workOrderStatus === "Under Verification";
              const isApproved = (issue as any).workOrderStatus === "Approved" || issue.status === "Resolved";

              return (
                <div 
                  key={issue.id} 
                  className="bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
                >
                  {/* Category Banner Accent */}
                  <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"></div>

                  <div className="p-4 space-y-3.5 flex-1">
                    {/* Header: Category & Status */}
                    <div className="flex items-start justify-between">
                      <span className="bg-slate-50 text-slate-600 border border-slate-150 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-md tracking-wider">
                        {issue.category}
                      </span>

                      {/* Premium Dynamic Status Badges */}
                      {isAssigned && (
                        <span className="bg-amber-50 text-amber-800 border border-amber-100 text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          <span>NEW ASSIGNMENT</span>
                        </span>
                      )}
                      {isInProgress && (
                        <span className="bg-blue-50 text-blue-800 border border-blue-100 text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center space-x-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          <span>IN PROGRESS</span>
                        </span>
                      )}
                      {isUnderVerification && (
                        <span className="bg-purple-50 text-purple-800 border border-purple-100 text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping"></span>
                          <span>VERIFICATION PENDING</span>
                        </span>
                      )}
                      {isApproved && (
                        <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>RESOLVED & PAID</span>
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-slate-800 leading-snug">
                        {issue.title}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">
                        {issue.description}
                      </p>
                    </div>

                    {/* Visual Progress Timeline Indicator */}
                    <div className="grid grid-cols-4 gap-1 pt-1">
                      <div className={`h-1.5 rounded-full ${isAssigned || isInProgress || isUnderVerification || isApproved ? 'bg-amber-500' : 'bg-slate-100'}`} title="Assigned"></div>
                      <div className={`h-1.5 rounded-full ${isInProgress || isUnderVerification || isApproved ? 'bg-blue-500' : 'bg-slate-100'}`} title="In Progress"></div>
                      <div className={`h-1.5 rounded-full ${isUnderVerification || isApproved ? 'bg-purple-500' : 'bg-slate-100'}`} title="Verifying"></div>
                      <div className={`h-1.5 rounded-full ${isApproved ? 'bg-emerald-500' : 'bg-slate-100'}`} title="Resolved"></div>
                    </div>

                    {/* Work Order Brief Invoice-like Box */}
                    <div className="bg-[#F8FAFC] rounded-2xl p-3 border border-slate-100 space-y-2.5">
                      <div className="text-xs">
                        <div className="flex items-center space-x-2 text-slate-600 bg-white/60 p-1.5 rounded-xl border border-slate-50 w-full">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <div>
                            <span className="block text-[8px] text-slate-400 font-bold uppercase leading-none">Deadline</span>
                            <span className="font-black text-slate-700">{(issue as any).deadline || "Immediate"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Official instructions as clean Govt Memo style callout */}
                      <div className="p-2.5 bg-amber-50/40 rounded-xl border border-amber-100/50">
                        <span className="text-[8px] text-amber-800 font-black uppercase tracking-wider block">OFFICIAL MEMO / INSTRUCTIONS</span>
                        <p className="text-[10px] font-semibold text-slate-700 mt-0.5 italic leading-normal">
                          "{(issue as any).workOrderInstructions || "Execute general restoration, patch potholes, verify on-site completion and upload proof photo."}"
                        </p>
                      </div>
                    </div>

                    {/* Location Info Footer */}
                    <div className="flex items-center space-x-1.5 text-slate-500 text-[10.5px] font-bold">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="truncate text-slate-600 font-extrabold">{issue.ward}</span>
                    </div>
                  </div>

                  {/* Actions Bar Footer */}
                  <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                    
                    {/* Citizen rating view for approved/resolved items */}
                    {isApproved && (issue as any).citizenRating ? (
                      <div className="w-full space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase text-slate-400 font-black">Citizen Rating & Appraisal:</span>
                          <div className="flex items-center space-x-1 bg-amber-50 border border-amber-100 rounded-lg px-2 py-0.5 text-xs text-amber-800 font-black">
                            <span>{ (issue as any).citizenRating }</span>
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          </div>
                        </div>
                        { (issue as any).citizenFeedback && (
                          <div className="text-[10px] text-slate-500 font-bold bg-white p-2 rounded-lg border border-slate-100 italic">
                            "{ (issue as any).citizenFeedback }"
                          </div>
                        )}
                      </div>
                    ) : isApproved ? (
                      <span className="text-[10px] text-emerald-700 font-black bg-emerald-100/50 border border-emerald-200/50 rounded-lg px-3 py-1 text-center w-full block uppercase tracking-wider">
                        ✔ Completed, Inspected & approved
                      </span>
                    ) : (
                      <div className="w-full flex space-x-2">
                        {isAssigned && (
                          <button
                            onClick={() => handleStartWork(issue.id, issue.title)}
                            className="w-full flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-4 rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-emerald-100 hover:scale-[1.01] active:scale-[0.99]"
                          >
                            <Play className="w-3.5 h-3.5 fill-white stroke-none" />
                            <span>Accept & Mobilize Team</span>
                          </button>
                        )}

                        {isInProgress && (
                          <>
                            <button
                              disabled={isUnderVerification}
                              onClick={() => {
                                setSelectedIssue(issue);
                                setProgressNotes("");
                                setIsUpdateModalOpen(true);
                              }}
                              className="bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed text-slate-700 font-black py-2.5 px-3.5 rounded-xl text-xs transition-all cursor-pointer active:scale-95"
                            >
                              Post Update
                            </button>
                            <button
                              disabled={isUnderVerification}
                              onClick={() => {
                                setSelectedIssue(issue);
                                setCompletionNotes("");
                                setWorkPhoto(null);
                                setIsSubmitModalOpen(true);
                              }}
                              className="flex-1 flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-black py-2.5 px-3.5 rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-emerald-100 hover:scale-[1.01] active:scale-[0.99]"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Submit Work</span>
                            </button>
                          </>
                        )}

                        {isUnderVerification && (
                          <span className="w-full text-center text-[11px] text-slate-500 font-extrabold bg-slate-100 border border-slate-200 rounded-xl py-2 flex items-center justify-center space-x-1.5">
                            <Clock className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                            <span>Waiting for Authorized Officer Confirmation</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* MODAL 1: Submitting Progress Update - Premium Design */}
      {isUpdateModalOpen && selectedIssue && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100">
            <div className="bg-slate-900 text-white px-4.5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <h3 className="font-extrabold text-sm tracking-tight">Report Work Progress</h3>
              </div>
              <button 
                onClick={() => setIsUpdateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePostProgressUpdate} className="p-5 space-y-4">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 font-black uppercase block tracking-wider">Selected Task</span>
                <span className="text-xs font-black text-slate-800 block truncate bg-slate-50 p-2.5 rounded-xl border border-slate-100">{selectedIssue.title}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] text-slate-400 font-black uppercase block tracking-wider">Progress Details</label>
                <textarea
                  required
                  rows={3}
                  value={progressNotes}
                  onChange={(e) => setProgressNotes(e.target.value)}
                  placeholder="e.g. Excavators arrived, site is cleared, workers started laying foundation..."
                  className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-50 transition-all text-slate-700 font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-xs transition-all active:scale-95 shadow-md shadow-emerald-100 flex items-center justify-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish Update to Citizen</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Submitting Final Resolution - Premium Design */}
      {isSubmitModalOpen && selectedIssue && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100">
            <div className="bg-slate-900 text-white px-4.5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <h3 className="font-extrabold text-sm tracking-tight">Submit Completion Report</h3>
              </div>
              <button 
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCompletion} className="p-5 space-y-4">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 font-black uppercase block tracking-wider">Task Title</span>
                <span className="text-xs font-black text-slate-800 block truncate bg-slate-50 p-2.5 rounded-xl border border-slate-100">{selectedIssue.title}</span>
              </div>

              {/* Photo Proof Upload */}
              <div className="space-y-1.5">
                <label className="text-[9px] text-slate-400 font-black uppercase block tracking-wider">Ground Resolution Photo (Mandatory)</label>
                {workPhoto ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-36 bg-slate-50 group">
                    <img 
                      src={workPhoto} 
                      alt="Work completed" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => setWorkPhoto(null)}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 transition-colors shadow-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-2xl p-6 text-center transition-all relative bg-[#F8FAFC] hover:bg-white flex flex-col items-center justify-center space-y-2 cursor-pointer group">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={uploadingPhoto}
                    />
                    <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-700">Take/Upload proof photo</p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">JPEG, PNG up to 5MB</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] text-slate-400 font-black uppercase block tracking-wider">Work Completion Notes</label>
                <textarea
                  required
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g. Pavement entirely repaired, layered with 40mm thick high-grade asphalt mix, cleared all surrounding construction waste..."
                  className="w-full text-xs p-3.5 rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-50 transition-all text-slate-700 font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-xs transition-all active:scale-95 shadow-md shadow-emerald-100 flex items-center justify-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit to Officer for Inspection</span>
              </button>
            </form>
          </div>
        </div>
      )}
      
      <BottomNav />
    </div>
  );
}
