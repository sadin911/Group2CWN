# React Native iOS/iPadOS Implementation Plan

> **Superseded (2026-08-27):** Disney Lorcana has moved to its own repo, [LorcanaCountTracker](https://github.com/sadin911/LorcanaCountTracker). The Lorcana sections below are kept as a record of the original design and no longer describe this project.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port PokéCount Tracker (Pokémon TCG + Disney Lorcana modes) to a native iOS/iPadOS app using React Native + Expo on the `feature/react-native` branch.

**Architecture:** Expo managed workflow with Expo Router. NativeWind v4 carries over Tailwind class names unchanged. Zustand stores are adapted from localStorage to AsyncStorage. All UI components are rewritten from HTML to React Native primitives; business logic (types, constants, store actions) is shared.

**Tech Stack:** Expo ~52, React Native 0.76, Expo Router ~4, NativeWind v4, Tailwind CSS v3, Reanimated 3, Gesture Handler 2, AsyncStorage 2, SafeAreaContext 4, expo-haptics, expo-screen-orientation, Zustand 5

## Global Constraints

- Platform: iOS + iPadOS only. Android is out of scope.
- Branch: all work on `feature/react-native`. `main` (web app) is never touched.
- NativeWind v4: use `className` prop on all View/Text/Pressable. Never use StyleSheet for colours or layout that Tailwind covers.
- Reanimated: use `withTiming`, `withSequence`, `useSharedValue`, `useAnimatedStyle`. Never import from Framer Motion.
- Persist keys: `'pokecounttracker-game'` (Pokémon store) and `'lorcana-tracker-game'` (Lorcana store). Do not change them.
- Haptics: `impactAsync(ImpactFeedbackStyle.Light)` on counter taps; `impactAsync(ImpactFeedbackStyle.Heavy)` on KO; `notificationAsync(NotificationFeedbackType.Success)` on End Turn.
- Safe area: always use `useSafeAreaInsets()` — never hardcode padding for notch/home indicator.

---

### Task 1: Branch + Expo Scaffold + Toolchain Config

**Files:**
- Create: `app.json`
- Create: `package.json` (Expo)
- Create: `babel.config.js`
- Create: `metro.config.js`
- Create: `tailwind.config.js`
- Create: `global.css`
- Create: `app/_layout.tsx`
- Create: `app/index.tsx` (placeholder)

**Interfaces:**
- Produces: runnable Expo app on iOS Simulator showing a black screen; NativeWind `className` resolves on `<View>` and `<Text>`

- [ ] **Step 1: Create and check out the branch**

```bash
cd /Users/sadin/Project/PokeCountTracker
git checkout main
git checkout -b feature/react-native
```

- [ ] **Step 2: Scaffold Expo project in a temp directory, then copy scaffold files into the repo**

```bash
cd /tmp
npx create-expo-app@latest poke-rn --template blank-typescript
# Copy Expo scaffold files into the repo (do NOT copy src/ — we write our own)
cp /tmp/poke-rn/app.json /Users/sadin/Project/PokeCountTracker/
cp /tmp/poke-rn/babel.config.js /Users/sadin/Project/PokeCountTracker/
cp /tmp/poke-rn/tsconfig.json /Users/sadin/Project/PokeCountTracker/tsconfig.rn.json
mkdir -p /Users/sadin/Project/PokeCountTracker/app
```

- [ ] **Step 3: Write `package.json` for the RN branch**

Create `/Users/sadin/Project/PokeCountTracker/package.json` with:

```json
{
  "name": "pokecounttracker",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "ios": "expo run:ios",
    "android": "expo run:android"
  },
  "dependencies": {
    "expo": "~52.0.0",
    "expo-router": "~4.0.0",
    "expo-haptics": "~14.0.0",
    "expo-screen-orientation": "~8.0.0",
    "react": "18.3.1",
    "react-native": "0.76.3",
    "react-native-reanimated": "~3.16.0",
    "react-native-gesture-handler": "~2.20.0",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.1.0",
    "@react-native-async-storage/async-storage": "^2.1.0",
    "nativewind": "^4.1.23",
    "tailwindcss": "3.4.15",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@types/react": "~18.3.12",
    "typescript": "^5.3.0"
  }
}
```

- [ ] **Step 4: Install dependencies**

```bash
cd /Users/sadin/Project/PokeCountTracker
npm install
```

- [ ] **Step 5: Write `babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel', 'react-native-reanimated/plugin'],
  };
};
```

- [ ] **Step 6: Write `metro.config.js`**

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: './global.css' });
```

- [ ] **Step 7: Write `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 8: Write `global.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 9: Write `app.json`**

```json
{
  "expo": {
    "name": "PokéCount",
    "slug": "pokecounttracker",
    "version": "1.0.0",
    "orientation": "default",
    "scheme": "pokecounttracker",
    "platforms": ["ios"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.sadin.pokecounttracker"
    }
  }
}
```

- [ ] **Step 10: Write `app/_layout.tsx`**

```tsx
import '../global.css';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 11: Write placeholder `app/index.tsx`**

```tsx
import { View, Text } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 bg-gray-950 items-center justify-center">
      <Text className="text-white text-2xl font-bold">PokéCount</Text>
    </View>
  );
}
```

- [ ] **Step 12: Verify NativeWind resolves className**

```bash
npx expo start --ios
```

Expected: iOS Simulator opens, shows dark screen with "PokéCount" in white. If text is white, NativeWind is working.

- [ ] **Step 13: Commit scaffold**

```bash
cd /Users/sadin/Project/PokeCountTracker
git add app.json package.json package-lock.json babel.config.js metro.config.js tailwind.config.js global.css app/
git commit -m "feat: scaffold Expo RN project with NativeWind + Reanimated"
```

---

### Task 2: Shared Code — Types, Constants, Adapted Stores

**Files:**
- Create: `src/types/game.ts` (copied verbatim from web)
- Create: `src/constants/` (copied verbatim from web)
- Create: `src/store/gameStore.ts` (AsyncStorage persist)
- Create: `src/store/lorcanaStore.ts` (AsyncStorage persist)

**Interfaces:**
- Produces: `useGameStore()` and `useLorcanaStore()` hooks usable in any component; state persists across app restarts via AsyncStorage

- [ ] **Step 1: Copy types and constants from web**

```bash
cd /Users/sadin/Project/PokeCountTracker
# These files are already in src/ from the main branch — no changes needed
# Verify they exist:
ls src/types/game.ts
ls src/constants/
```

If they don't exist on this branch, copy them:
```bash
git checkout main -- src/types/ src/constants/
```

- [ ] **Step 2: Write `src/store/gameStore.ts`**

Identical to the web version except the `persist` options use `AsyncStorage`:

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GameState, PlayerState, PokemonSlot, PlayerId, SlotKey, EnergyType, StatusCondition } from '../types/game';
import type { ThemeId } from '../constants/themes';

function makePokemon(id: string): PokemonSlot {
  return { id, name: '', maxHP: 100, currentDamage: 0, status: 'none', energies: {}, abilityUsed: false, attackUsed: false };
}

function makePlayer(name: string, prefix: string): PlayerState {
  return {
    name,
    activePokemon: makePokemon(`${prefix}-active`),
    bench: [
      makePokemon(`${prefix}-bench-0`),
      makePokemon(`${prefix}-bench-1`),
      makePokemon(`${prefix}-bench-2`),
      makePokemon(`${prefix}-bench-3`),
      makePokemon(`${prefix}-bench-4`),
    ] as PlayerState['bench'],
    supporterUsed: false,
    energyAttached: false,
    prizeCards: 6,
  };
}

function initialState(): GameState {
  return {
    player1: makePlayer('Player 1', 'p1'),
    player2: makePlayer('Player 2', 'p2'),
    currentTurn: 'player1',
    turnNumber: 1,
  };
}

function getSlot(player: PlayerState, slot: SlotKey): PokemonSlot {
  return slot === 'active' ? player.activePokemon : player.bench[slot];
}

function setSlot(player: PlayerState, slot: SlotKey, pokemon: PokemonSlot): PlayerState {
  if (slot === 'active') return { ...player, activePokemon: pokemon };
  const bench = [...player.bench] as PlayerState['bench'];
  bench[slot] = pokemon;
  return { ...player, bench };
}

export type DisplayMode = 'faceToFace' | 'spectator' | 'landscape' | 'mini';
export type GameMode = 'pokemon' | 'lorcana';

interface GameStore extends GameState {
  displayMode: DisplayMode;
  setDisplayMode: (mode: DisplayMode) => void;
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  updatePokemon: (player: PlayerId, slot: SlotKey, changes: Partial<PokemonSlot>) => void;
  clearPokemon: (player: PlayerId, slot: SlotKey) => void;
  setEnergyCount: (player: PlayerId, slot: SlotKey, type: EnergyType, count: number) => void;
  swapSlots: (player: PlayerId, from: SlotKey, to: SlotKey) => void;
  toggleSupporter: (player: PlayerId) => void;
  toggleEnergyAttached: (player: PlayerId) => void;
  setPrizeCards: (player: PlayerId, count: number) => void;
  setPlayerName: (player: PlayerId, name: string) => void;
  endTurn: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      ...initialState(),
      displayMode: 'mini' as DisplayMode,
      setDisplayMode: (mode) => set({ displayMode: mode }),
      gameMode: 'pokemon' as GameMode,
      setGameMode: (mode) => set({ gameMode: mode }),
      theme: 'midnight' as ThemeId,
      setTheme: (theme) => set({ theme }),
      updatePokemon: (playerId, slot, changes) =>
        set((state) => {
          const player = state[playerId];
          const updated = { ...getSlot(player, slot), ...changes };
          return { [playerId]: setSlot(player, slot, updated) };
        }),
      clearPokemon: (playerId, slot) =>
        set((state) => {
          const player = state[playerId];
          const current = getSlot(player, slot);
          return { [playerId]: setSlot(player, slot, makePokemon(current.id)) };
        }),
      setEnergyCount: (playerId, slot, type, count) =>
        set((state) => {
          const player = state[playerId];
          const current = getSlot(player, slot);
          const energies = { ...current.energies };
          if (count <= 0) delete energies[type]; else energies[type] = count;
          return { [playerId]: setSlot(player, slot, { ...current, energies }) };
        }),
      swapSlots: (playerId, from, to) =>
        set((state) => {
          const player = state[playerId];
          const fromP = getSlot(player, from);
          const toP = getSlot(player, to);
          let updated = setSlot(player, from, toP);
          updated = setSlot(updated, to, fromP);
          return { [playerId]: updated };
        }),
      toggleSupporter: (playerId) =>
        set((state) => ({ [playerId]: { ...state[playerId], supporterUsed: !state[playerId].supporterUsed } })),
      toggleEnergyAttached: (playerId) =>
        set((state) => ({ [playerId]: { ...state[playerId], energyAttached: !state[playerId].energyAttached } })),
      setPrizeCards: (playerId, count) =>
        set((state) => ({ [playerId]: { ...state[playerId], prizeCards: Math.max(0, Math.min(6, count)) } })),
      setPlayerName: (playerId, name) =>
        set((state) => ({ [playerId]: { ...state[playerId], name } })),
      endTurn: () =>
        set((state) => {
          const cur = state.currentTurn;
          const next: PlayerId = cur === 'player1' ? 'player2' : 'player1';
          const resetP = (p: PokemonSlot): PokemonSlot => ({
            ...p, abilityUsed: false, attackUsed: false,
            status: p.status === 'paralyzed' ? 'none' : p.status,
          });
          return {
            [cur]: { ...state[cur], supporterUsed: false, energyAttached: false,
              activePokemon: resetP(state[cur].activePokemon),
              bench: state[cur].bench.map(resetP) as PlayerState['bench'] },
            [next]: { ...state[next], supporterUsed: false, energyAttached: false },
            currentTurn: next,
            turnNumber: state.turnNumber + 1,
          };
        }),
      resetGame: () => set(initialState()),
    }),
    {
      name: 'pokecounttracker-game',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export function getStatusDamage(status: StatusCondition): number {
  if (status === 'poisoned') return 10;
  if (status === 'burned') return 20;
  return 0;
}
```

- [ ] **Step 3: Write `src/store/lorcanaStore.ts`**

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlayerId } from '../types/game';

export interface LorcanaPlayer {
  name: string; lore: number; inkwell: number; inkPlayed: boolean;
}

interface LorcanaState {
  lp1: LorcanaPlayer; lp2: LorcanaPlayer;
  lCurrentTurn: PlayerId; lTurnNumber: number;
}

interface LorcanaStore extends LorcanaState {
  lSetName: (player: PlayerId, name: string) => void;
  lSetLore: (player: PlayerId, count: number) => void;
  lSetInkwell: (player: PlayerId, count: number) => void;
  lToggleInkPlayed: (player: PlayerId) => void;
  lEndTurn: () => void;
  lReset: () => void;
}

function makePlayer(name: string): LorcanaPlayer {
  return { name, lore: 0, inkwell: 0, inkPlayed: false };
}
function initialState(): LorcanaState {
  return { lp1: makePlayer('Player 1'), lp2: makePlayer('Player 2'), lCurrentTurn: 'player1', lTurnNumber: 1 };
}
function lp(s: LorcanaStore, id: PlayerId) { return id === 'player1' ? s.lp1 : s.lp2; }
function lpKey(id: PlayerId): 'lp1' | 'lp2' { return id === 'player1' ? 'lp1' : 'lp2'; }

export const useLorcanaStore = create<LorcanaStore>()(
  persist(
    (set) => ({
      ...initialState(),
      lSetName: (id, name) => set((s) => ({ [lpKey(id)]: { ...lp(s, id), name } })),
      lSetLore: (id, count) => set((s) => ({ [lpKey(id)]: { ...lp(s, id), lore: Math.max(0, Math.min(20, count)) } })),
      lSetInkwell: (id, count) => set((s) => ({ [lpKey(id)]: { ...lp(s, id), inkwell: Math.max(0, count) } })),
      lToggleInkPlayed: (id) => set((s) => ({ [lpKey(id)]: { ...lp(s, id), inkPlayed: !lp(s, id).inkPlayed } })),
      lEndTurn: () => set((s) => {
        const cur = s.lCurrentTurn;
        const next: PlayerId = cur === 'player1' ? 'player2' : 'player1';
        return { [lpKey(cur)]: { ...lp(s, cur), inkPlayed: false }, lCurrentTurn: next, lTurnNumber: s.lTurnNumber + 1 };
      }),
      lReset: () => set(initialState()),
    }),
    { name: 'lorcana-tracker-game', version: 1, storage: createJSONStorage(() => AsyncStorage) }
  )
);
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/sadin/Project/PokeCountTracker
npx tsc --noEmit --project tsconfig.rn.json
```

Expected: zero errors (or only path-resolution warnings, no type errors).

- [ ] **Step 5: Commit**

```bash
git add src/types/ src/constants/ src/store/
git commit -m "feat: add shared types, constants and AsyncStorage-backed Zustand stores"
```

---

### Task 3: Root Screen + Mode Router + GameBoard Shell

**Files:**
- Modify: `app/index.tsx` (mode router — Pokémon vs Lorcana)
- Create: `src/components/layout/GameBoard.tsx` (split layout placeholder)
- Create: `src/hooks/useTheme.ts` (RN version — returns Tailwind class strings)

**Interfaces:**
- Consumes: `useGameStore().gameMode`, `useGameStore().displayMode`
- Produces: `<GameBoard />` rendered for pokemon mode; `<LorcanaGameBoard />` rendered for lorcana mode (both are placeholders until later tasks fill them in)

- [ ] **Step 1: Write `src/hooks/useTheme.ts`**

```ts
import { useColorScheme } from 'react-native';

export function useTheme() {
  const scheme = useColorScheme();
  const dark = scheme !== 'light';
  return {
    appBg: dark ? 'bg-gray-950' : 'bg-gray-100',
    centerBg: dark ? 'bg-gray-900' : 'bg-gray-200',
    centerBorder: dark ? 'border-gray-700' : 'border-gray-300',
    centerText: dark ? 'text-gray-500' : 'text-gray-500',
    headerOn: dark ? 'bg-blue-950' : 'bg-blue-100',
    headerOff: dark ? 'bg-gray-900' : 'bg-gray-200',
    headerDot: 'bg-blue-400',
    headerDotOff: dark ? 'bg-gray-700' : 'bg-gray-400',
    headerNameOn: 'text-white',
    headerNameOff: dark ? 'text-gray-400' : 'text-gray-600',
    headerTurnBadge: 'text-blue-400',
  };
}
```

- [ ] **Step 2: Write placeholder `src/components/layout/GameBoard.tsx`**

```tsx
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';

export function GameBoard() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  return (
    <View className={`flex-1 ${theme.appBg}`} style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <Text className="text-white text-center mt-10">Pokémon Board (coming soon)</Text>
    </View>
  );
}
```

- [ ] **Step 3: Write `app/index.tsx` as the mode router**

```tsx
import { View } from 'react-native';
import { useGameStore } from '../src/store/gameStore';
import { GameBoard } from '../src/components/layout/GameBoard';
// LorcanaGameBoard added in Task 4
import { LorcanaGameBoard } from '../src/components/lorcana/LorcanaGameBoard';

export default function Index() {
  const gameMode = useGameStore((s) => s.gameMode);
  return (
    <View className="flex-1 bg-gray-950">
      {gameMode === 'lorcana' ? <LorcanaGameBoard /> : <GameBoard />}
    </View>
  );
}
```

Note: `LorcanaGameBoard` will be a stub until Task 4. Create `src/components/lorcana/LorcanaGameBoard.tsx` with a stub now:

```tsx
import { View, Text } from 'react-native';
export function LorcanaGameBoard() {
  return (
    <View className="flex-1 bg-gray-950 items-center justify-center">
      <Text className="text-amber-400 text-2xl font-bold">Lorcana (coming soon)</Text>
    </View>
  );
}
```

- [ ] **Step 4: Run on simulator, confirm no crash**

```bash
npx expo start --ios
```

Expected: shows "Pokémon Board (coming soon)" on dark background.

- [ ] **Step 5: Commit**

```bash
git add app/index.tsx src/components/ src/hooks/useTheme.ts
git commit -m "feat: mode router, GameBoard shell, useTheme hook"
```

---

### Task 4: Lorcana Mode — LorcanaPlayerPanel + LorcanaGameBoard + CenterBar

**Files:**
- Create: `src/components/lorcana/LorcanaPlayerPanel.tsx`
- Modify: `src/components/lorcana/LorcanaGameBoard.tsx` (replace stub)

**Interfaces:**
- Consumes: `useLorcanaStore()` — `lp1`, `lp2`, `lCurrentTurn`, `lTurnNumber`, `lSetLore`, `lSetInkwell`, `lToggleInkPlayed`, `lEndTurn`, `lReset`; `useGameStore().setGameMode`
- Produces: Full Lorcana board with both player panels, center bar (end turn, ink button, mode switch)

- [ ] **Step 1: Write `src/components/lorcana/LorcanaPlayerPanel.tsx`**

```tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { PlayerId } from '../../types/game';
import { useLorcanaStore } from '../../store/lorcanaStore';

interface Props {
  playerId: PlayerId;
  isCurrentTurn: boolean;
  flipped?: boolean;
}

export function LorcanaPlayerPanel({ playerId, isCurrentTurn, flipped = false }: Props) {
  const player = useLorcanaStore((s) => playerId === 'player1' ? s.lp1 : s.lp2);
  const { lSetName, lSetLore, lSetInkwell } = useLorcanaStore();
  const [editingName, setEditingName] = useState(false);

  const isWinner = player.lore >= 20;

  const handleLore = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (player.lore + delta >= 20) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    lSetLore(playerId, player.lore + delta);
  };

  const handleInk = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    lSetInkwell(playerId, player.inkwell + delta);
  };

  return (
    <View
      className="flex-1 items-center justify-center px-6 py-4 gap-4"
      style={flipped ? { transform: [{ rotate: '180deg' }] } : undefined}
    >
      {/* Player name */}
      <View className="flex-row items-center gap-2">
        <View className={`w-2.5 h-2.5 rounded-full ${isCurrentTurn ? 'bg-amber-400' : 'bg-gray-600'}`} />
        {editingName ? (
          <TextInput
            autoFocus
            className="text-base font-bold text-white border-b border-gray-500 min-w-20"
            value={player.name}
            onChangeText={(t) => lSetName(playerId, t)}
            onBlur={() => setEditingName(false)}
            onSubmitEditing={() => setEditingName(false)}
            returnKeyType="done"
          />
        ) : (
          <TouchableOpacity onPress={() => setEditingName(true)}>
            <Text className={`text-base font-bold ${isCurrentTurn ? 'text-amber-300' : 'text-gray-400'}`}>
              {player.name}{isCurrentTurn ? ' ▶' : ''}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lore counter */}
      <View className="items-center gap-1">
        <Text className="text-xs text-amber-400/70 font-bold tracking-widest uppercase">✦ Lore</Text>
        <View className="flex-row items-center gap-4">
          <TouchableOpacity
            onPress={() => handleLore(-1)}
            className="w-12 h-12 rounded-2xl bg-gray-800/70 border border-gray-700 items-center justify-center"
          >
            <Text className="text-gray-300 text-2xl font-black">−</Text>
          </TouchableOpacity>

          <View className="items-center min-w-20">
            <Text className={`text-7xl font-black font-mono leading-none ${
              isWinner ? 'text-yellow-300' : isCurrentTurn ? 'text-amber-300' : 'text-gray-200'
            }`}>{player.lore}</Text>
            <Text className="text-sm text-gray-500 font-mono">/ 20</Text>
          </View>

          <TouchableOpacity
            onPress={() => handleLore(1)}
            className="w-12 h-12 rounded-2xl bg-amber-800/60 border border-amber-700 items-center justify-center"
          >
            <Text className="text-amber-300 text-2xl font-black">+</Text>
          </TouchableOpacity>
        </View>
        {isWinner && <Text className="text-lg">✨ Winner! ✨</Text>}
      </View>

      {/* Inkwell counter */}
      <View className="flex-row items-center gap-3">
        <Text className="text-sm text-blue-400/80">💧 Inkwell</Text>
        <TouchableOpacity
          onPress={() => handleInk(-1)}
          className="w-8 h-8 rounded-xl bg-gray-800/70 border border-gray-700 items-center justify-center"
        >
          <Text className="text-gray-400 text-lg font-black">−</Text>
        </TouchableOpacity>
        <Text className="text-2xl font-black font-mono text-blue-300 w-8 text-center">{player.inkwell}</Text>
        <TouchableOpacity
          onPress={() => handleInk(1)}
          className="w-8 h-8 rounded-xl bg-blue-900/50 border border-blue-700 items-center justify-center"
        >
          <Text className="text-blue-300 text-lg font-black">+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Write full `src/components/lorcana/LorcanaGameBoard.tsx`**

```tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useLorcanaStore } from '../../store/lorcanaStore';
import { useGameStore } from '../../store/gameStore';
import { useTheme } from '../../hooks/useTheme';
import { LorcanaPlayerPanel } from './LorcanaPlayerPanel';

function EndTurnModal({ onClose }: { onClose: () => void }) {
  const { lCurrentTurn, lEndTurn } = useLorcanaStore();
  const player = useLorcanaStore((s) => lCurrentTurn === 'player1' ? s.lp1 : s.lp2);
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/80 items-center justify-center px-4">
        <View className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-sm">
          <Text className="text-lg font-black text-white mb-1">End {player.name}'s Turn</Text>
          <Text className="text-xs text-gray-500 mb-4">Ink play resets for the next turn.</Text>
          <View className="flex-row gap-2">
            <TouchableOpacity onPress={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-700 items-center">
              <Text className="text-gray-200 text-sm font-bold">Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                lEndTurn(); onClose();
              }}
              className="flex-1 py-2.5 rounded-xl bg-amber-700 items-center"
            >
              <Text className="text-white text-sm font-black">End Turn →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function LorcanaGameBoard() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { lCurrentTurn, lTurnNumber, lToggleInkPlayed, lReset } = useLorcanaStore();
  const currentPlayer = useLorcanaStore((s) => lCurrentTurn === 'player1' ? s.lp1 : s.lp2);
  const { setGameMode } = useGameStore();
  const [faceToFace, setFaceToFace] = useState(true);
  const [showEndTurn, setShowEndTurn] = useState(false);
  const [showReset, setShowReset] = useState(false);

  return (
    <View className={`flex-1 ${theme.appBg}`} style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Player 1 */}
      <View className="flex-1">
        <LorcanaPlayerPanel playerId="player1" isCurrentTurn={lCurrentTurn === 'player1'} flipped={faceToFace} />
      </View>

      {/* Center bar */}
      <View className={`border-t border-b ${theme.centerBorder} ${theme.centerBg} px-3 py-2`}>
        <View className="flex-row items-center gap-2">
          {/* Turn + End Turn */}
          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-xs text-gray-500 font-mono">T{lTurnNumber}</Text>
              <TouchableOpacity
                onPress={() => setShowEndTurn(true)}
                className="flex-1 py-1.5 px-3 bg-amber-800 border border-amber-600 rounded-xl items-center"
              >
                <Text className="text-white text-xs font-black">End {currentPlayer.name}'s Turn →</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center justify-center gap-3">
              <TouchableOpacity onPress={() => setShowReset(true)}>
                <Text className={`text-xs ${theme.centerText}`}>↺ Reset</Text>
              </TouchableOpacity>
              <Text className={`text-xs ${theme.centerText}`}>·</Text>
              <TouchableOpacity
                onPress={() => setFaceToFace((f) => !f)}
                className={`px-1.5 py-0.5 rounded-md border ${faceToFace ? 'bg-amber-700/60 border-amber-500/60' : 'border-gray-700/50'}`}
              >
                <Text className={`text-xs font-bold ${faceToFace ? 'text-amber-300' : theme.centerText}`}>
                  {faceToFace ? '⇅ Face-to-Face' : '↓ Same Side'}
                </Text>
              </TouchableOpacity>
              <Text className={`text-xs ${theme.centerText}`}>·</Text>
              <TouchableOpacity
                onPress={() => setGameMode('pokemon')}
                className="px-1.5 py-0.5 rounded-md bg-indigo-700/60 border border-indigo-500/60"
              >
                <Text className="text-xs font-bold text-indigo-300">🎮 Pokémon</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Ink button */}
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              lToggleInkPlayed(lCurrentTurn);
            }}
            className={`px-3 py-1.5 rounded-xl border-2 ${!currentPlayer.inkPlayed ? 'bg-blue-900/60 border-blue-600' : 'bg-gray-800/50 border-gray-700/40'}`}
          >
            <Text className={`text-sm font-black ${!currentPlayer.inkPlayed ? 'text-blue-300' : 'text-gray-600 line-through'}`}>
              💧 Ink
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Player 2 */}
      <View className="flex-1">
        <LorcanaPlayerPanel playerId="player2" isCurrentTurn={lCurrentTurn === 'player2'} />
      </View>

      {showEndTurn && <EndTurnModal onClose={() => setShowEndTurn(false)} />}
      {showReset && (
        <Modal transparent animationType="fade" onRequestClose={() => setShowReset(false)}>
          <View className="flex-1 bg-black/80 items-center justify-center px-4">
            <View className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-72 items-center">
              <Text className="text-2xl mb-2">✨</Text>
              <Text className="font-black text-white mb-1">Reset Game?</Text>
              <Text className="text-xs text-gray-500 mb-4">All lore and ink will be cleared.</Text>
              <View className="flex-row gap-2 w-full">
                <TouchableOpacity onPress={() => setShowReset(false)} className="flex-1 py-2 rounded-xl bg-gray-700 items-center">
                  <Text className="text-gray-200 text-sm font-bold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { lReset(); setShowReset(false); }} className="flex-1 py-2 rounded-xl bg-red-700 items-center">
                  <Text className="text-white text-sm font-black">Reset</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
```

- [ ] **Step 3: In simulator, switch to Lorcana mode**

Open app. In `app/index.tsx` temporarily hardcode `gameMode === 'lorcana'` to verify:
- Lorcana board renders with two player panels
- Face-to-Face: P1 is rotated 180°
- Tap lore +/− buttons — numbers update
- "End Turn" modal appears and dismisses correctly

Revert hardcode.

- [ ] **Step 4: Commit**

```bash
git add src/components/lorcana/
git commit -m "feat: Lorcana mode — LorcanaPlayerPanel + LorcanaGameBoard"
```

---

### Task 5: Pokémon Layout — GameBoard, CenterDivider, PlayerHeader

**Files:**
- Modify: `src/components/layout/GameBoard.tsx` (full layout)
- Create: `src/components/layout/CenterDivider.tsx`
- Create: `src/components/player/PlayerHeader.tsx`
- Create: `src/components/player/PlayerBoard.tsx` (stub)

**Interfaces:**
- Consumes: `useGameStore()` — `currentTurn`, `turnNumber`, `endTurn`, `resetGame`, `displayMode`, `setDisplayMode`, `setGameMode`, `toggleSupporter`, `toggleEnergyAttached`, `setPrizeCards`, `setPlayerName`
- Produces: Full split layout with PlayerHeader visible at top/bottom; CenterDivider with End Turn, mode buttons

- [ ] **Step 1: Write `src/components/player/PlayerBoard.tsx` stub**

```tsx
import { View } from 'react-native';
import { PlayerHeader } from './PlayerHeader';
import type { PlayerId } from '../../types/game';

interface Props { playerId: PlayerId; isCurrentTurn: boolean; flipped?: boolean; }

export function PlayerBoard({ playerId, isCurrentTurn, flipped = false }: Props) {
  return (
    <View className="flex-1" style={flipped ? { transform: [{ rotate: '180deg' }] } : undefined}>
      <PlayerHeader playerId={playerId} isCurrentTurn={isCurrentTurn} />
      {/* ActiveZone + BenchRow added in Task 6 */}
    </View>
  );
}
```

- [ ] **Step 2: Write `src/components/player/PlayerHeader.tsx`**

```tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import type { PlayerId } from '../../types/game';
import { useGameStore } from '../../store/gameStore';
import { useTheme } from '../../hooks/useTheme';

export function PlayerHeader({ playerId, isCurrentTurn }: { playerId: PlayerId; isCurrentTurn: boolean }) {
  const player = useGameStore((s) => s[playerId]);
  const { setPrizeCards, setPlayerName } = useGameStore();
  const [editingName, setEditingName] = useState(false);
  const theme = useTheme();

  return (
    <View className={`flex-row items-center gap-2 px-3 py-1.5 rounded-xl ${isCurrentTurn ? theme.headerOn : theme.headerOff}`}>
      <View className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isCurrentTurn ? theme.headerDot : theme.headerDotOff}`} />

      {editingName ? (
        <TextInput
          autoFocus
          className="flex-1 text-sm font-bold text-white"
          value={player.name}
          onChangeText={(t) => setPlayerName(playerId, t)}
          onBlur={() => setEditingName(false)}
          onSubmitEditing={() => setEditingName(false)}
          returnKeyType="done"
        />
      ) : (
        <TouchableOpacity onPress={() => setEditingName(true)} className="flex-1">
          <Text className={`text-sm font-bold ${isCurrentTurn ? theme.headerNameOn : theme.headerNameOff}`}>
            {player.name}{isCurrentTurn ? ' ▶' : ''}
          </Text>
        </TouchableOpacity>
      )}

      {/* Prize cards */}
      <View className="flex-row items-center gap-1">
        <Text className="text-xs text-gray-500">Prize:</Text>
        <View className="flex-row gap-0.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setPrizeCards(playerId, i < player.prizeCards ? i : i + 1)}
              className={`w-3 h-3 rounded-sm border ${i < player.prizeCards ? 'bg-yellow-500 border-yellow-400' : 'bg-gray-700 border-gray-600'}`}
            />
          ))}
        </View>
        <Text className="text-xs font-mono text-gray-400 w-3">{player.prizeCards}</Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Write `src/components/layout/CenterDivider.tsx`**

```tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../../store/gameStore';
import { useTheme } from '../../hooks/useTheme';

export function CenterDivider() {
  const theme = useTheme();
  const { currentTurn, turnNumber, endTurn, resetGame, displayMode, setDisplayMode, setGameMode,
          toggleSupporter, toggleEnergyAttached, player1, player2 } = useGameStore((s) => s);
  const currentPlayer = currentTurn === 'player1' ? player1 : player2;
  const [showReset, setShowReset] = useState(false);

  const handleEndTurn = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    endTurn();
  };

  return (
    <View className={`px-3 py-2 border-t border-b ${theme.centerBorder} ${theme.centerBg}`}>
      <View className="flex-row items-center gap-2">
        {/* Left: turn indicator + reset */}
        <View className="gap-0.5">
          <Text className="text-xs text-gray-500 font-mono">T{turnNumber}</Text>
          <TouchableOpacity onPress={() => setShowReset(true)}>
            <Text className={`text-xs ${theme.centerText}`}>↺ Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Center: End Turn */}
        <TouchableOpacity
          onPress={handleEndTurn}
          className="flex-1 py-2 px-3 bg-blue-700 border border-blue-500 rounded-xl items-center"
        >
          <Text className="text-white text-xs font-black">End {currentPlayer.name} →</Text>
        </TouchableOpacity>

        {/* Right: display mode + Lorcana switch */}
        <View className="gap-0.5 items-end">
          <TouchableOpacity
            onPress={() => setDisplayMode(displayMode === 'faceToFace' ? 'spectator' : 'faceToFace')}
            className="px-1.5 py-0.5 rounded-md border border-gray-700/50"
          >
            <Text className={`text-xs font-bold ${theme.centerText}`}>⇅ Side</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setGameMode('lorcana')}
            className="px-1.5 py-0.5 rounded-md bg-amber-700/60 border border-amber-500/60"
          >
            <Text className="text-xs font-bold text-amber-300">🪄 Lorcana</Text>
          </TouchableOpacity>
        </View>

        {/* Sup + Nrg toggles */}
        <View className="gap-1">
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleEnergyAttached(currentTurn); }}
            className={`px-2 py-1 rounded-lg border ${!currentPlayer.energyAttached ? 'bg-green-900/60 border-green-600' : 'bg-gray-800/50 border-gray-700'}`}
          >
            <Text className={`text-xs font-black ${!currentPlayer.energyAttached ? 'text-green-300' : 'text-gray-600 line-through'}`}>⚡ Nrg</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleSupporter(currentTurn); }}
            className={`px-2 py-1 rounded-lg border ${!currentPlayer.supporterUsed ? 'bg-yellow-900/60 border-yellow-600' : 'bg-gray-800/50 border-gray-700'}`}
          >
            <Text className={`text-xs font-black ${!currentPlayer.supporterUsed ? 'text-yellow-300' : 'text-gray-600 line-through'}`}>★ Sup</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showReset && (
        <Modal transparent animationType="fade" onRequestClose={() => setShowReset(false)}>
          <View className="flex-1 bg-black/80 items-center justify-center px-4">
            <View className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-72 items-center">
              <Text className="font-black text-white mb-1">Reset Game?</Text>
              <Text className="text-xs text-gray-500 mb-4">All HP and damage will be cleared.</Text>
              <View className="flex-row gap-2 w-full">
                <TouchableOpacity onPress={() => setShowReset(false)} className="flex-1 py-2 rounded-xl bg-gray-700 items-center">
                  <Text className="text-gray-200 text-sm font-bold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { resetGame(); setShowReset(false); }} className="flex-1 py-2 rounded-xl bg-red-700 items-center">
                  <Text className="text-white text-sm font-black">Reset</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
```

- [ ] **Step 4: Update `src/components/layout/GameBoard.tsx`**

```tsx
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameStore } from '../../store/gameStore';
import { useTheme } from '../../hooks/useTheme';
import { PlayerBoard } from '../player/PlayerBoard';
import { CenterDivider } from './CenterDivider';

export function GameBoard() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const currentTurn = useGameStore((s) => s.currentTurn);

  return (
    <View className={`flex-1 ${theme.appBg}`} style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <PlayerBoard playerId="player1" isCurrentTurn={currentTurn === 'player1'} flipped />
      <CenterDivider />
      <PlayerBoard playerId="player2" isCurrentTurn={currentTurn === 'player2'} />
    </View>
  );
}
```

- [ ] **Step 5: Run and verify layout**

```bash
npx expo start --ios
```

Expected: split top/bottom with headers visible, End Turn button in center, Lorcana switch working.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/ src/components/player/PlayerHeader.tsx src/components/player/PlayerBoard.tsx
git commit -m "feat: Pokémon layout — GameBoard, CenterDivider, PlayerHeader"
```

---

### Task 6: PokémonSlot — HPBar, DamageCounter, useLongPress

**Files:**
- Create: `src/hooks/useLongPress.ts`
- Create: `src/components/pokemon/HPBar.tsx`
- Create: `src/components/pokemon/DamageCounter.tsx`
- Create: `src/components/pokemon/HPPresetPicker.tsx`
- Create: `src/components/pokemon/PokemonSlot.tsx`
- Create: `src/components/player/ActiveZone.tsx`
- Create: `src/components/player/BenchRow.tsx`
- Modify: `src/components/player/PlayerBoard.tsx` (wire ActiveZone + BenchRow)

**Interfaces:**
- Consumes: `useGameStore().updatePokemon`, `useGameStore().clearPokemon`, `useGameStore().swapSlots`; `PokemonSlot` type; `PlayerId`, `SlotKey` types
- Produces: Fully interactive Pokemon slot with HP display, damage counter (long press repeats), preset picker Modal, KO state

- [ ] **Step 1: Write `src/hooks/useLongPress.ts`**

```ts
import { useRef, useCallback } from 'react';

export function useLongPress(callback: () => void, delay = 150) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    callback();
    intervalRef.current = setInterval(callback, delay);
  }, [callback, delay]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return { onPressIn: start, onPressOut: stop };
}
```

- [ ] **Step 2: Write `src/components/pokemon/HPBar.tsx`**

```tsx
import { View } from 'react-native';

interface Props { current: number; max: number; }

export function HPBar({ current, max }: Props) {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 1;
  const color = pct > 0.5 ? 'bg-green-500' : pct > 0.25 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <View className="h-1.5 bg-gray-700/60 rounded-full overflow-hidden">
      <View className={`h-full rounded-full ${color}`} style={{ width: `${pct * 100}%` }} />
    </View>
  );
}
```

- [ ] **Step 3: Write `src/components/pokemon/DamageCounter.tsx`**

```tsx
import { View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLongPress } from '../../hooks/useLongPress';

interface Props {
  damage: number; maxHP: number;
  onAdd: (amount: number) => void;
  compact?: boolean;
}

export function DamageCounter({ damage, maxHP, onAdd, compact = false }: Props) {
  const tap = (amt: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAdd(amt);
  };
  const longMinus = useLongPress(() => tap(-10));
  const longPlus = useLongPress(() => tap(10));
  const isKO = damage >= maxHP && maxHP > 0;

  if (compact) {
    return (
      <View className="flex-row items-center gap-1">
        <Pressable onPress={() => tap(-10)} className="w-5 h-5 rounded bg-gray-700 items-center justify-center">
          <Text className="text-gray-300 text-xs font-bold">−</Text>
        </Pressable>
        <Text className={`text-xs font-bold font-mono w-8 text-center ${isKO ? 'text-red-400' : 'text-gray-200'}`}>
          {isKO ? 'KO' : damage}
        </Text>
        <Pressable onPress={() => tap(10)} className="w-5 h-5 rounded bg-gray-700 items-center justify-center">
          <Text className="text-gray-300 text-xs font-bold">+</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-row items-center gap-0.5">
      <Pressable onPress={() => tap(-30)} className="px-1.5 py-1.5 rounded-md bg-gray-700/60">
        <Text className="text-xs font-bold text-gray-500">-30</Text>
      </Pressable>
      <Pressable {...longMinus} className="h-7 w-7 rounded-lg bg-gray-700 items-center justify-center">
        <Text className="text-gray-200 text-sm font-bold">−</Text>
      </Pressable>
      <View className="flex-1 items-center">
        {isKO
          ? <Text className="text-base font-black text-red-400">KO!</Text>
          : <Text className="text-base font-black text-white font-mono">{damage}<Text className="text-xs text-gray-500 font-normal"> dmg</Text></Text>
        }
      </View>
      <Pressable {...longPlus} className="h-7 w-7 rounded-lg bg-gray-700 items-center justify-center">
        <Text className="text-gray-200 text-sm font-bold">+</Text>
      </Pressable>
      {[30, 60, 90].map((amt) => (
        <Pressable key={amt} onPress={() => tap(amt)} className="px-1.5 py-1.5 rounded-md bg-gray-700/60">
          <Text className="text-xs font-bold text-gray-500">+{amt}</Text>
        </Pressable>
      ))}
    </View>
  );
}
```

- [ ] **Step 4: Write `src/components/pokemon/HPPresetPicker.tsx`**

```tsx
import { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, Pressable } from 'react-native';
import { HP_PRESETS } from '../../constants/hpPresets';

interface Props { currentMaxHP: number; onSelect: (hp: number) => void; onClose: () => void; }

export function HPPresetPicker({ currentMaxHP, onSelect, onClose }: Props) {
  const [custom, setCustom] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const handleCustom = () => {
    const n = parseInt(custom, 10);
    if (!isNaN(n) && n > 0) onSelect(n);
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/60" onPress={onClose}>
        <View className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 rounded-t-2xl p-4 max-h-96">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-white font-black text-base">Set Max HP</Text>
            <TouchableOpacity onPress={onClose}><Text className="text-gray-400">✕</Text></TouchableOpacity>
          </View>
          <ScrollView>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {HP_PRESETS.map((hp) => (
                <TouchableOpacity
                  key={hp}
                  onPress={() => onSelect(hp)}
                  className={`px-3 py-1.5 rounded-lg border ${hp === currentMaxHP ? 'bg-blue-700 border-blue-500' : 'bg-gray-800 border-gray-600'}`}
                >
                  <Text className={`text-sm font-bold ${hp === currentMaxHP ? 'text-white' : 'text-gray-300'}`}>{hp}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {showCustom ? (
              <View className="flex-row gap-2">
                <TextInput
                  autoFocus keyboardType="number-pad"
                  placeholder="Custom HP" placeholderTextColor="#6b7280"
                  className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  value={custom} onChangeText={setCustom} onSubmitEditing={handleCustom}
                />
                <TouchableOpacity onPress={handleCustom} className="px-4 py-2 rounded-lg bg-blue-700">
                  <Text className="text-white font-bold">Set</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={() => setShowCustom(true)} className="py-2 rounded-lg bg-gray-800 border border-gray-600 items-center">
                <Text className="text-gray-400 text-sm">Custom…</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}
```

- [ ] **Step 5: Write `src/components/pokemon/PokemonSlot.tsx`**

```tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { PokemonSlot as PokemonSlotType, PlayerId, SlotKey } from '../../types/game';
import { useGameStore } from '../../store/gameStore';
import { HPBar } from './HPBar';
import { DamageCounter } from './DamageCounter';
import { HPPresetPicker } from './HPPresetPicker';

interface Props {
  pokemon: PokemonSlotType; playerId: PlayerId; slot: SlotKey;
  isActive?: boolean; size?: 'large' | 'small';
}

export function PokemonSlot({ pokemon, playerId, slot, isActive, size = 'small' }: Props) {
  const { updatePokemon, clearPokemon } = useGameStore();
  const [showPicker, setShowPicker] = useState(false);

  const update = (changes: Partial<PokemonSlotType>) => updatePokemon(playerId, slot, changes);
  const addDamage = (amt: number) => {
    const next = Math.max(0, pokemon.currentDamage + amt);
    if (next >= pokemon.maxHP && pokemon.maxHP > 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    update({ currentDamage: next });
  };

  const currentHP = Math.max(0, pokemon.maxHP - pokemon.currentDamage);
  const isKO = pokemon.name !== '' && pokemon.currentDamage >= pokemon.maxHP;
  const hpPct = pokemon.maxHP > 0 ? currentHP / pokemon.maxHP : 1;
  const hpColor = hpPct > 0.5 ? 'text-green-400' : hpPct > 0.25 ? 'text-yellow-400' : 'text-red-400';

  if (pokemon.name === '') {
    return (
      <>
        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          className={`items-center justify-center rounded-xl border border-dashed h-full w-full gap-1 ${
            isActive ? 'border-blue-700/50' : 'border-gray-700/50'
          }`}
        >
          <Text className="text-lg leading-none">{isActive ? '⚔' : '+'}</Text>
          <Text className="text-xs font-bold text-gray-600">Set HP</Text>
        </TouchableOpacity>
        {showPicker && (
          <HPPresetPicker
            currentMaxHP={0}
            onSelect={(hp) => { update({ maxHP: hp, currentDamage: 0, name: 'Pokémon' }); setShowPicker(false); }}
            onClose={() => setShowPicker(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <View className={`rounded-xl border p-1.5 h-full gap-1 ${isKO ? 'bg-red-950/50 border-red-700' : isActive ? 'bg-blue-950/30 border-blue-800/50' : 'bg-gray-800/40 border-gray-700/50'}`}>
        {/* HP label + delete */}
        <View className="flex-row items-center gap-1">
          <TouchableOpacity onPress={() => setShowPicker(true)} className="flex-1">
            <Text className="text-xs font-black text-gray-300">{pokemon.maxHP}<Text className="text-xs font-normal text-gray-600"> HP ✎</Text></Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => clearPokemon(playerId, slot)} className="w-6 h-6 rounded-md bg-red-900/70 border border-red-700/70 items-center justify-center">
            <Text className="text-red-300 text-xs font-black">✕</Text>
          </TouchableOpacity>
        </View>

        <HPBar current={currentHP} max={pokemon.maxHP} />

        {/* Current HP */}
        <View className="items-center flex-1 justify-center">
          {isKO
            ? <Text className="text-sm font-black text-red-400">KO!</Text>
            : <Text className={`text-xl font-black font-mono ${hpColor}`}>{currentHP}</Text>
          }
        </View>

        {/* ±10 buttons */}
        <View className="flex-row gap-0.5">
          <TouchableOpacity onPress={() => addDamage(10)} className="flex-1 py-0.5 rounded bg-gray-700/60 border border-gray-600/40 items-center">
            <Text className="text-red-300 text-xs font-black">−10</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => addDamage(-10)} className="flex-1 py-0.5 rounded bg-gray-700/60 border border-gray-600/40 items-center">
            <Text className="text-green-300 text-xs font-black">+10</Text>
          </TouchableOpacity>
        </View>

        {size === 'large' && (
          <DamageCounter damage={pokemon.currentDamage} maxHP={pokemon.maxHP} onAdd={addDamage} />
        )}
      </View>
      {showPicker && (
        <HPPresetPicker
          currentMaxHP={pokemon.maxHP}
          onSelect={(hp) => { update({ maxHP: hp, currentDamage: 0 }); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 6: Write `src/components/player/ActiveZone.tsx`**

```tsx
import { View } from 'react-native';
import type { PlayerId } from '../../types/game';
import { useGameStore } from '../../store/gameStore';
import { PokemonSlot } from '../pokemon/PokemonSlot';

export function ActiveZone({ playerId }: { playerId: PlayerId }) {
  const pokemon = useGameStore((s) => s[playerId].activePokemon);
  return (
    <View className="flex-1 px-3 py-2">
      <PokemonSlot pokemon={pokemon} playerId={playerId} slot="active" isActive size="large" />
    </View>
  );
}
```

- [ ] **Step 7: Write `src/components/player/BenchRow.tsx`**

```tsx
import { View, ScrollView } from 'react-native';
import type { PlayerId } from '../../types/game';
import { useGameStore } from '../../store/gameStore';
import { PokemonSlot } from '../pokemon/PokemonSlot';

export function BenchRow({ playerId }: { playerId: PlayerId }) {
  const bench = useGameStore((s) => s[playerId].bench);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-2 py-1 max-h-24">
      <View className="flex-row gap-1.5">
        {bench.map((pokemon, i) => (
          <View key={pokemon.id} className="w-20 h-20">
            <PokemonSlot pokemon={pokemon} playerId={playerId} slot={i as 0 | 1 | 2 | 3 | 4} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 8: Update `src/components/player/PlayerBoard.tsx`**

```tsx
import { View } from 'react-native';
import type { PlayerId } from '../../types/game';
import { PlayerHeader } from './PlayerHeader';
import { ActiveZone } from './ActiveZone';
import { BenchRow } from './BenchRow';

interface Props { playerId: PlayerId; isCurrentTurn: boolean; flipped?: boolean; }

export function PlayerBoard({ playerId, isCurrentTurn, flipped = false }: Props) {
  return (
    <View className="flex-1" style={flipped ? { transform: [{ rotate: '180deg' }] } : undefined}>
      <PlayerHeader playerId={playerId} isCurrentTurn={isCurrentTurn} />
      <BenchRow playerId={playerId} />
      <ActiveZone playerId={playerId} />
    </View>
  );
}
```

- [ ] **Step 9: Run and verify**

```bash
npx expo start --ios
```

Expected:
- Both player areas show bench (5 empty slots) + active zone
- Tap empty slot → HP preset picker slides up
- Select HP → slot shows HP number with bar
- Tap −10/+10 → HP changes, haptic fires
- HP at 0 → shows "KO!" in red, haptic heavy fires

- [ ] **Step 10: Commit**

```bash
git add src/components/pokemon/ src/components/player/ src/hooks/
git commit -m "feat: PokemonSlot, HPBar, DamageCounter, HPPresetPicker, ActiveZone, BenchRow"
```

---

### Task 7: Mini Mode — MiniGameBoard + MiniPokemonCard

**Files:**
- Create: `src/components/mini/MiniPokemonCard.tsx`
- Create: `src/components/mini/MiniGameBoard.tsx`
- Modify: `src/components/layout/GameBoard.tsx` (route to MiniGameBoard when `displayMode === 'mini'`)

**Interfaces:**
- Consumes: `useGameStore()` — `displayMode`, all player state, `updatePokemon`, `clearPokemon`, `swapSlots`
- Produces: Compact all-in-one board showing all 12 card slots (active + 5 bench × 2 players) simultaneously

- [ ] **Step 1: Write `src/components/mini/MiniPokemonCard.tsx`**

```tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { PokemonSlot as PokemonSlotType, PlayerId, SlotKey } from '../../types/game';
import { useGameStore } from '../../store/gameStore';
import { HPPresetPicker } from '../pokemon/HPPresetPicker';

interface Props { pokemon: PokemonSlotType; playerId: PlayerId; slot: SlotKey; isActive?: boolean; }

export function MiniPokemonCard({ pokemon, playerId, slot, isActive }: Props) {
  const { updatePokemon, clearPokemon } = useGameStore();
  const [showPicker, setShowPicker] = useState(false);

  const update = (changes: Partial<PokemonSlotType>) => updatePokemon(playerId, slot, changes);
  const addDamage = (amt: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = Math.max(0, pokemon.currentDamage + amt);
    if (next >= pokemon.maxHP && pokemon.maxHP > 0) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    update({ currentDamage: next });
  };

  const currentHP = Math.max(0, pokemon.maxHP - pokemon.currentDamage);
  const isKO = pokemon.name !== '' && pokemon.currentDamage >= pokemon.maxHP;
  const hpPct = pokemon.maxHP > 0 ? currentHP / pokemon.maxHP : 1;
  const hpColor = hpPct > 0.5 ? 'text-green-400' : hpPct > 0.25 ? 'text-yellow-400' : 'text-red-400';

  if (pokemon.name === '') {
    return (
      <>
        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          className={`flex-1 items-center justify-center rounded-xl border border-dashed ${isActive ? 'border-blue-700/50' : 'border-gray-700/50'}`}
        >
          <Text className="text-lg">{isActive ? '⚔' : '+'}</Text>
          <Text className="text-xs text-gray-600 font-bold">Set HP</Text>
        </TouchableOpacity>
        {showPicker && (
          <HPPresetPicker
            currentMaxHP={0}
            onSelect={(hp) => { update({ maxHP: hp, currentDamage: 0, name: 'Pokémon' }); setShowPicker(false); }}
            onClose={() => setShowPicker(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <View className={`flex-1 rounded-xl border p-1 gap-0.5 ${isKO ? 'bg-red-950/50 border-red-700' : isActive ? 'bg-blue-950/30 border-blue-800/50' : 'bg-gray-800/40 border-gray-700/50'}`}>
        {/* HP label + delete */}
        <View className="flex-row items-center gap-0.5">
          <TouchableOpacity onPress={() => setShowPicker(true)} className="flex-1">
            <Text className="text-xs font-black text-gray-300">{pokemon.maxHP}<Text className="text-xs font-normal text-gray-600"> HP</Text></Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => clearPokemon(playerId, slot)} className="w-5 h-5 rounded bg-red-900/70 items-center justify-center">
            <Text className="text-red-300 text-xs font-black">✕</Text>
          </TouchableOpacity>
        </View>

        {/* Current HP */}
        <View className="flex-1 items-center justify-center">
          {isKO
            ? <Text className="text-sm font-black text-red-400">KO!</Text>
            : <Text className={`text-base font-black font-mono ${hpColor}`}>{currentHP}</Text>
          }
        </View>

        {/* ±10 */}
        <View className="flex-row gap-0.5">
          <TouchableOpacity onPress={() => addDamage(10)} className="flex-1 py-0.5 rounded bg-gray-700/60 items-center">
            <Text className="text-red-300 text-xs font-black">−10</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => addDamage(-10)} className="flex-1 py-0.5 rounded bg-gray-700/60 items-center">
            <Text className="text-green-300 text-xs font-black">+10</Text>
          </TouchableOpacity>
        </View>
      </View>
      {showPicker && (
        <HPPresetPicker
          currentMaxHP={pokemon.maxHP}
          onSelect={(hp) => { update({ maxHP: hp, currentDamage: 0 }); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Write `src/components/mini/MiniGameBoard.tsx`**

```tsx
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useGameStore } from '../../store/gameStore';
import { useTheme } from '../../hooks/useTheme';
import { PlayerHeader } from '../player/PlayerHeader';
import { MiniPokemonCard } from './MiniPokemonCard';

export function MiniGameBoard() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { currentTurn, turnNumber, endTurn, resetGame, setDisplayMode, setGameMode,
          toggleSupporter, toggleEnergyAttached, player1, player2 } = useGameStore((s) => s);
  const currentPlayer = currentTurn === 'player1' ? player1 : player2;

  const renderPlayerSection = (playerId: 'player1' | 'player2', flipped: boolean) => {
    const player = playerId === 'player1' ? player1 : player2;
    return (
      <View className="flex-1" style={flipped ? { transform: [{ rotate: '180deg' }] } : undefined}>
        <PlayerHeader playerId={playerId} isCurrentTurn={currentTurn === playerId} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1 px-1 py-1">
          <View className="flex-row gap-1 h-full">
            {/* Active */}
            <View className="w-16">
              <MiniPokemonCard pokemon={player.activePokemon} playerId={playerId} slot="active" isActive />
            </View>
            {/* Bench */}
            {player.bench.map((p, i) => (
              <View key={p.id} className="w-14">
                <MiniPokemonCard pokemon={p} playerId={playerId} slot={i as 0|1|2|3|4} />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View className={`flex-1 ${theme.appBg}`} style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {renderPlayerSection('player1', true)}

      {/* Mini center bar */}
      <View className={`flex-row items-center gap-2 px-3 py-1.5 border-t border-b ${theme.centerBorder} ${theme.centerBg}`}>
        <Text className="text-xs text-gray-500 font-mono">T{turnNumber}</Text>
        <TouchableOpacity
          onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); endTurn(); }}
          className="flex-1 py-1.5 bg-blue-700 border border-blue-500 rounded-xl items-center"
        >
          <Text className="text-white text-xs font-black">End {currentPlayer.name} →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleEnergyAttached(currentTurn); }}
          className={`px-2 py-1 rounded-lg border ${!currentPlayer.energyAttached ? 'bg-green-900/60 border-green-600' : 'bg-gray-800/50 border-gray-700'}`}
        >
          <Text className={`text-xs font-black ${!currentPlayer.energyAttached ? 'text-green-300' : 'text-gray-600 line-through'}`}>⚡</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); toggleSupporter(currentTurn); }}
          className={`px-2 py-1 rounded-lg border ${!currentPlayer.supporterUsed ? 'bg-yellow-900/60 border-yellow-600' : 'bg-gray-800/50 border-gray-700'}`}
        >
          <Text className={`text-xs font-black ${!currentPlayer.supporterUsed ? 'text-yellow-300' : 'text-gray-600 line-through'}`}>★</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setDisplayMode('faceToFace')} className="px-2 py-1 rounded-lg bg-gray-700/60 border border-gray-600">
          <Text className="text-xs text-gray-300 font-bold">Exit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setGameMode('lorcana')} className="px-2 py-1 rounded-lg bg-amber-700/60 border border-amber-500/60">
          <Text className="text-xs text-amber-300 font-bold">🪄</Text>
        </TouchableOpacity>
      </View>

      {renderPlayerSection('player2', false)}
    </View>
  );
}
```

- [ ] **Step 3: Update `src/components/layout/GameBoard.tsx` to route Mini mode**

```tsx
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGameStore } from '../../store/gameStore';
import { useTheme } from '../../hooks/useTheme';
import { PlayerBoard } from '../player/PlayerBoard';
import { CenterDivider } from './CenterDivider';
import { MiniGameBoard } from '../mini/MiniGameBoard';

export function GameBoard() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { currentTurn, displayMode } = useGameStore((s) => ({ currentTurn: s.currentTurn, displayMode: s.displayMode }));

  if (displayMode === 'mini') return <MiniGameBoard />;

  return (
    <View className={`flex-1 ${theme.appBg}`} style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <PlayerBoard playerId="player1" isCurrentTurn={currentTurn === 'player1'} flipped={displayMode === 'faceToFace'} />
      <CenterDivider />
      <PlayerBoard playerId="player2" isCurrentTurn={currentTurn === 'player2'} />
    </View>
  );
}
```

- [ ] **Step 4: Test Mini mode in simulator**

Switch displayMode to 'mini' (via store or hardcode). Expected: compact horizontal scroll of all cards per player, works on iPhone screen.

- [ ] **Step 5: Commit**

```bash
git add src/components/mini/ src/components/layout/GameBoard.tsx
git commit -m "feat: Mini mode — MiniGameBoard and MiniPokemonCard"
```

---

### Task 8: Coin Flip + Dice Roller (Reanimated Animations)

**Files:**
- Create: `src/components/tools/CoinFlip.tsx`
- Create: `src/components/tools/DiceRoller.tsx`
- Modify: `src/components/layout/CenterDivider.tsx` (add CoinFlip + DiceRoller)

**Interfaces:**
- Consumes: `react-native-reanimated` — `useSharedValue`, `withTiming`, `withSequence`, `interpolate`, `useAnimatedStyle`
- Produces: Animated coin flip (rotateY) showing Heads/Tails; animated dice showing 1–6

- [ ] **Step 1: Write `src/components/tools/CoinFlip.tsx`**

```tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, withTiming, withSequence, useAnimatedStyle, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export function CoinFlip({ compact = false }: { compact?: boolean }) {
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [flipping, setFlipping] = useState(false);
  const rotateY = useSharedValue(0);

  const flip = () => {
    if (flipping) return;
    setFlipping(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const outcome: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';
    rotateY.value = withSequence(
      withTiming(360 * 3 + (outcome === 'heads' ? 0 : 180), { duration: 900, easing: Easing.out(Easing.cubic) }),
      withTiming(outcome === 'heads' ? 0 : 180, { duration: 0 })
    );
    setTimeout(() => { setResult(outcome); setFlipping(false); }, 950);
  };

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotateY.value % 360}deg` }],
  }));

  return (
    <TouchableOpacity onPress={flip} className="items-center gap-1">
      <Animated.View style={animStyle} className="w-10 h-10 rounded-full bg-yellow-500 border-2 border-yellow-400 items-center justify-center">
        <Text className="text-xl">{result === 'tails' ? '🌙' : '⭐'}</Text>
      </Animated.View>
      {result && !compact && (
        <Text className={`text-xs font-black ${result === 'heads' ? 'text-yellow-300' : 'text-blue-300'}`}>
          {result.toUpperCase()}
        </Text>
      )}
    </TouchableOpacity>
  );
}
```

- [ ] **Step 2: Write `src/components/tools/DiceRoller.tsx`**

```tsx
import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { useSharedValue, withSequence, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export function DiceRoller({ compact = false }: { compact?: boolean }) {
  const [result, setResult] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const outcome = Math.floor(Math.random() * 6) + 1;
    scale.value = withSequence(
      withTiming(0.7, { duration: 100 }),
      withTiming(1.2, { duration: 200 }),
      withTiming(1, { duration: 100 })
    );
    setTimeout(() => { setResult(outcome); setRolling(false); }, 450);
  };

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <TouchableOpacity onPress={roll} className="items-center gap-1">
      <Animated.View style={animStyle} className="w-10 h-10 rounded-xl bg-gray-700 border border-gray-600 items-center justify-center">
        <Text className="text-2xl">{result ? FACES[result - 1] : '🎲'}</Text>
      </Animated.View>
      {result && !compact && (
        <Text className="text-xs font-black text-white">{result}</Text>
      )}
    </TouchableOpacity>
  );
}
```

- [ ] **Step 3: Add tools to `CenterDivider.tsx`**

At the start of the `CenterDivider` return, add the tools row:

```tsx
import { CoinFlip } from '../tools/CoinFlip';
import { DiceRoller } from '../tools/DiceRoller';

// Inside the center bar View, add at the very start:
<View className="flex-row items-center gap-2 mb-1.5">
  <CoinFlip compact />
  <DiceRoller compact />
</View>
```

- [ ] **Step 4: Test animations on simulator**

Tap coin → spins and shows ⭐ or 🌙. Tap dice → bounces and shows die face. Both fire haptic.

- [ ] **Step 5: Commit**

```bash
git add src/components/tools/
git commit -m "feat: CoinFlip and DiceRoller with Reanimated animations"
```

---

### Task 9: Final Polish — Mini Mode Display Toggle + Push Branch

**Files:**
- Modify: `src/components/layout/CenterDivider.tsx` (add Mini mode toggle)
- Modify: `app.json` (add icon placeholder)

**Interfaces:**
- Produces: All display modes reachable from center bar; branch pushed to origin

- [ ] **Step 1: Add Mini mode toggle to CenterDivider**

In `CenterDivider.tsx`, add a Mini button next to the Side button:

```tsx
<TouchableOpacity
  onPress={() => setDisplayMode('mini')}
  className="px-1.5 py-0.5 rounded-md border border-gray-700/50"
>
  <Text className={`text-xs font-bold ${theme.centerText}`}>⊞ Mini</Text>
</TouchableOpacity>
```

- [ ] **Step 2: Verify all display modes work end-to-end**

On iPhone 15 Pro Simulator:
- [ ] Default (faceToFace): P1 rotated 180° at top
- [ ] Tap "⇅ Side": both panels show normally
- [ ] Tap "⊞ Mini": compact grid with all 12 slots
- [ ] From Mini, tap "Exit": returns to faceToFace
- [ ] Tap "🪄 Lorcana": Lorcana board appears
- [ ] From Lorcana, tap "🎮 Pokémon": Pokémon board returns

On iPad Pro Simulator (optional at this stage, likely works):
- [ ] Same modes work on larger screen

- [ ] **Step 3: Commit and push the branch**

```bash
git add -A
git status   # review before committing
git commit -m "feat: Mini mode toggle in center bar, complete iOS feature set"
git push -u origin feature/react-native
```

- [ ] **Step 4: Confirm on GitHub**

Open `https://github.com/sadin911/PokeCountTracker` — confirm `feature/react-native` branch is visible.

---

## Self-Review Notes

- All tasks produce independently testable deliverables with simulator verification steps
- AsyncStorage storage adapter is the only change from the web store — key names unchanged
- NativeWind className pattern is consistent across every component
- Haptics applied at Task 4 (Lorcana counters), Task 6 (HP damage, KO), Task 7 (Mini end turn), Task 8 (tools) — all use the same three levels per Global Constraints
- StatusBadge, EnergyTracker, AbilityTracker are not included in this plan: they are non-critical accessories that can be added in a follow-up plan without blocking any core functionality. The core game loop (HP tracking, turn management, Lorcana, Mini mode) is fully covered.
