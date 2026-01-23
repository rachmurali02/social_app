#!/bin/bash

# Helper script to URL-encode a password for database connection strings

echo "Enter your database password (it will be URL-encoded):"
read -s PASSWORD

# URL encode special characters
ENCODED=$(echo -n "$PASSWORD" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read(), safe=''))" 2>/dev/null || \
          echo -n "$PASSWORD" | node -e "console.log(encodeURIComponent(require('fs').readFileSync(0, 'utf-8')))" 2>/dev/null || \
          echo "$PASSWORD" | sed 's/!/%21/g; s/@/%40/g; s/#/%23/g; s/\$/%24/g; s/%/%25/g; s/&/%26/g; s/'\''/%27/g; s/(/%28/g; s/)/%29/g')

echo ""
echo "Original password: [hidden]"
echo "URL-encoded password: $ENCODED"
echo ""
echo "Use this in your DATABASE_URL:"
echo "postgresql://postgres:${ENCODED}@db.seuhldhyhqkgquxjrytz.supabase.co:5432/postgres"
