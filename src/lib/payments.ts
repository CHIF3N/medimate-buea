// Mobile Money payments through Fapshi (MTN MoMo & Orange Money).
// The browser never sees API keys: it calls our serverless function /api/pay, which holds them.
// Until FAPSHI_API_USER / FAPSHI_API_KEY are set on the server, /api/pay answers { demo: true }
// and the app runs a clearly labelled simulated payment (no money moves).

export type Medium = 'mobile money' | 'orange money';
export type PayStatus = 'CREATED' | 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'EXPIRED';

export interface StartPayment {
  amount: number;
  phone: string;
  medium?: Medium;
  purpose: 'reservation' | 'subscription';
  externalId: string;
  message: string;
}

export type StartResult = { demo: true } | { demo: false; transId: string; link?: string } | { error: string };

export function guessMedium(phone: string): Medium | undefined {
  const d = phone.replace(/\D/g, '').replace(/^237/, '');
  if (/^(69|65[5-9]|68[5-9])/.test(d)) return 'orange money';
  if (/^(67|68[0-4]|65[0-4])/.test(d)) return 'mobile money';
  return undefined;
}

export const validPhone = (phone: string) => /^6\d{8}$/.test(phone.replace(/\D/g, '').replace(/^237/, ''));

export async function startPayment(p: StartPayment): Promise<StartResult> {
  try {
    const res = await fetch('/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...p, phone: p.phone.replace(/\D/g, '').replace(/^237/, ''), origin: window.location.origin }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string; demo?: boolean };
      if (body.demo) return { demo: true };
      return { error: body.error ?? `Payment service error (${res.status})` };
    }
    return (await res.json()) as StartResult;
  } catch {
    // Offline or no server (local dev): fall back to the demo flow.
    return { demo: true };
  }
}

export async function paymentStatus(transId: string): Promise<PayStatus | undefined> {
  try {
    const res = await fetch(`/api/pay?transId=${encodeURIComponent(transId)}`);
    if (!res.ok) return undefined;
    const body = (await res.json()) as { status?: PayStatus };
    return body.status;
  } catch {
    return undefined;
  }
}

export const formatFcfa = (n: number) => `${n.toLocaleString('fr-CM').replace(/ /g, ' ')} FCFA`;
