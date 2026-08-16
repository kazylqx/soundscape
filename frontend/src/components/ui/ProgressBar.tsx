import { motion } from 'framer-motion';
import { cn } from './cn';

/**
 * Barra de progresso animada com gradiente.
 * Usada em rankings de genero, features e no player.
 */

export interface ProgressBarProps {
  /** 0 a 1. */
  value: number;
  label?: string;
  /** Texto a direita (ex.: "42%"). */
  valueLabel?: string;
  color?: string;
  height?: 'xs' | 'sm' | 'md';
  /** Anima do zero ate o valor na entrada. */
  animate?: boolean;
  delay?: number;
  className?: string;
}

const HEIGHTS = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2.5',
} as const;

export function ProgressBar({
  value,
  label,
  valueLabel,
  color,
  height = 'sm',
  animate = true,
  delay = 0,
  className,
}: ProgressBarProps): JSX.Element {
  const percentage = Math.min(100, Math.max(0, value * 100));

  return (
    <div className={cn('w-full', className)}>
      {label || valueLabel ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label ? <span className="truncate text-sm text-chalk-soft">{label}</span> : null}
          {valueLabel ? (
            <span className="shrink-0 font-mono text-xs tabular text-chalk-muted">{valueLabel}</span>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn('w-full overflow-hidden rounded-full bg-white/[0.07]', HEIGHTS[height])}
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: color
              ? color
              : 'linear-gradient(90deg, var(--vibe-primary), var(--vibe-secondary))',
          }}
          initial={animate ? { width: 0 } : false}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  );
}

/**
 * Anel de progresso — usado no score de compatibilidade.
 */
export function ProgressRing({
  value,
  size = 140,
  strokeWidth = 10,
  children,
  className,
}: {
  /** 0 a 1. */
  value: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
  className?: string;
}): JSX.Element {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, value));

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--vibe-primary)" />
            <stop offset="100%" stopColor="var(--vibe-tertiary)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(255 255 255 / 0.08)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - clamped) }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
