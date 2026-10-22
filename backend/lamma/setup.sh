#!/usr/bin/env bash
# Creates a fresh Laravel app and copies the Lamma backend on top of it.
# Usage:  bash setup.sh [target-dir]      (default: ../lamma-api-app)
# Needs: PHP >= 8.2, Composer 2, MySQL running with an empty database called "lamma", Node (for Reverb's installer).
set -euo pipefail
OVERLAY="$(cd "$(dirname "$0")" && pwd)"
TARGET="${1:-$OVERLAY/../lamma-api-app}"

composer create-project laravel/laravel "$TARGET"
cd "$TARGET"

php artisan install:api --no-interaction                          # Sanctum + routes/api.php
php artisan install:broadcasting --reverb --no-interaction        # Reverb + Echo scaffolding + REVERB_* keys in .env

# Copy the Lamma code over the fresh project (overwrites bootstrap/app.php, routes/*, config/cors.php, users migration, ...)
cp -R "$OVERLAY"/app "$OVERLAY"/bootstrap "$OVERLAY"/config "$OVERLAY"/database "$OVERLAY"/routes "$OVERLAY"/tests .
rm -f database/migrations/*_create_users_table.php.bak
cat "$OVERLAY/.env.additions" >> .env
echo "NOTE: .env now contains duplicated keys (Laravel's defaults + the Lamma block). The LAST occurrence wins, but please tidy it."

php artisan key:generate --force
php artisan migrate:fresh --seed --force
php artisan storage:link
echo
echo "Done. Start three terminals inside $TARGET:"
echo "  php artisan serve                 # API on http://localhost:8000"
echo "  php artisan reverb:start --debug  # WebSockets on :8080"
echo "  php artisan queue:work            # broadcasts + notifications (or set QUEUE_CONNECTION=sync)"
echo "Admin login: admin@lamma.test / password"
