import type { Metadata } from 'next'
import { buildMetadata, pageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = buildMetadata(pageMetadata.verifyEmail)

export default function VerifyEmailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
