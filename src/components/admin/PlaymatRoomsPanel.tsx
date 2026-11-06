import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '../../store/authStore';
import { isAdminEmail } from '../../utils/adminAuth';
import {
  fetchAllPlaymatRooms,
  deletePlaymatRoom,
  deletePlaymatRooms,
  type PlaymatRoomSummary,
} from '../../services/playmatSyncService';

export function PlaymatRoomsPanel() {
  const user = useAuthStore((s) => s.user);
  const signIn = useAuthStore((s) => s.signIn);

  const [rooms, setRooms] = useState<PlaymatRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'terminated'>('all');
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isCloudAdmin = Boolean(user?.email && isAdminEmail(user.email));

  const loadRooms = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllPlaymatRooms();
      setRooms(data);
      // Prune selected codes that no longer exist
      setSelectedCodes((prev) => {
        const next = new Set<string>();
        const existingCodes = new Set(data.map((r) => r.roomCode));
        prev.forEach((code) => {
          if (existingCodes.has(code)) next.add(code);
        });
        return next;
      });
    } catch (err: any) {
      setError(err?.message || 'ไม่สามารถโหลดรายชื่อห้องดวลได้');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  // Filtered rooms based on search and status
  const filteredRooms = useMemo(() => {
    const q = searchQuery.trim().toUpperCase();
    return rooms.filter((r) => {
      // Status filter
      if (filterStatus === 'active' && r.isTerminated) return false;
      if (filterStatus === 'terminated' && !r.isTerminated) return false;

      // Query filter
      if (!q) return true;
      const codeMatch = r.roomCode.includes(q);
      const p1Match = r.p1Name?.toUpperCase().includes(q);
      const p2Match = r.p2Name?.toUpperCase().includes(q);
      const p1EmailMatch = r.p1Email?.toUpperCase().includes(q);
      const p2EmailMatch = r.p2Email?.toUpperCase().includes(q);
      const spectatorMatch = r.spectators?.some(
        (s) => s.name?.toUpperCase().includes(q) || s.email?.toUpperCase().includes(q)
      );
      return (
        codeMatch ||
        Boolean(p1Match) ||
        Boolean(p2Match) ||
        Boolean(p1EmailMatch) ||
        Boolean(p2EmailMatch) ||
        Boolean(spectatorMatch)
      );
    });
  }, [rooms, searchQuery, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = rooms.length;
    const terminated = rooms.filter((r) => r.isTerminated).length;
    const active = total - terminated;
    return { total, active, terminated };
  }, [rooms]);

  // Selection handlers
  const handleToggleSelect = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedCodes((prev) => {
      const allVisibleSelected = filteredRooms.length > 0 && filteredRooms.every((r) => prev.has(r.roomCode));
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredRooms.forEach((r) => next.delete(r.roomCode));
      } else {
        filteredRooms.forEach((r) => next.add(r.roomCode));
      }
      return next;
    });
  };

  const handleSelectAllTerminated = () => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      rooms.forEach((r) => {
        if (r.isTerminated) next.add(r.roomCode);
      });
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedCodes(new Set());
  };

  // Delete single room
  const handleDeleteSingle = async (roomCode: string) => {
    if (!window.confirm(`ยืนยันการลบห้องดวล "${roomCode}" ถาวรออกจากระบบหรือไม่?`)) {
      return;
    }

    setIsDeleting(true);
    setFeedback(null);
    try {
      await deletePlaymatRoom(roomCode);
      setRooms((prev) => prev.filter((r) => r.roomCode !== roomCode));
      setSelectedCodes((prev) => {
        const next = new Set(prev);
        next.delete(roomCode);
        return next;
      });
      setFeedback({ type: 'success', message: `ลบห้อง "${roomCode}" สำเร็จแล้ว` });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `ลบห้อง "${roomCode}" ไม่สำเร็จ: ${err?.message || 'Permission denied'}`,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk delete selected rooms
  const handleDeleteSelected = async () => {
    const list = Array.from(selectedCodes);
    if (list.length === 0) return;

    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบห้องดวลที่เลือกทั้งหมดจำนวน ${list.length} ห้องอย่างถาวร?`)) {
      return;
    }

    setIsDeleting(true);
    setFeedback(null);
    try {
      const result = await deletePlaymatRooms(list);
      setRooms((prev) => prev.filter((r) => !result.deleted.includes(r.roomCode)));
      setSelectedCodes((prev) => {
        const next = new Set(prev);
        result.deleted.forEach((c) => next.delete(c));
        return next;
      });

      if (result.errors.length === 0) {
        setFeedback({
          type: 'success',
          message: `ลบห้องดวลที่เลือกเรียบร้อยแล้วทั้งหมด ${result.deleted.length} ห้อง`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: `ลบสำเร็จ ${result.deleted.length} ห้อง แต่พบข้อผิดพลาด ${result.errors.length} ห้อง`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: `เกิดข้อผิดพลาดในการลบห้อง: ${err?.message || 'Permission denied'}`,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isAllVisibleSelected =
    filteredRooms.length > 0 && filteredRooms.every((r) => selectedCodes.has(r.roomCode));

  return (
    <div data-testid="playmat-admin-rooms-panel" className="space-y-6">
      {/* Top Banner & Info */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
              Duel Rooms Manager
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Real-time Firestore
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-white mt-1.5 flex items-center gap-2">
            <span>⚔️</span>
            <span>จัดการห้องดวล Digital Playmat (V3 โต๊ะจริง & V2 ห้องดวล)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            ตรวจสอบสถานะห้องที่กำลังเล่น ระบบจะปิดห้องอัตโนมัติหากไม่มีการเคลื่อนไหวนานเกิน 30 นาที หรือเลือกลบห้องทันทีเพื่อเคลียร์ออกจากระบบ
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2.5">
          <div className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-center">
            <span className="text-[10px] text-slate-400 block font-bold">ห้องทั้งหมด</span>
            <span className="text-lg font-black text-white font-mono">{stats.total}</span>
          </div>
          <div className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-center">
            <span className="text-[10px] text-emerald-400 block font-bold">🟢 กำลังเล่น</span>
            <span className="text-lg font-black text-emerald-400 font-mono">{stats.active}</span>
          </div>
          <div className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-center">
            <span className="text-[10px] text-slate-500 block font-bold">🔴 ปิด/เกิน 30 นาที</span>
            <span className="text-lg font-black text-slate-400 font-mono">{stats.terminated}</span>
          </div>
          <button
            type="button"
            onClick={loadRooms}
            disabled={loading || isDeleting}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-2xl border border-slate-700 transition font-bold disabled:opacity-50"
            title="รีเฟรชข้อมูลห้อง"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Cloud Admin Permission Warning */}
      {!isCloudAdmin && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>
              คุณกำลังใช้งานในโหมด Passkey หรือยังไม่ได้ล็อกอินด้วยอีเมล Admin (<strong className="font-mono">wingae911@gmail.com</strong>).
              การลบห้องบน Firestore จะต้องใช้สิทธิ์ของบัญชี Admin นี้
            </span>
          </div>
          <button
            type="button"
            onClick={() => signIn()}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs whitespace-nowrap transition shadow"
          >
            เข้าสู่ระบบ Admin
          </button>
        </div>
      )}

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold border flex items-center justify-between animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Selection Controls */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search & Status Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <input
              type="text"
              placeholder="🔍 ค้นหารหัสห้อง, ชื่อผู้เล่น หรืออีเมล (เช่น user@gmail.com)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status filter chips */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(['all', 'active', 'terminated'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                  filterStatus === status
                    ? 'bg-slate-800 text-amber-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status === 'all' ? 'ทั้งหมด' : status === 'active' ? '🟢 กำลังเล่น' : '🔴 ปิดแล้ว'}
              </button>
            ))}
          </div>
        </div>

        {/* Batch Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {stats.terminated > 0 && (
            <button
              type="button"
              onClick={handleSelectAllTerminated}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition"
            >
              เลือกห้องปิดแล้ว ({stats.terminated})
            </button>
          )}

          {selectedCodes.size > 0 && (
            <>
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold transition"
              >
                ล้างการเลือก
              </button>
              <button
                type="button"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>🗑️</span>
                <span>ลบที่เลือก ({selectedCodes.size})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Rooms Table / Cards */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <div className="animate-spin text-3xl">⚡</div>
            <p className="text-xs">กำลังโหลดรายชื่อห้องดวลจาก Firestore...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 space-y-2">
            <p className="text-sm font-bold">{error}</p>
            <button
              type="button"
              onClick={loadRooms}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <p className="text-2xl">🎴</p>
            <p className="text-xs font-medium">ไม่พบห้องดวลที่ตรงกับเงื่อนไขการค้นหา</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllVisibleSelected}
                      onChange={handleSelectAllVisible}
                      className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 cursor-pointer"
                      title="เลือกทั้งหมดในหน้านี้"
                    />
                  </th>
                  <th className="p-3.5">รหัสห้อง (Room Code)</th>
                  <th className="p-3.5">โหมด (Mode)</th>
                  <th className="p-3.5">สถานะ (Status)</th>
                  <th className="p-3.5">ผู้เล่น (P1 vs P2)</th>
                  <th className="p-3.5">สร้างเมื่อ (Created At)</th>
                  <th className="p-3.5 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRooms.map((room) => {
                  const isSelected = selectedCodes.has(room.roomCode);
                  const createdDate = room.createdAt ? new Date(room.createdAt) : null;
                  const formattedDate = createdDate
                    ? createdDate.toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '-';

                  return (
                    <tr
                      key={room.roomCode}
                      className={`hover:bg-slate-800/40 transition ${
                        isSelected ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(room.roomCode)}
                          className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Room Code */}
                      <td className="p-3.5 font-mono font-black text-white text-sm">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-1 rounded-md bg-slate-950 border border-slate-800 text-amber-300">
                            {room.roomCode}
                          </span>
                          {room.version === 'v3' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40" title="V3 Tabletop Sandbox โต๊ะจริง">
                              V3
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700" title="V2 Playmat Online Duel">
                              V2
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Mode */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            room.version === 'v3'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : room.mode === 'duel'
                              ? 'bg-sky-500/10 text-sky-300 border-sky-500/30'
                              : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                          }`}
                        >
                          {room.version === 'v3' ? '🎲 V3 Tabletop' : room.mode === 'duel' ? '⚔️ Online Duel' : '📺 Host Screen'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        {room.isTerminated ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700" title="ห้องปิดแล้วหรือไม่มีการเคลื่อนไหวเกิน 30 นาที">
                            🔴 ปิดแล้ว (&gt;30 น.)
                          </span>
                        ) : !room.p2Ready ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            🟡 รอคู่แข่งเข้าร่วม
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            🟢 กำลังเล่น {room.turnNumber ? `(เทิร์น ${room.turnNumber})` : ''}
                          </span>
                        )}
                      </td>

                      {/* Players & Emails & Spectators */}
                      <td className="p-3.5">
                        <div className="flex flex-col gap-1 text-[11px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* P1 */}
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-blue-300">
                                🔵 {room.p1Name || <span className="text-slate-500 italic">P1 ว่าง</span>}
                              </span>
                              {room.p1Email && (
                                <span
                                  className="px-1.5 py-0.2 rounded bg-blue-950/80 text-[10px] text-blue-300 border border-blue-500/30 font-mono"
                                  title={`UID: ${room.p1Uid || '-'}`}
                                >
                                  {room.p1Email}
                                </span>
                              )}
                            </div>

                            <span className="text-slate-500 font-bold">vs</span>

                            {/* P2 */}
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-rose-300">
                                🔴 {room.p2Name || <span className="text-slate-500 italic">P2 ว่าง</span>}
                              </span>
                              {room.p2Email && (
                                <span
                                  className="px-1.5 py-0.2 rounded bg-rose-950/80 text-[10px] text-rose-300 border border-rose-500/30 font-mono"
                                  title={`UID: ${room.p2Uid || '-'}`}
                                >
                                  {room.p2Email}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Spectators */}
                          {(room.spectatorsCount || (room.spectators && room.spectators.length > 0)) ? (
                            <div className="flex items-center gap-1 flex-wrap mt-0.5">
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/30">
                                👁️ ผู้เข้าชม {room.spectatorsCount || room.spectators?.length || 0}
                              </span>
                              {room.spectators?.map((spec, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.2 rounded border border-white/5 font-mono"
                                  title={`เข้าชมเมื่อ: ${new Date(spec.joinedAt || Date.now()).toLocaleTimeString('th-TH')}`}
                                >
                                  {spec.name}{spec.email ? ` (${spec.email})` : ''}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="p-3.5 text-slate-400 text-[11px] font-mono">
                        {formattedDate}
                      </td>

                      {/* Action */}
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteSingle(room.roomCode)}
                          disabled={isDeleting}
                          className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition text-xs font-bold disabled:opacity-50"
                          title={`ลบห้อง ${room.roomCode}`}
                        >
                          🗑️ ลบ
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            แสดง <strong>{filteredRooms.length}</strong> จากทั้งหมด <strong>{rooms.length}</strong> ห้อง
          </span>
          {selectedCodes.size > 0 && (
            <span className="font-bold text-amber-300">
              เลือกอยู่ {selectedCodes.size} ห้อง
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
