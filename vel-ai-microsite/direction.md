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

- **Display:** system grotesque stack (`system-ui`) at weight 800–900, tight tracking,
  clamp-sized to ~11vw. The film is the type; weight contrast does the art direction.
- **Voice:** `ui-monospace` for everything the machines say — timestamps, missed-call
  notifications, the call transcript. The mono voice is how the visitor knows who is
  speaking without labels.

System fonts keep the page at zero font bytes — the whole build ships under 40 KB.

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
