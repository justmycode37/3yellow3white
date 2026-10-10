export type VideoMode = 'classic' | 'interactive'

/** Versioned delivery contract; source remains available for interactive recompilation. */
export interface VideoRequest {
  title: string
  topic: string
  documents: { name: string; text: string }[]
  /** Viewing preference supplied to the storyline planner; omitted means classic. */
  videoMode?: VideoMode
  uploads?: { name: string; mimeType: string; size: number; sha256: string }[]
}

export interface VideoScene {
  id: string
  index: number
  source: string
  duration: number
  audio: { id: string; url: string }
  captions: { start: number; end: number; text: string }[]
  narration?: string
  visualDescription?: string
  words?: { id: string; text: string; start: number; end: number }[]
}

export interface VideoManifest {
  schemaVersion: 1
  id: string
  title: string
  revision: number
  status: 'queued' | 'generating' | 'complete' | 'failed'
  provider: 'simulated' | 'pi'
  createdAt: string
  scenes: VideoScene[]
  thumbnail?: import('./thumbnail').ThumbnailArtwork
  thumbnailStatus?: 'generating' | 'complete' | 'failed'
  error?: string
  errorCode?: string
}
