import React from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import LoadingScreen from "./pages/LoadingScreen";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Feed from "./pages/Feed";
import IssueDetail from "./pages/IssueDetail";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import ContractorDashboard from "./pages/ContractorDashboard";
import AppShell from "./components/AppShell";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            background: "#ffffff",
            color: "#085041",
            fontFamily: "Inter, sans-serif",
            fontWeight: 700,
            fontSize: "12px",
            borderRadius: "1rem",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
            border: "1px solid #f1f5f9",
            padding: "12px 18px",
          }
        }} 
      />
      <Routes>
        <Route path="/" element={<LoadingScreen />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected App Pages wrapped in AppShell */}
        <Route 
          path="/home" 
          element={
            <AppShell>
              <Home />
            </AppShell>
          } 
        />
        <Route 
          path="/feed" 
          element={
            <AppShell>
              <Feed />
            </AppShell>
          } 
        />
        <Route 
          path="/report" 
          element={
            <AppShell>
              <ReportProxy />
            </AppShell>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <AppShell>
              <Profile />
            </AppShell>
          } 
        />
        <Route 
          path="/issue/:id" 
          element={
            <AppShell>
              <IssueDetail />
            </AppShell>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <AppShell>
              <Admin />
            </AppShell>
          } 
        />
        <Route 
          path="/contractor" 
          element={
            <ContractorDashboard />
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

// Lazy import or simple wrapper for Report to avoid any reference issues
import Report from "./pages/Report";
function ReportProxy() {
  return <Report />;
}
