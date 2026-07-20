#!/usr/bin/env bash
# assemble.sh — stitch the approved shots into one master film and extract the
# frame set the page scrubs through, plus a manifest.json describing it.
#
# Usage:
#   assemble.sh --shots shots/ --out film/ [--fps 12] [--height 1080] [--quality 4] [--crossfade 0]
#
#   --shots      directory of clips, stitched in lexical order (01.mp4, 02.mp4, ...)
#   --out        output directory (gets master.mp4, frames/, manifest.json)
#   --fps        frame-extraction rate for the scrub set (default 12; the page's
#                scrub lerp makes 12fps feel continuous — see engine.md)
#   --height     frame height in px, portrait (default 1080)
#   --quality    JPEG quality for frames, ffmpeg qscale 2(best)-10 (default 4)
#   --crossfade  seconds of crossfade between clips to soften soft seams (default 0)
set -euo pipefail

SHOTS="" OUT="" FPS=12 HEIGHT=1080 QUALITY=4 XFADE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --shots)     SHOTS="$2"; shift 2 ;;
    --out)       OUT="$2"; shift 2 ;;
    --fps)       FPS="$2"; shift 2 ;;
    --height)    HEIGHT="$2"; shift 2 ;;
    --quality)   QUALITY="$2"; shift 2 ;;
    --crossfade) XFADE="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

[[ -n "$SHOTS" && -n "$OUT" ]] || { echo "need --shots <dir> and --out <dir>" >&2; exit 2; }
command -v ffmpeg >/dev/null || { echo "ffmpeg not found (brew install ffmpeg)" >&2; exit 1; }

CLIPS=()
while IFS= read -r f; do CLIPS+=("$f"); done < <(find "$SHOTS" -maxdepth 1 -name '*.mp4' | sort)
[[ ${#CLIPS[@]} -gt 0 ]] || { echo "no .mp4 clips in $SHOTS" >&2; exit 1; }
echo "stitching ${#CLIPS[@]} clips..."

mkdir -p "$OUT/frames"
MASTER="$OUT/master.mp4"

if [[ ${#CLIPS[@]} -eq 1 ]]; then
  cp "${CLIPS[0]}" "$MASTER"
elif awk "BEGIN{exit !($XFADE > 0)}"; then
  # Chained xfade filter graph between consecutive clips.
  INPUTS=(); for c in "${CLIPS[@]}"; do INPUTS+=(-i "$c"); done
  FILTER="" ; PREVLABEL="[0:v]" ; OFFSET=0
  for i in $(seq 1 $(( ${#CLIPS[@]} - 1 ))); do
    DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "${CLIPS[$((i-1))]}")
    OFFSET=$(awk "BEGIN{printf \"%.3f\", $OFFSET + $DUR - $XFADE}")
    LABEL="[x$i]"
    FILTER+="${PREVLABEL}[$i:v]xfade=transition=fade:duration=$XFADE:offset=$OFFSET$LABEL;"
    PREVLABEL="$LABEL"
  done
  ffmpeg -v error -y "${INPUTS[@]}" -filter_complex "${FILTER%;}" -map "$PREVLABEL" \
    -c:v libx264 -pix_fmt yuv420p -crf 18 -an "$MASTER"
else
  LIST="$OUT/concat.txt"; : > "$LIST"
  for c in "${CLIPS[@]}"; do printf "file '%s'\n" "$(cd "$(dirname "$c")" && pwd)/$(basename "$c")" >> "$LIST"; done
  # Re-encode (not -c copy): engine clips often differ subtly in encoder params.
  ffmpeg -v error -y -f concat -safe 0 -i "$LIST" -c:v libx264 -pix_fmt yuv420p -crf 18 -an "$MASTER"
  rm -f "$LIST"
fi

# Extract the scrub frame set.
rm -f "$OUT"/frames/*.jpg
ffmpeg -v error -y -i "$MASTER" -vf "fps=$FPS,scale=-2:$HEIGHT" -qscale:v "$QUALITY" "$OUT/frames/%04d.jpg"

COUNT=$(find "$OUT/frames" -name '*.jpg' | wc -l | tr -d ' ')
DIMS=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "$OUT/frames/0001.jpg")
DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$MASTER")
BYTES=$(du -sk "$OUT/frames" | cut -f1)

cat > "$OUT/manifest.json" <<EOF
{
  "frameCount": $COUNT,
  "fps": $FPS,
  "pattern": "frames/%04d.jpg",
  "firstIndex": 1,
  "dimensions": "$DIMS",
  "masterDuration": $DURATION,
  "framesKB": $BYTES
}
EOF

echo "master:  $MASTER (${DURATION}s)"
echo "frames:  $COUNT @ ${FPS}fps, $DIMS, ${BYTES}KB total"
echo "manifest: $OUT/manifest.json"
if [[ "$COUNT" -gt 450 ]]; then
  echo "WARNING: $COUNT frames exceeds the ~450 budget (engine.md). Lower --fps or trim the film." >&2
fi
if [[ "$BYTES" -gt 15360 ]]; then
  echo "WARNING: frame set is over 15MB. Raise --quality number (more compression) or lower --height." >&2
fi
