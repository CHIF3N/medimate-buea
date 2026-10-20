import type { Answer } from '../core/engine';

// Broadcasts every decision so the desktop showcase can render a live "engine console".
export interface EngineEvent {
  query: string;
  answer: Answer;
  at: number;
}

const listeners = new Set<(e: EngineEvent) => void>();
let last: EngineEvent | undefined;

export function emitDecision(e: EngineEvent) {
  last = e;
  listeners.forEach((l) => l(e));
}

export function onDecision(l: (e: EngineEvent) => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export const lastDecision = () => last;
