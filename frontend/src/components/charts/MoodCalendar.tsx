import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/components/ui/cn';
import { weekdayShort } from '@/utils/formatters';
import type { DayMood } from '@/utils/musicAnalyzer';

/**
 * Calendario dos ultimos 30 dias colorido pela valencia media do dia.
 * Azul = dia mais melancolico, amarelo/verde = dia mais luminoso.
 */

export interface MoodCalendarProps {
  days: DayMood[];
  className?: string;
}

/** Interpola azul -> violeta -> ambar conforme a valencia. */
function valenceColor(valence: number | null): string {
  if (valence === null) return 'rgb(255 255 255 / 0.045)';

  const stops: Array<{ at: number; color: [number, number, number] }> = [
    { at: 0, color: [56, 96, 200] },
    { at: 0.35, color: [124, 92, 246] },
    { at: 0.65, color: [236, 72, 153] },
    { at: 1, color: [251, 191, 36] },
  ];

  const clamped = Math.min(1, Math.max(0, valence));

  for (let index = 0; index < stops.length - 1; index += 1) {
    const current = stops[index];
    const next = stops[index + 1];
    if (!current || !next) break;

    if (clamped >= current.at && clamped <= next.at) {
      const span = next.at - current.at || 1;
      const ratio = (clamped - current.at) / span;
      const mix = current.color.map((channel, position) =>
        Math.round(channel + ((next.color[position] ?? channel) - channel) * ratio),
      );
      return `rgb(${mix[0]} ${mix[1]} ${mix[2]})`;
    }
  }

  return 'rgb(124 92 246)';
}

export function MoodCalendar({ days, className }: MoodCalendarProps): JSX.Element {
  const withData = days.filter((day) => day.count > 0).length;

  // O primeiro dia pode nao cair no domingo: preenche a linha inicial.
  const leadingBlanks = days[0]?.weekday ?? 0;

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-2 grid grid-cols-7 gap-1.5">
        {Array.from({ length: 7 }).map((_, weekday) => (
          <span
            key={weekday}
            className="text-center font-mono text-[0.625rem] uppercase text-chalk-faint"
            aria-hidden="true"
          >
            {weekdayShort(weekday)}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: leadingBlanks }).map((_, index) => (
          <span key={`blank-${index}`} aria-hidden="true" />
        ))}

        {days.map((day) => (
          <Tooltip
            key={day.date}
            delay={120}
            content={
              <span>
                Dia {day.day} —{' '}
                {day.count === 0
                  ? 'sem escutas registradas'
                  : `${day.count} faixa${day.count > 1 ? 's' : ''}${
                      day.valence !== null ? `, humor ${Math.round(day.valence * 100)}%` : ''
                    }`}
              </span>
            }
          >
            <span
              className="flex aspect-square w-full items-center justify-center rounded-lg border border-white/[0.05] font-mono text-[0.625rem] transition-transform hover:scale-110"
              style={{
                backgroundColor: valenceColor(day.valence),
                opacity: day.count === 0 ? 1 : 0.28 + Math.min(1, day.count / 6) * 0.72,
                color: day.valence !== null && day.valence > 0.6 ? '#0a0a0c' : '#f4f4f5',
              }}
            >
              {day.day}
            </span>
          </Tooltip>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-chalk-muted">
          {withData} de {days.length} dias com escuta registrada
        </p>

        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.625rem] uppercase tracking-wider text-chalk-faint">
            melancolico
          </span>
          <span className="flex overflow-hidden rounded-full">
            {[0, 0.25, 0.5, 0.75, 1].map((step) => (
              <span
                key={step}
                className="h-3 w-5"
                style={{ backgroundColor: valenceColor(step) }}
                aria-hidden="true"
              />
            ))}
          </span>
          <span className="font-mono text-[0.625rem] uppercase tracking-wider text-chalk-faint">
            luminoso
          </span>
        </div>
      </div>
    </div>
  );
}
