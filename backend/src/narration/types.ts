export type SpeechRole = "narration" | "invitation" | "hint" | "reveal" | "credit";
export interface SourceRange { start: number; end: number; line: number }
export type ScriptBlock =
  | { kind: "speech"; id: string; role: SpeechRole; text: string; source: SourceRange }
  | { kind: "pause"; id: string; durationSec: number; source: SourceRange };
export interface ScriptBeat { id: string; title: string; context: string; blocks: ScriptBlock[] }
export interface Storyline { title: string; markdown: string; beats: ScriptBeat[] }
export interface Alignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}
export interface SpeechSettings {
  voiceId: string; modelId: string; outputFormat: "pcm_24000";
  voiceSettings: { stability: number; similarity_boost: number; style: number; use_speaker_boost: boolean; speed: number };
}
export interface SynthesisInput { text: string; previousText: string; nextText: string }
export interface SpeechResult {
  pcm: Uint8Array; alignment?: Alignment; normalizedAlignment: Alignment; requestId?: string;
}
export interface WordTiming {
  id: string; utteranceId: string; text: string; startSec: number; endSec: number;
  /** Half-open indices into this utterance's normalized alignment characters (not UTF-16 offsets). */
  characterRange: [number, number];
}
export interface SentenceTiming { id: string; wordIds: string[]; text: string; startSec: number; endSec: number }
export interface UtteranceTiming {
  id: string; role: SpeechRole; text: string; spokenText: string; source: SourceRange;
  startSec: number; endSec: number; words: WordTiming[]; sentences: SentenceTiming[];
}
export interface PauseTiming { id: string; startSec: number; endSec: number }
export interface AudioAsset { id: string; url: string; sha256: string; sampleCount: number }
export interface NarrationScene {
  id: string; title: string; context: string; startSec: number; durationSec: number;
  audio: AudioAsset; utterances: UtteranceTiming[]; pauses: PauseTiming[];
}
export interface NarrationPackageV1 {
  schemaVersion: 1; id: string; title: string; scriptHash: string; settings: SpeechSettings;
  sampleRate: 24000; durationSec: number; scenes: NarrationScene[]; combinedAudio: AudioAsset;
}
export interface RawAlignment {
  sceneId: string; utteranceId: string; offsetSec: number; requestId?: string;
  original?: Alignment; normalized: Alignment;
}
export type JobStatus = "queued" | "running" | "complete" | "failed" | "interrupted";
export interface NarrationJob {
  id: string; owner: string; status: JobStatus; createdAt: string; updatedAt: string;
  settings: SpeechSettings; completedChunks: number; totalChunks: number;
  error?: { code: string; message: string; retryable: boolean };
}
