/* TASK-069 verify: /news renders statewide items with no stored location.

   The acceptance is "/news with empty storage renders statewide items, not an
   empty state" — a live check needing a database. What this guards is the
   structure behind it, and the specific regression that would be invisible in
   review: an early `return` in the effect, or a location check that renders a
   prompt instead of the feed, puts the gate straight back.

   Updated by TASK-070, which removed kyv.location and with it the last
   location source this component had.

   REWRITTEN 2026-10-04 for TC-4 (docs/general-election/things-to-confirm.md).
   The old form asserted a literal `fetch("/api/news", { signal })` and an empty
   dependency array. Those were a PROXY for "no location gate", and they were
   the same thing until candidate-news-PRD.md §7 (task C9) made the feed send
   an optional `?county=` from the URL and depend on `[county]` — on purpose.
   The proxy went red on main and stayed red; the rule it stood for never broke.

   So this file now states the rule itself, in three parts, and none of them is
   "no parameters":

     A. NO STORAGE REACHES THE FEED. Neither NewsFeed.tsx, nor the /news page,
        nor any local module reachable from either through its imports (at any
        depth) reads device storage: localStorage, sessionStorage, IndexedDB, a
        cookie, or a `kyv.*` key. A cookie counts — `kyv.district` is device
        storage too, and the page is a server component, so `cookies()` is the
        form a regression would take there.
     B. THE FETCH IS UNCONDITIONAL. The /api/news request sits at the top level
        of the effect, starts its own statement, and nothing returns before it.
        The page renders NewsFeed once, and nothing returns or redirects before
        it. Every render path issues the fetch, with or without a county.
     C. PARAMETERS ARE OPTIONAL URL VALUES. Every query parameter and every
        effect dependency is one of the component's own OPTIONAL props. The
        page fills each of those props from its search params and from nothing
        else: the expression, and every const it reads, may name only `sp`
        (`const sp = await searchParams`, never written to), a local import
        (which part A has scanned), an arrow parameter, or a literal — and may
        not await. A value derived from storage would have to be a local, a
        hook result or a state — none is a prop, and none passes that test.

   REVIEWED 2026-10-04 (adversarial review of the TC-4 rewrite). The first
   rewrite scanned only NewsFeed's own imports, one level deep, and accepted any
   county declaration that mentioned `sp.county`. A page helper reading the
   `kyv.district` cookie, used as `sp.county ?? fallback`, passed every check.
   Part A now follows imports from the page as well, transitively, and part C
   reads every identifier the county expression depends on instead of looking
   for one it must contain. Both shapes the review used are in the self-test.

   Loosening the old regex to "any parameter is fine" would have retired the
   check rather than updated it; TC-4 says so in as many words. The self-test
   below is the evidence that it was not loosened: every way of putting a
   storage gate back that TC-4 names is applied to the real source in memory,
   and each one must turn this script red.

   Run:
     node scripts/verify-news-ungated.ts                 the repo
     node scripts/verify-news-ungated.ts --self-test     mutations must fail
     node scripts/verify-news-ungated.ts --root <dir>    a copy laid out like
                                                         the repo (scratch
                                                         mutation checks) */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const args = process.argv.slice(2);
const rootAt = args.indexOf("--root");
if (rootAt !== -1 && !args[rootAt + 1]) {
  console.error("--root needs a directory");
  process.exit(2);
}
const ROOT =
  rootAt === -1 ? resolve(import.meta.dirname, "..") : resolve(args[rootAt + 1]);

const FEED_PATH = "src/components/features/NewsFeed.tsx";
const ROUTE_PATH = "src/app/api/news/route.ts";
const PAGE_PATH = "src/app/(public)/news/page.tsx";

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

/* Every form of device storage this product has used or could reach for. The
   `kyv.*` literal catches a storage KEY even when the read goes through a
   helper this list does not name. useSyncExternalStore is here because in
   this component it existed only to read storage after hydration (TASK-070);
   it has no other job to come back for. A quoted "cookie" catches the
   request-header route round `cookies()`: `(await headers()).get("cookie")`.
   None of the 15 modules reachable from /news names any of these today. */
const STORAGE =
  /\b(?:localStorage|sessionStorage|indexedDB|useSyncExternalStore|DISTRICT_COOKIE)\b|document\.cookie|\bcookies\s*\(|["'`]kyv\.[\w.-]+["'`]|["'`][Cc]ookie["'`]/;

interface Sources {
  feed: string;
  route: string;
  page: string;
  /** A local module imported by `from` (a repo-relative path, or the id of an
      earlier result), by specifier. `id` is the module's repo-relative path —
      what the next level of imports resolves against. Null if unresolvable. */
  module: (specifier: string, from: string) => { id: string; text: string } | null;
}

function fromDisk(root: string): Sources {
  const read = (rel: string) => readFileSync(join(root, rel), "utf8");
  const cache = new Map<string, string>();
  return {
    feed: read(FEED_PATH),
    route: read(ROUTE_PATH),
    page: read(PAGE_PATH),
    module(specifier, from) {
      const base = specifier.startsWith("@/")
        ? join(root, "src", specifier.slice(2))
        : specifier.startsWith(".")
          ? resolve(dirname(join(root, from)), specifier)
          : null;
      if (!base) return null;
      for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx", ""]) {
        const p = base + ext;
        if (existsSync(p) && !p.endsWith("/")) {
          const id = relative(root, p);
          if (cache.has(id)) return { id, text: cache.get(id)! };
          try {
            const text = readFileSync(p, "utf8");
            cache.set(id, text);
            return { id, text };
          } catch {
            /* a directory with no index — keep looking */
          }
        }
      }
      return null;
    },
  };
}

/* Local value imports of one module: static `import … from`, `export … from`,
   side-effect `import "…"` and dynamic `import("…")`. Type-only imports are
   erased at runtime and cannot read anything. Packages (`next/link`, `react`)
   are not followed: what they do is not this repo's code. */
const IMPORT_SPEC =
  /^\s*(?:import|export)\s+(?!type\b)[^;]*?\bfrom\s+["']([^"']+)["']|^\s*import\s+["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)/gm;
const localImports = (text: string) =>
  [...text.matchAll(IMPORT_SPEC)]
    .map((m) => m[1] ?? m[2] ?? m[3])
    .filter((s) => s.startsWith("@/") || s.startsWith("."));

/** Every local module reachable from `roots` through value imports, at any
    depth. Today that is 15 modules from the /news page, none of which names
    device storage. */
function reachable(src: Sources, roots: { id: string; text: string }[]) {
  const seen = new Set(roots.map((r) => r.id));
  const queue = [...roots];
  const tainted: string[] = [];
  const unresolved: string[] = [];
  while (queue.length > 0) {
    const { id, text } = queue.shift()!;
    for (const spec of localImports(stripComments(text))) {
      const mod = src.module(spec, id);
      if (mod === null) {
        unresolved.push(`${spec} (from ${id})`);
        continue;
      }
      if (seen.has(mod.id)) continue;
      seen.add(mod.id);
      const hit = stripComments(mod.text).match(STORAGE)?.[0];
      if (hit) tainted.push(`${mod.id} (${hit}, via ${id})`);
      queue.push(mod);
    }
  }
  return { count: seen.size, tainted, unresolved };
}

/** Runs every check. Returns one line per result; failures start with FAIL. */
function runChecks(src: Sources): { lines: string[]; failures: number } {
  const lines: string[] = [];
  let failures = 0;
  const assert = (name: string, cond: boolean, extra = "") => {
    if (cond) lines.push(`  ok  ${name}`);
    else {
      failures++;
      lines.push(`FAIL  ${name}${extra ? ` — ${extra}` : ""}`);
    }
  };

  const feed = stripComments(src.feed);
  const route = stripComments(src.route);
  const page = stripComments(src.page);

  /* ---- A. No storage reaches the feed ---------------------------------- */

  const feedHit = feed.match(STORAGE)?.[0];
  assert("NewsFeed reads no device storage", !feedHit, `found ${feedHit}`);

  const pageHit = page.match(STORAGE)?.[0];
  assert("the /news page reads no device storage", !pageHit, `found ${pageHit}`);

  /* Every local module reachable from NewsFeed OR the page, at any depth. A
     storage read moved into a helper module is the obvious way round a check
     that only reads these two files, and the page counts as much as the feed:
     it is the page that fills `county`. This was one level from NewsFeed
     only until the 2026-10-04 review put a cookie reader behind the page. */
  const reach = reachable(src, [
    { id: FEED_PATH, text: src.feed },
    { id: PAGE_PATH, text: src.page },
  ]);
  assert(
    "no module reachable from /news reads device storage",
    reach.tainted.length === 0,
    reach.tainted.join("; ")
  );
  assert(
    "every module reachable from /news was resolved and read",
    reach.unresolved.length === 0,
    `could not read ${reach.unresolved.join(", ")} — a module this check cannot read is one it cannot clear`
  );

  /* ---- B. The fetch is unconditional ----------------------------------- */

  const effectAt = feed.indexOf("useEffect(");
  const bodyAt = effectAt === -1 ? -1 : feed.indexOf("=> {", effectAt);
  const depsAt = bodyAt === -1 ? -1 : feed.indexOf("}, [", bodyAt);
  const depsEnd = depsAt === -1 ? -1 : feed.indexOf("]", depsAt);
  const located = effectAt !== -1 && bodyAt !== -1 && depsAt !== -1 && depsEnd !== -1;
  assert("the fetch effect and its dependency array were found", located);

  const body = located ? feed.slice(bodyAt + 4, depsAt) : "";
  const fetchMatch = body.match(/\bfetch\(\s*[`"']\/api\/news(?:[`"'?$])/);
  const fetchAt = fetchMatch?.index ?? -1;
  assert("the effect requests /api/news", fetchAt !== -1);

  const beforeFetch = fetchAt === -1 ? body : body.slice(0, fetchAt);
  assert(
    "nothing returns before the fetch",
    !/\breturn\b(?!\s*\(\)\s*=>)/.test(beforeFetch),
    "something returns before the fetch is issued"
  );

  /* Top level of the effect body: every brace opened before the fetch has
     closed. Template literals balance their own `${…}`, so a plain count is
     enough for this file's shape. */
  const depth =
    (beforeFetch.match(/\{/g)?.length ?? 0) - (beforeFetch.match(/\}/g)?.length ?? 0);
  assert(
    "the fetch is not inside a block",
    fetchAt !== -1 && depth === 0,
    `brace depth ${depth} at the fetch — an if/else or a nested block is a gate`
  );
  /* And it starts its own statement: `if (x) fetch(`, `x && fetch(` and
     `x ? fetch(` all leave something other than ; { } just before it. */
  const prevChar = beforeFetch.trimEnd().slice(-1);
  assert(
    "the fetch starts its own statement",
    fetchAt !== -1 && (prevChar === "" || /[;{}]/.test(prevChar)),
    `preceded by "${prevChar}" — a condition or operator is in front of the fetch`
  );

  assert(
    "no location prompt short-circuits the feed",
    !/location !== undefined && !location\?\.zip/.test(feed),
    "the pre-TASK-069 dead end is back"
  );

  /* The same rule one level up. An unconditional fetch inside a component the
     page does not always render is not unconditional: the TASK-069 dead end
     can come back as `if (!selected) return <Prompt />` or as
     `{selected && <NewsFeed … />}` in the page, without touching NewsFeed.
     So the page renders the feed exactly once, as a plain JSX child (the tag
     follows `>` or `}`, not `&&`, `?` or `:`), and the only return or redirect
     between the top of the page function and the feed is the JSX return that
     contains it. */
  const feedTags = page.match(/<NewsFeed\b/g)?.length ?? 0;
  const pageFnAt = page.search(/export\s+default\s+(?:async\s+)?function\b/);
  const feedTagAt = page.indexOf("<NewsFeed");
  const beforeFeedTag = pageFnAt !== -1 && feedTagAt > pageFnAt ? page.slice(pageFnAt, feedTagAt) : "";
  const exitsBeforeFeed =
    beforeFeedTag.match(
      /\breturn\s*(?:\(|<|null\b|undefined\b|;)|\b(?:redirect|permanentRedirect|notFound)\s*\(/g
    )?.length ?? 0;
  const beforeTag = beforeFeedTag.trimEnd().slice(-1);
  assert(
    "the page renders NewsFeed once, on every path",
    feedTags === 1 && exitsBeforeFeed === 1 && /[>}]/.test(beforeTag),
    `${feedTags} <NewsFeed> tag(s); ${exitsBeforeFeed} return/redirect before it (1 expected, the JSX return); tag preceded by "${beforeTag}"`
  );

  /* ---- C. Parameters are optional URL values --------------------------- */

  const propsMatch = feed.match(/export function NewsFeed\(\{([\s\S]*?)\}\s*:\s*\{([\s\S]*?)\}\)/);
  const props = new Set(
    (propsMatch?.[1] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const propTypes = propsMatch?.[2] ?? "";
  assert("NewsFeed's props were found", props.size > 0);

  const deps = located
    ? feed
        .slice(depsAt + 4, depsEnd)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const strayDeps = deps.filter((d) => !props.has(d));
  assert(
    "the effect depends only on the component's props",
    strayDeps.length === 0,
    `depends on ${strayDeps.join(", ")}, which is not a prop`
  );

  const setValues = [...body.matchAll(/\bparams\.(?:set|append)\(\s*["'][^"']+["']\s*,\s*([^)]*?)\s*\)/g)].map(
    (m) => m[1]
  );
  const strayValues = setValues.filter((v) => !props.has(v));
  assert(
    "every query parameter is set from a prop",
    strayValues.length === 0,
    `set from ${strayValues.join(", ")}`
  );

  const requiredParams = [...new Set([...deps, ...setValues])].filter(
    (p) => props.has(p) && !new RegExp(`\\b${p}\\?\\s*:`).test(propTypes)
  );
  assert(
    "every parameter prop is optional",
    requiredParams.length === 0,
    `${requiredParams.join(", ")} is required — a required location is a gate`
  );

  /* The page fills each parameter prop from the URL, AND FROM NOTHING ELSE.
     Until the 2026-10-04 review this asked only that the county declaration
     MENTION `sp.county`, so `sp.county ?? fallback` passed whatever `fallback`
     was, and the JSX expression past its first identifier was never read.

     Now every identifier the expression depends on is accounted for, and the
     consts it reads are followed through to their own declarations. Allowed:
       - `sp`, only as `const sp = await searchParams;` and never written to;
       - a binding imported from a local module (part A has read that module
         and everything it reaches);
       - a parameter of an arrow function inside the expression (`(c) => …`);
       - a literal, or typeof / undefined / null / true / false / void.
     Anything else — a page-local `let`, a const from any other source, a
     global — fails, and so does any `await` or `use(`. A value read from the
     URL needs neither; a request cookie in Next 16 needs one or the other
     (node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md,
     "Async Request APIs": synchronous access is fully removed). Property
     names after `.` / `?.` are not identifiers here: `c.fips === sp.county`
     depends on `c` and `sp`. */
  const pageImports = new Set<string>();
  for (const m of page.matchAll(/^\s*import\s+(?!type\b)([^;]*?)\s+from\s+["']([^"']+)["']/gm)) {
    if (!(m[2].startsWith("@/") || m[2].startsWith("."))) continue;
    const clause = m[1];
    const def = clause.match(/^([A-Za-z_$][\w$]*)/)?.[1];
    if (def) pageImports.add(def);
    const ns = clause.match(/\*\s*as\s+([A-Za-z_$][\w$]*)/)?.[1];
    if (ns) pageImports.add(ns);
    for (const part of clause.match(/\{([\s\S]*)\}/)?.[1].split(",") ?? []) {
      const p = part.trim();
      if (!p || /^type\s/.test(p)) continue;
      const local = p.match(/\bas\s+([A-Za-z_$][\w$]*)$/)?.[1] ?? p.match(/^[A-Za-z_$][\w$]*/)?.[0];
      if (local) pageImports.add(local);
    }
  }
  const spFromSearch = /\bconst\s+sp\s*=\s*await\s+searchParams\s*;/.test(page);
  const spWritten =
    /\bsp\s*(?:\.\s*[\w$]+|\[[^\]]*\])\s*(?:\?\?|\|\||&&|[-+*/%])?=(?!=)|Object\.assign\(\s*sp\b|\bdelete\s+sp\b/.test(
      page
    );
  assert(
    "the page reads its search params as const sp, and never writes to them",
    spFromSearch && !spWritten,
    spFromSearch ? "something assigns into sp" : "no `const sp = await searchParams;`"
  );

  const LITERALS = new Set(["typeof", "undefined", "null", "true", "false", "void"]);
  const escapeId = (id: string) => id.replace(/\$/g, "\\$");
  const fromUrlOnly = (expr: string, seen: Set<string>): string | null => {
    if (/\bawait\b/.test(expr)) return "it awaits something; a value from the URL needs no await";
    if (/\buse\s*\(/.test(expr)) return "it calls use(); a value from the URL needs no promise";
    const bare = expr
      .replace(/\$\{([^{}]*)\}/g, "` + ($1) + `")
      .replace(/(["'`])(?:\\[\s\S]|(?!\1)[^\\])*?\1/g, '""')
      .replace(/\??\.\s*[A-Za-z_$][\w$]*/g, "")
      .replace(/\b\d[\w.]*/g, "0");
    const arrowParams = new Set<string>();
    for (const m of bare.matchAll(/\(([^()]*)\)\s*=>|([A-Za-z_$][\w$]*)\s*=>/g))
      for (const p of (m[1] ?? m[2]).split(",")) {
        const id = p.trim().match(/^[A-Za-z_$][\w$]*/)?.[0];
        if (id) arrowParams.add(id);
      }
    for (const id of new Set(bare.match(/[A-Za-z_$][\w$]*/g) ?? [])) {
      if (LITERALS.has(id) || arrowParams.has(id) || pageImports.has(id)) continue;
      if (id === "sp") {
        if (spFromSearch && !spWritten) continue;
        return "`sp` is not read-only search params";
      }
      if (new RegExp(`\\b(?:let|var)\\s+${escapeId(id)}\\b`).test(page))
        return `\`${id}\` is a let/var, so it can change after it is read`;
      const decl = page.match(new RegExp(`\\bconst\\s+${escapeId(id)}\\s*=([\\s\\S]*?);`))?.[1];
      if (decl === undefined)
        return `\`${id}\` is not the search params, a local import, or a const derived from them`;
      if (seen.has(id)) continue;
      seen.add(id);
      const why = fromUrlOnly(decl, seen);
      if (why) return `\`${id}\` ← ${why}`;
    }
    return null;
  };

  /* The props NewsFeed sends to /api/news or re-fetches on. `county` is
     always checked: it is the one TC-4 is about, and it must be present. */
  const feedAttrs = page.match(/<NewsFeed\b([\s\S]*?)\/>/)?.[1] ?? "";
  const jsxProp = (name: string): string | null => {
    const at = feedAttrs.search(new RegExp(`\\b${escapeId(name)}=\\{`));
    if (at === -1) return null;
    const open = feedAttrs.indexOf("{", at);
    let depth = 0;
    for (let i = open; i < feedAttrs.length; i++) {
      if (feedAttrs[i] === "{") depth++;
      else if (feedAttrs[i] === "}" && --depth === 0) return feedAttrs.slice(open + 1, i).trim();
    }
    return null;
  };
  assert(
    "the page passes NewsFeed no spread props",
    !/\{\s*\.\.\./.test(feedAttrs),
    "a spread hides where a parameter comes from"
  );
  const paramProps = new Set(["county", ...[...deps, ...setValues].filter((p) => props.has(p))]);
  for (const prop of paramProps) {
    const expr = jsxProp(prop);
    if (expr === null) {
      if (prop === "county") assert("the page passes county from the URL only", false, "no county={…} prop found");
      continue;
    }
    const why = fromUrlOnly(expr, new Set());
    assert(`the page passes ${prop} from the URL only`, why === null, `${prop}={${expr}}: ${why}`);
  }

  /* ---- D. The server side --------------------------------------------- */

  /* Every route parameter stays optional — a required one re-gates the feed
     from the server without touching the component. Each field's own zod
     chain is read up to the next field, so one field's .optional() can never
     vouch for its neighbour. */
  const schema = route.match(/const params = z\.object\(\{([\s\S]*?)\n\}\);/)?.[1] ?? "";
  const fields = new Map(
    [...schema.matchAll(/^\s{2}(\w+):([\s\S]*?)(?=^\s{2}\w+:|$(?![\s\S]))/gm)].map((m) => [
      m[1],
      m[2],
    ])
  );
  for (const field of ["zip", "metro", "county", "district", "issue"]) {
    assert(
      `route parameter ${field} stays optional`,
      /\.optional\(\)/.test(fields.get(field) ?? ""),
      fields.has(field) ? "" : "field not found in the route schema"
    );
  }

  /* With no parameters at all, the statewide scope is what comes back. It is
     the first scope and it is added unconditionally: since 2026-10-05 by
     newsScopes() (src/lib/news-scope.ts), which the route builds its filter
     with, so both halves are read. */
  const scopeModule = stripComments(src.module("@/lib/news-scope", ROUTE_PATH)?.text ?? "");
  assert(
    "the statewide scope is always queried",
    /const scopes = newsScopes\(\{[^}]*\}\);/.test(route) &&
      /const scopes = \[\s*"and\(race_id\.is\.null,metro\.is\.null,county_fips\.is\.null\)"\s*\]/.test(
        scopeModule
      )
  );

  /* Copy honesty (TASK-067's rule): with no location this page is statewide,
     so it must not call itself local. */
  assert("page does not call a statewide feed local", !/Local electoral news/.test(page));

  return { lines, failures };
}

/* ---- --self-test: each gate TC-4 or its review names must turn this red -- */

if (args.includes("--self-test")) {
  const real = fromDisk(ROOT);
  const STORED_MODULE = `export function useStoredCounty() {
  return typeof window === "undefined" ? undefined : window.localStorage.getItem("kyv.county") ?? undefined;
}`;
  /* Two modules deep: the module NewsFeed imports names no storage itself. */
  const STORED_DEEP = `import { readStored } from "@/lib/storage-read";
export function useStoredCounty() {
  return readStored();
}`;
  const STORAGE_READ = `export function readStored() {
  return typeof window === "undefined" ? undefined : window.localStorage.getItem("kyv.county") ?? undefined;
}`;
  /* The page-side shapes from the 2026-10-04 review: a cookie reader, the
     same one behind a clean module, and the request-header route. */
  const COOKIE_MODULE = `import { cookies } from "next/headers";
export async function savedCounty() {
  return (await cookies()).get("kyv.district")?.value;
}`;
  const DEFAULT_MODULE = `import { savedCounty } from "@/lib/saved-county";
export async function defaultCounty() {
  return savedCounty();
}`;
  const HEADER_MODULE = `import { headers } from "next/headers";
export async function savedCounty() {
  return (await headers()).get("cookie")?.split("district=")[1];
}`;
  /* Injected modules import each other by "@/…" only; their id is the path
     they would have, so a later import resolves the same way a real one does. */
  const withModule = (extra: Record<string, string>) => (spec: string, from: string) =>
    spec in extra ? { id: `${spec.replace(/^@\//, "src/")}.ts`, text: extra[spec] } : real.module(spec, from);

  /* Each mutation is a string replace on the REAL source. If the anchor is
     gone (the component was refactored), the mutation is reported as stale
     rather than silently passing. */
  const PARAMS = "const params = new URLSearchParams();";
  const SET_COUNTY = 'if (county) params.set("county", county);';
  const FETCH = "fetch(`/api/news${qs}`";
  const PAGE_IMPORT = 'import { COVERED_COUNTIES } from "@/lib/resolve";';
  const SELECTED = "const selected = COVERED_COUNTIES.find((c) => c.fips === sp.county);";
  const FEED_COUNTY = "<NewsFeed county={selected?.fips}";
  const PAGE_RETURN = "\n  return (\n    <main";
  const FEED_TAG = /<NewsFeed\b[\s\S]*?\/>/;
  const mutations: { name: string; apply: (s: Sources) => Sources | null }[] = [
    {
      name: "kyv.location read gates the fetch (TC-4's named regression)",
      apply: (s) =>
        s.feed.includes(PARAMS)
          ? {
              ...s,
              feed: s.feed.replace(
                PARAMS,
                `const stored = window.localStorage.getItem("kyv.location");\n    if (!stored) return;\n    ${PARAMS}`
              ),
            }
          : null,
    },
    {
      name: "sessionStorage supplies the county parameter",
      apply: (s) =>
        s.feed.includes(SET_COUNTY)
          ? {
              ...s,
              feed: s.feed.replace(
                SET_COUNTY,
                'const saved = window.sessionStorage.getItem("kyv.county");\n    if (saved) params.set("county", saved);'
              ),
            }
          : null,
    },
    {
      name: "fetch only when a county is set (if)",
      apply: (s) =>
        s.feed.includes(FETCH) ? { ...s, feed: s.feed.replace(FETCH, `if (county) ${FETCH}`) } : null,
    },
    {
      name: "fetch only when a county is set (&&)",
      apply: (s) =>
        s.feed.includes(FETCH) ? { ...s, feed: s.feed.replace(FETCH, `county && ${FETCH}`) } : null,
    },
    {
      name: "fetch moved inside an if block",
      apply: (s) =>
        s.feed.includes(FETCH)
          ? {
              ...s,
              feed: s.feed
                .replace(FETCH, `if (county !== undefined) {\n    ${FETCH}`)
                .replace("    return () => controller.abort();", "    }\n    return () => controller.abort();"),
            }
          : null,
    },
    {
      name: "a helper module reads storage and feeds the county",
      apply: (s) =>
        s.feed.includes(SET_COUNTY)
          ? {
              ...s,
              feed: s.feed
                .replace(
                  'import { useEffect, useState } from "react";',
                  'import { useEffect, useState } from "react";\nimport { useStoredCounty } from "@/lib/stored-county";'
                )
                .replace(
                  "const [stage, setStage]",
                  "const storedCounty = useStoredCounty();\n  const [stage, setStage]"
                )
                .replace(SET_COUNTY, 'if (storedCounty) params.set("county", storedCounty);')
                .replace("}, [county, issue]);", "}, [county, issue, storedCounty]);"),
              module: withModule({ "@/lib/stored-county": STORED_MODULE }),
            }
          : null,
    },
    {
      name: "the page defaults the county from the kyv.district cookie",
      apply: (s) =>
        s.page.includes("c.fips === sp.county")
          ? {
              ...s,
              page: s.page.replace(
                "c.fips === sp.county",
                'c.fips === (sp.county ?? (await cookies()).get("kyv.district")?.value)'
              ),
            }
          : null,
    },
    {
      name: "county becomes a required prop",
      apply: (s) =>
        /county\?:\s*string;/.test(s.feed)
          ? { ...s, feed: s.feed.replace(/county\?:\s*string;/, "county: string;") }
          : null,
    },
    {
      name: "a storage hook two modules deep in NewsFeed's imports",
      apply: (s) =>
        s.feed.includes(SET_COUNTY)
          ? {
              ...s,
              feed: s.feed
                .replace(
                  'import { useEffect, useState } from "react";',
                  'import { useEffect, useState } from "react";\nimport { useStoredCounty } from "@/lib/stored-county";'
                )
                .replace(
                  "const [stage, setStage]",
                  "const storedCounty = useStoredCounty();\n  const [stage, setStage]"
                )
                .replace(SET_COUNTY, 'if (storedCounty) params.set("county", storedCounty);')
                .replace("}, [county, issue]);", "}, [county, issue, storedCounty]);"),
              module: withModule({ "@/lib/stored-county": STORED_DEEP, "@/lib/storage-read": STORAGE_READ }),
            }
          : null,
    },
    {
      name: "a page helper reads the kyv.district cookie as the county fallback (the 2026-10-04 review's case)",
      apply: (s) =>
        s.page.includes(PAGE_IMPORT) && s.page.includes(SELECTED)
          ? {
              ...s,
              page: s.page
                .replace(PAGE_IMPORT, `${PAGE_IMPORT}\nimport { savedCounty } from "@/lib/saved-county";`)
                .replace(
                  SELECTED,
                  "const fallback = await savedCounty();\n  const selected = COVERED_COUNTIES.find((c) => c.fips === (sp.county ?? fallback));"
                ),
              module: withModule({ "@/lib/saved-county": COOKIE_MODULE }),
            }
          : null,
    },
    {
      name: "the same cookie read two modules deep, with the fallback in the JSX",
      apply: (s) =>
        s.page.includes(PAGE_IMPORT) && s.page.includes(SELECTED) && s.page.includes(FEED_COUNTY)
          ? {
              ...s,
              page: s.page
                .replace(PAGE_IMPORT, `${PAGE_IMPORT}\nimport { defaultCounty } from "@/lib/county-default";`)
                .replace(SELECTED, `const fallback = await defaultCounty();\n  ${SELECTED}`)
                .replace(FEED_COUNTY, "<NewsFeed county={selected?.fips ?? fallback}"),
              module: withModule({ "@/lib/county-default": DEFAULT_MODULE, "@/lib/saved-county": COOKIE_MODULE }),
            }
          : null,
    },
    {
      name: "a page helper reads the Cookie request header instead of cookies()",
      apply: (s) =>
        s.page.includes(PAGE_IMPORT) && s.page.includes(SELECTED) && s.page.includes(FEED_COUNTY)
          ? {
              ...s,
              page: s.page
                .replace(PAGE_IMPORT, `${PAGE_IMPORT}\nimport { savedCounty } from "@/lib/saved-county";`)
                .replace(SELECTED, `const fallback = await savedCounty();\n  ${SELECTED}`)
                .replace(FEED_COUNTY, "<NewsFeed county={selected?.fips ?? fallback}"),
              module: withModule({ "@/lib/saved-county": HEADER_MODULE }),
            }
          : null,
    },
    {
      name: "the page renders the feed only once a county is chosen (TASK-069's dead end, in the page)",
      apply: (s) =>
        FEED_TAG.test(s.page) ? { ...s, page: s.page.replace(FEED_TAG, (tag) => `{selected && ${tag}}`) } : null,
    },
    {
      name: "the page returns a prompt instead of the feed when no county is chosen",
      apply: (s) =>
        s.page.includes(PAGE_RETURN)
          ? {
              ...s,
              page: s.page.replace(
                PAGE_RETURN,
                `\n  if (!selected) return <p>Pick a county to see its news.</p>;${PAGE_RETURN}`
              ),
            }
          : null,
    },
    {
      name: "the route makes ?county= required",
      apply: (s) =>
        s.route.includes("county: z.enum(COUNTY_FIPS as [string, ...string[]]).optional(),")
          ? {
              ...s,
              route: s.route.replace(
                "county: z.enum(COUNTY_FIPS as [string, ...string[]]).optional(),",
                "county: z.enum(COUNTY_FIPS as [string, ...string[]]),"
              ),
            }
          : null,
    },
  ];

  let bad = 0;
  const baseline = runChecks(real);
  if (baseline.failures > 0) {
    bad++;
    console.error(`FAIL  the unmutated source must pass (${baseline.failures} failing)`);
    for (const l of baseline.lines) if (l.startsWith("FAIL")) console.error(`      ${l}`);
  } else console.log("  ok  the unmutated source passes");

  for (const m of mutations) {
    const mutated = m.apply(real);
    if (!mutated) {
      bad++;
      console.error(`FAIL  ${m.name} — anchor not found; update this mutation to the current source`);
      continue;
    }
    const r = runChecks(mutated);
    const caught = r.lines.filter((l) => l.startsWith("FAIL")).map((l) => l.replace(/^FAIL\s+/, ""));
    if (r.failures === 0) {
      bad++;
      console.error(`FAIL  ${m.name} — NOT caught; the guardrail has a hole`);
    } else {
      console.log(`  ok  ${m.name} — caught by: ${caught.map((c) => c.split(" — ")[0]).join("; ")}`);
    }
  }

  if (bad) {
    console.error(`\n${bad} news-ungating self-test check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll news-ungating self-test checks passed.");
  process.exit(0);
}

const { lines, failures } = runChecks(fromDisk(ROOT));
for (const l of lines) (l.startsWith("FAIL") ? console.error : console.log)(l);
if (failures) {
  console.error(`\n${failures} news-ungating check(s) failed`);
  process.exit(1);
}
console.log("\nAll news-ungating checks passed.");
