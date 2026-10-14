/* The source line under every claim (Mobbin catalog 2026-10-12, CP3: "Each
   source line says what kind of source it is and when we read it").

   "Source: janedoe.com · Campaign website · retrieved Sep 29, 2026". It
   renders on every candidate page and every race page, so what would
   quietly break it is a field shown that the row doesn't hold, a type that
   looks heavier than the others, or a raw url that throws. This checks:

   1. The words: one plain label per source.type, exactly the catalog's,
      and nothing for a type the table doesn't know.
   2. sourceLine: the url only when safeHttpUrl passes it; the host for
      screen readers only when the publisher doesn't already say it; the
      retrieved date in Florida's zone, and nothing when retrieved_at is
      missing or isn't a date. It never carries a lean.
   3. SourceLinks prints sourceLine's parts and nothing of its own: the
      link or plain text, the hidden host and "(opens in a new tab)", the
      type as a plain word and the date in a <time>, all in mono, and it
      never branches on the type or reads the raw url.
   4. Each guard above catches the change it exists for (mutations).

   Pure and offline. Run: node scripts/verify-source-line.ts */

import { SOURCE_TYPE_LABEL, sourceLine } from "../src/lib/source-line.ts";
import type { Source } from "../src/types/schema.ts";
import { checker, edit, importVariant, read, stripComments } from "./source-checks.ts";

const { check, mutation, done } = checker("source-line");
type Module = typeof import("../src/lib/source-line.ts");
const MODULE = "src/lib/source-line.ts";

/* 1. The words. The catalog's build note for CP3, word for word. */
const WANT: Record<Source["type"], string> = {
  candidate_self: "Campaign website",
  primary_doc: "Official record",
  factual_reporting: "News report",
  opinion: "Opinion",
};

function labelProblems(labels: Record<string, string>): string[] {
  const problems: string[] = [];
  if (JSON.stringify(labels) !== JSON.stringify(WANT)) {
    problems.push(`labels are ${JSON.stringify(labels)}, want ${JSON.stringify(WANT)}`);
  }
  if (new Set(Object.values(labels)).size !== Object.keys(labels).length) problems.push("two types share a label");
  return problems;
}

const labels = labelProblems(SOURCE_TYPE_LABEL);
check("one plain label per source.type, exactly the catalog's", labels.length === 0, labels.join("; "));

/* 2. sourceLine. Rows shaped like the live ones (2026-10-13: all 119
   sources behind published claims are candidate_self, https, with the
   host as publisher), plus the cases the live data doesn't have yet. */
type Row = Pick<Source, "url" | "publisher" | "type" | "retrieved_at">;
const row = (over: Partial<Record<keyof Row, unknown>> = {}): Row =>
  ({
    url: "https://www.janedoe.com/issues",
    publisher: "www.janedoe.com",
    type: "candidate_self",
    retrieved_at: "2026-09-29T11:41:45+00:00",
    ...over,
  }) as Row;

type Want = Partial<ReturnType<Module["sourceLine"]>> & { label?: string | null };

function lineProblems(line: Module["sourceLine"]): string[] {
  const problems: string[] = [];
  const cases: Array<[string, Row, Want]> = [
    ["a live-shaped row", row(), {
      publisher: "www.janedoe.com", href: "https://www.janedoe.com/issues", host: null,
      typeLabel: "Campaign website", label: "Sep 29, 2026",
    }],
    ["the publisher is the host without www.", row({ publisher: "janedoe.com" }), { host: null }],
    ["a publisher that isn't the host", row({
      url: "https://www.miamiherald.com/news/a.html", publisher: "Miami Herald", type: "factual_reporting",
    }), { publisher: "Miami Herald", host: "miamiherald.com", typeLabel: "News report" }],
    ["an official record", row({ type: "primary_doc" }), { typeLabel: "Official record" }],
    ["an opinion piece", row({ type: "opinion" }), { typeLabel: "Opinion" }],
    ["a late-evening read stays on Florida's day", row({ retrieved_at: "2026-09-30T02:00:00Z" }), { label: "Sep 29, 2026" }],
    ["Postgres's own timestamp shape", row({ retrieved_at: "2026-09-27 12:50:23+00" }), { label: "Sep 27, 2026" }],
    ["no retrieved_at prints no date", row({ retrieved_at: null }), { retrieved: null }],
    ["an empty retrieved_at prints no date", row({ retrieved_at: "" }), { retrieved: null }],
    ["a retrieved_at that isn't a date prints no date", row({ retrieved_at: "last week" }), { retrieved: null }],
    ["an unknown type prints no type", row({ type: "rumour" }), { typeLabel: null }],
    ["a prototype key prints no type", row({ type: "toString" }), { typeLabel: null }],
    ["a javascript: url is no link", row({ url: "javascript:alert(1)" }), { href: null, host: null, publisher: "www.janedoe.com" }],
    ["a malformed url is no link and doesn't throw", row({ url: "not a url" }), { href: null, host: null }],
    ["a blank publisher falls back to the host", row({ publisher: "  " }), { publisher: "janedoe.com", host: null }],
  ];
  for (const [name, input, want] of cases) {
    let got: ReturnType<Module["sourceLine"]>;
    try {
      got = line(input);
    } catch (err) {
      problems.push(`${name}: throws ${String(err)}`);
      continue;
    }
    const { label, ...fields } = want;
    for (const [key, value] of Object.entries(fields)) {
      const actual = got[key as keyof typeof got];
      if (JSON.stringify(actual) !== JSON.stringify(value)) {
        problems.push(`${name}: ${key} is ${JSON.stringify(actual)}, want ${JSON.stringify(value)}`);
      }
    }
    if (label !== undefined && (got.retrieved?.label ?? null) !== label) {
      problems.push(`${name}: date is ${JSON.stringify(got.retrieved?.label)}, want ${JSON.stringify(label)}`);
    }
    if (got.retrieved && got.retrieved.iso !== input.retrieved_at) {
      problems.push(`${name}: <time dateTime> must be the stored retrieved_at, unchanged`);
    }
  }
  /* Same fields for every type, and no lean, whatever the row carries. */
  const keys = JSON.stringify(Object.keys(line(row())).sort());
  for (const type of Object.keys(WANT)) {
    const got = line({ ...row({ type }), lean_tag: "left" } as Row);
    if (JSON.stringify(Object.keys(got).sort()) !== keys) problems.push(`${type} gets different fields`);
    if (/left|right|center|lean/i.test(JSON.stringify(got))) problems.push(`${type}: a lean reached the line`);
  }
  return problems;
}

const line = lineProblems(sourceLine);
check("sourceLine: safe link, host only when new, Florida's date, nothing it doesn't hold, no lean", line.length === 0, line.join("; "));

/* 3. The component. */
const COMPONENT = "src/components/features/SourceLinks.tsx";

function componentProblems(code: string): string[] {
  const c = stripComments(code);
  const problems: string[] = [];
  if (!/import\s*\{\s*sourceLine\s*\}\s*from\s*["']@\/lib\/source-line["']/.test(c)) {
    problems.push("must import sourceLine from @/lib/source-line");
  }
  if (!/const line = sourceLine\(s\);/.test(c)) problems.push("each source must go through sourceLine(s)");
  if (/\bs\.(url|publisher|type|retrieved_at|lean_tag)\b/.test(c)) {
    problems.push("reads a source field directly instead of through sourceLine");
  }
  if (!/\{line\.href \? \(\s*<a\s+href=\{line\.href\}/.test(c) || !/\) : \(\s*<span>\{line\.publisher\}<\/span>\s*\)\}/.test(c)) {
    problems.push("the publisher must be a link only when line.href is set, plain text otherwise");
  }
  if (!/<span className="sr-only">\s*\{line\.host \? `, \$\{line\.host\}` : ""\} \(opens in a new tab\)\s*<\/span>\s*<\/a>/.test(c)) {
    problems.push('the link must end with the hidden host (when new) and "(opens in a new tab)"');
  }
  if (!/\{line\.typeLabel && <span>· \{line\.typeLabel\}<\/span>\}/.test(c)) {
    problems.push("the type must be a plain word, printed only when there is one");
  }
  if (!/\{line\.retrieved && \(\s*<span>\s*· retrieved\{" "\}\s*<time dateTime=\{line\.retrieved\.iso\}>\{line\.retrieved\.label\}<\/time>/.test(c)) {
    problems.push("the date must be a <time> after \"retrieved\", printed only when there is one");
  }
  if (!/className="flex flex-col font-mono text-mono text-on-surface-muted"/.test(c)) {
    problems.push("the whole line stays in mono and muted, one style for every source");
  }
  if (!/<a\s+href=\{line\.href\}[^>]*className="[^"]*\bmin-h-\[24px\]/.test(c)) problems.push("the link keeps a 24px target");
  if (/typeLabel\s*===|type\s*===|isOpinion|lean/i.test(c)) {
    problems.push("never branches on the type or prints a lean: every type looks the same");
  }
  return problems;
}

const component = componentProblems(read(COMPONENT));
check(`${COMPONENT} prints sourceLine's parts, the same way for every type`, component.length === 0, component.join("; "));

/* 4. Mutations. */
await mutation("the date loses Florida's zone", async () => {
  const m = await importVariant<Module>(MODULE, [['timeZone: "America/New_York"', 'timeZone: "UTC"']]);
  return lineProblems(m.sourceLine);
});
await mutation("a missing retrieved_at becomes today", async () => {
  const m = await importVariant<Module>(MODULE, [["if (!iso) return null;", "if (!iso) iso = new Date().toISOString();"]]);
  return lineProblems(m.sourceLine);
});
await mutation("an unknown type prints its raw code", async () => {
  const m = await importVariant<Module>(MODULE, [[/\? SOURCE_TYPE_LABEL\[s\.type\]\s*: null/, "? SOURCE_TYPE_LABEL[s.type] : s.type"]]);
  return lineProblems(m.sourceLine);
});
await mutation("the raw url is used (safeHttpUrl skipped)", async () => {
  const m = await importVariant<Module>(MODULE, [["const href = safeHttpUrl(s.url);", "const href = s.url || null;"]]);
  return lineProblems(m.sourceLine);
});
await mutation("the host is read out even when the publisher says it", async () => {
  const m = await importVariant<Module>(MODULE, [["hostname && bare(publisher) !== hostname ? hostname : null", "hostname"]]);
  return lineProblems(m.sourceLine);
});
await mutation('"Opinion" gets a heavier word', async () => {
  const m = await importVariant<Module>(MODULE, [['opinion: "Opinion"', 'opinion: "OPINION (one side)"']]);
  return labelProblems(m.SOURCE_TYPE_LABEL);
});
await mutation("the link goes back to the raw url", () =>
  componentProblems(edit(read(COMPONENT), "href={line.href}", "href={s.url}")),
);
await mutation("the hidden host and new-tab note are dropped", () =>
  componentProblems(edit(read(COMPONENT), /<span className="sr-only">[\s\S]*?<\/span>/, "")),
);
await mutation("the date is printed without a <time>", () =>
  componentProblems(edit(read(COMPONENT), /<time dateTime=\{line\.retrieved\.iso\}>\{line\.retrieved\.label\}<\/time>/, "{line.retrieved.label}")),
);
await mutation("opinion gets its own style", () =>
  componentProblems(
    edit(read(COMPONENT), "<span>· {line.typeLabel}</span>", '<span className={line.typeLabel === "Opinion" ? "font-semibold" : undefined}>· {line.typeLabel}</span>'),
  ),
);
await mutation("the link loses its 24px target", () =>
  componentProblems(edit(read(COMPONENT), "inline-flex min-h-[24px] items-center underline", "underline")),
);
await mutation("the line leaves mono", () =>
  componentProblems(edit(read(COMPONENT), "font-mono text-mono ", "")),
);

done();
