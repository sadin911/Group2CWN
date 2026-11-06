import React from 'react';

interface PWAInstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS: boolean;
  onNativeInstall?: () => void;
  canNativeInstall?: boolean;
}

export const PWAInstallGuideModal: React.FC<PWAInstallGuideModalProps> = ({
  isOpen,
  onClose,
  isIOS,
  onNativeInstall,
  canNativeInstall,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-slate-900 border border-purple-500/30 rounded-2xl p-6 shadow-2xl shadow-purple-950/50 text-white flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 shadow-lg shadow-purple-500/30">
              <img 
                src={`${import.meta.env.BASE_URL}pwa-192x192.png`} 
                alt="PokéCount Icon" 
                className="w-full h-full object-cover rounded-[10px]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-100">ติดตั้ง PokéCount App</h3>
              <p className="text-xs text-purple-300">ใช้งานแบบเต็มจอ รวดเร็ว ไม่ต้องพิมพ์เว็บ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Benefits banner */}
        <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-800/60 rounded-xl border border-slate-700/50 text-center text-xs">
          <div className="flex flex-col items-center gap-1">
            <span className="text-base">⚡</span>
            <span className="text-slate-300 font-medium">เปิดไวใน 1 วิ</span>
          </div>
          <div className="flex flex-col items-center gap-1 border-x border-slate-700/60 px-1">
            <span className="text-base">📱</span>
            <span className="text-slate-300 font-medium">เต็มจอ ไม่มีแถบเว็บ</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-base">☁️</span>
            <span className="text-slate-300 font-medium">ซิงค์การ์ดอัตโนมัติ</span>
          </div>
        </div>

        {/* Instructions based on platform */}
        {isIOS ? (
          <div className="space-y-3.5 text-sm">
            <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              วิธีติดตั้งบน iPhone / iPad (Safari)
            </div>
            <div className="flex items-start gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/30">
              <div className="w-6 h-6 rounded-full bg-purple-600/30 text-purple-300 flex items-center justify-center text-xs font-bold shrink-0">
                1
              </div>
              <div className="text-slate-300 text-xs leading-relaxed">
                แตะปุ่มแชร์ <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-700 font-medium text-white">⎋ Share</span> ที่แถบเมนูด้านล่างของ Safari
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/30">
              <div className="w-6 h-6 rounded-full bg-purple-600/30 text-purple-300 flex items-center justify-center text-xs font-bold shrink-0">
                2
              </div>
              <div className="text-slate-300 text-xs leading-relaxed">
                เลื่อนลงแล้วเลือก <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-700 font-medium text-white">➕ เพิ่มไปยังหน้าจอโฮม</span> (Add to Home Screen)
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/30">
              <div className="w-6 h-6 rounded-full bg-purple-600/30 text-purple-300 flex items-center justify-center text-xs font-bold shrink-0">
                3
              </div>
              <div className="text-slate-300 text-xs leading-relaxed">
                แตะ <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-purple-700 font-bold text-white">เพิ่ม (Add)</span> ที่มุมขวาบน เพื่อเริ่มใช้งานได้ทันที
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 text-sm">
            <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              วิธีติดตั้งบน Android / Chrome / Windows / Mac
            </div>

            {canNativeInstall && onNativeInstall ? (
              <button
                onClick={() => {
                  onNativeInstall();
                  onClose();
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                กดปุ่มนี้เพื่อติดตั้ง App ทันที
              </button>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-start gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/30">
                  <div className="w-6 h-6 rounded-full bg-purple-600/30 text-purple-300 flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </div>
                  <div className="text-slate-300 text-xs leading-relaxed">
                    แตะที่เมนู <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-700 font-bold text-white">⋮ 3 จุด</span> ที่มุมขวาบนของเบราว์เซอร์
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-700/30">
                  <div className="w-6 h-6 rounded-full bg-purple-600/30 text-purple-300 flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </div>
                  <div className="text-slate-300 text-xs leading-relaxed">
                    เลือก <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-700 font-bold text-white">📲 ติดตั้งแอป (Install App)</span> หรือ <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-700 font-bold text-white">เพิ่มลงในหน้าจอหลัก</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Action */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
          >
            เข้าใจแล้ว / ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
