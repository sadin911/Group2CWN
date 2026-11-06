import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useCollectionStore } from '../../store/collectionStore';
import { isPokillionaireFormat, parsePokillionaireExport } from '../../utils/pokillionaireParser';
import pokemonCardData from '../../data/pokemonNames.json';

interface Props {
  onClose: () => void;
  onOpenTextImport?: () => void;
}

export function CollectionBackupModal({ onClose, onOpenTextImport }: Props) {
  const exportCollectionJSON = useCollectionStore((s) => s.exportCollectionJSON);
  const importCollectionJSON = useCollectionStore((s) => s.importCollectionJSON);
  const activeProfileId = useCollectionStore((s) => s.activeProfileId);
  const profiles = useCollectionStore((s) => s.profiles);

  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importText, setImportText] = useState('');
  const [pokillionaireMode, setPokillionaireMode] = useState<'merge' | 'new_profile' | 'replace'>('merge');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const activeProfile = profiles[activeProfileId];

  const detectedPokillionaire = useMemo(() => {
    const trimmed = importText.trim();
    if (!trimmed.startsWith('{')) return null;
    try {
      const data = JSON.parse(trimmed);
      if (isPokillionaireFormat(data)) {
        return parsePokillionaireExport(data, pokemonCardData as any[]);
      }
    } catch {
      return null;
    }
    return null;
  }, [importText]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const jsonString = exportCollectionJSON();

  const handleDownload = () => {
    try {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `pokecount-collection-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatusMessage({ type: 'success', text: 'ดาวน์โหลดไฟล์สำรองเรียบร้อยแล้ว!' });
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการดาวน์โหลดไฟล์' });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!importText.trim()) {
      setStatusMessage({ type: 'error', text: 'กรุณาวางโค้ด JSON หรืออัปโหลดไฟล์' });
      return;
    }

    if (detectedPokillionaire) {
      const modeText =
        pokillionaireMode === 'new_profile'
          ? 'สร้างสมุดสะสมใหม่'
          : pokillionaireMode === 'replace'
          ? 'แทนที่การ์ดในสมุดสะสมปัจจุบัน'
          : `รวมการ์ดเข้ากับสมุด "${activeProfile?.name || 'สมุดหลัก'}"`;

      if (
        confirm(
          `ต้องการดำเนินการ "${modeText}" จากไฟล์ Pokillionaire จำนวน ${detectedPokillionaire.totalQuantityCount} ใบ หรือไม่?`
        )
      ) {
        const res = importCollectionJSON(importText, {
          mode: pokillionaireMode,
          profileId: activeProfileId,
        });
        if (res.success) {
          setStatusMessage({ type: 'success', text: res.message });
          setImportText('');
          setTimeout(() => onClose(), 1800);
        } else {
          setStatusMessage({ type: 'error', text: res.message });
        }
      }
      return;
    }

    if (confirm('การนำเข้าข้อมูลจะเพิ่มหรือแทนที่โปรไฟล์ที่มีรหัสตรงกัน ต้องการดำเนินการต่อหรือไม่?')) {
      const res = importCollectionJSON(importText);
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
        setImportText('');
        setTimeout(() => onClose(), 1500);
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 dark:bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💾</span>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">สำรองและกู้คืนข้อมูล (Backup / Restore)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">ย้ายข้อมูลคอลเลกชันข้ามเครื่อง หรือเซฟเก็บไว้</p>
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

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 px-5 pt-2">
          <button
            onClick={() => {
              setActiveTab('export');
              setStatusMessage(null);
            }}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'export'
                ? 'border-amber-500 text-amber-700 dark:text-amber-400 font-black'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            📤 ส่งออกข้อมูล (Export)
          </button>
          <button
            onClick={() => {
              setActiveTab('import');
              setStatusMessage(null);
            }}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'import'
                ? 'border-indigo-500 text-indigo-700 dark:text-indigo-400 font-black'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            📥 นำเข้าข้อมูล (Import)
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`mx-5 mt-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40'
                : 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40'
            }`}
          >
            <span>{statusMessage.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'export' ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                ข้อมูลคอลเลกชันของคุณทั้งหมด (ทุกโปรไฟล์และจำนวนการ์ด) จะถูกรวมเป็นไฟล์ JSON เพื่อดาวน์โหลดหรือคัดลอก:
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>📥</span>
                  <span>ดาวน์โหลดไฟล์ .json</span>
                </button>
                <button
                  onClick={handleCopy}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-300 dark:border-slate-600 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>{copied ? '✅' : '📋'}</span>
                  <span>{copied ? 'คัดลอกแล้ว!' : 'คัดลอก JSON'}</span>
                </button>
              </div>

              <div className="relative mt-2">
                <textarea
                  readOnly
                  value={jsonString}
                  rows={8}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-mono text-slate-600 dark:text-slate-400 focus:outline-none select-all"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {onOpenTextImport && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-amber-800 dark:text-amber-200">
                      ต้องการนำเข้าการ์ดด้วยรหัสชุดและหมายเลข?
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      เช่น Set SC1a, 1,3 หรือ ชุด SV8, 10,2
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenTextImport();
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 active:scale-95 text-slate-950 font-bold text-xs shrink-0 shadow-sm transition-all"
                  >
                    นำเข้าจากข้อความ
                  </button>
                </div>
              )}

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                อัปโหลดไฟล์สำรอง `.json` หรือวางโค้ด JSON ที่คัดลอกมาจากเครื่องอื่นเพื่อกู้คืนคอลเลกชัน:
              </p>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-bold">เลือกไฟล์จากเครื่อง</label>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 dark:file:bg-indigo-600/30 file:text-indigo-800 dark:file:text-indigo-300 hover:file:bg-indigo-200 file:cursor-pointer"
                />
              </div>

              <div className="relative">
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-bold">หรือวางข้อความ JSON ที่นี่</label>
                <textarea
                  placeholder='วางข้อมูล JSON หรือไฟล์ Pokillionaire ที่นี่...'
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={6}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-[11px] font-mono text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {detectedPokillionaire && (
                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-2.5 text-xs animate-fade-in">
                  <div className="flex items-center gap-2 font-bold text-indigo-900 dark:text-indigo-200">
                    <span className="text-lg">📦</span>
                    <div>
                      <p className="leading-tight">ตรวจพบไฟล์ส่งออกจาก Pokillionaire</p>
                      <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        พบการ์ดรวม {detectedPokillionaire.totalQuantityCount} ใบ ({detectedPokillionaire.distinctCardsCount} แบบ) ในชุด {detectedPokillionaire.setsFound.join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/40 space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      เลือกรูปแบบการนำเข้า:
                    </label>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-indigo-400 text-xs">
                        <input
                          type="radio"
                          name="pokillionaire-mode"
                          value="merge"
                          checked={pokillionaireMode === 'merge'}
                          onChange={() => setPokillionaireMode('merge')}
                          className="accent-indigo-600"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          รวมเข้ากับสมุดสะสมปัจจุบัน ({activeProfile?.name || 'สมุดหลัก'})
                        </span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-indigo-400 text-xs">
                        <input
                          type="radio"
                          name="pokillionaire-mode"
                          value="new_profile"
                          checked={pokillionaireMode === 'new_profile'}
                          onChange={() => setPokillionaireMode('new_profile')}
                          className="accent-indigo-600"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          สร้างเป็นสมุดสะสมใหม่ (Pokillionaire Import)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-indigo-400 text-xs">
                        <input
                          type="radio"
                          name="pokillionaire-mode"
                          value="replace"
                          checked={pokillionaireMode === 'replace'}
                          onChange={() => setPokillionaireMode('replace')}
                          className="accent-indigo-600"
                        />
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          แทนที่การ์ดทั้งหมดในสมุดสะสมปัจจุบัน
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 ${
                  detectedPokillionaire
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-indigo-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-indigo-600/30'
                }`}
              >
                <span>📥</span>
                <span>
                  {detectedPokillionaire
                    ? `นำเข้าจาก Pokillionaire (${detectedPokillionaire.totalQuantityCount} ใบ)`
                    : 'นำเข้าและกู้คืนข้อมูล (Import)'}
                </span>
              </button>
            </div>
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
