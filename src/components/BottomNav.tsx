import { useNavigate, useLocation } from "react-router-dom";
import { Map, ListCollapse, Plus, User, Shield, HardHat } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

interface BottomNavProps {
  onReportClick?: () => void;
}

export default function BottomNav({ onReportClick }: BottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const currentPath = location.pathname;
  
  const isAdmin = user?.isAdmin || user?.email === "admin@awazuthao.com" || user?.email?.endsWith(".gov.in") || user?.role === "officer";
  const isThekedar = user?.role === "thekedar";

  const tabs = isThekedar 
    ? [
        { name: "My Work", path: "/contractor", icon: HardHat },
        { name: "Profile", path: "/profile", icon: User },
      ]
    : [
        ...(isAdmin ? [] : [{ name: "Map", path: "/home", icon: Map }]),
        ...(!isAdmin ? [{ name: "Feed", path: "/feed", icon: ListCollapse }] : []),
        ...(!isAdmin ? [{ name: "Report", path: "/report", icon: Plus, isSpecial: true }] : []),
        ...(isAdmin ? [{ name: "Admin", path: "/admin", icon: Shield }] : []),
        { name: "Profile", path: "/profile", icon: User },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-lg z-50 px-4 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentPath === tab.path;

          if (tab.isSpecial) {
            return (
              <div key={tab.path} className="relative flex flex-col items-center w-16">
                <button
                  onClick={onReportClick || (() => navigate(tab.path))}
                  className="absolute -top-7 w-14 h-14 bg-primary hover:bg-primary-dark text-white rounded-full flex items-center justify-center shadow-lg transition-transform duration-200 active:scale-95 z-20 fab-pulse cursor-pointer"
                  title="Report New Issue"
                  id="bottom-nav-report-btn"
                >
                  <Plus className="w-7 h-7 stroke-[3]" />
                </button>
                <span className="text-[10px] font-semibold text-slate-400 mt-8">
                  Report
                </span>
              </div>
            );
          }

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center w-16 py-1 cursor-pointer transition-all duration-100 active:scale-95"
              id={`bottom-nav-${tab.name.toLowerCase()}-btn`}
            >
              <Icon
                className={`w-6 h-6 mb-0.5 transition-colors duration-200 ${
                  isActive ? "text-primary stroke-[2.5]" : "text-slate-400"
                }`}
              />
              <span
                className={`text-[10px] font-bold tracking-wide transition-colors duration-200 ${
                  isActive ? "text-primary font-extrabold" : "text-slate-400 font-semibold"
                }`}
              >
                {tab.name}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
