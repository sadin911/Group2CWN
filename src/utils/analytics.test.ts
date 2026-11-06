import { describe, it, expect, beforeEach } from 'vitest';
import {
  trackEvent,
  getAnalyticsSummary,
  clearTelemetryEvents,
} from './analytics';

describe('analytics & telemetry engine', () => {
  beforeEach(() => {
    clearTelemetryEvents();
  });

  it('tracks search queries and tallies top search terms', () => {
    trackEvent('search', 'query', 'Pikachu');
    trackEvent('search', 'query', 'Charizard');
    trackEvent('search', 'query', 'pikachu');
    trackEvent('search', 'query', 'Mewtwo');

    const summary = getAnalyticsSummary();
    expect(summary.totalEvents).toBe(4);
    expect(summary.uniqueSearches).toBe(3);
    expect(summary.topSearchTerms[0]).toEqual({ term: 'pikachu', count: 2 });
  });

  it('tracks filters across regulation, category, set, and energy type', () => {
    trackEvent('filter', 'regulation', 'STANDARD');
    trackEvent('filter', 'regulation', 'EXPANDED');
    trackEvent('filter', 'category', 'Pokemon');
    trackEvent('filter', 'category', 'Trainer');
    trackEvent('filter', 'set', 'SC1a');
    trackEvent('filter', 'set', 'SC1a');
    trackEvent('filter', 'type', 'Grass');
    trackEvent('filter', 'type', 'Fire');
    trackEvent('filter', 'type', 'Fire');

    const summary = getAnalyticsSummary();
    expect(summary.regulationFilterUsage['STANDARD']).toBe(1);
    expect(summary.regulationFilterUsage['EXPANDED']).toBe(1);
    expect(summary.categoryFilterUsage['Pokemon']).toBe(1);
    expect(summary.setFilterUsage['SC1a']).toBe(2);
    expect(summary.typeFilterUsage['Fire']).toBe(2);
    expect(summary.typeFilterUsage['Grass']).toBe(1);
  });

  it('tracks card collection actions: add, remove, wishlist', () => {
    trackEvent('card', 'add', 'TH-1', { variant: 'normal', count: 1 });
    trackEvent('card', 'add', 'TH-2', { variant: 'foil', count: 2 });
    trackEvent('card', 'remove', 'TH-1');
    trackEvent('card', 'wishlist', 'TH-3');

    const summary = getAnalyticsSummary();
    expect(summary.cardActions.add).toBe(2);
    expect(summary.cardActions.remove).toBe(1);
    expect(summary.cardActions.wishlist).toBe(1);
  });

  it('tracks deck builder actions: create, import, export, add_card', () => {
    trackEvent('deck', 'create', 'Charizard ex');
    trackEvent('deck', 'import', 'Miraidon Deck');
    trackEvent('deck', 'export', 'Charizard ex');
    trackEvent('deck', 'add_card', 'TH-100', { count: 4 });
    trackEvent('deck', 'add_card', 'TH-101', { count: 2 });

    const summary = getAnalyticsSummary();
    expect(summary.deckActions.created).toBe(1);
    expect(summary.deckActions.imported).toBe(1);
    expect(summary.deckActions.exported).toBe(1);
    expect(summary.deckActions.cardsAdded).toBe(2);
  });

  it('clears all telemetry events on clearTelemetryEvents()', () => {
    trackEvent('search', 'query', 'Eevee');
    expect(getAnalyticsSummary().totalEvents).toBe(1);

    clearTelemetryEvents();
    expect(getAnalyticsSummary().totalEvents).toBe(0);
    expect(getAnalyticsSummary().uniqueSearches).toBe(0);
  });
});
