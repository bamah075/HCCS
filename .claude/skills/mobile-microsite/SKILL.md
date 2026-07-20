---
name: mobile-microsite
description: Build a cinematic, conversion-focused scroll-film website from a single prompt — the whole page behaves like one continuous film that plays as the visitor scrolls, designed phone-first and verified on a phone viewport. Use this skill whenever the user asks to "spec site for [industry]", "build me a scroll-film site", "cinematic scroll site", a "scrolly-telling" page, a "wow" landing page, a mobile microsite, or any one-page marketing site meant to be shown live on a phone and to sell. Also trigger when the user wants a scroll-scrubbed video website, a kinetic typography site, or an animated editorial one-pager for a brand or industry.
---

# Mobile Microsite

You are building a one-page website where the whole page behaves like one continuous film that plays as the visitor scrolls. The bar: someone watches a 20 second clip of the site on a phone and says "no one has seen a website do that." These sites are built to be shown live and to sell.

Everything is designed, generated, and tested at phone-portrait size first (390x844 is the reference viewport). Desktop is the adaptation, never the starting point.

## The three styles

Pick one style per build (the user chooses, or you recommend based on the brand):

- **Cinematic Film** — real generated footage, shot to shot, that scrubs as you scroll. Best when the brand sells a world or an experience: travel, food, fitness, real estate, product craft. Requires Lane B (a video engine).
- **Kinetic Type** — the words themselves are the film. Huge typography choreographed as one journey. Best when the brand sells authority, clarity, or a promise: law, finance, consulting, software, agencies. Pure code, Lane A.
- **Graphic Editorial** — flat color, cutouts, and print texture, animated like a moving magazine. Best when the brand sells culture, craft, or attitude: fashion, music, hospitality, indie products. Pure code, Lane A.

## The two lanes

- **Lane A, pure code (default, zero setup).** The film is code-driven motion. Costs nothing, needs no accounts. Carries Kinetic Type and Graphic Editorial.
- **Lane B, cinematic footage (opt-in).** Real generated video, chained shot to shot via `scripts/chain-step.sh`. Needs the user's own video engine CLI and credits. Always quote the rough cost (~40 credits of draft footage per site) BEFORE spending anything, draft cheap first, and only render full resolution after the user approves the drafts.

If the user hasn't chosen, default to Lane A. Never assume a video engine exists — probe for it, and fall back to Lane A gracefully if it's missing.

## Intake

Before building, ask (compactly, in one message — and every question must have a "you decide" escape hatch so the user can defer any of them to you):

1. What are we building, and the one-line feeling? ("calm luxury", "underground energy", ...)
2. Should Claude create the visual world, or use the user's own assets (logo, photos, brand colors)?
3. The journey: where does the film start and where does it end?
4. Real video or pure motion (Lane B or Lane A)? Default Lane A.
5. What comes after the film: sections, the main call to action, contact and socials.
6. Where it goes live: local only, or the user's own Vercel.

If the user opened with a full brief (or says "you decide everything"), skip straight to concepts.

## Concept pitch (required gate)

Before writing any code or generating any footage, pitch **two or three named concepts** and mark the recommended one. Each concept is a short paragraph: the name, the style (of the three), the emotional arc in one sentence, and the signature moment — the single beat that makes someone screen-record it. The user picks one or says "you choose." Do not skip this gate; it is cheap and it prevents building the wrong film.

## The five stages

Run every build through these stages in order.

### Stage 1 — Research

Learn the industry or brand before writing a word.

- Identify the **real customer**: who actually pays, what they're afraid of, what they've already tried.
- Mine the **customer's own words**. Search reviews, forums, competitor sites. The copy must use the vocabulary the customer uses, not the vocabulary the industry uses about itself. ("I never have time" beats "time-optimization solutions.")
- Note 3–5 competitor sites and what they all look like — the film must NOT look like them.
- If the user gave a real brand, pull its actual voice, offer, and proof points. Never invent testimonials, credentials, statistics, or claims for a real business; use placeholders clearly marked `[PLACEHOLDER]` where real proof is needed.

Output of this stage: a short research brief (customer, pain, desire, vocabulary bank, differentiation angle) saved to the build folder as `research.md`.

### Stage 2 — Story

Map the film's chapters to a sales arc. The default arc, in order:

1. **The hook** — one image or line that names the world. No logo dump, no nav bar hero.
2. **The pain** — the customer's current reality, in their words.
3. **The fear** — what it costs them to stay there (implied, not hammered).
4. **The turn** — the brand enters as the mechanism of change, not the hero. The customer is the hero.
5. **The after-state** — life on the other side, sensory and specific.
6. **The offer** — one clear call to action. One. Not a menu.

Each chapter becomes one scroll "chapter" of the film with a beat count. Write the full copy at this stage, before any visuals — the copy IS the storyboard. Copy rules:

- Short lines. A phone screen fits ~6 words per display-size line.
- Every chapter earns the next scroll. End chapters on tension or an unfinished thought.
- Cut every sentence that a competitor could also truthfully say.
- The CTA is a verb the customer wants to do, not "Submit" or "Learn more."

Output: `story.md` with chapters, beats, and final copy.

### Stage 3 — Film

Art-direct the world, then produce it.

- Define the world in `direction.md`: 2–3 colors (one dominant), 1–2 typefaces (one display, one text), motion personality (e.g., "slow dolly, no cuts" vs. "hard snaps"), and sound direction if any.
- **Lane A:** design the motion choreography per chapter. Read `references/engine.md` for how scroll-scrubbing works, then `references/wow.md` for the delight kit. The film is built from transforms, masks, canvas, and SVG — never from layout properties.
- **Lane B:** read `references/playbook.md` — it is the footage law. Storyboard shots, quote the credit cost, get approval, then generate drafts with `scripts/chain-step.sh` (one clip chained from the last frame of the previous one), and stitch with `scripts/assemble.sh`. Only after the user approves drafts, re-render at full resolution.

### Stage 4 — Build

Write the whole page from scratch for this brand. No templates, no CSS frameworks, no component libraries — a single `index.html` (plus assets) with hand-written CSS and vanilla JS, or the smallest possible build if the user's stack demands it. Reasons: the film's timing is bespoke per brand, frameworks fight scroll-scrubbing, and the page must load fast on a phone over cellular.

Build order:

1. Static skeleton: all chapters laid out top to bottom, real copy in place, correct fonts and colors. Verify it reads as a story even with zero motion (this is also the reduced-motion and no-JS fallback).
2. The scroll engine (per `references/engine.md`): one scroll timeline driving every chapter.
3. The delight layer (per `references/wow.md`): preloader, interactive moments, finale, optional sound.
4. The after-film sections: the offer, contact, socials — conventional, fast, thumb-reachable. The film sells; these close.

Performance is a feature of the film: animate only `transform` and `opacity`, keep the main thread free, lazy-decode frames, and keep total page weight honest for cellular (Lane A well under 1 MB before fonts; Lane B frames budgeted per `engine.md`).

### Stage 5 — Verify

Never declare the build done without running verification.

1. Run `npm i puppeteer-core` in the build folder if not already installed (needs Node 18+ and an installed Chrome/Chromium).
2. Run `scripts/verify.js` against the local page. It screenshots every beat at the phone viewport, runs a scroll jank test, and records a short teaser MP4.
3. **Look at every screenshot yourself.** Check: copy legible at phone size, no clipped text, no layout jumps between beats, the signature moment lands.
4. If the jank report shows dropped frames, fix the cause (usually: animating layout properties, oversized images, unthrottled scroll handlers) and re-run.
5. Generate the laptop preview with `scripts/phone-shell.sh` so the user can see the mobile build framed in an iPhone shell.

Deliverables at the end: the site, the phone preview page, and the teaser MP4 ready to post as a Reel.

## Conversion rules (apply throughout)

- One page, one offer, one CTA — repeated, not multiplied.
- The film's job is emotion; the sections after it do logistics. Don't mix them.
- Every scroll must be earned; if a chapter doesn't advance desire, cut it.
- Proof over adjectives: numbers, names, and specifics beat "premium" and "world-class." If real proof doesn't exist yet, use marked placeholders — never fabricate.
- The CTA must be reachable within one thumb-flick of the finale.

## File map

- `references/playbook.md` — the footage law (Lane B): storyboarding, chaining, drafting, cost control. Read before any video generation.
- `references/engine.md` — the page engine: how scroll scrubbing and motion actually work. Read before writing the scroll code.
- `references/wow.md` — the delight kit: preloader, interactive scroll moments, finale payoff, sound, touch. Read during Stage 3/4.
- `scripts/chain-step.sh` — generate one video clip chained from the previous clip's last frame, then check the seam.
- `scripts/assemble.sh` — stitch clips into one master and extract the scrub frame set.
- `scripts/verify.js` — phone-viewport screenshots per beat, jank test, teaser recording.
- `scripts/phone-shell.sh` — write a laptop preview page framing the site in an iPhone shell.

The scripts do only mechanical work. All taste-heavy work — concepts, art direction, copy, and the page code itself — is yours, fresh for every brand.

## Ground rules

- Zero personal data ships with this skill: no keys, no accounts, no personal paths. The user brings their own engine credentials for Lane B.
- Always quote Lane B costs before spending credits; drafts before finals; user approval between.
- Respect `prefers-reduced-motion`: the static skeleton from Build step 1 is the fallback, and it must still sell.
- Mobile first is literal: design, generate, and test at phone-portrait size, then adapt to desktop.
