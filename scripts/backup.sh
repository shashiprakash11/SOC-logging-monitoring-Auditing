#!/usr/bin/env bash
set -euo pipefail

TIMESTAMP=$(date +%Y%m%d%H%M%S)
BACKUP_DIR=${BACKUP_DIR:-"./backups"}
mkdir -p "$BACKUP_DIR"

curl -s -X PUT "${OPENSEARCH_URL:-http://localhost:9200}/_snapshot/soc_backup" \
  -H 'Content-Type: application/json' \
  -d '{"type":"fs","settings":{"location":"/usr/share/opensearch/data/snapshots"}}' || true

curl -s -X PUT "${OPENSEARCH_URL:-http://localhost:9200}/_snapshot/soc_backup/snapshot-${TIMESTAMP}?wait_for_completion=true"

PG_DUMP_FILE="$BACKUP_DIR/postgres-${TIMESTAMP}.sql"
pg_dump "$DATABASE_URL" > "$PG_DUMP_FILE"

echo "Backups stored in $BACKUP_DIR"
