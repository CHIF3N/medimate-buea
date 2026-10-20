// Text normalisation and matching shared by the answer engine, search and USSD.
// Everything is compared in a normalised form: lowercase, no accents, no punctuation.

const FR_ELISION = /\b(qu|[cdjlmnst])['’`](?=[a-zà-ÿ])/g;
const EN_CONTRACTION = /([a-z])['’`](t|s|re|ve|ll|d|m)\b/g;

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(FR_ELISION, '$1 ')
    .replace(EN_CONTRACTION, '$1$2')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface Phrase {
  raw: string;
  norm: string;
  prefix: boolean;
}

/** Pre-normalise a phrase list. A trailing `*` matches any word starting with the phrase. */
export function phrases(list: string[]): Phrase[] {
  return list.map((raw) => {
    const prefix = raw.endsWith('*');
    return { raw, norm: normalize(prefix ? raw.slice(0, -1) : raw), prefix };
  });
}

export class Matcher {
  readonly text: string;
  readonly tokens: string[];
  private padded: string;

  constructor(input: string) {
    this.text = normalize(input);
    this.tokens = this.text ? this.text.split(' ') : [];
    this.padded = ` ${this.text} `;
  }

  has(p: Phrase): boolean {
    if (!p.norm) return false;
    if (!p.prefix) return this.padded.includes(` ${p.norm} `);
    let from = 0;
    while (true) {
      const i = this.padded.indexOf(` ${p.norm}`, from);
      if (i < 0) return false;
      const after = this.padded[i + p.norm.length + 1];
      if (after === ' ' || /[a-z0-9]/.test(after)) return true;
      from = i + 1;
    }
  }

  /** Returns the first phrase from the list that matches, or undefined. */
  first(list: Phrase[]): Phrase | undefined {
    return list.find((p) => this.has(p));
  }

  any(list: Phrase[]): boolean {
    return list.some((p) => this.has(p));
  }

  /** Position of a phrase in the normalised text (for ordering mentions). */
  indexOf(p: Phrase): number {
    const i = this.padded.indexOf(` ${p.norm}`);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  }
}

/** Optimal string alignment distance (Damerau–Levenshtein without substring moves). */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const al = a.length;
  const bl = b.length;
  if (!al) return bl;
  if (!bl) return al;
  const d: number[][] = Array.from({ length: al + 1 }, (_, i) => {
    const row = new Array<number>(bl + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= bl; j++) d[0][j] = j;
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[al][bl];
}

/** How many typos we tolerate for a word of this length. Short words must match exactly. */
export function typoBudget(length: number): number {
  if (length < 5) return 0;
  if (length < 8) return 1;
  if (length < 11) return 2;
  return 3;
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, sept: 7, huit: 8, neuf: 9, dix: 10,
  tu: 2, tri: 3, foh: 4, fai: 5,
};

export function toNumber(token: string): number | undefined {
  if (/^\d+$/.test(token)) return parseInt(token, 10);
  return NUMBER_WORDS[token];
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
