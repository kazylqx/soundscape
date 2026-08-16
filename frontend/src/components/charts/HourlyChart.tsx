import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatHour, periodOfDay } from '@/utils/formatters';
import { TooltipBox } from './ChartTooltip';
import type { HourCount } from '@/types';

/**
 * Curva de escuta por hora do dia (amostra do recently played).
 */

export interface HourlyChartProps {
  hours: HourCount[];
  peakHour?: number | null;
  height?: number;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: HourCount }>;
}): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;

  const entry = payload[0]?.payload;
  if (!entry) return null;

  return (
    <TooltipBox
      title={`${formatHour(entry.hour)} · ${periodOfDay(entry.hour)}`}
      rows={[{ label: 'Faixas ouvidas', value: entry.count }]}
    />
  );
}

export function HourlyChart({ hours, peakHour, height = 200 }: HourlyChartProps): JSX.Element {
  const total = hours.reduce((sum, entry) => sum + entry.count, 0);

  if (total === 0) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-2xl border border-white/[0.06] text-sm text-chalk-muted"
        style={{ height }}
      >
        Sem escutas recentes registradas.
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={hours} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="hourly-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--vibe-primary)" stopOpacity={0.42} />
              <stop offset="100%" stopColor="var(--vibe-primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="hour"
            tickFormatter={(hour: number) => (hour % 6 === 0 ? `${hour}h` : '')}
            tick={{ fill: '#5f5f6b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            stroke="rgb(255 255 255 / 0.08)"
            interval={0}
          />
          <YAxis hide />

          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgb(255 255 255 / 0.12)' }} />

          <Area
            type="monotone"
            dataKey="count"
            stroke="var(--vibe-primary)"
            strokeWidth={2}
            fill="url(#hourly-fill)"
            isAnimationActive
            animationDuration={900}
            // Destaca o pico com um ponto maior.
            dot={(props: unknown) => {
              const { cx, cy, payload, index } = props as {
                cx?: number;
                cy?: number;
                payload?: HourCount;
                index?: number;
              };
              if (payload?.hour !== peakHour) return <g key={`dot-${index ?? 0}`} />;
              return (
                <circle
                  key={`dot-${index ?? 0}`}
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill="var(--vibe-primary)"
                  stroke="#050506"
                  strokeWidth={2}
                />
              );
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
