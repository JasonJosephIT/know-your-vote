# Output Engine project: KYV Florida Group Chat Top 10

The production base for the top 10 videos in [`../ranked-34.md`](../ranked-34.md). Nothing here has been filmed, generated, scored or launched.

| Folder | Contents |
|---|---|
| `brief.md` | Campaign brief (due date, budget and approvers TBD) |
| `characters/` | Ray, Jo, Mel, Dev: candidate sheets with locked wardrobe; faces, builds and voices to choose with the founder |
| `settings/` | Eight built environments: cafe, kitchen table, apartment tour, transit stop, pub quiz, Ray's bedroom, street after rain, living-room couch |
| `uploads/scripts/` | One shot-by-shot script per video: timing, picture, dialogue, on-screen text, fact card, caption draft, guardrails |
| `records/ assets/ generated/ stress-tests/` | Empty; filled by the engine stages |

## The ten scripts

| # | Asset | Script | Setting | Regional |
|---|---|---|---|---|
| 1 | 32 | [Receipts Guy](uploads/scripts/01-receipts-guy.md) | cafe | Shared |
| 2 | 17 | [Apartment Tour: Everything Costs Extra](uploads/scripts/02-apartment-tour.md) | apartment-tour | Shared |
| 3 | 30 | [Political Celebrity Trivia Night](uploads/scripts/03-trivia-night.md) | pub-quiz | Shared |
| 4 | 34 | [The Source Friend Gets Corrected](uploads/scripts/04-source-friend-corrected.md) | group-chat-couch | Shared |
| 5 | 06 | [Commute Update: Still Here](uploads/scripts/05-commute-update.md) | transit-stop | Yes |
| 6 | 28 | [Power Bill Unboxing](uploads/scripts/06-power-bill-unboxing.md) | kitchen-table | Yes |
| 7 | 23 | [Budget Unboxing](uploads/scripts/07-budget-unboxing.md) | kitchen-table | Yes |
| 8 | 31 | [GRWM for School Pickup](uploads/scripts/08-grwm-school-pickup.md) | ray-bedroom | Shared |
| 9 | 29 | [The Fee That Appears at Checkout](uploads/scripts/09-fee-at-checkout.md) | kitchen-table | Shared |
| 10 | 33 | [Follow the Puddle](uploads/scripts/10-follow-the-puddle.md) | street-after-rain | Yes |

Bracketed fields such as `[operator]` or `[body]` in the regional scripts must be filled from a current official source before export.

## Readiness (2026-10-13, this cloud session)

The keys file, NodeTool, Open Design and MiroFish were all unavailable here, so no image, video, voice or stress-test runs are possible from this session. Writing and revising sheets and scripts, and running `engine-stage` without tools, all work. On the machine that runs the engine, put the keys in `~/.config/output-engine/keys.env` (mode 600) and start NodeTool and MiroFish.

## Next steps

1. Lock each character's face, build, skin token and voice with the founder (`character-creation`).
2. Run the input stage (`engine-stage`), pointing at `brief.md` and `uploads/scripts/`.
3. Stress-test the top scripts (`idea-stress-test`) once TypeSafe and MiroFish are reachable.
