import { useState } from "react";
import {
  Play, Pause, Square, Plus, Trash2, Edit3, Clock,
  ChevronDown, ChevronUp, Save, X, AlertTriangle, Users,
  BookOpen, CheckCircle, BarChart2, PlusCircle, Timer
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useQuiz, type QuizQuestion, type QuizSession } from "../../context/QuizContext";
import { useMockData } from "../../context/MockDataContext";

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

// ─── Create Quiz Modal ────────────────────────────────────────────────────────
function CreateQuizModal({ onClose, doctorId, doctorName, courses }: {
  onClose: () => void;
  doctorId: string;
  doctorName: string;
  courses: { id: string; name: string; code: string }[];
}) {
  const { createSession } = useQuiz();
  const [step, setStep] = useState<"info" | "questions">("info");
  const [info, setInfo] = useState({
    courseId: courses[0]?.id || "",
    title: "",
    durationMinutes: "10",
    canRetake: false,
    maxRetakes: "1",
  });
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    { id: "Q_" + Date.now(), text: "", options: ["", "", "", ""], correct: "", points: 25 },
  ]);

  const selectedCourse = courses.find(c => c.id === info.courseId);

  const addQuestion = () => {
    setQuestions(prev => [...prev, {
      id: "Q_" + Date.now() + Math.random(),
      text: "", options: ["", "", "", ""], correct: "", points: 25,
    }]);
  };

  const removeQuestion = (id: string) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof QuizQuestion, value: any) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const updateOption = (qId: string, idx: number, value: string) => {
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const opts = [...q.options];
      opts[idx] = value;
      return { ...q, options: opts };
    }));
  };

  const handleSave = () => {
    const valid = questions.every(q => q.text && q.correct && q.options.every(o => o));
    if (!valid) { alert("Please fill all question fields and set correct answers."); return; }

    createSession({
      courseId: info.courseId,
      courseName: selectedCourse?.name || "",
      doctorId,
      doctorName,
      title: info.title || `Quiz - ${selectedCourse?.name}`,
      questions,
      durationSeconds: parseInt(info.durationMinutes) * 60,
      canRetake: info.canRetake,
      maxRetakes: parseInt(info.maxRetakes),
      allowedStudentIds: [],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white">Create New Quiz</h2>
            <div className="flex gap-3 mt-2">
              {["info", "questions"].map(s => (
                <button key={s} onClick={() => setStep(s as any)}
                  className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                    step === s ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
                  }`}>
                  {s === "info" ? "1. Info" : "2. Questions"}
                </button>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === "info" ? (
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Course</label>
                <select value={info.courseId} onChange={e => setInfo({ ...info, courseId: e.target.value })}
                  className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-blue-500">
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quiz Title</label>
                <input value={info.title} onChange={e => setInfo({ ...info, title: e.target.value })}
                  placeholder="e.g. Midterm Quiz - Chapter 3"
                  className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Duration (minutes)</label>
                <div className="flex gap-2">
                  {["5", "10", "15", "20", "30", "45", "60"].map(d => (
                    <button key={d} onClick={() => setInfo({ ...info, durationMinutes: d })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        info.durationMinutes === d ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                      }`}>{d}m</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg">
                <input type="checkbox" id="canRetake" checked={info.canRetake} onChange={e => setInfo({ ...info, canRetake: e.target.checked })}
                  className="w-4 h-4 accent-blue-500" />
                <label htmlFor="canRetake" className="text-white text-sm font-medium cursor-pointer">Allow Retakes</label>
                {info.canRetake && (
                  <select value={info.maxRetakes} onChange={e => setInfo({ ...info, maxRetakes: e.target.value })}
                    className="ml-auto bg-[#1E293B] border border-slate-700 text-white px-3 py-1.5 rounded-lg text-sm">
                    {["1", "2", "3"].map(n => <option key={n} value={n}>{n} retake{n !== "1" ? "s" : ""}</option>)}
                  </select>
                )}
              </div>
              <button onClick={() => setStep("questions")}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all mt-2">
                Next: Add Questions →
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {questions.map((q, qi) => (
                <div key={q.id} className="bg-[#0B1120] border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question {qi + 1}</span>
                    <div className="flex items-center gap-2">
                      <select value={q.points} onChange={e => updateQuestion(q.id, "points", parseInt(e.target.value))}
                        className="bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded text-xs">
                        {[10, 25, 33, 50, 100].map(p => <option key={p} value={p}>{p} pts</option>)}
                      </select>
                      <button onClick={() => removeQuestion(q.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <textarea value={q.text} onChange={e => updateQuestion(q.id, "text", e.target.value)}
                    placeholder="Enter your question..."
                    className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg resize-none text-sm focus:outline-none focus:border-blue-500 mb-3"
                    rows={2} />
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className="relative">
                        <input value={opt} onChange={e => updateOption(q.id, oi, e.target.value)}
                          placeholder={`Option ${oi + 1}`}
                          className={`w-full bg-[#1E293B] border text-white p-2.5 pr-8 rounded-lg text-sm focus:outline-none transition-all ${
                            q.correct === opt && opt ? "border-[#00D084] bg-[#00D084]/5" : "border-slate-700 focus:border-blue-500"
                          }`} />
                        {opt && (
                          <button onClick={() => updateQuestion(q.id, "correct", opt)}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 transition-all ${
                              q.correct === opt ? "border-[#00D084] bg-[#00D084]" : "border-slate-500"
                            }`} />
                        )}
                      </div>
                    ))}
                  </div>
                  {q.correct && (
                    <p className="text-xs text-[#00D084]">✓ Correct: {q.correct}</p>
                  )}
                </div>
              ))}

              <button onClick={addQuestion}
                className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-700 hover:border-blue-500 text-slate-400 hover:text-blue-400 rounded-xl transition-all">
                <Plus className="w-4 h-4" /> Add Question
              </button>
            </div>
          )}
        </div>

        {step === "questions" && (
          <div className="p-6 border-t border-slate-800">
            <button onClick={handleSave}
              className="w-full py-3 bg-[#00D084] hover:bg-[#00b372] text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,208,132,0.3)]">
              <Save className="w-5 h-5" /> Save Quiz ({questions.length} question{questions.length !== 1 ? "s" : ""})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Live Session Control Panel ───────────────────────────────────────────────
function LiveControlPanel({ session }: { session: QuizSession }) {
  const { startSession, pauseSession, resumeSession, endSession, addTimeToSession, removeTimeFromSession, getSessionSubmissions } = useQuiz();
  const submissions = getSessionSubmissions(session.id);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const pct = Math.round((session.timeLeftSeconds / session.durationSeconds) * 100);
  const barColor = pct > 50 ? "bg-[#00D084]" : pct > 20 ? "bg-yellow-400" : "bg-red-400";

  return (
    <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
      {/* Status header */}
      <div className={`px-5 py-3 flex items-center justify-between ${
        session.status === "ACTIVE" ? "bg-[#00D084]/10 border-b border-[#00D084]/20"
        : session.status === "PAUSED" ? "bg-yellow-500/10 border-b border-yellow-500/20"
        : session.status === "ENDED" ? "bg-red-500/10 border-b border-red-500/20"
        : "bg-blue-500/10 border-b border-blue-500/20"
      }`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            session.status === "ACTIVE" ? "bg-[#00D084] animate-pulse"
            : session.status === "PAUSED" ? "bg-yellow-400"
            : session.status === "ENDED" ? "bg-red-400"
            : "bg-blue-400"
          }`} />
          <span className={`text-sm font-bold ${
            session.status === "ACTIVE" ? "text-[#00D084]"
            : session.status === "PAUSED" ? "text-yellow-400"
            : session.status === "ENDED" ? "text-red-400"
            : "text-blue-400"
          }`}>{session.status}</span>
        </div>
        <span className="text-slate-400 text-sm">{submissions.length} submitted</span>
      </div>

      <div className="p-5">
        <h3 className="font-bold text-white mb-1 truncate">{session.title}</h3>
        <p className="text-slate-400 text-sm mb-4">{session.courseName} · {session.questions.length} questions</p>

        {/* Timer */}
        {session.status !== "PENDING" && session.status !== "ENDED" && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Time Remaining</span>
              <span className="font-mono font-bold text-white text-lg">{formatTime(session.timeLeftSeconds)}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Time controls */}
        {(session.status === "ACTIVE" || session.status === "PAUSED") && (
          <div className="flex gap-2 mb-4">
            <span className="text-xs text-slate-500 self-center">Time:</span>
            {[60, 120, 300].map(s => (
              <button key={`+${s}`} onClick={() => addTimeToSession(session.id, s)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#00D084]/10 text-[#00D084] border border-[#00D084]/20 rounded-lg text-xs font-bold hover:bg-[#00D084]/20 transition-all">
                +{s / 60}m
              </button>
            ))}
            {[60, 120].map(s => (
              <button key={`-${s}`} onClick={() => removeTimeFromSession(session.id, s)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-all">
                -{s / 60}m
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {session.status === "PENDING" && (
            <button onClick={() => startSession(session.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#00D084] hover:bg-[#00b372] text-white font-bold rounded-lg transition-all shadow-[0_0_15px_rgba(0,208,132,0.2)]">
              <Play className="w-4 h-4" /> Start Quiz
            </button>
          )}
          {session.status === "ACTIVE" && (
            <>
              <button onClick={() => pauseSession(session.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-semibold rounded-lg hover:bg-yellow-500/30 transition-all">
                <Pause className="w-4 h-4" /> Pause
              </button>
              <button onClick={() => setShowEndConfirm(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 font-semibold rounded-lg hover:bg-red-500/30 transition-all">
                <Square className="w-4 h-4" /> End
              </button>
            </>
          )}
          {session.status === "PAUSED" && (
            <>
              <button onClick={() => resumeSession(session.id)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold rounded-lg hover:bg-blue-600/30 transition-all">
                <Play className="w-4 h-4" /> Resume
              </button>
              <button onClick={() => setShowEndConfirm(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 font-semibold rounded-lg hover:bg-red-500/30 transition-all">
                <Square className="w-4 h-4" /> End
              </button>
            </>
          )}
          {session.status === "ENDED" && (
            <div className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-800 text-slate-500 font-semibold rounded-lg">
              <CheckCircle className="w-4 h-4" /> Quiz Ended
            </div>
          )}
        </div>
      </div>

      {/* Submissions mini list */}
      {submissions.length > 0 && (
        <div className="border-t border-slate-800 px-5 py-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Latest Submissions</p>
          <div className="flex flex-col gap-1">
            {submissions.slice(-3).reverse().map(sub => (
              <div key={sub.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Student #{sub.studentId}</span>
                <span className={`font-bold ${sub.score >= 75 ? "text-[#00D084]" : sub.score >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                  {sub.score}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* End confirm */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-sm w-full p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">End Quiz?</h3>
            <p className="text-slate-400 text-sm mb-6">All students will be auto-submitted. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowEndConfirm(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-lg font-medium">Cancel</button>
              <button onClick={() => { endSession(session.id); setShowEndConfirm(false); }} className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg">End Quiz</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Doctor Quiz Tab ─────────────────────────────────────────────────────
export default function DoctorQuizPanel() {
  const { user } = useAuth();
  const { sessions, deleteSession, getSessionSubmissions } = useQuiz();
  const { courses } = useMockData();
  const [showCreate, setShowCreate] = useState(false);

  const myCourses = courses.filter(c => c.doctorId === user?.id);
  const myCourseIds = myCourses.map(c => c.id);
  const mySessions = sessions.filter(s => s.doctorId === user?.id);

  const activeSessions  = mySessions.filter(s => s.status === "ACTIVE" || s.status === "PAUSED");
  const pendingSessions = mySessions.filter(s => s.status === "PENDING");
  const endedSessions   = mySessions.filter(s => s.status === "ENDED");

  return (
    <div className="flex flex-col gap-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Quiz Management</h2>
          <p className="text-slate-400 text-sm mt-0.5">{mySessions.length} total quizzes</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all">
          <PlusCircle className="w-4 h-4" /> New Quiz
        </button>
      </div>

      {/* Active / Paused - Live controls */}
      {activeSessions.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#00D084] rounded-full animate-pulse" /> Live Now
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {activeSessions.map(s => <LiveControlPanel key={s.id} session={s} />)}
          </div>
        </div>
      )}

      {/* Pending */}
      {pendingSessions.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Scheduled</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {pendingSessions.map(s => <LiveControlPanel key={s.id} session={s} />)}
          </div>
        </div>
      )}

      {/* Ended */}
      {endedSessions.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Completed</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {endedSessions.map(s => {
              const subs = getSessionSubmissions(s.id);
              const avg = subs.length > 0 ? Math.round(subs.reduce((a, b) => a + b.score, 0) / subs.length) : null;
              return (
                <div key={s.id} className="bg-[#111827] border border-slate-800 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">{s.title}</p>
                      <p className="text-slate-400 text-sm">{s.courseName}</p>
                    </div>
                    <button onClick={() => deleteSession(s.id)} className="text-slate-600 hover:text-red-400 transition-colors ml-2 flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4 text-sm mt-3">
                    <span className="flex items-center gap-1.5 text-slate-400">
                      <Users className="w-3.5 h-3.5" /> {subs.length} submitted
                    </span>
                    {avg !== null && (
                      <span className={`flex items-center gap-1.5 font-semibold ${avg >= 75 ? "text-[#00D084]" : avg >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                        <BarChart2 className="w-3.5 h-3.5" /> Avg: {avg}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mySessions.length === 0 && (
        <div className="text-center py-16 bg-[#111827] border border-slate-800 rounded-2xl">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No quizzes yet</p>
          <p className="text-slate-500 text-sm mb-4">Create your first quiz to get started</p>
          <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all">
            Create Quiz
          </button>
        </div>
      )}

      {showCreate && (
        <CreateQuizModal
          onClose={() => setShowCreate(false)}
          doctorId={user?.id || ""}
          doctorName={`Dr. ${user?.firstName} ${user?.lastName}`}
          courses={myCourses}
        />
      )}
    </div>
  );
}
