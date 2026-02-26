import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  collection,
  deleteDoc,
} from "firebase/firestore";
import {
  Library,
  FileCheck,
  Quote,
  Bookmark,
  CheckCircle2,
  Database,
  Trash2,
  Plus,
  MessageSquare,
  Users,
  CalendarDays,
  Clock,
  Cloud,
  Share2,
  BookOpen,
  Info,
  LayoutDashboard,
  GraduationCap,
  ChevronRight,
  User,
  School,
  Filter,
  Eye,
  FileText,
  History,
  UserCircle,
  ArrowRight,
  Target,
  Search,
  RefreshCw,
  Fingerprint,
  Link2,
  AlertCircle,
} from "lucide-react";
import PINModal from "../PINModal.jsx";
// Polyfill for process.env which is required by some Firebase internals
if (typeof window !== "undefined" && !window.process) {
  window.process = { env: {} };
}

// --- Firebase Configuration ---
const firebaseConfig =
  typeof __firebase_config !== "undefined"
    ? JSON.parse(__firebase_config)
    : {
        apiKey: "AIzaSyAmBrF4QL7RUDasZERxG6Kg9tJQt5aGtQY",
        authDomain: "nonfiction-history-fair.firebaseapp.com",
        projectId: "nonfiction-history-fair",
        storageBucket: "nonfiction-history-fair.firebasestorage.app",
        messagingSenderId: "980220745532",
        appId: "1:980220745532:web:7e8ceba0f51f6194827039",
      };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId =
  typeof __app_id !== "undefined" ? __app_id : "history-research-log-v4";

const App = () => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("intro");
  const [isSyncing, setIsSyncing] = useState(false);
  const [viewMode, setViewMode] = useState("student");
  const [allStudentsData, setAllStudentsData] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [showPINModal, setShowPINModal] = useState(false);
  const [isPINCorrect, setIsPINCorrect] = useState(false);
  const CORRECT_PIN = "1999";

  const classrooms = [
    "Miss Campbell",
    "Mrs. Higginbotham",
    "Mr. McQuade",
    "Ms. Smith",
  ];

  const [researchData, setResearchData] = useState({
    studentName: "",
    classroom: classrooms[0],
    topic: "",
    context: "",
    importance: "",
    thesis: "",
    sources: [{ id: 1, title: "", type: "primary", notes: "" }],
    timeline: [{ id: 1, date: "", event: "", significance: "" }],
    people: [{ id: 1, name: "", role: "Leader", contribution: "" }],
    evidence: [{ id: 1, fact: "", sourceId: "", connectionToThesis: "" }],
  });

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== "undefined" &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Firebase anonymous sign-in failed:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Auth state changed: user", user.uid);
      } else {
        console.log("No user session. Attempting anonymous sign-in...");
        signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in failed:", error);
        });
      }
    });
    return () => unsubscribe();
  }, []);
  useEffect(() => {
    // Check if PIN was already verified on this device
    const isPINVerified = localStorage.getItem("teacherPINVerified") === "true";
    setIsPINCorrect(isPINVerified);
  }, []);
  useEffect(() => {
    if (!user || viewMode === "teacher") return;
    const docRef = doc(
      db,
      "artifacts",
      appId,
      "users",
      user.uid,
      "research",
      "main"
    );
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setResearchData(docSnap.data());
        }
      },
      (error) => console.error("Firestore sync error:", error)
    );
    return () => unsubscribe();
  }, [user, viewMode]);

  useEffect(() => {
    if (!user || viewMode !== "teacher") return;
    const publicRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "student_logs"
    );
    const unsubscribe = onSnapshot(
      publicRef,
      (snapshot) => {
        const students = [];
        snapshot.forEach((doc) => {
          students.push({ id: doc.id, ...doc.data() });
        });
        setAllStudentsData(students);
      },
      (error) => console.error("Teacher dashboard sync error:", error)
    );
    return () => unsubscribe();
  }, [user, viewMode]);

  const saveToCloud = async (newData) => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const privateRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        user.uid,
        "research",
        "main"
      );
      await setDoc(privateRef, newData);

      const publicRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "student_logs",
        user.uid
      );
      await setDoc(publicRef, {
        ...newData,
        lastUpdated: new Date().toISOString(),
        uid: user.uid,
      });
    } catch (err) {
      console.error("Save failed", err);
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };
  const handlePINSubmit = (enteredPIN) => {
    if (enteredPIN === CORRECT_PIN) {
      setIsPINCorrect(true);
      localStorage.setItem("teacherPINVerified", "true"); // SAVE TO DEVICE
      setShowPINModal(false);
    } else {
      alert("Incorrect PIN. Access denied.");
      setShowPINModal(false);
    }
  };
  const handleDeleteStudent = async (studentId) => {
    // Confirm deletion
    const confirmed = window.confirm(
      "Are you sure you want to delete this student's work? This cannot be undone."
    );

    if (!confirmed) return;

    try {
      setIsSyncing(true);

      // Delete from public logs
      const publicRef = doc(
        db,
        "artifacts",
        appId,
        "public",
        "data",
        "student_logs",
        studentId
      );
      await deleteDoc(publicRef);

      // Clear selected student
      setSelectedStudent(null);

      alert("Student record deleted successfully.");
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete student record. Please try again.");
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  const tabs = [
    {
      id: "intro",
      label: "1. Introduction",
      icon: BookOpen,
      desc: "Set the scene",
    },
    {
      id: "sources",
      label: "2. Sources",
      icon: Library,
      desc: "Where did you look?",
    },
    {
      id: "timeline",
      label: "3. Timeline",
      icon: CalendarDays,
      desc: "Sequence of events",
    },
    {
      id: "people",
      label: "4. Key Figures",
      icon: Users,
      desc: "Important People",
    },
    {
      id: "evidence",
      label: "5. Evidence Log",
      icon: Quote,
      desc: "The proof",
    },
    {
      id: "thesis",
      label: "6. Summary Station",
      icon: FileCheck,
      desc: "Your paragraph summary",
    },
  ];

  const updateField = (field, value) => {
    const updated = { ...researchData, [field]: value };
    setResearchData(updated);
    saveToCloud(updated);
  };

  const addRow = (type) => {
    const templates = {
      sources: { id: Date.now(), title: "", type: "primary", notes: "" },
      timeline: { id: Date.now(), date: "", event: "", significance: "" },
      people: { id: Date.now(), name: "", role: "Leader", contribution: "" },
      evidence: {
        id: Date.now(),
        fact: "",
        sourceId: "",
        connectionToThesis: "",
      },
    };
    const updated = {
      ...researchData,
      [type]: [...researchData[type], templates[type]],
    };
    setResearchData(updated);
    saveToCloud(updated);
  };

  const deleteRow = (type, id) => {
    const updated = {
      ...researchData,
      [type]: researchData[type].filter((item) => item.id !== id),
    };
    setResearchData(updated);
    saveToCloud(updated);
  };

  const updateRow = (type, id, field, value) => {
    const updated = {
      ...researchData,
      [type]: researchData[type].map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    };
    setResearchData(updated);
    saveToCloud(updated);
  };

  const getProgress = (data) => {
    if (!data) return 0;
    let score = 0;
    if (data.topic) score += 20;
    if (data.thesis) score += 20;
    if (data.sources?.filter((s) => s.title).length > 1) score += 20;
    if (data.evidence?.filter((e) => e.fact).length > 2) score += 20;
    if (data.timeline?.filter((t) => t.event).length > 2) score += 20;
    return Math.min(score, 100);
  };

  const filteredStudents =
    teacherFilter === "all"
      ? allStudentsData
      : allStudentsData.filter((s) => s.classroom === teacherFilter);

  return (
    <div className="min-h-screen bg-[#fcfdfa] text-slate-900 font-sans p-4 md:p-8">
      <div style={{ padding: "8px", background: "#eef", fontSize: "10px" }}>
        Auth UID: {user?.uid ? user.uid : "No user (auth failed!)"}
      </div>
      {/* Top Navigation Bar */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-emerald-100/50 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-700 p-2 rounded-xl shadow-lg shadow-emerald-700/20">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight italic">
              Nonfiction History Fair Journal
            </h1>
            <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-700/80">
              History Fair Project Journal
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <button
            onClick={() => {
              setViewMode("student");
              // DON'T clear the PIN - keep them verified for this session
            }}
            className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-300 ${
              viewMode === "student"
                ? "bg-emerald-700 text-white shadow-md"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <User className="w-4 h-4" /> Student Portal
          </button>
          <button
            onClick={() => {
              if (isPINCorrect) {
                setViewMode("teacher");
              } else {
                setShowPINModal(true);
              }
            }}
            className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-300 ${
              viewMode === "teacher"
                ? "bg-slate-800 text-white shadow-md"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <GraduationCap className="w-4 h-4" /> Faculty Dashboard
          </button>
        </div>
      </div>

      {viewMode === "teacher" ? (
        /* --- TEACHER DASHBOARD --- */
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-700">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[800px]">
            <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/20 flex flex-col overflow-hidden">
              <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-slate-800">
                    Student Projects
                  </h2>
                  <div className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-black uppercase">
                    {filteredStudents.length} Records
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setTeacherFilter("all")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      teacherFilter === "all"
                        ? "bg-slate-800 text-white shadow-md"
                        : "bg-white text-slate-500 border"
                    }`}
                  >
                    All Classes
                  </button>
                  {classrooms.map((room) => (
                    <button
                      key={room}
                      onClick={() => setTeacherFilter(room)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                        teacherFilter === room
                          ? "bg-slate-800 text-white shadow-md"
                          : "bg-white text-slate-500 border"
                      }`}
                    >
                      {room}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {filteredStudents.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-sm text-slate-400 font-medium">
                      No student records found for this filter.
                    </p>
                  </div>
                ) : (
                  filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={`w-full text-left p-5 border-b border-slate-50 flex items-center justify-between transition-all group ${
                        selectedStudent?.id === student.id
                          ? "bg-emerald-50/50"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ${
                            selectedStudent?.id === student.id
                              ? "bg-emerald-700 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {student.studentName?.charAt(0) || "A"}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-none mb-1 group-hover:text-emerald-700 transition-colors">
                            {student.studentName || "Anonymous Student"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {student.classroom}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="text-xs font-black text-emerald-700 mb-1">
                          {getProgress(student)}%
                        </div>
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600"
                            style={{ width: `${getProgress(student)}%` }}
                          ></div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/20 flex flex-col overflow-hidden relative">
              {!selectedStudent ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-[#fdfdfd]">
                  <div className="bg-slate-50 p-6 rounded-full mb-4">
                    <Search className="w-12 h-12 text-slate-200" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-400">
                    Select a student record to review
                  </h3>
                  <p className="text-sm text-slate-300">
                    Detailed historical logs will appear here
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="p-8 border-b border-slate-100 flex justify-between items-start shrink-0 bg-white z-10 sticky top-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-emerald-700 font-black text-[10px] uppercase tracking-[0.2em] mb-2">
                        <FileText className="w-3 h-3" /> Historical Portfolio
                      </div>
                      <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">
                        {selectedStudent.studentName || "Anonymous"}
                      </h2>
                      <p className="text-emerald-800 font-medium italic text-lg opacity-80 leading-tight">
                        "{selectedStudent.topic || "Untitled Inquiry"}"
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-4">
                      <div className="flex gap-3">
                        <button
                          onClick={() =>
                            handleDeleteStudent(selectedStudent.uid)
                          }
                          className="px-4 py-2 rounded-2xl bg-red-100 text-red-700 font-bold text-xs hover:bg-red-200 transition-all flex items-center gap-2 shadow-lg shadow-red-600/20"
                        >
                          <Trash2 className="w-4 h-4" /> Delete Record
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
                          Archive ID
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border">
                          {selectedStudent.uid?.substring(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 space-y-12 bg-slate-50/30 custom-scrollbar pb-24">
                    {/* section: Argument */}
                    <section className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-emerald-100 pb-2">
                        <Target className="w-5 h-5 text-emerald-700" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">
                          The Summary
                        </h3>
                      </div>
                      <div className="bg-white p-8 rounded-[2rem] border-2 border-emerald-100 shadow-sm relative overflow-hidden">
                        <Quote className="absolute -top-2 -left-2 w-20 h-20 text-emerald-50 opacity-[0.05]" />
                        <p className="text-xl font-serif text-slate-800 italic leading-relaxed relative z-10">
                          {selectedStudent.thesis || "No summary drafted yet."}
                        </p>
                      </div>
                    </section>

                    {/* section: Context & Significance */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-emerald-700" />
                          <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                            Historical Context
                          </h4>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-sm text-slate-600 leading-relaxed min-h-[120px]">
                          {selectedStudent.context || "Pending research..."}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                            Historical Significance
                          </h4>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-sm text-slate-600 leading-relaxed min-h-[120px]">
                          {selectedStudent.importance || "Pending research..."}
                        </div>
                      </div>
                    </section>

                    {/* section: Source Library */}
                    <section className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-emerald-100 pb-2">
                        <Library className="w-5 h-5 text-emerald-700" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">
                          Source Archive
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedStudent.sources?.filter((s) => s.title)
                          .length > 0 ? (
                          selectedStudent.sources
                            .filter((s) => s.title)
                            .map((source) => (
                              <div
                                key={source.id}
                                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-start gap-4"
                              >
                                <div
                                  className={`p-2 rounded-lg shrink-0 ${
                                    source.type === "primary"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-blue-50 text-blue-700"
                                  }`}
                                >
                                  <Link2 className="w-4 h-4" />
                                </div>
                                <div>
                                  <h5 className="font-bold text-slate-900 text-sm mb-1">
                                    {source.title}
                                  </h5>
                                  <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-50 border border-slate-100 text-slate-400">
                                    {source.type} Source
                                  </span>
                                </div>
                              </div>
                            ))
                        ) : (
                          <p className="text-xs text-slate-400 italic py-4">
                            No sources logged.
                          </p>
                        )}
                      </div>
                    </section>

                    {/* section: Timeline */}
                    <section className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-emerald-100 pb-2">
                        <CalendarDays className="w-5 h-5 text-emerald-700" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">
                          Chronological Chain
                        </h3>
                      </div>
                      <div className="space-y-4">
                        {selectedStudent.timeline?.filter((t) => t.event)
                          .length > 0 ? (
                          selectedStudent.timeline
                            .filter((t) => t.event)
                            .map((item) => (
                              <div key={item.id} className="flex gap-4">
                                <div className="shrink-0 w-24 text-right">
                                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                                    {item.date || "TBD"}
                                  </span>
                                </div>
                                <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 text-sm text-slate-700">
                                  {item.event}
                                </div>
                              </div>
                            ))
                        ) : (
                          <p className="text-xs text-slate-400 italic py-4">
                            No timeline events logged.
                          </p>
                        )}
                      </div>
                    </section>

                    {/* section: Key Figures */}
                    <section className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-emerald-100 pb-2">
                        <Users className="w-5 h-5 text-emerald-700" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">
                          Historical Agents (People)
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedStudent.people?.filter((p) => p.name).length >
                        0 ? (
                          selectedStudent.people
                            .filter((p) => p.name)
                            .map((person) => (
                              <div
                                key={person.id}
                                className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4"
                              >
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                  <UserCircle className="w-6 h-6" />
                                </div>
                                <div>
                                  <h5 className="font-bold text-slate-800 text-sm">
                                    {person.name}
                                  </h5>
                                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">
                                    {person.contribution ||
                                      "No contribution summary provided."}
                                  </p>
                                </div>
                              </div>
                            ))
                        ) : (
                          <p className="text-xs text-slate-400 italic py-4">
                            No key figures identified.
                          </p>
                        )}
                      </div>
                    </section>

                    {/* section: Evidence Log */}
                    <section className="space-y-6 pb-12">
                      <div className="flex items-center gap-3 border-b border-emerald-100 pb-2">
                        <Quote className="w-5 h-5 text-emerald-700" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">
                          Evidence Log
                        </h3>
                      </div>
                      <div className="space-y-6">
                        {selectedStudent.evidence?.filter((e) => e.fact)
                          .length > 0 ? (
                          selectedStudent.evidence
                            .filter((e) => e.fact)
                            .map((item) => (
                              <div
                                key={item.id}
                                className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4"
                              >
                                <div className="text-sm font-medium text-slate-700 pl-4 border-l-4 border-emerald-700/20">
                                  "{item.fact}"
                                </div>
                                {item.connectionToThesis && (
                                  <div className="bg-emerald-50/50 p-4 rounded-2xl text-[11px] text-emerald-800 leading-relaxed">
                                    <span className="font-black uppercase tracking-tighter mr-2">
                                      Connection:
                                    </span>
                                    {item.connectionToThesis}
                                  </div>
                                )}
                              </div>
                            ))
                        ) : (
                          <p className="text-xs text-slate-400 italic py-4">
                            No evidence items logged.
                          </p>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* --- STUDENT VIEW --- */
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 animate-in fade-in duration-700">
          {/* Progress Sidebar */}
          <aside className="lg:w-80 flex flex-col gap-6 shrink-0">
            <div className="bg-white p-6 rounded-[2.5rem] border border-emerald-100 shadow-xl shadow-emerald-900/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Database className="w-20 h-20 text-emerald-900" />
              </div>
              <div className="relative z-10">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 text-center">
                  Journal Status
                </h3>
                <div className="mb-8 px-4">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-4xl font-black text-emerald-700">
                      {getProgress(researchData)}%
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                      Complete
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div
                      className="h-full bg-emerald-600 shadow-[0_0_15px_rgba(5,150,105,0.4)] transition-all duration-1000 ease-out"
                      style={{ width: `${getProgress(researchData)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-3">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 group ${
                          isActive
                            ? "bg-emerald-700 text-white shadow-lg shadow-emerald-700/30 translate-x-1"
                            : "text-slate-500 hover:bg-emerald-50"
                        }`}
                      >
                        <div
                          className={`p-2 rounded-xl ${
                            isActive
                              ? "bg-white/20"
                              : "bg-slate-100 group-hover:bg-emerald-100"
                          }`}
                        >
                          <tab.icon
                            className={`w-4 h-4 ${
                              isActive
                                ? "text-white"
                                : "text-slate-500 group-hover:text-emerald-700"
                            }`}
                          />
                        </div>
                        <div className="text-left">
                          <p
                            className={`text-xs font-bold leading-none mb-1 ${
                              isActive ? "text-white" : "text-slate-800"
                            }`}
                          >
                            {tab.label.split(".")[1]}
                          </p>
                          <p
                            className={`text-[9px] uppercase tracking-tighter font-medium ${
                              isActive ? "text-emerald-100" : "text-slate-400"
                            }`}
                          >
                            {tab.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* Main Editing Content */}
          <main className="flex-1 flex flex-col gap-6">
            <div className="bg-white rounded-[2.5rem] border border-emerald-100 shadow-2xl shadow-emerald-900/5 p-8 md:p-12 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-emerald-800"></div>

              {activeTab === "intro" && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2">
                  {/* --- NEW EXPORT HEADER --- */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-4xl font-black text-slate-800 tracking-tighter mb-2">
                        Introduction
                      </h2>
                      <p className="text-slate-500 text-sm">
                        Define the scope and importance of your historical
                        inquiry.
                      </p>
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-bold text-[10px] uppercase hover:bg-emerald-200 transition-all shadow-sm"
                    >
                      <FileText className="w-4 h-4" /> Save as PDF
                    </button>
                  </div>
                  {/* --- END EXPORT HEADER --- */}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                        Researcher Name
                      </label>
                      <input
                        type="text"
                        value={researchData.studentName}
                        onChange={(e) =>
                          updateField("studentName", e.target.value)
                        }
                        placeholder="Your full name"
                        className="w-full bg-slate-50 p-4 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-700/10 focus:bg-white outline-none transition-all font-bold text-slate-800"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                        Homeroom/Class
                      </label>
                      <select
                        value={researchData.classroom}
                        onChange={(e) =>
                          updateField("classroom", e.target.value)
                        }
                        className="w-full bg-slate-50 p-4 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-700/10 focus:bg-white outline-none transition-all font-bold text-slate-800 appearance-none"
                      >
                        {classrooms.map((room) => (
                          <option key={room} value={room}>
                            {room}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                      History Fair Topic
                    </label>
                    <input
                      type="text"
                      value={researchData.topic}
                      onChange={(e) => updateField("topic", e.target.value)}
                      placeholder="e.g. The Montgomery Bus Boycott: A Strategic Turn in Civil Rights"
                      className="w-full bg-slate-50 p-6 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-emerald-700/10 focus:bg-white outline-none transition-all text-xl font-bold text-emerald-900 tracking-tight"
                    />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                        Context (Events leading up to this)
                      </label>
                      <textarea
                        value={researchData.context}
                        onChange={(e) => updateField("context", e.target.value)}
                        placeholder="What events led up to this? What was happening in the world?"
                        className="w-full bg-slate-50 p-6 border border-slate-100 rounded-3xl min-h-[180px] focus:ring-4 focus:ring-emerald-700/10 focus:bg-white outline-none transition-all leading-relaxed text-sm text-slate-700"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                        Historical Significance
                      </label>
                      <textarea
                        value={researchData.importance}
                        onChange={(e) =>
                          updateField("importance", e.target.value)
                        }
                        placeholder="Why is this topic important to study? How did it change history?"
                        className="w-full bg-slate-50 p-6 border border-slate-100 rounded-3xl min-h-[180px] focus:ring-4 focus:ring-emerald-700/10 focus:bg-white outline-none transition-all leading-relaxed text-sm text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "sources" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-4xl font-black text-slate-800 tracking-tighter mb-2">
                        The Archive
                      </h2>
                      <p className="text-slate-500 text-sm">
                        Log your primary documents and scholarly works.
                      </p>
                    </div>
                    <button
                      onClick={() => addRow("sources")}
                      className="bg-emerald-700 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-800 transition-all flex items-center gap-2 shadow-lg shadow-emerald-700/20"
                    >
                      <Plus className="w-4 h-4" /> Log Source
                    </button>
                  </div>
                  <div className="space-y-4">
                    {researchData.sources.map((source) => (
                      <div
                        key={source.id}
                        className="p-2 bg-slate-50 border border-slate-100 rounded-3xl flex flex-col md:flex-row gap-4 items-center group hover:bg-white hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/5 transition-all"
                      >
                        <div className="flex-1 w-full px-4">
                          <input
                            className="w-full p-3 bg-transparent font-bold text-slate-800 outline-none placeholder:text-slate-300"
                            placeholder="Title of Source..."
                            value={source.title}
                            onChange={(e) =>
                              updateRow(
                                "sources",
                                source.id,
                                "title",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div className="flex items-center gap-4 px-4 w-full md:w-auto">
                          <select
                            className="p-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none"
                            value={source.type}
                            onChange={(e) =>
                              updateRow(
                                "sources",
                                source.id,
                                "type",
                                e.target.value
                              )
                            }
                          >
                            <option value="primary">Primary Source</option>
                            <option value="secondary">Secondary Source</option>
                          </select>
                          <button
                            onClick={() => deleteRow("sources", source.id)}
                            className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "timeline" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-4xl font-black text-slate-800 tracking-tighter mb-2">
                        The Chronology
                      </h2>
                      <p className="text-slate-500 text-sm">
                        Map out the crucial moments in your historical
                        narrative.
                      </p>
                    </div>
                    <button
                      onClick={() => addRow("timeline")}
                      className="bg-emerald-700 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-800 transition-all flex items-center gap-2 shadow-lg shadow-emerald-700/20"
                    >
                      <Plus className="w-4 h-4" /> New Event
                    </button>
                  </div>
                  <div className="space-y-4">
                    {researchData.timeline.map((item) => (
                      <div
                        key={item.id}
                        className="p-2 bg-slate-50 border border-slate-100 rounded-3xl flex gap-4 items-center hover:bg-white hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/5 transition-all"
                      >
                        <div className="px-4 shrink-0">
                          <input
                            type="text"
                            value={item.date}
                            onChange={(e) =>
                              updateRow(
                                "timeline",
                                item.id,
                                "date",
                                e.target.value
                              )
                            }
                            placeholder="Date"
                            className="w-24 p-3 font-black text-emerald-700 bg-emerald-50 rounded-xl border-none outline-none text-center text-xs"
                          />
                        </div>
                        <input
                          type="text"
                          value={item.event}
                          onChange={(e) =>
                            updateRow(
                              "timeline",
                              item.id,
                              "event",
                              e.target.value
                            )
                          }
                          placeholder="What occurred?"
                          className="flex-1 p-3 bg-transparent font-medium text-slate-700 outline-none text-sm"
                        />
                        <button
                          onClick={() => deleteRow("timeline", item.id)}
                          className="p-3 mr-4 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "people" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-4xl font-black text-slate-800 tracking-tighter mb-2">
                        Key Figures
                      </h2>
                      <p className="text-slate-500 text-sm">
                        The individuals who shaped the history you are studying.
                      </p>
                    </div>
                    <button
                      onClick={() => addRow("people")}
                      className="bg-emerald-700 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-800 transition-all flex items-center gap-2 shadow-lg shadow-emerald-700/20"
                    >
                      <Plus className="w-4 h-4" /> Add Person
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {researchData.people.map((person) => (
                      <div
                        key={person.id}
                        className="p-6 bg-slate-50 border border-slate-100 rounded-3xl space-y-4 relative group hover:bg-white hover:border-emerald-200 hover:shadow-2xl hover:shadow-emerald-900/5 transition-all"
                      >
                        <input
                          type="text"
                          value={person.name}
                          onChange={(e) =>
                            updateRow(
                              "people",
                              person.id,
                              "name",
                              e.target.value
                            )
                          }
                          placeholder="Name..."
                          className="w-full p-2 bg-transparent font-black text-slate-900 text-lg outline-none"
                        />
                        <textarea
                          value={person.contribution}
                          onChange={(e) =>
                            updateRow(
                              "people",
                              person.id,
                              "contribution",
                              e.target.value
                            )
                          }
                          placeholder="Importance?"
                          className="w-full p-3 bg-white border border-slate-100 rounded-2xl text-xs min-h-[80px] outline-none"
                        />
                        <button
                          onClick={() => deleteRow("people", person.id)}
                          className="absolute top-4 right-4 text-slate-200 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "evidence" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-4xl font-black text-slate-800 tracking-tighter mb-2">
                        Evidence Log
                      </h2>
                      <p className="text-slate-500 text-sm">
                        Connect your findings back to your main argument.
                      </p>
                    </div>
                    <button
                      onClick={() => addRow("evidence")}
                      className="bg-emerald-700 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-800 transition-all flex items-center gap-2 shadow-lg shadow-emerald-700/20"
                    >
                      <Plus className="w-4 h-4" /> Log Evidence
                    </button>
                  </div>
                  <div className="space-y-6">
                    {researchData.evidence.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-50 border border-slate-100 rounded-[2rem] overflow-hidden hover:bg-white hover:border-emerald-200 transition-all"
                      >
                        <div className="p-6 space-y-4">
                          <div className="flex justify-between">
                            <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                              Fact or Quote
                            </label>
                            <button
                              onClick={() => deleteRow("evidence", item.id)}
                              className="text-slate-200 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <textarea
                            className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-sm font-medium text-slate-800 outline-none"
                            placeholder="Piece of proof..."
                            value={item.fact}
                            onChange={(e) =>
                              updateRow(
                                "evidence",
                                item.id,
                                "fact",
                                e.target.value
                              )
                            }
                          />
                          <textarea
                            className="w-full p-4 bg-emerald-900/5 border border-emerald-900/10 rounded-2xl text-xs italic text-emerald-800 outline-none"
                            placeholder="Connection to thesis?"
                            value={item.connectionToThesis}
                            onChange={(e) =>
                              updateRow(
                                "evidence",
                                item.id,
                                "connectionToThesis",
                                e.target.value
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "thesis" && (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2">
                  <div className="text-center space-y-4 max-w-2xl mx-auto">
                    <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-100 shadow-lg shadow-emerald-900/5">
                      <Target className="w-8 h-8 text-emerald-700" />
                    </div>
                    <h2 className="text-4xl font-black text-slate-800 tracking-tighter">
                      Summary Station
                    </h2>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      Input your paragraph summary of your topic here. Be sure
                      to include all 5 Ws (Who, What, Where, When, and Why).
                    </p>
                  </div>
                  <div className="bg-slate-900 p-1 rounded-[3rem] shadow-2xl shadow-slate-900/20 max-w-4xl mx-auto">
                    <div className="bg-white p-10 rounded-[2.8rem] space-y-6">
                      <label className="text-[10px] font-black text-emerald-700 uppercase tracking-widest block text-center">
                        Historical Summary
                      </label>
                      <textarea
                        className="w-full p-8 border-none text-2xl font-serif text-slate-800 italic leading-relaxed text-center outline-none bg-transparent placeholder:text-slate-200"
                        placeholder="Through my research, I found that..."
                        value={researchData.thesis}
                        onChange={(e) => updateField("thesis", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* System Metadata Area */}
            <div className="px-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/60 backdrop-blur-sm border border-emerald-100/50 rounded-2xl p-4 flex items-center justify-between group hover:bg-white transition-all">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      isSyncing ? "bg-amber-100" : "bg-emerald-100"
                    }`}
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${
                        isSyncing
                          ? "text-amber-600 animate-spin"
                          : "text-emerald-700"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                      Journal Sync Status
                    </p>
                    <p className="text-xs font-bold text-slate-700">
                      {isSyncing
                        ? "Archiving current entry..."
                        : "All changes saved to cloud"}
                    </p>
                  </div>
                </div>
                {!isSyncing && (
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                )}
              </div>

              <div className="bg-white/60 backdrop-blur-sm border border-slate-100 rounded-2xl p-4 flex items-center gap-3 group hover:bg-white transition-all">
                <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-slate-800 transition-colors">
                  <Fingerprint className="w-4 h-4 text-slate-500 group-hover:text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                    Inquiry Identity Key
                  </p>
                  <p className="text-xs font-mono font-medium text-slate-600 truncate max-w-[180px]">
                    {user?.uid || "Authenticating..."}
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Footer Info */}
      <footer className="max-w-7xl mx-auto mt-12 py-8 border-t border-emerald-100/50 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-400">
        <p className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
          <Database className="w-3 h-3" /> History Fair Archival System
        </p>
        <div className="flex gap-6">
          <span className="text-[10px] font-bold uppercase tracking-widest hover:text-emerald-700 cursor-pointer">
            Help Center
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest hover:text-emerald-700 cursor-pointer">
            Citations
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest hover:text-emerald-700 cursor-pointer">
            Faculty Board
          </span>
        </div>
      </footer>
      {/* --- MASTER PRINT VIEW (Hidden on screen, visible on print) --- */}
      <div className="hidden print:block print:p-8 bg-white text-slate-900 font-serif">
        <div className="border-b-4 border-emerald-900 pb-4 mb-8">
          <h1 className="text-4xl font-bold uppercase tracking-tight">
            Historical Research Dossier
          </h1>
          <div className="flex justify-between mt-4 text-sm font-bold uppercase tracking-widest text-slate-600">
            <span>Scholar: {researchData.studentName || "Anonymous"}</span>
            <span>Cohort: {researchData.classroom}</span>
          </div>
        </div>

        <section className="mb-10">
          <h2 className="text-xl font-black uppercase border-b-2 border-slate-200 mb-4">
            I. The Inquiry
          </h2>
          <p className="text-2xl font-bold text-emerald-900 mb-4">
            {researchData.topic || "No Topic Set"}
          </p>
          <div className="grid grid-cols-2 gap-8 mt-6">
            <div>
              <h3 className="text-[10px] font-black uppercase text-slate-400 mb-2">
                Historical Context
              </h3>
              <p className="text-sm leading-relaxed">{researchData.context}</p>
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase text-slate-400 mb-2">
                Historical Significance
              </h3>
              <p className="text-sm leading-relaxed">
                {researchData.importance}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-10 page-break-before">
          <h2 className="text-xl font-black uppercase border-b-2 border-slate-200 mb-4">
            II. The Argument (Thesis)
          </h2>
          <div className="bg-slate-50 p-6 rounded-xl italic text-lg leading-relaxed">
            "{researchData.thesis || "No thesis statement drafted yet."}"
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-black uppercase border-b-2 border-slate-200 mb-4">
            III. Primary & Secondary Sources
          </h2>
          <div className="space-y-4">
            {researchData.sources
              .filter((s) => s.title)
              .map((s) => (
                <div
                  key={s.id}
                  className="border-l-4 border-emerald-700 pl-4 py-1"
                >
                  <p className="font-bold">{s.title}</p>
                  <p className="text-[10px] uppercase font-black text-slate-400">
                    {s.type} Source
                  </p>
                </div>
              ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-black uppercase border-b-2 border-slate-200 mb-4">
            IV. Chronological Timeline
          </h2>
          <div className="space-y-4">
            {researchData.timeline
              .filter((t) => t.event)
              .map((t) => (
                <div key={t.id} className="flex gap-6">
                  <span className="font-black text-emerald-800 w-24 shrink-0">
                    {t.date}
                  </span>
                  <span className="text-sm">{t.event}</span>
                </div>
              ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-black uppercase border-b-2 border-slate-200 mb-4">
            V. Evidence Log
          </h2>
          <div className="space-y-6">
            {researchData.evidence
              .filter((e) => e.fact)
              .map((e) => (
                <div key={e.id} className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm italic mb-2">"{e.fact}"</p>
                  {e.connectionToThesis && (
                    <p className="text-[10px] font-bold text-emerald-800">
                      Analysis: {e.connectionToThesis}
                    </p>
                  )}
                </div>
              ))}
          </div>
        </section>
      </div>

      {showPINModal && (
        <PINModal isOpen={showPINModal} onPINSubmit={handlePINSubmit} />
      )}
    </div>
  );
};

export default App;
