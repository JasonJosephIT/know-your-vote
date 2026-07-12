# Brief 00 — Founder prerequisites (do first; blocks everything live)

**Owner:** founder (the venv step an agent can do). **Blocks:** every live run.

**Goal:** the machine and the secrets are ready for a real pipeline run.

## Steps

### 1. A stable arm64 Python 3.12 venv
This box's default `python3` is `3.11.0a3` (an alpha — breaks `psycopg`:
`typing.LiteralString` is missing) and `/usr/bin/python3` is `3.9.6` (too old
for `mcp`, needs ≥3.10). Homebrew is the **Intel** install at `/usr/local`, so
its `python@3.12` is x86_64 and `cryptography` (an `mcp` → `pyjwt[crypto]`
dependency) ships **arm64-only** macOS wheels → a failing Rust source build.
Use a managed arm64 interpreter:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh   # if uv isn't installed
uv python install 3.12
uv venv --python-preference only-managed --python 3.12 .venv
source .venv/bin/activate
python -c "import platform; print(platform.machine())"   # MUST print arm64
uv pip install 'psycopg[binary]' mcp anthropic httpx tldextract
python -c "import psycopg, mcp, anthropic; print('ok')"
```
`--python-preference only-managed` is load-bearing — it stops uv reusing the
Intel brew Python. Also add `.venv/` to `.gitignore`.

The test suites run fine on the alpha (stdlib only); only the **live server**
(`mcp` + `psycopg` together) needs this venv. Because `s1_spawn_spec` launches S1
with `sys.executable`, once the runner runs inside `.venv` every S1 subprocess it
spawns uses the same interpreter automatically.

### 2. Fill the DB password
`.env.local` (worktree root, git-ignored) has `SUPABASE_DB_URL` with a
`REPLACE_WITH_THE_PASSWORD_YOU_SET` placeholder. Put the real `cap_tool_wrapper`
password there (keyword form, so no URL-encoding needed).

### 3. Load the demo seed
Load `scripts/demo-seed*.sql` into the live DB so there's a race + candidate to
run against. (`verify-demo-seed.mjs` checks it.)

### 4. Rotate the three exposed secrets
All were pasted into a chat transcript:
- **FEC key** — regenerate at api.data.gov, update `.env.local`.
- **Anthropic key** — rotate in the Anthropic console, update `.env.local`.
- **`cap_tool_wrapper` DB password** — `ALTER ROLE cap_tool_wrapper LOGIN PASSWORD '…'`, update `.env.local`.

### 5. (Optional, unrelated to the pipeline) Vercel Supabase env
Set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the Vercel
project so the app's data-driven pages populate. The build no longer *crashes*
without them (fixed in PR #6), but the tables stay empty until they're set.

## Done when
- `import psycopg, mcp, anthropic` all succeed on an **arm64** 3.12 venv;
- `cd toollayer && CAP_LOG_SINK=postgres SUPABASE_DB_URL=… python -m cap_toollayer.server --selfcheck` passes against the real DB;
- demo-seed rows exist in the DB (a race + ≥1 candidate).
