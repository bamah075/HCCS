#!/usr/bin/env bash
# chain-step.sh — generate one video clip chained from the last frame of the
# previous clip (or from a seed image for the first shot), then check the seam.
#
# The engine call is user-supplied via MICROSITE_ENGINE_CMD, a command template
# with {image}, {prompt}, {out} placeholders. No keys live here; the user's
# engine CLI must already be authenticated. Example:
#   export MICROSITE_ENGINE_CMD='higgsfield generate --model seedance --image {image} --prompt {prompt} --duration 5 --aspect 9:16 --output {out}'
#
# Usage:
#   chain-step.sh --seed seed.png  --prompt "slow dolly ..." --out shots/01.mp4   # first shot
#   chain-step.sh --prev shots/01.mp4 --prompt "steam ..."   --out shots/02.mp4   # chained shot
set -euo pipefail

PREV="" SEED="" PROMPT="" OUT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --prev)   PREV="$2"; shift 2 ;;
    --seed)   SEED="$2"; shift 2 ;;
    --prompt) PROMPT="$2"; shift 2 ;;
    --out)    OUT="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

[[ -n "$PROMPT" && -n "$OUT" ]] || { echo "need --prompt and --out" >&2; exit 2; }
[[ -n "$PREV" || -n "$SEED" ]] || { echo "need --prev <clip> or --seed <image>" >&2; exit 2; }
command -v ffmpeg >/dev/null || { echo "ffmpeg not found (brew install ffmpeg)" >&2; exit 1; }

if [[ -z "${MICROSITE_ENGINE_CMD:-}" ]]; then
  cat >&2 <<'EOF'
MICROSITE_ENGINE_CMD is not set. This script needs your video engine's CLI,
wrapped as a template with {image} {prompt} {out} placeholders, e.g.:

  export MICROSITE_ENGINE_CMD='higgsfield generate --model seedance --image {image} --prompt {prompt} --duration 5 --aspect 9:16 --output {out}'

Any image-to-video engine with a start-image input works (Higgsfield Seedance
is the tested reference; Kie.ai, fal, Replicate follow the same pattern).
EOF
  exit 1
fi

mkdir -p "$(dirname "$OUT")"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# 1. Resolve the start image: seed, or the exact last frame of the previous clip.
if [[ -n "$PREV" ]]; then
  [[ -f "$PREV" ]] || { echo "previous clip not found: $PREV" >&2; exit 1; }
  START="$WORK/start.png"
  ffmpeg -v error -sseof -0.1 -i "$PREV" -frames:v 1 -update 1 -q:v 1 "$START"
  [[ -s "$START" ]] || { echo "could not extract last frame of $PREV" >&2; exit 1; }
else
  [[ -f "$SEED" ]] || { echo "seed image not found: $SEED" >&2; exit 1; }
  START="$SEED"
fi

# 2. Run the engine (template substitution; prompt passed as one shell word).
CMD="${MICROSITE_ENGINE_CMD//\{image\}/$(printf '%q' "$START")}"
CMD="${CMD//\{out\}/$(printf '%q' "$OUT")}"
CMD="${CMD//\{prompt\}/$(printf '%q' "$PROMPT")}"
echo "engine: $CMD"
eval "$CMD"
[[ -s "$OUT" ]] || { echo "engine did not produce $OUT" >&2; exit 1; }

# 3. Seam check: compare the start image against the new clip's first frame.
#    (Only meaningful for chained shots; the first shot has no seam.)
if [[ -n "$PREV" ]]; then
  NEWFIRST="$WORK/newfirst.png"
  ffmpeg -v error -i "$OUT" -frames:v 1 -update 1 -q:v 1 "$NEWFIRST"
  # Mean absolute pixel difference, 0-255 scale, via ffmpeg's psnr filter MAE-ish proxy.
  DIFF=$(ffmpeg -i "$START" -i "$NEWFIRST" -filter_complex "scale2ref[a][b];[a][b]psnr" -f null - 2>&1 \
        | grep -o 'average:[0-9.inf]*' | cut -d: -f2 || true)
  echo "seam PSNR: ${DIFF:-unknown} dB (higher is better)"
  if [[ "$DIFF" == "inf" ]]; then
    echo "seam: identical frames — clean seam."
  elif [[ -n "$DIFF" ]] && awk "BEGIN{exit !($DIFF < 22)}"; then
    echo "seam: HARD MISMATCH (<22 dB). The engine drifted from the start image." >&2
    echo "Reroll this shot before chaining anything on top of it (see playbook.md)." >&2
    exit 3
  elif [[ -n "$DIFF" ]] && awk "BEGIN{exit !($DIFF < 30)}"; then
    echo "seam: soft mismatch (22-30 dB). Likely fixable with a short crossfade in assembly; eyeball it."
  else
    echo "seam: clean."
  fi
fi

echo "OK: $OUT"
