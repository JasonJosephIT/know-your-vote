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

/* `pendingCount` (the same measured count as Overview panel 5) drives the Queue
   badge. null = couldn't measure (ops plane down) → no badge, never a fake 0. */
export function AdminNav({ pendingCount }: { pendingCount?: number | null }) {
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
          const showBadge =
            item.href === "/admin/queue" &&
            typeof pendingCount === "number" &&
            pendingCount > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-body-sm transition-colors ${
                active
                  ? "border-primary text-primary-hover"
                  : "border-transparent text-on-surface-muted hover:text-on-surface"
              }`}
            >
              {item.label}
              {showBadge ? (
                <span
                  aria-label={`${pendingCount} items awaiting review`}
                  className="min-w-[18px] rounded-full bg-primary px-1.5 text-center text-caption text-on-primary"
                >
                  {pendingCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
