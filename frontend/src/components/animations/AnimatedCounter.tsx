import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import { cn } from '@/components/ui/cn';

/**
 * Contador que anima do zero ate o valor final quando entra na tela.
 * Respeita `prefers-reduced-motion` mostrando o valor final direto.
 */

export interface AnimatedCounterProps {
  value: number;
  /** Casas decimais. */
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  /** Formata o numero (padrao: pt-BR com separador de milhar). */
  format?: (value: number) => string;
  className?: string;
}

const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

export function AnimatedCounter({
  value,
  decimals = 0,
  duration = 1.4,
  prefix = '',
  suffix = '',
  format,
  className,
}: AnimatedCounterProps): JSX.Element {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;

    if (prefersReducedMotion() || duration <= 0) {
      setDisplay(value);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const totalMs = duration * 1000;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / totalMs);
      // easeOutExpo: rapido no comeco, assenta no fim.
      const eased = progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
      setDisplay(value * eased);

      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration]);

  const formatted = format
    ? format(display)
    : new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(display);

  return (
    <span ref={ref} className={cn('tabular', className)}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
