import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QR({ value, size = 160, className, dark = '#14151a', light = '#ffffff', ecl = 'M' }: { value: string; size?: number; className?: string; dark?: string; light?: string; ecl?: 'L' | 'M' | 'Q' | 'H' }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let alive = true;
    QRCode.toString(value, { type: 'svg', margin: 0, errorCorrectionLevel: ecl, color: { dark, light } })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(''));
    return () => {
      alive = false;
    };
  }, [value, dark, light, ecl]);
  return (
    <div
      className={className}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`QR code for ${value}`}
      // The SVG string is generated locally by the qrcode library.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
