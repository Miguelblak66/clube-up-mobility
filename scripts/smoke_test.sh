#!/bin/bash
# scripts/smoke_test.sh
# Simple smoke tests for the API. Run the API locally with 'npx wrangler pages dev .' then execute this script.

set -euo pipefail

API_URL=${API_URL:-http://localhost:8788}

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required to run smoke tests."
  exit 1
fi

timestamp=$(date +%s)
EMAIL="test.user.${timestamp}@example.com"
PASSWORD="TestPass${timestamp}"
NAME="Test User ${timestamp}"
PHONE="+5511999${timestamp: -6}"
CITY="Cidade Teste"
PROFILE="cliente"

echo "Using API_URL=$API_URL"

# 1) Register member
echo "\n1) Registering member: $EMAIL"
register_resp=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/membros/cadastro" \
  -H 'Content-Type: application/json' \
  -d "{\"nome\":\"$NAME\",\"email\":\"$EMAIL\",\"senha\":\"$PASSWORD\",\"phone\":\"$PHONE\",\"city\":\"$CITY\",\"profile\":\"$PROFILE\"}")

http_code=$(echo "$register_resp" | tail -n1)
body=$(echo "$register_resp" | sed '$d')

echo "HTTP $http_code"
echo "$body"

if [ "$http_code" != "201" ]; then
  echo "Registration failed; aborting smoke test."
  exit 1
fi

# 2) Login member
echo "\n2) Logging in member"
login_resp=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/membros/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"senha\":\"$PASSWORD\"}")

http_code=$(echo "$login_resp" | tail -n1)
body=$(echo "$login_resp" | sed '$d')

echo "HTTP $http_code"
echo "$body"

if [ "$http_code" != "200" ]; then
  echo "Login failed; aborting smoke test."
  exit 1
fi

TOKEN=$(echo "$body" | (command -v jq >/dev/null 2>&1 && jq -r '.token' || node -e "process.stdin.pipe(require('fs').createWriteStream(1));") )

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Failed to extract token from login response"
  exit 1
fi

echo "Token: $TOKEN"

# 3) Get profile
echo "\n3) Fetching profile"
profile_resp=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/api/membros/perfil" \
  -H "Authorization: Bearer $TOKEN")

http_code=$(echo "$profile_resp" | tail -n1)
body=$(echo "$profile_resp" | sed '$d')

echo "HTTP $http_code"
echo "$body"

if [ "$http_code" != "200" ]; then
  echo "Profile fetch failed; aborting smoke test."
  exit 1
fi

# Done
cat <<EOF

Smoke test completed successfully.
Registered: $EMAIL
Login token: $TOKEN

Run additional tests (admin/partner) by creating admin/partner users in local.db and using the /api/admin/login and /api/parceiros/login endpoints.
EOF
