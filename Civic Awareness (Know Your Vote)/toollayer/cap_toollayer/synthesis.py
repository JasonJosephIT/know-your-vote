"""S1-07 synthesis & delivery tools — T10 balance_audit, T12 sms_dispatch.

Both are orchestrator-only (Tool Spec §2); check_tool_access denies them for
every other identity before a handler is reached.

T10 balance_audit
  Reads every Profile for the race, runs the deterministic
  `balance_audit_core` (four-metric split: word_count / verifiable_fact_count
  / fact_checks gate → HALT; stated_position / spine coverage → flag), and
  writes `balance_check_passed` + `flag_reason` + `flagged_at` back onto each
  Profile.audit. A HALT verdict returns ok=True with the numbers AND sets the
  handler's `halt` flag, so the middleware records `guard_triggered=true`
  (Audit Block Rate KPI) and freezes the S1 process's write tools — sms
  dispatch included. The audit itself never decides publication; it reports.

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
        try:
            result = audit_core(profiles, payload.get("thresholds"))
        except ValueError as err:
            return {"ok": False, "error": errors.UPSTREAM_FAILED, "reasons": [str(err)]}

        halted = result["verdict"] == "HALT"
        flag_reason = ("scrutiny_halt" if halted
                       else (result["flags"][0] if result.get("flags") else None))
        patch = {"balance_check_passed": not halted, "flag_reason": flag_reason,
                 "flagged_at": result.get("flagged_at")}
        try:
            for p in profiles:
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
