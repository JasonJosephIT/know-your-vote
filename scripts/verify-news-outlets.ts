/* Guardrail for the outlet page's data rules (src/lib/news-outlets.ts).

   The outlet page is now the ONLY place a reader can learn an outlet's lean,
   because news-fairness.md §1 as amended 2026-09-19 took it off the card. That
   makes two things load-bearing, and neither would fail loudly in the UI:

     1. Slugs round-trip. `cbsnews.com/miami` contains a slash, which cannot sit
        in one URL path segment. If the transform stops reversing, that outlet's
        page 404s and its lean becomes unreachable — a silent loss of the
        disclosure, not a visible error.
     2. The four lean states stay four. "No rating agency covers this outlet"
        and "we have not reviewed it yet" are different claims, and only one is
        about the outlet. Collapsing them would put our own backlog in a
        reader's mouth as a fact about a newsroom.

   Pure and offline: no DB, no network, no browser.

   Run: node scripts/verify-news-outlets.ts */

import {
  AI_POLICY_HOLD,
  OUTLETS,
  UNRATED,
  usableOutlets,
} from "../src/lib/news-sources.ts";
import {
  leanDisclosure,
  listedOutlets,
  outletReading,
  outletBySlug,
  outletDomainFromSlug,
  outletPathFor,
  outletSlug,
} from "../src/lib/news-outlets.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
}

/* ---- 1. slugs round-trip, for every listed outlet ---------------------- */

for (const o of OUTLETS) {
  const slug = outletSlug(o.domain);
  check(
    `slug round-trips for ${o.domain}`,
    outletDomainFromSlug(slug) === o.domain,
    slug
  );
  check(`slug for ${o.domain} has no slash`, !slug.includes("/"), slug);
  check(
    `slug for ${o.domain} resolves back to the outlet`,
    outletBySlug(slug, OUTLETS)?.domain === o.domain,
    slug
  );
  check(
    `path for ${o.domain} is under /news/outlet/`,
    outletPathFor(o.domain) === `/news/outlet/${slug}`,
    outletPathFor(o.domain)
  );
}

/* The transform is only reversible while no domain contains the separator.
   Asserted rather than assumed, because adding such a domain would break the
   round-trip for that row alone and nowhere else. */
check(
  "no listed domain contains the '--' separator",
  OUTLETS.every((o) => !o.domain.includes("--")),
  OUTLETS.filter((o) => o.domain.includes("--"))
    .map((o) => o.domain)
    .join(",")
);

/* The path-scoped case is the one this exists for — keep it covered even if the
   list changes around it. */
const scoped = OUTLETS.filter((o) => o.domain.includes("/"));
check(
  "the path-scoped outlet is still covered by the round-trip above",
  scoped.length === 0 ||
    scoped.every((o) => outletBySlug(outletSlug(o.domain), OUTLETS) !== null),
  scoped.map((o) => o.domain).join(",")
);

/* Fail-closed: an unlisted slug is nothing, never a page built from the URL. */
for (const bogus of [
  "evil.com",
  "",
  "..",
  "miamiherald.com.evil.com",
  "wlrn",
]) {
  check(
    `unlisted slug "${bogus}" resolves to null`,
    outletBySlug(bogus, OUTLETS) === null
  );
}

/* ---- 2. the four lean states ------------------------------------------ */

for (const o of OUTLETS) {
  const d = leanDisclosure(o, UNRATED);

  /* Every state says something. A blank label on the one surface that owes the
     reader an answer is the failure mode here. */
  check(`${o.domain} has a lean label`, d.label.length > 0);
  check(`${o.domain} has an explanation`, d.explanation.length > 20);

  /* The state must match the tag, not approximate it. */
  const expected =
    o.leanTag === null
      ? "pending"
      : o.leanTag === "unrated"
        ? "unrated"
        : o.leanTag === "N/A"
          ? "not-applicable"
          : "rated";
  check(`${o.domain} state is ${expected}`, d.state === expected, d.state);

  /* The shared UNRATED placeholder is not a citation and must never be shown as
     one — it is the text that says no rating was found, not a rating's basis. */
  if (o.leanBasis === UNRATED) {
    check(
      `${o.domain} shows no basis, since its basis is the placeholder`,
      d.basis === null,
      String(d.basis)
    );
  } else {
    check(`${o.domain} shows its recorded basis`, d.basis === o.leanBasis);
  }
}

/* "Nobody rates this" and "we have not looked" must not read alike: they are
   different claims and only the first is about the outlet. */
const unratedRows = OUTLETS.filter((o) => o.leanTag === "unrated");
const pendingRows = OUTLETS.filter((o) => o.leanTag === null);
check(
  "some outlets are unrated and some are pending, so both states are live",
  unratedRows.length > 0 && pendingRows.length > 0,
  `${unratedRows.length} unrated, ${pendingRows.length} pending`
);
if (unratedRows.length > 0 && pendingRows.length > 0) {
  const u = leanDisclosure(unratedRows[0], UNRATED);
  const p = leanDisclosure(pendingRows[0], UNRATED);
  check(
    "unrated and pending carry different labels",
    u.label !== p.label,
    u.label
  );
  check(
    "unrated and pending carry different explanations",
    u.explanation !== p.explanation
  );
  /* The pending wording must not claim no rating exists — that would state our
     backlog as a fact about the world. */
  check(
    "pending does not claim no rating exists",
    !/no (independent )?rating (exists|is published)/i.test(p.explanation),
    p.explanation
  );
}

/* No lean label is a verdict or a colour word; the disclosure is plain text. */
for (const o of OUTLETS) {
  const { label } = leanDisclosure(o, UNRATED);
  for (const banned of [
    "biased",
    "unreliable",
    "fake",
    "trustworthy",
    "credible",
  ]) {
    check(
      `${o.domain} label avoids the verdict word "${banned}"`,
      !label.toLowerCase().includes(banned),
      label
    );
  }
}

/* ---- 3. the outlets index (/news/outlet) ------------------------------

   The index lists every outlet in a neutral order and says whether we read
   each one. Two silent failures to guard: an outlet missing from the index
   (its disclosure becomes unreachable from the list), and an order that ranks
   something (by county, by lean, by whether we read it). */
{
  const listed = listedOutlets(OUTLETS);
  check(
    "the index lists every outlet exactly once",
    listed.length === OUTLETS.length &&
      new Set(listed.map((o) => o.domain)).size === OUTLETS.length
  );
  const coll = new Intl.Collator("en", { sensitivity: "base", numeric: true });
  check(
    "the index is alphabetical by publisher",
    listed.every(
      (o, i) =>
        i === 0 || coll.compare(listed[i - 1].publisher, o.publisher) <= 0
    ),
    listed.map((o) => o.publisher).join(" | ")
  );
  /* OUTLETS is frozen, so an in-place sort would have thrown above; this
     pins that a copy comes back, not the shared list. */
  check(
    "the index returns a copy, not the shared list",
    (listed as unknown) !== OUTLETS
  );
  check(
    "the order does not depend on input order",
    JSON.stringify(
      listedOutlets([...OUTLETS].reverse()).map((o) => o.domain)
    ) === JSON.stringify(listed.map((o) => o.domain))
  );
  check(
    "a lowercase publisher sorts among its letter, not after every capital",
    (() => {
      const i = listed.findIndex((o) => o.publisher === "el Nuevo Herald");
      return (
        i === -1 || (i > 0 && listed[i - 1].publisher[0].toLowerCase() <= "e")
      );
    })()
  );
}

{
  const usable = new Set(usableOutlets(OUTLETS).map((o) => o.domain));
  for (const o of OUTLETS) {
    const r = outletReading(o, usable, AI_POLICY_HOLD);
    /* "reading" must be exactly usableOutlets(), no more and no less. */
    check(
      `${o.domain} reading matches usableOutlets()`,
      r.reading === usable.has(o.domain),
      r.state
    );
    check(`${o.domain} has a reading label`, r.label.length > 0);
    if (!r.reading) {
      check(
        `${o.domain} says why it is not read`,
        (r.explanation?.length ?? 0) > 20
      );
    } else {
      check(`${o.domain} carries no reason when read`, r.explanation === null);
    }
    /* The hold is a policy choice and must be named as one, even where a
       technical gate would also exclude the outlet — otherwise clearing that
       gate later would make the page silently wrong about why. */
    if (AI_POLICY_HOLD.has(o.domain)) {
      check(
        `${o.domain} is shown as on the AI-policy hold`,
        r.state === "ai-policy-hold",
        r.state
      );
    }
    for (const banned of [
      "biased",
      "unreliable",
      "fake",
      "trustworthy",
      "credible",
      "refuse",
      "block",
    ]) {
      check(
        `${o.domain} reading copy avoids "${banned}"`,
        !`${r.label} ${r.explanation ?? ""}`.toLowerCase().includes(banned)
      );
    }
  }
  check(
    "some outlets are read and some are held, so both states are live",
    OUTLETS.some((o) => usable.has(o.domain)) &&
      OUTLETS.some((o) => AI_POLICY_HOLD.has(o.domain))
  );
  /* Fixtures for the states the live list may not exercise. */
  const base = OUTLETS.find((o) => usable.has(o.domain));
  if (base) {
    const none = new Set<string>();
    check(
      "no retrieval path is its own state",
      outletReading({ ...base, feed: null, sitemap: undefined }, none, none)
        .state === "no-retrieval-path"
    );
    check(
      "a pending lean is its own state",
      outletReading({ ...base, leanTag: null }, none, none).state ===
        "lean-pending"
    );
    check(
      "a mixed feed is its own state",
      outletReading({ ...base, mixedFeed: true }, none, none).state ===
        "mixed-feed"
    );
    check(
      "a syndicated feed is its own state",
      outletReading({ ...base, syndicated: true }, none, none).state ===
        "syndicated"
    );
    check(
      "the hold wins over every technical gate",
      outletReading(
        { ...base, feed: null, leanTag: null, mixedFeed: true },
        none,
        new Set([base.domain])
      ).state === "ai-policy-hold"
    );
  }
}

if (failures > 0) {
  console.error(`\nverify-news-outlets: ${failures} failure(s)`);
  process.exit(1);
}
console.log(
  `verify-news-outlets: OK — slugs round-trip for ${OUTLETS.length} outlets, four lean states stay distinct, placeholders never shown as citations`
);
