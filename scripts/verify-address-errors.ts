/* Address errors you can act on, and the district picker as a visible second
   route: Top 12 item #4 of the Mobbin reference catalog
   (docs/design/mobbin-references-2026-10-12, section 7 AD1/AD2/AD7/AD3 and
   section 5 NS1). Built on 2026-10-13, after #175 made the field
   address-only.

   1. AD1 (Square): an aria-invalid Input takes the error edge, and every
      error line leads with the error glyph. The error that isn't about the
      field sits under the button row, above the coverage note.
   2. NS1 (Walmart): an address Census couldn't match gets a one-line lead
      (the only alert), a "What to check" list of one to three fixes, the
      typed address echoed on screen only, "Edit address" and "Choose your
      district instead". A failure that isn't about the field gets "Try
      again", which resends the same lookup.
   3. AD2 (Zalando): every error's way on is a button that opens the picker
      and moves focus to it; no error says "below" or offers a ZIP. The
      home toggle is a 24px primary link whose caret flips with no
      transition (decision D2: nothing moves on phones).
   4. AD7 (Apple): the picker is open by default under a divider, with a
      visible question, a help line that describes the select, and its own
      button. Home passes pickerCollapsed; frozen YourRaces passes nothing.
   5. AD3 (komoot): a line under the field says where a typed address goes
      and what is kept, worded from /privacy. Home passes privacyNote={false}.

   Source scans only, comments stripped. Run: node scripts/verify-address-errors.ts */

import { readFileSync } from "node:fs";

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
/* Block comments first: a JSX comment leaves an empty {} behind. The other
   order lets a function's leading comment run on to the next JSX comment. */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");
/* One line, with JSX's escapes and {" "} read as the voter sees them. */
const flat = (src: string) =>
  src
    .replace(/&apos;|&rsquo;/g, "'")
    .replace(/\{" "\}/g, " ")
    .replace(/\s+/g, " ");

const entry = code("src/components/features/LocationEntry.tsx");
const entryFlat = flat(entry);
check("LocationEntry.tsx was read", entry.length > 0);

/* ---- 1. AD1: the error edge and glyph ------------------------------------ */
console.log("\n1. AD1 error edge and glyph");
const input = code("src/components/ui/Input.tsx");
check(
  "an aria-invalid Input takes the error edge, focused or not",
  /aria-\[invalid=true\]:border-error aria-\[invalid=true\]:focus:border-error/.test(input)
);
const glyphs = code("src/components/ui/Glyphs.tsx");
check(
  "ErrorGlyph and LockGlyph are drawn from the shared aria-hidden svg",
  /export function ErrorGlyph\(\) \{\s*return \(\s*<svg \{\.\.\.svg\}>/.test(glyphs) &&
    /export function LockGlyph\(\) \{\s*return \(\s*<svg \{\.\.\.svg\}>/.test(glyphs) &&
    /"aria-hidden": true/.test(glyphs)
);
{
  const alerts = (entry.match(/role="alert"/g) ?? []).length;
  const withGlyph = (
    entry.match(
      /<p\s+role="alert"\s+className="flex items-start gap-1 text-body-sm text-error"\s*>\s*<span className="flex h-\[1lh\] shrink-0 items-center">\s*<ErrorGlyph \/>/g
    ) ?? []
  ).length;
  check(
    "every error line in LocationEntry leads with the error glyph, in the error colour",
    alerts === 2 && withGlyph === alerts,
    `${withGlyph} of ${alerts}`
  );
}
{
  const submitAt = entry.indexOf('<Button type="submit" disabled={!hydrated || stage.kind === "loading"}>');
  const formEnd = entry.indexOf("</form>", submitAt);
  const nonFieldAt = entry.indexOf('stage.kind === "error" && stage.field === false');
  const coverageAt = entry.indexOf("Full statewide coverage isn&rsquo;t available yet");
  check(
    "the error that isn't about the field sits under the button row, above the coverage note",
    submitAt > 0 && nonFieldAt > submitAt && nonFieldAt < formEnd && nonFieldAt < coverageAt,
    `submit ${submitAt}, error ${nonFieldAt}, </form> ${formEnd}, coverage ${coverageAt}`
  );
  check(
    "only one place renders that error",
    (entry.match(/stage\.field === false/g) ?? []).length === 1
  );
}

/* ---- 2. NS1: errors with a way forward ------------------------------------ */
console.log("\n2. NS1 errors with a way forward");
{
  /* Every reason the resolve route can send has its own words. */
  const route = code("src/app/api/address/resolve/route.ts");
  const union = route.match(/reason:\s*((?:"\w+"\s*\|?\s*)+)\)/)?.[1] ?? "";
  const reasons = [...union.matchAll(/"(\w+)"/g)].map((m) => m[1]);
  check("the resolve route's 422 reasons were read", reasons.length >= 5, reasons.join(", "));
  const table = entry.slice(
    entry.indexOf("const UNMATCHED: Record<string, ErrorCopy> = {"),
    entry.indexOf("const ZIP_ALONE")
  );
  for (const reason of reasons) {
    const m = table.match(
      new RegExp(`\\b${reason}: \\{\\s*lead: "([^"]+)",\\s*checks: \\[([\\s\\S]*?)\\],?\\s*\\}`)
    );
    const items = m ? [...m[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
    check(
      `${reason}: a one-sentence lead and 1-3 things to check`,
      Boolean(m) && /^[^.]+\.$/.test(m![1]) && items.length >= 1 && items.length <= 3,
      m ? `${m[1]} | ${items.join(" | ")}` : "missing"
    );
  }
}
check(
  "no error sends the voter 'below' or offers a ZIP in place of the address",
  !/choose your district below|enter just your|or enter your ZIP|Try your ZIP|use your ZIP/i.test(entry)
);
check(
  "only the lead is an alert; the checks follow it, outside the alert",
  /<span>\{stage\.copy\.lead\}<\/span>\s*<\/p>\s*\{stage\.copy\.checks && \(/.test(entry)
);
check(
  "the field's description holds the lead and the checks",
  /<div id=\{errorId\} className="flex flex-col gap-1">[\s\S]*?<ul className="flex list-disc flex-col gap-1 pl-5 text-body-sm text-on-surface">[\s\S]*?stage\.copy\.checks\.map[\s\S]*?<\/ul>\s*<\/>\s*\)\}\s*<\/div>/.test(
    entry
  )
);
check(
  "'What to check' is said in words",
  /What to check:/.test(entry)
);
check(
  "a typed address is echoed back only for a 422, and a picked suggestion has none to echo",
  /fail\(\s*UNMATCHED\[data\.reason \?\? ""\] \?\? UNMATCHED\.none,\s*true,\s*"address" in pick \? pick\.address : undefined\s*\)/.test(
    entry
  ) && /You entered: <span className="text-on-surface">\{stage\.entered\}<\/span>/.test(entryFlat)
);
{
  /* On screen only: no analytics call and no URL carries it. */
  const tracks = [...entry.matchAll(/track\(([^)]*)\)/g)].map((m) => m[1]);
  check(
    "no track() call carries the address, the typed value or the echo",
    tracks.length > 0 && tracks.every((t) => !/entered|address|value|trimmed|pick/.test(t)),
    tracks.join(" | ")
  );
  check(
    "no URL is built from the echo",
    !/[?&][a-z]+=\$\{stage\.entered\}|URLSearchParams\([^)]*entered/.test(entry)
  );
}
check(
  "'Edit address' returns focus to the field and keeps the text",
  /<button\s+type="button"\s+onClick=\{editAddress\}\s+className=\{TEXT_BUTTON\}\s*>\s*Edit address\s*<\/button>/.test(entry) &&
    /function editAddress\(\) \{\s*const input = inputRef\.current;\s*if \(!input\) return;\s*input\.focus\(\);/.test(entry) &&
    !/function editAddress\(\) \{[^}]*setValue/.test(entry)
);
check(
  "'Try again' resends the last lookup",
  /lastPick\.current = pick;/.test(entry) &&
    /<Button\s+type="button"\s+variant="secondary"\s+onClick=\{\(\) => \{\s*if \(lastPick\.current\) void resolveAddress\(lastPick\.current\);\s*\}\}\s*>\s*Try again\s*<\/Button>/.test(
      entry
    )
);
check(
  "after any error, focus goes back to the field only if it was lost or on the submit",
  /const anyError = stage\.kind === "error";\s*useEffect\(\(\) => \{\s*if \(!anyError\) return;/.test(entry) &&
    /if \(!active \|\| active === document\.body \|\| active === submitButton\) \{\s*inputRef\.current\?\.focus\(\);/.test(entry)
);

/* ---- 3. AD2: the way on is the picker ------------------------------------ */
console.log("\n3. AD2 the way on is the picker");
{
  const escapes = [
    ...entry.matchAll(
      /\{districts\.length > 0 && \(\s*<button\s+type="button"\s+onClick=\{choosePicker\}\s+className=\{TEXT_BUTTON\}\s*>\s*Choose your district instead\s*<\/button>/g
    ),
  ].length;
  check(
    "both kinds of error end in 'Choose your district instead', shown only when there is a picker",
    escapes === 2 && (entry.match(/Choose your district instead/g) ?? []).length === 2,
    String(escapes)
  );
}
check(
  "it moves focus to the picker's select, opening the picker first if it is collapsed",
  /function choosePicker\(\) \{\s*if \(pickerRef\.current\) \{\s*pickerRef\.current\.focus\(\);\s*return;\s*\}\s*focusPickerNext\.current = true;\s*setShowPicker\(true\);\s*\}/.test(
    entry
  ) &&
    /if \(showPicker && focusPickerNext\.current\) \{\s*focusPickerNext\.current = false;\s*pickerRef\.current\?\.focus\(\);/.test(entry) &&
    /ref=\{pickerRef\}\s*id="district-picker"/.test(entry)
);
check(
  "the text buttons under an error are at least 24px tall",
  /const TEXT_BUTTON =\s*"inline-flex min-h-\[24px\] w-fit items-center text-body-sm text-primary underline/.test(entry)
);
{
  const at = entry.indexOf('id="district-picker-toggle"');
  const toggle = at >= 0 ? entry.slice(at, entry.indexOf("</button>", at)) : "";
  check(
    "the home toggle is a 24px primary link with a caret",
    /className="inline-flex min-h-\[24px\] w-fit items-center gap-1 text-body-sm text-primary underline/.test(toggle) &&
      /<CaretGlyph \/>/.test(toggle),
    toggle.slice(0, 300)
  );
  check(
    "its caret flips with no transition (D2: nothing moves on phones)",
    /showPicker \? "rotate-180" : ""/.test(toggle) && !/transition|duration-|animate-/.test(toggle)
  );
}
check(
  "nothing in LocationEntry animates",
  !/animate-|motion-safe:/.test(entry)
);

/* ---- 4. AD7: the picker as a visible second route ------------------------- */
console.log("\n4. AD7 the picker as a visible second route");
check(
  "the picker is open by default; only a page that asks collapses it, and never with no field",
  /pickerCollapsed = false,/.test(entry) &&
    /const collapsible = addressEnabled && pickerCollapsed;/.test(entry) &&
    /useState\(!collapsible\)/.test(entry)
);
check(
  "a divider separates it from the field above",
  /id="district-picker-route"\s*className=\{`flex flex-col gap-2 \$\{addressEnabled \? "border-t border-border pt-4" : ""\}`\}/.test(entry)
);
check(
  "its question is a visible label on the select",
  /<label htmlFor="district-picker" className="text-label text-on-surface">\s*Know your congressional district\?\s*<\/label>/.test(entry)
);
{
  const at = entry.indexOf("id={pickerHelpId}");
  const help = at >= 0 ? entry.slice(entry.lastIndexOf("<p", at), entry.indexOf("</p>", at)) : "";
  check(
    "the help line describes the select, at body-sm, and its link says it opens a new tab",
    /aria-describedby=\{pickerHelpId\}/.test(entry) &&
      /text-body-sm text-on-surface-muted/.test(help) &&
      !/text-caption/.test(help) &&
      /Not sure\?/.test(help) &&
      /target="_blank"/.test(help) &&
      /\(opens in a new tab\)/.test(help),
    help.slice(0, 300)
  );
}
const home = code("src/app/(public)/page.tsx");
const homeEntry = home.match(/<LocationEntry[\s\S]*?\/>/)?.[0] ?? "";
check(
  "home keeps the picker behind its toggle and turns the privacy line off",
  /\bpickerCollapsed\b/.test(homeEntry) && /privacyNote=\{false\}/.test(homeEntry),
  homeEntry
);
{
  /* YourRaces is frozen from 2026-10-18: it gets the open picker and the
     privacy line from the defaults, with no edit. */
  const yourRaces = code("src/components/features/YourRaces.tsx");
  const calls = yourRaces.match(/<LocationEntry[\s\S]*?\/>/g) ?? [];
  check(
    "YourRaces passes neither prop, so it gets the defaults",
    calls.length > 0 && calls.every((c) => !/pickerCollapsed|privacyNote/.test(c)),
    String(calls.length)
  );
}

/* ---- 5. AD3: where a typed address goes ----------------------------------- */
console.log("\n5. AD3 where a typed address goes");
{
  const formAt = entry.indexOf('id="location-form"');
  const formEnd = entry.indexOf("</form>", formAt);
  const noteAt = entry.indexOf("{privacyNote && (");
  check(
    "the privacy line is on by default and sits in the address form (no field, no line)",
    /privacyNote = true,/.test(entry) && noteAt > formAt && noteAt < formEnd
  );
  const note = noteAt >= 0 ? entryFlat.slice(entryFlat.indexOf("{privacyNote && ("), entryFlat.indexOf("</form>", entryFlat.indexOf("{privacyNote && ("))) : "";
  check(
    "it leads with the lock glyph and links /privacy",
    /<LockGlyph \/>/.test(note) && /href="\/privacy"/.test(note),
    note.slice(0, 200)
  );
  check(
    "production's line says the text goes from our server to the Census Bureau, and only the district is kept",
    /"What you type goes from our server to the U\.S\. Census Bureau to find your district\."/.test(note) &&
      /We keep only the district, on this device\./.test(note)
  );
  check(
    "with suggestions on, it says Census gets only the picked point",
    /suggestEnabled \? "What you type goes to an address-completion service[^"]*the U\.S\. Census Bureau gets only the map point/.test(note)
  );
  check(
    "it never claims we don't see the address (our server passes it on)",
    !/we never see|never see your address|we don't see/i.test(note)
  );
  /* The line is worded from /privacy; if /privacy stops saying this, the
     line has to change with it. */
  const privacy = flat(code("src/app/(public)/privacy/page.tsx"));
  check(
    "/privacy still says a typed address goes to the Census Bureau and only the district is kept",
    /we send what you typed to the U\.S\. Census Bureau's public geocoder/.test(privacy) &&
      /the district is the only thing that is kept/.test(privacy)
  );
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nverify-address-errors: all checks passed.");
