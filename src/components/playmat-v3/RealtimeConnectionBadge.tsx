import React, { useState } from 'react';
import type { RealtimeConnectionInfo } from '../../services/realtime/realtimeTransportManager';

interface RealtimeConnectionBadgeProps {
  connectionInfo?: RealtimeConnectionInfo | null;
  className?: string;
}

export const RealtimeConnectionBadge: React.FC<RealtimeConnectionBadgeProps> = ({
  connectionInfo,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  if (!connectionInfo) {
    return null;
  }

  const showTooltip = isHovered || isPinned;

  const { mode, latencyMs, roomCode } = connectionInfo;

  let badgeColor = 'bg-slate-800/80 text-slate-300 border-slate-700/60';
  let dotColor = 'bg-slate-400';
  let labelText = 'ออฟไลน์';
  let icon = '⚪';
  let description = 'กำลังเริ่มต้นระบบ Realtime';

  if (mode === 'p2p') {
    badgeColor = 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-950/50';
    dotColor = 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse';
    icon = '⚡';
    labelText = `P2P Direct ${latencyMs > 0 ? `${latencyMs}ms` : ''}`;
    description = 'เชื่อมต่อตรงแบบ Peer-to-Peer ผ่าน WebRTC DataChannel (ความหน่วงต่ำพิเศษ / ไม่มีค่าบริการเซิร์ฟเวอร์)';
  } else if (mode === 'broadcast') {
    badgeColor = 'bg-cyan-950/70 text-cyan-300 border-cyan-500/40 shadow-sm shadow-cyan-950/50';
    dotColor = 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]';
    icon = '⚡';
    labelText = 'Local Tab 0ms';
    description = 'เชื่อมต่อระหว่างแท็บในเครื่องเดียวกันผ่าน BroadcastChannel (ความเร็วระดับ 0ms)';
  } else if (mode === 'connecting') {
    badgeColor = 'bg-amber-950/70 text-amber-300 border-amber-500/40';
    dotColor = 'bg-amber-400 animate-ping';
    icon = '🔄';
    labelText = 'กำลังจับคู่...';
    description = 'กำลังเจรจาเชื่อมต่อ WebRTC P2P ผ่าน STUN/Signaling';
  } else if (mode === 'cloud') {
    badgeColor = 'bg-sky-950/70 text-sky-300 border-sky-500/40';
    dotColor = 'bg-sky-400';
    icon = '☁️';
    labelText = `Cloud Sync ${latencyMs > 0 ? `${latencyMs}ms` : ''}`;
    description = 'เชื่อมต่อผ่าน Firestore Cloud Relay Fallback';
  }

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        type="button"
        id="badge-realtime-connection"
        data-mode={mode}
        data-latency={latencyMs}
        onClick={() => setIsPinned((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold border backdrop-blur-sm transition-all duration-200 cursor-pointer select-none ${badgeColor}`}
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
        <span className="leading-none">{labelText.trim()}</span>
      </button>

      {/* Connection Detail Tooltip */}
      {showTooltip && (
        <div
          id="tooltip-realtime-connection"
          className="absolute z-50 bottom-full mb-1.5 left-1/2 -translate-x-1/2 w-64 p-2.5 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md text-left text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
            <span className="font-bold text-white flex items-center gap-1">
              <span>{icon}</span> Realtime Connection
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
              {roomCode}
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed mb-2">
            {description}
          </p>
          <div className="grid grid-cols-2 gap-1 text-[10px] pt-1 border-t border-slate-800/80 text-slate-400 font-mono">
            <div>
              โหมด: <span className="text-white font-semibold uppercase">{mode}</span>
            </div>
            <div className="text-right">
              RTT: <span className="text-emerald-400 font-semibold">{latencyMs} ms</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
