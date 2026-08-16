import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/components/ui/cn';

/**
 * Transicao de pagina: fade + leve deslize vertical.
 * Envolve o conteudo de cada rota (dentro do AnimatePresence do App).
 */

export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <motion.main
      className={cn(className)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.main>
  );
}
