import { useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, BadgeCheck, BarChart3, Check, Crown, KeyRound, Lock, LogOut, Mail, RotateCcw, ShieldCheck, ShoppingBag, Store, Users } from 'lucide-react';
import { STOCKED_MEDS, MED_BY_ID } from '../data/medicines';
import { PARTNERS } from '../data/places';
import type { StockLevel } from '../core/types';
import { C, t, useLang } from '../i18n';
import { navigate } from '../lib/router';
import { setState, uid, useStore } from '../state/store';
import { formatFcfa } from '../lib/payments';
import PaySheet, { type PayRequest } from '../ui/PaySheet';
import { useToast } from '../ui/overlay';
import { Button, Card, cx, haptic, Toggle } from '../ui/primitives';

const PHARMACY = PARTNERS[0];
const PRO_PRICE = 10000;

const S = {
  back: t('Back', 'Retour', 'Back'),
  title: t('Pharmacy portal', 'Espace pharmacie', 'Pharmacy portal'),
  pitch: t('Keep your stock visible to patients nearby — in two taps.', 'Rendez votre stock visible aux patients proches — en deux gestes.', 'Make patients wey near see your stock — with two tap.'),
  emailSoon: t('Sign in with email link', 'Connexion par lien e-mail', 'Sign in with email link'),
  pilot: t('Pilot', 'Pilote', 'Pilot'),
  sandbox: t('Explore the sandbox', 'Explorer le bac à sable', 'Try di sandbox'),
  sandboxAs: t('as Lumière Pharmacy (demo)', 'en tant que Pharmacie Lumière (démo)', 'as Lumière Pharmacy (demo)'),
  howAuth: t('How sign-in works in the pilot', 'Comment fonctionnera la connexion', 'How sign-in go work for pilot'),
  auth1: t('One secure account per pharmacy (email link or Google — no passwords to leak).', 'Un compte sécurisé par pharmacie (lien e-mail ou Google — pas de mot de passe).', 'One secure account for every pharmacy (email link or Google — no password).'),
  auth2: t('Licence number checked by MediMate before a listing goes live.', 'Numéro d’agrément vérifié avant la mise en ligne.', 'MediMate go check licence number before di listing go live.'),
  auth3: t('An account can only edit its own pharmacy. Every change is logged.', 'Un compte ne modifie que sa pharmacie. Chaque changement est tracé.', 'Account fit change only e own pharmacy. Every change go dey for record.'),
  auth4: t('Patients never need an account — their data stays on their phone.', 'Les patients n’ont jamais besoin de compte — leurs données restent sur leur téléphone.', 'Patients no need account — dia data dey stay for dia phone.'),
  sandboxNote: t('Sandbox: your changes stay on this device and show up in Find straight away.', 'Bac à sable : vos changements restent sur cet appareil et apparaissent tout de suite dans « Trouver ».', 'Sandbox: wetin you change go stay for dis phone and e go show for Find one time.'),
  licence: t('Licence check: pending (demo)', 'Agrément : en cours de vérification (démo)', 'Licence check: e dey pending (demo)'),
  openNow: t('Open now', 'Ouvert maintenant', 'Open now'),
  demand: t('Demand near you today', 'Demande près de vous aujourd’hui', 'Wetin people dey find near you today'),
  searches: t('searches', 'recherches', 'search'),
  reservations: t('Reservations', 'Réservations', 'Reservation'),
  stock: t('Your stock', 'Votre stock', 'Your stock'),
  stockHint: t('Tap to update. Patients see it instantly.', 'Touchez pour mettre à jour. Les patients le voient aussitôt.', 'Tap am to update. Patients go see am one time.'),
  saved: t('Saved · visible in Find', 'Enregistré · visible dans « Trouver »', 'E don save · e dey show for Find'),
  plans: t('Plans', 'Formules', 'Plans'),
  free: t('Free', 'Gratuit', 'Free'),
  pro: t('Pro', 'Pro', 'Pro'),
  perMonth: t('/ month', '/ mois', '/ month'),
  f1: t('Listed on the MediMate map', 'Présence sur la carte MediMate', 'Your pharmacy dey MediMate map'),
  f2: t('Night-duty roster', 'Tour de garde', 'Night duty roster'),
  f3: t('Stock for 5 medicines', 'Stock pour 5 médicaments', 'Stock for 5 medicine'),
  p1: t('Live stock for every medicine', 'Stock en direct pour tous les médicaments', 'Live stock for every medicine'),
  p2: t('Reservations with Mobile Money deposits', 'Réservations avec acompte Mobile Money', 'Reservation with Mobile Money deposit'),
  p3: t('Demand insights: what patients nearby search for', 'Tendances : ce que cherchent les patients proches', 'See wetin patients near you dey find'),
  p4: t('Verified badge', 'Badge vérifié', 'Verified badge'),
  upgrade: t('Upgrade with Mobile Money', 'Passer Pro par Mobile Money', 'Upgrade with Mobile Money'),
  current: t('Current plan', 'Formule actuelle', 'Your plan now'),
  proActive: t('Pro is active', 'Pro activé', 'Pro don start'),
  payTitle: t('MediMate Pro — 1 month', 'MediMate Pro — 1 mois', 'MediMate Pro — 1 month'),
  reset: t('Reset sandbox', 'Réinitialiser', 'Reset sandbox'),
  signOut: t('Sign out', 'Se déconnecter', 'Sign out'),
};

const BASELINE: Record<string, number> = { al: 23, paracetamol: 31, ors: 12, amoxicillin: 17, salbutamol: 6, zinc: 5, metronidazole: 8, ibuprofen: 9 };

export default function PortalScreen() {
  const { L } = useLang();
  const signedIn = useStore((s) => s.portal);
  return (
    <div className="space-y-4 px-4 pb-10 pt-1">
      <button onClick={() => navigate('/')} className="inline-flex items-center gap-1.5 rounded-full px-1 py-1 text-[13px] font-semibold text-muted">
        <ArrowLeft className="size-4" /> {L(S.back)}
      </button>
      {signedIn ? <Dashboard /> : <SignIn />}
    </div>
  );
}

function SignIn() {
  const { L } = useLang();
  return (
    <div className="space-y-4">
      <div className="px-1">
        <span className="grid size-14 place-items-center rounded-3xl bg-ink text-bg">
          <Store className="size-7" />
        </span>
        <h1 className="display mt-4 text-[40px] text-ink">{L(S.title)}</h1>
        <p className="mt-1.5 max-w-[32ch] text-[15px] leading-snug text-muted">{L(S.pitch)}</p>
      </div>
      <div className="space-y-2.5">
        <button disabled className="flex h-14 w-full items-center gap-3 rounded-[18px] bg-surface px-4 text-left text-[15px] font-semibold text-muted ring-1 ring-line">
          <Mail className="size-5" /> {L(S.emailSoon)}
          <span className="ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ring-1 ring-line">{L(S.pilot)}</span>
        </button>
        <Button block size="lg" icon={KeyRound} onClick={() => setState({ portal: true })}>
          {L(S.sandbox)}
        </Button>
        <p className="text-center text-[12px] text-muted">{L(S.sandboxAs)}</p>
      </div>
      <Card className="p-4">
        <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <ShieldCheck className="size-4 text-brand-500" /> {L(S.howAuth)}
        </p>
        <ul className="mt-3 space-y-2.5">
          {[S.auth1, S.auth2, S.auth3, S.auth4].map((x, i) => (
            <li key={i} className="flex gap-2.5 text-[13px] leading-snug text-ink-2">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-muted" /> {L(x)}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Dashboard() {
  const { L } = useLang();
  const toast = useToast();
  const overrides = useStore((s) => s.stock[PHARMACY.id]);
  const searches = useStore((s) => s.searches);
  const plan = useStore((s) => s.plan);
  const allReservations = useStore((s) => s.reservations);
  const reservations = useMemo(() => allReservations.filter((r) => r.pharmacyId === PHARMACY.id), [allReservations]);
  const [pay, setPay] = useState<PayRequest | null>(null);
  const levels = { ...PHARMACY.stock, ...(overrides?.levels ?? {}) };
  const closed = Boolean(overrides?.closed);

  const set = (medId: string, level: StockLevel) => {
    haptic(10);
    setState((s) => ({
      stock: { ...s.stock, [PHARMACY.id]: { ...s.stock[PHARMACY.id], levels: { ...(s.stock[PHARMACY.id]?.levels ?? {}), [medId]: level }, at: Date.now() } },
    }));
    toast(L(S.saved));
  };

  const demand = useMemo(
    () =>
      Object.entries(BASELINE)
        .map(([id, n]) => ({ id, n: n + (searches[id] ?? 0) }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 5),
    [searches],
  );
  const max = demand[0]?.n ?? 1;

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[28px] bg-ink p-5 text-bg">
        <div className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-brand-500/40 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide opacity-60">{L(S.title)}</p>
            <p className="mt-1 text-[22px] font-semibold tracking-[-0.02em]">{PHARMACY.name}</p>
            <p className="text-[13px] opacity-70">
              {PHARMACY.area} · {PHARMACY.landmark}
            </p>
          </div>
          <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold', plan === 'pro' ? 'bg-brand-400 text-white' : 'bg-white/15')}>
            {plan === 'pro' ? <Crown className="size-3.5" /> : null}
            {plan === 'pro' ? L(S.pro) : L(S.free)}
          </span>
        </div>
        <p className="relative mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11.5px] opacity-90">
          <BadgeCheck className="size-3.5" /> {L(S.licence)}
        </p>
        <div className="relative mt-4 flex items-center justify-between rounded-2xl bg-white/10 px-3.5 py-2.5">
          <span className="text-[14px] font-semibold">{L(S.openNow)}</span>
          <Toggle
            on={!closed}
            label={L(S.openNow)}
            onChange={(open) => setState((s) => ({ stock: { ...s.stock, [PHARMACY.id]: { levels: s.stock[PHARMACY.id]?.levels ?? {}, at: Date.now(), closed: !open } } }))}
          />
        </div>
      </div>
      <p className="rounded-2xl bg-info-soft px-3.5 py-2.5 text-[12px] leading-snug text-info-ink ring-1 ring-info-line">{L(S.sandboxNote)}</p>

      <div className="grid grid-cols-2 gap-3">
        <Card className="col-span-2 p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-2">
            <BarChart3 className="size-4 text-brand-500" /> {L(S.demand)}
          </p>
          <div className="mt-3 space-y-2">
            {demand.map((d) => (
              <div key={d.id} className="flex items-center gap-3">
                <span className="w-24 truncate text-[12.5px] text-ink-2">{MED_BY_ID[d.id]?.name}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(d.n / max) * 100}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="h-full rounded-full bg-brand-500" />
                </div>
                <span className="tnum w-8 text-right text-[12px] font-semibold text-ink">{d.n}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted">
            <Users className="mr-1 inline size-3" />
            {L(S.searches)} · demo baseline + this device
          </p>
        </Card>
        <Card className="p-4">
          <ShoppingBag className="size-5 text-brand-500" />
          <p className="tnum mt-2 text-[26px] font-semibold tracking-[-0.03em] text-ink">{reservations.length}</p>
          <p className="text-[12px] text-muted">{L(S.reservations)}</p>
        </Card>
        <Card className="p-4">
          <Check className="size-5 text-safe" />
          <p className="tnum mt-2 text-[26px] font-semibold tracking-[-0.03em] text-ink">{Object.values(levels).filter((l) => l !== 'out').length}</p>
          <p className="text-[12px] text-muted">{L(C.stock.in)}</p>
        </Card>
      </div>

      <section>
        <div className="mb-2 px-1">
          <p className="text-[15px] font-semibold text-ink">{L(S.stock)}</p>
          <p className="text-[12px] text-muted">{L(S.stockHint)}</p>
        </div>
        <div className="divide-y divide-line overflow-hidden rounded-[22px] bg-surface ring-1 ring-line">
          {STOCKED_MEDS.map((m) => {
            const lvl = levels[m.id] ?? 'out';
            return (
              <div key={m.id} className="flex items-center gap-3 px-3.5 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">{m.name}</span>
                <div className="flex rounded-full bg-surface-2 p-0.5 ring-1 ring-line">
                  {(['in', 'low', 'out'] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => set(m.id, k)}
                      className={cx(
                        'h-7 rounded-full px-2.5 text-[11px] font-semibold transition',
                        lvl === k ? (k === 'in' ? 'bg-safe text-white' : k === 'low' ? 'bg-warn text-white' : 'bg-danger text-white') : 'text-muted',
                      )}
                    >
                      {L(C.stock[k])}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <p className="mb-2 px-1 text-[15px] font-semibold text-ink">{L(S.plans)}</p>
        <div className="grid gap-3">
          <PlanCard name={L(S.free)} price="0 FCFA" features={[S.f1, S.f2, S.f3].map(L)} current={plan === 'free'} currentLabel={L(S.current)} />
          <PlanCard
            name={L(S.pro)}
            price={`${formatFcfa(PRO_PRICE)} ${L(S.perMonth)}`}
            features={[S.p1, S.p2, S.p3, S.p4].map(L)}
            current={plan === 'pro'}
            currentLabel={L(S.proActive)}
            highlight
            action={
              plan === 'free' ? (
                <Button
                  block
                  icon={Crown}
                  onClick={() =>
                    setPay({
                      title: L(S.payTitle),
                      lines: [
                        { label: 'Pharmacy', value: PHARMACY.name },
                        { label: 'Plan', value: 'MediMate Pro · 30 days' },
                      ],
                      amount: PRO_PRICE,
                      purpose: 'subscription',
                      externalId: `sub-${uid()}`,
                      message: `MediMate Pro subscription — ${PHARMACY.name}`,
                    })
                  }
                >
                  {L(S.upgrade)}
                </Button>
              ) : undefined
            }
          />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          icon={RotateCcw}
          onClick={() => setState((s) => ({ stock: Object.fromEntries(Object.entries(s.stock).filter(([k]) => k !== PHARMACY.id)), plan: 'free' }))}
        >
          {L(S.reset)}
        </Button>
        <Button variant="secondary" icon={LogOut} onClick={() => setState({ portal: false })}>
          {L(S.signOut)}
        </Button>
      </div>

      <PaySheet
        open={Boolean(pay)}
        onClose={() => setPay(null)}
        req={pay}
        onPaid={() => {
          setPay(null);
          setState({ plan: 'pro' });
          toast(L(S.proActive));
        }}
      />
    </div>
  );
}

function PlanCard({ name, price, features, current, currentLabel, highlight, action }: { name: string; price: string; features: string[]; current: boolean; currentLabel: string; highlight?: boolean; action?: ReactNode }) {
  return (
    <div className={cx('rounded-[24px] p-4 ring-1', highlight ? 'bg-brand-50 ring-brand-200 dark:bg-brand-500/10 dark:ring-brand-500/30' : 'bg-surface ring-line')}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[17px] font-semibold text-ink">{name}</p>
        <p className="tnum text-[15px] font-semibold text-ink">{price}</p>
      </div>
      <ul className="mt-2.5 space-y-1.5">
        {features.map((f) => (
          <li key={f} className="flex gap-2 text-[13px] text-ink-2">
            <Check className="mt-0.5 size-4 shrink-0 text-safe" /> {f}
          </li>
        ))}
      </ul>
      {current ? <p className="mt-3 text-[12px] font-semibold text-brand-600 dark:text-brand-300">● {currentLabel}</p> : action && <div className="mt-3">{action}</div>}
    </div>
  );
}
