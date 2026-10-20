import { useState } from 'react';
import { Delete, Phone, PhoneOff } from 'lucide-react';
import { USSD_CODE, ussdRespond } from '../core/ussd';
import { t, useLang } from '../i18n';
import { Sheet } from '../ui/overlay';
import { cx, haptic } from '../ui/primitives';

const S = {
  title: t('Feature-phone mode', 'Mode téléphone simple', 'Small-phone mode'),
  sub: t('No smartphone, no internet: the same service over USSD. Dial, then answer with the keypad.', 'Sans smartphone ni internet : le même service par USSD. Composez puis répondez au clavier.', 'No smartphone, no internet: di same service with USSD. Dial, then answer with keypad.'),
  demo: t('Simulation of the *237*90# short code. The same logic runs live at /api/ussd.', 'Simulation du code court *237*90#. La même logique tourne en ligne sur /api/ussd.', 'Na simulation of *237*90#. Di same logic dey run live for /api/ussd.'),
};

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

export default function UssdSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { L } = useLang();
  const [dial, setDial] = useState(USSD_CODE);
  const [session, setSession] = useState<string[] | null>(null);
  const [screen, setScreen] = useState('');
  const [input, setInput] = useState('');
  const [ended, setEnded] = useState(false);

  const show = (history: string[]) => {
    const res = ussdRespond(history.join('*'));
    setScreen(res.replace(/^(CON|END) /, ''));
    setEnded(res.startsWith('END'));
  };

  const press = (k: string) => {
    haptic(6);
    if (session && !ended) setInput((v) => (v + k).slice(0, 20));
    else if (!session) setDial((v) => (v + k).slice(0, 14));
  };

  const call = () => {
    haptic(14);
    if (!session || ended) {
      if (dial !== USSD_CODE) {
        setScreen(`Unknown code ${dial}\nTry ${USSD_CODE}`);
        setSession([]);
        setEnded(true);
        return;
      }
      setSession([]);
      setInput('');
      show([]);
      return;
    }
    if (!input) return;
    const next = [...session, input];
    setSession(next);
    setInput('');
    show(next);
  };

  const hangUp = () => {
    haptic(10);
    setSession(null);
    setScreen('');
    setInput('');
    setEnded(false);
    setDial(USSD_CODE);
  };

  const back = () => {
    haptic(6);
    if (session && !ended) setInput((v) => v.slice(0, -1));
    else if (!session) setDial((v) => v.slice(0, -1));
  };

  return (
    <Sheet open={open} onClose={() => (hangUp(), onClose())} title={L(S.title)}>
      <div className="space-y-3 pb-2">
        <p className="text-[13px] leading-snug text-muted">{L(S.sub)}</p>
        <div className="mx-auto w-full max-w-[290px] rounded-[38px] bg-gradient-to-b from-[#2b2e38] to-[#16181f] p-4 shadow-float ring-1 ring-black/40">
          <div className="mb-3 flex items-center justify-between px-2 text-[10px] font-semibold text-white/50">
            <span>MTN CM</span>
            <span className="h-1.5 w-12 rounded-full bg-black/50" />
            <span>▮▮▮▯</span>
          </div>
          <div className="h-[178px] overflow-y-auto rounded-xl bg-[#c7d8b5] p-3 font-mono text-[12px] leading-snug text-[#1f2a17] shadow-[inset_0_2px_6px_rgb(0_0_0/0.35)]">
            {session ? (
              <>
                <pre className="whitespace-pre-wrap font-mono">{screen}</pre>
                {!ended && (
                  <p className="mt-2 border-t border-[#1f2a17]/30 pt-1">
                    &gt; {input}
                    <span className="ml-px inline-block h-3 w-1.5 animate-pulse bg-[#1f2a17] align-middle" />
                  </p>
                )}
                {ended && <p className="mt-2 border-t border-[#1f2a17]/30 pt-1 text-[10.5px] opacity-70">[OK] to close</p>}
              </>
            ) : (
              <div className="grid h-full place-items-center text-center">
                <div>
                  <p className="text-[22px] font-semibold tracking-wider">{dial || ' '}</p>
                  <p className="mt-1 text-[10.5px] opacity-70">Press call ☎</p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <button onClick={call} aria-label="Call / Send" className="grid h-11 place-items-center rounded-2xl bg-[#1fa463] text-white active:scale-95">
              <Phone className="size-5" />
            </button>
            <button onClick={back} aria-label="Delete" className="grid h-11 place-items-center rounded-2xl bg-white/10 text-white active:scale-95">
              <Delete className="size-5" />
            </button>
            <button onClick={hangUp} aria-label="End" className="grid h-11 place-items-center rounded-2xl bg-[#d23b3b] text-white active:scale-95">
              <PhoneOff className="size-5" />
            </button>
            {KEYS.map((k) => (
              <button
                key={k}
                onClick={() => press(k)}
                className={cx('h-11 rounded-2xl bg-white/[0.07] font-mono text-[18px] font-semibold text-white ring-1 ring-white/10 active:scale-95 active:bg-white/20')}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <p className="text-center text-[11.5px] text-muted">{L(S.demo)}</p>
      </div>
    </Sheet>
  );
}
