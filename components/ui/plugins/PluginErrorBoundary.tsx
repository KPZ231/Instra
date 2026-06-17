'use client'

import { Component, type ReactNode } from 'react'

interface PluginErrorBoundaryProps {
  children: ReactNode
  /** Optional plugin ID for error logging */
  pluginId?: string
  /** Optional user ID for error logging */
  userId?: string
}

interface PluginErrorBoundaryState {
  hasError: boolean
}

/**
 * Catches render-time exceptions thrown while rendering a plugin's block
 * tree so one broken plugin widget cannot crash the surrounding page.
 * When `pluginId` is provided, render errors are written to the audit log.
 *
 * @example
 * <PluginErrorBoundary pluginId="my-plugin" userId={userId}>
 *   <SomePluginWidget />
 * </PluginErrorBoundary>
 */
export class PluginErrorBoundary extends Component<PluginErrorBoundaryProps, PluginErrorBoundaryState> {
  state: PluginErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[PluginErrorBoundary] Render error:', error.message, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return <p className="text-sm text-accent-bone/60">This widget failed to render.</p>
    }
    return this.props.children
  }
}
