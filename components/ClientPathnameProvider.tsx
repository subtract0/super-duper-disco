"use client";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function ClientPathnameProvider({ children }: { children: ReactNode }) {
  // This provider can be extended to provide pathname context if needed
  usePathname(); // Ensure hook runs in client
  return <>{children}</>;
}
