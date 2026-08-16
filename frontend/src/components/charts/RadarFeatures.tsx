import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { FEATURE_LABEL } from '@/utils/formatters';
import { buildRadarData } from '@/utils/musicAnalyzer';
import { TooltipBox } from './ChartTooltip';
import type { AverageFeatures } from '@/types';

/**
 * Radar das audio features com comparacao ao "ouvinte medio".
 * O desenho anima na entrada (isAnimationActive do Recharts).
 */

export interface RadarFeaturesProps {
  features: AverageFeatures;
  /** Mostra a serie de referencia do ouvinte medio. */
  showAverage?: boolean;
  height?: number;
  /** Versao compacta usada no dashboard. */
  compact?: boolean;
}

interface RadarTooltipPayload {
  payload?: { label: string; value: number; average: number };
}

function CustomTooltip({
  active,
  payload,
  showAverage,
}: {
  active?: boolean;
  payload?: RadarTooltipPayload[];
  showAverage: boolean;
}): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const rows = [{ label: 'Voce', value: `${data.value}%`, color: 'var(--vibe-primary)' }];
  if (showAverage) {
    rows.push({ label: 'Ouvinte medio', value: `${data.average}%`, color: '#5f5f6b' });
  }

  return <TooltipBox title={data.label} rows={rows} />;
}

export function RadarFeatures({
  features,
  showAverage = true,
  height = 320,
  compact = false,
}: RadarFeaturesProps): JSX.Element {
  const data = buildRadarData(features, FEATURE_LABEL);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius={compact ? '72%' : '78%'}>
          <PolarGrid stroke="rgb(255 255 255 / 0.09)" />
          <PolarAngleAxis
            dataKey="label"
            tick={{
              fill: '#8f8f9c',
              fontSize: compact ? 10 : 12,
              fontFamily: 'Inter, sans-serif',
            }}
          />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />

          {showAverage ? (
            <Radar
              name="Ouvinte medio"
              dataKey="average"
              stroke="#5f5f6b"
              strokeDasharray="4 4"
              fill="#5f5f6b"
              fillOpacity={0.08}
              isAnimationActive
              animationDuration={900}
            />
          ) : null}

          <Radar
            name="Voce"
            dataKey="value"
            stroke="var(--vibe-primary)"
            strokeWidth={2}
            fill="var(--vibe-primary)"
            fillOpacity={0.22}
            isAnimationActive
            animationDuration={1100}
            animationBegin={showAverage ? 200 : 0}
          />

          <Tooltip
            content={<CustomTooltip showAverage={showAverage} />}
            cursor={{ stroke: 'rgb(255 255 255 / 0.12)' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
