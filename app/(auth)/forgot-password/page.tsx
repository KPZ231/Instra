'use client'

import { useActionState, useEffect, useRef, useTransition } from 'react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { forgotPassword } from '@/features/auth/actions/forgotPassword'
import type { AuthActionState } from '@/features/auth/types'

const initialState: AuthActionState = {}

const ClientForgotSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email address (e.g. you@example.com)'),
})

type ForgotFormData = z.infer<typeof ClientForgotSchema>

/**
 * ForgotPasswordPage  two-panel password reset request screen.
 * Validates email client-side with react-hook-form + zodResolver (hybrid: errors on blur).
 * Shows a success state after the email is dispatched.
 */
export default function ForgotPasswordPage() {
  const { t } = useTranslation('common')
  const [state, formAction, isPending] = useActionState(forgotPassword, initialState)
  const [, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors }, watch } = useForm<ForgotFormData>({
    resolver: zodResolver(ClientForgotSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const emailValue = watch('email', '')

  useEffect(() => {
    emailRef.current?.focus()
  }, [])

  /** Show only _form-level server errors as toasts; field errors shown inline. */
  useEffect(() => {
    if (state.errors?._form?.length) {
      toast.error(state.errors._form[0])
    }
  }, [state])

  /**
   * RHF handleSubmit callback: called only when client validation passes.
   * Submits the native form to the server action via startTransition.
   */
  function onClientSubmit() {
    startTransition(() => {
      if (formRef.current) {
        formAction(new FormData(formRef.current))
      }
    })
  }

  const emailError = errors.email?.message ?? state.errors?.email?.[0]

  return (
    <main className="flex min-h-dvh bg-pitch-black font-sans">

      {/* ── Left panel ── */}
      <section className="flex flex-[0_0_480px] items-center justify-center bg-pitch-black px-6 py-12 max-[900px]:flex-1">
        <div className="w-full max-w-90">

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

          {!state.success ? (
            <>
              <h1 className="mb-2 text-[36px] font-semibold leading-[1.1] tracking-[-0.03em] text-white max-[480px]:text-[28px]">
                {t('forgot_password.title')}
              </h1>
              <p className="mb-7 text-[14px] leading-relaxed text-outline">
                {t('forgot_password.subtitle')}
              </p>

              <form
                ref={formRef}
                action={formAction}
                onSubmit={handleSubmit(onClientSubmit)}
                className="mb-5 flex flex-col gap-4"
                noValidate
              >

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="email"
                    className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-outline"
                  >
                    {t('forgot_password.email_label')}
                  </label>
                  <div className="relative">
                    <svg
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant"
                      width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"
                    >
                      <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M1 5.5L8 9.5L15 5.5" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder={t('forgot_password.email_placeholder')}
                      className={[
                        'w-full rounded bg-[#040503] py-2.5 pl-9.5 pr-3.5',
                        'text-sm text-on-surface placeholder:text-outline-variant',
                        'border outline-none transition-[border-color,box-shadow] duration-150',
                        'focus:border-white/80 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.06)]',
                        emailError ? 'border-error/50' : 'border-white/15',
                      ].join(' ')}
                      aria-describedby={emailError ? 'email-error' : undefined}
                      {...register('email')}
                      ref={(el) => {
                        register('email').ref(el)
                        emailRef.current = el
                      }}
                    />
                  </div>
                  {emailError && (
                    <p id="email-error" className="font-mono text-[11px] tracking-[0.03em] text-error">
                      {emailError}
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
                  {t('forgot_password.submit')}
                </button>
              </form>

              <p className="text-[13px] text-outline">
                {t('forgot_password.remembered')}{' '}
                <Link
                  href="/signin"
                  className="text-on-surface no-underline transition-colors duration-150 hover:text-white hover:underline"
                >
                  {t('forgot_password.signin_link')}
                </Link>
              </p>
            </>
          ) : (
            /* ── Success state ── */
            <div className="flex flex-col gap-5">
              <div className="flex size-12 items-center justify-center rounded-full border border-white/15 bg-white/5">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <rect x="1" y="4" width="20" height="14" rx="2" stroke="white" strokeWidth="1.4" />
                  <path d="M1 7.5L11 13.5L21 7.5" stroke="white" strokeWidth="1.4" />
                  <circle cx="16" cy="16" r="5" fill="#121410" stroke="white" strokeWidth="1.2" />
                  <path d="M13.5 16l1.5 1.5 3-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div>
                <h1 className="mb-2 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-white">
                  {t('forgot_password.success_title')}
                </h1>
                <p className="text-[14px] leading-relaxed text-outline">
                  {t('forgot_password.success_desc')}{' '}
                  <span className="font-mono text-[13px] text-on-surface">{emailValue}</span>
                </p>
              </div>

              <p className="font-mono text-[12px] tracking-[0.03em] text-outline-variant">
                {t('forgot_password.success_hint')}
              </p>

              <Link
                href="/signin"
                className="inline-flex items-center gap-1.5 text-[13px] text-on-surface no-underline transition-colors duration-150 hover:text-white hover:underline"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {t('forgot_password.back_to_signin')}
              </Link>
            </div>
          )}

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
              {t('forgot_password.panel_title')}
            </h2>
            <p className="mb-3 max-w-100 text-[15px] leading-relaxed text-outline">
              {t('forgot_password.panel_desc')}
            </p>
            <p className="m-0 font-mono text-[12px] tracking-[0.02em] text-outline-variant">
              {t('forgot_password.panel_social')}
            </p>
          </div>

          <div className="relative z-10 rounded-xl border border-white/8 bg-white/4 p-6">
            <div className="mb-3 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M8 1L2 3.5v4c0 3.3 2.5 6.4 6 7 3.5-.6 6-3.7 6-7v-4L8 1z"
                  stroke="white"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <path d="M5.5 8l1.5 1.5 3-3" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline-variant">
                {t('forgot_password.panel_badge')}
              </span>
            </div>
            <p className="mb-2 text-lg font-semibold tracking-[-0.02em] text-on-surface">
              {t('forgot_password.panel_card_title')}
            </p>
            <p className="text-sm leading-relaxed text-outline">
              {t('forgot_password.panel_card_desc')}
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
