'use client'

import { useActionState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { z } from 'zod'
import { resetPassword } from '@/features/auth/actions/resetPassword'
import type { AuthActionState } from '@/features/auth/types'

const initialState: AuthActionState = {}

const ClientResetSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must not exceed 128 characters')
      .regex(/[a-zA-Z]/, 'Must contain at least one letter')
      .regex(/[0-9]/, 'Must contain at least one number')
      .regex(/[^a-zA-Z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

/**
 * Inner component that reads token from search params (must be inside Suspense).
 */
function ResetPasswordForm() {
  const { t } = useTranslation('common')
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [state, formAction, isPending] = useActionState(resetPassword, initialState)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    passwordRef.current?.focus()
  }, [])

  useEffect(() => {
    if (state.errors?._form?.length) {
      toast.error(state.errors._form[0])
    }
  }, [state])

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    const form = e.currentTarget
    const result = ClientResetSchema.safeParse({
      password: (form.elements.namedItem('password') as HTMLInputElement)?.value,
      confirmPassword: (form.elements.namedItem('confirmPassword') as HTMLInputElement)?.value,
    })
    if (!result.success) {
      e.preventDefault()
      const issue = result.error.issues[0]
      toast.error(issue.message, { description: `Field: ${String(issue.path[0])}` })
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex size-12 items-center justify-center rounded-full border border-error/30 bg-error/10">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="10" cy="10" r="9" stroke="#ffb4ab" strokeWidth="1.4" />
            <path d="M10 6v5" stroke="#ffb4ab" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="10" cy="14" r="1" fill="#ffb4ab" />
          </svg>
        </div>
        <div>
          <h1 className="mb-2 text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-white">
            {t('reset_password.invalid_title')}
          </h1>
          <p className="text-[14px] leading-relaxed text-outline">
            {t('reset_password.invalid_desc')}
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-1.5 text-[13px] text-on-surface no-underline transition-colors duration-150 hover:text-white hover:underline"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('reset_password.request_new')}
        </Link>
      </div>
    )
  }

  if (state.success) {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex size-12 items-center justify-center rounded-full border border-white/15 bg-white/5">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="10" stroke="white" strokeWidth="1.4" />
            <path d="M7 11l3 3 5-5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <h1 className="mb-2 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-white">
            {t('reset_password.success_title')}
          </h1>
          <p className="text-[14px] leading-relaxed text-outline">
            {t('reset_password.success_desc')}
          </p>
        </div>
        <Link
          href="/signin"
          className="flex w-full items-center justify-center rounded bg-white px-6 py-3 text-sm font-semibold tracking-[-0.01em] text-[#111] transition-opacity duration-150 hover:opacity-90"
        >
          {t('reset_password.goto_signin')}
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="mb-2 text-[36px] font-semibold leading-[1.1] tracking-[-0.03em] text-white max-[480px]:text-[28px]">
        {t('reset_password.title')}
      </h1>
      <p className="mb-7 text-[14px] leading-relaxed text-outline">
        {t('reset_password.subtitle')}
      </p>

      <form action={formAction} onSubmit={handleSubmit} className="mb-5 flex flex-col gap-4" noValidate>
        {/* Hidden token field */}
        <input type="hidden" name="token" value={token} />

        {/* New password */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-outline"
          >
            {t('reset_password.password_label')}
          </label>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant"
              width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
            >
              <rect x="4" y="7" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <input
              ref={passwordRef}
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={t('reset_password.password_placeholder')}
              className={[
                'w-full rounded bg-[#040503] py-2.5 pl-9.5 pr-3.5',
                'text-sm text-on-surface placeholder:text-outline-variant',
                'border outline-none transition-[border-color,box-shadow] duration-150',
                'focus:border-white/80 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.06)]',
                state.errors?.password ? 'border-error/50' : 'border-white/15',
              ].join(' ')}
              aria-describedby={state.errors?.password ? 'password-error' : 'password-hint'}
            />
          </div>
          {state.errors?.password ? (
            <p id="password-error" className="font-mono text-[11px] tracking-[0.03em] text-error">
              {state.errors.password[0]}
            </p>
          ) : (
            <p id="password-hint" className="font-mono text-[11px] tracking-[0.03em] text-outline-variant">
              {t('reset_password.password_hint')}
            </p>
          )}
        </div>

        {/* Confirm password */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="confirmPassword"
            className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-outline"
          >
            {t('reset_password.confirm_label')}
          </label>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant"
              width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
            >
              <rect x="4" y="7" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder={t('reset_password.confirm_placeholder')}
              className={[
                'w-full rounded bg-[#040503] py-2.5 pl-9.5 pr-3.5',
                'text-sm text-on-surface placeholder:text-outline-variant',
                'border outline-none transition-[border-color,box-shadow] duration-150',
                'focus:border-white/80 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.06)]',
                state.errors?.confirmPassword ? 'border-error/50' : 'border-white/15',
              ].join(' ')}
              aria-describedby={state.errors?.confirmPassword ? 'confirm-error' : undefined}
            />
          </div>
          {state.errors?.confirmPassword && (
            <p id="confirm-error" className="font-mono text-[11px] tracking-[0.03em] text-error">
              {state.errors.confirmPassword[0]}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded bg-white px-6 py-3 text-sm font-semibold tracking-[-0.01em] text-[#111] transition-[opacity,transform] duration-150 hover:not-disabled:opacity-90 active:not-disabled:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && (
            <span
              className="size-3.5 animate-spin rounded-full border-2 border-[rgba(0,0,0,0.2)] border-t-[#111]"
              aria-hidden="true"
            />
          )}
          {t('reset_password.submit')}
        </button>
      </form>

      <p className="text-[13px] text-outline">
        {t('reset_password.remembered')}{' '}
        <Link
          href="/signin"
          className="text-on-surface no-underline transition-colors duration-150 hover:text-white hover:underline"
        >
          {t('reset_password.signin_link')}
        </Link>
      </p>
    </>
  )
}

/**
 * ResetPasswordPage — wraps the form in Suspense (required by useSearchParams).
 */
export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-dvh bg-pitch-black font-sans">

      {/* ── Left panel ── */}
      <section className="flex flex-[0_0_480px] items-center justify-center bg-pitch-black px-6 py-12 max-[900px]:flex-1">
        <div className="w-full max-w-90">
          <div className="mb-8 flex items-center">
            <Image
              src="/images/logos/logo_white_No_Subtitle_Transparent_Wide.png"
              alt="Instra"
              width={120}
              height={40}
              priority
              className="object-contain object-left"
            />
          </div>
          <Suspense fallback={
            <div className="flex flex-col gap-4">
              <div className="h-10 w-48 animate-pulse rounded bg-white/5" />
              <div className="h-4 w-full animate-pulse rounded bg-white/5" />
              <div className="h-10 w-full animate-pulse rounded bg-white/5" />
              <div className="h-10 w-full animate-pulse rounded bg-white/5" />
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </section>

      {/* ── Right panel ── */}
      <aside className="flex flex-1 items-stretch p-6 pl-0 max-[900px]:hidden" aria-hidden="true">
        <div className="relative flex flex-1 flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.07] bg-surface-container-lowest p-12">

          <div className="flex items-center">
            <Image
              src="/images/logos/logo_white_No_Subtitle_Transparent_Wide.png"
              alt="Instra"
              width={80}
              height={27}
              className="object-contain opacity-60"
            />
          </div>

          <div className="relative z-10 mb-8 mt-auto">
            <h2 className="mb-3 mt-0 text-[36px] font-semibold leading-[1.1] tracking-[-0.03em] text-white">
              Your account is safe with us.
            </h2>
            <p className="mb-3 max-w-100 text-[15px] leading-relaxed text-outline">
              Choose a strong password you haven't used before. We recommend a mix of letters, numbers, and symbols.
            </p>
            <p className="m-0 font-mono text-[12px] tracking-[0.02em] text-outline-variant">
              AES-256 encryption · SOC 2 compliant
            </p>
          </div>

          <div className="relative z-10 rounded-xl border border-white/8 bg-white/4 p-6">
            <div className="mb-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 1L2 3.5v4c0 3.3 2.5 6.4 6 7 3.5-.6 6-3.7 6-7v-4L8 1z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M5.5 8l1.5 1.5 3-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline-variant">
                Security
              </span>
            </div>
            <p className="mb-2 text-lg font-semibold tracking-[-0.02em] text-on-surface">
              Your data stays yours.
            </p>
            <p className="text-sm leading-relaxed text-outline">
              We never store passwords in plain text. Every credential is hashed and salted before touching our servers.
            </p>
          </div>

          <div
            className="pointer-events-none absolute -right-10 -top-10 size-80 opacity-[0.12]"
            aria-hidden="true"
            style={{
              background: 'conic-gradient(from 135deg, #fff 0deg, transparent 90deg)',
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            }}
          />
        </div>
      </aside>

    </main>
  )
}
