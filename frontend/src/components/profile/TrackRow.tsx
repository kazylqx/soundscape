import { ExternalLink } from 'lucide-react';
import { CoverImage } from '@/components/ui/CoverImage';
import { cn } from '@/components/ui/cn';
import { PlayButton, PlayingIndicator } from '@/components/player/PlayButton';
import { usePlayerStore } from '@/stores/playerStore';
import { formatDuration, timeAgo } from '@/utils/formatters';
import type { TrackLite } from '@/types';

/**
 * Linha de musica reutilizada no dashboard, no perfil e nas listas de humor.
 */

export interface TrackRowProps {
  track: TrackLite;
  /** Posicao no ranking (1, 2, 3...). */
  rank?: number;
  /** Timestamp ISO para mostrar "ha 12 min" (recently played). */
  playedAt?: string;
  /** Metrica extra a direita (ex.: "88% positividade"). */
  meta?: string;
  compact?: boolean;
  className?: string;
}

export function TrackRow({
  track,
  rank,
  playedAt,
  meta,
  compact = false,
  className,
}: TrackRowProps): JSX.Element {
  const currentId = usePlayerStore((state) => state.track?.id);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const active = currentId === track.id && isPlaying;

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-white/[0.04] sm:gap-4 sm:px-3',
        className,
      )}
    >
      {rank !== undefined ? (
        <span
          className={cn(
            'w-6 shrink-0 text-center font-mono text-sm tabular',
            rank <= 3 ? 'text-vibe-primary' : 'text-chalk-faint',
          )}
        >
          {rank}
        </span>
      ) : null}

      <CoverImage
        src={track.albumImage}
        alt={`Capa de ${track.albumName || track.name}`}
        className={cn('shrink-0', compact ? 'h-10 w-10' : 'h-12 w-12 sm:h-14 sm:w-14')}
        rounded="md"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'truncate font-semibold leading-tight text-chalk',
              compact ? 'text-sm' : 'text-sm sm:text-base',
            )}
          >
            {track.name}
          </p>
          {active ? <PlayingIndicator /> : null}
          {track.explicit ? (
            <span
              className="shrink-0 rounded border border-white/15 px-1 font-mono text-[0.5625rem] text-chalk-faint"
              title="Conteudo explicito"
            >
              E
            </span>
          ) : null}
        </div>

        <p className="truncate text-xs text-chalk-muted sm:text-sm">
          {track.artistNames.join(', ')}
          {!compact && track.releaseYear ? (
            <span className="text-chalk-faint"> · {track.releaseYear}</span>
          ) : null}
        </p>
      </div>

      {meta ? (
        <span className="hidden shrink-0 font-mono text-xs tabular text-chalk-muted sm:block">
          {meta}
        </span>
      ) : null}

      {playedAt ? (
        <span className="hidden shrink-0 font-mono text-xs tabular text-chalk-faint sm:block">
          {timeAgo(playedAt)}
        </span>
      ) : (
        <span className="hidden shrink-0 font-mono text-xs tabular text-chalk-faint sm:block">
          {formatDuration(track.durationMs)}
        </span>
      )}

      <div className="flex shrink-0 items-center gap-1">
        <PlayButton track={track} size={compact ? 'sm' : 'md'} />
        <a
          href={track.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir ${track.name} no Spotify`}
          className="hidden h-8 w-8 items-center justify-center rounded-full text-chalk-faint transition-colors hover:text-spotify-bright sm:flex"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
