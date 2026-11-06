import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { usePlaymatAccessStore } from '../../../store/playmatAccessStore';
import { isAdminEmail } from '../../../utils/adminAuth';

interface PlaymatAccessGateProps {
  onBack: () => void;
  onAccessGranted?: () => void;
}

export const PlaymatAccessGate: React.FC<PlaymatAccessGateProps> = ({
  onBack,
  onAccessGranted,
}) => {
  const user = useAuthStore((s) => s.user);
  const isAuthLoading = useAuthStore((s) => s.loading);
  const signIn = useAuthStore((s) => s.signIn);
  const setTesterKey = usePlaymatAccessStore((s) => s.setTesterKey);
  const hasAccess = usePlaymatAccessStore((s) => s.hasAccess);
  const initAccess = usePlaymatAccessStore((s) => s.init);
  const isAccessLoading = usePlaymatAccessStore((s) => s.loading);

  const [inputCode, setInputCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Auto-fetch allowed users on gate mount and auto-grant if already allowed
  useEffect(() => {
    let isMounted = true;
    initAccess().then(() => {
      if (isMounted && hasAccess()) {
        setSuccessMsg('ยืนยันสิทธิ์สำเร็จ! กำลังเข้าสู่ Digital Playmat V3...');
        setTimeout(() => {
          if (isMounted) onAccessGranted?.();
        }, 500);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [initAccess, hasAccess, onAccessGranted]);

  const handleApplyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const clean = inputCode.trim();
    if (!clean) {
      setErrorMsg('กรุณากรอกอีเมล หรือรหัสผู้ทดสอบ');
      return;
    }

    setIsVerifying(true);
    try {
      setTesterKey(clean);
      await initAccess();
      if (hasAccess()) {
        setSuccessMsg('ยืนยันสิทธิ์สำเร็จ! กำลังเข้าสู่ Digital Playmat V3...');
        setTimeout(() => {
          onAccessGranted?.();
        }, 500);
      } else {
        setErrorMsg('ไม่พบสิทธิ์สำหรับอีเมลหรือ ID นี้ กรุณาตรวจสอบอีเมลหรือติดต่อแอดมิน');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSignInGoogle = async () => {
    setIsSigningIn(true);
    setErrorMsg('');
    try {
      const loggedIn = await signIn();
      if (loggedIn) {
        await initAccess();
        if (isAdminEmail(loggedIn.email) || hasAccess()) {
          setSuccessMsg('ยืนยันสิทธิ์สำเร็จ! กำลังเข้าสู่ Digital Playmat V3...');
          setTimeout(() => {
            onAccessGranted?.();
          }, 500);
        } else {
          setErrorMsg(`บัญชี ${loggedIn.email} ยังไม่ได้รับสิทธิ์เข้าใช้งานช่วง Closed Beta`);
        }
      }
    } catch {
      setErrorMsg('เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleRecheck = async () => {
    setIsVerifying(true);
    setErrorMsg('');
    try {
      await initAccess();
      if (hasAccess() || (user?.email && isAdminEmail(user.email))) {
        setSuccessMsg('ตรวจพบสิทธิ์แล้ว! กำลังเข้าสู่ Digital Playmat V3...');
        setTimeout(() => onAccessGranted?.(), 500);
      } else {
        setErrorMsg(`บัญชี ${user?.email || user?.uid} ยังไม่ได้รับสิทธิ์ช่วง Closed Beta`);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      id="playmat-access-gate"
      data-testid="playmat-access-gate"
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden"
    >
      {/* Background glow & accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative z-10 animate-in fade-in duration-200">
        {/* Header Icon & Title */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-amber-500 flex items-center justify-center text-3xl shadow-lg shadow-purple-500/30">
            🔒
          </div>
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
            Closed Beta • แอดมินคัดเลือก
          </span>
          <h2 className="text-xl font-black text-white">Playmat V3 Tabletop Sandbox</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            ระบบดิจิทัลเพลย์แมตและโต๊ะแข่งขัน V3 ออนไลน์ อยู่ในช่วง Closed Beta
            เปิดให้เข้าใช้งานเฉพาะอีเมลหรือ User ID ที่แอดมินได้ทำการอนุมัติไว้เท่านั้น
          </p>
        </div>

        {/* Status card */}
        <div className="p-3.5 bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">สถานะผู้ใช้:</span>
            {isAuthLoading ? (
              <span className="text-slate-500 italic">กำลังตรวจสอบบัญชี...</span>
            ) : user ? (
              <span className="font-bold text-emerald-400 truncate max-w-[200px]">
                {user.email || user.displayName || user.uid}
              </span>
            ) : (
              <span className="text-slate-500 italic">ยังไม่ได้เข้าสู่ระบบ</span>
            )}
          </div>
          {user?.uid && (
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>User UID:</span>
              <span className="truncate max-w-[180px]">{user.uid}</span>
            </div>
          )}
          {user && (
            <div className="pt-1.5 border-t border-slate-800/60 flex justify-end">
              <button
                type="button"
                onClick={handleRecheck}
                disabled={isVerifying || isAccessLoading}
                className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
              >
                <span>🔄</span>
                <span>{isVerifying || isAccessLoading ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสิทธิ์อีกครั้ง'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Tester Code / ID Form */}
        <form onSubmit={handleApplyCode} className="space-y-3">
          <label className="block text-xs font-bold text-slate-300">
            กรอกอีเมล Google หรือ Tester ID ที่ได้รับอนุญาต:
          </label>
          <div className="flex gap-2">
            <input
              id="playmat-tester-key-input"
              data-testid="playmat-tester-key-input"
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="เช่น yourname@gmail.com หรือ Tester ID"
              className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
            />
            <button
              id="playmat-tester-key-submit"
              data-testid="playmat-tester-key-submit"
              type="submit"
              disabled={isVerifying || isAccessLoading}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer"
            >
              {isVerifying ? 'ตรวจ...' : 'ยืนยัน'}
            </button>
          </div>
        </form>

        {/* Feedback alerts */}
        {errorMsg && (
          <div
            id="playmat-access-error"
            data-testid="playmat-access-error"
            className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs text-center"
          >
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div
            id="playmat-access-success"
            className="p-3 bg-emerald-950/70 border border-emerald-800 rounded-xl text-emerald-300 text-xs text-center"
          >
            {successMsg}
          </div>
        )}

        {/* Secondary actions: Google sign-in & Back */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          {!user && (
            <button
              type="button"
              onClick={handleSignInGoogle}
              disabled={isSigningIn}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              <span>🔑</span>
              <span>{isSigningIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google เพื่อตรวจสิทธิ์'}</span>
            </button>
          )}

          <button
            id="playmat-gate-back-btn"
            data-testid="playmat-gate-back-btn"
            type="button"
            onClick={onBack}
            className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white font-bold rounded-xl text-xs border border-slate-800 transition text-center cursor-pointer"
          >
            ← กลับสู่หน้าหลัก (สมุดสะสม/จัดเด็ค)
          </button>
        </div>
      </div>
    </div>
  );
};
