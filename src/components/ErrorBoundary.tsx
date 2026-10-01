import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in LubeFlow Pro:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center select-none z-[999999]">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mb-4 text-2xl">
            ⚠️
          </div>
          <h1 className="text-xl font-bold tracking-tight mb-1">System Recovered</h1>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            An unexpected render issue was safely caught. Your offline data remains intact.
          </p>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-rose-300 max-w-md w-full mb-5 overflow-auto text-left max-h-32">
            {this.state.error?.message || 'Unknown render error'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
            >
              Reload System
            </button>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
              }}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
            >
              Try Recovering
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
