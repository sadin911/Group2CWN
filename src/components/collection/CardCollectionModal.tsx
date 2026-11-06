import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useCollectionStore } from '../../store/collectionStore';
import { useDeckStore } from '../../store/deckStore';
import { useCommunityStore } from '../../store/communityStore';
import { resolveCardImageUrl, handleCardImageError } from '../../utils/cardImage';
import { getEnglishCardName } from '../../utils/searchHelpers';
import { isCardFoil, foilPulseDelay } from '../../utils/cardFoil';
import { isAceSpecCard } from '../../utils/rarity';
import { useFoilTilt } from '../../hooks/useFoilTilt';
import { EvolutionChainSection } from '../pokemon/EvolutionChainSection';
import {
  getEnglishMatchForThaiCard,
  getThaiCardIdForEnglishCard,
  saveCardMapping,
  type EnCardMapping,
} from '../../utils/thaiEnglishCardMatcher';
import pokemonCardData from '../../data/pokemonNames.json';
import type { CardVariantKey, CardCondition } from '../../types/collection';
import { CardPriceBadge } from '../pricing/CardPriceBadge';
import { CardPricingDetailSection } from '../pricing/CardPricingDetailSection';
import { usePricingStore } from '../../store/pricingStore';
import { useAuthStore } from '../../store/authStore';
import { isAdminEmail } from '../../utils/adminAuth';
import { submitCardPairing } from '../../services/communityPairingService';
import type { SharedCardEntry } from '../../types/share';

interface Props {
  card: any;
  onClose: () => void;
  deckId?: string;
  readOnly?: boolean;
  sharedCardEntry?: SharedCardEntry;
}

interface VariantDef {
  key: CardVariantKey;
  label: string;
  icon: string;
  desc: string;
  color: string;
}

const ALL_VARIANTS_MAP: Record<CardVariantKey, VariantDef> = {
  normal: {
    key: 'normal',
    label: 'การ์ดธรรมดา (Normal)',
    icon: '⚪',
    desc: 'การ์ดทั่วไปไม่มีฟอยล์สะท้อนแสง',
    color: 'slate',
  },
  holo: {
    key: 'holo',
    label: 'การ์ดฟอยล์ (Holo / Special Foil)',
    icon: '✨',
    desc: 'ฟอยล์สะท้อนแสง / การ์ดระดับสูง',
    color: 'amber',
  },
  reverse: {
    key: 'reverse',
    label: 'รีเวิร์ส / มิลเลอร์ฟอยล์ (Mirror Foil)',
    icon: '🌟',
    desc: 'ฟอยล์สะท้อนแสงลายมิลเลอร์ทั่วทั้งใบ',
    color: 'cyan',
  },
  promo: {
    key: 'promo',
    label: 'การ์ดโปรโม (Promo / Event Stamp)',
    icon: '🎁',
    desc: 'การ์ดแจกพิเศษ / ตราปั๊มกิจกรรม',
    color: 'purple',
  },
};

const CONDITIONS: { key: CardCondition; label: string; desc: string }[] = [
  { key: 'NM', label: 'NM (Near Mint)', desc: 'สภาพสมบูรณ์เหมือนใหม่' },
  { key: 'LP', label: 'LP (Light Played)', desc: 'มีรอยขอบเล็กน้อย' },
  { key: 'MP', label: 'MP (Moderately Played)', desc: 'มีรอยใช้งานปานกลาง' },
  { key: 'HP', label: 'HP (Heavily Played)', desc: 'มีตำหนิชัดเจน' },
];

const DEFAULT_CARD_VARIANTS: Record<CardVariantKey, number> = { normal: 0, holo: 0, reverse: 0, promo: 0 };

/**
 * Smart detection of applicable variants for a card in Thai Pokémon TCG
 */
function getApplicableVariants(card: any, variants: Record<string, number> | Partial<Record<CardVariantKey, number>>): VariantDef[] {
  const list: VariantDef[] = [];
  const setId = (card.set?.id || '').toUpperCase();
  const col = (card.collectorNumber || card.localId || '').toUpperCase();
  const name = (card.name || '').toLowerCase();
  const rarity = (card.rarityCode || '').toUpperCase();

  const isPromo =
    setId.includes('-P') ||
    setId.includes('PROMO') ||
    col.includes('PROMO') ||
    col.startsWith('P-') ||
    setId === 'PROMO';

  const isHighRarity =
    rarity === 'SR' ||
    rarity === 'HR' ||
    rarity === 'UR' ||
    rarity === 'SAR' ||
    rarity === 'AR' ||
    rarity === 'ACE_SPEC' ||
    isAceSpecCard(card) ||
    name.includes(' ex') ||
    name.includes('ex') ||
    name.includes('vmax') ||
    name.includes('vstar') ||
    name.includes(' v');

  if (isPromo) {
    list.push(ALL_VARIANTS_MAP.promo);
    if ((variants.normal ?? 0) > 0) list.push(ALL_VARIANTS_MAP.normal);
    if ((variants.holo ?? 0) > 0) list.push(ALL_VARIANTS_MAP.holo);
    return list;
  }

  if (isHighRarity) {
    list.push(ALL_VARIANTS_MAP.holo);
    if ((variants.normal ?? 0) > 0) list.push(ALL_VARIANTS_MAP.normal);
    if ((variants.reverse ?? 0) > 0) list.push(ALL_VARIANTS_MAP.reverse);
    return list;
  }

  list.push(ALL_VARIANTS_MAP.normal);
  list.push(ALL_VARIANTS_MAP.reverse);
  list.push(ALL_VARIANTS_MAP.holo);

  return list;
}

export function CardCollectionModal({ card: initialCard, onClose, deckId, readOnly = false, sharedCardEntry }: Props) {
  const [activeCard, setActiveCard] = useState(initialCard);
  const [showZoom, setShowZoom] = useState(false);
  const [addedToMyCollection, setAddedToMyCollection] = useState(false);

  useEffect(() => {
    setActiveCard(initialCard);
  }, [initialCard]);

  // ESC key listener to close modal or dismiss zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showZoom) {
          setShowZoom(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showZoom]);

  const activeProfileId = useCollectionStore((s) => s.activeProfileId);
  const profile = useCollectionStore((s) => s.profiles[activeProfileId]);
  const setVariantCount = useCollectionStore((s) => s.setVariantCount);
  const incrementVariant = useCollectionStore((s) => s.incrementVariant);
  const decrementVariant = useCollectionStore((s) => s.decrementVariant);
  const toggleWishlist = useCollectionStore((s) => s.toggleWishlist);
  const setCardDetails = useCollectionStore((s) => s.setCardDetails);
  const clearCard = useCollectionStore((s) => s.clearCard);

  // Deck Store Integration (if opened within a Deck context)
  const deck = useDeckStore((s) => (deckId ? s.decks[deckId] : undefined));
  const addCardToDeck = useDeckStore((s) => s.addCardToDeck);
  const removeCardFromDeck = useDeckStore((s) => s.removeCardFromDeck);

  const user = useAuthStore((s) => s.user);
  const cardOwners = useCommunityStore((s) => s.cardOwners);
  const totalUsers = useCommunityStore((s) => s.totalUsers);
  const getCardStats = useCommunityStore((s) => s.getCardStats);

  const cardEntry = readOnly && sharedCardEntry ? sharedCardEntry : profile?.cards[activeCard.id];
  const variants = cardEntry?.variants || DEFAULT_CARD_VARIANTS;
  const totalCount = variants.normal + variants.holo + variants.reverse + variants.promo;

  const communityStats = useMemo(
    () => getCardStats(activeCard.id, totalCount > 0),
    [getCardStats, activeCard.id, totalCount, cardOwners, totalUsers]
  );
  const isWishlist = !!cardEntry?.isWishlist;
  const currentCondition = cardEntry?.condition || 'NM';
  const currentNote = cardEntry?.note || '';

  const isFoil = useMemo(() => isCardFoil(activeCard, variants), [activeCard, variants]);
  const tilt = useFoilTilt<HTMLButtonElement>(isFoil, { gyro: true });

  const isOriginalEn = (activeCard.id || '').startsWith('EN-');
  const [viewingLang, setViewingLang] = useState<'TH' | 'EN'>(isOriginalEn ? 'EN' : 'TH');
  const [mappingVersion, setMappingVersion] = useState(0);
  const [showReMatchModal, setShowReMatchModal] = useState(false);
  const [enCatalog, setEnCatalog] = useState<any[] | null>(null);
  const [reMatchSearch, setReMatchSearch] = useState('');

  const currency = usePricingStore((s) => s.currency);
  const setCurrency = usePricingStore((s) => s.setCurrency);

  // Update viewingLang when activeCard changes
  useEffect(() => {
    setViewingLang(activeCard.id?.startsWith('EN-') ? 'EN' : 'TH');
  }, [activeCard.id]);

  // Load English catalog on demand when re-match modal is opened
  useEffect(() => {
    if (showReMatchModal && !enCatalog) {
      import('../../data/pokemonCardsEn.json').then((m) => {
        setEnCatalog(m.default || m);
      });
    }
  }, [showReMatchModal, enCatalog]);

  // Counterpart resolution
  const counterpartData = useMemo(() => {
    void mappingVersion;
    if (isOriginalEn) {
      const thId = getThaiCardIdForEnglishCard(activeCard.id);
      const thCard = thId ? (pokemonCardData as any[]).find((c) => c.id === thId) : null;
      return {
        thCard,
        thId,
        hasMatch: !!thCard,
        confidence: thCard ? 100 : 0,
      };
    } else {
      const mapping = getEnglishMatchForThaiCard(activeCard.id);
      return {
        enMapping: mapping,
        hasMatch: !!mapping,
        confidence: mapping?.confidence || 0,
      };
    }
  }, [activeCard.id, isOriginalEn, mappingVersion]);

  // The active visual card to display in image and titles
  const displayVisualCard = useMemo(() => {
    if (viewingLang === 'TH') {
      if (!isOriginalEn) return activeCard;
      if (counterpartData.thCard) return counterpartData.thCard;
      return activeCard;
    } else {
      // viewingLang === 'EN'
      if (isOriginalEn) return activeCard;
      if (counterpartData.enMapping) {
        return {
          id: counterpartData.enMapping.enCardId,
          name: counterpartData.enMapping.enName,
          imageUrl: counterpartData.enMapping.enImageUrl,
          imageUrlHigh: counterpartData.enMapping.enImageUrl,
          officialImageUrl: counterpartData.enMapping.enOfficialImageUrl || '',
          set: {
            id: counterpartData.enMapping.enSetId,
            name: counterpartData.enMapping.enSetName,
          },
          collectorNumber: counterpartData.enMapping.enNumber,
          category: activeCard.category,
          hp: activeCard.hp,
          types: activeCard.types,
          regulationMark: activeCard.regulationMark,
        };
      }
      return activeCard;
    }
  }, [viewingLang, isOriginalEn, activeCard, counterpartData]);

  const reMatchCandidates = useMemo(() => {
    const q = reMatchSearch.trim().toLowerCase();
    if (isOriginalEn) {
      if (!q) return (pokemonCardData as any[]).slice(0, 30);
      return (pokemonCardData as any[])
        .filter((c) => {
          const matchName = (c.name || '').toLowerCase().includes(q);
          const matchNum = (c.collectorNumber || c.localId || '').toLowerCase().includes(q);
          const matchSet = (c.set?.name || c.set?.id || '').toLowerCase().includes(q);
          return matchName || matchNum || matchSet;
        })
        .slice(0, 40);
    } else {
      if (!enCatalog) return [];
      if (!q) return enCatalog.slice(0, 30);
      return enCatalog
        .filter((c) => {
          const matchName = (c.name || '').toLowerCase().includes(q);
          const matchNum = (c.localId || '').toLowerCase() === q;
          const matchSet = (c.set?.name || c.set?.id || '').toLowerCase().includes(q);
          return matchName || matchNum || matchSet;
        })
        .slice(0, 40);
    }
  }, [reMatchSearch, isOriginalEn, enCatalog]);

  const handleSelectReMatch = (candidate: any) => {
    if (isOriginalEn) {
      const newMapping: EnCardMapping = {
        enCardId: activeCard.id,
        enName: activeCard.name,
        enSetId: activeCard.set?.id || '',
        enSetName: activeCard.set?.name || '',
        enNumber: activeCard.localId || '',
        enImageUrl: activeCard.imageUrl || '',
        confidence: 100,
        matchMethod: 'manual_override',
        verified: true,
        matchedAt: new Date().toISOString(),
        userOverridden: true,
      };
      saveCardMapping(candidate.id, newMapping);
    } else {
      const newMapping: EnCardMapping = {
        enCardId: candidate.id,
        enName: candidate.name,
        enSetId: candidate.set?.id || '',
        enSetName: candidate.set?.name || '',
        enNumber: candidate.localId || '',
        enImageUrl: candidate.imageUrl || '',
        confidence: 100,
        matchMethod: 'manual_override',
        verified: true,
        matchedAt: new Date().toISOString(),
        userOverridden: true,
      };
      saveCardMapping(activeCard.id, newMapping);
    }

    // Submit to Cloud Community Card Pairings for Admin Review
    if (user?.uid) {
      const isAdmin = isAdminEmail(user.email);
      const thaiCard = isOriginalEn ? candidate : activeCard;
      const enCard = isOriginalEn ? activeCard : candidate;

      submitCardPairing({
        thaiCardId: thaiCard.id,
        thaiCardName: thaiCard.name || '',
        thaiSetId: thaiCard.set?.id || '',
        thaiSetName: thaiCard.set?.name || '',
        thaiNumber: thaiCard.collectorNumber || thaiCard.localId || '',
        thaiImageUrl: thaiCard.imageUrlHigh || thaiCard.imageUrl || '',
        enCardId: enCard.id,
        enName: enCard.name || '',
        enSetId: enCard.set?.id || '',
        enSetName: enCard.set?.name || '',
        enNumber: enCard.localId || '',
        enImageUrl: enCard.imageUrl || '',
        enOfficialImageUrl: enCard.officialImageUrl || '',
        submittedByUid: user.uid,
        submittedByEmail: user.email || '',
        status: isAdmin ? 'approved' : 'pending',
        notes: isAdmin ? 'Admin Instant Match' : 'User Suggested Pairing',
      }).catch((err) => {
        console.warn('Failed to submit pairing suggestion to cloud:', err);
      });
    }

    setMappingVersion((v) => v + 1);
    setShowReMatchModal(false);
  };

  const applicableVariants = useMemo(() => {
    return getApplicableVariants(activeCard, variants);
  }, [activeCard, variants]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        data-testid="card-detail"
        data-card-id={activeCard.id}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[92vh] overflow-y-auto overscroll-contain scrollbar-thin rounded-3xl border border-slate-200 dark:border-slate-700/60 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 backdrop-blur-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/90 transition-colors duration-200"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-4 sm:p-6">
          {/* Image Column */}
          <div className="md:col-span-5 space-y-3">
            {/* Bilingual Switcher Bar */}
            <div className="flex items-center justify-between gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm dark:shadow-md transition-colors">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  data-testid="bilingual-tab-th"
                  onClick={() => setViewingLang('TH')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    viewingLang === 'TH'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>🇹🇭</span>
                  <span>ไทย</span>
                </button>
                <button
                  type="button"
                  data-testid="bilingual-tab-en"
                  onClick={() => setViewingLang('EN')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                    viewingLang === 'EN'
                      ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>🇺🇸</span>
                  <span>EN</span>
                  {counterpartData.confidence > 0 && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-black/40 text-sky-200 font-black">
                      {counterpartData.confidence}%
                    </span>
                  )}
                </button>
              </div>

              {!readOnly && (
                <button
                  type="button"
                  data-testid="bilingual-rematch-btn"
                  onClick={() => {
                    setReMatchSearch('');
                    setShowReMatchModal(true);
                  }}
                  title="ค้นหาและแก้ไขคู่การ์ดภาษาอังกฤษ / ไทย"
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-400 text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                >
                  <span>✏️</span>
                  <span>แก้ไขคู่</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowZoom(true)}
              ref={tilt.ref}
              onPointerMove={isFoil ? tilt.onPointerMove : undefined}
              onPointerLeave={isFoil ? tilt.onPointerLeave : undefined}
              className={`relative block w-full rounded-2xl overflow-hidden border bg-slate-100 dark:bg-[#1b2038] group ${
                isFoil
                  ? 'foil-3d border-[#dfc792]/50 hover:border-[#dfc792]'
                  : 'border-slate-200 dark:border-[#c8b07b]/30 hover:border-amber-400 dark:hover:border-[#c8b07b] transition-all shadow-md dark:shadow-xl dark:shadow-black/50'
              }`}
            >
              <img
                src={resolveCardImageUrl(displayVisualCard.imageUrlHigh || displayVisualCard.imageUrl, true)}
                alt={displayVisualCard.name}
                onError={(e) => handleCardImageError(e, displayVisualCard.imageUrl, displayVisualCard.officialImageUrl)}
                className="w-full h-auto transition-transform duration-300 group-hover:scale-[1.02]"
              />
              {isFoil && (
                <>
                  <div
                    className="foil-holo"
                    aria-hidden="true"
                    style={{ animationDelay: `${foilPulseDelay(activeCard.id)}s` }}
                  />
                </>
              )}
            </button>

            {totalCount > 0 && (
              <div className="flex items-center justify-center">
                <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs shadow-md">
                  มีสะสม {totalCount} ใบ
                </span>
              </div>
            )}

            {isFoil && tilt.gyro.needsGesture && (
              <button
                type="button"
                onClick={tilt.gyro.enable}
                className="w-full py-2 rounded-xl border border-[#dfc792]/40 bg-[#dfc792]/10 text-xs font-bold text-[#dfc792] hover:bg-[#dfc792]/20 transition-all flex items-center justify-center gap-1.5"
              >
                <span>✨</span>
                <span>Tilt your phone to catch the foil</span>
              </button>
            )}
            {isFoil && tilt.gyro.status === 'denied' && (
              <p className="text-[10px] text-slate-400 text-center">
                Motion access was declined — the foil still shifts, just without the tilt.
              </p>
            )}

            <button
              type="button"
              onClick={() => setShowZoom(true)}
              className="w-full py-2 rounded-xl border border-slate-300 dark:border-[#c8b07b]/30 bg-slate-100 dark:bg-[#1b2038]/80 hover:bg-slate-200 dark:hover:bg-[#252a48] text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-[#dfc792] transition-all flex items-center justify-center gap-1.5"
            >
              <span>🔍</span>
              <span>View Fullscreen Artwork</span>
            </button>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center font-mono font-medium">
              {displayVisualCard.set?.name || 'การ์ดเสริม'} · {displayVisualCard.collectorNumber || displayVisualCard.localId}
            </p>
          </div>

          {/* Details Column */}
          <div className="md:col-span-7 space-y-5">
          <div className="space-y-5">
            {/* Header with Set Badges, Wishlist Button and Prominent Close Button */}

            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 text-xs font-black">
                    {activeCard.set?.id || 'PROMO'}
                  </span>
                  {activeCard.regulationMark && (
                    <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold font-mono">
                      Reg [{activeCard.regulationMark}]
                    </span>
                  )}
                  {activeCard.category && (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-400 text-xs font-medium">
                      {activeCard.category}
                    </span>
                  )}
                  {isAceSpecCard(activeCard) && (
                    <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-fuchsia-600/30 to-pink-600/30 border border-fuchsia-400/50 text-fuchsia-600 dark:text-fuchsia-300 text-xs font-black shadow-xs flex items-center gap-1">
                      <span>🔮</span>
                      <span>ACE SPEC</span>
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-2 leading-snug">
                  {displayVisualCard.name}
                  {viewingLang === 'TH' && getEnglishCardName(activeCard) && (
                    <span className="ml-2 text-sm sm:text-base font-semibold text-slate-500 dark:text-slate-400 font-sans">
                      ({getEnglishCardName(activeCard)})
                    </span>
                  )}
                  {viewingLang === 'EN' && !isOriginalEn && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold">
                      US Version
                    </span>
                  )}
                </h2>

                {/* Live Card Price Badge */}
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <span>💵</span>
                    <span>ราคาตลาด:</span>
                  </span>
                  <CardPriceBadge
                    cardId={activeCard.id}
                    enName={
                      isOriginalEn
                        ? activeCard.name
                        : (getEnglishCardName(activeCard) || counterpartData.enMapping?.enName || activeCard.name)
                    }
                    isFoil={isFoil}
                    size="sm"
                  />
                  <button
                    type="button"
                    onClick={() => setCurrency(currency === 'THB' ? 'USD' : 'THB')}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-700/80 hover:bg-slate-600 text-slate-300 font-mono font-bold transition-colors flex items-center gap-1"
                    title="คลิกเพื่อสลับสกุลเงินแสดงผล"
                  >
                    <span>{currency}</span>
                    <span className="opacity-60">⇄</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {readOnly ? (
                  isWishlist && (
                    <span className="px-3 py-2 rounded-xl border text-xs font-black flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm">
                      <span className="text-sm">⭐</span>
                      <span>การ์ด Wishlist</span>
                    </span>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => toggleWishlist(activeCard.id)}
                    className={`px-3 py-2 rounded-xl border text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap ${
                      isWishlist
                        ? 'bg-amber-100 dark:bg-amber-500/25 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/60 shadow-amber-500/15'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:text-amber-600 dark:hover:text-amber-300 hover:border-slate-400'
                    }`}
                    title="ปักหมุดเป็นการ์ดที่ตามหา (Wishlist)"
                  >
                    <span className="text-sm">⭐</span>
                    <span className="hidden sm:inline">{isWishlist ? 'ใน Wishlist' : '+ Wishlist'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:border-rose-500/60 flex items-center gap-1.5 text-xs font-black transition-all shadow-sm active:scale-95 group"
                  title="ปิดหน้าต่าง (ESC)"
                >
                  <span className="text-sm group-hover:rotate-90 transition-transform duration-200">✕</span>
                  <span>ปิด</span>
                </button>
              </div>
            </div>

            {/* Deck Context Integration (If opened from Deck Editor) */}
            {deck && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 dark:from-indigo-950/90 to-purple-50 dark:to-purple-950/80 border border-indigo-200 dark:border-indigo-500/40 shadow-md dark:shadow-lg flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-600/30 border border-indigo-300 dark:border-indigo-500/50 flex items-center justify-center text-xl shrink-0">
                    🃏
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-wider truncate">
                      ใส่ในเด็ค: {deck.name}
                    </div>
                    <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                      {(deck.cards[activeCard.id]?.count || 0) > 0 ? (
                        <span className="text-emerald-700 dark:text-emerald-300 font-bold">
                          ในเด็คนี้มี {deck.cards[activeCard.id]?.count} ใบ
                          {totalCount < (deck.cards[activeCard.id]?.count || 0) ? (
                            <span className="ml-1.5 text-rose-600 dark:text-rose-400 font-bold text-[11px]">
                              (⚠️ มีในสมุด {totalCount} ใบ ขาด {(deck.cards[activeCard.id]?.count || 0) - totalCount} ใบ)
                            </span>
                          ) : (
                            <span className="ml-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">(✅ มีในสมุดพอแล้ว)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">ยังไม่ได้ใส่การ์ดนี้ในเด็ค</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => removeCardFromDeck(deck.id, activeCard.id)}
                    disabled={!deck.cards[activeCard.id]?.count}
                    className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 disabled:opacity-30 text-slate-800 dark:text-white font-black text-sm flex items-center justify-center transition-all shadow-inner active:scale-95 cursor-pointer"
                    title="ถอดออกจากเด็ค (-1)"
                  >
                    −
                  </button>
                  <span className="w-7 text-center font-mono font-black text-base text-slate-900 dark:text-white">
                    {deck.cards[activeCard.id]?.count || 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => addCardToDeck(deck.id, activeCard.id, 1)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs shadow-md flex items-center gap-1 transition-all cursor-pointer"
                    title="เพิ่มเข้าเด็ค (+1)"
                  >
                    <span>+ ใส่เด็ค</span>
                  </button>
                </div>
              </div>
            )}

            {/* Community Ownership Stats Section */}
            {communityStats.totalUsers > 0 && (
              <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/90 rounded-2xl p-3.5 space-y-2.5 shadow-sm dark:shadow-inner">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">👥</span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">สถิติผู้ครอบครองในการ์ดนี้</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${communityStats.badgeColor}`}>
                    {communityStats.tierLabel}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-300 dark:border-slate-800/80">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min(100, Math.max(communityStats.count > 0 ? 3 : 0, communityStats.percentage))}%`,
                      }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        communityStats.percentage < 10
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                          : communityStats.percentage < 25
                          ? 'bg-gradient-to-r from-purple-500 to-indigo-400'
                          : communityStats.percentage < 50
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-400'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      }`}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-0.5">
                    <span className="text-slate-600 dark:text-slate-400 font-medium">
                      มีผู้สะสม <strong className="text-slate-900 dark:text-white font-bold">{communityStats.count.toLocaleString()}</strong> คนครอบครอง
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-black font-mono">
                      {communityStats.percentage}% <span className="text-slate-400 dark:text-slate-500 font-normal text-[10px]">({communityStats.totalUsers.toLocaleString()} คนทั้งหมด)</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Lorcana-Style Pricing & Market Valuation Section */}
            <CardPricingDetailSection
              card={displayVisualCard}
              collectionCardId={activeCard.id}
              viewingLang={viewingLang}
              isFoil={isFoil}
              enName={
                viewingLang === 'EN'
                  ? (displayVisualCard.name || counterpartData.enMapping?.enName || getEnglishCardName(activeCard) || activeCard.name)
                  : (getEnglishCardName(activeCard) || counterpartData.enMapping?.enName || activeCard.name)
              }
              enSetId={
                viewingLang === 'EN'
                  ? (displayVisualCard.set?.id || counterpartData.enMapping?.enSetId)
                  : (isOriginalEn ? activeCard.set?.id : counterpartData.enMapping?.enSetId)
              }
              enNumber={
                viewingLang === 'EN'
                  ? (displayVisualCard.collectorNumber || displayVisualCard.localId || counterpartData.enMapping?.enNumber)
                  : (isOriginalEn ? (activeCard.collectorNumber || activeCard.localId) : counterpartData.enMapping?.enNumber)
              }
            />

            {/* Applicable Variants List (1 Full-Width Row per Variant) */}
            <div className="space-y-2.5">
              <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                จำนวนการ์ดที่มี (Card Quantity)
              </label>

              <div className="space-y-2">
                {applicableVariants.map(({ key, label, icon, desc }) => {
                  const count = variants[key] || 0;
                  return (
                    <div
                      key={key}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        count > 0
                          ? 'bg-amber-50/80 dark:bg-slate-800/90 border-amber-300 dark:border-amber-500/50 shadow-sm dark:shadow-md dark:shadow-amber-500/5 ring-1 ring-amber-400/20'
                          : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* Variant Info */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="text-2xl flex-shrink-0">{icon}</span>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-100 leading-snug">
                            {label}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                            {desc}
                          </p>
                        </div>
                      </div>

                      {/* Stepper Controls or Read-only Display */}
                      {readOnly ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span
                            className={`px-3 py-1.5 rounded-xl font-mono font-black text-sm ${
                              count > 0
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm'
                                : 'bg-slate-800 text-slate-500 border border-slate-700/50'
                            }`}
                          >
                            {count} ใบ
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => decrementVariant(activeCard.id, key)}
                            disabled={count === 0}
                            className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-30 text-slate-800 dark:text-white font-black text-sm flex items-center justify-center transition-all shadow-sm"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={999}
                            value={count}
                            onChange={(e) => setVariantCount(activeCard.id, key, parseInt(e.target.value, 10) || 0)}
                            className="w-12 text-center bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl py-1.5 text-sm font-black text-amber-600 dark:text-amber-300 focus:outline-none focus:border-amber-500 shadow-inner"
                          />
                          <button
                            onClick={() => incrementVariant(activeCard.id, key)}
                            className="w-8 h-8 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center transition-all shadow-md shadow-amber-500/20"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add to my collection action banner in readOnly mode */}
              {readOnly && (
                <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-xs font-black text-indigo-200">
                      {addedToMyCollection ? '✅ บันทึกเข้าสมุดสะสมของคุณแล้ว!' : 'ต้องการเพิ่มการ์ดนี้เข้าสมุดของคุณ?'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {addedToMyCollection ? 'การ์ดนี้ถูกบันทึก 1 ใบในสมุดของคุณ' : 'คลิกเพื่อบันทึกการ์ดใบนี้เข้าสู่สมุดสะสมส่วนตัว'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      incrementVariant(activeCard.id, 'normal');
                      setAddedToMyCollection(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
                  >
                    <span>➕</span>
                    <span>{addedToMyCollection ? 'เพิ่มอีก 1 ใบ' : 'เพิ่มลงสมุดสะสมของฉัน'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Evolution Chain Section (For Pokemon) */}
            {activeCard.category === 'Pokemon' && (
              <EvolutionChainSection
                currentCard={activeCard}
                onSelectCard={(selectedCard) => setActiveCard(selectedCard)}
              />
            )}

            {/* Condition & Note Section */}
            {readOnly ? (
              (currentCondition || currentNote) && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentCondition && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 block">สภาพการ์ด (Condition)</span>
                        <span className="text-xs font-black text-amber-500">{currentCondition}</span>
                      </div>
                    )}
                    {currentNote && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 block">บันทึกของเจ้าของ (Note)</span>
                        <span className="text-xs text-slate-300">{currentNote}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Condition Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      สภาพการ์ด (Condition)
                    </label>
                    <select
                      value={currentCondition}
                      onChange={(e) => setCardDetails(activeCard.id, { condition: e.target.value as CardCondition })}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:border-amber-500 shadow-inner"
                    >
                      {CONDITIONS.map((c) => (
                        <option key={c.key} value={c.key}>
                          {c.label} ({c.desc})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Card Note */}
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">
                      บันทึกช่วยจำ (Note)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น เก็บในอัลบั้ม A, มีรอยมุมขวา..."
                      value={currentNote}
                      onChange={(e) => setCardDetails(activeCard.id, { note: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-amber-500 shadow-inner"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            {!readOnly && (totalCount > 0 || isWishlist) ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm('คุณต้องการลบการ์ดนี้ออกจากคอลเลกชันใช่หรือไม่?')) {
                    clearCard(activeCard.id);
                  }
                }}
                className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-bold transition-all flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30"
              >
                <span>🗑️</span>
                <span>ล้างออกจากสมุด</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white font-bold text-xs sm:text-sm border border-slate-300 dark:border-slate-700 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
              >
                <span>✕</span>
                <span>ปิด</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-amber-500/25 transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5"
              >
                <span>✓</span>
                <span>บันทึกเรียบร้อย</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Fullscreen Card Image Zoom Modal (100% Lorcana Architecture) */}
      {showZoom &&
        createPortal(
          <div
            data-testid="artwork-fullscreen"
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-fade-in touch-none overscroll-none"
            onClick={(e) => {
              e.stopPropagation();
              setShowZoom(false);
            }}
          >
            <img
              src={resolveCardImageUrl(displayVisualCard.imageUrlHigh || displayVisualCard.imageUrl, true)}
              alt={displayVisualCard.name}
              onError={(e) => handleCardImageError(e, displayVisualCard.imageUrl, displayVisualCard.officialImageUrl)}
              className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl shadow-black"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowZoom(false);
              }}
              aria-label="Close fullscreen"
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-800/90 text-slate-100 text-lg flex items-center justify-center hover:bg-slate-700"
            >
              ✕
            </button>
          </div>,
          document.body
        )}

      {/* Re-match Picker Modal */}
      {showReMatchModal &&
        createPortal(
          <div
            className="fixed inset-0 z-70 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in"
            onClick={(e) => {
              e.stopPropagation();
              setShowReMatchModal(false);
            }}
          >
            <div
              data-testid="rematch-modal"
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100"
            >
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {isOriginalEn
                      ? 'เลือกการ์ดภาษาไทยเพื่อจับคู่กับ:'
                      : 'เลือกการ์ดภาษาอังกฤษเพื่อจับคู่กับ:'}
                  </h3>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 truncate block">
                    {activeCard.name} ({activeCard.set?.name || activeCard.set?.id} #{activeCard.collectorNumber || activeCard.localId})
                  </span>
                </div>
                <button
                  type="button"
                  data-testid="rematch-close-btn"
                  onClick={() => setShowReMatchModal(false)}
                  className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                <input
                  type="text"
                  data-testid="rematch-search-input"
                  value={reMatchSearch}
                  onChange={(e) => setReMatchSearch(e.target.value)}
                  placeholder={
                    isOriginalEn
                      ? 'พิมพ์ค้นหาชื่อการ์ดภาษาไทย เช่น พิคาชู, ลิซาร์ดอน...'
                      : 'พิมพ์ค้นหาชื่อการ์ดภาษาอังกฤษ เช่น Charizard, Iono, Boss...'
                  }
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {reMatchCandidates.map((candidate) => {
                  const candidateImg = candidate.imageUrlHigh || candidate.imageUrl;
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => handleSelectReMatch(candidate)}
                      className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-500 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left flex items-center gap-3 transition-all group"
                    >
                      <div className="w-11 h-15 rounded bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
                        <img
                          src={resolveCardImageUrl(candidateImg)}
                          alt={candidate.name}
                          onError={(e) => handleCardImageError(e, candidateImg, candidate.officialImageUrl)}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-black uppercase text-sky-600 dark:text-sky-400 block truncate">
                          {candidate.set?.name || candidate.set?.id} · #{candidate.collectorNumber || candidate.localId}
                        </span>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-amber-500">
                          {candidate.name}
                        </h5>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {candidate.hp ? `${candidate.hp} HP` : candidate.category}
                        </span>
                      </div>
                      <span className="text-xs text-amber-500 dark:text-amber-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        เลือก ➔
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>,
    document.body
  );
}

