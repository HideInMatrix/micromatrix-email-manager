#!/bin/sh
set -eu

if [ "${SKIP_DB_PUSH:-0}" != "1" ]; then
  pnpm exec prisma db push
fi

exec "$@"
