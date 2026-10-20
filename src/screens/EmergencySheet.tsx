import { Navigation, Phone, Siren } from 'lucide-react';
import { DEFAULT_ORIGIN, EMERGENCY_NUMBERS, FACILITIES, directionsUrl, formatKm, roadKm } from '../data/places';
import { t, useLang } from '../i18n';
import { Sheet } from '../ui/overlay';
import { haptic } from '../ui/primitives';

const S = {
  title: t('Emergency', 'Urgence', 'Emergency'),
  call: t('Call 119 — Ambulance', 'Appeler le 119 — Ambulance', 'Call 119 — Ambulance'),
  callSub: t('Free from any phone', 'Gratuit depuis tout téléphone', 'Free from any phone'),
  other: t('Other emergency numbers', 'Autres numéros d’urgence', 'Other emergency number'),
  nearest: t('Nearest hospitals', 'Hôpitaux les plus proches', 'Hospital wey near'),
  er: t('24 h emergency unit', 'Urgences 24 h/24', 'Emergency 24 hours'),
  wait: t('While you wait', 'En attendant', 'As you dey wait'),
  w1: t('Stay with the person. Keep them still and warm.', 'Restez avec la personne. Gardez-la au calme et au chaud.', 'Stay with di person. Make e lie quiet and warm.'),
  w2: t('If they are unconscious but breathing, lay them on their side.', 'Si elle est inconsciente mais respire, mettez-la sur le côté.', 'If e no dey wake but e dey breathe, lay am for e side.'),
  w3: t('Do not give medicines, food or drink unless a health worker says so.', 'Ne donnez ni médicament, ni nourriture, ni boisson sans avis d’un soignant.', 'No give am medicine, food or drink unless health worker talk.'),
  w4: t('Bring any medicine packs they have taken.', 'Apportez les boîtes des médicaments pris.', 'Carry any medicine pack wey e don take.'),
  note: t('Numbers from public listings — save them in your phone today.', 'Numéros issus de listes publiques — enregistrez-les aujourd’hui.', 'Number from public list — save dem for your phone today.'),
};

export default function EmergencySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { L } = useLang();
  const hospitals = FACILITIES.filter((f) => f.kind === 'hospital')
    .map((f) => ({ ...f, km: roadKm(DEFAULT_ORIGIN, f.pos) }))
    .sort((a, b) => Number(Boolean(b.emergency)) - Number(Boolean(a.emergency)) || a.km - b.km)
    .slice(0, 3);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      tone="danger"
      title={
        <span className="flex items-center gap-2 text-danger-ink">
          <Siren className="size-5" /> {L(S.title)}
        </span>
      }
    >
      <div className="space-y-4 pb-2">
        <a
          href="tel:119"
          onClick={() => haptic(25)}
          className="relative flex items-center gap-4 overflow-hidden rounded-[24px] bg-emergency p-4 text-white shadow-[0_18px_40px_-16px_rgb(180_20_27/0.9)] active:scale-[0.98]"
        >
          <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15">
            <span className="absolute inset-0 animate-pulse-ring rounded-2xl bg-white/25" />
            <Phone className="relative size-7" />
          </span>
          <span>
            <span className="block text-[19px] font-semibold tracking-[-0.01em]">{L(S.call)}</span>
            <span className="block text-[13px] text-white/80">{L(S.callSub)}</span>
          </span>
        </a>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink-2">{L(S.other)}</p>
          <div className="grid grid-cols-3 gap-2">
            {EMERGENCY_NUMBERS.slice(1).map((n) => (
              <a key={n.number} href={`tel:${n.number}`} className="rounded-2xl bg-danger-soft px-3 py-3 text-center ring-1 ring-danger-line active:scale-95">
                <span className="tnum block font-mono text-[22px] font-semibold text-danger-ink">{n.number}</span>
                <span className="block text-[11px] font-medium text-danger-ink/80">{L(n.label)}</span>
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink-2">{L(S.nearest)}</p>
          <div className="divide-y divide-line overflow-hidden rounded-[20px] bg-surface ring-1 ring-line">
            {hospitals.map((h) => (
              <a key={h.id} href={directionsUrl(h.pos)} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-ink">{h.name}</span>
                  <span className="block text-[12px] text-muted">
                    {formatKm(h.km)}
                    {h.emergency ? ` · ${L(S.er)}` : ''}
                  </span>
                </span>
                <span className="grid size-9 place-items-center rounded-full bg-brand-600 text-white">
                  <Navigation className="size-4" />
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className="rounded-[20px] bg-surface-2 p-4 ring-1 ring-line">
          <p className="mb-2 text-[13px] font-semibold text-ink">{L(S.wait)}</p>
          <ul className="space-y-1.5">
            {[S.w1, S.w2, S.w3, S.w4].map((w, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-snug text-ink-2">
                <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-danger" /> {L(w)}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-center text-[11px] text-muted">{L(S.note)}</p>
      </div>
    </Sheet>
  );
}
