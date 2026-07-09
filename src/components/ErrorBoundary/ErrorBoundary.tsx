import React from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import logger from '../../utils/logger';

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        logger.error('Error caught by boundary:', error, errorInfo);
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: '#fff',
                        backgroundColor: '#131722'
                    }}
                >
                    <h2>Something went wrong</h2>
                    <p>{this.state.error?.message}</p>
                    <button onClick={() => window.location.reload()}>
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
