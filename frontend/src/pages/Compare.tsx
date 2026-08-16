import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Copy, Link2, Share2, Users } from 'lucide-react';
import { ApiError, apiGet, apiPost } from '@/api/client';
import { useAuth } from '@/auth/useAuth';
import { useMusicData } from '@/hooks/useMusicData';
import { useTheme } from '@/hooks/useTheme';
import { Card, CardHeader, SectionTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CoverImage } from '@/components/ui/CoverImage';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Container } from '@/components/layout/Layout';
import { Reveal } from '@/components/animations/Reveal';
import { usePlayerStore } from '@/stores/playerStore';
import { ComparisonResult } from './compare/ComparisonResult';
import type { CompareLinkInfo, CompareResult } from '@/types';

/**
 * Comparacao entre dois perfis.
 *
 * Fluxo:
 *  1. o dono gera um link (POST /spotify/compare/link)
 *  2. o amigo abre /compare?code=..., conecta o Spotify (RequireAuth cuida disso)
 *  3. POST /spotify/compare/:code calcula a compatibilidade
 *
 * A comparacao exige que a sessao do dono ainda esteja viva na memoria do
 * backend. Se ela caiu, avisamos e pedimos um link novo.
 */

export function Compare(): JSX.Element {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');

  const { isAuthenticated } = useAuth();
  const { snapshot } = useMusicData();
  const { palette } = useTheme();
  const play = usePlayerStore((state) => state.play);

  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [creatingLink, setCreatingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  const [linkInfo, setLinkInfo] = useState<CompareLinkInfo | null>(null);
  const [comparison, setComparison] = useState<CompareResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------- gerar link ---------- */
  const createLink = useCallback(async () => {
    setCreatingLink(true);
    setError(null);
    try {
      const data = await apiPost<{ code: string; url: string }>('/spotify/compare/link');
      // Usamos a origem atual: o backend pode nao conhecer o dominio de preview.
      setLinkUrl(`${window.location.origin}/compare?code=${data.code}`);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Nao foi possivel gerar o link agora.');
    } finally {
      setCreatingLink(false);
    }
  }, []);

  const copyLink = async () => {
    if (!linkUrl) return;
    try {
      await navigator.clipboard.writeText(linkUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Nao conseguimos copiar automaticamente. Selecione o link e copie manualmente.');
    }
  };

  /* ---------- ler o link recebido ---------- */
  useEffect(() => {
    if (!code) return;

    void (async () => {
      try {
        const data = await apiGet<CompareLinkInfo>(`/spotify/compare/${code}`);
        setLinkInfo(data);
      } catch (caught) {
        setError(
          caught instanceof ApiError ? caught.message : 'Este link de comparacao nao pode ser lido.',
        );
      }
    })();
  }, [code]);

  /* ---------- rodar a comparacao ---------- */
  const runComparison = useCallback(async () => {
    if (!code) return;
    setRunning(true);
    setError(null);
    try {
      const data = await apiPost<{ comparison: CompareResult }>(`/spotify/compare/${code}`);
      setComparison(data.comparison);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'A comparacao falhou. Tente de novo.');
    } finally {
      setRunning(false);
    }
  }, [code]);

  /* Com sessao valida e link pronto, dispara sozinho. */
  useEffect(() => {
    if (code && isAuthenticated && linkInfo?.ready && !comparison && !running && !error) {
      void runComparison();
    }
  }, [code, isAuthenticated, linkInfo, comparison, running, error, runComparison]);

  const compatibilityLabel = useMemo(() => {
    if (!comparison) return '';
    const score = comparison.compatibility;
    if (score >= 80) return 'Almas gemeas sonoras';
    if (score >= 60) return 'Muita coisa em comum';
    if (score >= 40) return 'Territorios que se cruzam';
    if (score >= 20) return 'Gostos bem diferentes';
    return 'Universos opostos';
  }, [comparison]);

  const handlePlay = (track: CompareResult['suggestedPlaylist'][number]) => {
    if (!track.previewUrl) return;
    play({
      id: track.id,
      name: track.name,
      artist: track.artist,
      albumImage: track.albumImage,
      previewUrl: track.previewUrl,
      spotifyUrl: track.spotifyUrl,
    });
  };

  /* ============================================================
   * Convidado: chegou por um link
   * ============================================================ */
  if (code) {
    return (
      <Container className="py-10">
        <SectionTitle
          overline="Comparar"
          title={linkInfo ? `Voce x ${linkInfo.ownerName}` : 'Comparacao de perfis'}
          description="Cruzamos artistas, generos, assinatura sonora e eras musicais para chegar ao percentual de compatibilidade."
        />

        {error ? (
          <ErrorState
            title="Nao foi possivel comparar"
            message={error}
            onRetry={linkInfo?.ready ? () => void runComparison() : undefined}
            retrying={running}
          />
        ) : null}

        {!error && linkInfo && !linkInfo.ready ? (
          <EmptyState
            icon={<Users className="h-6 w-6" aria-hidden="true" />}
            title="A sessao de quem criou o link expirou"
            description="As sessoes do Soundscape vivem em memoria e caem quando o servidor reinicia. Peca um link novo para comparar."
          />
        ) : null}

        {!error && running ? (
          <Card tone="raised" className="flex flex-col items-center gap-5 py-16">
            <div className="flex items-end gap-1.5" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((index) => (
                <span
                  key={index}
                  className="h-10 w-2 origin-bottom rounded-full bg-vibe-gradient animate-bar-bounce"
                  style={{ animationDelay: `${index * 0.12}s` }}
                />
              ))}
            </div>
            <p className="text-sm text-chalk-muted" role="status" aria-live="polite">
              Cruzando os dois catalogos...
            </p>
          </Card>
        ) : null}

        {!error && !running && !comparison && linkInfo?.ready ? (
          <Card tone="raised" className="flex flex-col items-center gap-6 py-14 text-center">
            <div className="flex items-center gap-4">
              <CoverImage
                src={linkInfo.ownerImage}
                alt={linkInfo.ownerName}
                className="h-16 w-16"
                rounded="full"
              />
              <span className="font-display text-2xl font-extrabold text-chalk-faint">x</span>
              <CoverImage
                src={snapshot?.user.imageUrl ?? null}
                alt="Voce"
                className="h-16 w-16"
                rounded="full"
              />
            </div>

            <div className="max-w-md">
              <h2 className="text-xl font-bold text-chalk">
                {linkInfo.ownerName} quer comparar o gosto de voces
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-chalk-muted">
                Vamos ler o seu historico e cruzar com o dele. Nada e publicado nem salvo.
              </p>
            </div>

            <Button onClick={() => void runComparison()} loading={running} size="lg">
              Comparar agora
            </Button>
          </Card>
        ) : null}

        {comparison ? (
          <ComparisonResult
            comparison={comparison}
            label={compatibilityLabel}
            palette={palette}
            onPlay={handlePlay}
          />
        ) : null}
      </Container>
    );
  }

  /* ============================================================
   * Dono: gerar o link
   * ============================================================ */
  return (
    <Container className="py-10">
      <SectionTitle
        overline="Comparar com amigos"
        title="Quanto do seu gosto cabe no gosto de outra pessoa"
        description="Gere um link, mande para quem quiser e a comparacao aparece assim que a pessoa conectar o Spotify."
      />

      {error ? (
        <div className="mb-5">
          <ErrorState message={error} />
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Reveal>
          <Card tone="raised" className="h-full">
            <CardHeader
              title="Seu link de comparacao"
              subtitle="Vale por 7 dias enquanto a sua sessao estiver ativa"
              icon={<Link2 className="h-4 w-4" aria-hidden="true" />}
            />

            {linkUrl ? (
              <>
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-ink-950/60 p-3">
                  <code className="min-w-0 flex-1 truncate font-mono text-xs text-chalk-soft">
                    {linkUrl}
                  </code>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void copyLink()}
                    iconLeft={
                      copied ? (
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      )
                    }
                  >
                    {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void createLink()}
                    loading={creatingLink}
                  >
                    Gerar outro link
                  </Button>

                  {typeof navigator !== 'undefined' && 'share' in navigator ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      iconLeft={<Share2 className="h-3.5 w-3.5" aria-hidden="true" />}
                      onClick={() => {
                        void navigator
                          .share({
                            title: 'Vamos comparar nosso gosto musical?',
                            text: 'Conecta seu Spotify no Soundscape e ve nossa compatibilidade:',
                            url: linkUrl,
                          })
                          .catch(() => undefined);
                      }}
                    >
                      Compartilhar
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-start gap-4">
                <p className="text-sm leading-relaxed text-chalk-muted">
                  O link carrega apenas um codigo. Quem abrir precisa conectar o proprio Spotify —
                  ninguem ve os dados brutos do outro, so o resultado da comparacao.
                </p>
                <Button onClick={() => void createLink()} loading={creatingLink}>
                  Gerar meu link
                </Button>
              </div>
            )}
          </Card>
        </Reveal>

        <Reveal delay={0.08}>
          <Card tone="raised" className="h-full">
            <CardHeader title="Como funciona" subtitle="Tres passos, nenhum cadastro" />

            <ol className="space-y-5">
              {[
                {
                  step: '01',
                  title: 'Voce gera o link',
                  text: 'Seu perfil fica reservado no servidor enquanto a sessao estiver ativa.',
                },
                {
                  step: '02',
                  title: 'A pessoa conecta o Spotify',
                  text: 'Ela autoriza a leitura da propria conta, exatamente como voce fez.',
                },
                {
                  step: '03',
                  title: 'A compatibilidade aparece',
                  text: 'Artistas em comum, generos compartilhados, diferenças de gosto e uma playlist para ouvir juntos.',
                },
              ].map((item) => (
                <li key={item.step} className="flex gap-4">
                  <span className="font-mono text-lg font-bold text-vibe-primary">{item.step}</span>
                  <div>
                    <p className="text-sm font-semibold text-chalk">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-chalk-muted">{item.text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-6 border-t border-white/[0.06] pt-4 text-xs leading-relaxed text-chalk-faint">
              Como as sessoes ficam em memoria, um restart do servidor invalida os links abertos.
              Nesse caso basta gerar outro.
            </p>
          </Card>
        </Reveal>
      </div>
    </Container>
  );
}
