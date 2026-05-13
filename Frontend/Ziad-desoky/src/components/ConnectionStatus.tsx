/**
 * ConnectionStatus — shows WebSocket connection state
 * Green dot = connected, Red dot = disconnected
 */
import { useSocket } from "../context/SocketContext";
import { Wifi, WifiOff } from "lucide-react";

export default function ConnectionStatus() {
  const { isConnected } = useSocket();

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all
      ${isConnected
        ? "bg-[#00D084]/10 border-[#00D084]/30 text-[#00D084]"
        : "bg-red-500/10  border-red-500/30  text-red-400"}`}>
      <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-[#00D084] animate-pulse" : "bg-red-400"}`} />
      {isConnected
        ? <><Wifi className="w-3 h-3" />Live</>
        : <><WifiOff className="w-3 h-3" />Offline</>
      }
    </div>
  );
}
