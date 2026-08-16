import { useMemo } from 'react';
import { formatHour, weekdayShort } from '@/utils/formatters';
import { buildHeatmapMatrix } from '@/utils/musicAnalyzer';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/components/ui/cn';
import type { WeekdayHourCell } from '@/types';

/**
 * Heatmap hora x dia da semana.
 *
 * A fonte e o `recently played` do Spotify, que devolve no maximo 50 itens —
 * ou seja, e uma amostra recente, nao o historico completo. O texto de apoio
 * na pagina deixa isso claro.
 */

export interface ListeningHeatmapProps {
  cells: WeekdayHourCell[];
  className?: string;
}

/** Agrupa as 24 horas em 8 blocos de 3h para caber no mobile. */
const HOUR_BLOCKS = Array.from({ length: 8 }, (_, index) => index * 3);

export function ListeningHeatmap({ cells, className }: ListeningHeatmapProps): JSX.Element {
  const { matrix, max } = useMemo(() => buildHeatmapMatrix(cells), [cells]);

  if (max === 0) {
    return (
      <p className={cn('py-10 text-center text-sm text-chalk-muted', className)}>
        Ainda nao ha escutas recentes registradas para montar o mapa de horarios.
      </p>
    );
  }

  const intensity = (value: number): number => (max > 0 ? value / max : 0);

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop: 24 colunas */}
      <div className="hidden sm:block">
        <div className="flex gap-1.5">
          <div className="w-9 shrink-0" />
          <div className="grid flex-1 grid-cols-24 gap-[3px]">
            {Array.from({ length: 24 }).map((_, hour) => (
              <span
                key={hour}
                className="text-center font-mono text-[0.5rem] text-chalk-faint"
                aria-hidden="true"
              >
                {hour % 3 === 0 ? hour : ''}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-1 space-y-[3px]">
          {matrix.map((row, weekday) => (
            <div key={weekday} className="flex items-center gap-1.5">
              <span className="w-9 shrink-0 font-mono text-[0.625rem] uppercase text-chalk-faint">
                {weekdayShort(weekday)}
              </span>
              <div className="grid flex-1 grid-cols-24 gap-[3px]">
                {row.map((value, hour) => (
                  <Tooltip
                    key={hour}
                    delay={120}
                    content={
                      <span>
                        {weekdayShort(weekday)} · {formatHour(hour)} —{' '}
                        {value === 0 ? 'nenhuma escuta' : `${value} escuta${value > 1 ? 's' : ''}`}
                      </span>
                    }
                  >
                    <span
                      className="block aspect-square w-full rounded-[3px] transition-transform hover:scale-125"
                      style={{
                        backgroundColor:
                          value === 0
                            ? 'rgb(255 255 255 / 0.04)'
                            : `color-mix(in srgb, var(--vibe-primary) ${
                                18 + intensity(value) * 82
                              }%, transparent)`,
                      }}
                    />
                  </Tooltip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: blocos de 3h */}
      <div className="sm:hidden">
        <div className="flex gap-1.5">
          <div className="w-8 shrink-0" />
          <div className="grid flex-1 grid-cols-8 gap-1">
            {HOUR_BLOCKS.map((hour) => (
              <span
                key={hour}
                className="text-center font-mono text-[0.5rem] text-chalk-faint"
                aria-hidden="true"
              >
                {hour}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-1 space-y-1">
          {matrix.map((row, weekday) => (
            <div key={weekday} className="flex items-center gap-1.5">
              <span className="w-8 shrink-0 font-mono text-[0.5625rem] uppercase text-chalk-faint">
                {weekdayShort(weekday)}
              </span>
              <div className="grid flex-1 grid-cols-8 gap-1">
                {HOUR_BLOCKS.map((startHour) => {
                  const total =
                    (row[startHour] ?? 0) + (row[startHour + 1] ?? 0) + (row[startHour + 2] ?? 0);
                  return (
                    <span
                      key={startHour}
                      title={`${weekdayShort(weekday)} ${startHour}h–${startHour + 3}h: ${total}`}
                      className="block aspect-square w-full rounded-[3px]"
                      style={{
                        backgroundColor:
                          total === 0
                            ? 'rgb(255 255 255 / 0.04)'
                            : `color-mix(in srgb, var(--vibe-primary) ${
                                18 + Math.min(1, total / (max * 1.6)) * 82
                              }%, transparent)`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="mt-4 flex items-center justify-end gap-2">
        <span className="font-mono text-[0.625rem] uppercase tracking-wider text-chalk-faint">
          menos
        </span>
        {[0, 0.25, 0.5, 0.75, 1].map((step) => (
          <span
            key={step}
            className="h-3 w-3 rounded-[3px]"
            style={{
              backgroundColor:
                step === 0
                  ? 'rgb(255 255 255 / 0.04)'
                  : `color-mix(in srgb, var(--vibe-primary) ${18 + step * 82}%, transparent)`,
            }}
            aria-hidden="true"
          />
        ))}
        <span className="font-mono text-[0.625rem] uppercase tracking-wider text-chalk-faint">
          mais
        </span>
      </div>
    </div>
  );
}
