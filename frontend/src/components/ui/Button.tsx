import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from './cn';

/**
 * Botao base do design system.
 * Variantes: primary (verde Spotify), secondary (outline) e ghost.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'vibe' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'relative inline-flex items-center justify-center gap-2 rounded-full font-semibold ' +
  'transition-all duration-200 ease-out-expo select-none whitespace-nowrap ' +
  'disabled:pointer-events-none disabled:opacity-45';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-spotify-bright text-ink-950 hover:bg-spotify hover:shadow-glow-spotify active:scale-[0.98]',
  secondary:
    'border border-white/15 bg-white/[0.04] text-chalk hover:border-white/30 hover:bg-white/[0.08] active:scale-[0.98]',
  ghost: 'text-chalk-muted hover:bg-white/[0.06] hover:text-chalk',
  vibe:
    'bg-vibe-gradient text-ink-950 hover:shadow-glow-vibe active:scale-[0.98] bg-[length:180%_180%] animate-gradient-pan',
  danger:
    'border border-red-500/30 bg-red-500/10 text-red-300 hover:border-red-500/60 hover:bg-red-500/20',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-[0.8125rem]',
  md: 'h-11 px-6 text-sm',
  lg: 'h-14 px-8 text-base',
};

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export interface ButtonProps extends CommonProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> {}

function Spinner(): JSX.Element {
  return (
    <span
      className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    iconLeft,
    iconRight,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {loading ? <Spinner /> : iconLeft}
      {children}
      {!loading && iconRight}
    </button>
  );
});

/* ============================================================
 * Variantes de navegacao com o mesmo visual
 * ============================================================ */

export interface ButtonLinkProps extends CommonProps {
  to: string;
  'aria-label'?: string;
}

/** Link interno (React Router) com aparencia de botao. */
export function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  iconLeft,
  iconRight,
  className,
  children,
  ...rest
}: ButtonLinkProps): JSX.Element {
  return (
    <Link
      to={to}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </Link>
  );
}

export interface ExternalButtonLinkProps extends CommonProps {
  href: string;
  'aria-label'?: string;
}

/** Link externo (abre em nova aba) com aparencia de botao. */
export function ExternalButtonLink({
  href,
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  iconLeft,
  iconRight,
  className,
  children,
  ...rest
}: ExternalButtonLinkProps): JSX.Element {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </a>
  );
}
