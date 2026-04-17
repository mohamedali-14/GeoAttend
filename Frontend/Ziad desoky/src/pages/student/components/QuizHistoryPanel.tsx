import { useState } from "react";
import { FileQuestion, ChevronDown, ChevronUp } from "lucide-react";

export function QuizHistoryPanel({ submissions, sessions, userId }: {
  submissions: any[]; sessions: any[]; userId: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const mySubmissions = [...submissions]
    .filter(s => s.studentId === userId)
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

  if (mySubmissions.length === 0) return (
    <div className="text-center py-16 text-slate-500">
      <FileQuestion className="w-12 h-12 mx-auto mb-3 opacity-30"/>
      <p className="font-medium">No quiz submissions yet</p>
      <p className="text-sm mt-1">Your quiz history will appear here after you take a quiz</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {mySubmissions.map(sub => {
        const quiz = sessions.find((s: any) => s.id === sub.quizSessionId);
        const isExpanded = expandedId === sub.id;
        const scoreColor = sub.score >= 80 ? "text-[#00D084]" : sub.score >= 60 ? "text-yellow-400" : "text-red-400";
        const scoreBg    = sub.score >= 80 ? "bg-[#00D084]/10 border-[#00D084]/20" : sub.score >= 60 ? "bg-yellow-500/10 border-yellow-500/20" : "bg-red-500/10 border-red-500/20";
        const mins = Math.floor(sub.timeTaken / 60);
        const secs = sub.timeTaken % 60;
        const correctCount = quiz ? quiz.questions.filter((q: any) => sub.answers?.[q.id] === q.correct).length : 0;

        return (
          <div key={sub.id} className="bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className={`flex-shrink-0 w-16 h-16 rounded-xl border flex flex-col items-center justify-center ${scoreBg}`}>
                <span className={`text-xl font-bold ${scoreColor}`}>{sub.score}%</span>
                {quiz && <span className="text-[10px] text-slate-500">{correctCount}/{quiz.questions.length}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{quiz?.title || "Unknown Quiz"}</p>
                <p className="text-slate-400 text-sm">{quiz?.courseName || "—"}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span>{new Date(sub.submittedAt).toLocaleDateString("en-EG",{month:"short",day:"numeric",year:"numeric"})}</span>
                  <span>{mins}m {secs}s</span>
                  {sub.attemptNumber > 1 && <span>Attempt #{sub.attemptNumber}</span>}
                </div>
              </div>
              <button onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                className="flex-shrink-0 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all">
                {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
              </button>
            </div>

            {isExpanded && quiz && (
              <div className="border-t border-slate-800 px-5 py-4 bg-[#0B1120]/50">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Question Breakdown</p>
                <div className="flex flex-col gap-3">
                  {quiz.questions.map((q: any, qi: number) => {
                    const studentAnswer = sub.answers?.[q.id];
                    const isCorrect = studentAnswer === q.correct;
                    return (
                      <div key={q.id} className={`rounded-xl p-4 border ${isCorrect ? "bg-[#00D084]/5 border-[#00D084]/20" : "bg-red-500/5 border-red-500/20"}`}>
                        <div className="flex items-start gap-2 mb-3">
                          <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 ${isCorrect ? "bg-[#00D084] text-gray-900" : "bg-red-500 text-white"}`}>
                            {isCorrect ? "✓" : "✗"}
                          </span>
                          <p className="text-white text-sm font-medium leading-snug">Q{qi+1}. {q.text}</p>
                        </div>
                        <div className="ml-7 flex flex-col gap-1.5">
                          <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${isCorrect ? "bg-[#00D084]/10 text-[#00D084]" : "bg-red-500/10 text-red-400"}`}>
                            <span className="font-semibold">Your answer:</span>
                            <span>{studentAnswer || "(no answer)"}</span>
                          </div>
                          {!isCorrect && (
                            <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-[#00D084]/10 text-[#00D084]">
                              <span className="font-semibold">Correct:</span>
                              <span>{q.correct}</span>
                            </div>
                          )}
                          <span className="text-xs text-slate-500">{q.points} pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400 text-sm">{correctCount} / {quiz.questions.length} correct</span>
                  <span className={`text-xl font-bold ${scoreColor}`}>{sub.score}%</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
