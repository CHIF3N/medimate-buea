import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUp, Cpu, Languages, Mic, MicOff, RotateCcw, ShieldCheck, WifiOff } from 'lucide-react';
import { LogoMark } from '../ui/Logo';
import { answer as runEngine, mentionsMedicine, type Answer } from '../core/engine';
import { pick, type Lang } from '../core/types';
import { C, LANG_LABEL, t, useLang } from '../i18n';
import { navigate, useLocation } from '../lib/router';
import { setState, uid, useStore, type ChatTurn } from '../state/store';
import { canListen, listen } from '../lib/speech';
import { useOnline } from '../lib/hooks';
import { emitDecision } from '../lib/engine-bus';
import { AnswerCard } from '../ui/AnswerCard';
import { useToast } from '../ui/overlay';
import { cx, haptic, IconButton } from '../ui/primitives';

const S = {
  title: t('Ask', 'Demandez à', 'Ask'),
  accent: t('MediMate', 'MediMate', 'MediMate'),
  sub: t(
    'In English, French or Pidgin. Answers come from a reviewed medicine list — no guessing, no diagnosis.',
    'En anglais, français ou pidgin. Les réponses viennent d’une liste vérifiée — pas de supposition, pas de diagnostic.',
    'For English, French or Pidgin. Answer dey come from checked medicine list — no guess, no diagnosis.',
  ),
  placeholder: t('Ask about any medicine…', 'Votre question…', 'Ask about any medicine…'),
  try: t('Try asking', 'Essayez', 'Try ask'),
  how1: t('Understands Pidgin, French & English — and typos', 'Comprend pidgin, français, anglais — et les fautes', 'E sabi Pidgin, French and English — even bad spelling'),
  how2: t('Never gives antibiotic doses without a prescription', 'Jamais de dose d’antibiotique sans ordonnance', 'E no dey give antibiotic dose without doctor paper'),
  how3: t('Runs on this phone — works with no network', 'Fonctionne sur ce téléphone — même sans réseau', 'E dey work for dis phone — even without network'),
  asks: t('MediMate asks', 'MediMate demande', 'MediMate dey ask'),
  next: t('Ask next', 'Question suivante', 'Ask next'),
  newChat: t('New question', 'Nouvelle question', 'New question'),
  listening: t('Listening… speak now', 'Je vous écoute…', 'I dey hear you… talk now'),
  voiceOffline: t('Voice needs internet — you can type instead.', 'La voix nécessite internet — vous pouvez écrire.', 'Voice need internet — you fit type am.'),
  voiceNo: t('Voice input isn’t supported on this browser.', 'La saisie vocale n’est pas prise en charge ici.', 'Voice no dey work for dis browser.'),
};

const EXAMPLES: { q: string; lang: Lang }[] = [
  { q: 'My pikin get hot body since two days, I fit give am Amox?', lang: 'pcm' },
  { q: 'Fever don cool, I fit stop di Coartem?', lang: 'pcm' },
  { q: 'Can I drink beer with Flagyl?', lang: 'en' },
  { q: 'Mon enfant a de la diarrhée, que faire ?', lang: 'fr' },
  { q: 'Panadol and Doliprane together?', lang: 'en' },
  { q: 'I am pregnant, can I take ibuprofen?', lang: 'en' },
  { q: 'Wetin be Flagyl?', lang: 'pcm' },
  { q: 'What is the dose of tramadol?', lang: 'en' },
];

export default function AskScreen() {
  const { lang: uiLang, L } = useLang();
  const chat = useStore((s) => s.chat);
  const { query } = useLocation();
  const online = useOnline();
  const toast = useToast();
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const recog = useRef<{ stop?: () => void } | null>(null);

  // Scroll the app's own scroller (not the desktop page around the phone frame).
  const scrollDown = () =>
    window.setTimeout(() => {
      const main = bottom.current?.closest('main');
      main?.scrollTo({ top: main.scrollHeight, behavior: 'smooth' });
    }, 60);
  const handledQ = useRef<string | null>(null);

  const lastAssistant = [...chat].reverse().find((c) => c.role === 'assistant');
  const lastAnswer = useMemo(() => (lastAssistant ? runEngine(lastAssistant.ctx) : undefined), [lastAssistant]);

  const send = (display: string, engineText = display, opts: { continueThread?: boolean } = {}) => {
    const clean = display.trim();
    if (!clean) return;
    haptic();
    const words = engineText.trim().split(/\s+/).length;
    const continues =
      opts.continueThread ??
      Boolean(lastAssistant && lastAnswer?.followUp && words <= 8 && !mentionsMedicine(engineText));
    const thread = continues && lastAssistant ? lastAssistant.thread : uid();
    const prior = continues ? chat.filter((c) => c.thread === thread && c.role === 'user').map((c) => c.ctx) : [];
    const ctx = [...prior, engineText.trim()].join('. ');
    const now = Date.now();
    const userTurn: ChatTurn = { id: uid(), role: 'user', text: clean, ctx: engineText.trim(), thread, at: now };
    const botTurn: ChatTurn = { id: uid(), role: 'assistant', text: '', ctx, thread, at: now + 1 };
    setThinking(true);
    setState((s) => ({ chat: [...s.chat, userTurn].slice(-40) }));
    setText('');
    scrollDown();
    window.setTimeout(() => {
      const a = runEngine(ctx);
      emitDecision({ query: ctx, answer: a, at: Date.now() });
      a.meds.forEach((m) => setState((s) => ({ searches: { ...s.searches, [m.id]: (s.searches[m.id] ?? 0) + 1 } })));
      setState((s) => ({ chat: [...s.chat, botTurn].slice(-40) }));
      setThinking(false);
      scrollDown();
    }, 320);
  };

  // Deep link: /ask?q=… (used by the desktop showcase and shared links)
  const q = query.get('q');
  useEffect(() => {
    if (q && handledQ.current !== q) {
      handledQ.current = q;
      send(q, q, { continueThread: false });
      navigate('/ask', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    const main = bottom.current?.closest('main');
    if (chat.length && main) main.scrollTop = main.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mic = () => {
    if (listening) {
      recog.current?.stop?.();
      setListening(false);
      return;
    }
    if (!canListen()) return toast(L(S.voiceNo));
    if (!online) return toast(L(S.voiceOffline));
    setListening(true);
    recog.current = listen(
      uiLang,
      (said, final) => {
        setText(said);
        if (final) {
          setListening(false);
          send(said);
        }
      },
      (err) => {
        setListening(false);
        if (err && err !== 'no-speech' && err !== 'aborted') toast(L(S.voiceOffline));
      },
    );
  };

  const empty = chat.length === 0;
  const answerLang = (a: Answer): Lang => (a.langSure ? a.lang : uiLang);

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1 px-4">
        {empty ? (
          <div className="pt-2">
            <h1 className="display px-1 text-[42px] text-ink">
              {L(S.title)} <em className="text-brand-600 dark:text-brand-300">{L(S.accent)}</em>
            </h1>
            <p className="mt-2 max-w-[36ch] px-1 text-[14.5px] leading-snug text-muted">{L(S.sub)}</p>

            <div className="mt-5 grid gap-2">
              {[
                { icon: Languages, text: L(S.how1) },
                { icon: ShieldCheck, text: L(S.how2) },
                { icon: Cpu, text: L(S.how3) },
              ].map(({ icon: Icon, text: s }) => (
                <div key={s} className="flex items-center gap-3 rounded-2xl bg-surface px-3.5 py-3 ring-1 ring-line">
                  <Icon className="size-[18px] shrink-0 text-brand-500" />
                  <span className="text-[13.5px] text-ink-2">{s}</span>
                </div>
              ))}
            </div>

            <p className="eyebrow mt-6 px-1">{L(S.try)}</p>
            <div className="mt-2.5 flex flex-col items-start gap-2">
              {EXAMPLES.map((e) => (
                <button
                  key={e.q}
                  onClick={() => send(e.q)}
                  className="group flex max-w-full items-center gap-2 rounded-2xl bg-surface px-3.5 py-2.5 text-left text-[14px] text-ink-2 shadow-card ring-1 ring-line transition active:scale-[0.98]"
                >
                  <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-muted ring-1 ring-line">{LANG_LABEL[e.lang].short}</span>
                  <span className="min-w-0">{e.q}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            <div className="flex justify-end">
              <button onClick={() => setState({ chat: [] })} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold text-muted ring-1 ring-line">
                <RotateCcw className="size-3.5" /> {L(S.newChat)}
              </button>
            </div>
            {chat.map((turn) =>
              turn.role === 'user' ? (
                <motion.div key={turn.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
                  <div className="max-w-[82%] rounded-[22px] rounded-br-md bg-brand-600 px-4 py-2.5 text-[15px] leading-snug text-white shadow-[0_10px_24px_-14px_rgb(91_63_232/0.9)]">
                    {turn.text}
                  </div>
                </motion.div>
              ) : (
                <AssistantTurn key={turn.id} turn={turn} latest={turn.id === lastAssistant?.id} langFor={answerLang} onPick={send} />
              ),
            )}
            <AnimatePresence>
              {thinking && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 px-1 text-[12px] text-muted">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span key={i} className="size-1.5 rounded-full bg-brand-500" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }} />
                    ))}
                  </span>
                  MediMate
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        <div ref={bottom} className="h-4 scroll-mb-48" />
      </div>

      <div className="sticky bottom-[84px] z-20 px-3 pb-2 pt-3">
        <div className="pointer-events-none absolute inset-x-0 -top-6 bottom-0 bg-gradient-to-t from-bg via-bg/90 to-transparent" />
        {listening && (
          <div className="relative mb-2 flex items-center justify-center gap-2 text-[12.5px] font-semibold text-brand-600 dark:text-brand-300">
            <span className="relative grid size-3 place-items-center">
              <span className="absolute size-3 animate-pulse-ring rounded-full bg-brand-500" />
              <span className="size-2 rounded-full bg-brand-500" />
            </span>
            {L(S.listening)}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
          className="relative flex items-end gap-1.5 rounded-[24px] bg-surface p-1.5 shadow-float ring-1 ring-line"
        >
          <IconButton
            type="button"
            icon={listening ? MicOff : online ? Mic : WifiOff}
            label="Voice"
            onClick={mic}
            className={cx('size-11', listening && 'bg-brand-50 text-brand-600 dark:bg-brand-500/15')}
          />
          <textarea
            ref={input}
            value={text}
            rows={1}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 110)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(text);
              }
            }}
            placeholder={L(S.placeholder)}
            className="max-h-[110px] min-h-11 flex-1 resize-none bg-transparent py-[11px] text-[15px] leading-snug text-ink outline-none placeholder:text-muted"
            aria-label={L(S.placeholder)}
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="brand-gradient grid size-11 shrink-0 place-items-center rounded-[18px] text-white transition active:scale-90 disabled:opacity-35"
            aria-label="Send"
          >
            <ArrowUp className="size-5" strokeWidth={2.4} />
          </button>
        </form>
      </div>
    </div>
  );
}

function AssistantTurn({
  turn,
  latest,
  langFor,
  onPick,
}: {
  turn: ChatTurn;
  latest: boolean;
  langFor: (a: Answer) => Lang;
  onPick: (display: string, engineText?: string, opts?: { continueThread?: boolean }) => void;
}) {
  const a = useMemo(() => runEngine(turn.ctx), [turn.ctx]);
  const lang = langFor(a);
  const L = (x: Parameters<typeof pick>[0]) => pick(x, lang);
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 px-1 text-[11.5px] font-semibold text-muted">
        <LogoMark size={20} />
        MediMate
      </div>
      <AnswerCard answer={a} defaultLang={lang} latest={latest} />
      {latest && a.followUp && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="rounded-[22px] bg-surface-2 p-3 ring-1 ring-line">
          <p className="eyebrow">{L(S.asks)}</p>
          <p className="mt-1 text-[15px] font-semibold text-ink">{L(a.followUp.question)}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {a.followUp.options.map((o) => (
              <button
                key={o.add}
                onClick={() => onPick(L(o.label), o.add, { continueThread: true })}
                className={cx(
                  'rounded-full px-3.5 py-2 text-[13px] font-semibold ring-1 transition active:scale-95',
                  o.tone === 'danger'
                    ? 'bg-danger-soft text-danger-ink ring-danger-line'
                    : o.tone === 'safe'
                      ? 'bg-safe-soft text-safe-ink ring-safe-line'
                      : 'bg-surface text-ink ring-line',
                )}
              >
                {L(o.label)}
              </button>
            ))}
          </div>
        </motion.div>
      )}
      {latest && !a.followUp && a.suggestions && (
        <div>
          <p className="eyebrow px-1">{L(S.next)}</p>
          <div className="no-scrollbar -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
            {a.suggestions.map((s) => (
              <button key={s.query} onClick={() => onPick(L(s.label).replace('?', '') + ` — ${a.meds[0]?.name ?? ''}`, s.query, { continueThread: false })} className="shrink-0 rounded-full bg-surface px-3.5 py-2 text-[13px] font-medium text-ink-2 ring-1 ring-line active:scale-95">
                {L(s.label)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { C };
