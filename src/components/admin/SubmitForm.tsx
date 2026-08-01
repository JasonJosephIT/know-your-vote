"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { findAllBannedTermMatches } from "@/lib/neutrality";
import type { RaceRef, CandidateRef } from "@/lib/admin/refs";

/* Submit forms (handoff A3 §A; PRD AFR-020…022). Three kinds behind a segmented
   control; each builds the matching ingest payload and POSTs to
   /api/admin/ingest. Nothing publishes — success routes to the queue. The news
   form runs an ADVISORY neutrality lint (shared matcher) inline; the operator
   may still submit (approval re-lints authoritatively). */

type Kind = "news" | "unclear" | "unverified";

const KINDS: { value: Kind; label: string }[] = [
  { value: "news", label: "News story" },
  { value: "unclear", label: "Unclear statement" },
  { value: "unverified", label: "Unverified fact" },
];

const fieldClass =
  "w-full rounded-md border border-border-strong bg-surface px-[14px] py-3 text-body text-on-surface placeholder:text-on-surface-muted focus:border-primary focus:shadow-[inset_0_0_0_1px_var(--color-primary)] focus:outline-none";

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-label">
      {children}
    </label>
  );
}
function Help({ children }: { children: React.ReactNode }) {
  return <p className="text-caption text-on-surface-muted">{children}</p>;
}

export function SubmitForm({
  races,
  candidates,
  metros,
  today,
}: {
  races: RaceRef[];
  candidates: CandidateRef[];
  metros: readonly string[];
  today: string;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("news");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // shared scope + text fields
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [url, setUrl] = useState("");
  const [metro, setMetro] = useState("");
  const [raceId, setRaceId] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [publishedAt, setPublishedAt] = useState(today);
  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [linted, setLinted] = useState(false);

  // Advisory lint (news title+summary), recomputed as they change; only shown
  // once the operator has interacted (blur) so it isn't shouting on an empty form.
  const lintFlags = useMemo(
    () => (kind === "news" ? findAllBannedTermMatches(`${title} ${summary}`) : []),
    [kind, title, summary]
  );

  function reset() {
    setTitle("");
    setSummary("");
    setUrl("");
    setMetro("");
    setRaceId("");
    setCandidateId("");
    setPublishedAt(today);
    setText("");
    setContext("");
    setSourceUrl("");
    setLinted(false);
    setError(null);
  }

  function undef(v: string): string | undefined {
    const t = v.trim();
    return t.length > 0 ? t : undefined;
  }

  function buildBody(): { kind: string; payload: Record<string, unknown> } {
    if (kind === "news") {
      return {
        kind: "manual_news",
        payload: {
          item_type: candidateId ? "candidate_news" : "election_news",
          title: title.trim(),
          summary: undef(summary),
          url: url.trim(),
          metro: undef(metro),
          race_id: undef(raceId),
          candidate_id: undef(candidateId),
          published_at: publishedAt,
        },
      };
    }
    return {
      kind: kind === "unclear" ? "unclear_statement" : "unverified_fact",
      payload: {
        text: text.trim(),
        context: undef(context),
        candidate_id: undef(candidateId),
        race_id: undef(raceId),
        source_url: undef(sourceUrl),
      },
    };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      if (res.status === 201) {
        reset();
        router.push("/admin/queue?added=1");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(
        data?.missing
          ? `Unavailable — needs ${data.missing}.`
          : (data?.error ?? `Submission failed (HTTP ${res.status}).`)
      );
    } catch {
      setError("Network error — submission not sent.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {/* Kind selector */}
      <div
        role="radiogroup"
        aria-label="Submission kind"
        className="flex flex-wrap gap-2"
      >
        {KINDS.map((k) => (
          <Button
            key={k.value}
            type="button"
            role="radio"
            aria-checked={kind === k.value}
            variant={kind === k.value ? "primary" : "secondary"}
            onClick={() => {
              setKind(k.value);
              setError(null);
            }}
          >
            {k.label}
          </Button>
        ))}
      </div>

      {kind === "news" ? (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setLinted(true)}
              maxLength={240}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="summary">Summary</Label>
            <textarea
              id="summary"
              className={`${fieldClass} min-h-[96px]`}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              onBlur={() => setLinted(true)}
            />
            <Help>Optional. Keep it neutral — wording is linted below.</Help>
          </div>

          {linted && lintFlags.length > 0 ? (
            <div
              role="status"
              className="rounded-md border border-border-strong bg-accent-muted/60 px-3 py-2"
            >
              <p className="text-caption text-error">
                {lintFlags.length} wording{" "}
                {lintFlags.length === 1 ? "flag" : "flags"} — you can still queue
                this; approval re-checks.
              </p>
              <p className="mt-1 text-caption text-on-surface-muted">
                flagged:{" "}
                {lintFlags.map((t) => (
                  <span
                    key={t}
                    className="mr-1 rounded-sm bg-accent-muted px-1 font-mono"
                  >
                    {t}
                  </span>
                ))}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="url">Source URL</Label>
            <Input
              id="url"
              type="url"
              inputMode="url"
              placeholder="https://…"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <Help>Required. Must be an http(s) link.</Help>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="published_at">Published at</Label>
            <Input
              id="published_at"
              type="date"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="text">
              {kind === "unclear" ? "Statement" : "Claimed fact"}
            </Label>
            <textarea
              id="text"
              className={`${fieldClass} min-h-[96px]`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="context">Context</Label>
            <textarea
              id="context"
              className={`${fieldClass} min-h-[72px]`}
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
            <Help>Optional — why this needs review, where you saw it.</Help>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="source_url">Source URL</Label>
            <Input
              id="source_url"
              type="url"
              inputMode="url"
              placeholder="https://… (optional)"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </div>
        </>
      )}

      {/* Scope — shared by all kinds (news needs ≥ one; fact kinds optional). */}
      <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-4">
        <legend className="px-1 text-caption text-on-surface-muted">
          Scope {kind === "news" ? "(pick at least one)" : "(optional)"}
        </legend>
        {kind === "news" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="metro">Metro</Label>
            <select
              id="metro"
              className={fieldClass}
              value={metro}
              onChange={(e) => setMetro(e.target.value)}
            >
              <option value="">—</option>
              {metros.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor="race">Race</Label>
          <select
            id="race"
            className={fieldClass}
            value={raceId}
            onChange={(e) => setRaceId(e.target.value)}
          >
            <option value="">—</option>
            {races.map((r) => (
              <option key={r.race_id} value={r.race_id}>
                {r.office}
                {r.district ? ` (${r.district})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="candidate">Candidate</Label>
          <select
            id="candidate"
            className={fieldClass}
            value={candidateId}
            onChange={(e) => setCandidateId(e.target.value)}
          >
            <option value="">—</option>
            {candidates.map((c) => (
              <option key={c.candidate_id} value={c.candidate_id}>
                {c.legal_name}
              </option>
            ))}
          </select>
          {kind === "news" ? (
            <Help>
              Choosing a candidate files this as candidate news; otherwise it’s
              election news.
            </Help>
          ) : null}
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="text-caption text-error">
          {error}
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Adding…" : "Add to queue"}
        </Button>
      </div>
    </form>
  );
}
