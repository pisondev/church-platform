#!/bin/sh
# Reads file paths on stdin and fails if any belongs to an AI coding tool.
# Usage: git ls-files | check-ai-files.sh

names='claude(\.local)?\.md|agents?\.md|gemini\.md|copilot-instructions\.md|\.cursorrules|\.cursorignore|\.windsurfrules|\.clinerules|\.mcp\.json|\.aider[^/]*'
dirs='\.claude|\.cursor|\.windsurf|\.codex|\.continue|\.roo|\.aider[^/]*'

offending=$(grep -iE -e "(^|/)($names)\$" -e "(^|/)($dirs)/")

if [ -n "$offending" ]; then
  {
    echo "AI tool files are not allowed in the repository:"
    printf '%s\n' "$offending" | sed 's/^/  > /'
    echo "Keep them local, for example through .git/info/exclude."
  } >&2
  exit 1
fi

exit 0
