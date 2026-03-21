#!/bin/sh

# Reinstall dependencies if node_modules is missing or empty
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules)" ]; then
  echo "Installing dependencies..."
  npm install
else
  # Check if bcrypt needs rebuilding (common issue with volume mounts)
  if [ -d "node_modules/bcrypt" ]; then
    echo "Rebuilding bcrypt to ensure architecture compatibility..."
    npm rebuild bcrypt --build-from-source
  fi
fi

# Start the application
exec "$@"

