"use client";
import * as Sentry from '@sentry/nextjs';
import { Component, ReactNode } from 'react';

interface SentryErrorBoundaryProps {
  children: ReactNode;
}

interface SentryErrorBoundaryState {
  hasError: boolean;
}

export class SentryErrorBoundary extends Component<SentryErrorBoundaryProps, SentryErrorBoundaryState> {
  constructor(props: SentryErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, { extra: { ...errorInfo } });
  }

  render() {
    if (this.state.hasError) {
      return <div>Sorry, something went wrong (and has been reported).</div>;
    }
    return this.props.children;
  }
}
