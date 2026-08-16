import { useState } from 'react';
import { Music2 } from 'lucide-react';
import { cn } from './cn';

/**
 * Imagem de capa/artista com placeholder.
 * O Spotify as vezes devolve `images: []`, e a rede pode falhar — nos dois
 * casos mostramos um bloco com icone em vez de uma imagem quebrada.
 */

export interface CoverImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Formato do placeholder e da imagem. */
  rounded?: 'md' | 'lg' | 'xl' | 'full';
  /** Prioridade de carregamento (hero e above-the-fold). */
  priority?: boolean;
  /** Necessario quando a imagem entra em um card exportado por html2canvas. */
  crossOrigin?: boolean;
}

const ROUNDED = {
  md: 'rounded-lg',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
  full: 'rounded-full',
} as const;

export function CoverImage({
  src,
  alt,
  className,
  rounded = 'md',
  priority = false,
  crossOrigin = false,
}: CoverImageProps): JSX.Element {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-ink-700 text-chalk-faint',
          ROUNDED[rounded],
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <Music2 className="h-1/3 w-1/3" strokeWidth={1.5} aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
      crossOrigin={crossOrigin ? 'anonymous' : undefined}
      onError={() => setFailed(true)}
      className={cn('bg-ink-700 object-cover', ROUNDED[rounded], className)}
    />
  );
}
