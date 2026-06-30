import React, { useState } from "react";
import { db, auth } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp, doc, updateDoc, increment } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { fetchReverseGeocode } from "../utils/locationHelper";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  // Safe base64 converter utility function
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
    if (!title || !description || !imageFile) {
      toast.error("All fields and a verification image are mandatory.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("📍 Step 1/3: Catching GPS coordinate locks...");

    // 1. Geolocation capture
    let latitude = 20.5937; 
    let longitude = 78.9629;
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
        });
      });
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
    } catch (err) {
      console.warn("GPS timeout or blocked. Defaulting coordinates to city center.");
    }

    try {
      // 2. Direct Gemini processing using server-side endpoint (Saves API network hops and secures key)
      setStatusMessage("🤖 Step 2/3: Prompting Gemini Flash Vision API...");
      
      const base64Data = await convertFileToBase64(imageFile);
      
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
        throw new Error("Failed to analyze image with Gemini API");
      }

      const data = await response.json();
      const inferredCategory = data.inferredCategory || "Other";
      const inferredSeverity = data.inferredSeverity || "Medium";

      // 3. Complete Cloud Uploads (Image and Metadata Schema)
      setStatusMessage("🗺️ Mapping address and coordinates...");
      const geoInfo = await fetchReverseGeocode(latitude, longitude);

      setStatusMessage("📤 Step 3/3: Syncing media and documentation directly to Firebase...");
      
      const citizenUid = auth.currentUser ? auth.currentUser.uid : "anonymous_user";
      const citizenName = auth.currentUser ? (auth.currentUser.displayName || "Citizen") : "Anonymous Citizen";

      const finalDocument = {
        title: title.trim(),
        description: description.trim(),
        imageUrl: `data:${imageFile.type};base64,${base64Data}`,
        category: inferredCategory,
        severity: inferredSeverity,
        status: "Reported", // Default initial lifecycle status state
        upvotes: 0,
        upvotedBy: [],
        verifiedBy: [],
        reportedBy: citizenUid,
        reporterName: citizenName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        location: { 
          lat: latitude, 
          lng: longitude,
          latitude: latitude,
          longitude: longitude
        },
        ward: geoInfo.formattedAddress || "Ward 12 (Taj Ganj), Agra, Uttar Pradesh"
      };

      await addDoc(collection(db, "issues"), finalDocument);

      // Award Civic points & increment user report counts
      if (auth.currentUser) {
        try {
          const userRef = doc(db, "users", auth.currentUser.uid);
          await updateDoc(userRef, {
            issuesReported: increment(1),
            points: increment(10)
          });
        } catch (pointErr) {
          console.warn("Could not award points (user profile might not exist yet):", pointErr);
        }
      }
      
      toast.success(`🎉 Incident Logged! Category: ${inferredCategory}, Severity: ${inferredSeverity}`, {
        duration: 5000
      });
      
      // Cleanup inputs on complete success flow
      setTitle("");
      setDescription("");
      setImageFile(null);
      setPreviewUrl(null);
      onClose();

    } catch (error: any) {
      console.error("Pipeline failure:", error);
      toast.error(`Submission halted: ${error.message || error}`);
    } finally {
      setIsSubmitting(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm" id="upload-modal-container">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <h2 className="text-lg font-black text-slate-800">🚨 File Civic Complaint</h2>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="text-slate-400 font-bold hover:text-slate-600 cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">ISSUE TITLE</label>
            <input 
              type="text" 
              required
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g., Open electrical transformer box lid"
              className="w-full border border-slate-400 rounded-xl p-3.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              id="upload-modal-title"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">DETAILED DESCRIPTION</label>
            <textarea 
              required
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              placeholder="Provide exact landmarks or helpful context details..."
              className="w-full border border-slate-400 rounded-xl p-3.5 text-sm h-28 resize-none outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              id="upload-modal-desc"
            />
          </div>

          <div>
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">TAKE OR UPLOAD PHOTO</label>
            <input 
              type="file" 
              accept="image/*" 
              required
              onChange={handleFileChange}
              disabled={isSubmitting}
              className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:bg-emerald-50 file:text-[#00a36c] file:font-extrabold hover:file:bg-emerald-100 cursor-pointer"
              id="upload-modal-file"
            />
            {previewUrl && (
              <img src={previewUrl} alt="Preview" className="mt-3 w-full h-40 object-cover rounded-xl border" />
            )}
          </div>

          {statusMessage && (
            <div className="bg-emerald-50 text-emerald-800 text-xs py-2.5 px-3 rounded-xl border border-emerald-100 text-center font-bold animate-pulse">
              {statusMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full font-bold py-4 rounded-xl text-sm text-white shadow-md transition-all cursor-pointer active:scale-95 ${
              isSubmitting ? "bg-slate-300 cursor-not-allowed" : "bg-[#00a36c] hover:bg-[#008c5c]"
            }`}
            id="upload-modal-submit"
          >
            {isSubmitting ? "Processing Request..." : "File Verified Incident Report"}
          </button>
        </form>
      </div>
    </div>
  );
}
