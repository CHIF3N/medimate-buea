export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="mm-g" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(4 2) rotate(48) scale(84)">
          <stop offset="0" stopColor="#8C7CFB" />
          <stop offset=".48" stopColor="#5B3FE8" />
          <stop offset="1" stopColor="#3D29A2" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="17" fill="url(#mm-g)" />
      <g transform="rotate(-45 30 34)">
        <rect x="11" y="25" width="38" height="18" rx="9" fill="#fff" fillOpacity=".3" />
        <path d="M20 25h10v18H20a9 9 0 0 1 0-18z" fill="#fff" />
      </g>
      <path d="M48.5 9c.7 3.9 2.6 5.8 6.5 6.5-3.9.7-5.8 2.6-6.5 6.5-.7-3.9-2.6-5.8-6.5-6.5 3.9-.7 5.8-2.6 6.5-6.5z" fill="#fff" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="display text-[25px] leading-none tracking-[-0.02em]">MediMate</span>
    </span>
  );
}
