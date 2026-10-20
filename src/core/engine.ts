// MediMate answer engine.
// Runs fully on the device: no network, no generative model. It understands English, French and
// Cameroonian Pidgin, tolerates typos, and decides every answer with explicit safety rules that are
// recorded in a trace the user can open ("How MediMate decided").

import { Matcher, editDistance, normalize, phrases, toNumber, typoBudget } from './text';
import * as LX from './lexicon';
import { MEDICINES } from '../data/medicines';
import { DUPLICATE_WARNING, findInteraction, partiesOf, type Party } from './interactions';
import type { L10n, Lang, Level, Medicine } from './types';

const t = (en: string, fr: string, pcm: string): L10n => ({ en, fr, pcm });

/** Replace {key} placeholders in every language of an L10n. */
function fill(text: L10n, vars: Record<string, string | L10n>): L10n {
  const out: L10n = { en: text.en };
  (['en', 'fr', 'pcm'] as const).forEach((lang) => {
    const src = text[lang];
    if (src === undefined) return;
    out[lang] = src.replace(/\{(\w+)\}/g, (_, k: string) => {
      const v = vars[k];
      if (v === undefined) return `{${k}}`;
      return typeof v === 'string' ? v : (v[lang] ?? v.en);
    });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ActionKind = 'emergency' | 'find' | 'course' | 'verify' | 'facilities';
export interface Action {
  kind: ActionKind;
  medId?: string;
}

export type Tone = 'ok' | 'warn' | 'bad' | 'neutral';
export interface TraceStep {
  label: L10n;
  value: L10n;
  tone: Tone;
}

export type AnswerKind =
  | 'emergency'
  | 'urgent'
  | 'firewall'
  | 'adherence'
  | 'stop-ok'
  | 'prescribed'
  | 'test-negative'
  | 'test-first'
  | 'interaction'
  | 'dose'
  | 'med-info'
  | 'side-effects'
  | 'missed'
  | 'symptom'
  | 'find'
  | 'verify'
  | 'unknown-med'
  | 'greeting'
  | 'thanks'
  | 'fallback';

export interface FollowUp {
  id: 'who' | 'duration' | 'danger' | 'prescribed' | 'test' | 'dehydration' | 'cough-length';
  question: L10n;
  options: { label: L10n; add: string; tone?: 'danger' | 'safe' }[];
}

export interface Answer {
  kind: AnswerKind;
  level: Level;
  /** Language the question was written in — the answer is shown in it by default. */
  lang: Lang;
  /** False when the question was too short to tell (then the app's language is used). */
  langSure: boolean;
  title: L10n;
  summary: L10n;
  points: L10n[];
  meds: Medicine[];
  flag?: LX.FlagId;
  actions: Action[];
  trace: TraceStep[];
  sources: string[];
  chart?: 'parasites';
  /** One clarifying question with tap-to-answer options (the branched chat). */
  followUp?: FollowUp;
  /** Next questions people usually ask. */
  suggestions?: { label: L10n; query: string }[];
  /** How long the engine took, in milliseconds. */
  ms?: number;
}

// ---------------------------------------------------------------------------
// Medicine recognition
// ---------------------------------------------------------------------------

interface Term {
  norm: string;
  med: Medicine;
  words: number;
}

const TERMS: Term[] = (() => {
  const out: Term[] = [];
  const seen = new Set<string>();
  for (const med of MEDICINES) {
    for (const raw of [med.name, med.generic, ...med.brands, ...med.aliases]) {
      const norm = normalize(raw.replace(/\(.*?\)/g, ''));
      if (!norm || seen.has(`${med.id}|${norm}`)) continue;
      seen.add(`${med.id}|${norm}`);
      out.push({ norm, med, words: norm.split(' ').length });
    }
  }
  // Longer phrases first so "oral rehydration salts" wins over "salts".
  return out.sort((a, b) => b.norm.length - a.norm.length);
})();

const FUZZY_STOP = new Set(
  normalize(
    'fever about should better taking tablet tablets medicine medicines children people please where which there their pharmacy pharmacie ' +
      'malaria headache stomach pregnant comment quelle enfant donner prendre combien depuis breathe breath water morning evening night ' +
      'started stopped still since again after before because without really thanks doctor hospital clinic market street seller capsule capsules ' +
      'syrup sirop injection person woman pikin catarrh cough coughing body pains paining burning itching worms allergy asthma pressure ' +
      'alcohol palm wine beers drink drinking infection infections parasites resistant resistance treatment course finish finished',
  ).split(' '),
);

interface MedMention {
  med: Medicine;
  term: string;
  via: 'exact' | 'typo';
  index: number;
}

function findMedicines(m: Matcher): MedMention[] {
  const found: MedMention[] = [];
  const claimed = new Set<number>();

  // 1. Exact phrase / token matches.
  for (const term of TERMS) {
    const p = { raw: term.norm, norm: term.norm, prefix: false };
    if (!m.has(p)) continue;
    const index = m.indexOf(p);
    const startToken = m.text.slice(0, index).split(' ').filter(Boolean).length;
    const span = Array.from({ length: term.words }, (_, k) => startToken + k);
    if (span.some((k) => claimed.has(k))) continue; // already covered by a longer name
    span.forEach((k) => claimed.add(k));
    found.push({ med: term.med, term: term.norm, via: 'exact', index });
  }

  // 2. Typo-tolerant match on remaining single words.
  m.tokens.forEach((tok, i) => {
    if (claimed.has(i) || tok.length < 5 || FUZZY_STOP.has(tok) || /\d/.test(tok)) return;
    let best: { term: Term; d: number } | undefined;
    for (const term of TERMS) {
      if (term.words > 1 || term.med.fuzzy === false || term.norm.length < 5) continue;
      if (term.norm[0] !== tok[0]) continue;
      const budget = typoBudget(Math.min(term.norm.length, tok.length));
      if (!budget || Math.abs(term.norm.length - tok.length) > budget) continue;
      const d = editDistance(tok, term.norm);
      if (d <= budget && (!best || d < best.d)) best = { term, d };
    }
    if (best) {
      const index = m.text.split(' ').slice(0, i).join(' ').length;
      found.push({ med: best.term.med, term: tok, via: 'typo', index });
    }
  });

  return found.sort((a, b) => a.index - b.index);
}

/** Known medicines MediMate has not reviewed yet. `rx` ones get a prescription warning. */
const UNREVIEWED: Record<string, { rx: boolean; note?: L10n }> = {
  tramadol: {
    rx: true,
    note: t(
      'Tramadol is a strong opioid painkiller that is widely misused. It must only be taken with a prescription.',
      'Le tramadol est un antidouleur opioïde puissant, souvent détourné. Uniquement sur ordonnance.',
      'Tramadol na strong painkiller wey plenty people dey abuse. Na only with doctor paper.',
    ),
  },
  diclofenac: { rx: false },
  aspirin: { rx: false },
  dexamethasone: { rx: true },
  prednisolone: { rx: true },
  ceftriaxone: { rx: true },
  gentamicin: { rx: true },
  doxycycline: { rx: true },
  tetracycline: { rx: true },
  ampicillin: { rx: true },
  cloxacillin: { rx: true },
  erythromycin: { rx: true },
  chloramphenicol: { rx: true },
  quinine: { rx: true },
  fansidar: { rx: true },
  nifedipine: { rx: true },
  metformin: { rx: true },
  glibenclamide: { rx: true },
  insulin: { rx: true },
  efavirenz: { rx: true },
  dolutegravir: { rx: true },
  misoprostol: { rx: true },
  cytotec: { rx: true },
  postinor: { rx: false },
  ivermectin: { rx: false },
  mebendazole: { rx: false },
  praziquantel: { rx: false },
  loperamide: { rx: false },
  hydrocortisone: { rx: false },
};

const DRUG_SUFFIX = /(cillin|mycin|floxacin|azole|pril|sartan|olol|statin|tidine|prazole|dipine|cycline|vir|zepam|oxetine|profen|caine|gliptin|formin|tadine|phylline)$/;

function findUnreviewed(m: Matcher, known: MedMention[]): string | undefined {
  const knownTerms = new Set(known.map((k) => k.term));
  for (const tok of m.tokens) {
    if (knownTerms.has(tok)) continue;
    if (UNREVIEWED[tok]) return tok;
    if (tok.length >= 7 && DRUG_SUFFIX.test(tok) && !FUZZY_STOP.has(tok)) return tok;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Context: who, how long, which language
// ---------------------------------------------------------------------------

interface Population {
  adult: boolean;
  child: boolean;
  infant: boolean;
  newborn: boolean;
  pregnant: boolean;
  breastfeeding: boolean;
  ageMonths?: number;
}

const BELLE_PREGNANT = /\b(i|she|you|wife|woman|sister|ma|my wife|mami|mama) (get|carry|don get|dey carry) belle\b(?! (pain|dey|run|turn|ache|wahala|problem|don run|don turn))/;
const DURATION_PREV = new Set(['for', 'since', 'depuis', 'pendant', 'about', 'over', 'last', 'past', 'in']);
const AGE_PREV = new Set(['my', 'a', 'an', 'mon', 'ma', 'de', 'son', 'her', 'his', 'our', 'is', 'aged', 'age']);

/** One pass over "<number> <unit>" pairs: decides whether each is an age or an illness duration. */
function numbers(m: Matcher): { ageMonths?: number; days?: number } {
  const tk = m.tokens;
  const childWords = m.any(LX.CHILD) || m.any(LX.INFANT);
  let ageMonths: number | undefined;
  let days: number | undefined;
  for (let i = 0; i < tk.length - 1; i++) {
    const n = toNumber(tk[i]);
    if (n === undefined) continue;
    const unit = tk[i + 1];
    const prev = tk[i - 1] ?? '';
    const old = tk[i + 2] === 'old';
    const kind = /^(day|days|jour|jours)$/.test(unit)
      ? 'd'
      : /^(week|weeks|wk|wks|semaine|semaines)$/.test(unit)
        ? 'w'
        : /^(month|months|mois|mo|mths)$/.test(unit)
          ? 'm'
          : /^(year|years|yr|yrs|ans|an|yo)$/.test(unit)
            ? 'y'
            : undefined;
    if (!kind) continue;
    const isDuration = DURATION_PREV.has(prev) && !old;
    const isAge =
      !isDuration &&
      (old || (AGE_PREV.has(prev) && childWords) || (kind === 'y' && childWords) || (kind === 'm' && childWords && prev === 'de'));
    const months = kind === 'd' ? n / 30 : kind === 'w' ? n / 4.35 : kind === 'm' ? n : n * 12;
    if (isAge) ageMonths = months;
    else if (kind !== 'y') days = Math.max(days ?? 0, kind === 'd' ? n : kind === 'w' ? n * 7 : n * 30);
  }
  if (days === undefined && /\b(one|a) month\b|\bdepuis un mois\b/.test(m.text)) days = 30;
  return { ageMonths, days };
}

function population(m: Matcher, ageMonths?: number): Population {
  const newborn = m.any(LX.NEWBORN) || (ageMonths !== undefined && ageMonths < 2);
  const infant = newborn || m.any(LX.INFANT) || (ageMonths !== undefined && ageMonths < 12);
  const child = infant || m.any(LX.CHILD) || (ageMonths !== undefined && ageMonths < 144);
  const pregnant = m.any(LX.PREGNANT) || BELLE_PREGNANT.test(m.text);
  const adult = !child && (m.any(LX.ADULT) || (ageMonths !== undefined && ageMonths >= 144));
  return { adult, child, infant, newborn, pregnant, breastfeeding: m.any(LX.BREASTFEEDING), ageMonths };
}

const ENGLISH = phrases(['can', 'i', 'my', 'what', 'is', 'the', 'with', 'how', 'should', 'take', 'give', 'does', 'it', 'and', 'have', 'am', 'a', 'to', 'of', 'for', 'when', 'where', 'which', 'safe', 'child']);

function langSure(m: Matcher, lang: Lang): boolean {
  if (lang !== 'en') return true;
  return ENGLISH.filter((p) => m.has(p)).length >= 3;
}

function detectLang(m: Matcher): Lang {
  const score = (strong: ReturnType<typeof phrases>, weak: ReturnType<typeof phrases>) => {
    const n = strong.filter((p) => m.has(p)).length;
    return { strong: n, total: n * 2 + weak.filter((p) => m.has(p)).length };
  };
  const pcm = score(LX.PIDGIN_STRONG, LX.PIDGIN_WEAK);
  const fr = score(LX.FRENCH_STRONG, LX.FRENCH_WEAK);
  if (pcm.strong >= 1 && pcm.total >= 2 && pcm.total >= fr.total) return 'pcm';
  if (fr.strong >= 1 && fr.total >= 3 && fr.total > pcm.total) return 'fr';
  return 'en';
}

const FEVER_RESOLVED = phrases([
  'don cool', 'don go', 'don finish', 'fever gone', 'fever is gone', 'fever has gone', 'no more fever', 'feel better', 'feeling better',
  'la fievre est partie', 'fievre a baisse', 'plus de fievre',
]);

const OVERDOSE_RE = /\b(took|taken|take|swallowed|swallow|drank|drink|ate|chop|don take|don swallow|don drink|a avale|a pris) (too many|too much|plenty|all the|all my|the whole|whole|many|trop de|tout le)\b/;
const SWELLING_RE = /\b(lip|lips|face|tongue|throat|mouth|levres|visage|langue|gorge)\b(?: \w+){0,3} (swell|swelling|swollen|don swell|dey swell|gonfle|gonflee|gonflent)\b/;
const SWELLING_RE2 = /\b(swelling|swollen|swell) (of |for |in )?(my |his |her |di |the )?(lip|lips|face|tongue|throat|mouth)\b/;

const STOP_WORDS = new Set(['stop', 'stops', 'stopping', 'arreter', 'arrete']);
const STOP_CONDITION = new Set(['when', 'if', 'after', 'because', 'once', 'quand', 'si', 'apres']);
const SYMPTOM_PHRASES = Object.values(LX.SYMPTOMS).flat();

/** "Can paracetamol stop my headache?" is not about stopping a course early. */
function stopTargetsSymptom(m: Matcher): boolean {
  const tk = m.tokens;
  for (let i = 0; i < tk.length; i++) {
    if (!STOP_WORDS.has(tk[i])) continue;
    if (STOP_CONDITION.has(tk[i + 1] ?? '')) continue; // "stop when the diarrhoea stops"
    const next = new Matcher(tk.slice(i + 1, i + 3).join(' '));
    if (next.any(SYMPTOM_PHRASES)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

const RULE = {
  emergency: t('Danger-sign check → emergency', 'Signes de danger → urgence', 'Danger sign check → emergency'),
  urgent: t('Danger-sign check → see a clinician today', 'Signes de danger → consulter aujourd’hui', 'Danger sign check → see doctor today'),
  firewall: t('Prescription-only firewall → no dose given', 'Pare-feu « sur ordonnance » → aucune dose', 'Prescription firewall → no dose'),
  adherence: t('Finish-the-course rule', 'Règle « traitement complet »', 'Finish-di-treatment rule'),
  testFirst: t('Test-before-treat rule (malaria)', 'Règle « tester avant de traiter »', 'Test-before-treat rule (malaria)'),
  interaction: t('Interaction table lookup', 'Table des interactions', 'Check mix-medicine table'),
  duplicate: t('Duplicate-ingredient check', 'Contrôle des doublons', 'Same-medicine check'),
  child: t('Child dosing is weight-based → refer', 'Dose enfant selon le poids → orienter', 'Pikin dose depend on weight → ask pharmacist'),
  pregnancy: t('Pregnancy check', 'Contrôle grossesse', 'Belle (pregnancy) check'),
  label: t('Label guidance for adults', 'Notice (adulte)', 'Label guidance (big people)'),
  info: t('Medicine information', 'Information médicament', 'Medicine information'),
  symptom: t('Symptom guidance (no diagnosis)', 'Conseils symptômes (sans diagnostic)', 'Symptom guidance (no diagnosis)'),
  unknown: t('Not in reviewed list → no guessing', 'Hors liste vérifiée → pas de supposition', 'E no dey reviewed list → we no dey guess'),
  route: t('Routed to the right tool', 'Redirigé vers le bon outil', 'Send you go di correct tool'),
  chat: t('Conversation', 'Conversation', 'Conversation'),
};

const LANG_NAME: Record<Lang, L10n> = {
  en: t('English', 'Anglais', 'English'),
  fr: t('French', 'Français', 'French'),
  pcm: t('Pidgin', 'Pidgin', 'Pidgin'),
};

const EMERGENCY_FIRST_AID: Partial<Record<LX.FlagId, L10n>> = {
  convulsion: t(
    'While you wait: lay them on their side, move hard objects away, and put nothing in their mouth.',
    'En attendant : allongez la personne sur le côté, éloignez les objets durs, ne mettez rien dans sa bouche.',
    'As you dey wait: lay am for e side, comot hard things near am, no put anything for e mouth.',
  ),
  breathing: t(
    'Help them sit upright. If they have a prescribed reliever inhaler, they can use it on the way.',
    'Aidez la personne à s’asseoir droite. Si elle a un inhalateur prescrit, elle peut l’utiliser en route.',
    'Help am sit up straight. If e get asthma pump wey doctor give, e fit use am for road.',
  ),
  chest_pain: t('Keep them still and seated. Do not let them walk or travel alone.', 'Gardez la personne assise et calme. Ne la laissez pas marcher ni partir seule.', 'Make e sit down quiet. No let am waka or go alone.'),
  unconscious: t('Lay them on their side and check they are breathing. Give nothing by mouth.', 'Mettez-la sur le côté et vérifiez qu’elle respire. Rien par la bouche.', 'Lay am for e side, check say e dey breathe. No give am anything for mouth.'),
  overdose: t('Take the medicine pack with you. Do not try to make them vomit.', 'Emportez la boîte du médicament. N’essayez pas de faire vomir.', 'Carry di medicine pack go with you. No try make am vomit.'),
  self_harm: t(
    'You are not alone. Please stay with someone you trust and go to the nearest hospital now, or call 119. If you have taken medicine, go now.',
    'Vous n’êtes pas seul·e. Restez avec une personne de confiance et allez à l’hôpital le plus proche, ou appelez le 119. Si vous avez pris des médicaments, allez-y maintenant.',
    'You no dey alone. Abeg stay with person wey you trust and go hospital now, or call 119. If you don take medicine, go now now.',
  ),
  anaphylaxis: t('Go now. If they have an adrenaline auto-injector, use it.', 'Partez maintenant. Si la personne a un stylo d’adrénaline, utilisez-le.', 'Go now now. If e get adrenaline pen, use am.'),
  stroke: t('Note the time the symptoms started. Go now — every minute counts.', 'Notez l’heure du début des symptômes. Partez maintenant : chaque minute compte.', 'Remember di time wey e start. Go now — every minute matter.'),
  child_danger: t(
    'Keep the child warm and keep breastfeeding or giving sips if they can swallow. Go now.',
    'Gardez l’enfant au chaud, continuez l’allaitement ou de petites gorgées s’il peut avaler. Partez maintenant.',
    'Keep pikin warm, continue give breast or small small water if e fit swallow. Go now now.',
  ),
  dehydration: t('Give small sips of ORS on the way if they can swallow.', 'Donnez de petites gorgées de SRO en route si la personne peut avaler.', 'Give am small small ORS for road if e fit swallow.'),
  stiff_neck: t('Fever with a stiff neck can be meningitis. Go now.', 'Fièvre avec raideur de la nuque : possible méningite. Partez maintenant.', 'Hot body with stiff neck fit be meningitis. Go now now.'),
  dark_urine: t('Dark urine with malaria can mean severe malaria. Go now.', 'Urines foncées avec paludisme : possible paludisme grave. Partez maintenant.', 'Black urine with malaria fit mean severe malaria. Go now now.'),
  pregnancy_bleeding: t('Lie on your left side while you wait for transport. Go now.', 'Allongez-vous sur le côté gauche en attendant le transport. Partez maintenant.', 'Lie down for your left side as you dey wait for car. Go now now.'),
  newborn_fever: t('Any fever in a baby under 2 months needs a doctor straight away.', 'Toute fièvre chez un bébé de moins de 2 mois nécessite un médecin immédiatement.', 'Any hot body for baby wey never reach 2 months — doctor must see am now now.'),
  bleeding: t('Press firmly on any bleeding wound with a clean cloth.', 'Appuyez fermement sur la plaie avec un tissu propre.', 'Press di wound strong with clean cloth.'),
};

const URGENT_POINT: Partial<Record<LX.FlagId, L10n>> = {
  long_fever: t(
    'A fever that lasts more than 2–3 days needs tests for malaria and other causes such as typhoid.',
    'Une fièvre de plus de 2–3 jours nécessite des examens (paludisme, typhoïde…).',
    'Hot body wey pass 2–3 days need test for malaria and other sickness like typhoid.',
  ),
  long_cough: t(
    'A cough for 2 weeks or more must be checked for tuberculosis (TB). Ask at a health centre about a TB test.',
    'Une toux de 2 semaines ou plus doit faire rechercher la tuberculose. Demandez un test au centre de santé.',
    'Cough wey pass 2 weeks — make dem check you for TB. Ask for health centre about TB test.',
  ),
  pregnancy_fever: t(
    'Malaria in pregnancy can harm mother and baby. Get tested and treated by a health worker today.',
    'Le paludisme pendant la grossesse peut nuire à la mère et au bébé. Faites-vous tester et traiter aujourd’hui.',
    'Malaria when you get belle fit harm you and di baby. Go do test and treatment today.',
  ),
  blood_stool: t(
    'Blood in the stool needs a proper diagnosis. Do not take Flagyl or ciprofloxacin without a test.',
    'Du sang dans les selles nécessite un diagnostic. Pas de Flagyl ni de ciprofloxacine sans examen.',
    'Blood for shit need proper check. No take Flagyl or cipro without test.',
  ),
  jaundice: t(
    'Yellow eyes or skin can mean liver problems, severe malaria or another illness. Get checked today.',
    'Des yeux ou une peau jaunes peuvent signaler un problème de foie, un paludisme grave ou autre. Consultez aujourd’hui.',
    'Yellow eye or skin fit mean liver problem, strong malaria or other sickness. Go check today.',
  ),
  dark_urine: t(
    'Dark urine can mean dehydration, liver problems or severe malaria. Get checked today, and go at once if there is fever or confusion.',
    'Des urines foncées peuvent signaler une déshydratation, un problème de foie ou un paludisme grave. Consultez aujourd’hui.',
    'Black urine fit mean body don dry, liver problem or strong malaria. Go check today — go now now if hot body or confusion dey.',
  ),
};

const SCHEDULE: Record<string, L10n> = {
  al: t('all 6 doses over 3 days, with fatty food or milk', 'les 6 prises sur 3 jours, avec un aliment gras ou du lait', 'all 6 dose for 3 days, with food wey get oil or milk'),
  asaq: t('one dose a day for 3 days', 'une prise par jour pendant 3 jours', 'one dose every day for 3 days'),
  generic: t('every dose, for the full number of days prescribed', 'toutes les doses, pendant toute la durée prescrite', 'every dose, for all di days wey dem talk'),
};

const PARA_ADULT_SHORT = t('Paracetamol can ease the fever meanwhile (adults: max 4 g a day).', 'Le paracétamol peut soulager la fièvre en attendant (adultes : 4 g par jour maximum).', 'Paracetamol fit calm di hot body as you dey wait (big people: no pass 4 g for one day).');

const SEE_TODAY = t('{sign}: see a health worker today.', '{sign} : consultez un soignant aujourd’hui.', '{sign}: go see health worker today.');

const FEVER_TEST = t(
  'For fever, get a malaria test first — about 20 minutes at a pharmacy or health centre.',
  'En cas de fièvre, faites d’abord un test de paludisme (environ 20 minutes en pharmacie ou au centre de santé).',
  'For hot body, do malaria test first — e take like 20 minutes for pharmacy or health centre.',
);
const CHILD_WEIGHT = t(
  'Children’s doses depend on weight and must come from a health worker or pharmacist.',
  'La dose d’un enfant dépend de son poids : elle doit venir d’un soignant ou du pharmacien.',
  'Pikin dose depend on e weight — na health worker or pharmacist go give am.',
);
const ALREADY_PRESCRIBED = t(
  'Already prescribed? Take it exactly as written and finish the course — MediMate can remind you of every dose.',
  'Déjà prescrit ? Prenez-le exactement comme indiqué et allez jusqu’au bout : MediMate peut vous rappeler chaque dose.',
  'Doctor don already give you am? Take am exactly as e write am, finish di treatment — MediMate fit remind you every dose.',
);

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export function answer(query: string): Answer {
  const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const result = decide(query);
  const ended = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return { ...result, ms: Math.max(0.01, ended - started) };
}

/** True when a message names a medicine — used to tell a new question from a follow-up. */
export function mentionsMedicine(text: string): boolean {
  return findMedicines(new Matcher(text)).length > 0;
}

function decide(query: string): Answer {
  const m = new Matcher(query);
  const lang = detectLang(m);
  const meds = findMedicines(m);
  const { ageMonths, days } = numbers(m);
  const pop = population(m, ageMonths);

  const symptoms = (Object.keys(LX.SYMPTOMS) as LX.SymptomId[]).filter((s) => m.any(LX.SYMPTOMS[s]));
  const has = (s: LX.SymptomId) => symptoms.includes(s);
  const fever = has('fever') || has('malaria');

  const intents = new Set((Object.keys(LX.INTENTS) as LX.IntentId[]).filter((i) => m.any(LX.INTENTS[i])));
  if (intents.has('stop_early') && stopTargetsSymptom(m)) intents.delete('stop_early');
  if (intents.has('missed')) intents.delete('dose');

  const classes = (Object.keys(LX.CLASS_MENTIONS) as LX.ClassMention[]).filter((c) => m.any(LX.CLASS_MENTIONS[c]));
  const alcohol = m.any(LX.ALCOHOL);
  const dairy = m.any(LX.DAIRY);
  const food = m.any(LX.FOOD);

  // ---- danger signs ----
  const flags: LX.FlagId[] = [];
  for (const [id, list] of Object.entries(LX.FLAGS) as [LX.FlagId, ReturnType<typeof phrases>][]) {
    if (m.any(list)) flags.push(id);
  }
  if (!flags.includes('overdose') && OVERDOSE_RE.test(m.text)) flags.push('overdose');
  if (!flags.includes('confusion') && m.any(LX.SLEEPY) && (fever || pop.child || meds.some((x) => x.med.klass === 'antimalarial'))) flags.push('confusion');
  if (!flags.includes('anaphylaxis') && (SWELLING_RE.test(m.text) || SWELLING_RE2.test(m.text))) flags.push('anaphylaxis');
  const drop = (id: LX.FlagId) => flags.splice(flags.indexOf(id), 1);
  if (flags.includes('child_danger') && !pop.child) drop('child_danger');
  if (flags.includes('stiff_neck') && !(fever || has('headache') || pop.child)) drop('stiff_neck');
  if (flags.includes('dark_urine') && meds.some((x) => x.med.id === 'metronidazole') && !fever) drop('dark_urine');
  if (pop.pregnant && m.any(LX.BLEEDING_WORDS)) flags.push('pregnancy_bleeding');
  if (pop.newborn && fever) flags.push('newborn_fever');
  if (pop.pregnant && fever) flags.push('pregnancy_fever');
  if (fever && days !== undefined && days >= (pop.child ? 2 : 3) && !m.any(FEVER_RESOLVED)) flags.push('long_fever');
  if (has('cough') && days !== undefined && days >= 14) flags.push('long_cough');

  const severity = (f: LX.FlagId): LX.FlagSeverity => {
    if (f === 'dark_urine' && !fever && !meds.some((x) => x.med.klass === 'antimalarial')) return 'urgent';
    return LX.FLAG_SEVERITY[f];
  };
  const emergencyFlag = flags.find((f) => severity(f) === 'emergency');
  const urgentFlag = flags.find((f) => severity(f) === 'urgent');

  // ---- trace ----
  const uniqueMeds = [...new Map(meds.map((x) => [x.med.id, x])).values()];
  const trace: TraceStep[] = [
    { label: t('Language', 'Langue', 'Language'), value: LANG_NAME[lang], tone: 'neutral' },
    {
      label: t('Medicine', 'Médicament', 'Medicine'),
      value: uniqueMeds.length
        ? { en: uniqueMeds.map((x) => `${x.med.name}${x.via === 'typo' ? ` (from “${x.term}”)` : ''}`).join(', ') }
        : t('None named', 'Aucun', 'No medicine'),
      tone: 'neutral',
    },
    {
      label: t('Symptoms', 'Symptômes', 'Symptoms'),
      value: symptoms.length ? joinL(symptoms.map((s) => LX.SYMPTOM_LABEL[s])) : t('None mentioned', 'Aucun', 'None'),
      tone: 'neutral',
    },
    {
      label: t('Who', 'Pour qui', 'For who'),
      value: pop.newborn
        ? t('Newborn', 'Nouveau-né', 'New born baby')
        : pop.infant
          ? t('Baby', 'Bébé', 'Baby')
          : pop.child
            ? t('Child', 'Enfant', 'Pikin')
            : pop.pregnant
              ? t('Pregnant', 'Enceinte', 'Woman wey get belle')
              : t('Adult (assumed)', 'Adulte (supposé)', 'Big person (we think)'),
      tone: pop.child || pop.pregnant ? 'warn' : 'neutral',
    },
    {
      label: t('Question', 'Question', 'Question'),
      value: intents.size ? joinL([...intents].map((i) => LX.INTENT_LABEL[i])) : t('General', 'Générale', 'General'),
      tone: 'neutral',
    },
    {
      label: t('Danger signs', 'Signes de danger', 'Danger signs'),
      value: flags.length ? joinL(flags.map((f) => LX.FLAG_LABEL[f])) : t('None found', 'Aucun', 'None'),
      tone: emergencyFlag ? 'bad' : urgentFlag ? 'warn' : 'ok',
    },
  ];

  const base = { lang, langSure: langSure(m, lang), trace, meds: uniqueMeds.map((x) => x.med), points: [] as L10n[], actions: [] as Action[], sources: [] as string[] };
  const ctx: FollowCtx = {
    fever,
    symptoms,
    pop,
    days,
    dangerChecked: m.any(LX.NO_DANGER) || flags.length > 0,
    prescribed: m.any(LX.PRESCRIBED) && !m.any(LX.NOT_PRESCRIBED),
    prescribedAnswered: m.any(LX.PRESCRIBED) || m.any(LX.NOT_PRESCRIBED),
    tested: m.any(LX.TEST_POSITIVE) || m.any(LX.TEST_NEGATIVE),
  };
  const done = (a: Omit<Answer, 'lang' | 'langSure' | 'trace' | 'meds'> & { meds?: Medicine[] }, rule: L10n, tone: Tone): Answer => {
    const meds = a.meds ?? base.meds;
    return {
      ...base,
      ...a,
      meds,
      followUp: a.followUp ?? followUpFor(a.kind, ctx, meds),
      suggestions: a.suggestions ?? suggestionsFor(a.kind, meds),
      trace: [...trace, { label: t('Rule applied', 'Règle appliquée', 'Rule wey work'), value: rule, tone }],
    };
  };

  // ======================= 1. Emergencies always win =======================
  if (emergencyFlag) {
    const sign = LX.FLAG_LABEL[emergencyFlag];
    const points = [EMERGENCY_FIRST_AID[emergencyFlag]].filter(Boolean) as L10n[];
    const selfHarm = emergencyFlag === 'self_harm';
    return done(
      {
        kind: 'emergency',
        level: 'EMERGENCY',
        flag: emergencyFlag,
        title: selfHarm
          ? t('Please talk to someone now', 'Parlez à quelqu’un maintenant', 'Abeg talk to somebody now')
          : t('This could be an emergency', 'Cela peut être une urgence', 'Dis fit be emergency'),
        summary: selfHarm
          ? t(
              'What you are feeling matters, and help is available. If you are in danger or have taken anything, go to the nearest hospital now or call 119.',
              'Ce que vous ressentez compte et de l’aide existe. Si vous êtes en danger ou avez pris quelque chose, allez à l’hôpital le plus proche ou appelez le 119.',
              'Wetin you dey feel matter, and help dey. If you dey for danger or you don take something, go di nearest hospital now or call 119.',
            )
          : fill(
              t(
                '{sign}: get medical help now. Call 119 for an ambulance or go straight to the nearest hospital emergency unit. Do not wait, and do not treat this at home with medicines.',
                '{sign} : consultez immédiatement. Appelez le 119 (ambulance) ou allez directement aux urgences de l’hôpital le plus proche. N’attendez pas et ne traitez pas à la maison.',
                '{sign}: go find doctor now now. Call 119 for ambulance or go straight for emergency for di nearest hospital. No wait, no try treat am for house with medicine.',
              ),
              { sign },
            ),
        points,
        actions: [{ kind: 'emergency' }, { kind: 'facilities' }],
        sources: ['WHO IMCI danger signs', 'WHO Basic Emergency Care'],
      },
      RULE.emergency,
      'bad',
    );
  }

  // ======================= 2. Small talk =======================
  const nothingClinical = !uniqueMeds.length && !symptoms.length && !classes.length && !urgentFlag;
  if (nothingClinical && intents.has('greeting') && intents.size <= 2) {
    return done(
      {
        kind: 'greeting',
        level: 'INFO',
        title: t('Hello! How can I help?', 'Bonjour ! Comment puis-je vous aider ?', 'How far! Wetin I fit do for you?'),
        summary: t(
          'Ask about a medicine (like Coartem or amoxicillin), describe what you feel, or ask where to buy something in Buea.',
          'Posez une question sur un médicament (Coartem, amoxicilline…), décrivez vos symptômes, ou demandez où acheter à Buea.',
          'Ask me about medicine (like Coartem or amox), tell me wetin dey worry you, or ask where you fit buy something for Buea.',
        ),
        points: [],
        actions: [],
        sources: [],
      },
      RULE.chat,
      'neutral',
    );
  }
  if (nothingClinical && intents.has('thanks')) {
    return done(
      {
        kind: 'thanks',
        level: 'INFO',
        title: t('You’re welcome — stay safe!', 'Avec plaisir — prenez soin de vous !', 'No wahala — take care of yourself!'),
        summary: t('I’m here whenever you have a medicine question.', 'Je suis là dès que vous avez une question.', 'I dey here anytime you get medicine question.'),
        points: [],
        actions: [],
        sources: [],
      },
      RULE.chat,
      'neutral',
    );
  }

  // ======================= 3. Same-day referral =======================
  // With a medicine named, the medicine rules answer and the referral is added on top.
  const urgentNotes: L10n[] = urgentFlag
    ? ([fill(SEE_TODAY, { sign: LX.FLAG_LABEL[urgentFlag] }), URGENT_POINT[urgentFlag]].filter(Boolean) as L10n[])
    : [];
  const medTalk = meds.length > 0 || classes.includes('antibiotic') || classes.includes('antimalarial');
  if (urgentFlag && !medTalk) {
    const extra = URGENT_POINT[urgentFlag];
    const points = [extra, fever ? FEVER_TEST : undefined].filter(Boolean) as L10n[];
    return done(
      {
        kind: 'urgent',
        level: 'RED',
        flag: urgentFlag,
        title: t('See a health worker today', 'Consultez un soignant aujourd’hui', 'Go see health worker today'),
        summary: fill(
          t(
            '{sign} needs to be checked by a health worker today — not tomorrow. Do not start antibiotics or other medicines on your own.',
            '{sign} : à faire examiner aujourd’hui, pas demain. Ne commencez pas d’antibiotiques ou d’autres médicaments seul.',
            '{sign}: health worker must check am today — no wait tomorrow. No start antibiotic or other medicine by yourself.',
          ),
          { sign: LX.FLAG_LABEL[urgentFlag] },
        ),
        points,
        actions: [{ kind: 'facilities' }],
        sources: ['WHO IMCI', 'WHO malaria guidelines'],
      },
      RULE.urgent,
      'warn',
    );
  }

  // ======================= 4. Mixing things =======================
  const parties: { label: string; parties: Party[] }[] = [];
  for (const x of uniqueMeds) parties.push({ label: x.med.name, parties: partiesOf(x.med) });
  if (alcohol) parties.push({ label: 'alcohol', parties: ['alcohol'] });
  if (dairy) parties.push({ label: 'milk', parties: ['dairy'] });
  if (classes.includes('herbal')) parties.push({ label: 'herbs', parties: ['herb'] });
  if (classes.includes('antibiotic') && !uniqueMeds.some((x) => x.med.klass === 'antibiotic')) {
    parties.push({ label: 'antibiotics', parties: ['class:antibiotic'] });
  }
  if (food && uniqueMeds.some((x) => x.med.id === 'al')) parties.push({ label: 'food', parties: ['food'] });

  // Duplicate brands of the same molecule (Panadol + Doliprane).
  const byMed = new Map<string, Set<string>>();
  meds.forEach((x) => byMed.set(x.med.id, (byMed.get(x.med.id) ?? new Set()).add(x.term)));
  const dup = [...byMed.entries()].find(([, terms]) => terms.size > 1);
  const joinWords = /\b(and|with|plus|together|et|avec|ensemble|same time)\b/.test(m.text);
  if (dup && joinWords) {
    const med = MEDICINES.find((x) => x.id === dup[0])!;
    const names = [...dup[1]].map(cap);
    const w = DUPLICATE_WARNING(med.name.toLowerCase(), names);
    return done(
      { kind: 'interaction', level: 'RED', title: w.title, summary: w.text, points: med.howToTake ? [med.howToTake] : [], actions: [], sources: ['Product information'] },
      RULE.duplicate,
      'bad',
    );
  }

  if (parties.length >= 2) {
    let hit: ReturnType<typeof findInteraction> | undefined;
    for (let i = 0; i < parties.length && !hit; i++) {
      for (let j = i + 1; j < parties.length && !hit; j++) hit = findInteraction(parties[i].parties, parties[j].parties);
    }
    if (hit) {
      return done(
        {
          kind: 'interaction',
          level: hit.level,
          title: hit.title,
          summary: hit.text,
          points: [],
          actions: uniqueMeds[0] ? [{ kind: 'find', medId: uniqueMeds[0].med.id }] : [],
          sources: ['Product information (SmPC)', 'WHO Model Formulary'],
        },
        RULE.interaction,
        hit.level === 'RED' ? 'bad' : hit.level === 'GREEN' ? 'ok' : 'warn',
      );
    }
    const herbal = parties.some((p) => p.parties.includes('herb'));
    return done(
      {
        kind: 'interaction',
        level: 'AMBER',
        title: herbal
          ? t('Herbs can interact with medicines', 'Les plantes peuvent interagir avec les médicaments', 'Herbs fit fight with medicine')
          : t('No verified data for this combination', 'Pas de données vérifiées pour cette association', 'We no get checked info for dis mix'),
        summary: fill(
          herbal
            ? t(
                'Some herbal remedies change how medicines work. Tell your pharmacist or doctor about any herbs you take with {a}.',
                'Certaines plantes modifient l’effet des médicaments. Signalez au pharmacien toute plante prise avec {a}.',
                'Some country medicine dey change how medicine work. Tell pharmacist or doctor about any herb wey you dey take with {a}.',
              )
            : t(
                'MediMate has no verified interaction information for {a} with {b}. Ask a pharmacist before taking them together — bring both packs.',
                'MediMate n’a pas d’information vérifiée sur {a} avec {b}. Demandez au pharmacien avant de les associer — apportez les deux boîtes.',
                'MediMate no get checked info for {a} with {b}. Ask pharmacist before you mix dem — carry both pack go.',
              ),
          { a: parties[0].label, b: parties[1].label },
        ),
        points: [],
        actions: [],
        sources: ['MediMate reviewed list'],
      },
      RULE.interaction,
      'warn',
    );
  }

  // ======================= 5. A named medicine =======================
  const primary = uniqueMeds[0]?.med;
  const classMed =
    !primary && classes.includes('antimalarial') ? MEDICINES.find((x) => x.id === 'al') : undefined;

  if (primary || classes.includes('antibiotic') || classMed) {
    const med = primary ?? classMed;
    const isAbx = med ? med.klass === 'antibiotic' : true;
    const name = med ? med.name : 'Antibiotics';
    const nameL: L10n = med ? { en: med.name } : t('Antibiotics', 'Les antibiotiques', 'Antibiotic');

    // --- stopping early ---
    if (intents.has('stop_early')) {
      if (!med || med.klass === 'antibiotic') {
        return done(
          {
            kind: 'adherence',
            level: 'RED',
            title: fill(t('Don’t stop {med} early', 'N’arrêtez pas {med} trop tôt', 'No stop {med} before time'), { med: nameL }),
            summary: t(
              'Feeling better means the medicine is working — not that the infection is gone. Stopping early lets the surviving germs come back stronger and resistant. Finish every dose your prescriber gave you, unless they tell you to stop.',
              'Aller mieux signifie que le traitement agit, pas que l’infection a disparu. Arrêter tôt laisse les microbes survivants revenir plus forts et résistants. Prenez toutes les doses prescrites, sauf avis contraire du prescripteur.',
              'If you don better, e mean say medicine dey work — no be say infection don finish. If you stop early, di germs wey remain go come back strong and medicine no go fit dem again. Finish every dose wey doctor give you, unless e talk say make you stop.',
            ),
            points: [
              t('Worried about side effects? Talk to your pharmacist before stopping.', 'Des effets indésirables vous inquiètent ? Parlez-en au pharmacien avant d’arrêter.', 'Side effect dey worry you? Talk to pharmacist before you stop.'),
              t('Never keep leftover antibiotics for “next time” or share them.', 'Ne gardez jamais d’antibiotiques « pour la prochaine fois » et ne les partagez pas.', 'No keep remaining antibiotic for “next time”, no share am.'),
            ],
            actions: med ? [{ kind: 'course', medId: med.id }] : [],
            sources: ['WHO AWaRe antibiotic book'],
          },
          RULE.adherence,
          'bad',
        );
      }
      if (med.klass === 'antimalarial') {
        return done(
          {
            kind: 'adherence',
            level: 'RED',
            title: t('Fever gone? Keep going.', 'La fièvre est partie ? Continuez.', 'Hot body don go? No stop.'),
            summary: fill(
              t(
                'The fever usually drops after the first doses, but parasites are still in your blood. Stopping early lets them come back and helps resistance spread. Take {schedule} — even if you feel well.',
                'La fièvre baisse souvent après les premières prises, mais les parasites sont encore dans le sang. Arrêter tôt les laisse revenir et favorise la résistance. Prenez {schedule}, même si vous allez bien.',
                'Hot body dey usually go after di first dose dem, but parasite still dey inside blood. If you stop early, dem go come back and medicine go stop to work. Take {schedule} — even if you don well.',
              ),
              { schedule: SCHEDULE[med.id] ?? SCHEDULE.generic },
            ),
            points: [
              t('Leftover tablets are not a “next time” treatment — the next illness needs its own test.', 'Les comprimés restants ne sont pas un traitement « pour la prochaine fois » : chaque épisode demande un test.', 'Remaining tablet no be for “next time” — next sickness need e own test.'),
            ],
            actions: [{ kind: 'course', medId: med.id }],
            sources: ['WHO Guidelines for malaria', 'Product information (SmPC)'],
            chart: 'parasites',
          },
          RULE.adherence,
          'bad',
        );
      }
      if (med.klass === 'antihypertensive' || med.klass === 'anticoagulant') {
        return done(
          {
            kind: 'adherence',
            level: 'RED',
            title: fill(t('Don’t stop {med} on your own', 'N’arrêtez pas {med} seul', 'No stop {med} by yourself'), { med: nameL }),
            summary: t(
              'This is usually long-term treatment. Stopping suddenly can be dangerous, even if you feel fine. Talk to your clinician before any change.',
              'C’est en général un traitement au long cours. L’arrêter brutalement peut être dangereux, même si vous allez bien. Parlez-en à votre médecin.',
              'Dis na medicine for long time. If you stop am sudden, e fit dangerous even if you feel fine. Talk to your doctor before you change anything.',
            ),
            points: med.keyPoints.slice(0, 2),
            actions: [{ kind: 'course', medId: med.id }],
            sources: ['Product information (SmPC)'],
          },
          RULE.adherence,
          'bad',
        );
      }
      if (med.id === 'zinc') {
        return done(
          {
            kind: 'adherence',
            level: 'AMBER',
            title: t('Keep giving zinc for 10–14 days', 'Continuez le zinc 10 à 14 jours', 'Continue give zinc for 10–14 days'),
            summary: t(
              'Zinc keeps working after the diarrhoea stops: it helps the gut heal and makes the next episode less likely. Give the full 10–14 days.',
              'Le zinc agit encore après la fin de la diarrhée : il aide l’intestin à guérir et prévient la suivante. Donnez les 10 à 14 jours.',
              'Zinc still dey work after belle don stop run: e dey heal di gut so e no go come back quick. Give am complete 10–14 days.',
            ),
            points: [],
            actions: [{ kind: 'course', medId: 'zinc' }],
            sources: ['WHO/UNICEF diarrhoea guidance'],
          },
          RULE.adherence,
          'warn',
        );
      }
      return done(
        {
          kind: 'stop-ok',
          level: 'GREEN',
          title: t('Yes — you can stop when you feel better', 'Oui, vous pouvez arrêter quand vous allez mieux', 'Yes — you fit stop when you don better'),
          summary: fill(
            t(
              '{med} relieves symptoms; it is not a course you need to finish. Stop when you no longer need it — and see a health worker if the problem keeps coming back.',
              '{med} soulage les symptômes ; ce n’est pas un traitement à terminer. Arrêtez quand vous n’en avez plus besoin, et consultez si le problème revient.',
              '{med} dey only calm di sickness; e no be treatment wey you must finish. Stop when you no need am again — go see health worker if e dey come back.',
            ),
            { med: nameL },
          ),
          points: [],
          actions: [],
          sources: ['Product information (SmPC)'],
        },
        RULE.label,
        'ok',
      );
    }

    // --- missed dose ---
    if (intents.has('missed') && med) {
      const pill = med.id === 'coc';
      return done(
        {
          kind: 'missed',
          level: pill ? 'AMBER' : 'INFO',
          title: fill(t('Missed a dose of {med}?', 'Dose de {med} oubliée ?', 'You forget {med} dose?'), { med: nameL }),
          summary: pill
            ? t(
                'The advice depends on which pill you missed and when. Check the leaflet in your pack — you may need extra protection (condoms) for 7 days. A pharmacist can help you work it out.',
                'La conduite à tenir dépend de la pilule oubliée et du moment. Voyez la notice : une protection supplémentaire (préservatif) peut être nécessaire 7 jours. Le pharmacien peut vous aider.',
                'Di advice depend on which pill you forget and when. Check di paper inside di pack — you fit need extra protection (condom) for 7 days. Pharmacist fit help you.',
              )
            : t(
                'Take it as soon as you remember. If it is almost time for the next dose, skip the missed one and carry on — never take a double dose. If you are not sure, ask your pharmacist.',
                'Prenez-la dès que vous y pensez. Si la prochaine prise est proche, sautez celle oubliée et continuez — ne doublez jamais la dose. En cas de doute, demandez au pharmacien.',
                'Take am as soon as you remember. If e don near time for next dose, leave di one wey you forget and continue — no ever take double dose. If you no sure, ask pharmacist.',
              ),
          points: med.regimen ? [t('Turn on MediMate reminders so it doesn’t happen again.', 'Activez les rappels MediMate pour éviter un nouvel oubli.', 'On MediMate reminder so you no go forget again.')] : [],
          actions: med.regimen ? [{ kind: 'course', medId: med.id }] : [],
          sources: ['Product information (SmPC)'],
        },
        RULE.label,
        'neutral',
      );
    }

    // --- side effects ---
    if (intents.has('side_effects') && med) {
      return done(
        {
          kind: 'side-effects',
          level: med.risk === 'RED' ? 'AMBER' : 'INFO',
          title: fill(t('{med}: side effects', '{med} : effets indésirables', '{med}: side effect dem'), { med: nameL }),
          summary: med.sideEffects,
          points: [med.dangerSigns, t('Side effects worrying you? Ask your pharmacist before stopping.', 'Des effets vous inquiètent ? Demandez au pharmacien avant d’arrêter.', 'Side effect dey worry you? Ask pharmacist before you stop.')],
          actions: [],
          sources: ['Product information (SmPC)'],
        },
        RULE.info,
        'neutral',
      );
    }

    // --- already prescribed: route to adherence instead of refusing ---
    if (med && med.rx && ctx.prescribed && (intents.has('dose') || intents.has('can_take') || symptoms.length > 0 || pop.child)) {
      return done(
        {
          kind: 'prescribed',
          level: 'GREEN',
          title: fill(t('Prescribed {med}: take it exactly as written', '{med} prescrit : suivez exactement l’ordonnance', '{med} wey doctor give: take am exactly as e write'), { med: nameL }),
          summary: t(
            'Follow the dose on your prescription or pharmacy label exactly, at evenly spaced times, and finish the course — even when you feel better.',
            'Suivez exactement la dose de l’ordonnance ou de l’étiquette, à heures régulières, et allez jusqu’au bout du traitement, même si vous allez mieux.',
            'Follow di dose wey dey your doctor paper or pharmacy label exactly, for correct time, and finish di treatment — even when you don better.',
          ),
          points: [
            ...urgentNotes,
            ...med.keyPoints.filter((_, i) => i > 0).slice(0, 2),
            t('If anything on the label is unclear, ask the pharmacist to explain it before you leave.', 'Si quelque chose n’est pas clair, demandez au pharmacien avant de partir.', 'If anything for di label no clear, ask pharmacist make e explain before you comot.'),
          ],
          actions: [{ kind: 'course', medId: med.id }, { kind: 'verify' }, { kind: 'find', medId: med.id }],
          sources: ['WHO AWaRe antibiotic book', 'Product information (SmPC)'],
        },
        RULE.adherence,
        'ok',
      );
    }

    // --- prescription-only firewall ---
    const selfUse = intents.has('dose') || intents.has('can_take') || intents.has('find') || symptoms.length > 0 || pop.child || pop.pregnant;
    if ((!med || med.rx) && selfUse && !intents.has('what_is')) {
      const points: L10n[] = [...urgentNotes];
      if (fever && !urgentNotes.length) points.push(FEVER_TEST);
      if (has('cough') || has('cold') || has('sore_throat'))
        points.push(t('Most coughs, colds and sore throats are viral and clear up in 1–2 weeks without antibiotics.', 'La plupart des toux, rhumes et maux de gorge sont viraux et guérissent en 1–2 semaines sans antibiotique.', 'Most cough, catarrh and throat pain na virus — e dey finish for 1–2 weeks without antibiotic.'));
      if (has('diarrhea')) points.push(t('For diarrhoea, start ORS now to prevent dehydration.', 'En cas de diarrhée, commencez le SRO maintenant.', 'For runny belle, start ORS now make body no dry.'));
      if (pop.child) points.push(CHILD_WEIGHT);
      if (pop.pregnant) points.push(t('In pregnancy, some antibiotics are unsafe — a health worker must choose.', 'Pendant la grossesse, certains antibiotiques sont dangereux : le soignant doit choisir.', 'When you get belle, some antibiotic no safe — na health worker go choose.'));
      points.push(ALREADY_PRESCRIBED);
      const summary = isAbx
        ? fill(
            t(
              'MediMate won’t give a dose for {med}. Antibiotics only work on bacterial infections — not on malaria, colds, flu or most coughs and fevers. Taking them without a diagnosis can hide the real illness and breeds resistant germs.',
              'MediMate ne donne pas de dose pour {med}. Les antibiotiques n’agissent que sur les infections bactériennes — pas sur le paludisme, le rhume, la grippe ni la plupart des toux et fièvres. Sans diagnostic, ils peuvent masquer la vraie maladie et créent des microbes résistants.',
              'MediMate no go give dose for {med}. Antibiotic only dey work for bacteria infection — e no dey cure malaria, catarrh, flu or most cough and hot body. If you take am without test, e fit hide di real sickness and make germs strong pass medicine.',
            ),
            { med: nameL },
          )
        : fill(
            t(
              'MediMate won’t give a dose for {med}. It must be started and adjusted by a clinician who can examine and monitor you.',
              'MediMate ne donne pas de dose pour {med}. Il doit être débuté et ajusté par un soignant qui peut vous examiner et vous suivre.',
              'MediMate no go give dose for {med}. Na doctor wey fit check you and follow you go start am and change am.',
            ),
            { med: nameL },
          );
      return done(
        {
          kind: 'firewall',
          level: 'RED',
          title: fill(t('{med} needs a prescription', '{med} nécessite une ordonnance', '{med} need doctor paper'), { med: nameL }),
          summary,
          points,
          actions: [{ kind: 'facilities' }, ...(med?.regimen ? [{ kind: 'course' as const, medId: med.id }] : []), ...(med ? [{ kind: 'find' as const, medId: med.id }] : [])],
          sources: isAbx ? ['WHO AWaRe antibiotic book', 'Cameroon pharmacy regulations'] : ['Product information (SmPC)'],
        },
        RULE.firewall,
        'bad',
      );
    }

    if (!med) {
      // Antibiotics asked about generally ("what are antibiotics?")
      return done(
        {
          kind: 'med-info',
          level: 'RED',
          title: t('Antibiotics: prescription only', 'Antibiotiques : sur ordonnance', 'Antibiotic: na only with doctor paper'),
          summary: t(
            'Antibiotics kill bacteria. They do nothing against viruses (colds, flu, most coughs) or malaria. Misusing them makes germs resistant, so future infections become hard to treat.',
            'Les antibiotiques tuent les bactéries. Ils sont inefficaces contre les virus (rhume, grippe, la plupart des toux) et le paludisme. Mal utilisés, ils rendent les microbes résistants.',
            'Antibiotic dey kill bacteria. E no dey do anything for virus (catarrh, flu, most cough) or malaria. If people misuse am, germs go strong pass medicine.',
          ),
          points: [ALREADY_PRESCRIBED],
          actions: [{ kind: 'facilities' }],
          sources: ['WHO AWaRe antibiotic book'],
        },
        RULE.info,
        'warn',
      );
    }

    // --- malaria test result known ---
    if (med.klass === 'antimalarial' && m.any(LX.TEST_NEGATIVE)) {
      return done(
        {
          kind: 'test-negative',
          level: 'AMBER',
          title: t('Negative test: a malaria medicine won’t help', 'Test négatif : un antipaludique n’aidera pas', 'Test negative: malaria medicine no go help'),
          summary: t(
            'A negative malaria test means something else is causing the fever. Taking an antimalarial anyway wastes medicine and helps resistance spread. See a health worker to find the cause.',
            'Un test négatif signifie que la fièvre a une autre cause. Prendre quand même un antipaludique gaspille le médicament et favorise la résistance. Consultez pour trouver la cause.',
            'Negative test mean say na another thing dey cause di hot body. If you still take malaria medicine, you waste am and resistance go spread. Go see health worker make dem find di cause.',
          ),
          points: [...urgentNotes, PARA_ADULT_SHORT],
          actions: [{ kind: 'facilities' }],
          sources: ['WHO Guidelines for malaria (test before treat)'],
        },
        RULE.testFirst,
        'warn',
      );
    }
    if (med.klass === 'antimalarial' && m.any(LX.TEST_POSITIVE) && !intents.has('stop_early')) {
      return done(
        {
          kind: 'prescribed',
          level: urgentNotes.length ? 'RED' : 'GREEN',
          title: t('Malaria confirmed: treat it fully', 'Paludisme confirmé : traitez jusqu’au bout', 'Malaria don confirm: treat am complete'),
          summary: fill(
            t(
              '{med} is the right treatment. Take {schedule}. The number of tablets per dose depends on body weight — follow the pharmacist.',
              '{med} est le bon traitement. Prenez {schedule}. Le nombre de comprimés dépend du poids : suivez le pharmacien.',
              '{med} na di correct treatment. Take {schedule}. How many tablet for one dose depend on weight — follow pharmacist.',
            ),
            { med: { en: med.name }, schedule: SCHEDULE[med.id] ?? SCHEDULE.generic },
          ),
          points: [...urgentNotes, med.keyPoints[0], med.keyPoints[2] ?? med.dangerSigns, med.dangerSigns].filter((x, i, a) => x && a.indexOf(x) === i) as L10n[],
          meds: [med],
          actions: [{ kind: 'course', medId: med.id }, { kind: 'find', medId: med.id }, { kind: 'verify' }],
          sources: ['WHO Guidelines for malaria', 'Product information (SmPC)'],
          chart: 'parasites',
        },
        RULE.testFirst,
        'ok',
      );
    }

    // --- malaria treatment: test first ---
    if (med.klass === 'antimalarial' && !intents.has('find') && (intents.has('dose') || intents.has('can_take') || fever)) {
      const points: L10n[] = [...urgentNotes];
      if (intents.has('dose'))
        points.push(t('The number of tablets per dose depends on body weight — your pharmacist will tell you.', 'Le nombre de comprimés dépend du poids : votre pharmacien vous le dira.', 'How many tablet for one dose depend on weight — pharmacist go tell you.'));
      if (pop.child) points.push(t('Children with fever should be seen the same day — malaria can become severe quickly.', 'Un enfant fiévreux doit être vu le jour même : le paludisme peut vite devenir grave.', 'Pikin wey get hot body suppose see health worker di same day — malaria fit turn strong quick.'));
      if (pop.pregnant) points.push(t('In pregnancy, malaria is dangerous: see a health worker today for the right treatment.', 'Pendant la grossesse, le paludisme est dangereux : consultez aujourd’hui.', 'Malaria dangerous when you get belle: go see health worker today for correct treatment.'));
      points.push(med.dangerSigns);
      return done(
        {
          kind: 'test-first',
          level: urgentNotes.length ? 'RED' : 'AMBER',
          title: t('Test first, then treat', 'D’abord le test, ensuite le traitement', 'Do test first, then treat'),
          summary: fill(
            t(
              'Not every fever is malaria. Get a rapid malaria test (RDT) at a pharmacy or health centre — it takes about 20 minutes. If it is positive, {med} is the right treatment, and you must finish it: {schedule}.',
              'Toute fièvre n’est pas le paludisme. Faites un test rapide (TDR) en pharmacie ou au centre de santé (environ 20 minutes). S’il est positif, {med} est le bon traitement, à prendre jusqu’au bout : {schedule}.',
              'No be every hot body na malaria. Do quick malaria test (RDT) for pharmacy or health centre — e take like 20 minutes. If e positive, {med} na correct treatment, and you must finish am: {schedule}.',
            ),
            { med: { en: med.name }, schedule: SCHEDULE[med.id] ?? SCHEDULE.generic },
          ),
          points,
          meds: [med],
          actions: [{ kind: 'facilities' }, { kind: 'find', medId: med.id }, { kind: 'course', medId: med.id }],
          sources: ['WHO Guidelines for malaria (test before treat)', 'Product information (SmPC)'],
        },
        RULE.testFirst,
        'warn',
      );
    }

    // --- OTC medicines ---
    const childCaution = pop.child && ['paracetamol', 'ibuprofen', 'cetirizine', 'omeprazole', 'salbutamol'].includes(med.id);
    if (childCaution && (intents.has('dose') || intents.has('can_take') || symptoms.length)) {
      return done(
        {
          kind: 'dose',
          level: 'AMBER',
          title: fill(t('{med} for a child: get the right dose', '{med} pour un enfant : la bonne dose', '{med} for pikin: get di correct dose'), { med: nameL }),
          summary: t(
            'Children’s doses depend on weight. Ask a pharmacist to work out the right dose, and use the measuring syringe or cup — not a kitchen spoon.',
            'La dose d’un enfant dépend de son poids. Demandez au pharmacien la bonne dose et utilisez la seringue ou le gobelet doseur, pas une cuillère.',
            'Pikin dose depend on e weight. Ask pharmacist make e calculate di correct dose, and use di measuring syringe or cup — no be kitchen spoon.',
          ),
          points: [...urgentNotes, ...(fever && !urgentNotes.length ? [FEVER_TEST] : []), ...med.keyPoints.slice(0, 2)],
          actions: [{ kind: 'find', medId: med.id }],
          sources: ['Product information (SmPC)'],
        },
        RULE.child,
        'warn',
      );
    }

    if (pop.pregnant && med.pregnancy !== 'label') {
      const msg: Record<Exclude<typeof med.pregnancy, 'label'>, L10n> = {
        avoid: t('{med} is usually avoided in pregnancy. Ask a health worker or pharmacist before taking it.', '{med} est en général évité pendant la grossesse. Demandez avant de le prendre.', 'People dey usually avoid {med} when dem get belle. Ask health worker or pharmacist before you take am.'),
        'avoid-first-trimester': t('{med} should not be taken in the first 3 months of pregnancy. Ask a health worker first.', '{med} ne doit pas être pris au 1er trimestre. Demandez d’abord à un soignant.', 'No take {med} for di first 3 months of belle. Ask health worker first.'),
        ask: t('Ask a health worker or pharmacist before taking {med} in pregnancy.', 'Demandez à un soignant avant de prendre {med} pendant la grossesse.', 'Ask health worker or pharmacist before you take {med} when you get belle.'),
      };
      return done(
        {
          kind: 'med-info',
          level: med.pregnancy === 'avoid' ? 'RED' : 'AMBER',
          title: fill(t('Pregnant? Check before taking {med}', 'Enceinte ? Vérifiez avant {med}', 'You get belle? Check before you take {med}'), { med: nameL }),
          summary: fill(msg[med.pregnancy], { med: nameL }),
          points: med.id === 'ibuprofen' ? [t('Paracetamol is usually the preferred painkiller in pregnancy.', 'Le paracétamol est en général l’antidouleur préféré pendant la grossesse.', 'Paracetamol na di painkiller wey dem prefer when person get belle.')] : [],
          actions: [{ kind: 'facilities' }],
          sources: ['Product information (SmPC)'],
        },
        RULE.pregnancy,
        'warn',
      );
    }

    if (intents.has('find')) {
      return done(
        {
          kind: 'find',
          level: 'INFO',
          title: t('Let’s find it nearby', 'Trouvons-le près de vous', 'Make we find am near you'),
          summary: fill(
            t('Open Find to see which pharmacies have {med} in stock now, how far they are, and which are open.', 'Ouvrez « Trouver » pour voir quelles pharmacies ont {med} en stock, à quelle distance, et lesquelles sont ouvertes.', 'Open “Find” to see which pharmacy get {med} now, how far, and which one open.'),
            { med: nameL },
          ),
          points: [
            ...(med.klass === 'antimalarial' ? [med.keyPoints[1]] : []),
            ...(med.rx ? [t('You will need a prescription to buy it.', 'Une ordonnance sera nécessaire pour l’acheter.', 'You go need doctor paper for buy am.')] : []),
          ],
          actions: [{ kind: 'find', medId: med.id }],
          sources: ['MediMate pharmacy network (demo data)'],
        },
        RULE.route,
        'neutral',
      );
    }

    if (intents.has('verify')) {
      return done(
        {
          kind: 'verify',
          level: 'INFO',
          title: t('Check your pack', 'Vérifiez votre boîte', 'Check your medicine pack'),
          summary: t(
            'Scan the code on the pack or type the batch number. MediMate checks it against the registry and the expiry date.',
            'Scannez le code de la boîte ou saisissez le numéro de lot. MediMate le vérifie dans le registre et contrôle la date de péremption.',
            'Scan di code for di pack or type di batch number. MediMate go check am for register and check expiry date.',
          ),
          points: [],
          actions: [{ kind: 'verify' }],
          sources: ['MediMate batch registry (demo data)'],
        },
        RULE.route,
        'neutral',
      );
    }

    const wantsDose = intents.has('dose') || intents.has('can_take') || symptoms.length > 0;
    return done(
      {
        kind: wantsDose && med.howToTake ? 'dose' : 'med-info',
        level: med.risk,
        title: wantsDose && med.howToTake ? fill(t('{med}: how to take it safely', '{med} : comment le prendre', '{med}: how to take am well'), { med: nameL }) : { en: med.name },
        summary: wantsDose && med.howToTake ? med.howToTake : med.usedFor,
        points: [
          ...urgentNotes,
          ...(!(wantsDose && med.howToTake) && med.howToTake ? [med.howToTake] : []),
          ...med.keyPoints,
          ...(pop.breastfeeding && med.pregnancy !== 'label' ? [t('Breastfeeding? Ask your pharmacist first.', 'Allaitement ? Demandez d’abord au pharmacien.', 'You dey give breast? Ask pharmacist first.')] : []),
        ],
        actions: [{ kind: 'find', medId: med.id }, ...(med.regimen ? [{ kind: 'course' as const, medId: med.id }] : [])],
        sources: ['Product information (SmPC)', 'WHO Model Formulary'],
      },
      wantsDose && med.howToTake ? RULE.label : RULE.info,
      med.risk === 'GREEN' ? 'ok' : 'warn',
    );
  }

  // ======================= 6. Unknown / unreviewed medicine names =======================
  const unknown = findUnreviewed(m, meds);
  if (unknown) {
    const info = UNREVIEWED[unknown];
    return done(
      {
        kind: 'unknown-med',
        level: info?.rx ? 'RED' : 'INFO',
        title: fill(t('No verified information on “{name}”', 'Pas d’information vérifiée sur « {name} »', 'We no get checked info on “{name}”'), { name: cap(unknown) }),
        summary: t(
          'MediMate only answers from its reviewed medicine list — it never guesses. Please ask a licensed pharmacist, and bring the pack or prescription.',
          'MediMate ne répond qu’à partir de sa liste vérifiée : il ne devine jamais. Demandez à un pharmacien agréé, avec la boîte ou l’ordonnance.',
          'MediMate dey answer only from e checked medicine list — e no dey guess. Abeg ask licensed pharmacist, carry di pack or doctor paper go.',
        ),
        points: [info?.note, info?.rx ? t('This medicine needs a prescription.', 'Ce médicament nécessite une ordonnance.', 'Dis medicine need doctor paper.') : undefined].filter(Boolean) as L10n[],
        actions: [],
        sources: ['MediMate reviewed list'],
      },
      RULE.unknown,
      'warn',
    );
  }

  // ======================= 7. Symptoms without a medicine =======================
  if (symptoms.length || classes.length) {
    const s = symptomAnswer(symptoms, classes, pop);
    if (s) return done(s, RULE.symptom, s.level === 'GREEN' ? 'ok' : 'warn');
  }

  // ======================= 8. Routing =======================
  if (intents.has('find')) {
    return done(
      {
        kind: 'find',
        level: 'INFO',
        title: t('Find a pharmacy', 'Trouver une pharmacie', 'Find pharmacy'),
        summary: t('See pharmacies near you on the map, which are open now, and what they have in stock.', 'Voyez les pharmacies proches, celles ouvertes maintenant et leur stock.', 'See pharmacy wey near you for map, which one open now and wetin dem get.'),
        points: [],
        actions: [{ kind: 'find' }],
        sources: [],
      },
      RULE.route,
      'neutral',
    );
  }
  if (intents.has('verify')) {
    return done(
      {
        kind: 'verify',
        level: 'INFO',
        title: t('Check if a medicine is genuine', 'Vérifier un médicament', 'Check if medicine na original'),
        summary: t(
          'Scan the code on the pack or type the batch number. MediMate checks the registry and the expiry date.',
          'Scannez le code de la boîte ou saisissez le numéro de lot. MediMate vérifie le registre et la péremption.',
          'Scan di code for pack or type di batch number. MediMate go check register and expiry date.',
        ),
        points: [],
        actions: [{ kind: 'verify' }],
        sources: [],
      },
      RULE.route,
      'neutral',
    );
  }

  return done(
    {
      kind: 'fallback',
      level: 'INFO',
      title: t('I didn’t quite get that', 'Je n’ai pas bien compris', 'I no too understand'),
      summary: t(
        'Try naming the medicine (e.g. Coartem) or describing the problem (e.g. “hot body for 2 days”). For anything serious, talk to a pharmacist or health worker.',
        'Essayez de nommer le médicament (ex. Coartem) ou de décrire le problème (ex. « fièvre depuis 2 jours »). Pour tout ce qui est grave, voyez un pharmacien ou un soignant.',
        'Try call di medicine name (like Coartem) or tell me wetin dey worry you (like “hot body since 2 days”). If e serious, talk to pharmacist or health worker.',
      ),
      points: [],
      actions: [],
      sources: [],
    },
    RULE.chat,
    'neutral',
  );
}

// ---------------------------------------------------------------------------
// Symptom guidance
// ---------------------------------------------------------------------------

type Partial_ = Omit<Answer, 'lang' | 'langSure' | 'trace' | 'meds'> & { meds?: Medicine[] };

const PARA_ADULT = t(
  'Paracetamol can ease it meanwhile (adults: 500 mg–1 g up to every 4–6 hours, never more than 4 g a day).',
  'Le paracétamol peut soulager en attendant (adultes : 500 mg à 1 g toutes les 4 à 6 h, jamais plus de 4 g par jour).',
  'Paracetamol fit calm am small (big people: 500 mg–1 g every 4–6 hours, no pass 4 g for one day).',
);

function symptomAnswer(symptoms: LX.SymptomId[], classes: LX.ClassMention[], pop: Population): Partial_ | undefined {
  const has = (s: LX.SymptomId) => symptoms.includes(s);
  const med = (id: string) => MEDICINES.find((x) => x.id === id)!;

  if (classes.includes('injection')) {
    return {
      kind: 'symptom',
      level: 'RED',
      title: t('Injections: only from trained health workers', 'Injections : uniquement par un soignant formé', 'Injection: na only trained health worker'),
      summary: t(
        'Injections should only be given by trained health workers in a health facility, with a new sterile needle. Unsafe injections can spread infections and cause abscesses or worse.',
        'Les injections doivent être faites uniquement par un soignant formé, dans une structure de santé, avec une aiguille neuve et stérile. Les injections non sûres transmettent des infections.',
        'Na only trained health worker for hospital or health centre suppose give injection, with new clean needle. Bad injection fit spread sickness and cause abscess or worse.',
      ),
      points: [],
      actions: [{ kind: 'facilities' }],
      sources: ['WHO injection safety'],
    };
  }

  if (has('fever') || has('malaria') || classes.includes('antimalarial')) {
    const points: L10n[] = [];
    if (pop.child)
      points.push(t('For a child: see a health worker today, and ask the pharmacist for a paracetamol dose by weight.', 'Pour un enfant : consultez aujourd’hui et demandez au pharmacien la dose de paracétamol selon le poids.', 'For pikin: go see health worker today, ask pharmacist for paracetamol dose wey fit e weight.'));
    else points.push(PARA_ADULT);
    points.push(t('Drink plenty of fluids and rest.', 'Buvez beaucoup et reposez-vous.', 'Drink plenty water and rest.'));
    points.push(t('Go to hospital at once for convulsions, difficulty breathing, confusion or extreme sleepiness, being unable to drink, or dark urine.', 'Allez à l’hôpital immédiatement en cas de convulsions, difficulté à respirer, confusion ou somnolence extrême, impossibilité de boire ou urines foncées.', 'Go hospital now now if convulsion, breath dey tie, confusion or sleep too much, person no fit drink, or urine black.'));
    return {
      kind: 'symptom',
      level: 'AMBER',
      title: t('Hot body? Test before you treat', 'Fièvre ? Testez avant de traiter', 'Hot body? Do test before you treat'),
      summary: t(
        'Fever here is often malaria — but not always. Get a rapid malaria test (RDT) at a pharmacy or health centre before taking any malaria medicine. Antibiotics do not treat malaria.',
        'Ici, la fièvre est souvent le paludisme, mais pas toujours. Faites un test rapide (TDR) en pharmacie ou au centre de santé avant tout antipaludique. Les antibiotiques ne soignent pas le paludisme.',
        'For here, hot body na often malaria — but no be every time. Do quick malaria test (RDT) for pharmacy or health centre before you take any malaria medicine. Antibiotic no dey cure malaria.',
      ),
      points,
      meds: [med('paracetamol')],
      actions: [{ kind: 'facilities' }, { kind: 'find', medId: 'paracetamol' }],
      sources: ['WHO Guidelines for malaria (test before treat)', 'WHO IMCI'],
    };
  }

  if (has('diarrhea')) {
    return {
      kind: 'symptom',
      level: pop.child ? 'AMBER' : 'GREEN',
      title: t('Runny belle? Prevent dehydration first', 'Diarrhée : d’abord éviter la déshydratation', 'Runny belle? Stop body from dry first'),
      summary: t(
        'Start ORS now: small sips after every loose stool. Keep eating — and keep breastfeeding babies. Most diarrhoea stops by itself; antibiotics are rarely needed.',
        'Commencez le SRO maintenant : petites gorgées après chaque selle liquide. Continuez à manger, et à allaiter les bébés. La plupart des diarrhées guérissent seules ; les antibiotiques sont rarement utiles.',
        'Start ORS now: drink small small after every runny shit. Continue to chop — and continue give baby breast. Most runny belle dey stop by itself; people no really need antibiotic.',
      ),
      points: [
        ...(pop.child ? [t('Children: give zinc for 10–14 days alongside ORS.', 'Enfants : zinc pendant 10 à 14 jours avec le SRO.', 'Pikin: give zinc for 10–14 days with ORS.')] : []),
        t('Do not take ciprofloxacin or Flagyl without a test.', 'Pas de ciprofloxacine ni de Flagyl sans examen.', 'No take cipro or Flagyl without test.'),
        t('Go to a clinic now if there is blood in the stool, they cannot drink, have sunken eyes, are very sleepy, or pass no urine for many hours.', 'Consultez tout de suite en cas de sang dans les selles, impossibilité de boire, yeux creux, grande somnolence ou absence d’urine depuis des heures.', 'Go clinic now if blood dey inside shit, person no fit drink, eye don go inside, e dey sleep too much, or e no piss for many hours.'),
      ],
      meds: pop.child ? [med('ors'), med('zinc')] : [med('ors')],
      actions: [{ kind: 'find', medId: 'ors' }, ...(pop.child ? [{ kind: 'find' as const, medId: 'zinc' }] : [])],
      sources: ['WHO/UNICEF diarrhoea guidance'],
    };
  }

  if (has('cough') || has('cold') || has('sore_throat')) {
    return {
      kind: 'symptom',
      level: 'GREEN',
      title: t('Cough or catarrh: usually a virus', 'Toux ou rhume : souvent un virus', 'Cough or catarrh: most times na virus'),
      summary: t(
        'Most coughs, colds and sore throats are caused by viruses and get better on their own within 1–2 weeks. Antibiotics do not help them — and taking them anyway breeds resistance.',
        'La plupart des toux, rhumes et maux de gorge sont dus à des virus et guérissent seuls en 1 à 2 semaines. Les antibiotiques n’y font rien, et en prendre favorise la résistance.',
        'Most cough, catarrh and throat pain na virus — e dey finish by itself for 1–2 weeks. Antibiotic no dey help am — and if you take am, germs go strong pass medicine.',
      ),
      points: [
        t('Rest and drink warm fluids. Honey can soothe a cough (not for babies under 1).', 'Repos et boissons chaudes. Le miel peut apaiser la toux (pas avant 1 an).', 'Rest, drink warm water. Honey fit calm cough (no give baby wey never reach 1 year).'),
        pop.child ? CHILD_WEIGHT : PARA_ADULT,
        t('See a clinician for a cough lasting 2 weeks or more, coughing blood, difficulty breathing, high fever, or a child breathing fast.', 'Consultez si la toux dure 2 semaines ou plus, crachats de sang, difficulté à respirer, forte fièvre, ou enfant qui respire vite.', 'Go see doctor if cough pass 2 weeks, you cough blood, breath dey tie, strong hot body, or pikin dey breathe fast.'),
      ],
      actions: [{ kind: 'find', medId: 'paracetamol' }],
      sources: ['WHO AWaRe antibiotic book'],
    };
  }

  if (has('urinary')) {
    return {
      kind: 'symptom',
      level: 'AMBER',
      title: t('Burning when you urinate', 'Brûlures en urinant', 'Piss dey burn'),
      summary: t(
        'This is often a urine infection. The right antibiotic should be chosen by a health worker, ideally after a urine test. Drink plenty of water meanwhile.',
        'C’est souvent une infection urinaire. Le bon antibiotique doit être choisi par un soignant, idéalement après une analyse d’urine. Buvez beaucoup d’eau en attendant.',
        'Most times na urine infection. Na health worker suppose choose di correct antibiotic, better after urine test. Drink plenty water as you dey wait.',
      ),
      points: [
        t('Do not take ciprofloxacin or other antibiotics on your own.', 'Ne prenez pas de ciprofloxacine ou d’autre antibiotique seul.', 'No take cipro or any antibiotic by yourself.'),
        t('Go today if you have fever, back pain, blood in the urine, or you are pregnant.', 'Consultez aujourd’hui si fièvre, douleur au dos, sang dans les urines, ou grossesse.', 'Go today if hot body, back pain, blood inside piss, or you get belle.'),
      ],
      actions: [{ kind: 'facilities' }],
      sources: ['WHO AWaRe antibiotic book'],
    };
  }

  if (has('asthma')) {
    const s = med('salbutamol');
    return { kind: 'symptom', level: 'AMBER', title: { en: s.name }, summary: s.usedFor, points: [s.dangerSigns, ...s.keyPoints], meds: [s], actions: [{ kind: 'find', medId: s.id }], sources: ['Product information (SmPC)'] };
  }

  if (has('blood_pressure')) {
    return {
      kind: 'symptom',
      level: 'AMBER',
      title: t('Blood pressure needs a check-up', 'La tension doit être contrôlée', 'BP need check'),
      summary: t(
        'High blood pressure often has no symptoms. A clinician needs to measure it and choose treatment — blood-pressure medicines are prescription only.',
        'L’hypertension est souvent silencieuse. Un soignant doit la mesurer et choisir le traitement : les antihypertenseurs sont sur ordonnance.',
        'High BP no dey show sign most time. Health worker must measure am and choose treatment — BP medicine na only with doctor paper.',
      ),
      points: [med('amlodipine').dangerSigns],
      actions: [{ kind: 'facilities' }],
      sources: ['WHO hypertension guideline'],
    };
  }

  if (has('vomiting')) {
    return {
      kind: 'symptom',
      level: 'AMBER',
      title: t('Vomiting: small sips, often', 'Vomissements : petites gorgées, souvent', 'Vomit: drink small small, every time'),
      summary: t(
        'Give small sips of ORS or clean water every few minutes. If a medicine was vomited within an hour, ask your pharmacist whether to repeat it.',
        'Donnez de petites gorgées de SRO ou d’eau propre toutes les quelques minutes. Si un médicament a été vomi dans l’heure, demandez au pharmacien s’il faut le reprendre.',
        'Give small small ORS or clean water every few minutes. If person vomit medicine before 1 hour, ask pharmacist if e go take am again.',
      ),
      points: [t('Go to a clinic now if vomiting everything, blood in vomit, severe belly pain, very sleepy, or signs of dehydration.', 'Consultez tout de suite si vomit tout, sang dans les vomissements, forte douleur au ventre, grande somnolence ou déshydratation.', 'Go clinic now if e dey vomit everything, blood inside vomit, strong belle pain, sleep too much, or body don dry.')],
      meds: [med('ors')],
      actions: [{ kind: 'find', medId: 'ors' }],
      sources: ['WHO/UNICEF diarrhoea guidance'],
    };
  }

  if (has('heartburn')) {
    const o = med('omeprazole');
    return { kind: 'symptom', level: 'GREEN', title: t('Heartburn or acid', 'Brûlures d’estomac', 'Heartburn / acid'), summary: o.howToTake!, points: [o.dangerSigns], meds: [o], actions: [{ kind: 'find', medId: o.id }], sources: ['Product information (SmPC)'] };
  }

  if (has('stomach_pain')) {
    return {
      kind: 'symptom',
      level: 'AMBER',
      title: t('Stomach pain', 'Mal au ventre', 'Belle pain'),
      summary: t(
        'Mild stomach upset often settles with rest and fluids. For heartburn, omeprazole can help adults.',
        'Un mal de ventre léger passe souvent avec du repos et de l’eau. Pour les brûlures, l’oméprazole peut aider l’adulte.',
        'Small belle pain dey go with rest and water. For heartburn, omeprazole fit help big people.',
      ),
      points: [
        t('Severe or constant pain, a hard swollen belly, vomiting blood or black stools: go to hospital.', 'Douleur forte ou continue, ventre dur et gonflé, sang vomi ou selles noires : hôpital.', 'Strong pain wey no stop, belle hard and swell, vomit blood or black shit: go hospital.'),
        t('Pain with fever or diarrhoea: see a health worker.', 'Douleur avec fièvre ou diarrhée : consultez.', 'Pain with hot body or runny belle: go see health worker.'),
      ],
      actions: [{ kind: 'facilities' }],
      sources: ['WHO IMCI'],
    };
  }

  if (has('headache')) {
    return {
      kind: 'symptom',
      level: 'GREEN',
      title: t('Headache', 'Mal de tête', 'Head pain'),
      summary: pop.child ? CHILD_WEIGHT : PARA_ADULT,
      points: [
        t('Drink water and rest.', 'Buvez de l’eau et reposez-vous.', 'Drink water and rest.'),
        t('Emergency: a sudden “worst ever” headache, stiff neck, confusion, weakness on one side, or after a head injury.', 'Urgence : mal de tête brutal et inhabituel, nuque raide, confusion, faiblesse d’un côté, ou après un choc à la tête.', 'Emergency: sudden strong head pain wey you never feel before, stiff neck, confusion, one side of body weak, or after head wound.'),
      ],
      meds: [med('paracetamol')],
      actions: [{ kind: 'find', medId: 'paracetamol' }],
      sources: ['Product information (SmPC)'],
    };
  }

  if (has('body_pain') || has('toothache') || has('period_pain') || classes.includes('painkiller')) {
    return {
      kind: 'symptom',
      level: 'GREEN',
      title: t('Pain relief', 'Soulager la douleur', 'Calm pain'),
      summary: t(
        'For adults, paracetamol is the first choice for most pain. Ibuprofen (with food) can help pain with swelling — if it is safe for you.',
        'Chez l’adulte, le paracétamol est le premier choix pour la plupart des douleurs. L’ibuprofène (pendant le repas) aide en cas d’inflammation, s’il vous convient.',
        'For big people, paracetamol na first choice for most pain. Ibuprofen (with food) fit help pain with swelling — if e safe for you.',
      ),
      points: [
        PARA_ADULT,
        ...(has('toothache') ? [t('Toothache: see a dentist — painkillers do not treat the cause.', 'Mal de dents : voyez un dentiste, les antidouleurs ne traitent pas la cause.', 'Teeth pain: go see dentist — painkiller no dey cure di cause.')] : []),
        ...(pop.child ? [CHILD_WEIGHT] : []),
      ],
      meds: [med('paracetamol'), med('ibuprofen')],
      actions: [{ kind: 'find', medId: 'paracetamol' }],
      sources: ['WHO Model Formulary'],
    };
  }

  if (has('allergy')) {
    const c = med('cetirizine');
    return { kind: 'symptom', level: 'GREEN', title: { en: c.name }, summary: c.usedFor, points: [c.howToTake!, c.dangerSigns], meds: [c], actions: [{ kind: 'find', medId: c.id }], sources: ['Product information (SmPC)'] };
  }

  if (has('worms')) {
    const a = med('albendazole');
    return { kind: 'symptom', level: 'GREEN', title: { en: a.name }, summary: a.howToTake!, points: a.keyPoints, meds: [a], actions: [{ kind: 'find', medId: a.id }], sources: ['WHO deworming guideline'] };
  }

  if (classes.includes('herbal')) {
    return {
      kind: 'symptom',
      level: 'AMBER',
      title: t('Herbal remedies', 'Remèdes à base de plantes', 'Country medicine (herbs)'),
      summary: t(
        'Herbal remedies can be strong medicines too: some damage the liver or kidneys, and many change how other medicines work. Tell your pharmacist or doctor about anything you take.',
        'Les plantes peuvent être de vrais médicaments : certaines abîment le foie ou les reins, beaucoup modifient l’effet d’autres médicaments. Signalez-les toujours.',
        'Country medicine fit strong like medicine: some fit spoil liver or kidney, plenty dey change how other medicine work. Always tell pharmacist or doctor wetin you dey take.',
      ),
      points: [],
      actions: [],
      sources: ['WHO traditional medicine strategy'],
    };
  }

  return undefined;
}

function joinL(list: L10n[]): L10n {
  return {
    en: list.map((x) => x.en).join(', '),
    fr: list.map((x) => x.fr ?? x.en).join(', '),
    pcm: list.map((x) => x.pcm ?? x.en).join(', '),
  };
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}


// ---------------------------------------------------------------------------
// Branched chat: one clarifying question at a time, answered with a tap.
// Each option appends a canonical phrase to the conversation, and the engine re-decides.
// ---------------------------------------------------------------------------

interface FollowCtx {
  fever: boolean;
  symptoms: LX.SymptomId[];
  pop: Population;
  days?: number;
  dangerChecked: boolean;
  prescribed: boolean;
  prescribedAnswered: boolean;
  tested: boolean;
}

const Q_WHO: FollowUp = {
  id: 'who',
  question: t('Who is it for?', 'C’est pour qui ?', 'Na for who?'),
  options: [
    { label: t('Me (adult)', 'Moi (adulte)', 'Na me (big person)'), add: 'for me adult' },
    { label: t('A child', 'Un enfant', 'Pikin'), add: 'for my child' },
    { label: t('A baby under 2 months', 'Un bébé de moins de 2 mois', 'Baby wey never reach 2 months'), add: 'newborn baby', tone: 'danger' },
    { label: t('Someone pregnant', 'Une femme enceinte', 'Woman wey get belle'), add: 'pregnant' },
  ],
};

const Q_DURATION: FollowUp = {
  id: 'duration',
  question: t('How long has it lasted?', 'Depuis combien de temps ?', 'E don take how long?'),
  options: [
    { label: t('Started today', 'Depuis aujourd’hui', 'E start today'), add: 'for 1 day' },
    { label: t('2 days', '2 jours', '2 days'), add: 'for 2 days' },
    { label: t('3 days or more', '3 jours ou plus', '3 days or more'), add: 'for 3 days' },
  ],
};

const Q_DANGER: FollowUp = {
  id: 'danger',
  question: t('Any of these danger signs?', 'Un de ces signes de danger ?', 'Any of dis danger sign dey?'),
  options: [
    { label: t('Convulsions', 'Convulsions', 'Convulsion'), add: 'convulsions', tone: 'danger' },
    { label: t('Can’t drink / vomits everything', 'Ne boit pas / vomit tout', 'No fit drink / vomit everything'), add: 'cannot drink vomits everything', tone: 'danger' },
    { label: t('Very sleepy or confused', 'Très somnolent ou confus', 'Sleep too much or confuse'), add: 'very sleepy confused', tone: 'danger' },
    { label: t('Difficulty breathing', 'Difficulté à respirer', 'Breath dey tie'), add: 'difficulty breathing', tone: 'danger' },
    { label: t('None of these', 'Aucun de ces signes', 'None of dem'), add: 'no danger signs', tone: 'safe' },
  ],
};

const Q_DEHYDRATION: FollowUp = {
  id: 'dehydration',
  question: t('Any of these signs?', 'Un de ces signes ?', 'Any of dis sign dey?'),
  options: [
    { label: t('Can’t drink', 'Ne peut pas boire', 'No fit drink'), add: 'cannot drink', tone: 'danger' },
    { label: t('Sunken eyes / no urine', 'Yeux creux / pas d’urine', 'Eye don go inside / no piss'), add: 'sunken eyes no urine', tone: 'danger' },
    { label: t('Blood in stool', 'Sang dans les selles', 'Blood inside shit'), add: 'blood in stool', tone: 'danger' },
    { label: t('None of these', 'Aucun de ces signes', 'None of dem'), add: 'no danger signs', tone: 'safe' },
  ],
};

const Q_COUGH: FollowUp = {
  id: 'cough-length',
  question: t('How long have you had the cough?', 'Depuis quand toussez-vous ?', 'Di cough don take how long?'),
  options: [
    { label: t('Less than 2 weeks', 'Moins de 2 semaines', 'E never reach 2 weeks'), add: 'for 5 days' },
    { label: t('2 weeks or more', '2 semaines ou plus', '2 weeks or more'), add: 'for 3 weeks' },
  ],
};

const Q_PRESCRIBED: FollowUp = {
  id: 'prescribed',
  question: t('Did a health worker prescribe it?', 'Un soignant l’a-t-il prescrit ?', 'Health worker don write am for you?'),
  options: [
    { label: t('Yes, I have a prescription', 'Oui, j’ai une ordonnance', 'Yes, I get prescription'), add: 'prescribed by doctor', tone: 'safe' },
    { label: t('No prescription', 'Pas d’ordonnance', 'No prescription'), add: 'no prescription' },
  ],
};

const Q_TEST: FollowUp = {
  id: 'test',
  question: t('Has a test confirmed malaria?', 'Un test a-t-il confirmé le paludisme ?', 'Test don confirm say na malaria?'),
  options: [
    { label: t('Yes, test positive', 'Oui, test positif', 'Yes, test positive'), add: 'test positive', tone: 'safe' },
    { label: t('Not tested yet', 'Pas encore testé', 'I never test'), add: 'not tested yet' },
    { label: t('Test was negative', 'Test négatif', 'Test negative'), add: 'test negative' },
  ],
};

function followUpFor(kind: AnswerKind, c: FollowCtx, meds: Medicine[]): FollowUp | undefined {
  if (['emergency', 'greeting', 'thanks', 'fallback', 'unknown-med', 'interaction', 'stop-ok', 'missed', 'find', 'verify'].includes(kind)) return undefined;
  const whoKnown = c.pop.adult || c.pop.child || c.pop.pregnant;
  if (kind === 'firewall' && meds.some((m) => m.rx) && !c.prescribedAnswered) return Q_PRESCRIBED;
  if (kind === 'test-first' && !c.tested) return Q_TEST;
  if (c.fever && ['symptom', 'test-first', 'firewall', 'urgent', 'prescribed'].includes(kind)) {
    if (!whoKnown) return Q_WHO;
    if (c.days === undefined) return Q_DURATION;
    if (!c.dangerChecked) return Q_DANGER;
    return undefined;
  }
  if (kind === 'symptom' && (c.symptoms.includes('diarrhea') || c.symptoms.includes('vomiting'))) {
    if (!whoKnown) return Q_WHO;
    if (!c.dangerChecked) return Q_DEHYDRATION;
  }
  if (kind === 'symptom' && c.symptoms.includes('cough') && c.days === undefined) return Q_COUGH;
  return undefined;
}

function suggestionsFor(kind: AnswerKind, meds: Medicine[]): Answer['suggestions'] {
  const med = meds[0];
  if (!med || !['med-info', 'dose', 'prescribed', 'side-effects', 'test-first'].includes(kind)) return undefined;
  const out: NonNullable<Answer['suggestions']> = [];
  if (kind !== 'side-effects') out.push({ label: t('Side effects?', 'Effets indésirables ?', 'Side effect dem?'), query: `${med.name} side effects` });
  if (med.klass !== 'herb') out.push({ label: t('With alcohol?', 'Avec de l’alcool ?', 'With alcohol?'), query: `${med.name} with alcohol` });
  out.push({ label: t('I missed a dose', 'J’ai oublié une prise', 'I forget one dose'), query: `missed a dose of ${med.name}` });
  if (med.klass !== 'herb') out.push({ label: t('Where to buy?', 'Où l’acheter ?', 'Where to buy am?'), query: `where to buy ${med.name}` });
  return out;
}
