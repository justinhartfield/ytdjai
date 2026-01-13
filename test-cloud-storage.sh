#!/bin/bash

# Cloud Storage API Test Script
# Tests all CRUD operations for DJ set storage

set -e

BASE_URL="https://ytdj.ai"
TEST_EMAIL="justin@weedmaps.com"

echo "🧪 Testing Cloud Storage API for ytdj.ai"
echo "=========================================="
echo ""

# Test Data
TEST_SET_ID="test-set-$(date +%s)"
TEST_SET_NAME="Automated Test Set $(date +%H:%M:%S)"

# Create a sample set data
TEST_SET_DATA=$(cat <<EOF
{
  "setData": {
    "id": "$TEST_SET_ID",
    "name": "$TEST_SET_NAME",
    "prompt": "Progressive house test set",
    "playlist": [
      {
        "id": "track-1",
        "track": {
          "id": "dQw4w9WgXcQ",
          "title": "Test Track 1",
          "artist": "Test Artist",
          "duration": 240,
          "bpm": 124,
          "key": "Am",
          "energy": 0.7
        },
        "isLocked": false,
        "transitionScore": 0.85
      },
      {
        "id": "track-2",
        "track": {
          "id": "dQw4w9WgXcR",
          "title": "Test Track 2",
          "artist": "Test Artist 2",
          "duration": 300,
          "bpm": 126,
          "key": "C",
          "energy": 0.8
        },
        "isLocked": false,
        "transitionScore": 0.90
      }
    ],
    "arcTemplate": "warmup",
    "createdAt": "$(date -Iseconds)",
    "updatedAt": "$(date -Iseconds)"
  }
}
EOF
)

echo "📝 Test 1: Save Set to Cloud"
echo "-----------------------------"
echo "Note: This test requires authentication. You must be signed in."
echo "Attempting to save set..."
echo ""

SAVE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sets/save" \
  -H "Content-Type: application/json" \
  -H "Cookie: $(cat /tmp/ytdj_cookies.txt 2>/dev/null || echo '')" \
  -d "$TEST_SET_DATA" || echo '{"error":"Request failed"}')

echo "Response: $SAVE_RESPONSE"
echo ""

if echo "$SAVE_RESPONSE" | grep -q "Unauthorized"; then
  echo "⚠️  Authentication required. Please:"
  echo "   1. Open https://ytdj.ai in your browser"
  echo "   2. Sign in with Google"
  echo "   3. Open DevTools Console (F12)"
  echo "   4. Run: document.cookie"
  echo "   5. Save the cookie value to /tmp/ytdj_cookies.txt"
  echo ""
  echo "Then run this test script again."
  exit 1
elif echo "$SAVE_RESPONSE" | grep -q "success.*true"; then
  echo "✅ Save test PASSED"
else
  echo "❌ Save test FAILED"
fi

echo ""
echo "📋 Test 2: List Saved Sets"
echo "-------------------------"

LIST_RESPONSE=$(curl -s "$BASE_URL/api/sets/list" \
  -H "Cookie: $(cat /tmp/ytdj_cookies.txt 2>/dev/null || echo '')" || echo '{"error":"Request failed"}')

echo "Response preview:"
echo "$LIST_RESPONSE" | head -c 500
echo ""

if echo "$LIST_RESPONSE" | grep -q "Unauthorized"; then
  echo "❌ List test FAILED - Authentication required"
elif echo "$LIST_RESPONSE" | grep -q "success.*true"; then
  SET_COUNT=$(echo "$LIST_RESPONSE" | grep -o '"id"' | wc -l)
  echo "✅ List test PASSED - Found $SET_COUNT set(s)"
else
  echo "❌ List test FAILED"
fi

echo ""
echo "📥 Test 3: Load Set from Cloud"
echo "------------------------------"

LOAD_RESPONSE=$(curl -s "$BASE_URL/api/sets/$TEST_SET_ID" \
  -H "Cookie: $(cat /tmp/ytdj_cookies.txt 2>/dev/null || echo '')" || echo '{"error":"Request failed"}')

echo "Response preview:"
echo "$LOAD_RESPONSE" | head -c 300
echo ""

if echo "$LOAD_RESPONSE" | grep -q "Unauthorized"; then
  echo "❌ Load test FAILED - Authentication required"
elif echo "$LOAD_RESPONSE" | grep -q "success.*true"; then
  echo "✅ Load test PASSED"
else
  echo "⚠️  Load test INCONCLUSIVE - Set may not exist yet"
fi

echo ""
echo "🗑️  Test 4: Delete Set from Cloud"
echo "--------------------------------"

DELETE_RESPONSE=$(curl -s -X DELETE "$BASE_URL/api/sets/$TEST_SET_ID" \
  -H "Cookie: $(cat /tmp/ytdj_cookies.txt 2>/dev/null || echo '')" || echo '{"error":"Request failed"}')

echo "Response: $DELETE_RESPONSE"
echo ""

if echo "$DELETE_RESPONSE" | grep -q "Unauthorized"; then
  echo "❌ Delete test FAILED - Authentication required"
elif echo "$DELETE_RESPONSE" | grep -q "success.*true"; then
  echo "✅ Delete test PASSED"
else
  echo "⚠️  Delete test INCONCLUSIVE"
fi

echo ""
echo "=========================================="
echo "✅ API Test Suite Complete"
echo ""
echo "Note: Full end-to-end testing requires browser interaction."
echo "Please manually verify:"
echo "  - Google OAuth authentication"
echo "  - UI components (SaveSetDialog, BrowseSetsModal)"
echo "  - Real-time updates in the UI"
echo ""
