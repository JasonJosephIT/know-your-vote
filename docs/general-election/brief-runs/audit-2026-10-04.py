"""Balance Audit at word_count_pct = 150 over the 35 races applied on 2026-10-04.

Reads the live profiles (audit-profiles-2026-10-04.json, the rows read back from
Supabase after the apply), runs balance_audit_core per race exactly as FL-GOV's
was run, writes <RACE>/audit-2026-10-04.json, and prints the write-back SQL in
FL-GOV's shape:
  - balance_check_passed = true on every profile;
  - flag_reason = the first flag the core raises, with flagged_at, on the
    candidates at the minimum of that flag's metric;
  - flag_reason = null and flagged_at = null on the others.

    python3 docs/general-election/brief-runs/audit-2026-10-04.py <flagged_at> > writeback.sql
"""

import json
import sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[2] / "Civic Awareness (Know Your Vote)"))
from balance_audit_core import balance_audit_core  # noqa: E402

NOW = sys.argv[1]
THRESHOLDS = {"word_count_pct": 150}
# metric each flag is raised on: (key in profile, how to read it)
FLAG_KEY = {
    "stated_position_asymmetry": lambda p: len(p["positions"]),
    "issue_coverage_asymmetry": lambda p: p["audit"].get("spine_issues_covered", 0),
}

profiles = json.loads((HERE / "audit-profiles-2026-10-04.json").read_text())
by_race = defaultdict(list)
for p in profiles:
    by_race[p["race_id"]].append(p)

rows = []
for race_id in sorted(by_race):
    ps = sorted(by_race[race_id], key=lambda p: p["candidate_id"])
    result = balance_audit_core(ps, thresholds=THRESHOLDS, now=NOW)
    if result["verdict"] != "PASS":
        raise SystemExit(f"{race_id}: {result['verdict']}")
    folder = race_id.removesuffix("-general")
    (HERE / folder / "audit-2026-10-04.json").write_text(json.dumps(result, indent=1) + "\n")
    first = result["flags"][0] if result["flags"] else None
    low = min(FLAG_KEY[first](p) for p in ps) if first else None
    for p in ps:
        flagged = first is not None and FLAG_KEY[first](p) == low
        rows.append((p["candidate_id"], race_id, first if flagged else None, NOW if flagged else None))

lit = lambda v: "NULL" if v is None else "'" + v.replace("'", "''") + "'"
print("UPDATE profile p SET audit = p.audit || jsonb_build_object(")
print("  'balance_check_passed', true, 'flag_reason', v.flag_reason, 'flagged_at', v.flagged_at)")
print("FROM (VALUES")
print(",\n".join(f"  ({lit(c)}, {lit(r)}, {lit(f)}::text, {lit(t)}::text)" for c, r, f, t in rows))
print(") AS v(candidate_id, race_id, flag_reason, flagged_at)")
print("WHERE p.candidate_id = v.candidate_id AND p.race_id = v.race_id;")
print(f"-- {len(rows)} profiles in {len(by_race)} races; flagged: {sum(1 for r in rows if r[2])}", file=sys.stderr)
