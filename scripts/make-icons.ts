// Generates PWA icons and the social preview image from SVG: `npm run icons`
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';

const logo = readFileSync('public/favicon.svg');
mkdirSync('public/icons', { recursive: true });

const glyph = (size: number, scale: number) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}">
  <defs>
    <radialGradient id="g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(4 2) rotate(48) scale(84)">
      <stop offset="0" stop-color="#8C7CFB"/><stop offset=".48" stop-color="#5B3FE8"/><stop offset="1" stop-color="#3D29A2"/>
    </radialGradient>
  </defs>
  <rect width="64" height="64" fill="url(#g)"/>
  <g transform="translate(32 32) scale(${scale}) translate(-32 -32)">
    <g transform="rotate(-45 30 34)">
      <rect x="11" y="25" width="38" height="18" rx="9" fill="#fff" fill-opacity=".3"/>
      <path d="M20 25h10v18H20a9 9 0 0 1 0-18z" fill="#fff"/>
    </g>
    <path d="M48.5 9c.7 3.9 2.6 5.8 6.5 6.5-3.9.7-5.8 2.6-6.5 6.5-.7-3.9-2.6-5.8-6.5-6.5 3.9-.7 5.8-2.6 6.5-6.5z" fill="#fff"/>
  </g>
</svg>`;

await sharp(logo, { density: 600 }).resize(192, 192).png().toFile('public/icons/icon-192.png');
await sharp(logo, { density: 900 }).resize(512, 512).png().toFile('public/icons/icon-512.png');
await sharp(Buffer.from(glyph(512, 0.72))).png().toFile('public/icons/icon-maskable-512.png');
await sharp(Buffer.from(glyph(180, 0.86))).png().toFile('public/icons/apple-touch-icon.png');

const og = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="bg" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 0) rotate(28) scale(1400)">
      <stop offset="0" stop-color="#8C7CFB"/><stop offset=".45" stop-color="#5B3FE8"/><stop offset="1" stop-color="#21174F"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g transform="translate(90 110) scale(2.2)">
    <rect width="64" height="64" rx="16" fill="#fff" fill-opacity=".14"/>
    <g transform="rotate(-45 30 34)">
      <rect x="11" y="25" width="38" height="18" rx="9" fill="#fff" fill-opacity=".3"/>
      <path d="M20 25h10v18H20a9 9 0 0 1 0-18z" fill="#fff"/>
    </g>
    <path d="M48.5 9c.7 3.9 2.6 5.8 6.5 6.5-3.9.7-5.8 2.6-6.5 6.5-.7-3.9-2.6-5.8-6.5-6.5 3.9-.7 5.8-2.6 6.5-6.5z" fill="#fff"/>
  </g>
  <text x="90" y="345" font-family="Georgia, 'Times New Roman', serif" font-size="96" fill="#fff">MediMate</text>
  <text x="90" y="420" font-family="Segoe UI, Arial, sans-serif" font-size="38" fill="#fff" fill-opacity=".92">Safe medicine, from purchase to the last dose.</text>
  <text x="90" y="530" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#fff" fill-opacity=".75">English · Français · Pidgin  ·  Works offline  ·  Buea, Cameroon</text>
</svg>`;
await sharp(Buffer.from(og)).png().toFile('public/og.png');
console.log('icons ok');
