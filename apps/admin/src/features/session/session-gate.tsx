"use client";

import { LogIn, RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import { siteConfig } from "@/config/site";

import { type Session, SessionContext } from "./session";

type State =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "error" }
  | { status: "signed-in"; session: Session };

const api = `${siteConfig.apiUrl}/api/v1/auth`;

// The session cookie belongs to the API, so every call sends credentials.
async function fetchSession(): Promise<State> {
  try {
    const response = await fetch(`${api}/me`, { credentials: "include" });
    if (response.status === 401) return { status: "signed-out" };
    if (!response.ok) return { status: "error" };
    return { status: "signed-in", session: (await response.json()) as Session };
  } catch {
    return { status: "error" };
  }
}

function Notice({ title, lead, children }: { title: string; lead: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-8">
        <p className="text-sm font-medium text-accent">{siteConfig.name}</p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-muted">{lead}</p>
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}

const actionClass =
  "inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90";

// Shows the app only to a signed-in user. The API enforces access; this is the front door.
// Pages choose their own chrome: the panel layout adds the shared header, the editor has its own.
export function SessionGate({ children }: { children: ReactNode }) {
  const t = useTranslations("Session");
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    fetchSession().then((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = () => {
    setState({ status: "loading" });
    setAttempt((count) => count + 1);
  };

  const signOut = useCallback(() => {
    fetch(`${api}/logout`, { method: "POST", credentials: "include" })
      .catch(() => undefined)
      .then(() => setState({ status: "signed-out" }));
  }, []);

  switch (state.status) {
    case "loading":
      return (
        <main className="flex flex-1 items-center justify-center px-6 py-20">
          <p role="status" className="text-muted">
            {t("loading")}
          </p>
        </main>
      );
    case "signed-out":
      return (
        <Notice title={t("signedOutTitle")} lead={t("signedOutLead")}>
          <a href={`${siteConfig.webUrl}/login`} className={actionClass}>
            <LogIn aria-hidden className="size-4" />
            {t("signIn")}
          </a>
        </Notice>
      );
    case "error":
      return (
        <Notice title={t("errorTitle")} lead={t("errorLead")}>
          <button type="button" className={actionClass} onClick={retry}>
            <RefreshCw aria-hidden className="size-4" />
            {t("retry")}
          </button>
        </Notice>
      );
    case "signed-in":
      return (
        <SessionContext value={{ session: state.session, signOut }}>{children}</SessionContext>
      );
  }
}
