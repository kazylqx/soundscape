import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useMusicStore } from '@/stores/musicStore';
import { ApiError } from '@/api/client';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/layout/Layout';

/**
 * Retorno do OAuth do Spotify.
 *
 * O Spotify redireciona para ca com `?code=...&state=...` (ou `?error=...`).
 * Trocamos o code por uma sessao no backend e ja disparamos a coleta do
 * snapshot, para o dashboard abrir com dados prontos.
 */

const STEPS = [
  'Confirmando o aperto de mao com o Spotify...',
  'Trazendo seus artistas favoritos...',
  'Contando quantas vezes voce repetiu aquela musica...',
  'Medindo energia, positividade e BPM...',
  'Separando seus generos em camadas...',
  'Montando o seu perfil...',
];

export function Callback(): JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const completeLogin = useAuthStore((state) => state.completeLogin);
  const loadSnapshot = useMusicStore((state) => state.loadSnapshot);

  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [done, setDone] = useState(false);

  // O React 18 monta duas vezes em dev: o code do Spotify e de uso unico.
  const started = useRef(false);

  /* ---------- mensagens rotativas ---------- */
  useEffect(() => {
    if (error || done) return;
    const timer = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % STEPS.length);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [error, done]);

  /* ---------- troca do code pela sessao ---------- */
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const spotifyError = searchParams.get('error');

    if (spotifyError) {
      setError({
        code: spotifyError,
        message:
          spotifyError === 'access_denied'
            ? 'Voce recusou a conexao com o Spotify. Sem essa autorizacao nao conseguimos ler seu historico.'
            : `O Spotify recusou a autorizacao (${spotifyError}).`,
      });
      return;
    }

    if (!code) {
      setError({
        code: 'CODE_MISSING',
        message:
          'Esta pagina precisa do codigo de autorizacao do Spotify. Volte ao inicio e conecte novamente.',
      });
      return;
    }

    void (async () => {
      try {
        await completeLogin(code, state);
        setDone(true);

        // Comeca a coleta em paralelo — o dashboard ja encontra o cache quente.
        void loadSnapshot();

        // Pequena pausa para o usuario ver a confirmacao.
        window.setTimeout(() => navigate('/dashboard', { replace: true }), 900);
      } catch (caught) {
        const apiError = caught instanceof ApiError ? caught : null;
        setError({
          code: apiError?.code ?? 'UNKNOWN',
          message:
            apiError?.message ??
            'Nao conseguimos concluir o login. Tente novamente em alguns instantes.',
        });
      }
    })();
  }, [searchParams, completeLogin, loadSnapshot, navigate]);

  /* ---------- erro ---------- */
  if (error) {
    return (
      <div className="flex min-h-screen items-center bg-ink-950">
        <Container size="narrow">
          <Card tone="raised" className="text-center">
            <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </span>

            <h1 className="text-2xl font-extrabold text-chalk">Nao deu para entrar</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-chalk-muted">
              {error.message}
            </p>

            <p className="mt-4 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-chalk-faint">
              codigo: {error.code}
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink to="/">Voltar ao inicio</ButtonLink>
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Tentar de novo
              </Button>
            </div>
          </Card>
        </Container>
      </div>
    );
  }

  /* ---------- loading / sucesso ---------- */
  return (
    <div className="relative flex min-h-screen items-center overflow-hidden bg-ink-950">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 40%, rgb(30 215 96 / 0.14), transparent 65%)',
        }}
      />

      <Container size="narrow" className="relative z-10">
        <div className="flex flex-col items-center text-center">
          {/* Visualizador */}
          <div className="mb-10 flex items-end gap-1.5" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5, 6].map((index) => (
              <motion.span
                key={index}
                className="w-2 origin-bottom rounded-full"
                style={{
                  background: 'linear-gradient(180deg, #1ed760, #8b5cf6)',
                  height: 48,
                }}
                animate={
                  done
                    ? { scaleY: 0.25 }
                    : { scaleY: [0.25, 1, 0.4, 0.85, 0.25] }
                }
                transition={
                  done
                    ? { duration: 0.4 }
                    : {
                        duration: 1.4,
                        repeat: Infinity,
                        delay: index * 0.1,
                        ease: 'easeInOut',
                      }
                }
              />
            ))}
          </div>

          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center"
            >
              <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-spotify-bright text-ink-950">
                <Check className="h-7 w-7" strokeWidth={3} aria-hidden="true" />
              </span>
              <h1 className="text-2xl font-extrabold text-chalk sm:text-3xl">Conectado</h1>
              <p className="mt-2 text-sm text-chalk-muted">Levando voce para o dashboard...</p>
            </motion.div>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold text-chalk sm:text-display-md">
                Lendo o seu <span className="text-gradient-spotify">soundscape</span>
              </h1>

              <div className="mt-6 h-12 w-full max-w-md">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={stepIndex}
                    className="text-sm text-chalk-muted sm:text-base"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.35 }}
                    role="status"
                    aria-live="polite"
                  >
                    {STEPS[stepIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Barra indeterminada */}
              <div className="mt-4 h-1 w-full max-w-xs overflow-hidden rounded-full bg-white/[0.07]">
                <motion.div
                  className="h-full w-1/3 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #1ed760, #8b5cf6, #ec4899)' }}
                  animate={{ x: ['-100%', '300%'] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>

              <p className="mt-8 max-w-sm text-xs leading-relaxed text-chalk-faint">
                A primeira coleta faz varias chamadas na Spotify API. Pode levar alguns segundos —
                depois disso tudo fica em cache na sua sessao.
              </p>
            </>
          )}
        </div>
      </Container>
    </div>
  );
}
