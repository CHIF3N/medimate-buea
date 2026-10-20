// Minimal request/response shapes for Vercel Node.js functions (avoids an extra dependency).
export interface Req {
  method?: string;
  query: Record<string, string | string[] | undefined>;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
}

export interface Res {
  status(code: number): Res;
  json(body: unknown): void;
  send(body: string): void;
  setHeader(name: string, value: string): void;
}

export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
