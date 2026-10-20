import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { AlertTriangle, Info, ShieldAlert, ShieldCheck, Siren, type LucideIcon } from 'lucide-react';
import type { Level, StockLevel } from '../core/types';
import { C, useLang } from '../i18n';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export const haptic = (ms = 8) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* not supported */
  }
};

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'emergency' | 'safe' | 'inverse';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white shadow-[0_8px_20px_-10px_rgb(91_63_232/0.8)] hover:bg-brand-700 active:bg-brand-800',
  secondary: 'bg-surface text-ink border border-line hover:bg-surface-2 active:bg-surface-3',
  ghost: 'bg-transparent text-ink-2 hover:bg-surface-2 active:bg-surface-3',
  danger: 'bg-danger-soft text-danger-ink border border-danger-line hover:brightness-95',
  emergency: 'bg-emergency text-white shadow-[0_10px_24px_-10px_rgb(180_20_27/0.9)] hover:brightness-110',
  safe: 'bg-safe text-white hover:brightness-105 shadow-[0_8px_20px_-10px_rgb(15_154_104/0.8)]',
  inverse: 'bg-ink text-bg hover:opacity-90',
};

const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] rounded-xl gap-1.5',
  md: 'h-11 px-4 text-[14px] rounded-2xl gap-2',
  lg: 'h-14 px-5 text-[15px] rounded-[18px] gap-2.5',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon: Icon, iconRight: IconR, block, className, children, onClick, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      {...rest}
      onClick={(e) => {
        haptic();
        onClick?.(e);
      }}
      className={cx(
        'inline-flex select-none items-center justify-center font-semibold tracking-[-0.01em] transition-[transform,background,filter,opacity] duration-150 active:scale-[0.97] disabled:opacity-45 disabled:active:scale-100',
        VARIANT[variant],
        SIZE[size],
        block && 'w-full',
        className,
      )}
    >
      {Icon && <Icon className={size === 'sm' ? 'size-4' : 'size-[18px]'} strokeWidth={2.2} />}
      {children}
      {IconR && <IconR className={size === 'sm' ? 'size-4' : 'size-[18px]'} strokeWidth={2.2} />}
    </button>
  );
});

export function IconButton({ icon: Icon, label, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      {...rest}
      onClick={(e) => {
        haptic();
        rest.onClick?.(e);
      }}
      className={cx(
        'grid size-10 shrink-0 place-items-center rounded-full text-ink-2 transition active:scale-90 hover:bg-surface-2',
        className,
      )}
    >
      <Icon className="size-[19px]" strokeWidth={2.1} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Safety level
// ---------------------------------------------------------------------------

export const LEVEL: Record<Level, { icon: LucideIcon; chip: string; tint: string; bar: string; text: string }> = {
  EMERGENCY: { icon: Siren, chip: 'bg-emergency text-white', tint: 'bg-danger-soft border-danger-line', bar: 'bg-emergency', text: 'text-danger-ink' },
  RED: { icon: ShieldAlert, chip: 'bg-danger-soft text-danger-ink ring-1 ring-danger-line', tint: 'bg-danger-soft border-danger-line', bar: 'bg-danger', text: 'text-danger-ink' },
  AMBER: { icon: AlertTriangle, chip: 'bg-warn-soft text-warn-ink ring-1 ring-warn-line', tint: 'bg-warn-soft border-warn-line', bar: 'bg-warn', text: 'text-warn-ink' },
  GREEN: { icon: ShieldCheck, chip: 'bg-safe-soft text-safe-ink ring-1 ring-safe-line', tint: 'bg-safe-soft border-safe-line', bar: 'bg-safe', text: 'text-safe-ink' },
  INFO: { icon: Info, chip: 'bg-info-soft text-info-ink ring-1 ring-info-line', tint: 'bg-info-soft border-info-line', bar: 'bg-info', text: 'text-info-ink' },
};

export function LevelBadge({ level, label, className }: { level: Level; label?: string; className?: string }) {
  const { L } = useLang();
  const s = LEVEL[level];
  return (
    <span className={cx('inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold tracking-[0.01em]', s.chip, className)}>
      <s.icon className="size-3.5" strokeWidth={2.4} />
      {label ?? L(C.level[level])}
    </span>
  );
}

export const STOCK_STYLE: Record<StockLevel | 'unknown', { chip: string; dot: string; pin: string }> = {
  in: { chip: 'bg-safe-soft text-safe-ink ring-1 ring-safe-line', dot: 'bg-safe', pin: '#0f9a68' },
  low: { chip: 'bg-warn-soft text-warn-ink ring-1 ring-warn-line', dot: 'bg-warn', pin: '#d17a06' },
  out: { chip: 'bg-danger-soft text-danger-ink ring-1 ring-danger-line', dot: 'bg-danger', pin: '#d92d2d' },
  unknown: { chip: 'bg-info-soft text-info-ink ring-1 ring-info-line', dot: 'bg-info', pin: '#8a909c' },
};

export function StockBadge({ level }: { level: StockLevel | 'unknown' }) {
  const { L } = useLang();
  const s = STOCK_STYLE[level];
  return (
    <span className={cx('inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold', s.chip)}>
      <span className={cx('size-1.5 rounded-full', s.dot)} />
      {L(C.stock[level])}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Layout bits
// ---------------------------------------------------------------------------

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick ? () => (haptic(), onClick()) : undefined}
      className={cx('card block w-full text-left', onClick && 'transition active:scale-[0.985]', className)}
    >
      {children}
    </Comp>
  );
}

export function ScreenHeader({ eyebrow, title, accent, sub, right }: { eyebrow?: string; title: string; accent?: string; sub?: string; right?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 px-5 pb-4 pt-2">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="display text-[38px] text-ink">
          {title} {accent && <em className="text-brand-600 dark:text-brand-300">{accent}</em>}
        </h1>
        {sub && <p className="mt-2 max-w-[34ch] text-[14px] leading-snug text-muted">{sub}</p>}
      </div>
      {right}
    </header>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2.5 mt-1 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-semibold tracking-[-0.005em] text-ink-2">{children}</h2>
      {action}
    </div>
  );
}

export function Chip({ active, children, onClick, icon: Icon }: { active?: boolean; children: ReactNode; onClick?: () => void; icon?: LucideIcon }) {
  return (
    <button
      onClick={() => (haptic(), onClick?.())}
      className={cx(
        'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-medium transition active:scale-95',
        active ? 'bg-ink text-bg' : 'bg-surface text-ink-2 ring-1 ring-line hover:bg-surface-2',
      )}
    >
      {Icon && <Icon className="size-4" strokeWidth={2.2} />}
      {children}
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, size = 'md' }: { value: T; options: { value: T; label: string; tone?: string }[]; onChange: (v: T) => void; size?: 'sm' | 'md' }) {
  return (
    <div className={cx('grid gap-1 rounded-2xl bg-surface-2 p-1 ring-1 ring-line', size === 'sm' ? 'text-[12px]' : 'text-[13px]')} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => (haptic(), onChange(o.value))}
          className={cx(
            'rounded-xl font-semibold transition',
            size === 'sm' ? 'h-8 px-2' : 'h-9 px-3',
            value === o.value ? cx('bg-surface text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)]', o.tone) : 'text-muted hover:text-ink-2',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => (haptic(), onChange(!on))}
      className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', on ? 'bg-safe' : 'bg-surface-3 ring-1 ring-line-strong')}
    >
      <span className={cx('absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform', on ? 'translate-x-[22px]' : 'translate-x-0.5')} />
    </button>
  );
}

export function ProgressRing({ value, size = 120, stroke = 10, children, tone = 'brand' }: { value: number; size?: number; stroke?: number; children?: ReactNode; tone?: 'brand' | 'safe' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-surface-3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
          className={cx('transition-[stroke-dashoffset] duration-700 ease-out', tone === 'safe' ? 'text-safe' : 'text-brand-500')}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx('inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent', className)} />;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink-2 ring-1 ring-line">{children}</span>;
}
