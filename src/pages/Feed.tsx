import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../firebaseConfig";
import { collection, onSnapshot, query, orderBy, doc, updateDoc, increment } from "firebase/firestore";
import toast from "react-hot-toast";
import { upvoteIssue } from "../hooks/useIssues";
import { 
  Clock, 
  Flame, 
  AlertTriangle, 
  Search, 
  Bell, 
  ThumbsUp, 
  MapPin, 
  Tag, 
  HelpCircle,
  Loader2
} from "lucide-react";

interface CivicIssue {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  imageUrl: string;
  upvotes: number;
  upvotedBy: string[];
  reportedBy: string;
  locationName?: string;
  createdAt: any;
  comments?: any[];
}

function FunctionalFeed() {
  const navigate = useNavigate();
  const [issues, setIssues] = useState<CivicIssue[]>([]);
  const [filter, setFilter] = useState<"LATEST" | "TRENDING" | "CRITICAL">("LATEST");
  const [loading, setLoading] = useState(true);

  // 1. Real-time Firebase Firestore Stream Connection
  useEffect(() => {
    setLoading(true);
    const issuesCollection = collection(db, "issues");
    
    let feedQuery = query(issuesCollection, orderBy("createdAt", "desc"));
    
    if (filter === "TRENDING") {
      feedQuery = query(issuesCollection, orderBy("upvotes", "desc"));
    }

    const unsubscribe = onSnapshot(feedQuery, (snapshot) => {
      const liveIssues: CivicIssue[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // Skip mock seeded issues on client side to keep active feed completely free of static records
        if (data.reportedBy && (data.reportedBy.startsWith("mock_") || data.reportedBy === "mock_reporter")) {
          return;
        }

        // Secondary filtering for Critical filter logic state
        if (filter === "CRITICAL" && data.severity !== "High" && data.severity !== "Critical") {
          return; 
        }

        // STRICT RULE: Only push to feed if the issue has a real title from a user upload
        if (!data.title) {
          return; // Skips any incomplete or accidental database documents
        }

        liveIssues.push({
          id: doc.id,
          title: data.title,                     // REMOVED: || "Civic Issue Detected"
          description: data.description || "",   // Keep empty string fallback if desc is optional
          category: data.category || "General",
          severity: data.severity || "Medium",
          status: data.status || "Reported",
          imageUrl: data.imageUrl || "",         // REMOVED: generic unsplash pothole image link
          upvotes: data.upvotes || 0,
          upvotedBy: data.upvotedBy || [],
          reportedBy: data.reportedBy || "",
          locationName: data.locationName || "Local Area",
          createdAt: data.createdAt,
          comments: data.comments || []
        });
      });
      
      setIssues(liveIssues);
      setLoading(false);
    }, (error) => {
      console.error("Firestore stream error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filter]);

  // 2. Atomic Database Upvote Handler Routine
  const handleUpvote = async (issue: CivicIssue, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentUser = auth.currentUser;
    if (!currentUser) {
      toast.error("Please login to upvote issues!");
      return;
    }
    if (issue.upvotedBy?.includes(currentUser.uid)) {
      toast.error("You have already upvoted this issue!");
      return;
    }
    try {
      await upvoteIssue(issue.id, currentUser.uid, issue.reportedBy, issue.title);
      toast.success("Thank you for your upvote support!");
    } catch (err) {
      console.error("Failed to register upvote event:", err);
    }
  };

  // Helper styles for severity
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "Critical":
        return { border: "border-l-red-500", bg: "bg-red-50 text-red-700 border-red-200", label: "Critical", icon: "🔴" };
      case "High":
        return { border: "border-l-orange-500", bg: "bg-orange-50 text-orange-700 border-orange-200", label: "High", icon: "🟠" };
      case "Low":
        return { border: "border-l-green-500", bg: "bg-green-50 text-green-700 border-green-200", label: "Low", icon: "🟢" };
      default:
        return { border: "border-l-amber-500", bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Medium", icon: "🟡" };
    }
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case "Resolved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "In Progress":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Filter Action Switch Bar */}
      <div className="flex space-x-2">
        <button 
          type="button"
          onClick={() => setFilter("LATEST")}
          className={`px-4 py-2 rounded-full text-xs font-black flex items-center space-x-1.5 transition-all cursor-pointer ${
            filter === "LATEST" 
              ? "bg-primary text-white shadow-sm scale-102" 
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Latest</span>
        </button>
        <button 
          type="button"
          onClick={() => setFilter("TRENDING")}
          className={`px-4 py-2 rounded-full text-xs font-black flex items-center space-x-1.5 transition-all cursor-pointer ${
            filter === "TRENDING" 
              ? "bg-primary text-white shadow-sm scale-102" 
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Trending</span>
        </button>
        <button 
          type="button"
          onClick={() => setFilter("CRITICAL")}
          className={`px-4 py-2 rounded-full text-xs font-black flex items-center space-x-1.5 transition-all cursor-pointer ${
            filter === "CRITICAL" 
              ? "bg-primary text-white shadow-sm scale-102" 
              : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Critical</span>
        </button>
      </div>

      {/* Dynamic List Rendering Pipeline */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-2">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
          <p className="text-xs font-bold text-slate-400">Fetching live reports matrix...</p>
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center py-16 px-5 text-slate-400">
          <span className="text-4xl">🎉</span>
          <h3 className="font-bold text-slate-700 mt-3 mb-1">All Clear!</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            No civic complaints reported in this area yet. Be the first to lift up your voice!
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {issues.map((issue) => {
            const sev = getSeverityStyles(issue.severity);
            return (
              <div 
                key={issue.id} 
                onClick={() => navigate(`/issue/${issue.id}`)}
                className={`flex flex-col bg-white rounded-2xl border-l-6 ${sev.border} border-y border-r border-slate-150 p-4 shadow-xs hover:shadow-sm transition-all cursor-pointer hover:border-slate-300 hover:scale-[1.01]`}
              >
                {/* Main Row */}
                <div className="flex gap-4 items-start w-full">
                  {/* Card Content Grid */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap gap-1.5 items-center mb-1.5">
                        <span className={`inline-flex items-center text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${sev.bg}`}>
                          <span className="mr-0.5 text-[8px]">{sev.icon}</span>
                          {sev.label}
                        </span>
                        <span className={`inline-flex items-center text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${getStatusBadgeStyles(issue.status)}`}>
                          {issue.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-slate-800 line-clamp-1 leading-tight mb-1">
                        {issue.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-3">
                        {issue.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="inline-flex items-center text-[10px] text-slate-400 font-bold">
                        <MapPin className="w-3 h-3 mr-0.5 text-slate-400" />
                        {issue.category}
                      </span>
                      
                      {/* Active Dynamic Upvote Button */}
                      <button 
                        type="button"
                        onClick={(e) => handleUpvote(issue, e)}
                        className="inline-flex items-center space-x-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-600 cursor-pointer transition-all active:scale-95"
                      >
                        <ThumbsUp className="w-3.5 h-3.5 text-slate-500" />
                        <span>{issue.upvotes}</span>
                      </button>
                    </div>
                  </div>

                  {/* Verified Incident Graphic Frame */}
                  {issue.imageUrl ? (
                    <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden bg-slate-50 border border-slate-150 shrink-0 shadow-xs">
                      <img 
                        src={issue.imageUrl} 
                        alt="Civic issue snapshot" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-xl bg-slate-50 border border-slate-150 shrink-0 flex items-center justify-center text-slate-400">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* 🛡️ READ-ONLY AUTHORITY NOTIFICATIONS ON THE CITIZEN CARD */}
                {issue.comments && issue.comments.filter((c: any) => {
                  const text = typeof c === "string" ? c : (c?.text || "");
                  return text.includes("📢 Official Update:") || c?.isOfficial;
                }).length > 0 && (
                  <div className="mt-3 bg-emerald-50/60 border border-emerald-100/70 rounded-xl p-3 space-y-1.5">
                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <span>🛡️</span>
                      <span>Official Department Updates</span>
                    </p>
                    {issue.comments.map((comm: any, idx: number) => {
                      const text = typeof comm === "string" ? comm : (comm?.text || "");
                      if (text.includes("📢 Official Update:") || comm?.isOfficial) {
                        return (
                          <p key={comm.id || idx} className="text-xs text-emerald-900 font-bold leading-tight">
                            {text}
                          </p>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FeedPage() {
  return (
    <div className="w-full bg-slate-50 font-sans pb-24" id="feed-page-root">
      {/* DYNAMIC BACKEND ONLY ENGINE CONTAINER */}
      <div className="w-full">
        <FunctionalFeed />
      </div>
    </div>
  );
}
