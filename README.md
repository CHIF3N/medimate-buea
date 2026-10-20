# MediMate — safe medicine, from purchase to the last dose

Offline-first medicine companion for Buea, Cameroon. Built by **Team Medimates** for the She Innovates Hackathon 2026.

- **Ask** in English, French or Cameroonian Pidgin. An on-device, explainable answer engine (no generative AI) understands slang and typos, flags danger signs first, never gives doses for prescription-only medicines, and asks tap-to-answer follow-up questions ("Who is it for?", "Did a test confirm malaria?").
- **Find** medicine in stock on a live map of Buea: demo partner pharmacies with stock, real pharmacies and health centres from OpenStreetMap, night-duty rotation, reservations paid by Mobile Money.
- **Verify** a pack: GS1 DataMatrix / QR / GS1 Digital Link scanning, on-device OCR of printed batch numbers, registry, expiry, recall, barcode–batch mismatch and copied-code checks.
- **Finish the course**: dose-level tracking, calendar alarms that ring offline, family sharing, and a visual "why you must finish".
- **Feature phones**: the same service over USSD (`*237*90#` simulator in the app, live webhook at `/api/ussd`).
- **Pharmacy portal** (sandbox): two-tap stock updates, demand insights, Pro plan paid by Mobile Money.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 84 safety tests for the answer engine
npm run build      # production build + offline service worker
```

## Deploy (Vercel)

The repo deploys as-is: static Vite build + serverless functions in `api/`.

`api/*.js` are bundled from `server/*.ts` — after editing `server/` or `src/core/`, run `npm run build:api` and commit the result.

### Mobile Money (Fapshi)

Payments run in a labelled demo mode until these environment variables are set in Vercel → Project → Settings → Environment Variables:

| Variable | Value |
| --- | --- |
| `FAPSHI_API_USER` | API user of your Fapshi service |
| `FAPSHI_API_KEY` | API key of your Fapshi service |
| `FAPSHI_BASE_URL` | `https://sandbox.fapshi.com` (default) or `https://live.fapshi.com` |
| `FAPSHI_DIRECT_PAY` | `1` to push the prompt to the payer's phone (direct pay must be activated on live) — otherwise a hosted checkout link is used |
| `FAPSHI_WEBHOOK_SECRET` | the webhook secret set on the Fapshi dashboard; webhook URL: `https://<your-domain>/api/fapshi-webhook` |

Keys never reach the browser. Prices are fixed on the server (reservation deposit 500 FCFA, Pro 10,000 FCFA/month).

### USSD

`POST /api/ussd` accepts the Africa's Talking format (`text=1*2*3`) and answers `CON …` / `END …`:

```bash
curl -X POST https://<your-domain>/api/ussd -d "text=2*1*1"
```

## What's real, what's demo

| Real | Demo |
| --- | --- |
| Answer engine, safety rules, 3 languages | Partner pharmacies, their stock and hours |
| Pharmacy & hospital locations (OpenStreetMap) | Batch registry, recalls, copied codes |
| Emergency numbers (119 / 112 / 117 / 118) | Payments until Fapshi keys are added |
| GS1 parsing, OCR, offline mode, calendar reminders, USSD logic | Report routing to authorities |

Medicine content is a prototype and must be reviewed by a pharmacist against the Cameroon national essential medicines list (LNME) and product leaflets before any real use. MediMate gives information, not medical advice.

## Stack

React 19 · Vite 8 · Tailwind CSS 4 · Motion · Leaflet + OpenStreetMap · tesseract.js · barcode-detector (ZXing WebAssembly) · vite-plugin-pwa (Workbox) · Vercel functions · Fapshi.

## Sources

WHO fact sheets on malaria, substandard and falsified medical products, and antimicrobial resistance; WHO Guidelines for malaria; WHO AWaRe antibiotic book; GS1 Digital Link; OpenStreetMap contributors (ODbL).
