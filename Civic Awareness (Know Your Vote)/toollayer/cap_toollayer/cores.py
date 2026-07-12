"""Loaders for the canonical pure cores.

The guard/allowlist/audit cores are the single source of truth and stay in
their build-package folders (Agents/..., repo pipeline root). This module
imports them BY PATH so nothing is copied — a fix to a core is a fix here.

Every loader fails closed: a missing file raises, it never substitutes a
permissive stand-in.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

# toollayer/cap_toollayer/cores.py -> "Civic Awareness (Know Your Vote)"
PIPELINE_ROOT = Path(__file__).resolve().parents[2]

GUARD_CORE_PATHS: dict[str, str] = {
    "profiler": "Agents/The Profiler/profiler_guard_core.py",
    "record": "Agents/The Recorder/recorder_guard_core.py",
    "factchecker": "Agents/The Fact-Checker/factchecker_guard_core.py",
    "orchestrator": "Agents/Orchestrator : Synthesis Layer/orchestrator_core.py",
}

AUX_CORE_PATHS: dict[str, str] = {
    "allowlist_a": "Agents/The Profiler/allowlist_a_core.py",
    "allowlist_b": "Agents/The Fact-Checker/allowlist_b_core.py",
    "balance_audit": "balance_audit_core.py",
}


def _load(module_name: str, rel_path: str) -> ModuleType:
    path = PIPELINE_ROOT / rel_path
    if not path.is_file():
        raise FileNotFoundError(
            f"canonical core missing: {path} — refusing to start without it"
        )
    spec = importlib.util.spec_from_file_location(module_name, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"cannot build import spec for {path}")
    module = importlib.util.module_from_spec(spec)
    # Some cores import a sibling by bare name (e.g. the Fact-Checker guard
    # does `from allowlist_b_core import ...`) — that resolves when run from
    # its own folder, so give exec the same view, then restore sys.path.
    parent = str(path.parent)
    sys.path.insert(0, parent)
    try:
        spec.loader.exec_module(module)
    finally:
        try:
            sys.path.remove(parent)
        except ValueError:
            pass
    return module


def load_guard_core(agent_id: str) -> ModuleType:
    """The per-agent guard module. All four expose check_tool_access()."""
    try:
        rel = GUARD_CORE_PATHS[agent_id]
    except KeyError:
        raise KeyError(f"no guard core registered for agent_id={agent_id!r}")
    return _load(f"cap_guard_{agent_id}", rel)


def load_aux_core(name: str) -> ModuleType:
    try:
        rel = AUX_CORE_PATHS[name]
    except KeyError:
        raise KeyError(f"no aux core registered for {name!r}")
    return _load(f"cap_core_{name}", rel)
