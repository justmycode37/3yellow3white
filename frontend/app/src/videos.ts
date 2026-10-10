import type { VideoManifest, VideoRequest } from '../../../shared/video/contract'
import type { Lesson } from './data'

async function responseJSON<T>(response: Response): Promise<T> {
  const body = await response.json()
  if (!response.ok) throw new Error(body.detail ?? 'Could not contact the video service')
  return body
}
export const listVideos = () => fetch('/api/videos').then(responseJSON<VideoManifest[]>)
export const requestVideo = (request: VideoRequest, key: string) => fetch('/api/videos', {
  method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: JSON.stringify(request),
}).then(responseJSON<VideoManifest>)

export function videoLesson(video: VideoManifest): Lesson {
  return { id: video.id, videoId: video.id, title: video.title, subtitle: 'Sample animation · narration coming soon', subject: 'My ideas', duration: video.scenes.reduce((sum, scene) => sum + scene.duration, 0), artwork: 'vectors', color: 'sage', demo: true }
}

export function watchVideo(id: string, onManifest: (manifest: VideoManifest) => void, onConnection: (message: string) => void) {
  const events = new EventSource(`/api/videos/${encodeURIComponent(id)}/events`)
  events.addEventListener('manifest', event => {
    try {
      const manifest = JSON.parse((event as MessageEvent).data) as VideoManifest
      if (manifest.schemaVersion !== 1 || manifest.id !== id || !Array.isArray(manifest.scenes)) throw new Error('Unsupported video response')
      onConnection(''); onManifest(manifest)
      if (manifest.status === 'complete' || manifest.status === 'failed') events.close()
    } catch { events.close(); onConnection('Could not read this video. Please reload.') }
  })
  events.onerror = () => onConnection('Reconnecting… Available scenes can still play.')
  return () => events.close()
}
