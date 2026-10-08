// Tests for scripts/check-ai-files.sh. Run with `pnpm test:hooks`.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { findShell } from "./shell.mjs";

const script = resolve(dirname(fileURLToPath(import.meta.url)), "check-ai-files.sh");
const shell = findShell();

function check(paths) {
  return spawnSync(shell, [script], { input: paths.join("\n") + "\n", encoding: "utf8" });
}

const allowed = [
  "README.md",
  "docs/notation.md",
  "apps/api/internal/server/server.go",
  "apps/web/src/components/agents-list.tsx",
  "docs/claude-shannon.md",
  "apps/admin/src/cursor.ts",
];

const rejected = [
  "CLAUDE.md",
  "claude.md",
  "CLAUDE.local.md",
  "apps/web/CLAUDE.md",
  "AGENTS.md",
  "apps/admin/AGENT.md",
  "GEMINI.md",
  ".claude/settings.json",
  "apps/web/.claude/commands/x.md",
  ".cursor/rules/style.mdc",
  ".cursorrules",
  ".windsurfrules",
  ".github/copilot-instructions.md",
  ".mcp.json",
  ".aider.conf.yml",
  ".codex/config.toml",
];

test("accepts ordinary project files", () => {
  const result = check(allowed);
  assert.equal(result.status, 0, result.stderr);
});

test("accepts an empty list", () => {
  assert.equal(spawnSync(shell, [script], { input: "", encoding: "utf8" }).status, 0);
});

for (const path of rejected) {
  test(`rejects ${path}`, () => {
    const result = check([...allowed, path]);
    assert.equal(result.status, 1, `expected rejection of ${path}`);
    assert.match(result.stderr, /AI tool files are not allowed/);
    assert.ok(result.stderr.includes(path), result.stderr);
  });
}
