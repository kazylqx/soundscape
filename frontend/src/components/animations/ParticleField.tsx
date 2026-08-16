import { useEffect, useRef } from 'react';
import { cn } from '@/components/ui/cn';

/**
 * Notas musicais flutuando em canvas — fundo do hero da landing.
 *
 * Detalhes de implementacao:
 *  - respeita `prefers-reduced-motion` (nao anima)
 *  - pausa quando a aba perde o foco (economiza bateria)
 *  - reage a resize com devicePixelRatio para nao ficar borrado
 *  - `aria-hidden`: e puramente decorativo
 */

const GLYPHS = ['\u266a', '\u266b', '\u266c', '\u2669'];

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  phase: number;
  opacity: number;
  glyph: string;
  color: string;
  rotation: number;
  spin: number;
}

export interface ParticleFieldProps {
  /** Quantidade base de particulas (reduzida automaticamente no mobile). */
  count?: number;
  className?: string;
  colors?: string[];
}

export function ParticleField({
  count = 34,
  className,
  colors = ['#1ed760', '#8b5cf6', '#ec4899', '#22d3ee', '#fb923c'],
}: ParticleFieldProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const reduceMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let animationFrame = 0;
    let running = true;

    const createParticle = (randomY: boolean): Particle => {
      const size = 12 + Math.random() * 26;
      return {
        x: Math.random() * width,
        y: randomY ? Math.random() * height : height + size,
        size,
        // Notas maiores sobem um pouco mais rapido (sensacao de profundidade).
        speed: 0.16 + (size / 38) * 0.42 + Math.random() * 0.12,
        drift: 14 + Math.random() * 26,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.14 + Math.random() * 0.3,
        glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? '\u266a',
        color: colors[Math.floor(Math.random() * colors.length)] ?? '#1ed760',
        rotation: (Math.random() - 0.5) * 0.5,
        spin: (Math.random() - 0.5) * 0.004,
      };
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();

      width = rect.width;
      height = rect.height;

      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      // Menos particulas em telas pequenas.
      const target = width < 640 ? Math.round(count * 0.55) : count;
      particles = Array.from({ length: target }, () => createParticle(true));
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.y -= particle.speed;
        particle.phase += 0.006;
        particle.rotation += particle.spin;

        const x = particle.x + Math.sin(particle.phase) * particle.drift;

        context.save();
        context.translate(x, particle.y);
        context.rotate(particle.rotation);
        context.globalAlpha = particle.opacity;
        context.fillStyle = particle.color;
        context.font = `${particle.size}px "Segoe UI Symbol", "Noto Music", system-ui, sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(particle.glyph, 0, 0);
        context.restore();

        // Recicla ao sair pelo topo.
        if (particle.y < -particle.size * 2) {
          Object.assign(particle, createParticle(false));
        }
      }

      if (running) animationFrame = requestAnimationFrame(draw);
    };

    const drawStatic = () => {
      context.clearRect(0, 0, width, height);
      for (const particle of particles) {
        context.save();
        context.globalAlpha = particle.opacity * 0.8;
        context.fillStyle = particle.color;
        context.font = `${particle.size}px "Segoe UI Symbol", "Noto Music", system-ui, sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(particle.glyph, particle.x, particle.y);
        context.restore();
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(animationFrame);
      } else if (!reduceMotion) {
        running = true;
        animationFrame = requestAnimationFrame(draw);
      }
    };

    resize();

    if (reduceMotion) {
      drawStatic();
    } else {
      animationFrame = requestAnimationFrame(draw);
    }

    const observer = new ResizeObserver(() => {
      resize();
      if (reduceMotion) drawStatic();
    });
    observer.observe(canvas);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [count, colors]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 h-full w-full', className)}
    />
  );
}
