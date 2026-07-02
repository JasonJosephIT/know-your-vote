"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/candidates",
    label: "Candidates",
    /* Race detail pages live under /races but belong to this section. */
    alsoMatch: ["/races"],
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="10" cy="7" r="3" />
        <path d="M4.5 16.5c.8-2.6 3-4 5.5-4s4.7 1.4 5.5 4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/news",
    label: "News",
    alsoMatch: [] as string[],
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 5.5h9.5v10H5.5A1.5 1.5 0 0 1 4 14V5.5Z" />
        <path d="M13.5 8H16v6.5a1 1 0 0 1-1 1h-1.5M6.5 8.5H11M6.5 11h4.5M6.5 13h3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/where-i-stand",
    label: "Where I Stand",
    alsoMatch: [] as string[],
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="10" cy="10" r="7.5" />
        <path d="M7.8 7.7a2.2 2.2 0 1 1 3.1 2.5c-.6.3-.9.8-.9 1.4" strokeLinecap="round" />
        <path d="M10 14.2h.01" strokeLinecap="round" strokeWidth="2.2" />
      </svg>
    ),
  },
];

export function SectionNav() {
  const pathname = usePathname();

  const isActive = (item: (typeof items)[number]) =>
    [item.href, ...item.alsoMatch].some(
      (base) => pathname === base || pathname.startsWith(`${base}/`)
    );

  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface shadow-elevation-2 md:top-0 md:bottom-auto md:border-t-0 md:border-b"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-2 md:px-5">
        <Link
          href="/"
          className="hidden rounded-sm px-2 py-2 font-heading text-h3 text-primary md:block"
        >
          Know Your Vote
        </Link>
        <div className="flex w-full items-stretch justify-around gap-1 p-2 md:w-auto md:justify-end md:gap-2">
          {items.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-w-[72px] flex-col items-center gap-[2px] rounded-sm px-2 py-2 text-caption md:min-w-[76px] ${
                  active
                    ? "bg-primary-muted text-primary-hover"
                    : "text-on-surface-muted hover:text-on-surface"
                }`}
              >
                <span className="size-5">{item.icon}</span>
                {item.label}
                {active && (
                  <span
                    aria-hidden
                    className="absolute bottom-[2px] h-[2px] w-4 rounded-full bg-accent"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
