import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Operator Console — Know Your Vote",
  robots: { index: false, follow: false },
};

/* Admin root shell. A fixed, full-viewport surface so the whole /admin subtree
   (sign-in included) renders on its own canvas — this covers the voter
   SectionNav from the root layout without editing any voter-facing file, and
   ignores the body padding that reserves space for that nav. Auth is NOT
   enforced here: the sign-in and magic-link-callback routes live under /admin
   too and must render without a session. The authed shell + guard live one
   level down in (console)/layout.tsx. */
export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background text-on-surface">
      {children}
    </div>
  );
}
