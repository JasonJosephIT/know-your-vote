import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DegradedBanner } from "@/components/admin/DegradedBanner";
import {
  createAdminServerClient,
  isAdminAuthConfigured,
  isAllowlisted,
} from "@/lib/admin/guard";

export const metadata = { title: "Operator sign-in — Know Your Vote" };

const emailSchema = z.email();

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/* Magic-link sign-in (design.md § 5). Server Action so no browser Supabase
   client and no client JS are needed; state is carried back in the URL so the
   page degrades honestly with or without JavaScript. The allowlist is checked
   BEFORE any link is sent, so a non-allowlisted email can never even begin a
   sign-in; messaging stays neutral so the allowlist can't be enumerated. */
async function requestLink(formData: FormData): Promise<void> {
  "use server";

  const parsed = emailSchema.safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) {
    redirect("/admin/login?error=invalid_email");
  }
  const email = parsed.data.toLowerCase();

  if (!isAdminAuthConfigured()) {
    redirect("/admin/login?error=not_configured");
  }

  if (isAllowlisted(email)) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    const origin = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_SITE_URL ?? "";

    const supabase = await createAdminServerClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/admin/auth/callback` },
    });
  }

  /* Neutral outcome whether or not the email was allowlisted. */
  redirect("/admin/login?sent=1");
}

function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const configured = isAdminAuthConfigured();
  const sent = firstParam(sp.sent) === "1";
  const denied = firstParam(sp.denied) === "1";
  const error = firstParam(sp.error);

  const errorCopy: Record<string, string> = {
    invalid_email: "That doesn't look like an email address. Try again.",
    not_configured: "Admin sign-in isn't configured yet.",
    missing_code: "That sign-in link was incomplete. Request a new one.",
    exchange_failed: "That sign-in link has expired or was already used.",
  };

  return (
    <main className="mx-auto flex min-h-full w-full max-w-[440px] flex-col justify-center gap-5 px-5 py-10">
      <div className="flex flex-col gap-1">
        <span className="text-overline text-on-surface-muted">Know Your Vote</span>
        <h1 className="text-h1">Operator sign-in</h1>
        <p className="text-body-sm text-on-surface-muted">
          Restricted to the site operator. A one-time sign-in link is emailed to
          allowlisted addresses only.
        </p>
      </div>

      {denied ? (
        <div
          role="alert"
          className="rounded-md border border-border-strong bg-surface-muted px-4 py-3 text-body-sm"
        >
          <span className="font-semibold text-error">Not authorized.</span>{" "}
          <span className="text-on-surface-muted">
            That account isn&apos;t on the operator allowlist.
          </span>
        </div>
      ) : null}

      {error && errorCopy[error] ? (
        <div
          role="alert"
          className="rounded-md border border-border-strong bg-surface-muted px-4 py-3 text-body-sm text-on-surface-muted"
        >
          {errorCopy[error]}
        </div>
      ) : null}

      {!configured ? (
        <DegradedBanner missing="ADMIN_EMAILS">
          Set <code className="font-mono">ADMIN_EMAILS</code> (comma-separated,
          allowlisted operator addresses) in the environment, and enable Supabase
          Auth on the project, to turn on sign-in. Until then the console is
          reachable by no one.
        </DegradedBanner>
      ) : sent ? (
        <div
          role="status"
          className="rounded-md border border-primary/40 bg-primary-muted px-4 py-3 text-body-sm text-on-surface"
        >
          <span className="font-semibold text-primary">Check your email.</span>{" "}
          <span className="text-on-surface-muted">
            If that address is an operator account, a one-time sign-in link is on
            its way. The link opens the console directly.
          </span>
        </div>
      ) : (
        <form action={requestLink} className="flex flex-col gap-3">
          <label htmlFor="email" className="text-label">
            Operator email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
          <Button type="submit" className="w-full">
            Email me a sign-in link
          </Button>
        </form>
      )}
    </main>
  );
}
