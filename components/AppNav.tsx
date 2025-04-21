"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppNav() {
  const pathname = usePathname() || "";
  return (
    <>
      {/* Skip to content for accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only bg-blue-700 text-white p-2 absolute left-2 top-2 z-50 rounded">Skip to main content</a>
      <nav aria-label="Main navigation" className="w-full bg-gradient-to-r from-neutral-900 to-neutral-800 text-white shadow-md z-50">
        <ul className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-10 py-4 font-bold text-lg">
          <li>
            <Link href="/" legacyBehavior>
              <a
                className={`px-3 py-1 rounded transition focus:outline-none focus-visible:ring-2 ring-blue-400 ${pathname === "/" ? "bg-blue-600 text-white" : "hover:bg-neutral-700"}`}
                aria-current={pathname === "/" ? "page" : undefined}
                tabIndex={0}
              >
                Home
              </a>
            </Link>
          </li>
          <li>
            <Link href="/agents" legacyBehavior>
              <a
                className={`px-3 py-1 rounded transition focus:outline-none focus-visible:ring-2 ring-blue-400 ${pathname.startsWith("/agents") ? "bg-blue-600 text-white" : "hover:bg-neutral-700"}`}
                aria-current={pathname.startsWith("/agents") ? "page" : undefined}
                tabIndex={0}
              >
                Agent Swarm Dashboard
              </a>
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
