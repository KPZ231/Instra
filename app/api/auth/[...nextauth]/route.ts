import { NextRequest, NextResponse } from 'next/server'
import { handlers } from '@/lib/auth/config'
import { computeFingerprint, FINGERPRINT_COOKIE_NAME, FINGERPRINT_COOKIE_OPTIONS } from '@/lib/auth/session'

async function handleRequest(req: NextRequest): Promise<Response> {
  const response = await (req.method === 'POST' ? handlers.POST(req) : handlers.GET(req))

  const url = new URL(req.url)
  const isOAuthCallback = url.pathname.includes('/callback/')

  if (isOAuthCallback && response.status >= 301 && response.status <= 303) {
    const nextResponse = NextResponse.redirect(response.headers.get('location') ?? '/', {
      status: response.status,
      headers: response.headers,
    })

    const ua = req.headers.get('user-agent') ?? ''
    const fp = await computeFingerprint(ua)
    nextResponse.cookies.set(FINGERPRINT_COOKIE_NAME, fp, FINGERPRINT_COOKIE_OPTIONS)

    return nextResponse
  }

  return response
}

export { handleRequest as GET, handleRequest as POST }
