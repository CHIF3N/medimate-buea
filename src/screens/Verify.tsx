import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  CircleHelp,
  FileWarning,
  Flag,
  Keyboard,
  MapPin,
  Printer,
  QrCode,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  ShieldX,
  Sparkles,
  X,
  type LucideIcon,
} from 'lucide-react';
import { DEMO_PACKS, verifyPack, type CheckStatus, type Verdict, type VerifyResult } from '../core/verify';
import { digitalLink, extractFromLabel, parsePackCode, type PackCode } from '../core/gs1';
import { t, useLang } from '../i18n';
import { navigate, useLocation } from '../lib/router';
import { setState, uid, useStore } from '../state/store';
import { Sheet, useToast } from '../ui/overlay';
import { Button, cx, haptic, ScreenHeader, Segmented, Spinner } from '../ui/primitives';
import { relTime } from '../core/course';

const S = {
  eyebrow: t('Anti-counterfeit', 'Anti-contrefaçon', 'Fight fake medicine'),
  title: t('Check', 'Vérifier', 'Check'),
  accent: t('your medicine', 'votre médicament', 'your medicine'),
  heroTitle: t('Is this pack genuine?', 'Cette boîte est-elle authentique ?', 'Dis pack na original?'),
  heroSub: t('Scan the code on the box, photograph the batch number, or type it.', 'Scannez le code de la boîte, photographiez le numéro de lot ou saisissez-le.', 'Scan di code for di box, snap di batch number, or type am.'),
  scan: t('Scan code', 'Scanner', 'Scan code'),
  photo: t('Read label', 'Lire l’étiquette', 'Read label'),
  type: t('Type batch', 'Saisir le lot', 'Type batch'),
  lotPlaceholder: t('Batch / LOT number, e.g. DEMO-AMX-9999', 'N° de lot, ex. DEMO-AMX-9999', 'Batch / LOT number, like DEMO-AMX-9999'),
  check: t('Check', 'Vérifier', 'Check'),
  demoPacks: t('Try a demo pack', 'Essayez une boîte de démo', 'Try demo pack'),
  reading: t('Reading the label on this phone…', 'Lecture de l’étiquette sur ce téléphone…', 'We dey read di label for dis phone…'),
  readFail: t('Couldn’t find a batch number in the photo — type it instead.', 'Aucun numéro de lot trouvé — saisissez-le.', 'We no see batch number for di picture — type am.'),
  camTitle: t('Scan the pack code', 'Scannez le code', 'Scan di pack code'),
  camHelp: t('Point at the barcode, QR or DataMatrix on the box.', 'Visez le code-barres, QR ou DataMatrix de la boîte.', 'Point am for di barcode, QR or DataMatrix for di box.'),
  camFail: t('Camera unavailable. Allow camera access, or type the batch number.', 'Caméra indisponible. Autorisez la caméra ou saisissez le lot.', 'Camera no dey work. Allow camera or type di batch number.'),
  product: t('Product', 'Produit', 'Product'),
  lot: t('Batch', 'Lot', 'Batch'),
  exp: t('Expiry', 'Péremption', 'Expiry'),
  didYouMean: t('Did you mean {lot}?', 'Vouliez-vous dire {lot} ?', 'You mean {lot}?'),
  lookToo: t('Look at the pack too', 'Regardez aussi la boîte', 'Look di pack too'),
  look1: t('Seal and blister are intact', 'Opercule et plaquette intacts', 'Seal and blister never open'),
  look2: t('Spelling and printing look right', 'Orthographe et impression correctes', 'Spelling and printing correct'),
  look3: t('Price is normal — very cheap is a warning sign', 'Prix normal — trop bas = alerte', 'Price normal — if e too cheap, take care'),
  look4: t('Tablets look the same as usual', 'Les comprimés ont l’aspect habituel', 'Tablet dem look like before'),
  report: t('Report this product', 'Signaler ce produit', 'Report dis product'),
  another: t('Check another', 'Vérifier une autre', 'Check another one'),
  findLicensed: t('Find a licensed pharmacy', 'Trouver une pharmacie agréée', 'Find licensed pharmacy'),
  recent: t('Recent checks', 'Vérifications récentes', 'Recent check dem'),
  how: t('How verification works', 'Comment ça marche', 'How e dey work'),
  how1: t('Today: a demo registry with fictional products.', 'Aujourd’hui : un registre de démo, produits fictifs.', 'Today: demo register with fake products.'),
  how2: t('Pilot: partner distributors share their batch lists.', 'Pilote : les distributeurs partenaires partagent leurs lots.', 'Pilot: partner distributor go share dia batch list.'),
  how3: t('Next: national registry + GS1 serial numbers, so every pack is unique.', 'Ensuite : registre national + numéros de série GS1, chaque boîte unique.', 'Next: national register + GS1 serial number, so every pack get e own code.'),
  trick: t('Try this: scan a printed demo pack with your normal camera app — it opens MediMate straight on the result (GS1 Digital Link).', 'Essayez : scannez une boîte de démo avec l’appareil photo normal — MediMate s’ouvre sur le résultat (GS1 Digital Link).', 'Try am: scan demo pack with your normal camera — e go open MediMate straight for di result (GS1 Digital Link).'),
  print: t('Print demo packs', 'Imprimer les boîtes de démo', 'Print demo pack dem'),
  reportTitle: t('Report a suspicious medicine', 'Signaler un médicament suspect', 'Report medicine wey no look correct'),
  where: t('Where did you buy it?', 'Où l’avez-vous acheté ?', 'Where you buy am?'),
  street: t('Street / market', 'Rue / marché', 'Street / market'),
  pharmacy: t('Pharmacy', 'Pharmacie', 'Pharmacy'),
  other: t('Other', 'Autre', 'Other'),
  area: t('Area (e.g. Mile 17)', 'Quartier (ex. Mile 17)', 'Quarter (like Mile 17)'),
  note: t('What looked wrong? (optional)', 'Qu’est-ce qui semblait anormal ? (facultatif)', 'Wetin no look correct? (optional)'),
  send: t('Save report', 'Enregistrer', 'Save report'),
  saved: t('Report saved on this phone. In the pilot it goes to partner pharmacists and health authorities.', 'Signalement enregistré. Dans le pilote, il est transmis aux pharmaciens partenaires et aux autorités.', 'We don save am for dis phone. For pilot, e go reach partner pharmacist and health authority.'),
};

const VERDICT: Record<Verdict, { icon: LucideIcon; ring: string; bg: string; text: string; iconBg: string }> = {
  registered: { icon: ShieldCheck, ring: 'ring-safe-line', bg: 'bg-safe-soft', text: 'text-safe-ink', iconBg: 'bg-safe' },
  caution: { icon: AlertTriangle, ring: 'ring-warn-line', bg: 'bg-warn-soft', text: 'text-warn-ink', iconBg: 'bg-warn' },
  danger: { icon: ShieldX, ring: 'ring-danger-line', bg: 'bg-danger-soft', text: 'text-danger-ink', iconBg: 'bg-emergency' },
  unknown: { icon: CircleHelp, ring: 'ring-warn-line', bg: 'bg-warn-soft', text: 'text-warn-ink', iconBg: 'bg-warn' },
};

const CHECK_ICON: Record<CheckStatus, { icon: LucideIcon; cls: string }> = {
  pass: { icon: CheckCircle2, cls: 'text-safe' },
  warn: { icon: AlertTriangle, cls: 'text-warn' },
  fail: { icon: ShieldX, cls: 'text-danger' },
  unknown: { icon: CircleHelp, cls: 'text-muted' },
};

export default function VerifyScreen() {
  const { lang, L } = useLang();
  const { path } = useLocation();
  const toast = useToast();
  const checks = useStore((s) => s.checks);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [typing, setTyping] = useState(false);
  const [lot, setLot] = useState('');
  const [camera, setCamera] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [looked, setLooked] = useState<boolean[]>([false, false, false, false]);
  const resultRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = (input: string | PackCode) => {
    const r = verifyPack(input);
    setResult(r);
    setLooked([false, false, false, false]);
    haptic(r.verdict === 'danger' ? 30 : 12);
    setState((s) => ({ checks: [{ at: Date.now(), lot: r.code.lot, product: r.record?.product, verdict: r.verdict }, ...s.checks].slice(0, 8) }));
    window.setTimeout(() => {
      const el = resultRef.current;
      const main = el?.closest('main');
      if (el && main) main.scrollTo({ top: el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 12, behavior: 'smooth' });
    }, 120);
  };

  // GS1 Digital Link opened from a phone camera: /01/<gtin>/10/<lot>?17=<expiry>
  useEffect(() => {
    if (path.startsWith('/01/')) {
      run(window.location.href);
      navigate('/verify', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  const onPhoto = async (file: File) => {
    setOcrBusy(true);
    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const found = extractFromLabel(data.text);
      if (found.lot) run({ format: 'text', raw: data.text, lot: found.lot, expiry: found.expiry });
      else {
        toast(L(S.readFail));
        setTyping(true);
      }
    } catch {
      toast(L(S.readFail));
      setTyping(true);
    } finally {
      setOcrBusy(false);
    }
  };

  const v = result ? VERDICT[result.verdict] : undefined;

  return (
    <div className="space-y-5 pb-4">
      <ScreenHeader eyebrow={L(S.eyebrow)} title={L(S.title)} accent={L(S.accent)} />

      <div className="space-y-5 px-4">
        <section className="relative overflow-hidden rounded-[28px] bg-[#101118] p-5 text-white shadow-float">
          <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-brand-500/30 blur-3xl" />
          <div className="relative mx-auto mb-5 aspect-[1.6] w-full max-w-[280px]">
            <Viewfinder />
          </div>
          <p className="relative text-[19px] font-semibold tracking-[-0.015em]">{L(S.heroTitle)}</p>
          <p className="relative mt-1 text-[13.5px] leading-snug text-white/70">{L(S.heroSub)}</p>
          <div className="relative mt-4 grid grid-cols-3 gap-2">
            <HeroButton icon={ScanLine} label={L(S.scan)} onClick={() => setCamera(true)} primary />
            <HeroButton icon={Camera} label={L(S.photo)} onClick={() => fileRef.current?.click()} busy={ocrBusy} />
            <HeroButton icon={Keyboard} label={L(S.type)} onClick={() => setTyping((x) => !x)} />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPhoto(f);
              e.target.value = '';
            }}
          />
          {ocrBusy && (
            <p className="relative mt-3 flex items-center gap-2 text-[12.5px] text-white/75">
              <Spinner className="text-white" /> {L(S.reading)}
            </p>
          )}
        </section>

        <AnimatePresence>
          {typing && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={(e) => {
                e.preventDefault();
                if (lot.trim()) run(lot);
              }}
              className="flex gap-2 overflow-hidden"
            >
              <input
                autoFocus
                value={lot}
                onChange={(e) => setLot(e.target.value.toUpperCase())}
                placeholder={L(S.lotPlaceholder)}
                className="h-12 min-w-0 flex-1 rounded-2xl bg-surface px-4 font-mono text-[14px] uppercase tracking-wide text-ink outline-none ring-1 ring-line placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-muted focus:ring-2 focus:ring-brand-500"
              />
              <Button type="submit" className="h-12" disabled={!lot.trim()}>
                {L(S.check)}
              </Button>
            </motion.form>
          )}
        </AnimatePresence>

        <section>
          <p className="eyebrow mb-2 px-1">{L(S.demoPacks)}</p>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {DEMO_PACKS.map((p) => (
              <button
                key={p.id}
                onClick={() => run(digitalLink(window.location.origin, p.product.gtin, p.lot, p.expiry, p.serial))}
                className="flex shrink-0 flex-col items-start gap-0.5 rounded-2xl bg-surface px-3.5 py-2.5 text-left shadow-card ring-1 ring-line active:scale-95"
              >
                <span className="text-[13px] font-semibold text-ink">{L(p.label)}</span>
                <span className="font-mono text-[10.5px] text-muted">{p.lot}</span>
              </button>
            ))}
          </div>
        </section>

        <div ref={resultRef} className="scroll-mt-4">
          <AnimatePresence mode="wait">
            {result && v && (
              <motion.section key={`${result.code.raw}-${result.verdict}`} initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className={cx('overflow-hidden rounded-[28px] ring-1', v.ring, 'bg-surface shadow-card')}>
                <div className={cx('flex items-start gap-3.5 p-4', v.bg)}>
                  <motion.span initial={{ scale: 0.5, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 12 }} className={cx('grid size-12 shrink-0 place-items-center rounded-2xl text-white', v.iconBg)}>
                    <v.icon className="size-6" />
                  </motion.span>
                  <div className="min-w-0">
                    <p className={cx('text-[19px] font-semibold tracking-[-0.015em]', v.text)}>{L(result.headline)}</p>
                    <p className={cx('mt-1 text-[13.5px] leading-snug', v.text, 'opacity-90')}>{L(result.summary)}</p>
                  </div>
                  <button aria-label="Close" onClick={() => setResult(null)} className="ml-auto grid size-8 shrink-0 place-items-center rounded-full bg-black/5 text-ink-2 dark:bg-white/10">
                    <X className="size-4" />
                  </button>
                </div>

                <div className="space-y-4 p-4">
                  <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-surface-2 p-3 ring-1 ring-line">
                    <Fact label={L(S.product)} value={result.record ? result.record.product : '—'} wide />
                    <Fact label={L(S.lot)} value={result.code.lot ?? '—'} mono span={2} />
                    <Fact label={L(S.exp)} value={result.expiry ? result.expiry.toLocaleDateString(lang === 'fr' ? 'fr-CM' : 'en-GB', { month: 'short', year: 'numeric' }) : '—'} />
                    {result.code.gtin && <Fact label="GTIN" value={result.code.gtin} mono wide />}
                  </dl>

                  {result.suggestion && (
                    <button onClick={() => run(result.suggestion!)} className="flex w-full items-center gap-2 rounded-2xl bg-brand-50 px-3.5 py-2.5 text-left text-[13.5px] font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-500/30">
                      <Sparkles className="size-4" /> {L(S.didYouMean).replace('{lot}', result.suggestion)}
                    </button>
                  )}

                  <ul className="space-y-2.5">
                    {result.checks.map((c) => {
                      const ic = CHECK_ICON[c.status];
                      return (
                        <li key={c.id} className="flex gap-3">
                          <ic.icon className={cx('mt-0.5 size-5 shrink-0', ic.cls)} />
                          <div className="min-w-0">
                            <p className="text-[14px] font-semibold text-ink">{L(c.title)}</p>
                            <p className="text-[12.5px] leading-snug text-muted">{L(c.detail)}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <div className="rounded-2xl bg-surface-2 p-3 ring-1 ring-line">
                    <p className="mb-2 text-[13px] font-semibold text-ink">{L(S.lookToo)}</p>
                    {[S.look1, S.look2, S.look3, S.look4].map((x, i) => (
                      <label key={i} className="flex items-center gap-2.5 py-1.5 text-[13px] text-ink-2">
                        <input type="checkbox" checked={looked[i]} onChange={() => setLooked((a) => a.map((y, j) => (j === i ? !y : y)))} className="size-4 accent-[var(--color-brand-600)]" />
                        {L(x)}
                      </label>
                    ))}
                  </div>

                  <div className="grid gap-2">
                    {result.verdict !== 'registered' && (
                      <Button block variant="danger" icon={Flag} onClick={() => setReporting(true)}>
                        {L(S.report)}
                      </Button>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="secondary" icon={RotateCcw} onClick={() => setResult(null)}>
                        {L(S.another)}
                      </Button>
                      <Button variant="secondary" icon={MapPin} onClick={() => navigate(`/find${result.record ? `?med=${result.record.medId}` : ''}`)}>
                        {L(S.findLicensed).split(' ').slice(0, 2).join(' ')}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {checks.length > 0 && (
          <section>
            <p className="eyebrow mb-2 px-1">{L(S.recent)}</p>
            <div className="divide-y divide-line overflow-hidden rounded-[22px] bg-surface ring-1 ring-line">
              {checks.slice(0, 4).map((c) => {
                const vv = VERDICT[c.verdict];
                return (
                  <button key={c.at} onClick={() => c.lot && run(c.lot)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                    <vv.icon className={cx('size-5 shrink-0', vv.text)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-[13px] text-ink">{c.lot ?? '—'}</span>
                      <span className="block truncate text-[11.5px] text-muted">{c.product ?? '—'}</span>
                    </span>
                    <span className="text-[11px] text-muted">{relTime(c.at - Date.now(), lang)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="card p-4">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <QrCode className="size-4 text-brand-500" /> {L(S.how)}
          </p>
          <ol className="mt-3 space-y-2.5">
            {[S.how1, S.how2, S.how3].map((x, i) => (
              <li key={i} className="flex gap-3 text-[13px] leading-snug text-ink-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-[11px] font-semibold text-ink ring-1 ring-line">{i + 1}</span>
                {L(x)}
              </li>
            ))}
          </ol>
          <p className="mt-3 rounded-2xl bg-brand-50 p-3 text-[12.5px] leading-snug text-brand-800 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-500/20">{L(S.trick)}</p>
          <Button block variant="secondary" icon={Printer} className="mt-3" onClick={() => window.open('/packs', '_blank')}>
            {L(S.print)}
          </Button>
        </section>
      </div>

      <ScannerSheet open={camera} onClose={() => setCamera(false)} onCode={(raw) => (setCamera(false), run(parsePackCode(raw)))} />
      <ReportSheet open={reporting} onClose={() => setReporting(false)} result={result} onSaved={() => (setReporting(false), toast(L(S.saved)))} />
    </div>
  );
}

function Viewfinder() {
  return (
    <div className="relative h-full w-full" style={{ ['--scan-distance' as string]: '150px' }}>
      {['left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-2xl', 'right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-2xl', 'left-0 bottom-0 border-l-[3px] border-b-[3px] rounded-bl-2xl', 'right-0 bottom-0 border-r-[3px] border-b-[3px] rounded-br-2xl'].map((c) => (
        <span key={c} className={cx('absolute size-9 border-white/90', c)} />
      ))}
      <div className="absolute inset-5 grid grid-cols-[1fr_auto] items-center gap-4 rounded-xl bg-white/[0.04] p-3">
        <div className="space-y-1.5">
          <div className="h-2 w-3/4 rounded-full bg-white/25" />
          <div className="h-2 w-1/2 rounded-full bg-white/15" />
          <div className="mt-3 font-mono text-[10px] tracking-wider text-white/60">LOT DEMO-AMX-9999</div>
          <div className="font-mono text-[10px] tracking-wider text-white/60">EXP 03/2027</div>
        </div>
        <div className="grid size-16 grid-cols-6 gap-[2px] rounded-md bg-white p-1.5">
          {Array.from({ length: 36 }, (_, i) => (
            <span key={i} className={cx('rounded-[1px]', (i * 7 + (i % 5)) % 3 === 0 || i < 6 || i % 6 === 0 ? 'bg-[#101118]' : 'bg-white')} />
          ))}
        </div>
      </div>
      <span className="absolute inset-x-4 top-2 h-[2px] animate-scan rounded-full bg-brand-400 shadow-[0_0_14px_3px_rgb(139_124_251/0.8)]" />
    </div>
  );
}

function HeroButton({ icon: Icon, label, onClick, primary, busy }: { icon: LucideIcon; label: string; onClick: () => void; primary?: boolean; busy?: boolean }) {
  return (
    <button
      onClick={() => (haptic(), onClick())}
      disabled={busy}
      className={cx('flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-2xl text-[12px] font-semibold transition active:scale-95', primary ? 'bg-white text-[#101118]' : 'bg-white/10 text-white ring-1 ring-white/15')}
    >
      {busy ? <Spinner /> : <Icon className="size-5" />}
      {label}
    </button>
  );
}

function Fact({ label, value, mono, wide, span }: { label: string; value: string; mono?: boolean; wide?: boolean; span?: 2 }) {
  return (
    <div className={cx('min-w-0', wide && 'col-span-3', span === 2 && 'col-span-2')}>
      <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className={cx('truncate text-[13.5px] text-ink', mono && 'font-mono text-[12.5px]')}>{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Camera scanner (native BarcodeDetector where available, WebAssembly fallback elsewhere)
// ---------------------------------------------------------------------------

function ScannerSheet({ open, onClose, onCode }: { open: boolean; onClose: () => void; onCode: (raw: string) => void }) {
  const { L } = useLang();
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const found = useRef(onCode);
  found.current = onCode;

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | undefined;
    let raf = 0;
    let alive = true;
    setError(false);
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } }, audio: false });
        if (!alive || !video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Native = (window as any).BarcodeDetector;
        const formats = ['qr_code', 'data_matrix', 'ean_13', 'code_128'];
        const Detector = Native && (await Native.getSupportedFormats?.())?.includes('qr_code') ? Native : (await import('barcode-detector/ponyfill')).BarcodeDetector;
        const detector = new Detector({ formats });
        const tick = async () => {
          if (!alive || !video.current) return;
          try {
            const codes = await detector.detect(video.current);
            if (codes[0]?.rawValue) {
              haptic(20);
              found.current(codes[0].rawValue);
              return;
            }
          } catch {
            /* frame not ready */
          }
          raf = window.setTimeout(tick, 180);
        };
        void tick();
      } catch {
        setError(true);
      }
    })();
    return () => {
      alive = false;
      window.clearTimeout(raf);
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} title={L(S.camTitle)}>
      <div className="space-y-3">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[24px] bg-black">
          <video ref={video} playsInline muted className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-[18%]" style={{ ['--scan-distance' as string]: '220px' }}>
            {['left-0 top-0 border-l-[3px] border-t-[3px] rounded-tl-2xl', 'right-0 top-0 border-r-[3px] border-t-[3px] rounded-tr-2xl', 'left-0 bottom-0 border-l-[3px] border-b-[3px] rounded-bl-2xl', 'right-0 bottom-0 border-r-[3px] border-b-[3px] rounded-br-2xl'].map((c) => (
              <span key={c} className={cx('absolute size-10 border-white', c)} />
            ))}
            <span className="absolute inset-x-2 top-0 h-[2px] animate-scan rounded-full bg-brand-400 shadow-[0_0_14px_3px_rgb(139_124_251/0.8)]" />
          </div>
          {error && (
            <div className="absolute inset-0 grid place-items-center p-6 text-center">
              <p className="flex flex-col items-center gap-2 text-[14px] text-white/85">
                <FileWarning className="size-8" /> {L(S.camFail)}
              </p>
            </div>
          )}
        </div>
        <p className="text-center text-[13px] text-muted">{L(S.camHelp)}</p>
      </div>
    </Sheet>
  );
}

function ReportSheet({ open, onClose, result, onSaved }: { open: boolean; onClose: () => void; result: VerifyResult | null; onSaved: () => void }) {
  const { L } = useLang();
  const [where, setWhere] = useState<'street' | 'pharmacy' | 'other'>('street');
  const [area, setArea] = useState('');
  const [note, setNote] = useState('');
  return (
    <Sheet open={open} onClose={onClose} title={L(S.reportTitle)}>
      <div className="space-y-4">
        {result && (
          <p className="rounded-2xl bg-surface-2 px-3.5 py-2.5 font-mono text-[12.5px] text-ink-2 ring-1 ring-line">
            LOT {result.code.lot ?? '—'} {result.record ? `· ${result.record.product}` : ''}
          </p>
        )}
        <div>
          <p className="mb-2 text-[13px] font-semibold text-ink-2">{L(S.where)}</p>
          <Segmented<'street' | 'pharmacy' | 'other'>
            value={where}
            onChange={setWhere}
            options={[
              { value: 'street', label: L(S.street) },
              { value: 'pharmacy', label: L(S.pharmacy) },
              { value: 'other', label: L(S.other) },
            ]}
          />
        </div>
        <input value={area} onChange={(e) => setArea(e.target.value)} placeholder={L(S.area)} className="h-12 w-full rounded-2xl bg-surface px-4 text-[15px] text-ink outline-none ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-brand-500" />
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={L(S.note)} className="w-full resize-none rounded-2xl bg-surface px-4 py-3 text-[15px] text-ink outline-none ring-1 ring-line placeholder:text-muted focus:ring-2 focus:ring-brand-500" />
        <Button
          block
          size="lg"
          variant="emergency"
          icon={Flag}
          onClick={() => {
            setState((s) => ({ reports: [{ id: uid(), at: Date.now(), lot: result?.code.lot, product: result?.record?.product, where, area, note }, ...s.reports] }));
            setArea('');
            setNote('');
            onSaved();
          }}
        >
          {L(S.send)}
        </Button>
      </div>
    </Sheet>
  );
}
