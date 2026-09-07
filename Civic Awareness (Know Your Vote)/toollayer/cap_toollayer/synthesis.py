"""S1-07 synthesis & delivery tools — T10 balance_audit, T12 sms_dispatch.

Both are orchestrator-only (Tool Spec §2); check_tool_access denies them for
every other identity before a handler is reached.

T10 balance_audit
  Reads every Profile for the race, audits only the BALLOT tier, runs the
  deterministic
  `balance_audit_core` (four-metric split: word_count / verifiable_fact_count
  / fact_checks gate → HALT; stated_position / spine coverage → flag), and
  writes `balance_check_passed` + `flag_reason` + `flagged_at` back onto each
  Profile.audit. A HALT verdict returns ok=True with the numbers AND sets the
  handler's `halt` flag, so the middleware records `guard_triggered=true`
  (Audit Block Rate KPI) and freezes the S1 process's write tools — sms
  dispatch included. The audit itself never decides publication; it reports.
  It also records N5 per-race `coverage`: the variance over each ballot
  candidate's `named` news items. Report-only, like `unopposed` — no path
  from it to `verdict`, `halt` or `balance_check_passed`.

T12 sms_dispatch
  Refuses unless the caller presents the single-use approval token S3 mints at
  the human gate — a missing/invalid token is a `denied_tool` fail row (the
  §7 gate class). Then: Twilio env absent → `not_configured` (never fake a
  send); recipient must equal the owner's verified phone (Twilio trial, v1).
  The state-machine gate (state=approved ∧ latest audit PASS ∧ human approval)
  lives in `orchestrator_core.check_dispatch` and is S3's to enforce.
"""

from __future__ import annotations

import hmac
import os
from typing import Any, Callable, Mapping

from . import cores, errors
from .store import Store

SYNTHESIS_AGENTS = frozenset({"orchestrator"})

# A3 / data-architecture.md section 3. The audit measures symmetry of scrutiny
# among candidates we brief, and we brief printed ballot lines only. A write-in
# or a defeated filer has no public material, so it enters with zero claims --
# and (12-0)/12 is 100% variance against a 10% threshold, which HALTs the race
# permanently. B1 measured 87 such filers against 22 real ballot lines, at
# least one in every target race, so without this filter the pipeline's default
# outcome is that nothing publishes at all.
BALLOT_TIER = "ballot"

_TWILIO_ENV = ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_OWNER_PHONE")


def _default_twilio_send(sid: str, auth: str, sender: str, to: str, body: str) -> str:
    import httpx
    r = httpx.post(
        f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
        auth=(sid, auth), timeout=20,
        data={"From": sender, "To": to, "Body": body},
    )
    r.raise_for_status()
    return r.json().get("sid", "")


def build_synthesis_handlers(
    agent_id: str,
    store: Store,
    *,
    sms_sender: Callable[..., str] | None = None,
    twilio_env: Mapping[str, str] | None = None,
    approval_token: str | None = None,
) -> dict[str, Callable[[Mapping[str, Any]], dict]]:
    audit_core = cores.load_aux_core("balance_audit").balance_audit_core
    sms_sender = sms_sender or _default_twilio_send

    def _coverage(audited: list[Mapping[str, Any]], race_id: str) -> dict:
        """N5: (max-min)/max over per-candidate `named` news items.

        Recorded, never gated. The press covering a race unevenly is not
        something the pipeline — or anyone in it — can remediate, so halting on
        it would hide a real ballot to no one's benefit. Hence the core's
        verdict and flags are discarded here; only the numbers are kept, and
        the caller's `verdict`/`halt`/`balance_check_passed` never see them.
        """
        roster = [p["candidate_id"] for p in audited]
        try:
            rows = store.read_named_news_counts(roster)
        except Exception as err:  # noqa: BLE001
            # Degrade honestly: a missing coverage number is reported as
            # missing. It must not take the scrutiny audit down with it.
            return {"error": errors.UPSTREAM_FAILED,
                    "reasons": [f"coverage read failed ({type(err).__name__})"]}
        # Zero-fill every roster candidate, the same rule as
        # namedCountsByCandidate() in src/lib/news-match.ts: a candidate the
        # press ignored is the widest gap in the report, and dropping them
        # would silently exclude it from the variance.
        counts = {cid: 0 for cid in roster}
        for row in rows:
            if row["candidate_id"] in counts:
                counts[row["candidate_id"]] = int(row["n"])
        # An adapter, not a reimplementation. The variance belongs to
        # balance_audit_core (`_variance_pct` is private and the core is locked
        # — never edited), but its public entry takes Schema-v1 Profiles, not
        # raw counts. So each count rides in as a synthetic profile's
        # word_count and we read that one metric back out. The threshold is
        # forced below zero purely so the core always fills in `candidates`
        # (low/high); the breach flag it computes is meaningless here and
        # dropped, because coverage never gates.
        entry = audit_core(
            [{"candidate_id": cid, "race_id": race_id,
              "facts": [], "positions": [],
              "audit": {"word_count": n, "fact_checks_performed": 0}}
             for cid, n in counts.items()],
            {"word_count_pct": -1.0},
        )["metrics"]["word_count"]
        coverage = {"counts": counts, "variance_pct": entry["variance_pct"],
                    "min": entry["min"], "max": entry["max"]}
        if entry["max"] > entry["min"]:
            coverage["candidates"] = entry["candidates"]
        return coverage

    def balance_audit(payload: Mapping[str, Any]) -> dict:
        race_id = payload.get("race_id")
        try:
            profiles = store.read_profiles(race_id)
        except Exception as err:  # noqa: BLE001
            return {"ok": False, "error": errors.UPSTREAM_FAILED,
                    "reasons": [f"balance_audit read failed ({type(err).__name__})"]}
        if not profiles:
            return {"ok": False, "error": errors.UPSTREAM_FAILED,
                    "reasons": [f"no profiles found for race {race_id!r}"]}

        audited = [p for p in profiles if p.get("ballot_status") == BALLOT_TIER]
        # Recorded, not discarded: an exclusion nobody can see is not auditable.
        excluded = [{"candidate_id": p["candidate_id"],
                     "ballot_status": p.get("ballot_status")}
                    for p in profiles if p.get("ballot_status") != BALLOT_TIER]
        if not audited:
            # Degrade honestly rather than pass a race with nothing in it. An
            # empty population is not a balanced one.
            return {"ok": False, "error": errors.UPSTREAM_FAILED, "reasons": [
                f"race {race_id!r} has {len(profiles)} profile(s) but no "
                f"ballot-tier candidate to audit; excluded: "
                + ", ".join(f"{e['candidate_id']}={e['ballot_status']}"
                            for e in excluded)]}

        try:
            result = audit_core(audited, payload.get("thresholds"))
        except ValueError as err:
            return {"ok": False, "error": errors.UPSTREAM_FAILED, "reasons": [str(err)]}

        result["audited_candidates"] = [p["candidate_id"] for p in audited]
        result["excluded_candidates"] = excluded
        # Variance over one candidate is 0.0 and passes trivially -- correct
        # arithmetic, vacuous claim. B1 found FL-10 has exactly one ballot
        # candidate, so this is live, not hypothetical. Recorded, never gated:
        # the audit reports, it does not decide publication.
        result["unopposed"] = len(audited) == 1
        # N5, and read the same way as `unopposed`: a fact about the race, not
        # an input to the verdict below.
        result["coverage"] = _coverage(audited, race_id)

        halted = result["verdict"] == "HALT"
        flag_reason = ("scrutiny_halt" if halted
                       else (result["flags"][0] if result.get("flags") else None))
        patch = {"balance_check_passed": not halted, "flag_reason": flag_reason,
                 "flagged_at": result.get("flagged_at")}
        try:
            # Only the audited profiles. Writing balance_check_passed onto an
            # excluded candidate would claim they passed an audit they were
            # never in -- and that field is exactly what the publication gate
            # reads.
            for p in audited:
                store.write_balance_result(p["candidate_id"], race_id, patch)
        except Exception as err:  # noqa: BLE001
            store.rollback()
            return {"ok": False, "error": errors.UPSTREAM_FAILED,
                    "reasons": [f"balance_audit write failed ({type(err).__name__})"]}
        # ok=True: the audit ran. halt=True on HALT so the middleware logs
        # guard_triggered and freezes further writes (T12 unreachable).
        return {"ok": True, "halt": halted, "result": result}

    def sms_dispatch(payload: Mapping[str, Any]) -> dict:
        token = payload.get("approval_token")
        # Fail closed: dispatch is unarmed unless S3 configured the expected
        # token AND the caller presents a matching one (constant-time).
        good_token = (
            approval_token is not None and bool(token)
            and hmac.compare_digest(str(token), str(approval_token)))
        if not good_token:
            return {"ok": False, "guard_type": errors.DENIED_TOOL, "reasons": [
                "sms_dispatch requires the single-use approval token minted at "
                "the human gate (§7) — none presented / token mismatch / "
                "dispatch not armed"]}
        env = twilio_env if twilio_env is not None else os.environ
        sid, auth, owner = (env.get(k) for k in _TWILIO_ENV)
        if not (sid and auth and owner):
            return {"ok": False, "error": errors.NOT_CONFIGURED, "reasons": [
                "Twilio is not configured — set "
                + "/".join(_TWILIO_ENV) + "; refusing to fake a send"]}
        to = payload.get("to")
        if to != owner:
            return {"ok": False, "guard_type": errors.DENIED_TOOL, "reasons": [
                "v1 dispatch sends to the owner's verified phone only (Twilio trial)"]}
        try:
            msg_sid = sms_sender(sid, auth, owner, to, payload.get("body") or "")
        except Exception as err:  # noqa: BLE001
            return {"ok": False, "error": errors.UPSTREAM_FAILED,
                    "reasons": [f"sms send failed ({type(err).__name__})"]}
        return {"ok": True, "result": {"to": to, "message_sid": msg_sid}}

    return {"balance_audit": balance_audit, "sms_dispatch": sms_dispatch}
