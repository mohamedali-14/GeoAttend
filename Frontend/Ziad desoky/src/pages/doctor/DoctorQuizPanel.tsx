import { useState, useRef } from "react";
import {
  Play, Pause, Square, Plus, Trash2, Clock, Save, X,
  AlertTriangle, Users, BookOpen, CheckCircle, BarChart2,
  PlusCircle, ChevronDown, ChevronUp, Eye, FileUp, Loader,
  Download, Award, XCircle
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useQuiz, type QuizQuestion, type QuizSession } from "../../context/QuizContext";
import { useMockData } from "../../context/MockDataContext";

function formatTime(s: number) {
  return `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;
}

// ─── PDF Question Extractor (Anthropic API) ───────────────────────────────────
function PdfImportModal({ onImport, onClose }: {
  onImport: (questions: QuizQuestion[]) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<"idle"|"loading"|"done"|"error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [preview, setPreview] = useState<QuizQuestion[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { setErrorMsg("Please upload a PDF file."); setStatus("error"); return; }

    setStatus("loading");
    setErrorMsg("");

    try {
      // Convert PDF to base64
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res((reader.result as string).split(",")[1]);
        reader.onerror = () => rej(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: [
              {
                type: "document",
                source: { type: "base64", media_type: "application/pdf", data: base64 }
              },
              {
                type: "text",
                text: `Extract multiple choice questions from this PDF. Return ONLY a valid JSON array with NO extra text, NO markdown, NO backticks.
Format: [{"text":"question text","options":["A","B","C","D"],"correct":"correct option text","points":25}]
Rules:
- Extract all MCQ questions you find (up to 10)
- Each question needs exactly 4 options
- "correct" must be the exact text of the correct option
- If you can't find clear MCQs, generate 4 relevant MCQs from the content
- points should be 25 for each question
Return ONLY the JSON array.`
              }
            ]
          }]
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "API error");

      const text = data.content?.find((c: any) => c.type === "text")?.text || "";
      // Strip any accidental markdown
      const clean = text.replace(/```json|```/gi, "").trim();
      const parsed: any[] = JSON.parse(clean);

      const questions: QuizQuestion[] = parsed.map((q: any, i: number) => ({
        id: "PDF_Q_" + Date.now() + "_" + i,
        text: q.text || q.question || "",
        options: q.options || ["", "", "", ""],
        correct: q.correct || q.answer || "",
        points: q.points || 25,
      }));

      if (questions.length === 0) throw new Error("No questions found in PDF");
      setPreview(questions);
      setStatus("done");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to extract questions");
      setStatus("error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileUp className="w-5 h-5 text-blue-400"/>Import Questions from PDF
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">AI will extract MCQ questions automatically</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {status === "idle" && (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all group">
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:bg-blue-500/20 transition-all">
                <FileUp className="w-8 h-8 text-blue-400"/>
              </div>
              <div className="text-center">
                <p className="text-white font-semibold">Click to upload PDF</p>
                <p className="text-slate-400 text-sm mt-1">The AI will extract MCQ questions from your lecture PDF</p>
              </div>
              <input ref={fileRef} type="file" accept="application/pdf" onChange={handleFile} className="hidden"/>
            </div>
          )}

          {status === "loading" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader className="w-10 h-10 text-blue-400 animate-spin"/>
              <p className="text-white font-semibold">Analyzing PDF...</p>
              <p className="text-slate-400 text-sm">AI is extracting questions from your document</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 text-center w-full">
                <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2"/>
                <p className="text-red-300 font-semibold">Failed to extract questions</p>
                <p className="text-red-400/70 text-sm mt-1">{errorMsg}</p>
              </div>
              <button onClick={() => { setStatus("idle"); setErrorMsg(""); if(fileRef.current) fileRef.current.value=""; }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-all">
                Try Again
              </button>
            </div>
          )}

          {status === "done" && preview.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[#00D084] font-semibold flex items-center gap-2">
                  <CheckCircle className="w-4 h-4"/>{preview.length} question{preview.length !== 1 ? "s" : ""} extracted
                </p>
              </div>
              {preview.map((q, i) => (
                <div key={q.id} className="bg-[#0B1120] border border-slate-800 rounded-xl p-4">
                  <p className="text-white text-sm font-medium mb-3">Q{i+1}. {q.text}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => (
                      <div key={oi} className={`text-xs px-3 py-2 rounded-lg border ${
                        opt === q.correct
                          ? "bg-[#00D084]/10 border-[#00D084]/30 text-[#00D084] font-semibold"
                          : "bg-slate-800/50 border-slate-700 text-slate-400"
                      }`}>
                        {opt === q.correct && "✓ "}{opt}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">{q.points} pts</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {status === "done" && preview.length > 0 && (
          <div className="p-6 border-t border-slate-800 flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-lg font-medium">Cancel</button>
            <button onClick={() => { onImport(preview); onClose(); }}
              className="flex-1 py-2.5 bg-[#00D084] hover:bg-[#00b372] text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4"/>Use These Questions
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Create Quiz Modal ────────────────────────────────────────────────────────
function CreateQuizModal({ onClose, doctorId, doctorName, courses }: {
  onClose: () => void;
  doctorId: string;
  doctorName: string;
  courses: { id: string; name: string; code: string }[];
}) {
  const { createSession } = useQuiz();
  const [step, setStep] = useState<"info"|"questions">("info");
  const [showPdfImport, setShowPdfImport] = useState(false);
  const [info, setInfo] = useState({
    courseId: courses[0]?.id || "",
    title: "",
    durationMinutes: "10",
    canRetake: false,
    maxRetakes: "1",
  });
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    { id: "Q_" + Date.now(), text: "", options: ["","","",""], correct: "", points: 25 },
  ]);

  const selectedCourse = courses.find(c => c.id === info.courseId);

  const addQuestion = () => setQuestions(prev => [...prev, {
    id: "Q_" + Date.now() + Math.random(), text: "", options: ["","","",""], correct: "", points: 25,
  }]);

  const removeQuestion = (id: string) => {
    if (questions.length <= 1) return;
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const updateQuestion = (id: string, field: keyof QuizQuestion, value: any) =>
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));

  const updateOption = (qId: string, idx: number, value: string) =>
    setQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const opts = [...q.options]; opts[idx] = value; return { ...q, options: opts };
    }));

  const handleSave = () => {
    const valid = questions.every(q => q.text && q.correct && q.options.every(o => o));
    if (!valid) { alert("Please fill all question fields and mark correct answers."); return; }
    createSession({
      courseId: info.courseId,
      courseName: selectedCourse?.name || "",
      doctorId, doctorName,
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
    <>
      {showPdfImport && (
        <PdfImportModal
          onClose={() => setShowPdfImport(false)}
          onImport={(qs) => { setQuestions(qs); setStep("questions"); }}
        />
      )}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-white">Create New Quiz</h2>
              <div className="flex gap-3 mt-2">
                {["info","questions"].map(s => (
                  <button key={s} onClick={() => setStep(s as any)}
                    className={`text-xs font-semibold px-3 py-1 rounded-full transition-all ${
                      step === s ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
                    }`}>
                    {s === "info" ? "1. Info" : "2. Questions"}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {step === "info" ? (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Course</label>
                  <select value={info.courseId} onChange={e => setInfo({...info, courseId: e.target.value})}
                    className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-blue-500">
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quiz Title</label>
                  <input value={info.title} onChange={e => setInfo({...info, title: e.target.value})}
                    placeholder="e.g. Midterm Quiz - Chapter 3"
                    className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-blue-500"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Duration (minutes)</label>
                  <div className="flex gap-2 flex-wrap">
                    {["5","10","15","20","30","45","60"].map(d => (
                      <button key={d} onClick={() => setInfo({...info, durationMinutes: d})}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          info.durationMinutes === d ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        }`}>{d}m</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg">
                  <input type="checkbox" id="canRetake" checked={info.canRetake} onChange={e => setInfo({...info, canRetake: e.target.checked})} className="w-4 h-4 accent-blue-500"/>
                  <label htmlFor="canRetake" className="text-white text-sm font-medium cursor-pointer">Allow Retakes</label>
                  {info.canRetake && (
                    <select value={info.maxRetakes} onChange={e => setInfo({...info, maxRetakes: e.target.value})}
                      className="ml-auto bg-[#1E293B] border border-slate-700 text-white px-3 py-1.5 rounded-lg text-sm">
                      {["1","2","3"].map(n => <option key={n} value={n}>{n} retake{n!=="1"?"s":""}</option>)}
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
                {/* PDF Import button */}
                <button onClick={() => setShowPdfImport(true)}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-xl transition-all font-semibold">
                  <FileUp className="w-4 h-4"/>Import Questions from PDF (AI)
                </button>

                {questions.map((q, qi) => (
                  <div key={q.id} className="bg-[#0B1120] border border-slate-800 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Question {qi+1}</span>
                      <div className="flex items-center gap-2">
                        <select value={q.points} onChange={e => updateQuestion(q.id, "points", parseInt(e.target.value))}
                          className="bg-slate-800 border border-slate-700 text-slate-300 px-2 py-1 rounded text-xs">
                          {[10,25,33,50,100].map(p => <option key={p} value={p}>{p} pts</option>)}
                        </select>
                        <button onClick={() => removeQuestion(q.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    </div>
                    <textarea value={q.text} onChange={e => updateQuestion(q.id, "text", e.target.value)}
                      placeholder="Enter your question..."
                      className="w-full bg-[#1E293B] border border-slate-700 text-white p-3 rounded-lg resize-none text-sm focus:outline-none focus:border-blue-500 mb-3"
                      rows={2}/>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className="relative">
                          <input value={opt} onChange={e => updateOption(q.id, oi, e.target.value)}
                            placeholder={`Option ${oi+1}`}
                            className={`w-full bg-[#1E293B] border text-white p-2.5 pr-8 rounded-lg text-sm focus:outline-none transition-all ${
                              q.correct === opt && opt ? "border-[#00D084] bg-[#00D084]/5" : "border-slate-700 focus:border-blue-500"
                            }`}/>
                          {opt && (
                            <button onClick={() => updateQuestion(q.id, "correct", opt)}
                              className={`absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 transition-all ${
                                q.correct === opt ? "border-[#00D084] bg-[#00D084]" : "border-slate-500"
                              }`}/>
                          )}
                        </div>
                      ))}
                    </div>
                    {q.correct && <p className="text-xs text-[#00D084]">✓ Correct: {q.correct}</p>}
                  </div>
                ))}

                <button onClick={addQuestion}
                  className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-700 hover:border-blue-500 text-slate-400 hover:text-blue-400 rounded-xl transition-all">
                  <Plus className="w-4 h-4"/>Add Question Manually
                </button>
              </div>
            )}
          </div>

          {step === "questions" && (
            <div className="p-6 border-t border-slate-800">
              <button onClick={handleSave}
                className="w-full py-3 bg-[#00D084] hover:bg-[#00b372] text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,208,132,0.3)]">
                <Save className="w-5 h-5"/>Save Quiz ({questions.length} question{questions.length!==1?"s":""})
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Quiz Results Modal (shows student answers after quiz ends) ───────────────
function QuizResultsModal({ session, onClose }: { session: QuizSession; onClose: () => void }) {
  const { getSessionSubmissions } = useQuiz();
  const { users } = useMockData();
  const submissions = getSessionSubmissions(session.id);
  const [selected, setSelected] = useState<string | null>(null);

  const avg = submissions.length > 0
    ? Math.round(submissions.reduce((a, b) => a + b.score, 0) / submissions.length)
    : 0;
  const passCount = submissions.filter(s => s.score >= 60).length;

  const getUserName = (id: string) => {
    const u = users.find(u => u.id === id);
    return u ? `${u.firstName} ${u.lastName}` : `Student #${id}`;
  };

  const exportCSV = () => {
    const rows = [["Student", "Score", "Correct", "Time (s)", ...session.questions.map(q => `Q${session.questions.indexOf(q)+1}`)]];
    submissions.forEach(sub => {
      const correct = session.questions.filter(q => sub.answers?.[q.id] === q.correct).length;
      rows.push([
        getUserName(sub.studentId),
        sub.score + "%",
        `${correct}/${session.questions.length}`,
        String(sub.timeTaken),
        ...session.questions.map(q => sub.answers?.[q.id] === q.correct ? "✓" : "✗")
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], {type:"text/csv"}));
    a.download = `quiz_results_${session.title.replace(/\s+/g,"_")}.csv`;
    a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-400"/>Quiz Results
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">{session.title} — {session.courseName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00D084]/10 hover:bg-[#00D084]/20 border border-[#00D084]/30 text-[#00D084] text-xs font-semibold rounded-lg transition-all">
              <Download className="w-3.5 h-3.5"/>CSV
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex gap-4 px-6 py-4 border-b border-slate-800">
          {[
            { label:"Submitted",    value: submissions.length,              color:"text-white",       bg:"bg-slate-800/50 border-slate-700"        },
            { label:"Avg Score",    value: `${avg}%`,                       color: avg>=75?"text-[#00D084]":avg>=60?"text-yellow-400":"text-red-400",
              bg: avg>=75?"bg-[#00D084]/10 border-[#00D084]/20":"bg-yellow-500/10 border-yellow-500/20" },
            { label:"Passed (≥60%)",value: passCount,                       color:"text-[#00D084]",   bg:"bg-[#00D084]/10 border-[#00D084]/20"      },
            { label:"Failed",       value: submissions.length - passCount,  color:"text-red-400",     bg:"bg-red-500/10 border-red-500/20"          },
          ].map(s => (
            <div key={s.label} className={`flex-1 text-center rounded-xl border py-3 ${s.bg}`}>
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {submissions.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30"/>
              <p className="font-medium">No submissions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {[...submissions]
                .sort((a, b) => b.score - a.score)
                .map((sub, rank) => {
                  const isExpanded = selected === sub.id;
                  const scoreColor = sub.score>=80?"text-[#00D084]":sub.score>=60?"text-yellow-400":"text-red-400";
                  const correctCount = session.questions.filter(q => sub.answers?.[q.id] === q.correct).length;

                  return (
                    <div key={sub.id}>
                      {/* Row */}
                      <button
                        onClick={() => setSelected(isExpanded ? null : sub.id)}
                        className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-800/30 transition-colors text-left">
                        {/* Rank */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          rank === 0 ? "bg-yellow-400/20 text-yellow-300" :
                          rank === 1 ? "bg-slate-400/20 text-slate-300" :
                          rank === 2 ? "bg-orange-400/20 text-orange-300" :
                          "bg-slate-800 text-slate-500"
                        }`}>{rank+1}</div>
                        {/* Avatar */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          sub.score>=75?"bg-[#00D084]/20 text-[#00D084]":sub.score>=60?"bg-yellow-500/20 text-yellow-400":"bg-red-500/20 text-red-400"
                        }`}>
                          {getUserName(sub.studentId).split(" ").map(n=>n[0]).join("").slice(0,2)}
                        </div>
                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-semibold truncate">{getUserName(sub.studentId)}</p>
                          <p className="text-slate-500 text-xs">{correctCount}/{session.questions.length} correct · {Math.floor(sub.timeTaken/60)}m {sub.timeTaken%60}s</p>
                        </div>
                        {/* Score */}
                        <div className={`text-xl font-bold mr-2 ${scoreColor}`}>{sub.score}%</div>
                        {/* Mini per-question icons */}
                        <div className="hidden sm:flex items-center gap-0.5 flex-shrink-0">
                          {session.questions.map(q => (
                            <div key={q.id} className={`w-4 h-4 rounded-sm ${sub.answers?.[q.id]===q.correct?"bg-[#00D084]":"bg-red-400/60"}`}
                              title={sub.answers?.[q.id]===q.correct?"Correct":"Wrong"}/>
                          ))}
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500 flex-shrink-0"/> : <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0"/>}
                      </button>

                      {/* Expanded answer details */}
                      {isExpanded && (
                        <div className="px-6 pb-5 bg-[#0B1120]/40">
                          <div className="flex flex-col gap-2 pt-1">
                            {session.questions.map((q, qi) => {
                              const ans = sub.answers?.[q.id];
                              const correct = ans === q.correct;
                              return (
                                <div key={q.id} className={`rounded-xl p-3 border ${correct?"bg-[#00D084]/5 border-[#00D084]/20":"bg-red-500/5 border-red-500/20"}`}>
                                  <div className="flex items-start gap-2">
                                    <span className={`flex-shrink-0 mt-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${correct?"bg-[#00D084] text-gray-900":"bg-red-500 text-white"}`}>
                                      {correct ? "✓" : "✗"}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-slate-300 text-sm leading-snug">Q{qi+1}. {q.text}</p>
                                      <div className="flex flex-wrap gap-2 mt-2 text-xs">
                                        <span className={`px-2 py-1 rounded-lg border font-medium ${correct?"bg-[#00D084]/10 border-[#00D084]/20 text-[#00D084]":"bg-red-500/10 border-red-500/20 text-red-400"}`}>
                                          Answer: {ans || "(no answer)"}
                                        </span>
                                        {!correct && (
                                          <span className="px-2 py-1 rounded-lg border bg-[#00D084]/10 border-[#00D084]/20 text-[#00D084]">
                                            Correct: {q.correct}
                                          </span>
                                        )}
                                        <span className="text-slate-500">{q.points}pts</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
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
      <div className={`px-5 py-3 flex items-center justify-between ${
        session.status === "ACTIVE"  ? "bg-[#00D084]/10 border-b border-[#00D084]/20" :
        session.status === "PAUSED"  ? "bg-yellow-500/10 border-b border-yellow-500/20" :
        session.status === "ENDED"   ? "bg-red-500/10 border-b border-red-500/20" :
        "bg-blue-500/10 border-b border-blue-500/20"
      }`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            session.status==="ACTIVE"?"bg-[#00D084] animate-pulse":session.status==="PAUSED"?"bg-yellow-400":session.status==="ENDED"?"bg-red-400":"bg-blue-400"
          }`}/>
          <span className={`text-sm font-bold ${
            session.status==="ACTIVE"?"text-[#00D084]":session.status==="PAUSED"?"text-yellow-400":session.status==="ENDED"?"text-red-400":"text-blue-400"
          }`}>{session.status}</span>
        </div>
        <span className="text-slate-400 text-sm">{submissions.length} submitted</span>
      </div>

      <div className="p-5">
        <h3 className="font-bold text-white mb-1 truncate">{session.title}</h3>
        <p className="text-slate-400 text-sm mb-4">{session.courseName} · {session.questions.length} questions</p>

        {session.status !== "PENDING" && session.status !== "ENDED" && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm">Time Remaining</span>
              <span className="font-mono font-bold text-white text-lg">{formatTime(session.timeLeftSeconds)}</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{width:`${pct}%`}}/>
            </div>
          </div>
        )}

        {(session.status === "ACTIVE" || session.status === "PAUSED") && (
          <div className="flex gap-2 mb-4 flex-wrap">
            <span className="text-xs text-slate-500 self-center">Time:</span>
            {[60,120,300].map(s => (
              <button key={`+${s}`} onClick={() => addTimeToSession(session.id, s)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-[#00D084]/10 text-[#00D084] border border-[#00D084]/20 rounded-lg text-xs font-bold hover:bg-[#00D084]/20 transition-all">
                +{s/60}m
              </button>
            ))}
            {[60,120].map(s => (
              <button key={`-${s}`} onClick={() => removeTimeFromSession(session.id, s)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-500/20 transition-all">
                -{s/60}m
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {session.status === "PENDING" && (
            <button onClick={() => startSession(session.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#00D084] hover:bg-[#00b372] text-white font-bold rounded-lg transition-all">
              <Play className="w-4 h-4"/>Start Quiz
            </button>
          )}
          {session.status === "ACTIVE" && (<>
            <button onClick={() => pauseSession(session.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 font-semibold rounded-lg hover:bg-yellow-500/30 transition-all">
              <Pause className="w-4 h-4"/>Pause
            </button>
            <button onClick={() => setShowEndConfirm(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 font-semibold rounded-lg hover:bg-red-500/30 transition-all">
              <Square className="w-4 h-4"/>End
            </button>
          </>)}
          {session.status === "PAUSED" && (<>
            <button onClick={() => resumeSession(session.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold rounded-lg hover:bg-blue-600/30 transition-all">
              <Play className="w-4 h-4"/>Resume
            </button>
            <button onClick={() => setShowEndConfirm(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 font-semibold rounded-lg hover:bg-red-500/30 transition-all">
              <Square className="w-4 h-4"/>End
            </button>
          </>)}
          {session.status === "ENDED" && (
            <div className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-800 text-slate-500 font-semibold rounded-lg">
              <CheckCircle className="w-4 h-4"/>Quiz Ended
            </div>
          )}
        </div>
      </div>

      {submissions.length > 0 && (
        <div className="border-t border-slate-800 px-5 py-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Latest Submissions</p>
          <div className="flex flex-col gap-1">
            {submissions.slice(-3).reverse().map(sub => (
              <div key={sub.id} className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Student #{sub.studentId.slice(-4)}</span>
                <span className={`font-bold ${sub.score>=75?"text-[#00D084]":sub.score>=60?"text-yellow-400":"text-red-400"}`}>{sub.score}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-sm w-full p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3"/>
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

// ─── Main Doctor Quiz Panel ───────────────────────────────────────────────────
export default function DoctorQuizPanel() {
  const { user } = useAuth();
  const { sessions, deleteSession, getSessionSubmissions } = useQuiz();
  const { courses } = useMockData();
  const [showCreate, setShowCreate] = useState(false);
  const [resultsSession, setResultsSession] = useState<QuizSession | null>(null);

  const myCourses = courses.filter(c => c.doctorId === user?.id);
  const mySessions = sessions.filter(s => s.doctorId === user?.id);

  const activeSessions  = mySessions.filter(s => s.status === "ACTIVE" || s.status === "PAUSED");
  const pendingSessions = mySessions.filter(s => s.status === "PENDING");
  const endedSessions   = mySessions.filter(s => s.status === "ENDED");

  return (
    <div className="flex flex-col gap-6">
      {resultsSession && <QuizResultsModal session={resultsSession} onClose={() => setResultsSession(null)}/>}

      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Quiz Management</h2>
          <p className="text-slate-400 text-sm mt-0.5">{mySessions.length} total quizzes</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all">
          <PlusCircle className="w-4 h-4"/>New Quiz
        </button>
      </div>

      {/* Active / Paused */}
      {activeSessions.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#00D084] rounded-full animate-pulse"/>Live Now
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {activeSessions.map(s => <LiveControlPanel key={s.id} session={s}/>)}
          </div>
        </div>
      )}

      {/* Pending */}
      {pendingSessions.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Scheduled</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {pendingSessions.map(s => <LiveControlPanel key={s.id} session={s}/>)}
          </div>
        </div>
      )}

      {/* Ended — with full results button */}
      {endedSessions.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-slate-500"/>Completed
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {endedSessions.map(s => {
              const subs = getSessionSubmissions(s.id);
              const avg  = subs.length > 0 ? Math.round(subs.reduce((a,b)=>a+b.score,0)/subs.length) : null;
              const passCount = subs.filter(sub => sub.score >= 60).length;

              // Per-question accuracy mini bar
              const qAccuracy = s.questions.map(q => ({
                id: q.id,
                pct: subs.length > 0
                  ? Math.round((subs.filter(sub => sub.answers?.[q.id] === q.correct).length / subs.length) * 100)
                  : 0
              }));

              return (
                <div key={s.id} className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">{s.title}</p>
                        <p className="text-slate-400 text-sm">{s.courseName}</p>
                      </div>
                      <button onClick={() => deleteSession(s.id)} className="text-slate-600 hover:text-red-400 transition-colors ml-2 flex-shrink-0">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>

                    {/* Stats row */}
                    <div className="flex gap-3 mb-4">
                      <div className="flex-1 bg-slate-800/50 rounded-lg py-2 text-center">
                        <p className="text-white font-bold">{subs.length}</p>
                        <p className="text-slate-500 text-xs">Submitted</p>
                      </div>
                      {avg !== null && (
                        <div className={`flex-1 rounded-lg py-2 text-center border ${avg>=75?"bg-[#00D084]/10 border-[#00D084]/20":avg>=60?"bg-yellow-500/10 border-yellow-500/20":"bg-red-500/10 border-red-500/20"}`}>
                          <p className={`font-bold ${avg>=75?"text-[#00D084]":avg>=60?"text-yellow-400":"text-red-400"}`}>{avg}%</p>
                          <p className="text-slate-500 text-xs">Avg</p>
                        </div>
                      )}
                      {subs.length > 0 && (
                        <div className="flex-1 bg-[#00D084]/10 border border-[#00D084]/20 rounded-lg py-2 text-center">
                          <p className="text-[#00D084] font-bold">{passCount}</p>
                          <p className="text-slate-500 text-xs">Passed</p>
                        </div>
                      )}
                    </div>

                    {/* Per-question accuracy mini chart */}
                    {subs.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-slate-500 mb-2">Question accuracy</p>
                        <div className="flex items-end gap-1 h-8">
                          {qAccuracy.map((q, i) => (
                            <div key={q.id} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                                Q{i+1}: {q.pct}%
                              </div>
                              <div className={`w-full rounded-t-sm ${q.pct>=75?"bg-[#00D084]":q.pct>=50?"bg-yellow-400":"bg-red-400"}`}
                                style={{height:`${Math.max(4,Math.round(q.pct*28/100))}px`}}/>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-1 mt-1">
                          {qAccuracy.map((_,i) => <div key={i} className="flex-1 text-center text-[9px] text-slate-600">Q{i+1}</div>)}
                        </div>
                      </div>
                    )}

                    {/* View Results button */}
                    <button onClick={() => setResultsSession(s)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 font-semibold rounded-lg transition-all text-sm">
                      <Eye className="w-4 h-4"/>View Full Results
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mySessions.length === 0 && (
        <div className="text-center py-16 bg-[#111827] border border-slate-800 rounded-2xl">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3"/>
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
