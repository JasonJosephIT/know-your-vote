/* Queue review 2026-10-15: the founder's decision loop for the whole pending queue.
 *
 * WHAT IT DOES. Sends 609 drafted decisions to the same route the Approve and
 * Reject buttons use (POST /api/admin/review/:id/decision), one at a time, as
 * you. Every call goes through the route's neutrality lint, source check and
 * audit row. There is no bulk SQL.
 *
 *   - 361 are the 2026-10-09 backfill verdicts, unchanged
 *     (backfill-review-2026-10-09.md; founder answers in its section 2).
 *   - 248 are new: the daily-sweep rows queued 10-08 to 10-15, drafted under
 *     the same rules (queue-review-2026-10-15.md).
 *   - 6 more are left pending with a question for the founder; they are not here.
 *
 * HOW TO RUN.
 *   1. Read queue-review-2026-10-15.md and change any line you disagree with
 *      (edit "action" or "note", or delete the line to leave it pending).
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
 *   - The result log is left in window.__queueLog.
 */
(async () => {
  const DRY_RUN = true;
  const PAUSE_MS = 300;

  const DECISIONS = [
{
"id": "58851a16-b24e-417c-b716-10721aed7261",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: a CBS Miami preview of the attorney general race (Rodríguez vs Uthmeier); Moody is named only as the AG Uthmeier replaced (moody-pipeline-gap-2026-10-09.md (a)).",
"label": "CBS AG preview (Moody) — Previewing the race for Florida's Attorney General: Jose Jav"
},
{
"id": "428a6c58-3cbf-44ab-909f-bde86530d1e1",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup strings unrelated items together; Jolly is one quoted line among many.",
"label": "Jolly · 2026-09-09 · JUICE🍊— 9.9.2026 — GOP Takes Hit With Latino Voters in Swing"
},
{
"id": "f8041286-f0d7-4dac-a50c-5993927c7de3",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup strings unrelated items together; Donalds is one item among many.",
"label": "Donalds · 2026-09-09 · Last Squeeze🍊— 9.9.2026 — New Donalds Ad Strikes Jolly Over "
},
{
"id": "400495b6-f819-4d45-9b4f-33ba37cc89f9",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup strings unrelated items together; Jolly is one item among many.",
"label": "Jolly · 2026-09-09 · Last Squeeze🍊— 9.9.2026 — New Donalds Ad Strikes Jolly Over "
},
{
"id": "4abd25ab-2197-4e0f-aa59-14fc7f33f41b",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Wasserman Schultz is one quoted line among many.",
"label": "Schultz · 2026-09-10 · Last Squeeze🍊— 9.10.2026 — FL Lawmakers Remember Charlie Kir"
},
{
"id": "774721ce-08f8-47d0-a9eb-98c88e4782d7",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Jolly is one quoted line among many.",
"label": "Jolly · 2026-09-11 · JUICE🍊— 9.11.2026 — DeSantis Announces Anti-Communism Educat"
},
{
"id": "394293e1-0134-4305-b07d-6c9f35a7b518",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Donalds is one item among many.",
"label": "Donalds · 2026-09-11 · Last Squeeze🍊— 9.11.2026 — Lawmakers Commemorate 9/11 Annive"
},
{
"id": "1bb8e28e-085e-4055-8d69-3d7de812e7dd",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Nixon is one item among many.",
"label": "Nixon · 2026-09-14 · JUICE🍊— 9.14.2026 — Are Florida Democrats Losing Jewish Vote"
},
{
"id": "79829d0c-7216-40cc-a501-f2e55fd09488",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Moskowitz is one quoted line among many.",
"label": "Moskowitz · 2026-09-14 · Last Squeeze🍊— 9.14.2026 — Second Amendment Sales Tax Holida"
},
{
"id": "ab742471-7bd2-4884-a324-4b0ae3bf6b05",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Jolly is one item among many.",
"label": "Jolly · 2026-09-15 · JUICE🍊— 9.15.2026 — Hakeem Jeffries Endorses David Jolly — M"
},
{
"id": "f1ee7554-7e72-4b53-aea4-4666f71a32d0",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Jolly is one quoted line among many.",
"label": "Jolly · 2026-09-16 · JUICE🍊— 9.16.2026 — DeSantis Awards $5K in Law Enforcement R"
},
{
"id": "8b766d4e-f3b8-4e18-b722-7ac26107952a",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Castor is one item among many.",
"label": "Castor · 2026-09-16 · JUICE🍊— 9.16.2026 — DeSantis Awards $5K in Law Enforcement R"
},
{
"id": "3d70e488-9a56-4a52-ae2c-97a8f49fcc9d",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Nixon is one item among many.",
"label": "Nixon · 2026-09-16 · Last Squeeze🍊— 9.16.2026 — Is AOC Heading to the Sunshine St"
},
{
"id": "a73ec880-60f6-461b-bfba-78884ca172a0",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Dandiya is one item among many.",
"label": "Dandiya · 2026-09-16 · Last Squeeze🍊— 9.16.2026 — Is AOC Heading to the Sunshine St"
},
{
"id": "6a0c4dcc-9121-4518-86be-303c13929156",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Nixon is one quoted line among many.",
"label": "Nixon · 2026-09-17 · JUICE🍊— 9.17.2026 — DeSantis Optimistic About GOP in the Mid"
},
{
"id": "7da0a6fe-6967-4d33-a147-33a1179793ef",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Donalds is one quoted line among many.",
"label": "Donalds · 2026-09-17 · Last Squeeze🍊— 9.17.2026 — Salazar Breaks With Trump on Immi"
},
{
"id": "e5f3e1f2-937a-4b9a-80a5-4d893308fab4",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Salazar is one item among many.",
"label": "Salazar · 2026-09-17 · Last Squeeze🍊— 9.17.2026 — Salazar Breaks With Trump on Immi"
},
{
"id": "9a16ff73-01ba-4481-b2f2-56d5af4278c0",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Uthmeier is one item among many.",
"label": "Uthmeier · 2026-09-18 · JUICE🍊— 9.18.2026 — Uthmeier Cracks Down on Fake Calls, Text"
},
{
"id": "3edc413e-e4df-4368-a14c-a62442d2dc53",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Jolly is one item among many.",
"label": "Jolly · 2026-09-18 · Last Squeeze🍊— 9.18.2026 — Jolly Optimistic About Winning th"
},
{
"id": "4cb2b442-8cb6-4f2b-8878-d85c8307e3e9",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Donalds is one item among many.",
"label": "Donalds · 2026-09-21 · JUICE🍊— 9.21.2026 — Donalds Agrees to Three Debates Against "
},
{
"id": "dbf1e8ec-f78a-42bb-9568-b6ba342bd8f3",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Jolly is one item among many.",
"label": "Jolly · 2026-09-21 · JUICE🍊— 9.21.2026 — Donalds Agrees to Three Debates Against "
},
{
"id": "083f11af-f2d8-4d28-92dc-093cbbb93ea3",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Dandiya is one quoted line among many.",
"label": "Dandiya · 2026-09-21 · JUICE🍊— 9.21.2026 — Donalds Agrees to Three Debates Against "
},
{
"id": "f9dcfc00-a56f-48c0-8ea7-9ae9a46e0f93",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Donalds is one item among many.",
"label": "Donalds · 2026-09-21 · Last Squeeze🍊— 9.21.2026 — Jolly Declines Debates Against Do"
},
{
"id": "8a2cba95-8ae8-46b9-be25-bc074af4e64d",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Jolly is one item among many.",
"label": "Jolly · 2026-09-21 · Last Squeeze🍊— 9.21.2026 — Jolly Declines Debates Against Do"
},
{
"id": "0ecf911b-1cdb-446b-a018-aee25edf9f11",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Donalds is one item among many.",
"label": "Donalds · 2026-09-22 · Last Squeeze🍊— 9.22.2026 — Collins Endorses Donalds for Gove"
},
{
"id": "4cd5bd76-d45c-415f-8d72-f0cab925837c",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Dandiya is one item among many.",
"label": "Dandiya · 2026-09-23 · JUICE🍊— 9.23.2026 — Dandiya Releases First General Election "
},
{
"id": "c90467df-f3e1-400d-bbb1-e150bd5b6b56",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Moody is one quoted line among many.",
"label": "Moody · 2026-09-23 · Last Squeeze🍊— 9.23.2026 — Florida Governor's Race Becomes' "
},
{
"id": "02606001-a327-41e2-95fb-9d3a58525f16",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Jolly is one item among many.",
"label": "Jolly · 2026-09-23 · Last Squeeze🍊— 9.23.2026 — Florida Governor's Race Becomes' "
},
{
"id": "dd99923b-44b8-433f-a198-d02d6f1b1c35",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Uthmeier is one quoted line among many.",
"label": "Uthmeier · 2026-09-23 · Last Squeeze🍊— 9.23.2026 — Florida Governor's Race Becomes' "
},
{
"id": "541de5b8-ad8b-48cd-976c-46404b5c88ca",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Donalds is one quoted line among many.",
"label": "Donalds · 2026-09-24 · JUICE🍊— 9.24.2026 — Uthmeier Highlights Attorney General Rec"
},
{
"id": "55fd418e-d8d6-4ccb-a65b-3d4e5d2160a5",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Uthmeier is one item among many.",
"label": "Uthmeier · 2026-09-24 · JUICE🍊— 9.24.2026 — Uthmeier Highlights Attorney General Rec"
},
{
"id": "bab41f1f-90bc-4e40-811b-7328977dec83",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Nixon is one item among many.",
"label": "Nixon · 2026-09-24 · Last Squeeze🍊— 9.24.2026 — Democratic Socialists Host Angie "
},
{
"id": "ba43da6a-0ef2-4a21-9d71-e72d41a64971",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Nixon is one quoted line among many.",
"label": "Nixon · 2026-09-25 · Last Squeeze🍊— 9.25.2026 — DeSantis Warns Republicans About "
},
{
"id": "5aa27e52-e5dc-41e9-905e-3beb9f327b29",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Nixon is one quoted line among many.",
"label": "Nixon · 2026-09-28 · JUICE🍊— 9.28.2026 — Jolly Ties Donalds to Trump Amid Falling"
},
{
"id": "b6ad1950-d9e1-4d19-b4c8-26dfc6ad25e6",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Donalds is one item among many.",
"label": "Donalds · 2026-09-28 · JUICE🍊— 9.28.2026 — Jolly Ties Donalds to Trump Amid Falling"
},
{
"id": "de0beef3-1d95-4b58-8548-a3d39d1cfc92",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Jolly is one item among many.",
"label": "Jolly · 2026-09-28 · JUICE🍊— 9.28.2026 — Jolly Ties Donalds to Trump Amid Falling"
},
{
"id": "5b4b320d-f167-4e29-9f4d-acd6d5e620c2",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Donalds is one item among many.",
"label": "Donalds · 2026-09-28 · Last Squeeze🍊— 9.28.2026 — Donalds Ad Accuses Jolly of Lobby"
},
{
"id": "4aff4d32-baa2-482a-8121-8930325ed6e8",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Jolly is one item among many.",
"label": "Jolly · 2026-09-28 · Last Squeeze🍊— 9.28.2026 — Donalds Ad Accuses Jolly of Lobby"
},
{
"id": "8f947e54-8589-45c2-a6ca-7cc184ec4e98",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Nixon is one item among many.",
"label": "Nixon · 2026-09-29 · JUICE🍊— 9.29.2026 — Moody Attack Ad Slams 'Socialist' Angie "
},
{
"id": "8c4ad975-08d6-467f-b466-7d139bbd0089",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Moody is one item among many.",
"label": "Moody · 2026-09-29 · JUICE🍊— 9.29.2026 — Moody Attack Ad Slams 'Socialist' Angie "
},
{
"id": "f31936af-dff8-4339-8e4a-c12c405a34ab",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Singer is one item among many.",
"label": "Singer · 2026-09-29 · JUICE🍊— 9.29.2026 — Moody Attack Ad Slams 'Socialist' Angie "
},
{
"id": "98e704aa-abde-4b98-bc54-500eb53e8d10",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Donalds is one item among many.",
"label": "Donalds · 2026-09-29 · Last Squeeze🍊— 9.29.2026 — Donalds Questions Jolly's Politic"
},
{
"id": "11b31e97-7a4a-40be-b0ab-15930a9a4add",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Jolly is one item among many.",
"label": "Jolly · 2026-09-29 · Last Squeeze🍊— 9.29.2026 — Donalds Questions Jolly's Politic"
},
{
"id": "b37ba6a8-a6a1-476d-a631-0813f0faacf4",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Dandiya is one quoted line among many.",
"label": "Dandiya · 2026-09-29 · Last Squeeze🍊— 9.29.2026 — Donalds Questions Jolly's Politic"
},
{
"id": "631e2ff6-2018-41a2-9f1d-255af873ffe7",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Nixon is one quoted line among many.",
"label": "Nixon · 2026-09-30 · Last Squeeze🍊— 9.30.2026 — Bipartisan Support Builds Over De"
},
{
"id": "8952d0f0-b3d9-46c4-83f2-78652e1fb26a",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Nixon is one item among many.",
"label": "Nixon · 2026-10-01 · JUICE🍊— 10.1.2026 — Fried Anticipates 'Revolt' From Democrat"
},
{
"id": "6463cca1-ce80-4d3a-9651-c66a5369b45f",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Donalds is one quoted line among many.",
"label": "Donalds · 2026-10-01 · JUICE🍊— 10.1.2026 — Fried Anticipates 'Revolt' From Democrat"
},
{
"id": "c1988aee-d0c8-44a1-be29-8aec201c40bd",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Jolly is one item among many.",
"label": "Jolly · 2026-10-01 · JUICE🍊— 10.1.2026 — Fried Anticipates 'Revolt' From Democrat"
},
{
"id": "5d8c2977-bc0d-46b6-9d67-ae93ec9a0f9a",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'Last Squeeze' daily roundup; Moskowitz is one quoted line among many.",
"label": "Moskowitz · 2026-10-01 · Last Squeeze🍊— 10.1.2026 — New Florida Laws Take Effect Toda"
},
{
"id": "cbb0a40f-4ed6-4e0e-9d55-647441c51c63",
"action": "reject",
"note": "Backfill review 10-09: [A2/P2] The Floridian's 'JUICE' daily roundup; Nixon is one item among many.",
"label": "Nixon · 2026-10-02 · JUICE🍊— 10.2.2026 — FL GOP Wins Florida Rising Together Laws"
},
{
"id": "67c5f7c1-8986-4a4d-a942-029b1bed6cff",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WLRN story kept for Donalds (byline 'WLRN Public Media | By Mitch Perry, Florida Phoenix'; the WUSF copy credits WLRN).",
"label": "Donalds · 2026-09-16 · Debate about data centers emerges in Donalds-Jolly gubernato"
},
{
"id": "55551a1c-73e8-4771-a3e7-d53862fd1823",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WLRN story kept for Jolly (byline 'WLRN Public Media | By Mitch Perry, Florida Phoenix'; the WUSF copy credits WLRN).",
"label": "Jolly · 2026-09-16 · Debate about data centers emerges in Donalds-Jolly gubernato"
},
{
"id": "d30a05c0-36e1-4ffa-afeb-43a7f9cadd70",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the CL Tampa story kept for Donalds (byline Mitch Perry, Florida Phoenix on all three copies; Florida Phoenix is not one of our outlets, so the earliest copy is kept).",
"label": "Donalds · 2026-09-17 · Jolly and Donalds clash on property insurance proposals"
},
{
"id": "e4da5022-de76-4ac5-b918-1f88f7f57795",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the CL Tampa story kept for Jolly (byline Mitch Perry, Florida Phoenix on all three copies; Florida Phoenix is not one of our outlets, so the earliest copy is kept).",
"label": "Jolly · 2026-09-17 · Jolly and Donalds clash on property insurance proposals"
},
{
"id": "b7795ccc-71fc-4f58-8e84-8ee23a3cd434",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the CL Tampa story kept for Donalds (byline Mitch Perry, Florida Phoenix on all three copies; Florida Phoenix is not one of our outlets, so the earliest copy is kept).",
"label": "Donalds · 2026-09-17 · Jolly and Donalds clash on property insurance proposals"
},
{
"id": "2944b9d9-c0db-47d3-9891-cb25ffe778ff",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the CL Tampa story kept for Jolly (byline Mitch Perry, Florida Phoenix on all three copies; Florida Phoenix is not one of our outlets, so the earliest copy is kept).",
"label": "Jolly · 2026-09-17 · Jolly and Donalds clash on property insurance proposals"
},
{
"id": "6f4b355c-9322-413b-97c4-8cd2f6a2971d",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WLRN story kept for Salazar (byline 'WLRN Public Media | By Sergio Bustos').",
"label": "Salazar · 2026-09-19 · Trump says he supports Miami Congresswoman Salazar despite h"
},
{
"id": "2aead6b7-10cf-4362-88a9-79bbe2ec2bc7",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the CL Tampa story kept for Nixon (byline Mitch Perry, Florida Phoenix on both copies; the earliest copy is kept).",
"label": "Nixon · 2026-09-23 · Angie Nixon to pay fine and do community service for staging"
},
{
"id": "0fa6d162-2638-4702-a141-2a9293077c2b",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WLRN story kept for Donalds (byline 'WLRN Public Media | By Carlton Gillespie'; the summit is WLRN's).",
"label": "Donalds · 2026-09-23 · WLRN Economy Summit: Byron Donalds on making Florida more af"
},
{
"id": "3fa31a5a-f367-4ab5-8ade-a3dd7b864e15",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WLRN story kept for Jolly (byline 'WLRN Public Media | By Carlton Gillespie'; the summit is WLRN's).",
"label": "Jolly · 2026-09-23 · WLRN Economy Summit: David Jolly proposes state-backed disas"
},
{
"id": "c059a9d8-f061-4191-b427-a2a5591ed0b5",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WLRN story kept for Donalds (byline 'WLRN Public Media | By Samantha Putterman | PolitiFact' (WLRN's PolitiFact partnership)).",
"label": "Donalds · 2026-09-24 · Florida governor’s race: Fact-checking Byron Donalds, David "
},
{
"id": "cb45b1bd-73df-441f-8588-57b0f376a39f",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WLRN story kept for Jolly (byline 'WLRN Public Media | By Samantha Putterman | PolitiFact' (WLRN's PolitiFact partnership)).",
"label": "Jolly · 2026-09-24 · Florida governor’s race: Fact-checking Byron Donalds, David "
},
{
"id": "1999ce48-30ef-49e0-8543-38cb20cc0803",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WLRN story kept for Donalds (byline 'WLRN Public Media | By Samantha Putterman | PolitiFact' (WLRN's PolitiFact partnership)).",
"label": "Donalds · 2026-09-24 · Florida governor's race: Fact-checking Byron Donalds and Dav"
},
{
"id": "8f439708-e3a2-48de-94db-a2cb5106024a",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WLRN story kept for Jolly (byline 'WLRN Public Media | By Samantha Putterman | PolitiFact' (WLRN's PolitiFact partnership)).",
"label": "Jolly · 2026-09-24 · Florida governor's race: Fact-checking Byron Donalds and Dav"
},
{
"id": "080bb7b5-3ee2-4af2-91c6-46c53c14ef2c",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WUSF story kept for Jolly (byline 'WUSF | By Steve Newborn').",
"label": "Jolly · 2026-09-28 · David Jolly implores national Democrats to help in the Flori"
},
{
"id": "3090d5e0-59dc-4018-a0cd-5e0b237bcd95",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the CL Tampa story kept for Donalds (byline Mitch Perry, Florida Phoenix on both copies; the earliest copy is kept).",
"label": "Donalds · 2026-09-30 · Byron Donalds says solar power is a ‘fad’ but Florida utilit"
},
{
"id": "3a243150-fc78-49f9-a35f-7b44c613a5ce",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WLRN story kept for Nixon (byline 'WLRN Public Media | By WLRN STAFF').",
"label": "Nixon · 2026-10-03 · U.S. Senate candidate Angie Nixon presses Florida's two sena"
},
{
"id": "779de5ec-4e0d-4ea5-8d1d-4f2afbc8cee1",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Syndicated copy of the WFSU story kept for Donalds (byline 'WFSU', photo by WFSU).",
"label": "Donalds · 2026-10-05 · Gubernatorial candidate Byron Donalds speaks to FAMU for fir"
},
{
"id": "7c1d9e04-bb97-4553-be88-19b41a81a0f9",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] P1: a Florida's Voice guest column ('Skylar Zander: ...') arguing against Jolly's plan; opinion that would show as reporting.",
"label": "Jolly · 2026-09-09 · Skylar Zander: Florida’s insurance reforms must protect home"
},
{
"id": "c9534cd9-9cdb-4665-a368-624a97e196ee",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] P1: a guest op-ed (labelled 'Opinion', by Skylar Zander) against Jolly's plan; opinion that would show as reporting. Same verdict as the Florida's Voice copy.",
"label": "Jolly · 2026-09-11 · Florida’s Insurance Reforms Must Protect Homeowners and Taxp"
},
{
"id": "13266670-3326-4b58-a9c3-1ec09e10da4a",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] P1: a Florida's Voice column ('Brendon Leslie: ...') attacking Dalton; opinion that would show as reporting.",
"label": "Dalton · 2026-09-14 · Brendon Leslie: Bale Dalton won’t ban sex changes on kids an"
},
{
"id": "96129427-3a1b-42fc-9651-c05bb638c8a0",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Paid content: the summary opens 'POLITICAL ADVERTISEMENT Content provided and approved by the David Jolly for Governor campaign'.",
"label": "Jolly · 2026-09-14 · David Jolly Presents an Agenda Focused on Affordability, Ref"
},
{
"id": "c3d07af1-4e16-4cb5-9764-736b7d8e0191",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject and P1: the story is about a Bradenton Times editor, and the dek is in the writer's own evaluative voice ('That is basically a campaign flyer'). The page returned 403, so this rests on the feed headline and dek.",
"label": "Nixon · 2026-09-14 · Bradenton Times editor’s ‘nonpartisan’ act ends with an Angi"
},
{
"id": "011205c4-43d0-4a9b-88c6-c3b14e14cf50",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] P1: a Florida's Voice column ('Bryan Leib: ...') addressed to Jolly; opinion that would show as reporting.",
"label": "Jolly · 2026-09-18 · Bryan Leib: No David Jolly, Florida has nothing to apologize"
},
{
"id": "a585ff28-2055-4ff0-bfa3-05112ab8c88f",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] A Florida Daily talk-show panel on Republican strategy; commentary, and Donalds is a passing mention in the dek.",
"label": "Donalds · 2026-09-09 · VIDEO: Republicans Counting on Culture Wars for Midterm Succ"
},
{
"id": "c3b85605-9ba7-4b42-afc6-e009f9a2c9fb",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: a round-up of Florida officials' 9/11 tributes; Donalds is one of several officials named.",
"label": "Donalds · 2026-09-11 · Florida Officials Commemorate Anniversary of 9/11 Attacks"
},
{
"id": "3f96c3c7-ea8f-406c-9ca2-9eb687adab97",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: an endorsement of Moody; Nixon is named only as the opponent (same test as the Sanders/Nixon story tagged to Moody).",
"label": "Nixon · 2026-09-16 · Former Nicaraguan political prisoner endorses Ashley Moody i"
},
{
"id": "70e20d2d-4aa0-4b66-bcb7-0e13b8a54e32",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: Jolly's reaction to a race-rating change; Donalds is named only as the opponent in the dek.",
"label": "Donalds · 2026-09-18 · David Jolly Expresses Confidence After Analysis Moves Florid"
},
{
"id": "d5fed09e-c36d-4a5f-bdff-7a50169e124a",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: a super PAC ad against Dandiya; Askar is named only as the other candidate in the race.",
"label": "Askar · 2026-09-21 · Super PAC hits Progressive Pia Dandiya for Opposing Middle-C"
},
{
"id": "0246db79-b505-4435-a2de-68913005a390",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: a Florida Democratic Party list of 14 'Take Back Florida' candidates; Dalton is one name on the list.",
"label": "Dalton · 2026-09-21 · Florida Democrats Kickstart 'Take Back Florida' Initiative T"
},
{
"id": "23bf74ec-dfe5-43b2-a0e5-e1a28d495be7",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: Dandiya's first general-election ad; Askar is named only as her opponent in the dek.",
"label": "Askar · 2026-09-22 · Pia Dandiya Releases First General Election Ad in District 2"
},
{
"id": "435f1851-dc93-45e3-ba99-935c6fef0839",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject and form: a Le Floridien 'Analysis' about Haitian-American Republicans; Donalds's North Miami visit is only the news peg.",
"label": "Donalds · 2026-09-23 · Why Do Some Haitian-American Republicans Keep Their Politica"
},
{
"id": "90c491ae-d46b-449f-89bf-bc9585e48ac1",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: a Spanish story about Donalds's campaign website; Jolly appears only in the dek.",
"label": "Jolly · 2026-09-23 · Donalds dice que quitó a Trump de su página para destacar su"
},
{
"id": "68925b4c-f13b-405c-8f9b-0af3ba522cb1",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: a story about Elijah's ad; Dalton is not in the headline and appears only in the dek as a secondary target (same test as the Nixon/Vance story tagged to Moody).",
"label": "Dalton · 2026-09-23 · GOP congressional candidate Ryan Elijah rolls out ad campaig"
},
{
"id": "d1a80eae-dea6-481b-a753-98cbbf3f3bf2",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: a story about Dalton's interview remarks; Elijah is named only as his opponent in the dek.",
"label": "Elijah · 2026-09-24 · Bale Dalton Seemingly Supports Transgender Surgery for Minor"
},
{
"id": "33ee5e61-8988-4c5b-9c41-f0ec16d9505b",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: the PBA and NFIB endorse Singer; Moskowitz is named only as the incumbent Singer is running against.",
"label": "Moskowitz · 2026-09-24 · Florida PBA, NFIB endorse Scott Singer in bid to defeat Mosk"
},
{
"id": "ddba7fa6-9519-4b56-a927-de06ba264aa1",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: Green's campaign remarks; Soto is named only as the incumbent Green is challenging.",
"label": "Soto · 2026-09-24 · Dan Green highlights law enforcement support, criticizes int"
},
{
"id": "5d3243a9-5d93-493a-98c9-567f1ba74b7b",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: a story about Jolly's contribution from Pritzker; Frost is named only as having attended the Orlando rally.",
"label": "Frost · 2026-09-25 · Jolly accepts $50,000 from Pritzker after campaigning with I"
},
{
"id": "f94d9e01-0c17-4ce8-b2a6-41c5870a8484",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: Peter Deutsch endorses Singer; Moskowitz is named only as the incumbent Singer is running against.",
"label": "Moskowitz · 2026-09-29 · Former Democratic Congressman Crosses Party Lines To Endorse"
},
{
"id": "8963b598-2d70-4b33-b59b-a0f13b1b3a93",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: Moody names her county campaign chairs; Nixon is named only as the opponent.",
"label": "Nixon · 2026-09-29 · Moody names campaign chairs in all 67 Florida counties ahead"
},
{
"id": "6f1c0a61-acf8-47fd-a9cb-f7fee3629ae5",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: a Simpson farmland story; Uthmeier is named only in the list of Cabinet members.",
"label": "Uthmeier · 2026-09-30 · Wilton Simpson Announces Protection of 4,500 Acres of Agricu"
},
{
"id": "9d9246e6-3d71-4061-8882-b54614b24423",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: Sanders's support for Nixon; Moody is named only as her opponent.",
"label": "Moody · 2026-09-30 · Bernie Sanders Will Send Portion of His Campaign Funds to Su"
},
{
"id": "16d80f36-4c47-4277-9db2-1ccdacb32a5a",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: a profile of Rodríguez's campaign; Uthmeier is named only as the incumbent he is running against.",
"label": "Uthmeier · 2026-09-30 · 'Crime, costs and corruption': José Javier Rodríguez on the "
},
{
"id": "9cc95bff-ba5c-4cad-ae24-2f9bb9402e2b",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: Nixon's call on Florida's two senators; Moody appears in the dek as one of the two senators addressed.",
"label": "Moody · 2026-10-03 · U.S. Senate candidate Angie Nixon presses Florida's two sena"
},
{
"id": "9473b867-fd9b-47a9-afcc-6ad7e46dfa9f",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: Nixon's response to Vance; Moody appears in the dek only as a secondary target of Nixon's criticism.",
"label": "Moody · 2026-10-04 · Angie Nixon responds after JD Vance says she doesn't belong "
},
{
"id": "4ba01c0b-d08f-4e93-9359-e97d73189a72",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Subject: Jolly's Sarasota visit; Donalds is named only as his opponent.",
"label": "Donalds · 2026-10-05 · Democrat David Jolly talks of 'public education renaissance'"
},
{
"id": "0f7fff6d-c46a-42e3-837c-4a3489b57589",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'touts' in the summary.",
"label": "Moskowitz · 2026-09-10 · In battleground FL-25, Rep. Jared Moskowitz kicks off TV ad "
},
{
"id": "8590beb0-3605-4028-ae67-a72189a2aa93",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'touts' in the title.",
"label": "Bilirakis · 2026-09-16 · Bilirakis touts House passage of AM radio bill for vehicles,"
},
{
"id": "9390038d-a3da-4d3b-bdb0-82c7b90f1f61",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'touts' in the title.",
"label": "Uthmeier · 2026-09-16 · Uthmeier announces charges against man accused of abusing ei"
},
{
"id": "79f0d950-5557-4155-a149-3c79bf9795e5",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'claims' in the summary.",
"label": "Nixon · 2026-09-17 · Angie Nixon: Florida is where ‘black people go to die’"
},
{
"id": "9b17a2cc-778b-4528-892d-751b4af63a48",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'momentum' in the summary.",
"label": "Jolly · 2026-09-23 · Decision Desk HQ Moves Florida Governor's Race from 'Leans R"
},
{
"id": "5d5aa2ca-089c-4eed-ba40-1e33ba6766f0",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'momentum' in the summary.",
"label": "Moody · 2026-09-28 · Reps. Donalds and Haridopolos join Sen. Ashley Moody to push"
},
{
"id": "145fe1c0-c25d-4214-a3bb-47e00fc7a46f",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'momentum' in the summary.",
"label": "Donalds · 2026-09-28 · Reps. Donalds and Haridopolos join Sen. Ashley Moody to push"
},
{
"id": "25a053ff-54d5-43f0-96d0-1faba116b23f",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'momentum' in the summary.",
"label": "Haridopolos · 2026-09-28 · Reps. Donalds and Haridopolos join Sen. Ashley Moody to push"
},
{
"id": "32181d41-ae04-4730-bf35-868533d659da",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'touts' in the title.",
"label": "Moody · 2026-09-29 · Ashley Moody Touts Her Amendment to The Protect College Spor"
},
{
"id": "e3d4e2b7-9d39-464c-8893-a790461cd55d",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'claims' in the title.",
"label": "Uthmeier · 2026-10-01 · Florida sues Pfizer, CEO Albert Bourla over COVID-19 vaccine"
},
{
"id": "e635ce0c-2f6a-4dee-8ef1-accec1474908",
"action": "reject",
"note": "Backfill review 10-09: [AUDIT] Fails the neutrality lint: 'aims to' in the summary.",
"label": "Moody · 2026-10-02 · Rick Scott & Ashley Moody Introduce Bill Banning Oil & Gas P"
},
{
"id": "e5d053b4-ff82-4bf0-b3b6-99b7978e0240",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Nixon's case against Moody.",
"label": "Nixon · 2026-09-10 · There are ‘$10 million reasons’ not to vote for Ashley Moody"
},
{
"id": "3a146879-59af-4941-b6d1-a0e3b8fad8bd",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the story is Nixon's argument about Moody (10-06 precedent for opponent statements).",
"label": "Moody · 2026-09-10 · There are ‘$10 million reasons’ not to vote for Ashley Moody"
},
{
"id": "5a1c3cea-0ada-4c9d-8d29-e298ef1e752d",
"action": "approve",
"note": "Backfill review 10-09: On-subject: The Floridian report (byline Grayson Bakich, no opinion label) on Florida Democrats and Jewish voters; its first section is about Nixon and the body is mostly attributed.",
"label": "Nixon · 2026-09-11 · As Antisemitic Rhetoric Increases, Can Florida Democrats Ret"
},
{
"id": "7717453f-1ad9-4c55-bde5-fbc0e952588d",
"action": "approve",
"note": "Backfill review 10-09: On-subject poll story (founder 10-09: third-party polls about a candidate are allowed): Quantus poll of Moody and Nixon.",
"label": "Nixon · 2026-09-14 · POLL: Ashley Moody Ahead by 7 Points Over Angie Nixon in Sen"
},
{
"id": "3b215415-edfb-4b12-a1a1-463901cdf001",
"action": "approve",
"note": "Backfill review 10-09: On-subject poll story (founder 10-09): Quantus poll of Moody and Nixon.",
"label": "Moody · 2026-09-14 · POLL: Ashley Moody Ahead by 7 Points Over Angie Nixon in Sen"
},
{
"id": "1e390077-0ae9-446a-b5cf-12c4bb714743",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Moody leads a push for red snapper permits.",
"label": "Moody · 2026-09-14 · Moody leads South Atlantic push for new red snapper fishing "
},
{
"id": "3aa37aa3-1270-42ae-8633-b16bd9f2c906",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly's remarks praising Nixon's candidacy (an endorsement-type story about Nixon).",
"label": "Nixon · 2026-09-14 · David Jolly says he’d welcome Kamala Harris, praises sociali"
},
{
"id": "b37bb673-fc74-44eb-bf0b-2dbd03f9a350",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Moody files the STARS Act for a Space Academy in Florida.",
"label": "Moody · 2026-09-16 · Ashley Moody Files Bill to Bring New U.S. Space Academy to F"
},
{
"id": "51976083-80b6-41e5-88cb-d3210079246b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Ocasio-Cortez may campaign for Nixon (endorsement-type story).",
"label": "Nixon · 2026-09-16 · Ocasio-Cortez Open to Campaign in Florida for Democratic Soc"
},
{
"id": "46942937-28a8-42ad-a1f9-a520e519339b",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: a former Nicaraguan political prisoner endorses Moody.",
"label": "Moody · 2026-09-16 · Former Nicaraguan political prisoner endorses Ashley Moody i"
},
{
"id": "f8f331da-e8f3-4a25-b840-d9c94fb5e3b9",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Trump's video attacks Nixon by name (10-06 precedent: the Vance remarks about Nixon were approved).",
"label": "Nixon · 2026-09-18 · Trump: Send Ashley Moody back to the Senate, defeat ‘communi"
},
{
"id": "c4765e04-c23c-4e16-8d0e-cdae7d121d20",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: Trump's video urges Floridians to re-elect Moody.",
"label": "Moody · 2026-09-18 · Trump: Send Ashley Moody back to the Senate, defeat ‘communi"
},
{
"id": "de6fdfe6-7cc4-417a-9a7c-f2e14c45eb4b",
"action": "approve",
"note": "Backfill review 10-09: On-subject poll story (founder 10-09): the InsiderAdvantage poll of Moody and Nixon.",
"label": "Nixon · 2026-09-22 · POLL: Moody leads Nixon by 7 in Florida U.S. Senate race"
},
{
"id": "21ba9faa-fec9-41a0-8a19-4885133c24e7",
"action": "approve",
"note": "Backfill review 10-09: On-subject poll story (founder 10-09): the InsiderAdvantage poll of Moody and Nixon.",
"label": "Moody · 2026-09-22 · POLL: Moody leads Nixon by 7 in Florida U.S. Senate race"
},
{
"id": "f5729b17-3060-42ba-afa3-747fb7af2cf3",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Nixon to pay a fine and do community service over a sit-in.",
"label": "Nixon · 2026-09-23 · Florida Senate candidate Angie Nixon to pay $250 and do comm"
},
{
"id": "5c00f753-adaa-4469-8a50-0beff470cccb",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Moody at the Senate Judiciary hearing on women's sports.",
"label": "Moody · 2026-09-23 · Moody joins female athletes in push to protect women’s sport"
},
{
"id": "7fc0ae31-6b34-40ca-a0ea-1f65fb56ef3b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Nixon attends a New York fundraiser.",
"label": "Nixon · 2026-09-24 · Socialist Angie Nixon Attends NYC Fundraiser Co-Hosted By Fe"
},
{
"id": "223f2ff1-ab1b-40ee-b737-a3f307b2a5ac",
"action": "approve",
"note": "Backfill review 10-09: On-subject poll story (founder 10-09): a statewide poll of Nixon and Moody.",
"label": "Nixon · 2026-09-24 · New Poll Finds NIxon and Moody Nearly Even in Florida Senate"
},
{
"id": "b442e6ec-9d60-4bd4-b671-687eb11938d9",
"action": "approve",
"note": "Backfill review 10-09: On-subject poll story (founder 10-09): a statewide poll of Nixon and Moody.",
"label": "Moody · 2026-09-24 · New Poll Finds NIxon and Moody Nearly Even in Florida Senate"
},
{
"id": "e3e5a9a0-d3e7-4d2d-b8ad-296d7940ea01",
"action": "approve",
"note": "Backfill review 10-09: On-subject: a benefit rally for Nixon at Will's Pub (10-06 precedent: the Nixon USF rally photos were approved).",
"label": "Nixon · 2026-09-24 · Photos: Orlando artists got loud for Angie Nixon at Will's P"
},
{
"id": "cb59f27e-5df0-4ed8-9dfe-4cad300353fa",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Moody questions the FDA nominee on illegal vapes.",
"label": "Moody · 2026-09-25 · Ashley Moody presses FDA nominee to crackdown on Chinese-mad"
},
{
"id": "a35fdb2b-c49e-4eef-ad40-c6a3c768b07b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Nixon's payments to a former staffer (attributed to Fox News).",
"label": "Nixon · 2026-09-25 · Nixon paid thousands to Hamas-praising staffer after years o"
},
{
"id": "02785b57-2676-4e07-934f-1d60ea6a1938",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Moody's ad is about Nixon (10-06 precedent).",
"label": "Nixon · 2026-09-28 · Ashley Moody Releases Ad Attacking Angie Nixon as a Socialis"
},
{
"id": "c3952814-e78b-423f-98f9-f5d2eb00f6ca",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Moody releases an ad about Nixon.",
"label": "Moody · 2026-09-28 · Ashley Moody Releases Ad Attacking Angie Nixon as a Socialis"
},
{
"id": "cdde0120-b627-4fb5-bed9-7e2af15a9f0a",
"action": "approve",
"note": "Backfill review 10-09: On-subject: a House companion to Moody's STARS Act.",
"label": "Moody · 2026-09-28 · Florida Lawmakers Push to Bring New U.S. Space Academy to th"
},
{
"id": "fb146290-dc65-4b25-bf3c-1e542541ae7c",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Moody names campaign chairs in all 67 counties.",
"label": "Moody · 2026-09-29 · Moody names campaign chairs in all 67 Florida counties ahead"
},
{
"id": "15af299a-4d9f-4b91-ad79-01648ebc68e0",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event as a story already live for Nixon: Orlando Weekly 09-30 'Bernie Sanders to give cash boost to Angie Nixon campaign'.",
"label": "Nixon · 2026-09-30 · Bernie Sanders Will Send Portion of His Campaign Funds to Su"
},
{
"id": "0f9627df-5bb1-4350-bec3-f91cb47f231e",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Democratic leaders criticise Moody over town halls and Hope Florida.",
"label": "Moody · 2026-09-30 · 'Where is Ashley Moody?': Dems rip U.S. Senator for avoiding"
},
{
"id": "e8f4b153-3757-4a44-b3a1-dd18b28d9172",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Moody as the earlier CL Tampa story kept (09-30, ''Where is Ashley Moody?': Dems rip U.S. Senator for avoiding voters...').",
"label": "Moody · 2026-09-30 · Florida Democrats blast Sen. Moody for skipping town halls, "
},
{
"id": "ece49917-ac51-425a-bc9d-536b47ee4b03",
"action": "approve",
"note": "Backfill review 10-09: On-subject (Spanish): Nixon condemns conditions at the Miramar ICE office.",
"label": "Nixon · 2026-09-30 · Angie Nixon y Annette Taddeo condenan abusos migratorios de "
},
{
"id": "d413c1d2-9a3c-4c0f-92c5-238f229e0263",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Moody as the earlier CL Tampa story kept (09-30, ''Where is Ashley Moody?': Dems rip U.S. Senator for avoiding voters...').",
"label": "Moody · 2026-10-01 · Democrats slam Ashley Moody amid a heated U.S. Senate race"
},
{
"id": "6a3c10df-af93-4a81-9f7d-606733a43530",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: EMILYs List endorses Nixon.",
"label": "Nixon · 2026-10-01 · Pro-Choice EMILYs List Endorses Angie Nixon for Senate"
},
{
"id": "02767f0a-9b4a-4580-b084-4752f7a1a48f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Moody co-headlines the Lakeland rally with JD Vance.",
"label": "Moody · 2026-10-02 · Vice President JD Vance Touches Down in Florida to Energize "
},
{
"id": "7216fd60-da08-42c9-875c-89a06662d65f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Scott and Moody introduce the Eglin range bill.",
"label": "Moody · 2026-10-02 · Scott, Moody introduce bill to protect Eglin military range "
},
{
"id": "1c1f2ee2-6ab9-4bdf-aa6a-cd4420654102",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event as a story already live for Nixon: CL Tampa 10-02 'JD Vance to Florida U.S. Senate candidate Angie Nixon: ...'.",
"label": "Nixon · 2026-10-02 · In Lakeland visit, JD Vance says Angie Nixon ‘doesn’t belong"
},
{
"id": "7cb869fb-9b7d-4c69-adf6-153ac7d4d23b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Nixon campaigns in Little Haiti and responds to Vance.",
"label": "Nixon · 2026-10-03 · Nixon campaigns in Little Haiti, responds to Vance’s critici"
},
{
"id": "fe348e1e-3ae7-4c40-ad70-5330a7eb56e4",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Nixon presses Florida's senators on Haitian TPS (WLRN/WUSF syndicated copy).",
"label": "Nixon · 2026-10-03 · U.S. Senate candidate Angie Nixon presses Florida's two sena"
},
{
"id": "4c7a3d7c-9228-4c03-b96e-6b2636c0ec4b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Nixon's CBS Miami response to Vance (a separate occasion from the Little Haiti stop).",
"label": "Nixon · 2026-10-04 · Angie Nixon responds after JD Vance says she doesn't belong "
},
{
"id": "60358ff4-6c97-4458-aa71-69bb85ac08de",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Nixon's statement on the Delray Islamic center.",
"label": "Nixon · 2026-10-05 · Nixon backs Delray Islamic center and school, brands questio"
},
{
"id": "3de73a64-e525-444b-b27f-7957d313ec4b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's 09-09 campaign ad on Jolly's insurance plan.",
"label": "Donalds · 2026-09-09 · Byron Donalds Releases Ad Slamming David Jolly's 'Hurricane "
},
{
"id": "3f961611-2f4a-4003-864e-406db440611f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the 09-09 Donalds ad is about Jolly's insurance plan (10-06 precedent: an opponent's ad about a candidate is approved for both).",
"label": "Jolly · 2026-09-09 · Byron Donalds Releases Ad Slamming David Jolly's 'Hurricane "
},
{
"id": "6dd60d16-2be2-4230-8f30-af35f26dd83e",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Donalds as the earlier The Floridian story kept (09-09, 'Byron Donalds Releases Ad Slamming David Jolly's 'Hurricane Tax' Plan').",
"label": "Donalds · 2026-09-09 · Byron Donalds campaign launches ads targeting affordability,"
},
{
"id": "fc992443-3472-4eb6-8365-d7c0fce0228e",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Jolly as the earlier The Floridian story kept (09-09, 'Byron Donalds Releases Ad Slamming David Jolly's 'Hurricane Tax' Plan').",
"label": "Jolly · 2026-09-09 · Byron Donalds campaign launches ads targeting affordability,"
},
{
"id": "70257bcc-a1ed-40d7-b880-4dfb71db7c35",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly campaigns in Broward.",
"label": "Jolly · 2026-09-10 · As governor race heats up, Democrat David Jolly campaigns in"
},
{
"id": "67442ad1-b613-4880-996b-62a6db0892e4",
"action": "approve",
"note": "Backfill review 10-09: On-subject: running mate Bryan Avila speaks for the Donalds ticket.",
"label": "Donalds · 2026-09-11 · Lt. Gov. nominee Bryan Avila highlights years of conservativ"
},
{
"id": "8f414023-ed01-4ce8-a9e4-4c8b86fc536d",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds is to headline WLRN's Sunshine Economy Summit.",
"label": "Donalds · 2026-09-12 · Florida gubernatorial nominees David Jolly and Byron Donalds"
},
{
"id": "071d6676-df26-449f-9f44-8b5c6b5d3776",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly is to headline WLRN's Sunshine Economy Summit.",
"label": "Jolly · 2026-09-12 · Florida gubernatorial nominees David Jolly and Byron Donalds"
},
{
"id": "86637e84-53dd-43f4-b79e-5e14a02ab887",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Local 10 interview with Jolly.",
"label": "Jolly · 2026-09-13 · This Week in South Florida: David Jolly"
},
{
"id": "b392d660-9a6c-4a4f-8a16-cefc8c9bf4db",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the Donalds campaign's response to the Jeffries endorsement of Jolly.",
"label": "Donalds · 2026-09-14 · GOP says Jeffries endorsement reveals Jolly as far-left Demo"
},
{
"id": "34855c41-f45a-4a44-b83b-139b7a892f2f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the story is about the Jeffries endorsement of Jolly and the Donalds campaign's response to it.",
"label": "Jolly · 2026-09-14 · GOP says Jeffries endorsement reveals Jolly as far-left Demo"
},
{
"id": "74db9380-838b-44a1-9ffd-d67cff0c3936",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: the Florida PBA endorses Donalds.",
"label": "Donalds · 2026-09-14 · Florida’s largest police union backs Byron Donalds for gover"
},
{
"id": "055e83f8-b7c0-4569-afb3-7d7a4196c849",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly's CBS Miami interview remarks.",
"label": "Jolly · 2026-09-14 · David Jolly says he’d welcome Kamala Harris, praises sociali"
},
{
"id": "359e0792-2b11-4202-96fe-7b99185e4400",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Donalds as the earlier Florida's Voice story kept (09-14, 'Florida’s largest police union backs Byron Donalds for governor').",
"label": "Donalds · 2026-09-14 · Florida's Largest Police Union Endorses Byron Donalds for Go"
},
{
"id": "4612977e-a08a-486b-a76b-141a1c5ae8c2",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: Hakeem Jeffries endorses Jolly.",
"label": "Jolly · 2026-09-14 · Hakeem Jeffries Endorses David Jolly For Governor"
},
{
"id": "611dfdf9-0e69-42e7-8602-faaf08ac4c69",
"action": "approve",
"note": "Backfill review 10-09: On-subject: a 'Republicans for Jolly' effort launches.",
"label": "Jolly · 2026-09-14 · ‘Republicans for Jolly’ effort launches in St. Petersburg"
},
{
"id": "dc4f98d1-b2ec-413d-a28e-c11e65169369",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds unveils his insurance plan.",
"label": "Donalds · 2026-09-15 · Donalds unveils ‘Bring Down The Bill’ insurance plan, says J"
},
{
"id": "1da0dee1-3be2-4c38-a057-eeaed7d3d8f6",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the story contrasts Donalds's plan with Jolly's proposal (10-06 precedent for opponent statements).",
"label": "Jolly · 2026-09-15 · Donalds unveils ‘Bring Down The Bill’ insurance plan, says J"
},
{
"id": "ee1ca58a-fed4-4eaf-8ae3-2031cc794d19",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's 'Never Apologize' ad.",
"label": "Donalds · 2026-09-15 · Donalds: ‘Never Apologize’ for Florida’s conservative record"
},
{
"id": "f7c70ee7-16be-4925-bff8-223b719de250",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the Donalds ad is about Jolly (10-06 precedent for opponent statements).",
"label": "Jolly · 2026-09-15 · Donalds: ‘Never Apologize’ for Florida’s conservative record"
},
{
"id": "8cf507d9-d92b-49c9-973f-fd8ba87773da",
"action": "approve",
"note": "Backfill review 10-09: On-subject: where Donalds stands on data centers and AI.",
"label": "Donalds · 2026-09-16 · Florida residents are raising the alarms over data centers a"
},
{
"id": "5d66b396-643f-458e-bbbc-9f00c0c03d77",
"action": "approve",
"note": "Backfill review 10-09: On-subject: where Jolly stands on data centers and AI.",
"label": "Jolly · 2026-09-16 · Florida residents are raising the alarms over data centers a"
},
{
"id": "441697fc-630b-4c86-919c-9bcca985d4e3",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the data-centre issue in the Donalds-Jolly race (WLRN/WUSF syndicated copy).",
"label": "Donalds · 2026-09-16 · Debate about data centers emerges in Donalds-Jolly gubernato"
},
{
"id": "1c868db0-e0cd-4c3a-8fcc-1190e157430f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the data-centre issue in the Donalds-Jolly race (WLRN/WUSF syndicated copy).",
"label": "Jolly · 2026-09-16 · Debate about data centers emerges in Donalds-Jolly gubernato"
},
{
"id": "b8165eed-03d2-44a0-89a0-1107d7a46d7a",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: the NRA-PVF endorses Donalds.",
"label": "Donalds · 2026-09-16 · NRA-PVF endorses Byron Donalds for Florida governor, awards "
},
{
"id": "acf2b247-4190-47b7-999a-d569206cb044",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly and Donalds on property insurance (syndicated story, also at WLRN/WUSF).",
"label": "Donalds · 2026-09-17 · Jolly and Donalds clash on how to fix Florida's property ins"
},
{
"id": "efca8cc0-1312-4655-b878-11bc338b51e7",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly and Donalds on property insurance (syndicated story, also at WLRN/WUSF).",
"label": "Jolly · 2026-09-17 · Jolly and Donalds clash on how to fix Florida's property ins"
},
{
"id": "7d9ebe49-d7d1-49d2-ae45-8a2b937ac883",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the Republican Party of Florida chairman's critique of Jolly (10-06 precedent for statements about a candidate).",
"label": "Jolly · 2026-09-17 · GOP Chair Evan Power slams David Jolly’s progressive pivot a"
},
{
"id": "c54aa3fe-55e6-4a74-9e5a-188d47cc55e4",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Simpson urges support for Donalds (an endorsement-type story).",
"label": "Donalds · 2026-09-17 · Simpson warns Jolly would undo Florida’s conservative gains,"
},
{
"id": "d455c50e-804a-4577-801e-e8e88bc9682d",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Simpson's warning is about Jolly (10-06 precedent for statements about a candidate).",
"label": "Jolly · 2026-09-17 · Simpson warns Jolly would undo Florida’s conservative gains,"
},
{
"id": "335c94cf-f131-45c5-944f-ac297b43315a",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's radio interview on Jolly and insurance.",
"label": "Donalds · 2026-09-17 · Donalds says Jolly is playing ‘keep-away,’ calls insurance p"
},
{
"id": "aa9a43b0-d244-4a13-83ad-d3f02fc8b96b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's remarks are about Jolly and his insurance plan (10-06 precedent).",
"label": "Jolly · 2026-09-17 · Donalds says Jolly is playing ‘keep-away,’ calls insurance p"
},
{
"id": "19546433-ee9b-4bc9-8b73-a107f1c962b2",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly's reaction to the Inside Elections rating change.",
"label": "Jolly · 2026-09-18 · David Jolly Expresses Confidence After Analysis Moves Florid"
},
{
"id": "b6eac43b-cea3-4659-a848-d4015a903f0b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the Donalds campaign accepts three debate proposals.",
"label": "Donalds · 2026-09-18 · Donalds campaign accepts three debate proposals spanning Flo"
},
{
"id": "89a81bbd-b612-4543-ae0c-6dcb63c993cd",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the debate challenge is to Jolly (10-06 precedent; debates involve both candidates).",
"label": "Jolly · 2026-09-18 · Donalds campaign accepts three debate proposals spanning Flo"
},
{
"id": "8befe640-46b8-4a48-aa6e-ebef86015b2e",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly's MS Now remarks on Trump and the ballot.",
"label": "Jolly · 2026-09-18 · David Jolly Candidly Welcomes Trump's Name on Ballot in Gove"
},
{
"id": "11e9c2ed-3357-4c9a-af3f-a7f41f1cdcdb",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Donalds as the earlier Florida's Voice story kept (09-18, 'Donalds campaign accepts three debate proposals spanning Florida, s...').",
"label": "Donalds · 2026-09-18 · Byron Donalds Agrees to Three Debates Against David Jolly in"
},
{
"id": "8c0434be-911a-4ad7-9bc1-3eb669bfdc60",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Jolly as the earlier Florida's Voice story kept (09-18, 'Donalds campaign accepts three debate proposals spanning Florida, s...').",
"label": "Jolly · 2026-09-18 · Byron Donalds Agrees to Three Debates Against David Jolly in"
},
{
"id": "827ea869-d5ad-4f74-b0db-26f1bc9eb405",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly says a data-centre ban should be 'on the table'.",
"label": "Jolly · 2026-09-18 · David Jolly says a complete ban on data centers in Florida s"
},
{
"id": "e93a85c0-c8fa-4818-886c-e065ef47d0ac",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly declines debates with Donalds (a debate involves both candidates).",
"label": "Donalds · 2026-09-21 · David Jolly Declines Debates with Byron Donalds in Governor'"
},
{
"id": "5d5b6512-e770-4962-b191-a74279dce2a5",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly declines debates with Donalds.",
"label": "Jolly · 2026-09-21 · David Jolly Declines Debates with Byron Donalds in Governor'"
},
{
"id": "6849cf5b-6ca1-4c70-a746-a086228a35c6",
"action": "approve",
"note": "Backfill review 10-09: On-subject: running mate Bryan Avila's Tampa appearance for the Donalds ticket.",
"label": "Donalds · 2026-09-21 · While in Tampa, Byron Donalds' running mate dodges questions"
},
{
"id": "def8fa30-e4ba-4654-aaef-9b66348753df",
"action": "approve",
"note": "Backfill review 10-09: On-subject: state public campaign financing for Donalds (comparative headline approved verbatim, founder 10-09).",
"label": "Donalds · 2026-09-21 · David Jolly leads Byron Donalds in state campaign funding"
},
{
"id": "e2cb1ea8-d696-447b-902e-607b41944d5d",
"action": "approve",
"note": "Backfill review 10-09: On-subject: state public campaign financing for Jolly (comparative headline approved verbatim, founder 10-09).",
"label": "Jolly · 2026-09-21 · David Jolly leads Byron Donalds in state campaign funding"
},
{
"id": "b0e918d9-a8b3-41aa-9653-f33fe884f5da",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Donalds as the earlier The Floridian story kept (09-21, 'David Jolly Declines Debates with Byron Donalds in Governor's Race').",
"label": "Donalds · 2026-09-21 · Jolly ducks debates against Donalds, drawing GOP charges he "
},
{
"id": "b02d2daa-cc55-45d0-a02a-c3d45f360979",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Jolly as the earlier The Floridian story kept (09-21, 'David Jolly Declines Debates with Byron Donalds in Governor's Race').",
"label": "Jolly · 2026-09-21 · Jolly ducks debates against Donalds, drawing GOP charges he "
},
{
"id": "43c33514-c6e3-4f7c-8b70-f89f442ffe9f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's radio interview on Jolly and debates.",
"label": "Donalds · 2026-09-21 · Donalds says Jolly hiding from voters after Democrat ducks d"
},
{
"id": "d519fa8f-abed-40fe-bc41-3f1ab733e185",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's remarks are about Jolly declining debates (10-06 precedent).",
"label": "Jolly · 2026-09-21 · Donalds says Jolly hiding from voters after Democrat ducks d"
},
{
"id": "1655cddf-5c18-41bb-b718-83bc6eeb2c8a",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: Lt. Gov. Jay Collins endorses Donalds.",
"label": "Donalds · 2026-09-22 · Jay Collins Endorses Byron Donalds 'to Keep Florida Free'"
},
{
"id": "7305b1b6-21f6-45f7-942e-f1fbd0104354",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Donalds as the earlier The Floridian story kept (09-22, 'Jay Collins Endorses Byron Donalds 'to Keep Florida Free'').",
"label": "Donalds · 2026-09-22 · Jay Collins backs Donalds, urges Republicans to unite"
},
{
"id": "5e8f8946-d917-4e02-bc32-eeaf081fa294",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds on reappointing Surgeon General Ladapo.",
"label": "Donalds · 2026-09-22 · While David Jolly says he'd fire Joseph Ladapo as surgeon ge"
},
{
"id": "35c08b3e-3cfd-43e3-9c6b-728ce637c000",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly says he would fire Surgeon General Ladapo.",
"label": "Jolly · 2026-09-22 · While David Jolly says he'd fire Joseph Ladapo as surgeon ge"
},
{
"id": "888aaab8-f83b-4082-b10e-2962692490c5",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's campaign website and Trump mentions.",
"label": "Donalds · 2026-09-23 · Byron Donalds Removes Mentions of Trump On Campaign Website"
},
{
"id": "cbb8ec6a-357d-4f1e-9faf-ab72f9a213f6",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: NFIB Florida endorses Donalds.",
"label": "Donalds · 2026-09-23 · NFIB Florida backs Byron Donalds for governor, citing plan t"
},
{
"id": "a3c65858-29d4-4a60-ae54-7ccbc8321301",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds explains why his website dropped Trump references.",
"label": "Donalds · 2026-09-23 · Florida gubernatorial candidate Byron Donalds explains why h"
},
{
"id": "f68c1498-e49f-4119-a6b8-fa0f9b48aa66",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's 'You Foot The Bill' ad.",
"label": "Donalds · 2026-09-23 · Donalds releases ‘You Foot The Bill’ ad targeting Jolly insu"
},
{
"id": "84f1101e-9d7f-4207-9a01-ae3656be5183",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the Donalds ad is about Jolly's insurance plan (10-06 precedent).",
"label": "Jolly · 2026-09-23 · Donalds releases ‘You Foot The Bill’ ad targeting Jolly insu"
},
{
"id": "3248d51e-d8f2-488b-bafd-f4e7ef852d6e",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds at WLRN's Sunshine Economy Summit (WLRN's own event; WLRN/WUSF syndicated copy).",
"label": "Donalds · 2026-09-23 · WLRN Economy Summit: Byron Donalds on making Florida more af"
},
{
"id": "6abc4983-4eeb-4346-8e0d-6b9f931d55a6",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly at WLRN's Sunshine Economy Summit (WLRN's own event; WLRN/WUSF syndicated copy).",
"label": "Jolly · 2026-09-23 · WLRN Economy Summit: David Jolly proposes state-backed disas"
},
{
"id": "a5949450-c3e3-4c08-be2c-25556ebec82f",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Donalds as the earlier WLRN story kept (09-23, 'WLRN Economy Summit: Byron Donalds on making Florida more affordabl...').",
"label": "Donalds · 2026-09-23 · Byron Donalds, David Jolly outline differences on property t"
},
{
"id": "29e44970-7dbc-44e7-a2e8-48007f6fd3b6",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Jolly as the earlier WLRN story kept (09-23, 'WLRN Economy Summit: David Jolly proposes state-backed disaster ins...').",
"label": "Jolly · 2026-09-23 · Byron Donalds, David Jolly outline differences on property t"
},
{
"id": "43e1840b-0d35-449c-935a-e4fdc6af8be7",
"action": "approve",
"note": "Backfill review 10-09: On-subject: a fact-check of Donalds's summit statements (CFPublic/WLRN/WFSU syndicated copy).",
"label": "Donalds · 2026-09-24 · Florida governor’s race: Fact-checking Byron Donalds, David "
},
{
"id": "e1ca18c6-f293-461f-8136-1d90ff251351",
"action": "approve",
"note": "Backfill review 10-09: On-subject: a fact-check of Jolly's summit statements (CFPublic/WLRN/WFSU syndicated copy).",
"label": "Jolly · 2026-09-24 · Florida governor’s race: Fact-checking Byron Donalds, David "
},
{
"id": "7912ef3c-2b4a-428d-8d02-2108aa2ad35c",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's Stuart affordability roundtable.",
"label": "Donalds · 2026-09-24 · Donalds outlines insurance, health cost plans at Stuart affo"
},
{
"id": "590e1c32-9d36-41d7-86b8-c86d95874765",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly's remarks are about Donalds and Trump (10-06 precedent for statements about a candidate).",
"label": "Donalds · 2026-09-25 · David Jolly Ties Byron Donalds to Trump Amid Falling Poll Nu"
},
{
"id": "cd6e86a5-67f2-48de-ba9a-7df0ae330e10",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly's MS Now remarks on Donalds and Trump.",
"label": "Jolly · 2026-09-25 · David Jolly Ties Byron Donalds to Trump Amid Falling Poll Nu"
},
{
"id": "83ae3544-fea7-4599-af1f-90c6e5a57102",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the Donalds campaign's statement about the Pritzker contribution.",
"label": "Donalds · 2026-09-25 · Jolly accepts $50,000 from Pritzker after campaigning with I"
},
{
"id": "63345b3b-ee00-49ef-8566-8a09652a5dc3",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly accepts $50,000 from Pritzker.",
"label": "Jolly · 2026-09-25 · Jolly accepts $50,000 from Pritzker after campaigning with I"
},
{
"id": "79b31819-9534-4d6c-ae92-c5754d50691b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly at the Tampa Tiger Bay Club asks national Democrats for help.",
"label": "Jolly · 2026-09-26 · David Jolly implores national Democrats to help his campaign"
},
{
"id": "09350dad-63d2-4542-8f05-d271d0e89137",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Jolly as the earlier WUSF story kept (09-26, 'David Jolly implores national Democrats to help his campaign for go...').",
"label": "Jolly · 2026-09-27 · David Jolly to national Democrats: Show me some money for go"
},
{
"id": "a6db63d1-2454-4474-9f79-6df0569ec0e7",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Trump to headline rallies for Donalds.",
"label": "Donalds · 2026-09-28 · Trump to Join Byron Donalds at Campaign Rallies"
},
{
"id": "af6e64b3-93e7-41ad-900a-737eb7b42ba6",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's ad on Jolly's lobbying.",
"label": "Donalds · 2026-09-28 · New Byron Donalds Ad Accuses David Jolly of Lobbying For Oil"
},
{
"id": "827c90ea-632d-43e7-93fb-e4c80cd54930",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the Donalds ad is about Jolly's lobbying record (10-06 precedent).",
"label": "Jolly · 2026-09-28 · New Byron Donalds Ad Accuses David Jolly of Lobbying For Oil"
},
{
"id": "9c5221f9-55ae-4cd9-b524-813214794e7b",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Jolly as the earlier WUSF story kept (09-26, 'David Jolly implores national Democrats to help his campaign for go...').",
"label": "Jolly · 2026-09-28 · David Jolly: 'I need the national Democratic Party to come i"
},
{
"id": "c44362de-116f-4e9d-88bf-012eca66ac28",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Donalds as the earlier Florida Daily story kept (09-28, 'Trump to Join Byron Donalds at Campaign Rallies').",
"label": "Donalds · 2026-09-28 · Trump slams ‘fake story’ that Donalds dropped him, reaffirms"
},
{
"id": "34ee6649-620e-4c6f-b63b-f90b1bdf8f3f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds introduces the House companion to the STARS Act.",
"label": "Donalds · 2026-09-28 · Florida Lawmakers Push to Bring New U.S. Space Academy to th"
},
{
"id": "bfd7c85a-d06d-4ffc-a2c8-acb07062498b",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Donalds as the earlier The Floridian story kept (09-28, 'New Byron Donalds Ad Accuses David Jolly of Lobbying For Oil Drilling').",
"label": "Donalds · 2026-09-28 · Donalds: Jolly cashed in on Gulf drilling after oil wrecked "
},
{
"id": "96517703-b5ca-48e9-ab70-32af7c0582d6",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Jolly as the earlier The Floridian story kept (09-28, 'New Byron Donalds Ad Accuses David Jolly of Lobbying For Oil Drilling').",
"label": "Jolly · 2026-09-28 · Donalds: Jolly cashed in on Gulf drilling after oil wrecked "
},
{
"id": "654f81c8-dbbd-4598-b0a1-c3f6b9973904",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's 09-29 X post and his remarks to The Floridian about Jolly. The article (Javier Manjarres) is mostly attributed, with some unattributed characterisation.",
"label": "Donalds · 2026-09-29 · Byron Donalds Questions Who the Real David Jolly is"
},
{
"id": "b1cf71c5-370d-48f2-838a-cf179ff8c0dc",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's remarks are about Jolly (10-06 precedent). Same article and same form verdict as the Donalds row.",
"label": "Jolly · 2026-09-29 · Byron Donalds Questions Who the Real David Jolly is"
},
{
"id": "cdf2c73e-ff11-4d0c-b9bf-ce97e84310d5",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's Kissimmee speech.",
"label": "Donalds · 2026-09-29 · Donalds pledges 20% insurance cut, backs property tax relief"
},
{
"id": "2f35cd29-782d-4e15-b837-b4eb8cd771dd",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the headline names Jolly as the target of Donalds's criticism (10-06 precedent).",
"label": "Jolly · 2026-09-29 · Donalds pledges 20% insurance cut, backs property tax relief"
},
{
"id": "60ee7b12-83a4-4026-ace7-f4107708215b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's statement on solar and utilities' solar expansion (CL Tampa/WLRN syndicated copy).",
"label": "Donalds · 2026-09-30 · Byron Donalds says 'its a fad,' but Florida utilities are ex"
},
{
"id": "e5bf8756-26cf-4d5a-9f94-48e07086f8bd",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's Fort Walton Beach rally.",
"label": "Donalds · 2026-09-30 · Donalds tells Fort Walton Beach crowd Florida must stay ‘the"
},
{
"id": "caa402e3-6d9a-4ab2-b8ed-6989796df357",
"action": "approve",
"note": "Backfill review 10-09: On-subject: a Florida Daily fact-check of Donalds's '$1,000 hurricane tax' claim (10-06 precedent: the PolitiFact fact-check was approved).",
"label": "Donalds · 2026-09-30 · Fact Check: Would David Jolly’s Insurance Plan Cost Florida "
},
{
"id": "7a7adf44-e9ee-4a3c-a970-b12bdfb7f2da",
"action": "approve",
"note": "Backfill review 10-09: On-subject: a Florida Daily fact-check of the claim about Jolly's insurance plan (10-06 precedent).",
"label": "Jolly · 2026-09-30 · Fact Check: Would David Jolly’s Insurance Plan Cost Florida "
},
{
"id": "baf8e7b0-84c9-4513-9d14-80c53ec13816",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: the Miami Herald editorial board endorses Jolly.",
"label": "Jolly · 2026-10-01 · Miami Herald Endorses David Jolly For Governor"
},
{
"id": "56c2f400-2262-4875-8a4d-8e5b0415abae",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event as a story already live for Donalds: CFPublic 10-02 'Byron Donalds overstates David Jolly's offshore drilling lobbying ...' (the same PolitiFact piece).",
"label": "Donalds · 2026-10-02 · Byron Donalds overstates David Jolly’s offshore drilling lob"
},
{
"id": "aaf17418-9356-47a3-82f6-c99fadd72051",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event as a story already live for Jolly: CFPublic 10-02 'Byron Donalds overstates David Jolly's offshore drilling lobbying ...' (the same PolitiFact piece).",
"label": "Jolly · 2026-10-02 · Byron Donalds overstates David Jolly’s offshore drilling lob"
},
{
"id": "f068a86a-d074-42b5-b43a-eb52dcd22857",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's FAMU town hall (WFSU/WUSF syndicated copy).",
"label": "Donalds · 2026-10-03 · Gubernatorial candidate Byron Donalds speaks to FAMU for fir"
},
{
"id": "3c083458-7780-4c48-a0f0-95ca5a8e47ea",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Donalds's South Florida campaign stops.",
"label": "Donalds · 2026-10-03 · Donalds campaigns across South Florida as governor’s race he"
},
{
"id": "95ff3b4f-4f06-4ee0-bbba-f93a0f0423aa",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event as a story already live for Donalds: CFPublic 10-02 'Byron Donalds overstates David Jolly's offshore drilling lobbying ...' (the same PolitiFact piece).",
"label": "Donalds · 2026-10-03 · PolitiFact: Donalds overstates Jolly's offshore drilling lob"
},
{
"id": "4bcd419d-7389-446a-837c-c49c4a799ecc",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event as a story already live for Jolly: CFPublic 10-02 'Byron Donalds overstates David Jolly's offshore drilling lobbying ...' (the same PolitiFact piece).",
"label": "Jolly · 2026-10-03 · PolitiFact: Donalds overstates Jolly's offshore drilling lob"
},
{
"id": "dc35ab7d-65e4-415b-9119-20ce69768c35",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Jolly on public education during a Sarasota visit.",
"label": "Jolly · 2026-10-05 · Democrat David Jolly talks of 'public education renaissance'"
},
{
"id": "5e720edb-2be5-4175-9526-43fc8e75b1ad",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier announces the Netflix lawsuit.",
"label": "Uthmeier · 2026-09-09 · Florida AG Uthmeier sues Netflix, accuses company of trackin"
},
{
"id": "a572a71b-5a89-41c6-9182-efdfae7bfa14",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-09, 'Florida AG Uthmeier sues Netflix, accuses company of tracking child...').",
"label": "Uthmeier · 2026-09-09 · Florida AG James Uthmeier announces lawsuit against Netflix "
},
{
"id": "88e312d9-faaf-4016-88cd-10e9865d36aa",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier calls for penalties on AI chatbots tied to crimes.",
"label": "Uthmeier · 2026-09-09 · Uthmeier wants penalties for corporations with AI chatbots t"
},
{
"id": "3c46409b-9d6c-4509-b279-f286f62a8841",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-09, 'Florida AG Uthmeier sues Netflix, accuses company of tracking child...').",
"label": "Uthmeier · 2026-09-10 · James Uthmeier Alleges Netflix Tracked, Collected Children's"
},
{
"id": "7317ecc6-8815-4060-96bc-a13f08c10351",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier defends the $10 million transfer to political committees.",
"label": "Uthmeier · 2026-09-10 · James Uthmeier defends funneling $10 million to political co"
},
{
"id": "264a2924-cabc-4381-b28e-3433ab4f6e99",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier announces arrests in a baby-formula theft ring.",
"label": "Uthmeier · 2026-09-10 · Florida AG announces arrests in alleged $1.1M baby formula t"
},
{
"id": "0a793f50-118d-49f1-b808-b9e28d4ca439",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-10, 'Florida AG announces arrests in alleged $1.1M baby formula theft').",
"label": "Uthmeier · 2026-09-11 · James Uthmeier Arrests Lake Worth Couple for Alleged Baby Fo"
},
{
"id": "5ced15e1-fefa-43e9-8fc7-9d6fdc1fa221",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier announces the Washington County meth trafficking arrests.",
"label": "Uthmeier · 2026-09-11 · Uthmeier highlights major Washington County meth trafficking"
},
{
"id": "cf789e92-3f9a-4b69-ab26-26f1ea8ad28b",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-09, 'Florida AG Uthmeier sues Netflix, accuses company of tracking child...').",
"label": "Uthmeier · 2026-09-14 · Florida Attorney General James Uthmeier Sues Netflix Over Al"
},
{
"id": "297d0273-abc4-4dbf-9544-0379626c7ebe",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-11, 'Uthmeier highlights major Washington County meth trafficking takedown').",
"label": "Uthmeier · 2026-09-14 · James Uthmeier Announces Arrest of Washington County Drug Tr"
},
{
"id": "ea5a72f6-6c17-4644-bef3-44bb2d196fc9",
"action": "approve",
"note": "Backfill review 10-09: On-subject: an appeals court lets Uthmeier's suit against the American Academy of Pediatrics proceed.",
"label": "Uthmeier · 2026-09-15 · Federal appeals court clears Florida to sue over transgender"
},
{
"id": "810e28c1-e980-41d3-9c31-306ead5b6cfb",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier's campaign ad featuring sheriffs.",
"label": "Uthmeier · 2026-09-15 · Florida AG James Uthmeier launches new ad highlighting bipar"
},
{
"id": "2dca9350-453e-43cb-8685-debb3b8d5727",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-15, 'Florida AG James Uthmeier launches new ad highlighting bipartisan s...').",
"label": "Uthmeier · 2026-09-15 · James Uthmeier Shares Ad Highlighting Support from Florida S"
},
{
"id": "733a9a52-7058-404d-8b85-13cfa45b24e1",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier announces charges in a Lakeland child-abuse case.",
"label": "Uthmeier · 2026-09-16 · James Uthmeier Charges Man for Allegedly Molesting Girlfrien"
},
{
"id": "089212be-eb53-4f8b-8669-7ce198addc5b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier calls for tougher penalties on phone and text scams (Pembroke Pines event).",
"label": "Uthmeier · 2026-09-17 · Uthmeier seeks harsher penalties for phone, text scammers"
},
{
"id": "581a54ac-17e1-4f7b-950c-9a879d588c62",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-17, 'Uthmeier seeks harsher penalties for phone, text scammers').",
"label": "Uthmeier · 2026-09-17 · James Uthmeier Proposes Bill to Crack Down on Fake Calls, Te"
},
{
"id": "7f0a8340-2ff3-4917-97ee-ab6972a067d2",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-17, 'Uthmeier seeks harsher penalties for phone, text scammers').",
"label": "Uthmeier · 2026-09-17 · Florida AG proposes legislation aimed at shutting down spam "
},
{
"id": "9257a6d5-131c-40fe-82ce-12573ecdf932",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Rodríguez calls for an investigation of 'Alligator Alcatraz'.",
"label": "Rodriguez · 2026-09-17 · Florida AG Candidate Jose Javier Rodríguez wants probe of 'A"
},
{
"id": "ffab0ee2-8aa7-4ab7-9fc0-8ced08cfaa9d",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier reaches a settlement with Starbucks over its DEI hiring policies.",
"label": "Uthmeier · 2026-09-18 · Florida, Starbucks Settle Lawsuit Over DEI Employment Polici"
},
{
"id": "43bde20a-7a38-4d8e-b21d-e7b6f0f56f5c",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier calls for a Sarasota teacher to be fired.",
"label": "Uthmeier · 2026-09-22 · Florida AG calls for Sarasota teacher to be fired, certifica"
},
{
"id": "38246abd-4817-428e-a72a-8daed9bd4af3",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida Daily story kept (09-18, 'Florida, Starbucks Settle Lawsuit Over DEI Employment Policies').",
"label": "Uthmeier · 2026-09-22 · James Uthmeier Announces Starbucks Discrimination Lawsuit Re"
},
{
"id": "ef18e635-ec94-4d43-bce0-47d1d643cf30",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier sues insulin makers and pharmacy benefit managers.",
"label": "Uthmeier · 2026-09-22 · Uthmeier takes aim at insulin pricing in new Florida lawsuit"
},
{
"id": "332c05a4-6892-48da-8ba3-b3b4da108aa3",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-22, 'Uthmeier takes aim at insulin pricing in new Florida lawsuit').",
"label": "Uthmeier · 2026-09-22 · Florida Attorney General Sues Insulin Makers, Pharmacy Benef"
},
{
"id": "2bc7af0c-1163-47a2-805a-86521b7ad409",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier's second statewide TV ad.",
"label": "Uthmeier · 2026-09-23 · EXCLUSIVE: Uthmeier centers new statewide ad on protecting F"
},
{
"id": "ea0c872e-056f-46da-bc80-871bac863061",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-22, 'Uthmeier takes aim at insulin pricing in new Florida lawsuit').",
"label": "Uthmeier · 2026-09-23 · James Uthmeier Announces Lawsuit Against Insulin Manufacture"
},
{
"id": "2c341479-28bd-40b7-86be-b521cf4827a8",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-23, 'EXCLUSIVE: Uthmeier centers new statewide ad on protecting Florida ...').",
"label": "Uthmeier · 2026-09-23 · James Uthmeier Releases Ad Highlighting Record on Protecting"
},
{
"id": "5f91061e-9fb9-4bba-ae51-90b238adf29f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier seeks New York Times records over pension investments.",
"label": "Uthmeier · 2026-09-23 · Florida AG Uthmeier demands New York Times records, citing c"
},
{
"id": "4d5e2bf6-fe4c-4670-ab6f-ede4344d0e03",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: CatholicVote endorses Uthmeier.",
"label": "Uthmeier · 2026-09-23 · CatholicVote endorses Uthmeier ahead of November election"
},
{
"id": "e9f363c5-e69a-4436-9216-d380f7a49c41",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier announces 20 election-fraud arrests.",
"label": "Uthmeier · 2026-09-24 · James Uthmeier Announces Arrest of Twenty People for Electio"
},
{
"id": "48b0d030-ce90-4646-9017-0c1267b7684f",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier The Floridian story kept (09-24, 'James Uthmeier Announces Arrest of Twenty People for Election Fraud').",
"label": "Uthmeier · 2026-09-24 · Uthmeier, DeSantis announce 20 new election fraud cases acro"
},
{
"id": "83fb37eb-9493-4150-a4c6-56312b2826de",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the Sarasota school probe that followed Uthmeier's call for the teacher's removal.",
"label": "Uthmeier · 2026-09-24 · Sarasota school probe provides more details after Uthmeier c"
},
{
"id": "323b71ec-8b1e-4d90-afc9-fb7e83ff79a8",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Rodríguez's 'Give 'Em Hell' ad targets Uthmeier (10-06 precedent).",
"label": "Uthmeier · 2026-09-25 · Jose Javier Rodriguez Releases Ad Attacking James Uthmeier i"
},
{
"id": "71774ed4-ffeb-4d42-af27-0c90bba0f4b5",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Rodríguez releases his 'Give 'Em Hell' ad.",
"label": "Rodriguez · 2026-09-25 · Jose Javier Rodriguez Releases Ad Attacking James Uthmeier i"
},
{
"id": "1e67b50f-9d4f-4533-a666-9f727920ed00",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier sues construction companies accused of defrauding hurricane victims.",
"label": "Uthmeier · 2026-09-25 · Florida sues construction companies accused of preying on hu"
},
{
"id": "c02baa29-ed04-434a-ae02-31de1ba075aa",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier The Floridian story kept (09-25, 'Jose Javier Rodriguez Releases Ad Attacking James Uthmeier in AG Bid').",
"label": "Uthmeier · 2026-09-26 · Democrat José Javier Rodríguez launches 'Give ’Em Hell' stat"
},
{
"id": "789d4729-85b4-451d-a64c-23097105a1a6",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Rodriguez as the earlier The Floridian story kept (09-25, 'Jose Javier Rodriguez Releases Ad Attacking James Uthmeier in AG Bid').",
"label": "Rodriguez · 2026-09-26 · Democrat José Javier Rodríguez launches 'Give ’Em Hell' stat"
},
{
"id": "9b0f91c6-9e6f-4e73-89ca-b0fcc0438d73",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier The Floridian story kept (09-25, 'Jose Javier Rodriguez Releases Ad Attacking James Uthmeier in AG Bid').",
"label": "Uthmeier · 2026-09-27 · Democrat José Javier Rodríguez launches 'Give 'Em Hell' ad c"
},
{
"id": "e2d8a6b7-07f1-4168-9835-ea2b0db50abb",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Rodriguez as the earlier The Floridian story kept (09-25, 'Jose Javier Rodriguez Releases Ad Attacking James Uthmeier in AG Bid').",
"label": "Rodriguez · 2026-09-27 · Democrat José Javier Rodríguez launches 'Give 'Em Hell' ad c"
},
{
"id": "f4bf1893-bc0e-4ed9-b1d9-e082eb043565",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier seeks an injunction against OpenAI.",
"label": "Uthmeier · 2026-09-28 · Florida AG Uthmeier moves for temporary injunction to block "
},
{
"id": "3def959d-fbc2-4a8f-bd0a-48ac29e3c6ad",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-28, 'Florida AG Uthmeier moves for temporary injunction to block OpenAI ...').",
"label": "Uthmeier · 2026-09-28 · James Uthmeier Files Temporary Injunction Against OpenAI Ove"
},
{
"id": "b15e7eed-80f8-403d-a230-0a805fe8d0d1",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (09-28, 'Florida AG Uthmeier moves for temporary injunction to block OpenAI ...').",
"label": "Uthmeier · 2026-09-28 · Florida AG seeks to halt OpenAI development, citing alleged "
},
{
"id": "eb9272e7-38c4-4eff-9072-0414eccc4fc8",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier announces the Cabinet's terrorist-organization designations.",
"label": "Uthmeier · 2026-09-29 · DeSantis Administration Designates Antifa, the Muslim Brothe"
},
{
"id": "be94c604-2dc3-445a-8e9d-438c13e36933",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier The Floridian story kept (09-29, 'DeSantis Administration Designates Antifa, the Muslim Brotherhood, ...').",
"label": "Uthmeier · 2026-09-30 · Florida designates Antifa, Muslim Brotherhood, and CAIR as t"
},
{
"id": "5952a139-8aa5-46b0-965e-ee36ee3c23c1",
"action": "approve",
"note": "Backfill review 10-09: On-subject: WLRN's profile of Rodríguez's campaign.",
"label": "Rodriguez · 2026-09-30 · 'Crime, costs and corruption': José Javier Rodríguez on the "
},
{
"id": "46e1ab7f-2269-4f47-b82c-e516064c793d",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier's campaign ad featuring a survivor.",
"label": "Uthmeier · 2026-10-01 · Uthmeier’s latest ad: Survivor says he’s drawing a hard line"
},
{
"id": "e7d7ce27-8e7a-4563-8cbb-bca49bf0a912",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Uthmeier as the earlier Florida's Voice story kept (10-01, 'Uthmeier’s latest ad: Survivor says he’s drawing a hard line agains...').",
"label": "Uthmeier · 2026-10-01 · (AD) Exploitation Survivor Praises James Uthmeier for Fighti"
},
{
"id": "84daad92-52e1-4b35-a6e4-daaab8f5a293",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Uthmeier opens an investigation into the Jacksonville Transportation Authority.",
"label": "Uthmeier · 2026-10-01 · Florida AG launches investigation into Jacksonville transpor"
},
{
"id": "62f9d796-cae5-4ba8-85fc-5821b9cc4027",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Elijah's comments on the FL-7 race.",
"label": "Elijah · 2026-09-23 · Elijah says voters want consistency, not flip-flops, in Flor"
},
{
"id": "7ba6614f-f8c9-4200-9acc-0ecb58000e09",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Elijah releases his 'At Every Turn' ad.",
"label": "Elijah · 2026-09-23 · GOP congressional candidate Ryan Elijah rolls out ad campaig"
},
{
"id": "cd839dc3-1e64-47d5-91a5-c72be3150f1a",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Dalton's stated position on federal restrictions on gender-transition care for minors.",
"label": "Dalton · 2026-09-24 · Democrat Bale Dalton says federal government should not rest"
},
{
"id": "4cdcbba2-2ef3-40a2-91a2-403408fb6031",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the Elijah campaign's response to Dalton.",
"label": "Elijah · 2026-09-24 · Democrat Bale Dalton says federal government should not rest"
},
{
"id": "ee681428-daab-4a10-bb71-6dcd0d4e1e06",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Dalton as the earlier Florida's Voice story kept (09-24, 'Democrat Bale Dalton says federal government should not restrict tr...').",
"label": "Dalton · 2026-09-24 · Bale Dalton Seemingly Supports Transgender Surgery for Minor"
},
{
"id": "53a80d98-0cd0-428f-a6a0-668949c3180e",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: Orange County Sheriff John Mina endorses Elijah.",
"label": "Elijah · 2026-10-01 · Orange County Sheriff John Mina endorses Republican Ryan Eli"
},
{
"id": "12994027-3a52-4476-863f-d8b1a9a11052",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Haridopolos co-introduces the House companion to the STARS Act.",
"label": "Haridopolos · 2026-09-28 · Florida Lawmakers Push to Bring New U.S. Space Academy to th"
},
{
"id": "9675c5db-92b0-4d1b-8693-a6f2fdd63395",
"action": "approve",
"note": "Backfill review 10-09: On-subject: a Florida's Voice report, from FEC records, on Jenkins's PAC and campaign payments.",
"label": "Jenkins · 2026-09-29 · EXCLUSIVE: Jennifer Jenkins collected more than $107,000 fro"
},
{
"id": "6be9731d-5a60-450e-a8e4-4d2690671142",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Green's interview criticising Soto's no-tax-on-tips vote.",
"label": "Green · 2026-09-09 · Dan Green slams Rep. Darren Soto over no-tax-on-tips vote, c"
},
{
"id": "0ab9cfdf-9ecc-4ebf-b610-2e5c337a1106",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Soto's vote record is the story's subject (10-06 precedent for opponent statements).",
"label": "Soto · 2026-09-09 · Dan Green slams Rep. Darren Soto over no-tax-on-tips vote, c"
},
{
"id": "61ae5ad7-8b3c-4d0b-b617-42d6c4b29345",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Green's campaign remarks.",
"label": "Green · 2026-09-24 · Dan Green highlights law enforcement support, criticizes int"
},
{
"id": "aa72bc93-539d-4463-833f-20872577d764",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the headline names Green as Soto's challenger in a third-party race ranking (founder 10-09: third-party polls and ratings allowed).",
"label": "Green · 2026-10-01 · Rep. Darren Soto faces uphill battle as Republican Dan Green"
},
{
"id": "75dcdc2c-c5a3-408b-a22e-69aa546ce263",
"action": "approve",
"note": "Backfill review 10-09: On-subject: CQ Roll Call ranks Soto the most vulnerable House Democrat (third-party rating, founder 10-09).",
"label": "Soto · 2026-10-01 · Rep. Darren Soto faces uphill battle as Republican Dan Green"
},
{
"id": "859e2484-3c93-4b60-894d-efc5f0cb77ed",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event as a story already live for Soto: CFPublic 10-02 'In Florida's Ninth, Rep. Darren Soto makes his case against stacked odds' (the same story).",
"label": "Soto · 2026-10-03 · In Florida's Ninth, Rep. Darren Soto makes his case against "
},
{
"id": "c80f448b-2291-41f2-a656-3451b82e20a0",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Castor criticises the EPA's emission-limit rollback.",
"label": "Castor · 2026-09-15 · Kathy Castor Calls Out Environmental Protection Agency For R"
},
{
"id": "7ea9fbf4-8521-4a57-8b24-5965b58b421f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Beltran says Castor is declining debates (10-06 precedent for statements about a candidate).",
"label": "Castor · 2026-09-17 · GOP challenger Mike Beltran says Kathy Castor is hiding from"
},
{
"id": "85e2e23b-5c79-4405-9f59-deef619d0502",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Beltran's campaign statement on debates.",
"label": "Beltran · 2026-09-17 · GOP challenger Mike Beltran says Kathy Castor is hiding from"
},
{
"id": "b577f87a-6fa6-4098-b1e7-c14fa4c4094d",
"action": "approve",
"note": "Backfill review 10-09: On-subject: a Florida's Voice report on Castor's stock trades and financial disclosures (10-06 precedent: reporting on a candidate's disclosures was approved).",
"label": "Castor · 2026-09-24 · Castor’s fortune soars on timed stock dumps, late filings an"
},
{
"id": "01defd16-3af2-42b9-8308-55925d9e138a",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the House passes Lee's Safe Cloud Storage Act.",
"label": "Lee · 2026-09-17 · Laurel Lee Celebrates Passage Of Safe Cloud Storage Act"
},
{
"id": "bd644a7e-4760-44f3-862a-829c0ee96d46",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Wasserman Schultz criticises the administration's Venezuela policy.",
"label": "Schultz · 2026-09-28 · Debbie Wasserman Schultz Calls Out Trump For Leaving Maduro "
},
{
"id": "ab4c94b6-a626-475a-99d9-1bf7c304c129",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Wasserman Schultz tours the Miramar ICE facility.",
"label": "Schultz · 2026-09-30 · After tour, Wasserman Schultz says ‘unconstitutional torture"
},
{
"id": "2570c177-ffd9-45c7-8fa5-42ab79efb922",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Askar says he will file a bill cutting federal fuel taxes.",
"label": "Askar · 2026-09-14 · Casey Askar To File Bill That Cuts Current Federal Gas and D"
},
{
"id": "3e7188cd-5cdc-468f-afa2-fe01f80c60ee",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Ocasio-Cortez may campaign for Dandiya (endorsement-type story).",
"label": "Dandiya · 2026-09-16 · Ocasio-Cortez Open to Campaign in Florida for Democratic Soc"
},
{
"id": "c68f81bc-50c9-4f28-85c1-3c68c75ff9c3",
"action": "approve",
"note": "Backfill review 10-09: On-subject: the NRCC's statement about Dandiya.",
"label": "Dandiya · 2026-09-16 · National Republican Congressional Committee Warns Of Democra"
},
{
"id": "07576ca8-48b9-435d-bc2f-11a9295b7313",
"action": "approve",
"note": "Backfill review 10-09: On-subject: The Floridian's interview with Askar on the federal gas tax.",
"label": "Askar · 2026-09-16 · Casey Askar Promises A Permanent Reduction of The Federal Ga"
},
{
"id": "5daa4de5-9c3b-4901-90f3-5bf0e52eb891",
"action": "approve",
"note": "Backfill review 10-09: On-subject: The Floridian's interview with Askar on communism in the hemisphere.",
"label": "Askar · 2026-09-18 · Casey Askar Affirms the U.S. Must 'Root Out Communism' to Ma"
},
{
"id": "645f0f95-4e9b-452b-9fde-0397636c9b42",
"action": "approve",
"note": "Backfill review 10-09: On-subject: a super PAC's first spending in the race targets Dandiya.",
"label": "Dandiya · 2026-09-21 · Super PAC hits Progressive Pia Dandiya for Opposing Middle-C"
},
{
"id": "ac43e712-55c0-4541-ad47-0985273a19b4",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Dandiya releases her first general-election ad.",
"label": "Dandiya · 2026-09-22 · Pia Dandiya Releases First General Election Ad in District 2"
},
{
"id": "c5be76ad-7948-4a44-98f1-5acec802dc1d",
"action": "approve",
"note": "Backfill review 10-09: On-subject: national committees' attacks on Askar.",
"label": "Askar · 2026-09-30 · Pia Dandiya Called a 'Hypocrite' Over Data Center Investment"
},
{
"id": "72fb4791-ee04-40af-8e53-1b44b75d79a2",
"action": "approve",
"note": "Backfill review 10-09: On-subject: national committees' attacks on Dandiya.",
"label": "Dandiya · 2026-09-30 · Pia Dandiya Called a 'Hypocrite' Over Data Center Investment"
},
{
"id": "b80a74d3-def3-4fa5-8882-9e819f49d0b4",
"action": "approve",
"note": "Backfill review 10-09: On-subject: The Floridian's interview with Moskowitz.",
"label": "Moskowitz · 2026-09-16 · Jared Moskowitz Says Republicans Only Focus On Messaging, No"
},
{
"id": "afed38b8-9c13-4059-9add-8d1351650a38",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Singer on Moskowitz and the cancelled Local 10 debate.",
"label": "Moskowitz · 2026-09-18 · Scott Singer Calls Out Moskowitz For Refusing to Debate on T"
},
{
"id": "a1aab4eb-a53b-4eba-9793-4f4fd0f73e2d",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Singer's statement on the cancelled Local 10 debate.",
"label": "Singer · 2026-09-18 · Scott Singer Calls Out Moskowitz For Refusing to Debate on T"
},
{
"id": "c66c96ce-bb15-46cd-b15a-bae22e2cc65e",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Moskowitz as the earlier The Floridian story kept (09-18, 'Scott Singer Calls Out Moskowitz For Refusing to Debate on TV').",
"label": "Moskowitz · 2026-09-18 · Moskowitz ducks Local 10 debate as Singer demands answers on"
},
{
"id": "b7289e81-df1d-4d67-a2c7-465541499dac",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Singer as the earlier The Floridian story kept (09-18, 'Scott Singer Calls Out Moskowitz For Refusing to Debate on TV').",
"label": "Singer · 2026-09-18 · Moskowitz ducks Local 10 debate as Singer demands answers on"
},
{
"id": "a9ffa799-03a3-4530-8514-a74d86bd51aa",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: the Florida PBA and NFIB endorse Singer.",
"label": "Singer · 2026-09-24 · Florida PBA, NFIB endorse Scott Singer in bid to defeat Mosk"
},
{
"id": "46db42cf-63eb-4231-8c95-aa30362e424d",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: the U.S. Chamber of Commerce endorses Singer.",
"label": "Singer · 2026-09-28 · U.S. Chamber of Commerce Endorses Scott Singer in CD 25 Race"
},
{
"id": "ff7fdada-337c-4c53-83f2-ab250f24b282",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: former Rep. Peter Deutsch endorses Singer.",
"label": "Singer · 2026-09-29 · Former Democratic Congressman Crosses Party Lines To Endorse"
},
{
"id": "789540d6-378a-4e96-806a-872261547338",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Singer as the earlier The Floridian story kept (09-28, 'U.S. Chamber of Commerce Endorses Scott Singer in CD 25 Race').",
"label": "Singer · 2026-09-30 · Scott Singer earns U.S. Chamber endorsement in Florida’s 25t"
},
{
"id": "51a57c9c-ce6b-45d9-b2fb-36eca89c0101",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Singer's first ad targets Moskowitz (10-06 precedent).",
"label": "Moskowitz · 2026-10-01 · Scott Singer’s first ad hits Moskowitz over stock trades, bi"
},
{
"id": "123a302e-3b31-4c27-8a52-6444d27c066f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Singer's first general-election ad.",
"label": "Singer · 2026-10-01 · Scott Singer’s first ad hits Moskowitz over stock trades, bi"
},
{
"id": "ddd31a5e-fca6-48e2-b9ca-7c13ad40612e",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Locklin calls for AI regulation.",
"label": "Locklin · 2026-09-20 · Florida congressional candidate Nicole Locklin calls for reg"
},
{
"id": "dd983965-ee6d-4d0c-a248-b66df8357367",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Díaz-Balart on Cuba and Venezuela.",
"label": "Diaz-Balart · 2026-09-25 · Díaz-Balart says Trump pressure could reshape Cuba, Venezuel"
},
{
"id": "a60a5593-48ce-48dc-9700-822caea22782",
"action": "approve",
"note": "Backfill review 10-09: On-subject (Spanish): Díaz-Balart's roadmap for Venezuelan elections.",
"label": "Diaz-Balart · 2026-10-05 · Mario Díaz-Balart plantea hoja de ruta de tres fases que bus"
},
{
"id": "e9c01034-c34a-4f0f-b462-0214b1a5fae0",
"action": "approve",
"note": "Backfill review 10-09: On-subject, kept as tagged ('related', shown under 'Also about this race'): Salazar says she will give away money raised by a communist agent.",
"label": "Salazar · 2026-09-10 · Congresswoman Salazar says she will give money raised by com"
},
{
"id": "30f4d869-e8fc-407a-b1e9-d24a72ed1f28",
"action": "approve",
"note": "Backfill review 10-09: On-subject endorsement: South Florida firefighters' union endorses Salazar.",
"label": "Salazar · 2026-09-10 · South Florida Firefighters Endorse Maria Elvira Salazar for "
},
{
"id": "34bf2808-f8fc-43d2-8d70-0ae73cd1902c",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Salazar's campaign ad breaking with Trump on immigration enforcement.",
"label": "Salazar · 2026-09-17 · Maria Elvira Salazar Breaks With Trump on Immigration Enforc"
},
{
"id": "caee4b59-4a45-44f2-b79f-ff2296b56468",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Salazar as the earlier The Floridian story kept (09-17, 'Maria Elvira Salazar Breaks With Trump on Immigration Enforcement').",
"label": "Salazar · 2026-09-17 · Maria Salazar releases new ad pushing back on Trump policies"
},
{
"id": "a273334e-d4b4-4937-85ab-efd3ac2d415c",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Salazar as the earlier The Floridian story kept (09-17, 'Maria Elvira Salazar Breaks With Trump on Immigration Enforcement').",
"label": "Salazar · 2026-09-17 · Maria Salazar breaks with Trump on immigration enforcement i"
},
{
"id": "416d9d48-402f-4d06-8b95-ceab53ddb52e",
"action": "approve",
"note": "Backfill review 10-09: On-subject (Spanish): a Fox News commentator asks Trump to withdraw his support for Salazar over her ad.",
"label": "Salazar · 2026-09-17 · TOMI LAHREN PIDE A TRUMP RETIRAR SU APOYO A MARÍA ELVIRA SAL"
},
{
"id": "f63a0156-e3f5-4cb2-9b58-d080c8ccf558",
"action": "approve",
"note": "Backfill review 10-09: On-subject (Spanish): DHS responds to Salazar's criticism of deportations.",
"label": "Salazar · 2026-09-18 · DHS ante críticas de congresista Salazar sobre deportaciones"
},
{
"id": "6434e064-0bd5-4554-9b09-f4e5f915ec54",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Salazar as the earlier The Floridian story kept (09-17, 'Maria Elvira Salazar Breaks With Trump on Immigration Enforcement').",
"label": "Salazar · 2026-09-18 · Congresswoman Salazar's new ad challenging Trump on immigrat"
},
{
"id": "883aaf7b-8a4f-4a5e-8174-5f2647ff3413",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Salazar as the earlier The Floridian story kept (09-17, 'Maria Elvira Salazar Breaks With Trump on Immigration Enforcement').",
"label": "Salazar · 2026-09-18 · In break with Trump, US Rep. Maria Elvira Salazar says his i"
},
{
"id": "c8d27841-aa47-426b-bbd5-eecb201ad566",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Republican and administration pushback against Salazar's ad.",
"label": "Salazar · 2026-09-18 · GOP Rep. Salazar faces intense backlash after demanding Trum"
},
{
"id": "5d0d3498-ff71-4e83-8265-b15581e18e36",
"action": "approve",
"note": "Backfill review 10-09: On-subject, kept as tagged ('related'): Trump says he supports Salazar despite her ad (WLRN/WUSF syndicated copy).",
"label": "Salazar · 2026-09-19 · Trump says he supports Miami Congresswoman Salazar despite h"
},
{
"id": "369dca06-e4c6-4fb6-9d78-f7eeeccb1d7c",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Salazar as the earlier WLRN story kept (09-19, 'Trump says he supports Miami Congresswoman Salazar despite her ad s...').",
"label": "Salazar · 2026-09-21 · Trump says Salazar got ‘a little bit soft on the border’ aft"
},
{
"id": "80642689-827f-4b18-80fa-be5d5cd09f9c",
"action": "approve",
"note": "Backfill review 10-09: On-subject, kept as tagged ('related'): Cook Political Report moves the FL-27 race (third-party rating, same treatment as a poll, founder 10-09).",
"label": "Salazar · 2026-09-26 · Report: GOP US Rep. Salazar still holds advantage, but race "
},
{
"id": "fbd30e8f-c177-4fde-bb38-106e451135c3",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Eliott Rodriguez criticises Salazar over her ad.",
"label": "Rodriguez · 2026-09-27 · Democratic candidate Eliott Rodriguez blasts Rep. Maria Elvi"
},
{
"id": "61649b93-6982-419a-964c-915fd1286f6a",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Eliott Rodriguez's criticism of Salazar (10-06 precedent for statements about a candidate).",
"label": "Salazar · 2026-09-27 · Democratic candidate Eliott Rodriguez blasts Rep. Maria Elvi"
},
{
"id": "01700cb1-adde-4170-956c-81b2eb9b65f6",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Trump's continued criticism of Salazar.",
"label": "Salazar · 2026-09-27 · Trump continues lashing out at Rep. Maria Elvira Salazar"
},
{
"id": "a612d97c-e1b2-4ee5-a594-6ad42c1e35a0",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Salazar as the earlier Local 10 story kept (09-27, 'Trump continues lashing out at Rep. Maria Elvira Salazar').",
"label": "Salazar · 2026-09-27 · Trump continúa arremetiendo contra la representante Maria El"
},
{
"id": "9f055da2-db20-42d9-9d7d-14ad5f0a35da",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Salazar as the earlier Local 10 story kept (09-27, 'Trump continues lashing out at Rep. Maria Elvira Salazar').",
"label": "Salazar · 2026-09-27 · Rift escalates as Trump targets Miami GOP Congresswoman Marí"
},
{
"id": "99f642b5-1587-4212-940a-cc65bce1fdff",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Salazar as the earlier Local 10 story kept (09-27, 'Trump continues lashing out at Rep. Maria Elvira Salazar').",
"label": "Salazar · 2026-09-28 · Rift escalates as Trump targets Miami GOP Rep. María Elvira "
},
{
"id": "6d37dcb5-e1ce-481b-88bb-34da7c556955",
"action": "approve",
"note": "Backfill review 10-09: On-subject: WLRN's profile of the FL-27 race between Rodriguez and Salazar.",
"label": "Rodriguez · 2026-10-05 · Two former news anchors, one seat: Inside the tightening rac"
},
{
"id": "bfe1f7b1-e4a4-4d97-8336-190c82a7042f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: WLRN's profile of the FL-27 race between Rodriguez and Salazar.",
"label": "Salazar · 2026-10-05 · Two former news anchors, one seat: Inside the tightening rac"
},
{
"id": "f9e1fbe1-df1d-45e7-8801-f6f32b71f16f",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Local 10 interview with Ehr.",
"label": "Ehr · 2026-09-13 · This Week in South Florida: Phil Ehr"
},
{
"id": "d48fa4b9-d5f2-4b02-9273-cf94778022fd",
"action": "approve",
"note": "Backfill review 10-09: On-subject (Spanish), kept as tagged ('related'): Giménez's statement on Delcy Rodríguez.",
"label": "Gimenez · 2026-09-21 · Congresista Giménez llama “sabandija” a Delcy Rodríguez tras"
},
{
"id": "0ba3aab4-e07e-47bd-9225-b77ebfdd9442",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Giménez introduces an affordable-housing bill.",
"label": "Gimenez · 2026-09-25 · Carlos Gimenez Introduces Bill to Preserve & Protect Afforda"
},
{
"id": "a719c8d4-1c4d-43af-9b0e-5a828aa1250b",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Giménez and Scott introduce the SCREEN Act.",
"label": "Gimenez · 2026-09-28 · Carlos Gimenez & Rick Scott Introduce Bill Cracking Down on "
},
{
"id": "182641b3-f6df-4476-98fa-ba2ee7c01fa6",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Simpson's own on-record statements in the governor's race.",
"label": "Simpson · 2026-09-17 · Simpson warns Jolly would undo Florida’s conservative gains,"
},
{
"id": "964b6144-e5fc-4784-be84-7c9d2d783a93",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Simpson announces protection of more than 1,000 acres of farmland.",
"label": "Simpson · 2026-09-18 · Simpson announces permanent protection of more than 1,000 ac"
},
{
"id": "41b89aaa-4bf0-43e4-a909-28923a5220be",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Simpson's fuel relief and weight-limit exemptions for farmers.",
"label": "Simpson · 2026-09-24 · Wilton Simpson partners with Gov. DeSantis on fuel relief, w"
},
{
"id": "7b6cc89c-51b9-467f-b3e9-235db529ae93",
"action": "approve",
"note": "Backfill review 10-09: On-subject: Simpson announces protection of 4,500 acres of farmland.",
"label": "Simpson · 2026-09-29 · Simpson announces protection of 4,500 acres of Florida farml"
},
{
"id": "febb3851-f684-4f43-b784-9cd59a479cea",
"action": "reject",
"note": "Backfill review 10-09: [DUP] Same event for Simpson as the earlier Florida's Voice story kept (09-29, 'Simpson announces protection of 4,500 acres of Florida farmland').",
"label": "Simpson · 2026-09-30 · Wilton Simpson Announces Protection of 4,500 Acres of Agricu"
},
{
"id": "e9c99cce-2e67-46cb-9c29-956360fda6df",
"action": "approve",
"note": "Queue review 10-15: On-subject poll story (founder 10-09): the NBC6/Telemundo Mason-Dixon poll of Donalds and Jolly.",
"label": "Donalds · 2026-10-06 · Decision 2026: Donalds leads Jolly in exclusive NBC6/Telemun"
},
{
"id": "5815a260-0286-4eb3-a9af-9898043fc747",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier nbcmiami.com story kept (2026-10-06, 'Decision 2026: Donalds leads Jolly in exclusive NBC6/Telemundo 51 Flor').",
"label": "Donalds · 2026-10-07 · POLL: Donalds, Moody hold clear leads over Democratic rivals"
},
{
"id": "d4b90704-9087-43e8-98ab-89c404179776",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier nbcmiami.com story kept (2026-10-06, 'Decision 2026: Donalds leads Jolly in exclusive NBC6/Telemundo 51 Flor').",
"label": "Donalds · 2026-10-07 · (POLL) Byron Donalds With 7-Point Lead Over David Jolly in G"
},
{
"id": "e5fdf1e1-d1a9-4f46-a664-e42de36e9dde",
"action": "approve",
"note": "Queue review 10-15: On-subject poll story (founder 10-09): the NBC6/Telemundo Mason-Dixon poll of Donalds and Jolly.",
"label": "Jolly · 2026-10-06 · Decision 2026: Donalds leads Jolly in exclusive NBC6/Telemun"
},
{
"id": "1e0b4c59-d87e-4d6d-b92b-9b88c7d26cbb",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier nbcmiami.com story kept (2026-10-06, 'Decision 2026: Donalds leads Jolly in exclusive NBC6/Telemundo 51 Flor').",
"label": "Jolly · 2026-10-07 · (POLL) Byron Donalds With 7-Point Lead Over David Jolly in G"
},
{
"id": "c1f9e16e-2241-4c7d-af80-bdf48edc650f",
"action": "approve",
"note": "Queue review 10-15: On-subject poll story (founder 10-09): the Mason-Dixon poll of Donalds and Moody.",
"label": "Moody · 2026-10-07 · POLL: Donalds, Moody hold clear leads over Democratic rivals"
},
{
"id": "8956b746-89c0-450e-96f2-1a82d93c0862",
"action": "approve",
"note": "Queue review 10-15: On-subject: Elijah's campaign ad with sheriffs Chitwood and Lemma.",
"label": "Elijah · 2026-10-07 · (AD) Ryan Elijah Teams Up With Sheriffs to Reinforce His Com"
},
{
"id": "a578a58b-635c-4ddc-9c8d-36f64ae08a0f",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier floridianpress.com story kept (2026-10-07, '(AD) Ryan Elijah Teams Up With Sheriffs to Reinforce His Commitment to').",
"label": "Elijah · 2026-10-07 · Ryan Elijah highlights support from Chitwood, Lemma and Ivey"
},
{
"id": "e6bf0cd3-5de7-47b2-9282-b90941b74812",
"action": "approve",
"note": "Queue review 10-15: On-subject: Uthmeier asks a court to bar under-14s from Meta's platforms.",
"label": "Uthmeier · 2026-10-07 · Florida AG seeks court order to ban kids under 14 from Meta "
},
{
"id": "296356c6-aa5d-40ea-9efe-2f0cd2b99a4c",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier flvoicenews.com story kept (2026-10-07, 'Florida AG seeks court order to ban kids under 14 from Meta platforms,').",
"label": "Uthmeier · 2026-10-07 · Florida AG seeks to ban users under 14 from Meta platforms"
},
{
"id": "d22b5eaa-15a4-40f2-9917-b44082cb8a63",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier flvoicenews.com story kept (2026-10-07, 'Florida AG seeks court order to ban kids under 14 from Meta platforms,').",
"label": "Uthmeier · 2026-10-08 · AG Uthmeier Continues Fight to Protect Florida Children Onli"
},
{
"id": "f2a518e9-0210-40a2-ae34-9ca7ae7efb7b",
"action": "approve",
"note": "Queue review 10-15: On-subject: an appeals court erases the Hope Florida grand jury report that named Uthmeier.",
"label": "Uthmeier · 2026-10-08 · Court erases Hope Florida grand jury report, after an appeal"
},
{
"id": "0e7dd515-ecaf-4b3e-8065-5fada85e80b4",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier cltampa.com story kept (2026-10-08, 'Court erases Hope Florida grand jury report, after an appeal that had ').",
"label": "Uthmeier · 2026-10-08 · DeSantis proclaims ‘total victory’ for Hope Florida after ap"
},
{
"id": "1aef614b-cede-4058-b810-5d76d7f84739",
"action": "approve",
"note": "Queue review 10-15: On-subject: Uthmeier announces 21 arrests in an Osceola child predator sting.",
"label": "Uthmeier · 2026-10-08 · 21 arrested in Osceola County child predator sting, Uthmeier"
},
{
"id": "79bd9afc-ab9a-4e6e-bf29-8b6e7ee88b6b",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier flvoicenews.com story kept (2026-10-08, '21 arrested in Osceola County child predator sting, Uthmeier announces').",
"label": "Uthmeier · 2026-10-08 · James Uthmeier Announces Arrest of 21 Child Predators in 'Op"
},
{
"id": "f3de6df6-cfa8-4993-ae1f-896b4f1f50e3",
"action": "approve",
"note": "Queue review 10-15: On-subject poll story (founder 10-09): the James Madison Institute poll.",
"label": "Donalds · 2026-10-09 · (POLL) Byron Donalds With 10-Point Advantage Over David Joll"
},
{
"id": "3eb9d19d-6aa1-4696-8304-49cf2d08858b",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier floridianpress.com story kept (2026-10-09, '(POLL) Byron Donalds With 10-Point Advantage Over David Jolly in Gover').",
"label": "Donalds · 2026-10-09 · POLL: Donalds, Moody hold matching 10-point leads in new JMI"
},
{
"id": "8b8d088f-83b7-46fb-a3dc-5b234c4cdf6e",
"action": "approve",
"note": "Queue review 10-15: On-subject poll story (founder 10-09): the James Madison Institute poll.",
"label": "Jolly · 2026-10-09 · (POLL) Byron Donalds With 10-Point Advantage Over David Joll"
},
{
"id": "65bccdcc-061f-4225-8b87-f494c4ade5fe",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier floridianpress.com story kept (2026-10-09, '(POLL) Byron Donalds With 10-Point Advantage Over David Jolly in Gover').",
"label": "Jolly · 2026-10-09 · POLL: Donalds, Moody hold matching 10-point leads in new JMI"
},
{
"id": "88120370-9840-4495-8bd9-2215691747de",
"action": "approve",
"note": "Queue review 10-15: On-subject poll story (founder 10-09): the James Madison Institute poll.",
"label": "Moody · 2026-10-09 · POLL: Donalds, Moody hold matching 10-point leads in new JMI"
},
{
"id": "d726b7d6-b59b-4b04-80b0-8d48029422b4",
"action": "approve",
"note": "Queue review 10-15: On-subject: Uthmeier activates the price gouging hotline for Hurricane Isaias.",
"label": "Uthmeier · 2026-10-09 · Florida Attorney General Activates Price Gouging Hotline Ahe"
},
{
"id": "c58c57a7-4c97-480c-b54d-8f6f6abc4fdb",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier floridadaily.com story kept (2026-10-09, 'Florida Attorney General Activates Price Gouging Hotline Ahead of Hurr').",
"label": "Uthmeier · 2026-10-09 · Uthmeier urges Floridians to report price gouging during sto"
},
{
"id": "191e4845-3c46-432b-b928-0d715fb8f907",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier floridadaily.com story kept (2026-10-09, 'Florida Attorney General Activates Price Gouging Hotline Ahead of Hurr').",
"label": "Uthmeier · 2026-10-09 · Florida AG warns looters, scammers ahead of Hurricane Isaias"
},
{
"id": "843f18db-57a5-431f-9709-7e430405a28b",
"action": "approve",
"note": "Queue review 10-15: On-subject: Nixon's Miami-Dade campaign stop.",
"label": "Nixon · 2026-10-11 · Florida Rep. Angie Nixon to campaign at Mi Pueblo restaurant"
},
{
"id": "424c439c-1805-4a0f-a067-c3b9f64f27c7",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier local10.com story kept (2026-10-11, 'Florida Rep. Angie Nixon to campaign at Mi Pueblo restaurant in Miami-').",
"label": "Nixon · 2026-10-11 · Diputada de Florida Angie Nixon hará campaña en el restauran"
},
{
"id": "9f5222c6-d5bc-430e-adb4-40d611447fdb",
"action": "approve",
"note": "Queue review 10-15: On-subject: Dandiya's 'Facing South Florida' interview.",
"label": "Dandiya · 2026-10-11 · Full 1-on-1 interview: Pia Dandiya"
},
{
"id": "734d62d9-5f26-4d72-86ec-ec8cf4fe157b",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier cbsnews.com/miami story kept (2026-10-11, 'Full 1-on-1 interview: Pia Dandiya').",
"label": "Dandiya · 2026-10-11 · 1-on-1: Pia Dandiya discusses her Congressional run"
},
{
"id": "78f46f47-92f3-41a9-8174-9e8e19189f23",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier cbsnews.com/miami story kept (2026-10-11, 'Full 1-on-1 interview: Pia Dandiya').",
"label": "Dandiya · 2026-10-11 · Pia Dandiya explains why she is running for Florida's Congre"
},
{
"id": "d881a03e-0f23-40d3-81bc-761367deb3c1",
"action": "approve",
"note": "Queue review 10-15: On-subject: Bernie Sanders to campaign with Nixon in Florida.",
"label": "Nixon · 2026-10-11 · Bernie Sanders is coming to Ybor City to boost Angie Nixon’s"
},
{
"id": "e9c0c28b-10d3-4513-b583-d69eb995e980",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier cltampa.com story kept (2026-10-11, 'Bernie Sanders is coming to Ybor City to boost Angie Nixon’s US Senate').",
"label": "Nixon · 2026-10-13 · Bernie Sanders and other progressives are coming to Florida "
},
{
"id": "799d70e8-f394-4501-b619-35c55e39a93d",
"action": "approve",
"note": "Queue review 10-15: On-subject endorsement: the Florida Planned Parenthood PAC endorses Rodríguez.",
"label": "Rodriguez · 2026-10-12 · Florida Planned Parenthood Endorses David Jolly, José Javier"
},
{
"id": "815acf20-f018-4d5e-a673-b96065192b65",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier floridianpress.com story kept (2026-10-12, 'Florida Planned Parenthood Endorses David Jolly, José Javier Rodríguez').",
"label": "Rodriguez · 2026-10-13 · Florida Planned Parenthood PAC backs Jolly, Rodríguez, and s"
},
{
"id": "668c477a-c696-4a8d-baa9-342668771f95",
"action": "approve",
"note": "Queue review 10-15: On-subject endorsement: the Florida Planned Parenthood PAC endorses Jolly.",
"label": "Jolly · 2026-10-12 · Florida Planned Parenthood Endorses David Jolly, José Javier"
},
{
"id": "8a74c4f7-b61f-4616-bdc5-041908ef1f15",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier floridianpress.com story kept (2026-10-12, 'Florida Planned Parenthood Endorses David Jolly, José Javier Rodríguez').",
"label": "Jolly · 2026-10-13 · Florida Planned Parenthood PAC backs Jolly, Rodríguez, and s"
},
{
"id": "7fff6068-637c-4f27-bbd9-5b5813f4dbbd",
"action": "approve",
"note": "Queue review 10-15: On-subject: CBS Miami on the FL-24 race (Brown vs Gilbert).",
"label": "Brown · 2026-10-12 · Florida's 24th congressional district race sees GOP Te Brown"
},
{
"id": "006ffae1-a053-4622-9188-30b4ddb3dd59",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier cbsnews.com/miami story kept (2026-10-12, 'Florida's 24th congressional district race sees GOP Te Brown facing De').",
"label": "Brown · 2026-10-12 · Gilbert and Brown outline views on affordability, housing, i"
},
{
"id": "30ad30c0-4901-4827-8d42-6b4b83cf6f55",
"action": "approve",
"note": "Queue review 10-15: On-subject: CBS Miami on the FL-24 race (Brown vs Gilbert).",
"label": "III · 2026-10-12 · Florida's 24th congressional district race sees GOP Te Brown"
},
{
"id": "07ea71d0-c662-4a44-bfa6-365a210743ac",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier cbsnews.com/miami story kept (2026-10-12, 'Florida's 24th congressional district race sees GOP Te Brown facing De').",
"label": "III · 2026-10-12 · Gilbert and Brown outline views on affordability, housing, i"
},
{
"id": "c0e1e6d0-a879-4a33-9c10-583a7012666e",
"action": "approve",
"note": "Queue review 10-15: On-subject: Jolly on undecided Black voters in the governor's race.",
"label": "Jolly · 2026-10-13 · David Jolly: Governor’s race likely comes down to undecided "
},
{
"id": "98989425-a61b-4dd7-b8df-78c25abc31f7",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier wlrn.org story kept (2026-10-13, 'David Jolly: Governor’s race likely comes down to undecided Black Flor').",
"label": "Jolly · 2026-10-13 · David Jolly: Governor’s race likely comes down to undecided "
},
{
"id": "fd1f5e8c-bf69-4d80-b396-6d2c201da4ba",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier wlrn.org story kept (2026-10-13, 'David Jolly: Governor’s race likely comes down to undecided Black Flor').",
"label": "Jolly · 2026-10-13 · David Jolly: Governor’s race likely comes down to undecided "
},
{
"id": "55adb150-6d68-4e27-be75-0fdfb3b8be94",
"action": "approve",
"note": "Queue review 10-15: On-subject: Uthmeier announces a South Florida drug trafficking indictment.",
"label": "Uthmeier · 2026-10-13 · Multi-agency bust dismantles South Florida cocaine and fenta"
},
{
"id": "e9e5cd49-9679-46a5-aa8f-5242d1f24bfa",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier flvoicenews.com story kept (2026-10-13, 'Multi-agency bust dismantles South Florida cocaine and fentanyl ring, ').",
"label": "Uthmeier · 2026-10-13 · James Uthmeier Announces Arrest of 20 in Drug Trafficking, R"
},
{
"id": "b1b0bb07-8275-4818-ae5f-af0177f7db3f",
"action": "approve",
"note": "Queue review 10-15: On-subject endorsement: the NFIB endorses Moody.",
"label": "Moody · 2026-10-13 · National Federation of Independent Business Endorses Republi"
},
{
"id": "f159a85b-9628-4c8e-8eae-41aa71cd5406",
"action": "approve",
"note": "Queue review 10-15: On-subject poll story (founder 10-09): the Stetson University poll.",
"label": "Donalds · 2026-10-13 · POLL: Donalds, Moody hold commanding double-digit leads in n"
},
{
"id": "87a6b057-09fc-4fb3-bc81-21c844c066c0",
"action": "reject",
"note": "Queue review 10-15: [DUP] Same event for this candidate as the earlier flvoicenews.com story kept (2026-10-13, 'POLL: Donalds, Moody hold commanding double-digit leads in new polls').",
"label": "Donalds · 2026-10-14 · Stetson Poll Shows Donalds, Moody Leading Florida Races"
},
{
"id": "074b2a63-fa11-4cff-b76c-81ae3b6d184a",
"action": "approve",
"note": "Queue review 10-15: On-subject poll story (founder 10-09): the Stetson University poll.",
"label": "Moody · 2026-10-13 · POLL: Donalds, Moody hold commanding double-digit leads in n"
},
{
"id": "41568c49-6387-47e9-b9d1-860398da4743",
"action": "approve",
"note": "Queue review 10-15: On-subject poll story (founder 10-09): the Stetson University poll.",
"label": "Jolly · 2026-10-14 · Stetson Poll Shows Donalds, Moody Leading Florida Races"
},
{
"id": "8aae4b22-3bdd-4f46-9871-fe77363b2953",
"action": "approve",
"note": "Queue review 10-15: On-subject endorsement: the Everglades Trust endorses Donalds.",
"label": "Donalds · 2026-10-06 · Everglades Trust Endorses Byron Donalds for Governor"
},
{
"id": "abe9e5fb-e5f3-4afe-92f8-f4d2a2d76eae",
"action": "approve",
"note": "Queue review 10-15: On-subject: Donalds unveils a waterways proposal.",
"label": "Donalds · 2026-10-06 · Byron Donalds unveils proposal to protect Florida waterways"
},
{
"id": "e33c9657-d537-4571-949c-aaf393284968",
"action": "approve",
"note": "Queue review 10-15: Florida voting administration: the state removed Trump's personal data from voter files (Palm Beach SOE).",
"label": "election news · 2026-10-06 · Florida removes Trump’s personal information from voter file"
},
{
"id": "625a81b8-fd1b-4f13-8810-faef7c8e17fc",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'Last Squeeze' daily roundup strings unrelated items together; Donalds is one item among many.",
"label": "Donalds · 2026-10-06 · Last Squeeze🍊— 10.6.2026 — Donalds Says Jolly Will Undo DeSa"
},
{
"id": "1bde0633-cc7d-4e59-a361-7f79b4b620c6",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'Last Squeeze' daily roundup strings unrelated items together; Jolly is one item among many.",
"label": "Jolly · 2026-10-06 · Last Squeeze🍊— 10.6.2026 — Donalds Says Jolly Will Undo DeSa"
},
{
"id": "bf9fd01e-8dd8-4301-b5c2-187a2e5e1b39",
"action": "approve",
"note": "Queue review 10-15: Florida voting administration: the state removed Trump's personal data from voter files. Orange County audience, so not a duplicate of the Miami-Dade-scoped WLRN copy.",
"label": "election news · 2026-10-06 · Florida removes Trump’s personal information from voter file"
},
{
"id": "55202e6f-7def-46d8-9356-c4f74c30cda9",
"action": "approve",
"note": "Queue review 10-15: Florida voting: new Central Florida voter registration figures.",
"label": "election news · 2026-10-07 · Newest voters in Central Florida skewed blue ahead of Oct. 5"
},
{
"id": "920ed2ab-b7e7-4816-8500-957701f0ee8c",
"action": "approve",
"note": "Queue review 10-15: On-subject: the FL-8 debate between Haridopolos and Jenkins.",
"label": "Haridopolos · 2026-10-07 · Mike Haridopolos & Jennifer Jenkins Face Off in FL CD 8 Deba"
},
{
"id": "edc97cd6-fe6c-4d7f-b0cf-251a91640f1c",
"action": "approve",
"note": "Queue review 10-15: On-subject: the FL-8 debate between Haridopolos and Jenkins.",
"label": "Jenkins · 2026-10-07 · Mike Haridopolos & Jennifer Jenkins Face Off in FL CD 8 Deba"
},
{
"id": "a7a3a1ee-093c-4943-abed-0e37058124f8",
"action": "approve",
"note": "Queue review 10-15: On-subject: Donalds's ad campaign and Jolly's response (Spanish).",
"label": "Donalds · 2026-10-07 · Donalds lanza ofensiva publicitaria ante avance de Jolly en "
},
{
"id": "4ec64708-b1be-4ffb-b63b-722d184f1f8c",
"action": "approve",
"note": "Queue review 10-15: On-subject: Donalds's ad campaign and Jolly's response (Spanish).",
"label": "Jolly · 2026-10-07 · Donalds lanza ofensiva publicitaria ante avance de Jolly en "
},
{
"id": "5f5e064c-776a-4769-b2e6-69f2ddbabd08",
"action": "approve",
"note": "Queue review 10-15: Florida election: WMNF gives candidates free air time (Tampa Bay).",
"label": "election news · 2026-10-07 · Tampa Bay’s community radio station, WMNF, is providing free"
},
{
"id": "8ba32cfd-03c6-4fce-94e1-416aa816cc51",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Fails the neutrality lint: 'aims to' in the summary.",
"label": "Taddeo · 2026-10-07 · Climate Organization genCLEO Endorses Annette Tadeo For CFO"
},
{
"id": "d599e89d-56e0-4a81-9a65-5ab076fece9f",
"action": "approve",
"note": "Queue review 10-15: Amendment 3: officials holding town halls on the property tax amendment.",
"label": "election news · 2026-10-07 · Elected Officials Holding More Open Town Hall Meetings On Pr"
},
{
"id": "6e47d54b-e8df-4666-8962-53419ddbf2d0",
"action": "approve",
"note": "Queue review 10-15: Amendment explainer: the League of Women Voters on the three statewide amendments.",
"label": "election news · 2026-10-07 · St. Pete’s League of Women Voters explains the 2026 general "
},
{
"id": "a94c610a-4976-4699-ba53-8d695cd8615e",
"action": "approve",
"note": "Queue review 10-15: On-subject: Donalds's ad about Jolly (10-06 precedent for ads naming the opponent).",
"label": "Donalds · 2026-10-07 · Byron Donalds Attacks David Jolly for 'Welcoming Democrats' "
},
{
"id": "7a5a5a90-78af-4797-8ac4-023d6f3495a8",
"action": "approve",
"note": "Queue review 10-15: On-subject: Donalds's ad is about Jolly (10-06 precedent).",
"label": "Jolly · 2026-10-07 · Byron Donalds Attacks David Jolly for 'Welcoming Democrats' "
},
{
"id": "ff007591-604c-4632-b342-81a7d2644846",
"action": "approve",
"note": "Queue review 10-15: On-subject endorsement: the Clemente family endorses Bilirakis.",
"label": "Bilirakis · 2026-10-07 · Family of Baseball Legend, Humanitarian Roberto Clemente End"
},
{
"id": "44cf77cc-75e3-4a37-8701-48abc7039db0",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'Last Squeeze' daily roundup strings unrelated items together; Donalds is one item among many.",
"label": "Donalds · 2026-10-07 · Last Squeeze🍊— DeSantis Declares State of Emergency Over Tro"
},
{
"id": "a3aa0511-f83b-4435-8914-2c6d3545eaa9",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'Last Squeeze' daily roundup strings unrelated items together; Jolly is one item among many.",
"label": "Jolly · 2026-10-07 · Last Squeeze🍊— DeSantis Declares State of Emergency Over Tro"
},
{
"id": "7538518d-9ffa-4903-99d3-3e7e5fee4a6c",
"action": "approve",
"note": "Queue review 10-15: On-subject: House Majority PAC's $9.7M buy in the Dandiya-Askar race (both in the headline).",
"label": "Dandiya · 2026-10-07 · Democrats Pour Whopping $9.7 Million into Dandiya vs. Askar "
},
{
"id": "f6b32958-66d5-43f0-8334-9d2b450642c2",
"action": "approve",
"note": "Queue review 10-15: On-subject: House Majority PAC's $9.7M buy in the Dandiya-Askar race (both in the headline).",
"label": "Askar · 2026-10-07 · Democrats Pour Whopping $9.7 Million into Dandiya vs. Askar "
},
{
"id": "79bf0670-8d08-43ce-8866-17b7ec0d15cc",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Subject: Florida Republican lawmakers mark the Oct. 7 anniversary; Diaz-Balart is one of several lawmakers quoted.",
"label": "Diaz-Balart · 2026-10-07 · Florida lawmakers remember Oct. 7 attacks, honor victims and"
},
{
"id": "4d4dc169-1c9a-4b64-a19d-35b53b719d34",
"action": "approve",
"note": "Queue review 10-15: Amendment 3: Tampa's mayor on dengue response if it passes.",
"label": "election news · 2026-10-07 · Tampa mayor warns dengue response could be limited if Amendm"
},
{
"id": "659e43e1-06da-42a3-9f72-5a6167c48ae4",
"action": "approve",
"note": "Queue review 10-15: On-subject: CBS Miami preview of the attorney general race (Rodríguez vs Uthmeier).",
"label": "Uthmeier · 2026-10-07 · Previewing the race for Florida's Attorney General: Jose Jav"
},
{
"id": "78789f28-28ac-4522-aeb0-69233e761e71",
"action": "approve",
"note": "Queue review 10-15: On-subject: CBS Miami preview of the attorney general race (Rodríguez vs Uthmeier).",
"label": "Rodriguez · 2026-10-07 · Previewing the race for Florida's Attorney General: Jose Jav"
},
{
"id": "b9e0f342-ed68-4e1c-b1a2-6235c42a1374",
"action": "approve",
"note": "Queue review 10-15: Local race on the Nov 3 ballot in Miami-Dade: Palmetto Bay mayor (10-06 precedent: North Miami mayoral race).",
"label": "election news · 2026-10-08 · 3 candidates vie for mayor in Palmetto Bay"
},
{
"id": "b3aca517-da95-43b9-8953-9257099019c5",
"action": "approve",
"note": "Queue review 10-15: Local ballot question on Nov 3 in Miami-Dade: Virginia Key redevelopment.",
"label": "election news · 2026-10-08 · Miami voters to decide fate of $80M Virginia Key redevelopme"
},
{
"id": "41586489-109e-45cd-b421-d4bfb93d3f83",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Scope: a South St. Petersburg (Pinellas) early voting site, shown only to Hillsborough voters (10-06 SPLC precedent).",
"label": "election news · 2026-10-08 · Advocates push for early voting site in South St. Pete"
},
{
"id": "bc4867ea-7dee-498f-9d08-8fe60c4b9e6b",
"action": "approve",
"note": "Queue review 10-15: Florida election: the governor candidates' South Florida stops.",
"label": "election news · 2026-10-08 · Florida gubernatorial candidates make South Florida stops ah"
},
{
"id": "637fc0f2-7e21-4b49-84b5-236cc6af9aa0",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'JUICE' daily roundup strings unrelated items together; Uthmeier is one item among many.",
"label": "Uthmeier · 2026-10-08 · JUICE🍊— 10.8.2026 — DeSantis Knocks Anthropic Over Chatbots "
},
{
"id": "57ca85a3-adc0-4a19-89e1-879ea48a0757",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'JUICE' daily roundup strings unrelated items together; Rodríguez is one quoted line among many.",
"label": "Rodriguez · 2026-10-08 · JUICE🍊— 10.8.2026 — DeSantis Knocks Anthropic Over Chatbots "
},
{
"id": "5b972dda-88c3-4b52-8426-a06cf8e1ffb7",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'JUICE' daily roundup strings unrelated items together; E. Rodriguez is one quoted line among many.",
"label": "Rodriguez · 2026-10-08 · JUICE🍊— 10.8.2026 — DeSantis Knocks Anthropic Over Chatbots "
},
{
"id": "7f57def2-bb87-45e4-9266-b6ea3fe737df",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Fails the neutrality lint: 'momentum' in the title.",
"label": "Nixon · 2026-10-08 · ‘This is a lot’: Angie Nixon recaps various attacks on her a"
},
{
"id": "d1750a2c-cffa-4ba7-8a44-3d0cda2a0bd3",
"action": "approve",
"note": "Queue review 10-15: On-subject: Uthmeier joins a multistate lawsuit against TP-Link.",
"label": "Uthmeier · 2026-10-08 · Attorney General James Uthmeier Launches Lawsuit Against Rou"
},
{
"id": "50a4f4bd-c060-4f5e-bc21-8d656f1bf662",
"action": "approve",
"note": "Queue review 10-15: On-subject: Simpson on the state's hurricane preparations.",
"label": "Simpson · 2026-10-08 · Simpson details Florida’s hurricane preparations as Gulf Coa"
},
{
"id": "81625d56-fd9c-4b14-90f3-4c46e9057e43",
"action": "approve",
"note": "Queue review 10-15: On-subject: Donalds's running mate Bryan Avila leaves the trail for hurricane duty (the ticket).",
"label": "Donalds · 2026-10-08 · Bryan Avila Steps Off Campaign Trail For Hurricane Response"
},
{
"id": "dc24c6cb-2b21-4ad3-902b-ea5da25eb3c8",
"action": "approve",
"note": "Queue review 10-15: Local races on the Nov 3 ballot: Tampa Bay school board runoffs.",
"label": "election news · 2026-10-08 · 10 Tampa Bay area school board races go to runoffs in the mi"
},
{
"id": "9d971211-e8f2-4c5a-aaf8-90169bbdf5f4",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'Last Squeeze' daily roundup strings unrelated items together; Moskowitz is one quoted line among many.",
"label": "Moskowitz · 2026-10-08 · Last Squeeze🍊— 10.8.2026 — 🚨 Hurricane Isaias Update 🚨 — Dem"
},
{
"id": "e008fba5-942a-4327-badf-82a64d10b2d2",
"action": "approve",
"note": "Queue review 10-15: On-subject: Jacksonville's mayor declines to endorse Nixon.",
"label": "Nixon · 2026-10-08 · Deegan won’t back Nixon, saying it’s ‘federal’ despite endor"
},
{
"id": "72b2e501-5cb0-4577-b5ef-1cf5c19b5b6c",
"action": "approve",
"note": "Queue review 10-15: On-subject: Donalds at a Largo campaign event.",
"label": "Donalds · 2026-10-08 · Donalds tells Largo crowd the Florida dream is on the ballot"
},
{
"id": "ab80e5e1-1d43-4689-8a59-94ff4422b42a",
"action": "approve",
"note": "Queue review 10-15: On-subject endorsement: María Corina Machado endorses Salazar (Spanish).",
"label": "Salazar · 2026-10-08 · María Corina Machado da su apoyo electoral a María Elvira Sa"
},
{
"id": "b17692fe-7d38-4191-85f8-898d302f726b",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Fails the neutrality lint: 'hoping to' in the summary.",
"label": "election news · 2026-10-09 · 4 candidates vie to become Cutler Bay’s next mayor"
},
{
"id": "3a41f734-b5cc-45f8-83eb-7f81ccdd7a07",
"action": "approve",
"note": "Queue review 10-15: Local ballot question on Nov 3: an elected Hillsborough superintendent.",
"label": "election news · 2026-10-09 · Hillsborough School Board suggests voters say no to making s"
},
{
"id": "1affd02f-0a42-41d5-b797-ceacad88b3fa",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'JUICE' daily roundup strings unrelated items together; Salazar is one quoted line among many.",
"label": "Salazar · 2026-10-09 · JUICE🍊— 10.9.2026 — DeSantis Finds Vindication in Latest Hop"
},
{
"id": "7f8256af-c38f-4dbb-927b-2505cbfb6245",
"action": "approve",
"note": "Queue review 10-15: On-subject: Rick Scott campaigns for Donalds (re-queued under the named candidates, founder 10-11).",
"label": "Donalds · 2026-10-09 · Rick Scott says a vote for Donalds, who is currently tied wi"
},
{
"id": "bf848503-f26e-42f1-9dc1-a5808447f603",
"action": "approve",
"note": "Queue review 10-15: On-subject: the story is about the Donalds-Jolly contest; Jolly is in the headline (re-queued under the named candidates, founder 10-11).",
"label": "Jolly · 2026-10-09 · Rick Scott says a vote for Donalds, who is currently tied wi"
},
{
"id": "f8bf6052-2b5a-43e8-97cc-687073217505",
"action": "approve",
"note": "Queue review 10-15: On-subject poll story (founder 10-09): the CBS/YouGov poll of Donalds and Jolly.",
"label": "Donalds · 2026-10-09 · Byron Donalds, David Jolly in Statistical Dead Heat in Two D"
},
{
"id": "ba125860-0839-49c9-891d-a745f1624e5a",
"action": "approve",
"note": "Queue review 10-15: On-subject poll story (founder 10-09): the CBS/YouGov poll of Donalds and Jolly.",
"label": "Jolly · 2026-10-09 · Byron Donalds, David Jolly in Statistical Dead Heat in Two D"
},
{
"id": "40355af3-8d4e-42aa-ad77-ae3a629c2f34",
"action": "approve",
"note": "Queue review 10-15: On-subject: Moskowitz criticises NYC Mayor Mamdani's Oct. 7 statement.",
"label": "Moskowitz · 2026-10-09 · South Florida Democrat Criticizes NYC Mayor Mamdani Over Oct"
},
{
"id": "1e42fd4e-144e-456a-bb0a-4275b54cd498",
"action": "approve",
"note": "Queue review 10-15: On-subject: Nixon's statement about Defense Secretary Hegseth (her quote in the headline).",
"label": "Nixon · 2026-10-09 · Angie Nixon Slams 'Coked Out' Pete Hegseth for Okaying Publi"
},
{
"id": "7a44e780-5f0e-48b6-be25-0b1ec1235d32",
"action": "approve",
"note": "Queue review 10-15: Voting information: WUSF's voter guide to the 2026 races.",
"label": "election news · 2026-10-09 · WUSF's Voter Guide helps you compare the candidates for the "
},
{
"id": "83579c61-ac55-4b57-9bc2-4de712bd9da7",
"action": "approve",
"note": "Queue review 10-15: Local race on the Nov 3 ballot in Miami-Dade: questions over North Miami mayor Desulme's qualifying fees.",
"label": "election news · 2026-10-09 · North Miami Election: Could Mayor Desulme lose his place on "
},
{
"id": "1171d8d2-afed-400d-9d23-4c9ffa53aedb",
"action": "approve",
"note": "Queue review 10-15: On-subject: an analysis of what Uthmeier's Meta case covers (a separate story from the injunction motion).",
"label": "Uthmeier · 2026-10-09 · Florida’s Meta Case Leaves a Gap on Teen Safety"
},
{
"id": "9fdaccb4-4536-4e09-814f-2aa43e40a571",
"action": "approve",
"note": "Queue review 10-15: Local race on the Nov 3 ballot in Miami-Dade: an opponent asks that North Miami mayor Desulme be removed from the ballot (a later development than the fees story).",
"label": "election news · 2026-10-09 · Competitor wants North Miami mayor off ballot, arguing he di"
},
{
"id": "0647404d-e960-495f-99d4-a62a762177fa",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Subject: Uber's free evacuation rides; Moody appears only as one official urging residents to use them.",
"label": "Moody · 2026-10-09 · Uber offers free evacuation shelter rides ahead of Hurricane"
},
{
"id": "7e009827-f733-45de-980f-79b91f8a0eea",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'Last Squeeze' daily roundup strings unrelated items together; Donalds is one item among many.",
"label": "Donalds · 2026-10-09 · Last Squeeze🍊— 10.9.2026 — Latest Poll Sees Donalds Ahead of"
},
{
"id": "64846578-1791-45cb-a73f-af17ec28368b",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'Last Squeeze' daily roundup strings unrelated items together; Jolly is one item among many.",
"label": "Jolly · 2026-10-09 · Last Squeeze🍊— 10.9.2026 — Latest Poll Sees Donalds Ahead of"
},
{
"id": "0394d9c8-4667-4668-8ca8-d2b0e8b21dae",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'Last Squeeze' daily roundup strings unrelated items together; Nixon is one quoted line among many.",
"label": "Nixon · 2026-10-09 · Last Squeeze🍊— 10.9.2026 — Latest Poll Sees Donalds Ahead of"
},
{
"id": "78fb9316-8eb5-48c4-b283-fd06a177d6aa",
"action": "approve",
"note": "Queue review 10-15: Amendment 3: The Florida Roundup's segment on the property tax amendment.",
"label": "election news · 2026-10-09 · Breaking down Amendment 3, court orders Hope Florida report "
},
{
"id": "6f04c834-921b-4ffe-9a3c-31d683a855e9",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Scope: a Coral Springs (Broward) mayoral race, shown only to Miami-Dade voters.",
"label": "election news · 2026-10-09 · Incumbent mayor, challenger on ballot in Coral Springs"
},
{
"id": "b19ab871-7a3a-4fbb-b81c-af88a0809fb5",
"action": "approve",
"note": "Queue review 10-15: On-subject: CBS Miami preview of the FL-22 race (Dandiya vs Askar).",
"label": "Dandiya · 2026-10-09 · Previewing the District 22 congressional Race: Democrat Pia "
},
{
"id": "88421205-3ec6-4f88-a7e7-cdb533c9603e",
"action": "approve",
"note": "Queue review 10-15: On-subject: CBS Miami preview of the FL-22 race (Dandiya vs Askar).",
"label": "Askar · 2026-10-09 · Previewing the District 22 congressional Race: Democrat Pia "
},
{
"id": "6367a685-524a-403d-b5ff-cdcd90d6ab11",
"action": "approve",
"note": "Queue review 10-15: Local race and Amendment 3 in Miami-Dade: Palmetto Bay mayoral candidates on the village budget.",
"label": "election news · 2026-10-09 · Palmetto Bay mayoral candidates detail how they would handle"
},
{
"id": "7e78790e-e716-47c3-b98f-71086554910a",
"action": "reject",
"note": "Queue review 10-15: Not Florida's election: an Alaska U.S. House race.",
"label": "election news · 2026-10-10 · A small-town Alaska fisherman has Republicans on the defensi"
},
{
"id": "2eddd2b1-9e65-4ac7-8614-292c95812581",
"action": "reject",
"note": "Queue review 10-15: Not Florida's election: another country's election.",
"label": "election news · 2026-10-10 · Mahmoud Abbas postpones Palestinian legislative elections an"
},
{
"id": "e4af5c59-86c0-4041-b54d-54f8549b2711",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida.",
"label": "election news · 2026-10-11 · Trump urges Sen. John Fetterman to switch parties and become"
},
{
"id": "cb44ad2d-3157-4e78-838c-746d8a8169d3",
"action": "reject",
"note": "Queue review 10-15: Not Florida's election: another country's election.",
"label": "election news · 2026-10-11 · Czech opposition outpaced the ruling party in first round of"
},
{
"id": "ee0edc95-27f1-4864-8179-d953e1b1ad36",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida (Montana judicial elections).",
"label": "election news · 2026-10-11 · Nonpartisan state Supreme Court elections are being put to t"
},
{
"id": "48b19641-6e12-4cae-96d9-590e1f757368",
"action": "reject",
"note": "Queue review 10-15: Not Florida's election: another country's election.",
"label": "election news · 2026-10-11 · India's 'Cockroach' protest movement leaders freed from dete"
},
{
"id": "d2b25fb2-8368-480a-98d9-af7c4a84ae6c",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida (a Michigan race).",
"label": "election news · 2026-10-11 · Republicans want Abdul El-Sayed to be the main character of "
},
{
"id": "49f05d73-6c7f-41e2-912c-abced5c6ef8e",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida.",
"label": "election news · 2026-10-11 · Republicans face midterm backlash from factory workers squee"
},
{
"id": "dce08d62-9e3d-49a3-84a4-1025a1bc5693",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida.",
"label": "election news · 2026-10-11 · Trump sticks with tariffs even as US voters turn against the"
},
{
"id": "34f9694a-400b-4401-b8db-4e147e63f321",
"action": "reject",
"note": "Queue review 10-15: Not Florida's election: another country's election.",
"label": "election news · 2026-10-11 · France's far-left presidential candidate cheers Gen Z school"
},
{
"id": "33a8bc2e-821e-4a8a-a8c8-cadb08a05723",
"action": "reject",
"note": "Queue review 10-15: Not Florida's election: another country's referendum.",
"label": "election news · 2026-10-11 · UK prime minister say it is 'clear' Russia interfered in 201"
},
{
"id": "6570ecda-7186-4aef-afcc-4619344360f5",
"action": "approve",
"note": "Queue review 10-15: On-subject poll story (founder 10-09): CBS Miami on new governor and Senate polls.",
"label": "Donalds · 2026-10-11 · New polls show GOP Byron Donalds with narrow lead over Democ"
},
{
"id": "2b25bc3c-871d-4e69-a32a-85401a84705c",
"action": "approve",
"note": "Queue review 10-15: On-subject poll story (founder 10-09): CBS Miami on new governor and Senate polls.",
"label": "Moody · 2026-10-11 · New polls show GOP Byron Donalds with narrow lead over Democ"
},
{
"id": "e5f0ba7b-7a4a-4c1a-b3cc-a094be7156aa",
"action": "approve",
"note": "Queue review 10-15: On-subject poll story (founder 10-09): CBS Miami on new governor and Senate polls.",
"label": "Jolly · 2026-10-11 · New polls show GOP Byron Donalds with narrow lead over Democ"
},
{
"id": "21337d1d-945c-4228-960e-7d5fde4e62ef",
"action": "approve",
"note": "Queue review 10-15: On-subject poll story (founder 10-09): CBS Miami on new governor and Senate polls.",
"label": "Nixon · 2026-10-11 · New polls show GOP Byron Donalds with narrow lead over Democ"
},
{
"id": "e5f4a0db-6c26-4a8d-94f6-e3e0336f30d9",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] P1: opinion that would show as reporting; the piece accuses CBS Miami of throwing 'journalistic integrity right out the window' over a Dandiya interview.",
"label": "Dandiya · 2026-10-11 · CBS News Deletes Damaging Interview Segment of Progressive L"
},
{
"id": "25f8013d-05e0-4599-b7fa-8950802bc15d",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida (Pennsylvania).",
"label": "election news · 2026-10-12 · A Spanish-language radio show overflows with voters' frustra"
},
{
"id": "b4e6b4c8-cc7a-4a5f-ad2c-7554aec3f6c7",
"action": "approve",
"note": "Queue review 10-15: Amendment 3: how it may affect public libraries (Hillsborough audience).",
"label": "election news · 2026-10-12 · How Amendment 3 may affect Florida's public libraries"
},
{
"id": "0107f3cb-d5f7-495b-bb72-c8f3b4565aa3",
"action": "approve",
"note": "Queue review 10-15: Voting: a day of action to promote early voting in South Florida.",
"label": "election news · 2026-10-12 · No Kings grassroots movement to host day of action to promot"
},
{
"id": "14aa3f6f-710e-499c-81a0-83004a929246",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida: new voting rules in other states.",
"label": "election news · 2026-10-12 · Many GOP states have imposed new voting rules this year, som"
},
{
"id": "0b4fceca-ad92-4928-b993-ddefe00b1d6e",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'JUICE' daily roundup strings unrelated items together; Frost is one quoted line among many.",
"label": "Frost · 2026-10-12 · JUICE🍊— 10.12.2026 — Rubio Announces Tangible Progress in Ve"
},
{
"id": "cd69573a-3e2b-48f1-ac3e-c7cf4baf31fe",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'JUICE' daily roundup strings unrelated items together; Nixon is one quoted line among many.",
"label": "Nixon · 2026-10-12 · JUICE🍊— 10.12.2026 — Rubio Announces Tangible Progress in Ve"
},
{
"id": "8963956a-4241-4067-b600-7ac5af89657b",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Fails the neutrality lint: 'hoping to' in the summary.",
"label": "election news · 2026-10-12 · After losing ground with Latino voters, Democrats are turnin"
},
{
"id": "0c98f0d0-8c87-457f-88e2-e38199e02b37",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Subject: DeSantis's hurricane recovery update; Moody is named only among the officials accompanying him.",
"label": "Moody · 2026-10-12 · DeSantis issues recovery updates for northwest Florida follo"
},
{
"id": "2fda7721-d005-41a9-a1ca-6f75fad09bed",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Subject: DeSantis's hurricane recovery update; Simpson is named only among the officials accompanying him.",
"label": "Simpson · 2026-10-12 · DeSantis issues recovery updates for northwest Florida follo"
},
{
"id": "94718301-834c-4521-9576-3fc871426eba",
"action": "approve",
"note": "Queue review 10-15: On-subject: Simpson announces interest-free loans for farmers after Hurricane Isaias.",
"label": "Simpson · 2026-10-12 · Commissioner Wilton Simpson announces $500K interest-free lo"
},
{
"id": "378b2d64-195e-45a8-90a2-d754735c9a9e",
"action": "approve",
"note": "Queue review 10-15: Florida election: Central Florida voters discuss the Senate race and the election.",
"label": "election news · 2026-10-12 · 2026 Voter Insight Panel: Elections, Immigration, and Family"
},
{
"id": "1b2cd79e-9ce2-42fa-9a1f-b02ba838e73a",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida.",
"label": "election news · 2026-10-12 · Elon Musk quietly becomes biggest known donor in midterm con"
},
{
"id": "47e85751-b3b5-4277-ab90-8de16795b8ff",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida: new voting rules in other states.",
"label": "election news · 2026-10-12 · Many GOP states have imposed new voting rules this year, som"
},
{
"id": "06af64a6-acdb-4e49-830d-44fe8ae317c4",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Neutral wording: 'is touting' in the summary, a form of the banned 'touts' that the lint does not catch.",
"label": "Moody · 2026-10-12 · Ashley Moody Highlights Helping Workers With No Tax on Tips,"
},
{
"id": "b8ca34a1-da97-4786-9270-30bd56a4c621",
"action": "approve",
"note": "Queue review 10-15: On-subject: Frost hosts a UCF town hall with Ro Khanna and Nixon (both in the headline).",
"label": "Frost · 2026-10-12 · Rep. Ro Khanna to join Maxwell Frost, Angie Nixon at UCF tow"
},
{
"id": "98151ec2-2842-4f50-b9af-b577fdcdb967",
"action": "approve",
"note": "Queue review 10-15: On-subject: Nixon joins a UCF town hall with Ro Khanna and Frost (both in the headline).",
"label": "Nixon · 2026-10-12 · Rep. Ro Khanna to join Maxwell Frost, Angie Nixon at UCF tow"
},
{
"id": "ea7d2d84-3672-4dde-a3df-4a1a52889dc8",
"action": "approve",
"note": "Queue review 10-15: On-subject: a WLRN profile of Jolly's campaign.",
"label": "Jolly · 2026-10-12 · Democrat David Jolly pitches trust and pragmatism in governo"
},
{
"id": "85bd8843-66c6-4375-a24e-a5baded8893c",
"action": "approve",
"note": "Queue review 10-15: Amendment 3: how it may affect public libraries (Miami-Dade audience).",
"label": "election news · 2026-10-12 · How Amendment 3 may affect Florida's public libraries"
},
{
"id": "01f56222-db8c-4437-adeb-cd60841f15a6",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'Last Squeeze' daily roundup strings unrelated items together; Moody is one quoted line among many.",
"label": "Moody · 2026-10-12 · Last Squeeze🍊— 10.12.2026 — 'Cornell 7' Student Allegedly Re"
},
{
"id": "a316c8e0-bc5b-4e25-add6-32e71b057564",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'Last Squeeze' daily roundup strings unrelated items together; Nixon is one quoted line among many.",
"label": "Nixon · 2026-10-12 · Last Squeeze🍊— 10.12.2026 — 'Cornell 7' Student Allegedly Re"
},
{
"id": "de5d6396-9f23-46ba-b7e4-72f925e8c9c0",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida (Ohio and Alaska).",
"label": "election news · 2026-10-12 · Trump heads to Ohio, Alaska this week as Senate races tighte"
},
{
"id": "694d424f-f19c-447e-8371-a293746d889e",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida.",
"label": "election news · 2026-10-12 · Elon Musk becomes top midterm donor with more than $276 mill"
},
{
"id": "c8ed7bcd-e53b-47da-8bbf-2f7f53b09dd2",
"action": "approve",
"note": "Queue review 10-15: On-subject: FEC notices to Nixon's Senate campaign.",
"label": "Nixon · 2026-10-12 · Angie Nixon’s Senate campaign hit with repeated FEC violatio"
},
{
"id": "c4640d2a-c8e7-4b78-8007-df770d320e3c",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida.",
"label": "election news · 2026-10-12 · Elon Musk quietly becomes biggest known donor in midterm con"
},
{
"id": "e5a7b7f8-390b-4f86-a835-b32d80f10507",
"action": "approve",
"note": "Queue review 10-15: Voting: the NAACP's election protection effort, including Florida.",
"label": "election news · 2026-10-12 · NAACP launches election protection war room, get-out-the vot"
},
{
"id": "956298fe-8377-451f-a2d7-28016d122a2e",
"action": "approve",
"note": "Queue review 10-15: Local race on the Nov 3 ballot in Miami-Dade: Virginia Gardens mayor.",
"label": "election news · 2026-10-12 · Outsider challenging 23-year incumbent in Virginia Gardens m"
},
{
"id": "b53b8d4f-15da-47da-a119-6c89762cabb0",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Fails the neutrality lint: 'seeking to' in the summary (also a Broward story shown only to Miami-Dade voters).",
"label": "election news · 2026-10-12 · Pembroke Park mayor on trial for debate on if he lives in th"
},
{
"id": "8fe18799-24b5-448c-960a-d38d5b6ffb6f",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida.",
"label": "election news · 2026-10-12 · Data center boom puts Republicans in a bind before midterm e"
},
{
"id": "52573924-8b78-447f-b4a9-8d0609f8c026",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida (Ohio).",
"label": "election news · 2026-10-13 · Trump attacks immigrants from Somalia and Haiti while rallyi"
},
{
"id": "73718d0a-088a-4a2e-bffd-6814e1238306",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] P1: an op-ed urging a 'No' vote on retaining Justice Muñiz; it would show as reporting.",
"label": "election news · 2026-10-13 · Op-ed: Vote ‘No’ on retaining Florida Supreme Court Justice "
},
{
"id": "4090ab2f-72d1-41c2-a5ca-14f3c94f192b",
"action": "reject",
"note": "Queue review 10-15: [DUP] Syndicated copy of the WFSU canvassing-board story, which is kept statewide and already reaches Hillsborough voters.",
"label": "election news · 2026-10-13 · Is trust eroding in elections? Florida counties' canvassing "
},
{
"id": "8797af1e-1ad2-429a-80fa-ad9eeed57b18",
"action": "approve",
"note": "Queue review 10-15: On-subject: Senate Majority Leader Thune campaigns with Moody (in the dek as her own campaign news, not as Nixon's opponent).",
"label": "Moody · 2026-10-13 · Bernie Sanders and other progressives are coming to Florida "
},
{
"id": "6e8eeed9-3c17-4d10-9364-7f0eca67bfb0",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Subject: Jolly on undecided Black voters; Donalds appears in the dek only as the opponent in a poll figure.",
"label": "Donalds · 2026-10-13 · David Jolly: Governor’s race likely comes down to undecided "
},
{
"id": "b38c499b-667e-4084-b239-6e849ed02684",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Subject: Jolly on undecided Black voters; Donalds appears in the dek only as the opponent in a poll figure.",
"label": "Donalds · 2026-10-13 · David Jolly: Governor’s race likely comes down to undecided "
},
{
"id": "4d2387f5-a31b-46df-ac48-084fdaeb171c",
"action": "approve",
"note": "Queue review 10-15: On-subject fact-check: PolitiFact rates Nixon's claim on Cuban deportations (10-06 approved PolitiFact's).",
"label": "Nixon · 2026-10-13 · PolitiFact FL: Angie Nixon said Trump has deported ‘over 13,"
},
{
"id": "168ed2eb-50b9-4d77-926f-a087fa95a369",
"action": "approve",
"note": "Queue review 10-15: On-subject endorsement: Colombia's president endorses Salazar.",
"label": "Salazar · 2026-10-13 · Colombian President Abelardo de la Espriella Endorses María "
},
{
"id": "7b97576a-915d-4e2a-8ea0-24acc4f3120d",
"action": "approve",
"note": "Queue review 10-15: Florida voting administration: county canvassing boards (WFSU, the originating newsroom; statewide).",
"label": "election news · 2026-10-13 · Is trust in elections eroding? Florida canvassing boards wor"
},
{
"id": "1523e9bd-670c-4403-8ebd-cc8869bb1baa",
"action": "approve",
"note": "Queue review 10-15: On-subject: Beltran's criticism of Castor (both in the headline; 10-06 precedent).",
"label": "Castor · 2026-10-13 · Mike Beltran Calls Out Kathy Castor For Her Role on The Econ"
},
{
"id": "58a72786-6b80-4ac1-a547-e1db642a862b",
"action": "approve",
"note": "Queue review 10-15: On-subject: Beltran's criticism of Castor on the economy.",
"label": "Beltran · 2026-10-13 · Mike Beltran Calls Out Kathy Castor For Her Role on The Econ"
},
{
"id": "29e19302-f739-4851-aa37-bef8c1e4bf94",
"action": "approve",
"note": "Queue review 10-15: On-subject: Rep. Cory Mills questions Elijah over his stock-trade disclosures.",
"label": "Elijah · 2026-10-13 · Cory Mills Questions Ryan Elijah's Stance on Insider Trading"
},
{
"id": "a922f16d-640f-4293-8e03-329c5ee8ddb9",
"action": "approve",
"note": "Queue review 10-15: On-subject: a pro-Jolly group's ad about Donalds (10-06 precedent).",
"label": "Donalds · 2026-10-13 · Pro-Jolly Advertisement Rips Byron Donalds as 'Puppet' to Da"
},
{
"id": "a2a4da8d-184a-4620-a3aa-27d71615fc6d",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida.",
"label": "election news · 2026-10-13 · New White House press secretary Katie Zacharia announces Gui"
},
{
"id": "81c84d5b-fac1-4f88-bbac-d636ed6c662d",
"action": "approve",
"note": "Queue review 10-15: On-subject endorsement: the NFIB endorses Moody (in the headline).",
"label": "Moody · 2026-10-13 · NFIB endorses Moody, 23 congressional candidates in Florida,"
},
{
"id": "3f4e3486-b486-470c-8621-51601280c3fb",
"action": "reject",
"note": "Queue review 10-15: Not election news: foreign policy.",
"label": "election news · 2026-10-13 · Trump Warns The Houthis Over Their Recent String Of Attacks:"
},
{
"id": "0baf1487-3db2-4635-b7d0-aaf89a542b0e",
"action": "approve",
"note": "Queue review 10-15: On-subject: the Florida GOP's response to the FEC notices (a different actor from the 10-12 report, so a separate event).",
"label": "Nixon · 2026-10-13 · Florida GOP demands answers from Angie Nixon over FEC campai"
},
{
"id": "369da328-1e15-4f66-b0ba-51f2f1b6766b",
"action": "reject",
"note": "Queue review 10-15: Not Florida's election: another country's election.",
"label": "election news · 2026-10-13 · More than 119 million Brazilians voted in the Oct. 4 electio"
},
{
"id": "3710bd80-1ca4-4c59-ad21-4415627c0be8",
"action": "approve",
"note": "Queue review 10-15: Voting information: where to see your sample ballot (Tampa Bay counties).",
"label": "election news · 2026-10-13 · How to see your sample ballot for Election Day 2026 | Tampa "
},
{
"id": "a0594007-ed27-4526-9d59-92e378edc7b7",
"action": "approve",
"note": "Queue review 10-15: Florida election: a tech investor's PAC spending against Democrats in state legislative races.",
"label": "election news · 2026-10-13 · Florida Democrats Set to Receive Attacks from PAC Funded by "
},
{
"id": "c83d51d8-d65d-4ccd-a086-4c3ee106dc3b",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Subject: the NFIB endorses Moody; Nixon is named only as her opponent.",
"label": "Nixon · 2026-10-13 · National Federation of Independent Business Endorses Republi"
},
{
"id": "90d3e54c-3e84-4006-8b7f-57be73fd48c7",
"action": "approve",
"note": "Queue review 10-15: Voting information: dates and deadlines for Tampa Bay voters.",
"label": "election news · 2026-10-13 · Election Day 2026: Important dates and deadlines for Tampa B"
},
{
"id": "f9fe1bec-fa83-492d-8951-d97aed37f67b",
"action": "approve",
"note": "Queue review 10-15: Florida election: the DNC chair on Democrats' investment in Florida.",
"label": "election news · 2026-10-13 · Democrats are ready to 'shock the world' in Florida, says DN"
},
{
"id": "93172f0c-d000-4c57-b2bf-16a32615abd5",
"action": "reject",
"note": "Queue review 10-15: Not Florida's election: another country's election.",
"label": "election news · 2026-10-13 · More than 119 million Brazilians voted in the Oct. 4 electio"
},
{
"id": "b66165d0-dbea-462d-baec-3e13854b82f3",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'Last Squeeze' daily roundup strings unrelated items together; Moskowitz is named in one quoted line among many.",
"label": "Moskowitz · 2026-10-13 · Last Squeeze🍊— Pro-Jolly Advertisement Rips 'Puppet' Donalds"
},
{
"id": "65f0aca7-6588-4f6a-905a-a887322784e9",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'Last Squeeze' daily roundup strings unrelated items together; Donalds is one item among many.",
"label": "Donalds · 2026-10-13 · Last Squeeze🍊— Pro-Jolly Advertisement Rips 'Puppet' Donalds"
},
{
"id": "8b06e673-7bee-4698-a2f6-56df6c64bcad",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'Last Squeeze' daily roundup strings unrelated items together; Singer is one quoted line among many.",
"label": "Singer · 2026-10-13 · Last Squeeze🍊— Pro-Jolly Advertisement Rips 'Puppet' Donalds"
},
{
"id": "d6580d6e-2c09-4a95-8353-4aef2cfeebd4",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Fails the neutrality lint: 'aims to' in the summary.",
"label": "election news · 2026-10-13 · Oviedo homeowners still undecided as voting for Amendment 3 "
},
{
"id": "3e528bc5-4172-40fe-9ac1-f4e7b6e8fb3d",
"action": "approve",
"note": "Queue review 10-15: Voting information: the Oct. 22 vote-by-mail request deadline.",
"label": "election news · 2026-10-13 · Is it too late to request a mail-in ballot in Florida?"
},
{
"id": "28f63066-ca9a-4186-b793-0fdee424eba0",
"action": "approve",
"note": "Queue review 10-15: Voting information: early voting dates, county by county.",
"label": "election news · 2026-10-13 · When does early voting begin? County-by-county guide for Ele"
},
{
"id": "bfc9f422-d253-41c9-a04d-e07d1e4f2019",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida (Arizona).",
"label": "election news · 2026-10-13 · Supreme Court refuses to toss out fees for lawyers who sough"
},
{
"id": "d160d1ec-e024-4183-adda-b4c1e75f05d9",
"action": "approve",
"note": "Queue review 10-15: Voting information: what you can bring to the polls in Florida.",
"label": "election news · 2026-10-13 · What you can and can't bring to the Florida polls on Electio"
},
{
"id": "6a4d6fd0-49d5-45f5-b856-f97281d79037",
"action": "approve",
"note": "Queue review 10-15: On-subject: Donalds at a St. Cloud campaign event.",
"label": "Donalds · 2026-10-13 · Donalds tells St. Cloud crowd Floridians largely want afford"
},
{
"id": "70076d6c-d094-45d9-aa7a-6d8aa51946d1",
"action": "approve",
"note": "Queue review 10-15: On-subject: CBS Miami on the FL-25 race (Moskowitz vs Singer).",
"label": "Moskowitz · 2026-10-13 · Incumbant Jared Moskowitz takes on ex-Boca Raton mayor Scott"
},
{
"id": "8317625d-da05-4e63-a976-a0dae1dbc206",
"action": "approve",
"note": "Queue review 10-15: On-subject: CBS Miami on the FL-25 race (Moskowitz vs Singer).",
"label": "Singer · 2026-10-13 · Incumbant Jared Moskowitz takes on ex-Boca Raton mayor Scott"
},
{
"id": "fa5ac8b7-f467-478b-8db2-4420e045b10c",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] P1: a bylined advocacy op-ed by a Florida Realtors officer urging a Yes on Amendment 3; it would show as reporting.",
"label": "election news · 2026-10-13 · Floridians Are Being Squeezed. Amendment 3 Offers Relief"
},
{
"id": "e8f78923-00cc-4d96-94a0-59514776cd67",
"action": "approve",
"note": "Queue review 10-15: Local race on the Nov 3 ballot in Miami-Dade: Sunny Isles Beach mayor.",
"label": "election news · 2026-10-13 · Former Sunny Isles Beach mayor wants old job back; current m"
},
{
"id": "8c393696-7903-4cdf-b5fc-402a5fa71e61",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida: national search trends.",
"label": "election news · 2026-10-13 · 2026 midterm elections | What voters are searching ahead of "
},
{
"id": "1fc4c17d-3063-46bf-b5c3-04765539596d",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida.",
"label": "election news · 2026-10-14 · Battle lines shift in House races as Republicans retreat fro"
},
{
"id": "0a904b59-540f-4bfc-bf16-f596ebb38017",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida (Iowa).",
"label": "election news · 2026-10-14 · Iowa faces a reckoning over water quality and cancer rates i"
},
{
"id": "15d28ceb-fa92-4f28-aa77-425b5659e565",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida.",
"label": "election news · 2026-10-14 · House Democrats plan a first 100-days agenda if they sweep t"
},
{
"id": "18d9ebbf-2fff-4b93-9382-4d8371290e4d",
"action": "reject",
"note": "Queue review 10-15: Not Florida's election: another country's election.",
"label": "election news · 2026-10-14 · 'Cockroach' movement leaders jailed for 5 days after scaling"
},
{
"id": "b840ff8e-e54f-4e55-a70c-36d7a8d6416f",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida.",
"label": "election news · 2026-10-14 · Kamala Harris adds stops to her final midterm campaign stret"
},
{
"id": "ec1bc43e-ed68-4746-9c8f-97d9e55f053a",
"action": "approve",
"note": "Queue review 10-15: Florida voters on healthcare as an election issue (Hillsborough audience).",
"label": "election news · 2026-10-14 · Is healthcare on Florida's ballot? Many voters say it's a to"
},
{
"id": "31451de4-01f4-4010-9d72-c904fd01e895",
"action": "reject",
"note": "Queue review 10-15: National economic story, not about voting in Florida.",
"label": "election news · 2026-10-14 · More expensive gas, semiconductors likely pushed up inflatio"
},
{
"id": "e14616a3-6bc0-4ed6-9771-c2ba7782a57b",
"action": "approve",
"note": "Queue review 10-15: Florida voters on healthcare as an election issue (Miami-Dade audience).",
"label": "election news · 2026-10-14 · Is healthcare on Florida's ballot? Voters say it's a top pri"
},
{
"id": "65ef6a9a-8031-41ee-acfa-edac8f41241e",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'JUICE' daily roundup strings unrelated items together; Donalds is one quoted line among many.",
"label": "Donalds · 2026-10-14 · JUICE🍊— 10.14.2026 — Trump Warns Houthis Over Recent Attacks"
},
{
"id": "2010effd-c1af-4bda-ba55-4a0c5efe492c",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'JUICE' daily roundup strings unrelated items together; Nixon is one quoted line among many.",
"label": "Nixon · 2026-10-14 · JUICE🍊— 10.14.2026 — Trump Warns Houthis Over Recent Attacks"
},
{
"id": "5155efbd-ac3e-411e-928b-b05bdf223850",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'JUICE' daily roundup strings unrelated items together; Salazar is one item among many.",
"label": "Salazar · 2026-10-14 · JUICE🍊— 10.14.2026 — Trump Warns Houthis Over Recent Attacks"
},
{
"id": "4f5a40c8-e0a5-4b14-8365-7a6f874c227b",
"action": "reject",
"note": "Queue review 10-15: Not election news: small-business sentiment (10-06 precedent: fuel prices).",
"label": "election news · 2026-10-14 · Report: Some Florida Businesses May Pause Expansion Plans Un"
},
{
"id": "385668b2-7367-40e1-bcbf-65873ee4cdc0",
"action": "approve",
"note": "Queue review 10-15: Florida election: national Democratic groups investing in Florida races.",
"label": "election news · 2026-10-14 · National Democratic Organizations Weigh in on Florida's 2026"
},
{
"id": "b911c7d2-e133-4ca5-b33d-09df60a5b429",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida.",
"label": "election news · 2026-10-14 · Civil rights advocates plan to send thousands of observers t"
},
{
"id": "cbda54ea-e527-4bd4-b8eb-e430ae7c1c27",
"action": "approve",
"note": "Queue review 10-15: Amendment 3: whether it would cut police, fire and emergency funding.",
"label": "election news · 2026-10-14 · FL’s Amendment 3 would cut property taxes. Could it gut loca"
},
{
"id": "794c021f-c2ea-44e5-9907-d673ebdf82ea",
"action": "reject",
"note": "Queue review 10-15: National economic story, not about voting in Florida.",
"label": "election news · 2026-10-14 · Inflation worsened last month to 3.7% in sign that prices re"
},
{
"id": "bba0ca2e-60ee-4fe0-9b9e-165a3d4daedf",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida.",
"label": "election news · 2026-10-14 · House Democrats plan a first 100-days agenda if they sweep t"
},
{
"id": "20f0f0c5-1092-4b73-928f-57dbe8db591b",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida.",
"label": "election news · 2026-10-14 · Kamala Harris adds stops to her final midterm campaign stret"
},
{
"id": "02e43c36-7a4d-4341-8b43-f567c5dcb795",
"action": "approve",
"note": "Queue review 10-15: Amendment 3: the Florida Realtors campaign for a Yes vote (Orange County audience).",
"label": "election news · 2026-10-14 · Group that lobbied to ban rent control in Florida wants you "
},
{
"id": "89555d68-62ab-40c6-84ab-4726cce3ec36",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida.",
"label": "election news · 2026-10-14 · How Trump’s disaster aid delays and FEMA cuts could galvaniz"
},
{
"id": "199e8160-a156-47bd-adb9-18278156eade",
"action": "approve",
"note": "Queue review 10-15: On-subject: Elijah's ad about Dalton (10-06 precedent).",
"label": "Dalton · 2026-10-14 · Ryan Elijah ad targets Bale Dalton over investments in Commu"
},
{
"id": "f11431d3-80bc-4733-a3b0-1c623d740847",
"action": "approve",
"note": "Queue review 10-15: On-subject: Elijah launches an ad about Dalton.",
"label": "Elijah · 2026-10-14 · Ryan Elijah ad targets Bale Dalton over investments in Commu"
},
{
"id": "3306b76c-a678-4531-8f20-61566a4cda26",
"action": "approve",
"note": "Queue review 10-15: On-subject: Democratic senators campaign for Nixon.",
"label": "Nixon · 2026-10-14 · Angie Nixon Receives On-The-Ground Support From Democratic L"
},
{
"id": "1353977c-839a-4b7c-ad2c-ab8fac98ce5c",
"action": "approve",
"note": "Queue review 10-15: Voting information: how to find your polling place.",
"label": "election news · 2026-10-14 · Where to find your polling place for Election Day 2026"
},
{
"id": "cd4bc063-5cd8-4e7b-9f26-e99e0b976692",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida (California).",
"label": "election news · 2026-10-14 · Justice Department threatens California with legal action ov"
},
{
"id": "c673f0d8-22e1-4800-96cf-5426b8e3a6b2",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida: national campaign strategy on healthcare.",
"label": "election news · 2026-10-14 · Voters View Healthcare Affordability as a Top Issue in the M"
},
{
"id": "493d3882-b738-4ccf-856e-52cad69b2d88",
"action": "reject",
"note": "Queue review 10-15: Local story, not about the election (a Broward school board dispute).",
"label": "election news · 2026-10-14 · Broward Teachers Union accuses school board of due process v"
},
{
"id": "0efcb1b2-607e-4b00-8ce7-b962fe76757d",
"action": "approve",
"note": "Queue review 10-15: On-subject: the Florida GOP's criticism of national Democrats backing Nixon (a different actor from the Murphy story, so a separate event).",
"label": "Nixon · 2026-10-14 · Florida GOP: National Democrats want to bring socialist agen"
},
{
"id": "b5d39a3c-d6f4-4cdd-8cfb-52f2d3c671fb",
"action": "reject",
"note": "Queue review 10-15: Local story, not about the election (a Broward school board dispute).",
"label": "election news · 2026-10-14 · Broward Teachers Union president plans to file lawsuit over "
},
{
"id": "358d71ea-1614-4f63-94d6-5ff5e434af9b",
"action": "approve",
"note": "Queue review 10-15: On-subject: Moody's ad about Nixon (10-06 precedent).",
"label": "Moody · 2026-10-14 · Ashley Moody Puts 'Tough on Crime' Resume Against Angie Nixo"
},
{
"id": "0afdae5f-d5a5-4bc2-acf3-4e4d210f8c9a",
"action": "approve",
"note": "Queue review 10-15: On-subject: Moody's ad is about Nixon (10-06 precedent).",
"label": "Nixon · 2026-10-14 · Ashley Moody Puts 'Tough on Crime' Resume Against Angie Nixo"
},
{
"id": "f7880eef-d7dd-4019-a1b0-dbf29e1bedac",
"action": "approve",
"note": "Queue review 10-15: Amendment 3: what nonprofits think about the property tax amendment.",
"label": "election news · 2026-10-14 · What nonprofits are thinking about Amendment 3, and a new fi"
},
{
"id": "c2fa44f6-0cc7-433f-9550-ad61594215d0",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Scope: FL-13 (Pinellas) is not a race we cover, and the item would show only to Hillsborough voters.",
"label": "election news · 2026-10-14 · Luna vs. Gray: Meet the candidates running for Congress in F"
},
{
"id": "60d8fcbf-347f-4137-9345-29bf0cc63eda",
"action": "reject",
"note": "Queue review 10-15: Poll: left out of the home column (founder 2026-10-11).",
"label": "election news · 2026-10-14 · Poll Finds Amendment 3 Failing to Pass When Voters Informed "
},
{
"id": "44a9d270-5a62-4afa-b27e-629f52a83a18",
"action": "approve",
"note": "Queue review 10-15: On-subject: Moody leads a request to the Pentagon for more Florida National Guard personnel.",
"label": "Moody · 2026-10-14 · Florida Lawmakers Request Florida National Guardsmen Increas"
},
{
"id": "e20ef1b0-ae2e-4e10-9400-8b349a7a39b2",
"action": "approve",
"note": "Queue review 10-15: Florida election: DeSantis's endorsement in the governor's race.",
"label": "election news · 2026-10-14 · Who does DeSantis endorse for governor?"
},
{
"id": "de324e33-cbc8-4df8-bd81-01628aed2058",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Fails the neutrality lint: 'aims to' in the summary.",
"label": "election news · 2026-10-14 · Osceola County voters will weigh school property tax hike in"
},
{
"id": "add73737-f5d9-49bc-b07c-39ed8619bebe",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'Last Squeeze' daily roundup strings unrelated items together; Donalds is one quoted line among many.",
"label": "Donalds · 2026-10-14 · Last Squeeze🍊— 10.14.2026 — DeSantis Awards $27M in Infrastr"
},
{
"id": "90ecb6f6-7e96-4c9c-9409-b304432604d5",
"action": "reject",
"note": "Queue review 10-15: [A2/P2] The Floridian's 'Last Squeeze' daily roundup strings unrelated items together; Beltran is one quoted line among many.",
"label": "Beltran · 2026-10-14 · Last Squeeze🍊— 10.14.2026 — DeSantis Awards $27M in Infrastr"
},
{
"id": "e4bc7900-289b-4deb-82b8-3c4192dd0fc4",
"action": "approve",
"note": "Queue review 10-15: Voting information: a Florida voter's guide to Election Day.",
"label": "election news · 2026-10-14 · Election Day 2026: Florida voter's guide to key races, candi"
},
{
"id": "5b3b7866-6d74-4da6-a542-0d957221e293",
"action": "reject",
"note": "Queue review 10-15: Not on the Nov 3 ballot: Tampa's charter changes go to voters in a March municipal election.",
"label": "election news · 2026-10-14 · Tampa voters could change the city’s constitution in March, "
},
{
"id": "9581c7b8-d1a4-419c-b787-b9b3596aa67d",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida (Maine).",
"label": "election news · 2026-10-14 · Speaker Johnson dismisses skeptics as he campaigns for House"
},
{
"id": "6481edf8-68a2-4abc-8f22-dcb5e9a74340",
"action": "reject",
"note": "Queue review 10-15: Not on the Nov 3 ballot: Tampa's charter changes go to voters in a March municipal election.",
"label": "election news · 2026-10-14 · Tampa City Council and the mayor chose who reviewed the city"
},
{
"id": "bc295f4a-5e87-4f6f-a133-4b20800b41dd",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Scope: a St. Petersburg (Pinellas) city council forum, shown only to Hillsborough voters.",
"label": "election news · 2026-10-14 · St. Petersburg City Council candidates agreed on most issues"
},
{
"id": "8c31c1d2-592c-4940-9ffb-bcf7bb444874",
"action": "approve",
"note": "Queue review 10-15: On-subject: a fact-check of an attack ad about Moskowitz's stock trades.",
"label": "Moskowitz · 2026-10-14 · Ad targeting Moskowitz cites up to $8 million in stock trade"
},
{
"id": "0c16dce7-ae71-4ffc-9e7a-4be25daab26d",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Fails the neutrality lint: 'claims' in the title.",
"label": "Jolly · 2026-10-14 · EXCLUSIVE: Campaign manager sounds alarm on Sen. Brian Natha"
},
{
"id": "dd3c50da-dea4-4a1b-ab12-f4fc4ca9bc74",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Subject: a music story about a band joining a Pride parade float; Frost is named only as the float's host.",
"label": "Frost · 2026-10-14 · Queer-led punk band The Pheromones to join Rep. Maxwell Fros"
},
{
"id": "1b6cc8fa-6ed2-4c50-920d-586dc405a883",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Scope: a Hollywood (Broward) city budget meeting on Amendment 3, shown only to Miami-Dade voters.",
"label": "election news · 2026-10-14 · Hollywood residents meet with city to learn more about Amend"
},
{
"id": "f9c8a67d-abfd-4f49-acd9-60b15a2dea90",
"action": "reject",
"note": "Queue review 10-15: [AUDIT] Scope: Hollywood (Broward) city budget estimates for Amendment 3, shown only to Miami-Dade voters.",
"label": "election news · 2026-10-15 · Hollywood officials warn Amendment 3 could cost city $34 mil"
},
{
"id": "d9c857fa-a913-4fd2-9af5-8f2fe1636ce0",
"action": "reject",
"note": "Queue review 10-15: Not Florida's election: another country's election.",
"label": "election news · 2026-10-15 · Brazil's Senate approves a shorter workweek in major win for"
},
{
"id": "9e3bbe84-8f0b-48d9-9b07-0f632c68d294",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida (California).",
"label": "election news · 2026-10-15 · Justice Department threatens California with legal action ov"
},
{
"id": "2cf44a35-488c-4eb0-9e50-480ec2b4206a",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida (Montana).",
"label": "election news · 2026-10-15 · Trump defends gifted Air Force One from Qatar and makes 2nd "
},
{
"id": "934cffda-b992-4500-934f-611c8502a6fa",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida (Colorado).",
"label": "election news · 2026-10-15 · With anger spreading over Iran war, Democrats hope to flip R"
},
{
"id": "4d6306e2-fd91-42ad-9a10-f396be7acbd7",
"action": "reject",
"note": "Queue review 10-15: National story, not about voting in Florida.",
"label": "election news · 2026-10-15 · Everyone has the same question in the midterms — where's the"
}
];

  if (!location.pathname.startsWith("/admin")) {
    console.error("Run this on the signed-in /admin site, not here.");
    return;
  }
  const todo = DECISIONS;
  const nA = todo.filter((d) => d.action === "approve").length;
  const nR = todo.length - nA;
  const head = `${DRY_RUN ? "DRY RUN: " : ""}${todo.length} decisions: ${nA} approve, ${nR} reject`;
  if (!DRY_RUN && !confirm(`${head}.\n\nSend them now, as you?`)) return;
  console.log(head);

  const log = [];
  window.__queueLog = log;
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
