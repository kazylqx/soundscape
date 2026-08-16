import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ExternalLink, ListMusic, Users, X } from 'lucide-react';
import { useMusicData } from '@/hooks/useMusicData';
import { Card, SectionTitle, StatCard } from '@/components/ui/Card';
import { Badge, GenreBadge, MoodBadge } from '@/components/ui/Badge';
import { Button, ExternalButtonLink } from '@/components/ui/Button';
import { CoverImage } from '@/components/ui/CoverImage';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { SkeletonGrid } from '@/components/ui/Skeleton';
import { Container } from '@/components/layout/Layout';
import { Stagger, StaggerItem } from '@/components/animations/Reveal';
import { TrackRow } from '@/components/profile/TrackRow';
import { analyzePlaylist } from '@/utils/musicAnalyzer';
import { FEATURE_LABEL, formatTempo, pluralize } from '@/utils/formatters';
import type { PlaylistAnalysis, PlaylistLite } from '@/types';

/**
 * Playlists: grid + analise detalhada de cada uma (features medias, mood,
 * BPM, artistas dominantes e rotulos de uso).
 */

type OwnerFilter = 'todas' | 'minhas' | 'salvas';

export function Playlists(): JSX.Element {
  const { snapshot, isLoading, error, refresh } = useMusicData();
  const [filter, setFilter] = useState<OwnerFilter>('todas');
  const [selected, setSelected] = useState<PlaylistLite | null>(null);

  const playlists = useMemo(() => {
    const all = snapshot?.playlists ?? [];
    if (filter === 'minhas') return all.filter((playlist) => playlist.isOwner);
    if (filter === 'salvas') return all.filter((playlist) => !playlist.isOwner);
    return all;
  }, [snapshot, filter]);

  /** Analises calculadas apenas para playlists que trouxeram faixas. */
  const analyses = useMemo(() => {
    if (!snapshot) return new Map<string, PlaylistAnalysis>();

    const map = new Map<string, PlaylistAnalysis>();
    for (const playlist of snapshot.playlists) {
      if (playlist.tracks.length === 0) continue;
      map.set(
        playlist.id,
        analyzePlaylist(playlist, snapshot.audioFeatures, snapshot.artistDetails),
      );
    }
    return map;
  }, [snapshot]);

  /* Comparativo: playlists com features, ordenadas por energia. */
  const comparison = useMemo(
    () =>
      [...analyses.values()]
        .filter((analysis) => analysis.analyzedTracks >= 5)
        .sort((a, b) => b.features.energy - a.features.energy)
        .slice(0, 8),
    [analyses],
  );

  if (error && !snapshot) {
    return (
      <Container className="py-10">
        <ErrorState message={error} onRetry={() => void refresh()} retrying={isLoading} />
      </Container>
    );
  }

  if (isLoading || !snapshot) {
    return (
      <Container className="py-10">
        <SkeletonGrid items={6} />
      </Container>
    );
  }

  const selectedAnalysis = selected ? analyses.get(selected.id) : undefined;

  return (
    <Container className="py-10">
      <SectionTitle
        overline="Playlists"
        title="Suas colecoes, analisadas por dentro"
        description="Cada playlist tem uma assinatura sonora propria. Clique para ver as metricas medias e para que ela serve melhor."
        action={
          <Tabs
            items={[
              { value: 'todas' as OwnerFilter, label: `Todas (${snapshot.playlists.length})` },
              { value: 'minhas' as OwnerFilter, label: 'Minhas' },
              { value: 'salvas' as OwnerFilter, label: 'Salvas' },
            ]}
            value={filter}
            onChange={setFilter}
            layoutId="playlist-filter"
            size="sm"
          />
        }
      />

      {playlists.length === 0 ? (
        <EmptyState
          icon={<ListMusic className="h-6 w-6" aria-hidden="true" />}
          title="Nenhuma playlist encontrada"
          description="Crie ou salve playlists no Spotify para ver a analise delas aqui."
        />
      ) : (
        <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((playlist) => {
            const analysis = analyses.get(playlist.id);

            return (
              <StaggerItem key={playlist.id}>
                <Card
                  interactive
                  className="flex h-full flex-col"
                  onClick={() => setSelected(playlist)}
                >
                  <div className="mb-4 flex items-start gap-3">
                    <CoverImage
                      src={playlist.imageUrl}
                      alt={playlist.name}
                      className="h-16 w-16 shrink-0"
                      rounded="lg"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-chalk">
                        {playlist.name}
                      </h3>
                      <p className="mt-1 font-mono text-[0.625rem] tabular text-chalk-faint">
                        {pluralize(playlist.totalTracks, 'faixa')}
                      </p>
                    </div>
                  </div>

                  {analysis ? (
                    <>
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        <MoodBadge mood={analysis.mood} />
                        {analysis.goodFor.slice(0, 2).map((label) => (
                          <Badge key={label} variant="vibe">
                            {label}
                          </Badge>
                        ))}
                      </div>

                      <div className="mt-auto space-y-2">
                        <ProgressBar
                          value={analysis.features.energy}
                          label="Energia"
                          valueLabel={`${Math.round(analysis.features.energy * 100)}%`}
                          height="xs"
                        />
                        <ProgressBar
                          value={analysis.features.valence}
                          label="Positividade"
                          valueLabel={`${Math.round(analysis.features.valence * 100)}%`}
                          height="xs"
                        />
                      </div>
                    </>
                  ) : (
                    <p className="mt-auto text-xs text-chalk-faint">
                      {playlist.isOwner
                        ? 'Faixas nao coletadas nesta playlist.'
                        : `Playlist de ${playlist.ownerName}`}
                    </p>
                  )}
                </Card>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      {/* ---------- Comparativo ---------- */}
      {comparison.length >= 2 ? (
        <div className="mt-14">
          <SectionTitle
            overline="Comparativo"
            title="Da mais intensa para a mais calma"
            description="Energia media de cada playlist com pelo menos 5 faixas analisadas."
          />

          <Card tone="raised">
            <ul className="space-y-5">
              {comparison.map((analysis) => (
                <li key={analysis.playlist.id}>
                  <div className="mb-2 flex items-center gap-3">
                    <CoverImage
                      src={analysis.playlist.imageUrl}
                      alt={analysis.playlist.name}
                      className="h-9 w-9 shrink-0"
                      rounded="md"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-chalk">
                      {analysis.playlist.name}
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular text-chalk-muted">
                      {formatTempo(analysis.averageTempo)}
                    </span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <ProgressBar
                      value={analysis.features.energy}
                      label="Energia"
                      valueLabel={`${Math.round(analysis.features.energy * 100)}%`}
                      height="xs"
                    />
                    <ProgressBar
                      value={analysis.features.valence}
                      label="Positividade"
                      valueLabel={`${Math.round(analysis.features.valence * 100)}%`}
                      height="xs"
                    />
                    <ProgressBar
                      value={analysis.features.danceability}
                      label="Dancabilidade"
                      valueLabel={`${Math.round(analysis.features.danceability * 100)}%`}
                      height="xs"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}

      {/* ---------- Detalhe ---------- */}
      <AnimatePresence>
        {selected ? (
          <PlaylistDetail
            playlist={selected}
            analysis={selectedAnalysis}
            onClose={() => setSelected(null)}
          />
        ) : null}
      </AnimatePresence>
    </Container>
  );
}

/* ============================================================
 * Painel de detalhe
 * ============================================================ */

function PlaylistDetail({
  playlist,
  analysis,
  onClose,
}: {
  playlist: PlaylistLite;
  analysis: PlaylistAnalysis | undefined;
  onClose: () => void;
}): JSX.Element {
  return (
    <>
      <motion.button
        type="button"
        aria-label="Fechar detalhes"
        className="fixed inset-0 z-40 bg-ink-950/80 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto sm:inset-y-0 sm:left-auto sm:right-0 sm:w-full sm:max-w-lg"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        role="dialog"
        aria-modal="true"
        aria-label={`Analise da playlist ${playlist.name}`}
      >
        <div className="glass-strong min-h-full rounded-t-3xl border-t border-white/10 p-5 sm:rounded-none sm:rounded-l-3xl sm:border-l sm:border-t-0 sm:p-6">
          <div className="mb-6 flex items-start gap-4">
            <CoverImage
              src={playlist.imageUrl}
              alt={playlist.name}
              className="h-20 w-20 shrink-0"
              rounded="lg"
            />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-extrabold leading-tight text-chalk">
                {playlist.name}
              </h2>
              <p className="mt-1 text-xs text-chalk-muted">
                {playlist.isOwner ? 'Sua playlist' : `De ${playlist.ownerName}`} ·{' '}
                {pluralize(playlist.totalTracks, 'faixa')}
              </p>
              {playlist.description ? (
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-chalk-faint">
                  {playlist.description.replace(/<[^>]*>/g, '')}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-chalk-muted transition-colors hover:bg-white/[0.08] hover:text-chalk"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {analysis ? (
            <>
              <div className="mb-5 flex flex-wrap gap-1.5">
                <MoodBadge mood={analysis.mood} size="md" />
                {analysis.goodFor.map((label) => (
                  <Badge key={label} variant="vibe" size="md">
                    Boa para {label}
                  </Badge>
                ))}
              </div>

              <div className="mb-6 grid grid-cols-2 gap-3">
                <StatCard label="BPM medio" value={Math.round(analysis.averageTempo)} />
                <StatCard
                  label="Diversidade"
                  value={`${analysis.diversityScore}%`}
                  hint={`${analysis.distinctGenres} generos`}
                />
              </div>

              <div className="mb-6">
                <p className="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                  assinatura sonora
                </p>
                <div className="space-y-3">
                  {(
                    ['energy', 'valence', 'danceability', 'acousticness', 'instrumentalness'] as const
                  ).map((key, index) => (
                    <ProgressBar
                      key={key}
                      value={analysis.features[key]}
                      label={FEATURE_LABEL[key]}
                      valueLabel={`${Math.round(analysis.features[key] * 100)}%`}
                      delay={index * 0.06}
                    />
                  ))}
                </div>
                <p className="mt-3 font-mono text-[0.625rem] text-chalk-faint">
                  baseado em {analysis.analyzedTracks} de {playlist.tracks.length} faixas coletadas
                </p>
              </div>

              {analysis.topGenres.length > 0 ? (
                <div className="mb-6">
                  <p className="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                    generos predominantes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.topGenres.map((genre) => (
                      <GenreBadge key={genre} genre={genre} />
                    ))}
                  </div>
                </div>
              ) : null}

              {analysis.topArtists.length > 0 ? (
                <div className="mb-6">
                  <p className="mb-3 flex items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                    <Users className="h-3 w-3" aria-hidden="true" />
                    artistas dominantes
                  </p>
                  <ul className="space-y-2">
                    {analysis.topArtists.map((artist) => (
                      <li key={artist.name} className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm text-chalk-soft">{artist.name}</span>
                        <span className="shrink-0 font-mono text-xs tabular text-chalk-faint">
                          {artist.count}x
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {playlist.tracks.length > 0 ? (
                <div className="mb-6">
                  <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                    primeiras faixas
                  </p>
                  <div className="-mx-2 divide-y divide-white/[0.04]">
                    {playlist.tracks.slice(0, 10).map((track, index) => (
                      <TrackRow key={`${track.id}-${index}`} track={track} compact />
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="Sem analise para esta playlist"
              description={
                playlist.totalTracks === 0
                  ? 'Esta playlist esta vazia.'
                  : 'As faixas desta playlist nao entraram na coleta. Abrimos as playlists mais relevantes primeiro para nao estourar o limite da Spotify API.'
              }
            />
          )}

          <div className="flex gap-2">
            <ExternalButtonLink
              href={playlist.spotifyUrl}
              variant="primary"
              fullWidth
              iconLeft={<ExternalLink className="h-4 w-4" aria-hidden="true" />}
            >
              Abrir no Spotify
            </ExternalButtonLink>
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
