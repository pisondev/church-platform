"use client";

import { useTranslations } from "next-intl";
import { type RefObject, useState } from "react";

export type RenameResult = { ok: true; name: string } | { ok: false; reason: "name_taken" | "invalid_name" | "failed" };

type Status = { kind: "idle" } | { kind: "saving" } | { kind: "saved" } | { kind: "error"; reason: string };

// The document title in the header. It looks like text and becomes a field on focus.
// Enter or leaving the field saves, Escape restores the saved name.
export function TitleField({
  name,
  onRename,
  inputRef,
}: {
  name: string;
  onRename: (name: string) => Promise<RenameResult>;
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  const t = useTranslations("Editor");
  const [draft, setDraft] = useState(name);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const commit = async () => {
    const next = draft.trim();
    if (next === name) {
      setDraft(name);
      return;
    }

    setStatus({ kind: "saving" });
    const result = await onRename(next);
    if (result.ok) {
      setDraft(result.name);
      setStatus({ kind: "saved" });
    } else {
      setDraft(name);
      setStatus({ kind: "error", reason: result.reason });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        aria-label={t("titleLabel")}
        value={draft}
        size={Math.max(draft.length, 6)}
        maxLength={120}
        className="max-w-[40vw] rounded border border-transparent bg-transparent px-1.5 py-0.5 text-sm font-semibold hover:border-border focus:border-accent focus:outline-none"
        onChange={(event) => {
          setDraft(event.target.value);
          setStatus({ kind: "idle" });
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            setDraft(name);
            setStatus({ kind: "idle" });
          }
        }}
      />
      {status.kind === "saving" && (
        <span role="status" className="text-xs text-muted">
          {t("saving")}
        </span>
      )}
      {status.kind === "saved" && (
        <span role="status" className="text-xs text-muted">
          {t("saved")}
        </span>
      )}
      {status.kind === "error" && (
        <span role="alert" className="text-xs text-red-800">
          {t(`errors.${status.reason === "name_taken" || status.reason === "invalid_name" ? status.reason : "failed"}`)}
        </span>
      )}
    </div>
  );
}
