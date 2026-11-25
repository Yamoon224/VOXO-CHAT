import Link from 'next/link';

import { cn } from '@/lib/utils';

// Rosace : 10 pétales répartis sur un cercle de rayon 10 autour de (16, 16).
const PETALS = [
  [26.0, 16.0],
  [24.09, 10.12],
  [19.09, 6.49],
  [12.91, 6.49],
  [7.91, 10.12],
  [6.0, 16.0],
  [7.91, 21.88],
  [12.91, 25.51],
  [19.09, 25.51],
  [24.09, 21.88],
];

/** Marque VOXO : badge en rosace + nom en minuscules. */
export function LandingLogo({ className, tone = 'light' }) {
  const isLight = tone === 'light';
  const mark = isLight ? 'fill-white' : 'fill-black';
  const hole = isLight ? 'fill-black' : 'fill-white';

  return (
    <Link
      href="/"
      className={cn(
        'flex items-center gap-2.5',
        isLight ? 'text-white' : 'text-black',
        className
      )}
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7 shrink-0" aria-hidden="true">
        <circle cx="16" cy="16" r="10.5" className={mark} />
        {PETALS.map(([cx, cy]) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r="3.4"
            className={mark}
          />
        ))}
        <circle cx="16" cy="16" r="4.2" className={hole} />
      </svg>
      <span className="font-grotesk text-xl font-semibold tracking-tight">
        voxo
      </span>
    </Link>
  );
}
