import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useCollectionStore } from '../../store/collectionStore';
import { parseCollectionText } from '../../utils/collectionTextParser';
import { parseExcelOrCsvData, type CollectionExcelParseResult } from '../../utils/collectionExcelParser';
import { resolveCardImageUrl } from '../../utils/cardImage';
import { CardCameraScannerModal } from './CardCameraScannerModal';
import { VoiceCardCollectorTab } from './VoiceCardCollectorTab';
import pokemonCardData from '../../data/pokemonNames.json';
import type { CardVariantKey } from '../../types/collection';

interface Props {
  onClose: () => void;
  initialTab?: 'excel' | 'text' | 'voice' | 'camera';
}

const STORAGE_KEY_TEXT = 'pokecount_import_draft_text';
const STORAGE_KEY_TAB = 'pokecount_import_active_tab';
const STORAGE_KEY_BINDER = 'pokecount_import_target_binder';
const STORAGE_KEY_MODE = 'pokecount_import_mode';
const STORAGE_KEY_FINISH = 'pokecount_import_finish';

// Feature flag: ปิดใช้งานกล้องชั่วคราวตามคำขอของผู้ใช้ (เก็บโค้ดไว้ไม่ลบ)
const ENABLE_CAMERA_SCANNER = false;

const EXAMPLE_TEXT = `Set SC1a
1,3
20,5
21

ชุด SV8
10,2
11`;

export function CollectionTextImportModal({ onClose, initialTab }: Props) {
  const profiles = useCollectionStore((s) => s.profiles);
  const activeProfileId = useCollectionStore((s) => s.activeProfileId);
  const importCollectionText = useCollectionStore((s) => s.importCollectionText);
  const importCollectionParsedCards = useCollectionStore((s) => s.importCollectionParsedCards);

  // Restore draft state from localStorage
  const [activeTab, setActiveTab] = useState<'excel' | 'text' | 'voice' | 'camera'>(() => {
    if (initialTab) return initialTab;
    const saved = localStorage.getItem(STORAGE_KEY_TAB);
    return saved === 'excel' || saved === 'text' || saved === 'voice' || saved === 'camera' ? saved : 'text';
  });

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const [text, setText] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_TEXT) || '';
  });

  const [targetBinderId, setTargetBinderId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_BINDER);
    return saved && profiles[saved] ? saved : activeProfileId;
  });

  const [mode, setMode] = useState<'merge' | 'replace'>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MODE);
    return saved === 'replace' ? 'replace' : 'merge';
  });

  const [finish, setFinish] = useState<CardVariantKey>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_FINISH) as CardVariantKey;
    return saved || 'normal';
  });

  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [showUnmatched, setShowUnmatched] = useState(false);

  // Excel / CSV File state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [excelResult, setExcelResult] = useState<CollectionExcelParseResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Camera Scanner Modal
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TAB, activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TEXT, text);
  }, [text]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BINDER, targetBinderId);
  }, [targetBinderId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MODE, mode);
  }, [mode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FINISH, finish);
  }, [finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Live text preview as the user types or pastes
  const textPreview = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    return parseCollectionText(trimmed, pokemonCardData as any[]);
  }, [text]);

  const handleApplyExample = () => {
    setText(EXAMPLE_TEXT);
    setStatus(null);
  };

  const handleClearDraft = () => {
    if (confirm('คุณต้องการล้างข้อมูลที่กรอกไว้ทั้งหมดใช่หรือไม่?')) {
      setText('');
      setExcelFile(null);
      setExcelResult(null);
      setStatus(null);
      localStorage.removeItem(STORAGE_KEY_TEXT);
    }
  };

  // Handle Excel/CSV File Parse
  const processExcelFile = async (file: File) => {
    setStatus(null);
    setIsParsingExcel(true);
    setExcelFile(file);

    try {
      const buffer = await file.arrayBuffer();
      const result = await parseExcelOrCsvData(buffer, pokemonCardData as any[]);
      setExcelResult(result);
    } catch (err: any) {
      setStatus({ ok: false, message: `เกิดข้อผิดพลาดในการอ่านไฟล์: ${err.message || 'Invalid File'}` });
      setExcelResult(null);
    } finally {
      setIsParsingExcel(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  const handleImportText = () => {
    setStatus(null);
    if (!text.trim()) {
      setStatus({ ok: false, message: 'กรุณาระบุรายการการ์ดก่อน' });
      return;
    }

    const res = importCollectionText(text, {
      mode,
      finish,
      profileId: targetBinderId,
    });

    setStatus({ ok: res.success, message: res.message });
    if (res.success) {
      localStorage.removeItem(STORAGE_KEY_TEXT);
      setTimeout(() => {
        onClose();
      }, 1600);
    }
  };

  const handleImportExcel = () => {
    setStatus(null);
    if (!excelResult || excelResult.cards.length === 0) {
      setStatus({ ok: false, message: 'ไม่มีรายการการ์ดที่พบในไฟล์' });
      return;
    }

    const list = excelResult.cards.map((c) => ({
      cardId: c.cardId,
      quantity: c.quantity,
      variant: c.variant || finish,
    }));

    const res = importCollectionParsedCards(list, {
      mode,
      defaultFinish: finish,
      profileId: targetBinderId,
    });

    setStatus({ ok: res.success, message: res.message });
    if (res.success) {
      setTimeout(() => {
        onClose();
      }, 1600);
    }
  };

  const handleVoiceImport = (
    cards: Array<{ cardId: string; quantity: number; variant: CardVariantKey }>
  ) => {
    setStatus(null);
    if (cards.length === 0) {
      setStatus({ ok: false, message: 'ไม่มีรายการการ์ดที่ต้องการนำเข้า' });
      return;
    }

    const list = cards.map((c) => ({
      cardId: c.cardId,
      quantity: c.quantity,
      variant: c.variant || finish,
    }));

    const res = importCollectionParsedCards(list, {
      mode,
      defaultFinish: finish,
      profileId: targetBinderId,
    });

    setStatus({ ok: res.success, message: res.message });
    if (res.success) {
      setTimeout(() => {
        onClose();
      }, 1600);
    }
  };

  const handleDownloadSampleExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const sampleData = [
        { 'Set': 'SV8a', 'Number': '025/187', 'Quantity': 4, 'Variant': 'Normal' },
        { 'Set': 'SV8a', 'Number': '120/187', 'Quantity': 2, 'Variant': 'Holo' },
        { 'Set': 'SC1a', 'Number': '001', 'Quantity': 1, 'Variant': 'Normal' },
        { 'Set': 'SC1a', 'Number': '020', 'Quantity': 3, 'Variant': 'Reverse' },
        { 'Set': 'SV-P', 'Number': '001', 'Quantity': 1, 'Variant': 'Promo' },
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Cards');
      XLSX.writeFile(wb, 'pokemon_cards_sample.xlsx');
    } catch {
      window.open('/sample_cards.xlsx', '_blank');
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = 'Set,Number,Quantity,Variant\nSV8a,025/187,4,Normal\nSV8a,120/187,2,Holo\nSC1a,001,1,Normal\nSC1a,020,3,Reverse\nSV-P,001,1,Promo\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pokemon_cards_sample.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const binderList = Object.values(profiles);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-fade-in"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="collection-import-modal"
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl overflow-hidden transition-colors"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 dark:from-yellow-400 dark:to-amber-500 flex items-center justify-center text-white dark:text-slate-950 text-xl font-bold shadow-md">
              📥
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                ศูนย์นำเข้าการ์ด (Card Text Import & Excel / CSV)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                เพิ่มการ์ดเข้าคลังผ่านไฟล์ Excel/CSV, ข้อความ หรือสแกนกล้อง OCR
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {(text || excelResult) && (
              <button
                type="button"
                onClick={handleClearDraft}
                className="px-2.5 py-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10 text-xs font-bold transition-colors"
                title="ล้างข้อมูลที่กรอกไว้ทั้งหมด"
              >
                ล้างฟอร์ม
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 flex items-center justify-center transition-colors text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 px-6 pt-3 pb-1 border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/30 text-xs font-black">
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            data-testid="voice-tab-button"
            className={`px-3.5 py-2 rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'voice'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>🎙️</span>
            <span>ด้วยเสียง / Voice</span>
            <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase">
              Live
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('excel')}
            className={`px-3.5 py-2 rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'excel'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>📊</span>
            <span>Excel / CSV</span>
            {excelResult && excelResult.cards.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`px-3.5 py-2 rounded-t-xl border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'text'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>📝</span>
            <span>ข้อความ / Text</span>
            {text.trim().length > 0 && (
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
            )}
          </button>

          {ENABLE_CAMERA_SCANNER && (
            <button
              type="button"
              onClick={() => setShowCameraScanner(true)}
              className="px-3.5 py-2 rounded-t-xl border-b-2 border-transparent text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all flex items-center gap-1.5 ml-auto"
            >
              <span>📷</span>
              <span>สแกนกล้องสด (OCR)</span>
              <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-[9px] font-black uppercase">Live</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto scrollbar-thin space-y-4">
          {/* Target Binder, Mode, Variant */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
            {/* Target Binder */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">สมุดสะสมเป้าหมาย:</label>
              <select
                value={targetBinderId}
                onChange={(e) => setTargetBinderId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {binderList.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.icon ?? '🎴'} {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">รูปแบบการนำเข้า:</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as 'merge' | 'replace')}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="merge">➕ เพิ่มต่อจากเดิม (Merge)</option>
                <option value="replace">🔄 แทนที่จำนวนเดิม (Replace)</option>
              </select>
            </div>

            {/* Default Variant / Finish */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">ชนิดเริ่มต้น (Variant):</label>
              <select
                value={finish}
                onChange={(e) => setFinish(e.target.value as CardVariantKey)}
                className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <option value="normal">✨ Normal (ธรรมดา)</option>
                <option value="holo">🌟 Holo (โฮโล)</option>
                <option value="reverse">💫 Reverse Holo (เรเวิร์ส)</option>
                <option value="promo">🎁 Promo (โปรโม)</option>
              </select>
            </div>
          </div>

          {/* TAB 0: VOICE INPUT */}
          {activeTab === 'voice' && (
            <VoiceCardCollectorTab
              catalog={pokemonCardData as any[]}
              defaultFinish={finish}
              targetBinderName={profiles[targetBinderId]?.name}
              onImportCards={handleVoiceImport}
              onCopyToTextTab={(copied) => {
                setText((prev) => (prev ? `${prev}\n\n${copied}` : copied));
                setActiveTab('text');
              }}
            />
          )}

          {/* TAB 1: EXCEL / CSV */}
          {activeTab === 'excel' && (
            <div className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all text-center cursor-pointer ${
                  isDragOver
                    ? 'border-amber-500 bg-amber-500/10 scale-[1.01]'
                    : 'border-slate-300 dark:border-slate-700 hover:border-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) processExcelFile(f);
                  }}
                  className="hidden"
                />

                <div className="space-y-2">
                  <span className="text-4xl block">📊</span>
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    {excelFile ? (
                      <span className="text-amber-600 dark:text-amber-400">📄 {excelFile.name}</span>
                    ) : (
                      'ลากไฟล์ Excel (.xlsx, .xls) หรือ CSV (.csv) มาวางที่นี่'
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    หรือคลิกเพื่อเลือกไฟล์จากคอมพิวเตอร์ / สมาร์ตโฟน
                  </p>
                </div>
              </div>

              {/* Format Hint & Template Download */}
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">💡 รูปแบบคอลัมน์ที่รองรับอัตโนมัติ:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleDownloadSampleExcel}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition-all flex items-center gap-1"
                    >
                      <span>📥</span>
                      <span>โหลดตัวอย่าง Excel (.xlsx)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSampleCsv}
                      className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-[11px] shadow-sm transition-all flex items-center gap-1"
                    >
                      <span>📄</span>
                      <span>โหลดตัวอย่าง CSV (.csv)</span>
                    </button>
                  </div>
                </div>
                <p>
                  คอลัมน์ <code className="font-mono text-amber-600 dark:text-amber-400">Set</code> (เช่น SV8a, SC1a) +{' '}
                  <code className="font-mono text-amber-600 dark:text-amber-400">Number</code> (เช่น 025/187 หรือ 25) +{' '}
                  <code className="font-mono text-amber-600 dark:text-amber-400">Quantity</code> (จำนวน) หรือ{' '}
                  <code className="font-mono text-amber-600 dark:text-amber-400">Variant</code> (Normal, Holo, Reverse, Promo)
                </p>
              </div>

              {/* Excel Parse Loading */}
              {isParsingExcel && (
                <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                  <span className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin inline-block" />
                  <p>กำลังอ่านข้อมูลในไฟล์...</p>
                </div>
              )}

              {/* Excel Live Preview */}
              {excelResult && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <span>✓</span> ผลการอ่านไฟล์:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-extrabold">
                        {excelResult.totalQuantity} ใบ (copies)
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                        {excelResult.distinctCardsCount} รายการ
                      </span>
                      {excelResult.setsFound.length > 0 && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold">
                          ชุด: {excelResult.setsFound.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Table Preview */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-56 overflow-y-auto scrollbar-thin text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 dark:bg-slate-950 sticky top-0 border-b border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
                        <tr>
                          <th className="p-2.5">การ์ด</th>
                          <th className="p-2.5">ชุด / เลข</th>
                          <th className="p-2.5 text-center">ชนิด</th>
                          <th className="p-2.5 text-right">จำนวน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {excelResult.cards.map((item, idx) => {
                          const img = resolveCardImageUrl(item.card.imageUrl);
                          return (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="p-2 flex items-center gap-2">
                                <div className="w-6 h-8 rounded bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0">
                                  {img && (
                                    <img src={img} alt={item.card.name} className="w-full h-full object-cover" />
                                  )}
                                </div>
                                <span className="font-bold truncate max-w-[160px]">{item.card.name}</span>
                              </td>
                              <td className="p-2 font-mono font-bold text-amber-600 dark:text-amber-400">
                                {item.setCode} #{item.collectorNumber}
                              </td>
                              <td className="p-2 text-center">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold">
                                  {item.variant}
                                </span>
                              </td>
                              <td className="p-2 text-right font-black text-slate-900 dark:text-white">
                                ×{item.quantity}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Unmatched Rows */}
                  {excelResult.unmatchedRows.length > 0 && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span>⚠️ ไม่พบการ์ด {excelResult.unmatchedRows.length} แถวในไฟล์:</span>
                        <button
                          type="button"
                          onClick={() => setShowUnmatched((v) => !v)}
                          className="underline text-rose-600 dark:text-rose-400 font-bold"
                        >
                          {showUnmatched ? 'ซ่อน' : 'ดูรายละเอียด'}
                        </button>
                      </div>
                      {showUnmatched && (
                        <ul className="list-disc pl-4 space-y-1 text-[11px] opacity-90 max-h-28 overflow-y-auto">
                          {excelResult.unmatchedRows.map((u, i) => (
                            <li key={i}>แถวที่ {u.rowNumber}: {u.reason}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TEXT INPUT */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              {/* Format Guide */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <span>📋</span> รูปแบบที่รองรับ (Format Guide):
                  </span>
                  <button
                    type="button"
                    onClick={handleApplyExample}
                    className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-bold flex items-center gap-1"
                  >
                    ใส่ตัวอย่าง (Insert Example)
                  </button>
                </div>
                <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed">
                  ขึ้นต้นด้วยรหัสชุด เช่น <code className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-black/40 text-amber-600 dark:text-amber-300 font-mono font-bold">Set SC1a</code> หรือ <code className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-black/40 text-amber-600 dark:text-amber-300 font-mono font-bold">ชุด SV8</code> แล้วตามด้วยบรรทัด{' '}
                  <code className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-black/40 text-amber-600 dark:text-amber-300 font-mono font-bold">&lt;เลขการ์ด&gt;,&lt;จำนวน&gt;</code> หรือสามารถวางข้อความ JSON ส่งออกจาก Pokillionaire ได้โดยตรง (ระบบบันทึกแบบร่างอัตโนมัติ)
                </p>
              </div>

              {/* Textarea Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-bold">
                  <span>รายการการ์ด (Card List Input):</span>
                  {text && (
                    <button
                      type="button"
                      onClick={() => {
                        setText('');
                        setStatus(null);
                      }}
                      className="text-rose-500 hover:text-rose-400 text-xs font-bold"
                    >
                      ล้างข้อความ (Clear)
                    </button>
                  )}
                </div>
                <textarea
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setStatus(null);
                  }}
                  rows={8}
                  placeholder={`Set SC1a\n1,3\n20,5\n21\n\nชุด SV8\n10,2`}
                  className="w-full p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 scrollbar-thin focus:outline-none focus:ring-2 focus:ring-amber-500/50 leading-relaxed"
                />
              </div>

              {/* Live Preview Stats */}
              {textPreview && (
                <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 space-y-2.5 animate-fade-in text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <span>🔍</span> ตรวจพบขณะนี้ (Live Parse Preview):
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-extrabold">
                        {textPreview.totalQuantity} ใบ (copies)
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                        {textPreview.distinctCardsCount} แบบ
                      </span>
                      {textPreview.setsFound.length > 0 && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-800 dark:text-amber-200 font-bold">
                          ชุด: {textPreview.setsFound.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Unmatched Lines Warning */}
                  {textPreview.unmatchedLines.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold">
                        <span>⚠️ ข้าม {textPreview.unmatchedLines.length} บรรทัดที่ไม่สามารถประมวลผลได้:</span>
                        <button
                          type="button"
                          onClick={() => setShowUnmatched((v) => !v)}
                          className="underline text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 font-bold"
                        >
                          {showUnmatched ? 'ซ่อน' : 'ดูรายละเอียด'}
                        </button>
                      </div>
                      {showUnmatched && (
                        <ul className="list-disc pl-4 space-y-1 text-[11px] opacity-90 max-h-28 overflow-y-auto">
                          {textPreview.unmatchedLines.map((u, i) => (
                            <li key={i}>{u}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status Message */}
          {status && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold ${
                status.ok
                  ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-300'
              }`}
            >
              {status.ok ? '✓ ' : '✕ '}
              {status.message}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 shrink-0">
          <div className="text-slate-400 text-[11px]">
            {activeTab === 'voice' && (
              <span className="text-xs text-indigo-500 dark:text-indigo-400 font-bold hidden sm:inline">
                🎙️ สั่งการ์ดด้วยเสียงแล้วกดยืนยันนำเข้าได้เลย
              </span>
            )}
            {activeTab === 'excel' && excelResult && (
              <span>พร้อมนำเข้า {excelResult.totalQuantity} ใบ</span>
            )}
            {activeTab === 'text' && textPreview && (
              <span>พร้อมนำเข้า {textPreview.totalQuantity} ใบ</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
            >
              ปิด (Close)
            </button>

            {activeTab === 'excel' && (
              <button
                type="button"
                onClick={handleImportExcel}
                disabled={!excelResult || excelResult.totalQuantity === 0}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 active:scale-95 text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
              >
                <span>📥</span>
                <span>นำเข้า {excelResult && excelResult.totalQuantity > 0 ? `${excelResult.totalQuantity} ใบ` : 'ไฟล์'}</span>
              </button>
            )}

            {activeTab === 'text' && (
              <button
                type="button"
                onClick={handleImportText}
                disabled={!textPreview || textPreview.totalQuantity === 0}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:brightness-110 active:scale-95 text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-500/20 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
              >
                <span>📥</span>
                <span>นำเข้า {textPreview && textPreview.totalQuantity > 0 ? `${textPreview.totalQuantity} ใบ` : 'การ์ด'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Camera OCR Scanner Fullscreen Modal */}
      {ENABLE_CAMERA_SCANNER && showCameraScanner && (
        <CardCameraScannerModal
          initialBinderId={targetBinderId}
          onClose={() => setShowCameraScanner(false)}
        />
      )}
    </div>,
    document.body
  );
}
