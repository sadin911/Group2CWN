import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import rawData from '../../data/pokemonNames.json';
import { CardImagePreviewModal } from './CardImagePreviewModal';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { getEnglishCardName, createCardMatcher } from '../../utils/searchHelpers';

interface CardEntry {
  id?: string;
  name: string;
  hp?: number | null;
  image?: string;
  imageUrl?: string | null;
  imageUrlHigh?: string | null;
  officialImageUrl?: string | null;
  category?: string;
  set?: { id?: string; name: string };
  types?: string[];
  stage?: string;
}

const pokemonData = rawData as unknown as CardEntry[];

interface Props {
  value: string;
  onChange: (name: string) => void;
  onCommit: () => void;
  onSelectSuggestion?: (hp: number | null) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

const MAX_SUGGESTIONS = 8;

export function PokemonNameInput({
  value,
  onChange,
  onCommit,
  onSelectSuggestion,
  placeholder = 'Pokémon name',
  className = '',
  autoFocus = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [previewCard, setPreviewCard] = useState<CardEntry | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const suggestions = useMemo(() => {
    if (value.trim().length < 1) return [];
    const matcher = createCardMatcher(value);
    const list: CardEntry[] = [];
    for (let i = 0; i < pokemonData.length; i++) {
      if (matcher(pokemonData[i])) {
        list.push(pokemonData[i]);
        if (list.length >= MAX_SUGGESTIONS) break;
      }
    }
    return list;
  }, [value]);

  const showDropdown = open && suggestions.length > 0;

  const select = useCallback((entry: CardEntry) => {
    clearTimeout(blurTimer.current);
    onChange(entry.name);
    onSelectSuggestion?.(entry.hp ?? null);
    setOpen(false);
    onCommit();
  }, [onChange, onSelectSuggestion, onCommit]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (e.key === 'Enter') onCommit();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions[highlighted]) select(suggestions[highlighted]);
      else onCommit();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  useEffect(() => { setHighlighted(0); }, [value]);
  useEffect(() => () => clearTimeout(blurTimer.current), []);

  return (
    <div className="relative w-full">
      <input
        autoFocus={autoFocus}
        value={value}
        placeholder={placeholder}
        className={className}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 150); }}
      />
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-[60] mt-1 bg-gray-900 border border-gray-600 rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto">
          {suggestions.map((entry: CardEntry, i: number) => {
            const imgUrl = entry.imageUrl || (entry.image ? `${entry.image}/low.webp` : null);
            return (
              <div
                key={entry.id || `${entry.name}-${i}`}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors text-left group ${
                  i === highlighted ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                {/* Thumbnail with zoom click */}
                <div
                  className="relative w-7 h-10 flex-shrink-0 cursor-pointer"
                  onClick={e => {
                    e.stopPropagation();
                    if (imgUrl) setPreviewCard(entry);
                  }}
                  title="คลิกเพื่อขยายภาพ"
                >
                  {imgUrl ? (
                    <img
                      src={resolveCardImageUrl(imgUrl)}
                      alt={entry.name}
                      onError={e => handleCardImageError(e, imgUrl, entry.officialImageUrl)}
                      className="w-full h-full object-contain rounded bg-gray-950 hover:ring-2 hover:ring-blue-400 transition-all"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full rounded bg-gray-800 flex items-center justify-center text-[10px] text-gray-500">
                      TCG
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onMouseDown={() => select(entry)}
                  className="flex-1 min-w-0 flex flex-col text-left"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-medium truncate">{entry.name}</span>
                    {getEnglishCardName(entry) && (
                      <span className="text-[11px] text-gray-400 font-normal truncate">
                        ({getEnglishCardName(entry)})
                      </span>
                    )}
                  </div>
                  {entry.set?.name && (
                    <span className="text-[11px] text-gray-400 truncate">
                      {entry.set.name}
                    </span>
                  )}
                </button>

                {entry.hp && (
                  <span className={`text-xs font-mono ml-2 flex-shrink-0 px-1.5 py-0.5 rounded font-semibold ${
                    entry.hp >= 250 ? 'bg-red-950 text-red-300' :
                    entry.hp >= 150 ? 'bg-yellow-950 text-yellow-300' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {entry.hp} HP
                  </span>
                )}

                {/* Direct 🔍 Zoom Button */}
                {imgUrl && (
                  <button
                    type="button"
                    onMouseDown={e => {
                      e.stopPropagation();
                      setPreviewCard(entry);
                    }}
                    className="ml-1.5 p-1 rounded-md bg-gray-700/60 hover:bg-blue-600 text-gray-300 hover:text-white text-xs transition-colors flex-shrink-0"
                    title="ขยายภาพการ์ด"
                  >
                    🔍
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {previewCard && (
        <CardImagePreviewModal
          imageUrl={previewCard.imageUrl || previewCard.imageUrlHigh || (previewCard.image ? `${previewCard.image}/high.webp` : null)}
          officialImageUrl={previewCard.officialImageUrl || null}
          cardName={previewCard.name}
          onClose={() => setPreviewCard(null)}
          onSelect={() => {
            select(previewCard);
            setPreviewCard(null);
          }}
        />
      )}
    </div>
  );
}
