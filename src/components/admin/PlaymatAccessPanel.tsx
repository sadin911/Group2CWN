import { useState, useEffect } from 'react';
import { usePlaymatAccessStore } from '../../store/playmatAccessStore';
import { getAdminEmails, isAdminEmail } from '../../utils/adminAuth';

export function PlaymatAccessPanel() {
  const allowedUsers = usePlaymatAccessStore((s) => s.allowedUsers);
  const addAllowedUser = usePlaymatAccessStore((s) => s.addAllowedUser);
  const removeAllowedUser = usePlaymatAccessStore((s) => s.removeAllowedUser);
  const init = usePlaymatAccessStore((s) => s.init);

  const [identifierInput, setIdentifierInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [testIdentifier, setTestIdentifier] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const clean = identifierInput.trim();
    if (!clean) {
      setFeedback({ type: 'error', message: 'กรุณาระบุ Email, UID หรือรหัสผู้ทดสอบ' });
      return;
    }

    const success = await addAllowedUser(clean, noteInput);
    if (success) {
      setFeedback({ type: 'success', message: `เพิ่มสิทธิ์ให้ "${clean}" เรียบร้อยแล้ว` });
      setIdentifierInput('');
      setNoteInput('');
    } else {
      setFeedback({ type: 'error', message: `"${clean}" มีอยู่ในระบบแล้ว` });
    }
  };

  const handleRemove = async (id: string, name: string) => {
    if (window.confirm(`ยืนยันการถอนสิทธิ์สำหรับ "${name}" หรือไม่?`)) {
      await removeAllowedUser(id);
      setFeedback({ type: 'success', message: `ถอนสิทธิ์ "${name}" แล้ว` });
    }
  };

  const handleTestCheck = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = testIdentifier.trim().toLowerCase();
    if (!clean) return;

    if (isAdminEmail(clean)) {
      setTestResult(`✅ "${clean}" เป็น System Admin ได้รับสิทธิ์อัตโนมัติ 100%`);
      return;
    }

    const found = allowedUsers.find((u) => u.identifier.trim().toLowerCase() === clean);
    if (found) {
      setTestResult(`✅ "${clean}" ได้รับสิทธิ์เข้าใช้งาน Playmat (บันทึก: ${found.note || 'ไม่มี'})`);
    } else {
      setTestResult(`❌ "${clean}" ยังไม่ได้รับสิทธิ์ (ถูกบล็อกที่ Access Gate)`);
    }
  };

  const adminEmails = getAdminEmails();
  const filteredUsers = allowedUsers.filter(
    (u) =>
      u.identifier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.note && u.note.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div data-testid="playmat-admin-access-panel" className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Access Control
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Closed Beta
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-white mt-1.5 flex items-center gap-2">
            <span>🎮</span>
            <span>จัดการสิทธิ์เข้าใช้งาน Digital Playmat & Online Duel</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            กำหนดรายชื่อผู้ใช้งาน (User Email / Firebase UID / Tester Code) ที่ได้รับอนุญาตให้เห็นและเข้าใช้งาน
            ระบบ Playmat และห้องดวลออนไลน์ก่อนเปิดให้คนทั่วไปใช้งานบน Production
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-2xl text-center">
            <span className="text-[10px] text-slate-400 block font-bold">ผู้ได้รับสิทธิ์ทั้งหมด</span>
            <span data-testid="playmat-allowed-count" className="text-xl font-black text-amber-400 font-mono">
              {allowedUsers.length}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Emails Auto-allow Note */}
      <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/60 flex items-start gap-3">
        <span className="text-xl">🛡️</span>
        <div className="text-xs space-y-1">
          <p className="font-bold text-indigo-200">
            System Admin เข้าใช้งานได้ตลอดเวลาอัตโนมัติ:
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {adminEmails.map((email) => (
              <span
                key={email}
                className="px-2 py-0.5 bg-indigo-900/80 text-indigo-300 border border-indigo-700/80 rounded-lg font-mono text-[11px]"
              >
                {email}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Form: Add New User */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>➕</span>
          <span>เพิ่มสิทธิ์ผู้ใช้งานใหม่ (Add Allowed User)</span>
        </h3>

        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5">
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              Email / Firebase UID / Tester Code <span className="text-rose-400">*</span>
            </label>
            <input
              data-testid="playmat-add-identifier-input"
              type="text"
              value={identifierInput}
              onChange={(e) => setIdentifierInput(e.target.value)}
              placeholder="เช่น player@gmail.com หรือ UID หรือ code"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="sm:col-span-5">
            <label className="block text-[11px] font-bold text-slate-300 mb-1">
              บันทึกช่วยจำ / หมายเหตุ (Note)
            </label>
            <input
              data-testid="playmat-add-note-input"
              type="text"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="เช่น Pro Player, ร้านการ์ด กทม., เพื่อนทดสอบ"
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="sm:col-span-2 flex items-end">
            <button
              data-testid="playmat-add-user-submit"
              type="submit"
              className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow transition flex items-center justify-center gap-1.5"
            >
              <span>+ เพิ่มสิทธิ์</span>
            </button>
          </div>
        </form>

        {feedback && (
          <div
            data-testid="playmat-admin-feedback"
            className={`p-3 rounded-xl text-xs flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                : 'bg-rose-950/70 text-rose-300 border border-rose-800'
            }`}
          >
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Allowed Users List Table */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>📋</span>
            <span>รายชื่อผู้ได้รับสิทธิ์ ({filteredUsers.length} รายการ)</span>
          </h3>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 ค้นหารายชื่อ หรือ หมายเหตุ..."
            className="w-full sm:w-64 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        {filteredUsers.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-500 bg-slate-950/50 rounded-2xl border border-slate-800/80">
            {searchQuery
              ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา'
              : 'ยังไม่มีรายชื่อผู้ได้รับสิทธิ์ (สามารถเพิ่มได้จากฟอร์มด้านบน)'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((item) => (
              <div
                key={item.id}
                data-testid="playmat-allowed-user-item"
                className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-3 hover:border-slate-700 transition"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-white truncate">
                      {item.identifier}
                    </span>
                    {item.note && (
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md text-[10px]">
                        {item.note}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    เพิ่มเมื่อ: {new Date(item.addedAt).toLocaleDateString('th-TH')}{' '}
                    {item.addedBy && `• โดย ${item.addedBy}`}
                  </div>
                </div>

                <button
                  data-testid="playmat-revoke-user-btn"
                  onClick={() => handleRemove(item.id, item.identifier)}
                  className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0"
                  title="ถอนสิทธิ์"
                >
                  <span>🗑️</span>
                  <span>ถอนสิทธิ์</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Permission Verification Checker Tool */}
      <div className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span>🧪</span>
          <span>เครื่องมือทดสอบสิทธิ์ (Test Permission Verification)</span>
        </h3>
        <p className="text-xs text-slate-400">
          กรอก Email หรือ UID เพื่อตรวจสอบว่าผู้ใช้งานคนนี้สามารถเข้าหน้า Playmat ได้หรือไม่
        </p>

        <form onSubmit={handleTestCheck} className="flex gap-2 max-w-md">
          <input
            data-testid="playmat-check-test-input"
            type="text"
            value={testIdentifier}
            onChange={(e) => {
              setTestIdentifier(e.target.value);
              setTestResult(null);
            }}
            placeholder="เช่น test@gmail.com หรือ UID"
            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
          <button
            data-testid="playmat-check-test-btn"
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs border border-slate-700 transition"
          >
            ตรวจสอบ
          </button>
        </form>

        {testResult && (
          <div
            data-testid="playmat-check-test-result"
            className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-medium"
          >
            {testResult}
          </div>
        )}
      </div>
    </div>
  );
}
