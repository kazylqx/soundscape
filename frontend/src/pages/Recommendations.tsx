import { useMemo, useState } from 'react';
import { ExternalLink, Filter, RefreshCw, Sparkles } from 'lucide-react';
import { useMusicData } from '@/hooks/useMusicData';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { usePlayerStore } from '@/stores/playerStore';
import { Card, SectionTitle } from '@/components/ui/Card';
import { Badge, GenreBadge } from '@/components/ui/Badge';
import { Button, ExternalButtonLink } from '@/components/ui/Button';
import { CoverImage } from '@/components/ui/CoverImage';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState, ErrorState, NotEnoughDataState } from '@/components/ui/States';
import { SkeletonCard, SkeletonWithMessage } from '@/components/ui/Skeleton';
import { Container } from '@/components/layout/Layout';
import { Reveal, Stagger, StaggerItem } from '@/components/animations/Reveal';
import { formatGenre } from '@/utils/formatters';
import type { AIRecommendation } from '@/types';

/**
 * Recomendacoes da IA, enriquecidas com dados reais do Spotify
 * (foto, link e preview de 30s da faixa mais popular do artista).
 */

type EnergyFilter = 'todas' | 'baixa' | 'media' | 'alta';

export function Recommendations(): JSX.Element {
  const { snapshot, isLoading, error, notEnoughData, refresh } = useMusicData();
  const {
    profile,
    isLoading: aiLoading,
    error: aiError,
    loadingMessage,
    regenerate,
  } = useAIAnalysis({ autoLoad: Boolean(snapshot?.meta.hasEnoughData) });

  const [genre, setGenre] = useState<string>('todos');
  const [mood, setMood] = useState<string>('todos');
  const [energy, setEnergy] = useState<EnergyFilter>('todas');

  const recommendations = profile?.recommendations ?? [];

  /* ---------- opcoes de filtro derivadas das recomendacoes ---------- */
  const genreOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of recommendations) {
      const value = item.genre ?? item.spotify?.genres[0];
      if (value) set.add(value.toLowerCase());
    }
    return ['todos', ...[...set].sort()];
  }, [recommendations]);

  const moodOptions = useMemo(() => {
    const set = new Set<string>();
    for (const item of recommendations) {
      if (item.mood) set.add(item.mood.toLowerCase());
    }
    return ['todos', ...[...set].sort()];
  }, [recommendations]);

  const filtered = useMemo(
    () =>
      recommendations.filter((item) => {
        const itemGenre = (item.genre ?? item.spotify?.genres[0] ?? '').toLowerCase();
        if (genre !== 'todos' && itemGenre !== genre) return false;
        if (mood !== 'todos' && (item.mood ?? '').toLowerCase() !== mood) return false;
        if (energy !== 'todas' && item.energy !== energy) return false;
        return true;
      }),
    [recommendations, genre, mood, energy],
  );

  /* ---------- estados ---------- */
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

  return (
    <Container className="py-10">
      <SectionTitle
        overline="Descobrir"
        title="Dez artistas que combinam com o seu gosto"
        description="Sugestoes escritas pela IA a partir do seu perfil, com o motivo de cada escolha e uma referencia que voce ja escuta."
        action={
          profile ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void regenerate()}
              loading={aiLoading}
              iconLeft={<RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />}
            >
              Novas sugestoes
            </Button>
          ) : null
        }
      />

      {aiError && !profile ? (
        <ErrorState
          title="Nao foi possivel gerar recomendacoes"
          message={aiError}
          onRetry={() => void regenerate()}
          retrying={aiLoading}
        />
      ) : null}

      {aiLoading && !profile ? (
        <div className="space-y-5">
          <SkeletonWithMessage message={loadingMessage} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        </div>
      ) : null}

      {profile && recommendations.length > 0 ? (
        <>
          {/* ---------- Filtros ---------- */}
          <Reveal className="mb-6">
            <Card padded={false} className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-chalk-muted" aria-hidden="true" />
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-muted">
                  filtros
                </span>
                <span className="ml-auto font-mono text-[0.625rem] tabular text-chalk-faint">
                  {filtered.length} de {recommendations.length}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {genreOptions.length > 1 ? (
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="w-14 shrink-0 text-xs text-chalk-faint">Genero</span>
                    <Tabs
                      items={genreOptions.map((value) => ({
                        value,
                        label: value === 'todos' ? 'Todos' : formatGenre(value),
                      }))}
                      value={genre}
                      onChange={setGenre}
                      layoutId="rec-genre"
                      size="sm"
                    />
                  </div>
                ) : null}

                {moodOptions.length > 1 ? (
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="w-14 shrink-0 text-xs text-chalk-faint">Mood</span>
                    <Tabs
                      items={moodOptions.map((value) => ({
                        value,
                        label: value === 'todos' ? 'Todos' : formatGenre(value),
                      }))}
                      value={mood}
                      onChange={setMood}
                      layoutId="rec-mood"
                      size="sm"
                    />
                  </div>
                ) : null}

                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="w-14 shrink-0 text-xs text-chalk-faint">Energia</span>
                  <Tabs
                    items={[
                      { value: 'todas' as EnergyFilter, label: 'Todas' },
                      { value: 'baixa' as EnergyFilter, label: 'Baixa' },
                      { value: 'media' as EnergyFilter, label: 'Media' },
                      { value: 'alta' as EnergyFilter, label: 'Alta' },
                    ]}
                    value={energy}
                    onChange={setEnergy}
                    layoutId="rec-energy"
                    size="sm"
                  />
                </div>
              </div>
            </Card>
          </Reveal>

          {/* ---------- Grid ---------- */}
          {filtered.length > 0 ? (
            <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((recommendation, index) => (
                <StaggerItem key={`${recommendation.name}-${index}`}>
                  <RecommendationCard recommendation={recommendation} rank={index + 1} />
                </StaggerItem>
              ))}
            </Stagger>
          ) : (
            <EmptyState
              title="Nenhuma recomendacao com esses filtros"
              description="Solte um dos filtros para ver mais sugestoes."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setGenre('todos');
                    setMood('todos');
                    setEnergy('todas');
                  }}
                >
                  Limpar filtros
                </Button>
              }
            />
          )}
        </>
      ) : null}

      {profile && recommendations.length === 0 && !aiLoading ? (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" aria-hidden="true" />}
          title="Sem recomendacoes no momento"
          description="A analise foi gerada, mas nao trouxe sugestoes. Tente gerar novamente."
          action={
            <Button variant="secondary" onClick={() => void regenerate()} loading={aiLoading}>
              Gerar de novo
            </Button>
          }
        />
      ) : null}
    </Container>
  );
}

/* ============================================================
 * Card de recomendacao
 * ============================================================ */

function RecommendationCard({
  recommendation,
  rank,
}: {
  recommendation: AIRecommendation;
  rank: number;
}): JSX.Element {
  const play = usePlayerStore((state) => state.play);
  const currentId = usePlayerStore((state) => state.track?.id);
  const isPlaying = usePlayerStore((state) => state.isPlaying);

  const spotify = recommendation.spotify;
  const previewId = spotify ? `rec-${spotify.id}` : null;
  const active = Boolean(previewId) && currentId === previewId && isPlaying;

  const handlePlay = () => {
    if (!spotify?.previewUrl || !previewId) return;
    play({
      id: previewId,
      name: spotify.topTrackName ?? recommendation.name,
      artist: recommendation.name,
      albumImage: spotify.imageUrl,
      previewUrl: spotify.previewUrl,
      spotifyUrl: spotify.spotifyUrl,
    });
  };

  return (
    <Card className="flex h-full flex-col">
      <div className="mb-4 flex items-start gap-3">
        <div className="relative shrink-0">
          <CoverImage
            src={spotify?.imageUrl ?? null}
            alt={recommendation.name}
            className="h-16 w-16"
            rounded="full"
          />
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-vibe-gradient font-mono text-[0.625rem] font-bold text-ink-950">
            {rank}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-bold leading-tight text-chalk">
            {recommendation.name}
          </h3>

          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {recommendation.genre ? <GenreBadge genre={recommendation.genre} /> : null}
            {recommendation.energy ? (
              <Badge variant="neutral">energia {recommendation.energy}</Badge>
            ) : null}
          </div>
        </div>
      </div>

      <p className="mb-4 flex-1 text-sm leading-relaxed text-chalk-soft">
        {recommendation.reason}
      </p>

      {recommendation.similarTo ? (
        <p className="mb-4 border-t border-white/[0.06] pt-3 text-xs text-chalk-muted">
          Parecido com{' '}
          <span className="font-medium text-chalk-soft">{recommendation.similarTo}</span>
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        {spotify?.previewUrl ? (
          <Button
            variant={active ? 'primary' : 'secondary'}
            size="sm"
            onClick={handlePlay}
            className="flex-1"
          >
            {active ? 'Tocando' : 'Ouvir 30s'}
          </Button>
        ) : null}

        {spotify?.spotifyUrl ? (
          <ExternalButtonLink
            href={spotify.spotifyUrl}
            variant={spotify.previewUrl ? 'ghost' : 'secondary'}
            size="sm"
            className={spotify.previewUrl ? undefined : 'flex-1'}
            iconLeft={<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Spotify
          </ExternalButtonLink>
        ) : (
          <ExternalButtonLink
            href={`https://open.spotify.com/search/${encodeURIComponent(recommendation.name)}`}
            variant="secondary"
            size="sm"
            className="flex-1"
            iconLeft={<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            Buscar no Spotify
          </ExternalButtonLink>
        )}
      </div>
    </Card>
  );
}
