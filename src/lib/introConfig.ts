import { getLatestUrl, uploadVersioned } from './versionedUpload';
import type { Scene } from '../components/questions/UnitIntroGeneric';

// Per-unit overrides for the unit-intro scenes, edited in /intro-audio-recorder.
// Stored as a versioned JSON clip in Storage (folder "introcfg", key = unit letter)
// because the anon key can't create tables — see versionedUpload.ts. Scene ids are
// positional (see buildScenes), so an override is keyed by scene id.

export interface SceneOverride {
  title?: string;
  subtitle?: string;
  speak?: string;
  emoji?: string;
  word?: string;
  imageUrl?: string;
}

export type IntroConfig = Record<number, SceneOverride>;

export async function loadIntroConfig(letter: string): Promise<IntroConfig> {
  try {
    const url = await getLatestUrl('introcfg', letter);
    if (!url) return {};
    const res = await fetch(`${url}?cb=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return {};
    return (await res.json()) as IntroConfig;
  } catch {
    return {};
  }
}

export async function saveIntroConfig(letter: string, cfg: IntroConfig): Promise<string | undefined> {
  const blob = new Blob([JSON.stringify(cfg)], { type: 'application/json' });
  const { error } = await uploadVersioned('introcfg', letter, blob);
  return error;
}

export function applyIntroConfig(scenes: Scene[], cfg: IntroConfig): Scene[] {
  return scenes.map((s) => {
    const o = cfg[s.id];
    if (!o) return s;
    const out: Scene = { ...s };
    if (o.title !== undefined) out.title = o.title;
    if (o.subtitle !== undefined) out.subtitle = o.subtitle;
    if (o.speak !== undefined) out.speak = o.speak;
    if (o.emoji !== undefined) out.emoji = o.emoji || undefined;
    if (o.word !== undefined) out.word = o.word || undefined;
    if (o.imageUrl !== undefined) out.imageUrl = o.imageUrl || undefined;
    return out;
  });
}
