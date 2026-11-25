import { cn } from '@/lib/utils';

/**
 * En-tête de section : deux lignes de **même serif et même taille**, la seconde
 * en gris. C'est le motif typographique dominant du design de référence — ne pas
 * réduire l'accent à un sous-titre plus petit.
 */
export function SectionHeading({
  title,
  accent,
  align = 'center',
  className,
  titleClassName,
}) {
  const centered = align === 'center';

  return (
    <div
      className={cn(
        'font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl md:text-6xl',
        centered && 'mx-auto max-w-4xl text-center',
        className
      )}
    >
      <h2 className={cn('text-balance font-normal', titleClassName)}>
        {title}
      </h2>
      {accent ? (
        <p className="text-balance font-normal opacity-45">{accent}</p>
      ) : null}
    </div>
  );
}
