import { useRef, type ReactNode } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { cn } from '@/components/ui/cn';

/**
 * Entrada suave quando o elemento aparece na viewport.
 * `Reveal` para blocos isolados, `Stagger` + `StaggerItem` para listas.
 */

const EASE = [0.16, 1, 0.3, 1] as const;

export interface RevealProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  /** Distancia inicial em px. */
  offset?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  once?: boolean;
  className?: string;
}

export function Reveal({
  children,
  delay = 0,
  duration = 0.6,
  offset = 18,
  direction = 'up',
  once = true,
  className,
}: RevealProps): JSX.Element {
  const initial: Record<string, number> = { opacity: 0 };
  if (direction === 'up') initial.y = offset;
  if (direction === 'down') initial.y = -offset;
  if (direction === 'left') initial.x = offset;
  if (direction === 'right') initial.x = -offset;

  return (
    <motion.div
      className={cn(className)}
      initial={initial}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: '-60px' }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/* ============================================================
 * Stagger
 * ============================================================ */

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE },
  },
};

/**
 * Container de entrada em cascata.
 *
 * Usa `useInView` + `animate` explicito em vez de `whileInView`. A diferenca
 * importa: `whileInView` propaga a variante pelo estado do *gesto*, que nao
 * alcanca filhos montados depois que o gesto ja terminou (com `once: true` o
 * listener e removido). Em listas filtradas isso deixava os itens novos presos
 * em `hidden` — renderizados no DOM, mas com opacity 0.
 *
 * Com `animate` controlado por estado, qualquer filho que monte depois herda
 * "visible" normalmente.
 */
export function Stagger({
  children,
  className,
  once = true,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  once?: boolean;
  delay?: number;
}): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: '-40px' });

  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      variants={containerVariants}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      transition={{ delayChildren: delay }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <motion.div className={cn(className)} variants={itemVariants}>
      {children}
    </motion.div>
  );
}
