/* Verifies the notification template registry (plan A7):

     1. Every template renders with sample params.
     2. Rendered output fits the §6-D budget for its channel (BUDGETS).
     3. Every body ends with the details_url (the "check the official
        source" rule — §0.4).
     4. Neutrality: bodies contain only template copy — no candidate names
        can exist here by construction, but assert no template smuggles in
        prohibited framing words used by verify-news-neutrality's core list.
     5. renderTemplate throws on an unknown id and on bad params.
     6. Every REMINDER_OFFSETS entry references a registered template of
        the same channel.

   Run: node scripts/verify-notification-templates.ts */

import { REMINDER_OFFSETS } from "../src/lib/notifications/schedule.ts";
import {
  BUDGETS,
  renderTemplate,
  TEMPLATES,
} from "../src/lib/notifications/templates.ts";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.error(`FAIL  ${name}${detail ? `\n      ${detail}` : ""}`);
  }
}

const DETAILS_URL = "https://dos.fl.gov/elections/for-voters/election-dates/";
const SAMPLE: Record<string, unknown> = {
  election: "general_2026",
  date: "2026-10-05",
  details_url: DETAILS_URL,
};
const SAMPLE_CORRECTION = {
  ...SAMPLE,
  event_label: "voter registration deadline",
};

/* Words that would signal editorializing in what must be pure logistics
   copy. Deliberately small — the full list lives in verify-news-neutrality
   for agent-written content; templates are static and founder-reviewed. */
const PROHIBITED = /\b(candidates?|wins?|loses?|leads?|momentum|controvers\w*)\b/i;

for (const [id, t] of Object.entries(TEMPLATES)) {
  const params = id === "correction" ? SAMPLE_CORRECTION : SAMPLE;
  let rendered;
  try {
    rendered = renderTemplate(id, params);
  } catch (err) {
    check(`${id}: renders`, false, (err as Error).message);
    continue;
  }
  check(`${id}: renders`, true);
  const budget = BUDGETS[t.channel];
  if (rendered.subject !== undefined) {
    check(
      `${id}: subject within ${budget.subject}`,
      rendered.subject.length <= budget.subject,
      `${rendered.subject.length} chars`
    );
  }
  check(
    `${id}: title within ${budget.title}`,
    rendered.title.length <= budget.title,
    `${rendered.title.length} chars: ${rendered.title}`
  );
  check(
    `${id}: body within ${budget.body}`,
    rendered.body.length <= budget.body,
    `${rendered.body.length} chars`
  );
  check(
    `${id}: body ends with details_url`,
    rendered.body.endsWith(DETAILS_URL),
    rendered.body.slice(-80)
  );
  check(`${id}: neutral copy`, !PROHIBITED.test(rendered.body), rendered.body);
}

check(
  "unknown template_id throws",
  (() => {
    try {
      renderTemplate("nonexistent_template", SAMPLE);
      return false;
    } catch {
      return true;
    }
  })()
);
check(
  "bad params throw",
  (() => {
    try {
      renderTemplate("reg_deadline_t7", { election: "general_2026" });
      return false;
    } catch {
      return true;
    }
  })()
);
check(
  "http details_url rejected",
  (() => {
    try {
      renderTemplate("reg_deadline_t7", {
        ...SAMPLE,
        details_url: "http://dos.fl.gov/",
      });
      return false;
    } catch {
      return true;
    }
  })()
);

for (const rule of REMINDER_OFFSETS) {
  const t = TEMPLATES[rule.template_id];
  check(
    `offset ${rule.event_type}/T-${rule.offset_days} -> registered ${rule.channel} template`,
    !!t && t.channel === rule.channel
  );
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nTemplate registry checks passed.");
