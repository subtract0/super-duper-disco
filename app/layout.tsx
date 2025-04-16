import './globals.css';
import { SentryErrorBoundary } from '../components/SentryErrorBoundary';
import { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SentryErrorBoundary>
          {children}
        </SentryErrorBoundary>
      </body>
    </html>
  );
}
