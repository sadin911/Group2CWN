import React, { useState } from 'react';
import type { BinderTheme, PocketSleeveStyle, BinderPocketLayout, CustomBinder } from '../../../types/binder';

export interface BinderSettingsModalProps {
  isOpen: boolean;
  binder: CustomBinder;
  onClose: () => void;
  onSave: (updates: Partial<CustomBinder>) => void;
  onDelete?: (binderId: string) => void;
}

const COVER_THEMES: { id: BinderTheme; labelTh: string; labelEn: string; colorClass: string }[] = [
  { id: 'black-leather', labelTh: 'หนังดำคลาสสิก', labelEn: 'Black Leather', colorClass: 'bg-neutral-900 border-neutral-700' },
  { id: 'brown-leather', labelTh: 'หนังน้ำตาลวินเทจ', labelEn: 'Vintage Brown', colorClass: 'bg-[#3d2317] border-amber-800' },
  { id: 'burgundy-leather', labelTh: 'หนังเบอร์กันดีพรีเมียม', labelEn: 'Royal Burgundy', colorClass: 'bg-[#4d0e18] border-rose-900' },
  { id: 'pokeball', labelTh: 'ลายโปเกบอล', labelEn: 'Poké Ball', colorClass: 'bg-gradient-to-b from-red-600 to-neutral-900 border-red-500' },
  { id: 'ultra-ball', labelTh: 'ลายอัลตร้าบอล', labelEn: 'Ultra Ball', colorClass: 'bg-neutral-900 border-amber-400' },
];

const SLEEVE_STYLES: { id: PocketSleeveStyle; labelTh: string; descTh: string; colorClass: string }[] = [
  { id: 'matte-black', labelTh: 'ซองดำด้าน (Matte Black)', descTh: 'เรียบหรู คมชัด สไตล์การ์ดสะสมมืออาชีพ', colorClass: 'bg-neutral-950 border-neutral-700' },
  { id: 'clear-gloss', labelTh: 'ซองใสเงา (Clear Gloss)', descTh: 'โปร่งใส สะท้อนแสงชัดเจน', colorClass: 'bg-neutral-900/60 border-cyan-400/50' },
  { id: 'holo-stars', labelTh: 'ซองโฮโลประกายรุ้ง (Holo Stars)', descTh: 'ขอบสีรุ้งเหลือบแสงระยิบระยับ', colorClass: 'bg-gradient-to-br from-amber-500/20 via-purple-500/20 to-cyan-500/20 border-purple-400/50' },
  { id: 'gold-border', labelTh: 'ซองขอบทองแชมเปียน (Gold Border)', descTh: 'ขอบทองคำเงางาม ระดับพรีเมียม', colorClass: 'bg-neutral-950 border-amber-400' },
  { id: 'none', labelTh: 'ไม่มีซอง (Standard Archival)', descTh: 'กระเป๋าพลาสติกใสพื้นหลังธรรมดา', colorClass: 'bg-neutral-900/40 border-neutral-800' },
];

const PRESET_LAYOUTS: {
  id: string;
  rows: number;
  cols: number;
  pockets: BinderPocketLayout;
  labelTh: string;
  descTh: string;
}[] = [
  { id: '2x2', rows: 2, cols: 2, pockets: 4, labelTh: '4 ช่อง (2x2)', descTh: '2 แถว × 2 คอลัมน์ สมุดพกพา' },
  { id: '3x3', rows: 3, cols: 3, pockets: 9, labelTh: '9 ช่อง (3x3)', descTh: '3 แถว × 3 คอลัมน์ มาตรฐาน TCG' },
  { id: '4x3', rows: 4, cols: 3, pockets: 12, labelTh: '12 ช่อง (4x3)', descTh: '4 แถว × 3 คอลัมน์ สมุดแนวตั้งยอดนิยม' },
  { id: '3x4', rows: 3, cols: 4, pockets: 12, labelTh: '12 ช่อง (3x4)', descTh: '3 แถว × 4 คอลัมน์ สมุดแนวกว้าง Pro' },
];

export function BinderSettingsModal({
  isOpen,
  binder,
  onClose,
  onSave,
  onDelete,
}: BinderSettingsModalProps) {
  const [name, setName] = useState(binder.name);
  const [description, setDescription] = useState(binder.description || '');
  const [coverTheme, setCoverTheme] = useState<BinderTheme>(binder.coverTheme);
  const [sleeveStyle, setSleeveStyle] = useState<PocketSleeveStyle>(binder.sleeveStyle);

  const initialCols = binder.gridCols || (binder.pocketsPerPage === 4 ? 2 : binder.pocketsPerPage === 12 ? 3 : 3);
  const initialRows = binder.gridRows || (binder.pocketsPerPage === 4 ? 2 : binder.pocketsPerPage === 12 ? 4 : 3);

  const [gridCols, setGridCols] = useState<number>(initialCols);
  const [gridRows, setGridRows] = useState<number>(initialRows);
  const pocketsPerPage = (gridRows * gridCols) as BinderPocketLayout;
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof PRESET_LAYOUTS[0]) => {
    setGridRows(preset.rows);
    setGridCols(preset.cols);
  };

  const handleSetRows = (rows: number) => {
    setGridRows(rows);
  };

  const handleSetCols = (cols: number) => {
    setGridCols(cols);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name: name.trim() || binder.name,
      description: description.trim(),
      coverTheme,
      sleeveStyle,
      pocketsPerPage,
      gridCols,
      gridRows,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-neutral-900 border border-white/10 shadow-2xl p-5 sm:p-6 text-white flex flex-col gap-5"
        role="dialog"
        aria-labelledby="binder-settings-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h2 id="binder-settings-title" className="text-lg font-bold text-white flex items-center gap-2">
              <span>⚙️</span> ตั้งค่าสมุดสะสมการ์ด
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              ปรับแต่งปกสมุด, ชนิดซองใส่การ์ด และจำนวนช่องต่อหน้า
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {/* Name & Description */}
          <div className="flex flex-col gap-3">
            <div>
              <label htmlFor="binder-name-input" className="block text-xs font-semibold text-neutral-300 mb-1">
                ชื่อสมุดสะสม
              </label>
              <input
                id="binder-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น My Favorite SARs, Charizard Shrine"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/15 focus:border-amber-400 focus:outline-none text-sm text-white placeholder-neutral-500"
                maxLength={60}
                required
              />
            </div>

            <div>
              <label htmlFor="binder-desc-input" className="block text-xs font-semibold text-neutral-300 mb-1">
                คำอธิบายเพิ่มเติม (ไม่บังคับ)
              </label>
              <input
                id="binder-desc-input"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="บันทึกรายละเอียดของสมุดเล่มนี้"
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-white/15 focus:border-amber-400 focus:outline-none text-sm text-white placeholder-neutral-500"
                maxLength={120}
              />
            </div>
          </div>

          {/* Cover Themes */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              ลายและสีปกสมุด (Leather Book Cover)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {COVER_THEMES.map((theme) => {
                const isSelected = coverTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setCoverTheme(theme.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_12px_rgba(251,191,36,0.15)] ring-1 ring-amber-400'
                        : 'border-white/10 hover:border-white/20 bg-neutral-950/60'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg border shadow-inner ${theme.colorClass}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white truncate">{theme.labelTh}</div>
                      <div className="text-[10px] text-neutral-400 truncate">{theme.labelEn}</div>
                    </div>
                    {isSelected && <span className="text-amber-400 text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sleeve Style */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">
              ชนิดซองใส่การ์ดในช่อง (Pocket Sleeve Style)
            </label>
            <div className="grid grid-cols-1 gap-2">
              {SLEEVE_STYLES.map((sleeve) => {
                const isSelected = sleeveStyle === sleeve.id;
                return (
                  <button
                    key={sleeve.id}
                    type="button"
                    onClick={() => setSleeveStyle(sleeve.id)}
                    className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_12px_rgba(251,191,36,0.15)] ring-1 ring-amber-400'
                        : 'border-white/10 hover:border-white/20 bg-neutral-950/60'
                    }`}
                  >
                    <div className={`w-7 h-9 rounded-md border shadow-md ${sleeve.colorClass} flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-white">{sleeve.labelTh}</div>
                      <div className="text-[10px] text-neutral-400 line-clamp-1">{sleeve.descTh}</div>
                    </div>
                    {isSelected && <span className="text-amber-400 text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pocket Layout & Grid Configuration */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-neutral-300">
                จำนวนช่องและแถว/คอลัมน์ (Grid Layout)
              </label>
              <span className="text-[11px] font-mono text-amber-400 font-bold bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                {gridRows} แถว × {gridCols} คอลัมน์ = {gridRows * gridCols} ช่อง
              </span>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_LAYOUTS.map((preset) => {
                const isSelected = gridRows === preset.rows && gridCols === preset.cols;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`p-2 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-400/15 ring-1 ring-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.2)]'
                        : 'border-white/10 hover:border-white/20 bg-neutral-950/60'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">{preset.labelTh}</div>
                    <div className="text-[9px] text-neutral-400 mt-0.5 line-clamp-1">{preset.descTh}</div>
                  </button>
                );
              })}
            </div>

            {/* Fine-tune Row & Column Selectors */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-neutral-950/70 border border-white/5">
              <div>
                <span className="block text-[11px] font-semibold text-neutral-400 mb-1.5">
                  จำนวนแถว (Rows)
                </span>
                <div className="flex items-center gap-1.5">
                  {[2, 3, 4].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleSetRows(r)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        gridRows === r
                          ? 'bg-amber-500 text-neutral-950 shadow-md'
                          : 'bg-white/5 hover:bg-white/10 text-neutral-300'
                      }`}
                    >
                      {r} แถว
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-neutral-400 mb-1.5">
                  จำนวนคอลัมน์ (Columns)
                </span>
                <div className="flex items-center gap-1.5">
                  {[2, 3, 4].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleSetCols(c)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        gridCols === c
                          ? 'bg-amber-500 text-neutral-950 shadow-md'
                          : 'bg-white/5 hover:bg-white/10 text-neutral-300'
                      }`}
                    >
                      {c} คอลัมน์
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Actions & Delete */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
            {binder.mode === 'custom' && onDelete && (
              <>
                {!showConfirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    ลบสมุดเล่มนี้
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-red-400">ยืนยันการลบ?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDelete(binder.id);
                        onClose();
                      }}
                      className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold"
                    >
                      ลบ
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(false)}
                      className="text-[11px] text-neutral-400 hover:text-white"
                    >
                      ยกเลิก
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 text-xs font-medium transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-lg transition-transform active:scale-95"
              >
                บันทึกการตั้งค่า
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
