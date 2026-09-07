"""S2/S3 read-plane — the orchestration-side reads, run as cap_readonly.

The agents reach the DB only through their narrow S1 tool surface (ADR-R1);
the *orchestrator* needs a few reads of its own to drive a session and to
cross-check it, and it does them as `cap_readonly` (SELECT-only, S1-01) — a
different role from the agents' `cap_tool_wrapper`, so nothing here can write.

What the per-candidate runner (`run_agent`) and, later, S3's `run_race` need:
  * `spine_issues(race_id)`        — the race's spine set (S2-R1 kickoff input)
  * `candidate_name(candidate_id)` — the legal name for the prompt {{name}}
  * `claim_inventory(...)`         — the Profiler+Record claims the Fact-Checker
                                     adjudicates (S2-R1, factchecker only)
  * `claim_write_count(...)`       — successful claim_writes in action_log, the
                                     SessionRunner's log_counter (S2-R3: the log
                                     is the truth, not the model's self-report)

The SQL mirrors the S1 T8 named-read catalog (`store._NAMED_READS`) and the
action_log contract (`logsink`/`middleware`) so the orchestrator reads exactly
what the tool layer wrote — same shapes, read as the read-only role. The
driver/connection is injectable (like `logsink`/`store`), so every query here
is unit-tested without a live Postgres; the real psycopg path is founder-gated
(needs `cap_readonly` creds in `CAP_READONLY_DB_URL`).
"""

from __future__ import annotations

from typing import Any, Callable, Mapping, Sequence

from . import session as _session

# The two buckets the Fact-Checker adjudicates: the Profiler's self-portrait and
# the Record's documented facts (Agent Plan §4). Named here, not guessed at the
# call site, so the inventory the Fact-Checker sees is exactly those two.
FACTCHECK_INPUT_BUCKETS: tuple[str, ...] = ("stated_position", "verifiable_fact")

ENV_VAR = "CAP_READONLY_DB_URL"


def _default_connect(dsn: str):
    """Real psycopg connection with dict rows, imported lazily so the module
    loads without the driver (mirrors `store._default_store_connect`)."""
    try:
        import psycopg  # psycopg 3
        from psycopg.rows import dict_row
    except ImportError as err:
        raise _session.NotConfigured(
            "the read plane needs the 'psycopg' package "
            "(pip install 'psycopg[binary]') — it is not installed."
        ) from err
    return psycopg.connect(dsn, row_factory=dict_row)


class ReadPlane:
    """Read-only orchestration queries, run as cap_readonly.

    The connection is opened eagerly (fail fast if the read DB is unreachable);
    `connect` is injectable purely for tests. Only the exception *type* ever
    escapes construction — never the DSN (S1-R4). Live use is founder-gated:
    `cap_readonly` must have LOGIN and `CAP_READONLY_DB_URL` must be set."""

    def __init__(self, dsn: str, connect: Callable[[str], Any] = _default_connect):
        try:
            self._conn = connect(dsn)
        except _session.NotConfigured:
            raise  # already clear and secret-free (e.g. missing driver)
        except Exception as err:
            raise _session.NotConfigured(
                f"cannot connect to the read-plane DB ({type(err).__name__}); "
                f"check {ENV_VAR} and that cap_readonly has LOGIN"
            ) from err

    @classmethod
    def from_env(cls, env: Mapping[str, str], **kw) -> "ReadPlane":
        dsn = env.get(ENV_VAR)
        if not dsn:
            raise _session.NotConfigured(
                f"{ENV_VAR} is not set — the orchestrator reads spine issues, the "
                "candidate name, the claim inventory, and the action_log claim "
                "count as cap_readonly (S1-01). Set it to the cap_readonly DSN."
            )
        return cls(dsn, **kw)

    # -- low-level ---------------------------------------------------------

    def _fetchall(self, sql: str, params: Sequence[Any]) -> list[dict]:
        with self._conn.cursor() as cur:
            cur.execute(sql, params)
            return [dict(r) for r in cur.fetchall()]

    def _fetchone(self, sql: str, params: Sequence[Any]) -> dict | None:
        rows = self._fetchall(sql, params)
        return rows[0] if rows else None

    # -- reads (mirror store._NAMED_READS / the action_log contract) -------

    def spine_issues(self, race_id: str) -> list[dict]:
        """The race's spine issue set, ordered — S2-R1 kickoff input. Same
        shape T8's `spine_issues` named read returns (`store._NAMED_READS`)."""
        return self._fetchall(
            "SELECT issue_id, race_id, tier, candidate_id, title, description, "
            "source_id, display_order FROM issue "
            "WHERE race_id = %s AND tier = 'spine' ORDER BY display_order",
            (race_id,),
        )

    def candidate_name(self, candidate_id: str) -> str | None:
        """The candidate's legal name for the prompt {{name}} substitution;
        None if the candidate isn't in the DB (the caller should stop)."""
        row = self._fetchone(
            "SELECT legal_name FROM candidate WHERE candidate_id = %s",
            (candidate_id,),
        )
        return row["legal_name"] if row else None

    def claim_inventory(
        self,
        race_id: str,
        candidate_id: str,
        buckets: Sequence[str] = FACTCHECK_INPUT_BUCKETS,
    ) -> list[dict]:
        """The Profiler+Record claims for one candidate — what the Fact-Checker
        adjudicates (S2-R1). Same shape T8's `claims_by_bucket` returns."""
        return self._fetchall(
            "SELECT claim_id, candidate_id, race_id, issue_id, text, bucket, "
            "attributed, derived_from, verdict, verification FROM claim "
            "WHERE race_id = %s AND candidate_id = %s AND bucket = ANY(%s) "
            "ORDER BY claim_id",
            (race_id, candidate_id, list(buckets)),
        )

    def claim_write_count(self, agent_id: str, candidate_id: str) -> int:
        """Successful claim_writes this agent logged for this candidate — the
        SessionRunner's log_counter (S2-R3: action_log is the truth). 'success'
        is the middleware's success status value (`middleware.ToolLayer._log`)."""
        row = self._fetchone(
            "SELECT count(*) AS n FROM action_log "
            "WHERE agent_id = %s AND candidate_id = %s "
            "AND tool_called = 'claim_write' AND status = 'success'",
            (agent_id, candidate_id),
        )
        return int(row["n"]) if row else 0

    def close(self) -> None:
        try:
            self._conn.close()
        except Exception:
            pass
