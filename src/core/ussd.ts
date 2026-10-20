// USSD menu for feature phones (no internet needed). Africa's Talking–compatible:
// the gateway sends the full input history as `text` ("1*2"), we answer "CON …" (continue) or "END …".
// The same function powers the in-app phone simulator and the /api/ussd endpoint.

import { PARTNERS, hoursLabel, isOpenNow, onDutyToday } from '../data/places';
import { MEDICINES } from '../data/medicines';
import { verifyPack } from './verify';

export const USSD_CODE = '*237*90#';

const AREAS = ['Molyko', 'Bulu (UB)', 'Mile 17', 'Bonduma', 'Great Soppo', 'Buea Town'];
const QUICK_MEDS = ['al', 'amoxicillin', 'paracetamol', 'ors', 'salbutamol'];

export function ussdRespond(text: string, now = new Date()): string {
  const parts = text ? text.split('*').map((p) => p.trim()) : [];
  const [first, second, third] = parts;

  if (!parts.length) {
    return [
      'CON MediMate Buea',
      '1. Pharmacy on duty now',
      '2. Who has my medicine?',
      '3. Check a medicine batch',
      '4. Emergency numbers',
      '5. Report a fake medicine',
    ].join('\n');
  }

  switch (first) {
    case '1': {
      const duty = PARTNERS.find((p) => p.id === onDutyToday(now));
      const open = PARTNERS.filter((p) => isOpenNow(p, now)).slice(0, 3);
      return [
        'END On duty tonight:',
        duty ? `${duty.name}, ${duty.area}` : 'Crossroads Pharmacy, Mile 17 (24/7)',
        'Open now:',
        ...open.map((p) => `- ${p.name} (${p.area}) ${hoursLabel(p)}`),
        '(Demo data)',
      ].join('\n');
    }
    case '2': {
      if (!second) {
        return ['CON Which medicine?', ...QUICK_MEDS.map((id, i) => `${i + 1}. ${MEDICINES.find((m) => m.id === id)!.name}`)].join('\n');
      }
      const med = MEDICINES.find((m) => m.id === QUICK_MEDS[parseInt(second, 10) - 1]);
      if (!med) return 'END Invalid choice. Dial *237*90# again.';
      if (!third) return ['CON Your area?', ...AREAS.map((a, i) => `${i + 1}. ${a}`)].join('\n');
      const area = AREAS[parseInt(third, 10) - 1];
      if (!area) return 'END Invalid choice. Dial *237*90# again.';
      const withStock = PARTNERS.filter((p) => p.stock[med.id] && p.stock[med.id] !== 'out').sort(
        (a, b) => Number(b.area === area) - Number(a.area === area),
      );
      if (!withStock.length) return `END No partner pharmacy has ${med.name} right now. Ask a licensed pharmacy.`;
      return [
        `END ${med.name} near ${area}:`,
        ...withStock.slice(0, 3).map((p) => `- ${p.name}, ${p.area}: ${p.stock[med.id] === 'low' ? 'LOW' : 'IN STOCK'}`),
        med.rx ? 'Prescription needed.' : '',
        '(Demo data)',
      ]
        .filter(Boolean)
        .join('\n');
    }
    case '3': {
      if (!second) return 'CON Type the batch/LOT number printed on the pack:';
      const r = verifyPack(second.toUpperCase(), now);
      if (r.verdict === 'danger') {
        const why = r.checks.find((c) => c.status === 'fail');
        return `END WARNING: ${second.toUpperCase()}\n${why?.title.en ?? 'Failed checks'}.\nDo NOT take it. Return it and report.`;
      }
      if (r.verdict === 'unknown') return `END ${second.toUpperCase()} not found in registry.\nNot proof of a fake - ask a licensed pharmacist before use.`;
      return `END ${second.toUpperCase()}: registered batch\n${r.record!.product}\nExp ${r.record!.expiry.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}${r.verdict === 'caution' ? ' (soon)' : ''}\n(Demo registry)`;
    }
    case '4':
      return ['END Emergency (free):', 'Ambulance: 119', 'Emergency: 112', 'Police: 117  Fire: 118', 'Nearest: Buea Regional Hospital'].join('\n');
    case '5': {
      if (!second) return ['CON Where was it sold?', '1. Street / market seller', '2. Pharmacy', '3. Online / other'].join('\n');
      if (!third) return 'CON Medicine name or batch number:';
      return 'END Thank you. Your report was recorded (demo). Keep the pack and do not take it.';
    }
    default:
      return 'END Invalid choice. Dial *237*90# again.';
  }
}
