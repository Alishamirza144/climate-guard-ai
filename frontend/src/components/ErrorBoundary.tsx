import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Unhandled UI error', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-6 text-center text-slate-100" role="alert">
          <div className="max-w-md rounded-2xl border border-amber-500/40 bg-slate-900/80 p-6">
            <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
            <p className="mt-3 text-sm text-slate-300">
              The app encountered an unexpected error. Please refresh the page or return to the dashboard.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-900"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
