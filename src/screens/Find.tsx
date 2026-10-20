import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Bell, BellRing, Clock, Crosshair, ExternalLink, FileText, Map as MapIcon, Moon, Navigation, Phone, Search, ShoppingBag, Stethoscope, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { STOCKED_MEDS, MED_BY_ID } from '../data/medicines';
import {
  DEFAULT_ORIGIN,
  FACILITIES,
  OSM_PHARMACIES,
  PARTNERS,
  directionsUrl,
  distanceKm,
  formatKm,
  hoursLabel,
  isOpenNow,
  onDutyToday,
  osmUrl,
  roadKm,
  taxiFare,
  type LatLng,
  type OsmPlace,
  type PartnerPharmacy,
} from '../data/places';
import type { StockLevel } from '../core/types';
import { searchMedicines } from '../core/search';
import { C, t, useLang } from '../i18n';
import { navigate, useLocation } from '../lib/router';
import { relTime } from '../core/course';
import { setState, uid, useStore } from '../state/store';
import { useNow } from '../lib/hooks';
import { formatFcfa } from '../lib/payments';
import MapView, { type MapMarker } from '../ui/MapView';
import PaySheet, { type PayRequest } from '../ui/PaySheet';
import { Sheet, useToast } from '../ui/overlay';
import { Button, Chip, cx, haptic, ScreenHeader, STOCK_STYLE, StockBadge } from '../ui/primitives';
import { QR } from '../lib/qr';

const S = {
  eyebrow: t('Pharmacies in Buea', 'Pharmacies à Buea', 'Pharmacy for Buea'),
  title: t('Find', 'Trouver', 'Find'),
  accent: t('it in stock', 'en stock', 'where e dey'),
  search: t('Which medicine? Any spelling is fine', 'Quel médicament ? Même mal écrit', 'Which medicine? Any spelling fine'),
  closest: t('Closest matches for', 'Résultats proches de', 'Wetin near'),
  noMed: t('No match yet — try the name on the box, or ask a pharmacist.', 'Aucun résultat — essayez le nom sur la boîte ou demandez au pharmacien.', 'We no see am — try di name for di box, or ask pharmacist.'),
  openNow: t('Open now', 'Ouvert', 'Open now'),
  onDuty: t('On duty', 'De garde', 'Night duty'),
  inStock: t('In stock', 'En stock', 'E dey'),
  health: t('Health centres', 'Centres de santé', 'Health centre'),
  from: t('From', 'Depuis', 'From'),
  useMine: t('Use my location', 'Ma position', 'Use my location'),
  usingMine: t('Your location', 'Votre position', 'Your location'),
  partners: t('MediMate partner pharmacies', 'Pharmacies partenaires', 'MediMate partner pharmacy dem'),
  partnersNote: t('Demo partners in real neighbourhoods. Stock is demonstration data.', 'Partenaires de démo dans de vrais quartiers. Le stock est fictif.', 'Demo partner for real quarters. Di stock na demo data.'),
  osm: t('Also on the map', 'Aussi sur la carte', 'Other one dem for map'),
  osmNote: t('Real pharmacies from OpenStreetMap — not partners yet, stock unknown. Call ahead.', 'Vraies pharmacies d’OpenStreetMap — pas encore partenaires, stock inconnu.', 'Real pharmacy from OpenStreetMap — dem never join, we no know dia stock. Call before you go.'),
  facilities: t('Health centres & hospitals', 'Centres de santé et hôpitaux', 'Health centre and hospital'),
  facilitiesNote: t('From OpenStreetMap. Services and hours not verified — Buea Regional Hospital has 24 h emergency care.', 'Depuis OpenStreetMap. Services non vérifiés — l’Hôpital régional de Buea assure les urgences 24 h/24.', 'From OpenStreetMap. We never check dia service — Buea Regional Hospital get emergency 24 hours.'),
  updated: t('updated', 'mis à jour', 'update'),
  closed: t('Closed', 'Fermé', 'E don close'),
  open: t('Open', 'Ouvert', 'Open'),
  dutyTonight: t('On duty tonight', 'De garde ce soir', 'Night duty today'),
  taxi: t('taxi', 'taxi', 'taxi'),
  walk: t('walkable', 'à pied', 'you fit waka'),
  noMatch: t('No pharmacy matches these filters.', 'Aucune pharmacie ne correspond.', 'No pharmacy match dis filter.'),
  rxBanner: t('{med} needs a prescription — bring it to the pharmacy.', '{med} est sur ordonnance — apportez-la.', '{med} need doctor paper — carry am go pharmacy.'),
  directions: t('Directions', 'Itinéraire', 'Direction'),
  call: t('Call', 'Appeler', 'Call'),
  callDemo: t('Demo listing — no real phone number', 'Fiche de démo — pas de vrai numéro', 'Demo listing — no real number'),
  wasIt: t('Was it in stock when you went?', 'C’était en stock quand vous y êtes allé ?', 'E bin dey when you go?'),
  yes: t('Yes', 'Oui', 'Yes'),
  no: t('No', 'Non', 'No'),
  thanks: t('Thanks — this keeps the map honest for everyone.', 'Merci — cela garde la carte fiable pour tous.', 'Thank you — dis one go help everybody.'),
  notify: t('Tell me when it’s back', 'Prévenez-moi au retour', 'Tell me when e come back'),
  notifying: t('We’ll tell you when it’s back', 'Vous serez prévenu', 'We go tell you when e come back'),
  allStock: t('Stock at this pharmacy', 'Stock de cette pharmacie', 'Wetin dey dis pharmacy'),
  reserve: t('Reserve & pay with Mobile Money', 'Réserver et payer par Mobile Money', 'Reserve and pay with Mobile Money'),
  reserveSub: t('{fee} deposit, deducted at pickup. Held for 2 hours.', 'Acompte de {fee}, déduit au retrait. Gardé 2 heures.', '{fee} deposit, dem go remove am when you collect. Dem go keep am 2 hours.'),
  reserveTitle: t('Reserve {med}', 'Réserver {med}', 'Reserve {med}'),
  pharmacy: t('Pharmacy', 'Pharmacie', 'Pharmacy'),
  medicine: t('Medicine', 'Médicament', 'Medicine'),
  packs: t('Packs', 'Boîtes', 'Pack'),
  deposit: t('Deposit (deducted at pickup)', 'Acompte (déduit au retrait)', 'Deposit (dem go remove am when you collect)'),
  rxNote: t('Prescription-only: the pharmacist will check your prescription at pickup.', 'Sur ordonnance : le pharmacien vérifiera l’ordonnance au retrait.', 'Na only with doctor paper: pharmacist go check your prescription when you come collect.'),
  reserved: t('Reserved!', 'Réservé !', 'E don reserve!'),
  pickup: t('Show this code at the counter', 'Montrez ce code au comptoir', 'Show dis code for counter'),
  holdUntil: t('Held until {time}', 'Gardé jusqu’à {time}', 'Dem go keep am until {time}'),
  myReservations: t('Your reservations', 'Vos réservations', 'Your reservation dem'),
  osmTag: t('On OpenStreetMap · not a partner yet', 'Sur OpenStreetMap · pas encore partenaire', 'For OpenStreetMap · never join'),
  viewOsm: t('View on OpenStreetMap', 'Voir sur OpenStreetMap', 'See am for OpenStreetMap'),
  demoTag: t('Demo', 'Démo', 'Demo'),
};

const DEPOSIT = 500;
const RANK: Record<StockLevel | 'unknown', number> = { in: 0, low: 1, out: 3, unknown: 2 };

interface Row extends PartnerPharmacy {
  level?: StockLevel;
  open: boolean;
  duty: boolean;
  km: number;
  updatedAt: number;
}

export default function FindScreen() {
  const { lang, L } = useLang();
  const { query } = useLocation();
  const now = useNow(60000);
  const toast = useToast();
  const overrides = useStore((s) => s.stock);
  const confirms = useStore((s) => s.confirms);
  const watch = useStore((s) => s.watch);
  const reservations = useStore((s) => s.reservations);
  const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const [medId, setMedId] = useState<string | null>(query.get('med'));
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [dutyOnly, setDutyOnly] = useState(false);
  const [stockOnly, setStockOnly] = useState(false);
  const [health, setHealth] = useState(query.get('layer') === 'health');
  const [origin, setOrigin] = useState<LatLng & { label: string; mine?: boolean }>(DEFAULT_ORIGIN);
  const [selected, setSelected] = useState<string | null>(query.get('focus'));
  const [pay, setPay] = useState<{ req: PayRequest; pharmacyId: string; medId: string; qty: number } | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);

  useEffect(() => {
    const m = query.get('med');
    if (m) setMedId(m);
    if (query.get('layer') === 'health') setHealth(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.toString()]);

  const med = medId ? MED_BY_ID[medId] : undefined;
  const duty = onDutyToday(new Date(now));

  const rows: Row[] = useMemo(() => {
    return PARTNERS.map((p) => {
      const o = overrides[p.id];
      const level = medId ? (o?.levels[medId] ?? p.stock[medId]) : undefined;
      const open = !o?.closed && isOpenNow(p, new Date(now));
      return { ...p, level, open, duty: duty === p.id, km: roadKm(origin, p.pos), updatedAt: o?.at ?? now - p.updatedMinsAgo * 60000 };
    })
      .filter((p) => (!openOnly || p.open) && (!dutyOnly || p.duty) && (!stockOnly || !medId || (p.level && p.level !== 'out')))
      .sort((a, b) => (medId ? RANK[a.level ?? 'unknown'] - RANK[b.level ?? 'unknown'] : 0) || Number(b.open) - Number(a.open) || a.km - b.km);
  }, [overrides, medId, openOnly, dutyOnly, stockOnly, origin, now, duty]);

  const osmRows = useMemo(() => OSM_PHARMACIES.map((p) => ({ ...p, km: roadKm(origin, p.pos) })).sort((a, b) => a.km - b.km), [origin]);
  const facilityRows = useMemo(() => FACILITIES.map((p) => ({ ...p, km: roadKm(origin, p.pos) })).sort((a, b) => a.km - b.km), [origin]);

  const markers: MapMarker[] = useMemo(() => {
    const list: MapMarker[] = rows.map((p) => ({
      id: p.id,
      pos: p.pos,
      kind: 'partner',
      label: p.name,
      selected: selected === p.id,
      duty: p.duty,
      color: medId ? STOCK_STYLE[p.level ?? 'unknown'].pin : p.open ? '#5b3fe8' : '#8a909c',
    }));
    osmRows.forEach((p) => list.push({ id: p.id, pos: p.pos, kind: 'osm', label: p.name, selected: selected === p.id }));
    if (health) facilityRows.forEach((p) => list.push({ id: p.id, pos: p.pos, kind: 'facility', label: p.name }));
    if (origin.mine) list.push({ id: 'me', pos: origin, kind: 'me' });
    return list;
  }, [rows, osmRows, facilityRows, health, origin, selected, medId]);

  const selectedPartner = rows.find((r) => r.id === selected) ?? (selected ? undefined : undefined);
  const selectedPlace = [...OSM_PHARMACIES, ...FACILITIES].find((p) => p.id === selected);
  const focus = (selectedPartner ?? selectedPlace)?.pos;

  const locate = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (distanceKm(me, DEFAULT_ORIGIN) > 30) {
          toast(lang === 'fr' ? 'Vous semblez hors de Buea — distances depuis Molyko.' : 'You seem to be outside Buea — showing distances from Molyko.');
          return;
        }
        setOrigin({ ...me, label: L(S.usingMine), mine: true });
      },
      () => toast(lang === 'fr' ? 'Position indisponible.' : 'Location unavailable.'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const hits = searchMedicines(search, STOCKED_MEDS).slice(0, 8);

  const pickMed = (id: string | null) => {
    haptic();
    setMedId(id);
    setSearching(false);
    setSearch('');
    if (id) setState((s) => ({ searches: { ...s.searches, [id]: (s.searches[id] ?? 0) + 1 } }));
  };

  const startReserve = (p: Row) => {
    if (!med) return;
    const id = uid();
    setPay({
      pharmacyId: p.id,
      medId: med.id,
      qty: 1,
      req: {
        title: L(S.reserveTitle).replace('{med}', med.name),
        lines: [
          { label: L(S.pharmacy), value: `${p.name}, ${p.area}` },
          { label: L(S.medicine), value: med.name },
          { label: L(S.packs), value: '1' },
          { label: L(S.deposit), value: formatFcfa(DEPOSIT) },
        ],
        amount: DEPOSIT,
        purpose: 'reservation',
        externalId: `res-${id}`,
        message: `MediMate reservation: ${med.name} at ${p.name}`,
        note: med.rx ? (
          <p className="flex items-start gap-2 rounded-xl bg-warn-soft px-3 py-2.5 text-[12.5px] leading-snug text-warn-ink ring-1 ring-warn-line">
            <FileText className="mt-px size-4 shrink-0" /> {L(S.rxNote)}
          </p>
        ) : undefined,
      },
    });
  };

  const onPaid = (r: { mode: 'demo' | 'live'; transId?: string }) => {
    if (!pay) return;
    const id = pay.req.externalId.replace('res-', '');
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    setState((s) => ({
      reservations: [
        { id, code, pharmacyId: pay.pharmacyId, medId: pay.medId, qty: pay.qty, amount: pay.req.amount, at: Date.now(), expiresAt: Date.now() + 2 * 3600000, mode: r.mode, transId: r.transId },
        ...s.reservations,
      ].slice(0, 10),
    }));
    setPay(null);
    setSelected(null);
    window.setTimeout(() => setTicket(id), 250);
  };

  const activeRes = reservations.filter((r) => r.expiresAt > now);
  const ticketRes = reservations.find((r) => r.id === ticket);

  return (
    <div className="space-y-4 pb-4">
      <ScreenHeader eyebrow={L(S.eyebrow)} title={L(S.title)} accent={L(S.accent)} />

      <div className="space-y-3 px-4">
        {/* Medicine picker */}
        <div className="relative">
          {med && !searching ? (
            <div className="flex items-center gap-3 rounded-[20px] bg-surface p-2 pl-4 shadow-card ring-1 ring-line">
              <Search className="size-5 shrink-0 text-muted" />
              <button onClick={() => setSearching(true)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[16px] font-semibold text-ink">{med.name}</span>
                <span className="block truncate text-[12px] text-muted">{med.generic}</span>
              </button>
              {med.rx && <span className="shrink-0 rounded-full bg-danger-soft px-2.5 py-1 text-[10.5px] font-semibold text-danger-ink ring-1 ring-danger-line">Rx</span>}
              <button aria-label="Clear" onClick={() => pickMed(null)} className="grid size-10 place-items-center rounded-2xl bg-surface-2 text-muted">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-[20px] bg-surface px-4 shadow-card ring-1 ring-line focus-within:ring-2 focus-within:ring-brand-500">
              <Search className="size-5 shrink-0 text-muted" />
              <input
                autoFocus={searching}
                value={search}
                onFocus={() => setSearching(true)}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={L(S.search)}
                className="h-[54px] min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-muted"
              />
              {searching && (
                <button onClick={() => setSearching(false)} className="text-[13px] font-semibold text-muted">
                  {L(C.cancel)}
                </button>
              )}
            </div>
          )}
          {searching && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="absolute inset-x-0 top-[62px] z-30 max-h-[300px] overflow-y-auto rounded-[20px] bg-surface p-1.5 shadow-float ring-1 ring-line">
              {search && hits[0]?.fuzzy && (
                <p className="px-3 pb-1 pt-2 text-[12px] text-muted">
                  {L(S.closest)} <b className="text-ink">“{search}”</b>
                </p>
              )}
              {hits.map(({ med: m, via, fuzzy }) => (
                <button key={m.id} onClick={() => pickMed(m.id)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-surface-2">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-semibold text-ink">
                      {m.name}
                      {search && via.toLowerCase() !== m.name.toLowerCase() && !fuzzy && <span className="font-normal text-muted"> · {via}</span>}
                    </span>
                    <span className="block truncate text-[12px] text-muted">{L(m.category)}</span>
                  </span>
                  {m.rx && <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-semibold text-danger-ink">Rx</span>}
                </button>
              ))}
              {search && hits.length === 0 && <p className="px-3 py-4 text-center text-[13px] text-muted">{L(S.noMed)}</p>}
            </motion.div>
          )}
        </div>

        {!med && !searching && (
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {['al', 'paracetamol', 'ors', 'amoxicillin', 'salbutamol', 'zinc'].map((id) => (
              <Chip key={id} onClick={() => pickMed(id)}>
                {MED_BY_ID[id].name}
              </Chip>
            ))}
          </div>
        )}

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          <Chip active={openOnly} onClick={() => setOpenOnly((v) => !v)} icon={Clock}>
            {L(S.openNow)}
          </Chip>
          <Chip active={dutyOnly} onClick={() => setDutyOnly((v) => !v)} icon={Moon}>
            {L(S.onDuty)}
          </Chip>
          {med && (
            <Chip active={stockOnly} onClick={() => setStockOnly((v) => !v)} icon={ShoppingBag}>
              {L(S.inStock)}
            </Chip>
          )}
          <Chip active={health} onClick={() => setHealth((v) => !v)} icon={Stethoscope}>
            {L(S.health)}
          </Chip>
        </div>

        {med?.rx && (
          <p className="flex items-center gap-2 rounded-2xl bg-warn-soft px-3.5 py-2.5 text-[13px] text-warn-ink ring-1 ring-warn-line">
            <FileText className="size-4 shrink-0" /> {L(S.rxBanner).replace('{med}', med.name)}
          </p>
        )}

        {activeRes.length > 0 && (
          <button onClick={() => setTicket(activeRes[0].id)} className="flex w-full items-center gap-3 rounded-2xl bg-safe-soft px-3.5 py-3 text-left ring-1 ring-safe-line">
            <ShoppingBag className="size-5 text-safe" />
            <span className="min-w-0 flex-1 text-[13.5px] font-semibold text-safe-ink">
              {L(S.myReservations)} · {MED_BY_ID[activeRes[0].medId]?.name} · <span className="font-mono">{activeRes[0].code}</span>
            </span>
          </button>
        )}

        {/* Map */}
        <div className="relative h-[290px] overflow-hidden rounded-[26px] shadow-card ring-1 ring-line">
          <MapView center={origin} markers={markers} onSelect={setSelected} focus={focus} dark={dark} />
          <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex justify-between">
            <span className="glass pointer-events-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold text-ink-2 shadow-card ring-1 ring-line">
              <MapIcon className="size-3.5" /> {L(S.from)} {origin.label}
            </span>
            <button onClick={locate} aria-label={L(S.useMine)} className="glass pointer-events-auto grid size-9 place-items-center rounded-full text-ink shadow-card ring-1 ring-line active:scale-90">
              <Crosshair className="size-4" />
            </button>
          </div>
          {med && (
            <div className="glass pointer-events-none absolute bottom-3 left-3 z-[500] flex gap-2.5 rounded-full px-3 py-1.5 text-[10.5px] font-semibold text-ink-2 ring-1 ring-line">
              {(['in', 'low', 'out'] as const).map((k) => (
                <span key={k} className="flex items-center gap-1">
                  <span className={cx('size-2 rounded-full', STOCK_STYLE[k].dot)} /> {L(C.stock[k])}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Partner list */}
        <div className="flex items-end justify-between px-1 pt-1">
          <h2 className="text-[13px] font-semibold text-ink-2">{L(S.partners)}</h2>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted ring-1 ring-line">{L(S.demoTag)}</span>
        </div>
        {rows.length === 0 && <p className="rounded-2xl bg-surface px-4 py-6 text-center text-[13px] text-muted ring-1 ring-line">{L(S.noMatch)}</p>}
        <div className="space-y-2.5">
          {rows.map((p) => (
            <motion.button
              layout
              key={p.id}
              onClick={() => (haptic(), setSelected(p.id))}
              className={cx('card block w-full p-4 text-left transition active:scale-[0.985]', selected === p.id && 'ring-2 ring-brand-500')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[16px] font-semibold tracking-[-0.01em] text-ink">{p.name}</p>
                  <p className="mt-0.5 truncate text-[12.5px] text-muted">
                    {p.area} · {p.landmark}
                  </p>
                </div>
                {med ? <StockBadge level={p.level ?? 'unknown'} /> : <OpenBadge open={p.open} duty={p.duty} />}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-2">
                <span className="font-semibold">{formatKm(p.km)}</span>
                <span className="text-muted">·</span>
                <span>{taxiFare(p.km) ? `~${formatFcfa(taxiFare(p.km))} ${L(S.taxi)}` : L(S.walk)}</span>
                <span className="text-muted">·</span>
                <span className={cx(p.open ? 'text-safe-ink' : 'text-muted')}>{p.duty ? L(S.dutyTonight) : p.open ? `${L(S.open)} · ${hoursLabel(p)}` : `${L(S.closed)} · ${hoursLabel(p)}`}</span>
                {med && (
                  <span className="w-full text-[11.5px] text-muted">
                    {L(S.updated)} {relTime(p.updatedAt - now, lang)}
                  </span>
                )}
              </div>
            </motion.button>
          ))}
        </div>

        {/* OSM directory */}
        <div className="px-1 pt-3">
          <h2 className="text-[13px] font-semibold text-ink-2">{L(S.osm)}</h2>
          <p className="mt-0.5 text-[12px] leading-snug text-muted">{L(S.osmNote)}</p>
        </div>
        <div className="divide-y divide-line overflow-hidden rounded-[22px] bg-surface ring-1 ring-line">
          {osmRows.map((p) => (
            <PlaceRow key={p.id} place={p} km={p.km} onClick={() => setSelected(p.id)} />
          ))}
        </div>

        {health && (
          <>
            <div className="px-1 pt-3">
              <h2 className="text-[13px] font-semibold text-ink-2">{L(S.facilities)}</h2>
              <p className="mt-0.5 text-[12px] leading-snug text-muted">{L(S.facilitiesNote)}</p>
            </div>
            <div className="divide-y divide-line overflow-hidden rounded-[22px] bg-surface ring-1 ring-line">
              {facilityRows.map((p) => (
                <PlaceRow key={p.id} place={p} km={p.km} onClick={() => setSelected(p.id)} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Partner detail */}
      <Sheet open={Boolean(selectedPartner)} onClose={() => setSelected(null)} title={selectedPartner?.name}>
        {selectedPartner && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <OpenBadge open={selectedPartner.open} duty={selectedPartner.duty} />
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-muted ring-1 ring-line">{L(S.demoTag)}</span>
              <span className="text-[12.5px] text-muted">
                {selectedPartner.area} · {formatKm(selectedPartner.km)}
              </span>
            </div>
            <p className="text-[13.5px] text-ink-2">{selectedPartner.landmark}</p>

            {med && (
              <div className="rounded-[22px] bg-surface-2 p-4 ring-1 ring-line">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[16px] font-semibold text-ink">{med.name}</p>
                    <p className="text-[12px] text-muted">
                      {L(S.updated)} {relTime(selectedPartner.updatedAt - now, lang)}
                    </p>
                  </div>
                  <StockBadge level={selectedPartner.level ?? 'unknown'} />
                </div>

                {selectedPartner.level && selectedPartner.level !== 'out' && (
                  <div className="mt-3 space-y-1.5">
                    <Button block icon={ShoppingBag} onClick={() => startReserve(selectedPartner)}>
                      {L(S.reserve)}
                    </Button>
                    <p className="text-center text-[11.5px] text-muted">{L(S.reserveSub).replace('{fee}', formatFcfa(DEPOSIT))}</p>
                  </div>
                )}
                {selectedPartner.level === 'out' && (
                  <Button
                    block
                    variant="secondary"
                    className="mt-3"
                    icon={watch.includes(med.id) ? BellRing : Bell}
                    onClick={() => setState((s) => ({ watch: s.watch.includes(med.id) ? s.watch.filter((x) => x !== med.id) : [...s.watch, med.id] }))}
                  >
                    {watch.includes(med.id) ? L(S.notifying) : L(S.notify)}
                  </Button>
                )}

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
                  <span className="text-[12.5px] text-ink-2">{L(S.wasIt)}</span>
                  <div className="flex gap-1.5">
                    {(['yes', 'no'] as const).map((v) => {
                      const key = `${selectedPartner.id}:${med.id}`;
                      const on = confirms[key] === v;
                      return (
                        <button
                          key={v}
                          onClick={() => {
                            haptic();
                            setState((s) => ({ confirms: { ...s.confirms, [key]: v } }));
                            toast(L(S.thanks));
                          }}
                          className={cx(
                            'inline-flex h-8 items-center gap-1 rounded-full px-3 text-[12px] font-semibold ring-1 transition',
                            on ? (v === 'yes' ? 'bg-safe-soft text-safe-ink ring-safe-line' : 'bg-danger-soft text-danger-ink ring-danger-line') : 'bg-surface text-ink-2 ring-line',
                          )}
                        >
                          {v === 'yes' ? <ThumbsUp className="size-3.5" /> : <ThumbsDown className="size-3.5" />}
                          {L(v === 'yes' ? S.yes : S.no)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <a href={directionsUrl(selectedPartner.pos)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand-600 text-[14px] font-semibold text-white active:scale-[0.97]">
                <Navigation className="size-4" /> {L(S.directions)}
              </a>
              <button disabled title={L(S.callDemo)} className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-surface text-[14px] font-semibold text-muted ring-1 ring-line">
                <Phone className="size-4" /> {L(S.call)}
              </button>
            </div>
            <p className="text-center text-[11px] text-muted">{L(S.callDemo)}</p>

            <div>
              <p className="mb-2 text-[13px] font-semibold text-ink-2">{L(S.allStock)}</p>
              <div className="divide-y divide-line overflow-hidden rounded-2xl ring-1 ring-line">
                {STOCKED_MEDS.map((m) => {
                  const lvl = overrides[selectedPartner.id]?.levels[m.id] ?? selectedPartner.stock[m.id] ?? 'unknown';
                  return (
                    <button key={m.id} onClick={() => setMedId(m.id)} className={cx('flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left', m.id === medId && 'bg-brand-50 dark:bg-brand-500/10')}>
                      <span className="text-[13.5px] text-ink">{m.name}</span>
                      <StockBadge level={lvl} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Sheet>

      {/* Real place detail */}
      <Sheet open={Boolean(selectedPlace)} onClose={() => setSelected(null)} title={selectedPlace?.name}>
        {selectedPlace && (
          <div className="space-y-4">
            <p className="inline-flex rounded-full bg-surface-2 px-2.5 py-1 text-[11.5px] font-semibold text-muted ring-1 ring-line">
              {selectedPlace.kind === 'pharmacy' ? L(S.osmTag) : selectedPlace.kind.replace('-', ' ')}
            </p>
            <p className="text-[14px] text-ink-2">{selectedPlace.kind === 'pharmacy' ? L(S.osmNote) : L(S.facilitiesNote)}</p>
            <div className="grid grid-cols-2 gap-2">
              <a href={directionsUrl(selectedPlace.pos)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand-600 text-[14px] font-semibold text-white">
                <Navigation className="size-4" /> {L(S.directions)}
              </a>
              <a href={osmUrl(selectedPlace.osm)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-surface text-[13px] font-semibold text-ink ring-1 ring-line">
                <ExternalLink className="size-4" /> OSM
              </a>
            </div>
          </div>
        )}
      </Sheet>

      <PaySheet open={Boolean(pay)} onClose={() => setPay(null)} req={pay?.req ?? null} onPaid={onPaid} />

      {/* Pickup ticket */}
      <Sheet open={Boolean(ticketRes)} onClose={() => setTicket(null)} title={L(S.reserved)}>
        {ticketRes && (
          <div className="flex flex-col items-center gap-4 pb-2 text-center">
            <div className="rounded-[26px] bg-white p-4 shadow-float ring-1 ring-black/5">
              <QR value={`MEDIMATE-RES:${ticketRes.id}:${ticketRes.code}`} size={170} />
            </div>
            <p className="font-mono text-[34px] font-semibold tracking-[0.2em] text-ink">{ticketRes.code}</p>
            <div>
              <p className="text-[15px] font-semibold text-ink">
                {MED_BY_ID[ticketRes.medId]?.name} · {PARTNERS.find((p) => p.id === ticketRes.pharmacyId)?.name}
              </p>
              <p className="mt-1 text-[13px] text-muted">
                {L(S.pickup)} · {L(S.holdUntil).replace('{time}', new Date(ticketRes.expiresAt).toLocaleTimeString(lang === 'fr' ? 'fr-CM' : 'en-GB', { hour: '2-digit', minute: '2-digit' }))}
              </p>
            </div>
            {ticketRes.mode === 'demo' && <p className="rounded-xl bg-info-soft px-3 py-2 text-[11.5px] text-info-ink ring-1 ring-info-line">Demo reservation — no money moved.</p>}
            <Button block variant="secondary" onClick={() => navigate(`/find?med=${ticketRes.medId}`)}>
              OK
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function OpenBadge({ open, duty }: { open: boolean; duty: boolean }) {
  const { L } = useLang();
  if (duty)
    return (
      <span className="inline-flex h-6 shrink-0 items-center gap-1 rounded-full bg-brand-600 px-2.5 text-[11px] font-semibold text-white">
        <Moon className="size-3" /> {L(S.onDuty)}
      </span>
    );
  return (
    <span className={cx('inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold ring-1', open ? 'bg-safe-soft text-safe-ink ring-safe-line' : 'bg-surface-2 text-muted ring-line')}>
      <span className={cx('size-1.5 rounded-full', open ? 'bg-safe' : 'bg-line-strong')} />
      {L(open ? S.open : S.closed)}
    </span>
  );
}

function PlaceRow({ place, km, onClick }: { place: OsmPlace; km: number; onClick: () => void }) {
  const { L } = useLang();
  return (
    <button onClick={() => (haptic(), onClick())} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2">
      <span className={cx('grid size-8 shrink-0 place-items-center rounded-xl', place.kind === 'pharmacy' ? 'bg-surface-2 text-muted ring-1 ring-line' : 'bg-danger-soft text-danger')}>
        {place.kind === 'pharmacy' ? <span className="size-2.5 rounded-full bg-info" /> : <Stethoscope className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-ink">{place.name}</span>
        <span className="block text-[11.5px] text-muted">
          {formatKm(km)}
          {place.emergency ? ' · 24 h emergency' : ''}
          {place.kind === 'pharmacy' ? ` · ${L(C.stock.unknown)}` : ''}
        </span>
      </span>
      <Navigation className="size-4 text-muted" />
    </button>
  );
}
