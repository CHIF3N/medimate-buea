import { useEffect } from 'react';
import type { Course } from '../core/course';
import { useStore } from '../state/store';

// In-browser reminders fire while MediMate is open or recently backgrounded.
// For guaranteed alarms with no data, the Course screen exports doses to the phone calendar (.ics).

export async function notify(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: title });
    } else {
      new Notification(title, { body, icon: '/icons/icon-192.png' });
    }
    return true;
  } catch {
    return false;
  }
}

export async function askPermission() {
  if (!('Notification' in window)) return 'unsupported' as const;
  if (Notification.permission === 'granted') return 'granted' as const;
  return (await Notification.requestPermission()) as NotificationPermission;
}

export function useDoseReminders(lines: (c: Course, i: number) => { title: string; body: string }) {
  const courses = useStore((s) => s.courses);
  const enabled = useStore((s) => s.notify);
  useEffect(() => {
    if (!enabled) return;
    const timers: number[] = [];
    const now = Date.now();
    for (const c of courses) {
      if (c.completedAt) continue;
      c.doses.forEach((d, i) => {
        const wait = d.due - now;
        if (d.taken || wait < 0 || wait > 24 * 3600000) return;
        timers.push(
          window.setTimeout(() => {
            const { title, body } = lines(c, i);
            void notify(title, body);
          }, wait),
        );
      });
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [courses, enabled, lines]);
}
