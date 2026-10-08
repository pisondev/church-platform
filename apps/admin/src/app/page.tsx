"use client";

import { Church, Music } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { displayName, useSession } from "@/features/session/session";

export default function HomePage() {
  const t = useTranslations("Home");
  const { session } = useSession();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        {t("title", { name: displayName(session.user) })}
      </h1>
      <p className="mt-2 text-muted">{t("lead")}</p>

      <Link
        href="/songs"
        className="mt-8 inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
      >
        <Music aria-hidden className="size-4" />
        {t("openSongs")}
      </Link>

      <h2 className="mt-12 text-lg font-medium">{t("churchesTitle")}</h2>
      {session.churches.length === 0 ? (
        <p className="mt-3 text-muted">{t("noChurches")}</p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {session.churches.map((church) => (
            <li
              key={church.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface p-5"
            >
              <Church aria-hidden className="size-5 shrink-0 text-accent" />
              <span>
                <span className="block font-medium">{church.name}</span>
                <span className="block text-sm text-muted">{church.slug}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
