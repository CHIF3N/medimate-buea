// Tiny persisted store. Everything a patient enters stays on this device (localStorage).
// No account, no server: the pilot adds a backend only for pharmacy stock and reports.

import { useSyncExternalStore } from 'react';
import type { Course } from '../core/course';
import type { CarePlan } from '../core/care';
import type { Lang, StockLevel } from '../core/types';
import type { Verdict } from '../core/verify';

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  /** What the user sees (user turns) — assistant turns are re-computed from `ctx`. */
  text: string;
  /** Engine input: for user turns their phrase, for assistant turns the whole thread so far. */
  ctx: string;
  thread: string;
  at: number;
}

export interface Report {
  id: string;
  at: number;
  lot?: string;
  product?: string;
  where: string;
  area: string;
  note: string;
}

export interface Reservation {
  id: string;
  code: string;
  pharmacyId: string;
  medId: string;
  qty: number;
  amount: number;
  at: number;
  expiresAt: number;
  mode: 'demo' | 'live';
  transId?: string;
}

export interface CheckLog {
  at: number;
  lot?: string;
  product?: string;
  verdict: Verdict;
}

export interface State {
  lang: Lang | null;
  theme: 'system' | 'light' | 'dark';
  courses: Course[];
  /** Pharmacy portal sandbox edits: pharmacyId → medId → level. */
  stock: Record<string, { levels: Record<string, StockLevel>; at: number; closed?: boolean }>;
  reports: Report[];
  checks: CheckLog[];
  chat: ChatTurn[];
  confirms: Record<string, 'yes' | 'no'>;
  watch: string[];
  searches: Record<string, number>;
  notify: boolean;
  portal: boolean;
  installDismissed: boolean;
  speechRate: number;
  reservations: Reservation[];
  plan: 'free' | 'pro';
  care: CarePlan | null;
  familyPlan: boolean;
}

const KEY = 'medimate.v2';

const DEFAULTS: State = {
  lang: null,
  theme: 'light',
  courses: [],
  stock: {},
  reports: [],
  checks: [],
  chat: [],
  confirms: {},
  watch: [],
  searches: {},
  notify: false,
  portal: false,
  installDismissed: false,
  speechRate: 0.95,
  reservations: [],
  plan: 'free',
  care: null,
  familyPlan: false,
};

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<State>) };
  } catch {
    return DEFAULTS;
  }
}

let state: State = load();
const listeners = new Set<() => void>();
let saveTimer: number | undefined;

function persist() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked — the app keeps working in memory */
    }
  }, 120);
}

export function getState(): State {
  return state;
}

export function setState(update: Partial<State> | ((s: State) => Partial<State>)) {
  const patch = typeof update === 'function' ? update(state) : update;
  state = { ...state, ...patch };
  persist();
  listeners.forEach((l) => l());
}

export function resetDemo() {
  const keep = { lang: state.lang, theme: state.theme };
  state = { ...DEFAULTS, ...keep };
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state), () => select(state));
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
