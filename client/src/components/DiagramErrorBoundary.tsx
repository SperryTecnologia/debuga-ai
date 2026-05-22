import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * Error boundary specifically for diagram rendering.
 * Catches React Flow / ELK layout crashes and shows a friendly fallback
 * with automatic retry (up to 2 attempts).
 */
class DiagramErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn("[DiagramErrorBoundary] Caught error:", error.message, errorInfo.componentStack?.slice(0, 200));
    
    // Auto-retry once after a short delay
    if (this.state.retryCount < 2) {
      setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          error: null,
          retryCount: prev.retryCount + 1,
        }));
      }, 800);
    }
  }

  handleManualRetry = () => {
    this.setState({ hasError: false, error: null, retryCount: 0 });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError && this.state.retryCount >= 2) {
      return (
        <div className="my-4 rounded-xl border border-amber-500/30 bg-[#0a0f1a] p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200">
                {this.props.fallbackTitle || "Não foi possível renderizar o diagrama"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Ocorreu um erro ao processar o layout do diagrama. Isso pode acontecer com diagramas muito complexos.
              </p>
              <button
                onClick={this.handleManualRetry}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-400 bg-green-500/10 border border-green-500/30 rounded-md hover:bg-green-500/20 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      );
    }

    // During auto-retry, show loading
    if (this.state.hasError && this.state.retryCount < 2) {
      return (
        <div className="my-4 rounded-xl border border-slate-700/50 bg-[#0a0f1a] p-8 flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <div className="h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Renderizando diagrama...</span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DiagramErrorBoundary;
