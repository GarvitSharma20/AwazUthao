import React from "react";
import { ThumbsUp, Calendar, MapPin, Sparkles } from "lucide-react";
import { Issue } from "../hooks/useIssues";

interface IssueCardProps {
  issue: Issue;
  onUpvote: (e: React.MouseEvent, issue: Issue) => any;
  currentUserId: string | undefined;
  onClick: () => any;
  key?: any;
}

export default function IssueCard({ issue, onUpvote, currentUserId, onClick }: IssueCardProps) {
  // Helpers
  const getSeverityBorderColor = (sev: string) => {
    switch (sev) {
      case "Critical": return "border-l-[#EF4444]";
      case "High": return "border-l-[#F97316]";
      case "Medium": return "border-l-[#EAB308]";
      default: return "border-l-[#22C55E]";
    }
  };

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

  const getCategoryEmoji = (cat: string) => {
    switch (cat) {
      case "Pothole": return "🕳️";
      case "Garbage": return "🗑️";
      case "Streetlight": return "💡";
      case "Water": return "💧";
      case "Road": return "🚧";
      case "Open Drain": return "🚰";
      case "Sewage Overflow": return "⚠️";
      default: return "❓";
    }
  };

  const getFormattedTime = (timestamp: any) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return `${interval}y ago`;
    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return `${interval}mo ago`;
    interval = Math.floor(seconds / 86400);
    if (interval >= 1) return `${interval}d ago`;
    interval = Math.floor(seconds / 3600);
    if (interval >= 1) return `${interval}h ago`;
    interval = Math.floor(seconds / 60);
    if (interval >= 1) return `${interval}m ago`;
    return "Just now";
  };

  const isUpvoted = currentUserId && issue.upvotedBy?.includes(currentUserId);

  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-xs hover:shadow-md border border-slate-100 border-l-4 ${getSeverityBorderColor(issue.severity)} mb-3 overflow-hidden flex flex-col p-4 transition-all cursor-pointer relative active:scale-[0.99]`}
      id={`issue-card-${issue.id}`}
    >
      <div className="flex justify-between items-start space-x-3">
        <div className="flex-1 min-w-0">
          
          {/* Badge line */}
          <div className="flex items-center space-x-2 mb-2 flex-wrap gap-y-1">
            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${getSeverityBadgeColor(issue.severity)}`}>
              {issue.severity} Severity
            </span>
            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${getStatusBadgeColor(issue.status)}`}>
              {issue.status === "In Progress" && !issue.contractorId ? "In Progress (Unassigned)" : issue.status}
            </span>
            {issue.severity === "Critical" && (
              <span className="flex items-center space-x-0.5 text-[9px] font-extrabold text-red-500 bg-red-50 px-1.5 py-0.5 rounded-sm">
                <Sparkles className="w-2.5 h-2.5 text-red-500" />
                <span>AI Critical Priority</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h4 className="font-extrabold text-slate-800 text-sm leading-snug mb-1 truncate">
            {getCategoryEmoji(issue.category)} {issue.title}
          </h4>

          {/* Description */}
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3 pr-2">
            {issue.description}
          </p>

        </div>

        {/* Thumbnail Image or Type Icon */}
        <div className="shrink-0">
          {issue.imageUrl ? (
            <div className="w-20 h-20 rounded-xl overflow-hidden border border-slate-100 shadow-3xs">
              <img 
                src={issue.imageUrl} 
                alt="Civic report visual" 
                className="w-full h-full object-cover bg-gray-100"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl shadow-3xs">
              {getCategoryEmoji(issue.category)}
            </div>
          )}
        </div>
      </div>

      {/* Footer Area with Action button */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1.5 text-[11px] text-slate-400 font-bold">
        <div className="flex items-center space-x-2">
          <span className="flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            <span className="max-w-[120px] truncate">{issue.ward || "General"}</span>
          </span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{getFormattedTime(issue.createdAt)}</span>
          </span>
        </div>

        {/* Interactivity Upvote Button */}
        <button
          onClick={(e) => onUpvote(e, issue)}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
            isUpvoted 
              ? "bg-primary/10 text-primary border-primary/20 font-extrabold" 
              : "bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 font-bold active:scale-95"
          }`}
          id={`card-upvote-${issue.id}`}
        >
          <ThumbsUp className={`w-3.5 h-3.5 ${isUpvoted ? "fill-primary text-primary" : ""}`} />
          <span>{issue.upvotes || 0}</span>
        </button>
      </div>

    </div>
  );
}
