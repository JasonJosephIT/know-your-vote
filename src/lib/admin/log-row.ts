import type { AdminActionRow } from "../../types/admin.ts";

/* How the Log page shows one admin_action row. Pure and free of server-only
   imports so scripts/verify-admin-log.ts can check it under plain Node.

   The page used to print subject_id.slice(0, 8) unguarded. Every publication
   flip (0018 onward) stores its subject in subject_ref with subject_id NULL,
   so the first such row threw a TypeError and the whole page failed. On
   2026-10-05 that was all 170 rows in production. */

/* A UUID subject shortened to its first 8 characters, as before; a text
   subject (a race or measure id) in full, since it is short and readable. */
export function subjectLabel(
  row: Pick<AdminActionRow, "subject_kind" | "subject_id" | "subject_ref">
): string {
  const subject = row.subject_id
    ? row.subject_id.slice(0, 8)
    : (row.subject_ref ?? "—");
  return `${row.subject_kind}:${subject}`;
}

const ACTION_CHIP: Record<string, string> = {
  trigger: "bg-accent-muted text-accent-strong",
  submit: "bg-info/15 text-info",
  approve: "bg-primary-muted text-success",
  reject: "bg-surface-muted text-on-surface-muted",
  cancel: "bg-warning/15 text-warning",
  publish: "bg-primary-muted text-success",
  unpublish: "bg-warning/15 text-warning",
  list: "bg-info/15 text-info",
  unlist: "bg-warning/15 text-warning",
};

/* Any other verb (set_status, note, or one added later) gets the neutral chip:
   action has no CHECK, so the page must render whatever it finds. */
export function actionChipClass(action: string): string {
  return Object.hasOwn(ACTION_CHIP, action)
    ? ACTION_CHIP[action]
    : "bg-surface-muted text-on-surface-muted";
}
