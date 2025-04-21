import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Build cumulative paths for each segment
  const crumbs = segments.map((seg, idx) => ({
    name: seg.charAt(0).toUpperCase() + seg.slice(1),
    href: "/" + segments.slice(0, idx + 1).join("/"),
    active: idx === segments.length - 1,
  }));

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-sm" style={{ borderBottom: "1px solid #e5e7eb" }}>
      <ol className="flex gap-2 items-center">
        <li>
          <Link href="/" className="text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 ring-blue-400">Home</Link>
        </li>
        {crumbs.map((crumb, i) => (
          <React.Fragment key={crumb.href}>
            <span aria-hidden="true" className="mx-1 text-neutral-400">/</span>
            <li aria-current={crumb.active ? "page" : undefined}>
              {crumb.active ? (
                <span className="font-bold text-neutral-800 dark:text-neutral-200">{crumb.name}</span>
              ) : (
                <Link href={crumb.href} className="text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 ring-blue-400">{crumb.name}</Link>
              )}
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
}
