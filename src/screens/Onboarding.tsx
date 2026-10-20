import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import type { Lang } from '../core/types';
import { C, LANG_LABEL, t } from '../i18n';
import { setState } from '../state/store';
import { LogoMark } from '../ui/Logo';
import { haptic } from '../ui/primitives';

const S = {
  welcome: t('Welcome to MediMate', 'Bienvenue sur MediMate', 'Welcome for MediMate'),
  choose: t('Choose your language', 'Choisissez votre langue', 'Choose your language'),
};

const FLAG: Record<Lang, string> = { en: 'EN', fr: 'FR', pcm: 'PCM' };

export default function Onboarding() {
  const pickLang = (lang: Lang) => {
    haptic(12);
    setState({ lang });
  };
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[80] flex flex-col overflow-y-auto overflow-x-hidden bg-bg">
      <div className="pointer-events-none absolute -left-24 -top-24 size-80 rounded-full bg-brand-400/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 size-80 rounded-full bg-brand-300/25 blur-3xl" />
      <div className="relative flex flex-1 flex-col justify-center px-6 py-10">
        <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}>
          <LogoMark size={64} className="animate-float" />
        </motion.div>
        <motion.h1 initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 }} className="display mt-7 text-[46px] text-ink">
          {S.welcome.en}
        </motion.h1>
        <motion.p initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.18 }} className="mt-2 text-[16px] leading-snug text-ink-2">
          {C.tagline.en}
          <br />
          <span className="text-muted">{C.tagline.fr}</span>
        </motion.p>

        <p className="eyebrow mt-9">
          {S.choose.en} · {S.choose.fr}
        </p>
        <div className="mt-3 grid gap-2.5">
          {(['en', 'fr', 'pcm'] as Lang[]).map((l, i) => (
            <motion.button
              key={l}
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.24 + i * 0.06 }}
              onClick={() => pickLang(l)}
              className="group flex w-full min-w-0 items-center gap-4 rounded-[22px] bg-surface p-4 text-left shadow-card ring-1 ring-line transition active:scale-[0.98]"
            >
              <span className="brand-gradient grid size-12 shrink-0 place-items-center rounded-2xl font-mono text-[13px] font-bold text-white">{FLAG[l]}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-semibold text-ink">{LANG_LABEL[l].name}</span>
                <span className="block truncate text-[13px] text-muted">{LANG_LABEL[l].sample}</span>
              </span>
              <ArrowRight className="size-5 text-muted transition group-hover:translate-x-0.5" />
            </motion.button>
          ))}
        </div>
        <p className="mt-8 text-center text-[11.5px] leading-snug text-muted">
          {C.demo.en} · {C.disclaimer.en}
        </p>
      </div>
    </motion.div>
  );
}
