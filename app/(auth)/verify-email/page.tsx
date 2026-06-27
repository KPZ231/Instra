'use client'

import { useActionState, useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { verifyEmail } from '@/features/auth/actions/verifyEmail'
import { resendVerificationCode } from '@/features/auth/actions/resendVerificationCode'
import type { AuthActionState } from '@/features/auth/types'

const initialState: AuthActionState = { errors: {} }

/**
 * Inner form component that reads the email from search params.
 * Must be wrapped in <Suspense> because useSearchParams() requires it in Next.js 15.
 */
function VerifyEmailForm() {
  const { t } = useTranslation('common')
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''

  const [verifyState, verifyAction, isVerifying] = useActionState(verifyEmail, initialState)
  const [resendState, resendAction, isResending] = useActionState(resendVerificationCode, initialState)

  /** Countdown in seconds until the resend button is re-enabled (60s cooldown). */
  const [resendCooldown, setResendCooldown] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /** Six individual digit input refs for controlled UX */
  const digitRefs = useRef<Array<HTMLInputElement | null>>([null, null, null, null, null, null])
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])

  const code = digits.join('')

  /** Start a 60-second countdown after a code is sent. */
  function startCooldown() {
    setResendCooldown(60)
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Start cooldown on initial load (code was just sent by registerUser)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startCooldown()
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  useEffect(() => {
    if (!verifyState.errors) return
    if (verifyState.errors._form?.length) {
      toast.error(verifyState.errors._form[0])
    }
    if (verifyState.errors.code?.length) {
      toast.error(verifyState.errors.code[0])
    }
  }, [verifyState])

  useEffect(() => {
    if (resendState.success) {
      toast.success(t('verify_email.resend_success'))
      // eslint-disable-next-line react-hooks/set-state-in-effect
      startCooldown()
    }
    if (resendState.errors?._form?.length) {
      toast.error(resendState.errors._form[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resendState])

  /**
   * Handles input into a single digit box, auto-advancing to the next box.
   * @param index - Index of the digit box (0–5)
   * @param value - Character typed by the user
   */
  function handleDigitChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, '').slice(-1)
    const updated = [...digits]
    updated[index] = cleaned
    setDigits(updated)

    if (cleaned && index < 5) {
      digitRefs.current[index + 1]?.focus()
    }
  }

  /**
   * Handles backspace in a digit box, moving focus back to the previous box.
   * @param index - Index of the digit box
   * @param e - Keyboard event
   */
  function handleDigitKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus()
    }
  }

  /**
   * Handles paste of a 6-digit string directly into any digit box.
   * @param e - Clipboard event
   */
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      e.preventDefault()
      setDigits(pasted.split(''))
      digitRefs.current[5]?.focus()
    }
  }

  const inputClass = (hasError?: boolean) =>
    [
      'h-12 w-10 rounded bg-[#040503] text-center',
      'text-lg font-mono font-semibold text-on-surface',
      'border outline-none transition-[border-color,box-shadow] duration-150',
      'focus:border-white/80 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.06)]',
      hasError ? 'border-error/50' : 'border-white/15',
    ].join(' ')

  const hasCodeError = !!(verifyState.errors?.code?.length || verifyState.errors?._form?.length)

  return (
    <div className="w-full max-w-[380px]">

      {/* Logo */}
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

      {/* Heading */}
      <h1 className="mb-2 text-[32px] font-semibold leading-[1.1] tracking-[-0.03em] text-white max-[480px]:text-[26px]">
        {t('verify_email.title')}
      </h1>
      <p className="mb-1 text-[13px] text-outline">
        {t('verify_email.subtitle')}
      </p>
      {email && (
        <p className="mb-6 font-mono text-[12px] text-on-surface">
          {email}
        </p>
      )}

      {/* Code form */}
      <form
        action={verifyAction}
        className="flex flex-col gap-5"
        noValidate
      >
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="code" value={code} />

        {/* 6-digit boxes */}
        <div className="flex flex-col gap-1.5">
          <label className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-outline">
            {t('verify_email.code_label')}
          </label>
          <div className="flex gap-2" role="group" aria-label={t('verify_email.code_label')}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { digitRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(i, e)}
                onPaste={handlePaste}
                className={inputClass(hasCodeError)}
                aria-label={`${t('verify_email.code_label')} digit ${i + 1}`}
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
              />
            ))}
          </div>
          {verifyState.errors?.code && (
            <p className="font-mono text-[11px] tracking-[0.03em] text-error">
              {verifyState.errors.code[0]}
            </p>
          )}
          {verifyState.errors?._form && (
            <p className="font-mono text-[11px] tracking-[0.03em] text-error">
              {verifyState.errors._form[0]}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isVerifying || code.length < 6}
          className="flex w-full items-center justify-center gap-2 rounded bg-white px-6 py-3 text-sm font-semibold tracking-[-0.01em] text-[#111] transition-[opacity,transform] duration-150 hover:not-disabled:opacity-90 active:not-disabled:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isVerifying && (
            <span className="size-3.5 animate-spin rounded-full border-2 border-[rgba(0,0,0,0.2)] border-t-[#111]" aria-hidden="true" />
          )}
          {t('verify_email.submit')}
        </button>
      </form>

      {/* Resend form */}
      <div className="mt-5">
        <p className="mb-2 text-[13px] text-outline">
          {t('verify_email.no_code')}
        </p>
        <form action={resendAction}>
          <input type="hidden" name="email" value={email} />
          <button
            type="submit"
            disabled={isResending || resendCooldown > 0}
            className="font-mono text-[12px] uppercase tracking-[0.04em] text-on-surface underline-offset-2 transition-colors duration-150 hover:not-disabled:text-white hover:not-disabled:underline disabled:cursor-not-allowed disabled:text-outline-variant"
          >
            {resendCooldown > 0
              ? t('verify_email.resend_wait', { seconds: resendCooldown })
              : t('verify_email.resend')}
          </button>
        </form>
      </div>

      {/* Back to sign up */}
      <div className="mt-4">
        <Link
          href="/signup"
          className="text-[13px] text-outline transition-colors duration-150 hover:text-on-surface"
        >
          {t('verify_email.back_to_signup')}
        </Link>
      </div>

    </div>
  )
}

/**
 * VerifyEmailPage  prompts the user to enter the 6-digit verification code
 * sent to their email during registration. Wraps the form in Suspense (required
 * by useSearchParams in Next.js 15). Matches the Executive Precision dark design
 * system used across the auth flow.
 * @returns JSX.Element
 * @example <VerifyEmailPage />
 */
export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-dvh bg-pitch-black font-sans">

      {/* ── Left panel ── */}
      <section className="flex flex-[0_0_480px] items-center justify-center bg-pitch-black px-6 py-12 max-[900px]:flex-1">
        <Suspense fallback={
          <div className="flex w-full max-w-[380px] flex-col gap-4">
            <div className="h-10 w-32 animate-pulse rounded bg-white/5" />
            <div className="h-8 w-48 animate-pulse rounded bg-white/5" />
            <div className="h-4 w-full animate-pulse rounded bg-white/5" />
            <div className="flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 w-10 animate-pulse rounded bg-white/5" />
              ))}
            </div>
            <div className="h-10 w-full animate-pulse rounded bg-white/5" />
          </div>
        }>
          <VerifyEmailForm />
        </Suspense>
      </section>

      {/* ── Right panel ── */}
      <aside className="flex flex-1 items-stretch p-6 pl-0 max-[900px]:hidden" aria-hidden="true">
        <div className="relative flex flex-1 flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.07] bg-surface-container-lowest p-12">

          {/* Logo */}
          <div className="flex items-center">
            <Image
              src="/images/logos/logo_white_No_Subtitle_Transparent_Wide.png"
              alt="Instra"
              width={80}
              height={27}
              className="object-contain opacity-60"
            />
          </div>

          {/* Main copy */}
          <div className="relative z-10 mb-8 mt-auto">
            <h2 className="mb-3 mt-0 text-[36px] font-semibold leading-[1.1] tracking-[-0.03em] text-white">
              {/* Static text in right panel  not user-facing so not translated */}
              One step away.
            </h2>
            <p className="mb-3 max-w-[400px] text-[15px] leading-relaxed text-outline">
              Check your inbox for the verification code and enter it to activate your account.
            </p>
            <p className="m-0 font-mono text-[12px] tracking-[0.02em] text-outline-variant">
              Codes expire after 10 minutes · Max 5 attempts
            </p>
          </div>

          {/* Info card */}
          <div className="relative z-10 rounded-xl border border-white/[0.08] bg-white/[0.04] p-6">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
              Security
            </p>
            <p className="mb-0 text-[15px] font-semibold tracking-[-0.02em] text-on-surface">
              Your account is protected.
            </p>
            <p className="mb-0 mt-1 text-sm leading-relaxed text-outline">
              Verification codes are cryptographically random and single-use. If you did not request this, you can safely ignore the email.
            </p>
          </div>

          {/* Decorative geometry */}
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
