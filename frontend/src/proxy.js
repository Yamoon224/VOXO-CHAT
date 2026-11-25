import { NextResponse } from 'next/server'
import { defaultLocale, locales, normalizeLocale } from '@/i18n/config'

function detectedLocale(request) {
  return normalizeLocale(
    request.cookies.get('NEXT_LOCALE')?.value
      || request.headers.get('accept-language')
      || defaultLocale
  )
}

export function proxy(request) {
  const { pathname, search } = request.nextUrl
  const segment = pathname.split('/')[1]

  if (!locales.includes(segment)) {
    const url = request.nextUrl.clone()
    url.pathname = `/${detectedLocale(request)}${pathname === '/' ? '' : pathname}`
    url.search = search
    return NextResponse.redirect(url)
  }

  const locale = segment
  const url = request.nextUrl.clone()
  url.pathname = pathname.slice(locale.length + 1) || '/'
  const headers = new Headers(request.headers)
  headers.set('x-voxo-locale', locale)
  const response = NextResponse.rewrite(url, { request: { headers } })
  response.cookies.set('NEXT_LOCALE', locale, { path: '/', maxAge: 31536000, sameSite: 'lax' })
  return response
}

export const config = {
  matcher: ['/((?!api|_next|widget\\.js|favicon\\.ico|.*\\..*).*)'],
}
