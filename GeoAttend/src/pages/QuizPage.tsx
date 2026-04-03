import React, { useState, useEffect } from 'react';
import { Clock, ChevronRight, ChevronLeft, CheckCircle, AlertTriangle } from 'lucide-react';

// ─── بيانات وهمية للاختبار ───
const QUIZ_QUESTIONS = [
  { id: 1, text: "What is the primary function of the Virtual DOM in React?", options: ["Directly updating the browser's DOM", "Improving performance by minimizing direct DOM manipulation", "Handling API requests", "Managing global state"] },
  { id: 2, text: "Which hook is used to handle side effects in a functional component?", options: ["useState", "useContext", "useEffect", "useMemo"] },
  { id: 3, text: "What does CSS stand for?", options: ["Cascading Style Sheets", "Computer Style Sheets", "Creative Style System", "Colorful Style Sheets"] },
  { id: 4, text: "Which method is used to convert a JSON string into a JavaScript object?", options: ["JSON.stringify()", "JSON.parse()", "JSON.toObject()", "JSON.convert()"] },
];

const QUIZ_DURATION = 120; // الوقت بالثواني (دقيقتين للتجربة)

export default function QuizPage() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(QUIZ_DURATION);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const currentQuestion = QUIZ_QUESTIONS[currentQuestionIndex];
  const progressPercentage = ((currentQuestionIndex + 1) / QUIZ_QUESTIONS.length) * 100;

  // ─── Timer & Auto-submit Logic (التاسك 3 و 6) ───
  useEffect(() => {
    if (isSubmitted) return;

    if (timeLeft <= 0) {
      handleFinalSubmit(); // Auto-submit when time expires
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, isSubmitted]);

  // Format time (MM:SS)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSelectOption = (option: string) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option }));
  };

  // ─── Navigation Logic (التاسك 4) ───
  const handleNext = () => {
    if (currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  // ─── Submit Flow (التاسك 5) ───
  const handleFinalSubmit = () => {
    setShowConfirmModal(false);
    setIsSubmitted(true);
    // هنا تقدر تبعت الداتا (answers) للباك إند
  };

  // ─── Results View (بعد التسليم) ───
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-white flex items-center justify-center p-4">
        <div className="bg-[#111827] border border-slate-800 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
          <CheckCircle className="w-16 h-16 text-[#00D084] mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Quiz Submitted Successfully!</h2>
          <p className="text-slate-400 mb-6">Your answers have been recorded.</p>
          <div className="bg-[#1E293B] p-4 rounded-xl text-left">
            <p className="text-sm text-slate-300 mb-1">Questions Answered:</p>
            <p className="text-lg font-bold text-white">{Object.keys(answers).length} / {QUIZ_QUESTIONS.length}</p>
          </div>
          <button onClick={() => window.location.reload()} className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold transition-all">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── Quiz Layout (التاسكات 1 و 2) ───
  return (
    <div className="min-h-screen bg-[#0B1120] text-white flex flex-col font-sans" dir="ltr">
      
      {/* Navbar & Timer */}
      <header className="h-16 bg-[#111827] border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-slate-200">Midterm Examination</h1>
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border ${timeLeft < 30 ? 'bg-red-500/10 text-red-400 border-red-500/30 animate-pulse' : 'bg-slate-800 text-slate-300 border-slate-700'}`}>
          <Clock className="w-4 h-4" />
          <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
        </div>
      </header>

      {/* Progress Indicator */}
      <div className="w-full bg-slate-800 h-1.5">
        <div 
          className="bg-blue-500 h-full transition-all duration-300 ease-out" 
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center p-6 md:p-10 overflow-y-auto">
        <div className="w-full max-w-3xl">
          
          {/* Question Meta */}
          <div className="flex justify-between items-end mb-6">
            <p className="text-slate-400 text-sm font-semibold tracking-wider uppercase">
              Question {currentQuestionIndex + 1} of {QUIZ_QUESTIONS.length}
            </p>
          </div>

          {/* Question Card */}
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl mb-8">
            <h2 className="text-xl md:text-2xl font-medium text-white mb-8 leading-relaxed">
              {currentQuestion.text}
            </h2>
            
            <div className="flex flex-col gap-3">
              {currentQuestion.options.map((option, index) => {
                const isSelected = answers[currentQuestion.id] === option;
                return (
                  <button
                    key={index}
                    onClick={() => handleSelectOption(option)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      isSelected 
                        ? 'bg-blue-600/10 border-blue-500 text-white' 
                        : 'bg-[#1E293B] border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-blue-500' : 'border-slate-500'}`}>
                      {isSelected && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />}
                    </div>
                    <span className="text-sm md:text-base">{option}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between">
            <button 
              onClick={handlePrev} 
              disabled={currentQuestionIndex === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            {currentQuestionIndex === QUIZ_QUESTIONS.length - 1 ? (
              <button 
                onClick={() => setShowConfirmModal(true)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-white bg-[#00D084] hover:bg-[#00b372] transition-all shadow-[0_0_15px_rgba(0,208,132,0.3)]"
              >
                Submit Quiz <CheckCircle className="w-4 h-4" />
              </button>
            ) : (
              <button 
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-500 transition-all"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>
      </main>

      {/* ─── Submit Confirmation Modal ─── */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111827] border border-slate-700 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl animate-in zoom-in duration-200">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Ready to submit?</h3>
            
            {Object.keys(answers).length < QUIZ_QUESTIONS.length ? (
              <p className="text-red-400 text-sm mb-6">
                You have only answered {Object.keys(answers).length} out of {QUIZ_QUESTIONS.length} questions. Are you sure you want to submit?
              </p>
            ) : (
              <p className="text-slate-400 text-sm mb-6">
                You have answered all questions. You cannot change your answers after submitting.
              </p>
            )}

            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-lg border border-slate-700 hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleFinalSubmit}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}