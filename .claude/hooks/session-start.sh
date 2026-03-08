#!/bin/bash
set -euo pipefail

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  npm install
fi

# Compile story files so game.json is ready
npm run compile:dendry
