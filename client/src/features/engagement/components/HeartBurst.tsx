// src/components/feed/HeartBurst.tsx

import { useImperativeHandle, useRef, useState, forwardRef } from 'react';
import './heartburst.css';

export type HeartBurstHandle = {
  /** Fire a burst centred at (x, y) — client viewport coords. */
  burst: (x: number, y: number, strong?: boolean) => void;
};

type Particle = {
  id: number;
  x: number;
  y: number;
  /* Direction and distance from center */
  dx: number;
  dy: number;
  /* Rotation target */
  rot: number;
  /* Size */
  size: number;
  /* Stagger inside the burst */
  delay: number;
  /* Duration */
  duration: number;
  /* Colour */
  colour: string;
  /* Ring: 0 = inner cluster, 1 = mid, 2 = outer sparks */
  ring: 0 | 1 | 2;
  /* Extra sparkle rays for the strong burst */
  sparkle: boolean;
};

/* Rich palette — varied hues so the burst is visibly multi-coloured */
const COLOURS = [
  '#E11D48', // rose-600
  '#F43F5E', // rose-500
  '#FB7185', // rose-400
  '#EC4899', // pink-500
  '#F472B6', // pink-400
  '#F97316', // orange-500
  '#FB923C', // orange-400
  '#F59E0B', // amber-500
  '#FACC15', // yellow-400
  '#A855F7', // purple-500
  '#8B5CF6', // violet-500
  '#06B6D4', // cyan-500
];

const HEART_PATH =
  'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z';

/** Pick a random colour, avoiding the previous one for variety. */
function pickColour(exclude?: string): string {
  let c = COLOURS[Math.floor(Math.random() * COLOURS.length)];
  let guard = 0;
  while (c === exclude && guard < 4) {
    c = COLOURS[Math.floor(Math.random() * COLOURS.length)];
    guard++;
  }
  return c;
}

const HeartBurst = forwardRef<HeartBurstHandle>((_props, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [bursts, setBursts] = useState<Particle[]>([]);

  useImperativeHandle(ref, () => ({
    burst(clientX, clientY, strong = false) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      /* Ring configuration — inner cluster, mid ring, outer sparks.
         Each ring has its own count, distance, size, and duration. */
      const ringData: Array<{
        ring: 0 | 1 | 2;
        count: number;
        minDist: number;
        maxDist: number;
        minSize: number;
        maxSize: number;
        duration: number;
      }> = [
        {
          ring: 0,
          count: strong ? 12 : 8,
          minDist: 24,
          maxDist: 60,
          minSize: 14,
          maxSize: 22,
          duration: 520,
        },
        {
          ring: 1,
          count: strong ? 14 : 9,
          minDist: 60,
          maxDist: 110,
          minSize: 18,
          maxSize: 28,
          duration: 640,
        },
        {
          ring: 2,
          count: strong ? 8 : 5,
          minDist: 100,
          maxDist: 170,
          minSize: 22,
          maxSize: 34,
          duration: 760,
        },
      ];

      const base = Date.now();
      const list: Particle[] = [];
      let index = 0;

      for (const r of ringData) {
        const startAngle = Math.random() * Math.PI * 2;
        for (let i = 0; i < r.count; i++) {
          /* Even distribution with jitter so it feels organic */
          const step = (Math.PI * 2) / r.count;
          const angle =
            startAngle + step * i + (Math.random() - 0.5) * step * 0.5;
          const distance =
            r.minDist + Math.random() * (r.maxDist - r.minDist);
          const size = r.minSize + Math.random() * (r.maxSize - r.minSize);
          const colour = pickColour();

          list.push({
            id: base + index++,
            x,
            y,
            dx: Math.cos(angle) * distance,
            dy: Math.sin(angle) * distance,
            rot: (Math.random() - 0.5) * 180,
            size,
            delay: r.ring === 0 ? Math.random() * 30 : Math.random() * 90,
            duration: r.duration + Math.random() * 120,
            colour,
            ring: r.ring,
            sparkle: strong && r.ring > 0 && Math.random() < 0.35,
          });
        }
      }

      /* The hero heart in the center — one big puff */
      list.push({
        id: base + index++,
        x,
        y,
        dx: 0,
        dy: 0,
        rot: 0,
        size: strong ? 48 : 34,
        delay: 0,
        duration: strong ? 480 : 400,
        colour: '#E11D48',
        ring: 0,
        sparkle: false,
      });

      setBursts((prev) => [...prev, ...list]);

      /* Clean up */
      const cleanupDelay = strong ? 950 : 820;
      window.setTimeout(() => {
        const ids = new Set(list.map((p) => p.id));
        setBursts((prev) => prev.filter((p) => !ids.has(p.id)));
      }, cleanupDelay);
    },
  }));

  return (
    <div className="heart-burst" ref={containerRef} aria-hidden="true">
      {bursts.map((p) => (
        <span
          key={p.id}
          className={`heart-burst__particle heart-burst__particle--ring-${p.ring}${
            p.sparkle ? ' is-sparkle' : ''
          }`}
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            color: p.colour,
            ['--dx' as string]: `${p.dx}px`,
            ['--dy' as string]: `${p.dy}px`,
            ['--rot' as string]: `${p.rot}deg`,
            ['--delay' as string]: `${p.delay}ms`,
            ['--duration' as string]: `${p.duration}ms`,
          }}
        >
          <svg viewBox="0 0 24 24" width="100%" height="100%">
            <path d={HEART_PATH} fill="currentColor" />
          </svg>

          {p.sparkle && (
            <svg
              className="heart-burst__sparkle"
              viewBox="0 0 24 24"
              width="100%"
              height="100%"
              aria-hidden="true"
            >
              {/* 4-point star sparkle */}
              <path
                d="M12 2 L13.5 9.5 L21 11 L13.5 12.5 L12 20 L10.5 12.5 L3 11 L10.5 9.5 Z"
                fill="currentColor"
              />
            </svg>
          )}
        </span>
      ))}
    </div>
  );
});

HeartBurst.displayName = 'HeartBurst';

export default HeartBurst;