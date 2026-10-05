/* TASK-070 verify: nothing stores the voter's location on their device.

   The task's criterion is `grep -r "kyv.location" src` returning nothing.
   This is that grep, with two refinements that make it a durable invariant
   rather than a one-off check:

   1. Comments are stripped first. The code is gone; several files explain
      why, and a comment saying "kyv.location is gone" must not read as
      kyv.location being present.
   2. It also fails on a *new* device-stored location under any other key —
      re-adding the same behaviour as `kyv.loc` or `kyv.zip` would pass a
      literal grep while undoing the task.

   kyv.saved is explicitly permitted. It is a different thing: an opt-in list
   the voter builds by pressing a button, not location the app accumulates on
   its own. The proposal keeps it deliberately.

   Extended by TASK-071 to cover the claims *about* that storage. The privacy
   page said quiz answers were stored in the browser; they never were, and a
   page whose whole value is being checkable cannot carry a claim that fails
   the check. The funnel assertions live here too, because "ballot_viewed
   before zip_resolved" is the same fact from the analytics side: the ballot,
   not the ZIP, is where a visit now begins.

   Reworked for the launch handoff (docs/general-election/
   launch-handoff-2026-10-04.md §7, the CI item) after SitePrompts.tsx turned
   it red. That component reads and writes through two small wrappers,
   read(key) and write(key, value), and the check could only see the
   parameter name `key`, so it reported "<key: unresolved>". The fix is to
   follow the wrapper to its call sites and resolve what they pass, never to
   wave unresolved keys through: anything the resolver cannot follow still
   fails. Section 3 explains the resolution, and section 3b runs it against
   fixtures that put a ZIP back on the device, so a resolver that quietly lost
   its teeth would fail here rather than pass.

   Run: node scripts/verify-no-stored-location.ts
   (also run by scripts/verify-all.mjs and in CI; see docs/ci.md) */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import {
  parseDistrictCookie,
  formatDistrictCookie,
  DISTRICT_COOKIE,
} from "../src/lib/district-cookie.ts";
import { join, posix, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SRC = join(ROOT, "src");

/* Comments out, literals intact. One pass that knows where strings, template
   literals and regex literals begin and end, so "https://…" inside a string
   is not read as a comment. The one-regex stripper this replaces cut every
   such string in half, and with it the quote and brace balance of the rest
   of the line, which the key resolver in section 3 depends on.

   Two views come back, each the same length as the source, so an index in
   one is an index in the other (and in the file, for line numbers):
   - `code`: every comment blanked to spaces, newlines kept.
   - `shape`: `code` with the inside of every string, template and regex
     literal blanked as well, so a brace, a comma or the word localStorage
     inside a literal is never mistaken for structure.

   Regex versus division is the usual heuristic: the last significant
   character, or a keyword such as `return`. Two JSX carve-outs apply: `</`
   and `/>` are tags, never regexes. */
function scan(src: string): { code: string; shape: string } {
  const code = src.split("");
  const shape = src.split("");
  const blank = (view: string[], i: number) => {
    if (i < view.length && view[i] !== "\n") view[i] = " ";
  };
  const blankInside = (open: number, close: number) => {
    for (let k = open + 1; k < close; k++) blank(shape, k);
  };
  const REGEX_AFTER = "(,=:[!&|?{};+-*%<>~^";
  const REGEX_KEYWORDS = new Set(
    "return typeof case do else in of new delete void throw yield await".split(
      " "
    )
  );
  /* One entry per open `${`: how many plain braces are open inside it. */
  const templateDepth: number[] = [];
  let prev = "";
  let prevWord = "";

  /* From just inside a template literal to its closing backtick, or to the
     next `${`, which hands control back to the main loop until its `}`. */
  const templateChunk = (from: number): number => {
    let j = from;
    while (j < src.length) {
      if (src[j] === "\\") {
        blank(shape, j);
        blank(shape, j + 1);
        j += 2;
      } else if (src[j] === "`") {
        return j + 1;
      } else if (src[j] === "$" && src[j + 1] === "{") {
        templateDepth.push(0);
        return j + 2;
      } else {
        blank(shape, j);
        j++;
      }
    }
    return j;
  };

  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") {
        blank(code, i);
        blank(shape, i);
        i++;
      }
      continue;
    }
    if (c === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? src.length : end + 2;
      for (; i < stop; i++) {
        blank(code, i);
        blank(shape, i);
      }
      continue;
    }
    if (c === '"' || c === "'") {
      /* A plain string cannot cross a line, so a stray quote (an apostrophe
         in JSX text, say) costs at most the rest of its own line. */
      let j = i + 1;
      while (j < src.length && src[j] !== c && src[j] !== "\n") {
        j += src[j] === "\\" ? 2 : 1;
      }
      blankInside(i, j);
      prev = c;
      i = j + 1;
      continue;
    }
    if (c === "`") {
      i = templateChunk(i + 1);
      prev = "`";
      continue;
    }
    if (c === "/") {
      const tag = prev === "<" || next === ">";
      const regex =
        !tag &&
        (prev === "" ||
          REGEX_AFTER.includes(prev) ||
          (/[\w$]/.test(prev) && REGEX_KEYWORDS.has(prevWord)));
      if (regex) {
        let j = i + 1;
        let inClass = false;
        while (j < src.length && src[j] !== "\n") {
          if (src[j] === "\\") j++;
          else if (src[j] === "[") inClass = true;
          else if (src[j] === "]") inClass = false;
          else if (src[j] === "/" && !inClass) break;
          j++;
        }
        blankInside(i, j);
        prev = "/";
        i = j + 1;
        continue;
      }
    }
    if (templateDepth.length) {
      const top = templateDepth.length - 1;
      if (c === "{") templateDepth[top]++;
      else if (c === "}") {
        if (templateDepth[top] === 0) {
          templateDepth.pop();
          i = templateChunk(i + 1);
          prev = "`";
          continue;
        }
        templateDepth[top]--;
      }
    }
    if (!/\s/.test(c)) {
      if (/[\w$]/.test(c)) {
        prevWord = /[\w$]/.test(src[i - 1] ?? "") ? prevWord + c : c;
      } else {
        prevWord = "";
      }
      prev = c;
    }
    i++;
  }
  return { code: code.join(""), shape: shape.join("") };
}

const stripComments = (src: string) => scan(src).code;
const lineOf = (text: string, index: number) =>
  text.slice(0, index).split("\n").length;

let failures = 0;
function assert(name: string, cond: boolean, extra = "") {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name} ${extra}`);
  }
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx?$/.test(full) ? [full] : [];
  });
}

type Source = { path: string; code: string; shape: string };

const files: Source[] = walk(SRC).map((f) => ({
  path: f
    .slice(ROOT.length + 1)
    .split("\\")
    .join("/"),
  ...scan(readFileSync(f, "utf8")),
}));

/* 1. The module itself is gone. */
assert(
  "src/lib/location.ts no longer exists",
  !existsSync(join(SRC, "lib", "location.ts"))
);

/* 2. No code references the key or its helpers. */
for (const [label, re] of [
  ["the kyv.location key", /kyv\.location/],
  ["readLocation", /\breadLocation\b/],
  ["writeLocation", /\bwriteLocation\b/],
  ["clearLocation", /\bclearLocation\b/],
  ["the @/lib/location module", /@\/lib\/location/],
] as const) {
  const hits = files.filter((f) => re.test(f.code)).map((f) => f.path);
  assert(`no code references ${label}`, hits.length === 0, hits.join(", "));
}

/* 3. Device storage holds a district cookie, one list and three answers to
      prompts -- nothing else.

      kyv.location is gone and stays gone: it held a ZIP, which is a location.
      kyv.district holds FL-27|12086, which is a public electoral unit the voter
      chose. That distinction is the whole argument in the spec §8, so it is
      asserted here rather than trusted.

      Every key below is allowed for a stated reason, and none of them holds
      location. Each also names how /privacy discloses it, because that page
      promises "the whole list of what we store"; section 4 asserts it.
      Adding a key here is a privacy decision, so the reason has to be written
      down next to it. */
const ALLOWED_LOCAL = new Map<string, { why: string; disclosed: RegExp }>([
  [
    "kyv.saved",
    {
      why:
        "the opt-in 'keep in mind' list: candidate ids the voter pressed a " +
        "button to keep (saved.ts). Public ids, written only on that press.",
      disclosed: /keep in\s+mind/i,
    },
  ],
  [
    "kyv.install-dismissed",
    {
      why: 'the constant "1" once the voter closes the get-the-app card (InstallCard.tsx).',
      disclosed: /get the app/i,
    },
  ],
  [
    "kyv.ads-consent",
    {
      why:
        'the answer to the cookie question, "granted" or "denied" ' +
        "(SitePrompts.tsx). It decides whether the Google tag loads at all.",
      disclosed: /kyv\.ads-consent/,
    },
  ],
  [
    "kyv.donate-dismissed",
    {
      why: 'the constant "1" once the voter closes the donation prompt (SitePrompts.tsx).',
      disclosed: /kyv\.donate-dismissed/,
    },
  ],
]);

/* How a key is resolved. Every localStorage or sessionStorage call is read
   from the `shape` view, so a call written inside a string does not count,
   and its first argument is resolved like this:

   - a string literal is the key;
   - a name bound by a parameter of the innermost enclosing NAMED function (a
     wrapper such as SitePrompts' read(key), or an arrow assigned to a const,
     with a block body or an expression body alike) resolves through every
     call of that function in the same file, each call's argument resolved the
     same way;
   - any other name must be a `const` initialised to a string literal, in this
     file or imported from another file under src/. Every such const counts,
     local and imported alike, because the lookup does not know scopes: a key
     is allowed only when every value the name could hold is allowed.

   Anything else fails, with the reason: an expression or template, a `let`,
   a parameter of an anonymous function, a wrapper that reassigns its key
   parameter, an exported wrapper whose callers live in other files, a
   wrapper passed around as a value, a name the file also binds in a way the
   const lookup cannot see (a parameter, a for-of variable, a destructured
   name, a default import), and storage reached any way other than getItem,
   setItem or removeItem (bracket access, an alias, a string). Failing on what
   it cannot follow is the point. A resolver that guessed would let `kyv.zip`
   back in behind one level of indirection, which is exactly the regression
   this file exists to catch.

   The last two rules close a gap an adversarial review found on 2026-10-04:
   `const put = (key, v) => localStorage.setItem(key, v)` has no brace, so the
   parameter went unseen and an unrelated `const key = "kyv.donate-dismissed"`
   elsewhere in the file was taken as the key, while put("kyv.zip", zip)
   passed. Section 3b now carries that shape and its relatives. */
type Resolved = { key: string | null; via: string };
type StoredKey = { path: string; line: number; key: string; via: string };
type Problem = { path: string; line: number; what: string };

const IDENT = /^[A-Za-z_$][\w$]*$/;
const STORAGE_WORD = /\b(?:localStorage|sessionStorage)\b/g;
const STORAGE_CALL =
  /^(?:localStorage|sessionStorage)\s*\.\s*(?:getItem|setItem|removeItem)\s*\(/;

function literalValue(expr: string): string | null {
  const m = expr
    .replace(/\s+as\s+const$/, "")
    .match(/^"([^"\\]*)"$|^'([^'\\]*)'$|^`([^`\\$]*)`$/);
  return m ? (m[1] ?? m[2] ?? m[3]) : null;
}

/* Where the expression starting at `start` ends: the first top-level
   character in `stops`, or a closing bracket that was not opened in it. */
function expressionEnd(shape: string, start: number, stops = ","): number {
  let depth = 0;
  for (let i = start; i < shape.length; i++) {
    const c = shape[i];
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") {
      if (depth === 0) return i;
      depth--;
    } else if (depth === 0 && stops.includes(c)) return i;
  }
  return shape.length;
}

/* The argument expressions of a call whose `(` is just before `open`. */
function callArguments(f: Source, open: number): Array<[number, string]> {
  const args: Array<[number, string]> = [];
  let start = open;
  while (start < f.shape.length) {
    const end = expressionEnd(f.shape, start);
    const text = f.code.slice(start, end).trim();
    if (text) args.push([start, text]);
    if (f.shape[end] !== ",") break;
    start = end + 1;
  }
  return args;
}

/* A name as a regex fragment. `$` is legal in an identifier but special in a
   pattern, and \b does not count it as part of a word. */
const word = (name: string) =>
  `(?<![\\w$])${name.replace(/\$/g, "\\$")}(?![\\w$])`;

const declaredAs = (name: string) =>
  new RegExp(
    `(?<![\\w$.])(const|let|var)\\s+${word(name)}\\s*(?::[^=;]*)?=\\s*`,
    "g"
  );

/* All values a `const` of this name in this file can hold, or null when the
   file declares no such name. */
function constValues(name: string, f: Source): Resolved[] | null {
  const decls = [...f.shape.matchAll(declaredAs(name))];
  if (!decls.length) return null;
  return decls.map((d) => {
    if (d[1] !== "const") {
      return { key: null, via: `${name} is a ${d[1]} and can be reassigned` };
    }
    const start = d.index + d[0].length;
    const init = f.code.slice(start, expressionEnd(f.shape, start, ",;\n"));
    const value = literalValue(init.trim());
    return value === null
      ? { key: null, via: `${name} is not initialised to a string literal` }
      : { key: value, via: name };
  });
}

function resolveModule(spec: string, from: string, sources: Source[]) {
  let base: string;
  if (spec.startsWith("@/")) base = `src/${spec.slice(2)}`;
  else if (spec.startsWith(".")) {
    base = posix.normalize(posix.join(posix.dirname(from), spec));
  } else return null;
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const hit = sources.find((s) => s.path === base + ext);
    if (hit) return hit;
  }
  return null;
}

function importedValues(
  name: string,
  f: Source,
  sources: Source[]
): Resolved[] | null {
  for (const m of f.code.matchAll(
    /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g
  )) {
    for (const spec of m[1].split(",")) {
      const [original, local = original] = spec
        .trim()
        .replace(/^type\s+/, "")
        .split(/\s+as\s+/)
        .map((s) => s.trim());
      if (local !== name) continue;
      const target = resolveModule(m[2], f.path, sources);
      if (!target) {
        return [
          { key: null, via: `${name} is imported from ${m[2]}, outside src/` },
        ];
      }
      return (
        constValues(original, target) ?? [
          { key: null, via: `${name} is not a const in ${target.path}` },
        ]
      );
    }
  }
  return null;
}

/* The scopes around `at`, innermost first. A scope is every open brace, and
   every expression-bodied arrow (`(key) => storage.setItem(key, v)`) whose
   body runs over `at`: such an arrow binds its parameters with no brace in
   sight, which is how the gap described in section 3 slipped through. `head`
   is where the text in front of the scope ends (the `{`, or just after the
   `=>`), and the body runs from `start` to `end`.

   An expression body ends at the first top-level `,` or `;`, or at a bracket
   it did not open. Without a semicolon it can run long, which only makes more
   uses count as the arrow's; the parameter check in resolveKey covers a body
   that ends early. */
type Scope = { head: number; start: number; end: number };

function enclosingScopes(f: Source, at: number): Scope[] {
  const scopes: Scope[] = [];
  const open: number[] = [];
  for (let i = 0; i < at; i++) {
    const c = f.shape[i];
    if (c === "{") open.push(i);
    else if (c === "}") open.pop();
    else if (c === "=" && f.shape[i + 1] === ">") {
      const start = i + 2;
      if (/^\s*\{/.test(f.shape.slice(start, start + 200))) continue;
      const end = expressionEnd(f.shape, start, ",;");
      if (at < end) scopes.push({ head: start, start, end });
    }
  }
  for (const brace of open) {
    scopes.push({
      head: brace,
      start: brace + 1,
      end: expressionEnd(f.shape, brace + 1, ""),
    });
  }
  return scopes.sort((a, b) => b.start - a.start);
}

/* `name =`, `name +=` and the like, but not `==`, `===` or `=>`. */
const assignedTo = (name: string) =>
  new RegExp(
    `(?<![\\w$.])${name.replace(/\$/g, "\\$")}\\s*(?:\\*\\*|<<|>>>?|&&|\\|\\||\\?\\?|[-+*/%&|^])?=(?![=>])`
  );

/* Does an enclosing function bind `name` as a parameter? Walks outward from
   `at` through the scopes around it and reads the head in front of each one.
   Returns null when no enclosing function binds the name (it is then a
   module-level name), the named function and the parameter's position when a
   named function does, or a reason when something binds it that cannot be
   followed. A wrapper that assigns to its own key parameter is one of those:
   its callers no longer decide the key. */
type Binding = { fn: string; index: number } | { fn: null; why: string };

function enclosingBinding(f: Source, at: number, name: string): Binding | null {
  for (const scope of enclosingScopes(f, at)) {
    const head = f.shape.slice(Math.max(0, scope.head - 400), scope.head);
    const parens = head.match(/\(([^()]*)\)\s*(?::[^(){};=]*)?(?:=>)?\s*$/);
    const hit = parens ?? head.match(/([A-Za-z_$][\w$]*)\s*=>\s*$/);
    if (!hit) continue;
    const params = hit[1];
    const words: string[] = params.match(/[A-Za-z_$][\w$]*/g) ?? [];
    if (!words.includes(name)) continue;
    const before = head.slice(0, head.length - hit[0].length);
    if (parens && /\b(?:if|while|switch)\s*$/.test(before)) continue;
    const index = params
      .split(",")
      .map((p) => p.trim().match(/^(?:\.\.\.)?([A-Za-z_$][\w$]*)/)?.[1])
      .indexOf(name);
    const named =
      before.match(
        /\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)\s*(?:<[^<>]*>)?\s*$/
      ) ??
      before.match(
        /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]*)?=\s*(?:async\s+)?(?:function\s*\*?\s*)?(?:<[^<>]*>)?\s*$/
      );
    if (!named || index === -1) {
      return {
        fn: null,
        why: `${name} is bound by something other than a plain parameter of a named function`,
      };
    }
    if (assignedTo(name).test(f.shape.slice(scope.start, scope.end))) {
      return {
        fn: null,
        why: `${name} is reassigned inside ${named[1]}(), so its callers do not decide the key`,
      };
    }
    return { fn: named[1], index };
  }
  return null;
}

/* Is `name` bound in this file in a way constValues cannot see? If it is,
   a same-named const elsewhere in the file says nothing about this use, and
   borrowing that const's value is exactly the guess section 3 forbids. Uses
   inside a function that binds the name never get here (enclosingBinding
   took them); this is the net under it, for a binding whose scope was not
   recognised. */
function hiddenBinding(name: string, f: Source): string | null {
  const n = word(name);
  const names = (text: string) => new RegExp(n).test(text);
  const at = (index: number) => ` (line ${lineOf(f.shape, index)})`;
  for (const m of f.shape.matchAll(
    /\(([^()]*)\)\s*(?::[^(){};=]*)?=>|\bfunction\b[^(){};=]*\(([^()]*)\)/g
  )) {
    if (names(m[1] ?? m[2])) {
      return `${name} is also a function parameter in this file${at(m.index)}, so a const of that name may not be what this use refers to`;
    }
  }
  const bare = f.shape.match(new RegExp(`${n}\\s*=>`));
  if (bare) {
    return `${name} is also an arrow function's parameter in this file${at(bare.index ?? 0)}`;
  }
  for (const m of f.shape.matchAll(
    /\bfor\s*(?:await\s*)?\(\s*(?:const|let|var)\s+([^;]*?)\s+(?:of|in)\b/g
  )) {
    if (names(m[1]))
      return `${name} is a loop variable in this file${at(m.index)}`;
  }
  for (const m of f.shape.matchAll(/\b(?:const|let|var)\s*([[{])/g)) {
    const open = m.index + m[0].length;
    if (names(f.shape.slice(open, expressionEnd(f.shape, open, "")))) {
      return `${name} is a destructured name in this file${at(m.index)}`;
    }
  }
  const other = f.shape.match(
    new RegExp(
      `\\b(?:function\\s*\\*?|class|import)\\s+${n}|\\bimport\\s*\\*\\s*as\\s+${n}`
    )
  );
  if (other) {
    return `${name} is also a function, a class or an import the resolver does not follow${at(other.index ?? 0)}`;
  }
  return null;
}

/* A wrapper's keys are whatever its callers pass. Every mention of the
   wrapper in the file has to be a direct call; anything else (exported,
   passed as a value, called as a method) cannot be followed. */
function resolveWrapper(
  fn: string,
  index: number,
  f: Source,
  sources: Source[],
  depth: number
): Resolved[] {
  const exported = new RegExp(
    `\\bexport\\s+(?:default\\s+)?(?:async\\s+)?(?:function\\s*\\*?\\s*|const\\s+)${word(fn)}|\\bexport\\s*\\{[^}]*${word(fn)}`
  );
  if (exported.test(f.shape)) {
    return [
      {
        key: null,
        via: `${fn}() is exported; callers in other files are not followed`,
      },
    ];
  }
  const out: Resolved[] = [];
  for (const m of f.shape.matchAll(new RegExp(word(fn), "g"))) {
    const before = f.shape.slice(0, m.index);
    if (/(?:\bfunction\s*\*?|\b(?:const|let|var))\s*$/.test(before)) continue;
    const call = f.shape.slice(m.index + fn.length).match(/^\s*\(/);
    if (/\.\s*$/.test(before) || !call) {
      out.push({
        key: null,
        via: `${fn} is used other than as a direct call (line ${lineOf(f.shape, m.index)})`,
      });
      continue;
    }
    const arg = callArguments(f, m.index + fn.length + call[0].length)[index];
    if (!arg) {
      out.push({
        key: null,
        via: `${fn}() called without its key (line ${lineOf(f.shape, m.index)})`,
      });
      continue;
    }
    for (const r of resolveKey(arg[1], f, arg[0], sources, depth + 1)) {
      out.push({
        key: r.key,
        via: r.key === null ? r.via : `${fn}(${arg[1]})`,
      });
    }
  }
  return out;
}

function resolveKey(
  expr: string,
  f: Source,
  at: number,
  sources: Source[],
  depth: number
): Resolved[] {
  const literal = literalValue(expr);
  if (literal !== null) return [{ key: literal, via: JSON.stringify(literal) }];
  if (!IDENT.test(expr)) {
    return [{ key: null, via: `\`${expr}\` is an expression, not a constant` }];
  }
  if (depth > 4)
    return [{ key: null, via: `${expr}: wrappers nest too deep to follow` }];
  const binding = enclosingBinding(f, at, expr);
  if (binding) {
    return binding.fn === null
      ? [{ key: null, via: binding.why }]
      : resolveWrapper(binding.fn, binding.index, f, sources, depth);
  }
  const hidden = hiddenBinding(expr, f);
  if (hidden) return [{ key: null, via: hidden }];
  /* Both lists, not the first that answers: a const in some other function
     must not hide the imported value this use may refer to, or the reverse. */
  const consts = constValues(expr, f);
  const imported = importedValues(expr, f, sources);
  if (consts || imported) return [...(consts ?? []), ...(imported ?? [])];
  return [
    {
      key: null,
      via: `${expr} is neither a const in this file nor imported from src/`,
    },
  ];
}

function auditStorage(sources: Source[]) {
  const keys: StoredKey[] = [];
  const problems: Problem[] = [];
  for (const f of sources) {
    for (const m of f.code.matchAll(STORAGE_WORD)) {
      const line = lineOf(f.code, m.index);
      if (f.shape.slice(m.index, m.index + m[0].length) !== m[0]) {
        problems.push({
          path: f.path,
          line,
          what: `${m[0]} is named inside a string, so the access cannot be followed`,
        });
        continue;
      }
      const call = f.shape.slice(m.index).match(STORAGE_CALL);
      if (!call) {
        problems.push({
          path: f.path,
          line,
          what: `${m[0]} is used other than through getItem, setItem or removeItem`,
        });
        continue;
      }
      const start = m.index + call[0].length;
      const expr = f.code.slice(start, expressionEnd(f.shape, start)).trim();
      for (const r of resolveKey(expr, f, start, sources, 0)) {
        if (r.key === null)
          problems.push({
            path: f.path,
            line,
            what: `unresolved key: ${r.via}`,
          });
        else keys.push({ path: f.path, line, key: r.key, via: r.via });
      }
    }
  }
  return { keys, problems };
}

const storage = auditStorage(files);
const unexpected = storage.keys.filter((k) => !ALLOWED_LOCAL.has(k.key));
assert(
  "every device-storage key resolves to a literal",
  storage.problems.length === 0,
  storage.problems.map((p) => `\n      ${p.path}:${p.line}: ${p.what}`).join("")
);
assert(
  "no unexpected device-storage keys",
  unexpected.length === 0,
  unexpected
    .map((k) => `\n      ${k.path}:${k.line}: ${k.key} (via ${k.via})`)
    .join("")
);
/* Print what was found and why each key is allowed, so a green run shows its
   reasons in the log rather than asking to be trusted. */
for (const [key, places] of Map.groupBy(storage.keys, (k) => k.key)) {
  const where = places.map(
    (k) => `${k.path.split("/").pop()}:${k.line} via ${k.via}`
  );
  console.log(`      ${key}: ${ALLOWED_LOCAL.get(key)?.why ?? "NOT ALLOWED"}`);
  console.log(`        ${where.join(", ")}`);
}

/* 3b. The audit above still has teeth. Each fixture puts a ZIP or a location
       back on the device in a way someone plausibly might, and each must be
       caught, either as a key outside the allowlist or as a key the resolver
       refuses to guess. The last fixture is SitePrompts' own shape and must
       resolve cleanly, so a resolver that rejected everything would fail
       too. Nothing here touches src/. */
const fixture = (...sources: Array<[string, string]>) =>
  auditStorage(sources.map(([path, src]) => ({ path, ...scan(src) })));
const caught = (r: ReturnType<typeof auditStorage>) =>
  r.problems.length > 0 || r.keys.some((k) => !ALLOWED_LOCAL.has(k.key));

/* One file at src/a.tsx, unless the fixture names its files. */
const TEETH: Array<[string, string | Array<[string, string]>]> = [
  ["a literal ZIP key", `window.localStorage.setItem("kyv.zip", zip);`],
  [
    "the old location key behind a constant",
    `const LOCATION_KEY = "kyv.location";
localStorage.setItem(LOCATION_KEY, zip);`,
  ],
  [
    "a ZIP key through a SitePrompts-style wrapper",
    `const ZIP_KEY = "kyv.zip";
function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}
export function remember(zip: string) {
  write(ZIP_KEY, zip);
}`,
  ],
  [
    "a ZIP key imported from another module",
    [
      ["src/lib/keys.ts", `export const ZIP_KEY = "kyv.zip";`],
      [
        "src/a.tsx",
        `import { ZIP_KEY } from "@/lib/keys";
localStorage.setItem(ZIP_KEY, zip);`,
      ],
    ],
  ],
  [
    "sessionStorage instead of localStorage",
    `sessionStorage.setItem("kyv.loc", zip);`,
  ],
  ["bracket access", `localStorage["kyv.zip"] = zip;`],
  [
    "storage named in a string",
    `window["localStorage"].setItem("kyv.zip", zip);`,
  ],
  ["a computed key", "localStorage.setItem(`kyv.${field}`, zip);"],
  [
    "an allowed name reassigned with let",
    `let key = "kyv.saved";
key = "kyv.zip";
localStorage.setItem(key, zip);`,
  ],
  [
    "a wrapper handed around as a value",
    `function write(key: string, v: string) {
  localStorage.setItem(key, v);
}
const save = write;
save("kyv.zip", zip);`,
  ],
  [
    "an exported wrapper",
    `export function store(key: string, v: string) {
  localStorage.setItem(key, v);
}`,
  ],
  [
    "a key bound by an anonymous callback",
    `["kyv.zip"].forEach((key) => {
  localStorage.setItem(key, zip);
});`,
  ],
  /* The review's shapes (2026-10-04): a brace-less arrow wrapper beside an
     unrelated const of the same name as its parameter, at module level (M2)
     and inside a component with sessionStorage (M5). */
  [
    "an expression-bodied arrow wrapper beside a same-named allowed const",
    `const key = "kyv.donate-dismissed";
const put = (key: string, v: string) => window.localStorage.setItem(key, v);
export function rememberZip(z: string) {
  put("kyv.zip", z);
}`,
  ],
  [
    "an expression-bodied sessionStorage wrapper inside a component",
    `const key = "kyv.donate-dismissed";
export function Card({ zip }: { zip: string }) {
  const save = (key: string) => sessionStorage.setItem(key, zip);
  save("kyv.zip");
  return null;
}`,
  ],
  [
    "an inner arrow shadowing an outer wrapper's parameter",
    `function outer(key: string, zip: string) {
  const put = (key: string) => localStorage.setItem(key, zip);
  put("kyv.zip");
}
outer("kyv.saved", "33130");`,
  ],
  [
    "a wrapper that reassigns its key parameter",
    `function write(key: string, v: string) {
  key = "kyv.zip";
  localStorage.setItem(key, v);
}
write("kyv.saved", zip);`,
  ],
  [
    "a brace-less loop variable beside a same-named allowed const",
    `const key = "kyv.saved";
for (const key of ["kyv.zip"]) localStorage.setItem(key, zip);`,
  ],
  [
    "a destructured key beside a same-named allowed const",
    `function a() {
  const key = "kyv.saved";
  return key;
}
const { key } = { key: "kyv.zip" };
localStorage.setItem(key, zip);`,
  ],
  [
    "an imported ZIP key beside a same-named allowed const elsewhere",
    [
      ["src/lib/keys.ts", `export const KEY = "kyv.zip";`],
      [
        "src/a.tsx",
        `import { KEY } from "@/lib/keys";
function other() {
  const KEY = "kyv.saved";
  return KEY;
}
localStorage.setItem(KEY, zip);`,
      ],
    ],
  ],
];
for (const [name, sources] of TEETH) {
  const r =
    typeof sources === "string"
      ? fixture(["src/a.tsx", sources])
      : fixture(...sources);
  assert(`the audit catches ${name}`, caught(r));
}

const sitePromptsShape = fixture([
  "src/components/features/SitePrompts.tsx",
  `export const CONSENT_KEY = "kyv.ads-consent";
const DONATE_KEY = "kyv.donate-dismissed";
export const DONATE_URL = "https://example.org/give//now";
function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; /* private mode */
  }
}
function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}
export function Prompts() {
  const stored = read(CONSENT_KEY);
  const done = read(DONATE_KEY) === "1";
  const decide = (choice: "granted" | "denied") => write(CONSENT_KEY, choice);
  const dismiss = () => {
    write(DONATE_KEY, "1");
  };
  return <a href={\`https://example.org/x?id=\${DONATE_URL}\`}>{stored}{done}</a>;
}`,
]);
assert(
  "the audit resolves SitePrompts' wrapper shape to exactly its two keys",
  sitePromptsShape.problems.length === 0 &&
    [...new Set(sitePromptsShape.keys.map((k) => k.key))].sort().join() ===
      "kyv.ads-consent,kyv.donate-dismissed",
  JSON.stringify(sitePromptsShape)
);

/* The arrow rule follows a named arrow wrapper to its callers rather than
   failing it outright, as Prettier's line break after `=>` would have it. */
const arrowWrapper = fixture([
  "src/lib/kept.ts",
  `const KEY = "kyv.saved";
const put = (key: string, value: string) =>
  window.localStorage.setItem(key, value);
export function keep(ids: string[]) {
  put(KEY, JSON.stringify(ids));
}`,
]);
assert(
  "the audit resolves a named arrow wrapper through its callers",
  arrowWrapper.problems.length === 0 &&
    arrowWrapper.keys.map((k) => k.key).join() === "kyv.saved",
  JSON.stringify(arrowWrapper)
);

/* The scanner the audit rests on: comments out, literals in. */
const scanned = scan(
  `const u = "https://a.test/x"; // gone-1\n` +
    "const t = `a ${b ? '//' : `c`} d`; /* gone-2 */\n" +
    `const r = /["'\`]/; const s = "kept"; // gone-3\n` +
    `<p>a</p>\n// gone-4\n<br />\nconst k = 'kyv';`
).code;
assert(
  "the scanner keeps strings that contain // and drops real comments",
  ['"https://a.test/x"', "'//'", '"kept"', "'kyv'"].every((s) =>
    scanned.includes(s)
  ) && !/gone-/.test(scanned),
  JSON.stringify(scanned)
);

/* No other device store, so the audit above is the whole picture. */
const otherStores = files.filter((f) =>
  /\b(?:indexedDB|openDatabase|caches\s*\.\s*open)\b/.test(f.shape)
);
assert(
  "no IndexedDB, Web SQL or Cache Storage",
  otherStores.length === 0,
  otherStores.map((f) => f.path).join(", ")
);

/* Cookies: kyv.district is the only one this app writes. A second cookie name in
   a document.cookie assignment is a new store nobody reviewed. */
const cookieWrites: Array<{ path: string; key: string }> = [];
for (const f of files) {
  for (const m of f.code.matchAll(
    /document\.cookie\s*=\s*`?\$?\{?([A-Za-z_$][\w$.]*|[\w.-]+)=/g
  )) {
    const token = m[1];
    if (token !== "DISTRICT_COOKIE" && token !== "kyv.district") {
      cookieWrites.push({ path: f.path, key: token });
    }
  }
}
assert(
  "kyv.district is the only cookie the app writes",
  cookieWrites.length === 0,
  cookieWrites.map((c) => `${c.path}: ${c.key}`).join(", ")
);

/* The value shape is what keeps a ZIP or an address out of that cookie. */
const cookieSrc = stripComments(
  readFileSync(join(SRC, "lib", "district-cookie.ts"), "utf8")
);
assert(
  "the cookie value is constrained to a district and a county",
  /\/\^FL-\\d\{1,2\}\\\|\\d\{5\}\$\//.test(cookieSrc),
  "expected the FL-nn|ccccc regex to guard both parse and format"
);

/* 4. The privacy page must describe exactly this, including both third parties
      on the address path. A page whose whole value is being checkable cannot
      carry a claim that fails the check.

      These reads sit here because section 4 now asserts against all of them. */
const privacyText = stripComments(
  readFileSync(join(SRC, "app", "(public)", "privacy", "page.tsx"), "utf8")
);
const analytics = stripComments(
  readFileSync(join(SRC, "lib", "analytics.ts"), "utf8")
);
const landing = stripComments(
  readFileSync(join(SRC, "app", "(public)", "page.tsx"), "utf8")
);

assert(
  "privacy page no longer claims quiz answers are stored",
  !/quiz answers are\s+stored/i.test(privacyText.replace(/\s+/g, " "))
);
assert(
  "privacy page says the address and ZIP are not stored",
  /address and your ZIP aren&apos;t stored/i.test(privacyText)
);
assert("privacy page names the cookie", /kyv\.district/.test(privacyText));
assert("privacy page shows the stored value", /FL-27\|12086/.test(privacyText));
/* The vendor paragraph is rendered from PELIAS_BASE_URL (a deployment fact),
   so what is pinned here is that the page still NAMES a geocoder and still
   offers the no-third-party route -- not a hard-coded company. Pinning
   "Google Places" is what made this assertion wrong the moment the geocoder
   changed. */
assert("privacy page names the geocoder", /Pelias/.test(privacyText));
assert(
  "privacy page still offers a no-third-party path",
  /no third party at all/.test(privacyText)
);
assert(
  "privacy page names the Census Bureau",
  /Census Bureau/.test(privacyText)
);
assert(
  "privacy page says only coordinates go to Census",
  /coordinates/i.test(privacyText) &&
    /never receives your address/i.test(privacyText)
);
assert(
  "privacy page names the way out of both third parties",
  /pick your district/i.test(privacyText)
);
/* Every key section 3 found in the code is on the page. This replaces the two
   hand-written checks for the keep-in-mind list and the install flag, and
   covers the two SitePrompts keys the same way: a key the code stores and the
   page omits would make "that is the whole list" untrue. */
const privacyFlat = privacyText.replace(/\s+/g, " ");
for (const key of new Set(storage.keys.map((k) => k.key))) {
  const rule = ALLOWED_LOCAL.get(key);
  if (!rule) continue; /* already a failure in section 3 */
  assert(`privacy page discloses ${key}`, rule.disclosed.test(privacyFlat));
}

/* The landing page's storage claim had to move with the cookie: it used to say
   nothing was saved on the device, which stopped being true. */
assert(
  "the landing page no longer claims nothing is saved on the device",
  !/nothing is saved on your device/i.test(landing)
);
assert(
  "the landing page says what is kept instead",
  /keep only the district|remember the district/i.test(landing)
);

/* 5. ballot_viewed exists and precedes zip_resolved: the funnel's entry event is
      the ballot, not the ZIP. district_set carries a method label and never a
      value -- LocationEntry passes the shorthand { via }, so the check accepts a
      bare identifier as well as a literal, and rejects anything else. */
assert(
  "ballot_viewed is a declared analytics event",
  /"ballot_viewed"/.test(analytics)
);
assert(
  "ballot_viewed precedes zip_resolved in the funnel",
  analytics.indexOf('"ballot_viewed"') < analytics.indexOf('"zip_resolved"')
);
assert(
  "district_set is a declared analytics event",
  /"district_set"/.test(analytics)
);
const districtSetCalls = files.flatMap((f) => [
  ...f.code.matchAll(/track\(\s*"district_set"\s*,\s*\{([^}]*)\}/g),
]);
assert("district_set is tracked somewhere", districtSetCalls.length > 0);
assert(
  "district_set only ever carries via: address | zip | picker",
  districtSetCalls.every((m) =>
    /^\s*via\s*(:\s*(via|"address"|"zip"|"picker"))?\s*,?\s*$/.test(m[1])
  ),
  districtSetCalls.map((m) => m[1]).join(" | ")
);
assert(
  "landing page fires ballot_viewed only when a ballot rendered",
  /ballotRendered && <TrackView event="ballot_viewed" \/>/.test(landing)
);

/* 6. The district cookie is the one thing that outlives a visit, and its value
      shape is the guarantee that it holds a district rather than a location. */
assert("the cookie is named kyv.district", DISTRICT_COOKIE === "kyv.district");
assert(
  "a well-formed value parses",
  parseDistrictCookie("FL-27|12086")?.district === "FL-27" &&
    parseDistrictCookie("FL-27|12086")?.countyFips === "12086"
);
assert(
  "a single-digit district parses",
  parseDistrictCookie("FL-7|12011")?.district === "FL-7"
);
for (const bad of [
  "",
  "FL-27",
  "12086",
  "FL-27|1208",
  "33130|12086",
  "FL-27|12086; evil=1",
  "444 SW 2nd Ave|12086",
  "FL-abc|12086",
  "FL-27|12086|extra",
]) {
  assert(
    `a malformed value is treated as absent: ${JSON.stringify(bad)}`,
    parseDistrictCookie(bad) === null
  );
}
/* A well-shaped value for a county we do not cover parses here and is refused
   downstream: resolveDistrict returns null, so it produces no ballot. Shape is
   this module's job; coverage is the ballot's. */
assert(
  "an uncovered county still parses, and is refused where it matters",
  parseDistrictCookie("FL-1|12087")?.countyFips === "12087"
);
assert(
  "formatting round-trips",
  formatDistrictCookie({ district: "FL-27", countyFips: "12086" }) ===
    "FL-27|12086"
);
let refusedMalformed = false;
try {
  formatDistrictCookie({ district: "33130", countyFips: "12086" });
} catch {
  refusedMalformed = true;
}
assert("formatting refuses a value that is not a district", refusedMalformed);

if (failures) {
  console.error(`\n${failures} stored-location check(s) failed`);
  process.exit(1);
}
console.log("\nAll stored-location checks passed.");
