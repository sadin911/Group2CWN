import React, { useState } from 'react';
import { Sound } from '../../../engine/pixi/SoundEffects';

interface RandomizerModalProps {
  onClose: () => void;
  onLogResult: (message: string) => void;
}

export const RandomizerModal: React.FC<RandomizerModalProps> = ({ onClose, onLogResult }) => {
  const [activeMode, setActiveMode] = useState<'COIN' | 'DICE'>('COIN');
  const [coinFlips, setCoinFlips] = useState<('HEADS' | 'TAILS')[]>([]);
  const [isFlipping, setIsFlipping] = useState(false);

  const [diceCount, setDiceCount] = useState(2);
  const [diceRolls, setDiceRolls] = useState<number[]>([]);
  const [isRolling, setIsRolling] = useState(false);

  const flipCoins = (count: number) => {
    setIsFlipping(true);
    Sound.playCardFlip();
    setTimeout(() => {
      const results: ('HEADS' | 'TAILS')[] = [];
      for (let i = 0; i < count; i++) {
        results.push(Math.random() < 0.5 ? 'HEADS' : 'TAILS');
      }
      setCoinFlips(results);
      setIsFlipping(false);
      const heads = results.filter((r) => r === 'HEADS').length;
      onLogResult(`Flipped ${count} coin(s): ${heads} Heads, ${count - heads} Tails (${results.join(', ')})`);
    }, 400);
  };

  const rollDice = (count: number) => {
    setIsRolling(true);
    Sound.playCardPlacement();
    setTimeout(() => {
      const results: number[] = [];
      for (let i = 0; i < count; i++) {
        results.push(Math.floor(Math.random() * 6) + 1);
      }
      setDiceRolls(results);
      setIsRolling(false);
      const total = results.reduce((a, b) => a + b, 0);
      onLogResult(`Rolled ${count} dice: [${results.join(', ')}] Total = ${total}`);
    }, 350);
  };

  const diceFaceGlyphs = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md">
      <div
        id="randomizer-modal"
        className="relative w-full max-w-md bg-slate-900/95 border border-white/15 rounded-3xl shadow-2xl flex flex-col text-white overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎲</span>
            <div>
              <h2 className="text-base font-black tracking-tight">Randomizer (เหรียญ & ลูกเต๋า)</h2>
              <p className="text-xs text-slate-400">Official tournament certified randomizers</p>
            </div>
          </div>
          <button
            id="btn-randomizer-close"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Tab Switch */}
        <div className="flex border-b border-white/10 bg-slate-950/40 text-xs font-bold">
          <button
            onClick={() => setActiveMode('COIN')}
            className={`flex-1 py-2.5 text-center border-b-2 transition ${
              activeMode === 'COIN'
                ? 'border-amber-500 text-amber-400 bg-amber-950/30'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            🪙 Coin Flip
          </button>
          <button
            onClick={() => setActiveMode('DICE')}
            className={`flex-1 py-2.5 text-center border-b-2 transition ${
              activeMode === 'DICE'
                ? 'border-sky-500 text-sky-400 bg-sky-950/30'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            🎲 Dice Roller
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center justify-center min-h-[220px]">
          {activeMode === 'COIN' ? (
            <div className="w-full flex flex-col items-center gap-6">
              {/* Coin Results Display */}
              <div className="flex flex-wrap items-center justify-center gap-3 min-h-[70px]">
                {isFlipping ? (
                  <div className="animate-spin text-5xl">🪙</div>
                ) : coinFlips.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Press a button below to flip coins.</p>
                ) : (
                  coinFlips.map((res, i) => (
                    <div
                      key={i}
                      className={`flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 shadow-lg transition-transform transform scale-100 ${
                        res === 'HEADS'
                          ? 'bg-gradient-to-br from-amber-400 to-yellow-600 border-amber-300 text-slate-950 font-black'
                          : 'bg-gradient-to-br from-slate-600 to-slate-800 border-slate-500 text-white font-black'
                      }`}
                    >
                      <span className="text-xl">{res === 'HEADS' ? '👑' : '⭐'}</span>
                      <span className="text-[10px] uppercase font-black tracking-wider">
                        {res}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  id="btn-flip-1-coin"
                  disabled={isFlipping}
                  onClick={() => flipCoins(1)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black rounded-xl text-xs shadow-md active:scale-95 transition"
                >
                  Flip 1 Coin
                </button>
                <button
                  disabled={isFlipping}
                  onClick={() => flipCoins(2)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition"
                >
                  Flip 2
                </button>
                <button
                  disabled={isFlipping}
                  onClick={() => flipCoins(3)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition"
                >
                  Flip 3
                </button>
                <button
                  disabled={isFlipping}
                  onClick={() => flipCoins(4)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs transition"
                >
                  Flip 4
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col items-center gap-6">
              {/* Dice Results Display */}
              <div className="flex flex-wrap items-center justify-center gap-3 min-h-[70px]">
                {isRolling ? (
                  <div className="animate-bounce text-5xl">🎲</div>
                ) : diceRolls.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Choose dice count and roll.</p>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex flex-wrap justify-center gap-2">
                      {diceRolls.map((roll, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-center w-12 h-12 bg-white text-slate-950 rounded-xl shadow-lg border border-slate-200 text-3xl select-none"
                        >
                          {diceFaceGlyphs[roll] || roll}
                        </div>
                      ))}
                    </div>
                    <div className="text-xs font-mono font-bold text-sky-400">
                      Sum Total = {diceRolls.reduce((a, b) => a + b, 0)}
                    </div>
                  </div>
                )}
              </div>

              {/* Dice Count Stepper & Roll */}
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-800 border border-slate-700 rounded-xl p-1 text-xs">
                  {[1, 2, 3, 4, 6].map((num) => (
                    <button
                      key={num}
                      onClick={() => setDiceCount(num)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        diceCount === num ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {num}D
                    </button>
                  ))}
                </div>

                <button
                  disabled={isRolling}
                  onClick={() => rollDice(diceCount)}
                  className="px-5 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 font-black rounded-xl text-xs shadow-md active:scale-95 transition"
                >
                  Roll Dice
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
