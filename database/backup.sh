#!/usr/bin/env bash
set -euo pipefail
umask 077

DB_NAME=${DB_NAME:-Hireu}
BACKUP_DIR=${BACKUP_DIR:-"$HOME/hire-u-backups"}
MYSQL_CNF=${MYSQL_CNF:-"$HOME/.my.cnf"}

if [[ ! -r "$MYSQL_CNF" ]]; then
  printf 'No se puede leer el archivo de conexión MySQL: %s\n' "$MYSQL_CNF" >&2
  exit 1
fi

command -v mysqldump >/dev/null 2>&1 || {
  printf 'No se encontró mysqldump. Instala el cliente de MySQL.\n' >&2
  exit 1
}
command -v gzip >/dev/null 2>&1 || {
  printf 'No se encontró gzip.\n' >&2
  exit 1
}

mkdir -p "$BACKUP_DIR"
backup_file="$BACKUP_DIR/${DB_NAME}_$(date +%Y%m%d_%H%M%S).sql.gz"
temporary_file=$(mktemp "$BACKUP_DIR/.${DB_NAME}_backup.XXXXXX")
trap 'rm -f -- "$temporary_file"' EXIT

mysqldump \
  --defaults-extra-file="$MYSQL_CNF" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  "$DB_NAME" | gzip > "$temporary_file"

mv -- "$temporary_file" "$backup_file"
printf 'Respaldo creado: %s\n' "$backup_file"
