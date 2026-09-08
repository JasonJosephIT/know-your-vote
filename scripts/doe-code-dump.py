#!/usr/bin/env python3
"""B1 (docs/general-election/data-ingest.md §1): dump the DoE export's raw code
distributions so the primary->general tier mapping is written from the real
file, not guessed.

Deliberately does NOT reuse cap_toollayer.intake.parse_candidate_list: that
parser collapses StatusCode into {qualified, withdrawn, other} and PartyCode
into {REP, DEM, NPA, other} -- it throws away precisely the values B1 exists to
discover. Raw columns only.

    python3 scripts/doe-code-dump.py                 # fetch FED, CAB, LEG live
    python3 scripts/doe-code-dump.py --file x.txt    # parse a saved export
    python3 scripts/doe-code-dump.py --selftest      # no network

Needs real outbound network. Claude Code remote sessions are egress-blocked
(403 at the proxy for dos.elections.myflorida.com), so run this locally, with
an interpreter that has a CA bundle (/usr/bin/python3 on the founder's Mac;
the python.org 3.11 alpha there fails with CERTIFICATE_VERIFY_FAILED).

Live run recorded 2026-09-06: docs/general-election/data-ingest.md §1.
"""
import sys
from collections import Counter

URL = "https://dos.elections.myflorida.com/candidates/extractCanList.asp"
ELECTION = "20261103-GEN"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")  # the DoE WAF wants one
# The at-large races plus the sixteen US House districts covering the four
# target counties under Florida's enacted 2026 congressional map (D-A,
# founder, 2026-09-07). Must stay in step with _NO_DISTRICT_RACES and
# _TARGET_US_HOUSE in cap_toollayer/intake.py -- that is the source of truth;
# this is a copy. USS is here because the Senate line was always a target
# race: its absence from the older "eight races" framing was a parser bug,
# not a scope decision (docs/general-election/db-audit-2026-09-07.md).
TARGET_OFFICES = {"GOV", "ATG", "CFO", "AGR", "USS"}
TARGET_USR = {
    # Orange (7, 8, 9, 10, 11)
    "007", "008", "009", "010", "011",
    # Hillsborough (12, 14, 15, 16)
    "012", "014", "015", "016",
    # Broward (20, 22, 24, 25, 26)
    "020", "022", "024", "025", "026",
    # Miami-Dade (27, 28)
    "027", "028",
}


def fetch(office):
    import urllib.parse, urllib.request
    body = urllib.parse.urlencode({
        "elecID": ELECTION, "office": office, "status": "All",
        "cantype": "ALL", "FormSubmit": "Download Candidate List"}).encode()
    req = urllib.request.Request(URL, data=body, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "replace")


def summarize(text, label):
    lines = [l for l in text.splitlines() if l.strip()]
    if not lines:
        print(f"\n## {label}: EMPTY RESPONSE")
        return
    header = lines[0].split("\t")
    idx = {n: i for i, n in enumerate(header)}
    print(f"\n## {label} — {len(lines)-1} rows, {len(header)} columns")

    # Surface any column the parser doesn't know about: a candidate-type column
    # would be the clean write-in signal (data-ingest.md I2).
    known = {"AcctNum", "OfficeCode", "OfficeDesc", "Juris1num", "StatusCode",
             "PartyCode", "NameLast", "NameFirst"}
    print("   columns:", ", ".join(header))
    extra = [c for c in header if c not in known and not c.startswith(
        ("Addr", "Phone", "Email", "Trs", "City", "State", "Zip", "County",
         "Suppress", "Voter", "Election", "Name", "Juris"))]
    print("   unknown-to-parser columns:", ", ".join(extra) or "(none)")

    def col(row, name):
        i = idx.get(name, -1)
        return row[i].strip() if 0 <= i < len(row) else ""

    rows = [l.split("\t") for l in lines[1:]]
    target = [r for r in rows
              if col(r, "OfficeCode") in TARGET_OFFICES
              or (col(r, "OfficeCode") == "USR" and col(r, "Juris1num") in TARGET_USR)]
    n_races = len(TARGET_OFFICES) + len(TARGET_USR)
    print(f"   rows in the {n_races} target races: {len(target)}")

    for pair in (("StatusCode", "StatusDesc"), ("PartyCode", "PartyDesc")):
        if pair[0] not in idx:
            continue
        c = Counter((col(r, pair[0]), col(r, pair[1])) for r in target)
        print(f"   {pair[0]} / {pair[1]} across target races:")
        for (code, desc), n in sorted(c.items(), key=lambda kv: -kv[1]):
            print(f"      {code!r:10} {desc!r:38} x{n}")


FIXTURE = (
    "AcctNum\tOfficeCode\tOfficeDesc\tJuris1num\tStatusCode\tStatusDesc\t"
    "PartyCode\tPartyDesc\tNameLast\tNameFirst\n"
    "1\tGOV\tGovernor\t\tQUA\tQualified\tREP\tRepublican\tDoe\tJane\n"
    "2\tGOV\tGovernor\t\tQUA\tQualified\tLPF\tLibertarian\tRoe\tSam\n"
    "3\tGOV\tGovernor\t\tDEF\tDefeated in Primary\tDEM\tDemocrat\tPoe\tAlex\n"
    "4\tUSR\tU.S. Rep\t010\tQUA\tQualified\tNPA\tNo Party\tMoe\tKim\n"
    "5\tUSR\tU.S. Rep\t099\tQUA\tQualified\tREP\tRepublican\tOff\tTarget\n"
)


def selftest():
    import io, contextlib
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        summarize(FIXTURE, "SELFTEST")
    out = buf.getvalue()
    n_races = len(TARGET_OFFICES) + len(TARGET_USR)
    assert f"rows in the {n_races} target races: 4" in out, out   # row 5 (FL-99) excluded
    assert "'DEF'" in out and "'LPF'" in out, out        # both survive raw
    assert "PartyDesc" in out
    print("selftest OK — target filter and raw code counts behave")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest()
    elif "--file" in sys.argv:
        p = sys.argv[sys.argv.index("--file") + 1]
        summarize(open(p, encoding="utf-8", errors="replace").read(), p)
    else:
        # Valid `office` values per the DoE download form (2026-09-06):
        # All, FED, CAB, ATT, LEG, JUD, SPD. "STA" is not one — it is a
        # `cantype` value (State vs Local) and returns 0 rows here.
        for office in ("FED", "CAB", "LEG"):
            try:
                summarize(fetch(office), f"office={office}")
            except Exception as e:
                print(f"\n## office={office}: FETCH FAILED ({type(e).__name__}: {e})")
