import React from 'react';
import { render } from '@testing-library/react';
import * as Sentry from '@sentry/react';

// Dummy ErrorBoundary for demonstration
const SentryErrorBoundary = Sentry.ErrorBoundary || (({ children }) => <>{children}</>);

describe('SentryErrorBoundary', () => {
  it('renders children when no error', () => {
    const { getByText } = render(
      <SentryErrorBoundary>
        <div>Child</div>
      </SentryErrorBoundary>
    );
    expect(getByText('Child')).toBeInTheDocument();
  });

  // To fully test error catching, you'd need to simulate an error and mock Sentry.captureException
});
