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

export type SendResult<T> = { ok: true; data: T } | { ok: false; status: number; code: string };

// Sends a change to the API. `code` is the error code of the API, or "network".
export async function apiSend<T>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<SendResult<T>> {
  try {
    const response = await fetch(`${siteConfig.apiUrl}/api/v1${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) {
      return { ok: false, status: response.status, code: payload?.error?.code ?? "unknown" };
    }
    return { ok: true, data: payload as T };
  } catch {
    return { ok: false, status: 0, code: "network" };
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
