import React, { useState, useEffect, useRef } from "react";
import { 
  ArrowLeft, 
  Shield, 
  MapPin, 
  Building2, 
  User, 
  FileText, 
  Wrench, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Plus, 
  X, 
  Check, 
  TrendingUp,
  AlertCircle,
  Briefcase,
  Layers,
  Banknote,
  Calendar,
  ChevronRight,
  ChevronDown,
  Search,
  ThumbsUp,
  Eye,
  Info,
  Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase/config";
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, serverTimestamp, increment } from "firebase/firestore";
import { useAuth } from "../hooks/useAuth";
import { useIssues, Issue } from "../hooks/useIssues";
import { sendNotification } from "../hooks/useNotifications";
import { getSmartLocalLocation } from "../utils/locationHelper";
import { toast } from "react-hot-toast";
import { ALL_INDIAN_STATES, getCitiesForState } from "../data/indiaData";

interface CustomDropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomDropdownProps {
  options: CustomDropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function CustomDropdown({ options, value, onChange, placeholder = "Select option...", disabled = false }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 font-bold cursor-pointer transition-all flex items-center justify-between text-left shadow-xs"
      >
        <span className={selectedOption ? "text-slate-800 font-extrabold" : "text-slate-400 font-medium"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-100 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-fade-in p-1 space-y-0.5">
          {options.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400 font-semibold">
              No registered options in your city
            </div>
          ) : (
            options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => {
                    if (opt.disabled) return;
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${
                    opt.disabled
                      ? "opacity-40 cursor-not-allowed text-slate-400 bg-slate-50"
                      : isSelected
                      ? "bg-emerald-50 text-emerald-700 font-extrabold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <span className={opt.disabled ? "line-through text-slate-400" : ""}>{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { issues, loading: issuesLoading } = useIssues();

  // Jurisdiction & Municipal settings
  const [officerCity, setOfficerCity] = useState("Agra");
  const [officerState, setOfficerState] = useState("Uttar Pradesh");
  const [adminCitySearch, setAdminCitySearch] = useState("");
  const [showAdminCityDropdown, setShowAdminCityDropdown] = useState(false);

  // Contractors State
  const [contractors, setContractors] = useState<{ uid: string; name: string; department?: string; city?: string }[]>([]);
  const [loadingContractors, setLoadingContractors] = useState(false);

  // Active search & status tabs
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Reported" | "In Progress" | "Resolved">("all");
  
  // Selected detail view & assignment states
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [assigningIssueId, setAssigningIssueId] = useState<string | null>(null);
  const [workOrderDept, setWorkOrderDept] = useState("");
  const [selectedContractorId, setSelectedContractorId] = useState("");
  const [selectedResponsibility, setSelectedResponsibility] = useState("");
  const [allocatedDeadline, setAllocatedDeadline] = useState("");
  const [workInstructions, setWorkInstructions] = useState("");
  const [submittingWorkOrder, setSubmittingWorkOrder] = useState(false);

  // Administrative direct resolution modal
  const [showDirectResolveModal, setShowDirectResolveModal] = useState<string | null>(null);
  const [resolutionComment, setResolutionComment] = useState("");
  const [submittingDirectResolve, setSubmittingDirectResolve] = useState(false);

  // Contractor work improvement states
  const [improvementNotes, setImprovementNotes] = useState("");
  const [showImprovementForm, setShowImprovementForm] = useState(false);

  // Officer claiming control state
  const [claimingControl, setClaimingControl] = useState(false);

   const MOCK_CONTRACTORS = [
    { uid: "mock_thekedar_1", name: "Agra Infrastructure Builders (A.K. Singh)", department: "PWD", city: "Agra" },
    { uid: "mock_thekedar_2", name: "Taj Sanitation Services (H.R. Khan)", department: "NNSWM", city: "Agra" },
    { uid: "mock_thekedar_3", name: "Ganga Jal Sansthan Contractors", department: "Water", city: "Agra" },
    { uid: "mock_thekedar_4", name: "Yamuna Power & Streetlight Co.", department: "DVVNL", city: "Agra" },
    { uid: "mock_thekedar_5", name: "Noida Roadways Construction Ltd.", department: "PWD", city: "Noida" },
    { uid: "mock_thekedar_6", name: "Noida Swachhata & Waste Management", department: "NNSWM", city: "Noida" },
    { uid: "mock_thekedar_7", name: "Noida Jal Board Contractor", department: "Water", city: "Noida" },
    { uid: "mock_thekedar_8", name: "Noida Vidyut Power Corp", department: "DVVNL", city: "Noida" },
    { uid: "mock_thekedar_9", name: "Aligarh Lock & Road Infra", department: "PWD", city: "Aligarh" },
    { uid: "mock_thekedar_10", name: "Aligarh Sewerage & Drainage Co.", department: "Water", city: "Aligarh" },
    { uid: "mock_thekedar_11", name: "Delhi PWD Mega Builders", department: "PWD", city: "Delhi" },
    { uid: "mock_thekedar_12", name: "Delhi Jal Sansthan Group", department: "Water", city: "Delhi" }
  ];

  const [inlineDept, setInlineDept] = useState("");
  const [inlineContractorId, setInlineContractorId] = useState("");
  const [isUpdatingInline, setIsUpdatingInline] = useState(false);

  useEffect(() => {
    if (selectedIssue) {
      if (selectedIssue.contractorId) {
        setInlineContractorId(selectedIssue.contractorId);
        const contractorObj = contractors.find(c => c.uid === selectedIssue.contractorId) || 
                              MOCK_CONTRACTORS.find(c => c.uid === selectedIssue.contractorId);
        if (contractorObj && contractorObj.department) {
          setInlineDept(contractorObj.department);
        } else {
          setInlineDept(selectedIssue.department || "");
        }
      } else {
        setInlineDept("");
        setInlineContractorId("");
      }
    } else {
      setInlineDept("");
      setInlineContractorId("");
    }
  }, [selectedIssue, contractors]);

  const DEPARTMENT_RESPONSIBILITIES: Record<string, string[]> = {
    PWD: [
      "Pavement Reconstruction & Asphalt Laying",
      "Pothole Filling & Levelling",
      "Speed Breaker & Zebra Crossing Painting",
      "Road Side Footpath Repair",
      "Bridge/Overpass Expansion Joint Repair"
    ],
    Water: [
      "Sewage Pipe De-clogging & Jetting",
      "Water Pipeline Leakage Repair",
      "Open Drain Cleaning & Desilting",
      "Manhole Cover Replacement",
      "Water Tank Chlorination & Cleaning"
    ],
    NNSWM: [
      "Garbage Heap Clearing & Landfill Transit",
      "Door-to-door Waste Collection Monitoring",
      "Public Dustbin Installation & Emptying",
      "Street Sweeping & Sanitation Disinfection",
      "Biological Waste Segregation Supervision"
    ],
    DVVNL: [
      "Streetlight Bulb/LED Replacement",
      "Hanging Live Wire Repair & Insulation",
      "Electric Pole Structural Reinforcement",
      "Feeder Pillar Box Repair",
      "Transformer Oil Leakage Arresting"
    ]
  };

  const parseCityFromWard = (wardStr: string) => {
    if (!wardStr) return null;
    const delimiters = ["•", ",", "-"];
    let parts: string[] = [wardStr];
    for (const delim of delimiters) {
      const nextParts: string[] = [];
      for (const p of parts) {
        nextParts.push(...p.split(delim));
      }
      parts = nextParts;
    }
    const cleanedParts = parts
      .map(p => p.trim())
      .filter(p => {
        const lower = p.toLowerCase();
        return (
          p.length > 0 &&
          !lower.startsWith("ward") &&
          !lower.startsWith("sector") &&
          !lower.startsWith("zone") &&
          !lower.startsWith("division") &&
          !lower.startsWith("india") &&
          lower !== "general"
        );
      });
    if (cleanedParts.length >= 2) {
      return {
        city: cleanedParts[0],
        state: cleanedParts[1]
      };
    } else if (cleanedParts.length === 1) {
      return {
        city: cleanedParts[0],
        state: null
      };
    }
    return null;
  };

  const getDeptKeyFromCategory = (category: string): string => {
    const cat = (category || "").toLowerCase();
    if (cat.includes("road") || cat.includes("pothole") || cat.includes("footpath") || cat.includes("bridge") || cat.includes("pavement")) {
      return "PWD";
    }
    if (cat.includes("water") || cat.includes("sewage") || cat.includes("drain") || cat.includes("pipeline") || cat.includes("leakage") || cat.includes("manhole")) {
      return "Water";
    }
    if (cat.includes("garbage") || cat.includes("waste") || cat.includes("sanitation") || cat.includes("cleaning") || cat.includes("sweeping")) {
      return "NNSWM";
    }
    if (cat.includes("light") || cat.includes("power") || cat.includes("electricity") || cat.includes("wire") || cat.includes("pole")) {
      return "DVVNL";
    }
    return "PWD";
  };

  const getDeptDisplayName = (deptKey: string) => {
    switch (deptKey) {
      case "PWD": return "PWD (Roads & Infrastructure)";
      case "Water": return "Jal Sansthan (Water & Sewage)";
      case "NNSWM": return "Nagar Nigam Waste Management (NNSWM)";
      case "DVVNL": return "Power Corporation (DVVNL)";
      default: return "General (Civil Repairs)";
    }
  };

  const getMunicipalBodyName = (cityStr: string, stateStr: string) => {
    if (!cityStr) return "Municipal Corporation";
    const cleanedCity = cityStr.trim();
    const lowerCity = cleanedCity.toLowerCase();

    if (lowerCity === "delhi" || lowerCity === "new delhi") return "Municipal Corporation of Delhi (MCD)";
    if (lowerCity === "mumbai" || lowerCity === "bombay") return "Brihanmumbai Municipal Corporation (BMC)";
    if (lowerCity === "bengaluru" || lowerCity === "bangalore") return "Bruhat Bengaluru Mahanagara Palike (BBMP)";
    if (lowerCity === "kolkata" || lowerCity === "calcutta") return "Kolkata Municipal Corporation (KMC)";
    if (lowerCity === "chennai" || lowerCity === "madras") return "Greater Chennai Corporation (GCC)";
    if (lowerCity === "hyderabad") return "Greater Hyderabad Municipal Corporation (GHMC)";
    if (lowerCity === "pune") return "Pune Municipal Corporation (PMC)";
    if (lowerCity === "noida") return "Noida Development Authority";
    if (lowerCity === "greater noida") return "Greater Noida Authority";
    if (lowerCity === "gurugram" || lowerCity === "gurgaon") return "Municipal Corporation of Gurugram (MCG)";
    if (lowerCity === "aligarh") return "Aligarh Municipal Corporation (AMC)";
    if (lowerCity === "agra") return "Agra Nagar Nigam (ANN)";
    
    return `${cleanedCity} Municipal Corporation`;
  };

  // Check if issue is in selected officer city
  const isIssueInCity = (issue: Issue, city: string) => {
    if (!issue.ward) return false;
    const parsed = parseCityFromWard(issue.ward);
    if (parsed && parsed.city) {
      return parsed.city.toLowerCase() === city.toLowerCase();
    }
    const wardLower = issue.ward.toLowerCase();
    const cityLower = city.toLowerCase();
    return wardLower.includes(cityLower) || (issue.description && issue.description.toLowerCase().includes(cityLower));
  };

  // Load persistence for Jurisdiction City
  useEffect(() => {
    if (user?.uid) {
      // If user profile has set city, use it
      const firestoreUserCity = (user as any).city || (user as any).cityName;
      if (firestoreUserCity) {
        setOfficerCity(firestoreUserCity);
        if ((user as any).state) setOfficerState((user as any).state);
      } else {
        const localCity = localStorage.getItem("awaz_officer_city");
        if (localCity) {
          setOfficerCity(localCity);
          if (localCity === "Delhi") setOfficerState("Delhi");
          else if (localCity === "Noida" || localCity === "Aligarh" || localCity === "Agra") setOfficerState("Uttar Pradesh");
        } else {
          // Check standard location coordinates
          const savedUserLoc = localStorage.getItem("awaz_user_location");
          if (savedUserLoc) {
            try {
              const parsed = JSON.parse(savedUserLoc);
              if (Array.isArray(parsed) && parsed.length === 2) {
                const smartLoc = getSmartLocalLocation(parsed[0], parsed[1]);
                if (smartLoc && smartLoc.city) {
                  setOfficerCity(smartLoc.city);
                  if (smartLoc.state) setOfficerState(smartLoc.state);
                }
              }
            } catch (e) {}
          }
        }
      }
    }
  }, [user]);

  // Fetch Contractors from DB
  useEffect(() => {
    const fetchContractors = async () => {
      setLoadingContractors(true);
      try {
        const q = query(collection(db, "users"), where("role", "==", "thekedar"));
        const querySnap = await getDocs(q);
        const list: { uid: string; name: string; department?: string; city?: string }[] = [];
        querySnap.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({ 
            uid: docSnap.id, 
            name: data.name || "Contractor",
            department: data.department,
            city: data.city || data.cityName || ""
          });
        });
        setContractors(list);
      } catch (err) {
        console.warn("Failed to fetch live database contractors:", err);
      } finally {
        setLoadingContractors(false);
      }
    };

    fetchContractors();
  }, []);

  // Update jurisdiction settings
  const handleJurisdictionChange = async (newCity: string, newState: string) => {
    setOfficerCity(newCity);
    setOfficerState(newState);
    localStorage.setItem("awaz_officer_city", newCity);
    localStorage.setItem("awaz_officer_state", newState);

    if (user?.uid) {
      try {
        await updateDoc(doc(db, "users", user.uid), {
          city: newCity,
          state: newState
        });
        toast.success(`Jurisdiction adjusted to ${newCity}, ${newState}! 🏛️`);
      } catch (e) {
        console.warn("Failed to persist changed city in user doc:", e);
      }
    } else {
      toast.success(`Jurisdiction adjusted to ${newCity}, ${newState}! 🏛️`);
    }
  };

  // Submit inline contractor assignment change
  const handleInlineAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !inlineContractorId) {
      toast.error("Please select a contractor.");
      return;
    }

    setIsUpdatingInline(true);
    try {
      const contractorObj = contractors.find(c => c.uid === inlineContractorId) || 
                            MOCK_CONTRACTORS.find(c => c.uid === inlineContractorId);
      const contractorName = contractorObj ? contractorObj.name : "Contractor";

      const commentObj = {
        id: Math.random().toString(36).substring(2, 9),
        authorName: user?.name || "Authority Officer",
        authorId: user?.uid || "authority",
        text: `👷 WORK ORDER UPDATED: Assigned to Contractor "${contractorName}" [Department Sector: ${inlineDept}]`,
        createdAt: new Date().toISOString(),
        isOfficial: true
      };

      const issueRef = doc(db, "issues", selectedIssue.id);
      await updateDoc(issueRef, {
        status: "In Progress",
        severity: "In Progress",
        workOrderStatus: "Assigned",
        contractorId: inlineContractorId,
        contractorName: contractorName,
        department: inlineDept,
        assignedOfficer: user?.name || "Municipal Desk Officer",
        assignedOfficerId: user?.uid || null,
        comments: arrayUnion(commentObj),
        updatedAt: serverTimestamp()
      });

      // Notify the contractor
      await sendNotification(
        inlineContractorId,
        "New Work Order Assignment! 🏗️",
        `Municipal desk "${user?.name || "Officer"}" has assigned you to a work order.`,
        "status",
        selectedIssue.id
      );

      toast.success(`Successfully assigned work order to ${contractorName}! 🏗️`);

      // Update selected issue locally
      setSelectedIssue(prev => prev ? {
        ...prev,
        status: "In Progress",
        severity: "In Progress",
        workOrderStatus: "Assigned",
        contractorId: inlineContractorId,
        contractorName: contractorName,
        department: inlineDept,
        assignedOfficer: user?.name || "Municipal Desk Officer",
        assignedOfficerId: user?.uid || undefined,
        comments: prev.comments ? [...prev.comments, commentObj] : [commentObj]
      } : null);

    } catch (error) {
      console.error("Error updating contractor assignment:", error);
      toast.error("Failed to update contractor assignment.");
    } finally {
      setIsUpdatingInline(false);
    }
  };

  // Submit assigned contractor Work Order
  const handleAssignContractorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningIssueId || !selectedContractorId || !selectedResponsibility) {
      toast.error("Please fill in all requested work order details.");
      return;
    }

    setSubmittingWorkOrder(true);
    try {
      const contractorObj = contractors.find(c => c.uid === selectedContractorId) || 
                            MOCK_CONTRACTORS.find(c => c.uid === selectedContractorId);
      const contractorName = contractorObj ? contractorObj.name : "Contractor";
      const responsibility = selectedResponsibility || "General Ground Remediation";

      const commentObj = {
        id: Math.random().toString(36).substring(2, 9),
        authorName: user?.name || "Authority Officer",
        authorId: user?.uid || "authority",
        text: `👷 WORK ORDER DISPATCHED: Assigned to Contractor "${contractorName}" [Operational Scope: ${responsibility}]. Standard Instructions: ${workInstructions.trim() || "Clean up and restore on-ground."}`,
        createdAt: new Date().toISOString(),
        isOfficial: true
      };

      const issueRef = doc(db, "issues", assigningIssueId);
      await updateDoc(issueRef, {
        status: "In Progress",
        severity: "In Progress",
        workOrderStatus: "Assigned",
        contractorId: selectedContractorId,
        contractorName: contractorName,
        contractorResponsibility: responsibility,
        deadline: allocatedDeadline || "Immediate",
        workOrderInstructions: workInstructions.trim() || "Restore on-ground site.",
        assignedOfficer: user?.name || "Municipal Desk Officer",
        assignedOfficerId: user?.uid || null,
        comments: arrayUnion(commentObj),
        updatedAt: serverTimestamp()
      });

      // Notify the contractor
      await sendNotification(
        selectedContractorId,
        "New High-Sensitivity Work Order! 🏗️",
        `Municipal desk "${user?.name || "Officer"}" has designated you for ${responsibility}`,
        "status",
        assigningIssueId
      );

      toast.success(`Work Order successfully dispatched to ${contractorName}! 🏗️`);

      // Update selected issue locally
      if (selectedIssue && selectedIssue.id === assigningIssueId) {
        setSelectedIssue(prev => prev ? {
          ...prev,
          status: "In Progress",
          severity: "In Progress",
          workOrderStatus: "Assigned",
          contractorId: selectedContractorId,
          contractorName: contractorName,
          contractorResponsibility: responsibility,
          deadline: allocatedDeadline || "Immediate",
          workOrderInstructions: workInstructions.trim(),
          assignedOfficer: user?.name || "Municipal Desk Officer",
          assignedOfficerId: user?.uid || undefined
        } : null);
      }

      setAssigningIssueId(null);
      setSelectedContractorId("");
      setSelectedResponsibility("");
      setAllocatedDeadline("");
      setWorkInstructions("");
    } catch (error: any) {
      toast.error(`Work order dispatch failed: ${error.message}`);
    } finally {
      setSubmittingWorkOrder(false);
    }
  };

  // Direct Administrative Resolution Submit
  const handleDirectResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showDirectResolveModal) return;

    setSubmittingDirectResolve(true);
    try {
      const commentObj = {
        id: Math.random().toString(36).substring(2, 9),
        authorName: user?.name || "Authority Officer",
        authorId: user?.uid || "authority",
        text: `🏛️ RESOLVED DIRECTLY BY AUTHORITY: ${resolutionComment.trim() || "Grievance processed and resolved directly by the Municipal Officer desk."}`,
        createdAt: new Date().toISOString(),
        isOfficial: true
      };

      const issueRef = doc(db, "issues", showDirectResolveModal);
      await updateDoc(issueRef, {
        status: "Resolved",
        severity: "Resolved",
        comments: arrayUnion(commentObj),
        resolvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      if (user?.uid) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          issuesSolved: increment(1)
        }).catch(err => console.error("Error updating officer issuesSolved:", err));
      }

      toast.success("Grievance officially closed and resolved! 🤝");

      if (selectedIssue && selectedIssue.id === showDirectResolveModal) {
        setSelectedIssue(prev => prev ? {
          ...prev,
          status: "Resolved",
          severity: "Resolved"
        } : null);
      }

      setShowDirectResolveModal(null);
      setResolutionComment("");
    } catch (err: any) {
      toast.error(`Resolution update failed: ${err.message}`);
    } finally {
      setSubmittingDirectResolve(false);
    }
  };

  // Officer Approves and Verifies Contractor Completed Work
  const handleApproveContractorWork = async (issueId: string) => {
    const toastId = toast.loading("Verifying and approving contractor work...");
    try {
      const commentObj = {
        id: Math.random().toString(36).substring(2, 9),
        authorName: user?.name || "Authority Officer",
        authorId: user?.uid || "authority",
        text: `✅ WORK VERIFIED & APPROVED: The on-ground remediation work submitted by Contractor "${selectedIssue?.contractorName}" has been officially inspected and approved by ${user?.name || "the Authority Officer"}.`,
        createdAt: new Date().toISOString(),
        isOfficial: true
      };

      const issueRef = doc(db, "issues", issueId);
      await updateDoc(issueRef, {
        status: "Resolved",
        severity: "Resolved",
        workOrderStatus: "Approved",
        comments: arrayUnion(commentObj),
        resolvedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      if (user?.uid) {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          issuesSolved: increment(1)
        }).catch(err => console.error("Error updating officer issuesSolved:", err));
      }

      if (selectedIssue?.contractorId) {
        const contractorRef = doc(db, "users", selectedIssue.contractorId);
        await updateDoc(contractorRef, {
          issuesSolved: increment(1)
        }).catch(err => console.error("Error updating contractor issuesSolved:", err));
      }

      // Notify the contractor
      if (selectedIssue?.contractorId) {
        await sendNotification(
          selectedIssue.contractorId,
          "Work Order Approved! 🏆",
          `Your work submission for "${selectedIssue.title}" has been officially approved by the officer.`,
          "status",
          issueId
        );
      }

      toast.success("Work officially approved and issue resolved! 🏆", { id: toastId });

      if (selectedIssue && selectedIssue.id === issueId) {
        setSelectedIssue(prev => prev ? {
          ...prev,
          status: "Resolved",
          severity: "Resolved",
          workOrderStatus: "Approved",
          comments: prev.comments ? [...prev.comments, commentObj] : [commentObj]
        } : null);
      }
    } catch (err: any) {
      toast.error(`Approval failed: ${err.message}`, { id: toastId });
    }
  };

  // Officer Rejects Contractor Completed Work (Request Improvement)
  const handleRejectContractorWork = async (issueId: string, notes: string) => {
    if (!notes.trim()) {
      toast.error("Please enter improvement instructions for the contractor.");
      return;
    }
    const toastId = toast.loading("Sending improvement instructions to contractor...");
    try {
      const commentObj = {
        id: Math.random().toString(36).substring(2, 9),
        authorName: user?.name || "Authority Officer",
        authorId: user?.uid || "authority",
        text: `⚠️ IMPROVEMENT REQUIRED: Work rejected by ${user?.name || "the Authority Officer"}. Instructions: "${notes.trim()}"`,
        createdAt: new Date().toISOString(),
        isOfficial: true
      };

      const issueRef = doc(db, "issues", issueId);
      await updateDoc(issueRef, {
        workOrderStatus: "In Progress",
        comments: arrayUnion(commentObj),
        updatedAt: serverTimestamp()
      });

      // Notify the contractor
      if (selectedIssue?.contractorId) {
        await sendNotification(
          selectedIssue.contractorId,
          "Improvement Requested on Work Order! ⚠️",
          `Officer "${user?.name || "Officer"}" requested improvement: ${notes.trim()}`,
          "status",
          issueId
        );
      }

      toast.success("Improvement request sent to contractor successfully! 👷", { id: toastId });

      if (selectedIssue && selectedIssue.id === issueId) {
        setSelectedIssue(prev => prev ? {
          ...prev,
          workOrderStatus: "In Progress",
          comments: prev.comments ? [...prev.comments, commentObj] : [commentObj]
        } : null);
      }
      setImprovementNotes("");
      setShowImprovementForm(false);
    } catch (err: any) {
      toast.error(`Operation failed: ${err.message}`, { id: toastId });
    }
  };

  // Officer claims control of a grievance
  const handleClaimControl = async (issueId: string) => {
    if (claimingControl) return;
    setClaimingControl(true);
    const toastId = toast.loading("Claiming exclusive control of this grievance...");
    try {
      const commentObj = {
        id: Math.random().toString(36).substring(2, 9),
        authorName: user?.name || "Authority Officer",
        authorId: user?.uid || "authority",
        text: `🔒 CONTROL CLAIMED: This grievance is now being officially controlled and managed by Officer "${user?.name || "Officer"}".`,
        createdAt: new Date().toISOString(),
        isOfficial: true
      };

      const issueRef = doc(db, "issues", issueId);
      await updateDoc(issueRef, {
        assignedOfficer: user?.name || "Municipal Desk Officer",
        assignedOfficerId: user?.uid || null,
        comments: arrayUnion(commentObj),
        updatedAt: serverTimestamp()
      });

      toast.success("You are now in control of this grievance! 🏛️", { id: toastId });

      setSelectedIssue(prev => prev ? {
        ...prev,
        assignedOfficer: user?.name || "Municipal Desk Officer",
        assignedOfficerId: user?.uid || undefined,
        comments: prev.comments ? [...prev.comments, commentObj] : [commentObj]
      } : null);
    } catch (err: any) {
      toast.error(`Failed to claim control: ${err.message}`, { id: toastId });
    } finally {
      setClaimingControl(false);
    }
  };

  // City-Filtered Grievances List (Shows all kind of issues for the officer's city)
  const cityIssues = issues.filter(issue => {
    // Basic city check - Officer controls all departments
    return isIssueInCity(issue, officerCity);
  });

  // Count states specifically for this city
  const reportedCount = cityIssues.filter(i => i.status === "Reported").length;
  const inProgressCount = cityIssues.filter(i => i.status === "In Progress").length;
  const resolvedCount = cityIssues.filter(i => i.status === "Resolved").length;

  // Apply Search term and Tab selection on city-filtered list
  const filteredIssues = cityIssues.filter(issue => {
    const matchesSearch = 
      issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (issue.ward && issue.ward.toLowerCase().includes(searchTerm.toLowerCase()));
      
    if (statusFilter === "all") return matchesSearch;
    return issue.status === statusFilter && matchesSearch;
  });

  // Build a set of busy contractors (those who are currently assigned to an active issue)
  const busyContractorIds = new Set<string>();
  issues.forEach(issue => {
    const statusVal = (issue as any).workOrderStatus || issue.status;
    if (
      issue.contractorId && 
      issue.status !== "Resolved" && 
      statusVal !== "Approved"
    ) {
      busyContractorIds.add(issue.contractorId);
    }
  });

  const isControlledByOther = !!(selectedIssue?.assignedOfficerId && selectedIssue.assignedOfficerId !== user?.uid);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 font-sans antialiased text-slate-800">
      
      {/* 1. Header & Identity Section */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20 px-4 py-3.5 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center space-x-1 border border-emerald-100">
                  <Shield className="w-2.5 h-2.5 mr-0.5" />
                  <span>Authorized Officer</span>
                </span>
              </div>
              <h1 className="text-sm font-black text-slate-800 tracking-tight leading-none mt-1">
                {user?.name || "Municipal Officer Desk"}
              </h1>
            </div>
          </div>

          {/* Department Tag */}
          <div className="text-right">
            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">ASSIGNED SECTOR</span>
            <span className="text-xs font-black text-slate-700 bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-1 rounded-lg mt-1 inline-block">
              All Departments (Municipal Controller)
            </span>
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="max-w-4xl w-full mx-auto px-4 mt-6 space-y-6">
        
        {/* 2. JURISDICTION PANEL */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-4 translate-y-4">
            <Building2 className="w-48 h-48" />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] text-emerald-200/90 font-black uppercase tracking-widest">Active Jurisdiction</p>
              <h2 className="text-xl font-black tracking-tight mt-1">
                <span>{officerCity}, {officerState}</span>
              </h2>
              <p className="text-[11px] text-emerald-100/70 font-medium mt-1">
                Authorized to inspect, assign, and resolve public grievances within this designated workspace.
              </p>
            </div>

            {/* Assigned Jurisdiction Badge */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-3.5 py-2 border border-white/10 flex items-center space-x-2 text-xs font-black text-emerald-200">
              <Shield className="w-3.5 h-3.5 text-emerald-300 shrink-0 animate-pulse" />
              <span>Verified Authority</span>
            </div>
          </div>

          {/* Stat Counters for selected City */}
          <div className="grid grid-cols-3 gap-3.5 mt-5 pt-4 border-t border-white/10 relative z-10">
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center">
              <span className="block text-[8px] font-bold uppercase text-emerald-200/70 tracking-widest">Awaiting Action</span>
              <span className="block text-xl font-black text-white mt-1">{reportedCount}</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center">
              <span className="block text-[8px] font-bold uppercase text-amber-200/70 tracking-widest">Under Remediation</span>
              <span className="block text-xl font-black text-amber-300 mt-1">{inProgressCount}</span>
            </div>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/5 text-center">
              <span className="block text-[8px] font-bold uppercase text-teal-200/70 tracking-widest">Resolved & Closed</span>
              <span className="block text-xl font-black text-teal-300 mt-1">{resolvedCount}</span>
            </div>
          </div>
        </div>

        {/* 3. SEARCH & STATUS FILTER ROW */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Status Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`flex-1 sm:flex-initial text-[10px] font-black uppercase px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                statusFilter === "all" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All ({cityIssues.length})
            </button>
            <button
              onClick={() => setStatusFilter("Reported")}
              className={`flex-1 sm:flex-initial text-[10px] font-black uppercase px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                statusFilter === "Reported" ? "bg-white text-rose-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Reported ({reportedCount})
            </button>
            <button
              onClick={() => setStatusFilter("In Progress")}
              className={`flex-1 sm:flex-initial text-[10px] font-black uppercase px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                statusFilter === "In Progress" ? "bg-white text-amber-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              In Progress ({inProgressCount})
            </button>
            <button
              onClick={() => setStatusFilter("Resolved")}
              className={`flex-1 sm:flex-initial text-[10px] font-black uppercase px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                statusFilter === "Resolved" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Resolved ({resolvedCount})
            </button>
          </div>

          {/* Search Field */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search grievances..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 pl-9 pr-4 py-2 text-xs rounded-xl focus:outline-none focus:border-emerald-600 font-medium shadow-xs"
            />
          </div>
        </div>

        {/* 4. CONTENT LISTING */}
        {issuesLoading ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-xs">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Syncing local municipal tickets...</p>
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-xs space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto text-xl border border-slate-100">
              🍃
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-sm font-black text-slate-700 tracking-tight">No Active Grievances Found</h3>
              <p className="text-[11px] text-slate-400 leading-normal font-medium">
                {searchTerm 
                  ? "No municipal tickets matched your filter search criteria. Try a different term." 
                  : `All public grievances reported in ${officerCity} are successfully resolved and closed! No pending action needed.`}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredIssues.map((issue) => {
              const matchesDept = getDeptKeyFromCategory(issue.category);
              return (
                <div 
                  key={issue.id}
                  onClick={() => setSelectedIssue(issue)}
                  className={`bg-white rounded-3xl border p-4 hover:shadow-md hover:border-slate-300 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                    selectedIssue?.id === issue.id ? "ring-2 ring-emerald-600 border-emerald-600 bg-emerald-50/5" : "border-slate-100"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Tag Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        {issue.imageUrl ? (
                          <img 
                            src={issue.imageUrl} 
                            alt={issue.category} 
                            referrerPolicy="no-referrer"
                            className="w-10 h-10 rounded-lg object-cover border border-slate-100 shadow-xs shrink-0" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                            <span className="text-xs">📷</span>
                          </div>
                        )}
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          {issue.ward}
                        </span>
                      </div>
                      
                      {/* Status badge */}
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        issue.status === "Reported" 
                          ? "bg-rose-50 text-rose-700 border border-rose-100" 
                          : (issue as any).workOrderStatus === "Under Verification"
                          ? "bg-purple-50 text-purple-700 border border-purple-100 animate-pulse"
                          : issue.status === "In Progress"
                          ? "bg-amber-50 text-amber-700 border border-amber-100"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      }`}>
                        {(issue as any).workOrderStatus === "Under Verification"
                          ? "Verification Pending"
                          : issue.status === "In Progress" && !issue.contractorId 
                          ? "In Progress (Unassigned)" 
                          : issue.status}
                      </span>
                    </div>

                    {/* Title */}
                    <div>
                      <h4 className="text-xs font-black text-slate-800 line-clamp-1 tracking-tight">{issue.title}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-normal font-medium">
                        {issue.description}
                      </p>
                    </div>
                  </div>

                  {/* Footwear Metrics */}
                  <div className="flex items-center justify-between border-t border-slate-50 pt-3 mt-4 text-[10px] text-slate-400 font-bold">
                    <div className="flex items-center space-x-3">
                      <span className="flex items-center space-x-1">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{issue.upvotes} Upvotes</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Shield className="w-3.5 h-3.5 text-blue-500" />
                        <span>{issue.verifiedBy?.length || 0} Verifications</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 text-emerald-700 hover:underline">
                      <span>Review Case</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 5. SIDE DETAIL DRAWER & DISPATCH ACTION ENGINE */}
        {selectedIssue && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-lg p-5 space-y-5 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Shield className="w-4.5 h-4.5 text-emerald-700" />
                <h3 className="text-sm font-black text-slate-800 tracking-tight">Grievance Investigation File</h3>
              </div>
              <button 
                onClick={() => setSelectedIssue(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Locking and Claiming Banners */}
            {isControlledByOther ? (
              <div className="bg-slate-100 border border-slate-200/80 p-4 rounded-3xl text-xs font-bold text-slate-600 flex items-start space-x-2.5 shadow-xs">
                <div className="p-1.5 bg-slate-200 text-slate-700 rounded-xl shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-800 leading-none flex items-center space-x-1">
                    <span>🔒 LOCKED — Under Other Officer Control</span>
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-normal">
                    This grievance is currently being controlled and managed by Officer <strong className="text-slate-800">{selectedIssue.assignedOfficer || "another registered authority"}</strong>. To coordinate efforts, you cannot issue work orders or modify this grievance.
                  </p>
                </div>
              </div>
            ) : !selectedIssue.assignedOfficerId ? (
              <div className="bg-amber-50/50 border border-amber-200/50 p-4 rounded-3xl text-xs font-bold text-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start space-x-2.5">
                  <div className="p-1.5 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                    <Shield className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <p className="font-extrabold text-amber-900 leading-none">Unclaimed Grievance</p>
                    <p className="text-[11px] text-amber-600 font-medium mt-1 leading-normal">
                      No officer is currently controlling this grievance. Take charge to dispatch a work order or resolve.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleClaimControl(selectedIssue.id)}
                  disabled={claimingControl}
                  className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-[11px] py-1.5 px-3 rounded-xl transition-all shrink-0 cursor-pointer shadow-sm active:scale-95 flex items-center justify-center space-x-1"
                >
                  {claimingControl ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Claim Control</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-emerald-50/40 border border-emerald-100 p-4 rounded-3xl text-xs font-bold text-emerald-800 flex items-start space-x-2.5 shadow-xs">
                <div className="p-1.5 bg-emerald-100/60 text-emerald-700 rounded-xl shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-extrabold text-emerald-950 leading-none">🌟 Controlled by You</p>
                  <p className="text-[11px] text-emerald-700 font-medium mt-1 leading-normal">
                    You have claimed control of this grievance. Only you can assign contractors, send improvement instructions, or verify/approve work.
                  </p>
                </div>
              </div>
            )}

            {/* Core Issue Brief */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">CASE TITLE</span>
                  <span className="text-sm font-black text-slate-800 leading-snug">{selectedIssue.title}</span>
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">REPORTER REMARKS</span>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100/50">
                    "{selectedIssue.description || "No elaboration offered."}"
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block">JURISDICTION WARD</span>
                    <span className="text-xs font-bold text-slate-700">{selectedIssue.ward}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-black uppercase text-slate-400 block">CATEGORY SECTOR</span>
                    <span className="text-xs font-extrabold text-indigo-700">{selectedIssue.category}</span>
                  </div>
                </div>
              </div>

              {/* Photo Evidence */}
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block">PHOTO EVIDENCE</span>
                {selectedIssue.imageUrl ? (
                  <div className="w-full h-36 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 relative group">
                    <img 
                      src={selectedIssue.imageUrl} 
                      alt="Grievance Evidence" 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-full h-36 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-4">
                    <AlertCircle className="w-6 h-6 mb-1 text-slate-300" />
                    <span className="text-[10px] font-bold">No visual attachment submitted</span>
                  </div>
                )}
              </div>
            </div>

            {/* Current Work Status Card */}
            <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">CURRENT WORK ORDER STATUS</span>
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  selectedIssue.status === "Reported"
                    ? "bg-rose-50 text-rose-700"
                    : selectedIssue.workOrderStatus === "Under Verification"
                    ? "bg-purple-50 text-purple-700 border border-purple-100"
                    : selectedIssue.status === "In Progress"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}>
                  {selectedIssue.status === "Reported" 
                    ? "Pending Remediation Allocation" 
                    : selectedIssue.workOrderStatus === "Under Verification"
                    ? "Verification Pending"
                    : selectedIssue.status === "In Progress" && !selectedIssue.contractorId 
                    ? "In Progress (Unassigned)" 
                    : selectedIssue.status}
                </span>
              </div>

              {selectedIssue.status === "In Progress" && selectedIssue.contractorName && (
                <div className="grid grid-cols-2 gap-3 text-[11px] font-semibold text-slate-600 bg-white p-3 rounded-2xl border border-slate-100">
                  <div>
                    <span className="block text-[8px] text-slate-400 font-bold uppercase">THEKEDAR PARTNER</span>
                    <span className="text-slate-800 font-extrabold">{selectedIssue.contractorName}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] text-slate-400 font-bold uppercase">TARGET DEADLINE</span>
                    <span className="text-slate-800 font-extrabold">{selectedIssue.deadline || "Immediate"}</span>
                  </div>
                  {selectedIssue.contractorResponsibility && (
                    <div className="col-span-2 border-t border-slate-100 pt-2.5 mt-1">
                      <span className="block text-[8px] text-slate-400 font-bold uppercase mb-0.5">MANDATED OPERATIONAL RESPONSIBILITY</span>
                      <span className="text-amber-800 font-black bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md inline-block">
                        {selectedIssue.contractorResponsibility}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {selectedIssue.workOrderStatus === "Under Verification" && (
                <div className="bg-purple-50/50 p-4.5 rounded-3xl border border-purple-100 space-y-3">
                  <div className="flex items-center space-x-1.5 text-purple-950">
                    <Clock className="w-4 h-4 text-purple-600 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-tight">Contractor Completion Report</span>
                  </div>
                  
                  {selectedIssue.thekedarNotes && (
                    <div className="bg-white/80 p-3 rounded-xl border border-purple-50 text-xs font-medium text-slate-700">
                      <p className="text-[8px] text-purple-600 font-extrabold uppercase mb-1">THEKEDAR REMARKS</p>
                      <p className="italic">"{selectedIssue.thekedarNotes}"</p>
                    </div>
                  )}

                  {selectedIssue.thekedarPhotoUrl && (
                    <div className="space-y-1">
                      <p className="text-[8px] text-purple-600 font-extrabold uppercase">GROUND PROOF PHOTO</p>
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-40 bg-slate-100">
                        <img 
                          src={selectedIssue.thekedarPhotoUrl} 
                          alt="Completion Proof" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  )}

                  {/* Approve / Need Improvement Action Buttons */}
                  {!isControlledByOther && (
                    <div className="pt-2 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleApproveContractorWork(selectedIssue.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1.5 shadow-md shadow-emerald-100"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>End Work</span>
                        </button>

                        <button
                          onClick={() => setShowImprovementForm(!showImprovementForm)}
                          className={`font-extrabold text-xs py-2.5 px-3 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1.5 ${
                            showImprovementForm 
                              ? "bg-slate-200 text-slate-700 border border-slate-300" 
                              : "bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-100"
                          }`}
                        >
                          <AlertTriangle className="w-4 h-4" />
                          <span>Need Improvement</span>
                        </button>
                      </div>

                      {showImprovementForm && (
                        <div className="bg-white p-3.5 rounded-2xl border border-amber-200 space-y-2.5">
                          <label className="block text-[9px] font-black uppercase text-amber-800">
                            IMPROVEMENT REQUISITION DETAILS
                          </label>
                          <textarea
                            rows={2}
                            placeholder="e.g. Please clean up remaining construction debris around the patch..."
                            value={improvementNotes}
                            onChange={(e) => setImprovementNotes(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-amber-600 text-slate-800"
                          />
                          <div className="flex justify-end space-x-1.5">
                            <button
                              onClick={() => {
                                setShowImprovementForm(false);
                                setImprovementNotes("");
                              }}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-1.5 px-3 rounded-lg"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleRejectContractorWork(selectedIssue.id, improvementNotes)}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs py-1.5 px-3 rounded-lg flex items-center space-x-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Submit Instructions</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

              {selectedIssue.status === "Resolved" && (
                <div className="bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100/50 text-xs font-bold text-emerald-800 flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-extrabold leading-none text-emerald-900">Work Successfully Completed & Verified</p>
                    <p className="text-[11px] text-emerald-700 font-medium mt-1 leading-normal">
                      This public grievance has been successfully addressed. Contractor completed structural updates and on-site cleanup. Verified by municipal authority.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons Row */}
              {!isControlledByOther && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedIssue.status === "Reported" && (
                    <>
                      <button
                        onClick={() => {
                          setAssigningIssueId(selectedIssue.id);
                          setWorkOrderDept("");
                          setSelectedContractorId("");
                          setSelectedResponsibility("");
                          setAllocatedDeadline("");
                          setWorkInstructions("");
                        }}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <Wrench className="w-3.5 h-3.5 mr-1" />
                        <span>Dispatch Official Work Order</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowDirectResolveModal(selectedIssue.id);
                          setResolutionComment("");
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        <span>Direct Resolve</span>
                      </button>
                    </>
                  )}

                  {selectedIssue.status === "In Progress" && selectedIssue.workOrderStatus !== "Under Verification" && (
                    <form onSubmit={handleInlineAssignSubmit} className="w-full space-y-3 pt-2 border-t border-slate-100">
                      <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider flex items-center space-x-1">
                        <span>🛠️ Assign / Re-route Work Order</span>
                      </p>

                      {/* AI Suggested Department */}
                      <div className="p-3 bg-indigo-50/30 border border-indigo-100/80 rounded-2xl space-y-2 relative overflow-hidden shadow-xs">
                        <div className="absolute right-0 top-0 w-16 h-16 bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                        
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-1.5">
                            <div className="p-1 bg-indigo-50 rounded-lg text-indigo-600">
                              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                            </div>
                            <div>
                              <span className="text-[10px] text-indigo-950 font-black tracking-wide block uppercase">
                                AI Recommended Sector
                              </span>
                              <span className="text-[9px] text-slate-400 font-semibold block">
                                Automated Classification
                              </span>
                            </div>
                          </div>
                          
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center space-x-1">
                            <span>✨ Active</span>
                          </span>
                        </div>

                        <div className="p-2.5 bg-white border border-indigo-100/40 rounded-xl flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                            <span className="text-xs text-indigo-950 font-black">
                              {getDeptDisplayName(getDeptKeyFromCategory(selectedIssue.category || selectedIssue.description || ""))}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-[9px] text-slate-400 font-bold leading-relaxed">
                          Authorized officers retain full jurisdiction. Select this or another sector manually below to proceed.
                        </p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Department Sector</label>
                        <CustomDropdown
                          value={inlineDept}
                          onChange={(val) => {
                            setInlineDept(val);
                            setInlineContractorId("");
                          }}
                          placeholder="Select Department..."
                          options={[
                            { value: "PWD", label: "PWD (Roads & Infrastructure)" },
                            { value: "Water", label: "Jal Sansthan (Water & Sewage)" },
                            { value: "NNSWM", label: "Nagar Nigam Waste Management (NNSWM)" },
                            { value: "DVVNL", label: "Power Corporation (DVVNL)" }
                          ]}
                        />
                      </div>

                      {inlineDept && (
                        <div className="space-y-1 animate-fade-in">
                          <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Designated Contractor (Thekedar)</label>
                          <CustomDropdown
                            value={inlineContractorId}
                            onChange={(val) => setInlineContractorId(val)}
                            placeholder="Choose Contractor..."
                            options={contractors
                              .filter(c => c.department === inlineDept && (c.city || "Agra").toLowerCase() === officerCity.toLowerCase())
                              .map(c => {
                                const isBusy = busyContractorIds.has(c.uid);
                                return {
                                  value: c.uid,
                                  label: isBusy ? `${c.name} (⚠️ Busy — Active Work)` : c.name,
                                  disabled: isBusy
                                };
                              })
                            }
                          />
                          {contractors.filter(c => c.department === inlineDept && (c.city || "Agra").toLowerCase() === officerCity.toLowerCase()).length === 0 && (
                            <p className="text-[9px] text-rose-500 font-bold mt-1">⚠️ No contractor registered for this department in {officerCity}.</p>
                          )}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isUpdatingInline || !inlineContractorId}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs py-2 px-4 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center space-x-1"
                      >
                        {isUpdatingInline ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 mr-1" />
                            <span>Update Assignment</span>
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
        )}

        {/* 6. ASSIGNMENT MODAL (HIGH-SENSITIVITY DISPATCH ENGINE) */}
        {assigningIssueId && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2 text-amber-700">
                  <Wrench className="w-5 h-5" />
                  <h3 className="text-sm font-black tracking-tight uppercase">Issue Official Work Order</h3>
                </div>
                <button 
                  onClick={() => setAssigningIssueId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200/50 p-3 rounded-2xl text-[10px] text-amber-800 font-bold leading-normal">
                ⚠️ <strong>HIGH SENSITIVITY WORK ORDER:</strong> You are authorizing public capital allocation and assigning structural work. The contractor specified here is legally bound to execute remediation. Only contractors matching this department are permitted.
              </div>

              <form onSubmit={handleAssignContractorSubmit} className="space-y-4">
                
                {/* AI Suggested Department */}
                <div className="p-3 bg-indigo-50/30 border border-indigo-100/80 rounded-2xl space-y-2 relative overflow-hidden shadow-xs">
                  <div className="absolute right-0 top-0 w-16 h-16 bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                  
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-1.5">
                      <div className="p-1 bg-indigo-50 rounded-lg text-indigo-600">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-950 font-black tracking-wide block uppercase">
                          AI Recommended Sector
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold block">
                          Automated Classification
                        </span>
                      </div>
                    </div>
                    
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center space-x-1">
                      <span>✨ Active</span>
                    </span>
                  </div>

                  <div className="p-2.5 bg-white border border-indigo-100/40 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping" />
                      <span className="text-xs text-indigo-950 font-black">
                        {selectedIssue ? getDeptDisplayName(getDeptKeyFromCategory(selectedIssue.category || selectedIssue.description || "")) : "Calculating..."}
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-[9px] text-slate-400 font-bold leading-relaxed">
                    Authorized officers retain full jurisdiction. Select this or another sector manually below to proceed.
                  </p>
                </div>

                {/* Step 1: Department selection */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">1. Target Department Sector</label>
                  <CustomDropdown
                    value={workOrderDept}
                    onChange={(val) => {
                      setWorkOrderDept(val);
                      setSelectedContractorId("");
                      setSelectedResponsibility("");
                    }}
                    placeholder="Select Department..."
                    options={[
                      { value: "PWD", label: "PWD (Roads & Infrastructure)" },
                      { value: "Water", label: "Jal Sansthan (Water & Sewage)" },
                      { value: "NNSWM", label: "Nagar Nigam Waste Management (NNSWM)" },
                      { value: "DVVNL", label: "Power Corporation (DVVNL)" }
                    ]}
                  />
                </div>

                {workOrderDept ? (
                  <div className="space-y-4 animate-fade-in">
                    {/* Step 2: Contractor list - strictly filtered by the department */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">2. Designated Contractor (Thekedar)</label>
                      <CustomDropdown
                        disabled={!workOrderDept}
                        value={selectedContractorId}
                        onChange={(val) => {
                          setSelectedContractorId(val);
                          setSelectedResponsibility("");
                        }}
                        placeholder={workOrderDept ? "Choose Contractor..." : "Select Department Sector First..."}
                        options={contractors
                          .filter(c => c.department === workOrderDept && (c.city || "Agra").toLowerCase() === officerCity.toLowerCase())
                          .map(c => {
                            const isBusy = busyContractorIds.has(c.uid);
                            return {
                              value: c.uid,
                              label: isBusy ? `${c.name} (⚠️ Busy — Active Work)` : c.name,
                              disabled: isBusy
                            };
                          })
                        }
                      />
                      {workOrderDept && contractors.filter(c => c.department === workOrderDept && (c.city || "Agra").toLowerCase() === officerCity.toLowerCase()).length === 0 && (
                        <p className="text-[9px] text-rose-500 font-bold mt-1">⚠️ No contractor registered for this department in {officerCity}.</p>
                      )}
                    </div>

                    {/* Step 3: Specific Departmental Responsibility Selector */}
                    {selectedContractorId && (
                      <div className="space-y-1.5 p-3.5 bg-amber-50/50 border border-amber-100 rounded-2xl animate-fade-in">
                        <label className="text-[9px] font-black uppercase text-amber-800 tracking-wider block flex items-center space-x-1">
                          <span>🌟 3. Mandated Responsibility Scope</span>
                        </label>
                        <p className="text-[10px] text-amber-700 font-semibold leading-tight mb-2">
                          Select the high-sensitivity operational task scope:
                        </p>
                        <CustomDropdown
                          value={selectedResponsibility}
                          onChange={(val) => {
                            setSelectedResponsibility(val);
                            if (val && val !== "Custom Work Scope") {
                              const defaultInst = `Execute complete standard protocol operations for "${val}". Utilize durable, high-grade materials. Take comprehensive photos of the ground inspection post-remediation. Ensure full site clearance.`;
                              setWorkInstructions(defaultInst);
                            }
                          }}
                          placeholder="Choose Mandated Responsibility..."
                          options={[
                            ...(DEPARTMENT_RESPONSIBILITIES[workOrderDept] || []).map(resp => ({ value: resp, label: resp })),
                            { value: "Custom Work Scope", label: "Custom Operational Scope..." }
                          ]}
                        />
                      </div>
                    )}

                    {/* Target date */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-slate-400 block">4. Target Deadline</label>
                      <input
                        type="date"
                        required
                        value={allocatedDeadline}
                        onChange={(e) => setAllocatedDeadline(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-amber-600"
                      />
                    </div>

                    {/* Instructions Textarea */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-slate-400 block">5. On-Ground Special Instructions</label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Provide specific remediation requirements..."
                        value={workInstructions}
                        onChange={(e) => setWorkInstructions(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-amber-600"
                      />
                    </div>

                    {/* Form Buttons */}
                    <div className="flex space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setAssigningIssueId(null)}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingWorkOrder || !selectedContractorId || !selectedResponsibility}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/40 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                      >
                        {submittingWorkOrder ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          "Issue Work Order 🏗️"
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* If no department is chosen yet, only show Cancel button */
                  <div className="flex space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setAssigningIssueId(null)}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                  </div>
                )}

              </form>
            </div>
          </div>
        )}

        {/* 7. DIRECT RESOLVE MODAL */}
        {showDirectResolveModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 p-6 space-y-4">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2 text-emerald-700">
                  <CheckCircle className="w-5 h-5" />
                  <h3 className="text-sm font-black tracking-tight uppercase">Administrative Resolution</h3>
                </div>
                <button 
                  onClick={() => setShowDirectResolveModal(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleDirectResolveSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 block">Official Resolution Log Comment</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="State details regarding the resolution. e.g. 'On-site verification completed. Garbage cleared by backup staff.'"
                    value={resolutionComment}
                    onChange={(e) => setResolutionComment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold outline-none focus:border-emerald-600"
                  />
                  <p className="text-[9px] text-slate-400 leading-tight">
                    💡 This resolution statement will be permanently visible to all citizens and the original reporter.
                  </p>
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDirectResolveModal(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingDirectResolve || !resolutionComment.trim()}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/40 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                  >
                    {submittingDirectResolve ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      "Close Ticket 🤝"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
