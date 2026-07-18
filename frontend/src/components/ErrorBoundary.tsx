import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Component error:', error, errorInfo);
    
    // Log additional details from window if available
    const win = window as any;
    console.error('--- DIAGNOSTICS ---');
    console.error('Last SSE Event:', win._lastSSEEvent);
    console.error('Last Rendered Section:', win._lastRenderedSection);
    console.error('Generation State:', win._generationState);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'white', backgroundColor: '#990000', borderRadius: 8, margin: 20 }}>
          <h2>Application Crash</h2>
          <p>{this.state.error?.message}</p>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}
