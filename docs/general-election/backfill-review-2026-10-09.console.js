/* Backfill review 2026-10-09: the founder's decision loop.
 *
 * WHAT IT DOES. Sends each drafted decision in docs/general-election/
 * backfill-review-2026-10-09.md to the same route the Approve and Reject buttons
 * use (POST /api/admin/review/:id/decision), one at a time, as you. Every call
 * goes through the route's lint, source check and audit row. Nothing else is
 * touched. There is no bulk SQL.
 *
 * HOW TO RUN.
 *   1. Read the verdict table first and change any line you disagree with
 *      (edit the "action" or "note" below, or delete the line to leave it pending).
 *   2. Sign in at https://knowyour.vote/admin and open /admin/queue.
 *   3. Open the browser console (Cmd+Option+J), paste this whole file, press Enter.
 *      It runs as a DRY RUN first and only prints what it would do.
 *   4. Set DRY_RUN = false below and paste again to send.
 *
 * SAFETY.
 *   - It stops at the first unexpected answer: a network error, 401/403/404/5xx,
 *     or an approve that comes back still pending with apply_error (fail-closed).
 *     Fix or decide that one card by hand, then paste again: decided items
 *     answer 409 and are skipped, so a re-run resumes where it stopped.
 *   - INCLUDE_D4 = true: the founder decided D4 on 2026-10-10 ("keep Florida's
 *     Voice"), so Florida's Voice approvals, and every [DUP] whose kept copy is
 *     a Florida's Voice story, are sent like any other. Set it to false to skip
 *     those 98 again.
 *   - The result log is left in window.__backfillLog.
 */
(async () => {
  const DRY_RUN = true;
  const INCLUDE_D4 = true;
  const PAUSE_MS = 300;

  const DECISIONS = [
{
"id": "58851a16-b24e-417c-b716-10721aed7261",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: a CBS Miami preview of the attorney general race (Rodríguez vs Uthmeier); Moody is named only as the AG Uthmeier replaced (moody-pipeline-gap-2026-10-09.md (a)).",
"d4": false,
"label": "CBS AG preview (Moody) — Previewing the race for Florida's Attorney General: Jose Jav"
},
{
"id": "428a6c58-3cbf-44ab-909f-bde86530d1e1",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup strings unrelated items together; Jolly is one quoted line among many.",
"d4": false,
"label": "Jolly · 2026-09-09 · JUICE🍊— 9.9.2026 — GOP Takes Hit With Latino Voters in Swing"
},
{
"id": "f8041286-f0d7-4dac-a50c-5993927c7de3",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup strings unrelated items together; Donalds is one item among many.",
"d4": false,
"label": "Donalds · 2026-09-09 · Last Squeeze🍊— 9.9.2026 — New Donalds Ad Strikes Jolly Over "
},
{
"id": "400495b6-f819-4d45-9b4f-33ba37cc89f9",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup strings unrelated items together; Jolly is one item among many.",
"d4": false,
"label": "Jolly · 2026-09-09 · Last Squeeze🍊— 9.9.2026 — New Donalds Ad Strikes Jolly Over "
},
{
"id": "4abd25ab-2197-4e0f-aa59-14fc7f33f41b",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Wasserman Schultz is one quoted line among many.",
"d4": false,
"label": "Schultz · 2026-09-10 · Last Squeeze🍊— 9.10.2026 — FL Lawmakers Remember Charlie Kir"
},
{
"id": "774721ce-08f8-47d0-a9eb-98c88e4782d7",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Jolly is one quoted line among many.",
"d4": false,
"label": "Jolly · 2026-09-11 · JUICE🍊— 9.11.2026 — DeSantis Announces Anti-Communism Educat"
},
{
"id": "394293e1-0134-4305-b07d-6c9f35a7b518",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Donalds is one item among many.",
"d4": false,
"label": "Donalds · 2026-09-11 · Last Squeeze🍊— 9.11.2026 — Lawmakers Commemorate 9/11 Annive"
},
{
"id": "1bb8e28e-085e-4055-8d69-3d7de812e7dd",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Nixon is one item among many.",
"d4": false,
"label": "Nixon · 2026-09-14 · JUICE🍊— 9.14.2026 — Are Florida Democrats Losing Jewish Vote"
},
{
"id": "79829d0c-7216-40cc-a501-f2e55fd09488",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Moskowitz is one quoted line among many.",
"d4": false,
"label": "Moskowitz · 2026-09-14 · Last Squeeze🍊— 9.14.2026 — Second Amendment Sales Tax Holida"
},
{
"id": "ab742471-7bd2-4884-a324-4b0ae3bf6b05",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Jolly is one item among many.",
"d4": false,
"label": "Jolly · 2026-09-15 · JUICE🍊— 9.15.2026 — Hakeem Jeffries Endorses David Jolly — M"
},
{
"id": "f1ee7554-7e72-4b53-aea4-4666f71a32d0",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Jolly is one quoted line among many.",
"d4": false,
"label": "Jolly · 2026-09-16 · JUICE🍊— 9.16.2026 — DeSantis Awards $5K in Law Enforcement R"
},
{
"id": "8b766d4e-f3b8-4e18-b722-7ac26107952a",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Castor is one item among many.",
"d4": false,
"label": "Castor · 2026-09-16 · JUICE🍊— 9.16.2026 — DeSantis Awards $5K in Law Enforcement R"
},
{
"id": "3d70e488-9a56-4a52-ae2c-97a8f49fcc9d",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Nixon is one item among many.",
"d4": false,
"label": "Nixon · 2026-09-16 · Last Squeeze🍊— 9.16.2026 — Is AOC Heading to the Sunshine St"
},
{
"id": "a73ec880-60f6-461b-bfba-78884ca172a0",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Dandiya is one item among many.",
"d4": false,
"label": "Dandiya · 2026-09-16 · Last Squeeze🍊— 9.16.2026 — Is AOC Heading to the Sunshine St"
},
{
"id": "6a0c4dcc-9121-4518-86be-303c13929156",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Nixon is one quoted line among many.",
"d4": false,
"label": "Nixon · 2026-09-17 · JUICE🍊— 9.17.2026 — DeSantis Optimistic About GOP in the Mid"
},
{
"id": "7da0a6fe-6967-4d33-a147-33a1179793ef",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Donalds is one quoted line among many.",
"d4": false,
"label": "Donalds · 2026-09-17 · Last Squeeze🍊— 9.17.2026 — Salazar Breaks With Trump on Immi"
},
{
"id": "e5f3e1f2-937a-4b9a-80a5-4d893308fab4",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Salazar is one item among many.",
"d4": false,
"label": "Salazar · 2026-09-17 · Last Squeeze🍊— 9.17.2026 — Salazar Breaks With Trump on Immi"
},
{
"id": "9a16ff73-01ba-4481-b2f2-56d5af4278c0",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Uthmeier is one item among many.",
"d4": false,
"label": "Uthmeier · 2026-09-18 · JUICE🍊— 9.18.2026 — Uthmeier Cracks Down on Fake Calls, Text"
},
{
"id": "3edc413e-e4df-4368-a14c-a62442d2dc53",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Jolly is one item among many.",
"d4": false,
"label": "Jolly · 2026-09-18 · Last Squeeze🍊— 9.18.2026 — Jolly Optimistic About Winning th"
},
{
"id": "4cb2b442-8cb6-4f2b-8878-d85c8307e3e9",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Donalds is one item among many.",
"d4": false,
"label": "Donalds · 2026-09-21 · JUICE🍊— 9.21.2026 — Donalds Agrees to Three Debates Against "
},
{
"id": "dbf1e8ec-f78a-42bb-9568-b6ba342bd8f3",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Jolly is one item among many.",
"d4": false,
"label": "Jolly · 2026-09-21 · JUICE🍊— 9.21.2026 — Donalds Agrees to Three Debates Against "
},
{
"id": "083f11af-f2d8-4d28-92dc-093cbbb93ea3",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Dandiya is one quoted line among many.",
"d4": false,
"label": "Dandiya · 2026-09-21 · JUICE🍊— 9.21.2026 — Donalds Agrees to Three Debates Against "
},
{
"id": "f9dcfc00-a56f-48c0-8ea7-9ae9a46e0f93",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Donalds is one item among many.",
"d4": false,
"label": "Donalds · 2026-09-21 · Last Squeeze🍊— 9.21.2026 — Jolly Declines Debates Against Do"
},
{
"id": "8a2cba95-8ae8-46b9-be25-bc074af4e64d",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Jolly is one item among many.",
"d4": false,
"label": "Jolly · 2026-09-21 · Last Squeeze🍊— 9.21.2026 — Jolly Declines Debates Against Do"
},
{
"id": "0ecf911b-1cdb-446b-a018-aee25edf9f11",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Donalds is one item among many.",
"d4": false,
"label": "Donalds · 2026-09-22 · Last Squeeze🍊— 9.22.2026 — Collins Endorses Donalds for Gove"
},
{
"id": "4cd5bd76-d45c-415f-8d72-f0cab925837c",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Dandiya is one item among many.",
"d4": false,
"label": "Dandiya · 2026-09-23 · JUICE🍊— 9.23.2026 — Dandiya Releases First General Election "
},
{
"id": "c90467df-f3e1-400d-bbb1-e150bd5b6b56",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Moody is one quoted line among many.",
"d4": false,
"label": "Moody · 2026-09-23 · Last Squeeze🍊— 9.23.2026 — Florida Governor's Race Becomes' "
},
{
"id": "02606001-a327-41e2-95fb-9d3a58525f16",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Jolly is one item among many.",
"d4": false,
"label": "Jolly · 2026-09-23 · Last Squeeze🍊— 9.23.2026 — Florida Governor's Race Becomes' "
},
{
"id": "dd99923b-44b8-433f-a198-d02d6f1b1c35",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Uthmeier is one quoted line among many.",
"d4": false,
"label": "Uthmeier · 2026-09-23 · Last Squeeze🍊— 9.23.2026 — Florida Governor's Race Becomes' "
},
{
"id": "541de5b8-ad8b-48cd-976c-46404b5c88ca",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Donalds is one quoted line among many.",
"d4": false,
"label": "Donalds · 2026-09-24 · JUICE🍊— 9.24.2026 — Uthmeier Highlights Attorney General Rec"
},
{
"id": "55fd418e-d8d6-4ccb-a65b-3d4e5d2160a5",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Uthmeier is one item among many.",
"d4": false,
"label": "Uthmeier · 2026-09-24 · JUICE🍊— 9.24.2026 — Uthmeier Highlights Attorney General Rec"
},
{
"id": "bab41f1f-90bc-4e40-811b-7328977dec83",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Nixon is one item among many.",
"d4": false,
"label": "Nixon · 2026-09-24 · Last Squeeze🍊— 9.24.2026 — Democratic Socialists Host Angie "
},
{
"id": "ba43da6a-0ef2-4a21-9d71-e72d41a64971",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Nixon is one quoted line among many.",
"d4": false,
"label": "Nixon · 2026-09-25 · Last Squeeze🍊— 9.25.2026 — DeSantis Warns Republicans About "
},
{
"id": "5aa27e52-e5dc-41e9-905e-3beb9f327b29",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Nixon is one quoted line among many.",
"d4": false,
"label": "Nixon · 2026-09-28 · JUICE🍊— 9.28.2026 — Jolly Ties Donalds to Trump Amid Falling"
},
{
"id": "b6ad1950-d9e1-4d19-b4c8-26dfc6ad25e6",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Donalds is one item among many.",
"d4": false,
"label": "Donalds · 2026-09-28 · JUICE🍊— 9.28.2026 — Jolly Ties Donalds to Trump Amid Falling"
},
{
"id": "de0beef3-1d95-4b58-8548-a3d39d1cfc92",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Jolly is one item among many.",
"d4": false,
"label": "Jolly · 2026-09-28 · JUICE🍊— 9.28.2026 — Jolly Ties Donalds to Trump Amid Falling"
},
{
"id": "5b4b320d-f167-4e29-9f4d-acd6d5e620c2",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Donalds is one item among many.",
"d4": false,
"label": "Donalds · 2026-09-28 · Last Squeeze🍊— 9.28.2026 — Donalds Ad Accuses Jolly of Lobby"
},
{
"id": "4aff4d32-baa2-482a-8121-8930325ed6e8",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Jolly is one item among many.",
"d4": false,
"label": "Jolly · 2026-09-28 · Last Squeeze🍊— 9.28.2026 — Donalds Ad Accuses Jolly of Lobby"
},
{
"id": "8f947e54-8589-45c2-a6ca-7cc184ec4e98",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Nixon is one item among many.",
"d4": false,
"label": "Nixon · 2026-09-29 · JUICE🍊— 9.29.2026 — Moody Attack Ad Slams 'Socialist' Angie "
},
{
"id": "8c4ad975-08d6-467f-b466-7d139bbd0089",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Moody is one item among many.",
"d4": false,
"label": "Moody · 2026-09-29 · JUICE🍊— 9.29.2026 — Moody Attack Ad Slams 'Socialist' Angie "
},
{
"id": "f31936af-dff8-4339-8e4a-c12c405a34ab",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Singer is one item among many.",
"d4": false,
"label": "Singer · 2026-09-29 · JUICE🍊— 9.29.2026 — Moody Attack Ad Slams 'Socialist' Angie "
},
{
"id": "98e704aa-abde-4b98-bc54-500eb53e8d10",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Donalds is one item among many.",
"d4": false,
"label": "Donalds · 2026-09-29 · Last Squeeze🍊— 9.29.2026 — Donalds Questions Jolly's Politic"
},
{
"id": "11b31e97-7a4a-40be-b0ab-15930a9a4add",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Jolly is one item among many.",
"d4": false,
"label": "Jolly · 2026-09-29 · Last Squeeze🍊— 9.29.2026 — Donalds Questions Jolly's Politic"
},
{
"id": "b37ba6a8-a6a1-476d-a631-0813f0faacf4",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Dandiya is one quoted line among many.",
"d4": false,
"label": "Dandiya · 2026-09-29 · Last Squeeze🍊— 9.29.2026 — Donalds Questions Jolly's Politic"
},
{
"id": "631e2ff6-2018-41a2-9f1d-255af873ffe7",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Nixon is one quoted line among many.",
"d4": false,
"label": "Nixon · 2026-09-30 · Last Squeeze🍊— 9.30.2026 — Bipartisan Support Builds Over De"
},
{
"id": "8952d0f0-b3d9-46c4-83f2-78652e1fb26a",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Nixon is one item among many.",
"d4": false,
"label": "Nixon · 2026-10-01 · JUICE🍊— 10.1.2026 — Fried Anticipates 'Revolt' From Democrat"
},
{
"id": "6463cca1-ce80-4d3a-9651-c66a5369b45f",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Donalds is one quoted line among many.",
"d4": false,
"label": "Donalds · 2026-10-01 · JUICE🍊— 10.1.2026 — Fried Anticipates 'Revolt' From Democrat"
},
{
"id": "c1988aee-d0c8-44a1-be29-8aec201c40bd",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Jolly is one item among many.",
"d4": false,
"label": "Jolly · 2026-10-01 · JUICE🍊— 10.1.2026 — Fried Anticipates 'Revolt' From Democrat"
},
{
"id": "5d8c2977-bc0d-46b6-9d67-ae93ec9a0f9a",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Moskowitz is one quoted line among many.",
"d4": false,
"label": "Moskowitz · 2026-10-01 · Last Squeeze🍊— 10.1.2026 — New Florida Laws Take Effect Toda"
},
{
"id": "cbb0a40f-4ed6-4e0e-9d55-647441c51c63",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Nixon is one item among many.",
"d4": false,
"label": "Nixon · 2026-10-02 · JUICE🍊— 10.2.2026 — FL GOP Wins Florida Rising Together Laws"
},
{
"id": "67c5f7c1-8986-4a4d-a942-029b1bed6cff",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WLRN story kept for Donalds (byline 'WLRN Public Media | By Mitch Perry, Florida Phoenix'; the WUSF copy credits WLRN).",
"d4": false,
"label": "Donalds · 2026-09-16 · Debate about data centers emerges in Donalds-Jolly gubernato"
},
{
"id": "55551a1c-73e8-4771-a3e7-d53862fd1823",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WLRN story kept for Jolly (byline 'WLRN Public Media | By Mitch Perry, Florida Phoenix'; the WUSF copy credits WLRN).",
"d4": false,
"label": "Jolly · 2026-09-16 · Debate about data centers emerges in Donalds-Jolly gubernato"
},
{
"id": "d30a05c0-36e1-4ffa-afeb-43a7f9cadd70",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the CL Tampa story kept for Donalds (byline Mitch Perry, Florida Phoenix on all three copies; Florida Phoenix is not one of our outlets, so the earliest copy is kept).",
"d4": false,
"label": "Donalds · 2026-09-17 · Jolly and Donalds clash on property insurance proposals"
},
{
"id": "e4da5022-de76-4ac5-b918-1f88f7f57795",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the CL Tampa story kept for Jolly (byline Mitch Perry, Florida Phoenix on all three copies; Florida Phoenix is not one of our outlets, so the earliest copy is kept).",
"d4": false,
"label": "Jolly · 2026-09-17 · Jolly and Donalds clash on property insurance proposals"
},
{
"id": "b7795ccc-71fc-4f58-8e84-8ee23a3cd434",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the CL Tampa story kept for Donalds (byline Mitch Perry, Florida Phoenix on all three copies; Florida Phoenix is not one of our outlets, so the earliest copy is kept).",
"d4": false,
"label": "Donalds · 2026-09-17 · Jolly and Donalds clash on property insurance proposals"
},
{
"id": "2944b9d9-c0db-47d3-9891-cb25ffe778ff",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the CL Tampa story kept for Jolly (byline Mitch Perry, Florida Phoenix on all three copies; Florida Phoenix is not one of our outlets, so the earliest copy is kept).",
"d4": false,
"label": "Jolly · 2026-09-17 · Jolly and Donalds clash on property insurance proposals"
},
{
"id": "6f4b355c-9322-413b-97c4-8cd2f6a2971d",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WLRN story kept for Salazar (byline 'WLRN Public Media | By Sergio Bustos').",
"d4": false,
"label": "Salazar · 2026-09-19 · Trump says he supports Miami Congresswoman Salazar despite h"
},
{
"id": "2aead6b7-10cf-4362-88a9-79bbe2ec2bc7",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the CL Tampa story kept for Nixon (byline Mitch Perry, Florida Phoenix on both copies; the earliest copy is kept).",
"d4": false,
"label": "Nixon · 2026-09-23 · Angie Nixon to pay fine and do community service for staging"
},
{
"id": "0fa6d162-2638-4702-a141-2a9293077c2b",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WLRN story kept for Donalds (byline 'WLRN Public Media | By Carlton Gillespie'; the summit is WLRN's).",
"d4": false,
"label": "Donalds · 2026-09-23 · WLRN Economy Summit: Byron Donalds on making Florida more af"
},
{
"id": "3fa31a5a-f367-4ab5-8ade-a3dd7b864e15",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WLRN story kept for Jolly (byline 'WLRN Public Media | By Carlton Gillespie'; the summit is WLRN's).",
"d4": false,
"label": "Jolly · 2026-09-23 · WLRN Economy Summit: David Jolly proposes state-backed disas"
},
{
"id": "c059a9d8-f061-4191-b427-a2a5591ed0b5",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WLRN story kept for Donalds (byline 'WLRN Public Media | By Samantha Putterman | PolitiFact' (WLRN's PolitiFact partnership)).",
"d4": false,
"label": "Donalds · 2026-09-24 · Florida governor’s race: Fact-checking Byron Donalds, David "
},
{
"id": "cb45b1bd-73df-441f-8588-57b0f376a39f",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WLRN story kept for Jolly (byline 'WLRN Public Media | By Samantha Putterman | PolitiFact' (WLRN's PolitiFact partnership)).",
"d4": false,
"label": "Jolly · 2026-09-24 · Florida governor’s race: Fact-checking Byron Donalds, David "
},
{
"id": "1999ce48-30ef-49e0-8543-38cb20cc0803",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WLRN story kept for Donalds (byline 'WLRN Public Media | By Samantha Putterman | PolitiFact' (WLRN's PolitiFact partnership)).",
"d4": false,
"label": "Donalds · 2026-09-24 · Florida governor's race: Fact-checking Byron Donalds and Dav"
},
{
"id": "8f439708-e3a2-48de-94db-a2cb5106024a",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WLRN story kept for Jolly (byline 'WLRN Public Media | By Samantha Putterman | PolitiFact' (WLRN's PolitiFact partnership)).",
"d4": false,
"label": "Jolly · 2026-09-24 · Florida governor's race: Fact-checking Byron Donalds and Dav"
},
{
"id": "080bb7b5-3ee2-4af2-91c6-46c53c14ef2c",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WUSF story kept for Jolly (byline 'WUSF | By Steve Newborn').",
"d4": false,
"label": "Jolly · 2026-09-28 · David Jolly implores national Democrats to help in the Flori"
},
{
"id": "3090d5e0-59dc-4018-a0cd-5e0b237bcd95",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the CL Tampa story kept for Donalds (byline Mitch Perry, Florida Phoenix on both copies; the earliest copy is kept).",
"d4": false,
"label": "Donalds · 2026-09-30 · Byron Donalds says solar power is a ‘fad’ but Florida utilit"
},
{
"id": "3a243150-fc78-49f9-a35f-7b44c613a5ce",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WLRN story kept for Nixon (byline 'WLRN Public Media | By WLRN STAFF').",
"d4": false,
"label": "Nixon · 2026-10-03 · U.S. Senate candidate Angie Nixon presses Florida's two sena"
},
{
"id": "779de5ec-4e0d-4ea5-8d1d-4f2afbc8cee1",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WFSU story kept for Donalds (byline 'WFSU', photo by WFSU).",
"d4": false,
"label": "Donalds · 2026-10-05 · Gubernatorial candidate Byron Donalds speaks to FAMU for fir"
},
{
"id": "7c1d9e04-bb97-4553-be88-19b41a81a0f9",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] P1: a Florida's Voice guest column ('Skylar Zander: ...') arguing against Jolly's plan; opinion that would show as reporting.",
"d4": false,
"label": "Jolly · 2026-09-09 · Skylar Zander: Florida’s insurance reforms must protect home"
},
{
"id": "c9534cd9-9cdb-4665-a368-624a97e196ee",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] P1: a guest op-ed (labelled 'Opinion', by Skylar Zander) against Jolly's plan; opinion that would show as reporting. Same verdict as the Florida's Voice copy.",
"d4": false,
"label": "Jolly · 2026-09-11 · Florida’s Insurance Reforms Must Protect Homeowners and Taxp"
},
{
"id": "13266670-3326-4b58-a9c3-1ec09e10da4a",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] P1: a Florida's Voice column ('Brendon Leslie: ...') attacking Dalton; opinion that would show as reporting.",
"d4": false,
"label": "Dalton · 2026-09-14 · Brendon Leslie: Bale Dalton won’t ban sex changes on kids an"
},
{
"id": "96129427-3a1b-42fc-9651-c05bb638c8a0",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Paid content: the summary opens 'POLITICAL ADVERTISEMENT Content provided and approved by the David Jolly for Governor campaign'.",
"d4": false,
"label": "Jolly · 2026-09-14 · David Jolly Presents an Agenda Focused on Affordability, Ref"
},
{
"id": "c3d07af1-4e16-4cb5-9764-736b7d8e0191",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject and P1: the story is about a Bradenton Times editor, and the dek is in the writer's own evaluative voice ('That is basically a campaign flyer'). The page returned 403, so this rests on the feed headline and dek.",
"d4": false,
"label": "Nixon · 2026-09-14 · Bradenton Times editor’s ‘nonpartisan’ act ends with an Angi"
},
{
"id": "011205c4-43d0-4a9b-88c6-c3b14e14cf50",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] P1: a Florida's Voice column ('Bryan Leib: ...') addressed to Jolly; opinion that would show as reporting.",
"d4": false,
"label": "Jolly · 2026-09-18 · Bryan Leib: No David Jolly, Florida has nothing to apologize"
},
{
"id": "a585ff28-2055-4ff0-bfa3-05112ab8c88f",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] A Florida Daily talk-show panel on Republican strategy; commentary, and Donalds is a passing mention in the dek.",
"d4": false,
"label": "Donalds · 2026-09-09 · VIDEO: Republicans Counting on Culture Wars for Midterm Succ"
},
{
"id": "c3b85605-9ba7-4b42-afc6-e009f9a2c9fb",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: a round-up of Florida officials' 9/11 tributes; Donalds is one of several officials named.",
"d4": false,
"label": "Donalds · 2026-09-11 · Florida Officials Commemorate Anniversary of 9/11 Attacks"
},
{
"id": "3f96c3c7-ea8f-406c-9ca2-9eb687adab97",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: an endorsement of Moody; Nixon is named only as the opponent (same test as the Sanders/Nixon story tagged to Moody).",
"d4": false,
"label": "Nixon · 2026-09-16 · Former Nicaraguan political prisoner endorses Ashley Moody i"
},
{
"id": "70e20d2d-4aa0-4b66-bcb7-0e13b8a54e32",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: Jolly's reaction to a race-rating change; Donalds is named only as the opponent in the dek.",
"d4": false,
"label": "Donalds · 2026-09-18 · David Jolly Expresses Confidence After Analysis Moves Florid"
},
{
"id": "d5fed09e-c36d-4a5f-bdff-7a50169e124a",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: a super PAC ad against Dandiya; Askar is named only as the other candidate in the race.",
"d4": false,
"label": "Askar · 2026-09-21 · Super PAC hits Progressive Pia Dandiya for Opposing Middle-C"
},
{
"id": "0246db79-b505-4435-a2de-68913005a390",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: a Florida Democratic Party list of 14 'Take Back Florida' candidates; Dalton is one name on the list.",
"d4": false,
"label": "Dalton · 2026-09-21 · Florida Democrats Kickstart 'Take Back Florida' Initiative T"
},
{
"id": "23bf74ec-dfe5-43b2-a0e5-e1a28d495be7",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: Dandiya's first general-election ad; Askar is named only as her opponent in the dek.",
"d4": false,
"label": "Askar · 2026-09-22 · Pia Dandiya Releases First General Election Ad in District 2"
},
{
"id": "435f1851-dc93-45e3-ba99-935c6fef0839",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject and form: a Le Floridien 'Analysis' about Haitian-American Republicans; Donalds's North Miami visit is only the news peg.",
"d4": false,
"label": "Donalds · 2026-09-23 · Why Do Some Haitian-American Republicans Keep Their Politica"
},
{
"id": "90c491ae-d46b-449f-89bf-bc9585e48ac1",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: a Spanish story about Donalds's campaign website; Jolly appears only in the dek.",
"d4": false,
"label": "Jolly · 2026-09-23 · Donalds dice que quitó a Trump de su página para destacar su"
},
{
"id": "68925b4c-f13b-405c-8f9b-0af3ba522cb1",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: a story about Elijah's ad; Dalton is not in the headline and appears only in the dek as a secondary target (same test as the Nixon/Vance story tagged to Moody).",
"d4": false,
"label": "Dalton · 2026-09-23 · GOP congressional candidate Ryan Elijah rolls out ad campaig"
},
{
"id": "d1a80eae-dea6-481b-a753-98cbbf3f3bf2",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: a story about Dalton's interview remarks; Elijah is named only as his opponent in the dek.",
"d4": false,
"label": "Elijah · 2026-09-24 · Bale Dalton Seemingly Supports Transgender Surgery for Minor"
},
{
"id": "33ee5e61-8988-4c5b-9c41-f0ec16d9505b",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: the PBA and NFIB endorse Singer; Moskowitz is named only as the incumbent Singer is running against.",
"d4": false,
"label": "Moskowitz · 2026-09-24 · Florida PBA, NFIB endorse Scott Singer in bid to defeat Mosk"
},
{
"id": "ddba7fa6-9519-4b56-a927-de06ba264aa1",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: Green's campaign remarks; Soto is named only as the incumbent Green is challenging.",
"d4": false,
"label": "Soto · 2026-09-24 · Dan Green highlights law enforcement support, criticizes int"
},
{
"id": "5d3243a9-5d93-493a-98c9-567f1ba74b7b",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: a story about Jolly's contribution from Pritzker; Frost is named only as having attended the Orlando rally.",
"d4": false,
"label": "Frost · 2026-09-25 · Jolly accepts $50,000 from Pritzker after campaigning with I"
},
{
"id": "f94d9e01-0c17-4ce8-b2a6-41c5870a8484",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: Peter Deutsch endorses Singer; Moskowitz is named only as the incumbent Singer is running against.",
"d4": false,
"label": "Moskowitz · 2026-09-29 · Former Democratic Congressman Crosses Party Lines To Endorse"
},
{
"id": "8963b598-2d70-4b33-b59b-a0f13b1b3a93",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: Moody names her county campaign chairs; Nixon is named only as the opponent.",
"d4": false,
"label": "Nixon · 2026-09-29 · Moody names campaign chairs in all 67 Florida counties ahead"
},
{
"id": "6f1c0a61-acf8-47fd-a9cb-f7fee3629ae5",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: a Simpson farmland story; Uthmeier is named only in the list of Cabinet members.",
"d4": false,
"label": "Uthmeier · 2026-09-30 · Wilton Simpson Announces Protection of 4,500 Acres of Agricu"
},
{
"id": "9d9246e6-3d71-4061-8882-b54614b24423",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: Sanders's support for Nixon; Moody is named only as her opponent.",
"d4": false,
"label": "Moody · 2026-09-30 · Bernie Sanders Will Send Portion of His Campaign Funds to Su"
},
{
"id": "16d80f36-4c47-4277-9db2-1ccdacb32a5a",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: a profile of Rodríguez's campaign; Uthmeier is named only as the incumbent he is running against.",
"d4": false,
"label": "Uthmeier · 2026-09-30 · 'Crime, costs and corruption': José Javier Rodríguez on the "
},
{
"id": "9cc95bff-ba5c-4cad-ae24-2f9bb9402e2b",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: Nixon's call on Florida's two senators; Moody appears in the dek as one of the two senators addressed.",
"d4": false,
"label": "Moody · 2026-10-03 · U.S. Senate candidate Angie Nixon presses Florida's two sena"
},
{
"id": "9473b867-fd9b-47a9-afcc-6ad7e46dfa9f",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: Nixon's response to Vance; Moody appears in the dek only as a secondary target of Nixon's criticism.",
"d4": false,
"label": "Moody · 2026-10-04 · Angie Nixon responds after JD Vance says she doesn't belong "
},
{
"id": "4ba01c0b-d08f-4e93-9359-e97d73189a72",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: Jolly's Sarasota visit; Donalds is named only as his opponent.",
"d4": false,
"label": "Donalds · 2026-10-05 · Democrat David Jolly talks of 'public education renaissance'"
},
{
"id": "0f7fff6d-c46a-42e3-837c-4a3489b57589",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'touts' in the summary.",
"d4": false,
"label": "Moskowitz · 2026-09-10 · In battleground FL-25, Rep. Jared Moskowitz kicks off TV ad "
},
{
"id": "8590beb0-3605-4028-ae67-a72189a2aa93",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'touts' in the title.",
"d4": false,
"label": "Bilirakis · 2026-09-16 · Bilirakis touts House passage of AM radio bill for vehicles,"
},
{
"id": "9390038d-a3da-4d3b-bdb0-82c7b90f1f61",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'touts' in the title.",
"d4": false,
"label": "Uthmeier · 2026-09-16 · Uthmeier announces charges against man accused of abusing ei"
},
{
"id": "79f0d950-5557-4155-a149-3c79bf9795e5",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'claims' in the summary.",
"d4": false,
"label": "Nixon · 2026-09-17 · Angie Nixon: Florida is where ‘black people go to die’"
},
{
"id": "9b17a2cc-778b-4528-892d-751b4af63a48",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'momentum' in the summary.",
"d4": false,
"label": "Jolly · 2026-09-23 · Decision Desk HQ Moves Florida Governor's Race from 'Leans R"
},
{
"id": "5d5aa2ca-089c-4eed-ba40-1e33ba6766f0",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'momentum' in the summary.",
"d4": false,
"label": "Moody · 2026-09-28 · Reps. Donalds and Haridopolos join Sen. Ashley Moody to push"
},
{
"id": "145fe1c0-c25d-4214-a3bb-47e00fc7a46f",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'momentum' in the summary.",
"d4": false,
"label": "Donalds · 2026-09-28 · Reps. Donalds and Haridopolos join Sen. Ashley Moody to push"
},
{
"id": "25a053ff-54d5-43f0-96d0-1faba116b23f",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'momentum' in the summary.",
"d4": false,
"label": "Haridopolos · 2026-09-28 · Reps. Donalds and Haridopolos join Sen. Ashley Moody to push"
},
{
"id": "32181d41-ae04-4730-bf35-868533d659da",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'touts' in the title.",
"d4": false,
"label": "Moody · 2026-09-29 · Ashley Moody Touts Her Amendment to The Protect College Spor"
},
{
"id": "e3d4e2b7-9d39-464c-8893-a790461cd55d",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'claims' in the title.",
"d4": false,
"label": "Uthmeier · 2026-10-01 · Florida sues Pfizer, CEO Albert Bourla over COVID-19 vaccine"
},
{
"id": "e635ce0c-2f6a-4dee-8ef1-accec1474908",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'aims to' in the summary.",
"d4": false,
"label": "Moody · 2026-10-02 · Rick Scott & Ashley Moody Introduce Bill Banning Oil & Gas P"
},
{
"id": "e5d053b4-ff82-4bf0-b3b6-99b7978e0240",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Nixon's case against Moody.",
"d4": false,
"label": "Nixon · 2026-09-10 · There are ‘$10 million reasons’ not to vote for Ashley Moody"
},
{
"id": "3a146879-59af-4941-b6d1-a0e3b8fad8bd",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the story is Nixon's argument about Moody (10-06 precedent for opponent statements).",
"d4": false,
"label": "Moody · 2026-09-10 · There are ‘$10 million reasons’ not to vote for Ashley Moody"
},
{
"id": "5a1c3cea-0ada-4c9d-8d29-e298ef1e752d",
"action": "approve",
"note": "Backfill review 10-09: On-subject: The Floridian report (byline Grayson Bakich, no opinion label) on Florida Democrats and Jewish voters; its first section is about Nixon and the body is mostly attributed.",
"d4": false,
"label": "Nixon · 2026-09-11 · As Antisemitic Rhetoric Increases, Can Florida Democrats Ret"
},
{
"id": "7717453f-1ad9-4c55-bde5-fbc0e952588d",
"action": "approve",
"note": "Backfill review 10-09: On-subject poll story (founder 10-09: third-party polls about a candidate are allowed): Quantus poll of Moody and Nixon.",
"d4": false,
"label": "Nixon · 2026-09-14 · POLL: Ashley Moody Ahead by 7 Points Over Angie Nixon in Sen"
},
{
"id": "3b215415-edfb-4b12-a1a1-463901cdf001",
"action": "approve",
"note": "Backfill review 10-09: On-subject poll story (founder 10-09): Quantus poll of Moody and Nixon.",
"d4": false,
"label": "Moody · 2026-09-14 · POLL: Ashley Moody Ahead by 7 Points Over Angie Nixon in Sen"
},
{
"id": "1e390077-0ae9-446a-b5cf-12c4bb714743",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Moody leads a push for red snapper permits.",
"d4": true,
"label": "Moody · 2026-09-14 · Moody leads South Atlantic push for new red snapper fishing "
},
{
"id": "3aa37aa3-1270-42ae-8633-b16bd9f2c906",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly's remarks praising Nixon's candidacy (an endorsement-type story about Nixon).",
"d4": true,
"label": "Nixon · 2026-09-14 · David Jolly says he’d welcome Kamala Harris, praises sociali"
},
{
"id": "b37bb673-fc74-44eb-bf0b-2dbd03f9a350",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Moody files the STARS Act for a Space Academy in Florida.",
"d4": false,
"label": "Moody · 2026-09-16 · Ashley Moody Files Bill to Bring New U.S. Space Academy to F"
},
{
"id": "51976083-80b6-41e5-88cb-d3210079246b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Ocasio-Cortez may campaign for Nixon (endorsement-type story).",
"d4": false,
"label": "Nixon · 2026-09-16 · Ocasio-Cortez Open to Campaign in Florida for Democratic Soc"
},
{
"id": "46942937-28a8-42ad-a1f9-a520e519339b",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: a former Nicaraguan political prisoner endorses Moody.",
"d4": true,
"label": "Moody · 2026-09-16 · Former Nicaraguan political prisoner endorses Ashley Moody i"
},
{
"id": "f8f331da-e8f3-4a25-b840-d9c94fb5e3b9",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Trump's video attacks Nixon by name (10-06 precedent: the Vance remarks about Nixon were approved).",
"d4": true,
"label": "Nixon · 2026-09-18 · Trump: Send Ashley Moody back to the Senate, defeat ‘communi"
},
{
"id": "c4765e04-c23c-4e16-8d0e-cdae7d121d20",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: Trump's video urges Floridians to re-elect Moody.",
"d4": true,
"label": "Moody · 2026-09-18 · Trump: Send Ashley Moody back to the Senate, defeat ‘communi"
},
{
"id": "de6fdfe6-7cc4-417a-9a7c-f2e14c45eb4b",
"action": "approve",
"note": "Backfill review 10-09: On-subject poll story (founder 10-09): the InsiderAdvantage poll of Moody and Nixon.",
"d4": true,
"label": "Nixon · 2026-09-22 · POLL: Moody leads Nixon by 7 in Florida U.S. Senate race"
},
{
"id": "21ba9faa-fec9-41a0-8a19-4885133c24e7",
"action": "approve",
"note": "Backfill review 10-09: On-subject poll story (founder 10-09): the InsiderAdvantage poll of Moody and Nixon.",
"d4": true,
"label": "Moody · 2026-09-22 · POLL: Moody leads Nixon by 7 in Florida U.S. Senate race"
},
{
"id": "f5729b17-3060-42ba-afa3-747fb7af2cf3",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Nixon to pay a fine and do community service over a sit-in.",
"d4": false,
"label": "Nixon · 2026-09-23 · Florida Senate candidate Angie Nixon to pay $250 and do comm"
},
{
"id": "5c00f753-adaa-4469-8a50-0beff470cccb",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Moody at the Senate Judiciary hearing on women's sports.",
"d4": true,
"label": "Moody · 2026-09-23 · Moody joins female athletes in push to protect women’s sport"
},
{
"id": "7fc0ae31-6b34-40ca-a0ea-1f65fb56ef3b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Nixon attends a New York fundraiser.",
"d4": false,
"label": "Nixon · 2026-09-24 · Socialist Angie Nixon Attends NYC Fundraiser Co-Hosted By Fe"
},
{
"id": "223f2ff1-ab1b-40ee-b737-a3f307b2a5ac",
"action": "approve",
"note": "Backfill review 10-09: On-subject poll story (founder 10-09): a statewide poll of Nixon and Moody.",
"d4": false,
"label": "Nixon · 2026-09-24 · New Poll Finds NIxon and Moody Nearly Even in Florida Senate"
},
{
"id": "b442e6ec-9d60-4bd4-b671-687eb11938d9",
"action": "approve",
"note": "Backfill review 10-09: On-subject poll story (founder 10-09): a statewide poll of Nixon and Moody.",
"d4": false,
"label": "Moody · 2026-09-24 · New Poll Finds NIxon and Moody Nearly Even in Florida Senate"
},
{
"id": "e3e5a9a0-d3e7-4d2d-b8ad-296d7940ea01",
"action": "approve",
"note": "Backfill review 10-09: On-subject: a benefit rally for Nixon at Will's Pub (10-06 precedent: the Nixon USF rally photos were approved).",
"d4": false,
"label": "Nixon · 2026-09-24 · Photos: Orlando artists got loud for Angie Nixon at Will's P"
},
{
"id": "cb59f27e-5df0-4ed8-9dfe-4cad300353fa",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Moody questions the FDA nominee on illegal vapes.",
"d4": true,
"label": "Moody · 2026-09-25 · Ashley Moody presses FDA nominee to crackdown on Chinese-mad"
},
{
"id": "a35fdb2b-c49e-4eef-ad40-c6a3c768b07b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Nixon's payments to a former staffer (attributed to Fox News).",
"d4": true,
"label": "Nixon · 2026-09-25 · Nixon paid thousands to Hamas-praising staffer after years o"
},
{
"id": "02785b57-2676-4e07-934f-1d60ea6a1938",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Moody's ad is about Nixon (10-06 precedent).",
"d4": false,
"label": "Nixon · 2026-09-28 · Ashley Moody Releases Ad Attacking Angie Nixon as a Socialis"
},
{
"id": "c3952814-e78b-423f-98f9-f5d2eb00f6ca",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Moody releases an ad about Nixon.",
"d4": false,
"label": "Moody · 2026-09-28 · Ashley Moody Releases Ad Attacking Angie Nixon as a Socialis"
},
{
"id": "cdde0120-b627-4fb5-bed9-7e2af15a9f0a",
"action": "approve",
"note": "Backfill review 10-09: On-subject: a House companion to Moody's STARS Act.",
"d4": false,
"label": "Moody · 2026-09-28 · Florida Lawmakers Push to Bring New U.S. Space Academy to th"
},
{
"id": "fb146290-dc65-4b25-bf3c-1e542541ae7c",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Moody names campaign chairs in all 67 counties.",
"d4": true,
"label": "Moody · 2026-09-29 · Moody names campaign chairs in all 67 Florida counties ahead"
},
{
"id": "15af299a-4d9f-4b91-ad79-01648ebc68e0",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event as a story already live for Nixon: Orlando Weekly 09-30 'Bernie Sanders to give cash boost to Angie Nixon campaign'.",
"d4": false,
"label": "Nixon · 2026-09-30 · Bernie Sanders Will Send Portion of His Campaign Funds to Su"
},
{
"id": "0f9627df-5bb1-4350-bec3-f91cb47f231e",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Democratic leaders criticise Moody over town halls and Hope Florida.",
"d4": false,
"label": "Moody · 2026-09-30 · 'Where is Ashley Moody?': Dems rip U.S. Senator for avoiding"
},
{
"id": "e8f4b153-3757-4a44-b3a1-dd18b28d9172",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Moody as the earlier CL Tampa story kept (09-30, ''Where is Ashley Moody?': Dems rip U.S. Senator for avoiding voters...').",
"d4": false,
"label": "Moody · 2026-09-30 · Florida Democrats blast Sen. Moody for skipping town halls, "
},
{
"id": "ece49917-ac51-425a-bc9d-536b47ee4b03",
"action": "approve",
"note": "Backfill review 10-09: On-subject (Spanish): Nixon condemns conditions at the Miramar ICE office.",
"d4": false,
"label": "Nixon · 2026-09-30 · Angie Nixon y Annette Taddeo condenan abusos migratorios de "
},
{
"id": "d413c1d2-9a3c-4c0f-92c5-238f229e0263",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Moody as the earlier CL Tampa story kept (09-30, ''Where is Ashley Moody?': Dems rip U.S. Senator for avoiding voters...').",
"d4": false,
"label": "Moody · 2026-10-01 · Democrats slam Ashley Moody amid a heated U.S. Senate race"
},
{
"id": "6a3c10df-af93-4a81-9f7d-606733a43530",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: EMILYs List endorses Nixon.",
"d4": false,
"label": "Nixon · 2026-10-01 · Pro-Choice EMILYs List Endorses Angie Nixon for Senate"
},
{
"id": "02767f0a-9b4a-4580-b084-4752f7a1a48f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Moody co-headlines the Lakeland rally with JD Vance.",
"d4": false,
"label": "Moody · 2026-10-02 · Vice President JD Vance Touches Down in Florida to Energize "
},
{
"id": "7216fd60-da08-42c9-875c-89a06662d65f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Scott and Moody introduce the Eglin range bill.",
"d4": true,
"label": "Moody · 2026-10-02 · Scott, Moody introduce bill to protect Eglin military range "
},
{
"id": "1c1f2ee2-6ab9-4bdf-aa6a-cd4420654102",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event as a story already live for Nixon: CL Tampa 10-02 'JD Vance to Florida U.S. Senate candidate Angie Nixon: ...'.",
"d4": false,
"label": "Nixon · 2026-10-02 · In Lakeland visit, JD Vance says Angie Nixon ‘doesn’t belong"
},
{
"id": "7cb869fb-9b7d-4c69-adf6-153ac7d4d23b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Nixon campaigns in Little Haiti and responds to Vance.",
"d4": false,
"label": "Nixon · 2026-10-03 · Nixon campaigns in Little Haiti, responds to Vance’s critici"
},
{
"id": "fe348e1e-3ae7-4c40-ad70-5330a7eb56e4",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Nixon presses Florida's senators on Haitian TPS (WLRN/WUSF syndicated copy).",
"d4": false,
"label": "Nixon · 2026-10-03 · U.S. Senate candidate Angie Nixon presses Florida's two sena"
},
{
"id": "4c7a3d7c-9228-4c03-b96e-6b2636c0ec4b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Nixon's CBS Miami response to Vance (a separate occasion from the Little Haiti stop).",
"d4": false,
"label": "Nixon · 2026-10-04 · Angie Nixon responds after JD Vance says she doesn't belong "
},
{
"id": "60358ff4-6c97-4458-aa71-69bb85ac08de",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Nixon's statement on the Delray Islamic center.",
"d4": true,
"label": "Nixon · 2026-10-05 · Nixon backs Delray Islamic center and school, brands questio"
},
{
"id": "3de73a64-e525-444b-b27f-7957d313ec4b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's 09-09 campaign ad on Jolly's insurance plan.",
"d4": false,
"label": "Donalds · 2026-09-09 · Byron Donalds Releases Ad Slamming David Jolly's 'Hurricane "
},
{
"id": "3f961611-2f4a-4003-864e-406db440611f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the 09-09 Donalds ad is about Jolly's insurance plan (10-06 precedent: an opponent's ad about a candidate is approved for both).",
"d4": false,
"label": "Jolly · 2026-09-09 · Byron Donalds Releases Ad Slamming David Jolly's 'Hurricane "
},
{
"id": "6dd60d16-2be2-4230-8f30-af35f26dd83e",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Donalds as the earlier The Floridian story kept (09-09, 'Byron Donalds Releases Ad Slamming David Jolly's 'Hurricane Tax' Plan').",
"d4": false,
"label": "Donalds · 2026-09-09 · Byron Donalds campaign launches ads targeting affordability,"
},
{
"id": "fc992443-3472-4eb6-8365-d7c0fce0228e",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Jolly as the earlier The Floridian story kept (09-09, 'Byron Donalds Releases Ad Slamming David Jolly's 'Hurricane Tax' Plan').",
"d4": false,
"label": "Jolly · 2026-09-09 · Byron Donalds campaign launches ads targeting affordability,"
},
{
"id": "70257bcc-a1ed-40d7-b880-4dfb71db7c35",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly campaigns in Broward.",
"d4": false,
"label": "Jolly · 2026-09-10 · As governor race heats up, Democrat David Jolly campaigns in"
},
{
"id": "67442ad1-b613-4880-996b-62a6db0892e4",
"action": "approve",
"note": "Backfill review 10-09: On-subject: running mate Bryan Avila speaks for the Donalds ticket.",
"d4": true,
"label": "Donalds · 2026-09-11 · Lt. Gov. nominee Bryan Avila highlights years of conservativ"
},
{
"id": "8f414023-ed01-4ce8-a9e4-4c8b86fc536d",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds is to headline WLRN's Sunshine Economy Summit.",
"d4": false,
"label": "Donalds · 2026-09-12 · Florida gubernatorial nominees David Jolly and Byron Donalds"
},
{
"id": "071d6676-df26-449f-9f44-8b5c6b5d3776",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly is to headline WLRN's Sunshine Economy Summit.",
"d4": false,
"label": "Jolly · 2026-09-12 · Florida gubernatorial nominees David Jolly and Byron Donalds"
},
{
"id": "86637e84-53dd-43f4-b79e-5e14a02ab887",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Local 10 interview with Jolly.",
"d4": false,
"label": "Jolly · 2026-09-13 · This Week in South Florida: David Jolly"
},
{
"id": "b392d660-9a6c-4a4f-8a16-cefc8c9bf4db",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the Donalds campaign's response to the Jeffries endorsement of Jolly.",
"d4": true,
"label": "Donalds · 2026-09-14 · GOP says Jeffries endorsement reveals Jolly as far-left Demo"
},
{
"id": "34855c41-f45a-4a44-b83b-139b7a892f2f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the story is about the Jeffries endorsement of Jolly and the Donalds campaign's response to it.",
"d4": true,
"label": "Jolly · 2026-09-14 · GOP says Jeffries endorsement reveals Jolly as far-left Demo"
},
{
"id": "74db9380-838b-44a1-9ffd-d67cff0c3936",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: the Florida PBA endorses Donalds.",
"d4": true,
"label": "Donalds · 2026-09-14 · Florida’s largest police union backs Byron Donalds for gover"
},
{
"id": "055e83f8-b7c0-4569-afb3-7d7a4196c849",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly's CBS Miami interview remarks.",
"d4": true,
"label": "Jolly · 2026-09-14 · David Jolly says he’d welcome Kamala Harris, praises sociali"
},
{
"id": "359e0792-2b11-4202-96fe-7b99185e4400",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Donalds as the earlier Florida's Voice story kept (09-14, 'Florida’s largest police union backs Byron Donalds for governor').",
"d4": true,
"label": "Donalds · 2026-09-14 · Florida's Largest Police Union Endorses Byron Donalds for Go"
},
{
"id": "4612977e-a08a-486b-a76b-141a1c5ae8c2",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: Hakeem Jeffries endorses Jolly.",
"d4": false,
"label": "Jolly · 2026-09-14 · Hakeem Jeffries Endorses David Jolly For Governor"
},
{
"id": "611dfdf9-0e69-42e7-8602-faaf08ac4c69",
"action": "approve",
"note": "Backfill review 10-09: On-subject: a 'Republicans for Jolly' effort launches.",
"d4": false,
"label": "Jolly · 2026-09-14 · ‘Republicans for Jolly’ effort launches in St. Petersburg"
},
{
"id": "dc4f98d1-b2ec-413d-a28e-c11e65169369",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds unveils his insurance plan.",
"d4": true,
"label": "Donalds · 2026-09-15 · Donalds unveils ‘Bring Down The Bill’ insurance plan, says J"
},
{
"id": "1da0dee1-3be2-4c38-a057-eeaed7d3d8f6",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the story contrasts Donalds's plan with Jolly's proposal (10-06 precedent for opponent statements).",
"d4": true,
"label": "Jolly · 2026-09-15 · Donalds unveils ‘Bring Down The Bill’ insurance plan, says J"
},
{
"id": "ee1ca58a-fed4-4eaf-8ae3-2031cc794d19",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's 'Never Apologize' ad.",
"d4": true,
"label": "Donalds · 2026-09-15 · Donalds: ‘Never Apologize’ for Florida’s conservative record"
},
{
"id": "f7c70ee7-16be-4925-bff8-223b719de250",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the Donalds ad is about Jolly (10-06 precedent for opponent statements).",
"d4": true,
"label": "Jolly · 2026-09-15 · Donalds: ‘Never Apologize’ for Florida’s conservative record"
},
{
"id": "8cf507d9-d92b-49c9-973f-fd8ba87773da",
"action": "approve",
"note": "Backfill review 10-09: On-subject: where Donalds stands on data centers and AI.",
"d4": false,
"label": "Donalds · 2026-09-16 · Florida residents are raising the alarms over data centers a"
},
{
"id": "5d66b396-643f-458e-bbbc-9f00c0c03d77",
"action": "approve",
"note": "Backfill review 10-09: On-subject: where Jolly stands on data centers and AI.",
"d4": false,
"label": "Jolly · 2026-09-16 · Florida residents are raising the alarms over data centers a"
},
{
"id": "441697fc-630b-4c86-919c-9bcca985d4e3",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the data-centre issue in the Donalds-Jolly race (WLRN/WUSF syndicated copy).",
"d4": false,
"label": "Donalds · 2026-09-16 · Debate about data centers emerges in Donalds-Jolly gubernato"
},
{
"id": "1c868db0-e0cd-4c3a-8fcc-1190e157430f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the data-centre issue in the Donalds-Jolly race (WLRN/WUSF syndicated copy).",
"d4": false,
"label": "Jolly · 2026-09-16 · Debate about data centers emerges in Donalds-Jolly gubernato"
},
{
"id": "b8165eed-03d2-44a0-89a0-1107d7a46d7a",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: the NRA-PVF endorses Donalds.",
"d4": true,
"label": "Donalds · 2026-09-16 · NRA-PVF endorses Byron Donalds for Florida governor, awards "
},
{
"id": "acf2b247-4190-47b7-999a-d569206cb044",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly and Donalds on property insurance (syndicated story, also at WLRN/WUSF).",
"d4": false,
"label": "Donalds · 2026-09-17 · Jolly and Donalds clash on how to fix Florida's property ins"
},
{
"id": "efca8cc0-1312-4655-b878-11bc338b51e7",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly and Donalds on property insurance (syndicated story, also at WLRN/WUSF).",
"d4": false,
"label": "Jolly · 2026-09-17 · Jolly and Donalds clash on how to fix Florida's property ins"
},
{
"id": "7d9ebe49-d7d1-49d2-ae45-8a2b937ac883",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the Republican Party of Florida chairman's critique of Jolly (10-06 precedent for statements about a candidate).",
"d4": true,
"label": "Jolly · 2026-09-17 · GOP Chair Evan Power slams David Jolly’s progressive pivot a"
},
{
"id": "c54aa3fe-55e6-4a74-9e5a-188d47cc55e4",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Simpson urges support for Donalds (an endorsement-type story).",
"d4": true,
"label": "Donalds · 2026-09-17 · Simpson warns Jolly would undo Florida’s conservative gains,"
},
{
"id": "d455c50e-804a-4577-801e-e8e88bc9682d",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Simpson's warning is about Jolly (10-06 precedent for statements about a candidate).",
"d4": true,
"label": "Jolly · 2026-09-17 · Simpson warns Jolly would undo Florida’s conservative gains,"
},
{
"id": "335c94cf-f131-45c5-944f-ac297b43315a",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's radio interview on Jolly and insurance.",
"d4": true,
"label": "Donalds · 2026-09-17 · Donalds says Jolly is playing ‘keep-away,’ calls insurance p"
},
{
"id": "aa9a43b0-d244-4a13-83ad-d3f02fc8b96b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's remarks are about Jolly and his insurance plan (10-06 precedent).",
"d4": true,
"label": "Jolly · 2026-09-17 · Donalds says Jolly is playing ‘keep-away,’ calls insurance p"
},
{
"id": "19546433-ee9b-4bc9-8b73-a107f1c962b2",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly's reaction to the Inside Elections rating change.",
"d4": false,
"label": "Jolly · 2026-09-18 · David Jolly Expresses Confidence After Analysis Moves Florid"
},
{
"id": "b6eac43b-cea3-4659-a848-d4015a903f0b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the Donalds campaign accepts three debate proposals.",
"d4": true,
"label": "Donalds · 2026-09-18 · Donalds campaign accepts three debate proposals spanning Flo"
},
{
"id": "89a81bbd-b612-4543-ae0c-6dcb63c993cd",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the debate challenge is to Jolly (10-06 precedent; debates involve both candidates).",
"d4": true,
"label": "Jolly · 2026-09-18 · Donalds campaign accepts three debate proposals spanning Flo"
},
{
"id": "8befe640-46b8-4a48-aa6e-ebef86015b2e",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly's MS Now remarks on Trump and the ballot.",
"d4": false,
"label": "Jolly · 2026-09-18 · David Jolly Candidly Welcomes Trump's Name on Ballot in Gove"
},
{
"id": "11e9c2ed-3357-4c9a-af3f-a7f41f1cdcdb",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Donalds as the earlier Florida's Voice story kept (09-18, 'Donalds campaign accepts three debate proposals spanning Florida, s...').",
"d4": true,
"label": "Donalds · 2026-09-18 · Byron Donalds Agrees to Three Debates Against David Jolly in"
},
{
"id": "8c0434be-911a-4ad7-9bc1-3eb669bfdc60",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Jolly as the earlier Florida's Voice story kept (09-18, 'Donalds campaign accepts three debate proposals spanning Florida, s...').",
"d4": true,
"label": "Jolly · 2026-09-18 · Byron Donalds Agrees to Three Debates Against David Jolly in"
},
{
"id": "827ea869-d5ad-4f74-b0db-26f1bc9eb405",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly says a data-centre ban should be 'on the table'.",
"d4": false,
"label": "Jolly · 2026-09-18 · David Jolly says a complete ban on data centers in Florida s"
},
{
"id": "e93a85c0-c8fa-4818-886c-e065ef47d0ac",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly declines debates with Donalds (a debate involves both candidates).",
"d4": false,
"label": "Donalds · 2026-09-21 · David Jolly Declines Debates with Byron Donalds in Governor'"
},
{
"id": "5d5b6512-e770-4962-b191-a74279dce2a5",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly declines debates with Donalds.",
"d4": false,
"label": "Jolly · 2026-09-21 · David Jolly Declines Debates with Byron Donalds in Governor'"
},
{
"id": "6849cf5b-6ca1-4c70-a746-a086228a35c6",
"action": "approve",
"note": "Backfill review 10-09: On-subject: running mate Bryan Avila's Tampa appearance for the Donalds ticket.",
"d4": false,
"label": "Donalds · 2026-09-21 · While in Tampa, Byron Donalds' running mate dodges questions"
},
{
"id": "def8fa30-e4ba-4654-aaef-9b66348753df",
"action": "approve",
"note": "Backfill review 10-09: On-subject: state public campaign financing for Donalds (comparative headline approved verbatim, founder 10-09).",
"d4": false,
"label": "Donalds · 2026-09-21 · David Jolly leads Byron Donalds in state campaign funding"
},
{
"id": "e2cb1ea8-d696-447b-902e-607b41944d5d",
"action": "approve",
"note": "Backfill review 10-09: On-subject: state public campaign financing for Jolly (comparative headline approved verbatim, founder 10-09).",
"d4": false,
"label": "Jolly · 2026-09-21 · David Jolly leads Byron Donalds in state campaign funding"
},
{
"id": "b0e918d9-a8b3-41aa-9653-f33fe884f5da",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Donalds as the earlier The Floridian story kept (09-21, 'David Jolly Declines Debates with Byron Donalds in Governor's Race').",
"d4": false,
"label": "Donalds · 2026-09-21 · Jolly ducks debates against Donalds, drawing GOP charges he "
},
{
"id": "b02d2daa-cc55-45d0-a02a-c3d45f360979",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Jolly as the earlier The Floridian story kept (09-21, 'David Jolly Declines Debates with Byron Donalds in Governor's Race').",
"d4": false,
"label": "Jolly · 2026-09-21 · Jolly ducks debates against Donalds, drawing GOP charges he "
},
{
"id": "43c33514-c6e3-4f7c-8b70-f89f442ffe9f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's radio interview on Jolly and debates.",
"d4": true,
"label": "Donalds · 2026-09-21 · Donalds says Jolly hiding from voters after Democrat ducks d"
},
{
"id": "d519fa8f-abed-40fe-bc41-3f1ab733e185",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's remarks are about Jolly declining debates (10-06 precedent).",
"d4": true,
"label": "Jolly · 2026-09-21 · Donalds says Jolly hiding from voters after Democrat ducks d"
},
{
"id": "1655cddf-5c18-41bb-b718-83bc6eeb2c8a",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: Lt. Gov. Jay Collins endorses Donalds.",
"d4": false,
"label": "Donalds · 2026-09-22 · Jay Collins Endorses Byron Donalds 'to Keep Florida Free'"
},
{
"id": "7305b1b6-21f6-45f7-942e-f1fbd0104354",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Donalds as the earlier The Floridian story kept (09-22, 'Jay Collins Endorses Byron Donalds 'to Keep Florida Free'').",
"d4": false,
"label": "Donalds · 2026-09-22 · Jay Collins backs Donalds, urges Republicans to unite"
},
{
"id": "5e8f8946-d917-4e02-bc32-eeaf081fa294",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds on reappointing Surgeon General Ladapo.",
"d4": false,
"label": "Donalds · 2026-09-22 · While David Jolly says he'd fire Joseph Ladapo as surgeon ge"
},
{
"id": "35c08b3e-3cfd-43e3-9c6b-728ce637c000",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly says he would fire Surgeon General Ladapo.",
"d4": false,
"label": "Jolly · 2026-09-22 · While David Jolly says he'd fire Joseph Ladapo as surgeon ge"
},
{
"id": "888aaab8-f83b-4082-b10e-2962692490c5",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's campaign website and Trump mentions.",
"d4": false,
"label": "Donalds · 2026-09-23 · Byron Donalds Removes Mentions of Trump On Campaign Website"
},
{
"id": "cbb8ec6a-357d-4f1e-9faf-ab72f9a213f6",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: NFIB Florida endorses Donalds.",
"d4": true,
"label": "Donalds · 2026-09-23 · NFIB Florida backs Byron Donalds for governor, citing plan t"
},
{
"id": "a3c65858-29d4-4a60-ae54-7ccbc8321301",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds explains why his website dropped Trump references.",
"d4": false,
"label": "Donalds · 2026-09-23 · Florida gubernatorial candidate Byron Donalds explains why h"
},
{
"id": "f68c1498-e49f-4119-a6b8-fa0f9b48aa66",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's 'You Foot The Bill' ad.",
"d4": true,
"label": "Donalds · 2026-09-23 · Donalds releases ‘You Foot The Bill’ ad targeting Jolly insu"
},
{
"id": "84f1101e-9d7f-4207-9a01-ae3656be5183",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the Donalds ad is about Jolly's insurance plan (10-06 precedent).",
"d4": true,
"label": "Jolly · 2026-09-23 · Donalds releases ‘You Foot The Bill’ ad targeting Jolly insu"
},
{
"id": "3248d51e-d8f2-488b-bafd-f4e7ef852d6e",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds at WLRN's Sunshine Economy Summit (WLRN's own event; WLRN/WUSF syndicated copy).",
"d4": false,
"label": "Donalds · 2026-09-23 · WLRN Economy Summit: Byron Donalds on making Florida more af"
},
{
"id": "6abc4983-4eeb-4346-8e0d-6b9f931d55a6",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly at WLRN's Sunshine Economy Summit (WLRN's own event; WLRN/WUSF syndicated copy).",
"d4": false,
"label": "Jolly · 2026-09-23 · WLRN Economy Summit: David Jolly proposes state-backed disas"
},
{
"id": "a5949450-c3e3-4c08-be2c-25556ebec82f",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Donalds as the earlier WLRN story kept (09-23, 'WLRN Economy Summit: Byron Donalds on making Florida more affordabl...').",
"d4": false,
"label": "Donalds · 2026-09-23 · Byron Donalds, David Jolly outline differences on property t"
},
{
"id": "29e44970-7dbc-44e7-a2e8-48007f6fd3b6",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Jolly as the earlier WLRN story kept (09-23, 'WLRN Economy Summit: David Jolly proposes state-backed disaster ins...').",
"d4": false,
"label": "Jolly · 2026-09-23 · Byron Donalds, David Jolly outline differences on property t"
},
{
"id": "43e1840b-0d35-449c-935a-e4fdc6af8be7",
"action": "approve",
"note": "Backfill review 10-09: On-subject: a fact-check of Donalds's summit statements (CFPublic/WLRN/WFSU syndicated copy).",
"d4": false,
"label": "Donalds · 2026-09-24 · Florida governor’s race: Fact-checking Byron Donalds, David "
},
{
"id": "e1ca18c6-f293-461f-8136-1d90ff251351",
"action": "approve",
"note": "Backfill review 10-09: On-subject: a fact-check of Jolly's summit statements (CFPublic/WLRN/WFSU syndicated copy).",
"d4": false,
"label": "Jolly · 2026-09-24 · Florida governor’s race: Fact-checking Byron Donalds, David "
},
{
"id": "7912ef3c-2b4a-428d-8d02-2108aa2ad35c",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's Stuart affordability roundtable.",
"d4": true,
"label": "Donalds · 2026-09-24 · Donalds outlines insurance, health cost plans at Stuart affo"
},
{
"id": "590e1c32-9d36-41d7-86b8-c86d95874765",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly's remarks are about Donalds and Trump (10-06 precedent for statements about a candidate).",
"d4": false,
"label": "Donalds · 2026-09-25 · David Jolly Ties Byron Donalds to Trump Amid Falling Poll Nu"
},
{
"id": "cd6e86a5-67f2-48de-ba9a-7df0ae330e10",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly's MS Now remarks on Donalds and Trump.",
"d4": false,
"label": "Jolly · 2026-09-25 · David Jolly Ties Byron Donalds to Trump Amid Falling Poll Nu"
},
{
"id": "83ae3544-fea7-4599-af1f-90c6e5a57102",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the Donalds campaign's statement about the Pritzker contribution.",
"d4": true,
"label": "Donalds · 2026-09-25 · Jolly accepts $50,000 from Pritzker after campaigning with I"
},
{
"id": "63345b3b-ee00-49ef-8566-8a09652a5dc3",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly accepts $50,000 from Pritzker.",
"d4": true,
"label": "Jolly · 2026-09-25 · Jolly accepts $50,000 from Pritzker after campaigning with I"
},
{
"id": "79b31819-9534-4d6c-ae92-c5754d50691b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly at the Tampa Tiger Bay Club asks national Democrats for help.",
"d4": false,
"label": "Jolly · 2026-09-26 · David Jolly implores national Democrats to help his campaign"
},
{
"id": "09350dad-63d2-4542-8f05-d271d0e89137",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Jolly as the earlier WUSF story kept (09-26, 'David Jolly implores national Democrats to help his campaign for go...').",
"d4": false,
"label": "Jolly · 2026-09-27 · David Jolly to national Democrats: Show me some money for go"
},
{
"id": "a6db63d1-2454-4474-9f79-6df0569ec0e7",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Trump to headline rallies for Donalds.",
"d4": false,
"label": "Donalds · 2026-09-28 · Trump to Join Byron Donalds at Campaign Rallies"
},
{
"id": "af6e64b3-93e7-41ad-900a-737eb7b42ba6",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's ad on Jolly's lobbying.",
"d4": false,
"label": "Donalds · 2026-09-28 · New Byron Donalds Ad Accuses David Jolly of Lobbying For Oil"
},
{
"id": "827c90ea-632d-43e7-93fb-e4c80cd54930",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the Donalds ad is about Jolly's lobbying record (10-06 precedent).",
"d4": false,
"label": "Jolly · 2026-09-28 · New Byron Donalds Ad Accuses David Jolly of Lobbying For Oil"
},
{
"id": "9c5221f9-55ae-4cd9-b524-813214794e7b",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Jolly as the earlier WUSF story kept (09-26, 'David Jolly implores national Democrats to help his campaign for go...').",
"d4": false,
"label": "Jolly · 2026-09-28 · David Jolly: 'I need the national Democratic Party to come i"
},
{
"id": "c44362de-116f-4e9d-88bf-012eca66ac28",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Donalds as the earlier Florida Daily story kept (09-28, 'Trump to Join Byron Donalds at Campaign Rallies').",
"d4": false,
"label": "Donalds · 2026-09-28 · Trump slams ‘fake story’ that Donalds dropped him, reaffirms"
},
{
"id": "34ee6649-620e-4c6f-b63b-f90b1bdf8f3f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds introduces the House companion to the STARS Act.",
"d4": false,
"label": "Donalds · 2026-09-28 · Florida Lawmakers Push to Bring New U.S. Space Academy to th"
},
{
"id": "bfd7c85a-d06d-4ffc-a2c8-acb07062498b",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Donalds as the earlier The Floridian story kept (09-28, 'New Byron Donalds Ad Accuses David Jolly of Lobbying For Oil Drilling').",
"d4": false,
"label": "Donalds · 2026-09-28 · Donalds: Jolly cashed in on Gulf drilling after oil wrecked "
},
{
"id": "96517703-b5ca-48e9-ab70-32af7c0582d6",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Jolly as the earlier The Floridian story kept (09-28, 'New Byron Donalds Ad Accuses David Jolly of Lobbying For Oil Drilling').",
"d4": false,
"label": "Jolly · 2026-09-28 · Donalds: Jolly cashed in on Gulf drilling after oil wrecked "
},
{
"id": "654f81c8-dbbd-4598-b0a1-c3f6b9973904",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's 09-29 X post and his remarks to The Floridian about Jolly. The article (Javier Manjarres) is mostly attributed, with some unattributed characterisation.",
"d4": false,
"label": "Donalds · 2026-09-29 · Byron Donalds Questions Who the Real David Jolly is"
},
{
"id": "b1cf71c5-370d-48f2-838a-cf179ff8c0dc",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's remarks are about Jolly (10-06 precedent). Same article and same form verdict as the Donalds row.",
"d4": false,
"label": "Jolly · 2026-09-29 · Byron Donalds Questions Who the Real David Jolly is"
},
{
"id": "cdf2c73e-ff11-4d0c-b9bf-ce97e84310d5",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's Kissimmee speech.",
"d4": true,
"label": "Donalds · 2026-09-29 · Donalds pledges 20% insurance cut, backs property tax relief"
},
{
"id": "2f35cd29-782d-4e15-b837-b4eb8cd771dd",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the headline names Jolly as the target of Donalds's criticism (10-06 precedent).",
"d4": true,
"label": "Jolly · 2026-09-29 · Donalds pledges 20% insurance cut, backs property tax relief"
},
{
"id": "60ee7b12-83a4-4026-ace7-f4107708215b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's statement on solar and utilities' solar expansion (CL Tampa/WLRN syndicated copy).",
"d4": false,
"label": "Donalds · 2026-09-30 · Byron Donalds says 'its a fad,' but Florida utilities are ex"
},
{
"id": "e5bf8756-26cf-4d5a-9f94-48e07086f8bd",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's Fort Walton Beach rally.",
"d4": true,
"label": "Donalds · 2026-09-30 · Donalds tells Fort Walton Beach crowd Florida must stay ‘the"
},
{
"id": "caa402e3-6d9a-4ab2-b8ed-6989796df357",
"action": "approve",
"note": "Backfill review 10-09: On-subject: a Florida Daily fact-check of Donalds's '$1,000 hurricane tax' claim (10-06 precedent: the PolitiFact fact-check was approved).",
"d4": false,
"label": "Donalds · 2026-09-30 · Fact Check: Would David Jolly’s Insurance Plan Cost Florida "
},
{
"id": "7a7adf44-e9ee-4a3c-a970-b12bdfb7f2da",
"action": "approve",
"note": "Backfill review 10-09: On-subject: a Florida Daily fact-check of the claim about Jolly's insurance plan (10-06 precedent).",
"d4": false,
"label": "Jolly · 2026-09-30 · Fact Check: Would David Jolly’s Insurance Plan Cost Florida "
},
{
"id": "baf8e7b0-84c9-4513-9d14-80c53ec13816",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: the Miami Herald editorial board endorses Jolly.",
"d4": false,
"label": "Jolly · 2026-10-01 · Miami Herald Endorses David Jolly For Governor"
},
{
"id": "56c2f400-2262-4875-8a4d-8e5b0415abae",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event as a story already live for Donalds: CFPublic 10-02 'Byron Donalds overstates David Jolly's offshore drilling lobbying ...' (the same PolitiFact piece).",
"d4": false,
"label": "Donalds · 2026-10-02 · Byron Donalds overstates David Jolly’s offshore drilling lob"
},
{
"id": "aaf17418-9356-47a3-82f6-c99fadd72051",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event as a story already live for Jolly: CFPublic 10-02 'Byron Donalds overstates David Jolly's offshore drilling lobbying ...' (the same PolitiFact piece).",
"d4": false,
"label": "Jolly · 2026-10-02 · Byron Donalds overstates David Jolly’s offshore drilling lob"
},
{
"id": "f068a86a-d074-42b5-b43a-eb52dcd22857",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's FAMU town hall (WFSU/WUSF syndicated copy).",
"d4": false,
"label": "Donalds · 2026-10-03 · Gubernatorial candidate Byron Donalds speaks to FAMU for fir"
},
{
"id": "3c083458-7780-4c48-a0f0-95ca5a8e47ea",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's South Florida campaign stops.",
"d4": false,
"label": "Donalds · 2026-10-03 · Donalds campaigns across South Florida as governor’s race he"
},
{
"id": "95ff3b4f-4f06-4ee0-bbba-f93a0f0423aa",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event as a story already live for Donalds: CFPublic 10-02 'Byron Donalds overstates David Jolly's offshore drilling lobbying ...' (the same PolitiFact piece).",
"d4": false,
"label": "Donalds · 2026-10-03 · PolitiFact: Donalds overstates Jolly's offshore drilling lob"
},
{
"id": "4bcd419d-7389-446a-837c-c49c4a799ecc",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event as a story already live for Jolly: CFPublic 10-02 'Byron Donalds overstates David Jolly's offshore drilling lobbying ...' (the same PolitiFact piece).",
"d4": false,
"label": "Jolly · 2026-10-03 · PolitiFact: Donalds overstates Jolly's offshore drilling lob"
},
{
"id": "dc35ab7d-65e4-415b-9119-20ce69768c35",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly on public education during a Sarasota visit.",
"d4": false,
"label": "Jolly · 2026-10-05 · Democrat David Jolly talks of 'public education renaissance'"
},
{
"id": "5e720edb-2be5-4175-9526-43fc8e75b1ad",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier announces the Netflix lawsuit.",
"d4": true,
"label": "Uthmeier · 2026-09-09 · Florida AG Uthmeier sues Netflix, accuses company of trackin"
},
{
"id": "a572a71b-5a89-41c6-9182-efdfae7bfa14",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-09, 'Florida AG Uthmeier sues Netflix, accuses company of tracking child...').",
"d4": true,
"label": "Uthmeier · 2026-09-09 · Florida AG James Uthmeier announces lawsuit against Netflix "
},
{
"id": "88e312d9-faaf-4016-88cd-10e9865d36aa",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier calls for penalties on AI chatbots tied to crimes.",
"d4": false,
"label": "Uthmeier · 2026-09-09 · Uthmeier wants penalties for corporations with AI chatbots t"
},
{
"id": "3c46409b-9d6c-4509-b279-f286f62a8841",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-09, 'Florida AG Uthmeier sues Netflix, accuses company of tracking child...').",
"d4": true,
"label": "Uthmeier · 2026-09-10 · James Uthmeier Alleges Netflix Tracked, Collected Children's"
},
{
"id": "7317ecc6-8815-4060-96bc-a13f08c10351",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier defends the $10 million transfer to political committees.",
"d4": false,
"label": "Uthmeier · 2026-09-10 · James Uthmeier defends funneling $10 million to political co"
},
{
"id": "264a2924-cabc-4381-b28e-3433ab4f6e99",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier announces arrests in a baby-formula theft ring.",
"d4": true,
"label": "Uthmeier · 2026-09-10 · Florida AG announces arrests in alleged $1.1M baby formula t"
},
{
"id": "0a793f50-118d-49f1-b808-b9e28d4ca439",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-10, 'Florida AG announces arrests in alleged $1.1M baby formula theft').",
"d4": true,
"label": "Uthmeier · 2026-09-11 · James Uthmeier Arrests Lake Worth Couple for Alleged Baby Fo"
},
{
"id": "5ced15e1-fefa-43e9-8fc7-9d6fdc1fa221",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier announces the Washington County meth trafficking arrests.",
"d4": true,
"label": "Uthmeier · 2026-09-11 · Uthmeier highlights major Washington County meth trafficking"
},
{
"id": "cf789e92-3f9a-4b69-ab26-26f1ea8ad28b",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-09, 'Florida AG Uthmeier sues Netflix, accuses company of tracking child...').",
"d4": true,
"label": "Uthmeier · 2026-09-14 · Florida Attorney General James Uthmeier Sues Netflix Over Al"
},
{
"id": "297d0273-abc4-4dbf-9544-0379626c7ebe",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-11, 'Uthmeier highlights major Washington County meth trafficking takedown').",
"d4": true,
"label": "Uthmeier · 2026-09-14 · James Uthmeier Announces Arrest of Washington County Drug Tr"
},
{
"id": "ea5a72f6-6c17-4644-bef3-44bb2d196fc9",
"action": "approve",
"note": "Backfill review 10-09: On-subject: an appeals court lets Uthmeier's suit against the American Academy of Pediatrics proceed.",
"d4": true,
"label": "Uthmeier · 2026-09-15 · Federal appeals court clears Florida to sue over transgender"
},
{
"id": "810e28c1-e980-41d3-9c31-306ead5b6cfb",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier's campaign ad featuring sheriffs.",
"d4": true,
"label": "Uthmeier · 2026-09-15 · Florida AG James Uthmeier launches new ad highlighting bipar"
},
{
"id": "2dca9350-453e-43cb-8685-debb3b8d5727",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-15, 'Florida AG James Uthmeier launches new ad highlighting bipartisan s...').",
"d4": true,
"label": "Uthmeier · 2026-09-15 · James Uthmeier Shares Ad Highlighting Support from Florida S"
},
{
"id": "733a9a52-7058-404d-8b85-13cfa45b24e1",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier announces charges in a Lakeland child-abuse case.",
"d4": false,
"label": "Uthmeier · 2026-09-16 · James Uthmeier Charges Man for Allegedly Molesting Girlfrien"
},
{
"id": "089212be-eb53-4f8b-8669-7ce198addc5b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier calls for tougher penalties on phone and text scams (Pembroke Pines event).",
"d4": true,
"label": "Uthmeier · 2026-09-17 · Uthmeier seeks harsher penalties for phone, text scammers"
},
{
"id": "581a54ac-17e1-4f7b-950c-9a879d588c62",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-17, 'Uthmeier seeks harsher penalties for phone, text scammers').",
"d4": true,
"label": "Uthmeier · 2026-09-17 · James Uthmeier Proposes Bill to Crack Down on Fake Calls, Te"
},
{
"id": "7f0a8340-2ff3-4917-97ee-ab6972a067d2",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-17, 'Uthmeier seeks harsher penalties for phone, text scammers').",
"d4": true,
"label": "Uthmeier · 2026-09-17 · Florida AG proposes legislation aimed at shutting down spam "
},
{
"id": "9257a6d5-131c-40fe-82ce-12573ecdf932",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Rodríguez calls for an investigation of 'Alligator Alcatraz'.",
"d4": false,
"label": "Rodriguez · 2026-09-17 · Florida AG Candidate Jose Javier Rodríguez wants probe of 'A"
},
{
"id": "ffab0ee2-8aa7-4ab7-9fc0-8ced08cfaa9d",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier reaches a settlement with Starbucks over its DEI hiring policies.",
"d4": false,
"label": "Uthmeier · 2026-09-18 · Florida, Starbucks Settle Lawsuit Over DEI Employment Polici"
},
{
"id": "43bde20a-7a38-4d8e-b21d-e7b6f0f56f5c",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier calls for a Sarasota teacher to be fired.",
"d4": true,
"label": "Uthmeier · 2026-09-22 · Florida AG calls for Sarasota teacher to be fired, certifica"
},
{
"id": "38246abd-4817-428e-a72a-8daed9bd4af3",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida Daily story kept (09-18, 'Florida, Starbucks Settle Lawsuit Over DEI Employment Policies').",
"d4": false,
"label": "Uthmeier · 2026-09-22 · James Uthmeier Announces Starbucks Discrimination Lawsuit Re"
},
{
"id": "ef18e635-ec94-4d43-bce0-47d1d643cf30",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier sues insulin makers and pharmacy benefit managers.",
"d4": true,
"label": "Uthmeier · 2026-09-22 · Uthmeier takes aim at insulin pricing in new Florida lawsuit"
},
{
"id": "332c05a4-6892-48da-8ba3-b3b4da108aa3",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-22, 'Uthmeier takes aim at insulin pricing in new Florida lawsuit').",
"d4": true,
"label": "Uthmeier · 2026-09-22 · Florida Attorney General Sues Insulin Makers, Pharmacy Benef"
},
{
"id": "2bc7af0c-1163-47a2-805a-86521b7ad409",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier's second statewide TV ad.",
"d4": true,
"label": "Uthmeier · 2026-09-23 · EXCLUSIVE: Uthmeier centers new statewide ad on protecting F"
},
{
"id": "ea0c872e-056f-46da-bc80-871bac863061",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-22, 'Uthmeier takes aim at insulin pricing in new Florida lawsuit').",
"d4": true,
"label": "Uthmeier · 2026-09-23 · James Uthmeier Announces Lawsuit Against Insulin Manufacture"
},
{
"id": "2c341479-28bd-40b7-86be-b521cf4827a8",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-23, 'EXCLUSIVE: Uthmeier centers new statewide ad on protecting Florida ...').",
"d4": true,
"label": "Uthmeier · 2026-09-23 · James Uthmeier Releases Ad Highlighting Record on Protecting"
},
{
"id": "5f91061e-9fb9-4bba-ae51-90b238adf29f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier seeks New York Times records over pension investments.",
"d4": true,
"label": "Uthmeier · 2026-09-23 · Florida AG Uthmeier demands New York Times records, citing c"
},
{
"id": "4d5e2bf6-fe4c-4670-ab6f-ede4344d0e03",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: CatholicVote endorses Uthmeier.",
"d4": true,
"label": "Uthmeier · 2026-09-23 · CatholicVote endorses Uthmeier ahead of November election"
},
{
"id": "e9f363c5-e69a-4436-9216-d380f7a49c41",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier announces 20 election-fraud arrests.",
"d4": false,
"label": "Uthmeier · 2026-09-24 · James Uthmeier Announces Arrest of Twenty People for Electio"
},
{
"id": "48b0d030-ce90-4646-9017-0c1267b7684f",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier The Floridian story kept (09-24, 'James Uthmeier Announces Arrest of Twenty People for Election Fraud').",
"d4": false,
"label": "Uthmeier · 2026-09-24 · Uthmeier, DeSantis announce 20 new election fraud cases acro"
},
{
"id": "83fb37eb-9493-4150-a4c6-56312b2826de",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the Sarasota school probe that followed Uthmeier's call for the teacher's removal.",
"d4": false,
"label": "Uthmeier · 2026-09-24 · Sarasota school probe provides more details after Uthmeier c"
},
{
"id": "323b71ec-8b1e-4d90-afc9-fb7e83ff79a8",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Rodríguez's 'Give 'Em Hell' ad targets Uthmeier (10-06 precedent).",
"d4": false,
"label": "Uthmeier · 2026-09-25 · Jose Javier Rodriguez Releases Ad Attacking James Uthmeier i"
},
{
"id": "71774ed4-ffeb-4d42-af27-0c90bba0f4b5",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Rodríguez releases his 'Give 'Em Hell' ad.",
"d4": false,
"label": "Rodriguez · 2026-09-25 · Jose Javier Rodriguez Releases Ad Attacking James Uthmeier i"
},
{
"id": "1e67b50f-9d4f-4533-a666-9f727920ed00",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier sues construction companies accused of defrauding hurricane victims.",
"d4": true,
"label": "Uthmeier · 2026-09-25 · Florida sues construction companies accused of preying on hu"
},
{
"id": "c02baa29-ed04-434a-ae02-31de1ba075aa",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier The Floridian story kept (09-25, 'Jose Javier Rodriguez Releases Ad Attacking James Uthmeier in AG Bid').",
"d4": false,
"label": "Uthmeier · 2026-09-26 · Democrat José Javier Rodríguez launches 'Give ’Em Hell' stat"
},
{
"id": "789d4729-85b4-451d-a64c-23097105a1a6",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Rodriguez as the earlier The Floridian story kept (09-25, 'Jose Javier Rodriguez Releases Ad Attacking James Uthmeier in AG Bid').",
"d4": false,
"label": "Rodriguez · 2026-09-26 · Democrat José Javier Rodríguez launches 'Give ’Em Hell' stat"
},
{
"id": "9b0f91c6-9e6f-4e73-89ca-b0fcc0438d73",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier The Floridian story kept (09-25, 'Jose Javier Rodriguez Releases Ad Attacking James Uthmeier in AG Bid').",
"d4": false,
"label": "Uthmeier · 2026-09-27 · Democrat José Javier Rodríguez launches 'Give 'Em Hell' ad c"
},
{
"id": "e2d8a6b7-07f1-4168-9835-ea2b0db50abb",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Rodriguez as the earlier The Floridian story kept (09-25, 'Jose Javier Rodriguez Releases Ad Attacking James Uthmeier in AG Bid').",
"d4": false,
"label": "Rodriguez · 2026-09-27 · Democrat José Javier Rodríguez launches 'Give 'Em Hell' ad c"
},
{
"id": "f4bf1893-bc0e-4ed9-b1d9-e082eb043565",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier seeks an injunction against OpenAI.",
"d4": true,
"label": "Uthmeier · 2026-09-28 · Florida AG Uthmeier moves for temporary injunction to block "
},
{
"id": "3def959d-fbc2-4a8f-bd0a-48ac29e3c6ad",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-28, 'Florida AG Uthmeier moves for temporary injunction to block OpenAI ...').",
"d4": true,
"label": "Uthmeier · 2026-09-28 · James Uthmeier Files Temporary Injunction Against OpenAI Ove"
},
{
"id": "b15e7eed-80f8-403d-a230-0a805fe8d0d1",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-28, 'Florida AG Uthmeier moves for temporary injunction to block OpenAI ...').",
"d4": true,
"label": "Uthmeier · 2026-09-28 · Florida AG seeks to halt OpenAI development, citing alleged "
},
{
"id": "eb9272e7-38c4-4eff-9072-0414eccc4fc8",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier announces the Cabinet's terrorist-organization designations.",
"d4": false,
"label": "Uthmeier · 2026-09-29 · DeSantis Administration Designates Antifa, the Muslim Brothe"
},
{
"id": "be94c604-2dc3-445a-8e9d-438c13e36933",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier The Floridian story kept (09-29, 'DeSantis Administration Designates Antifa, the Muslim Brotherhood, ...').",
"d4": false,
"label": "Uthmeier · 2026-09-30 · Florida designates Antifa, Muslim Brotherhood, and CAIR as t"
},
{
"id": "5952a139-8aa5-46b0-965e-ee36ee3c23c1",
"action": "approve",
"note": "Backfill review 10-09: On-subject: WLRN's profile of Rodríguez's campaign.",
"d4": false,
"label": "Rodriguez · 2026-09-30 · 'Crime, costs and corruption': José Javier Rodríguez on the "
},
{
"id": "46e1ab7f-2269-4f47-b82c-e516064c793d",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier's campaign ad featuring a survivor.",
"d4": true,
"label": "Uthmeier · 2026-10-01 · Uthmeier’s latest ad: Survivor says he’s drawing a hard line"
},
{
"id": "e7d7ce27-8e7a-4563-8cbb-bca49bf0a912",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (10-01, 'Uthmeier’s latest ad: Survivor says he’s drawing a hard line agains...').",
"d4": true,
"label": "Uthmeier · 2026-10-01 · (AD) Exploitation Survivor Praises James Uthmeier for Fighti"
},
{
"id": "84daad92-52e1-4b35-a6e4-daaab8f5a293",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier opens an investigation into the Jacksonville Transportation Authority.",
"d4": true,
"label": "Uthmeier · 2026-10-01 · Florida AG launches investigation into Jacksonville transpor"
},
{
"id": "62f9d796-cae5-4ba8-85fc-5821b9cc4027",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Elijah's comments on the FL-7 race.",
"d4": true,
"label": "Elijah · 2026-09-23 · Elijah says voters want consistency, not flip-flops, in Flor"
},
{
"id": "7ba6614f-f8c9-4200-9acc-0ecb58000e09",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Elijah releases his 'At Every Turn' ad.",
"d4": true,
"label": "Elijah · 2026-09-23 · GOP congressional candidate Ryan Elijah rolls out ad campaig"
},
{
"id": "cd839dc3-1e64-47d5-91a5-c72be3150f1a",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Dalton's stated position on federal restrictions on gender-transition care for minors.",
"d4": true,
"label": "Dalton · 2026-09-24 · Democrat Bale Dalton says federal government should not rest"
},
{
"id": "4cdcbba2-2ef3-40a2-91a2-403408fb6031",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the Elijah campaign's response to Dalton.",
"d4": true,
"label": "Elijah · 2026-09-24 · Democrat Bale Dalton says federal government should not rest"
},
{
"id": "ee681428-daab-4a10-bb71-6dcd0d4e1e06",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Dalton as the earlier Florida's Voice story kept (09-24, 'Democrat Bale Dalton says federal government should not restrict tr...').",
"d4": true,
"label": "Dalton · 2026-09-24 · Bale Dalton Seemingly Supports Transgender Surgery for Minor"
},
{
"id": "53a80d98-0cd0-428f-a6a0-668949c3180e",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: Orange County Sheriff John Mina endorses Elijah.",
"d4": true,
"label": "Elijah · 2026-10-01 · Orange County Sheriff John Mina endorses Republican Ryan Eli"
},
{
"id": "12994027-3a52-4476-863f-d8b1a9a11052",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Haridopolos co-introduces the House companion to the STARS Act.",
"d4": false,
"label": "Haridopolos · 2026-09-28 · Florida Lawmakers Push to Bring New U.S. Space Academy to th"
},
{
"id": "9675c5db-92b0-4d1b-8693-a6f2fdd63395",
"action": "approve",
"note": "Backfill review 10-09: On-subject: a Florida's Voice report, from FEC records, on Jenkins's PAC and campaign payments.",
"d4": true,
"label": "Jenkins · 2026-09-29 · EXCLUSIVE: Jennifer Jenkins collected more than $107,000 fro"
},
{
"id": "6be9731d-5a60-450e-a8e4-4d2690671142",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Green's interview criticising Soto's no-tax-on-tips vote.",
"d4": true,
"label": "Green · 2026-09-09 · Dan Green slams Rep. Darren Soto over no-tax-on-tips vote, c"
},
{
"id": "0ab9cfdf-9ecc-4ebf-b610-2e5c337a1106",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Soto's vote record is the story's subject (10-06 precedent for opponent statements).",
"d4": true,
"label": "Soto · 2026-09-09 · Dan Green slams Rep. Darren Soto over no-tax-on-tips vote, c"
},
{
"id": "61ae5ad7-8b3c-4d0b-b617-42d6c4b29345",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Green's campaign remarks.",
"d4": true,
"label": "Green · 2026-09-24 · Dan Green highlights law enforcement support, criticizes int"
},
{
"id": "aa72bc93-539d-4463-833f-20872577d764",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the headline names Green as Soto's challenger in a third-party race ranking (founder 10-09: third-party polls and ratings allowed).",
"d4": true,
"label": "Green · 2026-10-01 · Rep. Darren Soto faces uphill battle as Republican Dan Green"
},
{
"id": "75dcdc2c-c5a3-408b-a22e-69aa546ce263",
"action": "approve",
"note": "Backfill review 10-09: On-subject: CQ Roll Call ranks Soto the most vulnerable House Democrat (third-party rating, founder 10-09).",
"d4": true,
"label": "Soto · 2026-10-01 · Rep. Darren Soto faces uphill battle as Republican Dan Green"
},
{
"id": "859e2484-3c93-4b60-894d-efc5f0cb77ed",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event as a story already live for Soto: CFPublic 10-02 'In Florida's Ninth, Rep. Darren Soto makes his case against stacked odds' (the same story).",
"d4": false,
"label": "Soto · 2026-10-03 · In Florida's Ninth, Rep. Darren Soto makes his case against "
},
{
"id": "c80f448b-2291-41f2-a656-3451b82e20a0",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Castor criticises the EPA's emission-limit rollback.",
"d4": false,
"label": "Castor · 2026-09-15 · Kathy Castor Calls Out Environmental Protection Agency For R"
},
{
"id": "7ea9fbf4-8521-4a57-8b24-5965b58b421f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Beltran says Castor is declining debates (10-06 precedent for statements about a candidate).",
"d4": true,
"label": "Castor · 2026-09-17 · GOP challenger Mike Beltran says Kathy Castor is hiding from"
},
{
"id": "85e2e23b-5c79-4405-9f59-deef619d0502",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Beltran's campaign statement on debates.",
"d4": true,
"label": "Beltran · 2026-09-17 · GOP challenger Mike Beltran says Kathy Castor is hiding from"
},
{
"id": "b577f87a-6fa6-4098-b1e7-c14fa4c4094d",
"action": "approve",
"note": "Backfill review 10-09: On-subject: a Florida's Voice report on Castor's stock trades and financial disclosures (10-06 precedent: reporting on a candidate's disclosures was approved).",
"d4": true,
"label": "Castor · 2026-09-24 · Castor’s fortune soars on timed stock dumps, late filings an"
},
{
"id": "01defd16-3af2-42b9-8308-55925d9e138a",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the House passes Lee's Safe Cloud Storage Act.",
"d4": false,
"label": "Lee · 2026-09-17 · Laurel Lee Celebrates Passage Of Safe Cloud Storage Act"
},
{
"id": "bd644a7e-4760-44f3-862a-829c0ee96d46",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Wasserman Schultz criticises the administration's Venezuela policy.",
"d4": false,
"label": "Schultz · 2026-09-28 · Debbie Wasserman Schultz Calls Out Trump For Leaving Maduro "
},
{
"id": "ab4c94b6-a626-475a-99d9-1bf7c304c129",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Wasserman Schultz tours the Miramar ICE facility.",
"d4": false,
"label": "Schultz · 2026-09-30 · After tour, Wasserman Schultz says ‘unconstitutional torture"
},
{
"id": "2570c177-ffd9-45c7-8fa5-42ab79efb922",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Askar says he will file a bill cutting federal fuel taxes.",
"d4": false,
"label": "Askar · 2026-09-14 · Casey Askar To File Bill That Cuts Current Federal Gas and D"
},
{
"id": "3e7188cd-5cdc-468f-afa2-fe01f80c60ee",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Ocasio-Cortez may campaign for Dandiya (endorsement-type story).",
"d4": false,
"label": "Dandiya · 2026-09-16 · Ocasio-Cortez Open to Campaign in Florida for Democratic Soc"
},
{
"id": "c68f81bc-50c9-4f28-85c1-3c68c75ff9c3",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the NRCC's statement about Dandiya.",
"d4": false,
"label": "Dandiya · 2026-09-16 · National Republican Congressional Committee Warns Of Democra"
},
{
"id": "07576ca8-48b9-435d-bc2f-11a9295b7313",
"action": "approve",
"note": "Backfill review 10-09: On-subject: The Floridian's interview with Askar on the federal gas tax.",
"d4": false,
"label": "Askar · 2026-09-16 · Casey Askar Promises A Permanent Reduction of The Federal Ga"
},
{
"id": "5daa4de5-9c3b-4901-90f3-5bf0e52eb891",
"action": "approve",
"note": "Backfill review 10-09: On-subject: The Floridian's interview with Askar on communism in the hemisphere.",
"d4": false,
"label": "Askar · 2026-09-18 · Casey Askar Affirms the U.S. Must 'Root Out Communism' to Ma"
},
{
"id": "645f0f95-4e9b-452b-9fde-0397636c9b42",
"action": "approve",
"note": "Backfill review 10-09: On-subject: a super PAC's first spending in the race targets Dandiya.",
"d4": false,
"label": "Dandiya · 2026-09-21 · Super PAC hits Progressive Pia Dandiya for Opposing Middle-C"
},
{
"id": "ac43e712-55c0-4541-ad47-0985273a19b4",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Dandiya releases her first general-election ad.",
"d4": false,
"label": "Dandiya · 2026-09-22 · Pia Dandiya Releases First General Election Ad in District 2"
},
{
"id": "c5be76ad-7948-4a44-98f1-5acec802dc1d",
"action": "approve",
"note": "Backfill review 10-09: On-subject: national committees' attacks on Askar.",
"d4": false,
"label": "Askar · 2026-09-30 · Pia Dandiya Called a 'Hypocrite' Over Data Center Investment"
},
{
"id": "72fb4791-ee04-40af-8e53-1b44b75d79a2",
"action": "approve",
"note": "Backfill review 10-09: On-subject: national committees' attacks on Dandiya.",
"d4": false,
"label": "Dandiya · 2026-09-30 · Pia Dandiya Called a 'Hypocrite' Over Data Center Investment"
},
{
"id": "b80a74d3-def3-4fa5-8882-9e819f49d0b4",
"action": "approve",
"note": "Backfill review 10-09: On-subject: The Floridian's interview with Moskowitz.",
"d4": false,
"label": "Moskowitz · 2026-09-16 · Jared Moskowitz Says Republicans Only Focus On Messaging, No"
},
{
"id": "afed38b8-9c13-4059-9add-8d1351650a38",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Singer on Moskowitz and the cancelled Local 10 debate.",
"d4": false,
"label": "Moskowitz · 2026-09-18 · Scott Singer Calls Out Moskowitz For Refusing to Debate on T"
},
{
"id": "a1aab4eb-a53b-4eba-9793-4f4fd0f73e2d",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Singer's statement on the cancelled Local 10 debate.",
"d4": false,
"label": "Singer · 2026-09-18 · Scott Singer Calls Out Moskowitz For Refusing to Debate on T"
},
{
"id": "c66c96ce-bb15-46cd-b15a-bae22e2cc65e",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Moskowitz as the earlier The Floridian story kept (09-18, 'Scott Singer Calls Out Moskowitz For Refusing to Debate on TV').",
"d4": false,
"label": "Moskowitz · 2026-09-18 · Moskowitz ducks Local 10 debate as Singer demands answers on"
},
{
"id": "b7289e81-df1d-4d67-a2c7-465541499dac",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Singer as the earlier The Floridian story kept (09-18, 'Scott Singer Calls Out Moskowitz For Refusing to Debate on TV').",
"d4": false,
"label": "Singer · 2026-09-18 · Moskowitz ducks Local 10 debate as Singer demands answers on"
},
{
"id": "a9ffa799-03a3-4530-8514-a74d86bd51aa",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: the Florida PBA and NFIB endorse Singer.",
"d4": true,
"label": "Singer · 2026-09-24 · Florida PBA, NFIB endorse Scott Singer in bid to defeat Mosk"
},
{
"id": "46db42cf-63eb-4231-8c95-aa30362e424d",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: the U.S. Chamber of Commerce endorses Singer.",
"d4": false,
"label": "Singer · 2026-09-28 · U.S. Chamber of Commerce Endorses Scott Singer in CD 25 Race"
},
{
"id": "ff7fdada-337c-4c53-83f2-ab250f24b282",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: former Rep. Peter Deutsch endorses Singer.",
"d4": false,
"label": "Singer · 2026-09-29 · Former Democratic Congressman Crosses Party Lines To Endorse"
},
{
"id": "789540d6-378a-4e96-806a-872261547338",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Singer as the earlier The Floridian story kept (09-28, 'U.S. Chamber of Commerce Endorses Scott Singer in CD 25 Race').",
"d4": false,
"label": "Singer · 2026-09-30 · Scott Singer earns U.S. Chamber endorsement in Florida’s 25t"
},
{
"id": "51a57c9c-ce6b-45d9-b2fb-36eca89c0101",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Singer's first ad targets Moskowitz (10-06 precedent).",
"d4": true,
"label": "Moskowitz · 2026-10-01 · Scott Singer’s first ad hits Moskowitz over stock trades, bi"
},
{
"id": "123a302e-3b31-4c27-8a52-6444d27c066f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Singer's first general-election ad.",
"d4": true,
"label": "Singer · 2026-10-01 · Scott Singer’s first ad hits Moskowitz over stock trades, bi"
},
{
"id": "ddd31a5e-fca6-48e2-b9ca-7c13ad40612e",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Locklin calls for AI regulation.",
"d4": false,
"label": "Locklin · 2026-09-20 · Florida congressional candidate Nicole Locklin calls for reg"
},
{
"id": "dd983965-ee6d-4d0c-a248-b66df8357367",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Díaz-Balart on Cuba and Venezuela.",
"d4": true,
"label": "Diaz-Balart · 2026-09-25 · Díaz-Balart says Trump pressure could reshape Cuba, Venezuel"
},
{
"id": "a60a5593-48ce-48dc-9700-822caea22782",
"action": "approve",
"note": "Backfill review 10-09: On-subject (Spanish): Díaz-Balart's roadmap for Venezuelan elections.",
"d4": false,
"label": "Diaz-Balart · 2026-10-05 · Mario Díaz-Balart plantea hoja de ruta de tres fases que bus"
},
{
"id": "e9c01034-c34a-4f0f-b462-0214b1a5fae0",
"action": "approve",
"note": "Backfill review 10-09: On-subject, kept as tagged ('related', shown under 'Also about this race'): Salazar says she will give away money raised by a communist agent.",
"d4": false,
"label": "Salazar · 2026-09-10 · Congresswoman Salazar says she will give money raised by com"
},
{
"id": "30f4d869-e8fc-407a-b1e9-d24a72ed1f28",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: South Florida firefighters' union endorses Salazar.",
"d4": false,
"label": "Salazar · 2026-09-10 · South Florida Firefighters Endorse Maria Elvira Salazar for "
},
{
"id": "34bf2808-f8fc-43d2-8d70-0ae73cd1902c",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Salazar's campaign ad breaking with Trump on immigration enforcement.",
"d4": false,
"label": "Salazar · 2026-09-17 · Maria Elvira Salazar Breaks With Trump on Immigration Enforc"
},
{
"id": "caee4b59-4a45-44f2-b79f-ff2296b56468",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Salazar as the earlier The Floridian story kept (09-17, 'Maria Elvira Salazar Breaks With Trump on Immigration Enforcement').",
"d4": false,
"label": "Salazar · 2026-09-17 · Maria Salazar releases new ad pushing back on Trump policies"
},
{
"id": "a273334e-d4b4-4937-85ab-efd3ac2d415c",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Salazar as the earlier The Floridian story kept (09-17, 'Maria Elvira Salazar Breaks With Trump on Immigration Enforcement').",
"d4": false,
"label": "Salazar · 2026-09-17 · Maria Salazar breaks with Trump on immigration enforcement i"
},
{
"id": "416d9d48-402f-4d06-8b95-ceab53ddb52e",
"action": "approve",
"note": "Backfill review 10-09: On-subject (Spanish): a Fox News commentator asks Trump to withdraw his support for Salazar over her ad.",
"d4": false,
"label": "Salazar · 2026-09-17 · TOMI LAHREN PIDE A TRUMP RETIRAR SU APOYO A MARÍA ELVIRA SAL"
},
{
"id": "f63a0156-e3f5-4cb2-9b58-d080c8ccf558",
"action": "approve",
"note": "Backfill review 10-09: On-subject (Spanish): DHS responds to Salazar's criticism of deportations.",
"d4": false,
"label": "Salazar · 2026-09-18 · DHS ante críticas de congresista Salazar sobre deportaciones"
},
{
"id": "6434e064-0bd5-4554-9b09-f4e5f915ec54",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Salazar as the earlier The Floridian story kept (09-17, 'Maria Elvira Salazar Breaks With Trump on Immigration Enforcement').",
"d4": false,
"label": "Salazar · 2026-09-18 · Congresswoman Salazar's new ad challenging Trump on immigrat"
},
{
"id": "883aaf7b-8a4f-4a5e-8174-5f2647ff3413",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Salazar as the earlier The Floridian story kept (09-17, 'Maria Elvira Salazar Breaks With Trump on Immigration Enforcement').",
"d4": false,
"label": "Salazar · 2026-09-18 · In break with Trump, US Rep. Maria Elvira Salazar says his i"
},
{
"id": "c8d27841-aa47-426b-bbd5-eecb201ad566",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Republican and administration pushback against Salazar's ad.",
"d4": true,
"label": "Salazar · 2026-09-18 · GOP Rep. Salazar faces intense backlash after demanding Trum"
},
{
"id": "5d0d3498-ff71-4e83-8265-b15581e18e36",
"action": "approve",
"note": "Backfill review 10-09: On-subject, kept as tagged ('related'): Trump says he supports Salazar despite her ad (WLRN/WUSF syndicated copy).",
"d4": false,
"label": "Salazar · 2026-09-19 · Trump says he supports Miami Congresswoman Salazar despite h"
},
{
"id": "369dca06-e4c6-4fb6-9d78-f7eeeccb1d7c",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Salazar as the earlier WLRN story kept (09-19, 'Trump says he supports Miami Congresswoman Salazar despite her ad s...').",
"d4": false,
"label": "Salazar · 2026-09-21 · Trump says Salazar got ‘a little bit soft on the border’ aft"
},
{
"id": "80642689-827f-4b18-80fa-be5d5cd09f9c",
"action": "approve",
"note": "Backfill review 10-09: On-subject, kept as tagged ('related'): Cook Political Report moves the FL-27 race (third-party rating, same treatment as a poll, founder 10-09).",
"d4": false,
"label": "Salazar · 2026-09-26 · Report: GOP US Rep. Salazar still holds advantage, but race "
},
{
"id": "fbd30e8f-c177-4fde-bb38-106e451135c3",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Eliott Rodriguez criticises Salazar over her ad.",
"d4": false,
"label": "Rodriguez · 2026-09-27 · Democratic candidate Eliott Rodriguez blasts Rep. Maria Elvi"
},
{
"id": "61649b93-6982-419a-964c-915fd1286f6a",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Eliott Rodriguez's criticism of Salazar (10-06 precedent for statements about a candidate).",
"d4": false,
"label": "Salazar · 2026-09-27 · Democratic candidate Eliott Rodriguez blasts Rep. Maria Elvi"
},
{
"id": "01700cb1-adde-4170-956c-81b2eb9b65f6",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Trump's continued criticism of Salazar.",
"d4": false,
"label": "Salazar · 2026-09-27 · Trump continues lashing out at Rep. Maria Elvira Salazar"
},
{
"id": "a612d97c-e1b2-4ee5-a594-6ad42c1e35a0",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Salazar as the earlier Local 10 story kept (09-27, 'Trump continues lashing out at Rep. Maria Elvira Salazar').",
"d4": false,
"label": "Salazar · 2026-09-27 · Trump continúa arremetiendo contra la representante Maria El"
},
{
"id": "9f055da2-db20-42d9-9d7d-14ad5f0a35da",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Salazar as the earlier Local 10 story kept (09-27, 'Trump continues lashing out at Rep. Maria Elvira Salazar').",
"d4": false,
"label": "Salazar · 2026-09-27 · Rift escalates as Trump targets Miami GOP Congresswoman Marí"
},
{
"id": "99f642b5-1587-4212-940a-cc65bce1fdff",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Salazar as the earlier Local 10 story kept (09-27, 'Trump continues lashing out at Rep. Maria Elvira Salazar').",
"d4": false,
"label": "Salazar · 2026-09-28 · Rift escalates as Trump targets Miami GOP Rep. María Elvira "
},
{
"id": "6d37dcb5-e1ce-481b-88bb-34da7c556955",
"action": "approve",
"note": "Backfill review 10-09: On-subject: WLRN's profile of the FL-27 race between Rodriguez and Salazar.",
"d4": false,
"label": "Rodriguez · 2026-10-05 · Two former news anchors, one seat: Inside the tightening rac"
},
{
"id": "bfe1f7b1-e4a4-4d97-8336-190c82a7042f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: WLRN's profile of the FL-27 race between Rodriguez and Salazar.",
"d4": false,
"label": "Salazar · 2026-10-05 · Two former news anchors, one seat: Inside the tightening rac"
},
{
"id": "f9e1fbe1-df1d-45e7-8801-f6f32b71f16f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Local 10 interview with Ehr.",
"d4": false,
"label": "Ehr · 2026-09-13 · This Week in South Florida: Phil Ehr"
},
{
"id": "d48fa4b9-d5f2-4b02-9273-cf94778022fd",
"action": "approve",
"note": "Backfill review 10-09: On-subject (Spanish), kept as tagged ('related'): Giménez's statement on Delcy Rodríguez.",
"d4": false,
"label": "Gimenez · 2026-09-21 · Congresista Giménez llama “sabandija” a Delcy Rodríguez tras"
},
{
"id": "0ba3aab4-e07e-47bd-9225-b77ebfdd9442",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Giménez introduces an affordable-housing bill.",
"d4": false,
"label": "Gimenez · 2026-09-25 · Carlos Gimenez Introduces Bill to Preserve & Protect Afforda"
},
{
"id": "a719c8d4-1c4d-43af-9b0e-5a828aa1250b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Giménez and Scott introduce the SCREEN Act.",
"d4": false,
"label": "Gimenez · 2026-09-28 · Carlos Gimenez & Rick Scott Introduce Bill Cracking Down on "
},
{
"id": "182641b3-f6df-4476-98fa-ba2ee7c01fa6",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Simpson's own on-record statements in the governor's race.",
"d4": true,
"label": "Simpson · 2026-09-17 · Simpson warns Jolly would undo Florida’s conservative gains,"
},
{
"id": "964b6144-e5fc-4784-be84-7c9d2d783a93",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Simpson announces protection of more than 1,000 acres of farmland.",
"d4": true,
"label": "Simpson · 2026-09-18 · Simpson announces permanent protection of more than 1,000 ac"
},
{
"id": "41b89aaa-4bf0-43e4-a909-28923a5220be",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Simpson's fuel relief and weight-limit exemptions for farmers.",
"d4": true,
"label": "Simpson · 2026-09-24 · Wilton Simpson partners with Gov. DeSantis on fuel relief, w"
},
{
"id": "7b6cc89c-51b9-467f-b3e9-235db529ae93",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Simpson announces protection of 4,500 acres of farmland.",
"d4": true,
"label": "Simpson · 2026-09-29 · Simpson announces protection of 4,500 acres of Florida farml"
},
{
"id": "febb3851-f684-4f43-b784-9cd59a479cea",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Simpson as the earlier Florida's Voice story kept (09-29, 'Simpson announces protection of 4,500 acres of Florida farmland').",
"d4": true,
"label": "Simpson · 2026-09-30 · Wilton Simpson Announces Protection of 4,500 Acres of Agricu"
}
];

  if (!location.pathname.startsWith("/admin")) {
    console.error("Run this on the signed-in /admin site, not here.");
    return;
  }
  const todo = DECISIONS.filter((d) => INCLUDE_D4 || !d.d4);
  const nA = todo.filter((d) => d.action === "approve").length;
  const nR = todo.length - nA;
  const held = DECISIONS.length - todo.length;
  const head = `${DRY_RUN ? "DRY RUN — " : ""}${todo.length} decisions: ${nA} approve, ${nR} reject` +
    (held ? ` (${held} held for D4)` : "");
  if (!DRY_RUN && !confirm(`${head}.\n\nSend them now, as you?`)) return;
  console.log(head);

  const log = [];
  window.__backfillLog = log;
  for (const [n, d] of todo.entries()) {
    const tag = `${n + 1}/${todo.length} ${d.action.toUpperCase()} ${d.label}`;
    if (DRY_RUN) {
      console.log(tag);
      continue;
    }
    let res;
    let body = {};
    try {
      res = await fetch(`/api/admin/review/${d.id}/decision`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: d.action, note: d.note }),
      });
      body = await res.json().catch(() => ({}));
    } catch (e) {
      console.error(`STOPPED (network) at ${tag}`, e);
      break;
    }
    const entry = { n: n + 1, id: d.id, action: d.action, http: res.status, status: body.status ?? null,
      apply_error: body.apply_error ?? null, error: body.error ?? null, label: d.label };
    log.push(entry);
    if (res.status === 409) {
      console.warn(`skip (already ${body.status ?? "decided"}) ${tag}`);
      continue;
    }
    const want = d.action === "approve" ? "approved" : "rejected";
    if (!res.ok || body.status !== want) {
      console.error(`STOPPED at ${tag}`, entry);
      break;
    }
    console.log(`ok ${tag}`);
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
  if (!DRY_RUN) console.table(log.map(({ label, ...rest }) => rest));
})();
