// Typo-tolerant medicine search: people write "amoxcilin", "flagil", "parasitamol", "ventoline".
// Ranks exact and prefix matches first, then sound-alike spellings, then small typos.

import { MEDICINES } from '../data/medicines';
import type { Medicine } from './types';
import { editDistance, normalize } from './text';

/** Rough "sounds like" key: ph→f, c/k/q→k, y→i, z→s, drop h, collapse doubled letters. */
export function soundKey(s: string): string {
  return normalize(s)
    .replace(/ph/g, 'f')
    .replace(/[cq]/g, 'k')
    .replace(/y/g, 'i')
    .replace(/z/g, 's')
    .replace(/h/g, '')
    .replace(/(.)\1+/g, '$1')
    .replace(/\s+/g, '');
}

export interface MedHit {
  med: Medicine;
  score: number;
  /** The name or brand that matched, e.g. "Panadol" when searching "panad". */
  via: string;
  fuzzy: boolean;
}

function termsOf(m: Medicine) {
  return [m.name, m.generic.replace(/\(.*?\)/g, ''), ...m.brands, ...m.aliases].filter(Boolean);
}

export function searchMedicines(query: string, list: Medicine[] = MEDICINES): MedHit[] {
  const q = normalize(query);
  if (!q) return list.map((med) => ({ med, score: 1, via: med.name, fuzzy: false }));
  const qs = soundKey(q);
  const hits: MedHit[] = [];
  for (const med of list) {
    let best: MedHit | undefined;
    for (const raw of termsOf(med)) {
      const term = normalize(raw);
      if (!term) continue;
      let score = 0;
      let fuzzy = false;
      if (term === q) score = 100;
      else if (term.startsWith(q)) score = 92 - Math.min(20, term.length - q.length);
      else if (term.split(' ').some((w) => w.startsWith(q))) score = 80;
      else if (term.includes(q) && q.length >= 3) score = 70;
      else {
        const ts = soundKey(term);
        if (qs.length >= 3 && (ts.startsWith(qs) || ts === qs)) {
          score = 66;
          fuzzy = true;
        } else if (q.length >= 4) {
          // Compare with the same-length start of the name (handles half-typed words too).
          const head = term.replace(/\s+/g, '').slice(0, Math.max(q.length, Math.min(term.length, q.length + 1)));
          const budget = q.length < 6 ? 1 : q.length < 9 ? 2 : 3;
          const d = Math.min(editDistance(q.replace(/\s+/g, ''), head), editDistance(qs, soundKey(head)));
          if (d <= budget) {
            score = 60 - d * 8;
            fuzzy = true;
          }
        }
      }
      if (score && (!best || score > best.score)) best = { med, score, via: raw.trim(), fuzzy };
    }
    if (best) hits.push(best);
  }
  return hits.sort((a, b) => b.score - a.score || a.med.name.localeCompare(b.med.name));
}

/** "Did you mean …?" — only when the best match needed typo correction. */
export function didYouMean(query: string, list: Medicine[] = MEDICINES): Medicine | undefined {
  const hits = searchMedicines(query, list);
  return hits[0]?.fuzzy && !hits.some((h) => !h.fuzzy) ? hits[0].med : undefined;
}

/** Find a medicine named anywhere in free text (e.g. text read from a box by the camera). */
export function medicineInText(text: string, list: Medicine[] = MEDICINES): Medicine | undefined {
  const words = normalize(text).split(' ').filter((w) => w.length >= 4);
  let best: MedHit | undefined;
  for (const w of words) {
    const h = searchMedicines(w, list)[0];
    if (h && h.score >= 66 && (!best || h.score > best.score)) best = h;
  }
  return best?.med;
}
