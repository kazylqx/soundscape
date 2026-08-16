import { Clock, Repeat } from 'lucide-react';
import { Card, SectionTitle } from '@/components/ui/Card';
import { InfoHint } from '@/components/ui/Tooltip';
import { ListeningHeatmap } from '@/components/charts/ListeningHeatmap';
import { HourlyChart } from '@/components/charts/HourlyChart';
import { Container } from '@/components/layout/Layout';
import { Reveal } from '@/components/animations/Reveal';
import { formatHour, periodOfDay, weekdayLong } from '@/utils/formatters';
import type { MusicMetrics } from '@/types';

/**
 * Padrao de escuta: heatmap hora x dia e leitura criativa do horario de pico.
 */

export interface PatternSectionProps {
  metrics: MusicMetrics;
  /** Quantidade de itens no recently played (para explicar a amostra). */
  sampleSize: number;
}

/** Observacao com personalidade sobre o horario de pico. */
function readPeak(hour: number | null): string {
  if (hour === null) {
    return 'Ainda nao ha escutas recentes suficientes para desenhar o seu ritmo semanal.';
  }
  if (hour <= 4) {
    return 'Voce escuta quando o mundo dorme. Musica de madrugada nao e trilha, e companhia.';
  }
  if (hour <= 7) {
    return 'Comeco de dia com fone no ouvido: voce prepara o humor antes de encarar o resto.';
  }
  if (hour <= 11) {
    return 'Manha e seu horario nobre. Musica como combustivel para o que vem depois.';
  }
  if (hour <= 14) {
    return 'Meio do dia. Voce usa musica para atravessar o cansaco do intervalo.';
  }
  if (hour <= 18) {
    return 'Fim de tarde e o seu pico. A hora em que a rotina afrouxa e o som ganha espaco.';
  }
  if (hour <= 21) {
    return 'Comeco de noite: voce escuta para decantar o dia, nao para acelerar.';
  }
  return 'Noite adentro. Suas melhores escutas acontecem depois que o silencio se instala.';
}

export function PatternSection({ metrics, sampleSize }: PatternSectionProps): JSX.Element {
  const { peakHour } = metrics;

  return (
    <Container className="py-16 sm:py-24">
      <SectionTitle
        overline="Padrao de escuta"
        title="Quando a musica te encontra"
        description={`Baseado nas ultimas ${sampleSize} faixas que o Spotify registrou — uma amostra recente, nao o historico completo.`}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Card tone="raised" className="h-full">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-base font-semibold text-chalk">Hora x dia da semana</h3>
              <InfoHint
                content="Cada quadrado e uma combinacao de dia e hora. Quanto mais forte a cor, mais faixas voce ouviu naquele momento."
                side="left"
              />
            </div>

            <ListeningHeatmap cells={metrics.heatmap} />
          </Card>
        </Reveal>

        <div className="flex flex-col gap-5">
          <Reveal delay={0.1}>
            <Card tone="vibe">
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-vibe-primary" aria-hidden="true" />
                <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-muted">
                  horario de pico
                </p>
              </div>

              <p className="font-display text-4xl font-extrabold text-chalk">
                {formatHour(peakHour)}
              </p>
              <p className="mt-1 text-sm capitalize text-vibe-primary">{periodOfDay(peakHour)}</p>

              <p className="mt-4 text-xs leading-relaxed text-chalk-muted">{readPeak(peakHour)}</p>
            </Card>
          </Reveal>

          <Reveal delay={0.16}>
            <Card>
              <p className="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                curva do dia
              </p>
              <HourlyChart hours={metrics.listeningByHour} peakHour={peakHour} height={140} />
            </Card>
          </Reveal>

          <Reveal delay={0.22}>
            <Card className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-accent-orange">
                <Repeat className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                  taxa de repeticao
                </p>
                <p className="font-display text-2xl font-extrabold text-chalk">
                  {Math.round(metrics.repeatRate * 100)}%
                </p>
                <p className="mt-1 text-xs leading-relaxed text-chalk-muted">
                  {metrics.repeatRate >= 0.3
                    ? 'Voce repete muito. Musica, para voce, e ritual antes de ser novidade.'
                    : metrics.repeatRate >= 0.12
                      ? 'Repete o que gosta, mas mantem espaco para o novo.'
                      : 'Quase nada repetido: cada sessao e uma busca por algo inedito.'}
                </p>
                <p className="mt-2 font-mono text-[0.625rem] uppercase tracking-wider text-chalk-faint">
                  dia mais ativo:{' '}
                  {metrics.heatmap.length > 0
                    ? weekdayLong(
                        metrics.heatmap.reduce((best, cell) =>
                          cell.count > best.count ? cell : best,
                        ).weekday,
                      )
                    : '—'}
                </p>
              </div>
            </Card>
          </Reveal>
        </div>
      </div>
    </Container>
  );
}
