import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { CheckCircle2, X } from 'lucide-react';
import { cx } from './primitives';

// Overlays render inside the app viewport (the phone frame on desktop), not the whole window.

const OverlayCtx = createContext<HTMLElement | null>(null);
export const OverlayProvider = OverlayCtx.Provider;

export function Portal({ children }: { children: ReactNode }) {
  const root = useContext(OverlayCtx);
  return root ? createPortal(children, root) : null;
}

export function Sheet({
  open,
  onClose,
  title,
  children,
  tall,
  tone = 'default',
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  tall?: boolean;
  tone?: 'default' | 'danger';
  footer?: ReactNode;
}) {
  const drag = useDragControls();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col justify-end">
            <motion.button
              aria-label="Close"
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              className={cx(
                'relative flex max-h-[92%] flex-col rounded-t-[30px] border-t border-line bg-surface shadow-float',
                tall && 'h-[92%]',
                tone === 'danger' && 'border-danger-line',
              )}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 340 }}
              drag="y"
              dragControls={drag}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => (info.offset.y > 120 || info.velocity.y > 600) && onClose()}
            >
              <div className="shrink-0 cursor-grab touch-none pb-1 pt-2.5" onPointerDown={(e) => drag.start(e)}>
                <div className="mx-auto h-1.5 w-10 rounded-full bg-line-strong" />
              </div>
              {title && (
                <div className="flex shrink-0 touch-none items-start justify-between gap-3 px-5 pb-2 pt-2" onPointerDown={(e) => drag.start(e)}>
                  <div className="min-w-0 text-[19px] font-semibold tracking-[-0.02em] text-ink">{title}</div>
                  <button aria-label="Close" onClick={onClose} className="-mr-1 grid size-9 shrink-0 place-items-center rounded-full bg-surface-2 text-muted transition active:scale-90">
                    <X className="size-[18px]" />
                  </button>
                </div>
              )}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-1">{children}</div>
              {footer && <div className="safe-bottom shrink-0 border-t border-line bg-surface px-5 pt-3">{footer}</div>}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------

interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

const ToastCtx = createContext<(text: string, action?: Toast['action']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  const show = useCallback((text: string, action?: Toast['action']) => {
    const id = ++counter.current;
    setToasts((t) => [...t.slice(-1), { id, text, action }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 5000 : 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <Portal>
        <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+12px)] z-[60] flex flex-col items-center gap-2 px-4">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                className="pointer-events-auto flex max-w-full items-center gap-2.5 rounded-2xl bg-ink py-2.5 pl-3.5 pr-2.5 text-[13px] font-medium text-bg shadow-float"
              >
                <CheckCircle2 className="size-4 shrink-0 text-safe" />
                <span className="min-w-0">{t.text}</span>
                {t.action && (
                  <button
                    onClick={() => {
                      t.action!.run();
                      setToasts((all) => all.filter((x) => x.id !== t.id));
                    }}
                    className="ml-1 rounded-lg bg-white/15 px-2.5 py-1 text-[12px] font-semibold"
                  >
                    {t.action.label}
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Portal>
    </ToastCtx.Provider>
  );
}
