export default function sitemap() {
  const base = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://voxo.chat'
  return ['fr', 'en'].map(locale => ({
    url: `${base}/${locale}`,
    alternates: { languages: { fr: `${base}/fr`, en: `${base}/en` } },
  }))
}
