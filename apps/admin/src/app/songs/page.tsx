import { ArrowLeft, Music } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

import { siteConfig } from "@/config/site";
import { songs } from "@/features/songs/library";
import { songBooks } from "@/features/songs/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Songs");
  return { title: t("title") };
}

export default function SongsPage() {
  const t = useTranslations("Songs");

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
        <ArrowLeft aria-hidden className="size-4" />
        {siteConfig.name}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-muted">{t("lead")}</p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {songs.map((song) => (
          <li key={song.id}>
            <Link
              href={`/songs/${song.id}`}
              className="flex items-start gap-4 rounded-lg border border-border bg-surface p-5 hover:border-accent"
            >
              <Music aria-hidden className="mt-1 size-5 shrink-0 text-accent" />
              <span>
                <span className="block font-medium">
                  {song.book} {song.number} · {song.title}
                </span>
                <span className="mt-1 block text-sm text-muted">
                  {songBooks[song.book]} · {t("verseCount", { count: song.verses.length })}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
