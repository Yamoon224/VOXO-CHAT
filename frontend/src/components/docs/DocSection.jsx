/** Section de page de documentation : titre et espacement cohérents entre pages. */
export function DocSection({ id, title, description, children }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3 border-t border-slate-200 pt-9 first:border-t-0 first:pt-0">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{title}</h2>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <div className="space-y-4 text-sm leading-relaxed text-gray-700">{children}</div>
    </section>
  )
}
