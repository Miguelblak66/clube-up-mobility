#!/bin/bash
# scripts/insert_admin.sh
# Usage: ./scripts/insert_admin.sh admin@example.com "MyPassword" "Admin Name"
# This script requires node (to run tools/hash_password.js) and sqlite3.

set -euo pipefail

EMAIL=${1:-}
PASSWORD=${2:-}
NAME=${3:-Administrator}
DB_FILE="local.db"

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo "Usage: $0 <email> <password> [name]"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is required. Install node and try again."
  exit 1
fi

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "sqlite3 is required. Install sqlite3 and try again."
  exit 1
fi

if [ ! -f "$DB_FILE" ]; then
  echo "Database $DB_FILE not found. Run scripts/create_local_db.sh first."
  exit 1
fi

PAYLOAD=$(node tools/hash_password.js "$PASSWORD")
# PAYLOAD is a JSON object: {"salt":"...","hash":"..."}
SALT=$(echo "$PAYLOAD" | node -e "const s=fs.readFileSync(0,'utf8'); console.log(JSON.parse(s).salt)")
HASH=$(echo "$PAYLOAD" | node -e "const s=fs.readFileSync(0,'utf8'); console.log(JSON.parse(s).hash)")

SQL="INSERT INTO administradores (nome, email, senha, salt) VALUES ('${NAME//"/""}', '${EMAIL//"/""}', '${HASH}', '${SALT}');"

sqlite3 "$DB_FILE" <<SQL
$SQL
SQL

echo "Inserted admin ${EMAIL} into $DB_FILE"
