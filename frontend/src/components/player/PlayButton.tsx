import { ExternalLink, Pause, Play } from 'lucide-react';
import { toPlayerTrack, usePlayerStore } from '@/stores/playerStore';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/components/ui/cn';
import type { TrackLite } from '@/types';

/**
 * Botao de preview de uma faixa.
 *
 * Regra de ouro: sem `preview_url` nao existe botao de play. Nesse caso
 * mostramos "Abrir no Spotify", porque um play que nao toca e pior que
 * nenhum play.
 */

export interface PlayButtonProps {
  track: TrackLite;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
} as const;

const ICON_SIZES = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
} as const;

export function PlayButton({ track, size = 'md', className }: PlayButtonProps): JSX.Element {
  const play = usePlayerStore((state) => state.play);
  const currentId = usePlayerStore((state) => state.track?.id);
  const isPlaying = usePlayerStore((state) => state.isPlaying);

  const playerTrack = toPlayerTrack(track);
  const isCurrent = currentId === track.id;
  const active = isCurrent && isPlaying;

  if (!playerTrack) {
    return (
      <Tooltip content="Preview indisponivel — ouca no Spotify" side="left">
        <a
          href={track.spotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir ${track.name} no Spotify`}
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full border border-white/12 text-chalk-muted',
            'transition-colors hover:border-spotify/50 hover:text-spotify-bright',
            SIZES[size],
            className,
          )}
        >
          <ExternalLink className={ICON_SIZES[size]} aria-hidden="true" />
        </a>
      </Tooltip>
    );
  }

  return (
    <button
      type="button"
      onClick={() => play(playerTrack)}
      aria-label={active ? `Pausar ${track.name}` : `Tocar preview de ${track.name}`}
      aria-pressed={active}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full transition-all duration-200',
        active
          ? 'bg-spotify-bright text-ink-950 shadow-glow-spotify'
          : 'border border-white/12 text-chalk hover:border-spotify-bright/60 hover:bg-spotify-bright/10 hover:text-spotify-bright',
        SIZES[size],
        className,
      )}
    >
      {active ? (
        <Pause className={ICON_SIZES[size]} aria-hidden="true" />
      ) : (
        <Play className={cn(ICON_SIZES[size], 'ml-0.5')} aria-hidden="true" />
      )}
    </button>
  );
}

/** Indicador de "tocando agora" — 3 barrinhas animadas. */
export function PlayingIndicator({ className }: { className?: string }): JSX.Element {
  return (
    <span className={cn('flex items-end gap-0.5', className)} aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-3 w-0.5 origin-bottom rounded-full bg-spotify-bright animate-bar-bounce"
          style={{ animationDelay: `${index * 0.15}s` }}
        />
      ))}
    </span>
  );
}
