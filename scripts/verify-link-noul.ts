/* Guardrail for the Jev link picker — src/lib/link-noul.ts.

   The properties whose failure would be invisible in the output and wrong in
   the product:

     - A link off the site, to a donate/store/legal page, or back to the
       homepage offered to the model at all. Those cost requests on someone
       else's server and never hold a stated position.
     - A missing or malformed answer read as "yes". A link nobody judged must
       not be fetched on a guess.
     - The cap exceeded, or spent on weak links before strong ones.
     - More than one About page, or the About page counted twice.

   Pure and offline. Run: node scripts/verify-link-noul.ts */

import {
  ABOUT_PAGE_ID,
  DEFAULT_LINK_THRESHOLD,
  POLICY_PAGE_ID,
  buildLinkQuestions,
  buildLinkState,
  candidateLinks,
  chooseLinks,
  readLinkVerdict,
} from "../src/lib/link-noul.ts";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) return;
  failures++;
  console.error(`FAIL ${name}${detail ? `\n     ${detail}` : ""}`);
}

const site = "https://www.example.com/";
const L = (path: string, text = "") => ({ url: `https://www.example.com${path}`, text });

/* ---- what is offered to the model ------------------------------------- */
const offered = candidateLinks(
  [
    L("/meet-maxwell", "Hear My Story"),
    L("/taxes", "Learn More"),
    L("/position-papers", "Position Papers"),
    L("/", "Home"),
    L("/donate", "Donate"),
    L("/cart", "0"),
    L("/privacy-policy", "Privacy Policy"),
    L("/wp-content/uploads/a.jpg", ""),
    { url: "https://twitter.com/example", text: "Twitter" },
    { url: "https://example.com/taxes", text: "Taxes" },
    L("/news/my-housing-plan", "Read more"),
  ],
  site,
);
const offeredPaths = offered.map((l) => new URL(l.url).pathname);
check("policy-looking and about links are offered, whatever they are named",
  ["/meet-maxwell", "/taxes", "/position-papers"].every((p) => offeredPaths.includes(p)),
  offeredPaths.join(" "));
check("news posts are offered: the model, not a word list, decides",
  offeredPaths.includes("/news/my-housing-plan"), offeredPaths.join(" "));
check("homepage, donate, cart, legal, uploads and off-site links are never offered",
  !["/", "/donate", "/cart", "/privacy-policy", "/wp-content/uploads/a.jpg"].some((p) => offeredPaths.includes(p)) &&
    offered.every((l) => !l.url.includes("twitter.com")),
  offeredPaths.join(" "));
check("apex and www are one site, and a link is offered once",
  offeredPaths.filter((p) => p === "/taxes").length === 1, offeredPaths.join(" "));
check("a duplicate keeps the first non-empty anchor text",
  offered.find((l) => l.url.endsWith("/taxes"))?.text === "Learn More");

/* ---- the state and the questions --------------------------------------- */
const state = buildLinkState(L("/meet-maxwell", "  Hear My Story "));
check("the state is the path and the anchor text, nothing else",
  JSON.stringify(state) === JSON.stringify({ path: "/meet-maxwell", text: "Hear My Story" }),
  JSON.stringify(state));
const q = buildLinkQuestions();
check("two questions: policy page and about page",
  JSON.stringify(Object.keys(q).sort()) === JSON.stringify([ABOUT_PAGE_ID, POLICY_PAGE_ID].sort()));
check("both are nouls with both criteria",
  Object.values(q).every((x) => x.type === "noul" && x.criteria.true.length > 0 && x.criteria.false.length > 0));

/* ---- reading an answer --------------------------------------------------- */
const v = readLinkVerdict({ [POLICY_PAGE_ID]: { noul: 0.9 }, [ABOUT_PAGE_ID]: { noul: 0.1 } });
check("numbers are read", v.policy === 0.9 && v.about === 0.1, JSON.stringify(v));
const bad = readLinkVerdict({ [POLICY_PAGE_ID]: { noul: "yes" }, [ABOUT_PAGE_ID]: 0.9, other: { noul: 1 } });
check("a missing or non-numeric answer is null, never a yes",
  bad.policy === null && bad.about === null, JSON.stringify(bad));

/* ---- choosing ------------------------------------------------------------ */
const scored = [
  { url: "a", policy: 0.55, about: 0.1 },
  { url: "b", policy: 0.95, about: 0.0 },
  { url: "c", policy: 0.2, about: 0.8 },
  { url: "d", policy: null, about: null },
  { url: "e", policy: 0.7, about: 0.9 },
  { url: "f", policy: 0.49, about: 0.3 },
];
const two = chooseLinks(scored, DEFAULT_LINK_THRESHOLD, 2);
check("policy pages: strongest first, capped",
  JSON.stringify(two.policy) === JSON.stringify(["b", "e"]), JSON.stringify(two));
check("the about page is the single strongest about link",
  two.about === "e" || two.about === "c", JSON.stringify(two));
check("the about page is not fetched twice: if it is already a policy page, the next one is taken",
  two.about === "c", JSON.stringify(two));
const all = chooseLinks(scored, DEFAULT_LINK_THRESHOLD, 8);
check("below the threshold or unjudged is never chosen",
  !all.policy.includes("f") && !all.policy.includes("d") && !all.policy.includes("c"), JSON.stringify(all));
check("no about link above the threshold means none",
  chooseLinks([{ url: "x", policy: 0.9, about: 0.2 }], 0.5, 8).about === null);

if (failures > 0) {
  console.error(`\nverify-link-noul: ${failures} failure(s)`);
  process.exit(1);
}
console.log("verify-link-noul: OK — only on-site content links are judged, unjudged links are never fetched, the cap holds");
