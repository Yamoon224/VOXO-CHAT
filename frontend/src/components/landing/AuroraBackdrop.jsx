import { cn } from '@/lib/utils';

/**
 * Nappe de dégradés saturés (violet → bleu → magenta → rose) du héro et du CTA
 * final. Purement décorative : plusieurs `radial-gradient` superposés et floutés.
 */
const SHEET =
  'radial-gradient(60% 70% at 18% 42%, #6D3FF5 0%, transparent 62%),' +
  'radial-gradient(50% 62% at 42% 30%, #2A6DF5 0%, transparent 60%),' +
  'radial-gradient(46% 58% at 66% 52%, #E21F8D 0%, transparent 62%),' +
  'radial-gradient(40% 52% at 84% 38%, #FF6FB1 0%, transparent 64%),' +
  'radial-gradient(38% 46% at 8% 24%, #A8C8FF 0%, transparent 60%)';

export function AuroraBackdrop({ position = 'top', className }) {
  const isTop = position === 'top';

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-x-0 -z-10 h-[34rem] overflow-hidden',
        isTop ? 'top-0' : 'bottom-0',
        className
      )}
    >
      <div
        className="absolute inset-x-[-10%] h-full opacity-90 blur-[90px]"
        style={{ backgroundImage: SHEET }}
      />
      {/* Fondu vers le noir du côté du contenu */}
      <div
        className={cn(
          'absolute inset-0',
          isTop
            ? 'bg-gradient-to-b from-transparent via-black/40 to-black'
            : 'bg-gradient-to-t from-transparent via-black/40 to-black'
        )}
      />
    </div>
  );
}
