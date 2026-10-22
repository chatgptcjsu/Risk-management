#!/usr/bin/env bash
set -euo pipefail
cd /home/user/webapp
export LANG=C.utf8
export LC_ALL=C.utf8
if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi
exec mvn spring-boot:run
