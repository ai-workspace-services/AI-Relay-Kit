#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$DIR")"

echo "Starting AI-Relay-Kit Cleanup..."
cd "$PROJECT_ROOT"

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Dependencies not found, installing just in case..."
    npm install
fi

# Run the cleaner
npx tsx src/injector/clean.ts

echo "Done."
