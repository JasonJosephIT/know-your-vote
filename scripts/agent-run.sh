#!/bin/sh
# The one shell command a scheduled agent runs
# (docs/superpowers/specs/2026-10-08-agent-retrofit-design.md §3.1).
#
#   sh /Users/jsloth/Projects/kyv-agent-worktree/scripts/agent-run.sh <AGENT> <STEP> [--status ok|ok_empty|failed] [--items N]
#
# The command text never carries a date, a path or a redirection, so the
# same text runs every day and one "always allow" covers every run. Inputs
# and outputs live in the run directory `start` prints.
#
# Steps for R2 to R5 (the routine agents):
#   start    refuse (exit 6) while this agent's previous run has not called
#            finish and is inside twice its budget; refresh the agent worktree
#            (skipped while another agent's run is inside that hold), create
#            $RUNS/<YYYY-MM-DD>/<AGENT>[-n], set the deadline and the hold,
#            point $RUNS/current-<AGENT> at it, record the run, and print
#            date:, report:, worktree:, budget: and run dir:
#   budget   print the minutes left
#   finish   record the outcome (--status, --items) and remove the pointer
#   other    a row of the table below: needs a pointer (else exit 5), refuses
#            after the deadline (exit 3), runs the script with the arm64 node
#            under a hard timeout (exit 4 on expiry), prints the script's
#            stderr summary and the output file's path; a failing script
#            exits 1
# `watch` has only its table rows: no start, no pointer, never a refresh.
#
# Exit codes: 0 ok; 1 the step failed; 2 unknown agent, step or argument;
# 3 budget exhausted; 4 timed out; 5 no active run; 6 this agent's previous
# run has not called finish and is still held (see cmd_start).
#
# After exit 3 or 4 a routine agent writes its report and finishes with
# --status failed, as its prompt says; the messages say the same. `start`'s
# own failures leave no pointer, so they say "stop" (finish would exit 5).
#
# Never writes inside $WT, so agent-worktree.sh's dirty-tree refusal keeps
# meaning "someone edited the agent's code". The body is in main(), called
# on the last line, so `start`'s refresh can replace this file on disk
# without the running shell reading new lines halfway.
#
# Every timeout stays a minute inside the Bash tool's 600 s ceiling (prep
# 540 s; start's refresh 420 s plus its run-log call 120 s), and the prompts
# set that ceiling on every call, so the wrapper always exits with its own
# code (4 on a timeout) before the harness stops the call.
#
# KYV_AGENT_WORKTREE, KYV_AGENT_RUNS, KYV_AGENT_NODE and
# KYV_AGENT_STEP_TIMEOUT are for scripts/verify-agent-run.mjs only.
set -u

NODE="${KYV_AGENT_NODE:-/Users/jsloth/Library/Application Support/Logi/LogiPluginService/PluginHosts/node22/node/bin/node}"
WT="${KYV_AGENT_WORKTREE:-/Users/jsloth/Projects/kyv-agent-worktree}"
RUNS="${KYV_AGENT_RUNS:-/Users/jsloth/Projects/kyv-agent-runs}"
REPORTS="/Users/jsloth/Projects/Civic Awareness Project(Know Your Vote)/Civic Awareness (Know Your Vote)/Agents/RunReports"

ROUTINE="R2 R3 R4 R5"

# agent|step|script (in $WT)|arguments ({dir} = the run directory)|stdin file|stdout file|timeout (s)
# "-" is none: no stdin file, or stdout printed instead of saved. Each PR adds
# its own agent's rows; scripts/verify-agent-run.mjs checks every script exists.
ROWS='R5|prep|scripts/candidate-leads.ts|prep --days 14|-|stories.json|540
R5|check|scripts/candidate-leads.ts|check --stories {dir}/stories.json|mentions.json|leads.json|300
R5|queue-dry|scripts/candidate-leads.ts|queue --dry-run|verified.json|queue-dry.txt|300
R5|queue|scripts/candidate-leads.ts|queue|verified.json|queue.txt|300
watch|stale|scripts/agent-run-log.ts|stale|-|-|120
watch|check|scripts/agent-run-log.ts|watch --runs {dir}/runs.json --notified {dir}/notified.txt|-|-|120
R3|context|scripts/election-news.ts|context|-|context.json|300
R3|queue-dry|scripts/election-news.ts|queue --dry-run|items.json|queue-dry.json|300
R3|queue|scripts/election-news.ts|queue|items.json|queue.json|300'

# Run "$@" for at most $1 seconds. The command gets its own process group and
# the whole group is killed on expiry, so a child it started (npm, git) does
# not outlive it. Exit 124 on expiry, else the command's own status. The group
# is also killed when this perl gets TERM, INT or HUP (the harness ending the
# Bash call, by process group or by tree), so a step the agent was told
# failed cannot finish behind it; exit 128 + the signal. A KILL cannot be
# caught: that one leaves the step running.
TIMED='my $t = shift; my $pid; for my $s (qw(TERM INT HUP)) { $SIG{$s} = sub { kill "KILL", -$pid if $pid; exit 128 + ($s eq "TERM" ? 15 : $s eq "INT" ? 2 : 1) } } $pid = fork(); exit 125 unless defined $pid; if (!$pid) { setpgrp(0, 0); exec { $ARGV[0] } @ARGV; exit 127 } $SIG{ALRM} = sub { kill "KILL", -$pid; waitpid($pid, 0); exit 124 }; alarm $t; waitpid($pid, 0); exit($? & 127 ? 128 + ($? & 127) : $? >> 8)'

die() {
  code=$1
  shift
  echo "agent-run: $*" >&2
  exit "$code"
}

run_timed() {
  secs=${KYV_AGENT_STEP_TIMEOUT:-$1}
  shift
  perl -e "$TIMED" "$secs" "$@"
}

is_routine() {
  case " $ROUTINE " in *" $AGENT "*) return 0 ;; esac
  return 1
}

# The epoch-seconds deadline in run directory $1, or nothing.
deadline_of() {
  [ -f "$1/deadline" ] || return 0
  d=$(cat "$1/deadline")
  case $d in '' | *[!0-9]*) return 0 ;; esac
  echo "$d"
}

# True when run directory $1 has a deadline that has not passed.
inside_budget() {
  d=$(deadline_of "$1")
  [ -n "$d" ] && [ "$d" -gt "$(date +%s)" ]
}

# The epoch-seconds end of run directory $1's hold (held-until, which
# agent-run-log.ts writes at twice the wall clock), else its deadline, else
# nothing.
held_until_of() {
  if [ -f "$1/held-until" ]; then
    h=$(cat "$1/held-until")
    case $h in '' | *[!0-9]*) ;; *) echo "$h"; return 0 ;; esac
  fi
  deadline_of "$1"
}

# Sets DIR to this agent's active run directory, or exits 5.
active_dir() {
  PTR="$RUNS/current-$AGENT"
  [ -f "$PTR" ] || die 5 "no active run: call start"
  DIR=$(cat "$PTR")
  [ -d "$DIR" ] || die 5 "no active run: call start"
}

node_script() {
  secs=$1
  shift
  run_timed "$secs" "$NODE" --disable-warning=MODULE_TYPELESS_PACKAGE_JSON "$@"
}

cmd_start() {
  mkdir -p "$RUNS" || die 1 "cannot create $RUNS"
  PTR="$RUNS/current-$AGENT"
  # A pointer exists until its run calls finish. Past its deadline that run
  # may still be writing its report before its finish; if this start took the
  # pointer, that late finish would end this run instead. So the pointer
  # holds new starts until twice the budget, when the watchdog calls the old
  # run stuck. A finish that comes even later than that still lands on the
  # newer run: stop a stuck run in the app rather than let it go on.
  if [ -f "$PTR" ]; then
    prev=$(cat "$PTR")
    if inside_budget "$prev"; then
      die 6 "another $AGENT run is still inside its budget ($prev). Stop now and do not call finish. To start over at once, stop that run in the app and delete $PTR"
    fi
    h=$(held_until_of "$prev")
    now=$(date +%s)
    if [ -n "$h" ] && [ "$h" -gt "$now" ]; then
      die 6 "the previous $AGENT run ($prev) is past its budget but has not called finish; it may still be writing its report. Stop now and do not call finish. New starts are refused for $(((h - now + 59) / 60)) more min. To start over at once, stop that run in the app and delete $PTR"
    fi
    echo "previous run: $prev never called finish; starting a new run"
  fi
  [ -f "$WT/scripts/agent-run-log.ts" ] || die 1 "agent worktree missing or stale at $WT: run scripts/agent-worktree.sh once from a checkout of main"

  DAY=$(date +%F)
  REPORT="$REPORTS/$DAY-$AGENT.md"
  echo "date: $DAY"
  echo "report: $REPORT"

  # Another agent's run holds the worktree until its held-until, not just its
  # deadline: a step that started just before the deadline runs on past it,
  # and a refresh (git checkout, npm ci) would swap code under that step.
  busy=""
  now=$(date +%s)
  for p in "$RUNS"/current-*; do
    [ -f "$p" ] && [ "$p" != "$PTR" ] || continue
    h=$(held_until_of "$(cat "$p")")
    if [ -n "$h" ] && [ "$h" -gt "$now" ]; then
      busy=${p##*/current-}
      break
    fi
  done
  if [ -n "$busy" ]; then
    echo "worktree: refresh skipped while an $busy run may still be running; using $WT as it is"
  else
    out=$(run_timed 420 sh "$WT/scripts/agent-worktree.sh" < /dev/null 2>&1)
    rc=$?
    line=$(printf '%s\n' "$out" | grep '^agent worktree ready at ' | tail -n 1)
    if [ "$rc" -ne 0 ] || [ -z "$line" ]; then
      printf '%s\n' "$out"
      [ "$rc" -eq 124 ] && die 4 "agent worktree refresh timed out: write the run report and stop"
      die 1 "agent worktree refresh failed: write the run report and stop"
    fi
    echo "worktree: $line"
  fi

  base="$RUNS/$DAY/$AGENT"
  DIR=$base
  n=2
  while [ -e "$DIR" ]; do
    DIR="$base-$n"
    n=$((n + 1))
  done
  mkdir -p "$DIR" || die 1 "cannot create $DIR"
  printf '%s\n' "$REPORT" > "$DIR/report"
  # Prints the budget line; a failed database write is only a warning.
  node_script 120 "$WT/scripts/agent-run-log.ts" start --agent "$AGENT" --run-dir "$DIR" < /dev/null
  [ -n "$(deadline_of "$DIR")" ] || die 1 "could not set this run's deadline: write the run report and stop"
  printf '%s\n' "$DIR" > "$PTR"
  echo "run dir: $DIR"
}

cmd_budget() {
  active_dir
  d=$(deadline_of "$DIR")
  [ -n "$d" ] || die 1 "this run has no deadline: write the run report and finish with --status failed"
  left=$((d - $(date +%s)))
  if [ "$left" -le 0 ]; then
    echo "budget: 0 min left: budget exhausted: write the run report and finish with --status failed"
  else
    echo "budget: $(((left + 59) / 60)) min left"
  fi
}

cmd_finish() {
  case $STATUS in
    ok | ok_empty | failed) ;;
    '') die 2 "finish needs --status ok, ok_empty or failed" ;;
    *) die 2 "unknown status: $STATUS (ok, ok_empty or failed)" ;;
  esac
  case $ITEMS in
    '') ;;
    *[!0-9]*) die 2 "--items must be a whole number" ;;
  esac
  active_dir
  set -- finish --agent "$AGENT" --run-dir "$DIR" --status "$STATUS" --report "$(cat "$DIR/report")"
  if [ -n "$ITEMS" ]; then set -- "$@" --items "$ITEMS"; fi
  node_script 120 "$WT/scripts/agent-run-log.ts" "$@" < /dev/null ||
    echo "agent-run: warning: the run log was not updated; the run is still finished" >&2
  rm -f "$PTR"
  echo "finished: $AGENT $STATUS${ITEMS:+, $ITEMS item(s)}"
}

cmd_table() {
  row=$(printf '%s\n' "$ROWS" | awk -F'|' -v a="$AGENT" -v s="$STEP" '$1 == a && $2 == s { print; exit }')
  [ -n "$row" ] || die 2 "unknown step for $AGENT: $STEP"
  IFS='|' read -r _agent _step script argv input output secs <<EOF
$row
EOF
  if [ "$AGENT" = watch ]; then
    DIR="$RUNS/watch"
    mkdir -p "$DIR" || die 1 "cannot create $DIR"
    # A runs.json left by a run that wrote it but never reached `watch check`
    # would make this run's Write an overwrite, which Claude Code refuses
    # without a Read the watchdog is not approved for. Move it aside first.
    if [ "$STEP" = stale ] && [ -f "$DIR/runs.json" ]; then
      mv -f "$DIR/runs.json" "$DIR/runs.last.json" || die 1 "cannot move aside $DIR/runs.json"
    fi
  else
    active_dir
    d=$(deadline_of "$DIR")
    if [ -z "$d" ] || [ "$d" -le "$(date +%s)" ]; then
      die 3 "budget exhausted: write the run report and finish with --status failed"
    fi
  fi
  [ -f "$WT/$script" ] || die 1 "missing $WT/$script: the agent worktree is older than this step"

  in=/dev/null
  if [ "$input" != - ]; then
    in="$DIR/$input"
    [ -f "$in" ] || die 1 "missing input $in: write it first"
  fi
  log="$DIR/$STEP.log"

  set --
  set -f
  for w in $argv; do
    case $w in "{dir}"/*) w="$DIR/${w#"{dir}"/}" ;; esac
    set -- "$@" "$w"
  done
  set +f

  if [ "$output" = - ]; then
    node_script "$secs" "$WT/$script" "$@" < "$in" 2> "$log"
    rc=$?
  else
    node_script "$secs" "$WT/$script" "$@" < "$in" > "$DIR/$output" 2> "$log"
    rc=$?
  fi
  cat "$log"
  case $rc in
    0) ;;
    124)
      if [ "$AGENT" = watch ]; then
        die 4 "$AGENT $STEP timed out after ${KYV_AGENT_STEP_TIMEOUT:-$secs} s: send nothing and stop"
      fi
      die 4 "$AGENT $STEP timed out after ${KYV_AGENT_STEP_TIMEOUT:-$secs} s: write the run report and finish with --status failed"
      ;;
    *) die 1 "$AGENT $STEP failed (exit $rc): its message is above" ;;
  esac
  if [ "$output" != - ]; then echo "output: $DIR/$output"; fi
}

main() {
  [ $# -ge 2 ] || die 2 "usage: agent-run.sh <AGENT> <STEP> [--status ok|ok_empty|failed] [--items N]"
  AGENT=$1
  STEP=$2
  shift 2
  case $AGENT in '' | *[!A-Za-z0-9]*) die 2 "unknown agent: $AGENT" ;; esac
  case $STEP in '' | *[!a-z-]*) die 2 "unknown step: $STEP" ;; esac
  STATUS=""
  ITEMS=""
  while [ $# -gt 0 ]; do
    case $1 in
      --status)
        [ $# -ge 2 ] || die 2 "--status needs a value"
        STATUS=$2
        shift 2
        ;;
      --items)
        [ $# -ge 2 ] || die 2 "--items needs a value"
        ITEMS=$2
        shift 2
        ;;
      *) die 2 "unknown argument: $1" ;;
    esac
  done
  if [ "$STEP" != finish ] && [ -n "$STATUS$ITEMS" ]; then
    die 2 "--status and --items go with finish only"
  fi
  [ -x "$NODE" ] || die 1 "node missing at $NODE"

  case $STEP in
    start | budget | finish)
      is_routine || die 2 "unknown agent for $STEP: $AGENT (routine agents: $ROUTINE)"
      "cmd_$STEP"
      ;;
    *) cmd_table ;;
  esac
}

main "$@"; exit $?
