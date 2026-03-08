#!/bin/bash
set -euo pipefail

# Read the hook input from stdin
INPUT=$(cat)

# Extract the file path from the hook payload
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)

# Only recompile if a .dry file was edited
if echo "$FILE_PATH" | grep -q '\.dry$'; then
  npm run compile:dendry 2>&1
fi
