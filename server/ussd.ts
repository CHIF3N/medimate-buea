// POST /api/ussd — USSD gateway webhook (Africa's Talking format).
// The gateway sends form fields sessionId, serviceCode, phoneNumber and text ("1*2*3").
// We reply in plain text starting with "CON" (continue) or "END" (close the session).
import { ussdRespond } from '../src/core/ussd';
import { one, type Req, type Res } from './http';

export default function handler(req: Req, res: Res) {
  const body = (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
  const text = typeof body.text === 'string' ? body.text : one(req.query.text);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(ussdRespond(text.slice(0, 200)));
}
