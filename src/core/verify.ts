// Pack verification. The registry below is DEMO DATA with fictional manufacturers and
// GS1 "restricted circulation" GTINs (prefix 2…) that cannot collide with real products.
// In the pilot it is replaced by partner distributor/manufacturer data, then the national registry.

import { editDistance } from './text';
import { gtinCheckDigit, parsePackCode, toGtin14, type PackCode } from './gs1';
import type { L10n } from './types';

const t = (en: string, fr: string, pcm: string): L10n => ({ en, fr, pcm });

const gtin = (body12: string) => toGtin14(body12 + gtinCheckDigit(body12));

export interface BatchRecord {
  lot: string;
  gtin: string;
  product: string;
  medId: string;
  pack: string;
  maker: string;
  expiry: Date;
  status: 'registered' | 'recalled';
}

const endOfMonth = (y: number, m: number) => new Date(y, m, 0, 23, 59);

export const PRODUCTS = {
  amox: { gtin: gtin('290000000101'), product: 'Amoxicillin 500 mg', medId: 'amoxicillin', pack: '12 capsules' },
  al: { gtin: gtin('290000000202'), product: 'Artemether/Lumefantrine 20/120 mg', medId: 'al', pack: '24 tablets' },
  pcm: { gtin: gtin('290000000303'), product: 'Paracetamol 500 mg', medId: 'paracetamol', pack: '20 tablets' },
  ors: { gtin: gtin('290000000404'), product: 'ORS (low-osmolarity)', medId: 'ors', pack: '1 L sachet' },
};

const MAKER = 'Demo Labs (fictional)';

export const REGISTRY: BatchRecord[] = [
  { lot: 'DEMO-AMX-9999', ...PRODUCTS.amox, maker: MAKER, expiry: endOfMonth(2027, 3), status: 'registered' },
  { lot: 'AL-2024-BUEA', ...PRODUCTS.al, maker: MAKER, expiry: endOfMonth(2026, 12), status: 'registered' },
  { lot: 'PCM-8841-CM', ...PRODUCTS.pcm, maker: MAKER, expiry: endOfMonth(2027, 4), status: 'registered' },
  { lot: 'MM-ORS-2601', ...PRODUCTS.ors, maker: MAKER, expiry: endOfMonth(2028, 1), status: 'registered' },
  { lot: 'MM-AMX-2201', ...PRODUCTS.amox, maker: MAKER, expiry: endOfMonth(2025, 11), status: 'registered' },
  { lot: 'MM-AL-0417', ...PRODUCTS.al, maker: MAKER, expiry: endOfMonth(2027, 6), status: 'recalled' },
];

/** Serial numbers seen far too often — a sign of a photocopied pack code (demo). */
export const CLONED_SERIALS: Record<string, number> = { 'CLN-0001': 312 };

/** Ready-made demo packs for the printable sheet and the quick-try chips. */
export const DEMO_PACKS = [
  { id: 'genuine', lot: 'DEMO-AMX-9999', product: PRODUCTS.amox, expiry: endOfMonth(2027, 3), serial: 'S-48210', label: t('Registered pack', 'Boîte enregistrée', 'Registered pack') },
  { id: 'expiring', lot: 'AL-2024-BUEA', product: PRODUCTS.al, expiry: endOfMonth(2026, 12), serial: 'S-11907', label: t('Expires soon', 'Expire bientôt', 'E go soon expire') },
  { id: 'expired', lot: 'MM-AMX-2201', product: PRODUCTS.amox, expiry: endOfMonth(2025, 11), serial: 'S-30455', label: t('Expired pack', 'Boîte périmée', 'Expired pack') },
  { id: 'recalled', lot: 'MM-AL-0417', product: PRODUCTS.al, expiry: endOfMonth(2027, 6), serial: 'S-77120', label: t('Falsified-batch alert', 'Alerte lot falsifié', 'Fake batch alert') },
  { id: 'cloned', lot: 'DEMO-AMX-9999', product: PRODUCTS.amox, expiry: endOfMonth(2027, 3), serial: 'CLN-0001', label: t('Copied pack code', 'Code de boîte copié', 'Copied pack code') },
  { id: 'unknown', lot: 'XK-55-ROAD', product: PRODUCTS.pcm, expiry: endOfMonth(2027, 9), serial: 'S-00031', label: t('Unknown batch', 'Lot inconnu', 'Batch wey we no know') },
] as const;

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'unknown';
export interface Check {
  id: 'registry' | 'expiry' | 'match' | 'serial';
  status: CheckStatus;
  title: L10n;
  detail: L10n;
}

export type Verdict = 'registered' | 'caution' | 'danger' | 'unknown';

export interface VerifyResult {
  verdict: Verdict;
  code: PackCode;
  record?: BatchRecord;
  checks: Check[];
  headline: L10n;
  summary: L10n;
  suggestion?: string;
  expiry?: Date;
}

const normLot = (s: string) => s.toUpperCase().replace(/[\s_]+/g, '').replace(/[–—]/g, '-');

/** OCR commonly confuses these characters on small print. */
const OCR_SWAPS: [RegExp, string][] = [
  [/O/g, '0'],
  [/0/g, 'O'],
  [/I/g, '1'],
  [/1/g, 'I'],
  [/S/g, '5'],
  [/5/g, 'S'],
  [/B/g, '8'],
  [/8/g, 'B'],
];

export function findBatch(lotRaw: string): { record?: BatchRecord; suggestion?: string } {
  const lot = normLot(lotRaw);
  const exact = REGISTRY.find((r) => normLot(r.lot) === lot);
  if (exact) return { record: exact };
  for (const [re, to] of OCR_SWAPS) {
    const alt = lot.replace(re, to);
    const hit = REGISTRY.find((r) => normLot(r.lot) === alt);
    if (hit) return { suggestion: hit.lot };
  }
  const near = REGISTRY.map((r) => ({ r, d: editDistance(lot, normLot(r.lot)) })).sort((a, b) => a.d - b.d)[0];
  return near && near.d <= 2 ? { suggestion: near.r.lot } : {};
}

const fmtDate = (d: Date, lang: 'en' | 'fr' | 'pcm' = 'en') =>
  d.toLocaleDateString(lang === 'fr' ? 'fr-CM' : 'en-GB', { month: 'short', year: 'numeric' });

export function verifyPack(input: string | PackCode, now = new Date()): VerifyResult {
  const code = typeof input === 'string' ? parsePackCode(input) : input;
  const checks: Check[] = [];
  const { record, suggestion } = code.lot ? findBatch(code.lot) : {};
  const expiry = code.expiry ?? record?.expiry;

  // 1. Registry
  if (record?.status === 'recalled') {
    checks.push({
      id: 'registry',
      status: 'fail',
      title: t('Fake boxes with this code were reported', 'Des faux avec ce code ont été signalés', 'People don report fake box wey get dis code'),
      detail: t(
        'Falsified packs carrying this batch number were reported (demo alert). Genuine stock from this batch was withdrawn.',
        'Des boîtes falsifiées portant ce numéro de lot ont été signalées (alerte démo). Le stock authentique a été retiré.',
        'People don report fake pack wey carry dis batch number (demo alert). Dem don remove di original ones.',
      ),
    });
  } else if (record) {
    checks.push({
      id: 'registry',
      status: 'pass',
      title: t('Matches the maker’s records', 'Conforme aux registres du fabricant', 'E match di maker record'),
      detail: { en: `${record.product} · ${record.pack} · ${record.maker}` },
    });
  } else {
    checks.push({
      id: 'registry',
      status: 'unknown',
      title: t('Not in our records', 'Absent de nos registres', 'E no dey our record'),
      detail: t(
        'We don’t have this box in our (demo) records yet. That does not prove the medicine is fake.',
        'Ce numéro de lot n’est pas dans le registre démo de MediMate. Cela ne prouve pas que le médicament est faux.',
        'Dis batch number no dey MediMate demo register. Dat one no mean say di medicine na fake.',
      ),
    });
  }

  // 2. Expiry
  if (expiry) {
    const daysLeft = Math.floor((expiry.getTime() - now.getTime()) / 86400000);
    if (daysLeft < 0) {
      checks.push({
        id: 'expiry',
        status: 'fail',
        title: t('Expired', 'Périmé', 'E don expire'),
        detail: { en: `Expired ${fmtDate(expiry)} — do not use it.`, fr: `Périmé depuis ${fmtDate(expiry, 'fr')} — ne pas l’utiliser.`, pcm: `E don expire since ${fmtDate(expiry)} — no use am.` },
      });
    } else if (daysLeft < 60) {
      checks.push({
        id: 'expiry',
        status: 'warn',
        title: t('Expires soon', 'Expire bientôt', 'E go soon expire'),
        detail: { en: `Use before ${fmtDate(expiry)} — make sure you can finish the course in time.`, fr: `À utiliser avant ${fmtDate(expiry, 'fr')} : assurez-vous de finir le traitement avant.`, pcm: `Use am before ${fmtDate(expiry)} — make sure say you go finish di treatment before.` },
      });
    } else {
      checks.push({
        id: 'expiry',
        status: 'pass',
        title: t('Not expired', 'Non périmé', 'E never expire'),
        detail: { en: `Expires ${fmtDate(expiry)}.`, fr: `Expire en ${fmtDate(expiry, 'fr')}.`, pcm: `E go expire ${fmtDate(expiry)}.` },
      });
    }
  } else {
    checks.push({
      id: 'expiry',
      status: 'unknown',
      title: t('Expiry date not found', 'Date de péremption introuvable', 'We no see expiry date'),
      detail: t('Check the EXP date printed on the pack yourself.', 'Vérifiez vous-même la date EXP imprimée sur la boîte.', 'Check di EXP date wey dem print for di pack by yourself.'),
    });
  }

  // 3. Barcode ↔ batch consistency (a copied batch number on the wrong product is a classic fake)
  if (record && code.gtin) {
    const same = toGtin14(code.gtin) === record.gtin;
    checks.push({
      id: 'match',
      status: same ? 'pass' : 'fail',
      title: same ? t('Box details match', 'Les infos de la boîte concordent', 'Box details match') : t('Box details don’t match', 'Les infos de la boîte ne concordent pas', 'Box details no match'),
      detail: same
        ? t('The product code and batch belong together.', 'Le code produit et le lot vont ensemble.', 'Di product code and di batch dey together.')
        : t(
            'This batch belongs to a different product. A real batch number printed on the wrong pack is a common sign of a fake.',
            'Ce lot appartient à un autre produit. Un vrai numéro de lot imprimé sur la mauvaise boîte est un signe fréquent de contrefaçon.',
            'Dis batch na for another product. Real batch number wey dem print for wrong pack na common sign of fake.',
          ),
    });
  }

  // 4. Serial reuse
  if (code.serial) {
    const seen = CLONED_SERIALS[code.serial];
    checks.push({
      id: 'serial',
      status: seen ? 'fail' : 'pass',
      title: seen ? t('Same code found on many boxes', 'Même code sur beaucoup de boîtes', 'Di same code dey for plenty box') : t('This box has its own code', 'Cette boîte a son propre code', 'Dis box get e own code'),
      detail: seen
        ? {
            en: `This exact pack code has been checked ${seen} times in different places. Genuine packs have unique codes — this may be a photocopied pack.`,
            fr: `Ce code exact a été vérifié ${seen} fois à différents endroits. Les vraies boîtes ont un code unique : il peut s’agir d’une copie.`,
            pcm: `Dis same pack code don check ${seen} times for different places. Real pack get e own code — dis one fit be photocopy pack.`,
          }
        : t('First time this pack code has been checked.', 'Première vérification de ce code.', 'Na di first time wey person check dis pack code.'),
    });
  }

  const fails = checks.filter((c) => c.status === 'fail');
  const verdict: Verdict = fails.length ? 'danger' : !record ? 'unknown' : checks.some((c) => c.status === 'warn') ? 'caution' : 'registered';

  const headline: Record<Verdict, L10n> = {
    registered: t('Registered batch', 'Lot enregistré', 'Registered batch'),
    caution: t('Registered — check the date', 'Enregistré — vérifiez la date', 'Registered — check di date'),
    danger: t('Do not use this medicine', 'N’utilisez pas ce médicament', 'No use dis medicine'),
    unknown: t('Not verified', 'Non vérifié', 'We never confirm am'),
  };
  const summary: Record<Verdict, L10n> = {
    registered: t(
      'This batch is in the MediMate demo registry and passed every check. Still look at the pack: seal intact, spelling correct, price normal.',
      'Ce lot figure dans le registre démo de MediMate et passe tous les contrôles. Regardez quand même la boîte : opercule intact, orthographe correcte, prix normal.',
      'Dis batch dey MediMate demo register and e pass every check. But still look di pack: seal no open, spelling correct, price normal.',
    ),
    caution: t('This batch is registered, but read the warning below before you use it.', 'Ce lot est enregistré, mais lisez l’avertissement ci-dessous.', 'Dis batch dey register, but read di warning for down before you use am.'),
    danger: t(
      'One or more checks failed. Do not take it. Keep the pack, return it to the seller or a licensed pharmacy, and report it.',
      'Un ou plusieurs contrôles ont échoué. Ne le prenez pas. Gardez la boîte, rapportez-la au vendeur ou à une pharmacie agréée, et signalez-la.',
      'Some check no pass. No take am. Keep di pack, carry am go back to di seller or licensed pharmacy, and report am.',
    ),
    unknown: t(
      'We could not confirm this batch. Do not take it until a licensed pharmacist has checked the pack.',
      'Nous n’avons pas pu confirmer ce lot. Ne le prenez pas avant qu’un pharmacien agréé ait vérifié la boîte.',
      'We no fit confirm dis batch. No take am until licensed pharmacist don check di pack.',
    ),
  };

  return { verdict, code, record, checks, headline: headline[verdict], summary: summary[verdict], suggestion, expiry };
}
