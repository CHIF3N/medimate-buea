import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  FileWarning,
  Flag,
  Keyboard,
  MapPin,
  MessageCircleQuestion,
  Printer,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  ShieldX,
  X,
  type LucideIcon,
} from 'lucide-react';
import { DEMO_PACKS, PRODUCTS, verifyPack, type CheckStatus, type Verdict, type VerifyResult } from '../core/verify';
import { digitalLink, extractFromLabel, parsePackCode, toGtin14, type PackCode } from '../core/gs1';
import { medicineInText } from '../core/search';
import { MED_BY_ID } from '../data/medicines';
import type { Medicine } from '../core/types';
import { t, useLang } from '../i18n';
import { navigate, useLocation } from '../lib/router';
import { setState, uid, useStore } from '../state/store';
import { Sheet, useToast } from '../ui/overlay';
import { Button, cx, haptic, Segmented, Spinner } from '../ui/primitives';
import { relTime } from '../core/course';

const S = {
  eyebrow: t('Fake medicine check', 'Contrôle des faux médicaments', 'Check fake medicine'),
  title: t('Is my medicine', 'Mon médicament est-il', 'My medicine na'),
  accent: t('real?', 'authentique ?', 'original?'),
  sub: t('Point your camera at the box. MediMate tells you what the medicine is and whether it’s safe to use.', 'Pointez la caméra sur la boîte. MediMate vous dit quel est ce médicament et s’il est sûr.', 'Point your camera for di box. MediMate go tell you wetin di medicine be and if e safe.'),
  scan: t('Scan the box', 'Scanner la boîte', 'Scan di box'),
  scanSub: t('Point at the square code or barcode', 'Visez le code carré ou le code-barres', 'Point am for di square code or barcode'),
  photo: t('Take a photo of the box', 'Photographier la boîte', 'Snap di box'),
  other: t('No code on the box? Type it instead', 'Pas de code ? Saisissez-le', 'No code for box? Type am'),
  typeHelp: t('Type the code printed after “LOT” or “BATCH” — usually near the expiry date.', 'Saisissez le code imprimé après « LOT » — souvent près de la date de péremption.', 'Type di code wey dey after “LOT” or “BATCH” — e dey near di expiry date.'),
  lotPlaceholder: t('e.g. DEMO-AMX-9999', 'ex. DEMO-AMX-9999', 'like DEMO-AMX-9999'),
  check: t('Check', 'Vérifier', 'Check'),
  typeCode: t('Type the code', 'Saisir le code', 'Type di code'),
  demoPacks: t('No box at hand? Try an example', 'Pas de boîte ? Essayez un exemple', 'No box near you? Try example'),
  reading: t('Reading the box…', 'Lecture de la boîte…', 'We dey read di box…'),
  readFail: t('We couldn’t read the code in that photo. Try the camera scan, or type the code.', 'Code illisible sur la photo. Essayez le scan ou saisissez le code.', 'We no fit read di code for di picture. Try scan or type am.'),
  camTitle: t('Scan the box', 'Scanner la boîte', 'Scan di box'),
  camHelp: t('Hold the box steady, with the square code or barcode inside the frame.', 'Tenez la boîte, le code dans le cadre.', 'Hold di box steady, make di code dey inside di frame.'),
  camFail: t('Camera unavailable. Allow camera access, or take a photo instead.', 'Caméra indisponible. Autorisez la caméra ou prenez une photo.', 'Camera no dey work. Allow camera or snap picture.'),
  whatIs: t('What this medicine is', 'Ce médicament', 'Wetin dis medicine be'),
  rx: t('Needs a prescription', 'Sur ordonnance', 'Need doctor paper'),
  otc: t('Sold without prescription', 'Sans ordonnance', 'You fit buy am without doctor paper'),
  askAbout: t('Ask MediMate about it', 'Poser une question', 'Ask MediMate about am'),
  unknownMed: t('We couldn’t tell which medicine this is from the code alone.', 'Impossible d’identifier le médicament à partir du code seul.', 'We no fit know which medicine from di code alone.'),
  checks: t('What we checked', 'Ce que nous avons vérifié', 'Wetin we check'),
  details: t('Technical details', 'Détails techniques', 'Technical details'),
  product: t('Product', 'Produit', 'Product'),
  lot: t('Batch (LOT)', 'Lot', 'Batch (LOT)'),
  exp: t('Expiry', 'Péremption', 'Expiry'),
  didYouMean: t('Did you mean {lot}?', 'Vouliez-vous dire {lot} ?', 'You mean {lot}?'),
  lookToo: t('Also look at the pack yourself', 'Regardez aussi la boîte', 'Look di pack too'),
  look1: t('Seal and blister are intact', 'Opercule et plaquette intacts', 'Seal and blister never open'),
  look2: t('Spelling and printing look right', 'Orthographe et impression correctes', 'Spelling and printing correct'),
  look3: t('Price is normal — very cheap is a warning sign', 'Prix normal — trop bas = alerte', 'Price normal — if e too cheap, take care'),
  look4: t('Tablets look the same as usual', 'Les comprimés ont l’aspect habituel', 'Tablet dem look like before'),
  report: t('Report this medicine', 'Signaler ce médicament', 'Report dis medicine'),
  another: t('Check another', 'Vérifier une autre', 'Check another one'),
  findLicensed: t('Licensed pharmacy', 'Pharmacie agréée', 'Licensed pharmacy'),
  recent: t('Recently checked', 'Vérifiés récemment', 'Wetin you check before'),
  presenters: t('For presenters: print example boxes', 'Démo : imprimer des boîtes exemples', 'For presenter: print example box'),
  reportTitle: t('Report a suspicious medicine', 'Signaler un médicament suspect', 'Report medicine wey no look correct'),
  where: t('Where did you buy it?', 'Où l’avez-vous acheté ?', 'Where you buy am?'),
  street: t('Street / market', 'Rue / marché', 'Street / market'),
  pharmacy: t('Pharmacy', 'Pharmacie', 'Pharmacy'),
  otherPlace: t('Other', 'Autre', 'Other'),
  area: t('Area (e.g. Mile 17)', 'Quartier (ex. Mile 17)', 'Quarter (like Mile 17)'),
  note: t('What looked wrong? (optional)', 'Qu’est-ce qui semblait anormal ? (facultatif)', 'Wetin no look correct? (optional)'),
  send: t('Save report', 'Enregistrer', 'Save report'),
  saved: t('Report saved on this phone. In the pilot it goes to partner pharmacists and health authorities.', 'Signalement enregistré. Dans le pilote, il est transmis aux pharmaciens partenaires et aux autorités.', 'We don save am for dis phone. For pilot, e go reach partner pharmacist and health authority.'),
};

const HEADLINE: Record<Verdict, ReturnType<typeof t>> = {
  registered: t('Looks genuine', 'Semble authentique', 'E look original'),
  caution: t('Genuine — but check the date', 'Authentique — vérifiez la date', 'E original — but check di date'),
  danger: t('Don’t take this medicine', 'Ne prenez pas ce médicament', 'No take dis medicine'),
  unknown: t('We couldn’t check this one', 'Vérification impossible', 'We no fit check dis one'),
};
const SUMMARY: Record<Verdict, ReturnType<typeof t>> = {
  registered: t('This box matches the maker’s records and is in date.', 'Cette boîte correspond aux registres du fabricant et n’est pas périmée.', 'Dis box match di maker record and e never expire.'),
  caution: t('It matches the maker’s records, but read the warning below before using it.', 'Elle correspond aux registres, mais lisez l’avertissement ci-dessous.', 'E match di maker record, but read di warning for down before you use am.'),
  danger: t('Something is wrong with this box. Keep it, take it back to the seller or a licensed pharmacy, and report it.', 'Quelque chose ne va pas avec cette boîte. Gardez-la, rapportez-la au vendeur ou à une pharmacie agréée, et signalez-la.', 'Something no correct for dis box. Keep am, carry am go back to di seller or licensed pharmacy, and report am.'),
  unknown: t('It isn’t in our records. That doesn’t mean it’s fake — show it to a licensed pharmacist before taking it.', 'Elle n’est pas dans nos registres. Cela ne veut pas dire qu’elle est fausse — montrez-la à un pharmacien agréé avant de la prendre.', 'E no dey our record. Dat one no mean say e fake — show am to licensed pharmacist before you take am.'),
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

/** Work out which medicine a scan is, even when the batch itself is unknown. */
function identify(r: VerifyResult): Medicine | undefined {
  if (r.record) return MED_BY_ID[r.record.medId];
  if (r.code.gtin) {
    const p = Object.values(PRODUCTS).find((x) => x.gtin === toGtin14(r.code.gtin!));
    if (p) return MED_BY_ID[p.medId];
  }
  return medicineInText(r.code.raw);
}

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
  const [details, setDetails] = useState(false);
  const [looked, setLooked] = useState<boolean[]>([false, false, false, false]);
  const resultRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const run = (input: string | PackCode) => {
    const r = verifyPack(input);
    setResult(r);
    setDetails(false);
    setLooked([false, false, false, false]);
    haptic(r.verdict === 'danger' ? 30 : 12);
    const med = identify(r);
    setState((s) => ({ checks: [{ at: Date.now(), lot: r.code.lot, product: med?.name ?? r.record?.product, verdict: r.verdict }, ...s.checks].slice(0, 8) }));
    window.setTimeout(() => {
      const el = resultRef.current;
      const main = el?.closest('main');
      if (el && main) main.scrollTo({ top: el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 12, behavior: 'smooth' });
    }, 120);
  };

  // A box scanned with the phone's normal camera opens MediMate here (GS1 Digital Link).
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
      if (found.lot || medicineInText(data.text)) run({ format: 'text', raw: data.text, lot: found.lot, expiry: found.expiry });
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
  const med = result ? identify(result) : undefined;

  return (
    <div className="space-y-5 pb-4">
      <header className="px-5 pb-1 pt-2">
        <p className="eyebrow mb-1.5">{L(S.eyebrow)}</p>
        <h1 className="display text-[34px] text-ink">
          {L(S.title)} <span className="text-brand-600 dark:text-brand-300">{L(S.accent)}</span>
        </h1>
        <p className="mt-2 max-w-[34ch] text-[14px] leading-snug text-muted">{L(S.sub)}</p>
      </header>

      <div className="space-y-5 px-4">
        <section className="relative overflow-hidden rounded-[28px] bg-brand-50 p-5 ring-1 ring-brand-100 dark:bg-brand-500/10 dark:ring-brand-500/20">
          <div className="relative mx-auto mb-5 aspect-[1.7] w-full max-w-[260px]">
            <BoxIllustration />
          </div>
          <button
            onClick={() => (haptic(), setCamera(true))}
            className="flex w-full items-center gap-3.5 rounded-[22px] bg-brand-600 p-4 text-left text-white shadow-[0_14px_30px_-14px_rgb(91_63_232/0.9)] active:scale-[0.98]"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20">
              <ScanLine className="size-6" />
            </span>
            <span>
              <span className="block text-[17px] font-bold">{L(S.scan)}</span>
              <span className="block text-[12.5px] text-white/85">{L(S.scanSub)}</span>
            </span>
          </button>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button onClick={() => (haptic(), fileRef.current?.click())} disabled={ocrBusy} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-surface text-[13px] font-semibold text-ink ring-1 ring-line active:scale-[0.97]">
              {ocrBusy ? <Spinner /> : <Camera className="size-4 text-brand-600" />} {L(S.photo).split(' ').slice(0, 2).join(' ')}
            </button>
            <button onClick={() => (haptic(), setTyping((x) => !x))} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-surface text-[13px] font-semibold text-ink ring-1 ring-line active:scale-[0.97]">
              <Keyboard className="size-4 text-brand-600" /> {L(S.typeCode)}
            </button>
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
            <p className="mt-3 flex items-center gap-2 text-[12.5px] text-brand-700 dark:text-brand-200">
              <Spinner /> {L(S.reading)}
            </p>
          )}
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
                className="overflow-hidden"
              >
                <p className="mb-2 mt-3 text-[12.5px] leading-snug text-ink-2">{L(S.typeHelp)}</p>
                <div className="flex gap-2">
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
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </section>

        <div ref={resultRef} className="scroll-mt-4">
          <AnimatePresence mode="wait">
            {result && v && (
              <motion.section key={`${result.code.raw}-${result.verdict}`} initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} className={cx('overflow-hidden rounded-[28px] bg-surface shadow-card ring-1', v.ring)}>
                <div className={cx('flex items-start gap-3.5 p-4', v.bg)}>
                  <motion.span initial={{ scale: 0.5, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 12 }} className={cx('grid size-12 shrink-0 place-items-center rounded-2xl text-white', v.iconBg)}>
                    <v.icon className="size-6" />
                  </motion.span>
                  <div className="min-w-0">
                    <p className={cx('text-[20px] font-bold tracking-[-0.015em]', v.text)}>{L(HEADLINE[result.verdict])}</p>
                    <p className={cx('mt-1 text-[13.5px] leading-snug opacity-90', v.text)}>{L(SUMMARY[result.verdict])}</p>
                  </div>
                  <button aria-label="Close" onClick={() => setResult(null)} className="ml-auto grid size-8 shrink-0 place-items-center rounded-full bg-black/5 text-ink-2 dark:bg-white/10">
                    <X className="size-4" />
                  </button>
                </div>

                <div className="space-y-4 p-4">
                  <div className="rounded-2xl bg-surface-2 p-3.5 ring-1 ring-line">
                    <p className="eyebrow">{L(S.whatIs)}</p>
                    {med ? (
                      <>
                        <p className="mt-1 text-[18px] font-bold tracking-[-0.01em] text-ink">{med.name}</p>
                        <p className="text-[13px] font-semibold text-brand-700 dark:text-brand-300">{L(med.category)}</p>
                        <p className="mt-1.5 text-[13.5px] leading-snug text-ink-2">{L(med.usedFor)}</p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          <span className={cx('rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1', med.rx ? 'bg-danger-soft text-danger-ink ring-danger-line' : 'bg-safe-soft text-safe-ink ring-safe-line')}>
                            {med.rx ? L(S.rx) : L(S.otc)}
                          </span>
                          <button onClick={() => navigate(`/ask?q=${encodeURIComponent(`What is ${med.name}?`)}`)} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-600 dark:text-brand-300">
                            <MessageCircleQuestion className="size-4" /> {L(S.askAbout)}
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="mt-1 text-[13.5px] text-muted">{L(S.unknownMed)}</p>
                    )}
                  </div>

                  {result.suggestion && (
                    <button onClick={() => run(result.suggestion!)} className="flex w-full items-center gap-2 rounded-2xl bg-brand-50 px-3.5 py-2.5 text-left text-[13.5px] font-semibold text-brand-700 ring-1 ring-brand-200 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-500/30">
                      <CircleHelp className="size-4" /> {L(S.didYouMean).replace('{lot}', result.suggestion)}
                    </button>
                  )}

                  <div>
                    <p className="mb-2 text-[13px] font-semibold text-ink">{L(S.checks)}</p>
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
                  </div>

                  <div className="rounded-2xl bg-surface-2 p-3 ring-1 ring-line">
                    <p className="mb-1 text-[13px] font-semibold text-ink">{L(S.lookToo)}</p>
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
                      <Button variant="secondary" icon={MapPin} onClick={() => navigate(`/find${med ? `?med=${med.id}` : ''}`)}>
                        {L(S.findLicensed)}
                      </Button>
                    </div>
                  </div>

                  <button onClick={() => setDetails((d) => !d)} className="flex w-full items-center gap-1.5 text-[12px] font-semibold text-muted">
                    {L(S.details)} <ChevronDown className={cx('size-4 transition', details && 'rotate-180')} />
                  </button>
                  {details && (
                    <dl className="grid grid-cols-3 gap-2 rounded-2xl bg-surface-2 p-3 ring-1 ring-line">
                      <Fact label={L(S.product)} value={result.record ? `${result.record.product} · ${result.record.pack}` : '—'} wide />
                      <Fact label={L(S.lot)} value={result.code.lot ?? '—'} mono span={2} />
                      <Fact label={L(S.exp)} value={result.expiry ? result.expiry.toLocaleDateString(lang === 'fr' ? 'fr-CM' : 'en-GB', { month: 'short', year: 'numeric' }) : '—'} />
                      {result.code.gtin && <Fact label="GTIN" value={result.code.gtin} mono wide />}
                      {result.code.serial && <Fact label="Serial" value={result.code.serial} mono wide />}
                    </dl>
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

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
                <span className="text-[11px] text-muted">{p.product.product}</span>
              </button>
            ))}
          </div>
        </section>

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
                      <span className="block truncate text-[13.5px] font-semibold text-ink">{c.product ?? '—'}</span>
                      <span className="block truncate text-[11.5px] text-muted">{L(HEADLINE[c.verdict])}</span>
                    </span>
                    <span className="text-[11px] text-muted">{relTime(c.at - Date.now(), lang)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <button onClick={() => window.open('/packs', '_blank')} className="flex w-full items-center justify-center gap-2 py-2 text-[12px] font-semibold text-muted">
          <Printer className="size-4" /> {L(S.presenters)}
        </button>
      </div>

      <ScannerSheet open={camera} onClose={() => setCamera(false)} onCode={(raw) => (setCamera(false), run(parsePackCode(raw)))} />
      <ReportSheet open={reporting} onClose={() => setReporting(false)} result={result} onSaved={() => (setReporting(false), toast(L(S.saved)))} />
    </div>
  );
}

/** A friendly medicine box with its square code — shows patients what to point the camera at. */
function BoxIllustration() {
  return (
    <svg viewBox="0 0 260 150" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="bx" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#f1f0ff" />
        </linearGradient>
      </defs>
      <path d="M40 40 L170 22 L222 42 L92 62 Z" fill="#e4e2ff" stroke="#aba3fe" strokeWidth="2" strokeLinejoin="round" />
      <path d="M40 40 L92 62 L92 132 L40 110 Z" fill="#ccc8ff" stroke="#aba3fe" strokeWidth="2" strokeLinejoin="round" />
      <path d="M92 62 L222 42 L222 112 L92 132 Z" fill="url(#bx)" stroke="#aba3fe" strokeWidth="2" strokeLinejoin="round" />
      <rect x="104" y="70" width="58" height="9" rx="4.5" transform="skewY(-8)" fill="#6f57f5" opacity=".85" />
      <rect x="104" y="84" width="38" height="7" rx="3.5" transform="skewY(-8)" fill="#ccc8ff" />
      <g transform="translate(168 70) skewY(-8)">
        <rect width="40" height="40" rx="6" fill="#fff" stroke="#5b3fe8" strokeWidth="2" />
        {[0, 1, 2, 3, 4].flatMap((r) =>
          [0, 1, 2, 3, 4].map((c) => ((r * 3 + c * 5) % 3 === 0 || r === 0 || c === 0 ? <rect key={`${r}-${c}`} x={5 + c * 6} y={5 + r * 6} width="5" height="5" rx="1" fill="#1e164c" /> : null)),
        )}
      </g>
      <g className="animate-float">
        <rect x="160" y="58" width="58" height="62" rx="10" fill="none" stroke="#5b3fe8" strokeWidth="3" strokeDasharray="10 8" />
      </g>
      <text x="104" y="120" fontSize="9" fontFamily="ui-monospace, monospace" fill="#6a6f7b" transform="skewY(-8)">LOT DEMO-AMX-9999 · EXP 03/27</text>
    </svg>
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
              { value: 'other', label: L(S.otherPlace) },
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
