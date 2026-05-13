import { useQuiz } from "../../../context/QuizContext";

export function QuizAlertBanner({ navigate, userId, enrolledCourseIds }: {
  navigate: (p: string) => void; userId: string; enrolledCourseIds: string[]
}) {
  const { getActiveSessionsForStudent } = useQuiz();
  const activeQuizzes = getActiveSessionsForStudent(enrolledCourseIds, userId);
  if (activeQuizzes.length === 0) return null;
  return (
    <div className="mb-6 bg-blue-600/10 border border-blue-500/30 rounded-2xl px-5 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0"/>
        <div>
          <p className="text-white font-semibold text-sm">
            {activeQuizzes.length === 1 ? "Active Quiz Available!" : `${activeQuizzes.length} Active Quizzes Available!`}
          </p>
          <p className="text-slate-400 text-xs mt-0.5">{activeQuizzes[0].title} — {activeQuizzes[0].courseName}</p>
        </div>
      </div>
      <button onClick={() => navigate("/quiz")}
        className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-all">
        Take Quiz →
      </button>
    </div>
  );
}
