import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '@/auth/useAuth';
import { useMusicStore } from '@/stores/musicStore';
import { CoverImage } from '@/components/ui/CoverImage';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/components/ui/cn';
import { NAV_ITEMS } from './navItems';

/**
 * Navbar do desktop. No mobile a navegacao vira a BottomBar.
 * Ganha fundo opaco ao rolar para nao competir com o conteudo.
 */

export function Navbar(): JSX.Element {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  const loadSnapshot = useMusicStore((state) => state.loadSnapshot);
  const snapshotState = useMusicStore((state) => state.snapshotState);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled ? 'glass-strong border-b border-white/[0.07]' : 'bg-transparent',
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6" aria-label="Principal">
        <Link
          to="/dashboard"
          className="flex shrink-0 items-center gap-2.5"
          aria-label="Soundscape — inicio"
        >
          <span className="flex items-end gap-[3px]" aria-hidden="true">
            {[10, 18, 14, 22].map((height, index) => (
              <span
                key={index}
                className="w-[3px] rounded-full bg-vibe-gradient"
                style={{ height }}
              />
            ))}
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-chalk">
            Soundscape
          </span>
        </Link>

        {/* Links — a partir de lg para nao apertar no tablet */}
        <ul className="ml-4 hidden flex-1 items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-white/[0.09] text-chalk'
                      : 'text-chalk-muted hover:bg-white/[0.05] hover:text-chalk',
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <Tooltip content="Recarregar dados do Spotify" side="bottom">
            <button
              type="button"
              onClick={() => void loadSnapshot({ force: true })}
              disabled={snapshotState === 'loading'}
              aria-label="Recarregar dados do Spotify"
              className="flex h-9 w-9 items-center justify-center rounded-full text-chalk-muted transition-colors hover:bg-white/[0.08] hover:text-chalk disabled:opacity-40"
            >
              <RefreshCw
                className={cn('h-4 w-4', snapshotState === 'loading' && 'animate-spin')}
                aria-hidden="true"
              />
            </button>
          </Tooltip>

          {user ? (
            <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-1.5">
              <CoverImage
                src={user.imageUrl}
                alt={user.displayName}
                className="h-7 w-7"
                rounded="full"
              />
              <span className="hidden max-w-[9rem] truncate text-sm font-medium text-chalk sm:block">
                {user.displayName}
              </span>
              <Tooltip content="Sair" side="bottom">
                <button
                  type="button"
                  onClick={() => void logout()}
                  aria-label="Sair da conta"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-chalk-muted transition-colors hover:bg-white/[0.08] hover:text-red-400"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </Tooltip>
            </div>
          ) : null}
        </div>
      </nav>

      {/* Rota atual em telas medias, onde os links ficam escondidos */}
      <div className="border-t border-white/[0.05] px-4 py-2 lg:hidden">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-chalk-faint">
          {NAV_ITEMS.find((item) => item.to === location.pathname)?.label ?? 'Soundscape'}
        </p>
      </div>
    </header>
  );
}
