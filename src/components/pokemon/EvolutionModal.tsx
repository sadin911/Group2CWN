import { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import pokemonCardData from '../../data/pokemonNames.json';
import evoDataRaw from '../../data/evolutionLines.json';
import { ENERGY_MAP } from '../../constants/energyTypes';
import type { EnergyType, PokemonSlot as PokemonSlotType } from '../../types/game';
import { CardImagePreviewModal } from './CardImagePreviewModal';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { createCardMatcher } from '../../utils/searchHelpers';

const evoMap = evoDataRaw as Record<string, string[]>;

interface Props {
  pokemon: PokemonSlotType;
  onSelectEvolution: (card: {
    name: string;
    hp: number;
    imageUrl?: string;
    types?: string[];
    stage?: string;
    setName?: string;
    setCode?: string;
    regulationMark?: string;
  }) => void;
  onClose: () => void;
}

export function EvolutionModal({ pokemon, onSelectEvolution, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [previewCard, setPreviewCard] = useState<any | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Find all possible evolved forms
  const availableEvolutions = useMemo(() => {
    const currentName = (pokemon.name || '').trim();
    if (!currentName || currentName === 'Pokémon') return [];

    // Get direct evolution names from mapping
    const directEvoNames = new Set<string>(evoMap[currentName] || []);

    // Also extract base stem (e.g., 'ลิซาร์ด' from 'ฮิโตคาเงะ' or 'ลิซาร์โดะ')
    const allCards = (pokemonCardData as any[]).filter(c => c.category === 'Pokemon');

    // Filter cards matching evolution names
    const matchingCards = allCards.filter(card => {
      const cardName = (card.name || '').trim();
      
      // Match direct evolution name
      if (directEvoNames.has(cardName)) return true;

      // Match variations containing the card name
      for (const evoName of directEvoNames) {
        if (cardName.includes(evoName)) return true;
      }

      // If current card has a common stem
      if (currentName.length >= 4 && cardName.includes(currentName) && cardName !== currentName) {
        return true;
      }

      return false;
    });

    // Deduplicate by card name + set, keeping most recent prints first
    const regOrder: Record<string, number> = { I: 5, H: 4, G: 3, F: 2, E: 1 };
    
    // Group by Pokemon name
    const grouped = new Map<string, any[]>();
    for (const card of matchingCards) {
      const name = card.name.trim();
      if (!grouped.has(name)) grouped.set(name, []);
      grouped.get(name)!.push(card);
    }

    const uniqueCards = Array.from(grouped.values()).map(versions => {
      versions.sort((a, b) => {
        const regA = regOrder[a.regulationMark] || 0;
        const regB = regOrder[b.regulationMark] || 0;
        if (regA !== regB) return regB - regA;
        return parseInt(b.localId || '0', 10) - parseInt(a.localId || '0', 10);
      });
      return {
        ...versions[0],
        allVersionsCount: versions.length,
      };
    });

    // Sort by HP ascending, then Regulation mark descending
    uniqueCards.sort((a, b) => {
      if ((a.hp || 0) !== (b.hp || 0)) {
        return (a.hp || 0) - (b.hp || 0);
      }
      const regA = regOrder[a.regulationMark] || 0;
      const regB = regOrder[b.regulationMark] || 0;
      return regB - regA;
    });

    return uniqueCards;
  }, [pokemon.name]);

  const filteredCards = useMemo(() => {
    if (!search.trim()) return availableEvolutions;
    const matcher = createCardMatcher(search);
    return availableEvolutions.filter(matcher);
  }, [availableEvolutions, search]);

  const handleCardClick = (card: any) => {
    onSelectEvolution({
      name: card.name,
      hp: card.hp,
      imageUrl: card.imageUrl || card.imageUrlHigh || undefined,
      types: card.types || [],
      stage: card.stage,
      setName: card.set?.name,
      setCode: card.set?.id,
      regulationMark: card.regulationMark,
    });
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-purple-500/40 rounded-3xl p-4 w-full max-w-md max-h-[88vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-purple-500/20"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 pb-3 mb-2 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧬</span>
            <div>
              <h3 className="text-sm font-black text-gray-100 flex items-center gap-1.5">
                พัฒนาร่างโปเกมอน
              </h3>
              <p className="text-[10px] text-purple-300/80 font-medium">
                ปัจจุบัน: <span className="font-bold text-white">{pokemon.name}</span> ({pokemon.maxHP} HP)
              </p>
            </div>
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

        {/* Rule Alert */}
        <div className="bg-purple-950/40 border border-purple-800/40 rounded-xl px-3 py-1.5 mb-2.5 flex items-center justify-between text-[10px] text-purple-200 flex-shrink-0">
          <span>✨ คงตัวนับแดเมจ ({pokemon.currentDamage})</span>
          <span className="text-green-400 font-bold">✓ ล้างสภาวะผิดปกติ</span>
        </div>

        {/* Search if there are many evolutions (e.g. Eevee) */}
        {availableEvolutions.length > 4 && (
          <div className="mb-2 flex-shrink-0">
            <input
              type="text"
              placeholder="ค้นหาร่างพัฒนา..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-800/90 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-gray-100 outline-none focus:border-purple-500 placeholder-gray-500"
            />
          </div>
        )}

        {/* Evolution Cards Grid */}
        <div className="flex-1 overflow-y-auto pr-1 my-1 custom-scrollbar min-h-[200px] max-h-[360px]">
          {filteredCards.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {filteredCards.map((card, idx) => {
                const firstType = card.types?.[0] as EnergyType | undefined;
                const typeInfo = firstType ? ENERGY_MAP[firstType] : null;

                return (
                  <button
                    key={`${card.id || card.name}_${idx}`}
                    onClick={() => handleCardClick(card)}
                    className="group flex flex-col rounded-2xl bg-gray-800/80 hover:bg-gray-750 active:bg-gray-700 border border-gray-700/70 hover:border-purple-400 p-2 text-left transition-all active:scale-[0.98] shadow-md relative overflow-hidden"
                  >
                    {/* Card Thumbnail */}
                    <div className="w-full aspect-[3/4] bg-gray-950 rounded-xl overflow-hidden mb-1.5 flex items-center justify-center border border-gray-700/50 group-hover:border-purple-400/60 relative">
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
                          {typeInfo ? typeInfo.emoji : '🧬'}
                        </span>
                      )}

                      {/* Stage & HP Badges on Image */}
                      <div className="absolute top-1 left-1 flex items-center gap-1 pointer-events-none">
                        {card.stage && (
                          <span className="text-[8px] font-bold text-white bg-purple-900/90 px-1.5 py-0.5 rounded-md border border-purple-500/40">
                            {card.stage}
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-1 right-1 pointer-events-none">
                        <span className="text-[9px] font-black text-yellow-300 bg-black/85 px-1.5 py-0.5 rounded-md border border-yellow-500/40 font-mono">
                          {card.hp} HP
                        </span>
                      </div>

                      {/* Zoom 🔍 Preview Button */}
                      {card.imageUrl && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setPreviewCard(card);
                          }}
                          className="absolute top-1 right-1 w-6 h-6 rounded-lg bg-black/75 hover:bg-purple-600 text-white flex items-center justify-center text-[10px] backdrop-blur-xs border border-white/20 active:scale-90 transition-all opacity-85 hover:opacity-100 shadow-md"
                          title="ขยายภาพการ์ด"
                        >
                          🔍
                        </button>
                      )}
                    </div>

                    {/* Card Name & Type */}
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-bold text-xs text-gray-100 truncate group-hover:text-purple-300 transition-colors">
                        {card.name}
                      </span>
                      {typeInfo && (
                        <span className="text-xs flex-shrink-0">
                          {typeInfo.emoji}
                        </span>
                      )}
                    </div>

                    {/* Set Code */}
                    <div className="flex items-center justify-between text-[9px] text-gray-400 mt-auto">
                      <span className="truncate">{card.set?.id || card.set?.name || ''}</span>
                      {card.regulationMark && (
                        <span className="text-[8px] font-bold text-yellow-400 bg-yellow-950/60 px-1 rounded border border-yellow-700/40">
                          {card.regulationMark}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400 text-xs gap-2">
              <span className="text-2xl">🌱</span>
              <p>ไม่พบข้อมูลร่างพัฒนาที่เชื่อมโยงกับ &quot;{pokemon.name}&quot;</p>
              <p className="text-[10px] text-gray-500">
                (คุณสามารถแตะที่ HP บนการ์ดเพื่อเลือกเปลี่ยนการ์ดใบใหม่ได้โดยตรง)
              </p>
            </div>
          )}
        </div>

        {/* Footer Close */}
        <div className="pt-2 mt-1 border-t border-gray-800 flex items-center justify-between gap-2 flex-shrink-0">
          <span className="text-[11px] text-gray-400 font-bold px-1">
            มี {filteredCards.length} ร่างพัฒนา
          </span>
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white text-xs font-black transition-all border border-slate-700 shadow-md flex items-center gap-1.5"
          >
            <span>✕</span>
            <span>ปิด</span>
          </button>
        </div>
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
            handleCardClick(previewCard);
            setPreviewCard(null);
          }}
        />
      )}

    </div>,
    document.body
  );
}
