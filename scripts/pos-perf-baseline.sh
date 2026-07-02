#!/usr/bin/env bash
# Capture automated POS frontend performance baseline inputs.
# See docs/runbooks/POS-PERF-BASELINE-CAPTURE.md and
# docs/reports/2026-06-24-pos-perf-baseline.md

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND="$ROOT/MuseBar"
BUILD="$FRONTEND/build"
API_URL="${POS_PERF_API_URL:-https://mosehxl.com}"
WEB_URL="${POS_PERF_WEB_URL:-https://mosehxl.com}"

echo "=== MuseBar POS perf baseline (automated) ==="
echo "Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "Host: $(hostname)"
echo ""

echo "--- Production build ---"
cd "$FRONTEND"
npm run build
echo ""

echo "--- JS bundle assets ---"
if compgen -G "$BUILD/static/js/main.*.js" > /dev/null; then
  MAIN_JS=$(ls -1 "$BUILD"/static/js/main.*.js | head -1)
  MAIN_MAP=$(ls -1 "$BUILD"/static/js/main.*.js.map 2>/dev/null | head -1 || true)
  RAW_KB=$(du -k "$MAIN_JS" | awk '{print $1}')
  GZIP_KB=$(gzip -c "$MAIN_JS" | wc -c | awk '{printf "%.1f", $1/1024}')
  echo "main bundle: $MAIN_JS"
  echo "  raw: ${RAW_KB} KB"
  echo "  gzip (approx): ${GZIP_KB} KB"
  if [[ -n "${MAIN_MAP:-}" && -f "$MAIN_MAP" ]]; then
    MAP_MB=$(du -m "$MAIN_MAP" | awk '{print $1}')
    echo "  source map: ${MAP_MB} MB"
  fi
else
  echo "ERROR: no main.*.js found under $BUILD/static/js" >&2
  exit 1
fi
echo ""

echo "--- All static assets (top 10 by size) ---"
find "$BUILD/static" -type f -printf '%s %p\n' 2>/dev/null | sort -rn | head -10 | while read -r size path; do
  kb=$(awk -v s="$size" 'BEGIN { printf "%.1f", s/1024 }')
  printf '%8s KB  %s\n' "$kb" "${path#$BUILD/}"
done
echo ""

echo "--- Network timing (from this host) ---"
if command -v curl >/dev/null 2>&1; then
  curl -o /dev/null -s -w "WEB ${WEB_URL} → TTFB: %{time_starttransfer}s  total: %{time_total}s\n" "$WEB_URL/" || true
  curl -o /dev/null -s -w "API ${API_URL}/api/health → total: %{time_total}s  http: %{http_code}\n" "${API_URL}/api/health" || true
else
  echo "curl not available; skip network timing"
fi
echo ""

echo "--- Lighthouse (optional; requires Chrome) ---"
if command -v lighthouse >/dev/null 2>&1 || npx --yes lighthouse --version >/dev/null 2>&1; then
  LH_JSON="/tmp/mosehxl-lighthouse-$$.json"
  if npx --yes lighthouse "$WEB_URL" \
    --only-categories=performance \
    --chrome-flags="--headless --no-sandbox" \
    --output=json \
    --output-path="$LH_JSON" \
    --quiet 2>/dev/null; then
    node -e "
const r=require(process.argv[1]);
const a=r.audits;
const score=r.categories.performance.score;
console.log('Lighthouse performance score:', score);
for (const k of ['first-contentful-paint','largest-contentful-paint','total-blocking-time','interactive','speed-index']) {
  const row=a[k];
  if (row) console.log(' ', k+':', row.displayValue);
}
" "$LH_JSON"
    rm -f "$LH_JSON"
  else
    echo "Lighthouse run failed (Chrome may be unavailable in this environment)"
  fi
else
  echo "Lighthouse not available; skip"
fi

echo ""
echo "Done. Copy results into docs/reports/2026-06-24-pos-perf-baseline.md"
echo "For authenticated POS metrics, follow docs/runbooks/POS-PERF-BASELINE-CAPTURE.md on venue hardware."
