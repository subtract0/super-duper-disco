import * as React from "react";
import './globals.css';
import { SentryErrorBoundary } from '../components/SentryErrorBoundary';
import { ReactNode } from 'react';
import AppNav from '../components/AppNav';

import Footer from '../components/Footer';
import Breadcrumbs from '../components/Breadcrumbs';
import { usePathname } from 'next/navigation';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppNav />
        {/* Breadcrumbs: only show if not on home page */}
        {typeof window !== 'undefined' && usePathname() !== '/' && <Breadcrumbs />}
        <SentryErrorBoundary>
          <main id="main-content" tabIndex={-1} className="min-h-[70vh] focus:outline-none">
            {children}
          </main>
        </SentryErrorBoundary>
        <Footer />
      </body>
    </html>
  );
}
