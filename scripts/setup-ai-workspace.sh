#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$DIR")"

echo "Starting AI-Relay-Kit Configuration Injection..."
cd "$PROJECT_ROOT"

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Run the injector
npx tsx src/injector/index.ts

echo "Done."
