# Handoff: test image-to-video on the Political Animal thumb-scroll still

**For:** a Claude session on the founder's machine, with NodeTool running and the Output Engine plugin installed.
**From:** the cloud session that made the still (2026-10-31). That session could not reach NodeTool (`127.0.0.1:7777` is the founder's machine, not the cloud container).
**Goal:** find out whether a NodeTool image-to-video model can turn the still into a believable first-person shot of a thumb scrolling an Instagram-style feed. This is a test. Nothing is approved, published or spent beyond the cost check in step 3.

## 1. What is in this folder

| File | What it is |
|---|---|
| `thumb-scroll-still.jpg` | The input. 1080×2340 (a full phone screen, about 9:19.5). A phone held level, first person, filling the frame, with an Instagram-style feed on screen and a thumb resting lower right. |
| `thumb-scroll-reference.mp4` | 9 s, 30 fps, same size. A code-made animation of the motion we want: five flicks, the feed follows the thumb and glides, the header and tab bar stay fixed. Use it as the motion reference and as the baseline to beat. |

How the still was made: the hand and phone come from an Alamy stock preview (["Woman hand holding phone and touch display with thumb", image 2FNM8R3](https://www.alamy.com/woman-hand-holding-phone-and-touch-display-with-thumb-isolated-screen-and-background-for-mockup-image426402567.html)), cropped so the frame is about 10% larger than the phone screen. The feed is an HTML mock rendered with Playwright. Its photos are random placeholders from picsum.photos, and its accounts and captions are made up.

## 2. Known problems with the input

- **Watermark.** The thumb carries the Alamy preview watermark ("alamy" letters) and is soft from upscaling. Fine for a test; a final needs the licensed full-resolution image (or a real shoot) with the same crop.
- **Instagram-style, not Instagram.** The screen is a mock. Don't present any output as a real Instagram screen or a real account. It has no political content, and it must stay that way: no party, candidate, official or partisan colour (`AGENTS.md`, `../../HANDOFF.md` §3).
- **No real person's likeness** is involved (hand only).

## 3. Steps

Use the `nodetool-bridge` skill from `docs/general-election/google-ads-research/output-engine/`.

1. **Health.** Run `health`. If NodeTool is not reachable, open it and retry once.
2. **Workflow.** Pick an image-to-video workflow (`references/workflows.md` in the skill): reuse one from `engine.json` `nodetool_workflows`, else a saved one, else `import-example`. Say which and why.
3. **Cost.** No approved `generative` record exists for this project, so there is no cost cap. Tell the founder the model, the clip length and the price per run, and get a yes before the first run. Default to **one** run.
4. **Params.** Image input: `{"type": "image", "uri": "file:///<absolute path to thumb-scroll-still.jpg>"}`. If the model only takes 9:16, centre-crop a copy to 1080×1920 outside the repo and say so. Prompt:

   > First-person view looking down at a smartphone held level in one hand, the phone filling the frame. The thumb drags up the screen in quick flicks and the social media feed scrolls up with it, then glides and slows. The top bar and bottom tab bar stay fixed. The phone and hand stay steady; only the thumb and the feed move. Natural indoor light, no camera movement, no cuts.

   Negative prompt, if the workflow takes one: `camera shake, zoom, extra fingers, warped phone, morphing screen text, second hand, cuts`.
5. **Run.** `run <id> --params "$TMPDIR/params.json" --slug political-animal-thumb-scroll-test`. Output lands in `generated/nodetool/` with its sidecar.

## 4. What to check

Watch the output next to `thumb-scroll-reference.mp4` and report pass or fail on each:

- [ ] The feed actually scrolls upward in the direction of the thumb, not sideways or in place.
- [ ] The thumb keeps its shape (no extra fingers, no melting) and stays in contact with the glass.
- [ ] The phone and hand stay still; no camera drift or zoom.
- [ ] The header and tab bar stay put.
- [ ] Screen content stays readable-ish (text may smear; note how badly).
- [ ] Output size, length and frame rate.

## 5. Report back

Post to the founder: the workflow and model used, the cost, the file path and its sidecar, the checklist results, and a recommendation: generated video, the code-made reference, or a real shoot on a green-screen phone. The output is a candidate only. Don't publish, upload, deliver or delete anything.
