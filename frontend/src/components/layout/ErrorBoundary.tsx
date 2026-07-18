import React, { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-bg-main p-4 text-center">
          <div className="glass p-8 rounded-2xl max-w-md w-full border border-red-500/20 bg-red-500/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-rose-500" />
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-text-primary mb-2">Application Error</h1>
            <p className="text-sm text-text-secondary mb-6">
              The application encountered an unexpected runtime error. We apologize for the inconvenience.
            </p>
            {this.state.error && (
              <div className="bg-bg-main p-4 rounded-lg mb-6 overflow-x-auto text-left border border-border">
                <code className="text-[10px] text-red-400 font-mono whitespace-pre-wrap break-words">
                  {this.state.error.message}
                </code>
              </div>
            )}
            <Button
              onClick={this.handleReset}
              className="w-full bg-red-500 hover:bg-red-600 text-white"
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              Reload Application
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
