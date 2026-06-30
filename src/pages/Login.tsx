import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import { loginWithEmail, registerWithEmail } from "../firebase/authService";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { signOut } from "firebase/auth";
import { Eye, EyeOff } from "lucide-react";

const DEPARTMENTS = [
  { id: "PWD", label: "PWD", emoji: "🛣️", desc: "Roads & Potholes" },
  { id: "Water", label: "Jal Sansthan", emoji: "💧", desc: "Water & Sewage" },
  { id: "NNSWM", label: "Nagar Nigam", emoji: "🗑️", desc: "Waste Management" },
  { id: "DVVNL", label: "DVVNL", emoji: "⚡", desc: "Power & Cables" },
  { id: "Horticulture", label: "Horticulture", emoji: "🌳", desc: "Parks & Trees" },
  { id: "General", label: "General", emoji: "🔧", desc: "Civil Repairs" },
];

const CITIES = [
  { id: "Agra", label: "Agra, UP", emoji: "🕌", desc: "Taj & Heritage" },
  { id: "Noida", label: "Noida, UP", emoji: "🏢", desc: "NCR Development" },
  { id: "Aligarh", label: "Aligarh, UP", emoji: "🔒", desc: "Tala City & AMU" },
  { id: "Delhi", label: "Delhi", emoji: "🏛️", desc: "Capital Territory" },
];

import { ALL_INDIAN_STATES, getCitiesForState } from "../data/indiaData";

export default function Login() {
  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeRole, setActiveRole] = useState<"citizen" | "thekedar" | "officer">("citizen");
  const [wards, setWards] = useState("");
  const [department, setDepartment] = useState("SuperAdmin");
  const [city, setCity] = useState("Agra");
  const [selectedState, setSelectedState] = useState("Uttar Pradesh");
  const [stateSearch, setStateSearch] = useState("");
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [citySearch, setCitySearch] = useState("");
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      const isAdminUser = user.isAdmin || user.email === "admin@awazuthao.com" || user.email?.endsWith(".gov.in") || user.role === "officer";
      if (isAdminUser) {
        navigate("/admin");
      } else if (user.role === "thekedar") {
        navigate("/contractor");
      } else {
        navigate("/home");
      }
    }
  }, [user, authLoading, navigate]);

  // Dynamic Password Validation Checks
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = emailRegex.test(email);

  const hasMinLength = password.length >= 8;
  const hasCapital = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_]/.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const isPasswordValid = hasMinLength && hasCapital && hasNumber && hasSpecial;
  const canSubmitRegister = name.trim().length > 0 && isEmailValid && isPasswordValid && passwordsMatch;

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const firebaseUser = await signInWithGoogle();
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const userRole = userData.role || "citizen";
          
          if (activeRole !== userRole) {
            await signOut(auth);
            let roleName = "Citizen";
            if (userRole === "thekedar") roleName = "Contractor (Thekedar)";
            if (userRole === "officer") roleName = "Officer";
            toast.error(`❌ This Google account is registered as ${roleName}. Please login using the correct desk/portal.`);
            return;
          }
        } else {
          // New registration via Google Sign-In
          if (activeRole === "thekedar") {
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || "Contractor",
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL || null,
              points: 0,
              level: "Authorized Contractor",
              badges: [],
              issuesReported: 0,
              issuesVerified: 0,
              isAdmin: false,
              role: "thekedar",
              joinedAt: serverTimestamp()
            });
          } else if (activeRole === "officer") {
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || "Municipal Officer",
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL || null,
              points: 0,
              level: "Municipal Officer",
              badges: [],
              issuesReported: 0,
              issuesVerified: 0,
              isAdmin: true,
              role: "officer",
              department: "SuperAdmin",
              joinedAt: serverTimestamp()
            });
          } else {
            const isEmailAdmin = firebaseUser.email === "admin@awazuthao.com" || firebaseUser.email?.endsWith(".gov.in");
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || (isEmailAdmin ? "Municipal Administrator" : "Citizen"),
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL || null,
              points: 0,
              level: isEmailAdmin ? "Administrator" : "Civic Rookie",
              badges: [],
              issuesReported: 0,
              issuesVerified: 0,
              isAdmin: !!isEmailAdmin,
              role: isEmailAdmin ? "officer" : "citizen",
              joinedAt: serverTimestamp()
            });
          }
        }
      }
      toast.success("Signed in successfully with Google!");
    } catch (error: any) {
      if (error?.code !== "auth/popup-closed-by-user") {
        toast.error("Failed to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill out all mandatory fields.");
      return;
    }

    if (isRegistering) {
      if (!name.trim()) {
        toast.error("Please enter your full name.");
        return;
      }
      if (!isEmailValid) {
        toast.error("Please enter a valid email address.");
        return;
      }
      if (!isPasswordValid) {
        toast.error("Please fulfill all security criteria.");
        return;
      }
      if (!passwordsMatch) {
        toast.error("Passwords do not match!");
        return;
      }
    }

    setLoading(true);
    try {
      if (isRegistering) {
        await registerWithEmail(
          email, 
          password, 
          name.trim(), 
          activeRole, 
          activeRole === "thekedar" ? wards.trim() : undefined,
          (activeRole === "thekedar" || activeRole === "officer") ? department : undefined,
          (activeRole === "officer" || activeRole === "thekedar") ? city : undefined,
          (activeRole === "officer" || activeRole === "thekedar") ? selectedState : undefined
        );
        toast.success(
          activeRole === "thekedar"
            ? "Contractor account created! Welcome to the Contractor Desk. 🏗️"
            : activeRole === "officer"
            ? "Officer account created! Welcome to the Municipal Officer Desk. 👑"
            : "Citizen account created! Welcome to AwazUthao. ✨"
        );
      } else {
        const firebaseUser = await loginWithEmail(email, password);
        
        // Fetch user doc directly to verify role eligibility
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const userRole = userData.role || "citizen";
          
          if (activeRole !== userRole) {
            await signOut(auth);
            let roleName = "Citizen";
            if (userRole === "thekedar") roleName = "Contractor (Thekedar)";
            if (userRole === "officer") roleName = "Officer";
            throw new Error(`This account is registered as ${roleName}. Please login using the correct desk/portal.`);
          }
        }
        
        toast.success("Logged in successfully!");
      }
    } catch (err: any) {
      const errorCode = err.code || err.message || "";
      console.log("Auth error caught:", errorCode);

      if (errorCode.includes("This account is registered")) {
        toast.error(`❌ ${err.message}`);
      } else if (errorCode.includes("auth/invalid-credential") || errorCode.includes("auth/wrong-password")) {
        toast.error("❌ Invalid email or password. Please verify your credentials and try again.");
      } else if (errorCode.includes("auth/user-not-found")) {
        toast.error("❌ No account found with this email. Please check your spelling or register instead.");
      } else if (errorCode.includes("auth/email-already-in-use")) {
        toast.error("❌ This email is already registered. Please sign in instead.");
      } else if (errorCode.includes("auth/too-many-requests")) {
        toast.error("❌ This account has been temporarily locked due to too many failed attempts. Try again later.");
      } else {
        toast.error(err.message || "⚠️ Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden p-4 select-none"
      style={{
        background: "linear-gradient(135deg, #1D9E75 0%, #064E3B 100%)",
      }}
    >
      {/* Float animation style for background decorative circles */}
      <style>{`
        @keyframes float-circle-1 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(30px, -40px) scale(1.1);
          }
        }
        @keyframes float-circle-2 {
          0%, 100% {
            transform: translate(0, 0) scale(1.1);
          }
          50% {
            transform: translate(-40px, 30px) scale(0.9);
          }
        }
        @keyframes float-circle-3 {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(25px, 25px) scale(1.05);
          }
        }
        .animate-float-circle-1 {
          animation: float-circle-1 12s infinite ease-in-out;
        }
        .animate-float-circle-2 {
          animation: float-circle-2 15s infinite ease-in-out;
        }
        .animate-float-circle-3 {
          animation: float-circle-3 10s infinite ease-in-out;
        }
      `}</style>

      {/* Floating Circles - subtle white with 5% opacity */}
      <div className="absolute top-12 left-10 w-72 h-72 rounded-full bg-white/[0.04] filter blur-xl animate-float-circle-1 pointer-events-none" />
      <div className="absolute bottom-16 right-6 w-96 h-96 rounded-full bg-white/[0.04] filter blur-xl animate-float-circle-2 pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 rounded-full bg-white/[0.03] filter blur-lg animate-float-circle-3 pointer-events-none" />

      {/* Centered White Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 z-10 border border-white/10 animate-fade-in mx-4">
        {/* Top Header / Logo Section */}
        <div className="flex flex-col items-center mb-6">
          {/* Logo container with location pin & sparkle */}
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3.5 shadow-xs">
            <svg
              width="36"
              height="36"
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

          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            AwazUthao
          </h2>
          <p className="text-primary font-semibold text-xs tracking-wider uppercase mt-0.5">
            Aapki Awaaz, Aapka Shehar
          </p>
        </div>

        {/* Gray Divider Line */}
        <div className="h-px w-full bg-slate-100 mb-5" />

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => {
              setActiveRole("citizen");
              setIsRegistering(false); // Default to login on switch
            }}
            className={`py-2 text-[10px] sm:text-[11px] font-black rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
              activeRole === "citizen"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>🇮🇳</span>
            <span>Citizen</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveRole("thekedar");
              setIsRegistering(false); // Default to login on switch
              setDepartment("PWD");
            }}
            className={`py-2 text-[10px] sm:text-[11px] font-black rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
              activeRole === "thekedar"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>🏗️</span>
            <span>Thekedar</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveRole("officer");
              setIsRegistering(false); // Default to login on switch
              setDepartment("SuperAdmin");
            }}
            className={`py-2 text-[10px] sm:text-[11px] font-black rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1 ${
              activeRole === "officer"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>👑</span>
            <span>Officer</span>
          </button>
        </div>

        {/* Prompt Header */}
        <div className="text-center mb-5">
          <h3 className="text-base font-black text-slate-800 tracking-tight">
            {activeRole === "thekedar" 
              ? "Contractor Desk Login" 
              : activeRole === "officer"
              ? "Officer Portal Login"
              : "Citizen Sign In"}
          </h3>
          <p className="text-[11px] text-slate-500 font-bold mt-1">
            {activeRole === "thekedar" 
              ? "Access assigned public works and submit resolution 🏗️" 
              : activeRole === "officer"
              ? "Verify public grievances and dispatch work orders 👑"
              : "Aapki Awaaz, Aapka Shehar. Let's fix our city. 🇮🇳"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Email Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-3">
            {isRegistering && (
              <div>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors disabled:opacity-50"
                />
              </div>
            )}

            {isRegistering && activeRole === "thekedar" && (
              <div className="space-y-3">
                <div>
                  <input
                    type="text"
                    placeholder="Service Wards (optional, e.g. Taj Ganj, Sanjay Place)"
                    value={wards}
                    onChange={(e) => setWards(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors disabled:opacity-50"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 pl-1 font-bold leading-tight">
                    💡 Separate multiple wards using a comma (,)
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider pl-1">
                    Specialist Department / Line of Work
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {DEPARTMENTS.map((dept) => {
                      const isSelected = department === dept.id;
                      return (
                        <button
                          key={dept.id}
                          type="button"
                          onClick={() => setDepartment(dept.id)}
                          disabled={loading}
                          className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between h-[64px] cursor-pointer ${
                            isSelected
                              ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-600 shadow-xs"
                              : "border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50/30"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-base">{dept.emoji}</span>
                            {isSelected && (
                              <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[8px] font-black">
                                ✓
                              </span>
                            )}
                          </div>
                          <div className="mt-1">
                            <span className="block text-[9px] font-black tracking-tight leading-none uppercase">
                              {dept.label}
                            </span>
                            <span className={`block text-[8px] mt-0.5 leading-none font-semibold ${isSelected ? "text-emerald-800" : "text-slate-400"}`}>
                              {dept.desc}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {isRegistering && (activeRole === "officer" || activeRole === "thekedar") && (
              <div className="space-y-4">
                {/* State Selection with Search */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider pl-1">
                    Jurisdiction State / UT 🇮🇳
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search or type state/UT..."
                      value={stateSearch || selectedState}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStateSearch(val);
                        setSelectedState(val);
                        setShowStateDropdown(true);
                      }}
                      onFocus={() => setShowStateDropdown(true)}
                      onBlur={() => setTimeout(() => setShowStateDropdown(false), 200)}
                      disabled={loading}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors disabled:opacity-50 font-bold bg-white"
                    />

                    {showStateDropdown && (
                      <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1">
                        {ALL_INDIAN_STATES
                          .filter(s => s.toLowerCase().includes((stateSearch || "").toLowerCase()))
                          .map((sName) => (
                            <button
                              key={sName}
                              type="button"
                              onMouseDown={() => {
                                setSelectedState(sName);
                                setStateSearch(sName);
                                setShowStateDropdown(false);
                                // Default to the first city of this new state
                                const stateCities = getCitiesForState(sName);
                                const defaultCity = stateCities[0] || "";
                                setCity(defaultCity);
                                setCitySearch(defaultCity);
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-emerald-50 hover:text-emerald-950 transition-colors text-slate-800 flex items-center justify-between"
                            >
                              <span>🇮🇳 {sName}</span>
                              {selectedState === sName && <span className="text-emerald-600 text-xs font-black">✓</span>}
                            </button>
                          ))}
                        {ALL_INDIAN_STATES.filter(s => s.toLowerCase().includes((stateSearch || "").toLowerCase())).length === 0 && (
                          <div className="px-4 py-3 text-[10px] text-slate-400 font-bold leading-normal">
                            ✨ Custom State/UT: "{stateSearch || selectedState}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* City Search & Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider pl-1">
                    Jurisdiction City Name 🏛️
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search or type city..."
                      value={citySearch || city}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCitySearch(val);
                        setCity(val);
                        setShowCityDropdown(true);
                      }}
                      onFocus={() => setShowCityDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                      disabled={loading}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors disabled:opacity-50 font-bold bg-white"
                    />
                    
                    {showCityDropdown && (
                      <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1">
                        {getCitiesForState(selectedState)
                          .filter(c => c.toLowerCase().includes((citySearch || "").toLowerCase()))
                          .map((cName) => (
                            <button
                              key={cName}
                              type="button"
                              onMouseDown={() => {
                                setCity(cName);
                                setCitySearch(cName);
                                setShowCityDropdown(false);
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-emerald-50 hover:text-emerald-950 transition-colors text-slate-800 flex items-center justify-between"
                            >
                              <span>📍 {cName}</span>
                              {city === cName && <span className="text-emerald-600 text-xs font-black">✓</span>}
                            </button>
                          ))}
                        {getCitiesForState(selectedState).filter(c => c.toLowerCase().includes((citySearch || "").toLowerCase())).length === 0 && (
                          <div className="px-4 py-3 text-[10px] text-slate-400 font-bold leading-normal">
                            ✨ Custom City: "{citySearch || city}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 pl-1 font-bold leading-tight">
                    🏛️ As an authority officer or contractor, you will only operate and view public issues belonging to the specific city you select here.
                  </p>
                </div>
              </div>
            )}
            <div>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className={`w-full px-4 py-3 rounded-xl border text-sm focus:outline-none transition-colors disabled:opacity-50 ${
                  email.length === 0 
                    ? 'border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600' 
                    : isEmailValid 
                    ? 'border-emerald-500 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600' 
                    : 'border-red-400 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                }`}
              />
              {/* Real-time Email Warn Label */}
              {email.length > 0 && !isEmailValid && (
                <p className="text-[11px] text-red-500 mt-1 font-semibold pl-1">⚠️ Please enter a valid email address</p>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                id="toggle-password-visibility"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Dynamic Registration Extra Fields */}
            {isRegistering && (
              <>
                {/* Confirm Password Input */}
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                    className={`w-full pl-4 pr-11 py-3 rounded-xl border text-sm focus:outline-none transition-colors disabled:opacity-50 ${
                      confirmPassword.length === 0 
                        ? 'border-slate-200 focus:border-emerald-600' 
                        : passwordsMatch 
                        ? 'border-emerald-500 focus:border-emerald-600' 
                        : 'border-red-400 focus:border-red-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={loading}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                    id="toggle-confirm-password-visibility"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p className="text-[11px] text-red-500 mt-1 font-semibold pl-1">⚠️ Passwords do not match</p>
                )}

                {/* Real-time Validation Tracker UI */}
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 text-xs text-slate-500">
                  <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Security Criteria:</p>
                  <div className="flex items-center space-x-1.5">
                    <span>{isEmailValid ? "✅" : "❌"}</span>
                    <span className={isEmailValid ? "text-emerald-700 font-medium" : ""}>Valid email format</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span>{hasMinLength ? "✅" : "❌"}</span>
                    <span className={hasMinLength ? "text-emerald-700 font-medium" : ""}>At least 8 characters</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span>{hasCapital ? "✅" : "❌"}</span>
                    <span className={hasCapital ? "text-emerald-700 font-medium" : ""}>At least one capital letter (A-Z)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span>{hasNumber ? "✅" : "❌"}</span>
                    <span className={hasNumber ? "text-emerald-700 font-medium" : ""}>At least one numeric digit (0-9)</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span>{hasSpecial ? "✅" : "❌"}</span>
                    <span className={hasSpecial ? "text-emerald-700 font-medium" : ""}>At least one special symbol (!@#$)</span>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading || (isRegistering && !canSubmitRegister)}
              className={`w-full font-extrabold py-3 rounded-xl text-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-2 ${
                isRegistering && !canSubmitRegister 
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed transform-none" 
                  : "bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs hover:shadow-md"
              } disabled:opacity-50`}
            >
              <span>
                {loading 
                  ? "Processing..." 
                  : isRegistering 
                    ? `Create ${activeRole === "thekedar" ? "Thekedar" : activeRole === "officer" ? "Officer" : "Citizen"} Account` 
                    : `Sign In as ${activeRole === "thekedar" ? "Thekedar" : activeRole === "officer" ? "Officer" : "Citizen"}`}
              </span>
            </button>
          </form>

          {/* Toggle View Link */}
          <p className="text-center text-xs text-slate-400">
            {isRegistering ? "Already have an account?" : "New to the platform?"}{" "}
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setPassword("");
                setConfirmPassword("");
              }}
              disabled={loading}
              className="text-emerald-600 font-bold hover:text-emerald-700 underline focus:outline-none cursor-pointer disabled:opacity-50"
            >
              {isRegistering ? "Log In" : "Register Now"}
            </button>
          </p>

          {/* Decorative Divider Line & Google Sign-In Button (Omitted for thekedar & officer) */}
          {activeRole === "citizen" && (
            <>
              <div className="flex items-center my-2 text-slate-300 text-xs tracking-wider uppercase">
                <div className="flex-1 h-[1px] bg-slate-100"></div>
                <span className="px-2 text-slate-400 font-semibold text-[10px]">or</span>
                <div className="flex-1 h-[1px] bg-slate-100"></div>
              </div>

              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-3.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold py-3.5 px-4 rounded-xl border border-slate-200 shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer text-sm disabled:opacity-50"
              >
                {/* Google "G" Logo */}
                <svg viewBox="0 0 24 24" width="20" height="20" className="shrink-0">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </>
          )}


        </div>

        {/* Footer info inside Card */}
        <div className="text-center mt-6">
          <p className="text-[10px] text-slate-400 font-medium tracking-wide">
            🔒 Secure • Free • No spam
          </p>
        </div>
      </div>

      {/* Footer Text outside Card */}
      <p className="mt-6 text-sm text-white/70 font-medium tracking-wide drop-shadow-xs z-10">
        Helping communities across India
      </p>
    </div>
  );
}
