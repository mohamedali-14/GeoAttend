// ── Quiz Results Page (Tasks 1-7 from Image 1) ────────────────────────────────
// Results Page + Answer Review + Score Animation + Class Statistics + Export + Retake

import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, XCircle, Trophy, BarChart2, Download, RefreshCw, ArrowLeft, Star, Target, Users } from "lucide-react";

export interface QuizResult {
  questions: { id: number; text: string; options: string[]; correct: string }[];
  answers: Record<number, string>;
  timeTaken: number; // seconds
  totalTime: number;
  canRetake?: boolean;
  retakesLeft?: number;
}

// ── Score Animation Hook (Task 3) ────────────────────────────────────────────
function useAnimatedScore(target: number, duration = 1500) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCurrent(target); clearInterval(timer); }
      else setCurrent(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return current;
}

// ── PDF Export (Task 5) ───────────────────────────────────────────────────────
function exportToPDF(result: QuizResult, score: number, pct: number) {
  const correct = result.questions.filter(q => result.answers[q.id] === q.correct).length;
  const content = `
GeoAttend - Quiz Results
========================
Score: ${score} / ${result.questions.length} (${pct}%)
Time Taken: ${Math.floor(result.timeTaken / 60)}m ${result.timeTaken % 60}s
Correct Answers: ${correct}
Incorrect: ${result.questions.length - correct}

Answer Review:
${result.questions.map((q, i) => {
  const userAns = result.answers[q.id] || "Not answered";
  const isCorrect = userAns === q.correct;
  return `
Q${i + 1}: ${q.text}
Your Answer: ${userAns} ${isCorrect ? "✓" : "✗"}
${!isCorrect ? `Correct Answer: ${q.correct}` : ""}`;
}).join("\n")}
  `.trim();

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "quiz-results.txt";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Class Statistics Mock (Task 4) ───────────────────────────────────────────
const CLASS_STATS = {
  average: 72,
  highest: 95,
  lowest: 40,
  distribution: [
    { range: "90-100%", count: 3, color: "bg-[#00D084]" },
    { range: "75-89%",  count: 8, color: "bg-blue-400" },
    { range: "60-74%",  count: 5, color: "bg-yellow-400" },
    { range: "Below 60%", count: 4, color: "bg-red-400" },
  ],
  totalStudents: 20,
};

export default function QuizResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"overview" | "review" | "stats">("overview");

  // استلام النتيجة من QuizPage عبر state
  const result: QuizResult = (location.state as any)?.result || {
    questions: [
      { id: 1, text: "What is the primary function of the Virtual DOM?", options: ["Directly updating DOM", "Improving performance", "Handling API requests", "Managing state"], correct: "Improving performance" },
      { id: 2, text: "Which hook handles side effects?", options: ["useState", "useContext", "useEffect", "useMemo"], correct: "useEffect" },
      { id: 3, text: "What does CSS stand for?", options: ["Cascading Style Sheets", "Computer Style Sheets", "Creative Style System", "Colorful Style Sheets"], correct: "Cascading Style Sheets" },
      { id: 4, text: "JSON.parse() converts?", options: ["Object to JSON", "JSON to Object", "String to Array", "Array to String"], correct: "JSON to Object" },
    ],
    answers: { 1: "Improving performance", 2: "useEffect", 3: "Cascading Style Sheets", 4: "Object to JSON" },
    timeTaken: 85,
    totalTime: 120,
    canRetake: true,
    retakesLeft: 1,
  };

  const correct = result.questions.filter(q => result.answers[q.id] === q.correct).length;
  const total   = result.questions.length;
  const pct     = Math.round((correct / total) * 100);

  // Animated score
  const animatedScore = useAnimatedScore(pct);
  const animatedCorrect = useAnimatedScore(correct);

  const grade = pct >= 90 ? { label: "Excellent", color: "text-[#00D084]", icon: "🏆" }
              : pct >= 75 ? { label: "Good",       color: "text-blue-400",  icon: "⭐" }
              : pct >= 60 ? { label: "Pass",        color: "text-yellow-400",icon: "✓"  }
              :             { label: "Fail",         color: "text-red-400",   icon: "✗"  };

  const scoreColor = pct >= 75 ? "text-[#00D084]" : pct >= 60 ? "text-yellow-400" : "text-red-400";
  const ringColor  = pct >= 75 ? "#00D084"         : pct >= 60 ? "#eab308"         : "#ef4444";

  // ── Retake Logic (Task 6) ────────────────────────────────────────────────────
  const handleRetake = () => {
    if (!result.canRetake || (result.retakesLeft !== undefined && result.retakesLeft <= 0)) return;
    navigate("/quiz");
  };

  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="min-h-screen bg-[#0B1120] text-white font-sans" dir="ltr">
      {/* Header */}
      <header className="h-16 bg-[#111827] border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-10">
        <button onClick={() => navigate("/student")} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />Back to Dashboard
        </button>
        <h1 className="text-lg font-bold">Quiz Results</h1>
        <button onClick={() => exportToPDF(result, correct, pct)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors border border-slate-700">
          <Download className="w-4 h-4" />Export PDF
        </button>
      </header>

      <div className="max-w-4xl mx-auto p-6 md:p-10">
        {/* ── Score Card (Tasks 1 & 3) ────────────────────────────────────────── */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-8 mb-8 flex flex-col md:flex-row items-center gap-8">
          {/* Animated Ring */}
          <div className="relative flex-shrink-0">
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle cx="70" cy="70" r="54" fill="none" stroke="#1e293b" strokeWidth="12" />
              <circle cx="70" cy="70" r="54" fill="none" stroke={ringColor} strokeWidth="12"
                strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset}
                transform="rotate(-90 70 70)" style={{ transition: "stroke-dashoffset 0.05s linear" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${scoreColor}`}>{animatedScore}%</span>
              <span className="text-slate-400 text-xs mt-1">Score</span>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
              <span className="text-3xl">{grade.icon}</span>
              <h2 className={`text-3xl font-bold ${grade.color}`}>{grade.label}!</h2>
            </div>
            <p className="text-slate-400 mb-6">You answered {animatedCorrect} out of {total} questions correctly.</p>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Correct",   value: correct,                      color: "text-[#00D084]", icon: <CheckCircle className="w-4 h-4" /> },
                { label: "Incorrect", value: total - correct,               color: "text-red-400",   icon: <XCircle className="w-4 h-4" /> },
                { label: "Time",      value: `${Math.floor(result.timeTaken/60)}m ${result.timeTaken%60}s`, color: "text-blue-400", icon: <Target className="w-4 h-4" /> },
              ].map(s => (
                <div key={s.label} className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <div className={`flex items-center justify-center gap-1 mb-1 ${s.color}`}>{s.icon}</div>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-slate-500 text-xs">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: "overview", label: "Overview",       icon: <Trophy className="w-4 h-4" /> },
            { key: "review",   label: "Answer Review",  icon: <CheckCircle className="w-4 h-4" /> },
            { key: "stats",    label: "Class Stats",    icon: <BarChart2 className="w-4 h-4" /> },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === t.key ? "bg-blue-600/20 text-blue-400 border border-blue-500/30" : "bg-[#111827] border border-slate-800 text-slate-400 hover:text-white"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ─────────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Star className="w-5 h-5 text-yellow-400" />Performance Summary</h3>
            <div className="space-y-4">
              {[
                { label: "Score",        value: pct,                                      max: 100, color: scoreColor, barColor: pct >= 75 ? "bg-[#00D084]" : pct >= 60 ? "bg-yellow-400" : "bg-red-400" },
                { label: "Completion",   value: Math.round((Object.keys(result.answers).length / total) * 100), max: 100, color: "text-blue-400",   barColor: "bg-blue-400" },
                { label: "Time Used",    value: Math.round((result.timeTaken / result.totalTime) * 100),        max: 100, color: "text-purple-400", barColor: "bg-purple-400" },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-400">{s.label}</span>
                    <span className={`font-semibold ${s.color}`}>{s.value}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.barColor} transition-all duration-1000`} style={{ width: `${s.value}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Retake Section (Task 6) */}
            <div className="mt-6 pt-6 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">Retake Quiz</p>
                  <p className="text-slate-400 text-sm">
                    {result.canRetake && result.retakesLeft && result.retakesLeft > 0
                      ? `You have ${result.retakesLeft} retake${result.retakesLeft > 1 ? "s" : ""} remaining.`
                      : "No retakes available."}
                  </p>
                </div>
                <button onClick={handleRetake}
                  disabled={!result.canRetake || (result.retakesLeft !== undefined && result.retakesLeft <= 0)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed">
                  <RefreshCw className="w-4 h-4" />Retake
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Answer Review Tab (Task 2) ─────────────────────────────────────── */}
        {activeTab === "review" && (
          <div className="flex flex-col gap-4">
            {result.questions.map((q, i) => {
              const userAns   = result.answers[q.id];
              const isCorrect = userAns === q.correct;
              return (
                <div key={q.id} className={`bg-[#111827] border rounded-xl p-5 ${isCorrect ? "border-[#00D084]/30" : "border-red-500/30"}`}>
                  <div className="flex items-start gap-3 mb-4">
                    {isCorrect
                      ? <CheckCircle className="w-5 h-5 text-[#00D084] flex-shrink-0 mt-0.5" />
                      : <XCircle    className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
                    <div>
                      <p className="text-slate-400 text-xs mb-1">Question {i + 1}</p>
                      <p className="text-white font-medium">{q.text}</p>
                    </div>
                  </div>
                  <div className="space-y-2 ml-8">
                    {q.options.map(opt => {
                      const isUser    = opt === userAns;
                      const isCorrectOpt = opt === q.correct;
                      return (
                        <div key={opt} className={`px-4 py-2.5 rounded-lg text-sm flex items-center gap-2 border ${
                          isCorrectOpt ? "bg-[#00D084]/10 border-[#00D084]/30 text-[#00D084]" :
                          isUser && !isCorrect ? "bg-red-500/10 border-red-500/30 text-red-400" :
                          "bg-slate-800/50 border-slate-700 text-slate-400"
                        }`}>
                          {isCorrectOpt ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> :
                           isUser && !isCorrect ? <XCircle className="w-4 h-4 flex-shrink-0" /> :
                           <div className="w-4 h-4 rounded-full border border-slate-600 flex-shrink-0" />}
                          {opt}
                          {isUser && <span className="ml-auto text-xs font-semibold">{isCorrect ? "Your answer ✓" : "Your answer"}</span>}
                          {isCorrectOpt && !isUser && <span className="ml-auto text-xs font-semibold">Correct answer</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Class Statistics Tab (Task 4) ──────────────────────────────────── */}
        {activeTab === "stats" && (
          <div className="flex flex-col gap-6">
            {/* Comparison */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-blue-400" />Class Comparison</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Your Score",     value: `${pct}%`,                     color: scoreColor },
                  { label: "Class Average",  value: `${CLASS_STATS.average}%`,      color: "text-blue-400" },
                  { label: "Highest Score",  value: `${CLASS_STATS.highest}%`,      color: "text-[#00D084]" },
                  { label: "Total Students", value: CLASS_STATS.totalStudents,      color: "text-purple-400" },
                ].map(s => (
                  <div key={s.label} className="bg-slate-800/50 rounded-xl p-4 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-slate-400 text-xs mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* vs Average bar */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-400">Your Score vs Average</span>
                    <span className={pct >= CLASS_STATS.average ? "text-[#00D084] font-semibold" : "text-red-400 font-semibold"}>
                      {pct >= CLASS_STATS.average ? `+${pct - CLASS_STATS.average}%` : `${pct - CLASS_STATS.average}%`} vs avg
                    </span>
                  </div>
                  <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden">
                    <div className="absolute h-full bg-slate-600/50 rounded-full" style={{ width: `${CLASS_STATS.average}%` }} />
                    <div className={`absolute h-full rounded-full ${pct >= 75 ? "bg-[#00D084]" : pct >= 60 ? "bg-yellow-400" : "bg-red-400"}`} style={{ width: `${pct}%`, opacity: 0.8 }} />
                    <div className="absolute top-0 h-full w-0.5 bg-white/50" style={{ left: `${CLASS_STATS.average}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>0%</span>
                    <span style={{ marginLeft: `${CLASS_STATS.average - 5}%` }}>Avg</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Distribution */}
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-purple-400" />Score Distribution</h3>
              <div className="space-y-4">
                {CLASS_STATS.distribution.map(d => {
                  const barW = Math.round((d.count / CLASS_STATS.totalStudents) * 100);
                  return (
                    <div key={d.range} className="flex items-center gap-4">
                      <span className="text-slate-400 text-sm w-24 flex-shrink-0">{d.range}</span>
                      <div className="flex-1 bg-slate-800 rounded-full h-6 overflow-hidden flex items-center">
                        <div className={`h-full ${d.color} rounded-full flex items-center justify-end pr-2 transition-all duration-1000`} style={{ width: `${barW}%` }}>
                          <span className="text-white text-xs font-bold">{d.count}</span>
                        </div>
                      </div>
                      <span className="text-slate-500 text-xs w-12 text-right">{barW}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
