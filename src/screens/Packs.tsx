import { Printer } from 'lucide-react';
import { DEMO_PACKS } from '../core/verify';
import { digitalLink } from '../core/gs1';
import { QR } from '../lib/qr';
import { LogoMark } from '../ui/Logo';

// Printable sheet of fictional medicine packs for live demos. Each QR is a GS1 Digital Link on
// this site's own domain, so scanning it with any phone camera opens MediMate on the result.

export default function PacksPage() {
  const origin = window.location.origin;
  return (
    <div className="min-h-screen bg-white px-6 py-8 text-[#14151a] print:p-0">
      <div className="mx-auto max-w-[900px]">
        <header className="mb-6 flex items-center justify-between print:mb-3">
          <div className="flex items-center gap-3">
            <LogoMark size={40} />
            <div>
              <h1 className="text-[22px] font-semibold tracking-[-0.02em]">MediMate demo packs</h1>
              <p className="text-[13px] text-[#6a6f7b]">Fictional products for demonstration only — not real medicines. Scan with any phone camera.</p>
            </div>
          </div>
          <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-[#14151a] px-4 py-2.5 text-[14px] font-semibold text-white print:hidden">
            <Printer className="size-4" /> Print
          </button>
        </header>
        <div className="grid grid-cols-2 gap-4 print:gap-3">
          {DEMO_PACKS.map((p) => {
            const link = digitalLink(origin, p.product.gtin, p.lot, p.expiry, p.serial);
            return (
              <article key={p.id} className="flex break-inside-avoid gap-4 rounded-2xl border-2 border-dashed border-[#d3cfc3] p-4">
                <div className="flex min-w-0 flex-1 flex-col">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#b4141b]">Demo pack · not a medicine</p>
                  <p className="mt-1 text-[18px] font-semibold leading-tight">{p.product.product}</p>
                  <p className="text-[12px] text-[#6a6f7b]">{p.product.pack} · Demo Labs (fictional)</p>
                  <div className="mt-auto space-y-0.5 pt-3 font-mono text-[12px]">
                    <p>LOT {p.lot}</p>
                    <p>EXP {p.expiry.toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' })}</p>
                    <p>SN {p.serial}</p>
                    <p className="text-[10px] text-[#6a6f7b]">GTIN {p.product.gtin}</p>
                  </div>
                  <p className="mt-2 inline-flex w-fit rounded-full bg-[#f2f1ec] px-2 py-0.5 text-[10.5px] font-semibold">{p.label.en}</p>
                </div>
                <div className="shrink-0">
                  <QR value={link} size={128} ecl="Q" />
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-center text-[11px] text-[#6a6f7b]">
          QR codes use the GS1 Digital Link format: {origin}/01/&lt;GTIN&gt;/10/&lt;LOT&gt;/21/&lt;SERIAL&gt;?17=&lt;EXPIRY&gt;
        </p>
      </div>
    </div>
  );
}
