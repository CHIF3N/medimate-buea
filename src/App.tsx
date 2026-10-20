import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, CloudOff, Home, MapPin, MessageCircle, MessageCircleQuestion, Pill, ScanLine, Settings2, Siren, Terminal, type LucideIcon } from 'lucide-react';
import { navigate, tabOf, useLocation, type Tab } from './lib/router';
import { useStore } from './state/store';
import { C, LANG_LABEL, t, useLang } from './i18n';
import { useMedia, useNow, useOnline } from './lib/hooks';
import { useDoseReminders } from './lib/reminders';
import { doseState, type Course } from './core/course';
import { AppCtx } from './ui/app-context';
import { OverlayProvider, ToastProvider } from './ui/overlay';
import { cx, haptic, IconButton, Spinner } from './ui/primitives';
import { LogoMark } from './ui/Logo';
import { QR } from './lib/qr';
import HomeScreen from './screens/Home';
import AskScreen from './screens/Ask';
import CourseScreen from './screens/Course';
import PortalScreen from './screens/Portal';
import AboutScreen, { WhyScreen } from './screens/About';
import { onDecision, type EngineEvent } from './lib/engine-bus';
import { pick } from './core/types';
import Onboarding from './screens/Onboarding';
import EmergencySheet from './screens/EmergencySheet';
import SettingsSheet from './screens/SettingsSheet';
import UssdSheet from './screens/UssdPhone';

const FindScreen = lazy(() => import('./screens/Find'));
const VerifyScreen = lazy(() => import('./screens/Verify'));
const PacksPage = lazy(() => import('./screens/Packs'));

export default function App() {
  const { path } = useLocation();
  const theme = useStore((s) => s.theme);
  const lang = useStore((s) => s.lang);
  const systemDark = useMedia('(prefers-color-scheme: dark)');

  useEffect(() => {
    const dark = theme === 'dark' || (theme === 'system' && systemDark);
    document.documentElement.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b0c10' : '#f8f7ff');
  }, [theme, systemDark]);

  useEffect(() => {
    document.documentElement.lang = lang === 'fr' ? 'fr' : 'en';
  }, [lang]);

  if (path === '/packs') {
    return (
      <Suspense fallback={<Loading />}>
        <PacksPage />
      </Suspense>
    );
  }
  return (
    <Showcase>
      <PhoneApp />
    </Showcase>
  );
}

// ---------------------------------------------------------------------------
// Desktop showcase: phone frame + live QR. On phones, the app simply fills the screen.
// ---------------------------------------------------------------------------

const SHOW = {
  kicker: t('Live prototype · Buea, Cameroon', 'Prototype en ligne · Buea, Cameroun', 'Live prototype · Buea, Cameroon'),
  title1: t('Safe medicine,', 'Le bon médicament,', 'Correct medicine,'),
  title2: t('from purchase to the last dose.', 'de l’achat à la dernière dose.', 'from buying reach last dose.'),
  body: t(
    'An offline-first medicine companion. Ask in English, French or Pidgin, find medicine in stock, check that a pack is genuine, and finish every course.',
    'Un compagnon du médicament qui marche hors ligne. Posez vos questions en anglais, français ou pidgin, trouvez un médicament en stock, vérifiez une boîte et terminez chaque traitement.',
    'Medicine companion wey dey work without network. Ask for English, French or Pidgin, find medicine wey dey, check if pack na original, and finish every treatment.',
  ),
  scan: t('Scan to open it on your phone', 'Scannez pour l’ouvrir sur votre téléphone', 'Scan am make e open for your phone'),
  tryLabel: t('Click a question — watch the phone answer', 'Cliquez une question — le téléphone répond', 'Click one question — see how phone go answer'),
  team: t('Team Medimates · She Innovates Hackathon 2026', 'Équipe Medimates · She Innovates Hackathon 2026', 'Team Medimates · She Innovates Hackathon 2026'),
  why: t('Why this matters, in numbers', 'Pourquoi c’est important, en chiffres', 'Why e matter, for numbers'),
};

const DEMO_QUESTIONS = [
  'My pikin get hot body since two days, I fit give am Amox?',
  'Fever don cool, I fit stop di Coartem?',
  'Can I drink beer with Flagyl?',
  'Mon enfant a de la diarrhée, que faire ?',
];

function Showcase({ children }: { children: ReactNode }) {
  const wide = useMedia('(min-width: 1080px)');
  const { L } = useLang();
  const url = typeof window !== 'undefined' ? window.location.origin : '';
  if (!wide) return <div className="relative h-[100dvh] w-full overflow-hidden bg-bg">{children}</div>;
  return (
    <div className="relative grid h-[100dvh] grid-cols-[minmax(0,1fr)_auto] items-center gap-14 overflow-hidden bg-bg-deep px-14 xl:gap-20 xl:px-20 2xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,380px)] 2xl:gap-14">
      <div className="pointer-events-none absolute -left-40 -top-40 size-[620px] rounded-full bg-brand-400/25 blur-[120px] dark:bg-brand-600/20" />
      <div className="pointer-events-none absolute -bottom-52 right-10 size-[520px] rounded-full bg-brand-300/20 blur-[120px] dark:bg-brand-800/25" />
      <aside className="no-scrollbar relative z-10 max-h-[100dvh] max-w-[560px] overflow-y-auto py-8">
        <div className="flex items-center gap-3">
          <LogoMark size={44} />
          <span className="display text-[30px] text-ink">MediMate</span>
        </div>
        <p className="eyebrow mt-[4vh]">{L(SHOW.kicker)}</p>
        <h1 className="display mt-3 text-[clamp(42px,6.6vh,76px)] text-ink">
          {L(SHOW.title1)}
          <br />
          <em className="text-brand-600 dark:text-brand-300">{L(SHOW.title2)}</em>
        </h1>
        <p className="mt-[2.6vh] max-w-[48ch] text-[16px] leading-relaxed text-ink-2">{L(SHOW.body)}</p>

        <div className="mt-[3.4vh] flex items-center gap-6">
          <div className="rounded-[26px] bg-white p-4 shadow-float ring-1 ring-black/5">
            <QR value={url} size={124} />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-ink">{L(SHOW.scan)}</p>
            <p className="mt-1 font-mono text-[13px] text-muted">{url.replace(/^https?:\/\//, '')}</p>
            <p className="mt-3 text-[13px] text-muted">{L(C.demo)}</p>
          </div>
        </div>

        <p className="eyebrow mt-[4vh]">{L(SHOW.tryLabel)}</p>
        <div className="mt-3 flex flex-col items-start gap-2">
          {DEMO_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => navigate(`/ask?q=${encodeURIComponent(q)}`)}
              className="group inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-left text-[14px] text-ink-2 ring-1 ring-line transition hover:bg-surface-2 hover:text-ink"
            >
              <MessageCircle className="size-4 shrink-0 text-brand-500" />“{q}”
            </button>
          ))}
        </div>
        <button onClick={() => navigate('/why')} className="mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-brand-600 dark:text-brand-300">
          {L(SHOW.why)} <ArrowRight className="size-4" />
        </button>
        <p className="mt-[3vh] text-[13px] text-muted">{L(SHOW.team)}</p>
      </aside>

      <div className="relative z-10 py-6">
        <div className="relative h-[min(860px,calc(100dvh-48px))] w-[396px] rounded-[56px] bg-[#231c4d] p-[11px] shadow-[0_50px_100px_-30px_rgb(20_14_60/0.55),0_0_0_1px_rgb(255_255_255/0.06)_inset]">
          <div className="absolute left-1/2 top-[19px] z-[70] h-[30px] w-[110px] -translate-x-1/2 rounded-full bg-black" />
          <div className="relative h-full w-full overflow-hidden rounded-[45px] bg-bg">
            <StatusBar />
            <div className="absolute inset-x-0 bottom-0 top-[44px]">{children}</div>
          </div>
        </div>
      </div>
      <EngineConsole />
    </div>
  );
}

/** Live log of every decision the on-device engine makes — for the projector. */
function EngineConsole() {
  const [events, setEvents] = useState<EngineEvent[]>([]);
  useEffect(() => onDecision((e) => setEvents((list) => [e, ...list].slice(0, 4))), []);
  return (
    <section className="relative z-10 hidden h-[min(860px,calc(100dvh-48px))] flex-col overflow-hidden rounded-[28px] bg-surface text-[12px] text-ink-2 shadow-float ring-1 ring-line 2xl:flex">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3 font-mono text-[11.5px] text-muted">
        <Terminal className="size-4" /> medimate-engine · live
        <span className="ml-auto flex items-center gap-1.5 text-safe">
          <span className="size-1.5 animate-pulse rounded-full bg-safe" /> on-device
        </span>
      </header>
      <div className="flex-1 space-y-3 overflow-y-auto p-4 font-mono">
        {events.length === 0 && (
          <p className="leading-relaxed text-muted">
            {'// Ask the phone anything.'}
            <br />
            {'// Every decision streams here: language, medicines,'}
            <br />
            {'// danger signs, the rule that fired, and the time taken.'}
            <br />
            {'// Nothing is sent to a server.'}
          </p>
        )}
        <AnimatePresence initial={false}>
          {events.map((e) => (
            <motion.div key={e.at} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-surface-2 p-3 ring-1 ring-line">
              <p className="text-brand-600">
                {'>'} <span className="text-ink">"{e.query.length > 90 ? `${e.query.slice(0, 90)}…` : e.query}"</span>
              </p>
              {e.answer.trace.map((s, i) => (
                <p key={i} className="mt-1 flex gap-2">
                  <span className="w-[92px] shrink-0 text-muted">{pick(s.label, 'en').toLowerCase()}</span>
                  <span className={s.tone === 'bad' ? 'text-danger' : s.tone === 'warn' ? 'text-warn' : s.tone === 'ok' ? 'text-safe' : 'text-ink'}>{pick(s.value, 'en')}</span>
                </p>
              ))}
              {e.answer.followUp && (
                <p className="mt-1 flex gap-2">
                  <span className="w-[92px] shrink-0 text-muted">follow-up</span>
                  <span className="text-brand-600">{pick(e.answer.followUp.question, 'en')}</span>
                </p>
              )}
              <p className="mt-2 border-t border-line pt-2 text-muted">
                level <span className="text-ink">{e.answer.level}</span> · {e.answer.ms?.toFixed(2)} ms · 0 bytes sent
              </p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

function StatusBar() {
  const now = useNow(15000);
  return (
    <div className="absolute inset-x-0 top-0 z-[65] flex h-[44px] items-center justify-between bg-bg px-8 pt-1 text-[14px] font-semibold text-ink">
      <span className="tnum">{new Date(now).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
      <span className="flex items-center gap-1.5">
        <span className="flex items-end gap-[2px]">
          {[4, 6, 8, 10].map((h) => (
            <span key={h} className="w-[3px] rounded-sm bg-ink" style={{ height: h }} />
          ))}
        </span>
        <span className="ml-1 h-[11px] w-[22px] rounded-[3px] ring-1 ring-ink/50">
          <span className="block h-full w-[70%] rounded-[2px] bg-ink" />
        </span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The app inside the phone
// ---------------------------------------------------------------------------

const TABS: { id: Tab; path: string; icon: LucideIcon }[] = [
  { id: 'home', path: '/', icon: Home },
  { id: 'find', path: '/find', icon: MapPin },
  { id: 'ask', path: '/ask', icon: MessageCircleQuestion },
  { id: 'verify', path: '/verify', icon: ScanLine },
  { id: 'course', path: '/course', icon: Pill },
];

const REMINDER = {
  title: t('Time for your medicine', 'C’est l’heure de votre médicament', 'Time don reach for your medicine'),
  body: t('Dose {n} of {total}: {med}. Finish every dose.', 'Prise {n} sur {total} : {med}. Allez jusqu’au bout.', 'Dose {n} of {total}: {med}. Finish every dose.'),
};

function PhoneApp() {
  const { path } = useLocation();
  const { lang, L } = useLang();
  const chosen = useStore((s) => s.lang);
  const online = useOnline();
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
  const [sheet, setSheet] = useState<'emergency' | 'settings' | 'ussd' | null>(null);
  const scroller = useRef<HTMLElement>(null);
  const tab = tabOf(path);
  const screenKey = ['/pharmacy', '/about', '/why'].includes(path) ? path : (tab ?? 'home');

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [screenKey]);

  const ui = useMemo(
    () => ({
      openEmergency: () => setSheet('emergency'),
      openSettings: () => setSheet('settings'),
      openUssd: () => setSheet('ussd'),
    }),
    [],
  );

  const reminderLines = useCallback(
    (c: Course, i: number) => ({
      title: L(REMINDER.title),
      body: L(REMINDER.body).replace('{n}', String(i + 1)).replace('{total}', String(c.doses.length)).replace('{med}', c.medName),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang],
  );
  useDoseReminders(reminderLines);

  let screen: ReactNode;
  if (path === '/pharmacy') screen = <PortalScreen />;
  else if (path === '/about') screen = <AboutScreen />;
  else if (path === '/why') screen = <WhyScreen />;
  else if (tab === 'ask') screen = <AskScreen />;
  else if (tab === 'find') screen = <FindScreen />;
  else if (tab === 'verify') screen = <VerifyScreen />;
  else if (tab === 'course') screen = <CourseScreen />;
  else screen = <HomeScreen />;

  const showTabs = Boolean(tab) && !['/pharmacy', '/about', '/why'].includes(screenKey);

  return (
    <OverlayProvider value={overlay}>
      <ToastProvider>
        <AppCtx.Provider value={ui}>
          <div className="relative flex h-full flex-col overflow-hidden bg-bg text-ink">
            <TopBar onEmergency={ui.openEmergency} onSettings={ui.openSettings} />
            {!online && (
              <div className="flex shrink-0 items-center justify-center gap-2 bg-warn py-1.5 text-[12px] font-semibold text-white">
                <CloudOff className="size-3.5" /> {L(C.offline)}
              </div>
            )}
            <main ref={scroller} className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={screenKey}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className={cx('min-h-full', showTabs && 'pb-28')}
                >
                  <Suspense fallback={<Loading />}>{screen}</Suspense>
                </motion.div>
              </AnimatePresence>
            </main>
            {showTabs && <TabBar active={tab!} />}
            <EmergencySheet open={sheet === 'emergency'} onClose={() => setSheet(null)} />
            <SettingsSheet open={sheet === 'settings'} onClose={() => setSheet(null)} onUssd={() => setSheet('ussd')} />
            <UssdSheet open={sheet === 'ussd'} onClose={() => setSheet(null)} />
            {!chosen && <Onboarding />}
          </div>
          <div ref={setOverlay} className="pointer-events-none absolute inset-0 z-50" />
        </AppCtx.Provider>
      </ToastProvider>
    </OverlayProvider>
  );
}

function TopBar({ onEmergency, onSettings }: { onEmergency: () => void; onSettings: () => void }) {
  const { lang, L } = useLang();
  return (
    <div className="relative z-30 flex h-[56px] shrink-0 items-center justify-between gap-2 border-b border-line/0 px-4">
      <button onClick={() => navigate('/')} className="flex items-center gap-2.5 rounded-xl" aria-label="MediMate home">
        <LogoMark size={30} />
        <span className="display text-[23px] leading-none text-ink">MediMate</span>
      </button>
      <div className="flex items-center gap-1">
        <button
          onClick={onSettings}
          className="h-8 rounded-full bg-surface px-2.5 font-mono text-[11px] font-semibold tracking-wide text-ink-2 ring-1 ring-line transition active:scale-95"
          aria-label="Language"
        >
          {LANG_LABEL[lang].short}
        </button>
        <button
          onClick={() => (haptic(14), onEmergency())}
          aria-label={L(C.level.EMERGENCY)}
          className="relative ml-1 grid size-9 place-items-center rounded-full bg-danger-soft text-danger ring-1 ring-danger-line transition active:scale-90"
        >
          <Siren className="size-[18px]" strokeWidth={2.2} />
        </button>
        <IconButton icon={Settings2} label="Settings" onClick={onSettings} />
      </div>
    </div>
  );
}

function TabBar({ active }: { active: Tab }) {
  const { L } = useLang();
  const courses = useStore((s) => s.courses);
  const now = useNow(60000);
  const due = courses.some((c) => !c.completedAt && c.doses.some((_, i) => ['due', 'late'].includes(doseState(c, i, now))));
  return (
    <nav className="safe-bottom pointer-events-none absolute inset-x-0 bottom-0 z-40 px-3">
      <div className="glass pointer-events-auto mx-auto flex h-[66px] max-w-[440px] items-center justify-around rounded-[26px] px-1 shadow-float ring-1 ring-line">
        {TABS.map(({ id, path, icon: Icon }) => {
          const on = active === id;
          if (id === 'ask') {
            return (
              <button key={id} onClick={() => (haptic(), navigate(path))} className="relative -mt-7 flex flex-col items-center gap-1" aria-label={L(C.tabs.ask)}>
                <span className={cx('brand-gradient grid size-[58px] place-items-center rounded-[22px] text-white shadow-[0_14px_30px_-10px_rgb(91_63_232/0.8)] ring-4 ring-bg transition active:scale-90', on && 'scale-105')}>
                  <Icon className="size-6" strokeWidth={2.2} />
                </span>
                <span className={cx('text-[10.5px] font-semibold', on ? 'text-brand-600 dark:text-brand-300' : 'text-muted')}>{L(C.tabs.ask)}</span>
              </button>
            );
          }
          return (
            <button key={id} onClick={() => (haptic(), navigate(path))} className="relative flex w-16 flex-col items-center gap-1 py-1" aria-label={L(C.tabs[id])} aria-current={on ? 'page' : undefined}>
              <span className="relative">
                <Icon className={cx('size-[22px] transition', on ? 'text-ink' : 'text-muted')} strokeWidth={on ? 2.4 : 2} />
                {id === 'course' && due && <span className="absolute -right-1 -top-0.5 size-2.5 rounded-full bg-danger ring-2 ring-surface" />}
              </span>
              <span className={cx('text-[10.5px] font-semibold transition', on ? 'text-ink' : 'text-muted')}>{L(C.tabs[id])}</span>
              {on && <motion.span layoutId="tab-dot" className="absolute -bottom-1 h-1 w-5 rounded-full bg-brand-500" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function Loading() {
  return (
    <div className="grid h-60 place-items-center text-muted">
      <Spinner />
    </div>
  );
}
