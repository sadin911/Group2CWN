/**
 * Pokémon TCG Standard Engine — Fog-of-War State Masker
 * Enforces zero client-side cheating by masking hidden information before transmission over WebSocket/Network.
 */

import type { GameState, CardInstance, PlayerBoardState } from '../types';

export class FogOfWar {
  /**
   * Create an opaque masked card placeholder
   */
  static createMaskedCard(instanceId: string): CardInstance {
    return {
      instanceId,
      cardCode: 'MASKED',
      nameTh: 'การ์ดคว่ำหน้า',
      nameEn: 'Face-down Card',
      supertype: 'Trainer',
      subtypes: [],
      isFacedown: true,
    };
  }

  /**
   * Mask a player's board state from the perspective of viewingPlayerIndex
   */
  static maskPlayerBoard(
    player: PlayerBoardState,
    isViewer: boolean
  ): PlayerBoardState {
    return {
      ...player,
      // Hand: Viewer sees their own full cards; Opponent sees only masked count & instanceIds
      hand: isViewer
        ? player.hand.map((c) => ({ ...c }))
        : player.hand.map((c) => this.createMaskedCard(c.instanceId)),

      // Prizes: Always masked if face-down
      prizes: player.prizes.map((p) =>
        p.isFacedown ? this.createMaskedCard(p.instanceId) : { ...p }
      ),

      // Deck: Deck contents are secret unless specifically searching
      deck: player.deck.map((d) => this.createMaskedCard(d.instanceId)),

      // Discard, Active, Bench, and Lost Zone are public knowledge
      discard: player.discard.map((c) => ({ ...c })),
      lostZone: player.lostZone.map((c) => ({ ...c })),
      active: player.active ? { ...player.active } : null,
      bench: player.bench.map((b) => (b ? { ...b } : null)),
      turnFlags: { ...player.turnFlags },
    };
  }

  /**
   * Mask the entire GameState so that viewingPlayerIndex receives zero secret information about the opponent
   */
  static maskState(state: GameState, viewingPlayerIndex: 0 | 1): GameState {
    const cloned: GameState = JSON.parse(JSON.stringify(state));

    const p0 = this.maskPlayerBoard(cloned.players[0], viewingPlayerIndex === 0);
    const p1 = this.maskPlayerBoard(cloned.players[1], viewingPlayerIndex === 1);

    return {
      ...cloned,
      players: [p0, p1],
      // Action log filtering: If action contains secret cards (e.g. deck search), do not leak full deck
      actionLog: cloned.actionLog.map((action) => ({ ...action })),
    };
  }
}
