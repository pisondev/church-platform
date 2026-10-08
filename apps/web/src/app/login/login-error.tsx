"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

const REASONS = [
  "access_denied",
  "invalid_state",
  "exchange_failed",
  "unverified_email",
  "not_registered",
  "suspended",
  "account_mismatch",
  "server_error",
] as const;

type Reason = (typeof REASONS)[number];

// Explains why the API sent the browser back here: /login?error=<reason>.
export function LoginError() {
  const t = useTranslations("Login.errors");
  const reason = useSearchParams().get("error");
  if (!reason) return null;

  const known = REASONS.find((item): item is Reason => item === reason);

  return (
    <p role="alert" className="mt-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
      {t(known ?? "unknown")}
    </p>
  );
}
