"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";

import { siteConfig } from "@/config/site";

export type ApiState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "not-found" }
  | { status: "error" };

// The session cookie belongs to the API, so every call sends credentials.
async function load<T>(path: string): Promise<ApiState<T>> {
  try {
    const response = await fetch(`${siteConfig.apiUrl}/api/v1${path}`, { credentials: "include" });
    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) return { status: "error" };
    return { status: "ready", data: (await response.json()) as T };
  } catch {
    return { status: "error" };
  }
}

// Loads a resource from the API. A new path starts over from "loading".
export function useApi<T>(path: string): ApiState<T> {
  const [loaded, setLoaded] = useState<{ path: string; state: ApiState<T> } | null>(null);

  useEffect(() => {
    let active = true;
    load<T>(path).then((state) => {
      if (active) setLoaded({ path, state });
    });
    return () => {
      active = false;
    };
  }, [path]);

  return loaded?.path === path ? loaded.state : { status: "loading" };
}

// Renders the loading, missing and failed states of a resource, or its content.
export function Resource<T>({
  state,
  children,
}: {
  state: ApiState<T>;
  children: (data: T) => ReactNode;
}) {
  const t = useTranslations("Resource");

  if (state.status === "ready") return <>{children(state.data)}</>;

  const message = { loading: t("loading"), "not-found": t("notFound"), error: t("error") }[state.status];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <p role={state.status === "loading" ? "status" : "alert"} className="text-muted">
        {message}
      </p>
    </main>
  );
}
