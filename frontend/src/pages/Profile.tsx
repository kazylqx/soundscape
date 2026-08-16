import { ArrowRight, Share2 } from 'lucide-react';
import { useMusicData } from '@/hooks/useMusicData';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { useTheme } from '@/hooks/useTheme';
import { Container } from '@/components/layout/Layout';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState, NotEnoughDataState } from '@/components/ui/States';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { Reveal } from '@/components/animations/Reveal';
import {
  AICuriosities,
  ErasSection,
  GenresSection,
  IdentitySection,
  PatternSection,
  ProfileHero,
  SonicAnalysis,
  TopCharts,
} from '@/components/profile';

/**
 * Perfil musical completo.
 *
 * Pagina de scroll longo, montada em secoes independentes. Cada secao recebe
 * apenas o que precisa (snapshot, metricas ou perfil de IA), o que mantem a
 * composicao legivel e evita re-render em cascata.
 */

export function Profile(): JSX.Element {
  const { snapshot, metrics, isLoading, error, notEnoughData, featuresAreEstimated, refresh } =
    useMusicData();

  const {
    profile,
    isLoading: aiLoading,
    error: aiError,
    loadingMessage,
    isFallback,
    regenerate,
  } = useAIAnalysis({ autoLoad: Boolean(snapshot?.meta.hasEnoughData) });

  const { palette } = useTheme();

  /* ---------- erro ---------- */
  if (error && !snapshot) {
    return (
      <Container className="py-24">
        <ErrorState
          title="Nao conseguimos montar seu perfil"
          message={error}
          onRetry={() => void refresh()}
          retrying={isLoading}
        />
      </Container>
    );
  }

  /* ---------- sem historico ---------- */
  if (notEnoughData && snapshot) {
    return (
      <Container className="py-24">
        <NotEnoughDataState />
      </Container>
    );
  }

  /* ---------- loading ---------- */
  if (isLoading || !snapshot || !metrics) {
    return (
      <Container className="py-24">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20" rounded="full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32" rounded="sm" />
              <Skeleton className="h-8 w-64" rounded="sm" />
            </div>
          </div>

          <Skeleton className="h-16 w-full" rounded="sm" />
          <Skeleton className="h-16 w-4/5" rounded="sm" />

          <div className="mt-6 flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-24" rounded="full" />
            ))}
          </div>

          <Card className="mt-8">
            <SkeletonText lines={5} />
          </Card>
        </div>
      </Container>
    );
  }

  return (
    <>
      <ProfileHero
        user={snapshot.user}
        metrics={metrics}
        profile={profile}
        palette={palette}
        aiLoading={aiLoading}
      />

      {aiError && !profile ? (
        <Container>
          <ErrorState
            title="A analise de IA falhou"
            message={aiError}
            onRetry={() => void regenerate()}
            retrying={aiLoading}
          />
        </Container>
      ) : null}

      <IdentitySection
        profile={profile}
        metrics={metrics}
        loading={aiLoading}
        isFallback={isFallback}
        loadingMessage={loadingMessage}
        onRegenerate={() => void regenerate()}
      />

      <div className="rule" />

      <TopCharts snapshot={snapshot} />

      <div className="rule" />

      <SonicAnalysis metrics={metrics} estimated={featuresAreEstimated} />

      <div className="rule" />

      <GenresSection metrics={metrics} />

      <div className="rule" />

      <ErasSection metrics={metrics} />

      <div className="rule" />

      <PatternSection metrics={metrics} sampleSize={snapshot.recentlyPlayed.length} />

      <div className="rule" />

      <AICuriosities profile={profile} loading={aiLoading} />

      {/* ---------- CTA final ---------- */}
      <Container className="pb-8">
        <Reveal>
          <Card tone="vibe" className="relative overflow-hidden text-center">
            <div
              className="pointer-events-none absolute inset-0 opacity-60"
              aria-hidden="true"
              style={{
                background:
                  'radial-gradient(ellipse 70% 90% at 50% 0%, color-mix(in srgb, var(--vibe-primary) 16%, transparent), transparent 65%)',
              }}
            />

            <div className="relative">
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.24em] text-chalk-muted">
                proximo passo
              </p>
              <h2 className="mx-auto mt-3 max-w-xl font-display text-2xl font-extrabold text-chalk sm:text-3xl">
                Transforme esse perfil em card e joga no feed
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-chalk-muted">
                Oito modelos, tres temas de cor e dois formatos. A paleta usada e a mesma extraida
                das suas capas.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <ButtonLink
                  to="/share"
                  size="lg"
                  iconLeft={<Share2 className="h-4 w-4" aria-hidden="true" />}
                >
                  Gerar meus cards
                </ButtonLink>
                <ButtonLink
                  to="/recommendations"
                  variant="secondary"
                  size="lg"
                  iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
                >
                  Ver recomendacoes
                </ButtonLink>
              </div>
            </div>
          </Card>
        </Reveal>
      </Container>
    </>
  );
}
