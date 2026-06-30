import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const CIVIC_QUOTES = [
  { text: "Be the change you wish to see in your neighborhood.", author: "Mahatma Gandhi" },
  { text: "Local self-government is the cornerstone of a vibrant democracy.", author: "Civic Vision" },
  { text: "Your voice is the first step toward a cleaner, safer community.", author: "Awaz Uthao" },
  { text: "A small group of committed citizens can transform any city.", author: "Margaret Mead" },
  { text: "Democracy is not a spectator sport; it requires active participation.", author: "Lou Ann Hamblin" },
  { text: "Good governance begins when citizens start reporting and caring.", author: "Civic Duty" }
];

export default function LoadingScreen() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  const selectedQuote = useMemo(() => {
    return CIVIC_QUOTES[Math.floor(Math.random() * CIVIC_QUOTES.length)];
  }, []);

  // Smoothly increment progress bar to 100%
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        const remaining = 100 - prev;
        // Slower step increments for a more deliberate, premium pace
        const step = Math.max(0.3, Math.min(3.0, remaining * 0.04 + Math.random() * 0.6));
        return Math.min(100, Number((prev + step).toFixed(1)));
      });
    }, 65);

    return () => clearInterval(interval);
  }, []);

  // Handle redirect only after progress completes AND firebase auth loading is done
  useEffect(() => {
    if (loading || progress < 100) return;

    const timer = setTimeout(() => {
      if (user) {
        const isAdmin = user.isAdmin || user.email === "admin@awazuthao.com" || user.email?.endsWith(".gov.in") || user.role === "officer";
        const isThekedar = user.role === "thekedar";
        if (isAdmin) {
          navigate("/admin");
        } else if (isThekedar) {
          navigate("/contractor");
        } else {
          navigate("/home");
        }
      } else {
        const onboardingCompleted = localStorage.getItem("awaz_onboarding_done") || localStorage.getItem("awazuthao_onboarding");
        if (onboardingCompleted) {
          navigate("/login");
        } else {
          navigate("/onboarding");
        }
      }
    }, 750); // Give a 750ms pause at 100% for elegant visual closure and stability

    return () => clearTimeout(timer);
  }, [navigate, user, loading, progress]);

  return (
    <div 
      className="fixed inset-0 flex flex-col items-center justify-center text-white overflow-hidden select-none"
      style={{
        background: "linear-gradient(135deg, #1D9E75 0%, #085041 100%)",
      }}
    >
      <div className="flex flex-col items-center max-w-sm px-6 text-center logo-container">
        {/* Animated Map Pin with Sparkle inside */}
        <div 
          className="mb-6 pin-svg animate-pulse"
          style={{ 
            filter: "drop-shadow(0 10px 15px rgba(0, 0, 0, 0.2))"
          }}
        >
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-20 h-20"
          >
            {/* The Solid White Map Pin */}
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
              fill="white"
            />
            {/* Inner Sparkle / Star in Primary Color (#1D9E75) */}
            <path
              d="M12 11.5L13.1 9.1L15.5 8L13.1 6.9L12 4.5L10.9 6.9L8.5 8L10.9 9.1L12 11.5Z"
              fill="#1D9E75"
            />
          </svg>
        </div>

        {/* Brand Name */}
        <h1 className="text-white font-bold text-[32px] tracking-tight leading-tight mb-2 font-sans">
          AwazUthao
        </h1>

        {/* Tagline */}
        <p className="text-white opacity-80 text-[16px] font-medium tracking-wide">
          Aapki Awaaz, Aapka Shehar
        </p>

        {/* Sleek Progress Line Bar */}
        <div className="w-56 mt-12 flex flex-col items-center space-y-2">
          <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden relative backdrop-blur-xs">
            <div 
              className="h-full bg-gradient-to-r from-emerald-300 to-teal-300 rounded-full transition-all duration-75 ease-out shadow-[0_0_12px_rgba(52,211,153,0.5)]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between w-full text-[9px] font-bold tracking-widest text-emerald-200/90 font-mono uppercase">
            <span>Loading App</span>
            <span>{Math.floor(progress)}%</span>
          </div>
        </div>
      </div>

      {/* Inspirational Quote at the bottom */}
      <div className="absolute bottom-10 max-w-xs px-6 text-center animate-fade-in flex flex-col items-center">
        <p className="text-white/70 italic text-xs font-semibold leading-relaxed">
          "{selectedQuote.text}"
        </p>
        <p className="text-emerald-300 font-extrabold text-[9px] uppercase tracking-widest mt-2 opacity-90">
          — {selectedQuote.author}
        </p>
      </div>
    </div>
  );
}

