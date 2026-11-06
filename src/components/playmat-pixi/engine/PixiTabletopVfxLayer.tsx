import React, { useEffect, useRef } from 'react';
import { Application, Container } from 'pixi.js';
import { PixiParticleSystem } from './PixiParticleSystem';
import { PixiStadiumSpotlight } from './PixiStadiumSpotlight';
import { PixiCardMotionAnimator } from './PixiCardMotionAnimator';
import { PixiCombatVfx } from './PixiCombatVfx';
import { PixiTurnBanner } from './PixiTurnBanner';
import type { TabletopCombatState, CardInstance } from '../../playmat-v3/types';

export interface PixiTabletopVfxLayerProps {
  p1ActiveCard?: CardInstance | null;
  p2ActiveCard?: CardInstance | null;
  p1DeckCount?: number;
  p2DeckCount?: number;
  p1HandCount?: number;
  p2HandCount?: number;
  currentTurn?: 'player1' | 'player2';
  turnCount?: number;
  isMyTurn?: boolean;
  shuffleNotice?: string | null;
  combatState?: TabletopCombatState | null;
  stadium?: CardInstance | null;
  lastPlayEvent?: { x: number; y: number; color?: number; timestamp: number } | null;
  particlesEnabled?: boolean;
  className?: string;
}

export const PixiTabletopVfxLayer: React.FC<PixiTabletopVfxLayerProps> = ({
  p1ActiveCard,
  p2ActiveCard,
  p1DeckCount = 60,
  p2DeckCount = 60,
  p1HandCount = 0,
  p2HandCount = 0,
  currentTurn = 'player1',
  turnCount = 1,
  isMyTurn = true,
  shuffleNotice,
  combatState,
  stadium,
  lastPlayEvent,
  particlesEnabled = true,
  className = '',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const particleSysRef = useRef<PixiParticleSystem | null>(null);
  const spotlightRef = useRef<PixiStadiumSpotlight | null>(null);
  const cardMotionRef = useRef<PixiCardMotionAnimator | null>(null);
  const combatVfxRef = useRef<PixiCombatVfx | null>(null);
  const turnBannerRef = useRef<PixiTurnBanner | null>(null);
  const rootContainerRef = useRef<Container | null>(null);

  // Trail performance throttle & rect cache refs to prevent layout thrashing
  const lastTrailTimeRef = useRef<number>(0);
  const cachedRectRef = useRef<DOMRect | null>(null);
  const lastRectTimeRef = useRef<number>(0);

  // Derive energy types
  const p1EnergyType = p1ActiveCard?.energyType || (p1ActiveCard as any)?.types?.[0] || 'N';
  const p2EnergyType = p2ActiveCard?.energyType || (p2ActiveCard as any)?.types?.[0] || 'N';

  // Dynamic props ref so the ticker loop always reads the freshest card/energy data without recreating the WebGL canvas
  const dynamicPropsRef = useRef({
    particlesEnabled,
    p1ActiveCard,
    p2ActiveCard,
    p1EnergyType,
    p2EnergyType,
  });
  dynamicPropsRef.current = {
    particlesEnabled,
    p1ActiveCard,
    p2ActiveCard,
    p1EnergyType,
    p2EnergyType,
  };

  // 1. Initialize PixiJS v8 Application ONCE on mount
  useEffect(() => {
    let isCancelled = false;
    let resizeListener: (() => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const container = mountRef.current;
    if (!container) return;

    const initPixi = async () => {
      try {
        const app = new Application();
        await app.init({
          resizeTo: container,
          backgroundAlpha: 0,
          antialias: true,
          resolution: Math.min(window.devicePixelRatio || 1, 2),
          autoDensity: true,
        });

        if (isCancelled) {
          app.destroy({ removeView: true });
          return;
        }

        appRef.current = app;
        container.appendChild(app.canvas);

        const rootContainer = new Container();
        rootContainerRef.current = rootContainer;
        app.stage.addChild(rootContainer);

        // A. Spotlight Layer
        const spotlight = new PixiStadiumSpotlight();
        const currentProps = dynamicPropsRef.current;
        spotlight.setActiveTypes(currentProps.p1EnergyType, currentProps.p2EnergyType);
        if (stadium) {
          spotlight.setStadiumTint(stadium.nameEn || stadium.nameTh);
        }
        spotlightRef.current = spotlight;
        rootContainer.addChild(spotlight);

        // B. Particle System Layer
        const particleSys = new PixiParticleSystem(rootContainer);
        particleSysRef.current = particleSys;

        // C. Card Motion Layer
        const cardMotion = new PixiCardMotionAnimator(rootContainer);
        cardMotionRef.current = cardMotion;

        // D. Combat VFX Layer
        const combatVfx = new PixiCombatVfx(rootContainer);
        combatVfxRef.current = combatVfx;

        // E. Turn Banner Layer
        const turnBanner = new PixiTurnBanner(rootContainer);
        turnBannerRef.current = turnBanner;

        // Auto-scale virtual coordinates (1440x900) to actual canvas size with 1:1 board alignment
        const handleResize = () => {
          if (!app.renderer) return;
          const w = app.screen.width;
          const h = app.screen.height;

          // 1:1 Board-relative anchoring:
          // Align virtual center (720, 450) precisely to the gameplay midline element (#center-board-zone)
          const centerZoneEl = document.getElementById('center-board-zone');
          const boardEl = document.getElementById('playmat-v3-board') || document.getElementById('playmat-arena-container');
          const containerRect = container.getBoundingClientRect();

          let targetCenterX = w / 2;
          let targetCenterY = h / 2;
          let scale = Math.min(w / 1440, h / 900);

          if (centerZoneEl && boardEl) {
            const czRect = centerZoneEl.getBoundingClientRect();
            const bRect = boardEl.getBoundingClientRect();

            targetCenterX = (czRect.left - containerRect.left) + czRect.width / 2;
            targetCenterY = (czRect.top - containerRect.top) + czRect.height / 2;

            const scaleX = bRect.width / 1440;
            const scaleY = (bRect.height + 30) / 800;
            scale = Math.min(scaleX, scaleY, Math.min(w / 1400, h / 720));
          } else if (boardEl) {
            const bRect = boardEl.getBoundingClientRect();
            targetCenterX = (bRect.left - containerRect.left) + bRect.width / 2;
            targetCenterY = (bRect.top - containerRect.top) + bRect.height / 2;
            const scaleX = bRect.width / 1440;
            const scaleY = bRect.height / 760;
            scale = Math.min(scaleX, scaleY, Math.min(w / 1400, h / 720));
          }

          rootContainer.scale.set(scale);
          rootContainer.position.set(
            targetCenterX - 720 * scale,
            targetCenterY - 450 * scale
          );

          particleSys.setDimensions(w, h);
          turnBanner.setDimensions(1440, 900);
          cachedRectRef.current = null;
        };

        handleResize();
        resizeListener = handleResize;
        window.addEventListener('resize', handleResize);

        // ResizeObserver to detect layout changes on the board dynamically
        const observedEl = document.getElementById('playmat-v3-board') || document.getElementById('playmat-arena-container');
        if (observedEl && typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => {
            handleResize();
          });
          resizeObserver.observe(observedEl);
        }

        // F. Pixi Ticker Update Loop
        let frameCount = 0;
        let lastFpsUpdate = Date.now();

        app.ticker.add((ticker) => {
          const delta = ticker.deltaTime;
          const deltaMs = ticker.deltaMS || delta * 16.6;

          spotlight.update(delta);
          particleSys.update(delta);
          cardMotion.update(deltaMs);
          combatVfx.update(deltaMs);
          turnBanner.update(deltaMs);

          const {
            particlesEnabled: isParticlesOn,
            p1ActiveCard: activeP1,
            p2ActiveCard: activeP2,
            p1EnergyType: typeP1,
            p2EnergyType: typeP2,
          } = dynamicPropsRef.current;

          // Periodic Ambient Aura Emitters (every ~3 frames for rich, energetic elemental presence)
          frameCount++;
          if (isParticlesOn && frameCount % 3 === 0) {
            if (activeP1) {
              particleSys.emitElemental(typeP1, 720, 540, 2);
            }
            if (activeP2) {
              particleSys.emitElemental(typeP2, 720, 360, 2);
            }
          }

          // Periodic Holo Specular Shimmer sweep across active card
          if (isParticlesOn && frameCount % 180 === 0 && activeP1) {
            particleSys.emitSlash(660, 500, 780, 580, 0xffffff);
          }

          // Update stats every 1 second directly on DOM container (0 React re-renders)
          const now = Date.now();
          if (now - lastFpsUpdate >= 1000) {
            if (mountRef.current) {
              mountRef.current.setAttribute('data-fps', String(Math.round(ticker.FPS)));
              mountRef.current.setAttribute(
                'data-particles',
                String(particleSys.particleCount + cardMotion.getActiveCount() + combatVfx.getActiveCount())
              );
            }
            lastFpsUpdate = now;
          }
        });
      } catch (err) {
        console.warn('[PixiTabletopVfxLayer] WebGL/WebGPU init warning:', err);
      }
    };

    initPixi();

    return () => {
      isCancelled = true;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (resizeListener) {
        window.removeEventListener('resize', resizeListener);
      }
      if (appRef.current) {
        try {
          appRef.current.destroy({ removeView: true });
        } catch {}
        appRef.current = null;
      }
      particleSysRef.current = null;
      spotlightRef.current = null;
      cardMotionRef.current = null;
      combatVfxRef.current = null;
      turnBannerRef.current = null;
      rootContainerRef.current = null;
    };
  }, []);

  // 2. React to Stadium Changes & Active Pokemon Elemental Energy sync
  useEffect(() => {
    if (spotlightRef.current) {
      spotlightRef.current.setStadiumTint(stadium?.nameEn || stadium?.nameTh);
    }
  }, [stadium?.nameEn, stadium?.nameTh]);

  useEffect(() => {
    if (spotlightRef.current) {
      spotlightRef.current.setActiveTypes(p1EnergyType, p2EnergyType);
    }
  }, [p1EnergyType, p2EnergyType]);

  // 3. React to Card Draw Events
  const prevP1DeckCountRef = useRef(p1DeckCount);
  const prevP1HandCountRef = useRef(p1HandCount);
  const prevP2DeckCountRef = useRef(p2DeckCount);
  const prevP2HandCountRef = useRef(p2HandCount);

  useEffect(() => {
    const motion = cardMotionRef.current;
    if (motion && particlesEnabled) {
      if (p1HandCount > prevP1HandCountRef.current && p1DeckCount < prevP1DeckCountRef.current) {
        // P1 Deck (1250, 700) -> Hand (720, 840)
        motion.triggerDraw(1250, 700, 720, 840, 0x38bdf8);
      }
      if (p2HandCount > prevP2HandCountRef.current && p2DeckCount < prevP2DeckCountRef.current) {
        // P2 Deck (190, 200) -> Hand (720, 60)
        motion.triggerDraw(190, 200, 720, 60, 0xf43f5e);
      }
    }
    prevP1DeckCountRef.current = p1DeckCount;
    prevP1HandCountRef.current = p1HandCount;
    prevP2DeckCountRef.current = p2DeckCount;
    prevP2HandCountRef.current = p2HandCount;
  }, [p1DeckCount, p1HandCount, p2DeckCount, p2HandCount, particlesEnabled]);

  // 4. React to Card Placement on Active
  const prevP1ActiveRef = useRef(p1ActiveCard?.instanceId);
  const prevP2ActiveRef = useRef(p2ActiveCard?.instanceId);

  useEffect(() => {
    const motion = cardMotionRef.current;
    if (motion && particlesEnabled) {
      if (p1ActiveCard?.instanceId && p1ActiveCard.instanceId !== prevP1ActiveRef.current) {
        motion.triggerPlacement(720, 540, 0x60a5fa);
        particleSysRef.current?.emitShockwave(720, 540, 0x38bdf8, 120);
        particleSysRef.current?.emitElemental(p1EnergyType, 720, 540, 6);
      }
      if (p2ActiveCard?.instanceId && p2ActiveCard.instanceId !== prevP2ActiveRef.current) {
        motion.triggerPlacement(720, 360, 0xf43f5e);
        particleSysRef.current?.emitShockwave(720, 360, 0xf43f5e, 120);
        particleSysRef.current?.emitElemental(p2EnergyType, 720, 360, 6);
      }
    }
    prevP1ActiveRef.current = p1ActiveCard?.instanceId;
    prevP2ActiveRef.current = p2ActiveCard?.instanceId;
  }, [p1ActiveCard?.instanceId, p2ActiveCard?.instanceId, p1EnergyType, p2EnergyType, particlesEnabled]);

  // 5. React to Deck Shuffle Events
  const prevShuffleNoticeRef = useRef<string | null>(null);

  useEffect(() => {
    const motion = cardMotionRef.current;
    if (motion && particlesEnabled && shuffleNotice && shuffleNotice !== prevShuffleNoticeRef.current) {
      motion.triggerDeckShuffle(1250, 700);
    }
    prevShuffleNoticeRef.current = shuffleNotice || null;
  }, [shuffleNotice, particlesEnabled]);

  // 6. React to Turn Changes (Turn Announcement Banner & Celebration Particle Stardust)
  const prevTurnRef = useRef<string>(currentTurn);

  useEffect(() => {
    const sys = particleSysRef.current;
    const banner = turnBannerRef.current;
    if (currentTurn !== prevTurnRef.current) {
      if (sys && particlesEnabled) {
        sys.emitCelebration(isMyTurn);
      }
      if (banner) {
        banner.trigger(isMyTurn, parseInt(currentTurn, 10) || 1);
      }
    }
    prevTurnRef.current = currentTurn;
  }, [currentTurn, isMyTurn, particlesEnabled]);

  // 7. React to Combat State Changes (Attack declaration and damage impact)
  const prevCombatTimestampRef = useRef<number>(0);

  useEffect(() => {
    const sys = particleSysRef.current;
    const combatVfx = combatVfxRef.current;
    if (!sys || !combatState) return;

    if (combatState.timestamp && combatState.timestamp !== prevCombatTimestampRef.current) {
      prevCombatTimestampRef.current = combatState.timestamp;

      const isP1Attacking = combatState.attackerSide === 'player1';
      const fromX = 720;
      const fromY = isP1Attacking ? 540 : 360;
      const toX = 720;
      const toY = isP1Attacking ? 360 : 540;

      // Color from attacking energy
      const color = isP1Attacking
        ? (p1EnergyType === 'R' ? 0xef4444 : 0x38bdf8)
        : (p2EnergyType === 'R' ? 0xef4444 : 0xf43f5e);

      const dmg = combatState.calculatedDamage || combatState.baseDamage || 0;

      // Trigger high-speed energy projectile beam
      combatVfx?.triggerProjectile(fromX, fromY, toX, toY, color, () => {
        // Shockwave on hit
        sys.emitShockwave(toX, toY, color, 140);
        // Floating damage text pop
        if (dmg > 0) {
          combatVfx.triggerDamageFloater(toX, toY, dmg);
        }
        // Heavy/critical hit or lethal KO: high-impact shockwave and spark bursts (zero camera/scene displacement)
        if (dmg >= 120) {
          sys.emitShockwave(toX, toY, color, 200);
          for (let k = 0; k < 20; k++) {
            sys.emitTrail(toX, toY, color);
          }
        }
      });

      // Also trigger slash line
      sys.emitSlash(fromX, fromY, toX, toY, color);
    }
  }, [combatState, p1EnergyType, p2EnergyType]);

  // 8. Balatro Card Placement Spark & Shockwave Burst
  useEffect(() => {
    if (!lastPlayEvent || !particleSysRef.current || !rootContainerRef.current) return;
    const rect = mountRef.current?.getBoundingClientRect();
    if (!rect) return;

    const scale = rootContainerRef.current.scale.x || 1;
    const vx = (lastPlayEvent.x - rect.left - rootContainerRef.current.x) / scale;
    const vy = (lastPlayEvent.y - rect.top - rootContainerRef.current.y) / scale;

    particleSysRef.current.emitBalatroSparks(vx, vy, lastPlayEvent.color || 0xf59e0b, 18);
    particleSysRef.current.emitShockwave(vx, vy, lastPlayEvent.color || 0x38bdf8, 80);
  }, [lastPlayEvent]);

  // 9. Interactive Cursor Particle Trail Handler (Throttled to ~30fps, zero layout thrashing)
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!particlesEnabled || !particleSysRef.current || !rootContainerRef.current) return;
    const now = performance.now();
    if (now - lastTrailTimeRef.current < 32) return;
    lastTrailTimeRef.current = now;

    if (!cachedRectRef.current || now - lastRectTimeRef.current > 500) {
      cachedRectRef.current = mountRef.current?.getBoundingClientRect() || null;
      lastRectTimeRef.current = now;
    }
    const rect = cachedRectRef.current;
    if (!rect) return;

    // Convert screen coordinates to virtual board coordinates
    const scale = rootContainerRef.current.scale.x || 1;
    const vx = (e.clientX - rect.left - rootContainerRef.current.x) / scale;
    const vy = (e.clientY - rect.top - rootContainerRef.current.y) / scale;

    particleSysRef.current.emitTrail(vx, vy);
  };

  return (
    <div
      id="pixi-canvas-container"
      ref={mountRef}
      onPointerMove={handlePointerMove}
      data-turn-count={turnCount}
      data-fps="60"
      data-particles="0"
      className={`w-full h-full absolute inset-0 pointer-events-auto z-0 overflow-hidden ${className}`}
      data-testid="pixi-vfx-layer"
    />
  );
};

export default PixiTabletopVfxLayer;
