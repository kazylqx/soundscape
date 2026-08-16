import { motion } from 'framer-motion';
import { formatDecade } from '@/utils/formatters';
import { chartColor } from './ChartTooltip';
import { cn } from '@/components/ui/cn';
import type { DecadeCount } from '@/types';

/**
 * Linha do tempo das decadas.
 *
 * Feita a mao (sem Recharts) porque o desenho e uma trilha horizontal com
 * marcadores proporcionais — mais legivel que um grafico de barras comum,
 * e responsivo por natureza com flexbox.
 */

export interface DecadeTimelineProps {
  decades: DecadeCount[];
  /** Decada destacada (clique do usuario). */
  activeDecade?: string | null;
  onSelect?: (decade: string) => void;
  className?: string;
}

export function DecadeTimeline({
  decades,
  activeDecade,
  onSelect,
  className,
}: DecadeTimelineProps): JSX.Element {
  if (decades.length === 0) {
    return (
      <p className={cn('py-10 text-center text-sm text-chalk-muted', className)}>
        Sem datas de lancamento suficientes para montar a linha do tempo.
      </p>
    );
  }

  const max = Math.max(...decades.map((decade) => decade.percentage));

  return (
    <div className={cn('w-full', className)}>
      {/* Trilha com as barras */}
      <div className="flex items-end gap-2 sm:gap-3" style={{ height: 200 }}>
        {decades.map((decade, index) => {
          const active = activeDecade === decade.decade;
          const heightRatio = max > 0 ? decade.percentage / max : 0;
          const color = chartColor(index);

          return (
            <button
              key={decade.startYear}
              type="button"
              onClick={() => onSelect?.(decade.decade)}
              aria-pressed={active}
              aria-label={`${formatDecade(decade.decade)}: ${decade.percentage}% das suas musicas`}
              className={cn(
                'group flex h-full flex-1 flex-col justify-end gap-2 rounded-t-xl transition-all',
                onSelect ? 'cursor-pointer' : 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'text-center font-mono text-[0.6875rem] tabular transition-colors',
                  active ? 'text-chalk' : 'text-chalk-faint group-hover:text-chalk-muted',
                )}
              >
                {decade.percentage >= 1 ? `${Math.round(decade.percentage)}%` : '<1%'}
              </span>

              <motion.span
                className="w-full rounded-t-lg"
                style={{
                  backgroundColor: color,
                  opacity: active ? 1 : 0.55,
                  boxShadow: active ? `0 0 24px -4px ${color}` : undefined,
                }}
                initial={{ height: 0 }}
                whileInView={{ height: `${Math.max(4, heightRatio * 100)}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
              />
            </button>
          );
        })}
      </div>

      {/* Eixo */}
      <div className="mt-3 flex items-center gap-2 border-t border-white/[0.08] pt-3 sm:gap-3">
        {decades.map((decade) => (
          <span
            key={decade.startYear}
            className={cn(
              'flex-1 text-center font-mono text-xs transition-colors',
              activeDecade === decade.decade ? 'text-chalk' : 'text-chalk-muted',
            )}
          >
            {decade.decade}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Versao compacta em barra unica empilhada — usada nos cards. */
export function DecadeStack({
  decades,
  className,
}: {
  decades: DecadeCount[];
  className?: string;
}): JSX.Element {
  const total = decades.reduce((sum, decade) => sum + decade.percentage, 0) || 1;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
        {decades.map((decade, index) => (
          <span
            key={decade.startYear}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${(decade.percentage / total) * 100}%`,
              backgroundColor: chartColor(index),
            }}
            title={`${decade.decade}: ${decade.percentage}%`}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {decades.map((decade, index) =>
          // Legenda so para as decadas com presenca relevante.
          decade.percentage >= 3 ? (
            <span
              key={decade.startYear}
              className="inline-flex items-center gap-1.5 font-mono text-[0.6875rem] text-chalk-muted"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: chartColor(index) }}
                aria-hidden="true"
              />
              {decade.decade} · {Math.round(decade.percentage)}%
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}
