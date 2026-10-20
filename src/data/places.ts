import type { StockLevel } from '../core/types';

export interface LatLng {
  lat: number;
  lng: number;
}

/** Default origin when the user has not shared their location: Carrefour Check Point, Molyko. */
export const DEFAULT_ORIGIN: LatLng & { label: string } = { lat: 4.15888, lng: 9.28085, label: 'Check Point, Molyko' };
export const BUEA_CENTER: LatLng = { lat: 4.1555, lng: 9.265 };

// ---------------------------------------------------------------------------
// Demo partner pharmacies — fictional businesses placed in real neighbourhoods.
// Stock and hours are demonstration data. In the pilot these come from partner pharmacies.
// ---------------------------------------------------------------------------

export interface PartnerPharmacy {
  id: string;
  name: string;
  area: string;
  landmark: string;
  pos: LatLng;
  /** Opening hours, 24h clock. `[0, 24]` means open around the clock. */
  hours: [number, number];
  /** Days on which this pharmacy is on night duty ("pharmacie de garde"), as a rotation index. */
  dutySlot: number;
  stock: Record<string, StockLevel>;
  /** Minutes before "now" that the stock was last updated (demo). */
  updatedMinsAgo: number;
}

const S = (s: string): Record<string, StockLevel> => {
  // compact stock string: medId:i|l|o
  const map: Record<string, StockLevel> = {};
  s.split(' ').forEach((pair) => {
    const [id, v] = pair.split(':');
    map[id] = v === 'i' ? 'in' : v === 'l' ? 'low' : 'out';
  });
  return map;
};

export const PARTNERS: PartnerPharmacy[] = [
  {
    id: 'lumiere',
    name: 'Lumière Pharmacy',
    area: 'Molyko',
    landmark: 'Near Check Point junction',
    pos: { lat: 4.1578, lng: 9.2795 },
    hours: [7.5, 22],
    dutySlot: 0,
    stock: S('al:i asaq:l amoxicillin:i coamox:i cipro:i metronidazole:i azithro:l cotrimoxazole:i paracetamol:i ibuprofen:i ors:i zinc:l salbutamol:o cetirizine:i omeprazole:i albendazole:i amlodipine:i warfarin:o coc:i'),
    updatedMinsAgo: 6,
  },
  {
    id: 'ivy',
    name: 'Ivy Pharmacy',
    area: 'Bulu (UB)',
    landmark: 'Near UB south gate',
    pos: { lat: 4.151, lng: 9.288 },
    hours: [8, 21],
    dutySlot: 1,
    stock: S('al:l asaq:i amoxicillin:i coamox:l cipro:o metronidazole:i azithro:i cotrimoxazole:i paracetamol:i ibuprofen:i ors:i zinc:i salbutamol:i cetirizine:i omeprazole:l albendazole:i amlodipine:l warfarin:o coc:i'),
    updatedMinsAgo: 19,
  },
  {
    id: 'crossroads',
    name: 'Crossroads Pharmacy',
    area: 'Mile 17',
    landmark: 'Opposite the motor park',
    pos: { lat: 4.1508, lng: 9.2975 },
    hours: [0, 24],
    dutySlot: -1,
    stock: S('al:o asaq:i amoxicillin:i coamox:i cipro:i metronidazole:i azithro:o cotrimoxazole:l paracetamol:i ibuprofen:i ors:i zinc:i salbutamol:l cetirizine:i omeprazole:i albendazole:i amlodipine:i warfarin:o coc:l'),
    updatedMinsAgo: 11,
  },
  {
    id: 'bluegate',
    name: 'Bluegate Pharmacy',
    area: 'Bonduma',
    landmark: 'Bonduma gate road',
    pos: { lat: 4.159, lng: 9.268 },
    hours: [8, 20],
    dutySlot: 2,
    stock: S('al:i asaq:i amoxicillin:l coamox:o cipro:l metronidazole:i azithro:i cotrimoxazole:i paracetamol:i ibuprofen:l ors:l zinc:i salbutamol:i cetirizine:o omeprazole:i albendazole:i amlodipine:i warfarin:i coc:i'),
    updatedMinsAgo: 42,
  },
  {
    id: 'greenleaf',
    name: 'Greenleaf Pharmacy',
    area: 'Great Soppo',
    landmark: 'Near Great Soppo market',
    pos: { lat: 4.1575, lng: 9.251 },
    hours: [7, 21],
    dutySlot: 3,
    stock: S('al:i asaq:l amoxicillin:i coamox:i cipro:i metronidazole:l azithro:i cotrimoxazole:i paracetamol:i ibuprofen:i ors:i zinc:i salbutamol:i cetirizine:i omeprazole:i albendazole:l amlodipine:i warfarin:l coc:i'),
    updatedMinsAgo: 27,
  },
  {
    id: 'highland',
    name: 'Highland Pharmacy',
    area: 'Buea Town',
    landmark: 'Below the Regional Hospital',
    pos: { lat: 4.1505, lng: 9.2395 },
    hours: [7.5, 21],
    dutySlot: 4,
    stock: S('al:i asaq:i amoxicillin:i coamox:i cipro:i metronidazole:i azithro:i cotrimoxazole:i paracetamol:i ibuprofen:i ors:i zinc:i salbutamol:i cetirizine:i omeprazole:i albendazole:i amlodipine:i warfarin:i coc:i'),
    updatedMinsAgo: 64,
  },
];

const DUTY_ROTATION = 5;

/** Which partner is on night duty today — a simple daily rotation, like the real "pharmacie de garde" roster. */
export function onDutyToday(date = new Date()): string | undefined {
  const day = Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / 86400000);
  const slot = day % DUTY_ROTATION;
  return PARTNERS.find((p) => p.dutySlot === slot)?.id;
}

export function isOpenNow(p: PartnerPharmacy, date = new Date(), onDuty = onDutyToday(date) === p.id): boolean {
  if (onDuty) return true;
  const h = date.getHours() + date.getMinutes() / 60;
  const [open, close] = p.hours;
  return open === 0 && close === 24 ? true : h >= open && h < close;
}

export function hoursLabel(p: PartnerPharmacy): string {
  const [o, c] = p.hours;
  if (o === 0 && c === 24) return '24/7';
  const f = (x: number) => `${Math.floor(x)}:${x % 1 ? '30' : '00'}`;
  return `${f(o)}–${f(c)}`;
}

// ---------------------------------------------------------------------------
// Real places from OpenStreetMap (© OpenStreetMap contributors, ODbL). Stock unknown — not partners.
// ---------------------------------------------------------------------------

export interface OsmPlace {
  id: string;
  name: string;
  kind: 'pharmacy' | 'hospital' | 'clinic' | 'health-centre';
  pos: LatLng;
  osm: string;
  emergency?: boolean;
}

export const OSM_PHARMACIES: OsmPlace[] = [
  { id: 'osm-amazing', name: 'Amazing Pharmacy', kind: 'pharmacy', pos: { lat: 4.156216, lng: 9.288147 }, osm: 'node/3684296931' },
  { id: 'osm-enamen', name: 'Pharmacy Enamen', kind: 'pharmacy', pos: { lat: 4.159356, lng: 9.282511 }, osm: 'node/3684296956' },
  { id: 'osm-royal', name: 'Royal Pharmacy', kind: 'pharmacy', pos: { lat: 4.15359, lng: 9.252612 }, osm: 'node/3684296962' },
  { id: 'osm-salvation', name: 'Salvation Pharmacy', kind: 'pharmacy', pos: { lat: 4.154423, lng: 9.260317 }, osm: 'node/3684296964' },
  { id: 'osm-winners', name: "Winner's Pharmacy", kind: 'pharmacy', pos: { lat: 4.153987, lng: 9.257407 }, osm: 'node/3684296970' },
  { id: 'osm-mountain', name: 'Mountain Pharmacy', kind: 'pharmacy', pos: { lat: 4.153702, lng: 9.243041 }, osm: 'way/438864296' },
];

export const FACILITIES: OsmPlace[] = [
  { id: 'brh', name: 'Buea Regional Hospital', kind: 'hospital', pos: { lat: 4.148197, lng: 9.236534 }, osm: 'way/336665673', emergency: true },
  { id: 'mount-mary', name: 'Mount Mary Hospital', kind: 'hospital', pos: { lat: 4.157536, lng: 9.240357 }, osm: 'node/7066538021' },
  { id: 'molyko-hosp', name: 'Molyko Hospital (INCOREHCC)', kind: 'hospital', pos: { lat: 4.163324, lng: 9.288651 }, osm: 'way/786195959' },
  { id: 'ihc-molyko', name: 'Integrated Health Centre Molyko', kind: 'health-centre', pos: { lat: 4.160575, lng: 9.285271 }, osm: 'way/786195956' },
  { id: 'medicare', name: 'Medicare Health Centre', kind: 'health-centre', pos: { lat: 4.153872, lng: 9.254086 }, osm: 'way/619442381' },
  { id: 'good-shepherd', name: 'Good Shepherd Clinic', kind: 'clinic', pos: { lat: 4.154241, lng: 9.294362 }, osm: 'node/3684296939' },
  { id: 'kahwa', name: 'Kahwa Sumbele Medical Center', kind: 'clinic', pos: { lat: 4.155453, lng: 9.300537 }, osm: 'node/3684296948' },
  { id: 'st-lukes', name: 'Saint Lukes Medical Centre', kind: 'health-centre', pos: { lat: 4.16573, lng: 9.273408 }, osm: 'way/620620338' },
  { id: 'ihc-buea', name: 'Integrated Health Centre (Buea Town)', kind: 'health-centre', pos: { lat: 4.15417, lng: 9.233357 }, osm: 'node/7066538023' },
];

export const EMERGENCY_NUMBERS = [
  { number: '119', label: { en: 'Ambulance (SAMU)', fr: 'Ambulance (SAMU)', pcm: 'Ambulance' } },
  { number: '112', label: { en: 'Emergency', fr: 'Urgences', pcm: 'Emergency' } },
  { number: '117', label: { en: 'Police', fr: 'Police', pcm: 'Police' } },
  { number: '118', label: { en: 'Fire brigade', fr: 'Pompiers', pcm: 'Fire service' } },
];

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Road distance is roughly 1.3× the straight line on Buea's winding roads. */
export const roadKm = (a: LatLng, b: LatLng) => distanceKm(a, b) * 1.3;

export function formatKm(km: number): string {
  return km < 1 ? `${Math.round(km * 100) * 10} m` : `${km.toFixed(1)} km`;
}

/** Shared-taxi estimate inside Buea (demo heuristic): a drop is ~250 FCFA, longer trips more. */
export function taxiFare(km: number): number {
  if (km < 0.8) return 0;
  return km < 3 ? 250 : km < 6 ? 300 : 400;
}

export const directionsUrl = (p: LatLng) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
export const osmUrl = (osm: string) => `https://www.openstreetmap.org/${osm}`;
