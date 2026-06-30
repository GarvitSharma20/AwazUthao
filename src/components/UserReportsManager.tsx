import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase/config";
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, orderBy } from "firebase/firestore";
import { useAuth } from "../hooks/useAuth";
import { toast } from "react-hot-toast";
import { 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  AlertTriangle, 
  Tag, 
  Flame, 
  Clock, 
  CheckCircle2, 
  HelpCircle,
  Sparkles
} from "lucide-react";

interface CivicIssue {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  status: string;
  imageUrl?: string;
  createdAt?: any;
}

export default function UserReportsManager() {
  const { user } = useAuth();
  const [myIssues, setMyIssues] = useState<CivicIssue[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 1. Fetch only the current logged-in citizen's reports in real-time
  useEffect(() => {
    const currentUser = auth.currentUser || user;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    // Query based on reportedBy (the database schema standard in this app)
    // We order by createdAt desc so most recent issues are on top
    const q = query(
      collection(db, "issues"), 
      where("reportedBy", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issuesList: CivicIssue[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        issuesList.push({
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          category: data.category || "General",
          severity: data.severity || "Medium",
          status: data.status || "Reported",
          imageUrl: data.imageUrl,
          createdAt: data.createdAt
        });
      });
      setMyIssues(issuesList);
      setLoading(false);
    }, (error) => {
      console.warn("Error listening to user issues (index might be building, retrying without order):", error);
      // Fallback query without orderBy in case index is not fully built yet
      const fallbackQuery = query(
        collection(db, "issues"), 
        where("reportedBy", "==", currentUser.uid)
      );
      const unsubscribeFallback = onSnapshot(fallbackQuery, (snapshot) => {
        const issuesList: CivicIssue[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          issuesList.push({
            id: doc.id,
            title: data.title || "",
            description: data.description || "",
            category: data.category || "General",
            severity: data.severity || "Medium",
            status: data.status || "Reported",
            imageUrl: data.imageUrl,
            createdAt: data.createdAt
          });
        });
        // Sort manually by client if server-side index is missing
        issuesList.sort((a, b) => {
          const tA = a.createdAt?.seconds || 0;
          const tB = b.createdAt?.seconds || 0;
          return tB - tA;
        });
        setMyIssues(issuesList);
        setLoading(false);
      }, (err) => {
        console.error("Failed to load user reports:", err);
        setLoading(false);
      });
      return () => unsubscribeFallback();
    });

    return () => unsubscribe();
  }, [user]);

  // 2. Inline Edit Trigger Configuration
  const startEdit = (issue: CivicIssue) => {
    setEditingId(issue.id);
    setEditTitle(issue.title);
    setEditDescription(issue.description);
  };

  // 3. Update Routine Execute 
  const handleUpdate = async (id: string) => {
    if (!editTitle.trim() || !editDescription.trim()) {
      toast.error("Please fill out both the title and description.");
      return;
    }
    const updateToast = toast.loading("Saving changes to municipal archives...");
    try {
      const issueDocRef = doc(db, "issues", id);
      await updateDoc(issueDocRef, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        updatedAt: new Date()
      });
      setEditingId(null); // Close inline edit fields
      toast.dismiss(updateToast);
      toast.success("Grievance report updated successfully!");
    } catch (err) {
      console.error("Failed to modify record:", err);
      toast.dismiss(updateToast);
      toast.error("Failed to update the report. Try again.");
    }
  };

  // 4. Secure Remote Deletion Pipeline
  const performDelete = async (id: string) => {
    const deleteToast = toast.loading("Retracting report permanently...");
    try {
      await deleteDoc(doc(db, "issues", id));
      setDeletingId(null);
      toast.dismiss(deleteToast);
      toast.success("Civic complaint retracted successfully.");
    } catch (err) {
      console.error("Failed to delete record:", err);
      toast.dismiss(deleteToast);
      toast.error("Failed to delete the report. Please try again.");
    }
  };

  // Get severity badge styles
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "Critical":
        return { bg: "bg-red-50 text-red-700 border-red-200", label: "Critical", icon: "🔴" };
      case "High":
        return { bg: "bg-orange-50 text-orange-700 border-orange-200", label: "High", icon: "🟠" };
      case "Low":
        return { bg: "bg-green-50 text-green-700 border-green-200", label: "Low", icon: "🟢" };
      default:
        return { bg: "bg-amber-50 text-amber-700 border-amber-200", label: "Medium", icon: "🟡" };
    }
  };

  // Get status badge styles
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Resolved":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "In Progress":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-2">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-400">Syncing your active reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" id="user-reports-manager">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center space-x-1">
          <Clock className="w-4 h-4 text-primary" />
          <span>My Active Reports History</span>
        </h3>
        <span className="text-[10px] font-black bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
          {myIssues.length} Filed
        </span>
      </div>
      
      {myIssues.length === 0 ? (
        <div className="bg-white border border-slate-100 p-6 rounded-2xl text-center shadow-xs space-y-2">
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            You haven't filed any complaints yet. Use the green '+' action button at the bottom center to report a new local issue!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {myIssues.map((issue) => {
            const sevInfo = getSeverityBadge(issue.severity);
            const statusStyle = getStatusBadge(issue.status);

            return (
              <div 
                key={issue.id} 
                className="bg-white border border-slate-150 rounded-2xl p-4.5 shadow-xs transition-all hover:shadow-sm"
              >
                {editingId === issue.id ? (
                  /* Edit State Display View Elements */
                  <div className="space-y-3 animate-fade-in">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Grievance Title</label>
                      <input 
                        type="text" 
                        value={editTitle} 
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-slate-800 focus:border-primary focus:outline-none transition-colors"
                        placeholder="Edit title..."
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Detailed Description</label>
                      <textarea 
                        value={editDescription} 
                        onChange={(e) => setEditDescription(e.target.value)}
                        rows={3}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-700 leading-relaxed focus:border-primary focus:outline-none transition-colors resize-none"
                        placeholder="Edit description details..."
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-1">
                      <button 
                        type="button"
                        onClick={() => setEditingId(null)} 
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center space-x-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleUpdate(issue.id)} 
                        className="bg-primary hover:bg-primary-dark text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer active:scale-95 flex items-center space-x-1 shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Default Standard Informational Row View Elements */
                  <div className="flex space-x-4 items-start">
                    
                    {/* Visual representation / icon */}
                    {issue.imageUrl ? (
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 shadow-xs">
                        <img 
                          src={issue.imageUrl} 
                          alt={issue.title} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-150 shrink-0 flex items-center justify-center text-slate-400">
                        <HelpCircle className="w-6 h-6" />
                      </div>
                    )}

                    {/* Meta Description Grid */}
                    <div className="flex-1 min-w-0">
                      
                      {/* Tags */}
                      <div className="flex flex-wrap gap-1.5 items-center mb-1.5">
                        <span className="inline-flex items-center text-[9px] bg-slate-50 text-slate-500 font-extrabold px-1.5 py-0.5 rounded border border-slate-200/60 uppercase tracking-wider">
                          <Tag className="w-2.5 h-2.5 mr-0.5 text-slate-400" />
                          {issue.category}
                        </span>
                        
                        <span className={`inline-flex items-center text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${sevInfo.bg}`}>
                          <span className="mr-0.5 text-[8px]">{sevInfo.icon}</span>
                          {sevInfo.label}
                        </span>

                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${statusStyle}`}>
                          {issue.status}
                        </span>
                      </div>

                      {/* Title and Description */}
                      <h4 className="text-xs font-extrabold text-slate-800 line-clamp-1 leading-tight">
                        {issue.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {issue.description}
                      </p>
                      
                      {/* Bottom Operational Command Button Bar */}
                      {deletingId === issue.id ? (
                        <div className="flex flex-col items-end space-y-2 bg-red-50/70 p-3 rounded-xl border border-red-100/80 mt-3 animate-fade-in">
                          <span className="text-[10px] font-black text-red-700 uppercase tracking-wider">
                            ⚠️ Retract this civic complaint permanently?
                          </span>
                          <div className="flex gap-2">
                            <button 
                              type="button"
                              onClick={() => setDeletingId(null)} 
                              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all active:scale-95"
                            >
                              Cancel
                            </button>
                            <button 
                              type="button"
                              onClick={() => performDelete(issue.id)} 
                              className="bg-red-600 hover:bg-red-750 text-white text-[10px] font-extrabold px-3.5 py-1.5 rounded-lg cursor-pointer transition-all active:scale-95 flex items-center space-x-1 shadow-sm"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Confirm Retract 🚀</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-4 border-t border-slate-100/60 mt-3 pt-2.5 justify-end">
                          <button 
                            onClick={() => startEdit(issue)} 
                            className="text-[11px] font-extrabold text-primary hover:text-primary-dark flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button 
                            onClick={() => setDeletingId(issue.id)} 
                            className="text-[11px] font-extrabold text-rose-500 hover:text-rose-600 flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Retract</span>
                          </button>
                        </div>
                      )}
                    </div>
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
