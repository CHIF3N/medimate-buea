import { phrases, type Phrase } from './text';
import type { L10n } from './types';

// Phrase lists in English, French and Cameroonian Pidgin. A trailing * means "any word starting with".
// Keep danger-sign phrases specific: "fit" alone means "can" in Pidgin, so it is never a convulsion word.

const t = (en: string, fr: string, pcm: string): L10n => ({ en, fr, pcm });

// ---------------------------------------------------------------------------
// Symptoms (non-emergency on their own)
// ---------------------------------------------------------------------------

export type SymptomId =
  | 'fever'
  | 'malaria'
  | 'cough'
  | 'cold'
  | 'sore_throat'
  | 'diarrhea'
  | 'vomiting'
  | 'stomach_pain'
  | 'heartburn'
  | 'headache'
  | 'body_pain'
  | 'toothache'
  | 'period_pain'
  | 'allergy'
  | 'worms'
  | 'urinary'
  | 'asthma'
  | 'blood_pressure';

export const SYMPTOM_LABEL: Record<SymptomId, L10n> = {
  fever: t('Fever', 'Fièvre', 'Hot body'),
  malaria: t('Suspected malaria', 'Paludisme suspecté', 'Malaria (maybe)'),
  cough: t('Cough', 'Toux', 'Cough'),
  cold: t('Cold / flu', 'Rhume / grippe', 'Catarrh / flu'),
  sore_throat: t('Sore throat', 'Mal de gorge', 'Throat pain'),
  diarrhea: t('Diarrhoea', 'Diarrhée', 'Runny belle'),
  vomiting: t('Vomiting', 'Vomissements', 'Vomit'),
  stomach_pain: t('Stomach pain', 'Mal au ventre', 'Belle pain'),
  heartburn: t('Heartburn', 'Brûlures d’estomac', 'Heartburn'),
  headache: t('Headache', 'Mal de tête', 'Head pain'),
  body_pain: t('Body pain', 'Courbatures', 'Body pain'),
  toothache: t('Toothache', 'Mal de dents', 'Teeth pain'),
  period_pain: t('Period pain', 'Règles douloureuses', 'Period pain'),
  allergy: t('Allergy / itching', 'Allergie / démangeaisons', 'Allergy / scratch'),
  worms: t('Worms', 'Vers', 'Worm'),
  urinary: t('Burning urine', 'Brûlures urinaires', 'Piss dey burn'),
  asthma: t('Asthma / wheeze', 'Asthme / sifflement', 'Asthma'),
  blood_pressure: t('Blood pressure', 'Tension', 'BP (pressure)'),
};

export const SYMPTOMS: Record<SymptomId, Phrase[]> = {
  fever: phrases([
    'fever*', 'feverish', 'hot body', 'body hot', 'body dey hot', 'body don hot', 'temperature', 'high temperature', 'hot hot',
    'fievre', 'fievreux', 'corps chaud', 'chaud chaud', 'la chaleur', 'temperature elevee',
  ]),
  malaria: phrases(['malaria', 'malaria dey', 'palu', 'paludisme', 'palus', 'mal aria']),
  cough: phrases(['cough*', 'kof', 'toux', 'tousse', 'tousser', 'tousses']),
  cold: phrases(['catarrh', 'catarh', 'cold', 'flu', 'running nose', 'runny nose', 'nose dey run', 'rhume', 'grippe', 'nez qui coule', 'sneez*']),
  sore_throat: phrases(['sore throat', 'throat pain', 'throat dey pain', 'mal de gorge', 'mal a la gorge', 'tonsil*', 'angine']),
  diarrhea: phrases([
    'diarrh*', 'running stomach', 'runny stomach', 'runny belle', 'belle run', 'belle dey run', 'belle don run', 'watery stool*',
    'loose stool*', 'stool dey run', 'toilet plenty', 'diarrhee', 'ventre qui coule', 'selles liquides', 'food poisoning', 'intoxication alimentaire',
  ]),
  vomiting: phrases(['vomit*', 'throwing up', 'throw up', 'vomir', 'vomissement*', 'vomis', 'nausea', 'nausee*', 'feel like vomit']),
  stomach_pain: phrases([
    'belle pain', 'belle dey pain', 'belle dey turn', 'belle turn', 'stomach pain', 'stomach ache', 'stomachache', 'abdominal pain',
    'tummy ache', 'mal au ventre', 'mal de ventre', 'douleur abdominale', 'ventre fait mal', 'cramp*',
  ]),
  heartburn: phrases(['heartburn', 'heart burn', 'acid reflux', 'reflux', 'ulcer', 'ulcere', 'gastric', 'gastrite', 'acidity', 'sour burp', 'brulure d estomac', 'brulures d estomac', 'indigestion']),
  headache: phrases(['headache*', 'head dey pain', 'head pain', 'head de pain', 'migraine*', 'mal de tete', 'mal a la tete', 'cephalee*']),
  body_pain: phrases(['body pain', 'body dey pain', 'joint pain', 'back pain', 'muscle pain', 'courbature*', 'mal au dos', 'douleur*', 'pain killer', 'painkiller']),
  toothache: phrases(['toothache', 'tooth ache', 'teeth pain', 'tooth pain', 'teeth dey pain', 'mal de dent*', 'mal aux dents']),
  period_pain: phrases(['period pain', 'menstrual', 'period cramp*', 'regles douloureuses', 'dysmenorrhee', 'period dey pain']),
  allergy: phrases(['allerg*', 'itch*', 'rash', 'skin dey scratch', 'body dey scratch', 'scratch scratch', 'hives', 'demangeaison*', 'gratte', 'boutons', 'eczema']),
  worms: phrases(['worm*', 'vers', 'ver intestinaux', 'vermifuge', 'deworm*']),
  urinary: phrases(['burning urine', 'burning urination', 'pee dey burn', 'piss dey burn', 'urine dey burn', 'painful urination', 'brule en urinant', 'brulure urinaire', 'brulures urinaires', 'uti', 'infection urinaire']),
  asthma: phrases(['asthma*', 'asthme', 'wheez*', 'chest tight*', 'tight chest', 'sifflement']),
  blood_pressure: phrases(['blood pressure', 'high bp', 'bp', 'hypertension', 'tension', 'pressure dey high', 'hypertendu']),
};

// ---------------------------------------------------------------------------
// Danger signs. "emergency" = go now / call 119. "urgent" = see a clinician today.
// ---------------------------------------------------------------------------

export type FlagId =
  | 'breathing'
  | 'chest_pain'
  | 'convulsion'
  | 'unconscious'
  | 'bleeding'
  | 'overdose'
  | 'self_harm'
  | 'anaphylaxis'
  | 'stroke'
  | 'child_danger'
  | 'dehydration'
  | 'stiff_neck'
  | 'dark_urine'
  | 'pregnancy_bleeding'
  | 'newborn_fever'
  | 'blood_stool'
  | 'jaundice'
  | 'long_fever'
  | 'long_cough'
  | 'pregnancy_fever'
  | 'confusion';

export type FlagSeverity = 'emergency' | 'urgent';

export const FLAG_SEVERITY: Record<FlagId, FlagSeverity> = {
  breathing: 'emergency',
  chest_pain: 'emergency',
  convulsion: 'emergency',
  unconscious: 'emergency',
  bleeding: 'emergency',
  overdose: 'emergency',
  self_harm: 'emergency',
  anaphylaxis: 'emergency',
  stroke: 'emergency',
  child_danger: 'emergency',
  dehydration: 'emergency',
  stiff_neck: 'emergency',
  dark_urine: 'emergency',
  pregnancy_bleeding: 'emergency',
  newborn_fever: 'emergency',
  blood_stool: 'urgent',
  jaundice: 'urgent',
  long_fever: 'urgent',
  long_cough: 'urgent',
  pregnancy_fever: 'urgent',
  confusion: 'emergency',
};

export const FLAG_LABEL: Record<FlagId, L10n> = {
  breathing: t('Difficulty breathing', 'Difficulté à respirer', 'Breath dey tie'),
  chest_pain: t('Chest pain', 'Douleur thoracique', 'Chest pain'),
  convulsion: t('Convulsions', 'Convulsions', 'Convulsion'),
  unconscious: t('Unconscious or fainting', 'Perte de connaissance', 'Person no dey wake / faint'),
  bleeding: t('Heavy bleeding or vomiting blood', 'Saignement abondant ou sang vomi', 'Plenty blood / vomit blood'),
  overdose: t('Possible overdose or poisoning', 'Surdosage ou intoxication possible', 'Maybe overdose or poison'),
  self_harm: t('Thoughts of self-harm', 'Idées de se faire du mal', 'Tinking say make you harm yourself'),
  anaphylaxis: t('Severe allergic reaction', 'Réaction allergique grave', 'Strong allergy (swelling)'),
  stroke: t('Possible stroke', 'AVC possible', 'Maybe stroke'),
  child_danger: t('Child danger sign', 'Signe de danger chez l’enfant', 'Danger sign for pikin'),
  dehydration: t('Severe dehydration', 'Déshydratation sévère', 'Body don dry bad'),
  stiff_neck: t('Fever with stiff neck', 'Fièvre avec raideur de la nuque', 'Hot body with neck wey don stiff'),
  dark_urine: t('Dark (cola-coloured) urine', 'Urines foncées (couleur coca)', 'Urine black like Coca-Cola'),
  pregnancy_bleeding: t('Bleeding in pregnancy', 'Saignement pendant la grossesse', 'Blood dey comot for woman wey get belle'),
  newborn_fever: t('Fever in a baby under 2 months', 'Fièvre chez un bébé de moins de 2 mois', 'Hot body for baby wey never reach 2 months'),
  blood_stool: t('Blood in stool', 'Sang dans les selles', 'Blood inside shit'),
  jaundice: t('Yellow eyes or skin', 'Yeux ou peau jaunes', 'Eye or skin don turn yellow'),
  long_fever: t('Fever for several days', 'Fièvre depuis plusieurs jours', 'Hot body for many days'),
  long_cough: t('Cough for 2 weeks or more', 'Toux depuis 2 semaines ou plus', 'Cough wey pass 2 weeks'),
  pregnancy_fever: t('Fever in pregnancy', 'Fièvre pendant la grossesse', 'Hot body when you get belle'),
  confusion: t('Confusion or extreme sleepiness', 'Confusion ou somnolence extrême', 'Confusion or sleep wey too much'),
};

export const FLAGS: Partial<Record<FlagId, Phrase[]>> = {
  breathing: phrases([
    'cant breathe', 'cannot breathe', 'can not breathe', 'unable to breathe', 'difficulty breathing', 'difficult to breathe',
    'trouble breathing', 'hard to breathe', 'struggling to breathe', 'breathing difficult*', 'short of breath', 'shortness of breath',
    'breath dey tie', 'breath tie', 'breath don tie', 'no fit breathe', 'no fit breath', 'breathe no dey', 'gasping', 'lips blue', 'blue lips', 'lip don turn blue',
    'difficulte a respirer', 'du mal a respirer', 'ne peut pas respirer', 'ne peux pas respirer', 'n arrive pas a respirer', 'respire mal', 'etouffe*', 'levres bleues',
  ]),
  chest_pain: phrases([
    'chest pain', 'pain in my chest', 'pain in the chest', 'chest dey pain', 'pain for chest', 'chest hurt*',
    'douleur thoracique', 'douleur a la poitrine', 'mal a la poitrine', 'mal au thorax', 'poitrine fait mal',
  ]),
  convulsion: phrases(['convuls*', 'seizure*', 'having fits', 'fitting', 'jerking', 'crise convulsive', 'crises convulsives', 'epilepsy attack']),
  unconscious: phrases([
    'unconscious*', 'unresponsive', 'not waking', 'wont wake', 'will not wake', 'no dey wake', 'fainted', 'fainting',
    'collapsed', 'passed out', 'pass out', 'evanoui*', 'perdu connaissance', 'perte de connaissance', 'sans connaissance', 'inconscient*',
  ]),
  bleeding: phrases([
    'vomiting blood', 'vomit blood', 'vomits blood', 'vomited blood', 'blood for vomit', 'coughing blood', 'cough blood', 'coughing up blood',
    'heavy bleeding', 'bleeding heavily', 'bleeding a lot', 'blood plenty', 'blood no wan stop', 'bleeding wont stop', 'bleeding will not stop',
    'vomit du sang', 'vomir du sang', 'vomi du sang', 'saigne beaucoup', 'hemorragie', 'crache du sang',
  ]),
  overdose: phrases([
    'overdose*', 'too many tablets', 'too many pills', 'took too many', 'taken too many', 'swallowed many', 'swallow many', 'drank poison',
    'poisoned', 'swallowed poison', 'took poison', 'rat poison', 'insecticide', 'pesticide', 'bleach', 'kerosene', 'took the whole', 'whole packet',
    'whole pack', 'take plenty tablet', 'drink plenty tablet', 'surdosage', 'surdose', 'trop de comprimes', 'avale tout', 'mort aux rats',
  ]),
  self_harm: phrases([
    'kill myself', 'end my life', 'suicide', 'suicidal', 'want to die', 'wan die', 'harm myself', 'hurt myself', 'me suicider', 'me tuer', 'en finir',
  ]),
  anaphylaxis: phrases([
    'lips swelling', 'lip swelling', 'swollen lips', 'swollen lip', 'lip don swell', 'mouth don swell', 'face swelling', 'swollen face', 'face don swell',
    'throat swelling', 'throat closing', 'tongue swelling', 'swollen tongue', 'anaphyla*', 'levres gonflees', 'visage gonfle', 'gorge gonflee', 'langue gonflee',
  ]),
  stroke: phrases([
    'face droop*', 'one side weak*', 'weak on one side', 'one side of my body', 'cant speak', 'cannot speak', 'slurred speech', 'paralys*', 'stroke',
    'bouche tordue', 'avc', 'paralysie', 'ne peut plus parler',
  ]),
  child_danger: phrases([
    'not drinking', 'cant drink', 'cannot drink', 'unable to drink', 'no fit drink', 'refuse to drink', 'refusing to drink', 'wont breastfeed', 'not breastfeeding',
    'refuse breast', 'refuses breast', 'cannot breastfeed', 'vomits everything', 'vomit everything', 'vomiting everything', 'everything e chop e vomit',
    'very weak', 'too weak', 'floppy', 'ne boit plus', 'refuse de boire', 'refuse le sein', 'vomit tout', 'vomi tout', 'tres faible',
  ]),
  confusion: phrases(['confused', 'confusion', 'delirious', 'not making sense', 'no dey make sense', 'dey talk anyhow', 'confus', 'confuse', 'divague', 'delire']),
  dehydration: phrases(['sunken eyes', 'eye don go inside', 'no tears', 'no urine', 'not peeing', 'no dey piss', 'not urinating', 'yeux creux', 'n urine plus', 'urine plus']),
  stiff_neck: phrases(['stiff neck', 'neck stiff', 'neck dey stiff', 'neck don stiff', 'raideur de la nuque', 'nuque raide', 'cou raide']),
  dark_urine: phrases(['dark urine', 'cola urine', 'coca cola urine', 'urine like coke', 'black urine', 'urine black', 'urine noire', 'urines noires', 'urine foncee', 'urines foncees', 'urine couleur coca']),
  blood_stool: phrases(['blood in stool', 'blood in my stool', 'bloody stool*', 'blood for shit', 'blood inside shit', 'blood in poo', 'black stool*', 'black poo', 'shit black', 'sang dans les selles', 'selles noires', 'selles sanglantes']),
  jaundice: phrases(['yellow eye*', 'eyes yellow', 'eye don yellow', 'eye don turn yellow', 'yellow skin', 'jaundice', 'yeux jaunes', 'jaunisse', 'ictere']),
};

/** Words that make a "bleeding" phrase a pregnancy emergency when the person is pregnant. */
export const BLEEDING_WORDS = phrases(['bleed*', 'blood', 'saign*', 'sang']);

// ---------------------------------------------------------------------------
// Who the question is about
// ---------------------------------------------------------------------------

export const CHILD = phrases([
  'pikin', 'pikins', 'pickin', 'piccin', 'small pikin', 'baby', 'babies', 'bebe', 'child', 'children', 'kid', 'kids', 'son', 'daughter',
  'toddler', 'infant', 'boy', 'girl', 'enfant*', 'mon fils', 'ma fille', 'nourrisson', 'petit garcon', 'petite fille', 'my small one', 'my small',
]);
export const INFANT = phrases(['baby', 'babies', 'bebe', 'infant', 'nourrisson', 'newborn', 'new born', 'nouveau ne', 'small baby', 'breastfeeding baby']);
export const NEWBORN = phrases(['newborn', 'new born', 'nouveau ne', 'just born', 'just delivered', 'vient de naitre']);
export const PREGNANT = phrases([
  'pregnant', 'pregnancy', 'expecting a baby', 'belle woman', 'woman wey get belle',
  'enceinte', 'grossesse', 'je suis enceinte',
]);
export const ADULT = phrases(['adult', 'for me', 'for myself', 'myself', 'grown up', 'big person', 'na me', 'na for me', 'pour moi', 'moi meme', 'adulte']);
/** Sleepiness is a danger sign with fever or in a child — not when an antihistamine makes you drowsy. */
export const SLEEPY = phrases(['very sleepy', 'too sleepy', 'sleep too much', 'dey sleep too much', 'lethargic', 'hard to wake', 'difficult to wake', 'no fit wake', 'somnolent*', 'difficile a reveiller']);
export const NO_DANGER = phrases(['no danger signs', 'none of these', 'no danger sign', 'none of dem', 'no one of dem', 'aucun de ces signes', 'aucun signe']);
export const PRESCRIBED = phrases([
  'prescribed', 'have a prescription', 'got a prescription', 'with my prescription', 'on prescription', 'doctor gave', 'doctor give', 'doctor don give',
  'nurse gave', 'nurse give', 'hospital gave', 'hospital give', 'prescrit', 'prescrite', 'j ai une ordonnance', 'avec ordonnance', 'get doctor paper', 'i get prescription',
]);
export const NOT_PRESCRIBED = phrases([
  'no prescription', 'without prescription', 'without a prescription', 'not prescribed', 'no doctor paper', 'no get prescription', 'sans ordonnance', 'pas d ordonnance',
]);
export const TEST_POSITIVE = phrases([
  'test positive', 'tested positive', 'positive test', 'rdt positive', 'positive rdt', 'malaria confirmed', 'confirmed malaria', 'test don show malaria',
  'test show malaria', 'test positif', 'teste positif', 'paludisme confirme', 'tdr positif',
]);
export const TEST_NEGATIVE = phrases(['test negative', 'tested negative', 'negative test', 'rdt negative', 'negative rdt', 'test negatif', 'teste negatif', 'tdr negatif', 'no be malaria']);

export const BREASTFEEDING = phrases(['breastfeed*', 'breast feed*', 'nursing mother', 'dey give breast', 'give breast', 'allait*', 'allaitement']);

// ---------------------------------------------------------------------------
// What the person is asking
// ---------------------------------------------------------------------------

export type IntentId =
  | 'dose'
  | 'can_take'
  | 'stop_early'
  | 'missed'
  | 'interaction'
  | 'side_effects'
  | 'what_is'
  | 'find'
  | 'verify'
  | 'greeting'
  | 'thanks';

export const INTENT_LABEL: Record<IntentId, L10n> = {
  dose: t('Asking for a dose', 'Demande de dose', 'Dem dey ask for dose'),
  can_take: t('Can I take / give it?', 'Puis-je le prendre / donner ?', 'I fit take / give am?'),
  stop_early: t('Stopping early', 'Arrêt précoce', 'Stop before time'),
  missed: t('Missed dose', 'Dose oubliée', 'Forget dose'),
  interaction: t('Mixing medicines', 'Associations', 'Mix medicine'),
  side_effects: t('Side effects', 'Effets indésirables', 'Side effect'),
  what_is: t('What is it for?', 'À quoi ça sert ?', 'Wetin e dey do?'),
  find: t('Where to buy', 'Où l’acheter', 'Where for buy am'),
  verify: t('Is it genuine?', 'Est-il authentique ?', 'E na original?'),
  greeting: t('Greeting', 'Salutation', 'Greeting'),
  thanks: t('Thanks', 'Remerciement', 'Thank you'),
};

export const INTENTS: Record<IntentId, Phrase[]> = {
  missed: phrases([
    'missed', 'miss a dose', 'miss one dose', 'missed a dose', 'forgot', 'forget', 'i forget', 'i no take', 'skip*', 'oublie*', 'j ai oublie', 'rate une prise',
  ]),
  dose: phrases([
    'how many', 'how much', 'dose', 'dosage', 'how to take', 'how do i take', 'how should i take', 'how i go take', 'how i go drink', 'how i fit take',
    'how i go give', 'how many times', 'how often', 'mg', 'milligram*', 'tablets a day', 'posologie', 'combien', 'quelle dose', 'comment prendre',
    'comment le prendre', 'comment donner', 'how e go be', 'how to use', 'how do i use', 'how i go use', 'comment utiliser',
  ]),
  can_take: phrases([
    'can i take', 'can i give', 'can i use', 'can i drink', 'should i take', 'should i give', 'is it ok', 'is it okay', 'is it safe', 'is it good',
    'safe to take', 'ok to take', 'okay to take', 'e good', 'e dey good', 'dey good for', 'good for', 'i fit take', 'i fit drink', 'i fit give', 'i fit use',
    'make i take', 'make i drink', 'make i give', 'i wan take', 'i wan drink', 'will it help', 'fit help', 'can it cure', 'cure', 'puis je', 'je peux',
    'peut on', 'est ce que je peux', 'donner a mon', 'donner a ma', 'c est bon pour', 'prendre de l', 'give am', 'take am', 'drink am',
  ]),
  stop_early: phrases([
    'can i stop', 'should i stop', 'i fit stop', 'make i stop', 'stop taking', 'stop it', 'stop am', 'stop di', 'stop the medicine', 'stop the treatment',
    'stop the course', 'stop the tablets', 'stop giving', 'stop early', 'stop before', 'stopped', 'stop now', 'stop halfway', 'fever don cool', 'fever don go', 'fever don finish', 'hot body don go', 'hot body don cool',
    'i don well', 'i don better', 'feel better', 'feeling better', 'feel fine now', 'body don strong', 'body don better', 'keep the rest', 'keep the remaining',
    'leave the rest', 'save the rest', 'next time', 'arreter', 'arrete', 'j arrete', 'je me sens mieux', 'je vais mieux', 'garder le reste',
  ]),
  interaction: phrases([
    'together', 'mix', 'mixing', 'at the same time', 'same time', 'combine', 'combined with', 'interact*', 'with alcohol', 'with beer',
    'ensemble', 'en meme temps', 'melanger', 'associer', 'avec de l alcool',
  ]),
  side_effects: phrases(['side effect*', 'side-effect*', 'effet* secondaire*', 'effet* indesirable*', 'wetin e go do me', 'reaction', 'makes me', 'makes my', 'made my', 'making my', 'turned my', 'e dey do me', 'normal to', 'is it normal']),
  what_is: phrases([
    'what is', 'whats', 'wetin be', 'wetin', 'what does', 'what for', 'for what', 'used for', 'use for', 'what e dey do', 'c est quoi', 'qu est ce que',
    'a quoi sert', 'ca sert a quoi', 'tell me about', 'info on', 'information',
  ]),
  find: phrases([
    'where', 'which pharmacy', 'where can i buy', 'where to buy', 'where i fit buy', 'where i fit get', 'buy', 'find', 'in stock', 'available',
    'ou acheter', 'ou trouver', 'pharmacie de garde', 'duty pharmacy', 'pharmacy open', 'open pharmacy', 'disponible',
  ]),
  verify: phrases([
    'fake', 'original', 'counterfeit', 'real or fake', 'genuine', 'batch', 'lot number', 'expired', 'expiry', 'expiration', 'contrefa*', 'faux', 'perime*',
    'authentique', 'numero de lot',
  ]),
  greeting: phrases(['hello', 'hi', 'hey', 'how far', 'good morning', 'good afternoon', 'good evening', 'bonjour', 'bonsoir', 'salut', 'hallo']),
  thanks: phrases(['thank*', 'thanks', 'tank you', 'tanks', 'merci', 'thank you o']),
};

// ---------------------------------------------------------------------------
// Things that interact but are not medicines
// ---------------------------------------------------------------------------

export const ALCOHOL = phrases([
  'alcohol', 'beer', 'beers', 'palm wine', 'matango', 'mimbo', 'afofo', 'whisky', 'whiskey', 'gin', 'liquor', 'wine', 'drink alcohol',
  'alcool', 'biere', 'vin', 'vin de palme', 'odontol', 'arki',
]);
export const DAIRY = phrases(['milk', 'yoghurt', 'yogurt', 'dairy', 'lait', 'yaourt', 'antacid*', 'iron tablet*', 'fer']);
export const FOOD = phrases(['food', 'chop', 'eat', 'meal', 'empty stomach', 'empty belle', 'nourriture', 'repas', 'manger', 'a jeun']);

// ---------------------------------------------------------------------------
// Medicine classes mentioned without a specific product
// ---------------------------------------------------------------------------

export type ClassMention = 'antibiotic' | 'antimalarial' | 'painkiller' | 'injection' | 'herbal';

export const CLASS_MENTIONS: Record<ClassMention, Phrase[]> = {
  antibiotic: phrases(['antibiotic*', 'anti biotic*', 'antibiotique*', 'antibio']),
  antimalarial: phrases([
    'malaria medicine', 'malaria drug*', 'malaria tablet*', 'malaria treatment', 'antimalari*', 'anti malari*', 'medicament palu*',
    'antipaludique*', 'anti paludique*', 'traitement du palu*',
  ]),
  painkiller: phrases(['painkiller*', 'pain killer*', 'pain medicine', 'pain tablet*', 'antidouleur*', 'calmant*', 'anti douleur']),
  injection: phrases(['injection*', 'inject*', 'piqure*', 'perfusion', 'drip']),
  herbal: phrases([
    'herb', 'herbs', 'herbal', 'country medicine', 'traditional medicine', 'native doctor', 'native medicine', 'bark', 'leaves', 'concoction',
    'medicinal plant*', 'plante*', 'tisane', 'decoction', 'remede traditionnel', 'medecine traditionnelle', 'bitter leaf', 'moringa', 'neem',
  ]),
};

// ---------------------------------------------------------------------------
// Language detection markers (normalised tokens / phrases)
// ---------------------------------------------------------------------------

export const PIDGIN_STRONG = phrases([
  'dey', 'wetin', 'pikin', 'pickin', 'abeg', 'sabi', 'wey', 'una', 'belle', 'chop', 'oya', 'sef', 'na so', 'no be', 'make i', 'i fit', 'e fit', 'e no',
  'give am', 'take am', 'drink am', 'buy am', 'use am', 'how far', 'don cool', 'don go', 'don finish', 'small small', 'matango', 'mimbo', 'tie me', 'tie am',
]);
export const PIDGIN_WEAK = phrases(['fit', 'don', 'na', 'dem', 'am', 'for', 'go', 'hot body', 'catarrh', 'get']);

export const FRENCH_STRONG = phrases([
  'je', 'j ai', 'est', 'avec', 'pour', 'mon', 'ma', 'mes', 'enfant', 'fievre', 'medicament', 'comment', 'quoi', 'depuis', 'prendre', 'donner',
  'puis je', 'peux', 'peut', 'bonjour', 'merci', 'combien', 'ventre', 'tete', 'quel', 'quelle', 'pas', 'une', 'des', 'les', 'du',
]);
export const FRENCH_WEAK = phrases(['le', 'la', 'de', 'et', 'un', 'il', 'elle', 'que', 'qui', 'mal', 'jours', 'mois', 'ans', 'oui', 'non']);
