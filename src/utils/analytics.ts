/**
 * Lightweight telemetry & analytics engine for PokéCount Tracker.
 * Aggregates user interaction metrics locally & logs to GA4 if configured.
 */

export interface TelemetryEvent {
  id: string;
  category: 'search' | 'filter' | 'card' | 'deck' | 'navigation' | 'auth';
  action: string;
  label?: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface AnalyticsSummary {
  totalEvents: number;
  uniqueSearches: number;
  topSearchTerms: { term: string; count: number }[];
  regulationFilterUsage: Record<string, number>;
  categoryFilterUsage: Record<string, number>;
  setFilterUsage: Record<string, number>;
  typeFilterUsage: Record<string, number>;
  cardActions: {
    add: number;
    remove: number;
    wishlist: number;
  };
  deckActions: {
    created: number;
    imported: number;
    exported: number;
    cardsAdded: number;
  };
  eventsLog: TelemetryEvent[];
}

const STORAGE_KEY = 'pokecount_telemetry_events_v1';
const MAX_LOG_SIZE = 300;

// Initialize GA4 if key exists
export const GA_MEASUREMENT_ID =
  (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim() || 'G-BNNXCMKZZ9';

if (typeof window !== 'undefined' && GA_MEASUREMENT_ID) {
  if (!(window as any).gtag) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(..._args: any[]) {
      // eslint-disable-next-line prefer-rest-params
      (window as any).dataLayer.push(arguments);
    }
    (window as any).gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, {
      page_path: window.location.pathname + window.location.hash,
    });
  }
}

let memoryEvents: TelemetryEvent[] = [];

function hasLocalStorage(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      typeof window.localStorage.getItem === 'function' &&
      typeof window.localStorage.setItem === 'function' &&
      typeof window.localStorage.removeItem === 'function'
    );
  } catch {
    return false;
  }
}

function loadLocalEvents(): TelemetryEvent[] {
  if (!hasLocalStorage()) {
    return memoryEvents;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : memoryEvents;
  } catch {
    return memoryEvents;
  }
}

function saveLocalEvents(events: TelemetryEvent[]) {
  const trimmed = events.slice(-MAX_LOG_SIZE);
  memoryEvents = trimmed;
  if (!hasLocalStorage()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('Failed to save telemetry events:', err);
  }
}

export function trackEvent(
  category: TelemetryEvent['category'],
  action: string,
  label?: string,
  metadata?: Record<string, any>
) {
  const event: TelemetryEvent = {
    id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    category,
    action,
    label,
    metadata,
    timestamp: Date.now(),
  };

  const existing = loadLocalEvents();
  existing.push(event);
  saveLocalEvents(existing);

  // Send to GA4 if configured
  if (typeof window !== 'undefined' && typeof (window as any).gtag === 'function') {
    if (category === 'navigation' && action === 'page_view') {
      (window as any).gtag('event', 'page_view', {
        page_title: label || 'PokéCount Tracker',
        page_path: window.location.pathname + window.location.hash,
        page_location: window.location.href,
      });
    } else {
      (window as any).gtag('event', action, {
        event_category: category,
        event_label: label,
        ...metadata,
      });
    }
  }
}

export function getAnalyticsSummary(): AnalyticsSummary {
  const events = loadLocalEvents();
  const searchCounts: Record<string, number> = {};
  const regulationCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  const setCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};

  let addCardCount = 0;
  let removeCardCount = 0;
  let wishlistCardCount = 0;
  let deckCreatedCount = 0;
  let deckImportedCount = 0;
  let deckExportedCount = 0;
  let deckAddCardCount = 0;

  events.forEach((ev) => {
    if (ev.category === 'search' && ev.label) {
      const q = ev.label.trim().toLowerCase();
      if (q) searchCounts[q] = (searchCounts[q] || 0) + 1;
    } else if (ev.category === 'filter') {
      if (ev.action === 'regulation' && ev.label) {
        regulationCounts[ev.label] = (regulationCounts[ev.label] || 0) + 1;
      } else if (ev.action === 'category' && ev.label) {
        categoryCounts[ev.label] = (categoryCounts[ev.label] || 0) + 1;
      } else if (ev.action === 'set' && ev.label) {
        setCounts[ev.label] = (setCounts[ev.label] || 0) + 1;
      } else if (ev.action === 'type' && ev.label) {
        typeCounts[ev.label] = (typeCounts[ev.label] || 0) + 1;
      }
    } else if (ev.category === 'card') {
      if (ev.action === 'add') addCardCount++;
      else if (ev.action === 'remove') removeCardCount++;
      else if (ev.action === 'wishlist') wishlistCardCount++;
    } else if (ev.category === 'deck') {
      if (ev.action === 'create') deckCreatedCount++;
      else if (ev.action === 'import') deckImportedCount++;
      else if (ev.action === 'export') deckExportedCount++;
      else if (ev.action === 'add_card') deckAddCardCount++;
    }
  });

  const topSearchTerms = Object.entries(searchCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15)
    .map(([term, count]) => ({ term, count }));

  return {
    totalEvents: events.length,
    uniqueSearches: Object.keys(searchCounts).length,
    topSearchTerms,
    regulationFilterUsage: regulationCounts,
    categoryFilterUsage: categoryCounts,
    setFilterUsage: setCounts,
    typeFilterUsage: typeCounts,
    cardActions: {
      add: addCardCount,
      remove: removeCardCount,
      wishlist: wishlistCardCount,
    },
    deckActions: {
      created: deckCreatedCount,
      imported: deckImportedCount,
      exported: deckExportedCount,
      cardsAdded: deckAddCardCount,
    },
    eventsLog: events.slice().reverse(),
  };
}

export function clearTelemetryEvents() {
  memoryEvents = [];
  if (!hasLocalStorage()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear telemetry events:', err);
  }
}
