import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  CalendarPlus,
  Check,
  CheckCheck,
  ChevronRight,
  Crown,
  FlaskConical,
  HeartHandshake,
  Hospital,
  MessageCircle,
  MessageSquareText,
  Pencil,
  Phone,
  Plus,
  Send,
  ShieldAlert,
  PlayCircle,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  CHRONIC_MEDS,
  CONDITION_LABEL,
  CONDITION_TIPS,
  MAX_CARETAKERS,
  appointmentText,
  carePlanToIcs,
  cleanPhone,
  dayKey,
  demoPlan,
  inviteText,
  messageLink,
  missedText,
  nextAppointment,
  reminderText,
  streak,
  todayProgress,
  todaySlots,
  validCmPhone,
  weeklyText,
  type Appointment,
  type CareAlert,
  type CareMed,
  type CarePlan,
  type Caretaker,
  type Channel,
  type Condition,
  type Slot,
} from '../core/care';
import type { Lang } from '../core/types';
import { FACILITIES } from '../data/places';
import { LANG_LABEL, t, useLang } from '../i18n';
import { setState, uid, useStore } from '../state/store';
import { useNow } from '../lib/hooks';
import { formatFcfa } from '../lib/payments';
import { relTime } from '../core/course';
import PaySheet, { type PayRequest } from '../ui/PaySheet';
import { Sheet, useToast } from '../ui/overlay';
import { Button, cx, haptic, ProgressRing, Segmented, Toggle } from '../ui/primitives';

const FAMILY_PRICE = 1000;

const S = {
  emptyTitle: t('Daily care for long-term conditions', 'Suivi quotidien des maladies chroniques', 'Daily care for long sickness'),
  emptySub: t(
    'For an older parent after a stroke, or living with diabetes or high blood pressure: every daily dose and doctor’s appointment, with up to 2 family members alerted on WhatsApp or SMS if a dose is missed.',
    'Pour un parent âgé après un AVC, ou vivant avec un diabète ou une hypertension : chaque prise et chaque rendez-vous, avec jusqu’à 2 proches prévenus par WhatsApp ou SMS en cas d’oubli.',
    'For old mama or papa after stroke, or wey get sugar or high BP: every daily dose and doctor appointment, and up to 2 family people go get WhatsApp or SMS if dose miss.',
  ),
  b1: t('Reminders on WhatsApp or SMS — in English, French or Pidgin', 'Rappels WhatsApp ou SMS — en anglais, français ou pidgin', 'Reminder for WhatsApp or SMS — English, French or Pidgin'),
  b2: t('Up to 2 caretakers alerted if a dose isn’t confirmed', 'Jusqu’à 2 proches prévenus si une prise n’est pas confirmée', 'Up to 2 care people go hear if dose no confirm'),
  b3: t('Doctor’s appointments reminded the day before and 2 hours before', 'Rendez-vous rappelés la veille et 2 heures avant', 'Doctor appointment reminder one day before and 2 hours before'),
  setup: t('Set up a care plan', 'Créer un plan de soins', 'Set up care plan'),
  demo: t('Try the demo: Mama Grace, 68', 'Essayer la démo : Mama Grace, 68 ans', 'Try di demo: Mama Grace, 68'),
  today: t('Today', 'Aujourd’hui', 'Today'),
  dosesToday: t('doses today', 'prises aujourd’hui', 'dose today'),
  onTrack: t('{n} days on track', '{n} jours sans oubli', '{n} days without miss'),
  take: t('Taken', 'Pris', 'Don take'),
  confirm: t('Confirm all', 'Tout confirmer', 'Confirm all'),
  remindNow: t('Send reminder', 'Envoyer le rappel', 'Send reminder'),
  dueNow: t('Due now', 'Maintenant', 'Time don reach'),
  late: t('Not confirmed — caretakers alerted', 'Non confirmé — proches prévenus', 'E never confirm — care people don hear'),
  confirmed: t('Confirmed — no alert will be sent', 'Confirmé — aucune alerte envoyée', 'E don confirm — no alert go comot'),
  escalation: t('If a dose isn’t confirmed', 'Si une prise n’est pas confirmée', 'If dose no confirm'),
  simulate: t('Simulate a missed dose', 'Simuler un oubli', 'Simulate missed dose'),
  appts: t('Doctor’s appointments', 'Rendez-vous médicaux', 'Doctor appointment'),
  addAppt: t('Add appointment', 'Ajouter un rendez-vous', 'Add appointment'),
  circle: t('Care circle', 'Cercle d’aidants', 'Care circle'),
  circleSub: t('Up to 2 people who get alerts and follow up.', 'Jusqu’à 2 personnes prévenues qui assurent le suivi.', 'Up to 2 people wey go hear alert and follow up.'),
  addCaretaker: t('Add a caretaker', 'Ajouter un aidant', 'Add care person'),
  paired: t('Paired', 'Associé', 'Don join'),
  invited: t('Invite sent', 'Invitation envoyée', 'Invite don go'),
  invite: t('Send invite', 'Inviter', 'Send invite'),
  accepted: t('They replied YES', 'Il/elle a répondu OUI', 'E don reply YES'),
  testAlert: t('Test alert', 'Alerte test', 'Test alert'),
  addPhone: t('Add phone number', 'Ajouter un numéro', 'Add phone number'),
  alertsMissed: t('Missed doses', 'Prises oubliées', 'Missed dose'),
  alertsAppt: t('Appointments', 'Rendez-vous', 'Appointment'),
  alertsWeekly: t('Weekly summary', 'Bilan hebdo', 'Weekly summary'),
  preview: t('What they receive', 'Ce qu’ils reçoivent', 'Wetin dem go receive'),
  previewPatient: t('Patient', 'Patient', 'Patient'),
  previewCaretaker: t('Caretaker', 'Aidant', 'Care person'),
  previewAppt: t('Appointment', 'Rendez-vous', 'Appointment'),
  previewWeekly: t('Weekly', 'Hebdo', 'Weekly'),
  tips: t('For caretakers: what to watch for', 'Pour les aidants : à surveiller', 'For care people: wetin to watch'),
  activity: t('Messages & alerts', 'Messages et alertes', 'Message and alert'),
  simulated: t('preview', 'aperçu', 'preview'),
  calendar: t('Add to phone calendar', 'Ajouter à l’agenda', 'Put am for phone calendar'),
  calendarSub: t('Every dose repeats daily and rings offline', 'Chaque prise se répète chaque jour et sonne hors ligne', 'Every dose go repeat every day and ring without network'),
  edit: t('Edit plan', 'Modifier', 'Edit plan'),
  remove: t('Remove plan', 'Supprimer', 'Remove plan'),
  removed: t('Care plan removed', 'Plan supprimé', 'Care plan don comot'),
  how: t(
    'Today: messages open in your own WhatsApp or SMS, ready to send, and calendar alarms ring offline. Pilot: sent automatically through WhatsApp Business and an SMS gateway — a reply of “1” confirms the dose, and no reply alerts the care circle.',
    'Aujourd’hui : les messages s’ouvrent dans votre WhatsApp ou SMS, prêts à envoyer, et les alarmes d’agenda sonnent hors ligne. Pilote : envoi automatique via WhatsApp Business et une passerelle SMS — répondre « 1 » confirme la prise, sinon les aidants sont prévenus.',
    'Today: message dey open for your own WhatsApp or SMS, ready to send, and calendar alarm dey ring without network. Pilot: e go send by itself with WhatsApp Business and SMS gateway — reply “1” confirm di dose, no reply = care people go hear.',
  ),
  family: t('Family plan — automatic alerts', 'Formule famille — alertes automatiques', 'Family plan — alert go send by itself'),
  familySub: t('Automatic WhatsApp & SMS to the patient and 2 caretakers. Free when sponsored by a health programme.', 'WhatsApp et SMS automatiques au patient et à 2 aidants. Gratuit si un programme de santé le finance.', 'WhatsApp and SMS go reach patient and 2 care people by itself. Free if health programme sponsor am.'),
  perMonth: t('/ month', '/ mois', '/ month'),
  familyOn: t('Family plan active', 'Formule famille active', 'Family plan don start'),
  subscribe: t('Subscribe with Mobile Money', 'S’abonner par Mobile Money', 'Subscribe with Mobile Money'),
  settings: t('Reminders for the patient', 'Rappels du patient', 'Reminder for patient'),
  channel: t('Send reminders by', 'Rappels par', 'Send reminder by'),
  msgLang: t('Message language', 'Langue des messages', 'Message language'),
  escalateAfter: t('Alert caretakers after', 'Prévenir les aidants après', 'Alert care people after'),
  min: t('min', 'min', 'min'),
  app: t('App only', 'Appli', 'App only'),
};

export default function CarePlanView() {
  const { L } = useLang();
  const plan = useStore((s) => s.care);
  const [wizard, setWizard] = useState<false | 'new' | 'edit'>(false);

  if (!plan) {
    return (
      <div className="space-y-4">
        <div className="card overflow-hidden p-0">
          <div className="brand-gradient relative overflow-hidden p-5 text-white">
            <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-white/15 blur-2xl" />
            <HeartHandshake className="size-9" />
            <p className="mt-4 text-[20px] font-semibold leading-snug tracking-[-0.015em]">{L(S.emptyTitle)}</p>
            <p className="mt-2 text-[13.5px] leading-snug text-white/85">{L(S.emptySub)}</p>
          </div>
          <ul className="space-y-2.5 p-4">
            {[S.b1, S.b2, S.b3].map((b, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] leading-snug text-ink-2">
                <Check className="mt-0.5 size-4 shrink-0 text-safe" /> {L(b)}
              </li>
            ))}
          </ul>
          <div className="grid gap-2 px-4 pb-4">
            <Button block icon={Plus} onClick={() => setWizard('new')}>
              {L(S.setup)}
            </Button>
            <Button block variant="secondary" icon={PlayCircle} onClick={() => setState({ care: demoPlan() })}>
              {L(S.demo)}
            </Button>
          </div>
        </div>
        <SetupSheet mode={wizard} onClose={() => setWizard(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PatientCard plan={plan} />
      <TodaySection plan={plan} />
      <EscalationCard plan={plan} />
      <AppointmentsSection plan={plan} />
      <CareCircle plan={plan} />
      <MessagePreview plan={plan} />
      <ActivityFeed plan={plan} />
      <TipsSection plan={plan} />
      <FamilyPlanCard />
      <PlanActions plan={plan} onEdit={() => setWizard('edit')} />
      <p className="rounded-2xl bg-info-soft px-3.5 py-3 text-[12px] leading-snug text-info-ink ring-1 ring-info-line">{L(S.how)}</p>
      <SetupSheet mode={wizard} onClose={() => setWizard(false)} />
    </div>
  );
}

const updatePlan = (fn: (p: CarePlan) => CarePlan) => setState((s) => (s.care ? { care: fn(s.care) } : {}));
const logAlert = (a: Omit<CareAlert, 'at'> & { at?: number }) =>
  updatePlan((p) => ({ ...p, alerts: [{ at: Date.now(), ...a }, ...p.alerts].slice(0, 20) }));

// ---------------------------------------------------------------------------

function PatientCard({ plan }: { plan: CarePlan }) {
  const { L } = useLang();
  const now = useNow(30000);
  const { total, taken } = todayProgress(plan, now);
  const days = streak(plan, now);
  const initials = plan.patient.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="relative overflow-hidden rounded-[28px] brand-gradient p-5 text-white shadow-float">
      <div className="pointer-events-none absolute -right-12 -top-16 size-48 rounded-full bg-brand-500/45 blur-3xl" />
      <div className="relative flex items-center gap-4">
        <ProgressRing value={total ? taken / total : 0} size={88} stroke={8} tone={taken === total && total > 0 ? 'safe' : 'brand'}>
          <span className="grid size-[58px] place-items-center rounded-full bg-white/10 text-[20px] font-semibold">{initials}</span>
        </ProgressRing>
        <div className="min-w-0">
          <p className="truncate text-[21px] font-semibold tracking-[-0.02em]">
            {plan.patient.name}
            {plan.patient.age ? <span className="font-normal opacity-60"> · {plan.patient.age}</span> : null}
          </p>
          <p className="tnum mt-0.5 text-[13px] opacity-75">
            {taken}/{total} {L(S.dosesToday)}
            {days > 0 ? ` · ${L(S.onTrack).replace('{n}', String(days))}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {plan.conditions.map((c) => (
              <span key={c} className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold">
                {L(CONDITION_LABEL[c])}
              </span>
            ))}
          </div>
        </div>
      </div>
      {plan.demo && <span className="absolute right-4 top-4 rounded-full bg-white/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Demo</span>}
    </div>
  );
}

function TodaySection({ plan }: { plan: CarePlan }) {
  const { lang, L } = useLang();
  const now = useNow(20000);
  const toast = useToast();
  const slots = todaySlots(plan, now);
  const key = dayKey(new Date(now));

  const confirm = (slot: Slot, med?: CareMed) => {
    haptic(14);
    updatePlan((p) => {
      const log = { ...p.log };
      (med ? [med] : slot.meds).forEach((m) => (log[`${key}|${m.id}|${slot.time}`] = Date.now()));
      return { ...p, log };
    });
    toast(L(S.confirmed));
  };

  return (
    <section>
      <SectionHead title={L(S.today)} />
      <div className="space-y-2.5">
        {slots.map((slot) => {
          const done = slot.state === 'taken';
          const late = slot.state === 'late';
          const due = slot.state === 'due' || slot.state === 'partial';
          return (
            <div key={slot.time} className={cx('card overflow-hidden', late && 'ring-1 ring-danger-line', due && 'ring-1 ring-warn-line')}>
              <div className="flex items-center gap-3 px-4 pt-3.5">
                <span className={cx('tnum rounded-xl px-2.5 py-1 font-mono text-[14px] font-semibold', done ? 'bg-safe-soft text-safe-ink' : late ? 'bg-danger-soft text-danger-ink' : due ? 'bg-warn-soft text-warn-ink' : 'bg-surface-2 text-ink')}>{slot.time}</span>
                <span className="min-w-0 flex-1 text-[12.5px] font-semibold text-muted">
                  {done ? `✓ ${L(S.take)}` : late ? L(S.late) : due ? L(S.dueNow) : relTime(slot.due - now, lang)}
                </span>
                <a
                  href={messageLink(plan.patient.channel === 'sms' ? 'sms' : 'whatsapp', plan.patient.phone, reminderText(plan, slot, plan.patient.lang))}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => logAlert({ to: 'patient', kind: 'reminder', channel: plan.patient.channel === 'sms' ? 'sms' : 'whatsapp', text: reminderText(plan, slot, plan.patient.lang), simulated: false })}
                  className="grid size-9 place-items-center rounded-full bg-surface-2 text-ink-2 ring-1 ring-line"
                  aria-label={L(S.remindNow)}
                  title={L(S.remindNow)}
                >
                  {plan.patient.channel === 'sms' ? <MessageSquareText className="size-4" /> : <MessageCircle className="size-4" />}
                </a>
              </div>
              <ul className="space-y-1 px-4 py-3">
                {slot.meds.map((m) => {
                  const ok = slot.taken.includes(m);
                  return (
                    <li key={m.id} className="flex items-center gap-3">
                      <button
                        onClick={() => !ok && confirm(slot, m)}
                        aria-label={`${m.name} ${L(S.take)}`}
                        className={cx('grid size-7 shrink-0 place-items-center rounded-full ring-1 transition', ok ? 'bg-safe text-white ring-safe' : 'bg-surface ring-line-strong active:scale-90')}
                      >
                        {ok && <Check className="size-4" strokeWidth={3} />}
                      </button>
                      <span className={cx('min-w-0 flex-1 text-[14.5px]', ok ? 'text-muted line-through decoration-1' : 'text-ink')}>
                        <span className="font-semibold">{m.name}</span> {m.amount && <span className="text-muted">· {m.amount}</span>}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {!done && (due || late) && (
                <div className="px-4 pb-4">
                  <Button block variant="safe" icon={CheckCheck} onClick={() => confirm(slot)}>
                    {L(S.confirm)}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EscalationCard({ plan }: { plan: CarePlan }) {
  const { L } = useLang();
  const toast = useToast();
  const first = todaySlots(plan)[0];
  const steps = [
    { at: '0', who: plan.patient.name, how: plan.patient.channel === 'sms' ? 'SMS' : plan.patient.channel === 'whatsapp' ? 'WhatsApp' : 'App', tone: 'brand' },
    ...plan.caretakers
      .filter((c) => c.alerts.missed)
      .map((c, i) => ({ at: `+${plan.escalateAfter * (i + 1)}`, who: `${c.name} (${c.relation})`, how: c.channel === 'sms' ? 'SMS' : 'WhatsApp', tone: 'warn' })),
  ];
  const simulate = () => {
    if (!first) return;
    haptic(20);
    plan.caretakers
      .filter((c) => c.alerts.missed)
      .forEach((c, i) =>
        logAlert({ at: Date.now() + i, to: c.id, kind: 'missed', channel: c.channel, text: missedText(plan, first, c, plan.patient.lang), simulated: true }),
      );
    toast(L(S.simulate));
  };
  return (
    <section className="card p-4">
      <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
        <ShieldAlert className="size-4 text-warn" /> {L(S.escalation)}
      </p>
      <ol className="relative mt-3 space-y-3 pl-6">
        <span className="absolute bottom-2 left-[9px] top-2 w-px bg-line-strong" />
        {steps.map((s, i) => (
          <li key={i} className="relative">
            <span className={cx('absolute -left-6 top-0.5 grid size-[19px] place-items-center rounded-full text-[9px] font-bold text-white', s.tone === 'brand' ? 'bg-brand-500' : 'bg-warn')}>{i + 1}</span>
            <p className="text-[13.5px] text-ink">
              <span className="tnum font-mono text-[12px] text-muted">{s.at === '0' ? '0 min' : `${s.at} min`}</span> · <span className="font-semibold">{s.who}</span>
            </p>
            <p className="text-[12px] text-muted">{s.how}</p>
          </li>
        ))}
      </ol>
      <Button block size="sm" variant="secondary" icon={FlaskConical} className="mt-3" onClick={simulate}>
        {L(S.simulate)}
      </Button>
    </section>
  );
}

function AppointmentsSection({ plan }: { plan: CarePlan }) {
  const { lang, L } = useLang();
  const [adding, setAdding] = useState(false);
  const list = [...plan.appointments].filter((a) => a.at > Date.now() - 3600000).sort((a, b) => a.at - b.at);
  const next = nextAppointment(plan);
  return (
    <section>
      <SectionHead title={L(S.appts)} action={<SmallAction icon={Plus} label={L(S.addAppt)} onClick={() => setAdding(true)} />} />
      <div className="space-y-2.5">
        {list.map((a) => {
          const d = new Date(a.at);
          return (
            <div key={a.id} className={cx('card flex gap-3.5 p-4', a.id === next?.id && 'ring-1 ring-brand-200 dark:ring-brand-500/30')}>
              <div className="grid w-14 shrink-0 place-items-center rounded-2xl bg-surface-2 py-2 text-center ring-1 ring-line">
                <span className="text-[10.5px] font-semibold uppercase text-muted">{d.toLocaleDateString(lang === 'fr' ? 'fr-CM' : 'en-GB', { month: 'short' })}</span>
                <span className="tnum text-[22px] font-semibold leading-none text-ink">{d.getDate()}</span>
                <span className="text-[10.5px] text-muted">{d.toLocaleDateString(lang === 'fr' ? 'fr-CM' : 'en-GB', { weekday: 'short' })}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-ink">{a.title}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[12.5px] text-muted">
                  <Hospital className="size-3.5" /> {a.place} · {d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {a.remind.map((r) => (
                    <span key={r} className="rounded-full bg-brand-50 px-2 py-0.5 text-[10.5px] font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                      <BellRing className="mr-1 inline size-3" />
                      {r === '1d' ? (lang === 'fr' ? 'la veille' : '1 day before') : lang === 'fr' ? '2 h avant' : '2 h before'}
                    </span>
                  ))}
                  <a
                    href={messageLink(plan.patient.channel === 'sms' ? 'sms' : 'whatsapp', plan.patient.phone, appointmentText(plan, a, plan.patient.lang))}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => logAlert({ to: 'patient', kind: 'appointment', channel: plan.patient.channel === 'sms' ? 'sms' : 'whatsapp', text: appointmentText(plan, a, plan.patient.lang), simulated: false })}
                    className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-brand-600 dark:text-brand-300"
                  >
                    <Send className="size-3.5" /> {L(S.remindNow)}
                  </a>
                </div>
              </div>
              <button aria-label="Remove" onClick={() => updatePlan((p) => ({ ...p, appointments: p.appointments.filter((x) => x.id !== a.id) }))} className="self-start text-muted">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
      <AppointmentSheet open={adding} onClose={() => setAdding(false)} />
    </section>
  );
}

function CareCircle({ plan }: { plan: CarePlan }) {
  const { L } = useLang();
  const [editing, setEditing] = useState<Caretaker | 'new' | null>(null);
  const url = typeof window !== 'undefined' ? window.location.origin : '';
  return (
    <section>
      <SectionHead
        title={L(S.circle)}
        sub={L(S.circleSub)}
        action={plan.caretakers.length < MAX_CARETAKERS ? <SmallAction icon={UserPlus} label={L(S.addCaretaker)} onClick={() => setEditing('new')} /> : undefined}
      />
      <div className="space-y-2.5">
        {plan.caretakers.map((c) => {
          const code = String(1000 + ((c.id.charCodeAt(0) * 97 + c.name.length * 13) % 9000));
          const invite = inviteText(plan, c, code, plan.patient.lang, url);
          const sample = todaySlots(plan)[0];
          return (
            <div key={c.id} className="card p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-[15px] font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">{c.name.slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15.5px] font-semibold text-ink">
                    {c.name} <span className="font-normal text-muted">· {c.relation}</span>
                  </p>
                  <p className="flex items-center gap-1.5 text-[12px] text-muted">
                    {c.channel === 'whatsapp' ? <MessageCircle className="size-3.5 text-[#25D366]" /> : <MessageSquareText className="size-3.5" />}
                    {c.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} · {c.phone ? `+237 ${cleanPhone(c.phone).replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4')}` : L(S.addPhone)}
                  </p>
                </div>
                <span className={cx('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1', c.status === 'paired' ? 'bg-safe-soft text-safe-ink ring-safe-line' : 'bg-warn-soft text-warn-ink ring-warn-line')}>
                  {c.status === 'paired' ? `✓ ${L(S.paired)}` : L(S.invited)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(['missed', 'appointments', 'weekly'] as const).map((k) => (
                  <button
                    key={k}
                    onClick={() => updatePlan((p) => ({ ...p, caretakers: p.caretakers.map((x) => (x.id === c.id ? { ...x, alerts: { ...x.alerts, [k]: !x.alerts[k] } } : x)) }))}
                    className={cx('rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 transition', c.alerts[k] ? 'bg-brand-600 text-white ring-brand-600' : 'bg-surface text-muted ring-line')}
                  >
                    {c.alerts[k] ? '✓ ' : ''}
                    {L(k === 'missed' ? S.alertsMissed : k === 'appointments' ? S.alertsAppt : S.alertsWeekly)}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <a
                  href={messageLink(c.channel, c.phone, invite)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => {
                    logAlert({ to: c.id, kind: 'invite', channel: c.channel, text: invite, simulated: false });
                    if (c.status !== 'paired') updatePlan((p) => ({ ...p, caretakers: p.caretakers.map((x) => (x.id === c.id ? { ...x, status: 'invited' } : x)) }));
                  }}
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl bg-surface-2 text-[12.5px] font-semibold text-ink ring-1 ring-line active:scale-95"
                >
                  <Send className="size-3.5" /> {L(S.invite)}
                </a>
                {sample ? (
                  <a
                    href={messageLink(c.channel, c.phone, missedText(plan, sample, c, plan.patient.lang))}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => logAlert({ to: c.id, kind: 'test', channel: c.channel, text: missedText(plan, sample, c, plan.patient.lang), simulated: false })}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl bg-surface-2 text-[12.5px] font-semibold text-ink ring-1 ring-line active:scale-95"
                  >
                    <BellRing className="size-3.5" /> {L(S.testAlert)}
                  </a>
                ) : (
                  <span />
                )}
                <button onClick={() => setEditing(c)} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl bg-surface-2 text-[12.5px] font-semibold text-ink ring-1 ring-line active:scale-95">
                  <Pencil className="size-3.5" /> {L(S.edit).split(' ')[0]}
                </button>
              </div>
              {c.status === 'invited' && (
                <button
                  onClick={() => updatePlan((p) => ({ ...p, caretakers: p.caretakers.map((x) => (x.id === c.id ? { ...x, status: 'paired' } : x)) }))}
                  className="mt-2 w-full text-center text-[12px] font-semibold text-brand-600 dark:text-brand-300"
                >
                  {L(S.accepted)} →
                </button>
              )}
            </div>
          );
        })}
      </div>
      <CaretakerSheet value={editing} onClose={() => setEditing(null)} />
    </section>
  );
}

function MessagePreview({ plan }: { plan: CarePlan }) {
  const { L } = useLang();
  const [kind, setKind] = useState<'patient' | 'caretaker' | 'appt' | 'weekly'>('caretaker');
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const lang = plan.patient.lang;
  const slot = todaySlots(plan)[0];
  const c = plan.caretakers[0];
  const appt = nextAppointment(plan);
  const text =
    kind === 'patient' && slot
      ? reminderText(plan, slot, lang)
      : kind === 'caretaker' && slot && c
        ? missedText(plan, slot, c, lang)
        : kind === 'appt' && appt
          ? appointmentText(plan, appt, lang)
          : weeklyText(plan, lang);
  const recipient = kind === 'caretaker' && c ? c.name : plan.patient.name;
  const segments = Math.ceil([...text].length / 153) || 1;
  return (
    <section>
      <SectionHead title={L(S.preview)} />
      <div className="card space-y-3 p-3">
        <Segmented<'patient' | 'caretaker' | 'appt' | 'weekly'>
          size="sm"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'patient', label: L(S.previewPatient) },
            { value: 'caretaker', label: L(S.previewCaretaker) },
            { value: 'appt', label: L(S.previewAppt) },
            { value: 'weekly', label: L(S.previewWeekly) },
          ]}
        />
        <Segmented<Channel> size="sm" value={channel} onChange={setChannel} options={[{ value: 'whatsapp', label: 'WhatsApp' }, { value: 'sms', label: 'SMS' }]} />
        {channel === 'whatsapp' ? (
          <div className="overflow-hidden rounded-[22px] ring-1 ring-line">
            <div className="flex items-center gap-2.5 bg-[#075E54] px-3.5 py-2.5 text-white">
              <span className="grid size-8 place-items-center rounded-full bg-white/20 text-[12px] font-bold">M</span>
              <div className="leading-tight">
                <p className="text-[13.5px] font-semibold">MediMate ✓</p>
                <p className="text-[10.5px] opacity-80">to {recipient}</p>
              </div>
            </div>
            <div className="bg-[#ECE5DD] p-3 dark:bg-[#0b141a]">
              <motion.div key={text} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-[88%] rounded-[12px] rounded-tl-sm bg-white px-3 py-2 text-[13.5px] leading-snug text-[#111b21] shadow-sm dark:bg-[#202c33] dark:text-[#e9edef]">
                {text}
                <span className="mt-1 block text-right text-[10px] text-[#667781]">08:00</span>
              </motion.div>
            </div>
          </div>
        ) : (
          <div className="rounded-[22px] bg-surface-2 p-3 ring-1 ring-line">
            <p className="mb-2 text-center text-[10.5px] text-muted">SMS · MediMate → {recipient}</p>
            <motion.div key={text} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="max-w-[88%] rounded-[18px] rounded-bl-md bg-surface-3 px-3.5 py-2.5 text-[13.5px] leading-snug text-ink">
              {text}
            </motion.div>
            <p className="tnum mt-2 text-right text-[10.5px] text-muted">
              {[...text].length} chars · {segments} SMS
            </p>
          </div>
        )}
        <p className="text-center text-[11px] text-muted">
          {LANG_LABEL[lang].name} · {L(S.msgLang)}
        </p>
      </div>
    </section>
  );
}

function ActivityFeed({ plan }: { plan: CarePlan }) {
  const { lang, L } = useLang();
  if (!plan.alerts.length) return null;
  const nameOf = (to: string) => (to === 'patient' ? plan.patient.name : plan.caretakers.find((c) => c.id === to)?.name ?? '—');
  return (
    <section>
      <SectionHead title={L(S.activity)} />
      <div className="divide-y divide-line overflow-hidden rounded-[22px] bg-surface ring-1 ring-line">
        {plan.alerts.slice(0, 6).map((a, i) => (
          <div key={i} className="flex gap-3 px-4 py-3">
            <span className={cx('mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl', a.kind === 'missed' ? 'bg-warn-soft text-warn' : 'bg-surface-2 text-ink-2')}>
              {a.channel === 'sms' ? <MessageSquareText className="size-4" /> : <MessageCircle className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink">
                {nameOf(a.to)} <span className="font-normal text-muted">· {a.channel === 'sms' ? 'SMS' : 'WhatsApp'} · {relTime(a.at - Date.now(), lang)}</span>
                {a.simulated && <span className="ml-1.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase text-muted ring-1 ring-line">{L(S.simulated)}</span>}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted">{a.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TipsSection({ plan }: { plan: CarePlan }) {
  const { L } = useLang();
  const tips = plan.conditions.map((c) => CONDITION_TIPS[c]).filter(Boolean);
  if (!tips.length) return null;
  return (
    <section>
      <SectionHead title={L(S.tips)} />
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
        {tips.map((tip, i) => (
          <div key={i} className="card w-[84%] shrink-0 snap-start p-4">
            <p className="text-[14.5px] font-semibold text-ink">{L(tip!.title)}</p>
            <ul className="mt-2 space-y-2">
              {tip!.points.map((p, j) => (
                <li key={j} className="flex gap-2 text-[12.5px] leading-snug text-ink-2">
                  <span className="mt-[6px] size-1.5 shrink-0 rounded-full bg-danger" /> {L(p)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function FamilyPlanCard() {
  const { L } = useLang();
  const toast = useToast();
  const active = useStore((s) => s.familyPlan);
  const [pay, setPay] = useState<PayRequest | null>(null);
  return (
    <div className="rounded-[24px] bg-brand-50 p-4 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:ring-brand-500/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
            <Crown className="size-4 text-brand-500" /> {L(S.family)}
          </p>
          <p className="mt-1 text-[12.5px] leading-snug text-ink-2">{L(S.familySub)}</p>
        </div>
        <p className="tnum shrink-0 text-right text-[15px] font-semibold text-ink">
          {formatFcfa(FAMILY_PRICE)}
          <span className="block text-[11px] font-normal text-muted">{L(S.perMonth)}</span>
        </p>
      </div>
      {active ? (
        <p className="mt-3 text-[12.5px] font-semibold text-brand-600 dark:text-brand-300">● {L(S.familyOn)}</p>
      ) : (
        <Button
          block
          className="mt-3"
          icon={Crown}
          onClick={() =>
            setPay({
              title: L(S.family),
              lines: [
                { label: 'Plan', value: 'MediMate Family · 30 days' },
                { label: 'Includes', value: 'Patient + 2 caretakers' },
              ],
              amount: FAMILY_PRICE,
              purpose: 'family',
              externalId: `fam-${uid()}`,
              message: 'MediMate Family plan',
            })
          }
        >
          {L(S.subscribe)}
        </Button>
      )}
      <PaySheet
        open={Boolean(pay)}
        onClose={() => setPay(null)}
        req={pay}
        onPaid={() => {
          setPay(null);
          setState({ familyPlan: true });
          toast(L(S.familyOn));
        }}
      />
    </div>
  );
}

function PlanActions({ plan, onEdit }: { plan: CarePlan; onEdit: () => void }) {
  const { L } = useLang();
  const toast = useToast();
  const calendar = () => {
    const ics = carePlanToIcs(plan, plan.patient.lang);
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `medimate-care-plan-${plan.patient.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  return (
    <div className="card divide-y divide-line overflow-hidden p-0">
      <ActionRow icon={CalendarPlus} title={L(S.calendar)} sub={L(S.calendarSub)} onClick={calendar} />
      <ActionRow icon={Pencil} title={L(S.edit)} onClick={onEdit} />
      <ActionRow
        icon={Trash2}
        title={L(S.remove)}
        danger
        onClick={() => {
          setState({ care: null });
          toast(L(S.removed));
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sheets
// ---------------------------------------------------------------------------

const TIME_CHOICES = ['06:00', '08:00', '12:00', '14:00', '18:00', '20:00', '22:00'];
const CONDITIONS: Condition[] = ['stroke', 'diabetes', 'hypertension', 'heart', 'epilepsy', 'hiv', 'asthma', 'other'];

const W = {
  newTitle: t('New care plan', 'Nouveau plan de soins', 'New care plan'),
  editTitle: t('Edit care plan', 'Modifier le plan', 'Edit care plan'),
  who: t('Who is it for?', 'Pour qui ?', 'Na for who?'),
  name: t('Name (e.g. Mama Grace)', 'Nom (ex. Mama Grace)', 'Name (like Mama Grace)'),
  age: t('Age', 'Âge', 'Age'),
  conditions: t('Conditions', 'Maladies', 'Sickness'),
  meds: t('Daily medicines — as prescribed', 'Médicaments quotidiens — selon l’ordonnance', 'Daily medicine — as doctor write am'),
  addMed: t('Add', 'Ajouter', 'Add'),
  medName: t('Medicine', 'Médicament', 'Medicine'),
  amount: t('Amount (e.g. 500 mg)', 'Dose (ex. 500 mg)', 'Amount (like 500 mg)'),
  times: t('Times', 'Heures', 'Time'),
  prescribed: t('These medicines were prescribed by a health worker', 'Ces médicaments ont été prescrits par un soignant', 'Health worker don write dis medicine dem'),
  reminders: t('Reminders', 'Rappels', 'Reminder'),
  phone: t('Patient’s phone (WhatsApp/SMS)', 'Téléphone du patient (WhatsApp/SMS)', 'Patient phone (WhatsApp/SMS)'),
  save: t('Save care plan', 'Enregistrer le plan', 'Save care plan'),
  back: t('Back', 'Retour', 'Back'),
  next: t('Next', 'Suivant', 'Next'),
  step: t('Step {n} of 3', 'Étape {n} sur 3', 'Step {n} of 3'),
};

interface Draft {
  name: string;
  age: string;
  conditions: Condition[];
  meds: CareMed[];
  phone: string;
  channel: Channel | 'app';
  lang: Lang;
  escalateAfter: 30 | 60;
  ok: boolean;
}

function SetupSheet({ mode, onClose }: { mode: false | 'new' | 'edit'; onClose: () => void }) {
  const { lang, L } = useLang();
  const plan = useStore((s) => s.care);
  const toast = useToast();
  const [step, setStep] = useState(0);
  const initial: Draft = useMemo(
    () =>
      mode === 'edit' && plan
        ? { name: plan.patient.name, age: plan.patient.age ? String(plan.patient.age) : '', conditions: plan.conditions, meds: plan.meds, phone: plan.patient.phone, channel: plan.patient.channel, lang: plan.patient.lang, escalateAfter: plan.escalateAfter, ok: true }
        : { name: '', age: '', conditions: [], meds: [], phone: '', channel: 'whatsapp', lang, escalateAfter: 30, ok: false },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode],
  );
  const [d, setD] = useState<Draft>(initial);
  const [medName, setMedName] = useState('');
  const [medAmount, setMedAmount] = useState('');
  const [medTimes, setMedTimes] = useState<string[]>(['08:00']);

  useMemo(() => {
    setD(initial);
    setStep(0);
  }, [initial]);

  const addMed = () => {
    if (!medName.trim() || !medTimes.length) return;
    setD((x) => ({ ...x, meds: [...x.meds, { id: uid(), name: medName.trim(), amount: medAmount.trim(), times: [...medTimes].sort() }] }));
    setMedName('');
    setMedAmount('');
    setMedTimes(['08:00']);
  };

  const save = () => {
    const base: CarePlan = plan && mode === 'edit' ? plan : { patient: { name: '', phone: '', channel: 'whatsapp', lang }, conditions: [], meds: [], appointments: [], caretakers: [], escalateAfter: 30, log: {}, alerts: [], createdAt: Date.now() };
    setState({
      care: {
        ...base,
        demo: mode === 'edit' ? base.demo : false,
        patient: { name: d.name.trim() || 'Patient', age: d.age ? parseInt(d.age, 10) : undefined, phone: d.phone, channel: d.channel, lang: d.lang },
        conditions: d.conditions,
        meds: d.meds,
        escalateAfter: d.escalateAfter,
      },
    });
    toast(L(W.save));
    onClose();
  };

  const canNext = step === 0 ? d.name.trim().length > 0 : step === 1 ? d.meds.length > 0 && d.ok : true;

  return (
    <Sheet
      open={Boolean(mode)}
      onClose={onClose}
      tall
      title={
        <span>
          {L(mode === 'edit' ? W.editTitle : W.newTitle)}
          <span className="block text-[12px] font-medium text-muted">{L(W.step).replace('{n}', String(step + 1))}</span>
        </span>
      }
      footer={
        <div className="flex gap-2 pb-1">
          {step > 0 && (
            <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
              {L(W.back)}
            </Button>
          )}
          {step < 2 ? (
            <Button block iconRight={ArrowRight} disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              {L(W.next)}
            </Button>
          ) : (
            <Button block icon={HeartHandshake} onClick={save}>
              {L(W.save)}
            </Button>
          )}
        </div>
      }
    >
      {step === 0 && (
        <div className="space-y-4">
          <p className="text-[13px] font-semibold text-ink-2">{L(W.who)}</p>
          <div className="grid grid-cols-[1fr_88px] gap-2">
            <Input value={d.name} onChange={(v) => setD({ ...d, name: v })} placeholder={L(W.name)} />
            <Input value={d.age} onChange={(v) => setD({ ...d, age: v.replace(/\D/g, '').slice(0, 3) })} placeholder={L(W.age)} inputMode="numeric" />
          </div>
          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-2">{L(W.conditions)}</p>
            <div className="flex flex-wrap gap-2">
              {CONDITIONS.map((c) => {
                const on = d.conditions.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => setD({ ...d, conditions: on ? d.conditions.filter((x) => x !== c) : [...d.conditions, c] })}
                    className={cx('rounded-full px-3.5 py-2 text-[13px] font-semibold ring-1 transition', on ? 'bg-brand-600 text-white ring-brand-600' : 'bg-surface text-ink-2 ring-line')}
                  >
                    {L(CONDITION_LABEL[c])}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-[13px] font-semibold text-ink-2">{L(W.meds)}</p>
          {d.meds.length > 0 && (
            <div className="divide-y divide-line overflow-hidden rounded-2xl ring-1 ring-line">
              {d.meds.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <span className="min-w-0 flex-1 text-[14px] text-ink">
                    <b>{m.name}</b> {m.amount && <span className="text-muted">· {m.amount}</span>}
                    <span className="block font-mono text-[11.5px] text-muted">{m.times.join(' · ')}</span>
                  </span>
                  <button aria-label="Remove" onClick={() => setD({ ...d, meds: d.meds.filter((x) => x.id !== m.id) })} className="text-muted">
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2.5 rounded-2xl bg-surface-2 p-3 ring-1 ring-line">
            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {CHRONIC_MEDS.map((m) => (
                <button key={m} onClick={() => setMedName(m)} className={cx('shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1', medName === m ? 'bg-brand-600 text-white ring-brand-600' : 'bg-surface text-ink-2 ring-line')}>
                  {m}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[1fr_110px] gap-2">
              <Input value={medName} onChange={setMedName} placeholder={L(W.medName)} />
              <Input value={medAmount} onChange={setMedAmount} placeholder={L(W.amount).split(' (')[0]} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TIME_CHOICES.map((tm) => {
                const on = medTimes.includes(tm);
                return (
                  <button key={tm} onClick={() => setMedTimes(on ? medTimes.filter((x) => x !== tm) : [...medTimes, tm])} className={cx('tnum rounded-full px-3 py-1.5 font-mono text-[12px] font-semibold ring-1', on ? 'bg-brand-600 text-white ring-brand-600' : 'bg-surface text-ink-2 ring-line')}>
                    {tm}
                  </button>
                );
              })}
            </div>
            <Button block size="sm" variant="secondary" icon={Plus} disabled={!medName.trim() || !medTimes.length} onClick={addMed}>
              {L(W.addMed)}
            </Button>
          </div>
          <label className="flex items-start gap-3 rounded-2xl bg-warn-soft p-3.5 ring-1 ring-warn-line">
            <input type="checkbox" checked={d.ok} onChange={(e) => setD({ ...d, ok: e.target.checked })} className="mt-0.5 size-5 shrink-0 accent-[var(--warn)]" />
            <span className="text-[13px] font-semibold text-warn-ink">{L(W.prescribed)}</span>
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-[13px] font-semibold text-ink-2">{L(S.settings)}</p>
          <div>
            <p className="mb-1.5 text-[12px] text-muted">{L(S.channel)}</p>
            <Segmented<Channel | 'app'>
              value={d.channel}
              onChange={(v) => setD({ ...d, channel: v })}
              options={[
                { value: 'whatsapp', label: 'WhatsApp' },
                { value: 'sms', label: 'SMS' },
                { value: 'app', label: L(S.app) },
              ]}
            />
          </div>
          {d.channel !== 'app' && <PhoneInput value={d.phone} onChange={(v) => setD({ ...d, phone: v })} placeholder={L(W.phone)} />}
          <div>
            <p className="mb-1.5 text-[12px] text-muted">{L(S.msgLang)}</p>
            <Segmented<Lang> value={d.lang} onChange={(v) => setD({ ...d, lang: v })} options={(['en', 'fr', 'pcm'] as Lang[]).map((l) => ({ value: l, label: LANG_LABEL[l].name }))} />
          </div>
          <div>
            <p className="mb-1.5 text-[12px] text-muted">{L(S.escalateAfter)}</p>
            <Segmented<'30' | '60'> value={String(d.escalateAfter) as '30' | '60'} onChange={(v) => setD({ ...d, escalateAfter: v === '30' ? 30 : 60 })} options={[{ value: '30', label: `30 ${L(S.min)}` }, { value: '60', label: `60 ${L(S.min)}` }]} />
          </div>
        </div>
      )}
    </Sheet>
  );
}

const RELATIONS = ['Daughter', 'Son', 'Spouse', 'Sibling', 'Neighbour', 'Nurse', 'Other'];

function CaretakerSheet({ value, onClose }: { value: Caretaker | 'new' | null; onClose: () => void }) {
  const { L } = useLang();
  const editing = value && value !== 'new' ? value : null;
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('Daughter');
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const key = value === 'new' ? 'new' : editing?.id;
  useMemo(() => {
    setName(editing?.name ?? '');
    setRelation(editing?.relation ?? 'Daughter');
    setPhone(editing?.phone ?? '');
    setChannel(editing?.channel ?? 'whatsapp');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const valid = name.trim().length > 0 && (!phone || validCmPhone(phone));
  const save = () => {
    updatePlan((p) => {
      if (editing) return { ...p, caretakers: p.caretakers.map((c) => (c.id === editing.id ? { ...c, name: name.trim(), relation, phone, channel } : c)) };
      if (p.caretakers.length >= MAX_CARETAKERS) return p;
      return { ...p, caretakers: [...p.caretakers, { id: uid(), name: name.trim(), relation, phone, channel, status: 'invited', alerts: { missed: true, appointments: true, weekly: true } }] };
    });
    onClose();
  };
  return (
    <Sheet open={Boolean(value)} onClose={onClose} title={L(editing ? S.edit : S.addCaretaker)}>
      <div className="space-y-3.5 pb-2">
        <Input value={name} onChange={setName} placeholder="Name" />
        <div className="flex flex-wrap gap-1.5">
          {RELATIONS.map((r) => (
            <button key={r} onClick={() => setRelation(r)} className={cx('rounded-full px-3 py-1.5 text-[12.5px] font-semibold ring-1', relation === r ? 'bg-brand-600 text-white ring-brand-600' : 'bg-surface text-ink-2 ring-line')}>
              {r}
            </button>
          ))}
        </div>
        <Segmented<Channel> value={channel} onChange={setChannel} options={[{ value: 'whatsapp', label: 'WhatsApp' }, { value: 'sms', label: 'SMS' }]} />
        <PhoneInput value={phone} onChange={setPhone} placeholder="6XX XX XX XX" />
        <p className="text-[11.5px] leading-snug text-muted">They receive an invite and must reply YES before any alert is sent. They can stop at any time by replying STOP.</p>
        <div className="flex gap-2">
          {editing && (
            <Button
              variant="danger"
              icon={Trash2}
              onClick={() => {
                updatePlan((p) => ({ ...p, caretakers: p.caretakers.filter((c) => c.id !== editing.id) }));
                onClose();
              }}
            >
              {''}
            </Button>
          )}
          <Button block icon={Users} disabled={!valid} onClick={save}>
            {L(editing ? S.edit : S.addCaretaker)}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

const APPT_TITLES = ['Diabetes check-up', 'Blood pressure check-up', 'Stroke follow-up', 'Physiotherapy', 'Eye check (diabetes)', 'Lab tests'];

function AppointmentSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { L } = useLang();
  const [title, setTitle] = useState(APPT_TITLES[0]);
  const [place, setPlace] = useState(FACILITIES[0].name);
  const [at, setAt] = useState('');
  const [remind, setRemind] = useState<Appointment['remind']>(['1d', '2h']);
  const ms = at ? new Date(at).getTime() : NaN;
  const valid = title.trim() && place.trim() && !Number.isNaN(ms) && ms > Date.now();
  return (
    <Sheet open={open} onClose={onClose} title={L(S.addAppt)}>
      <div className="space-y-3.5 pb-2">
        <div className="flex flex-wrap gap-1.5">
          {APPT_TITLES.map((x) => (
            <button key={x} onClick={() => setTitle(x)} className={cx('rounded-full px-3 py-1.5 text-[12.5px] font-semibold ring-1', title === x ? 'bg-brand-600 text-white ring-brand-600' : 'bg-surface text-ink-2 ring-line')}>
              {x}
            </button>
          ))}
        </div>
        <Input value={title} onChange={setTitle} placeholder="Title" />
        <select value={place} onChange={(e) => setPlace(e.target.value)} className="h-12 w-full rounded-2xl bg-surface px-3.5 text-[15px] text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-500">
          {FACILITIES.map((f) => (
            <option key={f.id}>{f.name}</option>
          ))}
        </select>
        <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className="h-12 w-full rounded-2xl bg-surface px-3.5 text-[15px] text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-brand-500" />
        <div className="flex gap-2">
          {(['1d', '2h'] as const).map((r) => {
            const on = remind.includes(r);
            return (
              <button key={r} onClick={() => setRemind(on ? remind.filter((x) => x !== r) : [...remind, r])} className={cx('flex-1 rounded-2xl px-3 py-2.5 text-[13px] font-semibold ring-1', on ? 'bg-brand-600 text-white ring-brand-600' : 'bg-surface text-ink-2 ring-line')}>
                <CalendarClock className="mr-1.5 inline size-4" />
                {r === '1d' ? '1 day before' : '2 hours before'}
              </button>
            );
          })}
        </div>
        <Button
          block
          icon={Plus}
          disabled={!valid}
          onClick={() => {
            updatePlan((p) => ({ ...p, appointments: [...p.appointments, { id: uid(), title: title.trim(), place, at: ms, remind }] }));
            setAt('');
            onClose();
          }}
        >
          {L(S.addAppt)}
        </Button>
      </div>
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

function SectionHead({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-end justify-between gap-3 px-1">
      <div>
        <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h3>
        {sub && <p className="text-[12px] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function SmallAction({ icon: Icon, label, onClick }: { icon: typeof Plus; label: string; onClick: () => void }) {
  return (
    <button onClick={() => (haptic(), onClick())} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink-2 ring-1 ring-line active:scale-95">
      <Icon className="size-3.5" /> {label}
    </button>
  );
}

function ActionRow({ icon: Icon, title, sub, onClick, danger }: { icon: typeof Plus; title: string; sub?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={() => (haptic(), onClick())} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
      <Icon className={cx('size-[18px] shrink-0', danger ? 'text-danger' : 'text-ink-2')} />
      <span className="min-w-0 flex-1">
        <span className={cx('block text-[14px] font-semibold', danger ? 'text-danger-ink' : 'text-ink')}>{title}</span>
        {sub && <span className="block text-[12px] text-muted">{sub}</span>}
      </span>
      <ChevronRight className="size-4 text-muted" />
    </button>
  );
}

function Input({ value, onChange, placeholder, inputMode }: { value: string; onChange: (v: string) => void; placeholder: string; inputMode?: 'numeric' | 'tel' }) {
  return (
    <input
      value={value}
      inputMode={inputMode}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-12 w-full min-w-0 rounded-2xl bg-surface px-4 text-[15px] text-ink outline-none ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-brand-500"
    />
  );
}

function PhoneInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const bad = value && !validCmPhone(value);
  return (
    <div>
      <div className={cx('flex items-center rounded-2xl bg-surface ring-1 focus-within:ring-2 focus-within:ring-brand-500', bad ? 'ring-danger-line' : 'ring-line')}>
        <span className="flex items-center gap-1.5 border-r border-line px-3.5 py-3 text-[15px] font-medium text-muted">
          <Phone className="size-4" /> +237
        </span>
        <input
          inputMode="tel"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^\d ]/g, '').slice(0, 12))}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-[15px] tracking-wide text-ink outline-none placeholder:tracking-normal placeholder:text-muted"
        />
      </div>
    </div>
  );
}
