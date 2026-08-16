import { useEffect } from 'react';
import {
  ArrowRight,
  Clock3,
  Disc3,
  Flame,
  Headphones,
  Mic2,
  Music4,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useMusicData } from '@/hooks/useMusicData';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { useMusicStore } from '@/stores/musicStore';
import { Card, CardHeader, SectionTitle, StatCard } from '@/components/ui/Card';
import { Badge, MoodBadge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CoverImage } from '@/components/ui/CoverImage';
import {
  ErrorState,
  EstimatedFeaturesNotice,
  NotEnoughDataState,
} from '@/components/ui/States';
import {
  Skeleton,
  SkeletonCard,
  SkeletonList,
  SkeletonText,
} from '@/components/ui/Skeleton';
import { RadarFeatures } from '@/components/charts/RadarFeatures';
import { Container } from '@/components/layout/Layout';
import { Reveal, Stagger, StaggerItem } from '@/components/animations/Reveal';
import { AnimatedCounter } from '@/components/animations/AnimatedCounter';
import { TrackRow } from '@/components/profile/TrackRow';
import { PlayButton } from '@/components/player/PlayButton';
import {
  formatCompact,
  formatGenre,
  formatHour,
  formatHours,
  periodOfDay,
} from '@/utils/formatters';

/**
 * Dashboard: leitura rapida do perfil, com atalho para a analise completa.
 */

export function Dashboard(): JSX.Element {
  const { user } = useAuth();
  const { snapshot, metrics, isLoading, error, notEnoughData, featuresAreEstimated, refresh } =
    useMusicData();

  const { profile, isLoading: aiLoading } = useAIAnalysis({ autoLoad: false });
  const loadAIProfile = useMusicStore((state) => state.loadAIProfile);
  const refreshNowPlaying = useMusicStore((state) => state.refreshNowPlaying);

  /* A IA so e disparada quando ja existe snapshot — evita gastar chamada em vao. */
  useEffect(() => {
    if (snapshot?.meta.hasEnoughData) void loadAIProfile();
  }, [snapshot?.meta.hasEnoughData, loadAIProfile]);

  /* "Tocando agora" atualiza a cada 30s enquanto a aba esta visivel. */
  useEffect(() => {
    if (!snapshot) return;

    const timer = window.setInterval(() => {
      if (!document.hidden) void refreshNowPlaying();
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [snapshot, refreshNowPlaying]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour <= 5) return 'Ainda acordado';
    if (hour <= 11) return 'Bom dia';
    if (hour <= 17) return 'Boa tarde';
    return 'Boa noite';
  })();

  /* ---------- erro ---------- */
  if (error && !snapshot) {
    return (
      <Container className="py-10">
        <ErrorState
          title="Nao conseguimos carregar seus dados"
          message={error}
          onRetry={() => void refresh()}
          retrying={isLoading}
        />
      </Container>
    );
  }

  /* ---------- sem historico ---------- */
  if (notEnoughData && snapshot) {
    return (
      <Container className="py-10">
        <NotEnoughDataState />
      </Container>
    );
  }

  /* ---------- loading inicial ---------- */
  if (isLoading || !snapshot || !metrics) {
    return (
      <Container className="py-10">
        <div className="mb-10 flex items-center gap-4">
          <Skeleton className="h-16 w-16" rounded="full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" rounded="sm" />
            <Skeleton className="h-7 w-56" rounded="sm" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <Skeleton className="mb-6 h-3 w-32" rounded="sm" />
              <SkeletonList rows={6} />
            </Card>
          </div>
          <Card>
            <Skeleton className="mb-6 h-3 w-28" rounded="sm" />
            <Skeleton className="h-56 w-full" rounded="lg" />
          </Card>
        </div>
      </Container>
    );
  }

  const topArtist = snapshot.topArtists.medium_term[0] ?? snapshot.topArtists.long_term[0];
  const topTrack = snapshot.topTracks.medium_term[0] ?? snapshot.topTracks.long_term[0];
  const topGenre = metrics.genres[0];
  const recent = snapshot.recentlyPlayed.slice(0, 20);
  const nowPlaying = snapshot.currentlyPlaying;

  return (
    <Container className="py-10">
      {/* ---------- Saudacao ---------- */}
      <Reveal>
        <div className="mb-10 flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <CoverImage
              src={user?.imageUrl ?? snapshot.user.imageUrl}
              alt={snapshot.user.displayName}
              className="h-16 w-16 border-2 border-white/10"
              rounded="full"
              priority
            />
            <div>
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-chalk-muted">
                {greeting}
              </p>
              <h1 className="font-display text-2xl font-extrabold text-chalk sm:text-3xl">
                {snapshot.user.displayName}
              </h1>
              <p className="mt-0.5 text-xs text-chalk-faint">
                {snapshot.playlists.length} playlists ·{' '}
                {formatCompact(snapshot.followedArtists.length)} artistas seguidos
                {snapshot.user.product === 'premium' ? ' · Premium' : ''}
              </p>
            </div>
          </div>

          <ButtonLink
            to="/profile"
            iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
          >
            Ver perfil completo
          </ButtonLink>
        </div>
      </Reveal>

      {featuresAreEstimated ? <EstimatedFeaturesNotice className="mb-6" /> : null}

      {/* ---------- Tocando agora ---------- */}
      {nowPlaying ? (
        <Reveal className="mb-6">
          <Card tone="vibe" className="flex items-center gap-4">
            <CoverImage
              src={nowPlaying.track.albumImage}
              alt={nowPlaying.track.albumName}
              className="h-14 w-14 shrink-0"
              rounded="md"
            />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-vibe-primary">
                {nowPlaying.isPlaying ? 'tocando agora' : 'pausado agora'}
              </p>
              <p className="truncate text-sm font-semibold text-chalk">{nowPlaying.track.name}</p>
              <p className="truncate text-xs text-chalk-muted">
                {nowPlaying.track.artistNames.join(', ')}
              </p>
            </div>
            <PlayButton track={nowPlaying.track} />
          </Card>
        </Reveal>
      ) : null}

      {/* ---------- Destaques ---------- */}
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StaggerItem>
          <Card interactive className="h-full">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-chalk-muted">
                artista #1
              </span>
              <Mic2 className="h-4 w-4 text-vibe-primary" aria-hidden="true" />
            </div>

            {topArtist ? (
              <a
                href={topArtist.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3"
              >
                <CoverImage
                  src={topArtist.imageUrl}
                  alt={topArtist.name}
                  className="h-14 w-14 shrink-0"
                  rounded="full"
                />
                <div className="min-w-0">
                  <p className="truncate font-display text-lg font-bold leading-tight text-chalk">
                    {topArtist.name}
                  </p>
                  {topArtist.genres[0] ? (
                    <p className="truncate text-xs text-chalk-muted">
                      {formatGenre(topArtist.genres[0])}
                    </p>
                  ) : null}
                </div>
              </a>
            ) : (
              <p className="text-sm text-chalk-muted">Sem dados ainda.</p>
            )}
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card interactive className="h-full">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-chalk-muted">
                mais ouvida
              </span>
              <Disc3 className="h-4 w-4 text-accent-pink" aria-hidden="true" />
            </div>

            {topTrack ? (
              <div className="flex items-center gap-3">
                <CoverImage
                  src={topTrack.albumImage}
                  alt={topTrack.albumName}
                  className="h-14 w-14 shrink-0"
                  rounded="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold leading-tight text-chalk">
                    {topTrack.name}
                  </p>
                  <p className="truncate text-xs text-chalk-muted">
                    {topTrack.artistNames.join(', ')}
                  </p>
                </div>
                <PlayButton track={topTrack} size="sm" />
              </div>
            ) : (
              <p className="text-sm text-chalk-muted">Sem dados ainda.</p>
            )}
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card interactive className="h-full">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-chalk-muted">
                genero dominante
              </span>
              <Music4 className="h-4 w-4 text-accent-violet" aria-hidden="true" />
            </div>

            {topGenre ? (
              <>
                <p className="font-display text-xl font-extrabold leading-tight text-chalk">
                  {formatGenre(topGenre.genre)}
                </p>
                <p className="mt-1 font-mono text-xs tabular text-chalk-muted">
                  {topGenre.percentage.toFixed(1)}% do seu gosto
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {metrics.genres.slice(1, 3).map((genre) => (
                    <Badge key={genre.genre} variant="genre">
                      {formatGenre(genre.genre)}
                    </Badge>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-chalk-muted">Sem generos classificados.</p>
            )}
          </Card>
        </StaggerItem>

        <StaggerItem>
          <Card interactive className="h-full">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-chalk-muted">
                mood atual
              </span>
              <Flame className="h-4 w-4 text-accent-orange" aria-hidden="true" />
            </div>

            <MoodBadge mood={metrics.dominantMood} size="md" />

            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-chalk-muted">Energia</span>
                <span className="font-mono tabular text-chalk-soft">
                  {Math.round(metrics.averageFeatures.energy * 100)}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-chalk-muted">Positividade</span>
                <span className="font-mono tabular text-chalk-soft">
                  {Math.round(metrics.averageFeatures.valence * 100)}%
                </span>
              </div>
            </div>
          </Card>
        </StaggerItem>
      </Stagger>

      {/* ---------- Teaser da IA ---------- */}
      <Reveal className="mt-10">
        <Card tone="raised" className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            aria-hidden="true"
            style={{
              background:
                'radial-gradient(ellipse 60% 80% at 90% 20%, color-mix(in srgb, var(--vibe-secondary) 18%, transparent), transparent 60%)',
            }}
          />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
            <div className="min-w-0 flex-1">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1">
                <Sparkles className="h-3.5 w-3.5 text-vibe-primary" aria-hidden="true" />
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-muted">
                  analise por ia
                </span>
              </div>

              {aiLoading && !profile ? (
                <div className="max-w-2xl space-y-3">
                  <Skeleton className="h-8 w-3/4" rounded="sm" />
                  <SkeletonText lines={2} />
                </div>
              ) : (
                <>
                  <h2 className="max-w-2xl font-display text-xl font-extrabold leading-tight text-chalk sm:text-2xl">
                    {profile?.headline ?? metrics.persona.name}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-chalk-muted">
                    {profile?.personaDescription ?? metrics.persona.description}
                  </p>
                </>
              )}
            </div>

            <ButtonLink
              to="/profile"
              variant="vibe"
              size="lg"
              className="shrink-0"
              iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
            >
              Ler o perfil inteiro
            </ButtonLink>
          </div>
        </Card>
      </Reveal>

      {/* ---------- Timeline + radar ---------- */}
      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Card tone="raised" className="h-full">
            <CardHeader
              title="Ultimas 20 musicas"
              subtitle="O que o Spotify registrou mais recentemente"
              icon={<Clock3 className="h-4 w-4" aria-hidden="true" />}
              action={
                <Button variant="ghost" size="sm" onClick={() => void refresh()}>
                  Atualizar
                </Button>
              }
            />

            {recent.length > 0 ? (
              <div className="-mx-2 divide-y divide-white/[0.04]">
                {recent.map((entry) => (
                  <TrackRow
                    key={`${entry.track.id}-${entry.playedAt}`}
                    track={entry.track}
                    playedAt={entry.playedAt}
                    compact
                  />
                ))}
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-chalk-muted">
                Nenhuma escuta recente registrada pelo Spotify.
              </p>
            )}
          </Card>
        </Reveal>

        <div className="flex flex-col gap-5">
          <Reveal delay={0.1}>
            <Card tone="raised">
              <CardHeader
                title="Assinatura sonora"
                subtitle="Media das suas faixas"
                icon={<Headphones className="h-4 w-4" aria-hidden="true" />}
              />
              <RadarFeatures features={metrics.averageFeatures} height={230} compact />
            </Card>
          </Reveal>

          <Reveal delay={0.16}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <StatCard
                label="Artistas unicos"
                value={<AnimatedCounter value={metrics.uniqueArtists} />}
                hint={`${metrics.totalDistinctGenres} generos distintos`}
                icon={<Users className="h-4 w-4" aria-hidden="true" />}
              />
              <StatCard
                label="Horas de catalogo"
                value={formatHours(metrics.estimatedHours)}
                hint={`${formatCompact(metrics.uniqueTracks)} musicas mapeadas`}
                icon={<Clock3 className="h-4 w-4" aria-hidden="true" />}
              />
              <StatCard
                label="Decadas exploradas"
                value={<AnimatedCounter value={metrics.decades.length} />}
                hint={
                  metrics.peakHour !== null
                    ? `Pico as ${formatHour(metrics.peakHour)} (${periodOfDay(metrics.peakHour)})`
                    : 'Sem horario de pico definido'
                }
                icon={<Disc3 className="h-4 w-4" aria-hidden="true" />}
              />
            </div>
          </Reveal>
        </div>
      </div>

      {/* ---------- Atalhos ---------- */}
      <Reveal className="mt-12">
        <SectionTitle
          overline="Continue explorando"
          title="Outras leituras do seu gosto"
          className="mb-5"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: '/recommendations', label: 'Recomendacoes', text: '10 artistas novos para voce' },
            { to: '/moods', label: 'Moods', text: 'Mapa de humor das suas faixas' },
            { to: '/decades', label: 'Decadas', text: 'De que epoca e o seu ouvido' },
            { to: '/share', label: 'Cards', text: 'Exporte para os Stories' },
          ].map((shortcut) => (
            <ButtonLink
              key={shortcut.to}
              to={shortcut.to}
              variant="secondary"
              className="h-auto flex-col items-start gap-1 rounded-3xl px-5 py-4 text-left"
            >
              <span className="text-sm font-semibold text-chalk">{shortcut.label}</span>
              <span className="text-xs font-normal text-chalk-muted">{shortcut.text}</span>
            </ButtonLink>
          ))}
        </div>
      </Reveal>
    </Container>
  );
}
