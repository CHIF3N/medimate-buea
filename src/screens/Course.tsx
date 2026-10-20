import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { BadgeCheck, Bell, BellOff, CalendarPlus, Check, CircleAlert, Clock, HeartHandshake, MoreHorizontal, Pill, Plus, Share2, Trash2, TrendingDown } from 'lucide-react';
import { MEDICINES, MED_BY_ID } from '../data/medicines';
import {
  REGIMENS,
  buildDoses,
  clock,
  courseToIcs,
  customOffsets,
  dayLabel,
  doseState,
  nextDoseIndex,
  relTime,
  takenCount,
  type Course,
  type DoseState,
} from '../core/course';
import type { RegimenId } from '../core/types';
import { t, useLang } from '../i18n';
import { navigate, useLocation } from '../lib/router';
import { setState, uid, useStore } from '../state/store';
import { useNow } from '../lib/hooks';
import { askPermission, notify } from '../lib/reminders';
import { Sheet, useToast } from '../ui/overlay';
import { Button, cx, haptic, ProgressRing, ScreenHeader, Segmented, Toggle } from '../ui/primitives';
import ParasiteChart from '../ui/ParasiteChart';

const S = {
  eyebrow: t('Adherence', 'Observance', 'Finish your medicine'),
  title: t('Your', 'Votre', 'Your'),
  accent: t('treatment', 'traitement', 'treatment'),
  sub: t('MediMate times every dose. The amount always comes from your prescription.', 'MediMate rappelle chaque prise. La quantité vient toujours de votre ordonnance.', 'MediMate go remind you every dose. How much to take na from your doctor paper.'),
  emptyTitle: t('No active treatment', 'Aucun traitement en cours', 'No treatment now'),
  emptySub: t(
    'When a health worker gives you a treatment, add it here. You’ll get a reminder for every dose — and a nudge not to stop early.',
    'Quand un soignant vous donne un traitement, ajoutez-le ici. Vous aurez un rappel pour chaque prise — et un encouragement à ne pas arrêter trop tôt.',
    'When health worker give you treatment, add am here. You go get reminder for every dose — and we go push you make you no stop early.',
  ),
  add: t('Add a treatment', 'Ajouter un traitement', 'Add treatment'),
  next: t('Next dose', 'Prochaine prise', 'Next dose'),
  dose: t('Dose', 'Prise', 'Dose'),
  of: t('of', 'sur', 'of'),
  doses: t('doses', 'prises', 'dose'),
  took: t('I took dose {n}', 'J’ai pris la prise {n}', 'I don take dose {n}'),
  early: t('Took it already? Mark as taken', 'Déjà prise ? Marquer comme prise', 'You don take am? Mark am'),
  nextAt: t('Next dose at {time}', 'Prochaine prise à {time}', 'Next dose for {time}'),
  dueNow: t('Due now', 'À prendre maintenant', 'Time don reach'),
  late: t('Late', 'En retard', 'Late'),
  missedNote: t(
    'Missed a dose? Take the next one on time — never a double dose. Ask your pharmacist if you are unsure.',
    'Prise oubliée ? Prenez la suivante à l’heure — jamais de double dose. En cas de doute, demandez au pharmacien.',
    'You forget one dose? Take di next one for correct time — no ever take double. If you no sure, ask pharmacist.',
  ),
  calendar: t('Add to calendar', 'Ajouter à l’agenda', 'Put am for calendar'),
  calendarSub: t('Rings for every dose, even offline', 'Sonne à chaque prise, même hors ligne', 'E go ring every dose, even without network'),
  share: t('Share with family', 'Partager à un proche', 'Share with family'),
  shareSub: t('Let someone remind you', 'Qu’un proche vous rappelle', 'Make person remind you'),
  remind: t('Phone reminders', 'Rappels sur le téléphone', 'Phone reminder'),
  remindSub: t('While MediMate is open or in the background', 'Quand MediMate est ouvert ou en arrière-plan', 'When MediMate open or dey background'),
  remindOn: t('Reminders on', 'Rappels activés', 'Reminder don on'),
  remindDenied: t('Notifications are blocked — use “Add to calendar” instead.', 'Notifications bloquées — utilisez « Ajouter à l’agenda ».', 'Notification don block — use “Put am for calendar”.'),
  why: t('Feeling better? Why you must finish', 'Vous allez mieux ? Pourquoi aller jusqu’au bout', 'You don better? Why you must finish'),
  whyAbx: t(
    'Antibiotics kill the weakest germs first. The strongest survive longest — stop early and they multiply again, now harder to treat. Finishing the course is how resistance is stopped.',
    'Les antibiotiques tuent d’abord les microbes les plus faibles. Les plus résistants survivent le plus longtemps : arrêter tôt les laisse se multiplier, plus difficiles à traiter. Aller au bout, c’est stopper la résistance.',
    'Antibiotic dey kill di weak germs first. Di strong ones dey last — if you stop early, dem go multiply again and medicine no go fit dem. To finish di treatment na how we stop resistance.',
  ),
  whyChronic: t('This medicine works only while you keep taking it. Never stop it without talking to your clinician.', 'Ce médicament n’agit que tant que vous le prenez. Ne l’arrêtez jamais sans avis médical.', 'Dis medicine dey work only when you continue take am. No stop am without talk to your doctor.'),
  complete: t('Treatment complete', 'Traitement terminé', 'Treatment don finish'),
  completeSub: t('You took all {n} doses. That’s how resistance is stopped.', 'Vous avez pris les {n} prises. C’est ainsi qu’on stoppe la résistance.', 'You take all {n} dose. Na so we dey stop resistance.'),
  history: t('Completed', 'Terminés', 'Finished'),
  remove: t('Remove this treatment', 'Supprimer ce traitement', 'Remove dis treatment'),
  removed: t('Treatment removed', 'Traitement supprimé', 'Treatment don comot'),
  marked: t('Dose {n} marked as taken', 'Prise {n} enregistrée', 'Dose {n} don mark'),
  undo: t('Undo', 'Annuler', 'Undo'),
  // add sheet
  addTitle: t('Add a treatment', 'Ajouter un traitement', 'Add treatment'),
  which: t('Which medicine?', 'Quel médicament ?', 'Which medicine?'),
  other: t('Other medicine', 'Autre médicament', 'Another medicine'),
  otherName: t('Medicine name', 'Nom du médicament', 'Medicine name'),
  amount: t('How much per dose — as written on your prescription', 'Quantité par prise — comme sur l’ordonnance', 'How much for one dose — as e dey for your doctor paper'),
  amountPh: t('e.g. 4 tablets', 'ex. 4 comprimés', 'like 4 tablet'),
  schedule: t('Schedule', 'Calendrier', 'Time table'),
  perDay: t('Times a day', 'Fois par jour', 'Times for one day'),
  days: t('For how many days', 'Pendant combien de jours', 'For how many days'),
  first: t('First dose', 'Première prise', 'First dose'),
  now: t('Now', 'Maintenant', 'Now'),
  pick: t('Pick a time', 'Choisir l’heure', 'Choose time'),
  prescribed: t('A health worker prescribed or dispensed this for me', 'Un soignant me l’a prescrit ou délivré', 'Health worker don write am or give am to me'),
  rxNeed: t('Prescription-only medicines can only be tracked once prescribed.', 'Les médicaments sur ordonnance ne se suivent qu’une fois prescrits.', 'Medicine wey need doctor paper — we fit track am only after doctor don write am.'),
  preview: t('{n} doses · last one {when}', '{n} prises · dernière {when}', '{n} dose · last one {when}'),
  start: t('Start tracking', 'Commencer le suivi', 'Start to track'),
  fixed: t('Fixed schedule for this medicine', 'Calendrier fixe pour ce médicament', 'Dis medicine get fixed time table'),
};

const STATE_STYLE: Record<DoseState, string> = {
  taken: 'bg-safe text-white ring-safe',
  due: 'bg-warn-soft text-warn-ink ring-warn animate-pulse',
  late: 'bg-danger-soft text-danger-ink ring-danger',
  missed: 'bg-surface-2 text-danger-ink ring-danger-line line-through',
  upcoming: 'bg-surface text-ink-2 ring-line',
};

export default function CourseScreen() {
  const { L } = useLang();
  const { query } = useLocation();
  const courses = useStore((s) => s.courses);
  const [adding, setAdding] = useState<string | null>(null);
  const [why, setWhy] = useState<Course | null>(null);

  useEffect(() => {
    const add = query.get('add');
    if (add !== null) {
      setAdding(add);
      navigate('/course', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.toString()]);

  const active = courses.filter((c) => !c.completedAt);
  const finished = courses.filter((c) => c.completedAt);

  return (
    <div className="space-y-4 pb-4">
      <ScreenHeader eyebrow={L(S.eyebrow)} title={L(S.title)} accent={L(S.accent)} sub={L(S.sub)} />
      <div className="space-y-4 px-4">
        {active.length === 0 && (
          <div className="card flex flex-col items-center px-6 py-8 text-center">
            <span className="grid size-16 place-items-center rounded-3xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
              <Pill className="size-8" />
            </span>
            <p className="mt-4 text-[17px] font-semibold text-ink">{L(S.emptyTitle)}</p>
            <p className="mt-1.5 text-[13.5px] leading-snug text-muted">{L(S.emptySub)}</p>
            <Button className="mt-5" icon={Plus} onClick={() => setAdding('')}>
              {L(S.add)}
            </Button>
          </div>
        )}

        <AnimatePresence initial={false}>
          {active.map((c) => (
            <CourseCard key={c.id} course={c} onWhy={() => setWhy(c)} />
          ))}
        </AnimatePresence>

        {active.length > 0 && (
          <Button block variant="secondary" icon={Plus} onClick={() => setAdding('')}>
            {L(S.add)}
          </Button>
        )}

        {finished.length > 0 && (
          <section>
            <p className="eyebrow mb-2 px-1">{L(S.history)}</p>
            <div className="divide-y divide-line overflow-hidden rounded-[22px] bg-surface ring-1 ring-line">
              {finished.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-safe-soft text-safe ring-1 ring-safe-line">
                    <BadgeCheck className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">{c.medName}</span>
                    <span className="block text-[12px] text-muted">
                      {c.doses.length}/{c.doses.length} · {new Date(c.completedAt!).toLocaleDateString()}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <AddSheet medId={adding} onClose={() => setAdding(null)} />
      <Sheet open={Boolean(why)} onClose={() => setWhy(null)} title={L(S.why)}>
        {why && (
          <div className="space-y-3 pb-2">
            {MED_BY_ID[why.medId]?.klass === 'antimalarial' ? (
              <ParasiteChart />
            ) : (
              <p className="text-[15px] leading-relaxed text-ink-2">
                {['antihypertensive', 'anticoagulant'].includes(MED_BY_ID[why.medId]?.klass ?? '') ? L(S.whyChronic) : L(S.whyAbx)}
              </p>
            )}
            <Button block onClick={() => setWhy(null)}>
              OK
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function update(id: string, fn: (c: Course) => Course) {
  setState((s) => ({ courses: s.courses.map((c) => (c.id === id ? fn(c) : c)) }));
}

function CourseCard({ course, onWhy }: { course: Course; onWhy: () => void }) {
  const { lang, L } = useLang();
  const now = useNow(20000);
  const toast = useToast();
  const notifyOn = useStore((s) => s.notify);
  const [menu, setMenu] = useState(false);
  const idx = nextDoseIndex(course, now);
  const taken = takenCount(course);
  const total = course.doses.length;
  const next = idx >= 0 ? course.doses[idx] : undefined;
  const state = idx >= 0 ? doseState(course, idx, now) : 'taken';
  const missed = course.doses.some((_, i) => doseState(course, i, now) === 'missed');

  const days = useMemo(() => {
    const groups: { label: string; items: { i: number; due: number }[] }[] = [];
    course.doses.forEach((d, i) => {
      const label = dayLabel(d.due, lang, now);
      const g = groups.find((x) => x.label === label);
      if (g) g.items.push({ i, due: d.due });
      else groups.push({ label, items: [{ i, due: d.due }] });
    });
    return groups;
  }, [course.doses, lang, now]);

  const take = (i: number) => {
    haptic(18);
    const doses = course.doses.map((d, k) => (k === i ? { ...d, taken: Date.now() } : d));
    const finished = doses.every((d) => d.taken);
    update(course.id, (c) => ({ ...c, doses, completedAt: finished ? Date.now() : undefined }));
    if (finished) {
      void confetti({ particleCount: 140, spread: 75, origin: { y: 0.65 }, colors: ['#5b3fe8', '#8c7cfb', '#0f9a68', '#ffffff'] });
    }
    toast(L(S.marked).replace('{n}', String(i + 1)), {
      label: L(S.undo),
      run: () => update(course.id, (c) => ({ ...c, completedAt: undefined, doses: c.doses.map((d, k) => (k === i ? { due: d.due } : d)) })),
    });
  };

  const calendar = () => {
    const ics = courseToIcs(course, lang === 'fr' ? 'Allez jusqu’au bout du traitement.' : 'Finish every dose — MediMate');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `medimate-${course.medName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const share = async () => {
    const lines = course.doses
      .map((d, i) => `${i + 1}. ${dayLabel(d.due, lang, now)} ${clock(d.due, lang)}${d.taken ? ' ✓' : ''}`)
      .join('\n');
    const text = `${course.medName}${course.amount ? ` — ${course.amount}` : ''}\n${lines}\n\nMediMate: ${window.location.origin}`;
    try {
      if (navigator.share) await navigator.share({ title: course.medName, text });
      else {
        await navigator.clipboard.writeText(text);
        toast('Copied');
      }
    } catch {
      /* cancelled */
    }
  };

  const toggleRemind = async (on: boolean) => {
    if (!on) return setState({ notify: false });
    const p = await askPermission();
    if (p === 'granted') {
      setState({ notify: true });
      toast(L(S.remindOn));
      void notify('MediMate', L(S.remindOn));
    } else toast(L(S.remindDenied));
  };

  return (
    <motion.article layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} className="card overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <p className="truncate text-[18px] font-semibold tracking-[-0.015em] text-ink">{course.medName}</p>
          <p className="truncate text-[12.5px] text-muted">{[course.amount, L(REGIMENS[course.regimen].label)].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="relative">
          <button aria-label="More" onClick={() => setMenu((m) => !m)} className="grid size-9 place-items-center rounded-full text-muted hover:bg-surface-2">
            <MoreHorizontal className="size-5" />
          </button>
          {menu && (
            <div className="absolute right-0 top-10 z-20 w-56 rounded-2xl bg-surface p-1.5 shadow-float ring-1 ring-line">
              <button
                onClick={() => {
                  setMenu(false);
                  setState((s) => ({ courses: s.courses.filter((c) => c.id !== course.id) }));
                  toast(L(S.removed));
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13.5px] font-semibold text-danger-ink hover:bg-danger-soft"
              >
                <Trash2 className="size-4" /> {L(S.remove)}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-5 px-4 py-4">
        <ProgressRing value={taken / total} size={104} stroke={10}>
          <span>
            <span className="tnum block text-[26px] font-semibold leading-none tracking-[-0.03em] text-ink">
              {taken}
              <span className="text-[16px] text-muted">/{total}</span>
            </span>
            <span className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">{L(S.doses)}</span>
          </span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          {next ? (
            <>
              <p className="eyebrow">{L(S.next)}</p>
              <p className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-ink">
                {L(S.dose)} {idx + 1}
              </p>
              <p className="text-[13.5px] text-ink-2">
                {dayLabel(next.due, lang, now)} · {clock(next.due, lang)}
              </p>
              <p className={cx('mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold', state === 'due' ? 'bg-warn-soft text-warn-ink' : state === 'late' ? 'bg-danger-soft text-danger-ink' : 'bg-surface-2 text-muted')}>
                <Clock className="size-3.5" />
                {state === 'due' ? L(S.dueNow) : state === 'late' ? `${L(S.late)} · ${relTime(next.due - now, lang)}` : relTime(next.due - now, lang)}
              </p>
            </>
          ) : null}
        </div>
      </div>

      {next && (
        <div className="px-4">
          {state === 'due' || state === 'late' ? (
            <Button block size="lg" variant="safe" icon={Check} onClick={() => take(idx)}>
              {L(S.took).replace('{n}', String(idx + 1))}
            </Button>
          ) : (
            <div className="space-y-1.5">
              <div className="flex h-12 items-center justify-center rounded-2xl bg-surface-2 text-[14px] font-semibold text-muted ring-1 ring-line">
                {L(S.nextAt).replace('{time}', clock(next.due, lang))}
              </div>
              <button onClick={() => take(idx)} className="block w-full text-center text-[12.5px] font-semibold text-brand-600 dark:text-brand-300">
                {L(S.early)}
              </button>
            </div>
          )}
        </div>
      )}

      {missed && (
        <p className="mx-4 mt-3 flex items-start gap-2 rounded-2xl bg-warn-soft px-3 py-2.5 text-[12.5px] leading-snug text-warn-ink ring-1 ring-warn-line">
          <CircleAlert className="mt-px size-4 shrink-0" /> {L(S.missedNote)}
        </p>
      )}

      <div className="mt-4 space-y-2.5 border-t border-line px-4 py-4">
        {days.map((g) => (
          <div key={g.label} className="flex items-center gap-3">
            <span className="w-[74px] shrink-0 text-[12px] font-semibold text-muted">{g.label}</span>
            <div className="flex flex-wrap gap-1.5">
              {g.items.map(({ i, due }) => {
                const st = doseState(course, i, now);
                return (
                  <button
                    key={i}
                    onClick={() => (st === 'taken' ? undefined : take(i))}
                    title={`${L(S.dose)} ${i + 1}`}
                    className={cx('inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold ring-1 transition', STATE_STYLE[st])}
                  >
                    {st === 'taken' ? <Check className="size-3.5" strokeWidth={3} /> : <span className="tnum">{i + 1}</span>}
                    <span className="tnum">{clock(due, lang)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-line p-3">
        <Tool icon={CalendarPlus} title={L(S.calendar)} sub={L(S.calendarSub)} onClick={calendar} />
        <Tool icon={Share2} title={L(S.share)} sub={L(S.shareSub)} onClick={() => void share()} />
      </div>
      <div className="flex items-center gap-3 border-t border-line px-4 py-3">
        {notifyOn ? <Bell className="size-5 text-brand-500" /> : <BellOff className="size-5 text-muted" />}
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-ink">{L(S.remind)}</span>
          <span className="block text-[12px] text-muted">{L(S.remindSub)}</span>
        </span>
        <Toggle on={notifyOn} onChange={(v) => void toggleRemind(v)} label={L(S.remind)} />
      </div>
      <button onClick={onWhy} className="flex w-full items-center gap-2.5 border-t border-line bg-brand-50/60 px-4 py-3.5 text-left text-[13.5px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
        <TrendingDown className="size-4" /> {L(S.why)}
      </button>
    </motion.article>
  );
}

function Tool({ icon: Icon, title, sub, onClick }: { icon: typeof Bell; title: string; sub: string; onClick: () => void }) {
  return (
    <button onClick={() => (haptic(), onClick())} className="flex items-start gap-2.5 rounded-2xl p-2.5 text-left transition hover:bg-surface-2 active:scale-[0.98]">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-2 ring-1 ring-line">
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold leading-tight text-ink">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted">{sub}</span>
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Add a treatment
// ---------------------------------------------------------------------------

const TRACKABLE = MEDICINES.filter((m) => m.regimen);

function AddSheet({ medId, onClose }: { medId: string | null; onClose: () => void }) {
  const { lang, L } = useLang();
  const toast = useToast();
  const [sel, setSel] = useState<string>('al');
  const [otherName, setOtherName] = useState('');
  const [amount, setAmount] = useState('');
  const [perDay, setPerDay] = useState('3');
  const [days, setDays] = useState('5');
  const [when, setWhen] = useState<'now' | 'pick'>('now');
  const [at, setAt] = useState('');
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (medId === null) return;
    const m = medId && MED_BY_ID[medId]?.regimen ? medId : 'al';
    setSel(m);
    setAmount('');
    setOk(false);
    setWhen('now');
    const r = MED_BY_ID[m]?.regimen;
    setPerDay(r === 'zinc' || r === 'daily' ? '1' : r === 'abx' && m === 'azithro' ? '1' : r === 'abx' && (m === 'cipro' || m === 'coamox' || m === 'cotrimoxazole') ? '2' : '3');
    setDays(r === 'zinc' ? '10' : r === 'daily' ? '30' : m === 'azithro' ? '3' : m === 'metronidazole' ? '7' : '5');
  }, [medId]);

  const med = sel === 'other' ? undefined : MED_BY_ID[sel];
  const regimen: RegimenId = med?.regimen ?? 'abx';
  const fixed = !REGIMENS[regimen].editable;
  const offsets = fixed ? REGIMENS[regimen].offsets : customOffsets(parseInt(perDay, 10), parseInt(days, 10));
  const start = when === 'now' || !at ? Date.now() : new Date(at).getTime();
  const needsRx = sel === 'other' || Boolean(med?.rx);
  const last = start + offsets[offsets.length - 1] * 3600000;
  const valid = (sel !== 'other' || otherName.trim().length > 1) && (!needsRx || ok) && !Number.isNaN(start);

  const save = () => {
    const course: Course = {
      id: uid(),
      medId: med?.id ?? 'other',
      medName: med?.name ?? otherName.trim(),
      amount: amount.trim(),
      regimen,
      doses: buildDoses(start, offsets),
      createdAt: Date.now(),
      prescribedBy: needsRx ? 'health worker' : undefined,
    };
    setState((s) => ({ courses: [course, ...s.courses] }));
    toast(L(S.start));
    onClose();
  };

  return (
    <Sheet
      open={medId !== null}
      onClose={onClose}
      title={L(S.addTitle)}
      tall
      footer={
        <div className="space-y-2 pb-1">
          <p className="text-center text-[12px] text-muted">
            {L(S.preview).replace('{n}', String(offsets.length)).replace('{when}', `${dayLabel(last, lang)} ${clock(last, lang)}`)}
          </p>
          <Button block size="lg" icon={HeartHandshake} disabled={!valid} onClick={save}>
            {L(S.start)}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink-2">{L(S.which)}</p>
          <div className="grid grid-cols-2 gap-2">
            {TRACKABLE.map((m) => (
              <button
                key={m.id}
                onClick={() => (haptic(), setSel(m.id), setOk(false))}
                className={cx('rounded-2xl px-3 py-2.5 text-left ring-1 transition', sel === m.id ? 'bg-brand-50 ring-2 ring-brand-500 dark:bg-brand-500/15' : 'bg-surface ring-line')}
              >
                <span className="block truncate text-[13.5px] font-semibold text-ink">{m.name}</span>
                <span className="block truncate text-[11px] text-muted">{m.rx ? 'Rx · ' : ''}{L(REGIMENS[m.regimen!].label)}</span>
              </button>
            ))}
            <button onClick={() => setSel('other')} className={cx('rounded-2xl px-3 py-2.5 text-left ring-1', sel === 'other' ? 'bg-brand-50 ring-2 ring-brand-500 dark:bg-brand-500/15' : 'bg-surface ring-line')}>
              <span className="block text-[13.5px] font-semibold text-ink">{L(S.other)}</span>
            </button>
          </div>
          {sel === 'other' && (
            <input value={otherName} onChange={(e) => setOtherName(e.target.value)} placeholder={L(S.otherName)} className="mt-2 h-12 w-full rounded-2xl bg-surface px-4 text-[15px] text-ink outline-none ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-brand-500" />
          )}
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">{L(S.amount)}</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={L(S.amountPh)} className="h-12 w-full rounded-2xl bg-surface px-4 text-[15px] text-ink outline-none ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-brand-500" />
        </label>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink-2">{L(S.schedule)}</p>
          {fixed ? (
            <p className="rounded-2xl bg-surface-2 px-3.5 py-3 text-[13.5px] text-ink-2 ring-1 ring-line">
              {L(REGIMENS[regimen].label)}
              <span className="mt-0.5 block text-[11.5px] text-muted">{L(S.fixed)}</span>
            </p>
          ) : (
            <div className="space-y-2.5">
              <div>
                <p className="mb-1.5 text-[12px] text-muted">{L(S.perDay)}</p>
                <Segmented value={perDay} onChange={setPerDay} options={['1', '2', '3', '4'].map((v) => ({ value: v, label: `${v}×` }))} />
              </div>
              <div>
                <p className="mb-1.5 text-[12px] text-muted">{L(S.days)}</p>
                <Segmented value={days} onChange={setDays} options={['3', '5', '7', '10', '14'].map((v) => ({ value: v, label: v }))} />
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink-2">{L(S.first)}</p>
          <Segmented<'now' | 'pick'> value={when} onChange={setWhen} options={[{ value: 'now', label: L(S.now) }, { value: 'pick', label: L(S.pick) }]} />
          {when === 'pick' && (
            <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className="mt-2 h-12 w-full rounded-2xl bg-surface px-4 text-[15px] text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-500" />
          )}
        </div>

        {needsRx && (
          <label className="flex items-start gap-3 rounded-2xl bg-warn-soft p-3.5 ring-1 ring-warn-line">
            <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--warn)]" />
            <span>
              <span className="block text-[13.5px] font-semibold text-warn-ink">{L(S.prescribed)}</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-warn-ink/80">{L(S.rxNeed)}</span>
            </span>
          </label>
        )}
      </div>
    </Sheet>
  );
}
