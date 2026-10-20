import { pick, type L10n, type Lang } from '../core/types';
import { useStore } from '../state/store';

export const t = (en: string, fr: string, pcm: string): L10n => ({ en, fr, pcm });

export function defaultLang(): Lang {
  try {
    return navigator.language?.toLowerCase().startsWith('fr') ? 'fr' : 'en';
  } catch {
    return 'en';
  }
}

/** Current UI language plus a translator for L10n values. */
export function useLang() {
  const lang = useStore((s) => s.lang) ?? defaultLang();
  const L = (text: L10n | undefined) => pick(text, lang);
  return { lang, L };
}

export const LANG_LABEL: Record<Lang, { short: string; name: string; sample: string }> = {
  en: { short: 'EN', name: 'English', sample: 'Safe medicine, every dose.' },
  fr: { short: 'FR', name: 'Français', sample: 'Le bon médicament, à chaque dose.' },
  pcm: { short: 'PCM', name: 'Pidgin', sample: 'Correct medicine, every dose.' },
};

/** Speech synthesis language per UI language (Pidgin is read with an English voice). */
export const SPEECH_LANG: Record<Lang, string> = { en: 'en-GB', fr: 'fr-FR', pcm: 'en-NG' };

// Strings used across several screens.
export const C = {
  tagline: t('Safe medicine, from purchase to the last dose.', 'Le bon médicament, de l’achat à la dernière dose.', 'Correct medicine, from di buying reach di last dose.'),
  demo: t('Prototype · demo data', 'Prototype · données de démo', 'Prototype · demo data'),
  disclaimer: t(
    'Information, not medical advice. Emergency: call 119.',
    'Information, pas un avis médical. Urgence : appelez le 119.',
    'Na information, e no be doctor advice. Emergency: call 119.',
  ),
  offline: t('Offline — MediMate still works', 'Hors ligne — MediMate fonctionne', 'No network — MediMate still dey work'),
  back: t('Back', 'Retour', 'Back'),
  close: t('Close', 'Fermer', 'Close'),
  cancel: t('Cancel', 'Annuler', 'Cancel'),
  save: t('Save', 'Enregistrer', 'Save'),
  done: t('Done', 'Terminé', 'Done'),
  listen: t('Listen', 'Écouter', 'Listen'),
  stop: t('Stop', 'Arrêter', 'Stop'),
  directions: t('Directions', 'Itinéraire', 'Direction'),
  undo: t('Undo', 'Annuler', 'Undo'),
  share: t('Share', 'Partager', 'Share'),
  tabs: {
    home: t('Home', 'Accueil', 'Home'),
    ask: t('Ask', 'Demander', 'Ask'),
    find: t('Find', 'Trouver', 'Find'),
    verify: t('Verify', 'Vérifier', 'Check'),
    course: t('Course', 'Traitement', 'Treatment'),
  },
  level: {
    EMERGENCY: t('Emergency', 'Urgence', 'Emergency'),
    RED: t('Needs a professional', 'Voir un professionnel', 'Need health worker'),
    AMBER: t('Check first', 'Vérifiez d’abord', 'Check first'),
    GREEN: t('OK as labelled', 'OK selon la notice', 'E okay as label talk'),
    INFO: t('Information', 'Information', 'Information'),
  },
  stock: {
    in: t('In stock', 'En stock', 'E dey'),
    low: t('Running low', 'Stock faible', 'E don small'),
    out: t('Out of stock', 'Rupture', 'E don finish'),
    unknown: t('Stock unknown', 'Stock inconnu', 'We no know'),
  },
  rx: t('Prescription needed', 'Sur ordonnance', 'Need doctor paper'),
};
