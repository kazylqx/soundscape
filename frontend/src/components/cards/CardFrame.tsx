import { forwardRef, type ReactNode } from 'react';
import { hexToRgba, readableTextColor } from '@/utils/colorExtractor';
import { cn } from '@/components/ui/cn';
import type { CardFormat, CardTheme, VibePalette } from '@/types';

/**
 * Moldura dos cards de compartilhamento.
 *
 * Duas restricoes moldam este componente:
 *  1. html2canvas nao suporta backdrop-filter nem color-mix(): tudo aqui usa
 *     cores solidas ou rgba calculado em JS.
 *  2. O card precisa ter tamanho fixo em px para a exportacao ser previsivel.
 *     Story = 9:16, Post = 1:1. O `scale` do export multiplica a resolucao.
 */

export const CARD_SIZES: Record<CardFormat, { width: number; height: number; label: string }> = {
  story: { width: 360, height: 640, label: 'Stories 9:16' },
  post: { width: 400, height: 400, label: 'Post 1:1' },
};

/** Tokens de cor resolvidos para o tema escolhido. */
export interface CardTokens {
  background: string;
  /** Fundo em camada (blocos internos). */
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  accent: string;
  accentSecondary: string;
  accentTertiary: string;
  /** Cor de texto legivel sobre `accent`. */
  onAccent: string;
  isLight: boolean;
}

export function resolveTokens(theme: CardTheme, palette: VibePalette): CardTokens {
  if (theme === 'light') {
    return {
      background: '#f4f4f5',
      surface: 'rgb(10 10 12 / 0.05)',
      text: '#0a0a0c',
      textMuted: 'rgb(10 10 12 / 0.55)',
      border: 'rgb(10 10 12 / 0.1)',
      accent: palette.primary,
      accentSecondary: palette.secondary,
      accentTertiary: palette.tertiary,
      onAccent: readableTextColor(palette.primary),
      isLight: true,
    };
  }

  if (theme === 'vibe') {
    return {
      background: palette.primary,
      surface: 'rgb(0 0 0 / 0.18)',
      text: readableTextColor(palette.primary),
      textMuted: hexToRgba(readableTextColor(palette.primary), 0.7),
      border: hexToRgba(readableTextColor(palette.primary), 0.18),
      accent: palette.tertiary,
      accentSecondary: palette.secondary,
      accentTertiary: palette.primary,
      onAccent: readableTextColor(palette.tertiary),
      isLight: readableTextColor(palette.primary) === '#0a0a0c',
    };
  }

  return {
    background: '#0a0a0c',
    surface: 'rgb(255 255 255 / 0.06)',
    text: '#f4f4f5',
    textMuted: 'rgb(244 244 245 / 0.6)',
    border: 'rgb(255 255 255 / 0.1)',
    accent: palette.primary,
    accentSecondary: palette.secondary,
    accentTertiary: palette.tertiary,
    onAccent: readableTextColor(palette.primary),
    isLight: false,
  };
}

export interface CardFrameProps {
  theme: CardTheme;
  format: CardFormat;
  palette: VibePalette;
  children: (tokens: CardTokens) => ReactNode;
  className?: string;
}

export const CardFrame = forwardRef<HTMLDivElement, CardFrameProps>(function CardFrame(
  { theme, format, palette, children, className },
  ref,
) {
  const tokens = resolveTokens(theme, palette);
  const size = CARD_SIZES[format];

  // Fundo do tema "vibe": gradiente com as tres cores do usuario.
  const backgroundImage =
    theme === 'vibe'
      ? `linear-gradient(150deg, ${palette.primary} 0%, ${palette.secondary} 55%, ${palette.tertiary} 100%)`
      : theme === 'dark'
        ? `radial-gradient(ellipse 70% 50% at 15% 0%, ${hexToRgba(palette.primary, 0.22)}, transparent 62%),
           radial-gradient(ellipse 60% 45% at 95% 25%, ${hexToRgba(palette.secondary, 0.18)}, transparent 60%),
           radial-gradient(ellipse 80% 50% at 50% 105%, ${hexToRgba(palette.tertiary, 0.16)}, transparent 65%)`
        : `radial-gradient(ellipse 65% 45% at 10% 0%, ${hexToRgba(palette.primary, 0.24)}, transparent 60%),
           radial-gradient(ellipse 60% 40% at 100% 100%, ${hexToRgba(palette.tertiary, 0.2)}, transparent 62%)`;

  return (
    <div
      ref={ref}
      className={cn('export-safe relative overflow-hidden', className)}
      style={{
        width: size.width,
        height: size.height,
        backgroundColor: tokens.background,
        backgroundImage,
        color: tokens.text,
        borderRadius: 24,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div className="relative flex h-full w-full flex-col p-6">
        {children(tokens)}
        <Watermark tokens={tokens} />
      </div>
    </div>
  );
});

/** Marca d'agua discreta, presente em todos os cards. */
function Watermark({ tokens }: { tokens: CardTokens }): JSX.Element {
  return (
    <div
      className="mt-auto flex items-center gap-2 pt-4"
      style={{ borderTop: `1px solid ${tokens.border}` }}
    >
      <span className="flex items-end gap-[2px]" aria-hidden="true">
        {[6, 11, 8, 13].map((height, index) => (
          <span
            key={index}
            style={{
              width: 2,
              height,
              borderRadius: 999,
              backgroundColor: index % 2 === 0 ? tokens.accent : tokens.accentSecondary,
            }}
          />
        ))}
      </span>
      <span
        style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: 11,
          letterSpacing: '0.02em',
          color: tokens.text,
        }}
      >
        Soundscape
      </span>
      <span
        style={{
          marginLeft: 'auto',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 9,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: tokens.textMuted,
        }}
      >
        perfil musical por IA
      </span>
    </div>
  );
}

/* ============================================================
 * Blocos reutilizados pelos cards
 * ============================================================ */

export function CardOverline({
  children,
  tokens,
}: {
  children: ReactNode;
  tokens: CardTokens;
}): JSX.Element {
  return (
    <p
      style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: '0.22em',
        color: tokens.accent,
        marginBottom: 6,
      }}
    >
      {children}
    </p>
  );
}

export function CardTitle({
  children,
  tokens,
  size = 26,
}: {
  children: ReactNode;
  tokens: CardTokens;
  size?: number;
}): JSX.Element {
  return (
    <h2
      style={{
        fontFamily: 'Syne, sans-serif',
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.05,
        letterSpacing: '-0.02em',
        color: tokens.text,
      }}
    >
      {children}
    </h2>
  );
}

export function CardStat({
  label,
  value,
  tokens,
}: {
  label: string;
  value: ReactNode;
  tokens: CardTokens;
}): JSX.Element {
  return (
    <div
      style={{
        backgroundColor: tokens.surface,
        border: `1px solid ${tokens.border}`,
        borderRadius: 14,
        padding: '10px 12px',
      }}
    >
      <p
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: tokens.textMuted,
          marginBottom: 3,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: 20,
          lineHeight: 1,
          color: tokens.text,
        }}
      >
        {value}
      </p>
    </div>
  );
}

/** Pilula usada para generos e palavras do moodboard. */
export function CardPill({
  children,
  tokens,
  accent,
}: {
  children: ReactNode;
  tokens: CardTokens;
  accent?: string;
}): JSX.Element {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 500,
        backgroundColor: hexToRgba(accent ?? tokens.accent, 0.16),
        border: `1px solid ${hexToRgba(accent ?? tokens.accent, 0.3)}`,
        color: tokens.text,
      }}
    >
      {children}
    </span>
  );
}
