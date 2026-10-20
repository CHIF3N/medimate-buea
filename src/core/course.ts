// Treatment-course schedules and calendar export. The tracker supports courses that a health worker
// prescribed or dispensed — it times the doses, it never decides how many tablets to take.

import type { L10n, RegimenId } from './types';

const t = (en: string, fr: string, pcm: string): L10n => ({ en, fr, pcm });

export interface Regimen {
  id: RegimenId;
  label: L10n;
  /** Hours after the first dose for each dose. */
  offsets: number[];
  editable: boolean;
}

const everyHours = (interval: number, days: number) =>
  Array.from({ length: Math.round((days * 24) / interval) }, (_, i) => i * interval);

export const REGIMENS: Record<RegimenId, Regimen> = {
  al6: { id: 'al6', label: t('6 doses over 3 days (0, 8, 24, 36, 48, 60 h)', '6 prises sur 3 jours (0, 8, 24, 36, 48, 60 h)', '6 dose for 3 days (0, 8, 24, 36, 48, 60 h)'), offsets: [0, 8, 24, 36, 48, 60], editable: false },
  asaq3: { id: 'asaq3', label: t('Once a day for 3 days', 'Une fois par jour pendant 3 jours', 'One time every day for 3 days'), offsets: [0, 24, 48], editable: false },
  abx: { id: 'abx', label: t('As prescribed', 'Selon l’ordonnance', 'As doctor write am'), offsets: everyHours(8, 5), editable: true },
  zinc: { id: 'zinc', label: t('Once a day for 10 days', 'Une fois par jour pendant 10 jours', 'One time every day for 10 days'), offsets: everyHours(24, 10), editable: true },
  daily: { id: 'daily', label: t('Once a day', 'Une fois par jour', 'One time every day'), offsets: everyHours(24, 30), editable: true },
};

export function customOffsets(timesPerDay: number, days: number): number[] {
  return everyHours(24 / timesPerDay, days);
}

export interface Dose {
  due: number; // epoch ms
  taken?: number;
}

export interface Course {
  id: string;
  medId: string;
  medName: string;
  amount: string;
  regimen: RegimenId;
  doses: Dose[];
  createdAt: number;
  completedAt?: number;
  prescribedBy?: string;
}

export function buildDoses(start: number, offsets: number[]): Dose[] {
  return offsets.map((h) => ({ due: start + h * 3600000 }));
}

export type DoseState = 'taken' | 'due' | 'late' | 'missed' | 'upcoming';

/** "due" opens 1 hour before the dose time; "late" after 2 hours; "missed" once the next dose is due. */
export function doseState(course: Course, i: number, now = Date.now()): DoseState {
  const d = course.doses[i];
  if (d.taken) return 'taken';
  const next = course.doses[i + 1];
  if (next && now >= next.due - 3600000) return 'missed';
  if (now >= d.due + 2 * 3600000) return 'late';
  if (now >= d.due - 3600000) return 'due';
  return 'upcoming';
}

export function nextDoseIndex(course: Course, now = Date.now()): number {
  // The first dose that is neither taken nor already missed.
  return course.doses.findIndex((_, i) => {
    const s = doseState(course, i, now);
    return s !== 'taken' && s !== 'missed';
  });
}

export const takenCount = (c: Course) => c.doses.filter((d) => d.taken).length;

export function relTime(ms: number, lang: 'en' | 'fr' | 'pcm'): string {
  const mins = Math.round(ms / 60000);
  const abs = Math.abs(mins);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const span = h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`;
  if (abs < 1) return lang === 'fr' ? 'maintenant' : 'now';
  if (mins > 0) return lang === 'fr' ? `dans ${span}` : lang === 'pcm' ? `for ${span}` : `in ${span}`;
  return lang === 'fr' ? `il y a ${span}` : lang === 'pcm' ? `${span} don pass` : `${span} ago`;
}

export function clock(ms: number, lang: 'en' | 'fr' | 'pcm'): string {
  return new Date(ms).toLocaleTimeString(lang === 'fr' ? 'fr-CM' : 'en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function dayLabel(ms: number, lang: 'en' | 'fr' | 'pcm', now = Date.now()): string {
  const d = new Date(ms);
  const today = new Date(now);
  const diff = Math.round((new Date(d.toDateString()).getTime() - new Date(today.toDateString()).getTime()) / 86400000);
  if (diff === 0) return lang === 'fr' ? 'Aujourd’hui' : lang === 'pcm' ? 'Today' : 'Today';
  if (diff === 1) return lang === 'fr' ? 'Demain' : lang === 'pcm' ? 'Tomorrow' : 'Tomorrow';
  if (diff === -1) return lang === 'fr' ? 'Hier' : lang === 'pcm' ? 'Yesterday' : 'Yesterday';
  return d.toLocaleDateString(lang === 'fr' ? 'fr-CM' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ---------------------------------------------------------------------------
// Calendar (.ics) export — phone calendars fire these alarms offline, even with no data.
// ---------------------------------------------------------------------------

const icsDate = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

export function courseToIcs(course: Course, note: string): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MediMate//Course reminders//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  course.doses.forEach((d, i) => {
    if (d.taken) return;
    const summary = `${course.medName} — dose ${i + 1} of ${course.doses.length}`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${course.id}-${i}@medimate`,
      `DTSTAMP:${icsDate(Date.now())}`,
      `DTSTART:${icsDate(d.due)}`,
      `DTEND:${icsDate(d.due + 15 * 60000)}`,
      `SUMMARY:${icsText(summary)}`,
      `DESCRIPTION:${icsText(`${course.amount ? `${course.amount}. ` : ''}${note}`)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsText(summary)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
