// POST /api/fapshi-webhook — Fapshi calls this when a payment becomes SUCCESSFUL, FAILED or EXPIRED.
// Set the webhook URL and a secret on the Fapshi dashboard, and FAPSHI_WEBHOOK_SECRET here.
// Fapshi sends the secret in the x-wh-secret header. In the pilot this marks the reservation or
// subscription as paid in the database; the prototype logs it.
import { one, type Req, type Res } from './http';

export default function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const secret = process.env.FAPSHI_WEBHOOK_SECRET;
  if (secret && one(req.headers['x-wh-secret']) !== secret) return res.status(401).json({ error: 'Bad secret' });
  const b = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
  console.log('fapshi-webhook', JSON.stringify({ transId: b.transId, status: b.status, externalId: b.externalId, amount: b.amount }));
  res.status(200).json({ received: true });
}
