import { kj40 } from "./data/kj-40";
import { pkj192 } from "./data/pkj-192";
import type { Song } from "./types";

// Built-in songs. They move to the API once the song library has its own storage.
export const songs: readonly Song[] = [kj40, pkj192];

export function findSong(id: string): Song | undefined {
  return songs.find((song) => song.id === id);
}
