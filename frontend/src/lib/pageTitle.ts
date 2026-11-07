const BASE = 'Survey Management'

/** Title for the browser tab / screen readers, based on the current route (WCAG 2.4.2). */
export function pageTitle(pathname: string): string {
  const page = (() => {
    if (pathname === '/login') return 'Log in'
    if (pathname === '/register') return 'Create account'
    if (pathname === '/forgot-password') return 'Forgot password'
    if (pathname === '/reset-password') return 'Reset password'
    if (pathname === '/dashboard') return 'Dashboard'
    if (pathname === '/surveys/new') return 'New survey'
    if (/^\/surveys\/[^/]+\/edit$/.test(pathname)) return 'Edit survey'
    if (/^\/surveys\/[^/]+\/preview$/.test(pathname)) return 'Preview survey'
    if (/^\/surveys\/[^/]+\/results$/.test(pathname)) return 'Survey results'
    if (/^\/s\/[^/]+$/.test(pathname)) return 'Take survey'

    return ''
  })()

  return page ? `${page} · ${BASE}` : BASE
}