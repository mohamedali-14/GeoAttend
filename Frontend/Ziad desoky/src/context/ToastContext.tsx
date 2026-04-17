/**
 * Toast — lightweight notification system
 * Usage:  toast.success("Done!") / toast.error("Failed") / toast.info("...")
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  success: (msg: string) => void;
  error:   (msg: string) => void;
  warning: (msg: string) => void;
  info:    (msg: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle  className="w-4 h-4 text-[#00D084]" />,
  error:   <XCircle      className="w-4 h-4 text-red-400"   />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
  info:    <Info         className="w-4 h-4 text-blue-400"  />,
};

const STYLES: Record<ToastType, string> = {
  success: "border-[#00D084]/30 bg-[#00D084]/10",
  error:   "border-red-500/30   bg-red-500/10",
  warning: "border-yellow-500/30 bg-yellow-500/10",
  info:    "border-blue-500/30  bg-blue-500/10",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(p => [...p, { id, type, message }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const ctx: ToastContextType = {
    success: (m) => add("success", m),
    error:   (m) => add("error",   m),
    warning: (m) => add("warning", m),
    info:    (m) => add("info",    m),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-white text-sm font-medium
                        animate-[slideIn_0.2s_ease] pointer-events-auto max-w-sm ${STYLES[t.type]}`}
            style={{ animation: "slideIn 0.2s ease" }}>
            {ICONS[t.type]}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))}
              className="text-slate-400 hover:text-white ml-1">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
