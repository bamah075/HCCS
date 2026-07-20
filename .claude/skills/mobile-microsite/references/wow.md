# The Delight Kit

The moments that make someone screen-record the site. Read during Stage 3 (art direction) and Stage 4 (build). Everything here rides on the engine from `engine.md` — same timeline, same performance law.

Budget rule first: a build gets the preloader, **one or two** interactive scroll moments, the finale, and optionally sound and haptics. Not everything. Delight is seasoning; a page made entirely of tricks reads as a demo reel, not a brand. Choose the moments that serve THIS brand's story and cut the rest.

## Contents

1. [The preloader](#the-preloader)
2. [Interactive scroll moments](#interactive-scroll-moments)
3. [The finale payoff](#the-finale-payoff)
4. [Sound](#sound)
5. [Touch effects and haptics](#touch-effects-and-haptics)

## The preloader

The preloader is the title card of the film, not a spinner. It has two jobs: buy time to decode the first chapter's assets, and set the world's tone before frame one.

- Design it in the world: the dominant color, the display face, one moving element (the brand's word tracing in, a shape breathing, a counter in the world's style). 
- Tie it to **real progress** (fonts loaded + first-chapter frames decoded), not a fake timer. If loading is instant, play a compressed version anyway — a minimum of ~0.8 s and a maximum of ~2.5 s; past that, release with whatever is ready and keep loading in the background.
- Exit with intent: the preloader's exit animation should *become* the hook — its shape wipes to reveal frame one, its word becomes the headline. A hard cut from loader to page wastes the moment.
- Keep it inline in the HTML (critical CSS + tiny JS) so it renders before anything else is fetched.

## Interactive scroll moments

These are beats where the visitor realizes the page is responding to *them*. Pick one or two that fit the story; each must still obey reversibility (derived from `p`, scrubs backward cleanly).

- **The held beat**: a chapter where scroll temporarily drives something other than page movement — the scene stays pinned while scroll pours coffee, draws the route, ages the "before" into the "after". This is the most reliable "wait, what?" moment. (Mechanically it's just a long pinned chapter whose local progress drives the effect.)
- **The scrub-aware reveal**: text or imagery that responds to scroll *velocity* — grain intensifies on fast flicks, the world sharpens when the visitor slows down. Compute velocity as `targetP - p` (already available from the lerp) and map it gently. Reward slowing down; never punish scrolling fast.
- **Tilt parallax**: on `deviceorientation` (iOS requires a user-gesture permission request — attach it to an existing tap like the sound toggle, never a standalone permission prompt), let the phone's tilt shift the depth layers a few pixels. Subtle: ±6px max. It makes the world feel physically present in the hand.
- **The touch ripple in-world**: a tap anywhere ripples in the world's material — ink in water, a light flare, grain displacement — drawn on the existing effects canvas. Cheap, delightful, and it makes idle fiddling feel intentional.
- **The counter that isn't a counter**: numbers (price, years, results) that assemble physically — flip like a departure board, pour in as particles — driven by chapter progress.

## The finale payoff

The finale is the conversion moment; the film has been earning it for six chapters. It gets the biggest single effect on the page.

- **Convergence**: elements from every previous chapter (colors, shapes, key words) visibly collapse into one composition around the CTA. The story literally assembles into the offer.
- The CTA itself is alive but calm: a slow breathing scale (`transform: scale(1→1.03)`, ~3 s cycle), or the world's texture flowing through the button. One live element; do not surround it with competing motion — every other animation settles to stillness so the button is the only thing moving.
- After the finale, the page becomes conventional (offer details, contact, socials) — instant, static, thumb-reachable. The show is over; make acting easy. Keep a slim fixed CTA bar (respecting `safe-area-inset-bottom`) once the visitor scrolls past the finale.
- If the visitor scrolls back up into the film, the finale disassembles — reversibility applies to the payoff too.

## Sound

Sound is opt-in, always. Autoplaying audio gets the tab muted and the brand resented.

- Offer a small, in-world toggle (visible from the hook, styled as part of the world — a vinyl icon for a music brand, a steam wisp for coffee). Off by default; remember the choice in `sessionStorage`.
- When on: one ambient loop that belongs to the world (room tone, rain, a low pad), volume ≤ around -18 LUFS feel — background, not soundtrack. Optionally 2–3 one-shot accents tied to chapter boundaries, throttled so scrubbing back and forth doesn't machine-gun them (min ~1.5 s between accents).
- Use the Web Audio API (a single `AudioContext` created on the toggle tap — browsers require a gesture anyway) so volume can duck smoothly with scroll velocity: fast scrolling ducks the ambience, stillness brings it up. That link between thumb and sound is itself a wow moment.
- Total audio weight ≤ ~300 KB; loop it rather than shipping minutes.

## Touch effects and haptics

- **Haptics**: `navigator.vibrate` (Android; silently absent on iOS Safari — feature-check and move on) for single ~10 ms ticks at chapter boundaries and a ~20 ms tick on the CTA press. Never patterns, never repeating. If it fires more than ~8 times in a full scroll, it's noise.
- **Press states**: every tappable thing responds in <100 ms with a transform (scale 0.97) — perceived quality on phones lives in press feedback.
- **The CTA press** is the last impression: press → haptic tick → the button's material reacts (ink spreads, light fires) → then navigate/submit. ~250 ms of theater, no more — never make the action itself feel slow.
- Custom cursors, cursor trails, and hover effects are desktop concerns; on the phone build they don't exist. Spend the effort on touch instead.
