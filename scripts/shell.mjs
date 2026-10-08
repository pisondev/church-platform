// Locates a POSIX shell for the hook tests.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Git for Windows ships sh but does not always put it on PATH.
export function findShell() {
  if (spawnSync("sh", ["-c", "exit 0"]).status === 0) return "sh";

  const execPath = execFileSync("git", ["--exec-path"], { encoding: "utf8" }).trim();
  for (const candidate of ["../../../bin/sh.exe", "../../../usr/bin/sh.exe"]) {
    const shell = resolve(execPath, candidate);
    if (existsSync(shell)) return shell;
  }
  throw new Error("sh not found");
}
