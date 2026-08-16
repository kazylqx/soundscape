import { Activity, Gauge } from 'lucide-react';
import { Card, SectionTitle } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { InfoHint } from '@/components/ui/Tooltip';
import { EstimatedFeaturesNotice } from '@/components/ui/States';
import { MoodBadge } from '@/components/ui/Badge';
import { RadarFeatures } from '@/components/charts/RadarFeatures';
import { Container } from '@/components/layout/Layout';
import { Reveal } from '@/components/animations/Reveal';
import { AnimatedCounter } from '@/components/animations/AnimatedCounter';
import { FEATURE_LABEL, formatTempo } from '@/utils/formatters';
import type { AverageFeatures, MusicMetrics } from '@/types';

/**
 * Analise sonora: radar comparativo + leitura de cada metrica.
 */

export interface SonicAnalysisProps {
  metrics: MusicMetrics;
  estimated: boolean;
}

/** Interpretacao curta de cada feature, para o valor nao ficar sozinho. */
function readFeature(key: keyof AverageFeatures, value: number): string {
  const percentage = Math.round(value * 100);

  switch (key) {
    case 'danceability':
      if (percentage >= 70) return 'Seu corpo entende antes da sua cabeca.';
      if (percentage >= 45) return 'Ritmo presente, sem obrigacao de dancar.';
      return 'Voce escuta parado, e isso e uma escolha.';
    case 'energy':
      if (percentage >= 75) return 'Alta tensao: musica como combustivel.';
      if (percentage >= 50) return 'Energia media, com picos quando precisa.';
      return 'Volume baixo, atencao alta.';
    case 'valence':
      if (percentage >= 65) return 'Predominancia luminosa no que voce escolhe.';
      if (percentage >= 40) return 'Equilibrio entre celebrar e processar.';
      return 'Voce prefere musica que admite que doi.';
    case 'acousticness':
      if (percentage >= 55) return 'Madeira, corda e ar em vez de sintetizador.';
      if (percentage >= 25) return 'Mistura de organico e produzido.';
      return 'Producao e estudio acima de captacao crua.';
    case 'instrumentalness':
      if (percentage >= 45) return 'Voce dispensa letra para se conectar.';
      if (percentage >= 15) return 'Espaco para faixas sem voz de vez em quando.';
      return 'Letra importa: voce escuta o que esta sendo dito.';
    default:
      return '';
  }
}

const FEATURE_KEYS: Array<keyof AverageFeatures> = [
  'danceability',
  'energy',
  'valence',
  'acousticness',
  'instrumentalness',
];

export function SonicAnalysis({ metrics, estimated }: SonicAnalysisProps): JSX.Element {
  const { averageFeatures } = metrics;

  return (
    <Container className="py-16 sm:py-24">
      <SectionTitle
        overline="Analise sonora"
        title="A assinatura acustica do seu gosto"
        description="Cada eixo compara a media das suas faixas com a media do catalogo — onde voce se afasta do centro, esta sua personalidade."
      />

      {estimated ? <EstimatedFeaturesNotice className="mb-5" /> : null}

      <div className="grid gap-5 lg:grid-cols-5">
        <Reveal className="lg:col-span-3">
          <Card tone="raised" className="h-full">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold text-chalk">
                <Activity className="h-4 w-4 text-vibe-primary" aria-hidden="true" />
                Radar de features
              </h3>
              <InfoHint
                content="A linha tracejada e a referencia aproximada de um ouvinte medio do Spotify. A area colorida e voce."
                side="left"
              />
            </div>

            <RadarFeatures features={averageFeatures} height={360} />

            <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-chalk-muted">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-6 rounded-full bg-vibe-primary" aria-hidden="true" />
                Voce
              </span>
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-2 w-6 rounded-full border border-dashed border-chalk-faint"
                  aria-hidden="true"
                />
                Ouvinte medio
              </span>
            </div>
          </Card>
        </Reveal>

        <div className="flex flex-col gap-5 lg:col-span-2">
          <Reveal delay={0.1}>
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-chalk">Leitura por metrica</h3>
                <MoodBadge mood={metrics.dominantMood} />
              </div>

              <ul className="space-y-4">
                {FEATURE_KEYS.map((key, index) => (
                  <li key={key}>
                    <ProgressBar
                      value={averageFeatures[key]}
                      label={FEATURE_LABEL[key]}
                      valueLabel={`${Math.round(averageFeatures[key] * 100)}%`}
                      delay={index * 0.08}
                    />
                    <p className="mt-1.5 text-xs leading-relaxed text-chalk-faint">
                      {readFeature(key, averageFeatures[key])}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          </Reveal>

          <Reveal delay={0.16}>
            <Card className="flex items-center gap-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-vibe-secondary">
                <Gauge className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                  andamento medio
                </p>
                <p className="font-display text-2xl font-extrabold text-chalk">
                  <AnimatedCounter value={averageFeatures.tempo} decimals={0} /> BPM
                </p>
                <p className="mt-1 text-xs text-chalk-muted">
                  {averageFeatures.tempo >= 130
                    ? 'Ritmo de corrida — seu gosto tem pressa.'
                    : averageFeatures.tempo >= 110
                      ? 'Cadencia de caminhada rapida.'
                      : 'Andamento contemplativo, sem correria.'}
                  {' '}
                  <span className="text-chalk-faint">({formatTempo(averageFeatures.tempo)})</span>
                </p>
              </div>
            </Card>
          </Reveal>
        </div>
      </div>
    </Container>
  );
}
