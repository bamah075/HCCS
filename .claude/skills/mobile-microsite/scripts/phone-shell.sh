#!/usr/bin/env bash
# phone-shell.sh — write a preview page that frames the site inside an iPhone
# shell, so the mobile build can be shown on a laptop.
#
# Usage:
#   phone-shell.sh --url http://localhost:3000 --out preview.html
#   phone-shell.sh --url ./index.html --out preview.html   # relative iframe src
set -euo pipefail

URL="" OUT="preview.html"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --url) URL="$2"; shift 2 ;;
    --out) OUT="$2"; shift 2 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done
[[ -n "$URL" ]] || { echo "need --url <site url or path>" >&2; exit 2; }

cat > "$OUT" <<EOF
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Phone preview</title>
<style>
  html,body{margin:0;height:100%;background:#111;display:grid;place-items:center;
    font:13px/1.4 -apple-system,system-ui,sans-serif;color:#666}
  .shell{position:relative;width:410px;height:864px;max-height:94vh;aspect-ratio:410/864;
    background:#000;border-radius:56px;padding:10px;
    box-shadow:0 0 0 2px #333,0 30px 80px rgba(0,0,0,.7)}
  .shell iframe{width:100%;height:100%;border:0;border-radius:46px;background:#000}
  .island{position:absolute;top:22px;left:50%;transform:translateX(-50%);
    width:118px;height:34px;background:#000;border-radius:20px;z-index:2}
  .hint{position:fixed;bottom:14px;left:0;right:0;text-align:center}
  @media (max-height:900px){.shell{transform:scale(calc(94vh/864));transform-origin:center}}
</style>
</head>
<body>
  <div class="shell">
    <div class="island"></div>
    <iframe src="$URL" title="site preview"></iframe>
  </div>
  <p class="hint">Scroll inside the phone. This is the real mobile build at 390&times;844.</p>
</body>
</html>
EOF

echo "wrote $OUT (iframe -> $URL)"
echo "note: if the site is a local file, some browsers block file:// iframes — serve it instead: npx serve ."
