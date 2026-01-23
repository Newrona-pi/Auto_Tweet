#!/usr/bin/env bash
set -euo pipefail

: "${BASE_URL:?BASE_URL is required (e.g. https://your-vercel-domain)}"
: "${FEED_KEY:?FEED_KEY is required}"
: "${CLIENT_ID:=executor-dev-01}"

echo "=== Smoke Test: System1 v3.3 APIs ==="
echo "BASE_URL=$BASE_URL"
echo "CLIENT_ID=$CLIENT_ID"

py() { python3 - "$@"; }

iso_in_minutes() {
  local mins="$1"
  py "$mins" <<'PY'
import sys
from datetime import datetime, timedelta, timezone
mins=int(sys.argv[1])
dt = datetime.now(timezone.utc) + timedelta(minutes=mins)
print(dt.strftime("%Y-%m-%dT%H:%M:%SZ"))
PY
}

pick_first_draft_id() {
  py <<'PY'
import sys, json
data=json.load(sys.stdin)
if not isinstance(data, list) or len(data)==0:
  print("")
  sys.exit(0)
first=data[0]
print(first.get("draft_id") or first.get("id") or "")
PY
}

print_preview() {
  local n="${1:-400}"
  py "$n" <<'PY'
import sys
n=int(sys.argv[1])
s=sys.stdin.read()
print(s[:n])
PY
}

echo ""
echo "[1] Trigger summarize (may require ADMIN_API_KEY if configured)"
if [ "${ADMIN_KEY:-}" != "" ]; then
  SUMMARIZE_OUT=$(curl -sS -X POST "$BASE_URL/api/admin/summarize?admin_key=$ADMIN_KEY" -H "Content-Type: application/json" || true)
else
  SUMMARIZE_OUT=$(curl -sS -X POST "$BASE_URL/api/admin/summarize" -H "Content-Type: application/json" || true)
fi
echo "$SUMMARIZE_OUT" | print_preview 400

echo ""
echo "[2] Fetch /api/feed (expect array). First call should be 200."
FEED_JSON=$(curl -sS "$BASE_URL/api/feed?key=$FEED_KEY&client_id=$CLIENT_ID")
echo "$FEED_JSON" | print_preview 400

DRAFT_ID=$(echo "$FEED_JSON" | pick_first_draft_id)
if [ "$DRAFT_ID" = "" ]; then
  echo "ERROR: /api/feed returned empty. Create drafts or check notAfter/state."
  exit 1
fi
echo "Picked draft_id=$DRAFT_ID"

echo ""
echo "[3] Immediate second /api/feed to test server rate limit (may be 429)"
HTTP_HEADERS=$(curl -sS -D - -o /dev/null "$BASE_URL/api/feed?key=$FEED_KEY&client_id=$CLIENT_ID" | tr -d '\r')
STATUS_LINE=$(echo "$HTTP_HEADERS" | head -n 1)
echo "Status: $STATUS_LINE"
RETRY_AFTER=$(echo "$HTTP_HEADERS" | awk -F': ' 'tolower($1)=="retry-after"{print $2}' | head -n 1)
if echo "$STATUS_LINE" | grep -q "429"; then
  if [ "$RETRY_AFTER" = "" ]; then RETRY_AFTER=30; fi
  echo "Rate limited. Sleeping $RETRY_AFTER seconds..."
  sleep "$RETRY_AFTER"
fi

echo ""
echo "[4] Lease draft (NEW->LEASED)"
curl -sS -X POST "$BASE_URL/api/lease?key=$FEED_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"draft_id\": $DRAFT_ID, \"client_id\": \"$CLIENT_ID\"}" | print_preview 400

echo ""
echo "[5] Reserve as SCHEDULE (executeAt < publishAt)"
PUBLISH_AT=$(iso_in_minutes 30)
EXECUTE_AT=$(iso_in_minutes 5)
echo "publishAt=$PUBLISH_AT"
echo "executeAt=$EXECUTE_AT"
curl -sS -X POST "$BASE_URL/api/reserve?key=$FEED_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"draft_id\": $DRAFT_ID,
    \"client_id\": \"$CLIENT_ID\",
    \"mode\": \"SCHEDULE\",
    \"publishAt\": \"$PUBLISH_AT\",
    \"executeAt\": \"$EXECUTE_AT\"
  }" | print_preview 400

echo ""
echo "[6] Reschedule (push further)"
NEW_PUBLISH_AT=$(iso_in_minutes 40)
NEW_EXECUTE_AT=$(iso_in_minutes 10)
curl -sS -X POST "$BASE_URL/api/reschedule?key=$FEED_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"draft_id\": $DRAFT_ID,
    \"client_id\": \"$CLIENT_ID\",
    \"publishAt\": \"$NEW_PUBLISH_AT\",
    \"executeAt\": \"$NEW_EXECUTE_AT\",
    \"reason_code\": \"REPLAN_QUEUE\"
  }" | print_preview 400

echo ""
echo "[7] ACK as SCHEDULED (RESERVED->ACKED)"
curl -sS -X POST "$BASE_URL/api/ack?key=$FEED_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"draft_id\": $DRAFT_ID,
    \"client_id\": \"$CLIENT_ID\",
    \"ack_kind\": \"SCHEDULED\",
    \"result_ref\": \"smoke-test:schedule-created\",
    \"reason_code\": \"OTHER\"
  }" | print_preview 400

echo ""
echo "[8] Verify it no longer appears in /api/feed"
sleep 1
curl -sS "$BASE_URL/api/feed?key=$FEED_KEY&client_id=$CLIENT_ID" | print_preview 300

echo ""
echo "SMOKE TEST PASSED."
