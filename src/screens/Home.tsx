import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, BadgeCheck, ChevronRight, Download, MapPin, Mic, Moon, Phone, Pill, ScanLine, Siren, Smartphone, Sparkles, Store, type LucideIcon } from 'lucide-react';
import { navigate } from '../lib/router';
import { C, t, useLang } from '../i18n';
import { setState, useStore } from '../state/store';
import { useInstall, useNow } from '../lib/hooks';
import { clock, dayLabel, doseState, nextDoseIndex, relTime, takenCount } from '../core/course';
import { DEFAULT_ORIGIN, PARTNERS, formatKm, hoursLabel, onDutyToday, roadKm } from '../data/places';
import { Button, Card, cx, ProgressRing, SectionTitle } from '../ui/primitives';
import { useApp } from '../ui/app-context';
import { useToast } from '../ui/overlay';
import type { L10n } from '../core/types';

const S = {
  morning: t('Good morning', 'Bonjour', 'Good morning'),
  afternoon: t('Good afternoon', 'Bon après-midi', 'Good afternoon'),
  evening: t('Good evening', 'Bonsoir', 'Good evening'),
  hero1: t('Safe medicine,', 'Le bon médicament,', 'Correct medicine,'),
  hero2: t('from purchase to the last dose.', 'de l’achat à la dernière dose.', 'from buying reach last dose.'),
  askLabel: t('Ask about any medicine…', 'Une question sur un médicament…', 'Ask about any medicine…'),
  yourCourse: t('Your treatment', 'Votre traitement', 'Your treatment'),
  doseOf: t('Dose {n} of {total}', 'Prise {n} sur {total}', 'Dose {n} of {total}'),
  takeNow: t('Take it now', 'À prendre maintenant', 'Take am now'),
  open: t('Open', 'Ouvrir', 'Open'),
  actions: t('What do you need?', 'De quoi avez-vous besoin ?', 'Wetin you need?'),
  askT: t('Ask', 'Demander', 'Ask'),
  askD: t('In English, French or Pidgin', 'En anglais, français ou pidgin', 'For English, French or Pidgin'),
  findT: t('Find', 'Trouver', 'Find'),
  findD: t('Who has it in stock now', 'Qui l’a en stock maintenant', 'Who get am now'),
  verifyT: t('Check a pack', 'Vérifier une boîte', 'Check pack'),
  verifyD: t('Genuine, in date, not recalled', 'Authentique, non périmée', 'Original, never expire'),
  courseT: t('Finish the course', 'Finir le traitement', 'Finish treatment'),
  courseD: t('Reminders for every dose', 'Un rappel pour chaque prise', 'Reminder for every dose'),
  emergency: t('Emergency? Call 119', 'Urgence ? Appelez le 119', 'Emergency? Call 119'),
  emergencySub: t('Ambulance numbers and nearest hospitals', 'Numéros d’urgence et hôpitaux proches', 'Ambulance number and hospital wey near'),
  duty: t('On duty tonight', 'De garde ce soir', 'Pharmacy for night duty'),
  dutySub: t('Pharmacie de garde · open all night', 'Pharmacie de garde · ouverte toute la nuit', 'Pharmacie de garde · e open whole night'),
  facts: t('Why it matters', 'Pourquoi c’est important', 'Why e matter'),
  ussdT: t('No smartphone? Dial *237*90#', 'Pas de smartphone ? Composez *237*90#', 'No get smartphone? Dial *237*90#'),
  ussdD: t('Try the feature-phone version — no internet needed.', 'Essayez la version téléphone simple — sans internet.', 'Try di small-phone version — no need internet.'),
  pharmT: t('Are you a pharmacist?', 'Vous êtes pharmacien·ne ?', 'You be pharmacist?'),
  pharmD: t('Update your stock in two taps and get found by patients nearby.', 'Mettez à jour votre stock en deux gestes et soyez trouvé par les patients.', 'Update your stock with two tap and make patients wey near find you.'),
  installT: t('Install MediMate', 'Installer MediMate', 'Install MediMate'),
  installD: t('Opens like an app and works with no network.', 'S’ouvre comme une appli et marche sans réseau.', 'E go open like app and e dey work without network.'),
  installIos: t('Tap Share, then “Add to Home Screen”.', 'Touchez Partager, puis « Sur l’écran d’accueil ».', 'Tap Share, then “Add to Home Screen”.'),
  about: t('About, sources & how it works', 'À propos, sources et fonctionnement', 'About, sources and how e dey work'),
  taken: t('Marked as taken', 'Prise enregistrée', 'We don mark am as taken'),
};

const EXAMPLES: Record<'en' | 'fr' | 'pcm', string[]> = {
  en: ['Can I take Coartem with milk?', 'Is amoxicillin good for a cold?', 'I feel better — can I stop?', 'Where can I buy ORS?'],
  fr: ['Je peux prendre du paracétamol enceinte ?', 'Mon enfant a de la fièvre', 'Flagyl et alcool ?', 'Où trouver du Coartem ?'],
  pcm: ['My pikin get hot body, wetin I fit do?', 'Fever don cool, I fit stop Coartem?', 'Wetin be Flagyl?', 'Which pharmacy get ORS?'],
};

const FACTS: { stat: string; text: L10n; source: string }[] = [
  {
    stat: '1 in 10',
    text: t(
      'medicines in low- and middle-income countries is substandard or falsified.',
      'médicaments dans les pays à revenu faible ou intermédiaire est de qualité inférieure ou falsifié.',
      'medicine for poor and middle-income countries na bad quality or fake.',
    ),
    source: 'WHO',
  },
  {
    stat: '579,000',
    text: t(
      'malaria deaths in Africa in 2024 — about 3 in 4 were children under five.',
      'décès du paludisme en Afrique en 2024 — environ 3 sur 4 chez les moins de cinq ans.',
      'malaria death for Africa for 2024 — like 3 for every 4 na small pikin.',
    ),
    source: 'WHO, 2025',
  },
  {
    stat: '4.7 M',
    text: t(
      'deaths were linked to drug-resistant bacteria in 2021.',
      'décès étaient liés à des bactéries résistantes en 2021.',
      'people die for 2021 because of bacteria wey medicine no fit kill again.',
    ),
    source: 'WHO / The Lancet',
  },
  {
    stat: '6 / 6',
    text: t(
      'doses of Coartem are needed even when the fever is gone — the parasites leave last.',
      'prises de Coartem sont nécessaires même quand la fièvre est partie : les parasites partent en dernier.',
      'dose of Coartem you must take even when hot body don go — parasite dey comot last.',
    ),
    source: 'WHO malaria guidelines',
  },
];

export default function HomeScreen() {
  const { lang, L } = useLang();
  const now = useNow(30000);
  const hour = new Date(now).getHours();
  const greet = hour < 12 ? S.morning : hour < 17 ? S.afternoon : S.evening;
  const { openEmergency, openUssd } = useApp();

  return (
    <div className="space-y-6 px-4 pt-2">
      <section className="px-1">
        <p className="eyebrow">
          {L(greet)} · Buea
        </p>
        <h1 className="display mt-2 text-[44px] text-ink">
          {L(S.hero1)} <em className="text-brand-600 dark:text-brand-300">{L(S.hero2)}</em>
        </h1>
      </section>

      <AskBar examples={EXAMPLES[lang]} label={L(S.askLabel)} />

      <ActiveCourse />

      <section>
        <SectionTitle>{L(S.actions)}</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <ActionTile icon={Sparkles} title={L(S.askT)} desc={L(S.askD)} onClick={() => navigate('/ask')} featured />
          <ActionTile icon={MapPin} title={L(S.findT)} desc={L(S.findD)} onClick={() => navigate('/find')} />
          <ActionTile icon={ScanLine} title={L(S.verifyT)} desc={L(S.verifyD)} onClick={() => navigate('/verify')} />
          <ActionTile icon={Pill} title={L(S.courseT)} desc={L(S.courseD)} onClick={() => navigate('/course')} />
        </div>
      </section>

      <button
        onClick={openEmergency}
        className="flex w-full items-center gap-3.5 rounded-[22px] bg-danger-soft p-4 text-left ring-1 ring-danger-line transition active:scale-[0.985]"
      >
        <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-emergency text-white">
          <span className="absolute inset-0 animate-pulse-ring rounded-2xl bg-emergency/40" />
          <Siren className="relative size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-danger-ink">{L(S.emergency)}</span>
          <span className="block text-[13px] text-danger-ink/80">{L(S.emergencySub)}</span>
        </span>
        <Phone className="size-5 text-danger" />
      </button>

      <DutyPharmacy />

      <section>
        <SectionTitle>{L(S.facts)}</SectionTitle>
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
          {FACTS.map((f) => (
            <div key={f.stat} className="card w-[78%] shrink-0 snap-start p-5">
              <p className="display text-[44px] text-brand-600 dark:text-brand-300">{f.stat}</p>
              <p className="mt-2 text-[14px] leading-snug text-ink-2">{L(f.text)}</p>
              <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-muted">{f.source}</p>
            </div>
          ))}
        </div>
      </section>

      <InstallCard />

      <div className="grid gap-3">
        <Card onClick={openUssd} className="flex items-center gap-3.5 p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-ink-2 ring-1 ring-line">
            <Smartphone className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink">{L(S.ussdT)}</span>
            <span className="block text-[13px] leading-snug text-muted">{L(S.ussdD)}</span>
          </span>
          <ChevronRight className="size-5 text-muted" />
        </Card>
        <Card onClick={() => navigate('/pharmacy')} className="flex items-center gap-3.5 p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-ink-2 ring-1 ring-line">
            <Store className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold text-ink">{L(S.pharmT)}</span>
            <span className="block text-[13px] leading-snug text-muted">{L(S.pharmD)}</span>
          </span>
          <ChevronRight className="size-5 text-muted" />
        </Card>
      </div>

      <footer className="space-y-2 px-1 pb-4 pt-2 text-center">
        <p className="text-[12px] text-muted">{L(C.disclaimer)}</p>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => navigate('/why')} className="text-[12px] font-semibold text-brand-600 underline-offset-4 hover:underline dark:text-brand-300">
            {L(S.facts)}
          </button>
          <span className="text-muted">·</span>
          <button onClick={() => navigate('/about')} className="text-[12px] font-semibold text-brand-600 underline-offset-4 hover:underline dark:text-brand-300">
            {L(S.about)}
          </button>
        </div>
      </footer>
    </div>
  );
}

function AskBar({ examples, label }: { examples: string[]; label: string }) {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState('');
  useEffect(() => setI(0), [examples]);
  useEffect(() => {
    const full = examples[i % examples.length];
    let k = 0;
    let erase: number | undefined;
    const type = window.setInterval(() => {
      k++;
      setShown(full.slice(0, k));
      if (k >= full.length) {
        window.clearInterval(type);
        erase = window.setTimeout(() => setI((n) => n + 1), 2200);
      }
    }, 38);
    return () => {
      window.clearInterval(type);
      window.clearTimeout(erase);
    };
  }, [i, examples]);

  return (
    <button
      onClick={() => navigate('/ask')}
      className="group relative flex w-full items-center gap-3 overflow-hidden rounded-[22px] bg-surface p-2 pl-4 text-left shadow-card ring-1 ring-line transition active:scale-[0.99]"
      aria-label={label}
    >
      <Sparkles className="size-5 shrink-0 text-brand-500" />
      <span className="min-w-0 flex-1 py-2.5">
        <span className="block truncate text-[15px] text-ink-2">
          {shown}
          <span className="ml-px inline-block h-[17px] w-[2px] translate-y-[3px] animate-pulse bg-brand-500" />
        </span>
      </span>
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-ink-2">
        <Mic className="size-5" />
      </span>
      <span className="brand-gradient grid size-11 shrink-0 place-items-center rounded-2xl text-white">
        <ArrowRight className="size-5" />
      </span>
    </button>
  );
}

function ActionTile({ icon: Icon, title, desc, onClick, featured }: { icon: LucideIcon; title: string; desc: string; onClick: () => void; featured?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'group relative overflow-hidden rounded-[22px] p-4 text-left ring-1 transition active:scale-[0.97]',
        featured ? 'brand-gradient text-white ring-transparent shadow-[0_18px_40px_-20px_rgb(91_63_232/0.9)]' : 'bg-surface text-ink shadow-card ring-line',
      )}
    >
      <span className={cx('grid size-10 place-items-center rounded-2xl', featured ? 'bg-white/18 text-white' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300')}>
        <Icon className="size-5" strokeWidth={2.2} />
      </span>
      <span className="mt-5 block text-[16px] font-semibold tracking-[-0.01em]">{title}</span>
      <span className={cx('mt-0.5 block text-[12.5px] leading-snug', featured ? 'text-white/80' : 'text-muted')}>{desc}</span>
      {featured && <span className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-white/10 blur-xl" />}
    </button>
  );
}

function ActiveCourse() {
  const { lang, L } = useLang();
  const now = useNow(30000);
  const courses = useStore((s) => s.courses);
  const toast = useToast();
  const course = courses.find((c) => !c.completedAt);
  if (!course) return null;
  const idx = nextDoseIndex(course, now);
  const done = takenCount(course);
  const total = course.doses.length;
  const next = idx >= 0 ? course.doses[idx] : undefined;
  const state = idx >= 0 ? doseState(course, idx, now) : 'taken';
  const canTake = state === 'due' || state === 'late';

  const take = () => {
    setState((s) => ({
      courses: s.courses.map((c) =>
        c.id !== course.id
          ? c
          : (() => {
              const doses = c.doses.map((d, i) => (i === idx ? { ...d, taken: Date.now() } : d));
              const finished = doses.every((d) => d.taken);
              return { ...c, doses, completedAt: finished ? Date.now() : undefined };
            })(),
      ),
    }));
    toast(L(S.taken));
  };

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden p-0">
      <button onClick={() => navigate('/course')} className="flex w-full items-center gap-4 p-4 text-left">
        <ProgressRing value={done / total} size={78} stroke={8} tone={done === total ? 'safe' : 'brand'}>
          <span className="tnum text-[17px] font-semibold text-ink">
            {done}
            <span className="text-muted">/{total}</span>
          </span>
        </ProgressRing>
        <span className="min-w-0 flex-1">
          <span className="eyebrow block">{L(S.yourCourse)}</span>
          <span className="mt-1 block truncate text-[17px] font-semibold tracking-[-0.01em] text-ink">{course.medName}</span>
          {next && (
            <span className="mt-0.5 block text-[13px] text-muted">
              {L(S.doseOf).replace('{n}', String(idx + 1)).replace('{total}', String(total))} · {dayLabel(next.due, lang, now)} {clock(next.due, lang)} ·{' '}
              <span className={cx(canTake && 'font-semibold text-warn-ink')}>{canTake ? L(S.takeNow) : relTime(next.due - now, lang)}</span>
            </span>
          )}
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted" />
      </button>
      {canTake && (
        <div className="border-t border-line p-3">
          <Button block icon={BadgeCheck} variant="safe" onClick={take}>
            {lang === 'fr' ? `J’ai pris la prise ${idx + 1}` : lang === 'pcm' ? `I don take dose ${idx + 1}` : `I took dose ${idx + 1}`}
          </Button>
        </div>
      )}
    </motion.section>
  );
}

function DutyPharmacy() {
  const { L } = useLang();
  const id = onDutyToday();
  const p = PARTNERS.find((x) => x.id === id) ?? PARTNERS.find((x) => x.hours[0] === 0)!;
  const km = roadKm(DEFAULT_ORIGIN, p.pos);
  return (
    <Card onClick={() => navigate(`/find?focus=${p.id}`)} className="relative overflow-hidden p-4">
      <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-brand-400/15 blur-2xl" />
      <div className="flex items-center gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ink text-bg">
          <Moon className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="eyebrow block">{L(S.duty)}</span>
          <span className="mt-0.5 block truncate text-[16px] font-semibold text-ink">{p.name}</span>
          <span className="block text-[13px] text-muted">
            {p.area} · {formatKm(km)} · {p.id === id ? L(S.dutySub) : hoursLabel(p)}
          </span>
        </span>
        <ChevronRight className="size-5 text-muted" />
      </div>
    </Card>
  );
}

function InstallCard() {
  const { L } = useLang();
  const { canPrompt, standalone, ios, install } = useInstall();
  const dismissed = useStore((s) => s.installDismissed);
  if (standalone || dismissed || (!canPrompt && !ios)) return null;
  return (
    <div className="card flex items-center gap-3.5 p-4">
      <span className="brand-gradient grid size-11 shrink-0 place-items-center rounded-2xl text-white">
        <Download className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-ink">{L(S.installT)}</span>
        <span className="block text-[13px] leading-snug text-muted">{ios && !canPrompt ? L(S.installIos) : L(S.installD)}</span>
      </span>
      {canPrompt ? (
        <Button size="sm" onClick={() => void install()}>
          {L(S.open) === 'Open' ? 'Install' : L(S.installT).split(' ')[0]}
        </Button>
      ) : (
        <button onClick={() => setState({ installDismissed: true })} className="text-[12px] font-semibold text-muted">
          OK
        </button>
      )}
    </div>
  );
}
