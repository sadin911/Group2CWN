import { useRef } from 'react';
import type { DragEvent, TouchEvent } from 'react';
import type { PlayerId, SlotKey } from '../types/game';
import { useGameStore } from '../store/gameStore';

export function useDragSwap(playerId: PlayerId, slot: SlotKey) {
  const swapSlots = useGameStore(s => s.swapSlots);
  const dragSource = useRef<{ player: PlayerId; slot: SlotKey } | null>(null);

  const onDragStart = (e: DragEvent) => {
    dragSource.current = { player: playerId, slot };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', `${playerId}:${String(slot)}`);
  };

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    const [srcPlayer, srcSlot] = data.split(':');
    if (srcPlayer === playerId) {
      const from = srcSlot === 'active' ? 'active' : (Number(srcSlot) as 0 | 1 | 2 | 3 | 4);
      if (from !== slot) {
        swapSlots(playerId, from, slot);
      }
    }
    dragSource.current = null;
  };

  const onDragEnd = () => {
    dragSource.current = null;
  };

  // Touch support
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  return {
    draggable: true,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    onTouchStart,
  };
}
