import React, { useState, useEffect } from 'react';
import { Radio, Check, X, AlertTriangle } from 'lucide-react';

interface RandomCheckModalProps {
  expiresAt: number;
  onConfirm: () => void;
  onMissed: () => void;
}

export default function RandomCheckModal({ expiresAt, onConfirm, onMissed }: RandomCheckModalProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const calcTime = () => Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
    setTimeLeft(calcTime());

    const iv = setInterval(() => {
      const remaining = calcTime();
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(iv);
        onMissed();
      }
    }, 1000);

    return () => clearInterval(iv);
  }, [expiresAt, onMissed]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-4">
      <div className="bg-[#111827] border-2 border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.3)] rounded-2xl w-full max-w-sm overflow-hidden flex flex-col transform animate-bounce-short">
        <div className="bg-purple-500/10 p-6 flex flex-col items-center justify-center text-center border-b border-purple-500/20">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
             <Radio className="w-8 h-8 text-purple-400 animate-ping absolute" />
             <Radio className="w-8 h-8 text-purple-400 relative z-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Presence Check!</h2>
          <p className="text-slate-300 text-sm">Your professor has triggered a random attendance check. Please confirm you are still here.</p>
        </div>
        
        <div className="p-6 flex flex-col items-center">
          <div className="text-5xl font-mono font-bold text-purple-400 mb-6 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
            00:{timeLeft.toString().padStart(2, '0')}
          </div>
          
          <button 
            onClick={onConfirm} 
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
          >
            <Check className="w-6 h-6" /> I'm Here!
          </button>
        </div>
      </div>
    </div>
  );
}
