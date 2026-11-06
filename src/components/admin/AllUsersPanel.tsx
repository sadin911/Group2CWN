import { useState, useEffect, useMemo } from 'react';
import { fetchAllWebUsers, type WebUser } from '../../services/userService';
import { usePlaymatAccessStore } from '../../store/playmatAccessStore';
import { isUserAllowedForPlaymat } from '../../services/playmatAccessService';

export function AllUsersPanel() {
  const [users, setUsers] = useState<WebUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  const allowedUsers = usePlaymatAccessStore((s) => s.allowedUsers);
  const addAllowedUser = usePlaymatAccessStore((s) => s.addAllowedUser);
  const removeAllowedUser = usePlaymatAccessStore((s) => s.removeAllowedUser);
  const initAllowedUsers = usePlaymatAccessStore((s) => s.init);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await initAllowedUsers();
      const list = await fetchAllWebUsers();
      setUsers(list);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    const sorted = [...users].sort((a, b) => (b.lastLoginAt || 0) - (a.lastLoginAt || 0));
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (u) =>
        (u.displayName && u.displayName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        u.uid.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const handleCopyUid = (uid: string) => {
    navigator.clipboard?.writeText(uid);
    setCopiedUid(uid);
    setTimeout(() => setCopiedUid(null), 2000);
  };

  const handleTogglePlaymatAccess = async (user: WebUser, isCurrentlyAllowed: boolean) => {
    const identifier = user.email || user.uid;
    if (isCurrentlyAllowed) {
      if (confirm(`ต้องการถอนสิทธิ์ Playmat Beta ของ "${user.displayName || identifier}" หรือไม่?`)) {
        await removeAllowedUser(identifier, user.uid);
      }
    } else {
      const note = `Web User: ${user.displayName || 'No Name'}`;
      await addAllowedUser(identifier, note, {
        email: user.email || undefined,
        uid: user.uid,
      });
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-all-users-panel">
      {/* Header Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <span>👥</span>
            <span>รายชื่อผู้ใช้งานทั้งหมดของระบบ (All Registered Users)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            รายชื่อผู้ใช้ที่บันทึกในระบบ (Web Users Directory) และเลือกเพิ่ม/ถอนสิทธิ์เข้าเล่น Digital Playmat Closed Beta ได้โดยตรง
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-bold">
            ผู้ใช้ทั้งหมด: {users.length} บัญชี
          </span>
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 disabled:opacity-50"
          >
            <span>🔄</span>
            <span>{isLoading ? 'กำลังโหลด...' : 'รีเฟรช'}</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
          <input
            data-testid="search-users-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาตามชื่อ, อีเมล หรือ User ID..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs font-bold transition"
          >
            ล้างค้นหา
          </button>
        )}
      </div>

      {/* Users Table / List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            {isLoading ? 'กำลังโหลดข้อมูลผู้ใช้...' : 'ไม่พบข้อมูลผู้ใช้ตามคำค้นหา'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">ผู้ใช้งาน</th>
                  <th className="py-3 px-4">อีเมล / UID</th>
                  <th className="py-3 px-4">เข้าใช้ล่าสุด</th>
                  <th className="py-3 px-4">สิทธิ์ Playmat Beta</th>
                  <th className="py-3 px-4 text-right">จัดการสิทธิ์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => {
                  const isAllowed = isUserAllowedForPlaymat(
                    {
                      uid: u.uid,
                      email: u.email || undefined,
                      displayName: u.displayName || undefined,
                    },
                    allowedUsers
                  );

                  return (
                    <tr
                      key={u.uid}
                      data-testid={`user-row-${u.uid}`}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* User Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {u.photoURL ? (
                            <img
                              src={u.photoURL}
                              alt={u.displayName || 'User'}
                              className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-bold shrink-0">
                              {(u.displayName?.[0] || u.email?.[0] || 'U').toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-white text-xs">
                              {u.displayName || 'ไม่ระบุชื่อ'}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">
                              UID: {u.uid.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Email & Copy UID */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <p className="font-medium text-slate-200">
                            {u.email || <span className="text-slate-500 italic">ไม่มีอีเมล</span>}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-slate-500 truncate max-w-[140px]">
                              {u.uid}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyUid(u.uid)}
                              className="text-[9px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
                              title="คัดลอก UID"
                            >
                              {copiedUid === u.uid ? '✓ คัดลอก' : 'คัดลอก'}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Last Seen */}
                      <td className="py-3 px-4 text-[11px] text-slate-400 whitespace-nowrap">
                        {u.lastLoginAt ? (
                          <span>{new Date(u.lastLoginAt).toLocaleString('th-TH')}</span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Playmat Beta Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isAllowed ? (
                          <span data-testid="badge-allowed" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-600/60 text-emerald-400 font-bold text-[10px]">
                            <span>✓</span>
                            <span>ได้รับสิทธิ์แล้ว</span>
                          </span>
                        ) : (
                          <span data-testid="badge-denied" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 font-bold text-[10px]">
                            <span>✕</span>
                            <span>ไม่มีสิทธิ์</span>
                          </span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isAllowed ? (
                          <button
                            data-testid="toggle-playmat-access-btn"
                            type="button"
                            onClick={() => handleTogglePlaymatAccess(u, true)}
                            className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-700/60 text-rose-300 font-bold text-[11px] transition"
                          >
                            ถอนสิทธิ์ Playmat
                          </button>
                        ) : (
                          <button
                            data-testid="toggle-playmat-access-btn"
                            type="button"
                            onClick={() => handleTogglePlaymatAccess(u, false)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition shadow"
                          >
                            + ให้สิทธิ์ Playmat
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
