import * as React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    (this as any).state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    (this as any).setState({ error, errorInfo });
  }

  render() {
    const state = (this as any).state as State;
    if (state.hasError) {
      return (
        <div className="min-h-screen bg-canvas text-text-primary flex items-center justify-center p-6">
          <div className="max-w-xl w-full bg-surface border border-border-strong p-8 space-y-6 shadow-2xl">
            <div className="flex items-center space-x-3 text-danger">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <div>
                <h1 className="text-xl font-display font-medium">Erro crítico na renderização da aplicação</h1>
                <p className="text-xs font-mono text-text-muted">E³I Processos Inteligentes • Error Boundary</p>
              </div>
            </div>

            <div className="p-4 bg-surface-raised border border-border-subtle font-mono text-xs text-text-secondary overflow-auto max-h-48 space-y-2">
              <div className="font-semibold text-danger">{state.error?.toString()}</div>
              {state.errorInfo?.componentStack && (
                <pre className="text-[10px] text-text-muted whitespace-pre-wrap">
                  {state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="flex justify-end space-x-4 pt-4 border-t border-border-subtle">
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-4 py-2 bg-surface-raised border border-border-strong text-text-primary text-xs font-mono hover:border-gold transition-colors"
              >
                LIMPAR CACHE E REINICIAR
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-mono tracking-wider flex items-center space-x-2 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>ATUALIZAR APLICAÇÃO</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
