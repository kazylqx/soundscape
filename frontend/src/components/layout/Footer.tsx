import { Link } from 'react-router-dom';
import { Github, Music4 } from 'lucide-react';

/**
 * Footer com creditos.
 * O aviso sobre a Spotify AB e uma exigencia dos termos de uso da API.
 */

export function Footer(): JSX.Element {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/[0.06] px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <span className="flex items-end gap-[3px]" aria-hidden="true">
                {[10, 18, 14, 22].map((height, index) => (
                  <span
                    key={index}
                    className="w-[3px] rounded-full bg-vibe-gradient"
                    style={{ height }}
                  />
                ))}
              </span>
              <span className="font-display text-lg font-extrabold text-chalk">Soundscape</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-chalk-muted">
              Seu gosto musical, lido em voz alta. Perfil, analise sonora e cards para compartilhar,
              montados a partir do seu historico no Spotify.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm sm:grid-cols-3" aria-label="Rodape">
            <Link to="/profile" className="text-chalk-muted transition-colors hover:text-chalk">
              Perfil musical
            </Link>
            <Link to="/recommendations" className="text-chalk-muted transition-colors hover:text-chalk">
              Recomendacoes
            </Link>
            <Link to="/moods" className="text-chalk-muted transition-colors hover:text-chalk">
              Moods
            </Link>
            <Link to="/decades" className="text-chalk-muted transition-colors hover:text-chalk">
              Decadas
            </Link>
            <Link to="/share" className="text-chalk-muted transition-colors hover:text-chalk">
              Cards
            </Link>
            <Link to="/compare" className="text-chalk-muted transition-colors hover:text-chalk">
              Comparar
            </Link>
          </nav>
        </div>

        <div className="rule my-8" />

        <div className="flex flex-col gap-4 text-xs text-chalk-faint sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Soundscape. Feito com dados reais e nenhuma bola de cristal.</p>

          <div className="flex items-center gap-4">
            <a
              href="https://developer.spotify.com/documentation/web-api"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-chalk-muted"
            >
              <Music4 className="h-3.5 w-3.5" aria-hidden="true" />
              Spotify Web API
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 transition-colors hover:text-chalk-muted"
            >
              <Github className="h-3.5 w-3.5" aria-hidden="true" />
              Codigo
            </a>
          </div>
        </div>

        <p className="mt-6 text-[0.6875rem] leading-relaxed text-chalk-faint">
          Soundscape nao e afiliado ao Spotify. Spotify e uma marca registrada da Spotify AB. Os
          dados exibidos vem da sua propria conta, sao processados no momento da consulta e nao
          ficam armazenados em banco de dados.
        </p>
      </div>
    </footer>
  );
}
