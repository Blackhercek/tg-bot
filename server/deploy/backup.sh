#!/bin/sh
# Ежедневный бэкап базы. Ставится в cron скриптом deploy.sh.
# Используется .backup, а не cp: при WAL копирование файла может дать битый снимок.
set -e
DB=/opt/fitness/data/fitness.db
DIR=/opt/fitness/backups
mkdir -p "$DIR"
STAMP=$(date +%Y-%m-%d)
sqlite3 "$DB" ".backup '$DIR/fitness-$STAMP.db'"
gzip -f "$DIR/fitness-$STAMP.db"
# Держим 30 последних копий.
ls -1t "$DIR"/fitness-*.db.gz 2>/dev/null | tail -n +31 | xargs -r rm --
