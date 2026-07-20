# The Page Engine

How the scroll scrubbing and motion actually work. Read this before writing the scroll code (Stage 4, step 2). This applies to both lanes; the [frame scrubbing](#frame-scrubbing-lane-b) section is Lane B only.

## Contents

1. [Architecture: one timeline](#architecture-one-timeline)
2. [The scroll driver](#the-scroll-driver)
3. [Chapters and pinning](#chapters-and-pinning)
4. [Frame scrubbing (Lane B)](#frame-scrubbing-lane-b)
5. [Pure-code motion (Lane A)](#pure-code-motion-lane-a)
6. [Typography in motion](#typography-in-motion)
7. [Performance law](#performance-law)
8. [Mobile viewport realities](#mobile-viewport-realities)
9. [Fallbacks](#fallbacks)

## Architecture: one timeline

The entire film is **one master timeline whose playhead is scroll position**. Nothing autoplays; nothing is on a timer. The visitor's thumb is the projector motor. This is what makes the page feel like a film instead of a page with animations on it.

Concretely: compute a single normalized progress value `p` (0 at top, 1 at the end of the film section), then derive every chapter's local progress from it. Each chapter owns a slice of `p` and maps its local 0→1 to its own transforms. One source of truth; no per-element scroll listeners.

Prefer **no animation libraries**. The whole engine below is ~100 lines of vanilla JS. A library is acceptable only if the user's stack already ships one; never add one for this.

## The scroll driver

```js
// One passive listener. One rAF loop. Lerp for weight.
let targetP = 0, p = 0;
const film = document.querySelector('.film');

function measure() {
  const r = film.getBoundingClientRect();
  const total = film.offsetHeight - innerHeight;
  targetP = Math.min(1, Math.max(0, -r.top / total));
}
addEventListener('scroll', measure, { passive: true });
addEventListener('resize', measure);

function tick() {
  p += (targetP - p) * 0.12;          // lerp: the film has inertia, like real footage
  if (Math.abs(targetP - p) < 0.0005) p = targetP;
  render(p);                           // ALL visual updates happen here, once per frame
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
```

Rules baked into that shape:

- The scroll handler only **measures**; it never touches the DOM. All writes happen in one `render(p)` per animation frame. This is the single most important jank preventer.
- The lerp factor (0.10–0.15) gives the scrub cinematic weight. Skip the lerp only for text that must lock crisply to scroll.
- Read layout (`getBoundingClientRect`, `offsetHeight`) only in `measure`/`resize`, never inside `render` — interleaved reads and writes force sync layout.

Scroll length sets pacing: the film section's height should be roughly **5–8 viewport-heights per chapter**. Too short and the film plays like it's being fast-forwarded; too long and thumbs get tired. Tune per chapter — linger on the after-state, move briskly through the pain.

## Chapters and pinning

Each chapter is a full-viewport layer pinned while its slice of the timeline plays:

- Structure: a tall scroller div (sets the scroll length) containing a `position: sticky; top: 0; height: 100svh` stage. The stage holds the chapter layers stacked with `position: absolute`.
- Map `p` to chapters with a helper: `local(p, start, end) = clamp((p - start) / (end - start), 0, 1)`. Give each chapter its `[start, end]` slice, and overlap slices slightly (~0.02) for cross-chapter transitions.
- Ease inside chapters, not across them: apply easing (`easeInOut`) to local progress for individual moves, but keep the master `p` linear so scrubbing stays predictable in both directions.
- Every transition must be **reversible**. The visitor will scroll up. Any effect that only works forward (a one-shot class toggle, a triggered video play) breaks the film. Everything derives from `p`, so scrubbing backward just plays the film backward — preserve that property.

## Frame scrubbing (Lane B)

The footage is displayed as a **frame sequence drawn to a full-viewport `<canvas>`**, not a `<video>` element. Seeking a video element on scroll stutters badly on phones (keyframe intervals); canvas frame-blitting is the technique behind every famous scroll-film site.

- Use the frame set + `manifest.json` from `assemble.sh`. Map `p` (or the chapter's local progress) to a frame index; on each `render`, draw that frame with `drawImage` covering the canvas (compute cover-fit once per resize).
- Only redraw when the index changes.
- **Budget:** ~300–450 frames for the whole film, JPEG/WebP quality ~70, sized to ~portrait 1080px height. Target under 15 MB total footage; under 8 MB is better. The scrub lerp makes 12 fps extraction feel continuous.
- **Loading:** decode the first chapter's frames before the preloader releases (see `wow.md`), then fetch the rest in the background in story order. Store decoded `ImageBitmap`s (`createImageBitmap`) — decoding JPEGs during scroll is a classic jank source. If a frame isn't ready, keep showing the last drawn frame; never flash blank.
- Match canvas resolution to `devicePixelRatio` but cap at 2 — phones don't need 3x film frames.

## Pure-code motion (Lane A)

The film is built from transforms on layered DOM/SVG/canvas. The materials:

- **Layered parallax**: 3+ depth layers per scene moving at different rates sells dimensionality instantly.
- **Masks and clip reveals**: `clip-path: inset()` driven by progress reveals images and type like a shutter; circular clips make lens-like scene transitions.
- **Scale + translate "camera"**: put a whole scene in one wrapper and scrub its `transform: scale() translate()` — a virtual dolly/pan. This one trick makes flat layouts feel filmed.
- **Canvas particles/texture**: grain, dust, steam — one canvas, drawn in `render`, density driven by `p`.
- **SVG line drawing**: `stroke-dashoffset` scrubbed by progress for routes, signatures, diagrams.
- Chapter transitions to reach for: crossfade-through-color (dip to the world's dominant color), match-cut on shape (a coffee ring becomes a sun), and wipes along the scroll axis.

Graphic Editorial adds: hard-edged cutout shapes, oversized rotated type, halftone/grain overlays (a tiled PNG or canvas noise, `opacity` scrubbed), and snap-in moves with easing like `cubic-bezier(.2,.9,.2,1)` — editorial motion snaps, cinematic motion glides.

## Typography in motion

- Animate whole lines or blocks, not per-letter, at display sizes on phones — per-letter spans hundreds of composited layers and reads as gimmick. Exception: one signature per-letter moment maximum, in the hook or finale.
- Type moves on `transform`/`opacity` only. Never animate `font-size`, `letter-spacing`, or anything that reflows.
- Legibility floor: body ≥ 16px, display lines ≤ ~6 words at phone width, contrast ≥ 4.5:1 over whatever footage/texture is behind it (this is why every shot needs a calm zone — see `playbook.md`).
- Fonts: max two families, `font-display: swap`, preload the display face — the hook renders in the display face or the film opens broken.

## Performance law

The film must hold 60fps on a mid-tier phone. The rules:

1. Animate **only `transform` and `opacity`**. Never top/left/width/height/margin/filter on the timeline. (Scrubbed `filter: blur()` is a phone-killer; fake blur with a pre-blurred image layer crossfaded in.)
2. One rAF loop, all writes in `render`, no DOM reads in `render`.
3. `will-change: transform` on the ~5–10 persistent moving layers only; promoting everything eats phone GPU memory and makes things worse.
4. Images: correctly sized (≤2x display size), lazy-decoded (`decoding="async"`), modern formats. The film section never waits on below-the-fold section images.
5. Nothing animates outside the viewport: when a chapter's local progress is 0 or 1, set `visibility: hidden` on it so the compositor skips it.
6. Total JS budget for the engine + wow layer: ~4 KB gzipped territory. If it's growing past that, something is over-built.

The jank test in `verify.js` measures dropped frames during a scripted scroll; treat >5% dropped as a failure to fix, not a note.

## Mobile viewport realities

- Use `100svh` (small viewport height) for stages, never `100vh` — mobile URL bars make `100vh` lie, and the film visibly jumps when the bar collapses. Re-measure on `resize` but ignore height-only changes smaller than ~120px (that's the URL bar, not a rotation).
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` and respect `env(safe-area-inset-*)` for notches — especially for the fixed CTA.
- Momentum scrolling means big velocity spikes; the lerp absorbs them. Never `preventDefault` scroll or hijack the wheel — scroll-jacking is the cardinal sin. Scrubbing works *with* native scroll.
- Test both scroll directions and a fast flick to the bottom; the film must land in a sane state anywhere the thumb stops.

## Fallbacks

- `@media (prefers-reduced-motion: reduce)`: kill the timeline entirely and show the static skeleton (Build step 1) — full copy, static images, everything readable. It must still sell; it's the same story, just a book instead of a film.
- No-JS: the skeleton again (film chapters are real stacked content before the engine enhances them — build them that way, don't build JS-only and bolt on a fallback).
- Old browsers: feature-check (`CSS.supports('position','sticky')`, canvas) once at boot; fail into the skeleton, never into a broken half-film.
