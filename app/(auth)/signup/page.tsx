'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { signIn } from 'next-auth/react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { registerUser } from '@/features/auth/actions/registerUser'
import type { AuthActionState } from '@/features/auth/types'

const initialState: AuthActionState = { errors: {} }

type RegisterMode = 'email' | 'username'

// ── Shared password rules ──────────────────────────────────────────────────
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')

const ClientEmailSchema = z
  .object({
    name: z.string().max(64, 'Name must not exceed 64 characters').optional(),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    terms: z
      .union([z.boolean(), z.string()])
      .refine((v) => v === true || v === 'on', { message: 'You must accept the Terms of Service' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

const ClientUsernameSchema = z
  .object({
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(32, 'Username must not exceed 32 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
    email: z
      .string()
      .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), {
        message: 'Enter a valid email address',
      })
      .optional()
      .or(z.literal('')),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    terms: z
      .union([z.boolean(), z.string()])
      .refine((v) => v === true || v === 'on', { message: 'You must accept the Terms of Service' }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

// All fields from both modes combined — used to type the single useForm instance.
type RegisterFormData = {
  name?: string
  email?: string
  username?: string
  password: string
  confirmPassword: string
  terms: boolean | string
}

/**
 * SignUpPage — two-panel registration screen following Executive Precision design system.
 * Supports two modes via tabs: email registration and username registration.
 * Uses react-hook-form + zodResolver with hybrid validation (on-blur, silent before first submit).
 * @returns JSX.Element
 * @example <SignUpPage />
 */
export default function SignUpPage() {
  const { t } = useTranslation('common')
  const [state, formAction, isPending] = useActionState(registerUser, initialState)
  const [, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const [mode, setMode] = useState<RegisterMode>('email')

  // modeRef keeps the active schema in sync with the resolver without recreating useForm.
  const modeRef = useRef<RegisterMode>('email')

  const { register, handleSubmit, formState: { errors }, watch, reset } = useForm<RegisterFormData>({
    // Dynamic resolver: switches between email and username schemas based on modeRef.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: (values: any, context: any, options: any) => {
      const schema = modeRef.current === 'email' ? ClientEmailSchema : ClientUsernameSchema
      return zodResolver(schema)(values, context, options)
    },
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: { terms: false, password: '', confirmPassword: '' },
  })

  const termsChecked = watch('terms') === true

  /** Show only _form-level server errors as toasts; field errors shown inline. */
  useEffect(() => {
    if (!state.errors) return
    if (state.errors._form?.length) {
      toast.error(state.errors._form[0], { description: 'Please try again.' })
    }
  }, [state])

  /**
   * Switches registration mode, updates the resolver ref, and resets all fields.
   * @param newMode - The mode to switch to
   */
  function switchMode(newMode: RegisterMode) {
    modeRef.current = newMode
    setMode(newMode)
    reset({ terms: false, password: '', confirmPassword: '' })
  }

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

  const inputClass = (hasError?: boolean) =>
    [
      'w-full rounded bg-[#040503] py-2.5 pl-[38px] pr-3.5',
      'text-sm text-on-surface placeholder:text-outline-variant',
      'border outline-none transition-[border-color,box-shadow] duration-150',
      'focus:border-white/80 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.06)]',
      hasError ? 'border-error/50' : 'border-white/15',
    ].join(' ')

  // Client errors take precedence over server errors for each field.
  const nameError = errors.name?.message ?? state.errors?.name?.[0]
  const emailError = errors.email?.message ?? state.errors?.email?.[0]
  const usernameError = errors.username?.message ?? state.errors?.username?.[0]
  const passwordError = errors.password?.message ?? state.errors?.password?.[0]
  const confirmPasswordError = errors.confirmPassword?.message ?? state.errors?.confirmPassword?.[0]
  const termsError = errors.terms?.message ?? state.errors?.terms?.[0]

  return (
    <main className="flex min-h-dvh bg-pitch-black font-sans">

      {/* ── Left panel ── */}
      <section className="flex flex-[0_0_480px] items-center justify-center bg-pitch-black px-6 py-12 max-[900px]:flex-1">
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
            {t('signup.title')}
          </h1>
          <p className="mb-6 text-[13px] text-outline">{t('signup.subtitle')}</p>

          {/* Mode tabs */}
          <div className="mb-6 flex rounded border border-white/10 bg-white/[0.03] p-0.5">
            {(['email', 'username'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => switchMode(tab)}
                className={[
                  'flex flex-1 items-center justify-center gap-1.5 rounded py-2 font-mono text-[11px] uppercase tracking-[0.06em] transition-all duration-150',
                  mode === tab
                    ? 'bg-white text-[#111] shadow-sm'
                    : 'text-outline hover:text-on-surface',
                ].join(' ')}
              >
                {tab === 'email' ? (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M1 5.5L8 9.5L15 5.5" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                )}
                {t(tab === 'email' ? 'signup.tab_email' : 'signup.tab_username')}
              </button>
            ))}
          </div>

          {/* Form */}
          <form
            ref={formRef}
            action={formAction}
            onSubmit={handleSubmit(onClientSubmit)}
            className="flex flex-col gap-3.5"
            noValidate
          >
            <input type="hidden" name="mode" value={mode} />

            {/* ── Email mode fields ── */}
            {mode === 'email' && (
              <>
                {/* Display name (optional) */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="name" className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-outline">
                    {t('signup.name_label')}
                    <span className="ml-1 normal-case tracking-normal text-outline-variant">{t('signup.optional')}</span>
                  </label>
                  <div className="relative">
                    <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      autoFocus
                      placeholder={t('signup.name_placeholder')}
                      className={inputClass(!!nameError)}
                      aria-describedby={nameError ? 'name-error' : undefined}
                      {...register('name')}
                    />
                  </div>
                  {nameError && (
                    <p id="name-error" className="font-mono text-[11px] tracking-[0.03em] text-error">{nameError}</p>
                  )}
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email" className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-outline">
                    {t('signup.email_label')}
                  </label>
                  <div className="relative">
                    <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M1 5.5L8 9.5L15 5.5" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder={t('signup.email_placeholder')}
                      className={inputClass(!!emailError)}
                      aria-describedby={emailError ? 'email-error' : undefined}
                      {...register('email')}
                    />
                  </div>
                  {emailError && (
                    <p id="email-error" className="font-mono text-[11px] tracking-[0.03em] text-error">{emailError}</p>
                  )}
                </div>
              </>
            )}

            {/* ── Username mode fields ── */}
            {mode === 'username' && (
              <>
                {/* Username */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="username" className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-outline">
                    {t('signup.username_label')}
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[13px] text-outline-variant" aria-hidden="true">@</span>
                    <input
                      id="username"
                      type="text"
                      autoComplete="username"
                      autoFocus
                      placeholder={t('signup.username_placeholder')}
                      className={inputClass(!!usernameError)}
                      aria-describedby={usernameError ? 'username-error' : undefined}
                      {...register('username')}
                    />
                  </div>
                  {usernameError && (
                    <p id="username-error" className="font-mono text-[11px] tracking-[0.03em] text-error">{usernameError}</p>
                  )}
                </div>

                {/* Email (optional) */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="email-username" className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-outline">
                    {t('signup.email_label')}
                    <span className="ml-1 normal-case tracking-normal text-outline-variant">{t('signup.optional')}</span>
                  </label>
                  <div className="relative">
                    <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                      <path d="M1 5.5L8 9.5L15 5.5" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                    <input
                      id="email-username"
                      type="email"
                      autoComplete="email"
                      placeholder={t('signup.email_placeholder')}
                      className={inputClass(!!emailError)}
                      aria-describedby={emailError ? 'email-error' : undefined}
                      {...register('email')}
                    />
                  </div>
                  {emailError && (
                    <p id="email-error" className="font-mono text-[11px] tracking-[0.03em] text-error">{emailError}</p>
                  )}
                </div>
              </>
            )}

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-outline">
                {t('signup.password_label')}
              </label>
              <div className="relative">
                <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="4" y="7" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('signup.password_placeholder')}
                  className={inputClass(!!passwordError)}
                  aria-describedby={passwordError ? 'password-error' : 'password-hint'}
                  {...register('password')}
                />
              </div>
              {passwordError ? (
                <p id="password-error" className="font-mono text-[11px] tracking-[0.03em] text-error">{passwordError}</p>
              ) : (
                <p id="password-hint" className="font-mono text-[10px] leading-relaxed text-outline-variant">
                  {t('signup.password_hint')}
                </p>
              )}
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirmPassword" className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-outline">
                {t('signup.confirm_label')}
              </label>
              <div className="relative">
                <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="4" y="7" width="8" height="7" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M6.5 11l1.5 1.5 2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder={t('signup.confirm_placeholder')}
                  className={inputClass(!!confirmPasswordError)}
                  aria-describedby={confirmPasswordError ? 'confirm-error' : undefined}
                  {...register('confirmPassword')}
                />
              </div>
              {confirmPasswordError && (
                <p id="confirm-error" className="font-mono text-[11px] tracking-[0.03em] text-error">{confirmPasswordError}</p>
              )}
            </div>

            {/* Terms checkbox */}
            <label
              className={[
                'flex cursor-pointer items-start gap-2.5 rounded border p-3 transition-colors duration-150',
                termsChecked ? 'border-white/20 bg-white/[0.03]' : 'border-white/10 bg-transparent',
                termsError ? 'border-error/40' : '',
              ].join(' ')}
            >
              <input
                type="checkbox"
                value="on"
                className="mt-0.5 size-3.5 shrink-0 cursor-pointer accent-white"
                aria-describedby={termsError ? 'terms-error' : undefined}
                {...register('terms')}
              />
              <span className="text-[12px] leading-relaxed text-outline">
                {t('signup.terms_prefix')}{' '}
                <Link href="/terms" className="text-on-surface underline-offset-2 hover:underline">
                  {t('signup.terms_link')}
                </Link>
                {' '}{t('signup.terms_and')}{' '}
                <Link href="/privacy" className="text-on-surface underline-offset-2 hover:underline">
                  {t('signup.privacy_link')}
                </Link>
              </span>
            </label>
            {termsError && (
              <p id="terms-error" className="font-mono text-[11px] tracking-[0.03em] text-error">{termsError}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded bg-white px-6 py-3 text-sm font-semibold tracking-[-0.01em] text-[#111] transition-[opacity,transform] duration-150 hover:not-disabled:opacity-90 active:not-disabled:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending && (
                <span className="size-3.5 animate-spin rounded-full border-2 border-[rgba(0,0,0,0.2)] border-t-[#111]" aria-hidden="true" />
              )}
              {t('signup.submit')}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-5 flex flex-col gap-1">
            <p className="m-0 text-[13px] text-outline">
              {t('signup.have_account')}{' '}
              <Link href="/signin" className="text-[13px] text-on-surface no-underline transition-colors duration-150 hover:text-white hover:underline">
                {t('signup.signin_link')}
              </Link>
            </p>
          </div>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/10" />
            <span className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.06em] text-outline-variant">
              {t('signup.or_continue')}
            </span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          {/* OAuth buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 rounded border border-white/15 bg-transparent px-4 py-2.5 text-[13px] font-medium text-on-surface transition-[border-color,background] duration-150 hover:border-white/40 hover:bg-white/[0.04] cursor-pointer"
              onClick={() => {
                toast.loading('Redirecting to Google…', { id: 'oauth' })
                signIn('google', { callbackUrl: '/dashboard' })
              }}
              aria-label={t('signup.google')}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
              </svg>
              {t('signup.google')}
            </button>

            <button
              type="button"
              className="flex flex-1 items-center justify-center gap-2 rounded border border-white/15 bg-transparent px-4 py-2.5 text-[13px] font-medium text-on-surface transition-[border-color,background] duration-150 hover:border-white/40 hover:bg-white/[0.04] cursor-pointer"
              onClick={() => {
                toast.loading('Redirecting to GitHub…', { id: 'oauth' })
                signIn('github', { callbackUrl: '/dashboard' })
              }}
              aria-label={t('signup.github')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
              </svg>
              {t('signup.github')}
            </button>
          </div>

        </div>
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
              {t('signup.panel_title')}
            </h2>
            <p className="mb-3 max-w-[400px] text-[15px] leading-relaxed text-outline">
              {t('signup.panel_desc')}
            </p>
            <p className="m-0 font-mono text-[12px] tracking-[0.02em] text-outline-variant">
              {t('signup.panel_social')}
            </p>
          </div>

          {/* Feature card */}
          <div className="relative z-10 rounded-xl border border-white/[0.08] bg-white/[0.04] p-6">
            <p className="mb-2 text-lg font-semibold tracking-[-0.02em] text-on-surface">
              {t('signup.panel_card_title')}
            </p>
            <p className="mb-4 text-sm leading-relaxed text-outline">
              {t('signup.panel_card_desc')}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex">
                {['K', 'M', 'A', 'J', '+2'].map((letter, i) => (
                  <div
                    key={i}
                    className={[
                      'flex size-8 items-center justify-center rounded-full',
                      'border-2 border-surface-container-lowest bg-surface-container-high',
                      'font-mono text-[11px] font-medium text-on-surface',
                      i !== 0 ? '-ml-1.5' : '',
                    ].join(' ')}
                  >
                    {letter}
                  </div>
                ))}
              </div>
              <span className="font-mono text-[11px] text-outline-variant">{t('signup.panel_card_members')}</span>
            </div>
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
