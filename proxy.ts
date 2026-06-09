import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { computeFingerprint, FINGERPRINT_COOKIE_NAME } from '@/lib/auth/session'

const PUBLIC_PATHS = ['/login', '/register', '/api/auth']
const PROTECTED_PREFIX = '/dashboard'

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

export default async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl

  const session = await auth()

  if (isPublic(pathname)) {
    if (session?.user && !pathname.startsWith('/api/auth')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  if (!pathname.startsWith(PROTECTED_PREFIX)) {
    return NextResponse.next()
  }

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const storedFp = req.cookies.get(FINGERPRINT_COOKIE_NAME)?.value
  if (storedFp) {
    const ua = req.headers.get('user-agent') ?? ''
    const expectedFp = await computeFingerprint(ua)

    if (storedFp !== expectedFp) {
      const response = NextResponse.redirect(new URL('/login', req.url))
      response.cookies.delete(FINGERPRINT_COOKIE_NAME)
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
