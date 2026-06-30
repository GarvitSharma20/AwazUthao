import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import confetti from "canvas-confetti";
import ReportMap from "../components/ReportMap";
import { 
  ArrowLeft, 
  MapPin, 
  Camera, 
  Upload, 
  X, 
  Sparkles, 
  AlertCircle, 
  CheckCircle,
  HelpCircle,
  Activity,
  Award,
  Loader2
} from "lucide-react";
import { db, auth } from "../firebase/config";
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from "firebase/firestore";
import { useAuth } from "../hooks/useAuth";
import { fetchReverseGeocode } from "../utils/locationHelper";

const COMMON_SUGGESTIONS = [
  { label: "Pothole 🕳️", title: "Severe Road Pothole", desc: "Large pothole in the middle of the road causing safety hazards." },
  { label: "Streetlight Out 💡", title: "Broken Streetlight", desc: "Streetlight is completely out, making the street very dark and unsafe." },
  { label: "Garbage Dump 🗑️", title: "Illegal Garbage Dumping", desc: "Accumulation of solid waste and plastic bags left unattended on the pavement." },
  { label: "Water Leak 💧", title: "Water Pipe Leakage", desc: "Clean water continuously gushing out from a broken underground pipe." },
  { label: "Broken Sign 🚧", title: "Damaged Traffic Sign", desc: "Speed limit or direction sign is broken or vandalized." },
  { label: "Graffiti 🎨", title: "Graffiti & Vandalism", desc: "Unauthorized graffiti markings on public utility walls." },
];

export default function Report() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Primary Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // AI Automated Scan States
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [aiFilled, setAiFilled] = useState(false);
  const [aiCategory, setAiCategory] = useState("");
  const [aiSeverity, setAiSeverity] = useState("");
  
  // Geolocation Coordinate State [latitude, longitude]
  const [location, setLocation] = useState<[number, number]>(() => {
    const saved = localStorage.getItem("awaz_user_location");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 2) {
          return [parsed[0], parsed[1]];
        }
      } catch (e) {}
    }
    return [20.5937, 78.9629]; // Generic center of India fallback
  });

  const [isLocating, setIsLocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Automatically request GPS position on mount to locate the user
  useEffect(() => {
    locateUser();
  }, []);

  // Redirect administrators away from the report page since they solve issues rather than raising them
  useEffect(() => {
    if (user) {
      const isAdmin = user.isAdmin || user.email === "admin@awazuthao.com" || user.email?.endsWith(".gov.in");
      if (isAdmin) {
        toast.error("Administrators cannot file civic complaints. Redirecting to Command Center...");
        navigate("/admin", { replace: true });
      }
    }
  }, [user, navigate]);

  const locateUser = () => {
    setIsLocating(true);

    const tryIPFallbacks = async () => {
      // 1. Try FreeIPAPI (highly reliable, HTTPS, no-token)
      try {
        const response = await fetch("https://freeipapi.com/api/json");
        if (response.ok) {
          const data = await response.json();
          if (typeof data.latitude === "number" && typeof data.longitude === "number") {
            const coords: [number, number] = [data.latitude, data.longitude];
            setLocation(coords);
            localStorage.setItem("awaz_user_location", JSON.stringify(coords));
            setIsLocating(false);
            toast.success(`Located via IP! Centered on ${data.cityName || "your city"}.`, { icon: "📍" });
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
            setLocation(coords);
            localStorage.setItem("awaz_user_location", JSON.stringify(coords));
            setIsLocating(false);
            toast.success(`Located via IP fallback! Centered on ${data.city || "your city"}.`, { icon: "📍" });
            return;
          }
        }
      } catch (err) {
        console.warn("Secondary IP lookup failed:", err);
      }

      setIsLocating(false);
      toast.error("Could not obtain live location. Drag the map pin manually to set incident coords.");
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setLocation(coords);
          localStorage.setItem("awaz_user_location", JSON.stringify(coords));
          setIsLocating(false);
          toast.success("GPS Lock Established! Coordinates set.", { icon: "📍" });
        },
        (error) => {
          console.warn("Device GPS failed/blocked. Trying IP fallbacks...");
          tryIPFallbacks();
        },
        { enableHighAccuracy: true, timeout: 3500 }
      );
    } else {
      tryIPFallbacks();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      toast.success("Image selected! Starting AI auto-scan... ⚡", { icon: "📸" });
      await autoScanImage(file);
    }
  };

  const autoScanImage = async (file: File) => {
    setIsScanningImage(true);
    setAiFilled(false);
    
    try {
      const base64Data = await convertFileToBase64(file);
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          base64Image: base64Data, 
          mimeType: file.type
        })
      });

      if (!response.ok) {
        throw new Error("AI analysis pipeline issue");
      }

      const data = await response.json();
      
      if (data.inferredTitle) {
        setTitle(data.inferredTitle);
      }
      if (data.inferredDescription) {
        setDescription(data.inferredDescription);
      }
      if (data.inferredCategory) {
        setAiCategory(data.inferredCategory);
      }
      if (data.inferredSeverity) {
        setAiSeverity(data.inferredSeverity);
      }
      
      setAiFilled(true);
      toast.success("Gemini AI finished scanning! Title & description auto-filled.", { 
        icon: "🤖",
        duration: 4000
      });
    } catch (err) {
      console.error("AI auto-scan failed:", err);
      toast.error("Auto-scan failed. You can still type details manually.");
    } finally {
      setIsScanningImage(false);
    }
  };

  const handleSuggestionClick = (suggestion: typeof COMMON_SUGGESTIONS[0]) => {
    setTitle(suggestion.title);
    setDescription(suggestion.desc);
    toast.success(`Selected Preset: ${suggestion.label}`, { duration: 1500 });
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !imageFile) {
      toast.error("All fields and a verification image are mandatory.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("📍 Step 1/3: Anchoring GPS location coordinates...");

    try {
      // Convert media image into secure payload
      const base64Data = await convertFileToBase64(imageFile);
      
      let inferredCategory = aiCategory;
      let inferredSeverity = aiSeverity;

      if (!aiFilled || !inferredCategory || !inferredSeverity) {
        setStatusMessage("🤖 Step 2/3: Prompting Gemini Vision AI to verify and categorize...");
        
        const response = await fetch("/api/analyze-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            base64Image: base64Data, 
            mimeType: imageFile.type,
            title: title.trim(),
            description: description.trim()
          })
        });

        if (!response.ok) {
          throw new Error("Gemini AI categorization pipeline was interrupted");
        }

        const data = await response.json();
        inferredCategory = data.inferredCategory || "Other";
        inferredSeverity = data.inferredSeverity || "Medium";
      } else {
        setStatusMessage("🤖 Step 2/3: Utilizing pre-scanned Gemini Vision analysis...");
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      setStatusMessage("🗺️ Mapping address and coordinates...");
      const geoInfo = await fetchReverseGeocode(location[0], location[1]);

      setStatusMessage("📤 Step 3/3: Direct syncing to cloud databases...");

      const citizenUid = user ? user.uid : "anonymous_user";
      const citizenName = user ? (user.displayName || user.name || "Citizen") : "Anonymous Citizen";

      const finalDocument = {
        title: title.trim(),
        description: description.trim(),
        imageUrl: `data:${imageFile.type};base64,${base64Data}`,
        category: inferredCategory,
        severity: inferredSeverity,
        status: "Reported",
        upvotes: 0,
        upvotedBy: [],
        verifiedBy: [],
        reportedBy: citizenUid,
        reporterName: citizenName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        location: { 
          lat: location[0], 
          lng: location[1],
          latitude: location[0],
          longitude: location[1]
        },
        ward: geoInfo.formattedAddress || "Ward 12 (Taj Ganj), Agra, Uttar Pradesh",
        department: "Municipal Corporation"
      };

      await addDoc(collection(db, "issues"), finalDocument);

      // Award Civic rewards & update user profile status counts
      if (user) {
        try {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, {
            issuesReported: increment(1),
            points: increment(10)
          });
        } catch (pointErr) {
          console.warn("Could not award reward points:", pointErr);
        }
      }

      // Dynamic cinematic confetti blast
      confetti({
        particleCount: 180,
        spread: 90,
        origin: { y: 0.55 },
        colors: ["#10b981", "#3b82f6", "#00a36c", "#ffffff"]
      });

      toast.success(`🎉 Report Filed! Categorized as ${inferredCategory} (${inferredSeverity})`, {
        duration: 6000
      });

      // Reset form variables
      setTitle("");
      setDescription("");
      setImageFile(null);
      setPreviewUrl(null);

      // Navigate smoothly back to the list feed
      setTimeout(() => {
        navigate("/feed");
      }, 1500);

    } catch (error: any) {
      console.error("Submission failed:", error);
      toast.error(`Submission halted: ${error.message || error}`);
    } finally {
      setIsSubmitting(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 animate-fade-in">
      {/* Premium Header Bar */}
      <div className="flex items-center justify-between bg-white border-b border-slate-100 py-3.5 px-4 sticky top-0 z-40">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          Back
        </button>
        <span className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
          <Activity className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          Awaz Uthao Reporting Portal
        </span>
        <div className="w-10"></div> {/* Spacer for symmetry */}
      </div>

      <div className="max-w-md mx-auto p-4 space-y-5">
        
        {/* Intro Branding Section */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-0 opacity-60"></div>
          <div className="relative z-10">
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              🚨 File Civic Complaint
            </h1>
            <p className="text-slate-500 text-xs mt-1.5 leading-relaxed font-medium">
              Submit details, snap a photo, and set the coordinates. Our integrated **Gemini AI Engine** will automatically categorize, assign priority severity, and route reports directly to responsive civic departments.
            </p>
          </div>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-5">
          
          {/* Section 1: Capture Verification Photo */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3.5">
            <h2 className="text-xs font-black tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-[#00a36c]" />
              1. Take or Upload Incident Photo
            </h2>
            
            <div className="relative">
              {previewUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200">
                  <img src={previewUrl} alt="Preview" className="w-full h-52 object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setPreviewUrl(null);
                      setAiFilled(false);
                      setAiCategory("");
                      setAiSeverity("");
                    }}
                    className="absolute top-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white p-2 rounded-full shadow-md transition-all cursor-pointer hover:scale-105"
                    disabled={isScanningImage}
                  >
                    <X className="w-4 h-4 stroke-[3]" />
                  </button>
                  <div className="absolute bottom-3 left-3 bg-[#00a36c] text-white text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-md shadow flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI Ready File Attached
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl h-52 bg-slate-50 hover:bg-slate-100/70 transition-all cursor-pointer group p-4 text-center">
                  <input 
                    type="file" 
                    accept="image/*" 
                    required
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isScanningImage}
                  />
                  <div className="bg-emerald-50 text-[#00a36c] p-4 rounded-full group-hover:scale-110 transition-transform shadow-sm mb-3">
                    <Upload className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <span className="text-slate-700 text-sm font-extrabold">Tap to Upload Image</span>
                  <span className="text-slate-400 text-[10px] font-bold mt-1 max-w-[200px]">
                    Capture via device camera or select a local photo file (Required)
                  </span>
                </label>
              )}

              {isScanningImage && (
                <div className="absolute inset-0 bg-slate-950/75 rounded-xl backdrop-blur-xs flex flex-col items-center justify-center text-center p-4 z-20">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-2.5" />
                  <span className="text-white text-xs font-black uppercase tracking-widest">
                    Scanning Image...
                  </span>
                  <span className="text-slate-300 text-[9px] font-bold mt-1 leading-relaxed">
                    Gemini AI is analyzing the issue & writing title/description
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Set Location */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#00a36c]" />
                2. Set Precise Coordinates
              </h2>
              <button
                type="button"
                onClick={locateUser}
                disabled={isLocating}
                className="text-[10px] font-extrabold text-[#00a36c] bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer active:scale-95"
              >
                {isLocating ? "Acquiring..." : "Get Live GPS 📍"}
              </button>
            </div>

            <p className="text-slate-400 text-[10px] leading-relaxed font-bold">
              Adjust the pin position manually to match the exact hazard. You can click on the map or drag the pin.
            </p>

            {/* Interactive Custom Map Box Container using Maplibre GL */}
            <div className="h-56 rounded-xl overflow-hidden border border-slate-200 shadow-inner relative z-10">
              <ReportMap center={location} onChange={(newCoords) => setLocation(newCoords)} />

              {/* Coordinates Indicator Badge Overlay */}
              <div className="absolute bottom-2 left-2 z-20 bg-slate-900/90 backdrop-blur-sm text-white px-2.5 py-1 rounded-md text-[9px] font-mono font-bold tracking-wider shadow">
                Lat: {location[0].toFixed(5)}, Lng: {location[1].toFixed(5)}
              </div>
            </div>
          </div>

          {/* Section 3: Title and Description Form */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-xs font-black tracking-wider text-slate-400 uppercase flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-[#00a36c]" />
              3. Describe Civic Incident
            </h2>

            {aiFilled && (
              <div className="bg-emerald-50/70 border border-emerald-200/50 rounded-xl p-3.5 flex items-start space-x-2.5 text-slate-700 animate-fade-in">
                <Sparkles className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5 animate-pulse" />
                <div className="text-xs font-medium leading-relaxed">
                  <p className="font-extrabold text-emerald-800">
                    ✨ Auto-filled by Gemini AI Scanner
                  </p>
                  <p className="text-slate-600 text-[10.5px] font-semibold mt-0.5">
                    Detected Category: <span className="text-emerald-700 font-extrabold uppercase tracking-wide text-[9.5px]">{aiCategory}</span> ({aiSeverity} Severity)
                  </p>
                  <p className="text-slate-400 text-[9.5px] mt-1 leading-relaxed">
                    You can modify the auto-generated Title or Description below if needed.
                  </p>
                </div>
              </div>
            )}

            {/* Title suggested presets helper tags */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">
                Quick Selection Suggestions:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-[10.5px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-full transition-all cursor-pointer"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block">
                Issue Title
              </label>
              <input 
                type="text" 
                required
                value={title} 
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g., Overflowing open manhole drain"
                className="w-full border border-slate-300 rounded-xl px-3.5 py-3 text-sm font-medium outline-none focus:border-[#00a36c] focus:ring-1 focus:ring-[#00a36c] transition-all bg-slate-50/50 focus:bg-white"
                id="report-form-title"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block">
                Detailed Description
              </label>
              <textarea 
                required
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                placeholder="Describe exact coordinates, closest address, or other context clues..."
                className="w-full border border-slate-300 rounded-xl px-3.5 py-3 text-sm font-medium h-24 resize-none outline-none focus:border-[#00a36c] focus:ring-1 focus:ring-[#00a36c] transition-all bg-slate-50/50 focus:bg-white"
                id="report-form-desc"
              />
            </div>
          </div>

          {/* Section 4: Gamified Reward Highlights Info Card */}
          {user && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100 flex items-center gap-3.5">
              <div className="bg-[#00a36c] text-white p-2.5 rounded-xl shadow-sm">
                <Award className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                  Earn Civic Duty Rewards!
                </h4>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5 leading-relaxed">
                  Submitting this report awards **10 points** to your profile score. Upvotes and confirmation validations from neighboring citizens will unlock premium local profile badges!
                </p>
              </div>
            </div>
          )}

          {/* Processing Status Message overlay bar */}
          {statusMessage && (
            <div className="bg-emerald-50 text-emerald-800 text-xs py-3.5 px-4 rounded-xl border border-emerald-100 text-center font-extrabold animate-pulse shadow-sm flex items-center justify-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#00a36c] animate-spin" />
              {statusMessage}
            </div>
          )}

          {/* Form Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full font-extrabold py-4 rounded-xl text-sm text-white shadow-lg transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 ${
              isSubmitting 
                ? "bg-slate-300 shadow-none cursor-not-allowed" 
                : "bg-gradient-to-r from-[#00a36c] to-emerald-600 hover:brightness-105"
            }`}
            id="report-form-submit-btn"
          >
            <CheckCircle className="w-4 h-4 stroke-[2.5]" />
            {isSubmitting ? "Processing Verification Pipeline..." : "File Verified Incident Report"}
          </button>
        </form>
      </div>
    </div>
  );
}
