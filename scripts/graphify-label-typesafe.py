#!/usr/bin/env python3
"""Name graphify's code clusters by product area, using TypeSafe (Jev).

graphify names each cluster after its highest-degree member ("check",
"monitor.ts", "FakeDb"), which says little about what the cluster is for. Its
own LLM labeling needs a text-generating model; TypeSafe answers typed
questions instead, so this picks rather than writes: Jev chooses one product
area from AREAS for each cluster, and code composes the label as
"<area> · <hub>". A cluster Jev can't place confidently keeps graphify's name.

Writes graphify-out/.graphify_labels.json and leaves the .sig beside it
untouched. graphify keeps a saved label for as long as the cluster's
membership signature matches, so these labels survive rebuilds until the
cluster itself changes. Then `graphify cluster-only` regenerates graph.json
and GRAPH_REPORT.md with them.

Reads TYPESAFE_API_KEY from the environment and exits 0 without it, so the
session-start hook can call it unconditionally. Never put the key in a file.

Run: python3 scripts/graphify-label-typesafe.py [--dry-run]
"""

import collections
import json
import os
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "graphify-out"
GRAPH = OUT / "graph.json"
LABELS = OUT / ".graphify_labels.json"
SIGS = OUT / ".graphify_labels.json.sig"
# Area picks keyed by membership signature, so a rerun in the same session
# only asks about clusters that changed.
CACHE = OUT / ".typesafe-area-cache.json"

ENDPOINT = "https://api.typesafe.ai/v1/systemone"
MODEL = "jev-latest"
MIN_MEMBERS = 3
MIN_CONFIDENCE = 0.5
WORKERS = 8
TOP_MEMBERS = 25

# Short label -> what belongs there. The label text is what ends up in the
# graph, so keep each one short enough to read in a list.
AREAS = {
    "Ballot lookup": "Resolving a voter's ballot: address, ZIP, county and district lookup, coverage",
    "Races & candidates": "Races, candidates, the candidate directory and candidate websites",
    "Candidate briefs": "Candidate briefs: profiles, issues, positions, claims, the brief-rows writer and policy runs",
    "Balance Audit": "The Balance Audit and other fairness and neutrality checks on briefs",
    "Research agents": "The pipeline's research agents (Profiler, Recorder, Fact-Checker, Orchestrator) and their prompts",
    "Pipeline tool layer": "The Python tool layer the agents call (database access, fetching sources, intake handlers) and its tests",
    "Ballot measures": "Constitutional amendments, measure pages and their for/against resources",
    "News sweep": "Collecting news: outlet list, feed sweeps, matching stories to candidates, the news feed",
    "News characterization": "Tagging and characterizing news stories by issue, with model evaluation",
    "Reminders & dates": "Election dates, deadline reminders, notifications, email and calendar feeds",
    "Quiz": "The where-I-stand quiz and its guardrails",
    "Admin dashboard": "The admin console, review queue, monitoring panels and admin auth",
    "Design system & UI": "The design system, brand, and shared UI components and pages",
    "Database schema": "Supabase migrations, tables, row-level security and seed data",
    "Privacy & analytics": "Analytics events, privacy rules and what the app may store about a voter",
    "Coding-agent tooling": "Tooling for coding agents: skills, scripts in .agents, graphify, session hooks",
    "Planning docs": "Plans, specs, handoffs and research prompts rather than running code",
}
NONE = "none of these"


def load_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def cluster_state(members, degree):
    """What Jev sees for one cluster: its main members and where they live."""
    folders = collections.Counter(
        (n.get("source_file") or "").rsplit("/", 1)[0] or "(repo root)" for n in members
    )
    ranked = sorted(members, key=lambda n: -degree[n["id"]])
    return {
        "member_count": len(members),
        "folders": [f"{d} ({c})" for d, c in folders.most_common(5)],
        "files": sorted({(n.get("source_file") or "").rsplit("/", 1)[-1] for n in ranked[:TOP_MEMBERS]} - {""}),
        "top_members": [n.get("label") for n in ranked[:TOP_MEMBERS]],
    }


def ask(key, state):
    """One Choice over AREAS. Returns (area, confidence) or (None, 0) on failure."""
    body = json.dumps({
        "state": state,
        "model": MODEL,
        "questions": {
            "area": {
                "type": "choice",
                "instructions": (
                    "This is one cluster of related code and documents from a nonpartisan "
                    "Florida voter-guide web app. Which product area is the cluster mainly "
                    "about? Judge by `files`, `folders` and `top_members` together."
                ),
                "criteria": {**AREAS, NONE: "The cluster fits none of the areas above, or mixes several evenly"},
            }
        },
    }).encode()
    req = urllib.request.Request(
        ENDPOINT,
        data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
    )
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                answer = json.load(res)["answers"]["area"]
                return answer["choice"], float(answer.get("confidence", 0))
        except urllib.error.HTTPError as err:
            if err.code in (429, 500, 502, 503, 529):
                time.sleep(2**attempt)
                continue
            return None, 0.0
        except (urllib.error.URLError, TimeoutError, KeyError, ValueError):
            time.sleep(2**attempt)
    return None, 0.0


def main():
    dry_run = "--dry-run" in sys.argv
    key = os.environ.get("TYPESAFE_API_KEY", "").strip()
    if not key:
        print("graphify-label-typesafe: TYPESAFE_API_KEY not set; keeping graphify's labels")
        return 0
    graph = load_json(GRAPH, None)
    if not graph:
        print("graphify-label-typesafe: no graphify-out/graph.json; run `graphify update .` first")
        return 0

    degree = collections.Counter()
    for link in graph.get("links", []):
        degree[link["source"]] += 1
        degree[link["target"]] += 1
    clusters = collections.defaultdict(list)
    for node in graph["nodes"]:
        clusters[node.get("community")].append(node)

    labels = {int(k): v for k, v in load_json(LABELS, {}).items()}
    sigs = {int(k): v for k, v in load_json(SIGS, {}).items()}
    cache = load_json(CACHE, {})

    todo = {
        cid: members
        for cid, members in clusters.items()
        if cid is not None and len(members) >= MIN_MEMBERS and sigs.get(cid) not in cache
    }
    print(f"graphify-label-typesafe: {len(clusters)} clusters, asking about {len(todo)}")
    with ThreadPoolExecutor(WORKERS) as pool:
        results = dict(zip(todo, pool.map(lambda m: ask(key, cluster_state(m, degree)), todo.values())))
    for cid, (area, confidence) in results.items():
        if area is not None and sigs.get(cid):
            cache[sigs[cid]] = [area, confidence]

    renamed = 0
    for cid, members in clusters.items():
        area, confidence = cache.get(sigs.get(cid), [None, 0])
        if cid is None or area in (None, NONE) or confidence < MIN_CONFIDENCE:
            continue
        hub = labels.get(cid) or max(members, key=lambda n: degree[n["id"]]).get("label")
        # graphify's own label is the hub name; strip an earlier run's area
        # prefix so reruns don't stack them.
        hub = hub.split(" · ", 1)[-1]
        labels[cid] = f"{area} · {hub}"
        renamed += 1

    print(f"graphify-label-typesafe: {renamed} clusters named by area, the rest keep graphify's names")
    if dry_run:
        for cid in sorted(labels)[:40]:
            print(f"  {cid}: {labels[cid]}")
        return 0
    CACHE.write_text(json.dumps(cache, indent=2), encoding="utf-8")
    LABELS.write_text(json.dumps({str(k): v for k, v in sorted(labels.items())}, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
