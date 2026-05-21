#!/bin/bash
# Script Auto-Backup Database PINS DPUPKP Yogyakarta

BACKUP_DIR="/opt/einventory/backups"
DOCKER_CONTAINER="supabase-db"
DB_USER="postgres"
DATE=$(date +"%Y%m%d_%H%M%S")
FILENAME="PINS_DB_Backup_$DATE.sql"

echo "[$(date)] Memulai proses backup database PINS..."

# Buat direktori jika belum ada
mkdir -p $BACKUP_DIR

# Dump seluruh database Supabase dari dalam container Docker
docker exec -t $DOCKER_CONTAINER pg_dumpall -c -U $DB_USER > "$BACKUP_DIR/$FILENAME"

# Kompresi dengan gzip untuk menghemat ruang disk (menjadi .sql.gz)
gzip "$BACKUP_DIR/$FILENAME"

# Auto-Cleanup: Hapus backup yang lebih tua dari 7 hari
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +7 -exec rm {} \;

echo "[$(date)] Backup berhasil disimpan: $BACKUP_DIR/$FILENAME.gz"
