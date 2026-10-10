import type { VideoScene } from '../../../shared/video/contract'

/** Caption times are scene-local; playback time spans the complete loaded lesson. */
export function captionAt(scenes: VideoScene[], time: number): string {
  if (!Number.isFinite(time) || time < 0) return ''
  let offset = 0
  for (const scene of scenes) {
    if (time < offset + scene.duration) {
      const local = time - offset
      return scene.captions.find(cue => local >= cue.start && local < cue.end)?.text ?? ''
    }
    offset += scene.duration
  }
  return ''
}
