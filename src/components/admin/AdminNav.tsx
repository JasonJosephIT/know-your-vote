"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/* The six console sections (design.md § 4 / PRD § 3). Overview is exact-match
   so it isn't lit up by its own children; the rest match their subtree. */
const items = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/queue", label: "Queue" },
  { href: "/admin/submit", label: "Submit" },
  { href: "/admin/agents", label: "Agents" },
  { href: "/admin/site", label: "Site" },
  { href: "/admin/log", label: "Log" },
];

export function AdminNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/admin"
      ? pathname === "/admin"
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Console sections"
      className="border-b border-border bg-surface"
    >
      <div className="mx-auto flex w-full max-w-[1120px] gap-1 overflow-x-auto px-3 md:px-5">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 py-3 text-body-sm transition-colors ${
                active
                  ? "border-primary text-primary-hover"
                  : "border-transparent text-on-surface-muted hover:text-on-surface"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
