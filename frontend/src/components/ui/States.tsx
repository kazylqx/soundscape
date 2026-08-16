import type { ReactNode } from 'react';
import { AlertTriangle, Headphones, RefreshCw, WifiOff } from 'lucide-react';
import { Button, ExternalButtonLink } from './Button';
import { Card } from './Card';
import { cn } from './cn';

/**
 * Telas de estado: vazio, erro e "sem historico suficiente".
 * Todas as paginas usam estes tres componentes em vez de improvisar.
 */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <Card tone="flat" className={cn('flex flex-col items-center gap-4 py-14 text-center', className)}>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] text-chalk-muted">
        {icon ?? <Headphones className="h-6 w-6" aria-hidden="true" />}
      </span>
      <div className="max-w-md">
        <h3 className="text-lg font-semibold text-chalk">{title}</h3>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-chalk-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </Card>
  );
}

export function ErrorState({
  title = 'Algo deu errado',
  message,
  onRetry,
  retrying = false,
  isNetwork = false,
  className,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  retrying?: boolean;
  isNetwork?: boolean;
  className?: string;
}): JSX.Element {
  return (
    <Card
      tone="flat"
      className={cn('flex flex-col items-center gap-4 py-14 text-center', className)}
      role="alert"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
        {isNetwork ? (
          <WifiOff className="h-6 w-6" aria-hidden="true" />
        ) : (
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        )}
      </span>
      <div className="max-w-md">
        <h3 className="text-lg font-semibold text-chalk">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-chalk-muted">{message}</p>
      </div>
      {onRetry ? (
        <Button
          variant="secondary"
          onClick={onRetry}
          loading={retrying}
          iconLeft={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
        >
          Tentar novamente
        </Button>
      ) : null}
    </Card>
  );
}

/**
 * Conta nova ou sem escutas suficientes.
 * O Spotify precisa de algumas semanas de historico para popular /me/top.
 */
export function NotEnoughDataState({ className }: { className?: string }): JSX.Element {
  return (
    <Card tone="flat" className={cn('overflow-hidden py-12 text-center', className)}>
      <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-4">
        <div className="halo flex h-16 w-16 items-center justify-center rounded-3xl bg-white/[0.06]">
          <Headphones className="h-7 w-7 text-vibe-primary" aria-hidden="true" />
        </div>

        <div>
          <h3 className="text-xl font-bold text-chalk sm:text-2xl">
            Seu historico ainda esta em branco
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-chalk-muted">
            O Soundscape precisa de algumas semanas de escuta para montar seu perfil. O Spotify
            ainda nao tem dados suficientes na sua conta para calcular top artistas e top musicas.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-chalk-muted">
            Ouca algumas playlists, volte em alguns dias e a analise vai estar pronta.
          </p>
        </div>

        <ExternalButtonLink href="https://open.spotify.com" variant="primary">
          Ouvir algo agora
        </ExternalButtonLink>
      </div>
    </Card>
  );
}

/** Aviso discreto: as features sonoras vieram estimadas. */
export function EstimatedFeaturesNotice({ className }: { className?: string }): JSX.Element {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-accent-amber/20 bg-accent-amber/[0.07] px-4 py-3',
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-amber" aria-hidden="true" />
      <p className="text-xs leading-relaxed text-chalk-soft">
        <span className="font-semibold text-accent-amber">Valores estimados.</span> A Spotify API
        nao liberou as metricas de audio para este app, entao energia, positividade e dancabilidade
        foram calculadas a partir de genero, popularidade e duracao. As listas de artistas, musicas
        e generos continuam sendo dados reais.
      </p>
    </div>
  );
}
