import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

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
  durationSeconds: number;          // total allowed time
  timeLeftSeconds: number;          // remaining time (controlled by doctor)
  startedAt: string | null;         // ISO timestamp
  endedAt: string | null;
  canRetake: boolean;
  maxRetakes: number;
  allowedStudentIds: string[];      // empty = all enrolled students
}

export interface StudentSubmission {
  id: string;
  quizSessionId: string;
  studentId: string;
  answers: Record<string, string>;  // questionId -> selected option
  submittedAt: string;
  timeTaken: number;                // seconds
  score: number;                    // 0-100
  attemptNumber: number;
}

export interface QuizContextType {
  sessions: QuizSession[];
  submissions: StudentSubmission[];

  // Doctor / Admin actions
  createSession: (s: Omit<QuizSession, "id" | "status" | "timeLeftSeconds" | "startedAt" | "endedAt">) => QuizSession;
  updateSession: (id: string, data: Partial<QuizSession>) => void;
  deleteSession: (id: string) => void;
  startSession: (id: string) => void;
  pauseSession: (id: string) => void;
  resumeSession: (id: string) => void;
  endSession: (id: string) => void;
  addTimeToSession: (id: string, seconds: number) => void;
  removeTimeFromSession: (id: string, seconds: number) => void;

  // Student actions
  submitQuiz: (quizSessionId: string, studentId: string, answers: Record<string, string>, timeTaken: number) => StudentSubmission;
  getStudentSubmissions: (studentId: string) => StudentSubmission[];
  getSessionSubmissions: (sessionId: string) => StudentSubmission[];
  canStudentTakeQuiz: (sessionId: string, studentId: string) => boolean;

  // Helpers
  getActiveSessionForCourse: (courseId: string) => QuizSession | null;
  getActiveSessionsForStudent: (enrolledCourseIds: string[], studentId: string) => QuizSession[];
}

const QuizContext = createContext<QuizContextType | null>(null);

// ─── Default seed data ────────────────────────────────────────────────────────
const DEFAULT_SESSIONS: QuizSession[] = [
  {
    id: "QS1",
    courseId: "C1",
    courseName: "Data Structures",
    doctorId: "8",
    doctorName: "Dr. Khaled Hassan",
    title: "Midterm Quiz - Arrays & Linked Lists",
    questions: [
      { id: "Q1", text: "What is the time complexity of accessing an element in an array by index?", options: ["O(n)", "O(log n)", "O(1)", "O(n²)"], correct: "O(1)", points: 25 },
      { id: "Q2", text: "Which data structure uses LIFO (Last In First Out)?", options: ["Queue", "Stack", "Linked List", "Tree"], correct: "Stack", points: 25 },
      { id: "Q3", text: "What is the advantage of a linked list over an array?", options: ["Random access", "Dynamic size", "Cache-friendly", "Faster search"], correct: "Dynamic size", points: 25 },
      { id: "Q4", text: "Which sorting algorithm has O(n log n) average time complexity?", options: ["Bubble Sort", "Selection Sort", "Merge Sort", "Insertion Sort"], correct: "Merge Sort", points: 25 },
    ],
    status: "PENDING",
    durationSeconds: 600,
    timeLeftSeconds: 600,
    startedAt: null,
    endedAt: null,
    canRetake: false,
    maxRetakes: 0,
    allowedStudentIds: [],
  },
];

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    if (s) return JSON.parse(s);
  } catch (_) { /* ignore */ }
  return fallback;
}

function saveToStorage<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function QuizProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<QuizSession[]>(
    () => loadFromStorage("geo_quiz_sessions", DEFAULT_SESSIONS)
  );
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(
    () => loadFromStorage("geo_quiz_submissions", [])
  );

  useEffect(() => { saveToStorage("geo_quiz_sessions", sessions); }, [sessions]);
  useEffect(() => { saveToStorage("geo_quiz_submissions", submissions); }, [submissions]);

  // ── Countdown timer for active sessions ─────────────────────────────────────
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

  // ── Session CRUD ─────────────────────────────────────────────────────────────
  const createSession = (s: Omit<QuizSession, "id" | "status" | "timeLeftSeconds" | "startedAt" | "endedAt">): QuizSession => {
    const newSession: QuizSession = {
      ...s,
      id: "QS" + Date.now(),
      status: "PENDING",
      timeLeftSeconds: s.durationSeconds,
      startedAt: null,
      endedAt: null,
    };
    setSessions(prev => [...prev, newSession]);
    return newSession;
  };

  const updateSession = (id: string, data: Partial<QuizSession>) =>
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));

  const deleteSession = (id: string) =>
    setSessions(prev => prev.filter(s => s.id !== id));

  const startSession = (id: string) =>
    setSessions(prev => prev.map(s =>
      s.id === id ? { ...s, status: "ACTIVE", startedAt: new Date().toISOString(), timeLeftSeconds: s.durationSeconds } : s
    ));

  const pauseSession = (id: string) =>
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status: "PAUSED" } : s));

  const resumeSession = (id: string) =>
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status: "ACTIVE" } : s));

  const endSession = (id: string) =>
    setSessions(prev => prev.map(s =>
      s.id === id ? { ...s, status: "ENDED", endedAt: new Date().toISOString() } : s
    ));

  const addTimeToSession = (id: string, seconds: number) =>
    setSessions(prev => prev.map(s =>
      s.id === id ? { ...s, timeLeftSeconds: s.timeLeftSeconds + seconds, durationSeconds: s.durationSeconds + seconds } : s
    ));

  const removeTimeFromSession = (id: string, seconds: number) =>
    setSessions(prev => prev.map(s =>
      s.id === id ? { ...s, timeLeftSeconds: Math.max(0, s.timeLeftSeconds - seconds) } : s
    ));

  // ── Student actions ──────────────────────────────────────────────────────────
  const submitQuiz = (
    quizSessionId: string,
    studentId: string,
    answers: Record<string, string>,
    timeTaken: number
  ): StudentSubmission => {
    const session = sessions.find(s => s.id === quizSessionId);
    const attemptNumber = submissions.filter(sub => sub.quizSessionId === quizSessionId && sub.studentId === studentId).length + 1;

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
      submittedAt: new Date().toISOString(),
      timeTaken,
      score,
      attemptNumber,
    };
    setSubmissions(prev => [...prev, submission]);
    return submission;
  };

  const getStudentSubmissions = (studentId: string) =>
    submissions.filter(s => s.studentId === studentId);

  const getSessionSubmissions = (sessionId: string) =>
    submissions.filter(s => s.quizSessionId === sessionId);

  const canStudentTakeQuiz = (sessionId: string, studentId: string): boolean => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return false;
    if (session.status !== "ACTIVE") return false;
    const prevAttempts = submissions.filter(s => s.quizSessionId === sessionId && s.studentId === studentId);
    if (!session.canRetake && prevAttempts.length > 0) return false;
    if (session.canRetake && prevAttempts.length >= session.maxRetakes + 1) return false;
    return true;
  };

  const getActiveSessionForCourse = (courseId: string): QuizSession | null =>
    sessions.find(s => s.courseId === courseId && s.status === "ACTIVE") || null;

  const getActiveSessionsForStudent = (enrolledCourseIds: string[], studentId: string): QuizSession[] =>
    sessions.filter(s =>
      enrolledCourseIds.includes(s.courseId) &&
      s.status === "ACTIVE" &&
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
