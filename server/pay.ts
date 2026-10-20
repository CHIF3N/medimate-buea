// /api/pay — Mobile Money collections through Fapshi (https://docs.fapshi.com).
//   POST { amount, phone, medium?, purpose, externalId, message }  → start a payment
//   GET  ?transId=…                                                → payment status
// API keys live only here, in environment variables:
//   FAPSHI_API_USER, FAPSHI_API_KEY      (from a Fapshi service)
//   FAPSHI_BASE_URL                      https://sandbox.fapshi.com (default) or https://live.fapshi.com
//   FAPSHI_DIRECT_PAY=1                  push the prompt to the phone (direct-pay must be activated on live)
// Without keys the endpoint answers { demo: true } and the app runs its labelled demo flow.
import { one, type Req, type Res } from './http';

const BASE = (process.env.FAPSHI_BASE_URL || 'https://sandbox.fapshi.com').replace(/\/$/, '');
const USER = process.env.FAPSHI_API_USER;
const KEY = process.env.FAPSHI_API_KEY;
const DIRECT = process.env.FAPSHI_DIRECT_PAY === '1';

/** Server-side price list: the browser cannot choose what it pays. */
const PRICES: Record<string, number> = { reservation: 500, subscription: 10000, family: 1000 };

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!USER || !KEY) return res.status(200).json({ demo: true });
  const headers = { 'Content-Type': 'application/json', apiuser: USER, apikey: KEY };

  try {
    if (req.method === 'GET') {
      const transId = one(req.query.transId);
      if (!/^[\w-]{3,64}$/.test(transId)) return res.status(400).json({ error: 'Invalid transId' });
      const r = await fetch(`${BASE}/payment-status/${encodeURIComponent(transId)}`, { headers });
      const j = (await r.json().catch(() => ({}))) as { status?: string; message?: string };
      return res.status(r.ok ? 200 : 502).json(r.ok ? { status: j.status } : { error: j.message ?? 'Status check failed' });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const b = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
    const purpose = String(b.purpose ?? '');
    const amount = PRICES[purpose];
    if (!amount || Number(b.amount) !== amount) return res.status(400).json({ error: 'Unknown price' });
    const externalId = String(b.externalId ?? '').replace(/[^\w-]/g, '').slice(0, 100) || `mm-${Date.now()}`;
    const message = String(b.message ?? 'MediMate').slice(0, 140);
    const phone = String(b.phone ?? '').replace(/\D/g, '').replace(/^237/, '');
    const medium = b.medium === 'orange money' || b.medium === 'mobile money' ? b.medium : undefined;

    if (DIRECT) {
      if (!/^6\d{8}$/.test(phone)) return res.status(400).json({ error: 'Invalid phone number' });
      const r = await fetch(`${BASE}/direct-pay`, { method: 'POST', headers, body: JSON.stringify({ amount, phone, medium, externalId, message }) });
      const j = (await r.json().catch(() => ({}))) as { transId?: string; message?: string };
      if (!r.ok || !j.transId) return res.status(502).json({ error: j.message ?? 'Payment request failed' });
      return res.status(200).json({ demo: false, transId: j.transId });
    }

    const host = one(req.headers['x-forwarded-host']) || one(req.headers.host);
    const redirectUrl = host ? `https://${host}/find` : undefined;
    const r = await fetch(`${BASE}/initiate-pay`, { method: 'POST', headers, body: JSON.stringify({ amount, externalId, message, redirectUrl }) });
    const j = (await r.json().catch(() => ({}))) as { transId?: string; link?: string; message?: string };
    if (!r.ok || !j.transId) return res.status(502).json({ error: j.message ?? 'Payment link failed' });
    return res.status(200).json({ demo: false, transId: j.transId, link: j.link });
  } catch {
    return res.status(502).json({ error: 'Payment service unreachable' });
  }
}
