import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from './cn';

/**
 * Card base: fundo escuro, borda sutil, raio generoso e glow no hover.
 */

export type CardTone = 'default' | 'raised' | 'vibe' | 'flat';

const TONES: Record<CardTone, string> = {
  default: 'glass',
  raised: 'glass-strong shadow-card',
  vibe: 'glass border-vibe',
  flat: 'border border-white/[0.06] bg-ink-900',
};

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  tone?: CardTone;
  /** Escala + glow no hover (para cards clicaveis). */
  interactive?: boolean;
  padded?: boolean;
  children?: ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { tone = 'default', interactive = false, padded = true, className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-3xl',
        TONES[tone],
        padded && 'p-5 sm:p-6',
        interactive &&
          'cursor-pointer transition-all duration-300 ease-out-expo hover:-translate-y-0.5 hover:border-white/20 hover:shadow-glow',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

/** Versao animada, para listas com entrada em stagger. */
export interface MotionCardProps extends HTMLMotionProps<'div'> {
  tone?: CardTone;
  interactive?: boolean;
  padded?: boolean;
}

export function MotionCard({
  tone = 'default',
  interactive = false,
  padded = true,
  className,
  children,
  ...rest
}: MotionCardProps): JSX.Element {
  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-3xl',
        TONES[tone],
        padded && 'p-5 sm:p-6',
        interactive && 'cursor-pointer hover:border-white/20 hover:shadow-glow',
        className,
      )}
      whileHover={interactive ? { y: -3, scale: 1.01 } : undefined}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
 * Subcomponentes
 * ============================================================ */

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-4', className)}>
      <div className="flex items-start gap-3">
        {icon ? (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-vibe-primary">
            {icon}
          </span>
        ) : null}
        <div>
          <h3 className="text-base font-semibold leading-tight text-chalk sm:text-lg">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-chalk-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

/** Titulo de secao usado nas paginas longas (Profile, Moods, Decades). */
export function SectionTitle({
  overline,
  title,
  description,
  action,
  className,
}: {
  overline?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('mb-6 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="max-w-2xl">
        {overline ? (
          <p className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-vibe-primary">
            {overline}
          </p>
        ) : null}
        <h2 className="text-2xl font-bold leading-tight text-chalk sm:text-3xl">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-chalk-muted sm:text-base">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** Card de estatistica com numero grande. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: string;
  className?: string;
}): JSX.Element {
  return (
    <Card className={cn('flex flex-col justify-between gap-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-chalk-muted">
          {label}
        </span>
        {icon ? (
          <span className="text-chalk-faint" style={accent ? { color: accent } : undefined}>
            {icon}
          </span>
        ) : null}
      </div>
      <div>
        <p
          className="font-display text-3xl font-extrabold leading-none tabular text-chalk sm:text-4xl"
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </p>
        {hint ? <p className="mt-1.5 text-xs text-chalk-muted">{hint}</p> : null}
      </div>
    </Card>
  );
}
