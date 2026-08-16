import type { ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';
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
  return (
    <motion.div
      className={cn(className)}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, margin: '-40px' }}
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
