# Art direction — "The Missed Call"

## World

Night → daylight. The film opens in the owner's after-hours world (ink dark, a phone
glowing) and physically brightens when Vel takes the phones. The color shift IS the
story arc.

## Palette (3 colors)

- **Ink** `#05070D` — dominant. The 9pm office, chapters 1–4 and the finale.
- **Bone** `#F2F0EA` — the after-state. Chapter 5 floods to daylight.
- **Signal violet** `#7C5CFF` — Vel. Appears the moment the call is answered and owns
  every interactive element from then on. Before the turn, the only accent is a dim
  red for "missed".

## Type (2 families, zero network requests)

- **Display:** Anton (SIL Open Font License, latin subset embedded as a 12 KB base64
  woff2 — still zero network requests), uppercase, clamp-sized to 16–36vw. The poster
  face carries the whole film; ghost copies with a 1px text-stroke and no fill make
  the depth layers (the drifting "3:47"s in the hook, the giant "VEL" watermark
  behind the call).
- **Voice:** `ui-monospace` for everything the machines say — timestamps, missed-call
  notifications, the call transcript. The mono voice is how the visitor knows who is
  speaking without labels.

## Texture and depth

- SVG feTurbulence grain over the whole film (fixed, opacity .09) — the "shot on
  film" layer that kills the flat-web look.
- Chapter tints: dim red radial in the fear chapter, violet radial in the turn.
- The call card enters with a perspective rotateX and carries a violet glow shadow;
  the finale gets two drifting radial-gradient orbs behind the convergence.

The whole build ships at ~43 KB in one file.

## Motion personality

Hard snaps with weight. Lines slam in (scale 1.4→1) and leave fast; the lerp
(factor 0.12) gives every move inertia. The held beat (the call) is the one slow
moment — typing-speed reveals, a breathing waveform. Finale converges inward.

## Delight kit picks (per wow.md budget: preloader + 2 moments + finale)

1. **Preloader** — "VEL / AI" wordmark assembles over a thin progress line, min 0.9s,
   exits by wiping up to reveal the 3:47 hook.
2. **Held beat** — the signature: scroll answers the ringing phone, transcript scrubs
   on line by line, "BOOKED ✓" stamps in.
3. **The stack** — chapter 3's missed-call notifications pile up under the thumb.
4. **Finale convergence** — words from the story fly into the CTA; the button is the
   only thing left moving (breathing scale).
- Haptics: one 10ms tick per chapter boundary, 20ms on CTA press (Android only).
- Sound: omitted for this build — the story doesn't need it and silence keeps it clean.

## Sound

None. (Opt-in ambience adds nothing to a story about a quiet phone.)
