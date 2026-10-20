import { useState } from 'react';
import { BellRing, ChevronRight, Cpu, Download, FlaskConical, Info, Presentation, Printer, RotateCcw, Smartphone, Store, TrendingUp } from 'lucide-react';
import type { Lang } from '../core/types';
import { LANG_LABEL, t, useLang } from '../i18n';
import { navigate } from '../lib/router';
import { resetDemo, setState, uid, useStore } from '../state/store';
import { useInstall } from '../lib/hooks';
import { askPermission, notify } from '../lib/reminders';
import { buildDoses, REGIMENS } from '../core/course';
import { Sheet, useToast } from '../ui/overlay';
import { cx, haptic, Segmented } from '../ui/primitives';

const S = {
  title: t('Settings', 'Réglages', 'Settings'),
  language: t('Language', 'Langue', 'Language'),
  theme: t('Appearance', 'Apparence', 'How e go look'),
  system: t('Auto', 'Auto', 'Auto'),
  light: t('Light', 'Clair', 'Light'),
  dark: t('Dark', 'Sombre', 'Dark'),
  install: t('Install MediMate', 'Installer MediMate', 'Install MediMate'),
  installIos: t('In Safari: Share → Add to Home Screen', 'Dans Safari : Partager → Sur l’écran d’accueil', 'For Safari: Share → Add to Home Screen'),
  installed: t('Installed', 'Installée', 'E don install'),
  pharmacy: t('For pharmacies', 'Pour les pharmacies', 'For pharmacy'),
  why: t('Why it matters', 'Pourquoi c’est important', 'Why e matter'),
  about: t('How it works, sources & business model', 'Fonctionnement, sources et modèle', 'How e dey work, sources and business'),
  ussd: t('Feature-phone mode (*237*90#)', 'Mode téléphone simple (*237*90#)', 'Small-phone mode (*237*90#)'),
  presenter: t('Presenter tools', 'Outils de démo', 'Presenter tools'),
  demoCourse: t('Start a demo course (dose 3 due now)', 'Lancer un traitement de démo (prise 3 maintenant)', 'Start demo treatment (dose 3 now)'),
  testReminder: t('Send a test reminder', 'Envoyer un rappel test', 'Send test reminder'),
  packs: t('Print demo medicine packs', 'Imprimer les boîtes de démo', 'Print demo medicine pack'),
  reset: t('Reset all demo data', 'Réinitialiser les données de démo', 'Reset all demo data'),
  resetDone: t('Demo data reset', 'Données réinitialisées', 'Demo data don reset'),
  courseDone: t('Demo course started — open Course', 'Traitement de démo lancé — voir Traitement', 'Demo treatment don start — open Treatment'),
  blocked: t('Notifications are blocked in this browser.', 'Notifications bloquées dans ce navigateur.', 'Notification don block for dis browser.'),
  version: t('Prototype v1.0 · data stays on this phone', 'Prototype v1.0 · les données restent sur ce téléphone', 'Prototype v1.0 · data dey stay for dis phone'),
};

export default function SettingsSheet({ open, onClose, onUssd }: { open: boolean; onClose: () => void; onUssd: () => void }) {
  const { lang, L } = useLang();
  const theme = useStore((s) => s.theme);
  const toast = useToast();
  const { canPrompt, standalone, ios, install } = useInstall();
  const [presenter, setPresenter] = useState(false);

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  const demoCourse = () => {
    const start = Date.now() - 24 * 3600000 - 20 * 60000; // dose 3 (24 h) is due right now
    const doses = buildDoses(start, REGIMENS.al6.offsets).map((d, i) => (i < 2 ? { ...d, taken: d.due + 10 * 60000 } : d));
    setState((s) => ({
      courses: [{ id: uid(), medId: 'al', medName: 'Coartem', amount: '4 tablets with milk', regimen: 'al6' as const, doses, createdAt: start, prescribedBy: 'demo' }, ...s.courses.filter((c) => c.completedAt)],
    }));
    toast(L(S.courseDone));
    go('/course');
  };

  return (
    <Sheet open={open} onClose={onClose} title={L(S.title)}>
      <div className="space-y-5 pb-3">
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink-2">{L(S.language)}</p>
          <Segmented<Lang> value={lang} onChange={(v) => setState({ lang: v })} options={(['en', 'fr', 'pcm'] as Lang[]).map((l) => ({ value: l, label: LANG_LABEL[l].name }))} />
        </div>
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink-2">{L(S.theme)}</p>
          <Segmented<'system' | 'light' | 'dark'>
            value={theme}
            onChange={(v) => setState({ theme: v })}
            options={[
              { value: 'system', label: L(S.system) },
              { value: 'light', label: L(S.light) },
              { value: 'dark', label: L(S.dark) },
            ]}
          />
        </div>

        <div className="divide-y divide-line overflow-hidden rounded-[22px] bg-surface ring-1 ring-line">
          {!standalone && (canPrompt || ios) && (
            <Row icon={Download} label={L(S.install)} sub={ios && !canPrompt ? L(S.installIos) : undefined} onClick={() => void install()} />
          )}
          {standalone && <Row icon={Download} label={L(S.installed)} />}
          <Row icon={TrendingUp} label={L(S.why)} onClick={() => go('/why')} />
          <Row icon={Info} label={L(S.about)} onClick={() => go('/about')} />
          <Row icon={Store} label={L(S.pharmacy)} onClick={() => go('/pharmacy')} />
          <Row
            icon={Smartphone}
            label={L(S.ussd)}
            onClick={() => {
              onClose();
              window.setTimeout(onUssd, 260);
            }}
          />
        </div>

        <div>
          <button onClick={() => setPresenter((p) => !p)} className="flex w-full items-center gap-2 px-1 text-[13px] font-semibold text-muted">
            <Presentation className="size-4" /> {L(S.presenter)}
            <ChevronRight className={cx('ml-auto size-4 transition', presenter && 'rotate-90')} />
          </button>
          {presenter && (
            <div className="mt-2 divide-y divide-line overflow-hidden rounded-[22px] bg-surface ring-1 ring-line">
              <Row icon={FlaskConical} label={L(S.demoCourse)} onClick={demoCourse} />
              <Row
                icon={BellRing}
                label={L(S.testReminder)}
                onClick={async () => {
                  const p = await askPermission();
                  if (p !== 'granted') return toast(L(S.blocked));
                  setState({ notify: true });
                  void notify(lang === 'fr' ? 'C’est l’heure de votre médicament' : 'Time for your medicine', 'Coartem — dose 3 of 6. Take it with milk or food.');
                }}
              />
              <Row icon={Printer} label={L(S.packs)} onClick={() => window.open('/packs', '_blank')} />
              <Row icon={Cpu} label="Engine safety tests: 84/84 ✓" />
              <Row
                icon={RotateCcw}
                label={L(S.reset)}
                danger
                onClick={() => {
                  resetDemo();
                  toast(L(S.resetDone));
                }}
              />
            </div>
          )}
        </div>
        <p className="text-center text-[11.5px] text-muted">{L(S.version)}</p>
      </div>
    </Sheet>
  );
}

function Row({ icon: Icon, label, sub, onClick, danger }: { icon: typeof Cpu; label: string; sub?: string; onClick?: () => void; danger?: boolean }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick ? () => (haptic(), onClick()) : undefined} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
      <Icon className={cx('size-[18px] shrink-0', danger ? 'text-danger' : 'text-ink-2')} />
      <span className="min-w-0 flex-1">
        <span className={cx('block text-[14px] font-medium', danger ? 'text-danger-ink' : 'text-ink')}>{label}</span>
        {sub && <span className="block text-[12px] text-muted">{sub}</span>}
      </span>
      {onClick && <ChevronRight className="size-4 text-muted" />}
    </Comp>
  );
}
