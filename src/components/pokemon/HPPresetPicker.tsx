import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HP_PRESETS } from '../../constants/hpPresets';
import pokemonCardData from '../../data/pokemonNames.json';
import { ENERGY_TYPES, ENERGY_MAP } from '../../constants/energyTypes';
import type { EnergyType } from '../../types/game';
import { CardImagePreviewModal } from './CardImagePreviewModal';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';

export interface CardMatchResult {
  name: string;
  hp: number;
  imageUrl?: string;
  officialImageUrl?: string;
  types?: string[];
  stage?: string;
  setName?: string;
  setCode?: string;
  regulationMark?: string;
}

interface Props {
  currentMaxHP: number;
  initialType?: EnergyType | null;
  onSelect: (hp: number, card?: CardMatchResult) => void;
  onClose: () => void;
}

type StageFilter = 'ALL' | 'BASIC' | 'EVO' | 'EX';

export function HPPresetPicker({ currentMaxHP, initialType, onSelect, onClose }: Props) {
  const [custom, setCustom] = useState('');
  const [selectedHP, setSelectedHP] = useState<number | null>(null);
  const [selectedType, setSelectedType] = useState<EnergyType | 'ALL'>(() => {
    if (initialType) return initialType;
    try {
      const saved = localStorage.getItem('pokecount_last_selected_type');
      if (saved && (saved === 'ALL' || ENERGY_TYPES.some(t => t.type === saved))) {
        return saved as EnergyType | 'ALL';
      }
    } catch (e) {}
    return 'ALL';
  });
  const [selectedStage, setSelectedStage] = useState<StageFilter>('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [previewCard, setPreviewCard] = useState<any | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleTypeSelect = (type: EnergyType | 'ALL') => {
    setSelectedType(type);
    try {
      localStorage.setItem('pokecount_last_selected_type', type);
    } catch (e) {}
  };

  // Find and organize matching cards when selectedHP is chosen
  const matchingCards = useMemo(() => {
    if (selectedHP === null) return [];

    // Filter Pokemon cards with matching HP
    const list = (pokemonCardData as any[]).filter(
      card => card.category === 'Pokemon' && card.hp === selectedHP
    );

    // Group cards by normalized Pokemon name so identical reprints are deduplicated nicely
    const nameMap = new Map<string, any[]>();
    for (const card of list) {
      const cleanName = (card.name || '').trim();
      if (!nameMap.has(cleanName)) {
        nameMap.set(cleanName, []);
      }
      nameMap.get(cleanName)!.push(card);
    }

    const regOrder: Record<string, number> = { I: 5, H: 4, G: 3, F: 2, E: 1 };

    // Select the best/most recent card for each Pokemon
    const uniqueCards = Array.from(nameMap.entries()).map(([, versions]) => {
      // Sort versions: highest regulation mark first, then highest ID
      versions.sort((a, b) => {
        const regA = regOrder[a.regulationMark] || 0;
        const regB = regOrder[b.regulationMark] || 0;
        if (regA !== regB) return regB - regA;
        return parseInt(b.localId || '0', 10) - parseInt(a.localId || '0', 10);
      });

      const primary = versions[0];
      return {
        ...primary,
        allVersionsCount: versions.length,
      };
    });

    // Sort list: Recent regulation first, then by name
    uniqueCards.sort((a, b) => {
      const regA = regOrder[a.regulationMark] || 0;
      const regB = regOrder[b.regulationMark] || 0;
      if (regA !== regB) return regB - regA;
      return (a.name || '').localeCompare(b.name || '', 'th');
    });

    return uniqueCards;
  }, [selectedHP]);

  // Filtered by Type, Stage, and Search Query
  const filteredCards = useMemo(() => {
    return matchingCards.filter(card => {
      // 1. Type Filter
      if (selectedType !== 'ALL') {
        const cardTypes = (card.types || []) as EnergyType[];
        if (!cardTypes.includes(selectedType)) return false;
      }

      // 2. Stage Filter
      if (selectedStage !== 'ALL') {
        const stage = card.stage || '';
        const isExOrMega = (card.name && (card.name.includes('ex') || card.name.includes('เมก้า') || card.name.includes('V')));
        if (selectedStage === 'BASIC' && stage !== 'พื้นฐาน') return false;
        if (selectedStage === 'EVO' && (stage === 'พื้นฐาน' || !stage)) return false;
        if (selectedStage === 'EX' && !isExOrMega) return false;
      }

      // 3. Search Query
      if (searchFilter.trim()) {
        const q = searchFilter.trim().toLowerCase();
        const matchName = card.name && card.name.toLowerCase().includes(q);
        const matchSet = card.set?.name && card.set.name.toLowerCase().includes(q);
        const matchCode = card.set?.id && card.set.id.toLowerCase().includes(q);
        if (!matchName && !matchSet && !matchCode) return false;
      }

      return true;
    });
  }, [matchingCards, selectedType, selectedStage, searchFilter]);

  const handleHPChosen = (hp: number) => {
    const matches = (pokemonCardData as any[]).filter(
      card => card.category === 'Pokemon' && card.hp === hp
    );

    if (matches.length === 0) {
      onSelect(hp);
    } else {
      setSelectedHP(hp);
      setSelectedType('ALL');
      setSelectedStage('ALL');
      setSearchFilter('');
    }
  };

  const handleCustomSubmit = () => {
    const val = parseInt(custom, 10);
    if (val >= 10 && val <= 999) {
      handleHPChosen(val);
    }
  };

  const handleCardChosen = (card: any) => {
    if (card.types && card.types.length > 0) {
      try {
        localStorage.setItem('pokecount_last_selected_type', card.types[0]);
      } catch (e) {}
    }

    onSelect(selectedHP || card.hp, {
      name: card.name,
      hp: card.hp,
      imageUrl: card.imageUrl || card.imageUrlHigh || undefined,
      officialImageUrl: card.officialImageUrl || undefined,
      types: card.types || [],
      stage: card.stage,
      setName: card.set?.name,
      setCode: card.set?.id,
      regulationMark: card.regulationMark,
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700/80 rounded-3xl p-3.5 sm:p-4 w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {selectedHP === null ? (
          /* ── STEP 1: Select HP ── */
          <>
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <h3 className="text-base font-black text-gray-100">เลือกค่า Max HP</h3>
                <p className="text-[11px] text-gray-400">เลือกค่า HP ของโปเกมอนที่ต้องการตั้งค่า</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded-xl bg-gray-800 hover:bg-rose-500 text-gray-300 hover:text-white flex items-center gap-1 text-xs font-black border border-gray-700 hover:border-rose-400 shadow-md transition-all active:scale-95 group"
                title="ปิดหน้าต่าง (ESC)"
              >
                <span className="text-sm font-black group-hover:rotate-90 transition-transform">✕</span>
                <span>ปิด</span>
              </button>
            </div>

            <div className="grid grid-cols-5 gap-1.5 mb-4 overflow-y-auto max-h-64 pr-1 custom-scrollbar">
              {HP_PRESETS.map(hp => (
                <button
                  key={hp}
                  onClick={() => handleHPChosen(hp)}
                  className={`py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
                    hp === currentMaxHP
                      ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-lg'
                      : 'bg-gray-800/90 text-gray-200 hover:bg-gray-750 active:bg-gray-700 border border-gray-700/60 shadow-sm'
                  }`}
                >
                  {hp}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-gray-800">
              <input
                type="number"
                placeholder="ระบุตัวเลข HP เอง..."
                value={custom}
                onChange={e => setCustom(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                min={10}
                max={999}
              />
              <button
                onClick={handleCustomSubmit}
                className="bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-md"
              >
                ตกลง
              </button>
            </div>
          </>
        ) : (
          /* ── STEP 2: Smart Filter & Card Match Grid ── */
          <>
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-2.5 mb-2 border-b border-gray-800 flex-shrink-0">
              <button
                onClick={() => setSelectedHP(null)}
                className="text-xs text-gray-300 hover:text-white flex items-center gap-1 font-bold py-1.5 px-2.5 rounded-xl bg-gray-800 hover:bg-gray-750 border border-gray-700/60 active:scale-95 transition-all"
              >
                ← เปลี่ยน HP
              </button>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 font-bold">HP:</span>
                <span className="text-sm font-black text-blue-400 bg-blue-950/80 px-2.5 py-0.5 rounded-xl border border-blue-800/80 shadow-sm font-mono">
                  {selectedHP}
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded-xl bg-gray-800 hover:bg-rose-500 text-gray-300 hover:text-white flex items-center gap-1 text-xs font-black border border-gray-700 hover:border-rose-400 shadow-md transition-all active:scale-95 group"
                title="ปิดหน้าต่าง (ESC)"
              >
                <span className="text-sm font-black group-hover:rotate-90 transition-transform">✕</span>
                <span>ปิด</span>
              </button>
            </div>

            {/* 1. Horizontal Energy Type Chips (1-Tap Fast Filter) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none flex-shrink-0">
              <button
                onClick={() => handleTypeSelect('ALL')}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex-shrink-0 transition-all active:scale-95 ${
                  selectedType === 'ALL'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700/50'
                }`}
              >
                ทั้งหมด
              </button>
              {ENERGY_TYPES.map(t => {
                const isSel = selectedType === t.type;
                return (
                  <button
                    key={t.type}
                    onClick={() => handleTypeSelect(isSel ? 'ALL' : t.type)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-xl text-[11px] font-bold flex-shrink-0 transition-all active:scale-95 ${
                      isSel
                        ? `${t.bgColor} ${t.color} ring-2 ring-blue-400 shadow-md`
                        : 'bg-gray-800/90 text-gray-300 hover:bg-gray-750 border border-gray-700/50'
                    }`}
                    title={t.type}
                  >
                    <span>{t.emoji}</span>
                  </button>
                );
              })}
            </div>

            {/* 2. Stage Filter & Search Box */}
            <div className="flex items-center gap-2 mb-2 flex-shrink-0">
              {/* Stage buttons */}
              <div className="flex items-center bg-gray-800/80 rounded-xl p-0.5 border border-gray-700/60">
                {(
                  [
                    ['ALL', 'ทั้งหมด'],
                    ['BASIC', 'พื้นฐาน'],
                    ['EVO', 'ร่างพัฒนา'],
                    ['EX', 'ex/เมก้า'],
                  ] as [StageFilter, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedStage(key)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      selectedStage === key
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="พิมพ์ค้นหาชื่อ..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-2.5 py-1 text-xs text-gray-100 outline-none focus:border-blue-500 placeholder-gray-500"
                />
              </div>
            </div>

            {/* 3. Visual Card Grid (2 Columns with large recognizable artwork) */}
            <div className="flex-1 overflow-y-auto pr-1 my-1 custom-scrollbar min-h-[220px] max-h-[380px]">
              {filteredCards.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredCards.map((card, idx) => {
                    const firstType = card.types?.[0] as EnergyType | undefined;
                    const typeInfo = firstType ? ENERGY_MAP[firstType] : null;

                    return (
                      <div
                        key={`${card.id || card.name}_${idx}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleCardChosen(card)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleCardChosen(card);
                          }
                        }}
                        className="group flex flex-col rounded-2xl bg-gray-800/70 hover:bg-gray-750 active:bg-gray-700 border border-gray-700/60 hover:border-blue-500/80 p-2 text-left transition-all active:scale-[0.98] shadow-md overflow-hidden relative cursor-pointer"
                      >
                        {/* Card Image Thumbnail */}
                        <div className="w-full aspect-[3/4] bg-gray-950 rounded-xl overflow-hidden mb-1.5 flex items-center justify-center border border-gray-700/50 group-hover:border-blue-400/60 relative">
                          {card.imageUrl ? (
                            <img
                              src={resolveCardImageUrl(card.imageUrl)}
                              alt={card.name}
                              onError={e => handleCardImageError(e, card.imageUrl, card.officialImageUrl)}
                              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-200"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-3xl">
                              {typeInfo ? typeInfo.emoji : '🃏'}
                            </span>
                          )}

                          {/* Regulation & Stage Badge on image */}
                          <div className="absolute top-1 left-1 flex items-center gap-1 pointer-events-none">
                            {card.regulationMark && (
                              <span className="text-[9px] font-black text-yellow-300 bg-black/80 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-yellow-500/40">
                                {card.regulationMark}
                              </span>
                            )}
                          </div>

                          {card.stage && (
                            <span className="absolute bottom-1 right-1 text-[8px] font-bold text-gray-200 bg-black/80 backdrop-blur-xs px-1.5 py-0.5 rounded-md border border-gray-600/50 pointer-events-none">
                              {card.stage}
                            </span>
                          )}

                          {/* Zoom 🔍 Preview Button */}
                          {card.imageUrl && (
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                setPreviewCard(card);
                              }}
                              className="absolute top-1 right-1 w-6 h-6 rounded-lg bg-black/75 hover:bg-blue-600 text-white flex items-center justify-center text-[10px] backdrop-blur-xs border border-white/20 active:scale-90 transition-all opacity-85 hover:opacity-100 shadow-md"
                              title="ขยายภาพการ์ด"
                            >
                              🔍
                            </button>
                          )}
                        </div>

                        {/* Name & Type */}
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className="font-bold text-xs text-gray-100 truncate group-hover:text-blue-300 transition-colors">
                            {card.name}
                          </span>
                          {typeInfo && (
                            <span className="text-xs flex-shrink-0 leading-none">
                              {typeInfo.emoji}
                            </span>
                          )}
                        </div>

                        {/* Set Code & Versions */}
                        <div className="flex items-center justify-between text-[9px] text-gray-400 mt-auto">
                          <span className="truncate font-semibold text-gray-400">
                            {card.set?.id || card.set?.name || ''}
                          </span>
                          {card.allVersionsCount > 1 && (
                            <span className="text-[8px] text-blue-400/90 font-bold bg-blue-950/60 px-1 rounded flex-shrink-0">
                              +{card.allVersionsCount}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-gray-500 text-xs gap-1">
                  <span>ไม่พบการ์ดโปเกมอนตามเงื่อนไขที่เลือก</span>
                  <button
                    onClick={() => {
                      setSelectedType('ALL');
                      setSelectedStage('ALL');
                      setSearchFilter('');
                    }}
                    className="text-blue-400 hover:underline font-bold mt-1"
                  >
                    ล้างตัวกรองทั้งหมด
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Actions: Skip / Set HP only */}
            <div className="pt-2 mt-1 border-t border-gray-800 flex items-center justify-between gap-2 flex-shrink-0">
              <span className="text-[11px] text-gray-400 font-bold px-1">
                พบ {filteredCards.length} ใบ
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white text-xs font-black transition-all border border-slate-700 shadow-sm flex items-center gap-1"
                >
                  <span>✕</span>
                  <span>ปิด</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSelect(selectedHP)}
                  className="py-1.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-black transition-all shadow-md"
                >
                  ข้าม / ตั้งเฉพาะค่า HP ({selectedHP})
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {previewCard && (
        <CardImagePreviewModal
          imageUrl={previewCard.imageUrlHigh || previewCard.imageUrl || null}
          officialImageUrl={previewCard.officialImageUrl || null}
          cardName={previewCard.name}
          setInfo={previewCard.set?.id || previewCard.set?.name}
          collectorNumber={previewCard.collectorNumber || previewCard.localId}
          rarityCode={previewCard.rarityCode}
          onClose={() => setPreviewCard(null)}
          onSelect={() => {
            handleCardChosen(previewCard);
            setPreviewCard(null);
          }}
        />
      )}

    </div>,
    document.body
  );
}
