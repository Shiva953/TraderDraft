'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isChunkError: boolean;
}

export class ChunkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isChunkError: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if it's a chunk loading error
    const isChunkError =
      error.name === 'ChunkLoadError' ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to fetch dynamically imported module');

    console.error('🔴 [ChunkErrorBoundary] Caught error:', error);

    return {
      hasError: true,
      error,
      isChunkError,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🔴 [ChunkErrorBoundary] Error details:', error, errorInfo);

    // If it's a chunk error, reload the page once
    if (this.state.isChunkError) {
      const hasReloaded = sessionStorage.getItem('chunk-error-reloaded');

      if (!hasReloaded) {
        console.log('🔄 [ChunkErrorBoundary] Reloading page to fetch fresh chunks...');
        sessionStorage.setItem('chunk-error-reloaded', 'true');

        // Wait a bit before reloading to avoid rapid reload loops
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        console.error('⚠️ [ChunkErrorBoundary] Already reloaded once, not reloading again to prevent loop');
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        // Show a loading state while reloading
        return (
          <div className="flex items-center justify-center min-h-screen bg-black text-white">
            <div className="text-center max-w-md p-8">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">Loading Application...</h2>
              <p className="text-neutral-400 text-sm">
                Fetching latest version, please wait...
              </p>
            </div>
          </div>
        );
      }

      // For other errors, show error message
      return (
        <div className="flex items-center justify-center min-h-screen bg-black text-white">
          <div className="text-center max-w-md p-8 border border-red-900 rounded-lg bg-red-950/20">
            <h2 className="text-xl font-semibold mb-2 text-red-400">Something went wrong</h2>
            <p className="text-neutral-400 text-sm mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white text-black rounded-md hover:bg-neutral-200 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
