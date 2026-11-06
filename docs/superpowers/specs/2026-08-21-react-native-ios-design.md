# React Native iOS/iPadOS App — Design Spec

> **Superseded (2026-08-27):** Disney Lorcana has moved to its own repo, [LorcanaCountTracker](https://github.com/sadin911/LorcanaCountTracker). The Lorcana sections below are kept as a record of the original design and no longer describe this project.

**Date:** 2026-08-21  
**Branch:** `feature/react-native`  
**Platform:** iOS + iPadOS only (iPhone all sizes, iPad Pro/Air/mini)  
**Distribution:** Expo Go / TestFlight now → App Store later

---

## Goal

Port the existing PokéCount Tracker web app (React/Vite/Tailwind) to a native iOS/iPadOS app using React Native + Expo. Both game modes (Pokémon TCG + Disney Lorcana) are included. The app must feel native — safe area, haptics, smooth animations — while reusing as much existing business logic as possible.

---

## Architecture

### Branch Strategy

`feature/react-native` holds the Expo project at the repo root. The web app (`main` branch) is untouched. Both branches share the same GitHub repo.

```
feature/react-native/
├── app/
│   └── index.tsx             ← single screen entry point (Expo Router)
├── src/
│   ├── types/game.ts         ← copied from web, no changes
│   ├── constants/            ← copied from web, no changes
│   ├── store/
│   │   ├── gameStore.ts      ← Zustand, adapt persist → AsyncStorage
│   │   └── lorcanaStore.ts   ← Zustand, adapt persist → AsyncStorage
│   ├── components/
│   │   ├── layout/           ← GameBoard, CenterDivider (RN)
│   │   ├── pokemon/          ← PokemonSlot, HPBar, DamageCounter, etc. (RN)
│   │   ├── lorcana/          ← LorcanaGameBoard, LorcanaPlayerPanel (RN)
│   │   ├── mini/             ← MiniGameBoard, MiniPokemonCard (RN)
│   │   └── tools/            ← CoinFlip, DiceRoller (RN + Reanimated)
│   └── hooks/
│       ├── useLongPress.ts   ← adapted for RN (Pressable onLongPress)
│       ├── useGestureSwap.ts ← replaces useDragSwap (Gesture Handler)
│       └── useTheme.ts       ← same logic, NativeWind classes
├── app.json                  ← Expo config (name, icon, splash)
├── tailwind.config.js        ← NativeWind config
└── package.json
```

### Shared Code (zero changes)

| File | Reason |
|---|---|
| `src/types/game.ts` | Pure TypeScript interfaces |
| `src/constants/*.ts` | Pure JS — energy types, HP presets, themes |

### Adapted Code (minor changes)

| File | Change |
|---|---|
| `src/store/gameStore.ts` | Replace `localStorage` persist with `AsyncStorage` |
| `src/store/lorcanaStore.ts` | Same — AsyncStorage |
| `src/hooks/useLongPress.ts` | Use Pressable's `onLongPress` + `delayLongPress` |

### Rewritten Code (HTML → RN components)

All components under `src/components/` are rewritten. Styling uses **NativeWind v4** — same Tailwind class names, same `className` prop. The translation pattern is mechanical:

| Web | React Native |
|---|---|
| `<div className="...">` | `<View className="...">` |
| `<span>` / `<p>` | `<Text>` |
| `<button onClick={}>` | `<TouchableOpacity onPress={}>` |
| `<input>` | `<TextInput>` |
| CSS `rotate-180` | `style={{ transform: [{ rotate: '180deg' }] }}` |
| Framer Motion | React Native Reanimated 2 |
| HTML drag events | react-native-gesture-handler (PanGesture) |

---

## Dependencies

```json
{
  "expo": "~52.x",
  "react-native": "0.76.x",
  "expo-router": "~4.x",
  "nativewind": "^4.x",
  "tailwindcss": "^3.x",
  "react-native-reanimated": "~3.x",
  "react-native-gesture-handler": "~2.x",
  "@react-native-async-storage/async-storage": "^2.x",
  "react-native-safe-area-context": "^4.x",
  "expo-haptics": "~14.x",
  "expo-screen-orientation": "~8.x",
  "zustand": "^5.x"
}
```

---

## Display Modes

All 4 display modes from the web app are preserved. Orientation is detected via `useWindowDimensions()`.

| Mode | iPhone | iPad | Notes |
|---|---|---|---|
| **Face-to-Face** | ✅ | ✅ | P1 panel rotated 180° at top; default mode |
| **Same Side** | ✅ | ✅ | Both panels normal orientation |
| **Landscape** | ✅ | ✅ | Detected automatically via window width > height |
| **Mini** | ✅ | ✅ | Compact grid — more useful on iPhone |

### Layout (Face-to-Face)

```
┌─────────────────────────────┐  ← Safe area top
│  Player 1 panel (rotated)   │  flex: 1
├─────────────────────────────┤
│  Center divider             │  height: fixed ~80pt
├─────────────────────────────┤
│  Player 2 panel (normal)    │  flex: 1
└─────────────────────────────┘  ← Safe area bottom (home indicator)
```

Safe area is handled by `react-native-safe-area-context`. The Player 1 panel's safe area top and Player 2's safe area bottom are each respected so content never hides behind the Dynamic Island or home indicator.

---

## iOS-Specific Enhancements

- **Haptics** (`expo-haptics`): light impact on counter tap, heavy impact on KO, notification on End Turn
- **Safe Area**: Dynamic Island, notch, home indicator all respected via `useSafeAreaInsets()`
- **Screen orientation lock**: Landscape mode locks orientation via `expo-screen-orientation`
- **Dark appearance**: NativeWind dark mode tied to iOS system appearance (`useColorScheme()`)

---

## State Persistence

Both Zustand stores use `zustand/middleware` `persist` with `AsyncStorage` as the storage backend. Separate storage keys (`'pokecounttracker-game'` and `'lorcana-tracker-game'`) prevent collision. State survives app backgrounding and restart.

---

## Animation Strategy

| Animation | Web | React Native |
|---|---|---|
| Coin flip (3D Y-axis) | Framer Motion `rotateY` | Reanimated `withTiming` + `interpolate` |
| Dice number cycle | Framer Motion | Reanimated `withSequence` |
| End turn modal | Framer Motion `scale` | Reanimated layout animation |
| Card swap visual | CSS transition | Reanimated shared value |

---

## Implementation Order

1. Scaffold Expo project on `feature/react-native` branch
2. Install and configure NativeWind, Reanimated, Gesture Handler, Safe Area
3. Copy types, constants; adapt stores (AsyncStorage)
4. `app/index.tsx` — root layout with SafeAreaProvider + GestureHandlerRootView
5. `GameBoard.tsx` — split top/bottom layout + CenterDivider
6. `LorcanaPlayerPanel` + `LorcanaGameBoard` — counters only, simplest component
7. `PlayerHeader`, `PlayerBoard`, `ActiveZone`, `BenchRow`
8. `PokemonSlot` — HP, damage, status badge
9. `DamageCounter` — long press with Pressable
10. `HPPresetPicker` — RN Modal bottom sheet
11. `EnergyTracker`, `StatusBadge`, `AbilityTracker`
12. `MiniGameBoard` + `MiniPokemonCard`
13. `CoinFlip` + `DiceRoller` (Reanimated)
14. `EndTurnModal` (Reanimated layout animation)
15. Add haptics throughout
16. Test all display modes on iPhone 15 Pro + iPad Pro simulator
17. `git push origin feature/react-native`

---

## Out of Scope

- Android support (can be added later with minimal changes since Expo is cross-platform)
- App Store submission (future, after testing complete)
- Push notifications
- iCloud sync (AsyncStorage local only)
