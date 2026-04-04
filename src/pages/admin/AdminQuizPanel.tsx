import { useState } from "react";
import {
  Play, Pause, Square, Trash2, BarChart2, Users,
  BookOpen, Clock, ChevronDown, ChevronRight,
  AlertTriangle, Eye, Filter, Search
} from "lucide-react";
import { useQuiz, type QuizSession } from "../../context/QuizContext";
import { useMockData } from "../../context/MockDataContext";

function formatTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function StatusBadge({ status }: { status: QuizSession["status"] }) {
  const map = {
    ACTIVE:  { label: "Live",      cls: "bg-[#00D084]/10 text-[#00D084] border-[#00D084]/20", dot: "bg-[#00D084] animate-pulse" },
    PAUSED:  { label: "Paused",    cls: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", dot: "bg-yellow-400" },
    PENDING: { label: "Scheduled", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20", dot: "bg-blue-400" },
    ENDED:   { label: "Ended",     cls: "bg-slate-700 text-slate-400 border-slate-600", dot: "bg-slate-400" },
  };
  const c = map[status];
  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${c.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

function SessionDetailModal({ session, onClose }: { session: QuizSession; onClose: () => void }) {
  const { getSessionSubmissions, startSession, pauseSession, resumeSession, endSession, addTimeToSession, removeTimeFromSession, deleteSession } = useQuiz();
  const { users } = useMockData();
  const submissions = getSessionSubmissions(session.id);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const avg = submissions.length > 0 ? Math.round(submissions.reduce((a, b) => a + b.score, 0) / submissions.length) : null;

  const handleDelete = () => {
    deleteSession(session.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-start justify-between p-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-white">{session.title}</h2>
              <StatusBadge status={session.status} />
            </div>
            <p className="text-slate-400 text-sm">{session.courseName} · By {session.doctorName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Questions", value: session.questions.length, color: "text-blue-400" },
              { label: "Duration", value: `${Math.round(session.durationSeconds / 60)}m`, color: "text-purple-400" },
              { label: "Submitted", value: submissions.length, color: "text-[#00D084]" },
              { label: "Avg Score", value: avg !== null ? `${avg}%` : "—", color: avg !== null && avg >= 75 ? "text-[#00D084]" : avg !== null && avg >= 60 ? "text-yellow-400" : "text-red-400" },
            ].map(s => (
              <div key={s.label} className="bg-slate-800/50 rounded-xl p-3 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Admin controls */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Admin Controls</p>

            {/* Time adjustment */}
            {(session.status === "ACTIVE" || session.status === "PAUSED") && (
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-sm text-slate-400">Timer: <span className="font-mono font-bold text-white">{formatTime(session.timeLeftSeconds)}</span></span>
                {[60, 120, 300].map(s => (
                  <button key={s} onClick={() => addTimeToSession(session.id, s)}
                    className="px-2.5 py-1 bg-[#00D084]/10 text-[#00D084] border border-[#00D084]/20 rounded-lg text-xs font-bold hover:bg-[#00D084]/20 transition-all">
                    +{s / 60}m
                  </button>
                ))}
                {[60, 120].map(s => (
                  <button key={s} onClick={() => removeTimeFromSession(session.id, s)}
                    className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-all">
                    -{s / 60}m
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              {session.status === "PENDING" && (
                <button onClick={() => startSession(session.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#00D084] hover:bg-[#00b372] text-white font-semibold rounded-lg text-sm transition-all">
                  <Play className="w-4 h-4" /> Start
                </button>
              )}
              {session.status === "ACTIVE" && (
                <button onClick={() => pauseSession(session.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-semibold rounded-lg text-sm hover:bg-yellow-500/30 transition-all">
                  <Pause className="w-4 h-4" /> Pause
                </button>
              )}
              {session.status === "PAUSED" && (
                <button onClick={() => resumeSession(session.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold rounded-lg text-sm hover:bg-blue-600/30 transition-all">
                  <Play className="w-4 h-4" /> Resume
                </button>
              )}
              {(session.status === "ACTIVE" || session.status === "PAUSED") && (
                <button onClick={() => setShowEndConfirm(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 font-semibold rounded-lg text-sm hover:bg-red-500/30 transition-all">
                  <Square className="w-4 h-4" /> End Quiz
                </button>
              )}
              <button onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-900/30 text-red-400 border border-red-800/30 font-semibold rounded-lg text-sm hover:bg-red-900/50 transition-all ml-auto">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
          </div>

          {/* Submissions table */}
          {submissions.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Submissions ({submissions.length})</p>
              <div className="bg-[#0B1120] border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-4 py-2.5 text-slate-500 font-semibold text-xs uppercase">Student</th>
                      <th className="text-center px-4 py-2.5 text-slate-500 font-semibold text-xs uppercase">Score</th>
                      <th className="text-center px-4 py-2.5 text-slate-500 font-semibold text-xs uppercase">Time</th>
                      <th className="text-center px-4 py-2.5 text-slate-500 font-semibold text-xs uppercase">Attempt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map(sub => {
                      const student = users.find(u => u.id === sub.studentId);
                      return (
                        <tr key={sub.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                          <td className="px-4 py-3 text-white font-medium">
                            {student ? `${student.firstName} ${student.lastName}` : `Student #${sub.studentId}`}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${sub.score >= 75 ? "text-[#00D084]" : sub.score >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                              {sub.score}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-slate-400">{formatTime(sub.timeTaken)}</td>
                          <td className="px-4 py-3 text-center text-slate-400">#{sub.attemptNumber}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Confirm modals */}
        {showEndConfirm && (
          <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center p-6">
            <div className="bg-[#111827] border border-slate-700 rounded-xl p-6 text-center max-w-xs">
              <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <h3 className="font-bold text-white mb-2">End this quiz?</h3>
              <p className="text-slate-400 text-sm mb-4">All students will be auto-submitted.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowEndConfirm(false)} className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={() => { endSession(session.id); setShowEndConfirm(false); }} className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-sm">End</button>
              </div>
            </div>
          </div>
        )}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center p-6">
            <div className="bg-[#111827] border border-slate-700 rounded-xl p-6 text-center max-w-xs">
              <Trash2 className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <h3 className="font-bold text-white mb-2">Delete quiz?</h3>
              <p className="text-slate-400 text-sm mb-4">This will permanently remove the quiz and all submissions.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={handleDelete} className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-sm">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Admin Quiz Overview ──────────────────────────────────────────────────────
export default function AdminQuizPanel() {
  const { sessions, getSessionSubmissions, startSession, pauseSession, resumeSession, endSession, deleteSession } = useQuiz();
  const { users, courses } = useMockData();
  const [selectedSession, setSelectedSession] = useState<QuizSession | null>(null);
  const [filter, setFilter] = useState<"all" | "ACTIVE" | "PAUSED" | "PENDING" | "ENDED">("all");
  const [search, setSearch] = useState("");

  const filtered = sessions
    .filter(s => filter === "all" || s.status === filter)
    .filter(s => s.title.toLowerCase().includes(search.toLowerCase()) || s.courseName.toLowerCase().includes(search.toLowerCase()) || s.doctorName.toLowerCase().includes(search.toLowerCase()));

  const totalActive = sessions.filter(s => s.status === "ACTIVE").length;
  const totalSubs   = sessions.reduce((a, s) => a + getSessionSubmissions(s.id).length, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Quizzes", value: sessions.length, color: "text-blue-400" },
          { label: "Live Now", value: totalActive, color: "text-[#00D084]" },
          { label: "Total Submissions", value: totalSubs, color: "text-purple-400" },
          { label: "Doctors", value: new Set(sessions.map(s => s.doctorId)).size, color: "text-yellow-400" },
        ].map(s => (
          <div key={s.label} className="bg-[#111827] border border-slate-800 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quizzes..."
            className="w-full pl-9 pr-4 py-2.5 bg-[#111827] border border-slate-700 text-white rounded-lg text-sm focus:outline-none focus:border-blue-500" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "ACTIVE", "PAUSED", "PENDING", "ENDED"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === f ? "bg-blue-600 text-white" : "bg-[#111827] border border-slate-700 text-slate-400 hover:text-white"
              }`}>
              {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions table */}
      <div className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No quizzes found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-5 py-3.5 text-slate-500 font-semibold text-xs uppercase tracking-wider">Quiz</th>
                  <th className="text-left px-4 py-3.5 text-slate-500 font-semibold text-xs uppercase tracking-wider">Doctor</th>
                  <th className="text-center px-4 py-3.5 text-slate-500 font-semibold text-xs uppercase tracking-wider">Status</th>
                  <th className="text-center px-4 py-3.5 text-slate-500 font-semibold text-xs uppercase tracking-wider">Timer</th>
                  <th className="text-center px-4 py-3.5 text-slate-500 font-semibold text-xs uppercase tracking-wider">Subs</th>
                  <th className="text-center px-4 py-3.5 text-slate-500 font-semibold text-xs uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const subs = getSessionSubmissions(s.id);
                  return (
                    <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">{s.title}</p>
                        <p className="text-slate-400 text-xs mt-0.5">{s.courseName}</p>
                      </td>
                      <td className="px-4 py-4 text-slate-300">{s.doctorName}</td>
                      <td className="px-4 py-4 text-center"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-4 text-center">
                        <span className={`font-mono text-sm ${s.status === "ACTIVE" ? "text-[#00D084]" : s.status === "ENDED" ? "text-slate-500" : "text-slate-300"}`}>
                          {s.status === "ENDED" ? "—" : formatTime(s.timeLeftSeconds)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-slate-300">{subs.length}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => setSelectedSession(s)} className="p-1.5 text-blue-400 hover:bg-blue-600/20 rounded-lg transition-all" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                          {s.status === "PENDING" && (
                            <button onClick={() => startSession(s.id)} className="p-1.5 text-[#00D084] hover:bg-[#00D084]/20 rounded-lg transition-all" title="Start">
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          {s.status === "ACTIVE" && (
                            <button onClick={() => pauseSession(s.id)} className="p-1.5 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-all" title="Pause">
                              <Pause className="w-4 h-4" />
                            </button>
                          )}
                          {s.status === "PAUSED" && (
                            <button onClick={() => resumeSession(s.id)} className="p-1.5 text-blue-400 hover:bg-blue-600/20 rounded-lg transition-all" title="Resume">
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          {(s.status === "ACTIVE" || s.status === "PAUSED") && (
                            <button onClick={() => endSession(s.id)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-all" title="End">
                              <Square className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => deleteSession(s.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedSession && (
        <SessionDetailModal
          session={sessions.find(s => s.id === selectedSession.id) || selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}
    </div>
  );
}
