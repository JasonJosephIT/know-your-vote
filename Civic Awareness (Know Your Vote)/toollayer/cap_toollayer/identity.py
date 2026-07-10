"""Agent identity — bound at process spawn, never per call (ADR-R1).

The §5 authorization matrix keys every guard on agent_id. If identity were
a tool parameter the model could pass someone else's and the guards would
be decorative. So: the launcher sets CAP_AGENT_ID in this process's
environment before start; every wrapper reads it from here; no tool accepts
an identity argument. Wanting a different identity requires a different
server process.

Fail-closed: no identity, or an unknown one, refuses to start.
"""

from __future__ import annotations

import os
from typing import Mapping

VALID_IDENTITIES: frozenset[str] = frozenset(
    {"profiler", "record", "factchecker", "orchestrator"}
)

ENV_VAR = "CAP_AGENT_ID"


class IdentityError(RuntimeError):
    """Raised when the process has no usable identity. Server must not start."""


def resolve_identity(env: Mapping[str, str] | None = None) -> str:
    env = os.environ if env is None else env
    raw = env.get(ENV_VAR)
    if raw is None or raw.strip() == "":
        raise IdentityError(
            f"{ENV_VAR} is not set — refusing to start. Identity binds at "
            "spawn (CAP_Runtime_PRD_v1 ADR-R1); the launcher must set it."
        )
    agent_id = raw.strip()
    if agent_id not in VALID_IDENTITIES:
        raise IdentityError(
            f"{ENV_VAR}={agent_id!r} is not a valid identity "
            f"(expected one of {sorted(VALID_IDENTITIES)})."
        )
    return agent_id
