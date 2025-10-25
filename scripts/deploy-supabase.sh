#!/usr/bin/env bash
set -euo pipefail

# Deploy Supabase Edge Functions from this repository.
# Usage:
#   ./scripts/deploy-supabase.sh [project-ref]
# If no project-ref is provided the script will use the project id embedded in
# src/utils/supabase/info.tsx (if present) or require you to pass one.

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$REPO_ROOT"

# Default project ref detected from source file (if present)
DETECTED_REF=""
if [ -f "src/utils/supabase/info.tsx" ]; then
  DETECTED_REF=$(grep -E "export const projectId: string = \"[a-z0-9]+\"" src/utils/supabase/info.tsx || true)
  DETECTED_REF=${DETECTED_REF#*\"}
  DETECTED_REF=${DETECTED_REF%%\"*}
fi

PROJECT_REF="${1:-${PROJECT_REF:-$DETECTED_REF}}"

if [ -z "$PROJECT_REF" ]; then
  echo "Error: No Supabase project ref provided."
  echo "Provide one as the first argument or set the PROJECT_REF env var."
  echo "Example: ./scripts/deploy-supabase.sh nkowcjmjqaszwtrvgedt"
  exit 1
fi

# Function to check if supabase CLI exists
command -v supabase >/dev/null 2>&1 || {
  echo "supabase CLI not found. Install it with: npm install -g supabase"
  exit 1
}

echo "Using Supabase project-ref: $PROJECT_REF"

# Ensure user is logged in or SUPABASE_ACCESS_TOKEN is set
if ! supabase status >/dev/null 2>&1; then
  echo "Note: supabase CLI status returned non-zero. Ensure you're logged in with 'supabase login' or set SUPABASE_ACCESS_TOKEN."
fi

# Path to function source. Adjust if your function(s) are located elsewhere.
# This repo contains functions under src/supabase/functions/server (single entrypoint)
FUNCTION_SLUG="make-server-a8898ff1"
FUNCTION_SRC="src/supabase/functions/server"

if [ ! -d "$FUNCTION_SRC" ]; then
  echo "Function source directory not found: $FUNCTION_SRC"
  exit 1
fi

echo "Deploying function '$FUNCTION_SLUG' from source: $FUNCTION_SRC"

# Deploy the function
supabase functions deploy "$FUNCTION_SLUG" --project-ref "$PROJECT_REF" --source "$FUNCTION_SRC"

# Show deployed functions list (quick check)
supabase functions list --project-ref "$PROJECT_REF"

echo "Done. If you want to run the migration endpoint after deployment:"
cat <<EOF
  curl -X POST \\
    "https://$PROJECT_REF.supabase.co/functions/v1/$FUNCTION_SLUG/admin/migrate-progress" \\
    -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \\
    -H "Content-Type: application/json" -d '{}'

Replace <SERVICE_ROLE_KEY> with the service role key in a secure environment.
EOF
