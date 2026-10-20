// Safety regression tests for the answer engine: `npm test`
// Each case states the minimum safe outcome. Add a case for every bug found in testing.
import { answer, type AnswerKind } from '../src/core/engine';
import type { Lang, Level } from '../src/core/types';

interface Case {
  q: string;
  followUp?: string;
  noFollowUp?: boolean;
  kind?: AnswerKind | AnswerKind[];
  level?: Level | Level[];
  lang?: Lang;
  med?: string;
}

const cases: Case[] = [
  // --- the hero demo questions ---
  { q: 'My pikin get hot body since two days, I fit give am Amox?', kind: 'firewall', level: 'RED', lang: 'pcm', med: 'amoxicillin' },
  { q: 'Fever don cool, I fit stop di Coartem?', kind: 'adherence', level: 'RED', lang: 'pcm', med: 'al' },
  { q: 'Can I drink beer with Flagyl?', kind: 'interaction', level: 'RED', lang: 'en', med: 'metronidazole' },
  { q: 'I get chest pain and breath dey tie me', kind: 'emergency', level: 'EMERGENCY', lang: 'pcm' },

  // --- build-guide test questions ---
  { q: "Can I give amoxicillin for my child's fever?", kind: 'firewall', level: 'RED' },
  { q: 'I feel better, can I stop my antibiotic?', kind: 'adherence', level: 'RED' },
  { q: 'Can I take turmeric with blood thinners?', kind: 'interaction', level: 'AMBER' },
  { q: 'What is the dose of tramadol?', kind: 'unknown-med', level: 'RED' },
  { q: 'I am pregnant, can I take ibuprofen?', kind: 'med-info', level: 'RED', med: 'ibuprofen' },
  { q: 'I have chest pain and trouble breathing', kind: 'emergency', level: 'EMERGENCY' },
  { q: 'amoxcilin dose', kind: 'firewall', med: 'amoxicillin' },
  { q: 'parasitamol for headache', kind: 'dose', level: 'GREEN', med: 'paracetamol' },

  // --- French ---
  { q: 'Mon enfant a de la fièvre, je peux lui donner de l’amoxicilline ?', kind: 'firewall', lang: 'fr', med: 'amoxicillin' },
  { q: 'Quelle est la posologie du paracétamol ?', kind: 'dose', level: 'GREEN', lang: 'fr' },
  { q: 'Je me sens mieux, est-ce que je peux arrêter le Coartem ?', kind: 'adherence', lang: 'fr' },
  { q: 'fièvre depuis 2 mois', kind: 'urgent', lang: 'fr' },
  { q: 'Mon bébé de 3 semaines a de la fièvre', kind: 'emergency', lang: 'fr' },

  // --- emergencies & danger signs ---
  { q: 'my baby is having convulsions', kind: 'emergency' },
  { q: 'pikin no fit drink and e dey vomit everything', kind: 'emergency' },
  { q: 'I swallowed too many paracetamol tablets', kind: 'emergency' },
  { q: 'my lips are swelling after amoxicillin', kind: 'emergency' },
  { q: 'urine black like coca cola after malaria', kind: 'emergency' },
  { q: 'I am pregnant and bleeding', kind: 'emergency' },
  { q: 'cough for 3 weeks', kind: 'urgent' },
  { q: 'blood in stool', kind: 'urgent' },

  // --- must NOT be emergencies ---
  { q: 'I have food poisoning, what can I take?', kind: 'symptom', level: 'GREEN' },
  { q: 'I get belle pain', kind: 'symptom', level: ['AMBER', 'GREEN'] },
  { q: 'Flagyl makes my urine dark', kind: 'side-effects', med: 'metronidazole' },
  { q: 'I am not drinking alcohol while on Coartem', kind: ['interaction', 'med-info', 'test-first'] },
  { q: 'Can I go for a malaria test, I am sick', lang: 'en' },

  // --- medicines & interactions ---
  { q: 'Panadol and Doliprane together?', kind: 'interaction', level: 'RED' },
  { q: 'Can I take omeprazole 20 mg with food?', kind: ['dose', 'med-info'] },
  { q: 'Coartem with milk', kind: 'interaction', level: 'GREEN' },
  { q: 'cipro and zinc', kind: 'interaction', level: 'AMBER' },
  { q: 'warfarin and ibuprofen', kind: 'interaction', level: 'RED' },
  { q: 'I take the pill, I got amoxicillin, does it still work?', kind: 'interaction', level: 'INFO' },
  { q: 'Can paracetamol stop my headache?', kind: 'dose', level: 'GREEN' },
  { q: 'Coartem', kind: 'med-info', med: 'al' },
  { q: 'amoxicillin', kind: 'med-info', level: 'RED' },
  { q: 'can I take coartem for fever', kind: 'test-first', level: 'AMBER' },
  { q: 'I forgot a dose of amoxicillin', kind: 'missed' },
  { q: 'zinc, can I stop when the diarrhoea stops?', kind: 'adherence' },
  { q: 'Can I stop paracetamol?', kind: 'stop-ok', level: 'GREEN' },
  { q: 'antibiotics for cough', kind: 'firewall', level: 'RED' },
  { q: 'where can I buy coartem', kind: 'find' },
  { q: 'is my medicine fake', kind: 'verify' },
  { q: 'injection for malaria', kind: 'symptom', level: 'RED' },
  { q: 'Amox 500 dey good for am?', kind: 'firewall', lang: 'pcm' },
  { q: 'wetin be flagyl', kind: 'med-info', lang: 'pcm', med: 'metronidazole' },
  { q: 'Abeg which pharmacy get Coartem for Molyko?', kind: 'find', lang: 'pcm' },
  { q: 'Can I give my 6 months baby paracetamol?', kind: 'dose', level: 'AMBER' },
  { q: 'My 3 year old has fever since 3 days', kind: 'urgent' },
  { q: 'body dey shake, hot body', kind: 'symptom' },
  { q: 'I fit take Coartem and ASAQ together?', kind: 'interaction', level: 'RED' },
  { q: 'how to use ventolin', kind: 'dose', level: 'AMBER' },
  { q: 'can I take amlodipine', kind: 'firewall' },
  { q: 'how many augmentin', kind: 'firewall', med: 'coamox' },
  { q: 'septrin for my pikin', kind: 'firewall', med: 'cotrimoxazole' },
  { q: 'I don finish my Coartem', kind: 'med-info' },
  { q: 'I took the whole packet of paracetamol', kind: 'emergency' },
  { q: 'my face don swell after I take the medicine', kind: 'emergency' },

  // --- symptoms only ---
  { q: 'hot body', kind: 'symptom', level: 'AMBER' },
  { q: 'my pikin belle dey run', kind: 'symptom', level: 'AMBER' },
  { q: 'catarrh and cough', kind: 'symptom', level: 'GREEN' },
  { q: 'piss dey burn me', kind: 'symptom', level: 'AMBER' },

  // --- small talk / unknown ---
  { q: 'How far', kind: 'greeting', lang: 'pcm' },
  { q: 'thank you', kind: 'thanks' },
  { q: 'blablabla', kind: 'fallback' },
  { q: 'what is levofloxacin', kind: 'unknown-med' },

  // --- branched chat ---
  { q: 'hot body', kind: 'symptom', followUp: 'who' },
  { q: 'hot body. for my child', followUp: 'duration' },
  { q: 'hot body. for my child. for 1 day', followUp: 'danger' },
  { q: 'hot body. for my child. for 1 day. no danger signs', kind: 'symptom', noFollowUp: true },
  { q: 'hot body. for my child. for 1 day. convulsions', kind: 'emergency' },
  { q: 'hot body. for me adult. for 3 days', kind: 'urgent' },
  { q: 'can I give my child amoxicillin', kind: 'firewall', followUp: 'prescribed' },
  { q: 'can I give my child amoxicillin. prescribed by doctor', kind: 'prescribed', level: 'GREEN' },
  { q: 'can I give my child amoxicillin without prescription', kind: 'firewall' },
  { q: 'can I take coartem for fever', followUp: 'test' },
  { q: 'can I take coartem for fever. test positive', kind: 'prescribed' },
  { q: 'can I take coartem for fever. test negative', kind: 'test-negative' },
  { q: 'cetirizine makes me very sleepy', kind: 'side-effects' },
  { q: 'my pikin get hot body and e dey sleep too much', kind: 'emergency' },
  { q: 'diarrhoea', followUp: 'who' },
];

let failed = 0;
for (const c of cases) {
  const a = answer(c.q);
  const problems: string[] = [];
  const kinds = c.kind ? ([] as AnswerKind[]).concat(c.kind) : [];
  const levels = c.level ? ([] as Level[]).concat(c.level) : [];
  if (kinds.length && !kinds.includes(a.kind)) problems.push(`kind ${a.kind} ≠ ${kinds.join('|')}`);
  if (levels.length && !levels.includes(a.level)) problems.push(`level ${a.level} ≠ ${levels.join('|')}`);
  if (c.lang && a.lang !== c.lang) problems.push(`lang ${a.lang} ≠ ${c.lang}`);
  if (c.med && !a.meds.some((m) => m.id === c.med)) problems.push(`med ${a.meds.map((m) => m.id).join(',') || '-'} ≠ ${c.med}`);
  if (c.followUp && a.followUp?.id !== c.followUp) problems.push(`followUp ${a.followUp?.id ?? '-'} ≠ ${c.followUp}`);
  if (c.noFollowUp && a.followUp) problems.push(`unexpected followUp ${a.followUp.id}`);
  const mark = problems.length ? '✗' : '✓';
  if (problems.length) failed++;
  console.log(`${mark} [${a.level.padEnd(9)}] ${a.kind.padEnd(12)} ${a.lang}  ${c.q}${problems.length ? `\n    → ${problems.join('; ')}\n    title: ${a.title.en}` : ''}`);
}
console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
