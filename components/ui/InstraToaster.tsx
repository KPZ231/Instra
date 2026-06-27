'use client'

import { Toaster } from 'sonner'

/**
 * InstraToaster  global Sonner toast container styled to Executive Precision design system.
 * Mount once in the root layout. Toasts are triggered via `toast()` from 'sonner' anywhere in the app.
 * @example
 * import { toast } from 'sonner'
 * toast.success('Campaign saved')
 * toast.error('Invalid credentials')
 */
export default function InstraToaster() {
  return (
    <>
      <Toaster
        position="bottom-right"
        expand={false}
        visibleToasts={4}
        gap={8}
        toastOptions={{
          classNames: {
            toast: 'instra-toast',
            title: 'instra-toast__title',
            description: 'instra-toast__desc',
            actionButton: 'instra-toast__action',
            cancelButton: 'instra-toast__cancel',
            closeButton: 'instra-toast__close',
            success: 'instra-toast--success',
            error: 'instra-toast--error',
            warning: 'instra-toast--warning',
            info: 'instra-toast--info',
            loading: 'instra-toast--loading',
          },
        }}
      />

      <style>{`
        /* ─── Base toast ─── */
        .instra-toast {
          background: #0d0f0b !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 6px !important;
          padding: 14px 16px !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 0.5px rgba(255,255,255,0.04) !important;
          display: flex !important;
          align-items: flex-start !important;
          gap: 10px !important;
          min-width: 300px !important;
          max-width: 400px !important;
          font-family: var(--font-sans, 'Hanken Grotesk', sans-serif) !important;
          position: relative !important;
          overflow: hidden !important;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                      opacity 0.2s ease,
                      box-shadow 0.2s ease !important;
        }

        .instra-toast:hover {
          border-color: rgba(255, 255, 255, 0.2) !important;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.7), 0 0 0 0.5px rgba(255,255,255,0.06) !important;
        }

        /* Accent bar on the left */
        .instra-toast::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background: rgba(255,255,255,0.15);
          border-radius: 6px 0 0 6px;
        }

        /* ─── Title ─── */
        .instra-toast__title {
          font-family: var(--font-sans, 'Hanken Grotesk', sans-serif) !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          color: #e3e3dc !important;
          letter-spacing: -0.01em !important;
          line-height: 1.3 !important;
          margin: 0 !important;
        }

        /* ─── Description ─── */
        .instra-toast__desc {
          font-family: var(--font-mono, 'JetBrains Mono', monospace) !important;
          font-size: 11px !important;
          font-weight: 400 !important;
          color: #8e9192 !important;
          letter-spacing: 0.02em !important;
          line-height: 1.5 !important;
          margin-top: 2px !important;
        }

        /* ─── Action button ─── */
        .instra-toast__action {
          font-family: var(--font-mono, 'JetBrains Mono', monospace) !important;
          font-size: 11px !important;
          font-weight: 500 !important;
          letter-spacing: 0.04em !important;
          text-transform: uppercase !important;
          background: rgba(255,255,255,0.08) !important;
          border: 1px solid rgba(255,255,255,0.15) !important;
          color: #e3e3dc !important;
          border-radius: 3px !important;
          padding: 4px 10px !important;
          cursor: pointer !important;
          transition: background 0.15s, border-color 0.15s !important;
        }

        .instra-toast__action:hover {
          background: rgba(255,255,255,0.14) !important;
          border-color: rgba(255,255,255,0.3) !important;
        }

        /* ─── Cancel button ─── */
        .instra-toast__cancel {
          font-family: var(--font-mono, 'JetBrains Mono', monospace) !important;
          font-size: 11px !important;
          color: #444748 !important;
          background: transparent !important;
          border: none !important;
          cursor: pointer !important;
          padding: 4px 8px !important;
          transition: color 0.15s !important;
        }

        .instra-toast__cancel:hover {
          color: #8e9192 !important;
        }

        /* ─── Close button ─── */
        .instra-toast__close {
          background: rgba(255,255,255,0.06) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 3px !important;
          color: #444748 !important;
          width: 20px !important;
          height: 20px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          transition: background 0.15s, color 0.15s !important;
          flex-shrink: 0 !important;
        }

        .instra-toast__close:hover {
          background: rgba(255,255,255,0.12) !important;
          color: #e3e3dc !important;
        }

        /* ─── Success variant ─── */
        .instra-toast--success::before {
          background: #00FF41 !important;
          box-shadow: 0 0 8px rgba(0, 255, 65, 0.4) !important;
        }

        .instra-toast--success .instra-toast__title {
          color: #e3e3dc !important;
        }

        /* ─── Error variant ─── */
        .instra-toast--error::before {
          background: #ffb4ab !important;
          box-shadow: 0 0 8px rgba(255, 180, 171, 0.35) !important;
        }

        .instra-toast--error {
          border-color: rgba(255, 180, 171, 0.15) !important;
        }

        .instra-toast--error .instra-toast__title {
          color: #ffb4ab !important;
        }

        /* ─── Warning variant ─── */
        .instra-toast--warning::before {
          background: #f5c542 !important;
          box-shadow: 0 0 8px rgba(245, 197, 66, 0.3) !important;
        }

        .instra-toast--warning {
          border-color: rgba(245, 197, 66, 0.12) !important;
        }

        .instra-toast--warning .instra-toast__title {
          color: #f5c542 !important;
        }

        /* ─── Info variant ─── */
        .instra-toast--info::before {
          background: #c6c6c7 !important;
        }

        .instra-toast--info .instra-toast__title {
          color: #e3e3dc !important;
        }

        /* ─── Loading variant ─── */
        .instra-toast--loading::before {
          background: linear-gradient(to bottom, #444748, rgba(68,71,72,0)) !important;
          animation: toast-loading-bar 1.5s ease-in-out infinite !important;
        }

        @keyframes toast-loading-bar {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 1; }
        }
      `}</style>
    </>
  )
}
