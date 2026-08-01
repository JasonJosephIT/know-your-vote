#!/usr/bin/env bash
#
# Know Your Vote — git reconciliation
# ===================================
# Gets ~1555 lines of uncommitted admin-console work off an old checkout and
# onto origin/main as a reviewable PR, without losing anything.
#
# Run from the repo root:
#     cd "/Users/jsloth/Projects/Civic Awareness Project(Know Your Vote)"
#     bash reconcile-git.sh
#
# It stops at the first surprise. Nothing is destructive before the backup.

set -euo pipefail

BRANCH="admin/console-a2-a5"
BASE_SHA="8eddbb733c09be41fdeb7a14c3ade44a5d3dbdc8"   # admin/phase-a5, ancestor of origin/main
BACKUP="$HOME/kyv-backup-$(date +%Y%m%d-%H%M%S).tar.gz"

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!!  %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31mXX  %s\033[0m\n' "$*" >&2; exit 1; }

[ -d .git ] || die "Not a git repo. cd to the repo root first."

# ---------------------------------------------------------------------------
# 0. Backup — before anything else touches git
# ---------------------------------------------------------------------------
say "Backing up the working tree to $BACKUP"
tar --exclude='./node_modules' \
    --exclude='./.next' \
    --exclude='./.git/modules' \
    -czf "$BACKUP" . 2>/dev/null || warn "tar reported warnings (usually harmless)"
[ -s "$BACKUP" ] || die "Backup is empty — stopping."
printf '    %s (%s)\n' "$BACKUP" "$(du -h "$BACKUP" | cut -f1)"

# A second, git-native safety net: bundle every ref currently in the repo.
git bundle create "$HOME/kyv-allrefs-$(date +%Y%m%d-%H%M%S).bundle" --all >/dev/null 2>&1 \
  && say "Also bundled all refs to \$HOME (restore with: git clone <bundle>)" \
  || warn "git bundle failed (backup tarball still covers you)"

# ---------------------------------------------------------------------------
# 1. Clear the stale index.lock left by the cloud mount
# ---------------------------------------------------------------------------
if [ -f .git/index.lock ]; then
  if [ -s .git/index.lock ]; then
    die ".git/index.lock is NOT empty — a real git process may be running. Check, then remove by hand."
  fi
  say "Removing stale empty .git/index.lock"
  rm -f .git/index.lock
fi

# ---------------------------------------------------------------------------
# 2. Verify the repo is in the state this script was written for
# ---------------------------------------------------------------------------
say "Verifying preconditions"

CURRENT_SHA="$(git rev-parse HEAD)"
[ "$CURRENT_SHA" = "$BASE_SHA" ] || \
  die "HEAD is $CURRENT_SHA, expected $BASE_SHA. The repo moved since analysis — stop and re-check."

say "Fetching origin (remote may have moved since the last fetch on ~Jul 16)"
git fetch origin --prune

git merge-base --is-ancestor HEAD origin/main || \
  die "HEAD is no longer an ancestor of origin/main. Re-run the analysis before continuing."

echo "    HEAD is contained in origin/main — clean rebase target."
echo "    origin/main is now: $(git rev-parse --short origin/main) $(git log -1 --format=%s origin/main)"

# ---------------------------------------------------------------------------
# 3. Branch (working tree carries over untouched)
# ---------------------------------------------------------------------------
say "Creating branch $BRANCH"
git switch -c "$BRANCH"

# ---------------------------------------------------------------------------
# 4. Ignore generated artifacts BEFORE staging, so they never enter the index
# ---------------------------------------------------------------------------
say "Appending generated-artifact rules to .gitignore"
cat >> .gitignore <<'IGNORE'

# --- reconciliation 2026-07-26 ---
# Agent scaffolding and crawl caches
.claude/
.claude-crawl/

# Generated ops output. NOTE: RunReports are your symmetric-scrutiny audit
# trail (PRD §10 mitigation). If you want them tracked as evidence rather
# than treated as build output, delete the RunReports line below.
Civic Awareness (Know Your Vote)/Agents/RunReports/
Civic Awareness (Know Your Vote)/CAP_Ops_Digest_*.html

# This script
/reconcile-git.sh
IGNORE

# ---------------------------------------------------------------------------
# 5. Six grouped commits
# ---------------------------------------------------------------------------
# add_group <<'EOF' ... EOF  — one path per line, blank/# lines skipped.
add_group() {
  local missing=0
  while IFS= read -r p; do
    [ -z "$p" ] && continue
    case "$p" in \#*) continue ;; esac
    if [ -e "$p" ]; then
      # GIT_LITERAL_PATHSPECS stops git glob-expanding paths like
      # src/app/(public)/candidates/[candidateId]/ — those brackets are a
      # real directory name, not a character class.
      GIT_LITERAL_PATHSPECS=1 git add -- "$p"
    else
      warn "expected path not found, skipping: $p"
      missing=1
    fi
  done
  return 0
}

say "Commit 1/6 — admin console phases A2–A5"
add_group <<'EOF'
src/app/admin/(console)/agents/page.tsx
src/app/admin/(console)/log/page.tsx
src/app/admin/(console)/queue/page.tsx
src/app/admin/(console)/site/page.tsx
src/app/admin/(console)/submit/page.tsx
src/app/admin/(console)/layout.tsx
src/app/admin/(console)/page.tsx
src/components/admin/AdminNav.tsx
src/components/admin/AgentsConsole.tsx
src/components/admin/DecisionControls.tsx
src/components/admin/QueueFilters.tsx
src/components/admin/ReviewItemCard.tsx
src/components/admin/SubmitForm.tsx
src/components/admin/panels
src/app/api/admin
src/app/api/health
src/lib/admin
src/types/admin.ts
scripts/verify-admin-effects.ts
scripts/verify-admin-types.ts
docs/admin-dashboard/roadmap.md
EOF
git commit -q -m "feat(admin): console phases A2-A5 — monitor, queue, submit, agents, site

Completes the operator console against the phase handoff specs in
docs/admin-dashboard/handoff/: monitor panels, review queue with decision
controls, submit form, agent run control, and site/metrics.

Includes the ops API routes (/api/admin/*), /api/health, the lib/admin
read layer, admin types, and the verify-admin-{effects,types} scripts."
echo "    $(git log -1 --format='%h %s' | head -1)"

say "Commit 2/6 — public app: news feed, briefs, candidate pages"
add_group <<'EOF'
src/app/(public)/candidates/[candidateId]/page.tsx
src/app/(public)/news/page.tsx
src/app/api/news/route.ts
src/components/features/NewsFeed.tsx
src/components/features/SavedCandidates.tsx
src/components/features/CandidateContact.tsx
src/components/features/CandidateNews.tsx
src/components/ui/SaveToggle.tsx
src/lib/briefs.ts
src/lib/location.ts
src/lib/saved.ts
src/lib/format.ts
src/lib/neutrality.ts
src/types/app.ts
scripts/verify-news-neutrality.ts
EOF
git commit -q -m "feat(web): candidate news + contact blocks, briefs and saved-candidate rework

NewsFeed rewrite, per-candidate news and contact components (contact stays
behind SHOW_CANDIDATE_CONTACT until real R2 data is approved), plus the
neutrality lint helper the verify script now shares."
echo "    $(git log -1 --format='%h %s' | head -1)"

say "Commit 3/6 — demo seed regeneration"
add_group <<'EOF'
scripts/build-demo-seed.mjs
scripts/demo-seed.sql
scripts/demo-seed-1.sql
scripts/demo-seed-2.sql
scripts/demo-seed-3.sql
scripts/demo-candidates-delta.sql
EOF
git commit -q -m "chore(seed): regenerate demo seed + candidate delta

Fixture data only (demo-cand-* ids, example.org sites). Real 2026 FL
candidate intake is tracked separately."
echo "    $(git log -1 --format='%h %s' | head -1)"

say "Commit 4/6 — brand assets, design system, PWA shell"
add_group <<'EOF'
docs/design.html
docs/design.md
docs/asset-generation-guide.md
docs/brand-assets-roadmap.md
docs/voice-and-tone.md
docs/assets
public/brand
src/app/favicon.ico
src/app/layout.tsx
src/app/manifest.ts
EOF
git commit -q -m "feat(brand): design system, brand assets, voice/tone, PWA manifest

Logo set, generated brand assets, the design.md/design.html token pair,
voice-and-tone guide, and the web app manifest + favicon."
echo "    $(git log -1 --format='%h %s' | head -1)"

say "Commit 5/6 — CAP research inputs (real 2026 FL candidate data)"
add_group <<'EOF'
CAP_Target_Race_Candidates_2026_v1.csv
CAP_Target_Race_Candidates_Enriched_2026_v1.csv
CAP_Incumbent_Official_Accounts_Verified_2026_v1.md
CAP_Issue_List_FL_2026_v1.md
CAP_Data_Sources_and_Tooling_v1.md
CAP_Change_Spec_Stances_and_RelatedNews_v1.md
CAP_DeepResearch_Prompt_IssueDiscovery_v1.md
CAP_DeepResearch_Prompt_WhereTheyStand_v1.md
Civic Awareness (Know Your Vote)/CAP_Refresh_Agents_Plan_v1.html
EOF
git commit -q -m "docs(cap): verified 2026 FL candidate roster + issue list + research prompts

Hand-verified candidate data with per-row confidence tiers and
disambiguation notes. This is the input for real-candidate intake — it
replaces the demo-cand-* fixtures currently in the database.

Also: issue list, data-source/tooling inventory, deep-research prompts,
and the refresh-agents plan."
echo "    $(git log -1 --format='%h %s' | head -1)"

say "Commit 6/6 — remaining tracked edits + .gitignore"
git add -A -- .gitignore docs/prd.md
git add -u
if git diff --cached --quiet; then
  echo "    nothing left to commit"
else
  git commit -q -m "chore: ignore generated ops output; sync prd status

Ignores .claude/, .claude-crawl/, RunReports/, and CAP_Ops_Digest_*.html."
  echo "    $(git log -1 --format='%h %s' | head -1)"
fi

# ---------------------------------------------------------------------------
# 6. Confirm nothing was left behind
# ---------------------------------------------------------------------------
say "Anything still uncommitted?"
LEFT="$(git status --porcelain)"
if [ -n "$LEFT" ]; then
  echo "$LEFT"
  warn "The above is NOT in any commit. Ctrl-C now if something there matters."
  read -r -p "    Press Enter to continue to the rebase, or Ctrl-C to stop: " _
else
  echo "    Clean. Everything is committed."
fi

# ---------------------------------------------------------------------------
# 7. Rebase onto origin/main
# ---------------------------------------------------------------------------
say "Rebasing $BRANCH onto origin/main"
echo "    Expect conflicts in AT MOST 2 files:"
echo "      docs/admin-dashboard/roadmap.md   (main added 7 lines)"
echo "      src/app/layout.tsx                (main added 19 lines)"
echo "    In both, KEEP BOTH SIDES — main's edits and yours are additive."
echo

if git rebase origin/main; then
  say "Rebase clean."
else
  warn "Rebase stopped on a conflict. Resolve, then:"
  echo "      git add <file> && git rebase --continue"
  echo "    To bail out entirely:  git rebase --abort"
  echo "    Re-run this script's remaining steps by hand after resolving:"
  echo "      git push -u origin $BRANCH"
  exit 1
fi

# ---------------------------------------------------------------------------
# 8. Push + PR
# ---------------------------------------------------------------------------
say "Pushing $BRANCH"
git push -u origin "$BRANCH"

if command -v gh >/dev/null 2>&1; then
  say "Opening PR"
  gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "Admin console A2–A5, brand system, and verified 2026 candidate roster" \
    --body "$(cat <<'BODY'
Reconciles ~1555 lines of work that had been sitting uncommitted on the
`admin/phase-a5` checkout while `main` moved ahead with the S1/S2 runtime.

No commits were lost — `admin/phase-a5` was already an ancestor of `main`;
only the working tree was behind. Split into reviewable commits:

1. Admin console phases A2–A5 (monitor, queue, submit, agents, site)
2. Public app: news feed, briefs, candidate news/contact
3. Demo seed regeneration
4. Brand assets, design system, PWA manifest
5. **CAP research inputs — the verified 2026 FL candidate roster**
6. .gitignore for generated ops output

Commit 5 is the one that matters most: it puts the hand-verified real
candidate data into the repo, where the intake work can reach it. The
database is still entirely `demo-cand-*` fixtures.
BODY
)"
else
  warn "gh not installed — open the PR in the browser:"
  echo "      https://github.com/JasonJosephIT/know-your-vote/compare/main...$BRANCH"
fi

# ---------------------------------------------------------------------------
# 9. Post-merge cleanup (manual — read before running)
# ---------------------------------------------------------------------------
cat <<'NEXT'

============================================================
Done. Two follow-ups, AFTER the PR merges:

1. Sync local main:
       git switch main && git pull --ff-only

2. Worktrees. `git worktree list` may show five as "prunable" — from the
   cloud sandbox that was a path-resolution artifact, but verify on this
   machine before trusting it. For each of the five under .claude/worktrees/:

       git -C .claude/worktrees/<name> status --porcelain

   Empty output = safe to remove. Only then:

       git worktree prune

   Do NOT prune while any of them still shows modified files — that is
   exactly how the situation this script just fixed came about.

3. Delete the merged local branches once main contains them:
       git branch --merged main | grep -v '^\*\|main' | xargs -n1 git branch -d
============================================================
NEXT
