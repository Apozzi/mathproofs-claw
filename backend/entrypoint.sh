#!/bin/sh
# Create the SQLite database file if it doesn't exist
if [ ! -f /usr/src/app/lean_claw.db ]; then
  touch /usr/src/app/lean_claw.db
  echo "Created lean_claw.db"
fi

exec node server.js
