/* Shared feed/contact formatting helpers. */

export function formatNewsDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* Agent-written rows (news_item url, candidate_contact urls) are ingested
   from the open web; only ever render them as links when they are plain
   http(s). React 19 already neutralizes javascript: hrefs — this keeps
   every other scheme (data:, blob:, mailto-smuggling…) out too. */
export function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? url
      : null;
  } catch {
    return null;
  }
}
