import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Brain,
  CalendarClock,
  Image,
  Music2,
  Palette,
  Users,
} from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/layout/Layout';
import { Footer } from '@/components/layout/Footer';
import { ParticleField } from '@/components/animations/ParticleField';
import { Reveal, Stagger, StaggerItem } from '@/components/animations/Reveal';
import { AnimatedCounter } from '@/components/animations/AnimatedCounter';

/**
 * Landing publica.
 * Sem dados reais: o mockup usa numeros ficticios para mostrar o resultado
 * sem prometer nada que o app nao entregue.
 */

/* ============================================================
 * Conteudo
 * ============================================================ */

const FEATURES = [
  {
    icon: <Brain className="h-5 w-5" aria-hidden="true" />,
    title: 'Persona musical por IA',
    description:
      'Uma leitura escrita sobre quem voce e como ouvinte: arquetipo, biografia, traco oculto e a frase que resume tudo.',
    accent: 'text-accent-violet',
  },
  {
    icon: <BarChart3 className="h-5 w-5" aria-hidden="true" />,
    title: 'Analise sonora completa',
    description:
      'Radar de energia, positividade, dancabilidade e acustica comparado ao ouvinte medio. Mais mapa de generos e BPM.',
    accent: 'text-spotify-bright',
  },
  {
    icon: <Palette className="h-5 w-5" aria-hidden="true" />,
    title: 'Identidade visual unica',
    description:
      'As cores do seu perfil sao extraidas das capas que voce mais ouve. Cada perfil tem uma paleta propria.',
    accent: 'text-accent-pink',
  },
  {
    icon: <CalendarClock className="h-5 w-5" aria-hidden="true" />,
    title: 'Eras e padroes',
    description:
      'De que decada e o seu ouvido, em que horario a musica te encontra e como seu gosto mudou nos ultimos meses.',
    accent: 'text-accent-orange',
  },
  {
    icon: <Image className="h-5 w-5" aria-hidden="true" />,
    title: 'Cards para compartilhar',
    description:
      'Oito cards em tres temas, nos formatos Stories e Post. Baixa em PNG e vai direto para o feed.',
    accent: 'text-accent-cyan',
  },
  {
    icon: <Users className="h-5 w-5" aria-hidden="true" />,
    title: 'Comparar com amigos',
    description:
      'Gere um link, seu amigo conecta o Spotify e voces descobrem a compatibilidade real entre os gostos.',
    accent: 'text-accent-amber',
  },
];

/** Dados ficticios do mockup — deixamos explicito na UI. */
const MOCK = {
  name: 'Ana Vitoria',
  headline: 'Melancolia dancante com sotaque de madrugada',
  persona: 'O Explorador Noturno',
  moodBoard: ['noturno', 'eletrico', 'saudade', 'sintetico', 'insone'],
  genres: [
    { name: 'Indie Pop', value: 28 },
    { name: 'Synthwave', value: 21 },
    { name: 'Bedroom Pop', value: 16 },
    { name: 'MPB', value: 11 },
  ],
  features: [
    { label: 'Energia', value: 0.78 },
    { label: 'Positividade', value: 0.34 },
    { label: 'Dancabilidade', value: 0.71 },
    { label: 'Acustica', value: 0.19 },
  ],
  stats: [
    { label: 'artistas', value: 214 },
    { label: 'generos', value: 31 },
    { label: 'pico', value: '02h' },
  ],
};

/* ============================================================
 * Pagina
 * ============================================================ */

export function Landing(): JSX.Element {
  const { login, isAuthenticated, error, isLoading } = useAuth();
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await login();
      // Em caso de sucesso o browser sai da pagina (redirect ao Spotify).
    } catch {
      setConnecting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ink-950">
      {/* ---------- Hero ---------- */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden pb-16 pt-24">
        <div
          className="pointer-events-none absolute inset-0 bg-grid-faint bg-grid opacity-40"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[42rem]"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 25% 8%, rgb(30 215 96 / 0.16), transparent 62%), radial-gradient(ellipse 60% 50% at 82% 22%, rgb(139 92 246 / 0.18), transparent 60%), radial-gradient(ellipse 70% 45% at 55% 90%, rgb(236 72 153 / 0.12), transparent 65%)',
          }}
        />
        <ParticleField count={38} />

        <Container className="relative z-10">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-10">
            {/* Texto */}
            <div>
              <motion.div
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] py-1.5 pl-2 pr-3.5 backdrop-blur-sm"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-spotify-bright">
                  <Music2 className="h-3 w-3 text-ink-950" aria-hidden="true" />
                </span>
                <span className="text-xs font-medium text-chalk-soft">
                  Conecta com o seu Spotify · Free ou Premium
                </span>
              </motion.div>

              <h1 className="text-display-xl font-extrabold">
                <motion.span
                  className="block text-chalk"
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                >
                  Seu gosto
                </motion.span>
                <motion.span
                  className="block text-gradient-spotify"
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                >
                  em voz alta.
                </motion.span>
              </h1>

              <motion.p
                className="mt-6 max-w-xl text-base leading-relaxed text-chalk-muted sm:text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.3 }}
              >
                O Soundscape le o seu historico do Spotify e devolve um perfil musical completo:
                persona escrita por IA, analise sonora, mapa de generos, eras, padroes de escuta e
                cards prontos para compartilhar.
              </motion.p>

              <motion.div
                className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.42 }}
              >
                {isAuthenticated ? (
                  <ButtonLink
                    to="/dashboard"
                    size="lg"
                    iconRight={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
                  >
                    Ver meu perfil
                  </ButtonLink>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => void handleConnect()}
                    loading={connecting || isLoading}
                    iconLeft={
                      connecting ? undefined : <Music2 className="h-4 w-4" aria-hidden="true" />
                    }
                  >
                    Conectar Spotify
                  </Button>
                )}

                <a
                  href="#como-funciona"
                  className="inline-flex h-14 items-center justify-center rounded-full px-6 text-sm font-semibold text-chalk-muted transition-colors hover:text-chalk"
                >
                  Ver o que voce recebe
                </a>
              </motion.div>

              {error ? (
                <p className="mt-5 text-sm text-red-400" role="alert">
                  {error}
                </p>
              ) : null}

              <p className="mt-6 max-w-md text-xs leading-relaxed text-chalk-faint">
                Somente leitura. O Soundscape nao publica nada, nao altera suas playlists e nao
                guarda seus dados em banco — a analise acontece na hora e vive apenas na sua sessao.
              </p>
            </div>

            {/* Mockup */}
            <Reveal direction="left" delay={0.3} className="relative">
              <MockProfile />
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ---------- Features ---------- */}
      <section id="como-funciona" className="relative py-20 sm:py-28">
        <Container>
          <Reveal>
            <p className="mb-3 font-mono text-[0.6875rem] uppercase tracking-[0.24em] text-spotify-bright">
              o que voce recebe
            </p>
            <h2 className="max-w-3xl text-display-md font-extrabold text-chalk">
              Seis leituras sobre a mesma pessoa: voce.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-chalk-muted sm:text-base">
              Cada secao usa dados reais da sua conta. Nada de horoscopo — se uma frase serviria
              para qualquer pessoa, ela nao entra no seu perfil.
            </p>
          </Reveal>

          <Stagger className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <StaggerItem key={feature.title}>
                <Card interactive className="h-full">
                  <span
                    className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] ${feature.accent}`}
                  >
                    {feature.icon}
                  </span>
                  <h3 className="text-base font-semibold text-chalk">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-chalk-muted">
                    {feature.description}
                  </p>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </Container>
      </section>

      {/* ---------- Como funciona ---------- */}
      <section className="relative py-16 sm:py-20">
        <Container size="narrow">
          <Reveal>
            <Card tone="raised" className="text-center">
              <p className="font-mono text-[0.6875rem] uppercase tracking-[0.24em] text-chalk-muted">
                tres passos
              </p>
              <h2 className="mt-3 text-2xl font-extrabold text-chalk sm:text-3xl">
                Do login ao perfil em menos de um minuto
              </h2>

              <ol className="mt-9 grid gap-6 text-left sm:grid-cols-3">
                {[
                  {
                    step: '01',
                    title: 'Conecte',
                    text: 'Autorize a leitura no Spotify. Nenhuma permissao de escrita e solicitada.',
                  },
                  {
                    step: '02',
                    title: 'Aguarde a coleta',
                    text: 'Buscamos top artistas, musicas, playlists, historico e metricas de audio.',
                  },
                  {
                    step: '03',
                    title: 'Leia e compartilhe',
                    text: 'A IA escreve o seu perfil e voce baixa os cards prontos para os Stories.',
                  },
                ].map((item) => (
                  <li key={item.step}>
                    <span className="font-mono text-2xl font-bold text-vibe-primary">
                      {item.step}
                    </span>
                    <h3 className="mt-2 text-base font-semibold text-chalk">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-chalk-muted">{item.text}</p>
                  </li>
                ))}
              </ol>

              <div className="mt-10 flex justify-center">
                {isAuthenticated ? (
                  <ButtonLink to="/dashboard" size="lg">
                    Abrir meu dashboard
                  </ButtonLink>
                ) : (
                  <Button size="lg" onClick={() => void handleConnect()} loading={connecting}>
                    Conectar Spotify
                  </Button>
                )}
              </div>
            </Card>
          </Reveal>
        </Container>
      </section>

      <Footer />
    </div>
  );
}

/* ============================================================
 * Mockup do perfil (dados ficticios)
 * ============================================================ */

function MockProfile(): JSX.Element {
  const [tick, setTick] = useState(0);

  // Alterna o destaque para dar vida ao mockup.
  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 2600);
    return () => window.clearInterval(timer);
  }, []);

  const highlighted = tick % MOCK.genres.length;

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div
        className="absolute -inset-6 rounded-[2.5rem] opacity-60 blur-2xl"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(140deg, rgb(30 215 96 / 0.3), rgb(139 92 246 / 0.3), rgb(236 72 153 / 0.25))',
        }}
      />

      <motion.div
        className="glass-strong relative overflow-hidden rounded-[2rem] p-5"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="h-9 w-9 rounded-full"
              style={{ background: 'linear-gradient(135deg, #1ed760, #8b5cf6)' }}
              aria-hidden="true"
            />
            <div>
              <p className="font-mono text-[0.5625rem] uppercase tracking-[0.2em] text-chalk-faint">
                exemplo
              </p>
              <p className="text-sm font-semibold text-chalk">{MOCK.name}</p>
            </div>
          </div>
          <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[0.5625rem] uppercase tracking-wider text-chalk-faint">
            demo
          </span>
        </div>

        <h3 className="font-display text-xl font-extrabold leading-tight text-chalk">
          {MOCK.headline}
        </h3>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent-violet/30 bg-accent-violet/10 px-3 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-violet" aria-hidden="true" />
          <span className="text-xs font-medium text-accent-violet">{MOCK.persona}</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {MOCK.moodBoard.map((word) => (
            <span
              key={word}
              className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[0.6875rem] text-chalk-soft"
            >
              {word}
            </span>
          ))}
        </div>

        <div className="mt-5 space-y-2.5">
          {MOCK.features.map((feature, index) => (
            <div key={feature.label}>
              <div className="mb-1 flex justify-between text-[0.6875rem]">
                <span className="text-chalk-muted">{feature.label}</span>
                <span className="font-mono tabular text-chalk-faint">
                  {Math.round(feature.value * 100)}%
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.07]">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #1ed760, #8b5cf6)',
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${feature.value * 100}%` }}
                  transition={{ duration: 1.1, delay: 0.5 + index * 0.12 }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {MOCK.genres.map((genre, index) => (
            <motion.div
              key={genre.name}
              className="rounded-xl border px-3 py-2"
              animate={{
                borderColor:
                  index === highlighted ? 'rgb(30 215 96 / 0.45)' : 'rgb(255 255 255 / 0.07)',
                backgroundColor:
                  index === highlighted ? 'rgb(30 215 96 / 0.08)' : 'rgb(255 255 255 / 0.02)',
              }}
              transition={{ duration: 0.6 }}
            >
              <p className="truncate text-xs font-medium text-chalk">{genre.name}</p>
              <p className="font-mono text-[0.625rem] tabular text-chalk-faint">{genre.value}%</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-white/[0.07] pt-4">
          {MOCK.stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-lg font-extrabold text-chalk">
                {typeof stat.value === 'number' ? (
                  <AnimatedCounter value={stat.value} />
                ) : (
                  stat.value
                )}
              </p>
              <p className="font-mono text-[0.5625rem] uppercase tracking-[0.16em] text-chalk-faint">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
