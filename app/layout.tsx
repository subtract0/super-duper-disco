import * as React from "react";
import './globals.css';
import { SentryErrorBoundary } from '../components/SentryErrorBoundary';
import { ReactNode } from 'react';
import AppNav from '../components/AppNav';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppNav />
        <SentryErrorBoundary>
          {children}
        </SentryErrorBoundary>
      </body>
    </html>
  );
}
