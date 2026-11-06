import React from 'react';
import { PlaymatV3Canvas } from '../playmat-v3/PlaymatV3Canvas';

export interface PlaymatPixiCanvasProps {
  onSwitchToV3?: () => void;
}

/**
 * PlaymatPixiCanvas — PixiJS v8 Hardware-Accelerated Playmat Engine
 * Shares 100% of the battle-tested Playmat V3 rules, online multi-device room synchronization,
 * and complete flow parity.
 */
export const PlaymatPixiCanvas: React.FC<PlaymatPixiCanvasProps> = ({ onSwitchToV3 }) => {
  return <PlaymatV3Canvas engineMode="pixi" onSwitchEngine={onSwitchToV3} />;
};

export default PlaymatPixiCanvas;
