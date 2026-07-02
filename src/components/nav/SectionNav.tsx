"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/races",
    label: "Races",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="3" y="4" width="14" height="12" rx="1.5" />
        <path d="M6.5 8h7M6.5 12h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/candidates",
    label: "Candidates",
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
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 5.5h9.5v10H5.5A1.5 1.5 0 0 1 4 14V5.5Z" />
        <path d="M13.5 8H16v6.5a1 1 0 0 1-1 1h-1.5M6.5 8.5H11M6.5 11h4.5M6.5 13h3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/find-my-candidates",
    label: "Find Mine",
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <circle cx="9" cy="9" r="4.5" />
        <path d="m12.5 12.5 3.5 3.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function SectionNav() {
  const pathname = usePathname();

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
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
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
