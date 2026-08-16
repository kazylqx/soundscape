import type { ReactNode } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { MiniPlayer } from '@/components/player/MiniPlayer';
import { cn } from '@/components/ui/cn';
import { BottomBar } from './BottomBar';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

/**
 * Casca das paginas autenticadas.
 *
 * Monta a navegacao (navbar no desktop, bottom bar no mobile), aplica o tema
 * dinamico do usuario e reserva espaco no rodape para o mini-player.
 */

export interface LayoutProps {
  children: ReactNode;
  /** Paginas com hero proprio (Profile) dispensam o padding do topo. */
  bleed?: boolean;
  /** Esconde o footer em telas mais utilitarias. */
  hideFooter?: boolean;
  className?: string;
}

export function Layout({
  children,
  bleed = false,
  hideFooter = false,
  className,
}: LayoutProps): JSX.Element {
  // Injeta as cores extraidas das capas em --vibe-*.
  useTheme();

  return (
    <div className="relative min-h-screen bg-ink-950">
      {/* Textura de fundo: grade + brilho radial */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-grid-faint bg-grid opacity-[0.45]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[32rem]"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, color-mix(in srgb, var(--vibe-primary) 12%, transparent), transparent 70%)',
        }}
      />

      <Navbar />

      <div
        className={cn(
          'relative z-10 page-bottom-space',
          bleed ? 'pt-0' : 'pt-24 md:pt-24',
          className,
        )}
      >
        {children}
      </div>

      {!hideFooter ? (
        <div className="relative z-10">
          <Footer />
        </div>
      ) : null}

      <MiniPlayer />
      <BottomBar />
    </div>
  );
}

/** Container padrao de largura maxima usado dentro das paginas. */
export function Container({
  children,
  size = 'default',
  className,
}: {
  children: ReactNode;
  size?: 'default' | 'wide' | 'narrow';
  className?: string;
}): JSX.Element {
  const widths = {
    narrow: 'max-w-3xl',
    default: 'max-w-6xl',
    wide: 'max-w-7xl',
  } as const;

  return (
    <div className={cn('mx-auto w-full px-4 sm:px-6', widths[size], className)}>{children}</div>
  );
}
