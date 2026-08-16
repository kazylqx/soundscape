import { AnimatePresence, motion } from 'framer-motion';
import {
  ExternalLink,
  Pause,
  Play,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/playerStore';
import { CoverImage } from '@/components/ui/CoverImage';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatSeconds } from '@/utils/formatters';

/**
 * Mini-player global de preview (30s).
 *
 * Fica fixo no rodape e sobrevive a troca de rotas porque o estado vive no
 * Zustand e o elemento <audio> e um singleton fora do React.
 * So aparece quando existe uma faixa com `preview_url`.
 */

export function MiniPlayer(): JSX.Element {
  const track = usePlayerStore((state) => state.track);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const loading = usePlayerStore((state) => state.loading);
  const error = usePlayerStore((state) => state.error);
  const progress = usePlayerStore((state) => state.progress);
  const duration = usePlayerStore((state) => state.duration);
  const volume = usePlayerStore((state) => state.volume);
  const muted = usePlayerStore((state) => state.muted);

  const toggle = usePlayerStore((state) => state.toggle);
  const stop = usePlayerStore((state) => state.stop);
  const seek = usePlayerStore((state) => state.seek);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const toggleMute = usePlayerStore((state) => state.toggleMute);

  const percentage = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <AnimatePresence>
      {track ? (
        <motion.aside
          key="mini-player"
          initial={{ y: 96, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 96, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          className="fixed inset-x-0 bottom-[var(--bottom-bar-height)] z-40 md:bottom-0"
          aria-label="Player de preview"
        >
          <div className="glass-strong border-t border-white/10">
            {/* Barra de progresso clicavel */}
            <div className="relative h-1 w-full bg-white/[0.08]">
              <div
                className="h-full bg-vibe-gradient transition-[width] duration-150 ease-linear"
                style={{ width: `${percentage}%` }}
              />
              <input
                type="range"
                min={0}
                max={duration || 30}
                step={0.1}
                value={progress}
                onChange={(event) => seek(Number(event.target.value))}
                aria-label="Progresso do preview"
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </div>

            <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-6">
              <CoverImage
                src={track.albumImage}
                alt={`Capa de ${track.name}`}
                className="h-11 w-11 shrink-0 sm:h-12 sm:w-12"
                rounded="md"
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight text-chalk">
                  {track.name}
                </p>
                <p className="truncate text-xs text-chalk-muted">{track.artist}</p>
                {error ? (
                  <p className="mt-0.5 truncate text-[0.6875rem] text-red-400" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>

              <span className="hidden shrink-0 font-mono text-[0.6875rem] tabular text-chalk-muted sm:block">
                {formatSeconds(progress)} / {formatSeconds(duration)}
              </span>

              {/* Volume — apenas em telas maiores */}
              <div className="hidden items-center gap-2 lg:flex">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={muted ? 'Ativar som' : 'Silenciar'}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-chalk-muted transition-colors hover:bg-white/[0.08] hover:text-chalk"
                >
                  <VolumeIcon className="h-4 w-4" aria-hidden="true" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={muted ? 0 : volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                  aria-label="Volume"
                  className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/15 accent-spotify-bright"
                />
              </div>

              <button
                type="button"
                onClick={toggle}
                aria-label={isPlaying ? 'Pausar preview' : 'Tocar preview'}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-chalk text-ink-950 transition-transform hover:scale-105 active:scale-95"
              >
                {loading ? (
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-ink-950 border-t-transparent"
                    aria-hidden="true"
                  />
                ) : isPlaying ? (
                  <Pause className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <Play className="ml-0.5 h-5 w-5" aria-hidden="true" />
                )}
              </button>

              <Tooltip content="Abrir no Spotify" side="top">
                <a
                  href={track.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir ${track.name} no Spotify`}
                  className="hidden h-9 w-9 items-center justify-center rounded-full text-chalk-muted transition-colors hover:bg-white/[0.08] hover:text-spotify-bright sm:flex"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              </Tooltip>

              <button
                type="button"
                onClick={stop}
                aria-label="Fechar player"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-chalk-muted transition-colors hover:bg-white/[0.08] hover:text-chalk"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
