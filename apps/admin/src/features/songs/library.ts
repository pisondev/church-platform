import { haleluyaAmin } from "./data/haleluya-amin";
import { kj40 } from "./data/kj-40";
import { kp102 } from "./data/kp-102";
import { nkb225 } from "./data/nkb-225";
import { nr3 } from "./data/nr-3";
import { pkj15 } from "./data/pkj-15";
import { pkj192 } from "./data/pkj-192";
import type { Song } from "./types";

// Built-in songs. They move to the API once the song library has its own storage.
export const songs: readonly Song[] = [kj40, pkj15, pkj192, nkb225, nr3, kp102, haleluyaAmin];

export function findSong(id: string): Song | undefined {
  return songs.find((song) => song.id === id);
}
