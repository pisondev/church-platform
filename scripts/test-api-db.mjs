// Runs the API tests against the database in TEST_DATABASE_URL, read from .env when unset.
import { spawnSync } from "node:child_process";

try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: rely on the environment.
}

if (!process.env.TEST_DATABASE_URL) {
  console.error("TEST_DATABASE_URL is not set. Start the database with `pnpm db:up` and copy .env.example to .env.");
  process.exit(1);
}

const result = spawnSync("go", ["-C", "apps/api", "test", "-count=1", "./..."], { stdio: "inherit" });
process.exit(result.status ?? 1);
