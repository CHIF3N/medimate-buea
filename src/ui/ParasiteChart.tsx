import { t, useLang } from '../i18n';

// Illustrative curves (not patient data): fever settles within a day or two, parasites are cleared
// only by the full 6-dose course, and stopping after dose 2 lets them climb back.

const S = {
  title: t('Why the fever goes before the parasites', 'Pourquoi la fièvre part avant les parasites', 'Why hot body dey go before parasite'),
  fever: t('How you feel (fever)', 'Ce que vous ressentez (fièvre)', 'How you dey feel (hot body)'),
  parasites: t('Parasites — full course', 'Parasites — traitement complet', 'Parasite — full treatment'),
  stopped: t('Parasites — stopped after dose 2', 'Parasites — arrêt après la 2e prise', 'Parasite — stop after dose 2'),
  doses: t('doses', 'prises', 'dose'),
  day: t('Day', 'Jour', 'Day'),
  note: t('Illustration, not patient data.', 'Illustration, pas des données de patients.', 'Na illustration, no be patient data.'),
};

const W = 320;
const H = 150;
const PAD = { l: 8, r: 8, t: 10, b: 26 };
const X = (h: number) => PAD.l + (h / 96) * (W - PAD.l - PAD.r);
const Y = (v: number) => PAD.t + (1 - v / 100) * (H - PAD.t - PAD.b);

function smooth(points: [number, number][]) {
  const p = points.map(([h, v]) => [X(h), Y(v)] as const);
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

export default function ParasiteChart() {
  const { L } = useLang();
  const fever = smooth([[0, 88], [8, 70], [24, 30], [36, 14], [48, 7], [72, 4], [96, 3]]);
  const full = smooth([[0, 100], [8, 86], [24, 58], [36, 40], [48, 24], [60, 11], [72, 4], [96, 1]]);
  const stopped = smooth([[8, 86], [24, 64], [36, 56], [48, 58], [72, 70], [96, 86]]);
  return (
    <figure className="rounded-2xl bg-surface-2 p-3 ring-1 ring-line">
      <figcaption className="mb-2 text-[13px] font-semibold text-ink">{L(S.title)}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={L(S.title)}>
        {[1, 2, 3, 4].map((d) => (
          <g key={d}>
            <line x1={X((d - 1) * 24)} x2={X((d - 1) * 24)} y1={PAD.t} y2={H - PAD.b} stroke="currentColor" className="text-line" strokeDasharray="2 4" />
            <text x={X((d - 1) * 24 + 12)} y={H - 8} textAnchor="middle" className="fill-muted text-[9px] font-medium">
              {L(S.day)} {d}
            </text>
          </g>
        ))}
        <path d={stopped} fill="none" stroke="var(--danger)" strokeWidth={2.2} strokeDasharray="5 5" strokeLinecap="round" />
        <path d={`${full} L${X(96)},${Y(0)} L${X(0)},${Y(0)} Z`} fill="var(--color-brand-500)" opacity={0.08} />
        <path d={full} fill="none" stroke="var(--color-brand-500)" strokeWidth={2.6} strokeLinecap="round" />
        <path d={fever} fill="none" stroke="var(--warn)" strokeWidth={2.6} strokeLinecap="round" />
        {[0, 8, 24, 36, 48, 60].map((h, i) => (
          <g key={h}>
            <circle cx={X(h)} cy={H - PAD.b + 1} r={4} fill="var(--surface)" stroke="var(--color-brand-500)" strokeWidth={2} />
            {i === 1 && <circle cx={X(h)} cy={Y(86)} r={3.5} fill="var(--danger)" />}
          </g>
        ))}
      </svg>
      <div className="mt-2 grid gap-1.5 text-[11.5px] text-ink-2">
        <Legend color="var(--warn)" label={L(S.fever)} />
        <Legend color="var(--color-brand-500)" label={L(S.parasites)} />
        <Legend color="var(--danger)" label={L(S.stopped)} dashed />
      </div>
      <p className="mt-2 text-[10.5px] text-muted">
        ○ = {L(S.doses)} 1–6 · {L(S.note)}
      </p>
    </figure>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg width="22" height="6">
        <line x1="1" x2="21" y1="3" y2="3" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeDasharray={dashed ? '4 4' : undefined} />
      </svg>
      {label}
    </span>
  );
}
