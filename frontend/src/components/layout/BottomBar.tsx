import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MoreHorizontal, X } from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { NAV_ITEMS, PRIMARY_NAV_ITEMS } from './navItems';

/**
 * Navegacao mobile: barra fixa no rodape com icones.
 * Os itens que nao cabem entram no menu "Mais".
 */

export function BottomBar(): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);

  const secondaryItems = NAV_ITEMS.filter((item) => !item.primary);

  return (
    <>
      <AnimatePresence>
        {menuOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Fechar menu"
              className="fixed inset-0 z-40 bg-ink-950/70 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />

            <motion.div
              className="glass-strong fixed inset-x-3 bottom-[calc(var(--bottom-bar-height)+0.75rem)] z-50 rounded-3xl p-3 md:hidden"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            >
              <div className="mb-2 flex items-center justify-between px-2">
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-chalk-faint">
                  Mais secoes
                </span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Fechar menu"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-chalk-muted hover:bg-white/[0.08]"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {secondaryItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition-colors',
                        isActive
                          ? 'border-vibe-primary/40 bg-vibe-primary/10 text-chalk'
                          : 'border-white/[0.07] bg-white/[0.03] text-chalk-soft hover:border-white/20',
                      )
                    }
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <nav
        className="glass-strong fixed inset-x-0 bottom-0 z-40 border-t border-white/10 pb-[env(safe-area-inset-bottom)] md:hidden"
        style={{ minHeight: 'var(--bottom-bar-height)' }}
        aria-label="Navegacao principal"
      >
        <ul className="flex h-[var(--bottom-bar-height)] items-stretch">
          {PRIMARY_NAV_ITEMS.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex h-full flex-col items-center justify-center gap-1 text-[0.625rem] font-medium transition-colors',
                    isActive ? 'text-vibe-primary' : 'text-chalk-muted',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      {item.icon}
                      {isActive ? (
                        <motion.span
                          layoutId="bottom-bar-dot"
                          className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-vibe-primary"
                        />
                      ) : null}
                    </span>
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}

          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label="Mais secoes"
              className={cn(
                'flex h-full w-full flex-col items-center justify-center gap-1 text-[0.625rem] font-medium transition-colors',
                menuOpen ? 'text-vibe-primary' : 'text-chalk-muted',
              )}
            >
              <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
              Mais
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
