#!/bin/sh

mkdir -p /usr/src/app/persist

if [ ! -f /usr/src/app/lean_claw.db ]; then
  echo "Database file not found at root, setting up local persistence..."

  if [ ! -f /usr/src/app/persist/lean_claw.db ]; then
    touch /usr/src/app/persist/lean_claw.db
    echo "Created new lean_claw.db in persistent volume"
  fi
  ln -s /usr/src/app/persist/lean_claw.db /usr/src/app/lean_claw.db
  echo "Linked persistence volume to /usr/src/app/lean_claw.db"
else
  echo "Using existing database file at /usr/src/app/lean_claw.db"
fi

exec node server.js
