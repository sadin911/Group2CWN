/**
 * EvolutionResolver.ts
 * Robust, bilingual Pokémon TCG evolution resolution engine.
 * Handles official Stage 1, Stage 2, and Rare Candy evolution line matching
 * across English and Thai card names, limitless decks, and custom decks.
 */

import type { CardInstance } from '../types';
import evoDataRaw from '../../data/evolutionLines.json';
import translationDataRaw from '../../data/pokemonNameTranslations.json';

const evoData = evoDataRaw as Record<string, string[]>;
const enToThTranslations = (translationDataRaw as { pokemon: Record<string, string> }).pokemon || {};

// Reverse map: Thai lower -> English lower
const thToEnMap = new Map<string, string>();
for (const [en, th] of Object.entries(enToThTranslations)) {
  thToEnMap.set(th.trim().toLowerCase(), en.trim().toLowerCase());
}

/**
 * Standard competitive evolution chains (in English base names).
 * Index 0 = Basic, Index 1 = Stage 1, Index 2 = Stage 2
 */
const CANONICAL_CHAINS: string[][] = [
  ['charmander', 'charmeleon', 'charizard'],
  ['pidgey', 'pidgeotto', 'pidgeot'],
  ['dreepy', 'drakloak', 'dragapult'],
  ['ralts', 'kirlia', 'gardevoir'],
  ['ralts', 'kirlia', 'gallade'],
  ['froakie', 'frogadier', 'greninja'],
  ['duskull', 'dusclops', 'dusknoir'],
  ['beldum', 'metang', 'metagross'],
  ['bidoof', 'bibarel'],
  ['abra', 'kadabra', 'alakazam'],
  ['dunsparce', 'dudunsparce'],
  ['impidimp', 'morgrem', 'grimmsnarl'],
  ['bronzor', 'bronzong'],
  ['buneary', 'lopunny'],
  ['snorunt', 'froslass'],
  ['snorunt', 'glalie'],
  ['litwick', 'lampent', 'chandelure'],
  ['mareep', 'flaaffy', 'ampharos'],
  ['frigibax', 'arctibax', 'baxcalibur'],
  ['pawmi', 'pawmo', 'pawmot'],
  ['shinx', 'luxio', 'luxray'],
  ['gible', 'gabite', 'garchomp'],
  ['tinkatink', 'tinkatuff', 'tinkaton'],
  ['smoliv', 'dolliv', 'arboliva'],
  ['nacli', 'naclstack', 'garganacl'],
  ['charcadet', 'armarouge'],
  ['charcadet', 'ceruledge'],
  ['tandemaus', 'maushold'],
  ['flittle', 'espathra'],
  ['varoom', 'revavroom'],
  ['glimmet', 'glimmora'],
  ['greavard', 'houndstone'],
  ['cetoddle', 'cetitan'],
  ['applin', 'dipplin', 'hydrapple'],
  ['applin', 'flapple'],
  ['applin', 'appletun'],
  ['combee', 'vespiquen'],
  ['gastly', 'haunter', 'gengar'],
  ['porygon', 'porygon2', 'porygon-z'],
  ['magikarp', 'gyarados'],
  ['feebas', 'milotic'],
  ['swablu', 'altaria'],
  ['trapinch', 'vibrava', 'flygon'],
  ['bagon', 'shelgon', 'salamence'],
  ['shroomish', 'breloom'],
  ['slakoth', 'vigoroth', 'slaking'],
  ['riolu', 'lucario'],
  ['zorua', 'zoroark'],
  ['larvesta', 'volcarona'],
  ['deino', 'zweilous', 'hydreigon'],
  ['fletchling', 'fletchinder', 'talonflame'],
  ['goomy', 'sliggoo', 'goodra'],
  ['rowlet', 'dartrix', 'decidueye'],
  ['grubbin', 'charjabug', 'vikavolt'],
  ['rookidee', 'corvisquire', 'corviknight'],
  ['blipbug', 'dottler', 'orbeetle'],
  ['rolycoly', 'carkol', 'coalossal'],
  ['sprigatito', 'floragato', 'meowscarada'],
  ['fuecoco', 'crocalor', 'skeledirge'],
  ['quaxly', 'quaxwell', 'quaquaval'],
  ['oddish', 'gloom', 'vileplume'],
  ['oddish', 'gloom', 'bellossom'],
  ['poliwag', 'poliwhirl', 'poliwrath'],
  ['poliwag', 'poliwhirl', 'politoed'],
  ['machop', 'machoke', 'machamp'],
  ['geodude', 'graveler', 'golem'],
  ['eevee', 'vaporeon'],
  ['eevee', 'jolteon'],
  ['eevee', 'flareon'],
  ['eevee', 'espeon'],
  ['eevee', 'umbreon'],
  ['eevee', 'leafeon'],
  ['eevee', 'glaceon'],
  ['eevee', 'sylveon'],
  ['horsea', 'seadra', 'kingdra'],
  ['elekid', 'electabuzz', 'electivire'],
  ['magby', 'magmar', 'magmortar'],
];

export class EvolutionResolver {
  /**
   * Normalizes a Pokémon name by stripping suffixes (ex, V, VSTAR, etc.)
   */
  static cleanName(name: string): string {
    if (!name) return '';
    return name
      .replace(/\s*ex$/i, '')
      .replace(/\s*vstar$/i, '')
      .replace(/\s*vmax$/i, '')
      .replace(/\s*v-union$/i, '')
      .replace(/\s*v$/i, '')
      .replace(/\s*gx$/i, '')
      .replace(/\s*mega\s*/i, '')
      .replace(/^เมก้า\s*/, '')
      .replace(/^ส่องประกาย\s*/, '')
      .replace(/_ของ_?.*$/, '')
      .replace(/'s .*$/, '')
      .trim()
      .toLowerCase();
  }

  /**
   * Resolves base English name from either English or Thai name
   */
  static toEnglishBase(nameEn?: string, nameTh?: string): string {
    if (nameEn) {
      const cleaned = this.cleanName(nameEn);
      if (cleaned) return cleaned;
    }
    if (nameTh) {
      const cleanedTh = this.cleanName(nameTh);
      const mapped = thToEnMap.get(cleanedTh);
      if (mapped) return mapped;
    }
    return '';
  }

  /**
   * Resolves base Thai name from either Thai or English name
   */
  static toThaiBase(nameTh?: string, nameEn?: string): string {
    if (nameTh) {
      const cleaned = this.cleanName(nameTh);
      if (cleaned) return cleaned;
    }
    if (nameEn) {
      const cleanedEn = this.cleanName(nameEn);
      const mapped = enToThTranslations[cleanedEn];
      if (mapped) return mapped.trim().toLowerCase();
    }
    return '';
  }

  /**
   * Derives the name of the Pokémon this card evolves from.
   * Useful when building CardInstances from raw deck exports.
   */
  static getPreviousEvolutionName(
    nameEn: string,
    nameTh: string,
    subtypes: string[]
  ): string | undefined {
    const isStage1 = subtypes.includes('Stage 1') || subtypes.includes('Stage1');
    const isStage2 = subtypes.includes('Stage 2') || subtypes.includes('Stage2');
    if (!isStage1 && !isStage2) return undefined;

    const baseEn = this.toEnglishBase(nameEn, nameTh);
    if (!baseEn) return undefined;

    // Check canonical chains
    for (const chain of CANONICAL_CHAINS) {
      const idx = chain.findIndex((p) => p === baseEn || baseEn.includes(p) || p.includes(baseEn));
      if (idx > 0) {
        // Return preceding evolution capitalized
        const prev = chain[idx - 1];
        return prev.charAt(0).toUpperCase() + prev.slice(1);
      }
    }

    // Check Thai evolution lines
    const baseTh = this.toThaiBase(nameTh, nameEn);
    if (baseTh && evoData[baseTh]) {
      const connected = evoData[baseTh];
      if (connected.length > 0) {
        const prevTh = connected[0];
        const prevEn = thToEnMap.get(prevTh.toLowerCase());
        if (prevEn) return prevEn.charAt(0).toUpperCase() + prevEn.slice(1);
        return prevTh;
      }
    }

    return undefined;
  }

  /**
   * Checks whether targetCard is a valid prior evolution of evolutionCard.
   * @param allowRareCandy If true, allows Basic -> Stage 2 direct evolution.
   */
  static isEvolutionMatch(
    evolutionCard: CardInstance,
    targetCard: CardInstance,
    allowRareCandy: boolean = false
  ): boolean {
    if (evolutionCard.supertype !== 'Pokemon' || targetCard.supertype !== 'Pokemon') {
      return false;
    }

    const isStage1 =
      evolutionCard.subtypes.includes('Stage 1') || evolutionCard.subtypes.includes('Stage1');
    const isStage2 =
      evolutionCard.subtypes.includes('Stage 2') || evolutionCard.subtypes.includes('Stage2');

    if (!isStage1 && !isStage2) return false;

    // Stage validation:
    // - Rare Candy: Target MUST be Basic, Evolution MUST be Stage 2
    if (allowRareCandy) {
      if (!isStage2) return false;
      const isTargetBasic =
        targetCard.subtypes.includes('Basic') ||
        (targetCard as any).stage === 'Basic' ||
        targetCard.subtypes.length === 0;
      if (!isTargetBasic) return false;
    } else {
      // Regular Evolution:
      // Stage 1 must evolve from Basic
      // Stage 2 must evolve from Stage 1
      if (isStage1) {
        const isTargetBasic =
          targetCard.subtypes.includes('Basic') || (targetCard as any).stage === 'Basic';
        if (!isTargetBasic) return false;
      } else if (isStage2) {
        const isTargetStage1 =
          targetCard.subtypes.includes('Stage 1') ||
          targetCard.subtypes.includes('Stage1') ||
          (targetCard as any).stage === 'Stage1' ||
          (targetCard as any).stage === 'Stage 1';
        if (!isTargetStage1) return false;
      }
    }

    // 1. Check explicit evolvesFrom if present (for standard non-Rare Candy evolution)
    if (!allowRareCandy && evolutionCard.evolvesFrom) {
      const evolvesFromClean = this.cleanName(evolutionCard.evolvesFrom);
      const targetEn = this.cleanName(targetCard.nameEn);
      const targetTh = this.cleanName(targetCard.nameTh);

      if (
        targetEn === evolvesFromClean ||
        targetEn.includes(evolvesFromClean) ||
        evolvesFromClean.includes(targetEn) ||
        targetTh === evolvesFromClean
      ) {
        return true;
      }
    }

    // 2. Canonical Chains Lookup (English)
    const evoEn = this.toEnglishBase(evolutionCard.nameEn, evolutionCard.nameTh);
    const targetEn = this.toEnglishBase(targetCard.nameEn, targetCard.nameTh);

    if (evoEn && targetEn) {
      for (const chain of CANONICAL_CHAINS) {
        const evoIdx = chain.findIndex((p) => p === evoEn || evoEn.includes(p) || p.includes(evoEn));
        const targetIdx = chain.findIndex(
          (p) => p === targetEn || targetEn.includes(p) || p.includes(targetEn)
        );

        if (evoIdx !== -1 && targetIdx !== -1) {
          if (allowRareCandy) {
            // Rare candy: Basic (idx 0) -> Stage 2 (idx 2)
            if (targetIdx === 0 && evoIdx >= 2) return true;
          } else {
            // Standard: Exactly one step up (idx + 1)
            if (targetIdx + 1 === evoIdx) return true;
          }
        }
      }
    }

    // 3. Thai Evolution Lines Lookup
    const evoTh = this.toThaiBase(evolutionCard.nameTh, evolutionCard.nameEn);
    const targetTh = this.toThaiBase(targetCard.nameTh, targetCard.nameEn);

    if (evoTh && targetTh) {
      const connectedFromEvo = evoData[evoTh] || [];
      const connectedFromTarget = evoData[targetTh] || [];

      const isConnected =
        connectedFromEvo.some((n) => this.cleanName(n) === targetTh) ||
        connectedFromTarget.some((n) => this.cleanName(n) === evoTh);

      if (isConnected) {
        if (allowRareCandy) {
          if (isStage2 && targetCard.subtypes.includes('Basic')) return true;
        } else {
          if (isStage1 && targetCard.subtypes.includes('Basic')) return true;
          if (
            isStage2 &&
            (targetCard.subtypes.includes('Stage 1') || targetCard.subtypes.includes('Stage1'))
          ) {
            return true;
          }
        }
      }
    }

    // 4. Substring stem fallback (e.g. "charm" in Charmander/Charmeleon/Charizard)
    if (evoEn.length >= 4 && targetEn.length >= 4) {
      const commonPrefix = evoEn.slice(0, 4);
      if (targetEn.startsWith(commonPrefix)) {
        if (allowRareCandy && isStage2 && targetCard.subtypes.includes('Basic')) return true;
        if (!allowRareCandy && isStage1 && targetCard.subtypes.includes('Basic')) return true;
        if (
          !allowRareCandy &&
          isStage2 &&
          (targetCard.subtypes.includes('Stage 1') || targetCard.subtypes.includes('Stage1'))
        ) {
          return true;
        }
      }
    }

    return false;
  }
}
