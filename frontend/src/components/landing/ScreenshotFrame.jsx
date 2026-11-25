import Image from 'next/image';

import { cn } from '@/lib/utils';

const TILTS = {
  none: '',
  left: '-rotate-2 lg:-rotate-[3deg]',
  right: 'rotate-2 lg:rotate-[3deg]',
};

function withAppBasePath(src) {
  if (!src || !src.startsWith('/')) return src;
  const basePath = process.env.NEXT_PUBLIC_APP_BASE_PATH || '';
  return `${basePath}${src}`;
}

/** Squelette neutre affiché tant qu'aucune capture n'est fournie. */
function FrameSkeleton() {
  return (
    <div className="flex h-full min-h-[18rem] gap-3 bg-white p-4">
      <div className="hidden w-1/5 shrink-0 space-y-2 sm:block">
        <div className="h-6 rounded-md bg-slate-200" />
        {[0, 1, 2, 3, 4].map(row => (
          <div key={row} className="h-3.5 rounded bg-slate-100" />
        ))}
      </div>
      <div className="flex-1 space-y-3">
        <div className="h-5 w-1/3 rounded bg-slate-200" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map(tile => (
            <div key={tile} className="h-14 rounded-lg bg-slate-100" />
          ))}
        </div>
        <div className="h-32 rounded-lg bg-slate-100" />
        <div className="h-3.5 w-2/3 rounded bg-slate-100" />
        <div className="h-3.5 w-1/2 rounded bg-slate-100" />
      </div>
    </div>
  );
}

/**
 * Cadre applicatif incliné accueillant une capture du dashboard VOXO.
 *
 * Sans `src`, il rend un squelette neutre : brancher une vraie capture se
 * résume à renseigner `src`, sans retoucher la mise en page.
 */
export function ScreenshotFrame({ src, alt, tilt = 'none', className }) {
  const imageSrc = withAppBasePath(src);

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl shadow-black/30',
        TILTS[tilt],
        className
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-black/5 bg-slate-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
      </div>

      {imageSrc ? (
        <Image
          src={imageSrc}
          alt={alt}
          width={1600}
          height={1000}
          unoptimized
          className="h-auto w-full"
        />
      ) : (
        <FrameSkeleton />
      )}
    </div>
  );
}
