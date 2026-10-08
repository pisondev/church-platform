import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { findSong, songs } from "@/features/songs/library";
import { SongPresenter } from "@/features/songs/song-presenter";
import { songBooks, songReference } from "@/features/songs/types";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return songs.map((song) => ({ id: song.id }));
}

// The title stays generic on purpose: reading params here would make the metadata depend on
// the request, which Cache Components rejects for a page that is otherwise prerendered.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Songs");
  return { title: t("title") };
}

export default async function SongPage({ params }: Props) {
  const song = findSong((await params).id);
  if (!song) notFound();

  const t = await getTranslations("Songs");

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <Link href="/songs" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
        <ArrowLeft aria-hidden className="size-4" />
        {t("back")}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        {[songReference(song), song.title].filter(Boolean).join(" · ")}
      </h1>
      <p className="mt-2 mb-8 text-muted">
        {[song.book && songBooks[song.book], song.key, song.meter, song.tempo].filter(Boolean).join(" · ")}
      </p>

      <SongPresenter song={song} />
    </main>
  );
}
