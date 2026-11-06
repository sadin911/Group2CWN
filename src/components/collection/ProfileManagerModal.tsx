import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useCollectionStore } from '../../store/collectionStore';

interface Props {
  onClose: () => void;
}

const PROFILE_ICONS = ['🎴', '📁', '⭐', '🔥', '⚡', '💧', '🌿', '🔮', '🐉', '🏆', '💎', '📦'];

export function ProfileManagerModal({ onClose }: Props) {
  const profiles = useCollectionStore((s) => s.profiles);
  const activeProfileId = useCollectionStore((s) => s.activeProfileId);
  const createProfile = useCollectionStore((s) => s.createProfile);
  const switchProfile = useCollectionStore((s) => s.switchProfile);
  const renameProfile = useCollectionStore((s) => s.renameProfile);
  const deleteProfile = useCollectionStore((s) => s.deleteProfile);

  const [isCreating, setIsCreating] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🎴');
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const profileList = Object.values(profiles);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    createProfile(newProfileName.trim(), selectedIcon);
    setNewProfileName('');
    setIsCreating(false);
  };

  const startEdit = (id: string, currentName: string) => {
    setEditingProfileId(id);
    setEditName(currentName);
  };

  const handleSaveRename = (id: string) => {
    if (editName.trim()) {
      renameProfile(id, editName.trim());
    }
    setEditingProfileId(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (profileList.length <= 1) {
      alert('ไม่สามารถลบโปรไฟล์สุดท้ายได้');
      return;
    }
    if (confirm(`คุณต้องการลบโปรไฟล์ "${name}" และข้อมูลการ์ดทั้งหมดในโปรไฟล์นี้ใช่หรือไม่?`)) {
      deleteProfile(id);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📁</span>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">จัดการโปรไฟล์สะสม (Accounts / Binders)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">แยกสมุดสะสมการ์ดได้หลายเล่มบนเครื่องนี้</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 text-slate-700 dark:text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-black border border-slate-300 dark:border-slate-700 hover:border-rose-400 shadow-sm transition-all active:scale-95 group"
            title="ปิดหน้าต่าง (ESC)"
          >
            <span className="text-sm font-black group-hover:rotate-90 transition-transform">✕</span>
            <span>ปิด</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Profile List */}
          <div className="space-y-2">
            {profileList.map((p) => {
              const isActive = p.id === activeProfileId;
              const cardCount = Object.keys(p.cards || {}).length;
              const totalItems = Object.values(p.cards || {}).reduce(
                (sum, c) => sum + Object.values(c.variants || {}).reduce((a, b) => a + b, 0),
                0
              );

              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/50 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-2xl">{p.icon || '🎴'}</span>
                    <div className="min-w-0 flex-1">
                      {editingProfileId === p.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(p.id);
                              if (e.key === 'Escape') setEditingProfileId(null);
                            }}
                            className="bg-white dark:bg-slate-950 border border-amber-500/60 rounded px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none w-full max-w-[180px]"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveRename(p.id)}
                            className="px-2 py-1 rounded bg-amber-500 text-slate-950 text-xs font-bold"
                          >
                            บันทึก
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{p.name}</h3>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 text-[10px] font-bold">
                              ใช้งานอยู่
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {cardCount.toLocaleString()} แบบการ์ด · รวม {totalItems.toLocaleString()} ใบ
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 ml-2">
                    {!isActive && (
                      <button
                        onClick={() => {
                          switchProfile(p.id);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all"
                      >
                        สลับใช้งาน
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(p.id, p.name)}
                      className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-xs transition-all"
                      title="เปลี่ยนชื่อโปรไฟล์"
                    >
                      ✏️
                    </button>
                    {profileList.length > 1 && (
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-500/20 hover:bg-rose-200 dark:hover:bg-rose-500/40 text-rose-700 dark:text-rose-300 text-xs transition-all"
                        title="ลบโปรไฟล์นี้"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Create New Profile Form */}
          {isCreating ? (
            <form onSubmit={handleCreate} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-black text-slate-900 dark:text-slate-200 uppercase tracking-wider">
                สร้างโปรไฟล์ใหม่
              </h3>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-bold mb-1">
                  เลือกไอคอนโปรไฟล์
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {PROFILE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setSelectedIcon(icon)}
                      className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                        selectedIcon === icon
                          ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-400 scale-110 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 font-bold mb-1">
                  ชื่อโปรไฟล์ (เช่น คอลเลกชันการ์ดแรร์, สมุดของน้อง)
                </label>
                <input
                  type="text"
                  placeholder="พิมพ์ชื่อโปรไฟล์..."
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!newProfileName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20"
                >
                  สร้างโปรไฟล์
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => {
                setIsCreating(true);
                setNewProfileName('');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-dashed border-slate-300 dark:border-slate-600 transition-all flex items-center justify-center gap-1.5"
            >
              <span>➕</span>
              <span>เพิ่มโปรไฟล์ใหม่</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-slate-800 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white text-xs sm:text-sm font-black border border-slate-300 dark:border-slate-600 shadow-sm transition-all flex items-center gap-1.5"
          >
            <span>✕</span>
            <span>ปิดหน้าต่าง</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
