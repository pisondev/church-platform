"use client";

import { LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { siteConfig } from "@/config/site";

import { displayName, useSession } from "./session";

// Header shared by every admin page: brand, navigation and the signed-in user.
export function AppShell({ children }: { children: ReactNode }) {
  const nav = useTranslations("Nav");
  const t = useTranslations("Session");
  const { session, signOut } = useSession();
  const name = displayName(session.user);

  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-6 px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <ShieldCheck aria-hidden className="size-5 text-accent" />
            {siteConfig.name}
          </Link>
          <nav aria-label="Main" className="flex items-center gap-5 text-sm">
            <Link href="/" className="text-muted hover:text-foreground">
              {nav("home")}
            </Link>
            <Link href="/songs" className="text-muted hover:text-foreground">
              {nav("songs")}
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-3 text-sm">
            <span
              aria-hidden
              className="flex size-8 items-center justify-center rounded-full bg-accent font-medium text-accent-foreground"
            >
              {name.charAt(0).toUpperCase()}
            </span>
            <span className="leading-tight">
              <span className="block font-medium">{name}</span>
              <span className="block text-xs text-muted">
                {session.user.isSuperAdmin ? t("superAdmin") : t("churchAdmin")}
              </span>
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 hover:bg-background"
              onClick={signOut}
            >
              <LogOut aria-hidden className="size-4" />
              {t("signOut")}
            </button>
          </div>
        </div>
      </header>
      {children}
    </>
  );
}
