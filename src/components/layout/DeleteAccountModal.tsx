import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const user = useAuthStore((s) => s.user);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      const success = await deleteAccount();
      if (success) {
        onClose();
      } else {
        setErrorMsg('ไม่สามารถลบบัญชีได้ กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการลบบัญชี');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-200">
        <div className="flex items-center gap-3 text-rose-400">
          <span className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xl">
            ⚠️
          </span>
          <div>
            <h2 id="delete-account-title" className="text-base font-black text-white">
              ยืนยันการลบบัญชีและข้อมูล
            </h2>
            <p className="text-xs text-slate-400">Delete Account & Cloud Data</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs space-y-1">
          <p className="text-slate-400">บัญชีที่จะลบ:</p>
          <p className="font-bold text-white truncate">{user.email || user.displayName || user.uid}</p>
        </div>

        <div className="space-y-2 text-xs text-slate-300">
          <p className="font-bold text-slate-200">การดำเนินการนี้จะลบข้อมูลต่อไปนี้อย่างถาวร:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
            <li>สมุดสะสมการ์ดและการครอบครองทั้งหมดที่บันทึกบน Cloud</li>
            <li>เด็คทั้งหมดที่จัดเก็บไว้บนเซิร์ฟเวอร์</li>
            <li>ประวัติและข้อมูลโปรไฟล์ผู้ใช้งานในระบบ</li>
            <li>ตัดการเชื่อมต่อกับบัญชี Google และออกจากระบบทันที</li>
          </ul>
          <p className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/40 text-rose-300 text-[11px] font-medium">
            ⚠️ ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้อีก ไม่ว่ากรณีใดก็ตาม
          </p>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleDelete}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {isDeleting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>กำลังลบบัญชี...</span>
              </>
            ) : (
              <span>ยืนยันลบบัญชีของฉัน</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
