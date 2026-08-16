import { motion } from 'framer-motion';
import { cn } from './cn';

/**
 * Tabs em pilula com indicador deslizante (layoutId do Framer Motion).
 * Usado nos periodos do Top Charts e nos filtros de card.
 */

export interface TabItem<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

export interface TabsProps<T extends string> {
  items: Array<TabItem<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Identificador do grupo — necessario quando ha mais de um Tabs na tela. */
  layoutId?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  layoutId = 'tabs-indicator',
  size = 'md',
  className,
}: TabsProps<T>): JSX.Element {
  return (
    <div
      role="tablist"
      className={cn(
        'no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.04] p-1',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            title={item.hint}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative shrink-0 whitespace-nowrap rounded-full font-medium transition-colors duration-200',
              size === 'sm' ? 'px-3.5 py-1.5 text-xs' : 'px-4 py-2 text-sm',
              active ? 'text-ink-950' : 'text-chalk-muted hover:text-chalk',
            )}
          >
            {active ? (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-chalk"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            ) : null}
            <span className="relative z-10">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
