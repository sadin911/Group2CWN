import { useState, useCallback, useRef } from 'react';

export interface BalatroCardTiltOptions {
  maxTilt?: number; // Maximum tilt angle in degrees (default: 14)
  scale?: number; // Scale factor when hovered (default: 1.08)
  elevation?: number; // TranslateZ elevation in pixels (default: 16)
  enabled?: boolean; // Toggle flag
}

export interface BalatroCardTiltResult {
  transformStyle: React.CSSProperties;
  glintStyle: React.CSSProperties;
  isHovered: boolean;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerEnter: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerLeave: () => void;
  resetTilt: () => void;
}

/**
 * Pure helper function to compute Balatro 3D perspective rotation angles and specular glint coordinates.
 */
export function calculateBalatroTilt(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  maxTilt = 14
) {
  if (!rect.width || !rect.height) {
    return { rx: 0, ry: 0, px: 50, py: 50 };
  }
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  const normX = Math.max(-1, Math.min(1, (x / rect.width - 0.5) * 2));
  const normY = Math.max(-1, Math.min(1, (y / rect.height - 0.5) * 2));

  return {
    rx: -normY * maxTilt,
    ry: normX * maxTilt,
    px: (normX + 1) * 50,
    py: (normY + 1) * 50,
  };
}

/**
 * Hook for Balatro-style 3D card tilt and specular light glint physics.
 * Tracks pointer offset relative to card center and applies smooth 3D perspective rotation.
 */
export function useBalatroCardTilt(options: BalatroCardTiltOptions = {}): BalatroCardTiltResult {
  const { maxTilt = 14, scale = 1.08, elevation = 16, enabled = true } = options;

  const [tilt, setTilt] = useState({ rx: 0, ry: 0, px: 50, py: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const rafRef = useRef<number | null>(null);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled) return;

      // Avoid touch dragging interference
      if (e.pointerType === 'touch') return;

      const rect = e.currentTarget.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const nextTilt = calculateBalatroTilt(e.clientX, e.clientY, rect, maxTilt);

      // Cancel pending RAF
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        setTilt(nextTilt);
      });
    },
    [enabled, maxTilt]
  );

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (!enabled || e.pointerType === 'touch') return;
      setIsHovered(true);
      handlePointerMove(e);
    },
    [enabled, handlePointerMove]
  );

  const handlePointerLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsHovered(false);
    setTilt({ rx: 0, ry: 0, px: 50, py: 50 });
  }, []);

  const resetTilt = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setIsHovered(false);
    setTilt({ rx: 0, ry: 0, px: 50, py: 50 });
  }, []);

  const transformStyle: React.CSSProperties = isHovered && enabled
    ? {
        transform: `perspective(800px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg) translateZ(${elevation}px) scale3d(${scale}, ${scale}, 1)`,
        transition: 'transform 75ms ease-out, box-shadow 150ms ease-out',
        willChange: 'transform',
        transformStyle: 'preserve-3d',
      }
    : {
        transform: 'perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)',
        transition: 'transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 300ms ease-out',
        transformStyle: 'preserve-3d',
      };

  const glintStyle: React.CSSProperties = isHovered && enabled
    ? {
        background: `radial-gradient(circle at ${tilt.px.toFixed(1)}% ${tilt.py.toFixed(1)}%, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.15) 30%, transparent 65%)`,
        opacity: 0.9,
        transition: 'opacity 150ms ease-out',
      }
    : {
        opacity: 0,
        transition: 'opacity 250ms ease-out',
      };

  return {
    transformStyle,
    glintStyle,
    isHovered,
    onPointerMove: handlePointerMove,
    onPointerEnter: handlePointerEnter,
    onPointerLeave: handlePointerLeave,
    resetTilt,
  };
}
