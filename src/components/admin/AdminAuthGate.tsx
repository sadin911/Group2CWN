import { useState, useEffect, type ReactNode } from 'react';
import { useAuthStore } from '../../store/authStore';
import { isAdminEmail, verifyAdminPasskey } from '../../utils/adminAuth';

interface AdminAuthGateProps {
  children: ReactNode;
  onExit?: () => void;
}

const SESSION_PASSKEY_STORAGE_KEY = 'pokecount_admin_session_auth';

export function AdminAuthGate({ children, onExit }: AdminAuthGateProps) {
  const user = useAuthStore((s) => s.user);
  const signIn = useAuthStore((s) => s.signIn);
  const authLoading = useAuthStore((s) => s.loading);

  const [passkeyInput, setPasskeyInput] = useState('');
  const [passkeyError, setPasskeyError] = useState(false);
  const [isPasskeyAuthorized, setIsPasskeyAuthorized] = useState(false);

  // Check persisted passkey session
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_PASSKEY_STORAGE_KEY);
      if (stored && verifyAdminPasskey(stored)) {
        setIsPasskeyAuthorized(true);
      }
    } catch {
      // sessionStorage might be restricted
    }
  }, []);

  const isEmailAdmin = isAdminEmail(user?.email);
  const isAuthorized = isEmailAdmin || isPasskeyAuthorized;

  const handlePasskeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminPasskey(passkeyInput)) {
      setPasskeyError(false);
      setIsPasskeyAuthorized(true);
      try {
        sessionStorage.setItem(SESSION_PASSKEY_STORAGE_KEY, passkeyInput);
      } catch {
        // Ignore
      }
    } else {
      setPasskeyError(true);
    }
  };

  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-3xl shadow-lg shadow-amber-500/10">
            🛡️
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            PokéCount Admin Access
          </h1>
          <p className="text-xs text-slate-400">
            เข้าสู่ระบบด้วย Google Account ของผู้ดูแล หรือกรอกรหัสผ่านลับ (Admin Passkey)
          </p>
        </div>

        {/* Option 1: Google OAuth */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => signIn()}
            disabled={authLoading}
            className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center justify-center gap-3 border border-slate-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>เข้าสู่ระบบด้วย Google (Admin)</span>
          </button>
          {user && !isEmailAdmin && (
            <p className="text-[11px] text-rose-400 text-center font-medium">
              อีเมล <span className="underline">{user.email}</span> ไม่ได้อยู่ในรายชื่อผู้ดูแล
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px bg-slate-800 flex-1" />
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            หรือใช้รหัสผ่าน
          </span>
          <div className="h-px bg-slate-800 flex-1" />
        </div>

        {/* Option 2: Passkey Form */}
        <form onSubmit={handlePasskeySubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1.5">
              Admin Passkey
            </label>
            <input
              type="password"
              placeholder="กรอกรหัสผ่านลับผู้ดูแล..."
              value={passkeyInput}
              onChange={(e) => {
                setPasskeyInput(e.target.value);
                setPasskeyError(false);
              }}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all shadow-inner"
            />
          </div>

          {passkeyError && (
            <p className="text-[11px] text-rose-400 font-medium">
              รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง
            </p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition-all shadow-md active:scale-95"
          >
            ปลดล็อกระบบ Admin
          </button>
        </form>

        {/* Exit Button */}
        {onExit && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onExit}
              className="text-xs text-slate-500 hover:text-slate-300 font-medium transition-colors"
            >
              ← กลับสู่หน้าหลัก
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
