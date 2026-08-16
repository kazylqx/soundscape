import { useMemo } from 'react';
import { CloudRain, Sun, Sunrise } from 'lucide-react';
import { useMusicData } from '@/hooks/useMusicData';
import { usePlayerStore } from '@/stores/playerStore';
import { Card, CardHeader, SectionTitle } from '@/components/ui/Card';
import { MoodBadge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { InfoHint } from '@/components/ui/Tooltip';
import {
  ErrorState,
  EstimatedFeaturesNotice,
  NotEnoughDataState,
} from '@/components/ui/States';
import { SkeletonChart, SkeletonList } from '@/components/ui/Skeleton';
import { MoodCalendar } from '@/components/charts/MoodCalendar';
import { MoodScatter } from '@/components/charts/MoodScatter';
import { Container } from '@/components/layout/Layout';
import { Reveal } from '@/components/animations/Reveal';
import { TrackRow } from '@/components/profile/TrackRow';
import {
  buildMoodCalendar,
  buildMoodScatter,
  buildPeriodMood,
  topMelancholic,
  topUplifting,
} from '@/utils/musicAnalyzer';
import { MOOD_LABEL } from '@/utils/formatters';
import type { MoodName } from '@/types';

/**
 * Moods: calendario de humor, mapa energia x positividade,
 * extremos do catalogo e humor por periodo do dia.
 */

export function Moods(): JSX.Element {
  const { snapshot, metrics, tracks, isLoading, error, notEnoughData, featuresAreEstimated, refresh } =
    useMusicData();

  const play = usePlayerStore((state) => state.play);

  const calendar = useMemo(
    () => (snapshot ? buildMoodCalendar(snapshot.recentlyPlayed, snapshot.audioFeatures, 30) : []),
    [snapshot],
  );

  const scatter = useMemo(
    () => (snapshot ? buildMoodScatter(tracks, snapshot.audioFeatures, 240) : []),
    [snapshot, tracks],
  );

  const periods = useMemo(
    () => (snapshot ? buildPeriodMood(snapshot.recentlyPlayed, snapshot.audioFeatures) : []),
    [snapshot],
  );

  const uplifting = useMemo(
    () => (snapshot ? topUplifting(tracks, snapshot.audioFeatures, 5) : []),
    [snapshot, tracks],
  );

  const melancholic = useMemo(
    () => (snapshot ? topMelancholic(tracks, snapshot.audioFeatures, 5) : []),
    [snapshot, tracks],
  );

  if (error && !snapshot) {
    return (
      <Container className="py-10">
        <ErrorState message={error} onRetry={() => void refresh()} retrying={isLoading} />
      </Container>
    );
  }

  if (notEnoughData) {
    return (
      <Container className="py-10">
        <NotEnoughDataState />
      </Container>
    );
  }

  if (isLoading || !snapshot || !metrics) {
    return (
      <Container className="py-10 space-y-5">
        <SkeletonChart className="h-72" />
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <SkeletonList rows={5} />
          </Card>
          <Card>
            <SkeletonList rows={5} />
          </Card>
        </div>
      </Container>
    );
  }

  const breakdown = (Object.entries(metrics.moodBreakdown) as Array<[MoodName, number]>)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <Container className="py-10">
      <SectionTitle
        overline="Moods"
        title="O humor do que voce escuta"
        description="Cada faixa carrega energia e positividade. Juntas, elas desenham o clima da sua escuta."
        action={<MoodBadge mood={metrics.dominantMood} size="md" />}
      />

      {featuresAreEstimated ? <EstimatedFeaturesNotice className="mb-6" /> : null}

      {/* ---------- Calendario + distribuicao ---------- */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Card tone="raised" className="h-full">
            <CardHeader
              title="Ultimos 30 dias"
              subtitle="Cor por positividade media do dia"
              icon={<Sunrise className="h-4 w-4" aria-hidden="true" />}
              action={
                <InfoHint
                  content="O Spotify entrega no maximo as 50 escutas mais recentes. Dias sem registro aparecem apagados."
                  side="left"
                />
              }
            />
            <MoodCalendar days={calendar} />
          </Card>
        </Reveal>

        <Reveal delay={0.1}>
          <Card tone="raised" className="h-full">
            <CardHeader title="Distribuicao de humor" subtitle="Todas as faixas mapeadas" />

            <ul className="space-y-3.5">
              {breakdown.map(([mood, percentage], index) => (
                <li key={mood}>
                  <ProgressBar
                    value={percentage / 100}
                    label={MOOD_LABEL[mood] ?? mood}
                    valueLabel={`${percentage.toFixed(1)}%`}
                    delay={index * 0.06}
                  />
                </li>
              ))}
            </ul>

            {breakdown.length === 0 ? (
              <p className="py-6 text-center text-sm text-chalk-muted">
                Sem metricas de audio suficientes.
              </p>
            ) : null}
          </Card>
        </Reveal>
      </div>

      {/* ---------- Scatter ---------- */}
      <Reveal className="mt-5">
        <Card tone="raised">
          <CardHeader
            title="Mapa de humor"
            subtitle="Cada ponto e uma musica sua — clique para ouvir o preview"
            action={
              <InfoHint
                content="Eixo X: energia. Eixo Y: positividade. O quadrante em que a faixa cai define o humor dela."
                side="left"
              />
            }
          />

          <MoodScatter
            points={scatter}
            height={440}
            onSelect={(point) => {
              if (!point.previewUrl) return;
              play({
                id: point.id,
                name: point.name,
                artist: point.artist,
                albumImage: point.albumImage,
                previewUrl: point.previewUrl,
                spotifyUrl: point.spotifyUrl,
              });
            }}
          />
        </Card>
      </Reveal>

      {/* ---------- Extremos ---------- */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Reveal>
          <Card tone="raised" className="h-full">
            <CardHeader
              title="Levanta o astral"
              subtitle="Maior positividade do seu catalogo"
              icon={<Sun className="h-4 w-4" aria-hidden="true" />}
            />

            {uplifting.length > 0 ? (
              <div className="-mx-2 divide-y divide-white/[0.04]">
                {uplifting.map((entry, index) => (
                  <TrackRow
                    key={entry.track.id}
                    track={entry.track}
                    rank={index + 1}
                    meta={`${Math.round(entry.score * 100)}%`}
                    compact
                  />
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-chalk-muted">
                Sem metricas suficientes para ranquear.
              </p>
            )}
          </Card>
        </Reveal>

        <Reveal delay={0.1}>
          <Card tone="raised" className="h-full">
            <CardHeader
              title="Para chorar"
              subtitle="Baixa positividade com peso acustico"
              icon={<CloudRain className="h-4 w-4" aria-hidden="true" />}
            />

            {melancholic.length > 0 ? (
              <div className="-mx-2 divide-y divide-white/[0.04]">
                {melancholic.map((entry, index) => (
                  <TrackRow
                    key={entry.track.id}
                    track={entry.track}
                    rank={index + 1}
                    meta={`${Math.round(entry.score * 100)}%`}
                    compact
                  />
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-chalk-muted">
                Sem metricas suficientes para ranquear.
              </p>
            )}
          </Card>
        </Reveal>
      </div>

      {/* ---------- Periodos do dia ---------- */}
      <Reveal className="mt-5">
        <Card tone="raised">
          <CardHeader
            title="Humor por periodo do dia"
            subtitle="Como o seu clima muda entre madrugada, manha, tarde e noite"
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {periods.map((period) => (
              <div
                key={period.period}
                className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4"
              >
                <div className="mb-3 flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-chalk">{period.label}</span>
                  <span className="font-mono text-[0.625rem] tabular text-chalk-faint">
                    {period.count} faixas
                  </span>
                </div>

                {period.valence !== null && period.energy !== null ? (
                  <div className="space-y-2">
                    <ProgressBar
                      value={period.valence}
                      label="Positividade"
                      valueLabel={`${Math.round(period.valence * 100)}%`}
                      height="xs"
                    />
                    <ProgressBar
                      value={period.energy}
                      label="Energia"
                      valueLabel={`${Math.round(period.energy * 100)}%`}
                      height="xs"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-chalk-faint">Sem escutas registradas.</p>
                )}
              </div>
            ))}
          </div>

          {/* Leitura do periodo mais luminoso */}
          {(() => {
            const withData = periods.filter((period) => period.valence !== null);
            if (withData.length < 2) return null;

            const brightest = withData.reduce((best, current) =>
              (current.valence ?? 0) > (best.valence ?? 0) ? current : best,
            );
            const darkest = withData.reduce((worst, current) =>
              (current.valence ?? 1) < (worst.valence ?? 1) ? current : worst,
            );

            return (
              <p className="mt-5 border-t border-white/[0.06] pt-4 text-sm leading-relaxed text-chalk-muted">
                Sua escuta mais luminosa acontece de{' '}
                <span className="font-medium text-chalk">{brightest.label.toLowerCase()}</span>; a
                mais introspectiva, de{' '}
                <span className="font-medium text-chalk">{darkest.label.toLowerCase()}</span>.{' '}
                {brightest.period === darkest.period
                  ? ''
                  : 'A diferenca entre os dois momentos e o que faz o seu dia ter trilha propria.'}
              </p>
            );
          })()}
        </Card>
      </Reveal>

      {/* Faixas sem preview ainda podem ser abertas no Spotify */}
      <p className="mt-8 text-center text-xs text-chalk-faint">
        Faixas sem preview de 30s aparecem com o botao de abrir no Spotify — a disponibilidade do
        preview varia por regiao e por faixa.
      </p>
    </Container>
  );
}
