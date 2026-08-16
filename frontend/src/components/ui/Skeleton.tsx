import type { CSSProperties } from 'react';
import { cn } from './cn';

/**
 * Placeholders de carregamento.
 * Um shimmer que passa por cima de um bloco escuro — sem depender de imagens.
 */

export interface SkeletonProps {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'full';
  style?: CSSProperties;
}

const ROUNDED = {
  sm: 'rounded-md',
  md: 'rounded-xl',
  lg: 'rounded-3xl',
  full: 'rounded-full',
} as const;

export function Skeleton({ className, rounded = 'md', style }: SkeletonProps): JSX.Element {
  return (
    <div
      className={cn('relative overflow-hidden bg-white/[0.05]', ROUNDED[rounded], className)}
      style={style}
      aria-hidden="true"
    >
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
    </div>
  );
}

/* ============================================================
 * Composicoes prontas
 * ============================================================ */

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('space-y-2.5', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn('h-3.5', index === lines - 1 ? 'w-2/3' : 'w-full')}
          rounded="sm"
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }): JSX.Element {
  return (
    <div className={cn('glass rounded-3xl p-6', className)}>
      <Skeleton className="mb-4 h-3 w-24" rounded="sm" />
      <Skeleton className="mb-3 h-8 w-32" rounded="sm" />
      <SkeletonText lines={2} />
    </div>
  );
}

/** Linha de lista com capa + duas linhas de texto. */
export function SkeletonRow({ className }: { className?: string }): JSX.Element {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <Skeleton className="h-14 w-14 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/2" rounded="sm" />
        <Skeleton className="h-3 w-1/3" rounded="sm" />
      </div>
      <Skeleton className="h-3 w-10" rounded="sm" />
    </div>
  );
}

export function SkeletonList({
  rows = 5,
  className,
}: {
  rows?: number;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonRow key={index} />
      ))}
    </div>
  );
}

/** Grade de cards — usada no dashboard e nas playlists. */
export function SkeletonGrid({
  items = 6,
  className,
}: {
  items?: number;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {Array.from({ length: items }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}

export function SkeletonChart({ className }: { className?: string }): JSX.Element {
  return (
    <div className={cn('glass flex flex-col rounded-3xl p-6', className)}>
      <Skeleton className="mb-6 h-3 w-32" rounded="sm" />
      <div className="flex flex-1 items-end gap-2">
        {[0.5, 0.75, 0.4, 0.9, 0.65, 0.85, 0.55, 0.7].map((height, index) => (
          <Skeleton key={index} className="flex-1" style={{ height: `${height * 100}%` }} rounded="sm" />
        ))}
      </div>
    </div>
  );
}

/** Skeleton com mensagem rotativa — usado enquanto a IA escreve. */
export function SkeletonWithMessage({
  message,
  className,
}: {
  message: string;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('glass rounded-3xl p-6 sm:p-8', className)}>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex items-end gap-1" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className="h-5 w-1 origin-bottom rounded-full bg-vibe-primary animate-bar-bounce"
              style={{ animationDelay: `${index * 0.12}s` }}
            />
          ))}
        </div>
        <p className="text-sm text-chalk-soft transition-opacity duration-500" role="status" aria-live="polite">
          {message}
        </p>
      </div>
      <SkeletonText lines={4} />
    </div>
  );
}
