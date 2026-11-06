import { useEffect, useRef, lazy, Suspense } from 'react';
import { useGameStore, type GameMode } from './store/gameStore';
import { BottomNav } from './components/layout/BottomNav';
import { OTAUpdateBanner } from './components/common/OTAUpdateBanner';
import { trackEvent } from './utils/analytics';
import { useThemeStore } from './store/themeStore';
import { usePricingStore } from './store/pricingStore';
import { useCloudForegroundSync } from './hooks/useCloudForegroundSync';
import { fetchApprovedPairings } from './services/communityPairingService';
import { setCloudApprovedMappings } from './utils/thaiEnglishCardMatcher';

// Lazy-loaded routed views for high-performance code splitting (F3)
const CollectionTracker = lazy(() => import('./components/collection/CollectionTracker').then((m) => ({ default: m.CollectionTracker })));
const DeckManager = lazy(() => import('./components/deck/DeckManager').then((m) => ({ default: m.DeckManager })));
const AdminPage = lazy(() => import('./components/admin/AdminPage').then((m) => ({ default: m.AdminPage })));
const CardMappingPage = lazy(() => import('./components/mapping/CardMappingPage').then((m) => ({ default: m.CardMappingPage })));
const SharedCollectionViewer = lazy(() => import('./components/collection/SharedCollectionViewer').then((m) => ({ default: m.SharedCollectionViewer })));

function ViewLoadingFallback() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 text-slate-400">
      <div className="h-10 w-10 animate-spin rounded-full border-3 border-indigo-500/30 border-t-indigo-500" />
      <span className="mt-4 text-xs font-medium tracking-wide text-slate-500">กำลังโหลด...</span>
    </div>
  );
}

// Helper to extract share ID from URL
function getShareIdFromURL(): string | null {
  if (typeof window === 'undefined') return null;
  const path = window.location.pathname;
  const match = path.match(/\/share\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];

  const search = new URLSearchParams(window.location.search);
  const shareParam = search.get('share');
  if (shareParam) return shareParam;

  const hash = window.location.hash;
  const hashMatch = hash.match(/share\/([a-zA-Z0-9_-]+)/);
  if (hashMatch) return hashMatch[1];

  return null;
}

// Helper to determine mode from URL pathname, hash, or query params (F10)
function getModeFromURL(): GameMode {
  const shareId = getShareIdFromURL();
  if (shareId) {
    return 'share';
  }
  const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
  const pathSegments = path.split('/').filter(Boolean);
  const hash = window.location.hash.toLowerCase().replace(/^#\/?/, '');
  const search = new URLSearchParams(window.location.search);
  const modeParam = search.get('mode')?.toLowerCase();

  const isMode = (name: string, aliases: string[] = []) => {
    const names = [name, ...aliases];
    return (
      (modeParam && names.includes(modeParam)) ||
      names.some((n) => pathSegments.includes(n) || hash === n || hash.startsWith(`${n}/`))
    );
  };

  if (isMode('admin')) return 'admin';
  if (isMode('mapping')) return 'mapping';
  if (isMode('deck')) return 'deck';
  if (isMode('collection')) return 'collection';

  // Default: Root URL, disabled Battle/Playmat routes, or unmatched path defaults to Collection Tracker
  return 'collection';
}

function updateURLForMode(mode: GameMode) {
  if (mode === 'share') {
    return;
  }

  const base = import.meta.env.BASE_URL.replace(/\/+$/, '') || '';
  let targetPath = `${base}/collection`;

  if (mode === 'admin') {
    targetPath = `${base}/admin`;
  } else if (mode === 'mapping') {
    targetPath = `${base}/mapping`;
  } else if (mode === 'deck') {
    targetPath = `${base}/deck`;
  } else if (mode === 'collection') {
    targetPath = `${base}/collection`;
  }

  if (window.location.pathname !== targetPath) {
    window.history.pushState({ mode }, '', targetPath);
  }
}

function App() {
  const displayMode = useGameStore((s) => s.displayMode);
  const rawGameMode = useGameStore((s) => s.gameMode);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const gameMode: GameMode =
    rawGameMode === 'pokemon' ||
    rawGameMode === 'playmat-pixi' ||
    rawGameMode === 'playmat-v3' ||
    rawGameMode === 'playmat' ||
    (rawGameMode as string) === 'playmat-v2'
      ? 'collection'
      : rawGameMode;
  useCloudForegroundSync();

  // Initialize mode from URL, theme, and card pricing on mount
  useEffect(() => {
    useThemeStore.getState().initTheme();
    usePricingStore.getState().initPricing();

    // Load and apply community approved card pairings
    fetchApprovedPairings()
      .then((approved) => {
        if (approved && Object.keys(approved).length > 0) {
          setCloudApprovedMappings(approved);
        }
      })
      .catch((err) => {
        console.warn('Could not load community approved card pairings:', err);
      });

    const initialMode = getModeFromURL();
    if (initialMode !== rawGameMode) {
      setGameMode(initialMode);
    }

    const handlePopState = () => {
      const currentMode = getModeFromURL();
      setGameMode(currentMode);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  // Sync URL and log telemetry when gameMode state changes
  const hasAppliedURLMode = useRef(false);
  useEffect(() => {
    // On mount gameMode is still the persisted value; the effect above has queued
    // setGameMode(getModeFromURL()) but it has not landed yet. Rewriting the URL
    // from that stale value replaces /share/<id> with /collection and loses the
    // share id before the viewer reads it. Until the URL-derived mode has been
    // applied, the URL is the source of truth and must not be rewritten.
    // This is a condition, not a one-shot flag, so StrictMode's double-invoke
    // cannot burn through it.
    if (!hasAppliedURLMode.current && gameMode !== getModeFromURL()) return;
    hasAppliedURLMode.current = true;

    updateURLForMode(gameMode);
    trackEvent('navigation', 'page_view', gameMode);
  }, [gameMode]);

  useEffect(() => {
    document.documentElement.dataset.displayMode = displayMode;
    document.documentElement.dataset.gameMode = gameMode;
  }, [displayMode, gameMode]);

  if (gameMode === 'admin') {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <AdminPage onBackToApp={() => setGameMode('collection')} />
      </Suspense>
    );
  }

  if (gameMode === 'mapping') {
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <CardMappingPage onBack={() => setGameMode('deck')} />
      </Suspense>
    );
  }

  if (gameMode === 'share') {
    const shareId = getShareIdFromURL() || '';
    return (
      <Suspense fallback={<ViewLoadingFallback />}>
        <SharedCollectionViewer shareId={shareId} onNavigateHome={() => setGameMode('collection')} />
      </Suspense>
    );
  }

  return (
    <div className="w-full min-h-screen pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
      <Suspense fallback={<ViewLoadingFallback />}>
        {gameMode === 'deck' && <DeckManager />}
        {gameMode === 'collection' && <CollectionTracker />}
      </Suspense>
      <BottomNav />
      <OTAUpdateBanner />
    </div>
  );
}

export default App;
