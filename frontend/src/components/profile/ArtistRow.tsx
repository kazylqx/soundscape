import { ExternalLink } from 'lucide-react';
import { CoverImage } from '@/components/ui/CoverImage';
import { GenreBadge } from '@/components/ui/Badge';
import { cn } from '@/components/ui/cn';
import { formatCompact, formatGenre } from '@/utils/formatters';
import type { ArtistLite } from '@/types';

/**
 * Linha e card de artista.
 * A linha entra nas listas do perfil; o card, nos grids do dashboard.
 */

export interface ArtistRowProps {
  artist: ArtistLite;
  rank?: number;
  className?: string;
}

export function ArtistRow({ artist, rank, className }: ArtistRowProps): JSX.Element {
  return (
    <a
      href={artist.spotifyUrl}
      target="_blank"
      rel="noopener noreferrer"
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
        src={artist.imageUrl}
        alt={artist.name}
        className="h-12 w-12 shrink-0 sm:h-14 sm:w-14"
        rounded="full"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight text-chalk sm:text-base">
          {artist.name}
        </p>
        <p className="truncate text-xs text-chalk-muted sm:text-sm">
          {artist.genres.length > 0
            ? artist.genres.slice(0, 2).map(formatGenre).join(' · ')
            : 'Genero nao classificado'}
        </p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <p className="font-mono text-xs tabular text-chalk-muted">
          {formatCompact(artist.followers)}
        </p>
        <p className="font-mono text-[0.625rem] uppercase tracking-wider text-chalk-faint">
          seguidores
        </p>
      </div>

      <ExternalLink
        className="h-4 w-4 shrink-0 text-chalk-faint transition-colors group-hover:text-spotify-bright"
        aria-hidden="true"
      />
    </a>
  );
}

/** Card vertical de artista — usado nos grids e carrosseis. */
export function ArtistCard({
  artist,
  rank,
  className,
}: {
  artist: ArtistLite;
  rank?: number;
  className?: string;
}): JSX.Element {
  return (
    <a
      href={artist.spotifyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group glass flex flex-col items-center gap-3 rounded-3xl p-4 text-center transition-all duration-300',
        'hover:-translate-y-1 hover:border-white/20 hover:shadow-glow',
        className,
      )}
    >
      <div className="relative">
        <CoverImage
          src={artist.imageUrl}
          alt={artist.name}
          className="h-24 w-24 sm:h-28 sm:w-28"
          rounded="full"
        />
        {rank !== undefined ? (
          <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-vibe-gradient font-mono text-xs font-bold text-ink-950">
            {rank}
          </span>
        ) : null}
      </div>

      <div className="min-w-0 w-full">
        <p className="truncate text-sm font-semibold text-chalk">{artist.name}</p>
        {artist.genres[0] ? (
          <div className="mt-2 flex justify-center">
            <GenreBadge genre={artist.genres[0]} />
          </div>
        ) : null}
      </div>
    </a>
  );
}
