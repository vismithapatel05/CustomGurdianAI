import React from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans">
          <div className="max-w-xl w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <FiAlertTriangle className="text-3xl text-red-500" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-red-400">Validation Failed</h1>
                <p className="text-slate-400 mt-1">Unable to process the validation result due to a rendering error.</p>
              </div>
            </div>
            
            <div className="bg-black/50 p-4 rounded-lg overflow-x-auto mb-8 border border-slate-800">
              <p className="text-red-400 font-mono text-sm mb-2">{this.state.error && this.state.error.toString()}</p>
              <pre className="text-slate-500 font-mono text-xs whitespace-pre-wrap">
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </div>
            
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold transition-colors border border-slate-700 hover:border-slate-600"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}
