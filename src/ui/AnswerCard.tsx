import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, ChevronDown, Cpu, MapPin, Phone, Pill, ScanLine, Share2, Siren, Stethoscope, Volume2, VolumeX, type LucideIcon } from 'lucide-react';
import type { Action, Answer } from '../core/engine';
import { pick, type Lang } from '../core/types';
import { C, LANG_LABEL, t } from '../i18n';
import { navigate } from '../lib/router';
import { speak, stopSpeaking, useSpeaking } from '../lib/speech';
import { useStore } from '../state/store';
import { useApp } from './app-context';
import { useToast } from './overlay';
import { Button, cx, haptic, LEVEL, LevelBadge } from './primitives';
import ParasiteChart from './ParasiteChart';
import { MED_BY_ID } from '../data/medicines';

const S = {
  decided: t('How MediMate decided', 'Comment MediMate a décidé', 'How MediMate take decide'),
  onDevice: t('on this phone', 'sur ce téléphone', 'for dis phone'),
  zeroBytes: t('0 bytes sent', '0 octet envoyé', '0 byte comot'),
  sources: t('Sources', 'Sources', 'Sources'),
  call119: t('Call 119', 'Appeler le 119', 'Call 119'),
  emergencyHelp: t('Emergency help', 'Aide d’urgence', 'Emergency help'),
  facilities: t('Nearest health centres', 'Centres de santé proches', 'Health centre wey near'),
  find: t('Find {med} nearby', 'Trouver {med} près d’ici', 'Find {med} near you'),
  findAny: t('Find a pharmacy', 'Trouver une pharmacie', 'Find pharmacy'),
  course: t('Track this course', 'Suivre ce traitement', 'Follow dis treatment'),
  verify: t('Check the pack', 'Vérifier la boîte', 'Check di pack'),
  shared: t('Copied — paste it in WhatsApp', 'Copié — collez-le dans WhatsApp', 'E don copy — paste am for WhatsApp'),
  notAdvice: t('Information, not a diagnosis.', 'Information, pas un diagnostic.', 'Na information, no be diagnosis.'),
};

export function AnswerCard({ answer, defaultLang, latest }: { answer: Answer; defaultLang: Lang; latest?: boolean }) {
  const [lang, setLang] = useState<Lang>(defaultLang);
  const [open, setOpen] = useState(false);
  const speaking = useSpeaking();
  const rate = useStore((s) => s.speechRate);
  const { openEmergency } = useApp();
  const toast = useToast();
  const L = (x: Parameters<typeof pick>[0]) => pick(x, lang);
  const style = LEVEL[answer.level];
  const emergency = answer.level === 'EMERGENCY';

  const spoken = [L(answer.title), L(answer.summary), ...answer.points.map((p) => L(p))].join('. ');

  const share = async () => {
    const text = `${L(answer.title)}\n\n${L(answer.summary)}\n${answer.points.map((p) => `• ${L(p)}`).join('\n')}\n\n— MediMate (${window.location.host})`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        toast(L(S.shared));
      }
    } catch {
      /* cancelled */
    }
  };

  return (
    <motion.article
      initial={latest ? { opacity: 0, y: 14, scale: 0.98 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 26, stiffness: 300 }}
      className={cx('overflow-hidden rounded-[26px] border bg-surface shadow-card', emergency ? 'border-danger-line' : 'border-line')}
    >
      <header className={cx('relative px-4 pb-3 pt-3.5', emergency ? 'bg-emergency text-white' : cx('border-b', style.tint))}>
        <div className="flex items-center justify-between gap-2">
          {emergency ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/18 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide">
              <Siren className="size-3.5" /> {L(C.level.EMERGENCY)}
            </span>
          ) : (
            <LevelBadge level={answer.level} label={L(C.level[answer.level])} />
          )}
          <LangSwitch value={lang} onChange={setLang} inverted={emergency} />
        </div>
        <h3 className={cx('mt-2.5 text-[18px] font-semibold leading-snug tracking-[-0.015em]', emergency ? 'text-white' : 'text-ink')}>{L(answer.title)}</h3>
      </header>

      <div className="space-y-3 px-4 pb-4 pt-3">
        <p className="text-[15px] leading-relaxed text-ink-2">{L(answer.summary)}</p>

        {answer.points.length > 0 && (
          <ul className="space-y-2">
            {answer.points.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-[14px] leading-snug text-ink-2">
                <span className={cx('mt-[7px] size-1.5 shrink-0 rounded-full', style.bar)} />
                <span>{L(p)}</span>
              </li>
            ))}
          </ul>
        )}

        {answer.chart === 'parasites' && <ParasiteChart />}

        {emergency && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <a href="tel:119" onClick={() => haptic(20)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emergency text-[15px] font-semibold text-white shadow-[0_10px_24px_-10px_rgb(180_20_27/0.9)] active:scale-[0.97]">
              <Phone className="size-[18px]" /> {L(S.call119)}
            </a>
            <Button variant="danger" size="lg" className="h-12 text-[14px]" onClick={openEmergency}>
              {L(S.emergencyHelp)}
            </Button>
          </div>
        )}

        {!emergency && answer.actions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {answer.actions.slice(0, 3).map((a, i) => (
              <ActionButton key={`${a.kind}-${a.medId ?? i}`} action={a} primary={i === 0} L={L} />
            ))}
          </div>
        )}

        <div className="flex items-center gap-1 border-t border-line pt-2.5">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-xl py-1.5 pr-2 text-left text-[12.5px] font-semibold text-ink-2"
            aria-expanded={open}
          >
            <Cpu className="size-4 shrink-0 text-brand-500" />
            <span className="truncate">{L(S.decided)}</span>
            <span className="tnum shrink-0 rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[10.5px] font-medium text-muted ring-1 ring-line">
              {answer.ms !== undefined ? `${answer.ms < 1 ? answer.ms.toFixed(2) : answer.ms.toFixed(1)} ms` : 'offline'}
            </span>
            <ChevronDown className={cx('size-4 shrink-0 text-muted transition', open && 'rotate-180')} />
          </button>
          <IconAction icon={speaking ? VolumeX : Volume2} label={L(speaking ? C.stop : C.listen)} onClick={() => (speaking ? stopSpeaking() : speak(spoken, lang, rate))} />
          <IconAction icon={Share2} label={L(C.share)} onClick={share} />
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="rounded-2xl bg-surface-2 p-3 font-mono text-[11.5px] ring-1 ring-line">
                {answer.trace.map((s, i) => (
                  <div key={i} className="flex gap-3 py-1">
                    <span className="w-[86px] shrink-0 text-muted">{L(s.label)}</span>
                    <span className="flex min-w-0 items-start gap-1.5 text-ink">
                      <span
                        className={cx(
                          'mt-[5px] size-1.5 shrink-0 rounded-full',
                          s.tone === 'bad' ? 'bg-danger' : s.tone === 'warn' ? 'bg-warn' : s.tone === 'ok' ? 'bg-safe' : 'bg-line-strong',
                        )}
                      />
                      <span className="min-w-0 break-words">{L(s.value)}</span>
                    </span>
                  </div>
                ))}
                <div className="mt-2 border-t border-line pt-2 text-[10.5px] text-muted">
                  ⚡ {answer.ms?.toFixed(2)} ms {L(S.onDevice)} · {L(S.zeroBytes)} · {LANG_LABEL[answer.lang].name}
                </div>
              </div>
              {answer.sources.length > 0 && (
                <p className="mt-2 flex items-start gap-1.5 text-[11.5px] text-muted">
                  <BookOpen className="mt-px size-3.5 shrink-0" />
                  <span>
                    {L(S.sources)}: {answer.sources.join(' · ')}
                  </span>
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <p className="text-[11px] text-muted">{L(S.notAdvice)}</p>
      </div>
    </motion.article>
  );
}

function ActionButton({ action, primary, L }: { action: Action; primary: boolean; L: (x: Parameters<typeof pick>[0]) => string }) {
  const { openEmergency } = useApp();
  const med = action.medId ? MED_BY_ID[action.medId] : undefined;
  const map: Record<Action['kind'], { icon: LucideIcon; label: string; run: () => void }> = {
    emergency: { icon: Siren, label: L(S.emergencyHelp), run: openEmergency },
    facilities: { icon: Stethoscope, label: L(S.facilities), run: () => navigate('/find?layer=health') },
    find: { icon: MapPin, label: med ? L(S.find).replace('{med}', med.name) : L(S.findAny), run: () => navigate(`/find${med ? `?med=${med.id}` : ''}`) },
    course: { icon: Pill, label: L(S.course), run: () => navigate(`/course?add=${action.medId ?? ''}`) },
    verify: { icon: ScanLine, label: L(S.verify), run: () => navigate('/verify') },
  };
  const a = map[action.kind];
  return (
    <Button size="sm" variant={primary ? 'primary' : 'secondary'} icon={a.icon} onClick={a.run} className="h-10 rounded-[14px]">
      {a.label}
    </Button>
  );
}

function IconAction({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button aria-label={label} title={label} onClick={() => (haptic(), onClick())} className="grid size-9 shrink-0 place-items-center rounded-full text-ink-2 transition hover:bg-surface-2 active:scale-90">
      <Icon className="size-[18px]" />
    </button>
  );
}

export function LangSwitch({ value, onChange, inverted }: { value: Lang; onChange: (l: Lang) => void; inverted?: boolean }) {
  return (
    <div className={cx('flex rounded-full p-0.5 text-[10.5px] font-semibold', inverted ? 'bg-white/15' : 'bg-surface/70 ring-1 ring-line')}>
      {(['en', 'fr', 'pcm'] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => (haptic(), onChange(l))}
          className={cx(
            'h-6 rounded-full px-2 transition',
            value === l ? (inverted ? 'bg-white text-emergency' : 'bg-ink text-bg') : inverted ? 'text-white/80' : 'text-muted',
          )}
        >
          {LANG_LABEL[l].short}
        </button>
      ))}
    </div>
  );
}
