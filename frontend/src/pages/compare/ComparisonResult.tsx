import { useRef, useState } from 'react';
import { Download, ExternalLink, Play, Sparkles } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge, GenreBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CoverImage } from '@/components/ui/CoverImage';
import { ProgressBar, ProgressRing } from '@/components/ui/ProgressBar';
import { Reveal } from '@/components/animations/Reveal';
import { AnimatedCounter } from '@/components/animations/AnimatedCounter';
import { CardFrame } from '@/components/cards/CardFrame';
import { downloadCardAsPng } from '@/utils/exportCard';
import { hexToRgba } from '@/utils/colorExtractor';
import { formatGenre } from '@/utils/formatters';
import type { CompareResult, VibePalette } from '@/types';

/**
 * Resultado da comparacao: score, eixos, interseccoes, diferencas,
 * playlist sugerida e um card exportavel.
 */

export interface ComparisonResultProps {
  comparison: CompareResult;
  label: string;
  palette: VibePalette;
  onPlay: (track: CompareResult['suggestedPlaylist'][number]) => void;
}

export function ComparisonResult({
  comparison,
  label,
  palette,
  onPlay,
}: ComparisonResultProps): JSX.Element {
  const cardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const [first, second] = comparison.users;

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadCardAsPng(cardRef.current, {
        fileName: 'soundscape-compatibilidade',
        scale: 3,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ---------- Score ---------- */}
      <Reveal>
        <Card tone="raised" className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            aria-hidden="true"
            style={{
              background: `radial-gradient(ellipse 60% 70% at 50% 0%, ${hexToRgba(
                palette.primary,
                0.16,
              )}, transparent 65%)`,
            }}
          />

          <div className="relative flex flex-col items-center gap-8 py-4 lg:flex-row lg:justify-between lg:py-2">
            {/* Avatares */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <CoverImage
                  src={first?.imageUrl ?? null}
                  alt={first?.name ?? 'Perfil 1'}
                  className="mx-auto h-16 w-16 border-2 border-white/10"
                  rounded="full"
                />
                <p className="mt-2 max-w-[7rem] truncate text-sm font-semibold text-chalk">
                  {first?.name ?? '—'}
                </p>
              </div>

              <span className="font-display text-xl font-extrabold text-chalk-faint">x</span>

              <div className="text-center">
                <CoverImage
                  src={second?.imageUrl ?? null}
                  alt={second?.name ?? 'Perfil 2'}
                  className="mx-auto h-16 w-16 border-2 border-white/10"
                  rounded="full"
                />
                <p className="mt-2 max-w-[7rem] truncate text-sm font-semibold text-chalk">
                  {second?.name ?? '—'}
                </p>
              </div>
            </div>

            {/* Anel */}
            <ProgressRing value={comparison.compatibility / 100} size={150} strokeWidth={11}>
              <span className="font-display text-4xl font-extrabold text-chalk">
                <AnimatedCounter value={comparison.compatibility} suffix="%" />
              </span>
              <span className="font-mono text-[0.5625rem] uppercase tracking-[0.2em] text-chalk-faint">
                compativel
              </span>
            </ProgressRing>

            {/* Eixos */}
            <div className="w-full max-w-xs space-y-3">
              <p className="font-display text-lg font-bold text-chalk">{label}</p>
              {(
                [
                  ['Artistas', comparison.breakdown.artists],
                  ['Generos', comparison.breakdown.genres],
                  ['Assinatura sonora', comparison.breakdown.features],
                  ['Eras', comparison.breakdown.eras],
                ] as const
              ).map(([axis, value], index) => (
                <ProgressBar
                  key={axis}
                  value={value / 100}
                  label={axis}
                  valueLabel={`${value}%`}
                  height="xs"
                  delay={index * 0.08}
                />
              ))}
            </div>
          </div>

          <p className="relative mt-4 border-t border-white/[0.06] pt-4 text-center text-sm leading-relaxed text-chalk-soft">
            {comparison.verdict}
          </p>
        </Card>
      </Reveal>

      {/* ---------- Interseccoes ---------- */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Reveal>
          <Card tone="raised" className="h-full">
            <CardHeader
              title="Artistas em comum"
              subtitle={
                comparison.sharedArtists.length > 0
                  ? `${comparison.sharedArtists.length} nomes aparecem nos dois perfis`
                  : 'Nenhum artista em comum no topo'
              }
            />

            {comparison.sharedArtists.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {comparison.sharedArtists.slice(0, 9).map((artist) => (
                  <div key={artist.id} className="flex flex-col items-center gap-2 text-center">
                    <CoverImage
                      src={artist.imageUrl}
                      alt={artist.name}
                      className="h-16 w-16"
                      rounded="full"
                    />
                    <p className="w-full truncate text-xs font-medium text-chalk">{artist.name}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-sm leading-relaxed text-chalk-muted">
                Os topos nao se cruzam — o que nao significa incompatibilidade. Vejam os generos
                compartilhados abaixo.
              </p>
            )}

            {comparison.sharedGenres.length > 0 ? (
              <div className="mt-6 border-t border-white/[0.06] pt-4">
                <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                  generos compartilhados
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {comparison.sharedGenres.slice(0, 12).map((genre) => (
                    <GenreBadge key={genre} genre={genre} />
                  ))}
                </div>
              </div>
            ) : null}
          </Card>
        </Reveal>

        <Reveal delay={0.08}>
          <Card tone="raised" className="h-full">
            <CardHeader
              title="Onde voces divergem"
              subtitle="As diferencas que dao assunto"
              icon={<Sparkles className="h-4 w-4" aria-hidden="true" />}
            />

            <ul className="space-y-3">
              {comparison.differences.map((difference, index) => (
                <li key={index} className="flex gap-3 text-sm leading-relaxed text-chalk-soft">
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-vibe-tertiary"
                    aria-hidden="true"
                  />
                  {difference}
                </li>
              ))}
            </ul>

            {comparison.sharedTracks.length > 0 ? (
              <div className="mt-6 border-t border-white/[0.06] pt-4">
                <p className="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                  musicas que os dois escutam
                </p>
                <ul className="space-y-2.5">
                  {comparison.sharedTracks.slice(0, 5).map((track) => (
                    <li key={track.id} className="flex items-center gap-3">
                      <CoverImage
                        src={track.albumImage}
                        alt={track.name}
                        className="h-9 w-9 shrink-0"
                        rounded="md"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-chalk">{track.name}</p>
                        <p className="truncate text-[0.6875rem] text-chalk-muted">{track.artist}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>
        </Reveal>
      </div>

      {/* ---------- Playlist sugerida ---------- */}
      <Reveal>
        <Card tone="raised">
          <CardHeader
            title="Playlist para ouvir juntos"
            subtitle="Comeca pelas musicas em comum e alterna os favoritos de cada um"
          />

          <div className="grid gap-2 sm:grid-cols-2">
            {comparison.suggestedPlaylist.map((track) => (
              <div
                key={track.id}
                className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-2.5"
              >
                <CoverImage
                  src={track.albumImage}
                  alt={track.name}
                  className="h-11 w-11 shrink-0"
                  rounded="md"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-chalk">{track.name}</p>
                  <p className="truncate text-[0.6875rem] text-chalk-muted">{track.artist}</p>
                </div>

                <Badge variant={track.fromUser === 'ambos' ? 'vibe' : 'neutral'}>
                  {track.fromUser === 'ambos' ? 'ambos' : track.fromUser.split(' ')[0]}
                </Badge>

                {track.previewUrl ? (
                  <button
                    type="button"
                    onClick={() => onPlay(track)}
                    aria-label={`Tocar preview de ${track.name}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 text-chalk transition-colors hover:border-spotify-bright/60 hover:text-spotify-bright"
                  >
                    <Play className="ml-0.5 h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                ) : (
                  <a
                    href={track.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir ${track.name} no Spotify`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 text-chalk-muted transition-colors hover:text-spotify-bright"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      </Reveal>

      {/* ---------- Card exportavel ---------- */}
      <Reveal>
        <Card tone="raised">
          <CardHeader
            title="Card da comparacao"
            subtitle="Para mandar no grupo e encerrar a discussao"
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void handleExport()}
                loading={exporting}
                iconLeft={<Download className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                Baixar PNG
              </Button>
            }
          />

          <div className="flex justify-center overflow-x-auto py-2">
            <CardFrame ref={cardRef} theme="vibe" format="post" palette={palette}>
              {(tokens) => (
                <>
                  <p
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9,
                      textTransform: 'uppercase',
                      letterSpacing: '0.22em',
                      color: tokens.textMuted,
                      marginBottom: 10,
                    }}
                  >
                    compatibilidade musical
                  </p>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 12,
                      marginBottom: 14,
                    }}
                  >
                    {[first, second].map((user, index) => (
                      <div key={index} style={{ textAlign: 'center', width: 92 }}>
                        {user?.imageUrl ? (
                          <img
                            src={user.imageUrl}
                            alt={user.name}
                            crossOrigin="anonymous"
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 999,
                              objectFit: 'cover',
                              display: 'block',
                              margin: '0 auto',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 999,
                              backgroundColor: tokens.surface,
                              margin: '0 auto',
                            }}
                          />
                        )}
                        <p
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: tokens.text,
                            marginTop: 6,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {user?.name ?? '—'}
                        </p>
                      </div>
                    ))}
                  </div>

                  <p
                    style={{
                      fontFamily: 'Syne, sans-serif',
                      fontWeight: 800,
                      fontSize: 62,
                      lineHeight: 1,
                      textAlign: 'center',
                      color: tokens.text,
                    }}
                  >
                    {comparison.compatibility}%
                  </p>

                  <p
                    style={{
                      fontFamily: 'Syne, sans-serif',
                      fontWeight: 700,
                      fontSize: 14,
                      textAlign: 'center',
                      color: tokens.text,
                      marginTop: 6,
                      marginBottom: 12,
                    }}
                  >
                    {label}
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        backgroundColor: tokens.surface,
                        borderRadius: 12,
                        padding: '8px 10px',
                      }}
                    >
                      <p
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 8,
                          textTransform: 'uppercase',
                          letterSpacing: '0.14em',
                          color: tokens.textMuted,
                        }}
                      >
                        artistas em comum
                      </p>
                      <p
                        style={{
                          fontFamily: 'Syne, sans-serif',
                          fontWeight: 800,
                          fontSize: 18,
                          color: tokens.text,
                        }}
                      >
                        {comparison.sharedArtists.length}
                      </p>
                    </div>

                    <div
                      style={{
                        backgroundColor: tokens.surface,
                        borderRadius: 12,
                        padding: '8px 10px',
                      }}
                    >
                      <p
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: 8,
                          textTransform: 'uppercase',
                          letterSpacing: '0.14em',
                          color: tokens.textMuted,
                        }}
                      >
                        generos juntos
                      </p>
                      <p
                        style={{
                          fontFamily: 'Syne, sans-serif',
                          fontWeight: 800,
                          fontSize: 18,
                          color: tokens.text,
                        }}
                      >
                        {comparison.sharedGenres.length}
                      </p>
                    </div>
                  </div>

                  {comparison.sharedGenres.length > 0 ? (
                    <p
                      style={{
                        fontSize: 10,
                        color: tokens.textMuted,
                        marginTop: 10,
                        textAlign: 'center',
                      }}
                    >
                      {comparison.sharedGenres.slice(0, 3).map(formatGenre).join(' · ')}
                    </p>
                  ) : null}
                </>
              )}
            </CardFrame>
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
