import { useState, useMemo, useEffect } from 'react';
import { type UnmatchedDeckCardItem, translateEnCardNameToTh } from '../../utils/ptcglDeckParser';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';

interface Props {
  unmatchedItem: UnmatchedDeckCardItem;
  cardDatabase: any[];
  currentCardNameTh?: string;
  onSelect: (card: any) => void;
  onClose: () => void;
}

export function CardMappingPickerModal({
  unmatchedItem,
  cardDatabase,
  currentCardNameTh,
  onSelect,
  onClose,
}: Props) {
  // Pre-fill search query with best effort Thai name or English name
  const defaultQuery = useMemo(() => {
    const th = translateEnCardNameToTh(unmatchedItem.rawCardName);
    return th !== unmatchedItem.rawCardName ? th : unmatchedItem.rawCardName;
  }, [unmatchedItem]);

  const [searchQuery, setSearchQuery] = useState(defaultQuery);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Trainer' | 'Pokemon' | 'Energy'>('ALL');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Filter candidates
  const filteredCards = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      // If query is empty, show a sample of popular cards or trainers
      return cardDatabase
        .filter((c) => {
          if (categoryFilter === 'ALL') return true;
          return c.category === categoryFilter;
        })
        .slice(0, 50);
    }

    const matches: any[] = [];
    for (const c of cardDatabase) {
      if (categoryFilter !== 'ALL' && c.category !== categoryFilter) {
        continue;
      }
      const name = (c.name || '').toLowerCase();
      const id = (c.id || '').toLowerCase();
      const subType = (c.subType || '').toLowerCase();
      const set = (c.set?.id || '').toLowerCase();

      if (name.includes(q) || id.includes(q) || subType.includes(q) || set.includes(q)) {
        matches.push(c);
        if (matches.length >= 80) break; // Keep UI fast
      }
    }
    return matches;
  }, [cardDatabase, searchQuery, categoryFilter]);

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">{currentCardNameTh ? '🔄' : '🔗'}</span>
              <h3 className="text-sm sm:text-base font-black text-white truncate">
                {currentCardNameTh ? 'แก้ไขการจับคู่:' : 'จับคู่การ์ด:'}{' '}
                <span className="text-amber-300 font-mono">{unmatchedItem.rawCardName}</span>
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {currentCardNameTh ? (
                <span>
                  ปัจจุบันจับคู่กับ:{' '}
                  <strong className="text-indigo-300 font-semibold">{currentCardNameTh}</strong>{' '}
                  (ค้นหาและกด "เลือก" การ์ดใหม่เพื่อเปลี่ยน)
                </span>
              ) : (
                'เลือกการ์ดเวอร์ชันภาษาไทยที่ตรงกัน (ระบบจะบันทึกไว้และส่งคำแนะนำให้ส่วนกลาง)'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-500 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold transition-all shrink-0 ml-2"
          >
            ✕
          </button>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800/80 space-y-2.5">
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อการ์ดภาษาไทย, รหัสชุด, หรือชื่อ..."
              autoFocus
              className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none">
            <span className="text-[11px] text-slate-400 font-semibold shrink-0 mr-1">ประเภท:</span>
            {[
              { id: 'ALL', label: 'ทั้งหมด' },
              { id: 'Trainer', label: 'เทรนเนอร์' },
              { id: 'Pokemon', label: 'โปเกมอน' },
              { id: 'Energy', label: 'พลังงาน' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  categoryFilter === cat.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-2 scrollbar-thin">
          {filteredCards.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs">
              <span className="text-2xl block mb-2">🃏</span>
              ไม่พบการ์ดที่ตรงกับคำค้นหา "{searchQuery}"
              <br />
              ลองพิมพ์คำค้นสั้นลง เช่น "คำสั่ง", "เคาน์เตอร์", "บอส"
            </div>
          ) : (
            filteredCards.map((card) => {
              const rawImg = card.imageUrl || card.officialImageUrl;
              const imgUrl = resolveCardImageUrl(rawImg);
              return (
                <div
                  key={card.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-800/40 transition-all gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={card.name}
                        loading="lazy"
                        onError={(e) => handleCardImageError(e, card.imageUrl, card.officialImageUrl)}
                        className="w-10 h-14 object-cover rounded-lg shadow-sm border border-slate-700 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-14 rounded-lg bg-slate-800 flex items-center justify-center text-sm shrink-0">
                        🃏
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-100 truncate">
                          {card.name}
                        </span>
                        {card.set?.id && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-indigo-300 border border-slate-700">
                            {card.set.id} {card.collectorNumber || ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="text-slate-300">{card.category || 'Pokemon'}</span>
                        {card.subType && <span>• {card.subType}</span>}
                        {card.regulationMark && (
                          <span className="font-mono text-slate-400">Mark: {card.regulationMark}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid="select-card-mapping"
                    onClick={() => onSelect(card)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-black shadow-md transition-all shrink-0 flex items-center gap-1"
                  >
                    <span>✓</span>
                    <span>เลือก</span>
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-[11px] text-slate-400">
          <span>พบ {filteredCards.length} รายการ</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
}
