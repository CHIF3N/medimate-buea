import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ExternalLink, Info, Lock, Smartphone, XCircle } from 'lucide-react';
import { t, useLang } from '../i18n';
import { formatFcfa, guessMedium, paymentStatus, startPayment, validPhone, type Medium } from '../lib/payments';
import { Sheet } from './overlay';
import { Button, cx, Spinner } from './primitives';

const S = {
  pay: t('Pay', 'Payer', 'Pay'),
  method: t('Pay with Mobile Money', 'Payer par Mobile Money', 'Pay with Mobile Money'),
  phone: t('Mobile Money number', 'Numéro Mobile Money', 'Mobile Money number'),
  phoneHelp: t('The payment request goes to this number. Approve it with your PIN.', 'La demande de paiement arrive sur ce numéro. Validez avec votre code.', 'Di payment request go reach dis number. Approve am with your PIN.'),
  invalid: t('Enter a 9-digit Cameroon number starting with 6.', 'Entrez un numéro camerounais de 9 chiffres commençant par 6.', 'Put Cameroon number wey get 9 digit and start with 6.'),
  waiting: t('Approve the payment on your phone', 'Validez le paiement sur votre téléphone', 'Approve di payment for your phone'),
  waitingSub: t('A payment request was sent to {phone}. Enter your Mobile Money PIN to confirm.', 'Une demande a été envoyée au {phone}. Entrez votre code Mobile Money pour confirmer.', 'We don send request to {phone}. Put your Mobile Money PIN to confirm.'),
  openCheckout: t('Open secure checkout', 'Ouvrir le paiement sécurisé', 'Open secure checkout'),
  failed: t('Payment did not go through', 'Le paiement n’a pas abouti', 'Payment no go through'),
  retry: t('Try again', 'Réessayer', 'Try again'),
  demo: t('Demo payment — no money moves. Live Mobile Money switches on when the Fapshi keys are added.', 'Paiement de démonstration — aucun argent ne bouge. Le vrai Mobile Money s’active avec les clés Fapshi.', 'Demo payment — no money dey move. Real Mobile Money go start when Fapshi keys enter.'),
  secured: t('Processed by Fapshi · MTN MoMo & Orange Money', 'Traité par Fapshi · MTN MoMo et Orange Money', 'Fapshi dey process am · MTN MoMo & Orange Money'),
};

export interface PayRequest {
  title: string;
  lines: { label: string; value: string }[];
  amount: number;
  purpose: 'reservation' | 'subscription' | 'family';
  externalId: string;
  message: string;
  note?: ReactNode;
}

type Stage = 'form' | 'waiting' | 'failed';

export default function PaySheet({
  open,
  onClose,
  req,
  onPaid,
}: {
  open: boolean;
  onClose: () => void;
  req: PayRequest | null;
  onPaid: (r: { mode: 'demo' | 'live'; transId?: string }) => void;
}) {
  const { L } = useLang();
  const [phone, setPhone] = useState('');
  const [medium, setMedium] = useState<Medium>('mobile money');
  const [stage, setStage] = useState<Stage>('form');
  const [demo, setDemo] = useState(false);
  const [link, setLink] = useState<string>();
  const [error, setError] = useState<string>();
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (!open) {
      timers.current.forEach((x) => window.clearTimeout(x));
      timers.current = [];
      setStage('form');
      setLink(undefined);
      setError(undefined);
    }
  }, [open]);

  useEffect(() => {
    const g = guessMedium(phone);
    if (g) setMedium(g);
  }, [phone]);

  if (!req) return null;
  const ok = validPhone(phone);

  const pay = async () => {
    setStage('waiting');
    const res = await startPayment({ amount: req.amount, phone, medium, purpose: req.purpose, externalId: req.externalId, message: req.message });
    if ('error' in res) {
      setError(res.error);
      setStage('failed');
      return;
    }
    if (!('transId' in res)) {
      setDemo(true);
      timers.current.push(window.setTimeout(() => onPaid({ mode: 'demo' }), 3600));
      return;
    }
    setDemo(false);
    setLink(res.link);
    const poll = async (n: number) => {
      const st = await paymentStatus(res.transId);
      if (st === 'SUCCESSFUL') return onPaid({ mode: 'live', transId: res.transId });
      if (st === 'FAILED' || st === 'EXPIRED') return setStage('failed');
      if (n < 40) timers.current.push(window.setTimeout(() => void poll(n + 1), 10000)); // Fapshi allows 6 status checks a minute
    };
    timers.current.push(window.setTimeout(() => void poll(0), 8000));
  };

  const pretty = phone.replace(/\D/g, '').replace(/^237/, '').replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');

  return (
    <Sheet open={open} onClose={onClose} title={req.title}>
      <div className="space-y-4">
        <div className="rounded-2xl bg-surface-2 p-3.5 ring-1 ring-line">
          {req.lines.map((l) => (
            <div key={l.label} className="flex justify-between gap-3 py-1 text-[14px]">
              <span className="text-muted">{l.label}</span>
              <span className="text-right font-medium text-ink">{l.value}</span>
            </div>
          ))}
          <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2.5">
            <span className="text-[14px] font-semibold text-ink">{L(S.pay)}</span>
            <span className="tnum text-[22px] font-semibold tracking-[-0.02em] text-ink">{formatFcfa(req.amount)}</span>
          </div>
        </div>
        {req.note}

        {stage === 'form' && (
          <>
            <div>
              <p className="mb-2 text-[13px] font-semibold text-ink-2">{L(S.method)}</p>
              <div className="grid grid-cols-2 gap-2">
                <Operator active={medium === 'mobile money'} onClick={() => setMedium('mobile money')} name="MTN MoMo" color="#FFCC00" ink="#1a1a1a" />
                <Operator active={medium === 'orange money'} onClick={() => setMedium('orange money')} name="Orange Money" color="#FF7900" ink="#fff" />
              </div>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-ink-2">{L(S.phone)}</span>
              <div className="flex items-center rounded-2xl bg-surface ring-1 ring-line focus-within:ring-2 focus-within:ring-brand-500">
                <span className="border-r border-line px-3.5 py-3 text-[15px] font-medium text-muted">+237</span>
                <input
                  inputMode="tel"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d ]/g, '').slice(0, 12))}
                  placeholder="6XX XX XX XX"
                  className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-[16px] tracking-wide text-ink outline-none placeholder:text-muted/60"
                />
              </div>
              <span className={cx('mt-1.5 block text-[12px]', phone && !ok ? 'text-danger-ink' : 'text-muted')}>{phone && !ok ? L(S.invalid) : L(S.phoneHelp)}</span>
            </label>
            <Button block size="lg" icon={Lock} disabled={!ok} onClick={() => void pay()}>
              {L(S.pay)} {formatFcfa(req.amount)}
            </Button>
          </>
        )}

        {stage === 'waiting' && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3 rounded-2xl bg-surface-2 p-5 text-center ring-1 ring-line">
            <span className="relative grid size-16 place-items-center rounded-3xl bg-brand-600 text-white">
              <span className="absolute inset-0 animate-pulse-ring rounded-3xl bg-brand-500/40" />
              <Smartphone className="relative size-7" />
            </span>
            <p className="text-[16px] font-semibold text-ink">{L(S.waiting)}</p>
            <p className="text-[13px] leading-snug text-muted">{L(S.waitingSub).replace('{phone}', `+237 ${pretty}`)}</p>
            <Spinner className="text-brand-500" />
            {link && (
              <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 dark:text-brand-300">
                <ExternalLink className="size-4" /> {L(S.openCheckout)}
              </a>
            )}
          </motion.div>
        )}

        {stage === 'failed' && (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-danger-soft p-5 text-center ring-1 ring-danger-line">
            <XCircle className="size-8 text-danger" />
            <p className="text-[15px] font-semibold text-danger-ink">{L(S.failed)}</p>
            {error && <p className="text-[12px] text-danger-ink/80">{error}</p>}
            <Button variant="secondary" onClick={() => setStage('form')}>
              {L(S.retry)}
            </Button>
          </div>
        )}

        <div className="space-y-1.5">
          <p className="flex items-center justify-center gap-1.5 text-[11.5px] text-muted">
            <Lock className="size-3.5" /> {L(S.secured)}
          </p>
          {(demo || stage === 'form') && (
            <p className="flex items-start gap-1.5 rounded-xl bg-info-soft px-3 py-2 text-[11.5px] leading-snug text-info-ink ring-1 ring-info-line">
              <Info className="mt-px size-3.5 shrink-0" /> {L(S.demo)}
            </p>
          )}
        </div>
      </div>
    </Sheet>
  );
}

function Operator({ active, onClick, name, color, ink }: { active: boolean; onClick: () => void; name: string; color: string; ink: string }) {
  return (
    <button
      onClick={onClick}
      className={cx('flex items-center gap-2.5 rounded-2xl p-3 text-left ring-1 transition active:scale-[0.98]', active ? 'bg-surface ring-2 ring-brand-500' : 'bg-surface ring-line')}
    >
      <span className="grid size-9 place-items-center rounded-xl text-[11px] font-black" style={{ background: color, color: ink }}>
        {name.startsWith('MTN') ? 'MTN' : 'OM'}
      </span>
      <span className="text-[13.5px] font-semibold text-ink">{name}</span>
      {active && <CheckCircle2 className="ml-auto size-4 text-brand-500" />}
    </button>
  );
}
