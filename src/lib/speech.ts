import { useEffect, useState } from 'react';
import type { Lang } from '../core/types';
import { SPEECH_LANG } from '../i18n';

// Read-aloud uses the phone's built-in voices (works offline on most phones).
// Voice input uses the browser's speech recognition, which needs internet on most browsers.

let speakingListeners = new Set<(v: boolean) => void>();
let speaking = false;
const setSpeaking = (v: boolean) => {
  speaking = v;
  speakingListeners.forEach((l) => l(v));
};

export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const want = SPEECH_LANG[lang].toLowerCase();
  const base = want.split('-')[0];
  return (
    voices.find((v) => v.lang.toLowerCase() === want) ??
    (lang === 'pcm' ? voices.find((v) => /en-(ng|gh|za|ke)/i.test(v.lang)) : undefined) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(base))
  );
}

export function speak(text: string, lang: Lang, rate = 0.95) {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[*_#`]/g, ''));
  u.lang = SPEECH_LANG[lang];
  const v = pickVoice(lang);
  if (v) u.voice = v;
  u.rate = rate;
  u.onstart = () => setSpeaking(true);
  u.onend = () => setSpeaking(false);
  u.onerror = () => setSpeaking(false);
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
  setSpeaking(false);
}

export function useSpeaking() {
  const [v, setV] = useState(speaking);
  useEffect(() => {
    speakingListeners.add(setV);
    return () => {
      speakingListeners.delete(setV);
    };
  }, []);
  return v;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecognition = any;

export function canListen() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function listen(lang: Lang, onText: (t: string, final: boolean) => void, onEnd: (error?: string) => void): AnyRecognition {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) {
    onEnd('unsupported');
    return null;
  }
  const r: AnyRecognition = new Ctor();
  r.lang = lang === 'fr' ? 'fr-FR' : 'en-NG';
  r.interimResults = true;
  r.continuous = false;
  r.maxAlternatives = 1;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  r.onresult = (e: any) => {
    let text = '';
    let final = false;
    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
      if (e.results[i].isFinal) final = true;
    }
    onText(text, final);
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  r.onerror = (e: any) => onEnd(e.error || 'error');
  r.onend = () => onEnd();
  try {
    r.start();
  } catch {
    onEnd('error');
  }
  return r;
}
