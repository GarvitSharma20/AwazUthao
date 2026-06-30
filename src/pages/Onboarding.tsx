import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowRight, 
  ArrowLeft, 
  Camera, 
  Sparkles, 
  MapPin, 
  ThumbsUp, 
  Trophy, 
  BarChart3 
} from "lucide-react";

export default function Onboarding() {
  const [currentScreen, setCurrentScreen] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentScreen < 2) {
      setCurrentScreen(currentScreen + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentScreen > 0) {
      setCurrentScreen(currentScreen - 1);
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem("awazuthao_onboarding", "true");
    navigate("/login");
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-50 flex flex-col font-sans select-none">
      {/* Keyframe Animations for Floating & Spinning elements */}
      <style>{`
        @keyframes float-up {
          0% {
            transform: translateY(10px);
            opacity: 0;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            transform: translateY(-25px);
            opacity: 0;
          }
        }
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-float-1 {
          animation: float-up 2s infinite ease-out;
          animation-delay: 0s;
        }
        .animate-float-2 {
          animation: float-up 2.4s infinite ease-out;
          animation-delay: 0.6s;
        }
        .animate-float-3 {
          animation: float-up 1.8s infinite ease-out;
          animation-delay: 1.2s;
        }
        .animate-spin-slow {
          animation: spin-slow 12s infinite linear;
        }
        .scrollbar-thin {
          scrollbar-width: none; /* Firefox */
        }
        .scrollbar-thin::-webkit-scrollbar {
          display: none; /* Safari/Chrome */
        }
      `}</style>

      {/* Main Slide Container */}
      <div 
        className="flex-1 flex h-full transition-transform duration-500 ease-out"
        style={{ 
          width: "300%", 
          transform: `translateX(-${(currentScreen * 100) / 3}%)` 
        }}
      >
        {/* =======================================================
            SCREEN 1 — Welcome (Teal Gradient)
            ======================================================= */}
        <div 
          className="w-1/3 h-full flex flex-col justify-between text-white p-6 relative"
          style={{
            background: "linear-gradient(135deg, #1D9E75 0%, #085041 100%)",
          }}
        >
          {/* Top Bar */}
          <div className="flex justify-between items-center pt-4 z-10 shrink-0">
            <span className="text-white/60 text-xs tracking-wider uppercase font-semibold">
              Step 1 of 3
            </span>
            <button 
              onClick={completeOnboarding}
              className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white font-medium text-sm border border-white/10"
            >
              Skip
            </button>
          </div>

          {/* Scrollable Content Container */}
          <div className="flex-1 overflow-y-auto py-4 my-2 flex flex-col justify-center items-center scrollbar-thin">
            {/* Illustration Container */}
            <div className="w-full flex flex-col items-center justify-center relative mb-6 shrink-0">
              {/* Bounce-pin location pin above skyline */}
              <div 
                className="z-10 mb-2"
                style={{ animation: "bounce-pin 1.2s ease-in-out infinite alternate" }}
              >
                <div className="relative w-16 h-16 flex items-center justify-center bg-white rounded-full shadow-lg border border-teal-500/20">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-10 h-10 text-primary"
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
              </div>

              {/* City Skyline Silhouette */}
              <div className="w-full max-w-[280px] h-32 flex items-end justify-between opacity-35 px-4 border-b border-white/20">
                <div className="w-8 bg-white/70 h-12 rounded-t-sm" />
                <div className="w-10 bg-white/80 h-24 rounded-t-sm" />
                <div className="w-12 bg-white/90 h-16 rounded-t-sm" />
                <div className="w-8 bg-white/75 h-20 rounded-t-sm" />
                <div className="w-10 bg-white/85 h-10 rounded-t-sm" />
                <div className="w-7 bg-white/70 h-28 rounded-t-sm" />
              </div>
            </div>

            {/* Content Texts */}
            <div className="text-center px-4 mb-4 shrink-0">
              <h2 className="text-3xl font-extrabold tracking-tight mb-2 text-white">
                Welcome to AwazUthao
              </h2>
              <p className="text-white/90 text-base font-semibold tracking-wide mb-1">
                Aapki Awaaz, Aapka Shehar
              </p>
              <p className="text-white/70 text-sm font-medium">
                Your voice can fix your city
              </p>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pb-6 px-2 shrink-0">
            {/* Dot Indicators */}
            <div className="flex space-x-2">
              <span className="w-2.5 h-2.5 bg-white rounded-full transition-all duration-300" />
              <span className="w-2.5 h-2.5 bg-white/40 rounded-full transition-all duration-300" />
              <span className="w-2.5 h-2.5 bg-white/40 rounded-full transition-all duration-300" />
            </div>

            {/* Next Button */}
            <button
              onClick={handleNext}
              className="flex items-center space-x-2 bg-white text-primary font-bold px-7 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* =======================================================
            SCREEN 2 — AI Power (White Background)
            ======================================================= */}
        <div className="w-1/3 h-full flex flex-col justify-between bg-white text-gray-900 relative">
          {/* Accent Teal Top Bar */}
          <div className="h-1.5 w-full bg-primary shrink-0" />

          {/* Top Bar */}
          <div className="flex justify-between items-center pt-4 px-6 z-10 shrink-0">
            <span className="text-primary font-bold text-xs tracking-wider uppercase">
              Step 2 of 3
            </span>
            <button 
              onClick={completeOnboarding}
              className="px-4 py-1.5 rounded-full bg-primary-dark/5 hover:bg-primary-dark/10 transition-all text-primary font-semibold text-sm"
            >
              Skip
            </button>
          </div>

          {/* Scrollable body content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 scrollbar-thin">
            {/* Custom Rotating AI Camera Illustration */}
            <div className="flex items-center justify-center relative my-2 shrink-0">
              <div className="relative w-40 h-40 flex items-center justify-center">
                {/* Spinning Sparkles */}
                <div className="absolute inset-0 animate-spin-slow">
                  {/* 6 sparkle stars around the central device */}
                  <span className="absolute top-2 left-6 text-primary text-2xl filter drop-shadow-xs">✦</span>
                  <span className="absolute top-12 right-2 text-primary-dark text-xl">✦</span>
                  <span className="absolute bottom-6 right-6 text-amber-500 text-3xl">✦</span>
                  <span className="absolute bottom-2 left-10 text-teal-400 text-lg">✦</span>
                  <span className="absolute top-20 left-1 text-primary text-2xl">✦</span>
                  <span className="absolute bottom-20 right-1 text-emerald-500 text-xl">✦</span>
                </div>

                {/* Phone Outline Container */}
                <div className="relative w-24 h-36 rounded-2xl border-4 border-primary-dark bg-white shadow-xl flex items-center justify-center overflow-hidden">
                  {/* Speaker pill */}
                  <div className="absolute top-2 w-10 h-1 bg-primary-dark rounded-full" />
                  
                  {/* Shutter Camera Circle inside */}
                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-primary flex items-center justify-center bg-teal-50">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-md">
                      <Camera className="w-5 h-5 stroke-[2]" />
                    </div>
                  </div>

                  {/* Bottom Home Line */}
                  <div className="absolute bottom-1.5 w-12 h-1 bg-gray-200 rounded-full" />
                </div>
              </div>
            </div>

            {/* Titles & Details */}
            <div className="text-center shrink-0">
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-2">
                AI Identifies Issues Instantly
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
                Just snap a photo. Gemini AI detects the problem type, severity and the right government department automatically.
              </p>
            </div>

            {/* List of features */}
            <div className="space-y-3 shrink-0">
              <div className="flex items-center space-x-3.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shrink-0 shadow-sm">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-gray-700 font-semibold text-sm">
                  Snap a photo of any civic problem
                </span>
              </div>

              <div className="flex items-center space-x-3.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shrink-0 shadow-sm">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <span className="text-gray-700 font-semibold text-sm">
                  Gemini AI analyzes in 2 seconds
                </span>
              </div>

              <div className="flex items-center space-x-3.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shrink-0 shadow-sm">
                  <MapPin className="w-5 h-5" />
                </div>
                <span className="text-gray-700 font-semibold text-sm">
                  GPS pins the exact location automatically
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between py-4 pb-6 px-6 shrink-0 bg-white border-t border-gray-100">
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="flex items-center justify-center w-11 h-11 rounded-full border border-gray-200 text-gray-500 hover:text-primary hover:border-primary/30 transition-all active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Dot Indicators */}
            <div className="flex space-x-2">
              <span className="w-2.5 h-2.5 bg-primary/40 rounded-full" />
              <span className="w-2.5 h-2.5 bg-primary rounded-full" />
              <span className="w-2.5 h-2.5 bg-primary/40 rounded-full" />
            </div>

            {/* Next Button */}
            <button
              onClick={handleNext}
              className="flex items-center space-x-1 bg-primary text-white font-bold px-6 py-2.5 rounded-full shadow-md hover:bg-primary-dark transition-all cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* =======================================================
            SCREEN 3 — Community (White Background)
            ======================================================= */}
        <div className="w-1/3 h-full flex flex-col justify-between bg-white text-gray-900 relative">
          {/* Accent Teal Top Bar */}
          <div className="h-1.5 w-full bg-primary shrink-0" />

          {/* Top Bar */}
          <div className="flex justify-between items-center pt-4 px-6 z-10 shrink-0">
            <span className="text-primary font-bold text-xs tracking-wider uppercase">
              Step 3 of 3
            </span>
            <div className="w-10" /> {/* Spacer */}
          </div>

          {/* Scrollable body content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 scrollbar-thin">
            {/* Custom Floating Upward Arrow Illustration */}
            <div className="flex items-center justify-center relative my-2 shrink-0">
              <div className="relative w-44 h-40 flex flex-col items-center justify-center">
                {/* Upward floating arrows */}
                <span className="absolute top-4 left-10 text-primary text-xl font-bold animate-float-1">▲</span>
                <span className="absolute top-10 right-12 text-teal-400 text-lg font-bold animate-float-2">▲</span>
                <span className="absolute top-14 left-16 text-emerald-500 text-2xl font-bold animate-float-3">▲</span>

                {/* Trophy at top center */}
                <div className="mb-4 bg-amber-50 p-3 rounded-2xl border-2 border-amber-200 shadow-md">
                  <Trophy className="w-8 h-8 text-amber-500 stroke-[2]" />
                </div>

                {/* 3 Silhouettes */}
                <div className="flex space-x-3.5 items-end">
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-slate-300 mb-1" />
                    <div className="w-10 h-8 bg-slate-200 rounded-t-lg" />
                  </div>
                  <div className="flex flex-col items-center scale-110 -translate-y-1">
                    <div className="w-6 h-6 rounded-full bg-primary/70 mb-1" />
                    <div className="w-12 h-10 bg-primary/20 rounded-t-lg border-t-2 border-primary" />
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-slate-300 mb-1" />
                    <div className="w-10 h-8 bg-slate-200 rounded-t-lg" />
                  </div>
                </div>
              </div>
            </div>

            {/* Titles & Details */}
            <div className="text-center shrink-0">
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-2">
                Together We Fix Our City
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
                Join citizens across your ward. Upvote real issues, earn points, and watch your city actually improve.
              </p>
            </div>

            {/* Feature List */}
            <div className="space-y-3 shrink-0">
              <div className="flex items-center space-x-3.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shrink-0 shadow-sm">
                  <ThumbsUp className="w-5 h-5" />
                </div>
                <span className="text-gray-700 font-semibold text-sm">
                  Upvote and verify issues near you
                </span>
              </div>

              <div className="flex items-center space-x-3.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shrink-0 shadow-sm">
                  <Trophy className="w-5 h-5" />
                </div>
                <span className="text-gray-700 font-semibold text-sm">
                  Earn badges and climb the leaderboard
                </span>
              </div>

              <div className="flex items-center space-x-3.5 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shrink-0 shadow-sm">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <span className="text-gray-700 font-semibold text-sm">
                  Track every issue until it's resolved
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Actions with Back button + Dot indicators + Full Width Button */}
          <div className="px-6 py-4 pb-6 bg-white border-t border-gray-100 space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              {/* Back button */}
              <button
                onClick={handleBack}
                className="flex items-center justify-center w-11 h-11 rounded-full border border-gray-200 text-gray-500 hover:text-primary hover:border-primary/30 transition-all active:scale-95"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Dots */}
              <div className="flex space-x-2">
                <span className="w-2.5 h-2.5 bg-primary/40 rounded-full" />
                <span className="w-2.5 h-2.5 bg-primary/40 rounded-full" />
                <span className="w-2.5 h-2.5 bg-primary rounded-full" />
              </div>

              {/* Spacer matching the back arrow size */}
              <div className="w-11" />
            </div>

            {/* Get Started Button */}
            <button
              onClick={completeOnboarding}
              className="w-full flex items-center justify-center space-x-2 bg-primary hover:bg-primary-dark text-white font-bold py-3.5 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer text-base"
            >
              <span>Get Started</span>
              <span>🚀</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
