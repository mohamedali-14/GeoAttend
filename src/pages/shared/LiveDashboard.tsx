/**
 * LiveDashboard — Real-time attendance feed for Doctors and Admins
 * Shows live events as they come in via Socket context
 */
import { useState } from "react";
import { Radio, Users, CheckCircle, MapPin, Clock, Trash2, Navigation } from "lucide-react";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import ConnectionStatus from "../../components/ConnectionStatus";

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  return new Date(iso).toLocaleTimeString("en-EG", { hour: "2-digit", minute: "2-digit" });
}

export default function LiveDashboard() {
  const { attendanceEvents, sessionEvents, clearEvents, isConnected } = useSocket();
  const { user } = useAuth();

  const activeSessionsCount = sessionEvents.filter(e => e.action === "started").length
    - sessionEvents.filter(e => e.action === "ended").length;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 border-b border-slate-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-white mb-1">Live Dashboard</h1>
          <p className="text-slate-400 text-sm">Real-time attendance feed across all sessions.</p>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionStatus />
          {(attendanceEvents.length > 0 || sessionEvents.length > 0) && (
            <button onClick={clearEvents}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm transition-colors">
              <Trash2 className="w-3.5 h-3.5" />Clear
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Active Sessions",    value: Math.max(0, activeSessionsCount), color: "text-[#00D084]", bg: "bg-[#00D084]/10 border-[#00D084]/20" },
          { label: "Students Joined",    value: attendanceEvents.length,          color: "text-blue-400",  bg: "bg-blue-500/10  border-blue-500/20"  },
          { label: "Connection",         value: isConnected ? "Live" : "Offline", color: isConnected ? "text-[#00D084]" : "text-red-400",
            bg: isConnected ? "bg-[#00D084]/10 border-[#00D084]/20" : "bg-red-500/10 border-red-500/20" },
        ].map(s => (
          <div key={s.label} className={`border rounded-xl p-5 ${s.bg}`}>
            <p className="text-slate-400 text-xs mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance feed */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
            <Radio className="w-4 h-4 text-[#00D084] animate-pulse" />
            <h2 className="text-white font-semibold">Attendance Feed</h2>
            {attendanceEvents.length > 0 && (
              <span className="ml-auto text-xs bg-[#00D084]/20 text-[#00D084] border border-[#00D084]/30 px-2 py-0.5 rounded-full">
                {attendanceEvents.length} events
              </span>
            )}
          </div>
          <div className="overflow-y-auto max-h-[400px]">
            {attendanceEvents.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Waiting for students to join sessions...</p>
              </div>
            ) : attendanceEvents.map((e, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                <div className="w-9 h-9 rounded-full bg-[#00D084]/20 flex items-center justify-center text-[#00D084] text-xs font-bold flex-shrink-0">
                  {e.studentName.slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{e.studentName}</p>
                  <p className="text-slate-500 text-xs truncate">Session: {e.sessionId.slice(0,8)}...</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {e.geoStatus === "outside"
                    ? <span className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Navigation className="w-3 h-3" />Outside
                      </span>
                    : <span className="text-xs text-[#00D084] bg-[#00D084]/10 border border-[#00D084]/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />Present
                      </span>
                  }
                  <p className="text-slate-600 text-xs mt-0.5">{timeAgo(e.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Session events */}
        <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
            <MapPin className="w-4 h-4 text-blue-400" />
            <h2 className="text-white font-semibold">Session Events</h2>
          </div>
          <div className="overflow-y-auto max-h-[400px]">
            {sessionEvents.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No session events yet...</p>
              </div>
            ) : sessionEvents.map((e, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-slate-800/50 last:border-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${e.action === "started" ? "bg-[#00D084]" : "bg-red-400"}`} />
                <div className="flex-1">
                  <p className="text-white text-sm">
                    <span className={`font-semibold ${e.action === "started" ? "text-[#00D084]" : "text-red-400"}`}>
                      {e.action === "started" ? "Started" : "Ended"}
                    </span>
                    {" — "}{e.courseName}
                  </p>
                  <p className="text-slate-500 text-xs">{timeAgo(e.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
