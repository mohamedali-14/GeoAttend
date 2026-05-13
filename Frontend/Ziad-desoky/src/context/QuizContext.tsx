import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { db } from "../firebase";
import { collection, query, onSnapshot, where } from "firebase/firestore";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correct: string;
  points: number;
}

export interface QuizSession {
  id: string;
  courseId: string;
  courseName: string;
  doctorId: string;
  doctorName: string;
  title: string;
  questions: QuizQuestion[];
  status: "PENDING" | "ACTIVE" | "PAUSED" | "ENDED";
  durationSeconds: number;
  timeLeftSeconds: number;
  startedAt: string | null;
  endedAt: string | null;
  canRetake: boolean;
  maxRetakes: number;
  allowedStudentIds: string[];
}

export interface StudentSubmission {
  id: string;
  quizSessionId: string;
  studentId: string;
  answers: Record<string, string>;
  submittedAt: string;
  timeTaken: number;
  score: number;
  attemptNumber: number;
}

export interface QuizContextType {
  sessions: QuizSession[];
  submissions: StudentSubmission[];
  createSession: (s: Omit<QuizSession, "id" | "status" | "timeLeftSeconds" | "startedAt" | "endedAt">) => QuizSession;
  updateSession: (id: string, data: Partial<QuizSession>) => void;
  deleteSession: (id: string) => void;
  startSession: (id: string) => void;
  pauseSession: (id: string) => void;
  resumeSession: (id: string) => void;
  endSession: (id: string) => void;
  addTimeToSession: (id: string, seconds: number) => void;
  removeTimeFromSession: (id: string, seconds: number) => void;
  submitQuiz: (quizSessionId: string, studentId: string, answers: Record<string, string>, timeTaken: number) => StudentSubmission;
  getStudentSubmissions: (studentId: string) => StudentSubmission[];
  getSessionSubmissions: (sessionId: string) => StudentSubmission[];
  canStudentTakeQuiz: (sessionId: string, studentId: string) => boolean;
  getActiveSessionForCourse: (courseId: string) => QuizSession | null;
  getActiveSessionsForStudent: (enrolledCourseIds: string[], studentId: string) => QuizSession[];
}

const QuizContext = createContext<QuizContextType | null>(null);

// ─── Storage helpers (shared across tabs/devices via backend, localStorage as cache) ──
const API_BASE = import.meta.env.VITE_API_URL || "/api";

function getToken() {
  return sessionStorage.getItem("geo_token") || localStorage.getItem("geo_token") || "";
}

function authHeaders() {
  const t = getToken();
  return t ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` } : { "Content-Type": "application/json" };
}

// ── Sync quiz sessions to/from backend ────────────────────────────────────────
async function fetchSessionsFromBackend(): Promise<QuizSession[] | null> {
  try {
    const res = await fetch(`${API_BASE}/quiz/sessions`, { headers: authHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    return data.sessions || data.data || null;
  } catch { return null; }
}

async function saveSessionToBackend(session: QuizSession): Promise<void> {
  try {
    await fetch(`${API_BASE}/quiz/sessions/${session.id}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(session),
    });
  } catch { /* fallback to local */ }
}

async function createSessionOnBackend(session: QuizSession): Promise<void> {
  try {
    await fetch(`${API_BASE}/quiz/sessions`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(session),
    });
  } catch { /* fallback to local */ }
}

async function deleteSessionOnBackend(id: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/quiz/sessions/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
  } catch { /* ignore */ }
}

// ── localStorage fallback ─────────────────────────────────────────────────────
function loadLocal<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); if (s) return JSON.parse(s); } catch { }
  return fallback;
}
function saveLocal<T>(key: string, data: T) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function QuizProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<QuizSession[]>(
    () => loadLocal("geo_quiz_sessions", [])
  );
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(
    () => loadLocal("geo_quiz_submissions", [])
  );
  const { user } = useAuth();
  const syncedRef = useRef(false);

  // ── On mount: try to load from backend, fallback to localStorage ─────────────
  useEffect(() => {
    if (syncedRef.current) return;
    syncedRef.current = true;
    fetchSessionsFromBackend().then(remote => {
      if (remote) {
        setSessions(remote);
        saveLocal("geo_quiz_sessions", remote);
      }
    });
  }, []);

  // ── Persist locally always ────────────────────────────────────────────────────
  useEffect(() => { saveLocal("geo_quiz_sessions", sessions); }, [sessions]);
  useEffect(() => { saveLocal("geo_quiz_submissions", submissions); }, [submissions]);

  // ── Real-time Firestore sync (Direct linking like Omar Shabaan) ────────────────
  useEffect(() => {
    // 1. Listen for ALL Sessions (which now include Quiz fields)
    const q = query(collection(db, "sessions"));
    const unsubSessions = onSnapshot(q, (snap) => {
      const remote = snap.docs.map(d => {
          const data = d.data();
          return {
              id: d.id,
              courseId: data.courseId,
              courseName: data.courseName || "Lecture",
              doctorId: data.professorId || data.doctorId,
              doctorName: data.doctorName || "Doctor",
              title: data.quizTitle || data.courseName || "Quiz",
              questions: data.quizQuestions || [],
              status: data.quizActive ? "ACTIVE" : (data.quizQuestions?.length > 0 ? "PENDING" : "ENDED"),
              timeLeftSeconds: data.quizDurationSeconds || 600,
              durationSeconds: data.quizDurationSeconds || 600,
              canRetake: data.quizCanRetake || false,
              maxRetakes: data.quizMaxRetakes || 1,
              allowedStudentIds: [],
              startedAt: data.quizActivatedAt,
              endedAt: data.quizEndedAt,
          } as QuizSession;
      }).filter(s => s.questions.length > 0);

      setSessions(remote);
    });

    // 2. Listen for My Submissions (Using Omar's 'quizResults' collection)
    let unsubSubmissions = () => {};
    if (user?.id) {
      const subQ = query(collection(db, "quizResults"), where("studentId", "==", user.id));
      unsubSubmissions = onSnapshot(subQ, (snap) => {
        const mapped = snap.docs.map(d => {
            const data = d.data();
            return {
                id: d.id,
                studentId: data.studentId,
                score: data.score,
                timeTaken: data.timeTaken || 0,
                submittedAt: data.submittedAt || new Date().toISOString(),
                quizSessionId: data.sessionId,
            } as StudentSubmission;
        });
        setSubmissions(mapped);
      });
    }

    return () => {
      unsubSessions();
      unsubSubmissions();
    };
  }, [user]);

  // ── Countdown timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      setSessions(prev =>
        prev.map(s => {
          if (s.status !== "ACTIVE") return s;
          const newTime = s.timeLeftSeconds - 1;
          if (newTime <= 0) return { ...s, timeLeftSeconds: 0, status: "ENDED", endedAt: new Date().toISOString() };
          return { ...s, timeLeftSeconds: newTime };
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ─── Session CRUD ──────────────────────────────────────────────────────────────
  const createSession = async (s: Omit<QuizSession, "id" | "status" | "timeLeftSeconds" | "startedAt" | "endedAt">): Promise<QuizSession> => {
    // 1. Find an active session for this course to attach the quiz to
    const activeLecture = sessions.find(x => x.courseId === s.courseId && x.status === "ACTIVE");
    const sessionId = activeLecture ? activeLecture.id : ("QS" + Date.now());

    // 2. Write to Firestore 'sessions' collection (Matching Omar's logic)
    try {
      const { doc, updateDoc, setDoc, serverTimestamp } = await import("firebase/firestore");
      const ref = doc(db, "sessions", sessionId);
      
      const quizData = {
        quizQuestions: s.questions,
        quizTitle: s.title,
        quizActive: false,
        quizDurationSeconds: s.durationSeconds,
        quizCanRetake: s.canRetake,
        quizMaxRetakes: s.maxRetakes,
        quizCreatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      if (activeLecture) {
        await updateDoc(ref, quizData);
      } else {
        // Create a skeleton session if none active (Omar usually creates quiz for active session)
        await setDoc(ref, {
           ...quizData,
           courseId: s.courseId,
           courseName: s.courseName,
           professorId: s.doctorId,
           status: "PENDING",
        });
      }
    } catch (err) {
      console.error("Failed to create quiz in Firestore sessions:", err);
    }

    return { ...s, id: sessionId, status: "PENDING", timeLeftSeconds: s.durationSeconds, startedAt: null, endedAt: null };
  };

  const updateSession = async (id: string, data: Partial<QuizSession>) => {
    // 1. Update local state
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));

    // 2. Write to Firestore 'sessions' (Matching Omar's logic)
    try {
      const { doc, updateDoc, serverTimestamp } = await import("firebase/firestore");
      const updateObj: any = { updatedAt: serverTimestamp() };
      
      if (data.status === "ACTIVE") updateObj.quizActive = true;
      if (data.status === "PAUSED") updateObj.quizActive = false; // Or handle as paused
      if (data.status === "ENDED")  updateObj.quizActive = false;
      
      if (data.startedAt) updateObj.quizActivatedAt = data.startedAt;
      if (data.endedAt)   updateObj.quizEndedAt = data.endedAt;
      if (data.questions) updateObj.quizQuestions = data.questions;

      await updateDoc(doc(db, "sessions", id), updateObj);
    } catch (err) {
      console.error("Failed to update quiz in Firestore sessions:", err);
    }

    const updated = sessions.find(s => s.id === id);
    if (updated) saveSessionToBackend({ ...updated, ...data });
  };

  const deleteSession = async (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    try {
      const { doc, updateDoc, serverTimestamp, deleteField } = await import("firebase/firestore");
      await updateDoc(doc(db, "sessions", id), {
        quizQuestions: deleteField(),
        quizActive: false,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to delete quiz in Firestore sessions:", err);
    }
  };

  const startSession = (id: string) => {
    updateSession(id, { status: "ACTIVE", startedAt: new Date().toISOString() });
  };

  const pauseSession = (id: string) => {
    updateSession(id, { status: "PAUSED" });
  };

  const resumeSession = (id: string) => {
    updateSession(id, { status: "ACTIVE" });
  };

  const endSession = (id: string) => {
    updateSession(id, { status: "ENDED", endedAt: new Date().toISOString() });
  };

  const addTimeToSession = (id: string, seconds: number) => {
    setSessions(prev => {
      const updated = prev.map(s =>
        s.id === id ? { ...s, timeLeftSeconds: s.timeLeftSeconds + seconds, durationSeconds: s.durationSeconds + seconds } : s
      );
      const found = updated.find(s => s.id === id);
      if (found) saveSessionToBackend(found);
      return updated;
    });
  };

  const removeTimeFromSession = (id: string, seconds: number) => {
    setSessions(prev => {
      const updated = prev.map(s =>
        s.id === id ? { ...s, timeLeftSeconds: Math.max(0, s.timeLeftSeconds - seconds) } : s
      );
      const found = updated.find(s => s.id === id);
      if (found) saveSessionToBackend(found);
      return updated;
    });
  };

  // ─── Student actions ───────────────────────────────────────────────────────────
  const submitQuiz = async (
    quizSessionId: string,
    studentId: string,
    answers: Record<string, string>,
    timeTaken: number
  ): Promise<StudentSubmission> => {
    const session = sessions.find(s => s.id === quizSessionId);
    
    // Calculate score
    let score = 0;
    if (session) {
      const totalPoints = session.questions.reduce((a, q) => a + q.points, 0);
      const earnedPoints = session.questions.reduce((a, q) => answers[q.id] === q.correct ? a + q.points : a, 0);
      score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    }

    const submission: StudentSubmission = {
      id: "SUB" + Date.now(),
      quizSessionId,
      studentId,
      answers,
      score,
      timeTaken,
      submittedAt: new Date().toISOString(),
    };

    // 1. Update local state
    setSubmissions(prev => [...prev, submission]);

    // 2. Write to Firestore 'quizResults' (Matching Omar's naming)
    try {
      const { doc, setDoc, serverTimestamp, getDoc } = await import("firebase/firestore");
      const userDoc = await getDoc(doc(db, "users", studentId));
      const userData = userDoc.exists() ? userDoc.data() : {};

      await setDoc(doc(db, "quizResults", submission.id), {
        sessionId: quizSessionId,
        studentId,
        studentName: userData.firstName ? `${userData.firstName} ${userData.lastName}` : "Student",
        answers,
        score,
        timeTaken,
        submittedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to submit quiz to Firestore quizResults:", err);
    }

    return submission;
  };

  const getStudentSubmissions = (studentId: string) =>
    submissions.filter(s => s.studentId === studentId);

  const getSessionSubmissions = (sessionId: string) =>
    submissions.filter(s => s.quizSessionId === sessionId);

  const canStudentTakeQuiz = (sessionId: string, studentId: string): boolean => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session || session.status !== "ACTIVE") return false;
    const prevAttempts = submissions.filter(s => s.quizSessionId === sessionId && s.studentId === studentId);
    if (!session.canRetake && prevAttempts.length > 0) return false;
    if (session.canRetake && prevAttempts.length >= session.maxRetakes + 1) return false;
    return true;
  };

  const getActiveSessionForCourse = (courseId: string): QuizSession | null =>
    sessions.find(s => s.courseId === courseId && s.status === "ACTIVE") || null;

  const getActiveSessionsForStudent = (enrolledCourseIds: string[], studentId: string): QuizSession[] =>
    sessions.filter(s =>
      // Show if student is enrolled OR if course filter is not strictly enforced in UI
      (enrolledCourseIds.includes(s.courseId) || enrolledCourseIds.length === 0) &&
      (s.status === "ACTIVE" || s.status === "PAUSED") &&
      canStudentTakeQuiz(s.id, studentId)
    );

  return (
    <QuizContext.Provider value={{
      sessions, submissions,
      createSession, updateSession, deleteSession,
      startSession, pauseSession, resumeSession, endSession,
      addTimeToSession, removeTimeFromSession,
      submitQuiz, getStudentSubmissions, getSessionSubmissions, canStudentTakeQuiz,
      getActiveSessionForCourse, getActiveSessionsForStudent,
    }}>
      {children}
    </QuizContext.Provider>
  );
}

export function useQuiz() {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error("useQuiz must be inside QuizProvider");
  return ctx;
}
