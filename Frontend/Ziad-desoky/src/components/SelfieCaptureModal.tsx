import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, Check, Loader2 } from 'lucide-react';
import { storage } from '../firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useToast } from '../context/ToastContext';

interface SelfieCaptureModalProps {
  sessionId: string;
  studentId: string;
  onCapture: (selfieUrl: string) => void;
  onCancel: () => void;
}

export default function SelfieCaptureModal({ sessionId, studentId, onCapture, onCancel }: SelfieCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const toast = useToast();

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user" },
        audio: false 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      toast.error("Camera access denied or unavailable");
      onCancel();
    }
  }, [onCancel, toast]);

  // Start camera on mount
  React.useEffect(() => {
    startCamera();
    return () => {
      // Stop all tracks on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [startCamera]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        // Turn off camera preview after capture
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const confirmUpload = async () => {
    if (!capturedImage) return;
    setIsUploading(true);
    try {
      const filename = `attendance-selfies/${sessionId}/${studentId}_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      // Upload base64 string
      await uploadString(storageRef, capturedImage, 'data_url');
      const downloadUrl = await getDownloadURL(storageRef);
      
      onCapture(downloadUrl);
    } catch (err) {
      console.error("Selfie upload failed:", err);
      toast.error("Failed to upload selfie");
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-[#111827] border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-white font-bold flex items-center gap-2"><Camera className="w-5 h-5 text-orange-400" /> Selfie Verification</h2>
          <button onClick={onCancel} disabled={isUploading} className="text-slate-400 hover:text-white disabled:opacity-50"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-4 flex-1 flex flex-col items-center justify-center min-h-[300px] bg-black relative">
          {!capturedImage ? (
            <>
               <video 
                 ref={videoRef} 
                 autoPlay 
                 playsInline 
                 muted 
                 className="w-full h-full object-cover rounded-lg"
               />
               <canvas ref={canvasRef} className="hidden" />
               <p className="absolute bottom-6 text-white/80 bg-black/50 px-3 py-1 rounded-full text-xs backdrop-blur-sm">Please face the camera</p>
            </>
          ) : (
            <img src={capturedImage} alt="Captured selfie" className="w-full h-full object-cover rounded-lg" />
          )}
        </div>

        <div className="p-4 border-t border-slate-800 flex gap-3">
          {!capturedImage ? (
             <button onClick={capturePhoto} className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
               <Camera className="w-5 h-5" /> Take Photo
             </button>
          ) : (
             <>
               <button onClick={retakePhoto} disabled={isUploading} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50">
                 Retake
               </button>
               <button onClick={confirmUpload} disabled={isUploading} className="flex-[2] py-3 bg-[#00D084] hover:bg-[#00B070] text-gray-900 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-70">
                 {isUploading ? <><Loader2 className="w-5 h-5 animate-spin" /> Uploading...</> : <><Check className="w-5 h-5" /> Confirm & Attend</>}
               </button>
             </>
          )}
        </div>
      </div>
    </div>
  );
}
