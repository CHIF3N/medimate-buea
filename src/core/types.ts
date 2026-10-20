export type Lang = 'en' | 'fr' | 'pcm';

/** A piece of copy in English, French and Cameroonian Pidgin. Missing translations fall back to English. */
export interface L10n {
  en: string;
  fr?: string;
  pcm?: string;
}

export const pick = (text: L10n | undefined, lang: Lang): string =>
  text ? (text[lang] ?? text.en) : '';

/** Safety level shown on every answer. Colour always means the same thing across the app. */
export type Level = 'EMERGENCY' | 'RED' | 'AMBER' | 'GREEN' | 'INFO';

export type StockLevel = 'in' | 'low' | 'out';

export type MedClass =
  | 'antimalarial'
  | 'antibiotic'
  | 'analgesic'
  | 'nsaid'
  | 'rehydration'
  | 'supplement'
  | 'bronchodilator'
  | 'antihistamine'
  | 'antacid'
  | 'anthelmintic'
  | 'antihypertensive'
  | 'anticoagulant'
  | 'contraceptive'
  | 'herb';

export type Pregnancy = 'label' | 'ask' | 'avoid-first-trimester' | 'avoid';

export interface Medicine {
  id: string;
  name: string;
  generic: string;
  brands: string[];
  /** Extra match terms: slang, French spellings, common misspellings. */
  aliases: string[];
  /** Allow typo-tolerant matching on this medicine's names (off for short, common words). */
  fuzzy?: boolean;
  klass: MedClass;
  category: L10n;
  /** GREEN = OTC as labelled · AMBER = check first · RED = prescription only */
  risk: 'GREEN' | 'AMBER' | 'RED';
  rx: boolean;
  forms: string;
  atc?: string;
  usedFor: L10n;
  /** Adult label guidance. Only present for medicines MediMate may describe dosing for. */
  howToTake?: L10n;
  keyPoints: L10n[];
  askFirstIf: L10n[];
  sideEffects: L10n;
  dangerSigns: L10n;
  pregnancy: Pregnancy;
  /** Default course template for the adherence tracker. */
  regimen?: RegimenId;
}

export type RegimenId = 'al6' | 'asaq3' | 'abx' | 'zinc' | 'daily';
