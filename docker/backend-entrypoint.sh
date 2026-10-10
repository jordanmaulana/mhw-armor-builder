#!/bin/sh
set -e

# No postgres wait loop: compose's `depends_on: {postgres: service_healthy}` already
# gates startup, and the old loop spawned a Python interpreter once per second.

if [ "${ROLE:-web}" = "web" ]; then
  python manage.py migrate --noinput
  python manage.py collectstatic --noinput
fi

exec "$@"
