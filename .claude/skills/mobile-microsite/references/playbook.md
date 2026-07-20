# The Footage Law (Lane B — Cinematic Film)

How to storyboard, generate, and chain real video so the whole site plays as one continuous film. Read this fully before generating anything.

## Contents

1. [The chain principle](#the-chain-principle)
2. [Storyboarding](#storyboarding)
3. [Writing shot prompts](#writing-shot-prompts)
4. [Cost control: quote, draft, approve, final](#cost-control)
5. [Generating with chain-step.sh](#generating)
6. [Seams and continuity](#seams-and-continuity)
7. [Assembly and the frame set](#assembly)
8. [Engine notes](#engine-notes)

## The chain principle

The film must feel like one continuous take, not a slideshow of clips. The trick: every shot after the first is generated **image-to-video, starting from the exact last frame of the previous shot**. The engine is forced to continue the world it was handed, so the cut point becomes invisible.

This means shots are generated **strictly in order**. You cannot parallelize the chain. Plan for that in your time budget: a 6-shot film is 6 sequential generations plus review time between them.

One consequence to design around: quality drifts down the chain. Each generation loses a little fidelity, and the last frame of a clip is often the softest. Keep chains to **6–8 shots max**. If the story needs more, break the film into 2 chains at a natural "cut" in the story (a location change, a time jump) where a visible cut is a stylistic choice rather than a failure.

## Storyboarding

Translate the story chapters (from `story.md`) into shots before touching the engine. For each shot write:

- **Shot ID and chapter** it serves.
- **Duration** (engines typically give 4–6 s per clip; assume 5 s unless the engine says otherwise).
- **The single motion.** One camera move OR one subject action per shot, never both fighting. Slow dolly in, slow pan, a hand pouring, steam rising. Scroll-scrubbed footage is viewed at variable speed, so complex fast action falls apart; slow, continuous, directional motion scrubs beautifully.
- **Start state and end state.** The end state matters more than usual: it is the start image of the next shot. End every shot in a composition that can plausibly begin the next one.
- **What the text needs.** The page will overlay copy on this footage. Every shot needs a calm zone — a low-detail region (sky, wall, shadow, table surface) where display type stays legible. Note where it is per shot. Footage with no calm zone is unusable no matter how pretty.

The first shot has no predecessor, so it starts from a **generated or supplied still image**. Art-direct that seed image carefully — its palette, grain, and lens feel propagate down the entire chain.

Portrait first: storyboard and generate at **9:16** (or the engine's closest portrait size). Never generate landscape and crop; composition for a phone is different composition, not smaller composition.

## Writing shot prompts

The prompt for each generation has two parts: the start image does the composition work; the text prompt only has to describe **the motion**.

- Describe motion and only motion: "slow dolly forward toward the espresso machine, steam drifting left, shallow depth of field, no camera shake."
- Repeat the world's style anchors in every prompt (e.g., "35mm film grain, warm tungsten light, muted amber palette") — chained engines still drift, and repeated anchors slow the drift.
- Ban list per prompt: no text or logos in frame (the page supplies all type), no faces unless the concept demands them (faces amplify uncanny artifacts), no fast whip-pans or cuts within a clip.
- Keep prompts short. Long prompts make engines improvise; improvisation breaks continuity.

## Cost control

Non-negotiable sequence, in this order:

1. **Quote first.** Before generating anything, tell the user: number of shots, draft cost, and estimated final cost, in the engine's credit terms. Rough reference: ~40 credits of draft footage per site. Wait for a go-ahead.
2. **Draft cheap.** Generate the full chain at the engine's cheapest/fastest tier first. Drafts exist to validate motion, continuity, and calm zones — not beauty.
3. **Review with the user.** Show the stitched draft (or per-shot stills). Fix bad shots by regenerating only those links and re-chaining downstream shots from the fix.
4. **Final render only after approval.** Re-run the approved chain at full quality. Never jump straight to full quality; a re-rolled final shot costs 5–10x a draft.

Track spend in a `footage-log.md` in the build folder: shot ID, tier, credits, kept/rerolled.

## Generating

Use `scripts/chain-step.sh` for every shot. It does the mechanical work:

```bash
# First shot: from a seed image
scripts/chain-step.sh --seed world-seed.png --prompt "slow dolly ..." --out shots/01.mp4

# Every subsequent shot: chained from the previous clip
scripts/chain-step.sh --prev shots/01.mp4 --prompt "steam rises ..." --out shots/02.mp4
```

The script extracts the last frame of `--prev`, hands it plus the prompt to the engine command, and then runs a seam check comparing the previous clip's last frame to the new clip's first frame.

The engine call itself is user-supplied via the `MICROSITE_ENGINE_CMD` environment variable — a command template with `{image}`, `{prompt}`, `{out}` placeholders. Example for a hypothetical CLI:

```bash
export MICROSITE_ENGINE_CMD='higgsfield generate --model seedance --image {image} --prompt {prompt} --duration 5 --aspect 9:16 --output {out}'
```

If `MICROSITE_ENGINE_CMD` is unset, the script stops and says so — help the user wire up whatever engine CLI they have (Higgsfield Seedance is the tested reference; Kie.ai, fal, Replicate follow the same start-image pattern). Never embed keys in the command; the user's CLI should already be logged in.

## Seams and continuity

After each generation, `chain-step.sh` reports a seam difference score between the chained frames. Interpret it:

- **Clean seam:** proceed to the next shot.
- **Soft mismatch** (exposure or color shifted): often fixable in assembly with a 2–3 frame crossfade; note it and proceed.
- **Hard mismatch** (composition jumped, object teleported): reroll the shot with a firmer motion prompt before chaining anything else on top of it. A broken link corrupts every shot after it.

Also eyeball each clip for: melted hands/objects, text artifacts appearing in-world, motion reversing direction mid-clip (scrubs terribly), and drift away from the palette anchors.

## Assembly

When all shots are approved, run:

```bash
scripts/assemble.sh --shots shots/ --out film/ --fps 24
```

It concatenates the clips into `film/master.mp4` and extracts the numbered frame set (`film/frames/`) plus a `manifest.json` (frame count, fps, dimensions) that the page engine scrubs through. Frame-set budget guidance lives in `engine.md` — as a rule, ~300–450 frames total for the whole film, extracted at a reduced rate (the scrub interpolation makes 12 fps extraction feel continuous).

## Engine notes

- **Reference engine:** Higgsfield Seedance CLI. Accepts a start image, portrait aspect, 5 s clips.
- **Kie.ai / fal / Replicate:** same image-to-video pattern; wrap their CLI or a small curl script in `MICROSITE_ENGINE_CMD`.
- Engines that only do text-to-video (no start image) **cannot chain** and are not usable for Lane B; offer Lane A instead.
- Keep every generated asset inside the build folder. Nothing from the user's engine account should end up committed unless they say so — add `shots/` and `film/` to the build's `.gitignore` by default.
