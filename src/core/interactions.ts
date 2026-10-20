import type { L10n, Level, Medicine } from './types';

const t = (en: string, fr: string, pcm: string): L10n => ({ en, fr, pcm });

/** A participant in an interaction: a medicine id, a medicine class, or a non-medicine substance. */
export type Party = `med:${string}` | `class:${string}` | 'alcohol' | 'dairy' | 'food' | 'herb';

export interface Interaction {
  a: Party;
  b: Party;
  level: Level;
  title: L10n;
  text: L10n;
}

const ALCOHOL_GENERIC = t(
  'Alcohol can make side effects worse and slow your recovery. Best avoided while you are ill.',
  'L’alcool peut aggraver les effets indésirables et ralentir la guérison. À éviter pendant la maladie.',
  'Alcohol fit make side effect worse and make you no heal quick. No drink am as you dey sick.',
);

const WARFARIN_ABX = t(
  'This antibiotic can increase warfarin’s effect and the risk of bleeding. Your prescriber may need to check your INR — do not start it without telling them.',
  'Cet antibiotique peut augmenter l’effet de la warfarine et le risque de saignement. Le prescripteur devra peut-être contrôler l’INR : prévenez-le avant de commencer.',
  'Dis antibiotic fit make warfarin strong pass and blood fit flow anyhow. Doctor fit need check your INR — no start am without tell am.',
);

const PILL_ABX = t(
  'Most antibiotics do not stop the pill working. But vomiting or severe diarrhoea can — if that happens, check the leaflet or ask a pharmacist about extra protection.',
  'La plupart des antibiotiques n’empêchent pas la pilule d’agir. Mais les vomissements ou une forte diarrhée oui : voyez la notice ou demandez au pharmacien.',
  'Most antibiotic no dey stop family planning pill. But if you vomit or belle run strong, e fit stop am — check di paper or ask pharmacist about extra protection.',
);

export const INTERACTIONS: Interaction[] = [
  {
    a: 'med:metronidazole',
    b: 'alcohol',
    level: 'RED',
    title: t('Never mix Flagyl and alcohol', 'Jamais de Flagyl avec de l’alcool', 'No mix Flagyl with alcohol at all'),
    text: t(
      'Alcohol with metronidazole can cause violent vomiting, flushing and a racing heart. No alcohol — including palm wine and beer — during treatment and for at least 48 hours after.',
      'L’alcool avec le métronidazole peut provoquer vomissements violents, bouffées de chaleur et cœur rapide. Aucun alcool (vin de palme, bière compris) pendant le traitement et au moins 48 h après.',
      'Alcohol with Flagyl fit make you vomit bad, face hot, heart beat fast. No alcohol — no matango, no beer — as you dey take am and for 48 hours after.',
    ),
  },
  {
    a: 'med:paracetamol',
    b: 'alcohol',
    level: 'AMBER',
    title: t('Paracetamol and alcohol: be careful', 'Paracétamol et alcool : prudence', 'Paracetamol and alcohol: take care'),
    text: t(
      'An occasional drink is not usually a problem at normal doses. Regular or heavy drinking raises the risk of liver damage — never go above the daily maximum, and use a lower limit if you drink most days.',
      'Un verre occasionnel pose rarement problème aux doses normales. Une consommation régulière ou importante augmente le risque d’atteinte du foie : ne dépassez jamais le maximum, et réduisez-le si vous buvez presque tous les jours.',
      'One small drink once in a while no dey usually cause wahala for normal dose. But if you dey drink every day or plenty, liver fit spoil — no pass di limit, and reduce am if you dey drink every day.',
    ),
  },
  {
    a: 'med:ibuprofen',
    b: 'alcohol',
    level: 'AMBER',
    title: t('Ibuprofen and alcohol: stomach risk', 'Ibuprofène et alcool : risque pour l’estomac', 'Ibuprofen and alcohol: belle fit bleed'),
    text: t(
      'Both irritate the stomach. Together they raise the risk of stomach bleeding. Avoid alcohol while taking ibuprofen.',
      'Les deux irritent l’estomac et augmentent ensemble le risque de saignement digestif. Évitez l’alcool sous ibuprofène.',
      'Both of dem dey scratch belle. Together, belle fit bleed. No drink alcohol when you dey take ibuprofen.',
    ),
  },
  {
    a: 'med:cetirizine',
    b: 'alcohol',
    level: 'AMBER',
    title: t('Extra drowsiness', 'Somnolence accrue', 'You go sleep pass'),
    text: t(
      'Alcohol can make cetirizine’s drowsiness worse. Avoid it, especially if you need to drive.',
      'L’alcool peut renforcer la somnolence due à la cétirizine. Évitez-le, surtout si vous conduisez.',
      'Alcohol fit make cetirizine sleep strong pass. No drink am, mostly if you go drive.',
    ),
  },
  { a: 'class:antibiotic', b: 'alcohol', level: 'AMBER', title: t('Antibiotics and alcohol', 'Antibiotiques et alcool', 'Antibiotic and alcohol'), text: ALCOHOL_GENERIC },
  { a: 'class:antimalarial', b: 'alcohol', level: 'AMBER', title: t('Malaria treatment and alcohol', 'Antipaludique et alcool', 'Malaria medicine and alcohol'), text: ALCOHOL_GENERIC },
  {
    a: 'med:warfarin',
    b: 'med:ibuprofen',
    level: 'RED',
    title: t('Serious bleeding risk', 'Risque de saignement grave', 'Blood fit flow bad'),
    text: t(
      'Ibuprofen with warfarin greatly increases the risk of bleeding. Do not combine them unless your prescriber says so — paracetamol is usually preferred for pain.',
      'L’ibuprofène avec la warfarine augmente fortement le risque de saignement. Ne les associez pas sans avis du prescripteur : le paracétamol est en général préféré.',
      'Ibuprofen with warfarin fit make blood flow bad. No mix dem unless doctor talk — paracetamol better for pain.',
    ),
  },
  { a: 'med:warfarin', b: 'med:metronidazole', level: 'RED', title: t('Bleeding risk', 'Risque de saignement', 'Blood fit flow'), text: WARFARIN_ABX },
  { a: 'med:warfarin', b: 'med:cipro', level: 'RED', title: t('Bleeding risk', 'Risque de saignement', 'Blood fit flow'), text: WARFARIN_ABX },
  { a: 'med:warfarin', b: 'med:cotrimoxazole', level: 'RED', title: t('Bleeding risk', 'Risque de saignement', 'Blood fit flow'), text: WARFARIN_ABX },
  { a: 'med:warfarin', b: 'med:azithro', level: 'AMBER', title: t('Check with your prescriber', 'Demandez au prescripteur', 'Ask your doctor'), text: WARFARIN_ABX },
  {
    a: 'med:warfarin',
    b: 'med:paracetamol',
    level: 'AMBER',
    title: t('Usually the preferred painkiller — with care', 'Antidouleur préféré, avec prudence', 'Na di better painkiller — but take care'),
    text: t(
      'Occasional paracetamol is usually the preferred painkiller with warfarin. Taking it regularly for several days can increase warfarin’s effect — tell your clinician.',
      'Le paracétamol ponctuel est en général l’antidouleur préféré avec la warfarine. Pris régulièrement plusieurs jours, il peut renforcer son effet : prévenez votre médecin.',
      'Paracetamol once once na di better painkiller with warfarin. But if you take am every day for many days, e fit make warfarin strong — tell your doctor.',
    ),
  },
  {
    a: 'med:warfarin',
    b: 'herb',
    level: 'AMBER',
    title: t('Herbs and blood thinners', 'Plantes et anticoagulants', 'Herbs and blood thinner'),
    text: t(
      'Many herbs (such as turmeric, ginger and garlic supplements) can change how warfarin works and raise bleeding risk. Ask a pharmacist before taking any herbal remedy.',
      'Beaucoup de plantes (curcuma, gingembre, ail en complément…) peuvent modifier l’effet de la warfarine et augmenter le risque de saignement. Demandez au pharmacien avant toute plante.',
      'Plenty herbs (like turmeric, ginger, garlic capsule) fit change how warfarin work and make blood flow. Ask pharmacist before you take any country medicine.',
    ),
  },
  {
    a: 'med:cipro',
    b: 'dairy',
    level: 'AMBER',
    title: t('Space it from milk and minerals', 'À espacer du lait et des minéraux', 'No take am with milk same time'),
    text: t(
      'Milk, yoghurt, antacids, iron and zinc block ciprofloxacin. Take it 2 hours before or 6 hours after them. Water is best.',
      'Lait, yaourt, antiacides, fer et zinc bloquent la ciprofloxacine. Prenez-la 2 h avant ou 6 h après. Avec de l’eau de préférence.',
      'Milk, yoghurt, antacid, iron and zinc dey block cipro. Take am 2 hours before or 6 hours after. Use water.',
    ),
  },
  {
    a: 'med:cipro',
    b: 'med:zinc',
    level: 'AMBER',
    title: t('Space them apart', 'À espacer', 'Separate dem'),
    text: t(
      'Zinc blocks ciprofloxacin from being absorbed. Take ciprofloxacin 2 hours before or 6 hours after zinc.',
      'Le zinc empêche l’absorption de la ciprofloxacine. Prenez la ciprofloxacine 2 h avant ou 6 h après le zinc.',
      'Zinc dey block cipro make body no take am. Take cipro 2 hours before or 6 hours after zinc.',
    ),
  },
  {
    a: 'med:al',
    b: 'med:asaq',
    level: 'RED',
    title: t('Do not take two malaria treatments', 'Pas deux traitements antipaludiques', 'No take two malaria medicine together'),
    text: t(
      'Coartem and ASAQ are both full malaria treatments. Taking both adds side effects without extra benefit. Take one complete course, as prescribed.',
      'Coartem et ASAQ sont deux traitements complets. Les associer ajoute des effets indésirables sans bénéfice. Faites un seul traitement complet, comme prescrit.',
      'Coartem and ASAQ na both full malaria treatment. If you take both, na only side effect you go add. Take one complete treatment as dem tell you.',
    ),
  },
  {
    a: 'med:al',
    b: 'food',
    level: 'GREEN',
    title: t('Yes — take it with food', 'Oui, avec de la nourriture', 'Yes — take am with food'),
    text: t(
      'Coartem works best with fatty food or milk: the body absorbs much more of it. Take every dose with a meal, groundnuts or a cup of milk.',
      'Coartem agit mieux avec un aliment gras ou du lait : il est bien mieux absorbé. Prenez chaque dose avec un repas, des arachides ou du lait.',
      'Coartem dey work better with food wey get oil or with milk — body go take am well. Take every dose with chop, groundnut or cup of milk.',
    ),
  },
  { a: 'med:al', b: 'dairy', level: 'GREEN', title: t('Yes — milk helps', 'Oui, le lait aide', 'Yes — milk dey help'), text: t(
      'Milk or fatty food helps the body absorb Coartem. Take every dose with a meal or a cup of milk.',
      'Le lait ou un aliment gras aide à absorber Coartem. Prenez chaque dose avec un repas ou du lait.',
      'Milk or food wey get oil dey help body take Coartem. Take every dose with chop or cup of milk.',
    ) },
  { a: 'med:coc', b: 'class:antibiotic', level: 'INFO', title: t('The pill and antibiotics', 'Pilule et antibiotiques', 'Family planning pill and antibiotic'), text: PILL_ABX },
  {
    a: 'med:ibuprofen',
    b: 'med:amlodipine',
    level: 'AMBER',
    title: t('Can raise blood pressure', 'Peut augmenter la tension', 'E fit push BP up'),
    text: t(
      'Regular ibuprofen can raise blood pressure and weaken blood-pressure medicines. Use paracetamol if you can, and ask your clinician.',
      'L’ibuprofène régulier peut augmenter la tension et réduire l’effet des antihypertenseurs. Préférez le paracétamol et demandez à votre médecin.',
      'If you dey take ibuprofen every day, e fit push BP up and make BP medicine weak. Use paracetamol if you fit, and ask doctor.',
    ),
  },
  {
    a: 'med:ibuprofen',
    b: 'med:paracetamol',
    level: 'GREEN',
    title: t('Can be used together — within limits', 'Possible ensemble, dans les limites', 'You fit use dem together — no pass limit'),
    text: t(
      'Paracetamol and ibuprofen work differently, so adults can use both for a short time if each stays within its own daily limit. Ask a pharmacist if pain lasts more than a few days.',
      'Le paracétamol et l’ibuprofène agissent différemment : un adulte peut les associer quelques jours si chacun reste dans sa limite. Demandez au pharmacien si la douleur dure.',
      'Paracetamol and ibuprofen no dey work di same way, so big people fit use both for short time if each one no pass e own limit. Ask pharmacist if pain no go after some days.',
    ),
  },
];

export function partiesOf(med: Medicine): Party[] {
  const p: Party[] = [`med:${med.id}`, `class:${med.klass}`];
  if (med.klass === 'herb') p.push('herb');
  return p;
}

export function findInteraction(x: Party[], y: Party[]): Interaction | undefined {
  // Most specific match first: med–med, then med–class, then class–class.
  const score = (p: Party) => (p.startsWith('med:') ? 0 : 1);
  const candidates = INTERACTIONS.filter(
    (i) => (x.includes(i.a) && y.includes(i.b)) || (x.includes(i.b) && y.includes(i.a)),
  );
  return candidates.sort((i, j) => score(i.a) + score(i.b) - (score(j.a) + score(j.b)))[0];
}

export const DUPLICATE_WARNING = (name: string, brands: string[]): { title: L10n; text: L10n } => ({
  title: t(`Same medicine twice: ${name}`, `Même médicament deux fois : ${name}`, `Na di same medicine: ${name}`),
  text: t(
    `${brands.join(' and ')} are both ${name}. Taking them together doubles the dose and can cause an overdose. Choose one, and count every product that contains it.`,
    `${brands.join(' et ')} contiennent tous deux ${name}. Les prendre ensemble double la dose et peut provoquer un surdosage. Choisissez-en un seul.`,
    `${brands.join(' and ')} na both ${name}. If you take dem together, na double dose — e fit be overdose. Choose only one.`,
  ),
});
