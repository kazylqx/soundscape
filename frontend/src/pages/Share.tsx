import { useRef, useState } from 'react';
import { Check, Download, Loader2, Share as ShareIcon } from 'lucide-react';
import { useMusicData } from '@/hooks/useMusicData';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { useTheme } from '@/hooks/useTheme';
import { Card, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { ErrorState, NotEnoughDataState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Skeleton';
import { Container } from '@/components/layout/Layout';
import { Reveal } from '@/components/animations/Reveal';
import { CARD_SIZES } from '@/components/cards/CardFrame';
import { SHARE_CARDS, ShareCard } from '@/components/cards/ShareCard';
import { canShareFiles, downloadCardAsPng, shareCard } from '@/utils/exportCard';
import { cn } from '@/components/ui/cn';
import type { CardFormat, CardTheme, ShareCardId } from '@/types';

/**
 * Gerador de cards.
 *
 * O card visivel e exatamente o node capturado pelo html2canvas, o que
 * garante que o PNG saia igual ao preview. A escala de export e 3x
 * (story = 1080x1920, post = 1200x1200).
 */

const THEMES: Array<{ value: CardTheme; label: string }> = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'vibe', label: 'Vibe' },
];

const FORMATS: Array<{ value: CardFormat; label: string }> = [
  { value: 'story', label: 'Stories 9:16' },
  { value: 'post', label: 'Post 1:1' },
];

export function Share(): JSX.Element {
  const { snapshot, metrics, isLoading, error, notEnoughData, refresh } = useMusicData();
  const { profile } = useAIAnalysis({ autoLoad: Boolean(snapshot?.meta.hasEnoughData) });
  const { palette } = useTheme();

  const [cardId, setCardId] = useState<ShareCardId>('profile');
  const [theme, setTheme] = useState<CardTheme>('dark');
  const [format, setFormat] = useState<CardFormat>('story');
  const [busy, setBusy] = useState<'download' | 'share' | null>(null);
  const [done, setDone] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const shareSupported = canShareFiles();

  const fileName = `soundscape-${cardId}-${format}`;

  const handleDownload = async () => {
    setBusy('download');
    setExportError(null);
    try {
      await downloadCardAsPng(cardRef.current, {
        fileName,
        scale: 3,
        background: theme === 'light' ? '#f4f4f5' : '#050506',
      });
      setDone(true);
      window.setTimeout(() => setDone(false), 2200);
    } catch {
      setExportError(
        'Nao foi possivel gerar o PNG. Se alguma imagem do Spotify falhou em carregar, recarregue a pagina e tente de novo.',
      );
    } finally {
      setBusy(null);
    }
  };

  const handleShare = async () => {
    setBusy('share');
    setExportError(null);
    try {
      const shared = await shareCard(cardRef.current, {
        fileName,
        scale: 3,
        background: theme === 'light' ? '#f4f4f5' : '#050506',
        title: 'Meu perfil musical no Soundscape',
        text: profile?.shareableQuote ?? 'Meu perfil musical, decodificado por IA.',
      });
      if (!shared) await handleDownload();
    } catch {
      setExportError('O compartilhamento nativo falhou. Tente baixar o PNG.');
    } finally {
      setBusy(null);
    }
  };

  if (error && !snapshot) {
    return (
      <Container className="py-10">
        <ErrorState message={error} onRetry={() => void refresh()} retrying={isLoading} />
      </Container>
    );
  }

  if (notEnoughData) {
    return (
      <Container className="py-10">
        <NotEnoughDataState />
      </Container>
    );
  }

  if (isLoading || !snapshot || !metrics) {
    return (
      <Container className="py-10">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <Skeleton className="h-96" rounded="lg" />
          <Skeleton className="h-[640px]" rounded="lg" />
        </div>
      </Container>
    );
  }

  const size = CARD_SIZES[format];

  return (
    <Container className="py-10">
      <SectionTitle
        overline="Compartilhar"
        title="Seus cards, prontos para o feed"
        description="Oito modelos, tres temas e dois formatos. O tema Vibe usa a paleta extraida das suas capas."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(280px,340px)_1fr]">
        {/* ---------- Controles ---------- */}
        <div className="flex flex-col gap-5">
          <Reveal>
            <Card>
              <p className="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                modelo
              </p>

              <div className="space-y-2">
                {SHARE_CARDS.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setCardId(card.id)}
                    aria-pressed={cardId === card.id}
                    className={cn(
                      'w-full rounded-2xl border px-4 py-3 text-left transition-all',
                      cardId === card.id
                        ? 'border-vibe-primary/45 bg-vibe-primary/[0.08]'
                        : 'border-white/[0.07] bg-white/[0.02] hover:border-white/20',
                    )}
                  >
                    <p className="text-sm font-semibold text-chalk">{card.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-chalk-muted">
                      {card.description}
                    </p>
                  </button>
                ))}
              </div>
            </Card>
          </Reveal>

          <Reveal delay={0.08}>
            <Card>
              <p className="mb-3 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                tema
              </p>
              <Tabs items={THEMES} value={theme} onChange={setTheme} layoutId="card-theme" />

              <p className="mb-3 mt-6 font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                formato
              </p>
              <Tabs items={FORMATS} value={format} onChange={setFormat} layoutId="card-format" />

              <div className="mt-6 flex flex-col gap-2">
                <Button
                  onClick={() => void handleDownload()}
                  loading={busy === 'download'}
                  fullWidth
                  iconLeft={
                    done ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Download className="h-4 w-4" aria-hidden="true" />
                    )
                  }
                >
                  {done ? 'PNG baixado' : 'Baixar PNG'}
                </Button>

                {shareSupported ? (
                  <Button
                    variant="secondary"
                    onClick={() => void handleShare()}
                    loading={busy === 'share'}
                    fullWidth
                    iconLeft={<ShareIcon className="h-4 w-4" aria-hidden="true" />}
                  >
                    Compartilhar
                  </Button>
                ) : null}
              </div>

              <p className="mt-3 text-center font-mono text-[0.625rem] text-chalk-faint">
                {size.width * 3} x {size.height * 3} px
              </p>

              {exportError ? (
                <p className="mt-3 text-xs leading-relaxed text-red-400" role="alert">
                  {exportError}
                </p>
              ) : null}
            </Card>
          </Reveal>
        </div>

        {/* ---------- Preview ---------- */}
        <Reveal delay={0.12} direction="none">
          <div className="flex flex-col items-center gap-5">
            <div className="flex w-full items-center justify-between">
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                pre-visualizacao
              </p>
              <p className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-chalk-faint">
                {size.label}
              </p>
            </div>

            {/* O wrapper tem overflow visivel para o card nao ser cortado no mobile */}
            <div className="w-full overflow-x-auto">
              <div className="flex min-h-[420px] items-center justify-center py-2">
                <div
                  className="shadow-glow"
                  style={{ borderRadius: 24, width: size.width, flexShrink: 0 }}
                >
                  <ShareCard
                    ref={cardRef}
                    cardId={cardId}
                    theme={theme}
                    format={format}
                    snapshot={snapshot}
                    metrics={metrics}
                    profile={profile}
                    palette={palette}
                  />
                </div>
              </div>
            </div>

            {!profile ? (
              <p className="flex items-center gap-2 text-xs text-chalk-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                A analise de IA ainda esta sendo gerada — os cards de texto vao melhorar quando ela
                terminar.
              </p>
            ) : null}

            <p className="max-w-md text-center text-xs leading-relaxed text-chalk-faint">
              As imagens vem direto do CDN do Spotify. Se alguma capa nao aparecer no PNG, recarregue
              a pagina para que ela seja baixada com permissao de leitura no canvas.
            </p>
          </div>
        </Reveal>
      </div>
    </Container>
  );
}
