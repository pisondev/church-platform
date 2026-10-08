// Points git at the versioned hooks in .githooks. Runs on `pnpm install`.
import { execFileSync } from "node:child_process";

try {
  execFileSync("git", ["rev-parse", "--git-dir"], { stdio: "ignore" });
} catch {
  // Not a git checkout (for example a container build): nothing to configure.
  process.exit(0);
}

execFileSync("git", ["config", "core.hooksPath", ".githooks"], { stdio: "inherit" });
