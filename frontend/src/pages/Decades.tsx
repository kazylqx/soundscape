import { useMemo, useState } from 'react';
import { ArrowRight, History, TrendingDown, TrendingUp } from 'lucide-react';
import { useMusicData } from '@/hooks/useMusicData';
import { Card, CardHeader, SectionTitle } from '@/components/ui/Card';
import { Badge, DecadeBadge } from '@/components/ui/Badge';
import { ErrorState, NotEnoughDataState } from '@/components/ui/States';
import { SkeletonChart } from '@/components/ui/Skeleton';
import { DecadeTimeline } from '@/components/charts/DecadeTimeline';
import { Container } from '@/components/layout/Layout';
import { Reveal } from '@/components/animations/Reveal';
import { AnimatedCounter } from '@/components/animations/AnimatedCounter';
import { TrackRow } from '@/components/profile/TrackRow';
import { averageReleaseYear, buildDecadeGroups } from '@/utils/musicAnalyzer';
import { formatDecade, joinNames } from '@/utils/formatters';

/**
 * Decadas: linha do tempo interativa, representantes de cada era
 * e o comparativo entre o gosto recente e o de sempre.
 */

export function Decades(): JSX.Element {
  const { snapshot, metrics, tracks, isLoading, error, notEnoughData, refresh } = useMusicData();
  const [active, setActive] = useState<string | null>(null);

  const groups = useMemo(() => buildDecadeGroups(tracks), [tracks]);

  const shortTermYear = useMemo(
    () => (snapshot ? averageReleaseYear(snapshot.topTracks.short_term) : null),
    [snapshot],
  );
  const longTermYear = useMemo(
    () => (snapshot ? averageReleaseYear(snapshot.topTracks.long_term) : null),
    [snapshot],
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
      <Container className="py-10">
        <SkeletonChart className="h-80" />
      </Container>
    );
  }

  const selected = active ? groups.find((group) => group.decade === active) : null;
  const dominant = [...groups].sort((a, b) => b.percentage - a.percentage)[0];
  const yearDrift =
    shortTermYear !== null && longTermYear !== null ? shortTermYear - longTermYear : null;

  return (
    <Container className="py-10">
      <SectionTitle
        overline="Decadas"
        title="De que epoca e o seu ouvido"
        description="Distribuicao das suas faixas pelo ano de lancamento do album. Clique em uma decada para ver os representantes dela."
      />

      {/* ---------- Alma de ---------- */}
      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Reveal>
          <Card tone="vibe" className="h-full text-center">
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-chalk-muted">
              voce tem alma de
            </p>
            <p className="mt-3 font-display text-6xl font-extrabold leading-none text-vibe">
              {metrics.soulYear ? <AnimatedCounter value={metrics.soulYear} /> : '—'}
            </p>
            <p className="mx-auto mt-4 max-w-xs text-xs leading-relaxed text-chalk-muted">
              Media dos anos de lancamento de tudo que voce escuta. Nao e nostalgia: e onde o seu
              ouvido se sente em casa.
            </p>
          </Card>
        </Reveal>

        <Reveal delay={0.08} className="lg:col-span-2">
          <Card tone="raised" className="h-full">
            <CardHeader
              title="Sua linha do tempo"
              subtitle={
                dominant
                  ? `${formatDecade(dominant.decade)} lidera com ${dominant.percentage.toFixed(1)}%`
                  : 'Sem datas de lancamento suficientes'
              }
              icon={<History className="h-4 w-4" aria-hidden="true" />}
            />
            <DecadeTimeline
              decades={metrics.decades}
              activeDecade={active}
              onSelect={(decade) => setActive((current) => (current === decade ? null : decade))}
            />
          </Card>
        </Reveal>
      </div>

      {/* ---------- Detalhe da decada ---------- */}
      {selected ? (
        <Reveal className="mb-5">
          <Card tone="raised">
            <CardHeader
              title={
                <span className="flex items-center gap-3">
                  {formatDecade(selected.decade)}
                  <DecadeBadge decade={selected.decade} />
                </span>
              }
              subtitle={`${selected.count} faixas · ${selected.percentage.toFixed(1)}% do seu catalogo`}
              action={
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="text-xs text-chalk-muted underline-offset-4 hover:underline"
                >
                  limpar selecao
                </button>
              }
            />

            {selected.artists.length > 0 ? (
              <div className="mb-5">
                <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                  artistas representativos
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.artists.map((artist) => (
                    <Badge key={artist} variant="neutral" size="md">
                      {artist}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
              faixas dessa era no seu catalogo
            </p>
            <div className="-mx-2 divide-y divide-white/[0.04]">
              {selected.tracks.map((track, index) => (
                <TrackRow key={track.id} track={track} rank={index + 1} compact />
              ))}
            </div>
          </Card>
        </Reveal>
      ) : (
        <Reveal className="mb-5">
          <Card tone="flat" className="py-10 text-center">
            <p className="text-sm text-chalk-muted">
              Selecione uma decada na linha do tempo para ver artistas e faixas daquela era.
            </p>
          </Card>
        </Reveal>
      )}

      {/* ---------- Todas as decadas ---------- */}
      <Reveal className="mb-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card
              key={group.startYear}
              interactive
              onClick={() => setActive(group.decade)}
              className={
                active === group.decade ? 'border-vibe-primary/40 bg-vibe-primary/[0.06]' : undefined
              }
            >
              <div className="mb-3 flex items-baseline justify-between">
                <span className="font-display text-2xl font-extrabold text-chalk">
                  {group.decade}
                </span>
                <span className="font-mono text-sm tabular text-vibe-primary">
                  {group.percentage.toFixed(1)}%
                </span>
              </div>

              <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-chalk-faint">
                {group.count} faixas
              </p>

              <p className="line-clamp-2 text-xs leading-relaxed text-chalk-muted">
                {group.artists.length > 0
                  ? joinNames(group.artists, 3)
                  : 'Sem artistas destacados'}
              </p>
            </Card>
          ))}
        </div>
      </Reveal>

      {/* ---------- Evolucao ---------- */}
      <Reveal>
        <Card tone="raised">
          <CardHeader
            title="Como seu gosto se move no tempo"
            subtitle="Comparacao entre as ultimas 4 semanas e todos os tempos"
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                ultimas 4 semanas
              </p>
              <p className="mt-2 font-display text-3xl font-extrabold text-chalk">
                {shortTermYear ?? '—'}
              </p>
              <p className="mt-1 text-xs text-chalk-muted">ano medio das faixas do momento</p>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                todos os tempos
              </p>
              <p className="mt-2 font-display text-3xl font-extrabold text-chalk">
                {longTermYear ?? '—'}
              </p>
              <p className="mt-1 text-xs text-chalk-muted">ano medio do seu historico longo</p>
            </div>
          </div>

          {yearDrift !== null ? (
            <div className="mt-5 flex items-start gap-3 border-t border-white/[0.06] pt-5">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] ${
                  yearDrift >= 0 ? 'text-spotify-bright' : 'text-accent-orange'
                }`}
              >
                {yearDrift >= 0 ? (
                  <TrendingUp className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <TrendingDown className="h-4 w-4" aria-hidden="true" />
                )}
              </span>

              <p className="text-sm leading-relaxed text-chalk-soft">
                {Math.abs(yearDrift) < 2
                  ? 'Seu gosto esta ancorado: as musicas que voce ouve agora sao da mesma epoca das que sempre ouviu.'
                  : yearDrift > 0
                    ? `Nas ultimas semanas voce puxou ${Math.abs(yearDrift)} anos para frente — esta ouvindo coisas mais recentes que de costume.`
                    : `Nas ultimas semanas voce recuou ${Math.abs(yearDrift)} anos — seu ouvido foi cavar no catalogo antigo.`}
              </p>
            </div>
          ) : null}

          {metrics.evolution.newArtistsShortTerm.length > 0 ? (
            <div className="mt-5 border-t border-white/[0.06] pt-5">
              <p className="mb-2 flex items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                <ArrowRight className="h-3 w-3" aria-hidden="true" />
                entraram no seu radar recentemente
              </p>
              <div className="flex flex-wrap gap-1.5">
                {metrics.evolution.newArtistsShortTerm.map((artist) => (
                  <Badge key={artist} variant="vibe" size="md">
                    {artist}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      </Reveal>
    </Container>
  );
}
