import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';
import { formatGenre } from '@/utils/formatters';
import { buildGenreBubbles } from '@/utils/musicAnalyzer';
import { chartColor, TooltipBox } from './ChartTooltip';
import type { GenreCount } from '@/types';

/**
 * Mapa de generos em treemap: a area de cada bloco e proporcional
 * a frequencia do genero no gosto do usuario.
 */

export interface GenreBubblesProps {
  genres: GenreCount[];
  limit?: number;
  height?: number;
}

interface TreemapNodeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  name?: string;
  percentage?: number;
}

/** Celula do treemap: cor por indice e rotulo apenas quando ha espaco. */
function TreemapCell(props: TreemapNodeProps): JSX.Element {
  const { x = 0, y = 0, width = 0, height = 0, index = 0, name = '', percentage = 0 } = props;

  const color = chartColor(index);
  const showLabel = width > 74 && height > 38;
  const showPercentage = width > 74 && height > 58;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={12}
        fill={color}
        fillOpacity={0.16}
        stroke={color}
        strokeOpacity={0.45}
        strokeWidth={1}
      />
      {showLabel ? (
        <text
          x={x + 12}
          y={y + 24}
          fill="#f4f4f5"
          fontSize={13}
          fontWeight={600}
          fontFamily="Inter, sans-serif"
        >
          {formatGenre(name).length > 18 ? `${formatGenre(name).slice(0, 17)}…` : formatGenre(name)}
        </text>
      ) : null}
      {showPercentage ? (
        <text
          x={x + 12}
          y={y + 44}
          fill={color}
          fontSize={12}
          fontFamily="JetBrains Mono, monospace"
        >
          {percentage.toFixed(1)}%
        </text>
      ) : null}
    </g>
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { name?: string; percentage?: number; value?: number } }>;
}): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;

  const node = payload[0]?.payload;
  if (!node?.name) return null;

  return (
    <TooltipBox
      title={formatGenre(node.name)}
      rows={[{ label: 'Presenca no seu gosto', value: `${(node.percentage ?? 0).toFixed(1)}%` }]}
    />
  );
}

export function GenreBubbles({ genres, limit = 14, height = 380 }: GenreBubblesProps): JSX.Element {
  const data = buildGenreBubbles(genres, limit).map((bubble) => ({
    name: bubble.genre,
    size: Math.max(1, bubble.value),
    percentage: bubble.percentage,
  }));

  if (data.length === 0) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-2xl border border-white/[0.06] text-sm text-chalk-muted"
        style={{ height }}
      >
        Sem generos suficientes para desenhar o mapa.
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={data}
          dataKey="size"
          aspectRatio={4 / 3}
          stroke="none"
          isAnimationActive
          animationDuration={900}
          content={<TreemapCell />}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Alternativa em barras — usada quando o espaco e estreito
 * (dashboard e cards de compartilhamento).
 */
export function GenreBars({
  genres,
  limit = 6,
  className,
}: {
  genres: GenreCount[];
  limit?: number;
  className?: string;
}): JSX.Element {
  const top = genres.slice(0, limit);
  const max = top[0]?.percentage ?? 1;

  return (
    <ul className={className}>
      {top.map((entry, index) => (
        <li key={entry.genre} className="mb-3 last:mb-0">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm text-chalk-soft">{formatGenre(entry.genre)}</span>
            <span className="shrink-0 font-mono text-xs tabular text-chalk-muted">
              {entry.percentage.toFixed(1)}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${max > 0 ? (entry.percentage / max) * 100 : 0}%`,
                backgroundColor: chartColor(index),
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
