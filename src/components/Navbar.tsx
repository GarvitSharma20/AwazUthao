import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, Trash2, ThumbsUp, Sparkles, Megaphone, AlertCircle } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { 
  useNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  clearAllNotifications 
} from "../hooks/useNotifications";

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, loading } = useNotifications(user?.uid);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Helper to format notification time
  const formatTime = (timestamp: any) => {
    if (!timestamp) return "Just now";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Helper to get initials from the user's name
  const getInitials = (name: string) => {
    if (!name) return "C";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-100 shadow-xs z-50 px-4 flex items-center justify-between">
      {/* Left side: Logo & Brand name */}
      <div 
        onClick={() => {
          const isAdmin = user?.isAdmin || user?.email === "admin@awazuthao.com" || user?.email?.endsWith(".gov.in") || user?.role === "officer";
          navigate(user?.role === "thekedar" ? "/contractor" : isAdmin ? "/admin" : "/home");
        }}
        className="flex items-center space-x-2 cursor-pointer active:opacity-85 select-none"
        id="navbar-brand-logo"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-primary"
          >
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
              fill="#1D9E75"
            />
            <path
              d="M12 11.5L13.1 9.1L15.5 8L13.1 6.9L12 4.5L10.9 6.9L8.5 8L10.9 9.1L12 11.5Z"
              fill="white"
            />
          </svg>
        </div>
        <span className="font-extrabold text-lg text-slate-800 tracking-tight">
          AwazUthao
        </span>
      </div>

      {/* Right side: Bell icon + Interactive User Avatar */}
      <div className="flex items-center space-x-4">
        {/* Bell notification button dropdown */}
        <div className="relative flex items-center" ref={dropdownRef}>
          <button 
            className={`p-2 rounded-xl transition-all duration-200 cursor-pointer relative flex items-center justify-center border ${
              isOpen 
                ? "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-xs" 
                : "text-slate-500 bg-slate-50 hover:bg-slate-100 hover:text-slate-700 border-slate-100"
            }`}
            id="navbar-bell-btn"
            onClick={() => setIsOpen(!isOpen)}
            title="Notifications"
          >
            <Bell className={`w-5 h-5 transition-transform duration-200 ${isOpen ? "scale-105" : ""}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black shadow-sm animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Floating Dropdown */}
          {isOpen && (
            <div 
              className="absolute top-12 right-0 w-80 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-150/80 py-2.5 z-50 animate-fade-in divide-y divide-slate-100"
              id="navbar-notifications-dropdown"
            >
              {/* Header */}
              <div className="px-4 pb-2.5 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-800 tracking-tight flex items-center space-x-1.5">
                    <span>Updates & Alerts</span>
                    <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  </h3>
                  {unreadCount > 0 ? (
                    <p className="text-[9px] text-emerald-600 font-extrabold mt-0.5">
                      You have {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
                    </p>
                  ) : (
                    <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                      Your citizen desk is fully updated
                    </p>
                  )}
                </div>
                <div className="flex space-x-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={() => user?.uid && markAllNotificationsAsRead(user.uid)}
                      className="p-1 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all cursor-pointer"
                      title="Mark all as read"
                    >
                      <CheckCheck className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={() => user?.uid && clearAllNotifications(user.uid)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                      title="Clear all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* List Container */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50 px-2 pt-2 scrollbar-thin">
                {loading ? (
                  <div className="py-6 text-center text-xs text-slate-400 font-bold flex items-center justify-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-75" />
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-150" />
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce delay-300" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="py-6 text-center flex flex-col items-center justify-center">
                    <div className="w-11 h-11 rounded-full bg-slate-50 flex items-center justify-center mb-2">
                      <span className="text-xl">🔔</span>
                    </div>
                    <p className="text-xs font-black text-slate-700">All Caught Up!</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[220px] leading-relaxed mx-auto">
                      Any updates regarding your reported, verified, or upvoted issues will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.map((notif) => {
                      const getIcon = () => {
                        switch (notif.type) {
                          case "upvote":
                            return (
                              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                                <ThumbsUp className="w-4 h-4 stroke-[2.5]" />
                              </div>
                            );
                          case "verification":
                            return (
                              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100 font-bold">
                                <Check className="w-4.5 h-4.5 stroke-[3]" />
                              </div>
                            );
                          case "welcome":
                            return (
                              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                                <Sparkles className="w-4 h-4" />
                              </div>
                            );
                          case "status":
                            return (
                              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                                <Megaphone className="w-4 h-4" />
                              </div>
                            );
                          default:
                            return (
                              <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 border border-slate-100">
                                <AlertCircle className="w-4 h-4" />
                              </div>
                            );
                        }
                      };

                      const handleItemClick = async () => {
                        if (!notif.read) {
                          await markNotificationAsRead(notif.id);
                        }
                        if (notif.relatedId) {
                          navigate(`/issue/${notif.relatedId}`);
                        }
                        setIsOpen(false);
                      };

                      return (
                        <div
                          key={notif.id}
                          onClick={handleItemClick}
                          className={`flex items-start space-x-3 p-2.5 rounded-xl transition-all cursor-pointer hover:bg-slate-50 border ${
                            !notif.read 
                              ? "bg-slate-50/50 border-slate-100 shadow-2xs" 
                              : "bg-transparent border-transparent"
                          }`}
                        >
                          {getIcon()}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-xs truncate ${!notif.read ? "font-black text-slate-800" : "text-slate-600 font-medium"}`}>
                                {notif.title}
                              </p>
                              <span className="text-[9px] text-slate-400 font-bold whitespace-nowrap ml-1.5">
                                {formatTime(notif.createdAt)}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-normal mt-1 break-words line-clamp-2 font-medium">
                              {notif.message}
                            </p>
                          </div>
                          {!notif.read && (
                            <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0 mt-2 shadow-xs" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar button linking to Profile */}
        <button
          onClick={() => navigate("/profile")}
          className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-100 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all overflow-hidden cursor-pointer"
          id="navbar-avatar-btn"
        >
          {user?.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={user.name || "User profile"} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-sans">
              {getInitials(user?.name || "Citizen")}
            </div>
          )}
        </button>
      </div>
    </header>
  );
}
