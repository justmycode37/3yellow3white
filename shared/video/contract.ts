/** Versioned delivery contract; source remains available for interactive recompilation. */
export interface VideoRequest {
  title: string
  topic: string
  documents: { name: string; text: string }[]
}

export interface VideoScene {
  id: string
  index: number
  source: string
  duration: number
  audio: { id: string; url: string }
  captions: { start: number; end: number; text: string }[]
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
  error?: string
}
