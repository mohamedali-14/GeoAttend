import { QrCode, X } from "lucide-react";

export function QRScannerModal({ onClose, onScanned }: { onClose: () => void; onScanned: (data: string) => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg flex items-center gap-2"><QrCode className="w-5 h-5 text-[#00D084]"/>Scan QR Code</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="w-64 h-64 bg-slate-900 rounded-2xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center gap-3">
            <QrCode className="w-16 h-16 text-slate-600"/>
            <p className="text-slate-500 text-sm text-center px-4">Point your camera at the QR code shown by your doctor</p>
          </div>
          <p className="text-slate-400 text-xs text-center">Camera access required. Make sure the QR is well-lit.</p>
          <button
            onClick={() => { const qr = "GEOATTEND|demo-session-id|demo-course|" + new Date().toISOString(); onScanned(qr); }}
            className="w-full py-2.5 bg-[#00D084]/10 hover:bg-[#00D084]/20 border border-[#00D084]/30 text-[#00D084] font-semibold rounded-lg text-sm">
            Simulate Scan (Demo)
          </button>
        </div>
      </div>
    </div>
  );
}
