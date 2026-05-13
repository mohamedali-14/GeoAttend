import { useEffect, useRef, useState } from "react";
import { QrCode, X, Camera, CameraOff, RefreshCw } from "lucide-react";

// jsQR loaded from CDN via index.html — declare global type
declare const jsQR: ((data: Uint8ClampedArray, width: number, height: number) => { data: string } | null) | undefined;

type ScanStatus = "requesting" | "active" | "denied" | "error" | "unsupported";

export function QRScannerModal({
  onClose,
  onScanned,
}: {
  onClose: () => void;
  onScanned: (data: string) => void;
}) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const rafRef     = useRef<number>(0);

  const [status,   setStatus]   = useState<ScanStatus>("requesting");
  const [errorMsg, setErrorMsg] = useState("");
  const [found,    setFound]    = useState(false);

  // ── Start camera ──────────────────────────────────────────────────────────
  const startCamera = async () => {
    setStatus("requesting");
    setErrorMsg("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus("active");
        scheduleScan();
      }
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setStatus("denied");
      } else {
        setStatus("error");
        setErrorMsg(err.message || "Could not access camera");
      }
    }
  };

  // ── QR scan loop ──────────────────────────────────────────────────────────
  const scheduleScan = () => {
    rafRef.current = requestAnimationFrame(scanFrame);
  };

  const scanFrame = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) { scheduleScan(); return; }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) { scheduleScan(); return; }

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // jsQR may not be loaded yet (CDN async)
    if (typeof jsQR === "undefined") { scheduleScan(); return; }

    const result = jsQR(imageData.data, imageData.width, imageData.height);
    if (result?.data) {
      setFound(true);
      stopCamera();
      setTimeout(() => onScanned(result.data), 300);
      return;
    }

    scheduleScan();
  };

  // ── Stop camera ───────────────────────────────────────────────────────────
  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#00D084]" />Scan QR Code
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col items-center gap-4">

          {/* Camera viewport */}
          <div className="relative w-64 h-64 rounded-2xl overflow-hidden bg-black border-2 border-slate-700">
            {/* Video feed */}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover ${status === "active" ? "opacity-100" : "opacity-0"}`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Corner markers */}
            {status === "active" && !found && (
              <>
                <span className="absolute top-3 left-3 w-7 h-7 border-t-2 border-l-2 border-[#00D084] rounded-tl-lg" />
                <span className="absolute top-3 right-3 w-7 h-7 border-t-2 border-r-2 border-[#00D084] rounded-tr-lg" />
                <span className="absolute bottom-3 left-3 w-7 h-7 border-b-2 border-l-2 border-[#00D084] rounded-bl-lg" />
                <span className="absolute bottom-3 right-3 w-7 h-7 border-b-2 border-r-2 border-[#00D084] rounded-br-lg" />
                {/* Scan line animation */}
                <span className="absolute left-4 right-4 h-0.5 bg-[#00D084]/70 rounded animate-[scan_2s_ease-in-out_infinite]" />
              </>
            )}

            {/* Requesting */}
            {status === "requesting" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <Camera className="w-10 h-10 text-slate-500 animate-pulse" />
                <p className="text-slate-400 text-sm">Starting camera…</p>
              </div>
            )}

            {/* Denied */}
            {status === "denied" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
                <CameraOff className="w-10 h-10 text-red-400" />
                <p className="text-red-300 text-sm font-semibold">Camera access denied</p>
                <p className="text-slate-500 text-xs">Allow camera in your browser settings and try again</p>
              </div>
            )}

            {/* Unsupported */}
            {status === "unsupported" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
                <CameraOff className="w-10 h-10 text-yellow-400" />
                <p className="text-yellow-300 text-sm font-semibold">Camera not supported</p>
                <p className="text-slate-500 text-xs">Use a modern browser like Chrome or Safari</p>
              </div>
            )}

            {/* Error */}
            {status === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
                <CameraOff className="w-10 h-10 text-red-400" />
                <p className="text-red-300 text-sm font-semibold">Camera error</p>
                <p className="text-slate-500 text-xs">{errorMsg}</p>
              </div>
            )}

            {/* Found! */}
            {found && (
              <div className="absolute inset-0 bg-[#00D084]/20 flex flex-col items-center justify-center gap-2">
                <div className="bg-[#00D084] rounded-full p-3">
                  <QrCode className="w-8 h-8 text-gray-900" />
                </div>
                <p className="text-[#00D084] font-bold text-sm">QR Detected!</p>
              </div>
            )}
          </div>

          {/* Hint text */}
          {status === "active" && !found && (
            <p className="text-slate-400 text-xs text-center">
              Point your camera at the QR code shown by your doctor
            </p>
          )}

          {/* Retry button */}
          {(status === "denied" || status === "error" || status === "unsupported") && (
            <button
              onClick={startCamera}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />Try Again
            </button>
          )}
        </div>
      </div>

      {/* Scan line keyframe */}
      <style>{`
        @keyframes scan {
          0%   { top: 20%; }
          50%  { top: 75%; }
          100% { top: 20%; }
        }
      `}</style>
    </div>
  );
}
