/* The reminder form (VotingInfo): the four counties named before anyone
   types, the consent split from the storage promise, an error under each
   field, and a sent state that keeps the card (Mobbin catalog 2026-10-12,
   Top 12 #8: RS1 Legora, RS5 Claude, RS2 Langdock; founder decisions
   2026-10-13).

     1. D4 (a): the form keeps its ZIP field through Nov 3, and the home card
        names the covered counties under its label, from coveredCountyNames(),
        not a literal and not in a line after the button.
     2. RS1: the box's label is the consent sentence only, in its unchanged
        words (no rewording is signed off); the storage promise sits under
        the button with a lock glyph and a /privacy link. The box is 20px.
     3. RS5: the form checks the ZIP and the email itself before anything is
        sent; each message sits under its own field, which reports itself
        invalid and names it; focus goes to the first; the route names the
        field of a 400 and the form places it by that key.
     4. RS2: the Card and its h2 stay mounted; the sent body is a focused
        "Check your inbox" heading that echoes the email on screen only, says
        what a repeat today means, and has a way back to the form.
     5. D2 (a): nothing in the form moves below lg, or under reduced motion.

   Source scans only, comments stripped. Run: node scripts/verify-reminder-form.ts */

import { readFileSync } from "node:fs";
import { coveredCountyNames } from "../src/lib/counties.ts";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}
const read = (p: string) => {
  try {
    return readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  } catch {
    return "";
  }
};
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const form = code("src/components/features/VotingInfo.tsx");
const cta = code("src/components/features/ReminderSignupCta.tsx");
const route = code("src/app/api/voting-info/route.ts");
const between = (from: string, to: string) => {
  const a = form.indexOf(from);
  const b = form.indexOf(to, a + 1);
  return a >= 0 && b > a ? form.slice(a, b) : "";
};

/* ---- 1. the ZIP field and the counties (D4 (a)) -------------------------- */

console.log("1. ZIP field, counties named under its label");
check("the form still asks for a ZIP (D4 (a): through Nov 3)", /name="zip"/.test(form));
check(
  "the hint sits between the ZIP label and its field, and the field names it as a description",
  /ZIP code\s*<\/label>\s*\{zipHint && \(\s*<p id=\{`\$\{id\}-zip-hint`\}/.test(form) &&
    /describedBy\(\s*zipHint && `\$\{id\}-zip-hint`,/.test(form)
);
check(
  "the home card passes the counties from coveredCountyNames(), not a literal",
  /zipHint=\{`\$\{coveredCountyNames\("or"\)\} County ZIPs for now`\}/.test(cta) &&
    !/Miami-Dade|Broward|Hillsborough/.test(cta)
);
check(
  "it reads as one of the four",
  coveredCountyNames("or") === "Miami-Dade, Broward, Hillsborough or Orange",
  coveredCountyNames("or")
);
check(
  "no county line after the card (the voter learns the limit before typing)",
  !/For ZIP codes in/.test(cta) && !/<VotingInfo[\s\S]*\/>\s*<p/.test(cta)
);

/* ---- 2. consent and the storage promise (RS1) ---------------------------- */

console.log("\n2. Consent split from the storage promise");
const consentLabel = between('<label className="flex min-h-[24px] items-start gap-2', "</label>");
check(
  "the box's label is the consent sentence, words unchanged, and nothing else",
  /\{remindersOn\s*\?\s*"Yes — email me where to vote and the key deadlines now, and a reminder as each remaining deadline comes up\."\s*:\s*"Yes — email me where to vote and the key deadlines\."\s*\}\s*<\/span>\s*$/.test(
    consentLabel
  ) && !/We store only/.test(consentLabel),
  consentLabel.slice(0, 120)
);
check("the box is 20px", /className="size-\[20px\] shrink-0 accent-\[var\(--color-primary\)\]"/.test(consentLabel));
const promise = between("<LockGlyph />", "</p>");
check(
  "the storage promise is its own line after the button, with a lock glyph and a /privacy link",
  form.indexOf("<LockGlyph />") > form.indexOf('<Button type="submit"') &&
    /We store only your email and ZIP, never link them to your\s+browsing, and every email has an unsubscribe link\./.test(promise) &&
    /<Link href="\/privacy"/.test(promise)
);

/* ---- 3. an error under each field (RS5) ---------------------------------- */

console.log("\n3. Errors under their fields");
check(
  "the form checks ZIP, email and the box before the fetch, with the browser's bubbles off",
  /noValidate/.test(form) &&
    /if \(!\/\^\\d\{5\}\$\/\.test\(zip\)\) found\.zip = MESSAGES\.zip;/.test(form) &&
    /if \(!email\.trim\(\) \|\| emailRef\.current\?\.validity\.typeMismatch\) found\.email = MESSAGES\.email;/.test(form) &&
    /if \(!consent\) found\.consent = MESSAGES\.consent;/.test(form) &&
    form.indexOf("showInvalid(found)") > 0 &&
    form.indexOf("showInvalid(found)") < form.indexOf('fetch("/api/voting-info"')
);
for (const field of ["zip", "email", "consent"]) {
  const errorId = `\`\\$\\{id\\}-${field}-error\``;
  check(
    `${field}: reports itself invalid, names its own message, which sits under it`,
    new RegExp(`aria-invalid=\\{errors\\.${field} \\? true : undefined\\}`).test(form) &&
      new RegExp(`errors\\.${field} && ${errorId}`).test(form) &&
      new RegExp(`<ErrorLine key=\\{seq\\} id=\\{${errorId}\\} message=\\{errors\\.${field}\\} />`).test(form)
  );
}
check(
  "focus goes to the first field with a problem, in form order, once per check",
  /const FIELDS: readonly Field\[\] = \["zip", "email", "consent"\];/.test(form) &&
    /focusNext\.current = FIELDS\.find\(\(f\) => errors\[f\]\) \?\? null;/.test(form) &&
    /const field = focusNext\.current;\s*focusNext\.current = null;/.test(form)
);
check(
  "an error line is read wherever focus is, and carries the glyph",
  /<p id=\{id\} role="alert" className="flex items-start gap-1 text-body-sm text-error">\s*<span className="mt-\[3px\] flex shrink-0">\s*<ErrorGlyph \/>/.test(
    form
  )
);
check(
  "an invalid Input shows an error edge, focused or not",
  /aria-\[invalid=true\]:border-error aria-\[invalid=true\]:focus:border-error/.test(code("src/components/ui/Input.tsx"))
);
check(
  "the route names the field of a 400: the zod issue's own key, and the uncovered ZIP",
  /const field = issue\?\.path\[0\];/.test(route) &&
    /\.\.\.\(isField\(field\) \? \{ field \} : \{\}\)/.test(route) &&
    /We don't cover that ZIP yet[^`]*\$\{coveredCountyNames\(\)\} counties\.`,\s*field: "zip",/.test(route)
);
check(
  "the form places a server 400 by its key, never by its words; the rest stay one alert",
  /if \(data\.field === "zip" \|\| data\.field === "email"\) \{\s*showInvalid\(\{ \[data\.field\]: message \}\);\s*\} else \{\s*setStage\(\{ kind: "error", message, seq: \+\+errorSeq \}\);/.test(
    form
  ) && !/data\.error\s*(===|\.includes|\.startsWith)/.test(form)
);
{
  const formMessage = (f: string) => form.match(new RegExp(`${f}: "([^"]+)"`))?.[1];
  const routeMessage = (name: string) => route.match(new RegExp(`const ${name} = "([^"]+)";`))?.[1];
  check(
    "the form and the route say the same words for a bad ZIP and a bad email",
    !!formMessage("zip") &&
      formMessage("zip") === routeMessage("ZIP_MESSAGE") &&
      !!formMessage("email") &&
      formMessage("email") === routeMessage("EMAIL_MESSAGE"),
    `${formMessage("zip")} / ${routeMessage("ZIP_MESSAGE")}; ${formMessage("email")} / ${routeMessage("EMAIL_MESSAGE")}`
  );
}

/* ---- 4. the sent state (RS2) --------------------------------------------- */

console.log("\n4. Sent state");
check(
  "the Card and its h2 render whichever body shows",
  /<Card className="flex flex-col gap-3">\s*<h2 id=\{`\$\{id\}-heading`\} className="text-h3">\s*\{heading\}\s*<\/h2>\s*\{stage\.kind === "sent" \? \(/.test(
    form
  ) && /aria-labelledby=\{`\$\{id\}-heading`\}/.test(form)
);
check(
  "the sent body leads with a focusable \"Check your inbox\" heading",
  /<h3 ref=\{sentRef\} tabIndex=\{-1\} className="text-label focus:outline-none">\s*Check your inbox\s*<\/h3>/.test(form)
);
check(
  "it echoes the email on screen, and never into track() or a URL",
  /to\{" "\}\s*<span className="font-medium">\{stage\.email\}<\/span>/.test(form) &&
    /track\("voting_info_requested"\);/.test(form) &&
    !/track\([^)]*email/.test(form) &&
    !/(href|router\.push|location)[^;\n]*email/.test(form.replace(/autoComplete="email"/g, ""))
);
check(
  "\"Use a different email\" goes back to the form and focuses the email field",
  /function changeEmail\(\) \{\s*focusNext\.current = "email";\s*setStage\(\{ kind: "idle" \}\);\s*\}/.test(form) &&
    /onClick=\{changeEmail\}[\s\S]{0,200}Use a different email/.test(form)
);

/* ---- 5. motion (D2 (a)) --------------------------------------------------- */

console.log("\n5. Motion");
{
  const classes = [...form.matchAll(/className="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/));
  const moving = classes.filter((c) => /transition|duration-|animate-|starting:|ease-/.test(c));
  check(
    "every transition in the form is lg+ and motion-safe (phones keep still)",
    moving.every((c) => c.startsWith("lg:motion-safe:")),
    moving.join(" ")
  );
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nReminder form checks passed.");
