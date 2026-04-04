import AdminLayout from "./AdminLayout";
import AdminQuizPanel from "./AdminQuizPanel";

export default function AdminQuizzesPage() {
  return (
    <AdminLayout>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <div className="mb-8 pb-6 border-b border-slate-800">
          <h1 className="text-3xl font-serif font-bold text-white mb-1">Quiz Management</h1>
          <p className="text-slate-400 text-sm">Monitor and control all quizzes across the system.</p>
        </div>
        <AdminQuizPanel />
      </div>
    </AdminLayout>
  );
}
