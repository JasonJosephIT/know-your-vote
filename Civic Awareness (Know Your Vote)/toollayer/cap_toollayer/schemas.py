"""MCP input schemas for the eleven externally-callable tools.

Why this exists: the MCP surface is the ONLY thing an agent sees. Publishing
tools without field names or enums makes the model guess — a live
`claude-sonnet-5` Fact-Checker session burned 17 of 26 tool calls on rejected
`source_register` attempts inventing `type` values ('primary_gov', 'wiki',
'tier1', …) and `lean_tag='neutral'`. These schemas describe exactly what the
guard cores and the DDL already enforce; they add no new rules and they are
not a second source of truth — `test_toollayer_skeleton.py` asserts every
enum here equals the corresponding constant in the canonical cores, so the
two cannot drift.

Note for prompt authors: the Agent Plan prompts use DISPLAY verdict labels
("Mostly Accurate"). The DB and the guards use the storage form
(`mostly_accurate`). The `verdict` schema documents the storage form so the
agent translates once, at the tool boundary.
"""

from __future__ import annotations

from typing import Any

# Mirrors of the canonical enums (CAP_Schema_v1 §5/§6 + the guard cores).
# Drift is prevented by tests, not by convention.
SOURCE_TYPES = ["factual_reporting", "opinion", "primary_doc", "candidate_self"]
LEAN_TAGS = ["left", "center-left", "center", "center-right", "right", "N/A"]
BUCKETS = ["verifiable_fact", "stated_position", "outside_opinion"]
VERDICTS = ["accurate", "mostly_accurate", "mixed",
            "mostly_inaccurate", "inaccurate", "unverifiable"]
VERIFICATION = ["verified", "single_source", "unverified"]

# Named catalogs (store.py / intake.py) — never a raw SQL or raw API surface.
DB_READ_QUERIES = ["race", "candidate", "profile", "spine_issues", "claims_by_bucket"]
FEC_ENDPOINTS = ["candidates", "candidate", "committees", "candidate_totals"]
FL_QUERY_TYPES = ["bill", "bill_text", "votes"]
DOE_OFFICES = ["All", "FED", "CAB", "ATT", "LEG", "JUD", "SPD"]


def _obj(props: dict[str, Any], required: list[str] | None = None) -> dict[str, Any]:
    return {"type": "object", "properties": props, "required": required or []}


_STR = {"type": "string"}


TOOL_SCHEMAS: dict[str, dict[str, Any]] = {
    "doe_file_intake": {
        "description": "Download + parse the FL DoE candidate file and upsert the "
                       "8 target races. Idempotent by natural key.",
        "input_schema": _obj({"office": {"type": "string", "enum": DOE_OFFICES,
                                         "description": "DoE office filter"}}),
    },
    "fec_api_query": {
        "description": "Read-only FEC query. `endpoint` must be one of the named "
                       "catalog entries; `params` are passed through.",
        "input_schema": _obj({
            "endpoint": {"type": "string", "enum": FEC_ENDPOINTS},
            "params": {"type": "object",
                       "description": "e.g. state, district, office, election_year"},
        }, ["endpoint"]),
    },
    "fl_legislature_query": {
        "description": "Read-only FL Senate bill text / metadata / vote history.",
        "input_schema": _obj({
            "year": {"type": "integer"},
            "bill_number": {"type": "integer"},
            "query_type": {"type": "string", "enum": FL_QUERY_TYPES},
        }, ["year", "bill_number"]),
    },
    "jurisdiction_resolve": {
        "description": "ZIP5 -> congressional district(s) + the statewide race set.",
        "input_schema": _obj({"zip5": {"type": "string", "pattern": "^[0-9]{5}$"}},
                             ["zip5"]),
    },
    "web_search": {
        "description": "Allowlist-enforced search. Off-list results are DROPPED from "
                       "the result set, not flagged. Profiler: Allowlist A "
                       "(candidate-controlled). Fact-Checker: Allowlist B (tiered).",
        "input_schema": _obj({
            "query": _STR,
            "candidate_id": {"type": "string",
                             "description": "required for the Profiler's Allowlist A scope"},
        }, ["query"]),
    },
    "fetch_source": {
        "description": "Fetch one allowlisted URL. Redirects are never followed and "
                       "shorteners are blocked. Returns text + tier/rule + retrieved_at.",
        "input_schema": _obj({
            "url": _STR,
            "candidate_id": {"type": "string",
                             "description": "required for the Profiler's Allowlist A scope"},
        }, ["url"]),
    },
    "source_register": {
        "description": "Create/dedupe a Source (dedupe is on normalized URL); returns "
                       "source_id. Your identity constrains `type`: profiler -> "
                       "candidate_self, record -> primary_doc, factchecker -> any "
                       "(and `lean_tag` is required).",
        "input_schema": _obj({
            "url": _STR,
            "type": {"type": "string", "enum": SOURCE_TYPES},
            "lean_tag": {"type": "string", "enum": LEAN_TAGS,
                         "description": "required for the Fact-Checker; 'N/A' otherwise"},
            "publisher": _STR,
            "retrieved_at": {"type": "string", "description": "ISO8601; defaults to now"},
        }, ["url", "type"]),
    },
    "db_read": {
        "description": "Named, parameterized reads only. `claims_by_bucket` is gated by "
                       "your bucket grants (profiler/record: own bucket; factchecker: all).",
        "input_schema": _obj({
            "query": {"type": "string", "enum": DB_READ_QUERIES},
            "race_id": _STR,
            "candidate_id": _STR,
            "buckets": {"type": "array", "items": {"type": "string", "enum": BUCKETS},
                        "description": "only for claims_by_bucket"},
        }, ["query"]),
    },
    "claim_write": {
        "description": "Write one Claim plus its claim_source rows, atomically. A "
                       "wrong-bucket write is rejected AND halts the pipeline. Every "
                       "claim must cite >=1 registered source ('no Source, no claim').",
        "input_schema": _obj({
            "claim_id": _STR,
            "candidate_id": _STR,
            "race_id": _STR,
            "issue_id": {"type": "string", "description": "spine or candidate-tier issue"},
            "derived_from": {"type": "string",
                             "description": "originating claim_id when splitting a statement"},
            "text": _STR,
            "bucket": {"type": "string", "enum": BUCKETS},
            "attributed": {"type": "boolean",
                           "description": "did the candidate assert it — never 'is it true'"},
            "verification": {"type": "string", "enum": VERIFICATION},
            "verdict": {"type": ["string", "null"], "enum": VERDICTS + [None],
                        "description": "STORAGE FORM (snake_case), e.g. 'mostly_accurate'. "
                                       "null for stated_position and outside_opinion."},
            "source_ids": {"type": "array", "items": _STR, "minItems": 1},
        }, ["claim_id", "candidate_id", "race_id", "text", "bucket",
            "attributed", "verification", "source_ids"]),
    },
    "balance_audit": {
        "description": "Orchestrator only. Runs the deterministic four-metric audit for "
                       "a race, writes balance_check_passed, returns PASS/HALT + numbers.",
        "input_schema": _obj({
            "race_id": _STR,
            "thresholds": {"type": "object",
                           "description": "optional overrides, e.g. fact_check_pct"},
        }, ["race_id"]),
    },
    "sms_dispatch": {
        "description": "Orchestrator only, post human-gate. Refused without the "
                       "single-use approval token; owner's verified phone only.",
        "input_schema": _obj({
            "approval_token": _STR,
            "to": {"type": "string", "description": "must equal the owner's phone"},
            "body": _STR,
            "race_id": _STR,
        }, ["approval_token", "to", "body"]),
    },
}


def schema_for(tool: str) -> dict[str, Any]:
    try:
        return TOOL_SCHEMAS[tool]
    except KeyError:
        raise KeyError(f"no MCP schema for tool {tool!r}")


def for_agent(agent_id: str, guard: Any = None) -> dict[str, dict[str, Any]]:
    """The tool surface ONE identity should see (ADR-R1: one S1 process = one
    identity, so the published surface can be exact).

      * only the tools this identity is granted — advertising a tool the guard
        will deny just invites a wasted call;
      * write enums narrowed to what this identity's guard actually accepts.

    Every narrowing is READ FROM THE GUARD CORE's own constants, so this can
    never become a second source of truth. The guard is still the enforcement;
    the schema only stops the agent guessing.
    """
    import copy

    if guard is None:
        from . import cores
        guard = cores.load_guard_core(agent_id)

    granted = [t for t in TOOL_SCHEMAS if guard.check_tool_access(t)["ok"]]
    surface = {t: copy.deepcopy(TOOL_SCHEMAS[t]) for t in granted}

    # profiler/record expose ALLOWED_SOURCE_TYPE + OWN_BUCKET; the fact-checker
    # exposes the plural sets instead.
    single_type = getattr(guard, "ALLOWED_SOURCE_TYPE", None)
    own_bucket = getattr(guard, "OWN_BUCKET", None)

    if "source_register" in surface:
        props = surface["source_register"]["input_schema"]["properties"]
        if single_type is not None:                      # profiler / record
            props["type"]["enum"] = [single_type]
            props.pop("lean_tag", None)                  # always 'N/A'; wrapper fills it
        else:                                            # fact-checker
            props["type"]["enum"] = [t for t in SOURCE_TYPES
                                     if t in guard.VALID_SOURCE_TYPES]
            props["lean_tag"]["enum"] = [t for t in LEAN_TAGS
                                         if t in guard.VALID_LEAN_TAGS]
            surface["source_register"]["input_schema"]["required"] = [
                "url", "type", "lean_tag"]              # §2.5 B: every source lean-tagged

    if "claim_write" in surface:
        props = surface["claim_write"]["input_schema"]["properties"]
        if own_bucket is not None:                        # profiler / record
            props["bucket"]["enum"] = [own_bucket]
            props["verdict"] = {
                "type": "null", "enum": [None],
                "description": "must be null — this agent never adjudicates truth"}
        else:                                             # fact-checker
            props["bucket"]["enum"] = [b for b in BUCKETS
                                       if b in guard.WRITABLE_BUCKETS]
            props["verdict"]["enum"] = [v for v in VERDICTS
                                        if v in guard.VERDICTS] + [None]

    if "db_read" in surface:
        props = surface["db_read"]["input_schema"]["properties"]
        if own_bucket is not None:                        # own-bucket read only
            props["buckets"]["items"]["enum"] = [own_bucket]

    return surface
