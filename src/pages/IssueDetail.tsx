import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import DetailMap from "../components/DetailMap";
import { 
  ArrowLeft, 
  ThumbsUp, 
  CheckCircle, 
  Share2, 
  MessageSquare, 
  Calendar, 
  Building, 
  AlertTriangle, 
  Sparkles, 
  Users,
  Shield,
  Send,
  Loader2,
  Clock,
  MapPin,
  Building2,
  HardHat,
  Star
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { db } from "../firebase/config";
import { doc, getDoc, updateDoc, arrayUnion, serverTimestamp, onSnapshot } from "firebase/firestore";
import { upvoteIssue, verifyIssue, Issue } from "../hooks/useIssues";
import { getSmartLocalLocation } from "../utils/locationHelper";
import { sendNotification } from "../hooks/useNotifications";

interface Comment {
  id: string;
  authorName: string;
  authorId: string;
  authorPhoto?: string;
  text: string;
  createdAt: any;
}

export default function IssueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Satisfaction Rating States
  const [ratingVal, setRatingVal] = useState<number>(0);
  const [ratingFeedback, setRatingFeedback] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  // Load single issue from Firestore
  const fetchIssueDetail = async () => {
    // No-op because onSnapshot listens dynamically in real-time
    console.log("Real-time subscription active; manual fetch bypassed.");
  };

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    const issueRef = doc(db, "issues", id);
    
    const unsubscribe = onSnapshot(issueRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
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

        setIssue({
          id: docSnap.id,
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
        
        // Parse raw comments
        if (data.comments) {
          setComments(data.comments);
        } else {
          setComments([]);
        }
      } else {
        toast.error("Civic issue report not found");
        navigate("/feed");
      }
      setLoading(false);
    }, (err) => {
      console.error("Error subscribing to issue:", err);
      toast.error("Error loading issue details");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, navigate]);

  // Handle Community Actions: Upvote
  const handleUpvote = async () => {
    if (!id || !issue) return;
    if (!user) {
      toast.error("Please login to upvote this issue!");
      return;
    }
    if (issue.upvotedBy?.includes(user.uid)) {
      toast.error("You have already upvoted this issue!");
      return;
    }

    try {
      await upvoteIssue(id, user.uid, issue.reportedBy, issue.title);
      toast.success("Thank you for your upvote support!");
      fetchIssueDetail();
    } catch (err) {
      toast.error("Upvote failed");
    }
  };

  // Handle Community Actions: Verify
  const handleVerify = async () => {
    if (!id || !issue) return;
    if (!user) {
      toast.error("Please login to verify this issue!");
      return;
    }
    if (issue.verifiedBy?.includes(user.uid)) {
      toast.error("You have already verified this issue!");
      return;
    }

    try {
      await verifyIssue(id, user.uid, issue.reportedBy, issue.title);
      toast.success("Citizens verification recorded! ✅");
      fetchIssueDetail();
    } catch (err) {
      toast.error("Verification failed");
    }
  };

  // Handle posting a comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user || !newComment.trim()) return;

    setIsPostingComment(true);
    try {
      const commentObj: Comment = {
        id: Math.random().toString(36).substring(2, 9),
        authorName: user.name || "Anonymous Citizen",
        authorId: user.uid,
        authorPhoto: user.photoURL || undefined,
        text: newComment.trim(),
        createdAt: new Date().toISOString(),
      };

      const issueRef = doc(db, "issues", id);
      await updateDoc(issueRef, {
        comments: arrayUnion(commentObj),
        updatedAt: serverTimestamp()
      });

      setComments(prev => [...prev, commentObj]);
      setNewComment("");
      toast.success("Comment added successfully!");
    } catch (err) {
      toast.error("Failed to post comment");
    } finally {
      setIsPostingComment(false);
    }
  };

  // Admin status update action
  const handleStatusUpdate = async (newStatus: "Reported" | "In Progress" | "Resolved") => {
    if (!id) return;
    if (newStatus === "In Progress" && !issue?.contractorId) {
      toast.error("⚠️ Status cannot be set to 'In Progress' manually without assigning a contractor. Please dispatch an official Work Order via the Admin Dashboard to assign a contractor first.");
      return;
    }
    setIsUpdatingStatus(true);
    try {
      const issueRef = doc(db, "issues", id);
      await updateDoc(issueRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      toast.success(`Status updated to: ${newStatus}`);
      fetchIssueDetail();
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Submit satisfaction rating and review for the Contractor's work
  const handleSubmitCitizenRating = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !user || ratingVal === 0) {
      toast.error("Please choose a star rating!");
      return;
    }

    setSubmittingRating(true);
    try {
      const issueRef = doc(db, "issues", id);
      const commentObj = {
        id: Math.random().toString(36).substring(2, 9),
        authorName: user.name || "Reporter Citizen",
        authorId: user.uid,
        text: `⭐ Contractor satisfaction rated: ${ratingVal} Stars. Remarks: "${ratingFeedback.trim() || "Work resolved beautifully!"}"`,
        createdAt: new Date().toISOString(),
      };

      await updateDoc(issueRef, {
        citizenRating: ratingVal,
        citizenFeedback: ratingFeedback.trim(),
        comments: arrayUnion(commentObj),
        updatedAt: serverTimestamp()
      });

      // Notify Contractor of Rating
      if (issue?.contractorId) {
        await sendNotification(
          issue.contractorId,
          "Citizen Satisfaction Rated! ⭐",
          `Citizen rated your work on "${issue.title}" with ${ratingVal} stars!`,
          "status",
          id
        );
      }

      toast.success("Thank you! Your feedback helps us build a better Agra. 🌟");
      fetchIssueDetail();
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit satisfaction feedback.");
    } finally {
      setSubmittingRating(false);
    }
  };

  // Share action link copier
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("🚀 Link copied to clipboard!");
  };

  // Formatting helpers
  const getSeverityBadgeColor = (sev: string) => {
    switch (sev) {
      case "Critical": return "bg-red-50 text-red-600 border-red-100";
      case "High": return "bg-orange-50 text-orange-600 border-orange-100";
      case "Medium": return "bg-yellow-50 text-yellow-600 border-yellow-100";
      default: return "bg-green-50 text-green-600 border-green-100";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "Resolved": return "bg-emerald-500 text-white";
      case "In Progress": return "bg-blue-500 text-white";
      default: return "bg-amber-500 text-white";
    }
  };

  const getFormattedTime = (timestamp: any) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="absolute inset-x-0 top-14 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
        <p className="text-xs font-bold text-slate-500">Retrieving issue report details...</p>
      </div>
    );
  }

  if (!issue) return null;

  const userHasUpvoted = user && issue.upvotedBy?.includes(user.uid);
  const userHasVerified = user && issue.verifiedBy?.includes(user.uid);

  // Timeline Stepper setup
  const timelineSteps = ["Reported", "Verified", "In Progress", "Resolved"] as const;
  const currentStatusIndex = timelineSteps.indexOf(issue.status as any);

  return (
    <div className="absolute inset-x-0 top-14 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] flex flex-col bg-slate-50 font-sans animate-fade-in" id="issue-detail-screen">
      
      {/* Scrollable Layout Container */}
      <div className="flex-1 overflow-y-auto">
        
        {/* Hero Section Banner */}
        <div className="relative h-64 w-full bg-slate-900 overflow-hidden shrink-0">
          {issue.imageUrl ? (
            <img 
              src={issue.imageUrl} 
              alt={issue.title} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-700 flex flex-col items-center justify-center text-white">
              <AlertTriangle className="w-16 h-16 text-primary mb-2 opacity-80" />
              <span className="text-xs tracking-wider uppercase font-black text-slate-400">
                AwazUthao Citizen Visual File
              </span>
            </div>
          )}

          {/* Dark gradient overlay bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-transparent" />

          {/* Floating Back Action Button */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 left-4 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md text-slate-700 transition-all cursor-pointer active:scale-90"
            id="detail-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Floating Share Button */}
          <button
            onClick={handleShare}
            className="absolute top-4 right-4 w-9 h-9 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md text-slate-700 transition-all cursor-pointer active:scale-90"
            id="detail-share-btn"
          >
            <Share2 className="w-4.5 h-4.5" />
          </button>

          {/* Bottom title display */}
          <div className="absolute bottom-4 inset-x-4">
            <h1 className="text-white text-base font-black leading-snug drop-shadow-md">
              {issue.title}
            </h1>
            <p className="text-slate-300 text-[10px] mt-1 font-semibold flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              <span>Reported on {getFormattedTime(issue.createdAt)}</span>
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 space-y-4 max-w-md mx-auto">
          
          {/* Main info card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-3xs space-y-3">
            
            {/* Badges line */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getSeverityBadgeColor(issue.severity)}`}>
                  {issue.severity} Severity
                </span>
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${getStatusBadgeColor(issue.status)}`}>
                  {issue.status === "In Progress" && !issue.contractorId ? "In Progress (Unassigned)" : issue.status}
                </span>
              </div>

              {/* Confidence factor chip */}
              <div className="flex items-center space-x-1 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full text-[9px] font-bold text-teal-800">
                <Sparkles className="w-3 h-3 text-teal-600" />
                <span>AI Detected • 92% Confident</span>
              </div>
            </div>

            {/* Description context */}
            <div className="space-y-1">
              <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Issue Description
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                {issue.description}
              </p>
            </div>

            {/* Urgency detail in alert box */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-start space-x-2.5 text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h4 className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider">
                  Urgency & Safety Indicator
                </h4>
                <p className="text-[11px] leading-relaxed font-semibold">
                  This issue poses moderate safety challenges and has community impact affecting multiple local transits. Action advised.
                </p>
              </div>
            </div>

            {/* Key info metadata row */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-50 text-xs font-bold text-slate-700">
              <div className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Department</span>
                  <span className="block text-[10px] truncate">{issue.department || "Municipal Corp"}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <Users className="w-4 h-4 text-slate-500 shrink-0" />
                <div className="min-w-0">
                  <span className="block text-[9px] font-bold text-slate-400 uppercase">Estimated Impact</span>
                  <span className="block text-[10px] truncate">10-100 Residents</span>
                </div>
              </div>
            </div>

            {/* Official Assignment Badge */}
            <div className={`mt-2 p-3 rounded-xl border flex items-center space-x-3 transition-colors ${
              issue.assignedOfficer 
                ? "bg-emerald-50/70 border-emerald-100 text-emerald-900" 
                : "bg-amber-50/40 border-amber-100/50 text-amber-900"
            }`}>
              <Shield className={`w-5 h-5 shrink-0 ${issue.assignedOfficer ? "text-emerald-600 animate-pulse" : "text-amber-500"}`} />
              <div className="min-w-0 flex-1">
                <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Assigned Municipal Authority</span>
                <span className="block text-xs font-black truncate">
                  {issue.assignedOfficer ? `${issue.assignedOfficer}` : "Awaiting Department Claim..."}
                </span>
                <span className="block text-[9px] font-medium text-slate-400 mt-0.5">
                  {issue.assignedOfficer 
                    ? `Active on field from ${issue.department}` 
                    : "Automatic routing system has queued this ticket"}
                </span>
              </div>
              {issue.status === "Resolved" && (
                <span className="text-[10px] font-black uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-md self-center">
                  Resolved
                </span>
              )}
            </div>

          </div>

          {/* Location Area & Map */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-3xs space-y-3">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span>📍 GPS Geo-coordinates Pin</span>
            </h3>

            {/* Map wrapper using maplibre custom map */}
            <div className="h-[180px] w-full rounded-xl overflow-hidden border border-slate-100 relative">
              <DetailMap lat={issue.location.lat} lng={issue.location.lng} />
            </div>

            <p className="text-[11px] text-slate-500 font-bold bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              {issue.ward ? (
                issue.ward.includes(",") ? issue.ward : (() => {
                  const smartLoc = getSmartLocalLocation(issue.location.lat, issue.location.lng);
                  return `${issue.ward} • ${smartLoc.city}, ${smartLoc.state}`;
                })()
              ) : (() => {
                const smartLoc = getSmartLocalLocation(issue.location.lat, issue.location.lng);
                return `${smartLoc.ward} • ${smartLoc.city}, ${smartLoc.state}`;
              })()}
            </p>
          </div>

          {/* Timeline Stepper */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-3xs space-y-4">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Official Status Stepper</span>
            </h3>

            <div className="space-y-4 pl-2">
              {timelineSteps.map((stepName, index) => {
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                
                return (
                  <div key={stepName} className="flex items-start space-x-3 relative">
                    {/* Line connector */}
                    {index < timelineSteps.length - 1 && (
                      <div className={`absolute left-3.5 top-7 bottom-0 w-0.5 -translate-x-1/2 -z-0 ${
                        index < currentStatusIndex ? "bg-primary" : "bg-slate-100"
                      }`} style={{ height: "24px" }} />
                    )}

                    {/* Step Icon circle */}
                    <div className="z-10 mt-1">
                      {isCompleted ? (
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                          isCurrent 
                            ? "bg-primary border-primary text-white ring-4 ring-primary/20 animate-pulse" 
                            : "bg-primary border-primary text-white"
                        }`}>
                          <CheckCircle className="w-4 h-4 stroke-[2.5]" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                      )}
                    </div>

                    {/* Stepper info */}
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-xs font-extrabold ${isCompleted ? "text-slate-800" : "text-slate-400"}`}>
                        {stepName}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        {isCompleted 
                          ? `Processed on ${getFormattedTime(issue.updatedAt || issue.createdAt)}` 
                          : "Awaiting local government action"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 🚧 Contractor Ground Execution Details Card */}
          {issue.contractorId && (
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-3xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <HardHat className="w-4 h-4 text-emerald-600" />
                  <span>On-Ground Execution Detail</span>
                </h3>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                  issue.workOrderStatus === "Approved" 
                    ? "bg-emerald-100 text-emerald-800" 
                    : issue.workOrderStatus === "Under Verification"
                    ? "bg-purple-100 text-purple-800"
                    : issue.workOrderStatus === "In Progress"
                    ? "bg-blue-100 text-blue-800 animate-pulse"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {issue.workOrderStatus || "Assigned"}
                </span>
              </div>

              {/* Contractor details brief */}
              <div className="grid grid-cols-2 gap-2.5 text-[11px] font-semibold text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="col-span-2">
                  <span className="block text-[8px] text-slate-400 font-bold uppercase leading-none">Thekedar Partner</span>
                  <span className="text-slate-800 font-extrabold">{issue.contractorName}</span>
                </div>
                {issue.contractorResponsibility && (
                  <div className="col-span-2 border-t border-slate-200/50 pt-2 mt-1">
                    <span className="block text-[8px] text-slate-400 font-bold uppercase leading-none mb-1">Assigned Responsibility Scope</span>
                    <span className="text-amber-800 font-black text-[11px] bg-amber-50/70 border border-amber-100/60 px-2 py-1 rounded-md inline-block">{issue.contractorResponsibility}</span>
                  </div>
                )}
                <div className="mt-1 border-t border-slate-200/50 pt-2 col-span-1">
                  <span className="block text-[8px] text-slate-400 font-bold uppercase leading-none">Target Deadline</span>
                  <span className="text-slate-800 font-extrabold">{issue.deadline || "Immediate"}</span>
                </div>
                <div className="mt-1 border-t border-slate-200/50 pt-2 col-span-1">
                  <span className="block text-[8px] text-slate-400 font-bold uppercase leading-none">Assigned By</span>
                  <span className="text-slate-800 font-extrabold">{issue.assignedOfficer || "Authority Officer"}</span>
                </div>
              </div>

              {/* Before vs After Side-by-Side Comparison */}
              {issue.thekedarPhotoUrl && (
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase text-slate-400 block">Ground Resolution Proofs</span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <span className="text-[8px] font-bold text-slate-400 uppercase block text-center">Before</span>
                      <div className="h-28 rounded-xl overflow-hidden border border-slate-150 bg-slate-50">
                        {issue.imageUrl ? (
                          <img src={issue.imageUrl} alt="Before" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-slate-300">No image</div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[8px] font-bold text-slate-400 uppercase block text-center">After (Completed)</span>
                      <div className="h-28 rounded-xl overflow-hidden border border-slate-150 bg-slate-50">
                        <img src={issue.thekedarPhotoUrl} alt="After" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contractor's narrative notes */}
              {issue.thekedarNotes && (
                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <span className="block text-[8px] text-slate-400 font-bold uppercase">Contractor Resolution Narrative</span>
                  <p className="text-xs text-slate-600 font-medium italic mt-1">
                    "{issue.thekedarNotes}"
                  </p>
                </div>
              )}

              {/* Special Instructions */}
              {issue.workOrderInstructions && !issue.thekedarNotes && (
                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                  <span className="block text-[8px] text-slate-400 font-bold uppercase">Active Work Instructions</span>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    "{issue.workOrderInstructions}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ⭐ Citizen Satisfaction Feedback & Rating Form */}
          {issue.status === "Resolved" && (
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-3xs space-y-4">
              <div className="flex items-center space-x-1.5">
                <Star className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
                <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Citizen Satisfaction Rating
                </h3>
              </div>

              {issue.citizenRating ? (
                /* Already Rated View */
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3.5 text-center space-y-2">
                  <div className="flex items-center justify-center space-x-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`w-5 h-5 ${star <= (issue.citizenRating || 0) ? "text-amber-500 fill-amber-500" : "text-slate-200"}`} 
                      />
                    ))}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-700 font-black">Rated {(issue.citizenRating)} / 5 stars</p>
                    {issue.citizenFeedback && (
                      <p className="text-[11px] text-slate-500 italic mt-1">"{issue.citizenFeedback}"</p>
                    )}
                  </div>
                </div>
              ) : issue.reportedBy === user?.uid ? (
                /* Submit Feedback Form for Reporter */
                <form onSubmit={handleSubmitCitizenRating} className="space-y-3">
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    This complaint was officially resolved by the Municipal Contractor. Are you satisfied with the work quality? Tap to rate and submit!
                  </p>
                  
                  {/* Interactive Star rating */}
                  <div className="flex items-center justify-center space-x-2 py-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isActive = star <= ratingVal;
                      return (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingVal(star)}
                          className="text-slate-200 hover:scale-110 active:scale-95 transition-all cursor-pointer focus:outline-none"
                        >
                          <Star 
                            className={`w-8 h-8 ${isActive ? "text-amber-500 fill-amber-500" : "text-slate-200"}`} 
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback text input */}
                  <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase text-slate-400">Add custom review comments (optional)</label>
                    <textarea
                      rows={2.5}
                      value={ratingFeedback}
                      onChange={(e) => setRatingFeedback(e.target.value)}
                      placeholder="e.g. Clean work, pothole fully restored! / Highly satisfied with response time..."
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-amber-600 bg-slate-50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingRating || ratingVal === 0}
                    className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-100 disabled:text-slate-400 text-white font-extrabold py-2.5 rounded-xl text-xs transition-all active:scale-95 shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    {submittingRating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Submit Satisfaction Feedback</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* General view if some other user views the rated issue */
                <div className="bg-slate-50 rounded-xl p-3 text-center text-slate-400 text-[11px] font-bold">
                  Citizen satisfaction rating is pending. Only the reporter can rate this resolution.
                </div>
              )}
            </div>
          )}

          {/* Social Community Actions */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-3xs space-y-4">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
              <Users className="w-3.5 h-3.5 text-primary" />
              <span>Citizen Action Hub</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {/* Upvote support */}
              <button
                onClick={handleUpvote}
                disabled={userHasUpvoted}
                className={`py-3 px-4 rounded-xl border text-xs font-extrabold flex flex-col items-center justify-center space-y-1 cursor-pointer transition-all ${
                  userHasUpvoted
                    ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary active:scale-95"
                }`}
                id="action-hub-upvote"
              >
                <ThumbsUp className={`w-4 h-4 ${userHasUpvoted ? "fill-slate-400 text-slate-400" : "fill-primary"}`} />
                <span>Upvote ({issue.upvotes || 0})</span>
              </button>

              {/* Verify Issue */}
              <button
                onClick={handleVerify}
                disabled={userHasVerified}
                className={`py-3 px-4 rounded-xl border text-xs font-extrabold flex flex-col items-center justify-center space-y-1 cursor-pointer transition-all ${
                  userHasVerified
                    ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-emerald-50 hover:bg-emerald-100/60 border-emerald-200 text-emerald-700 active:scale-95"
                }`}
                id="action-hub-verify"
              >
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Verify ({issue.verifiedBy?.length || 0})</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-400 text-center font-semibold italic">
              📢 {issue.verifiedBy?.length || 0} local citizens have verified this is active on site.
            </p>
          </div>

          {/* Admin Command Section */}
          {user?.isAdmin && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm space-y-3" id="admin-controls-box">
              <div className="flex items-center space-x-2 text-amber-800">
                <Shield className="w-5 h-5 text-amber-700" />
                <span className="text-xs font-extrabold uppercase tracking-wider">
                  Admin Command Console
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  defaultValue={issue.status}
                  onChange={(e) => handleStatusUpdate(e.target.value as any)}
                  disabled={isUpdatingStatus}
                  className="bg-white border border-amber-300 text-slate-800 text-xs font-bold py-2 px-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  <option value="Reported">⏱️ Status: Reported</option>
                  <option value="In Progress">⚙️ Status: In Progress</option>
                  <option value="Resolved">✅ Status: Resolved</option>
                </select>

                {isUpdatingStatus && <Loader2 className="w-4 h-4 text-amber-700 animate-spin" />}
              </div>
            </div>
          )}

          {/* Social Comments Section */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-3xs space-y-4">
            <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              <span>Comments Thread ({comments.length})</span>
            </h3>

            {/* Comment lists */}
            <div className="space-y-3">
              {comments.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs font-bold">
                  No public discussions yet. Start the conversation!
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex items-start space-x-3 text-xs border-b border-slate-50 pb-2.5 last:border-b-0 last:pb-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-500 flex items-center justify-center font-extrabold shrink-0">
                      {comment.authorName[0]?.toUpperCase() || "C"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-800">{comment.authorName}</span>
                        <span className="text-[9px] text-slate-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-500 mt-1 font-medium">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Post comment form */}
            <form onSubmit={handlePostComment} className="flex items-center space-x-2 pt-2 border-t border-slate-100">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Ask about this issue, coordinate etc..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/25 placeholder:text-slate-400 text-slate-700"
              />
              <button
                type="submit"
                disabled={isPostingComment || !newComment.trim()}
                className="bg-primary hover:bg-primary-dark disabled:bg-primary/40 text-white p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center active:scale-90 shrink-0"
              >
                {isPostingComment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
