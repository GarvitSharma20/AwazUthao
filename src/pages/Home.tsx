import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { 
  Flame, 
  Navigation, 
  Plus, 
  X, 
  ThumbsUp, 
  Award, 
  CheckCircle, 
  TrendingUp, 
  AlertCircle,
  HelpCircle,
  Clock,
  Filter,
  Search,
  Globe,
  Shield
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useIssues, upvoteIssue, Issue } from "../hooks/useIssues";
import EarthMap from "../components/EarthMap";


// Helper to calculate distance in km using Haversine formula
const getDistanceKm = (coords1: [number, number], coords2: [number, number]) => {
  const [lat1, lon1] = coords1;
  const [lat2, lon2] = coords2;
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c; // Distance in km
  return d;
};


export default function Home() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin || user?.email === "admin@awazuthao.com" || user?.email?.endsWith(".gov.in");
  const { issues, loading } = useIssues();
  const navigate = useNavigate();

  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [isHeatmapMode, setIsHeatmapMode] = useState<boolean>(false);
  const [dismissedEmptyState, setDismissedEmptyState] = useState<boolean>(false);

  // Reset empty state dismissal when active filter category changes
  useEffect(() => {
    setDismissedEmptyState(false);
  }, [activeFilter]);

  const [userLocation, setUserLocation] = useState<[number, number]>(() => {
    const saved = localStorage.getItem("awaz_user_location");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 2) {
          return parsed as [number, number];
        }
      } catch (e) {}
    }
    return [20.5937, 78.9629]; // Generic center of India fallback
  });
  const [mapCenter, setMapCenter] = useState<[number, number]>(userLocation);
  const [mapZoom, setMapZoom] = useState<number>(13);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const handleSearchCity = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    const toastId = toast.loading(`Searching for "${searchQuery}"...`);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          setMapCenter([lat, lon]);
          setMapZoom(13);
          toast.dismiss(toastId);
          toast.success(`Switched view to ${data[0].display_name.split(",")[0] || searchQuery}!`);
        } else {
          toast.dismiss(toastId);
          toast.error(`Could not locate "${searchQuery}"`);
        }
      } else {
        toast.dismiss(toastId);
        toast.error("Geolocation service is temporarily busy.");
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to connect to geolocation service.");
    }
  };

  const categories = [
    { label: "All", emoji: "🌐" },
    { label: "Pothole", emoji: "🕳️" },
    { label: "Garbage", emoji: "🗑️" },
    { label: "Streetlight", emoji: "💡" },
    { label: "Water", emoji: "💧" },
    { label: "Road", emoji: "🚧" },
    { label: "Resolved", emoji: "✅" }
  ];

  const getCategoryText = (label: string) => {
    return label;
  };

  // Helper to determine marker color based on status or severity
  const getMarkerColor = (issue: Issue) => {
    if (issue.status === "Resolved") return "#22C55E"; // Resolved Green
    if (issue.status === "In Progress") return "#3B82F6"; // In Progress Blue

    // Status is Reported, color depends on severity
    switch (issue.severity) {
      case "Critical": return "#EF4444"; // Red
      case "High": return "#F97316"; // Orange
      case "Medium": return "#EAB308"; // Yellow
      default: return "#1D9E75"; // Teal
    }
  };

  // Helper to get category emoji
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

  // Handle GPS location acquisition with robust multi-service fallback
  const handleGPS = () => {
    const toastId = toast.loading("Locating your position...");
    
    const tryIPFallbacks = async () => {
      // 1. Try FreeIPAPI (highly reliable, HTTPS, no-token)
      try {
        const response = await fetch("https://freeipapi.com/api/json");
        if (response.ok) {
          const data = await response.json();
          if (typeof data.latitude === "number" && typeof data.longitude === "number") {
            const coords: [number, number] = [data.latitude, data.longitude];
            setMapCenter(coords);
            setUserLocation(coords);
            localStorage.setItem("awaz_user_location", JSON.stringify(coords));
            setMapZoom(14);
            toast.dismiss(toastId);
            toast.success(`Located via IP! Centered on ${data.cityName || "your city"}.`);
            return;
          }
        }
      } catch (err) {
        console.warn("FreeIPAPI fallback failed:", err);
      }

      // 2. Try ipapi.co (secondary fallback)
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (response.ok) {
          const data = await response.json();
          if (typeof data.latitude === "number" && typeof data.longitude === "number") {
            const coords: [number, number] = [data.latitude, data.longitude];
            setMapCenter(coords);
            setUserLocation(coords);
            localStorage.setItem("awaz_user_location", JSON.stringify(coords));
            setMapZoom(14);
            toast.dismiss(toastId);
            toast.success(`Located via IP fallback! Centered on ${data.city || "your city"}.`);
            return;
          }
        }
      } catch (err) {
        console.warn("Secondary IP lookup failed:", err);
      }

      toast.dismiss(toastId);
      toast.error("Could not obtain live location. Map is centered on default view.");
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const coords: [number, number] = [latitude, longitude];
          setMapCenter(coords);
          setUserLocation(coords);
          localStorage.setItem("awaz_user_location", JSON.stringify(coords));
          setMapZoom(15);
          toast.dismiss(toastId);
          toast.success("Located! Map centered on your GPS position.");
        },
        () => {
          console.warn("Device GPS failed/blocked. Trying IP fallbacks...");
          tryIPFallbacks();
        },
        { enableHighAccuracy: true, timeout: 3500 }
      );
    } else {
      tryIPFallbacks();
    }
  };

  // On-mount dynamic geo-location pipeline (Browser GPS -> IP Fallbacks -> Default Fallback)
  useEffect(() => {
    let active = true;
    
    const loadLocation = async () => {
      const runIPFallbacks = async () => {
        // Try FreeIPAPI
        try {
          const response = await fetch("https://freeipapi.com/api/json");
          if (response.ok && active) {
            const data = await response.json();
            if (typeof data.latitude === "number" && typeof data.longitude === "number") {
              console.log(`IP resolved on mount (FreeIPAPI): ${data.cityName} (${data.latitude}, ${data.longitude})`);
              const coords: [number, number] = [data.latitude, data.longitude];
              setMapCenter(coords);
              setUserLocation(coords);
              localStorage.setItem("awaz_user_location", JSON.stringify(coords));
              return true;
            }
          }
        } catch (err) {
          console.warn("FreeIPAPI on-mount failed:", err);
        }

        // Try ipapi.co
        try {
          const response = await fetch("https://ipapi.co/json/");
          if (response.ok && active) {
            const data = await response.json();
            if (typeof data.latitude === "number" && typeof data.longitude === "number") {
              console.log(`IP resolved on mount (ipapi.co): ${data.city} (${data.latitude}, ${data.longitude})`);
              const coords: [number, number] = [data.latitude, data.longitude];
              setMapCenter(coords);
              setUserLocation(coords);
              localStorage.setItem("awaz_user_location", JSON.stringify(coords));
              return true;
            }
          }
        } catch (err) {
          console.warn("ipapi.co on-mount failed:", err);
        }
        return false;
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (!active) return;
            const { latitude, longitude } = position.coords;
            console.log(`GPS resolved on mount: ${latitude}, ${longitude}`);
            const coords: [number, number] = [latitude, longitude];
            setMapCenter(coords);
            setUserLocation(coords);
            localStorage.setItem("awaz_user_location", JSON.stringify(coords));
          },
          async () => {
            if (!active) return;
            console.log("Device GPS failed/denied on mount. Trying IP lookup...");
            await runIPFallbacks();
          },
          { enableHighAccuracy: true, timeout: 3500 }
        );
      } else {
        await runIPFallbacks();
      }
    };

    loadLocation();
    return () => {
      active = false;
    };
  }, []);

  // Handle Upvote action
  const handleUpvote = async (issue: Issue) => {
    if (!user) {
      toast.error("Please log in first.");
      return;
    }

    if (issue.upvotedBy.includes(user.uid)) {
      toast("You have already upvoted this issue!", { icon: "👍" });
      return;
    }

    try {
      await upvoteIssue(issue.id, user.uid, issue.reportedBy, issue.title);
      toast.success("Thank you for upvoting!");
      
      // Update selectedIssue state locally to show updated upvote count synchronously
      setSelectedIssue((prev) => {
        if (prev && prev.id === issue.id) {
          return {
            ...prev,
            upvotes: prev.upvotes + 1,
            upvotedBy: [...prev.upvotedBy, user.uid]
          };
        }
        return prev;
      });
    } catch (err) {
      toast.error("Error submitting upvote.");
    }
  };

  // Filter issues based on active filter chip
  const filteredIssues = issues.filter((issue) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Resolved") return issue.status === "Resolved";
    // For specific category, make sure we only match that category (case-insensitive & partial match) and it isn't resolved (unless resolved is selected)
    const issueCategory = (issue.category || "").toLowerCase();
    const filterText = activeFilter.toLowerCase();
    return issueCategory.includes(filterText) && issue.status !== "Resolved";
  });

  // Calculate live stats
  const totalCount = issues.length;
  const resolvedCount = issues.filter(i => i.status === "Resolved").length;
  const inProgressCount = issues.filter(i => i.status === "In Progress").length;

  return (
    <div className="absolute inset-x-0 top-14 bottom-16 flex flex-col overflow-hidden bg-slate-100 font-sans animate-fade-in">
      
      {/* 1. Civic Awareness Marquee Banner */}
      <div className="w-full bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-emerald-500/20 py-2 flex items-center overflow-hidden shrink-0 z-10 shadow-lg relative">
        {/* Soft edge-fade gradient overlays for seamless seamless marquee scroll */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-slate-950 to-transparent pointer-events-none z-20" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-slate-950 to-transparent pointer-events-none z-20" />
        
        <div className="flex-1 overflow-hidden relative flex items-center">
          <div className="animate-marquee flex gap-12 shrink-0 text-slate-200 text-xs font-medium tracking-wide whitespace-nowrap pl-6">
            <span className="flex items-center gap-2"><span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent font-bold">⚖️ 74th Constitutional Amendment Act (1992):</span> Empowering Urban Local Bodies (Nagarpalikas) to govern effectively</span>
            <span className="flex items-center gap-2">🏛️ <span className="italic text-slate-300">"Local self-government is the basis of democracy."</span> — Civic empowerment begins with your active voice</span>
            <span className="flex items-center gap-2">📢 <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent font-bold">Raise Your Voice (Awaz Uthao)</span> — Be the catalyst for civic change in your community</span>
            <span className="flex items-center gap-2">🤝 <span className="italic text-slate-300">"Citizenship consists in the service of each for all."</span> — Track, report, and transform your neighborhood</span>
            <span className="flex items-center gap-2">💡 Real-time governance connects citizens directly with municipal administrators for rapid public resolution</span>
          </div>
          <div className="animate-marquee flex gap-12 shrink-0 text-slate-200 text-xs font-medium tracking-wide whitespace-nowrap pl-6" aria-hidden="true">
            <span className="flex items-center gap-2"><span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent font-bold">⚖️ 74th Constitutional Amendment Act (1992):</span> Empowering Urban Local Bodies (Nagarpalikas) to govern effectively</span>
            <span className="flex items-center gap-2">🏛️ <span className="italic text-slate-300">"Local self-government is the basis of democracy."</span> — Civic empowerment begins with your active voice</span>
            <span className="flex items-center gap-2">📢 <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent font-bold">Raise Your Voice (Awaz Uthao)</span> — Be the catalyst for civic change in your community</span>
            <span className="flex items-center gap-2">🤝 <span className="italic text-slate-300">"Citizenship consists in the service of each for all."</span> — Track, report, and transform your neighborhood</span>
            <span className="flex items-center gap-2">💡 Real-time governance connects citizens directly with municipal administrators for rapid public resolution</span>
          </div>
        </div>
      </div>

      {/* 2. Map & Overlay Section */}
      <div className="flex-1 w-full relative">
        <EarthMap 
          issues={filteredIssues}
          center={mapCenter}
          zoom={mapZoom}
          userLocation={userLocation}
          onSelectIssue={(issue) => {
            setSelectedIssue(issue);
            setMapCenter([issue.location.lat, issue.location.lng]);
          }}
        />

        {/* Floating Search & Quick-Select on Top Left of Map */}
        <div className="absolute top-4 left-4 z-10 w-72 max-w-[calc(100vw-8rem)] flex flex-col space-y-2">
          {/* Search Bar Input Form */}
          <form 
            onSubmit={handleSearchCity}
            className="flex items-center bg-white border border-slate-200/80 rounded-xl shadow-lg px-3 py-2 space-x-2"
          >
            <Search className="w-4.5 h-4.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search city or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-slate-800 text-xs focus:outline-none placeholder-slate-400"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery("")}
                className="text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </form>
        </div>

        {/* Floating Controls Top Right */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2.5 z-10">
          {/* GPS Locator Button */}
          <button
            onClick={handleGPS}
            className="flex items-center justify-center w-11 h-11 bg-white text-slate-700 border border-slate-100 hover:bg-slate-50 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            title="Center on My GPS"
            id="gps-locate-btn"
          >
            <Navigation className="w-5.5 h-5.5 stroke-[2]" />
          </button>
        </div>

        {/* Dynamic Location Out-Of-Bounds / Calibrator Banner */}
        {userLocation && getDistanceKm(userLocation, mapCenter) > 15 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-xl z-10 flex flex-col sm:flex-row items-center space-y-2.5 sm:space-y-0 sm:space-x-4 border border-white/10 animate-fade-in w-[90%] sm:w-auto max-w-lg">
            <div className="flex items-center space-x-2.5">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              <div className="text-left">
                <p className="text-[11px] font-bold text-slate-200">Viewing outside your location</p>
                <p className="text-[10px] text-slate-400">
                  You are physically located ~{Math.round(getDistanceKm(userLocation, mapCenter))} km away.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0 justify-end">
              <button
                type="button"
                onClick={() => {
                  setMapCenter(userLocation);
                  setMapZoom(14);
                  toast.success("Centered on your physical location!");
                }}
                className="bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer flex-1 sm:flex-initial text-center"
              >
                Center on Me
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserLocation(mapCenter);
                  localStorage.setItem("awaz_user_location", JSON.stringify(mapCenter));
                  toast.success("Location calibrated here! This is now your home city.");
                }}
                className="bg-primary hover:bg-primary-dark text-white font-bold px-3 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer shadow-md flex-1 sm:flex-initial text-center whitespace-nowrap"
              >
                Set as My Location
              </button>
            </div>
          </div>
        )}

        {/* Loading Overlay State */}
        {loading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-20">
            <div className="bg-white p-5 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center max-w-xs text-center">
              <div className="w-8 h-8 border-3 border-primary/35 border-t-primary rounded-full animate-spin mb-3" />
              <h4 className="text-sm font-bold text-slate-800">Downloading Ward Map...</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Fetching latest citizen reports & government pipeline updates.
              </p>
            </div>
          </div>
        )}

        {/* Empty State Overlay */}
        {!loading && filteredIssues.length === 0 && !dismissedEmptyState && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 text-center z-10 animate-fade-in relative">
            <button
              type="button"
              onClick={() => setDismissedEmptyState(true)}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              title="Dismiss Popup"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>

            <span className="text-4xl mb-3 block">🏙️</span>
            <h4 className="text-base font-bold text-slate-800">
              No issues reported yet in this category
            </h4>
            <p className="text-xs text-slate-500 mt-1.5 mb-5 leading-relaxed">
              Every citizen can raise a voice! Tap the report button to log the very first issue.
            </p>
            <div className="flex flex-col space-y-2">
              <button
                type="button"
                onClick={() => navigate("/report")}
                className="w-full bg-[#00a36c] hover:bg-[#008c5c] text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
                <span>Report First Issue</span>
              </button>
              <button
                type="button"
                onClick={() => setDismissedEmptyState(true)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center cursor-pointer"
              >
                <span>Maybe Later (Explore Map)</span>
              </button>
            </div>
          </div>
        )}

        {/* =======================================================
            3. Bottom Sheet Component (Displays Selected Issue Detail)
            ======================================================= */}
        {selectedIssue && (
          <>
            {/* Backdrop cover overlay */}
            <div 
              className="absolute inset-0 bg-slate-900/35 backdrop-blur-3xs z-20 transition-all duration-300"
              onClick={() => setSelectedIssue(null)}
            />

            {/* Bottom Sheet Frame */}
            <div 
              className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl shadow-[0_-8px_30px_rgb(0,0,0,0.12)] border-t border-slate-100 px-5 pt-3 pb-6 z-30 transform transition-transform duration-300 animate-slide-up"
              id="selected-issue-bottom-sheet"
            >
              {/* Central Drag Handle bar visual */}
              <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

              {/* Top Title Line + Close Button */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">
                    {getCategoryEmoji(selectedIssue.category)}
                  </span>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base leading-snug">
                      {selectedIssue.title}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5 tracking-wider">
                      {selectedIssue.department}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedIssue(null)}
                  className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                  id="close-bottom-sheet-btn"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Metadata Badges line */}
              <div className="flex flex-wrap gap-2 mb-3">
                {/* Severity Badge */}
                <span 
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    selectedIssue.severity === "Critical" 
                      ? "bg-red-50 text-critical border-red-100" 
                      : selectedIssue.severity === "High"
                      ? "bg-orange-50 text-high border-orange-100"
                      : "bg-yellow-50 text-yellow-600 border-yellow-100"
                  }`}
                >
                  ⚠️ {selectedIssue.severity} Severity
                </span>

                {/* Status Badge */}
                <span 
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    selectedIssue.status === "Resolved" 
                      ? "bg-green-50 text-resolved border-green-100" 
                      : selectedIssue.status === "In Progress"
                      ? "bg-blue-50 text-blue-600 border-blue-100"
                      : "bg-amber-50 text-amber-600 border-amber-100"
                  }`}
                >
                  ⚙️ {selectedIssue.status}
                </span>

                {/* Ward Badge */}
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                  📍 {selectedIssue.ward}
                </span>
              </div>

              {/* Description preview */}
              <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {selectedIssue.description}
              </p>

              {/* Bottom Actions Row */}
              <div className="flex items-center space-x-3 mt-4">
                {/* Upvote Interactive Button */}
                <button
                  onClick={() => handleUpvote(selectedIssue)}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-3 px-4 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                    user && selectedIssue.upvotedBy.includes(user.uid)
                      ? "bg-primary/10 text-primary border-primary/20 cursor-default"
                      : "bg-white text-primary border-primary/30 hover:border-primary active:scale-98"
                  }`}
                  id="bottom-sheet-upvote-btn"
                >
                  <ThumbsUp className={`w-4 h-4 ${user && selectedIssue.upvotedBy.includes(user.uid) ? "fill-primary" : ""}`} />
                  <span>
                    {selectedIssue.upvotes} {user && selectedIssue.upvotedBy.includes(user.uid) ? "Upvoted" : "Upvote"}
                  </span>
                </button>

                {/* Details Button */}
                <button
                  onClick={() => navigate(`/issue/${selectedIssue.id}`)}
                  className="flex-1 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-4 rounded-xl text-xs text-center transition-all shadow-xs hover:shadow-md active:scale-98 cursor-pointer flex items-center justify-center space-x-1"
                  id="bottom-sheet-details-btn"
                >
                  <span>View Details</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* 4. Stats Glassmorphism Bar (Floating elegantly inside map screen) */}
        <div className="absolute bottom-20 sm:bottom-24 left-4 right-4 sm:left-6 sm:right-6 bg-slate-900/95 backdrop-blur-md px-3 sm:px-4 py-3 sm:py-3.5 flex items-center justify-between z-10 text-white border border-slate-800/80 rounded-2xl shadow-xl transition-all">
          <div className="flex items-center space-x-1.5 sm:space-x-4">
            <div>
              <span className="block text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                <span className="inline sm:hidden">Total</span>
                <span className="hidden sm:inline">Total Reports</span>
              </span>
              <span className="text-xs sm:text-base font-black text-white flex items-center space-x-0.5 sm:space-x-1">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                <span>{totalCount}</span>
              </span>
            </div>

            <div className="w-px h-5 sm:h-8 bg-slate-800" />

            <div>
              <span className="block text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Resolved
              </span>
              <span className="text-xs sm:text-base font-black text-emerald-400 flex items-center space-x-0.5 sm:space-x-1">
                <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-400" />
                <span>{resolvedCount}</span>
              </span>
            </div>

            <div className="w-px h-5 sm:h-8 bg-slate-800 hidden min-[440px]:block" />

            <div className="hidden min-[440px]:block">
              <span className="block text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                In Progress
              </span>
              <span className="text-xs sm:text-base font-black text-blue-400 flex items-center space-x-0.5 sm:space-x-1">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400 animate-pulse" />
                <span>{inProgressCount}</span>
              </span>
            </div>
          </div>

          {/* Quick Action Button based on User Role */}
          {isAdmin ? (
            <button
              onClick={() => navigate("/admin")}
              className="flex items-center justify-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] sm:text-xs px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              id="stats-bar-admin-btn"
            >
              <Shield className="w-3.5 h-3.5 text-emerald-100" />
              <span>Admin Center</span>
            </button>
          ) : (
            <button
              onClick={() => navigate("/report")}
              className="flex items-center justify-center space-x-1 bg-primary hover:bg-primary-dark text-white font-extrabold text-[9px] sm:text-xs px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              id="stats-bar-report-btn"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Report Issue</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
