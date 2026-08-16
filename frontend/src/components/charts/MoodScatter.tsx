import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { MOOD_COLOR, MOOD_LABEL } from '@/utils/formatters';
import { TooltipBox } from './ChartTooltip';
import type { MoodPoint } from '@/utils/musicAnalyzer';

/**
 * Scatter energia (X) x positividade (Y).
 *
 * Os quatro quadrantes tem leitura direta:
 *   alta energia + alta valencia  -> euforia
 *   alta energia + baixa valencia -> raiva/tensao
 *   baixa energia + alta valencia -> calma
 *   baixa energia + baixa valencia -> tristeza
 */

export interface MoodScatterProps {
  points: MoodPoint[];
  height?: number;
  onSelect?: (point: MoodPoint) => void;
}

const QUADRANTS = [
  { label: 'Euforia', x: '76%', y: '16%' },
  { label: 'Tensao', x: '76%', y: '84%' },
  { label: 'Calma', x: '20%', y: '16%' },
  { label: 'Tristeza', x: '20%', y: '84%' },
];

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: MoodPoint }>;
}): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <TooltipBox
      title={point.name}
      rows={[
        { label: 'Artista', value: point.artist },
        { label: 'Energia', value: `${Math.round(point.energy * 100)}%` },
        { label: 'Positividade', value: `${Math.round(point.valence * 100)}%` },
        {
          label: 'Humor',
          value: MOOD_LABEL[point.mood] ?? point.mood,
          color: MOOD_COLOR[point.mood],
        },
      ]}
      footer={point.previewUrl ? 'Clique para ouvir o preview' : 'Sem preview disponivel'}
    />
  );
}

export function MoodScatter({ points, height = 420, onSelect }: MoodScatterProps): JSX.Element {
  if (points.length === 0) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-2xl border border-white/[0.06] text-sm text-chalk-muted"
        style={{ height }}
      >
        Sem metricas de audio suficientes para o mapa de humor.
      </div>
    );
  }

  // Recharts precisa dos valores em 0–100 para os eixos ficarem legiveis.
  const data = points.map((point) => ({
    ...point,
    x: Math.round(point.energy * 100),
    y: Math.round(point.valence * 100),
    z: 1,
  }));

  return (
    <div className="relative w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 16, right: 16, bottom: 28, left: 8 }}>
          <CartesianGrid stroke="rgb(255 255 255 / 0.06)" />

          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 100]}
            name="Energia"
            tick={{ fill: '#5f5f6b', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
            stroke="rgb(255 255 255 / 0.1)"
            label={{
              value: 'Energia →',
              position: 'insideBottom',
              offset: -16,
              fill: '#8f8f9c',
              fontSize: 12,
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, 100]}
            name="Positividade"
            tick={{ fill: '#5f5f6b', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
            stroke="rgb(255 255 255 / 0.1)"
            label={{
              value: 'Positividade →',
              angle: -90,
              position: 'insideLeft',
              fill: '#8f8f9c',
              fontSize: 12,
            }}
          />
          <ZAxis type="number" dataKey="z" range={[36, 36]} />

          <ReferenceLine x={50} stroke="rgb(255 255 255 / 0.14)" strokeDasharray="4 4" />
          <ReferenceLine y={50} stroke="rgb(255 255 255 / 0.14)" strokeDasharray="4 4" />

          <Tooltip content={<CustomTooltip />} />

          <Scatter
            data={data}
            isAnimationActive
            animationDuration={800}
            onClick={(entry: unknown) => {
              const point = entry as MoodPoint | undefined;
              if (point && onSelect) onSelect(point);
            }}
            shape={(props: unknown) => {
              const { cx, cy, payload } = props as {
                cx?: number;
                cy?: number;
                payload?: MoodPoint;
              };
              const color = payload ? (MOOD_COLOR[payload.mood] ?? '#a78bfa') : '#a78bfa';

              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill={color}
                  fillOpacity={0.7}
                  stroke={color}
                  strokeWidth={1}
                  style={{ cursor: onSelect ? 'pointer' : 'default' }}
                />
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>

      {/* Rotulos dos quadrantes */}
      {QUADRANTS.map((quadrant) => (
        <span
          key={quadrant.label}
          className="pointer-events-none absolute font-mono text-[0.625rem] uppercase tracking-[0.16em] text-chalk-faint"
          style={{ left: quadrant.x, top: quadrant.y }}
          aria-hidden="true"
        >
          {quadrant.label}
        </span>
      ))}
    </div>
  );
}
