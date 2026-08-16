import type { ReactNode } from 'react';
import { cn } from './cn';
import { MOOD_COLOR, MOOD_LABEL, formatGenre } from '@/utils/formatters';
import { hexToRgba } from '@/utils/colorExtractor';
import type { MoodName } from '@/types';

/**
 * Badge arredondado. Variantes semanticas para genero, mood e decada.
 */

export type BadgeVariant = 'neutral' | 'genre' | 'mood' | 'decade' | 'vibe' | 'spotify' | 'warning';
export type BadgeSize = 'sm' | 'md';

const VARIANTS: Record<BadgeVariant, string> = {
  neutral: 'border-white/10 bg-white/[0.05] text-chalk-soft',
  genre: 'border-accent-violet/25 bg-accent-violet/10 text-accent-violet',
  mood: 'border-white/10 bg-white/[0.05] text-chalk',
  decade: 'border-accent-orange/25 bg-accent-orange/10 text-accent-orange',
  vibe: 'border-vibe-primary/30 bg-vibe-primary/10 text-vibe-primary',
  spotify: 'border-spotify/30 bg-spotify/10 text-spotify-bright',
  warning: 'border-accent-amber/30 bg-accent-amber/10 text-accent-amber',
};

const SIZES: Record<BadgeSize, string> = {
  sm: 'h-6 px-2.5 text-[0.6875rem]',
  md: 'h-7 px-3 text-xs',
};

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
  title?: string;
}

export function Badge({
  variant = 'neutral',
  size = 'sm',
  icon,
  className,
  children,
  title,
}: BadgeProps): JSX.Element {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium leading-none',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/* ============================================================
 * Atalhos de dominio
 * ============================================================ */

export function GenreBadge({
  genre,
  size = 'sm',
  className,
}: {
  genre: string;
  size?: BadgeSize;
  className?: string;
}): JSX.Element {
  return (
    <Badge variant="genre" size={size} className={className}>
      {formatGenre(genre)}
    </Badge>
  );
}

export function MoodBadge({
  mood,
  size = 'sm',
  className,
}: {
  mood: MoodName;
  size?: BadgeSize;
  className?: string;
}): JSX.Element {
  const color = MOOD_COLOR[mood] ?? '#a78bfa';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium leading-none',
        SIZES[size],
        className,
      )}
      style={{
        borderColor: hexToRgba(color, 0.3),
        backgroundColor: hexToRgba(color, 0.12),
        color,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
      {MOOD_LABEL[mood] ?? mood}
    </span>
  );
}

export function DecadeBadge({
  decade,
  size = 'sm',
  className,
}: {
  decade: string;
  size?: BadgeSize;
  className?: string;
}): JSX.Element {
  return (
    <Badge variant="decade" size={size} className={cn('font-mono', className)}>
      {decade}
    </Badge>
  );
}

/** Badge do moodboard da IA — pilula maior, com gradiente da vibe. */
export function MoodBoardBadge({ word, index }: { word: string; index: number }): JSX.Element {
  return (
    <span
      className="inline-flex items-center rounded-full border border-white/10 px-4 py-2 text-sm font-medium capitalize text-chalk backdrop-blur-sm"
      style={{
        // Alterna as tres cores da paleta do usuario.
        backgroundColor: `color-mix(in srgb, var(--vibe-${
          ['primary', 'secondary', 'tertiary'][index % 3]
        }) 14%, transparent)`,
      }}
    >
      {word}
    </span>
  );
}
