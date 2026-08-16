import type { ReactNode } from 'react';
import { cn } from '@/components/ui/cn';

/**
 * Caixa de tooltip usada por todos os graficos do Recharts.
 * Mantem a mesma linguagem visual dos tooltips de UI.
 */

export function TooltipBox({
  title,
  rows,
  footer,
  className,
}: {
  title: ReactNode;
  rows?: Array<{ label: string; value: ReactNode; color?: string }>;
  footer?: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div
      className={cn(
        'pointer-events-none rounded-xl border border-white/12 bg-ink-800/95 px-3 py-2.5 shadow-glow backdrop-blur-xl',
        className,
      )}
    >
      <p className="mb-1.5 text-sm font-semibold leading-tight text-chalk">{title}</p>

      {rows && rows.length > 0 ? (
        <ul className="space-y-1">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center gap-2 text-xs text-chalk-muted">
              {row.color ? (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                  aria-hidden="true"
                />
              ) : null}
              <span>{row.label}</span>
              <span className="ml-auto font-mono tabular text-chalk-soft">{row.value}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {footer ? <p className="mt-1.5 text-[0.6875rem] text-chalk-faint">{footer}</p> : null}
    </div>
  );
}

/** Paleta de apoio para series com muitas categorias (generos, decadas). */
export const CHART_COLORS = [
  '#1ed760',
  '#8b5cf6',
  '#ec4899',
  '#fb923c',
  '#22d3ee',
  '#fbbf24',
  '#34d399',
  '#f472b6',
  '#a78bfa',
  '#60a5fa',
  '#f87171',
  '#2dd4bf',
  '#c084fc',
  '#facc15',
] as const;

export function chartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length] as string;
}
