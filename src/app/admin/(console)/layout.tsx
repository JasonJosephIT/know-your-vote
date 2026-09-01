import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { SessionRefresh } from "@/components/admin/SessionRefresh";
import { createAdminServerClient, requireAdmin } from "@/lib/admin/guard";

/* The authed console shell: header (operator identity + sign-out) and section
   nav, wrapping the overview and the five section pages. requireAdmin() gates
   the shell for UX; each page re-checks as the real boundary (layouts don't
   re-run on client navigation — Next.js auth guidance). Sign-in and the
   magic-link callback sit OUTSIDE this (console) group, so they render without
   a session and this guard never loops on them. */
export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { email } = await requireAdmin();

  async function signOut(): Promise<void> {
    "use server";
    const supabase = await createAdminServerClient();
    await supabase.auth.signOut();
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-full flex-col">
      <SessionRefresh />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between gap-3 px-3 py-3 md:px-5">
          <span className="font-heading text-h3 text-primary">
            Operator Console
          </span>
          <div className="flex items-center gap-3">
            <span
              className="hidden max-w-[200px] truncate text-caption text-on-surface-muted sm:inline"
              title={email}
            >
              {email}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-sm px-2 py-1 text-caption text-on-surface-muted underline underline-offset-2 hover:text-on-surface"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <AdminNav />

      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 py-6 md:px-5">
        {children}
      </main>
    </div>
  );
}
