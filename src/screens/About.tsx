import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Binary, Box, Check, Cloud, Code2, Cpu, Database, ExternalLink, FileWarning, Globe2, HandCoins, Hourglass, Languages, Lock, MapPinned, Pill, Search, ShieldCheck, Smartphone, Sparkles, Terminal, X } from 'lucide-react';
import { t, useLang } from '../i18n';
import { navigate } from '../lib/router';
import { MEDICINES } from '../data/medicines';
import { cx } from '../ui/primitives';
import { LogoMark } from '../ui/Logo';

// ---------------------------------------------------------------------------
// WHY — the problem at scale, framed for a technical audience
// ---------------------------------------------------------------------------

const W = {
  eyebrow: t('Why MediMate exists', 'Pourquoi MediMate existe', 'Why MediMate dey'),
  title: t('A supply chain', 'Une chaîne', 'Medicine chain'),
  accent: t('with no source of truth.', 'sans source de vérité.', 'wey no get source of truth.'),
  intro: t(
    'In Buea, a patient with a prescription still has to guess which pharmacy has the medicine, whether the pack is real, and why they should keep taking it once the fever drops. Every one of those guesses costs money — or a life.',
    'À Buea, un patient avec une ordonnance doit encore deviner quelle pharmacie a le médicament, si la boîte est authentique, et pourquoi continuer quand la fièvre tombe. Chaque supposition coûte de l’argent — ou une vie.',
    'For Buea, patient wey get prescription still dey guess which pharmacy get di medicine, whether di pack na original, and why e suppose continue when hot body don go. Every guess dey cost money — or life.',
  ),
  since: t('Since you opened this page, about', 'Depuis l’ouverture de cette page, environ', 'Since you open dis page, about'),
  sinceMalaria: t('people in Africa died of malaria', 'personnes en Afrique sont mortes du paludisme', 'people for Africa don die from malaria'),
  sinceAmr: t('deaths worldwide were linked to drug-resistant bacteria', 'décès dans le monde ont été liés à des bactéries résistantes', 'people for world don die because of bacteria wey medicine no fit kill'),
  systems: t('Four bugs in the system', 'Quatre bugs dans le système', 'Four bug for di system'),
  scaleNote: t('Rates from WHO annual estimates, spread evenly over the year.', 'Taux calculés à partir des estimations annuelles de l’OMS, répartis sur l’année.', 'We calculate am from WHO yearly numbers.'),
  cta: t('See how it works', 'Voir comment ça marche', 'See how e dey work'),
  try: t('Try the app', 'Essayer l’appli', 'Try di app'),
};

const STATS: { value: string; label: ReturnType<typeof t>; source: string; url: string }[] = [
  {
    value: '579,000',
    label: t('malaria deaths in Africa in 2024 — about 3 in 4 were children under five', 'décès du paludisme en Afrique en 2024 — environ 3 sur 4 chez les moins de cinq ans', 'malaria death for Africa for 2024 — like 3 for every 4 na small pikin'),
    source: 'WHO malaria fact sheet',
    url: 'https://www.who.int/news-room/fact-sheets/detail/malaria',
  },
  {
    value: '1 in 10',
    label: t('medicines in low- and middle-income countries is substandard or falsified', 'médicaments dans les pays à revenu faible ou intermédiaire est de qualité inférieure ou falsifié', 'medicine for poor and middle-income countries na bad quality or fake'),
    source: 'WHO',
    url: 'https://www.who.int/news-room/fact-sheets/detail/substandard-and-falsified-medical-products',
  },
  {
    value: '$30.5 B',
    label: t('spent every year on substandard and falsified medical products', 'dépensés chaque année en produits médicaux falsifiés ou de qualité inférieure', 'money wey people dey spend every year for fake and bad-quality medicine'),
    source: 'WHO',
    url: 'https://www.who.int/news-room/fact-sheets/detail/substandard-and-falsified-medical-products',
  },
  {
    value: '4.7 M',
    label: t('deaths associated with drug-resistant bacteria in 2021', 'décès associés aux bactéries résistantes en 2021', 'death wey bacteria resistance cause for 2021'),
    source: 'WHO / The Lancet (GBD 2021)',
    url: 'https://www.who.int/news-room/fact-sheets/detail/antimicrobial-resistance',
  },
  {
    value: '1 in 6',
    label: t('lab-confirmed bacterial infections worldwide resisted antibiotics in 2023', 'infections bactériennes confirmées résistaient aux antibiotiques en 2023', 'bacteria infection for world no hear antibiotic for 2023'),
    source: 'WHO',
    url: 'https://www.who.int/news-room/fact-sheets/detail/antimicrobial-resistance',
  },
  {
    value: '4',
    label: t('African countries with confirmed partial resistance to artemisinin, the core of malaria treatment', 'pays africains avec une résistance partielle confirmée à l’artémisinine, base du traitement antipaludique', 'African country wey malaria don start resist artemisinin (di main malaria medicine)'),
    source: 'WHO',
    url: 'https://www.who.int/news-room/fact-sheets/detail/malaria',
  },
];

const BUGS: { icon: typeof Search; bug: ReturnType<typeof t>; detail: ReturnType<typeof t>; fix: ReturnType<typeof t> }[] = [
  {
    icon: Search,
    bug: t('No shared state', 'Aucun état partagé', 'No shared state'),
    detail: t(
      'Each pharmacy’s stock is a private variable. Patients run a linear search across town — one taxi ride per query.',
      'Le stock de chaque pharmacie est une variable privée. Les patients font une recherche linéaire en ville — un taxi par requête.',
      'Every pharmacy stock na private variable. Patients dey do linear search for town — one taxi for every query.',
    ),
    fix: t('A shared, crowd-verified stock index. One lookup instead of N taxi rides.', 'Un index de stock partagé et vérifié par la communauté. Une requête au lieu de N taxis.', 'Shared stock index wey people dey confirm. One lookup instead of N taxi.'),
  },
  {
    icon: FileWarning,
    bug: t('No checksum', 'Aucun checksum', 'No checksum'),
    detail: t(
      'Anyone can print a box. There is no signature a patient can verify at a roadside stall.',
      'N’importe qui peut imprimer une boîte. Aucune signature vérifiable par le patient au bord de la route.',
      'Anybody fit print box. No signature wey patient fit check for roadside.',
    ),
    fix: t('GS1 codes checked against a registry: expiry, recalls, barcode–batch mismatch, cloned serials.', 'Codes GS1 vérifiés dans un registre : péremption, rappels, incohérences, numéros clonés.', 'GS1 code wey we check for register: expiry, recall, barcode–batch wey no match, copied serial.'),
  },
  {
    icon: Hourglass,
    bug: t('Processes killed at 33%', 'Processus tués à 33 %', 'Process wey dem kill for 33%'),
    detail: t(
      'The fever drops after dose 2 of 6, so the course is stopped. The surviving parasites are the toughest — that is how resistance is selected.',
      'La fièvre tombe après la prise 2 sur 6, le traitement est arrêté. Les parasites survivants sont les plus résistants : c’est ainsi que la résistance est sélectionnée.',
      'Hot body dey drop after dose 2 of 6, so people stop. Di parasite wey remain na di strongest — na so resistance dey grow.',
    ),
    fix: t('Dose-level tracking, calendar alarms that work offline, and a visual “why” at the moment people want to stop.', 'Suivi prise par prise, alarmes agenda hors ligne, et un « pourquoi » visuel au moment d’arrêter.', 'Track every dose, calendar alarm wey work offline, and picture “why” when people wan stop.'),
  },
  {
    icon: Languages,
    bug: t('Unreadable docs', 'Documentation illisible', 'Docs wey nobody fit read'),
    detail: t(
      'The leaflet is tiny, technical and not in Pidgin. So people ask the roadside seller instead.',
      'La notice est minuscule, technique et pas en pidgin. Alors on demande au vendeur de rue.',
      'Di paper inside medicine too small, too technical, and e no dey Pidgin. So people dey ask roadside seller.',
    ),
    fix: t('Answers in Pidgin, French and English — deterministic, explainable, and they never give antibiotic doses.', 'Réponses en pidgin, français et anglais — déterministes, explicables, jamais de dose d’antibiotique.', 'Answer for Pidgin, French and English — e no dey guess, e dey explain, and e no dey give antibiotic dose.'),
  },
];

export function WhyScreen() {
  const { L } = useLang();
  const [t0] = useState(() => Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  const secs = (now - t0) / 1000;
  const year = 365 * 24 * 3600;
  const malaria = (579000 / year) * secs;
  const amr = (4700000 / year) * secs;

  return (
    <div className="space-y-6 px-4 pb-12 pt-1">
      <BackLink />
      <section className="px-1">
        <p className="eyebrow">{L(W.eyebrow)}</p>
        <h1 className="display mt-2 text-[44px] text-ink">
          {L(W.title)} <em className="text-brand-600 dark:text-brand-300">{L(W.accent)}</em>
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{L(W.intro)}</p>
      </section>

      <section className="overflow-hidden rounded-[28px] bg-[#0f1016] p-5 text-white shadow-float">
        <p className="text-[13px] text-white/60">{L(W.since)}</p>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <Counter value={malaria} label={L(W.sinceMalaria)} tone="#f5a524" />
          <Counter value={amr} label={L(W.sinceAmr)} tone="#f05252" />
        </div>
        <p className="mt-4 text-[10.5px] text-white/45">{L(W.scaleNote)}</p>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {STATS.map((s, i) => (
          <motion.a
            key={s.value}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
            className={cx('card block p-4', i === 0 && 'col-span-2')}
          >
            <p className={cx('display text-brand-600 dark:text-brand-300', i === 0 ? 'text-[52px]' : 'text-[34px]')}>{s.value}</p>
            <p className="mt-1.5 text-[13px] leading-snug text-ink-2">{L(s.label)}</p>
            <p className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
              {s.source} <ExternalLink className="size-3" />
            </p>
          </motion.a>
        ))}
      </section>

      <FakeGrid />

      <section>
        <h2 className="display px-1 text-[30px] text-ink">{L(W.systems)}</h2>
        <div className="mt-3 space-y-3">
          {BUGS.map((b, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="card overflow-hidden">
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <span className="grid size-9 place-items-center rounded-xl bg-danger-soft text-danger ring-1 ring-danger-line">
                  <b.icon className="size-[18px]" />
                </span>
                <p className="font-mono text-[13px] font-semibold text-ink">
                  <span className="text-danger">bug:</span> {L(b.bug)}
                </p>
              </div>
              <div className="space-y-2 px-4 py-3">
                <p className="text-[13.5px] leading-snug text-ink-2">{L(b.detail)}</p>
                <p className="flex gap-2 rounded-xl bg-safe-soft px-3 py-2 text-[13px] leading-snug text-safe-ink ring-1 ring-safe-line">
                  <Check className="mt-0.5 size-4 shrink-0" />
                  <span>
                    <b className="font-mono">fix:</b> {L(b.fix)}
                  </span>
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => navigate('/about')} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-ink text-[14px] font-semibold text-bg active:scale-[0.97]">
          <Cpu className="size-4" /> {L(W.cta)}
        </button>
        <button onClick={() => navigate('/ask')} className="brand-gradient flex h-12 items-center justify-center gap-2 rounded-2xl text-[14px] font-semibold text-white active:scale-[0.97]">
          {L(W.try)} <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Counter({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div>
      <p className="tnum font-mono text-[34px] font-semibold leading-none tracking-[-0.03em]" style={{ color: tone }}>
        {value < 10 ? value.toFixed(1) : Math.floor(value).toLocaleString()}
      </p>
      <p className="mt-2 text-[12px] leading-snug text-white/75">{label}</p>
    </div>
  );
}

function FakeGrid() {
  const { L } = useLang();
  // 100 pills, 10 falsified — shuffled deterministically.
  const bad = useMemo(() => new Set([3, 17, 22, 38, 41, 56, 63, 77, 84, 95]), []);
  const [reveal, setReveal] = useState(false);
  return (
    <section className="card p-4">
      <p className="text-[14px] font-semibold text-ink">{L(t('Spot the fake.', 'Trouvez le faux.', 'Find di fake one.'))}</p>
      <p className="mt-0.5 text-[12.5px] text-muted">
        {L(t('100 packs. Statistically, 10 are substandard or falsified. They look identical.', '100 boîtes. Statistiquement, 10 sont falsifiées ou de qualité inférieure. Elles se ressemblent.', '100 pack. For statistics, 10 na fake or bad quality. Dem all look di same.'))}
      </p>
      <div className="mt-3 grid grid-cols-10 gap-1.5">
        {Array.from({ length: 100 }, (_, i) => (
          <motion.span
            key={i}
            animate={reveal && bad.has(i) ? { scale: [1, 1.25, 1] } : {}}
            className={cx('grid aspect-square place-items-center rounded-md transition-colors duration-500', reveal && bad.has(i) ? 'bg-danger' : 'bg-surface-3')}
          >
            <Pill className={cx('size-3', reveal && bad.has(i) ? 'text-white' : 'text-muted')} />
          </motion.span>
        ))}
      </div>
      <button onClick={() => setReveal((r) => !r)} className="mt-3 w-full rounded-2xl bg-surface-2 py-2.5 text-[13px] font-semibold text-ink ring-1 ring-line active:scale-[0.98]">
        {reveal ? L(t('Hide', 'Masquer', 'Hide')) : L(t('Reveal the 10 — this is what MediMate’s scanner is for', 'Révéler les 10 — c’est le rôle du scanner MediMate', 'Show di 10 — na why MediMate scanner dey'))}
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// ABOUT — how it works, real vs demo, business model, sources
// ---------------------------------------------------------------------------

const A = {
  eyebrow: t('Under the hood', 'Sous le capot', 'Inside di engine'),
  title: t('How MediMate', 'Comment MediMate', 'How MediMate'),
  accent: t('works', 'fonctionne', 'dey work'),
  engine: t('An explainable engine, not a chatbot', 'Un moteur explicable, pas un chatbot', 'Engine wey dey explain, no be chatbot'),
  engineBody: t(
    'Generative AI can invent a dose. MediMate can’t: every answer comes from a reviewed medicine list and explicit safety rules, runs on the phone in under a millisecond, and shows its reasoning.',
    'Une IA générative peut inventer une dose. MediMate non : chaque réponse vient d’une liste vérifiée et de règles de sécurité explicites, tourne sur le téléphone en moins d’une milliseconde, et montre son raisonnement.',
    'Generative AI fit invent dose. MediMate no fit: every answer dey come from checked medicine list and clear safety rule, e dey run for phone under one millisecond, and e dey show how e reason.',
  ),
  arch: t('Architecture', 'Architecture', 'How e build'),
  real: t('What’s real, what’s demo', 'Réel ou démo', 'Wetin real, wetin be demo'),
  money: t('Business model', 'Modèle économique', 'How we go make money'),
  safety: t('Safety rules', 'Règles de sécurité', 'Safety rules'),
  sources: t('Sources', 'Sources', 'Sources'),
  team: t('Built in Buea by Team Medimates for the She Innovates Hackathon 2026.', 'Conçu à Buea par l’équipe Medimates pour le She Innovates Hackathon 2026.', 'Team Medimates build am for Buea for She Innovates Hackathon 2026.'),
  tryApi: t('Try the live USSD API', 'Testez l’API USSD en direct', 'Try di live USSD API'),
  why: t('Why it matters', 'Pourquoi c’est important', 'Why e matter'),
};

const REAL: { item: ReturnType<typeof t>; real: boolean }[] = [
  { item: t('Answer engine, safety rules, 3 languages', 'Moteur de réponse, règles, 3 langues', 'Answer engine, safety rules, 3 languages'), real: true },
  { item: t('Pharmacy & hospital locations (OpenStreetMap)', 'Emplacements pharmacies & hôpitaux (OpenStreetMap)', 'Pharmacy & hospital location (OpenStreetMap)'), real: true },
  { item: t('Emergency numbers (119 / 112 / 117 / 118)', 'Numéros d’urgence (119 / 112 / 117 / 118)', 'Emergency number (119 / 112 / 117 / 118)'), real: true },
  { item: t('GS1 barcode & Digital Link parsing, on-device OCR', 'Lecture GS1 & Digital Link, OCR sur l’appareil', 'GS1 barcode & Digital Link, OCR for phone'), real: true },
  { item: t('Offline mode, calendar reminders, USSD logic', 'Mode hors ligne, rappels agenda, logique USSD', 'Offline mode, calendar reminder, USSD logic'), real: true },
  { item: t('Mobile Money integration (Fapshi)', 'Intégration Mobile Money (Fapshi)', 'Mobile Money integration (Fapshi)'), real: true },
  { item: t('Partner pharmacies, their stock and hours', 'Pharmacies partenaires, stock et horaires', 'Partner pharmacy, dia stock and time'), real: false },
  { item: t('Batch registry, recalls, cloned codes', 'Registre des lots, rappels, codes clonés', 'Batch register, recall, copied code'), real: false },
  { item: t('Payments (until Fapshi keys are added)', 'Paiements (jusqu’à l’ajout des clés Fapshi)', 'Payment (until Fapshi keys enter)'), real: false },
];

const MONEY: { icon: typeof HandCoins; title: ReturnType<typeof t>; body: ReturnType<typeof t> }[] = [
  { icon: Smartphone, title: t('Free for patients', 'Gratuit pour les patients', 'Free for patients'), body: t('Ask, check, find and remind — always free. No account needed.', 'Demander, vérifier, trouver, rappeler — toujours gratuit, sans compte.', 'Ask, check, find, remind — always free. No need account.') },
  { icon: HandCoins, title: t('Pharmacies: Pro at 10,000 FCFA / month', 'Pharmacies : Pro à 10 000 FCFA / mois', 'Pharmacy: Pro na 10,000 FCFA / month'), body: t('Live stock for every medicine, reservations, demand insights, verified badge. Paid by Mobile Money.', 'Stock en direct, réservations, tendances, badge vérifié. Payé par Mobile Money.', 'Live stock, reservation, demand insight, verified badge. Pay with Mobile Money.') },
  { icon: Box, title: t('Reservations', 'Réservations', 'Reservation'), body: t('Patients reserve with a 500 FCFA deposit (deducted at pickup). MediMate keeps 100 FCFA per completed pickup, paid by the pharmacy.', 'Les patients réservent avec 500 FCFA d’acompte (déduit au retrait). MediMate garde 100 FCFA par retrait, payés par la pharmacie.', 'Patients dey reserve with 500 FCFA deposit (dem go remove am when you collect). MediMate go keep 100 FCFA for every pickup — na pharmacy dey pay am.') },
  { icon: Globe2, title: t('Programmes & NGOs', 'Programmes & ONG', 'Programmes & NGO'), body: t('Sponsored SMS reminders for malaria, TB and maternal health; anonymised stock-out maps for supply planning.', 'Rappels SMS sponsorisés (paludisme, TB, santé maternelle) ; cartes anonymisées des ruptures pour la planification.', 'Sponsored SMS reminder for malaria, TB and mother health; stock-out map wey no get person name, for planning.') },
];

const SAFETY = [
  t('Never gives a dose for prescription-only medicines.', 'Ne donne jamais de dose pour un médicament sur ordonnance.', 'E no dey give dose for medicine wey need doctor paper.'),
  t('Danger signs always win: emergencies are flagged before anything else.', 'Les signes de danger passent avant tout.', 'Danger sign dey always win: emergency first before anything.'),
  t('Says “I don’t know” instead of guessing about unreviewed medicines.', 'Dit « je ne sais pas » plutôt que de deviner.', 'E dey talk “I no know” instead of guess.'),
  t('No diagnosis — it routes people to tests, pharmacists and clinics.', 'Aucun diagnostic — oriente vers tests, pharmaciens et cliniques.', 'No diagnosis — e dey send people go test, pharmacist and clinic.'),
  t('Patient data stays on the phone. No account, no tracking.', 'Les données restent sur le téléphone. Ni compte ni pistage.', 'Patient data dey stay for phone. No account, no tracking.'),
];

const SOURCE_LINKS = [
  ['WHO — Malaria fact sheet', 'https://www.who.int/news-room/fact-sheets/detail/malaria'],
  ['WHO — Substandard and falsified medical products', 'https://www.who.int/news-room/fact-sheets/detail/substandard-and-falsified-medical-products'],
  ['WHO — Antimicrobial resistance', 'https://www.who.int/news-room/fact-sheets/detail/antimicrobial-resistance'],
  ['WHO — Guidelines for malaria', 'https://www.who.int/publications/i/item/guidelines-for-malaria'],
  ['WHO — AWaRe antibiotic book', 'https://www.who.int/publications/i/item/9789240062382'],
  ['GS1 Digital Link standard', 'https://www.gs1.org/standards/gs1-digital-link'],
  ['OpenStreetMap contributors (ODbL)', 'https://www.openstreetmap.org/copyright'],
  ['Fapshi API documentation', 'https://docs.fapshi.com'],
] as const;

export default function AboutScreen() {
  const { L } = useLang();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const phrases = MEDICINES.reduce((n, m) => n + m.aliases.length + m.brands.length + 2, 0);
  return (
    <div className="space-y-6 px-4 pb-12 pt-1">
      <BackLink />
      <section className="px-1">
        <p className="eyebrow">{L(A.eyebrow)}</p>
        <h1 className="display mt-2 text-[44px] text-ink">
          {L(A.title)} <em className="text-brand-600 dark:text-brand-300">{L(A.accent)}</em>
        </h1>
        <button onClick={() => navigate('/why')} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 dark:text-brand-300">
          {L(A.why)} <ArrowRight className="size-4" />
        </button>
      </section>

      <Block icon={Cpu} title={L(A.engine)}>
        <p className="text-[14px] leading-relaxed text-ink-2">{L(A.engineBody)}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Metric value={String(MEDICINES.length)} label="medicines" />
          <Metric value={`${phrases}+`} label="names & slang" />
          <Metric value="20" label="danger signs" />
          <Metric value="84/84" label="safety tests" />
          <Metric value="<1 ms" label="per answer" />
          <Metric value="0 B" label="sent to a server" />
        </div>
        <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#0f1016] p-3.5 font-mono text-[11px] leading-relaxed text-white/85">
          {`input  "My pikin get hot body since two days,
        I fit give am Amox?"
lang   pidgin (auto)
med    amoxicillin  ← "amox"
who    child · fever · 2 days
flag   long_fever → see a clinician today
rule   prescription-firewall → no dose
out    RED · ask: "Did a health worker prescribe it?"`}
        </pre>
      </Block>

      <Block icon={Binary} title={L(A.arch)}>
        <div className="grid gap-2 text-[12.5px]">
          <ArchRow icon={Smartphone} title="Phone (PWA, works offline)" items={['Answer engine + medicine list', 'Courses, reports, history (on-device)', 'GS1 scanner + OCR (WebAssembly)']} />
          <ArchRow icon={Cloud} title="Vercel (static + serverless)" items={['/api/ussd — feature-phone menu', '/api/pay — Fapshi Mobile Money', '/api/fapshi-webhook — payment confirmation']} />
          <ArchRow icon={Database} title="Pilot backend" items={['Pharmacy stock & reservations', 'Email-link sign-in per pharmacy', 'Report queue to pharmacists']} />
        </div>
        <div className="mt-3 rounded-2xl bg-[#0f1016] p-3.5">
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-white/70">
            <Terminal className="size-3.5" /> {L(A.tryApi)}
          </p>
          <pre className="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed text-safe-ink">{`curl -X POST ${origin}/api/ussd \\
  -d "text=2*1*1"`}</pre>
        </div>
      </Block>

      <Block icon={ShieldCheck} title={L(A.safety)}>
        <ul className="space-y-2">
          {SAFETY.map((s, i) => (
            <li key={i} className="flex gap-2.5 text-[13.5px] leading-snug text-ink-2">
              <Lock className="mt-0.5 size-4 shrink-0 text-brand-500" /> {L(s)}
            </li>
          ))}
        </ul>
      </Block>

      <Block icon={Sparkles} title={L(A.real)}>
        <div className="divide-y divide-line overflow-hidden rounded-2xl ring-1 ring-line">
          {REAL.map((r, i) => (
            <div key={i} className="flex items-center gap-3 px-3.5 py-2.5">
              <span className={cx('grid size-6 shrink-0 place-items-center rounded-full', r.real ? 'bg-safe-soft text-safe' : 'bg-warn-soft text-warn')}>
                {r.real ? <Check className="size-3.5" strokeWidth={3} /> : <X className="size-3.5" strokeWidth={3} />}
              </span>
              <span className="flex-1 text-[13px] text-ink-2">{L(r.item)}</span>
              <span className={cx('text-[10.5px] font-semibold uppercase tracking-wide', r.real ? 'text-safe-ink' : 'text-warn-ink')}>{r.real ? 'Real' : 'Demo'}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block icon={HandCoins} title={L(A.money)}>
        <div className="grid gap-2.5">
          {MONEY.map((m, i) => (
            <div key={i} className="flex gap-3 rounded-2xl bg-surface-2 p-3 ring-1 ring-line">
              <m.icon className="mt-0.5 size-5 shrink-0 text-brand-500" />
              <div>
                <p className="text-[13.5px] font-semibold text-ink">{L(m.title)}</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{L(m.body)}</p>
              </div>
            </div>
          ))}
        </div>
      </Block>

      <Block icon={Code2} title={L(A.sources)}>
        <ul className="space-y-1.5">
          {SOURCE_LINKS.map(([label, url]) => (
            <li key={url}>
              <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[13px] text-brand-700 underline-offset-4 hover:underline dark:text-brand-300">
                {label} <ExternalLink className="size-3" />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11.5px] leading-snug text-muted">
          Medicine content is a prototype for pharmacist review against the Cameroon national essential medicines list (LNME) and product leaflets before any real use.
        </p>
      </Block>

      <div className="flex flex-col items-center gap-2 pt-2 text-center">
        <LogoMark size={40} />
        <p className="max-w-[30ch] text-[12.5px] text-muted">{L(A.team)}</p>
        <MapPinned className="size-4 text-muted" />
      </div>
    </div>
  );
}

function BackLink() {
  const { L } = useLang();
  return (
    <button onClick={() => (window.history.length > 1 ? window.history.back() : navigate('/'))} className="inline-flex items-center gap-1.5 rounded-full py-1 text-[13px] font-semibold text-muted">
      <ArrowLeft className="size-4" /> {L(t('Back', 'Retour', 'Back'))}
    </button>
  );
}

function Block({ icon: Icon, title, children }: { icon: typeof Cpu; title: string; children: ReactNode }) {
  return (
    <section className="card p-4">
      <p className="mb-3 flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-ink">
        <Icon className="size-[18px] text-brand-500" /> {title}
      </p>
      {children}
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-2.5 py-2.5 ring-1 ring-line">
      <p className="tnum font-mono text-[15px] font-semibold text-ink">{value}</p>
      <p className="text-[10.5px] text-muted">{label}</p>
    </div>
  );
}

function ArchRow({ icon: Icon, title, items }: { icon: typeof Cpu; title: string; items: string[] }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-surface-2 p-3 ring-1 ring-line">
      <Icon className="mt-0.5 size-5 shrink-0 text-brand-500" />
      <div>
        <p className="font-semibold text-ink">{title}</p>
        <ul className="mt-1 space-y-0.5 text-muted">
          {items.map((i) => (
            <li key={i} className="font-mono text-[11px]">
              {i}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
