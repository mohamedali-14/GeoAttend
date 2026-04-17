import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Clock, ChevronRight, ChevronLeft, CheckCircle,
  AlertTriangle, BookOpen, Pause, ArrowLeft
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useQuiz, type QuizSession } from "../context/QuizContext";
import { useMockData } from "../context/MockDataContext";

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function QuizSelector() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enrollments } = useMockData();
  const { getActiveSessionsForStudent } = useQuiz();

  const myCourseIds = enrollments.filter(e => e.studentId === user?.id).map(e => e.courseId);
  const activeSessions = getActiveSessionsForStudent(myCourseIds, user?.id || "");

  if (activeSessions.length === 0) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center text-white p-6">
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-slate-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">No Active Quizzes</h2>
          <p className="text-slate-400 text-sm mb-6">No quizzes are running right now. Check back with your doctor.</p>
          <button onClick={() => navigate("/student")} className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-all">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center text-white p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-7 h-7 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold">Active Quizzes</h1>
          <p className="text-slate-400 text-sm mt-1">Select a quiz to start</p>
        </div>
        <div className="flex flex-col gap-3">
          {activeSessions.map(s => (
            <button key={s.id} onClick={() => navigate(`/quiz/${s.id}`)}
              className="bg-[#111827] border border-slate-700 hover:border-blue-500/50 rounded-xl p-5 text-left transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-white group-hover:text-blue-400 transition-colors">{s.title}</p>
                  <p className="text-slate-400 text-sm mt-0.5">{s.courseName}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-[#00D084]/10 text-[#00D084] border border-[#00D084]/20 px-2.5 py-1 rounded-full text-xs font-semibold">
                  <span className="w-1.5 h-1.5 bg-[#00D084] rounded-full animate-pulse" />LIVE
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{formatTime(s.timeLeftSeconds)} left</span>
                <span>{s.questions.length} questions</span>
                <span>By {s.doctorName}</span>
              </div>
            </button>
          ))}
        </div>
        <button onClick={() => navigate("/student")} className="mt-4 w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg font-medium transition-all text-sm">
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

function ActiveQuiz({ session, studentId }: { session: QuizSession; studentId: string }) {
  const navigate = useNavigate();
  const { submitQuiz, sessions } = useQuiz();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const startTime = useRef(Date.now());

  const liveSession = sessions.find(s => s.id === session.id) || session;
  const timeLeft = liveSession.timeLeftSeconds;
  const isPaused = liveSession.status === "PAUSED";
  const isEnded  = liveSession.status === "ENDED";
  const questions = liveSession.questions;
  const currentQ  = questions[currentIdx];
  const progress  = ((currentIdx + 1) / questions.length) * 100;

  useEffect(() => {
    if ((timeLeft <= 0 || isEnded) && !isSubmitting) handleFinalSubmit(true);
  }, [timeLeft, isEnded]);

  const handleSelectOption = (opt: string) => {
    if (isSubmitting || isPaused) return;
    setAnswers(prev => ({ ...prev, [currentQ.id]: opt }));
  };

  const handleFinalSubmit = (auto = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setShowConfirm(false);
    const timeTaken = Math.round((Date.now() - startTime.current) / 1000);
    const submission = submitQuiz(session.id, studentId, answers, Math.min(timeTaken, session.durationSeconds));
    setTimeout(() => {
      navigate("/quiz/results", {
        state: {
          result: {
            questions: questions.map((q, i) => ({ id: i + 1, _id: q.id, text: q.text, options: q.options, correct: q.correct })),
            answers: Object.fromEntries(questions.map((q, i) => [i + 1, answers[q.id] || ""])),
            timeTaken: submission.timeTaken,
            totalTime: session.durationSeconds,
            score: submission.score,
            canRetake: session.canRetake,
            retakesLeft: session.maxRetakes,
            sessionId: session.id,
            autoSubmitted: auto,
          }
        }
      });
    }, 600);
  };

  if (isSubmitting) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-white flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-[#00D084] mx-auto mb-4 animate-bounce" />
          <p className="text-xl font-bold">Submitting your answers...</p>
        </div>
      </div>
    );
  }

  const timeColor = timeLeft < 60 ? "bg-red-500/10 text-red-400 border-red-500/30 animate-pulse"
                  : timeLeft < 120 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                  : "bg-slate-800 text-slate-300 border-slate-700";

  return (
    <div className="min-h-screen bg-[#0B1120] text-white flex flex-col font-sans" dir="ltr">
      <header className="h-16 bg-[#111827] border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-10">
        <h1 className="text-base font-bold text-slate-200 truncate max-w-xs">{liveSession.title}</h1>
        <div className="flex items-center gap-3">
          {isPaused && (
            <div className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-lg text-sm font-semibold">
              <Pause className="w-3.5 h-3.5" /> Paused by Doctor
            </div>
          )}
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border ${timeColor}`}>
            <Clock className="w-4 h-4" />
            <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </header>

      <div className="w-full bg-slate-800 h-1.5">
        <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {isPaused && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="bg-[#111827] border border-yellow-500/30 rounded-2xl p-8 text-center max-w-sm">
            <Pause className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Quiz Paused</h3>
            <p className="text-slate-400 text-sm">Your doctor has paused the quiz. Please wait...</p>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col items-center p-6 md:p-10 overflow-y-auto">
        <div className="w-full max-w-3xl">
          <div className="flex justify-between items-end mb-6">
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">
              Question {currentIdx + 1} of {questions.length}
            </p>
            <div className="flex gap-1 flex-wrap justify-end max-w-xs">
              {questions.map((q, i) => (
                <button key={i} onClick={() => setCurrentIdx(i)}
                  className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${
                    i === currentIdx ? "bg-blue-600 text-white"
                    : answers[q.id] ? "bg-[#00D084]/20 text-[#00D084] border border-[#00D084]/30"
                    : "bg-slate-800 text-slate-400"
                  }`}>{i + 1}</button>
              ))}
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl mb-8">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{liveSession.courseName}</span>
              <span className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">{currentQ.points} pts</span>
            </div>
            <h2 className="text-xl md:text-2xl font-medium text-white mb-8 leading-relaxed">{currentQ.text}</h2>
            <div className="flex flex-col gap-3">
              {currentQ.options.map((opt, idx) => {
                const isSelected = answers[currentQ.id] === opt;
                return (
                  <button key={idx} onClick={() => handleSelectOption(opt)} disabled={isPaused}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      isSelected ? "bg-blue-600/10 border-blue-500 text-white"
                      : "bg-[#1E293B] border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800 disabled:opacity-50"
                    }`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? "border-blue-500" : "border-slate-500"}`}>
                      {isSelected && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />}
                    </div>
                    <span className="text-sm md:text-base">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentIdx(p => p - 1)} disabled={currentIdx === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            {currentIdx === questions.length - 1 ? (
              <button onClick={() => setShowConfirm(true)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white bg-[#00D084] hover:bg-[#00b372] transition-all shadow-[0_0_15px_rgba(0,208,132,0.3)]">
                Submit Quiz <CheckCircle className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={() => setCurrentIdx(p => p + 1)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-500 transition-all">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </main>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Ready to submit?</h3>
            {Object.keys(answers).length < questions.length ? (
              <p className="text-red-400 text-sm mb-6">You answered {Object.keys(answers).length} of {questions.length}. {questions.length - Object.keys(answers).length} unanswered.</p>
            ) : (
              <p className="text-slate-400 text-sm mb-6">All answered. You cannot change answers after submitting.</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-lg border border-slate-700 hover:bg-slate-700 transition-all">Cancel</button>
              <button onClick={() => handleFinalSubmit()} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all">Yes, Submit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuizPage() {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const { user } = useAuth();
  const { sessions } = useQuiz();

  if (!sessionId) return <QuizSelector />;
  const session = sessions.find(s => s.id === sessionId);
  if (!session) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center text-white">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
          <p className="text-lg font-bold">Quiz not found or has ended.</p>
        </div>
      </div>
    );
  }

  return <ActiveQuiz session={session} studentId={user?.id || ""} />;
}
