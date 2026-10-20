import { useSyncExternalStore } from 'react';

// Minimal path router. Vercel rewrites every path to index.html, and the service worker
// serves the app shell offline, so deep links like /verify or /01/<gtin>/10/<lot> work.

const EVENT = 'medimate:navigate';

function subscribe(cb: () => void) {
  window.addEventListener('popstate', cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener('popstate', cb);
    window.removeEventListener(EVENT, cb);
  };
}

const snapshot = () => window.location.pathname + window.location.search;

export function useLocation() {
  const loc = useSyncExternalStore(subscribe, snapshot, () => '/');
  const [path, search = ''] = loc.split('?');
  return { path, query: new URLSearchParams(search) };
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  if (to === snapshot()) return;
  if (opts.replace) window.history.replaceState(null, '', to);
  else window.history.pushState(null, '', to);
  window.dispatchEvent(new Event(EVENT));
}

export type Tab = 'home' | 'ask' | 'find' | 'verify' | 'course';

export function tabOf(path: string): Tab | undefined {
  if (path === '/' || path === '') return 'home';
  const seg = path.split('/')[1];
  if (seg === '01') return 'verify'; // GS1 Digital Link opens the verify screen
  return (['ask', 'find', 'verify', 'course'] as Tab[]).find((t) => t === seg);
}
