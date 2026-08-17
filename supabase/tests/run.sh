#!/usr/bin/env bash
#
# Rejoue le schéma KeyManager sur une base PostgreSQL locale et vérifie le
# cloisonnement entre agences. Ne touche JAMAIS la base de production.
#
#   ./supabase/tests/run.sh            # avec la migration de cloisonnement
#   ./supabase/tests/run.sh --sans     # sans elle, pour constater la fuite
#
# Prérequis : un PostgreSQL 15+ accessible. Par défaut on suppose un serveur
# local écoutant sur le port 5433 avec l'utilisateur `postgres` en confiance.
# Ajustez PGHOST / PGPORT / PGUSER si besoin.

set -euo pipefail

PGHOST="${PGHOST:-/tmp}"
PGPORT="${PGPORT:-5433}"
PGUSER="${PGUSER:-postgres}"
PGDATABASE_TEST="${PGDATABASE_TEST:-km_test}"

ICI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RACINE="$(cd "$ICI/../.." && pwd)"
MIGRATION_CLOISONNEMENT="20260817120000_cloisonnement_agences.sql"

PSQL=(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -v ON_ERROR_STOP=1)

AVEC_CORRECTION=1
[ "${1:-}" = "--sans" ] && AVEC_CORRECTION=0

echo "▸ Reconstruction de la base de test « $PGDATABASE_TEST »"
"${PSQL[@]}" -q -c "DROP DATABASE IF EXISTS $PGDATABASE_TEST;" \
             -c "CREATE DATABASE $PGDATABASE_TEST;" >/dev/null

echo "▸ Décor Supabase (schémas auth/storage, rôles, auth.uid())"
"${PSQL[@]}" -d "$PGDATABASE_TEST" -q -f "$ICI/00-decor-supabase.sql" >/dev/null

echo "▸ Rejeu des migrations"
for f in "$RACINE"/supabase/migrations/*.sql; do
  [ "$(basename "$f")" = "$MIGRATION_CLOISONNEMENT" ] && continue
  # Certaines migrations dépendent d'extensions absentes hors Supabase
  # (pg_cron, buckets de stockage) : leur échec n'empêche pas le test.
  "${PSQL[@]}" -d "$PGDATABASE_TEST" -q -f "$f" >/dev/null 2>&1 || true
done

echo "▸ Droits accordés par défaut par Supabase"
"${PSQL[@]}" -d "$PGDATABASE_TEST" -q -c "
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT ON auth.users TO authenticated, service_role;" >/dev/null

echo "▸ Jeu d'essai (deux agences, deux utilisateurs, deux clés)"
"${PSQL[@]}" -d "$PGDATABASE_TEST" -q -f "$ICI/01-jeu-essai.sql" >/dev/null

if [ "$AVEC_CORRECTION" = "1" ]; then
  echo "▸ Application de la migration de cloisonnement"
  "${PSQL[@]}" -d "$PGDATABASE_TEST" -q \
    -f "$RACINE/supabase/migrations/$MIGRATION_CLOISONNEMENT" 2>&1 \
    | grep -v NOTICE || true
else
  echo "▸ Migration de cloisonnement NON appliquée (mode démonstration)"
fi

echo
echo "══════════ Tentatives d'accès entre agences ══════════"
echo "   (avec la correction, les dix doivent échouer)"
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE_TEST" \
     -f "$ICI/02-attaques-cloisonnement.sql" 2>&1 | grep -vE "^SET$|^RESET$"

echo
echo "══════════ Usages légitimes (non-régression) ══════════"
echo "   (tous doivent réussir, sauf ceux annoncés comme devant échouer)"
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE_TEST" \
     -f "$ICI/03-non-regression.sql" 2>&1 | grep -vE "^SET$|^RESET$"
