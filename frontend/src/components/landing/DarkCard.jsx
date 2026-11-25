import { cn } from '@/lib/utils';

/** Carte sombre pleine du design de référence — pas de verre, pas de flou. */
export function DarkCard({ as: Tag = 'div', className, children, ...props }) {
  return (
    <Tag
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#161616] p-6',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
