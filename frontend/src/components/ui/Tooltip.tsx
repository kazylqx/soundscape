import { useId, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from './cn';

/**
 * Tooltip escuro com delay de 300ms.
 * Abre no hover (mouse) e no foco (teclado), fecha com Escape.
 */

export type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

const SIDES: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const OFFSETS: Record<TooltipSide, { x?: number; y?: number }> = {
  top: { y: 4 },
  bottom: { y: -4 },
  left: { x: 4 },
  right: { x: -4 },
};

export interface TooltipProps {
  content: ReactNode;
  side?: TooltipSide;
  delay?: number;
  className?: string;
  children: ReactNode;
}

export function Tooltip({
  content,
  side = 'top',
  delay = 300,
  className,
  children,
}: TooltipProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const id = useId();

  const show = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(true), delay);
  };

  const hide = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    setOpen(false);
  };

  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(event) => {
        if (event.key === 'Escape') hide();
      }}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>

      <AnimatePresence>
        {open ? (
          <motion.span
            id={id}
            role="tooltip"
            className={cn(
              'pointer-events-none absolute z-50 w-max max-w-[16rem] rounded-xl border border-white/10',
              'bg-ink-800/95 px-3 py-2 text-xs leading-relaxed text-chalk-soft shadow-glow backdrop-blur-xl',
              SIDES[side],
            )}
            initial={{ opacity: 0, scale: 0.94, ...OFFSETS[side] }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, ...OFFSETS[side] }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {content}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}

/** Icone de informacao com tooltip — usado nos titulos de grafico. */
export function InfoHint({ content, side = 'top' }: { content: ReactNode; side?: TooltipSide }): JSX.Element {
  return (
    <Tooltip content={content} side={side}>
      <button
        type="button"
        aria-label="Mais informacoes"
        className="flex h-5 w-5 items-center justify-center rounded-full border border-white/15 text-[0.625rem] font-bold text-chalk-muted transition-colors hover:border-white/35 hover:text-chalk"
      >
        i
      </button>
    </Tooltip>
  );
}
