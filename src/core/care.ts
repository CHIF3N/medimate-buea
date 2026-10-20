// Care plans for long-term conditions (stroke, diabetes, high blood pressure…):
// daily medicines at fixed times, doctor's appointments, and up to two caretakers who are
// alerted on WhatsApp or SMS when a dose is not confirmed. MediMate only schedules what a
// clinician prescribed — the amount always comes from the prescription.

import type { L10n, Lang } from './types';

const t = (en: string, fr: string, pcm: string): L10n => ({ en, fr, pcm });

export type Condition = 'stroke' | 'diabetes' | 'hypertension' | 'heart' | 'epilepsy' | 'hiv' | 'asthma' | 'other';
export type Channel = 'whatsapp' | 'sms';

export interface CareMed {
  id: string;
  name: string;
  amount: string;
  times: string[]; // "HH:MM", local time
}

export interface Appointment {
  id: string;
  title: string;
  place: string;
  at: number;
  remind: ('1d' | '2h')[];
}

export interface Caretaker {
  id: string;
  name: string;
  relation: string;
  phone: string;
  channel: Channel;
  status: 'invited' | 'paired';
  alerts: { missed: boolean; appointments: boolean; weekly: boolean };
}

export interface CareAlert {
  at: number;
  to: string; // caretaker id or 'patient'
  kind: 'reminder' | 'missed' | 'appointment' | 'invite' | 'test' | 'weekly';
  channel: Channel | 'app';
  text: string;
  simulated: boolean;
}

export interface CarePlan {
  patient: { name: string; age?: number; phone: string; channel: Channel | 'app'; lang: Lang };
  conditions: Condition[];
  meds: CareMed[];
  appointments: Appointment[];
  caretakers: Caretaker[];
  escalateAfter: 30 | 60;
  /** Dose log: "YYYY-MM-DD|medId|HH:MM" → time confirmed. */
  log: Record<string, number>;
  alerts: CareAlert[];
  createdAt: number;
  demo?: boolean;
}

export const MAX_CARETAKERS = 2;

export const CONDITION_LABEL: Record<Condition, L10n> = {
  stroke: t('After a stroke', 'Après un AVC', 'After stroke'),
  diabetes: t('Diabetes', 'Diabète', 'Sugar (diabetes)'),
  hypertension: t('High blood pressure', 'Hypertension', 'High BP'),
  heart: t('Heart failure', 'Insuffisance cardiaque', 'Heart problem'),
  epilepsy: t('Epilepsy', 'Épilepsie', 'Epilepsy'),
  hiv: t('HIV (ART)', 'VIH (ARV)', 'HIV (ART)'),
  asthma: t('Asthma', 'Asthme', 'Asthma'),
  other: t('Other', 'Autre', 'Other'),
};

/** What caretakers should watch for — short, standard first-response guidance. */
export const CONDITION_TIPS: Partial<Record<Condition, { title: L10n; points: L10n[] }>> = {
  stroke: {
    title: t('Watch for a new stroke: BE-FAST', 'Repérer un nouvel AVC : BE-FAST', 'Watch for new stroke: BE-FAST'),
    points: [
      t(
        'Balance lost, Eyes (sudden vision loss), Face drooping, Arm or leg weak on one side, Speech slurred — Time: call 119 and go to hospital now.',
        'Équilibre perdu, Yeux (perte de vision brutale), Visage qui tombe, Bras ou jambe faible d’un côté, Parole troublée — Temps : appelez le 119 et allez à l’hôpital.',
        'Balance don go, Eye no dey see sudden, Face don fall one side, Hand or foot weak one side, Talk no clear — Time: call 119, go hospital now now.',
      ),
      t('Never stop blood-thinning medicines (aspirin, clopidogrel) without the doctor.', 'Ne jamais arrêter les fluidifiants (aspirine, clopidogrel) sans le médecin.', 'No ever stop blood-thinner medicine (aspirin, clopidogrel) without doctor.'),
    ],
  },
  diabetes: {
    title: t('Low sugar (hypo): act fast', 'Hypoglycémie : agir vite', 'Sugar don go down (hypo): act quick'),
    points: [
      t(
        'Sweating, shaking, confusion, fast heartbeat: give sugar, a sweet drink or juice, then food. If they cannot swallow or don’t improve in 15 minutes, call 119.',
        'Sueurs, tremblements, confusion, cœur rapide : donnez du sucre ou une boisson sucrée, puis à manger. S’il ne peut pas avaler ou ne va pas mieux en 15 minutes, appelez le 119.',
        'Sweat, body dey shake, confusion, heart dey beat fast: give sugar or sweet drink, then food. If e no fit swallow or e no better for 15 minutes, call 119.',
      ),
      t('Don’t skip meals when taking diabetes medicines or insulin. Check the feet daily for wounds.', 'Pas de repas sauté sous traitement du diabète ou insuline. Vérifiez les pieds chaque jour.', 'No skip food when you dey take sugar medicine or insulin. Check foot every day for wound.'),
    ],
  },
  hypertension: {
    title: t('Blood pressure: every day, even when well', 'Tension : chaque jour, même en forme', 'BP medicine: every day, even when you feel fine'),
    points: [
      t('High blood pressure has no symptoms — stopping medicines can cause a stroke.', 'L’hypertension ne se sent pas — arrêter le traitement peut causer un AVC.', 'High BP no dey show sign — if you stop medicine, e fit cause stroke.'),
      t('Severe headache, chest pain, or weakness on one side: call 119.', 'Mal de tête violent, douleur thoracique ou faiblesse d’un côté : appelez le 119.', 'Strong head pain, chest pain, or one side weak: call 119.'),
    ],
  },
  heart: {
    title: t('Heart failure: weigh daily', 'Insuffisance cardiaque : pesée quotidienne', 'Heart problem: check weight every day'),
    points: [
      t('Sudden weight gain, swollen legs, or breathlessness lying flat: see a clinician today.', 'Prise de poids rapide, jambes gonflées ou essoufflement couché : consultez aujourd’hui.', 'Weight wey jump sudden, foot wey swell, or breath tie when you lie down: see doctor today.'),
    ],
  },
  epilepsy: {
    title: t('Epilepsy: never stop suddenly', 'Épilepsie : ne jamais arrêter brutalement', 'Epilepsy: no stop medicine sudden'),
    points: [t('A seizure lasting over 5 minutes, or repeated seizures: call 119.', 'Crise de plus de 5 minutes ou crises répétées : appelez le 119.', 'Convulsion wey pass 5 minutes, or e dey repeat: call 119.')],
  },
  hiv: {
    title: t('ART: same time every day', 'ARV : même heure chaque jour', 'ART: same time every day'),
    points: [t('Missing doses lets the virus become resistant. Never stop without the clinic.', 'Oublier des prises rend le virus résistant. Jamais d’arrêt sans le centre.', 'If you dey forget dose, virus go resist medicine. No ever stop without clinic.')],
  },
  asthma: {
    title: t('Asthma: reliever always nearby', 'Asthme : inhalateur toujours à portée', 'Asthma: pump always near'),
    points: [t('Breathless and unable to speak full sentences, or blue lips: call 119.', 'Essoufflé sans pouvoir finir ses phrases, ou lèvres bleues : appelez le 119.', 'Breath tie and e no fit finish talk, or lip don blue: call 119.')],
  },
};

/** Common long-term medicines (names only — schedule as prescribed). */
export const CHRONIC_MEDS = [
  'Metformin',
  'Glibenclamide',
  'Insulin',
  'Amlodipine',
  'Nifedipine',
  'Hydrochlorothiazide',
  'Lisinopril',
  'Aspirin (low dose)',
  'Clopidogrel',
  'Atorvastatin',
  'Furosemide',
  'Carbamazepine',
  'TLD (ART)',
];

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function atTime(base: Date, hhmm: string): number {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export type SlotState = 'taken' | 'upcoming' | 'due' | 'late' | 'partial';

export interface Slot {
  time: string;
  due: number;
  meds: CareMed[];
  taken: CareMed[];
  state: SlotState;
  /** When caretakers get alerted if still not confirmed. */
  escalateAt: number;
}

/** Today's dose times, each grouping every medicine due at that time. */
export function todaySlots(plan: CarePlan, now = Date.now()): Slot[] {
  const today = new Date(now);
  const key = dayKey(today);
  const times = [...new Set(plan.meds.flatMap((m) => m.times))].sort();
  return times.map((time) => {
    const due = atTime(today, time);
    const meds = plan.meds.filter((m) => m.times.includes(time));
    const taken = meds.filter((m) => plan.log[`${key}|${m.id}|${time}`]);
    const escalateAt = due + plan.escalateAfter * 60000;
    const state: SlotState =
      taken.length === meds.length ? 'taken' : now < due - 3600000 ? 'upcoming' : now < escalateAt ? (taken.length ? 'partial' : 'due') : 'late';
    return { time, due, meds, taken, state, escalateAt };
  });
}

export function todayProgress(plan: CarePlan, now = Date.now()) {
  const slots = todaySlots(plan, now);
  const total = slots.reduce((n, s) => n + s.meds.length, 0);
  const taken = slots.reduce((n, s) => n + s.taken.length, 0);
  return { total, taken };
}

/** Days in a row (before today) with every dose confirmed. */
export function streak(plan: CarePlan, now = Date.now()): number {
  let n = 0;
  for (let i = 1; i < 365; i++) {
    const d = new Date(now - i * 86400000);
    if (d.getTime() < plan.createdAt - 86400000) break;
    const key = dayKey(d);
    const all = plan.meds.every((m) => m.times.every((tm) => plan.log[`${key}|${m.id}|${tm}`]));
    if (!all) break;
    n++;
  }
  return n;
}

export const nextAppointment = (plan: CarePlan, now = Date.now()) =>
  [...plan.appointments].filter((a) => a.at > now - 3600000).sort((a, b) => a.at - b.at)[0];

// ---------------------------------------------------------------------------
// Messages (WhatsApp / SMS). Kept short so SMS fits in one or two segments.
// ---------------------------------------------------------------------------

const medList = (meds: CareMed[]) => meds.map((m) => (m.amount ? `${m.name} ${m.amount}` : m.name)).join(', ');
const when = (ms: number, lang: Lang) =>
  new Date(ms).toLocaleString(lang === 'fr' ? 'fr-CM' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function reminderText(plan: CarePlan, slot: Slot, lang: Lang): string {
  const n = plan.patient.name;
  const meds = medList(slot.meds);
  if (lang === 'fr') return `MediMate : ${n}, c’est l’heure de vos médicaments de ${slot.time} : ${meds}. Répondez 1 quand c’est pris.`;
  if (lang === 'pcm') return `MediMate: ${n}, time don reach for your ${slot.time} medicine: ${meds}. Reply 1 when you don take am.`;
  return `MediMate: ${n}, it's time for your ${slot.time} medicines: ${meds}. Reply 1 when taken.`;
}

export function missedText(plan: CarePlan, slot: Slot, c: Caretaker, lang: Lang): string {
  const n = plan.patient.name;
  const meds = slot.meds.map((m) => m.name).join(', ');
  if (lang === 'fr') return `Alerte MediMate pour ${c.name} : ${n} n’a pas confirmé ses médicaments de ${slot.time} (${meds}). Merci de l’appeler ou de passer la voir.`;
  if (lang === 'pcm') return `MediMate alert for ${c.name}: ${n} never confirm say e don take e ${slot.time} medicine (${meds}). Abeg call am or go check am.`;
  return `MediMate alert for ${c.name}: ${n} hasn't confirmed the ${slot.time} medicines (${meds}). Please call or check on them.`;
}

export function appointmentText(plan: CarePlan, a: Appointment, lang: Lang): string {
  const n = plan.patient.name;
  if (lang === 'fr') return `Rappel MediMate : ${n} — ${a.title}, ${a.place}, ${when(a.at, lang)}. Apportez les médicaments et le carnet.`;
  if (lang === 'pcm') return `MediMate reminder: ${n} — ${a.title} for ${a.place}, ${when(a.at, lang)}. Carry all di medicine and clinic book.`;
  return `MediMate reminder: ${n} — ${a.title} at ${a.place}, ${when(a.at, lang)}. Bring all medicines and the clinic book.`;
}

export function inviteText(plan: CarePlan, c: Caretaker, code: string, lang: Lang, url: string): string {
  const n = plan.patient.name;
  if (lang === 'fr') return `Bonjour ${c.name}, ${n} vous a ajouté comme proche aidant sur MediMate. Vous serez prévenu(e) si une prise est oubliée ou avant un rendez-vous médical. Répondez OUI pour accepter. Code : ${code}. ${url}`;
  if (lang === 'pcm') return `Hello ${c.name}, ${n} don add you as e care person for MediMate. We go message you if e forget e medicine or before e doctor appointment. Reply YES to accept. Code: ${code}. ${url}`;
  return `Hello ${c.name}, ${n} added you as a care contact on MediMate. You'll get a message if a dose is missed or before a doctor's appointment. Reply YES to accept. Code: ${code}. ${url}`;
}

export function weeklyText(plan: CarePlan, lang: Lang, now = Date.now()): string {
  let total = 0;
  let taken = 0;
  for (let i = 1; i <= 7; i++) {
    const key = dayKey(new Date(now - i * 86400000));
    plan.meds.forEach((m) =>
      m.times.forEach((tm) => {
        total++;
        if (plan.log[`${key}|${m.id}|${tm}`]) taken++;
      }),
    );
  }
  const pct = total ? Math.round((taken / total) * 100) : 0;
  const a = nextAppointment(plan, now);
  const next = a ? ` ${lang === 'fr' ? 'Prochain rendez-vous' : lang === 'pcm' ? 'Next appointment' : 'Next appointment'}: ${when(a.at, lang)}, ${a.place}.` : '';
  if (lang === 'fr') return `MediMate, bilan de la semaine : ${plan.patient.name} a pris ${taken} doses sur ${total} (${pct} %).${next}`;
  if (lang === 'pcm') return `MediMate weekly: ${plan.patient.name} take ${taken} dose out of ${total} (${pct}%).${next}`;
  return `MediMate weekly: ${plan.patient.name} took ${taken} of ${total} doses (${pct}%).${next}`;
}

// ---------------------------------------------------------------------------
// Deep links — open the phone's own WhatsApp / SMS app with the message ready to send.
// ---------------------------------------------------------------------------

export const cleanPhone = (p: string) => p.replace(/\D/g, '').replace(/^237/, '');
export const validCmPhone = (p: string) => /^6\d{8}$/.test(cleanPhone(p));

export function messageLink(channel: Channel, phone: string, text: string): string {
  const n = cleanPhone(phone);
  if (channel === 'whatsapp') return n ? `https://wa.me/237${n}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
  return `sms:${n ? `+237${n}` : ''}?&body=${encodeURIComponent(text)}`;
}

// ---------------------------------------------------------------------------
// Calendar: one repeating event per dose time + appointment alarms — rings offline.
// ---------------------------------------------------------------------------

const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const floating = (ms: number) => {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
};

export function carePlanToIcs(plan: CarePlan, lang: Lang, now = Date.now()): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MediMate//Care plan//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  todaySlots(plan, now).forEach((slot) => {
    const text = reminderText(plan, slot, lang);
    lines.push(
      'BEGIN:VEVENT',
      `UID:care-${slot.time.replace(':', '')}@medimate`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${floating(slot.due)}`,
      `DTEND:${floating(slot.due + 10 * 60000)}`,
      'RRULE:FREQ=DAILY',
      `SUMMARY:${icsText(`💊 ${slot.time} — ${slot.meds.map((m) => m.name).join(', ')}`)}`,
      `DESCRIPTION:${icsText(text)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsText(text)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    );
  });
  plan.appointments
    .filter((a) => a.at > now)
    .forEach((a) => {
      lines.push(
        'BEGIN:VEVENT',
        `UID:appt-${a.id}@medimate`,
        `DTSTAMP:${stamp}`,
        `DTSTART:${floating(a.at)}`,
        `DTEND:${floating(a.at + 3600000)}`,
        `SUMMARY:${icsText(`🩺 ${a.title}`)}`,
        `LOCATION:${icsText(a.place)}`,
        `DESCRIPTION:${icsText(appointmentText(plan, a, lang))}`,
      );
      if (a.remind.includes('1d')) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(a.title)}`, 'TRIGGER:-P1D', 'END:VALARM');
      if (a.remind.includes('2h')) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(a.title)}`, 'TRIGGER:-PT2H', 'END:VALARM');
      lines.push('END:VEVENT');
    });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// ---------------------------------------------------------------------------
// Demo plan for presentations: Mama Grace, 68 — after a stroke, with diabetes and high blood pressure.
// ---------------------------------------------------------------------------

export function demoPlan(now = Date.now()): CarePlan {
  const meds: CareMed[] = [
    { id: 'm1', name: 'Metformin', amount: '500 mg', times: ['08:00', '20:00'] },
    { id: 'm2', name: 'Amlodipine', amount: '5 mg', times: ['08:00'] },
    { id: 'm3', name: 'Aspirin (low dose)', amount: '75 mg', times: ['08:00'] },
    { id: 'm4', name: 'Atorvastatin', amount: '20 mg', times: ['20:00'] },
  ];
  const log: Record<string, number> = {};
  // Past 9 days fully taken (a streak), plus whatever is already due today.
  for (let i = 1; i <= 9; i++) {
    const d = new Date(now - i * 86400000);
    meds.forEach((m) => m.times.forEach((tm) => (log[`${dayKey(d)}|${m.id}|${tm}`] = atTime(d, tm) + 6 * 60000)));
  }
  const today = new Date(now);
  meds.forEach((m) =>
    m.times.forEach((tm) => {
      const due = atTime(today, tm);
      if (due + 15 * 60000 < now && tm === '08:00') log[`${dayKey(today)}|${m.id}|${tm}`] = due + 9 * 60000;
    }),
  );
  const inDays = (n: number, hh: number) => {
    const d = new Date(now + n * 86400000);
    d.setHours(hh, 0, 0, 0);
    return d.getTime();
  };
  return {
    patient: { name: 'Mama Grace', age: 68, phone: '', channel: 'whatsapp', lang: 'pcm' },
    conditions: ['stroke', 'diabetes', 'hypertension'],
    meds,
    appointments: [
      { id: 'a1', title: 'Diabetes & BP check-up', place: 'Buea Regional Hospital', at: inDays(3, 9), remind: ['1d', '2h'] },
      { id: 'a2', title: 'Stroke physiotherapy', place: 'Buea Regional Hospital', at: inDays(8, 10), remind: ['1d'] },
    ],
    caretakers: [
      { id: 'c1', name: 'Brenda', relation: 'Daughter', phone: '', channel: 'whatsapp', status: 'paired', alerts: { missed: true, appointments: true, weekly: true } },
      { id: 'c2', name: 'Emmanuel', relation: 'Son', phone: '', channel: 'sms', status: 'invited', alerts: { missed: true, appointments: true, weekly: false } },
    ],
    escalateAfter: 30,
    log,
    alerts: [],
    createdAt: now - 10 * 86400000,
    demo: true,
  };
}
