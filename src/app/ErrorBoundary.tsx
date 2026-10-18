import { Component, type ReactNode } from 'react';
import { ErrorState } from './states/ErrorState';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  render() {
    const { error } = this.state;
    if (error) return <ErrorState error={error} onRetry={() => this.setState({ error: null })} />;
    return this.props.children;
  }
}
