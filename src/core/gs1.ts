// GS1 parsing for medicine packs: GS1 DataMatrix element strings, human-readable "(01)…(17)…(10)…",
// and GS1 Digital Link URLs (https://any-domain/01/<GTIN>/10/<LOT>?17=<YYMMDD>).

export interface PackCode {
  gtin?: string;
  lot?: string;
  expiry?: Date;
  serial?: string;
  format: 'digital-link' | 'element-string' | 'text';
  raw: string;
}

const GS = '\u001d';

/** Fixed-length GS1 application identifiers we care about. */
const FIXED: Record<string, number> = { '01': 14, '11': 6, '15': 6, '17': 6 };
const VARIABLE = new Set(['10', '21']);

export function gtinCheckDigit(body: string): number {
  // body = GTIN without its check digit
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const n = parseInt(body[body.length - 1 - i], 10);
    sum += i % 2 === 0 ? n * 3 : n;
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidGtin(gtin: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(gtin)) return false;
  return gtinCheckDigit(gtin.slice(0, -1)) === parseInt(gtin.slice(-1), 10);
}

export const toGtin14 = (g: string) => g.padStart(14, '0');

/** YYMMDD → Date. DD = 00 means the last day of that month (GS1 rule). */
export function parseYYMMDD(s: string): Date | undefined {
  if (!/^\d{6}$/.test(s)) return undefined;
  const y = 2000 + parseInt(s.slice(0, 2), 10);
  const m = parseInt(s.slice(2, 4), 10);
  const d = parseInt(s.slice(4, 6), 10);
  if (m < 1 || m > 12) return undefined;
  return d === 0 ? new Date(y, m, 0, 23, 59) : new Date(y, m - 1, d, 23, 59);
}

export function toYYMMDD(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getFullYear() % 100)}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

function parseElementString(raw: string): PackCode | undefined {
  let s = raw.replace(/^\]d2|^\]Q3|^\]C1/, '');
  const out: PackCode = { format: 'element-string', raw };
  // Human-readable form with parentheses.
  if (s.includes('(')) {
    const re = /\((\d{2})\)([^(]+)/g;
    let m: RegExpExecArray | null;
    let any = false;
    while ((m = re.exec(s))) {
      any = true;
      assign(out, m[1], m[2].trim());
    }
    return any ? out : undefined;
  }
  // Raw element string with GS separators.
  if (!/^\d{2}/.test(s)) return undefined;
  let any = false;
  while (s.length >= 2) {
    const ai = s.slice(0, 2);
    s = s.slice(2);
    if (FIXED[ai]) {
      assign(out, ai, s.slice(0, FIXED[ai]));
      s = s.slice(FIXED[ai]);
    } else if (VARIABLE.has(ai)) {
      const end = s.indexOf(GS);
      assign(out, ai, end < 0 ? s : s.slice(0, end));
      s = end < 0 ? '' : s.slice(end + 1);
    } else return any ? out : undefined;
    any = true;
    if (s.startsWith(GS)) s = s.slice(1);
  }
  return any ? out : undefined;
}

function assign(out: PackCode, ai: string, value: string) {
  if (ai === '01') out.gtin = value;
  else if (ai === '10') out.lot = value.toUpperCase();
  else if (ai === '17') out.expiry = parseYYMMDD(value);
  else if (ai === '21') out.serial = value;
}

function parseDigitalLink(raw: string): PackCode | undefined {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const i = parts.indexOf('01');
  if (i < 0 || !/^\d{8,14}$/.test(parts[i + 1] ?? '')) return undefined;
  const out: PackCode = { format: 'digital-link', raw, gtin: toGtin14(parts[i + 1]) };
  for (let k = i + 2; k < parts.length - 1; k += 2) assign(out, parts[k], parts[k + 1]);
  const exp = url.searchParams.get('17');
  if (exp) out.expiry = parseYYMMDD(exp);
  return out;
}

/** Parse anything a scanner or the camera OCR returns. */
export function parsePackCode(raw: string): PackCode {
  const text = raw.trim();
  return (
    parseDigitalLink(text) ??
    parseElementString(text) ?? {
      format: 'text',
      raw: text,
      lot: text.toUpperCase().replace(/\s+/g, ''),
    }
  );
}

/** Build a GS1 Digital Link on our own domain, so a phone camera opens MediMate directly. */
export function digitalLink(origin: string, gtin: string, lot: string, expiry: Date, serial?: string): string {
  const base = `${origin.replace(/\/$/, '')}/01/${toGtin14(gtin)}/10/${encodeURIComponent(lot)}`;
  return `${base}${serial ? `/21/${encodeURIComponent(serial)}` : ''}?17=${toYYMMDD(expiry)}`;
}

/** Pull a batch/lot number and expiry date out of OCR text from a printed pack. */
export function extractFromLabel(text: string): { lot?: string; expiry?: Date } {
  const t = text.toUpperCase().replace(/[|]/g, 'I');
  const lotM = t.match(/(?:LOT|BATCH|B\.?\s?NO|BN|CH\.?-?B|N[°O]\s?(?:DE\s)?LOT)\s*[:.#\-]?\s*([A-Z0-9][A-Z0-9\-/]{2,20})/);
  const expM =
    t.match(/(?:EXP(?:IRY)?|EXP\.?\s?DATE|USE BY|PER(?:EMPTION)?|VAL)\s*[:.\-]?\s*(\d{1,2})\s*[/\-.]\s*(\d{2,4})/) ??
    t.match(/(?:EXP(?:IRY)?|PER)\s*[:.\-]?\s*(\d{4})\s*[/\-.]\s*(\d{1,2})/);
  let expiry: Date | undefined;
  if (expM) {
    let mm = parseInt(expM[1], 10);
    let yy = parseInt(expM[2], 10);
    if (mm > 12 && yy <= 12) [mm, yy] = [yy, mm]; // YYYY/MM order
    if (yy < 100) yy += 2000;
    if (mm >= 1 && mm <= 12) expiry = new Date(yy, mm, 0, 23, 59); // end of month
  }
  return { lot: lotM?.[1], expiry };
}
