import type { VideoManifest, VideoRequest } from '../../../shared/video/contract'
import type { Lesson } from './data'

async function responseJSON<T>(response: Response): Promise<T> {
  const body = await response.json()
  if (!response.ok) throw new Error(body.detail ?? 'Could not contact the video service')
  return body
}
export const listVideos = () => fetch('/api/videos').then(responseJSON<VideoManifest[]>)
export const requestVideo = (request: VideoRequest, key: string, files: File[] = []) => {
  const form = new FormData()
  form.append('request', JSON.stringify(request))
  for (const file of files) form.append('files', file)
  return fetch('/api/videos', {
    method: 'POST', headers: files.length ? { 'Idempotency-Key': key } : { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: files.length ? form : JSON.stringify(request),
  }).then(responseJSON<VideoManifest>)
}
export const retryVideo = (id: string) => fetch(`/api/videos/${encodeURIComponent(id)}/retry`, { method: 'POST' }).then(responseJSON<VideoManifest>)

export function videoLesson(video: VideoManifest): Lesson {
  return { id: video.id, videoId: video.id, title: video.title, subtitle: video.provider === 'astra' ? (video.status === 'script_ready' ? 'Explanation prepared' : video.status === 'failed' ? 'Needs attention' : 'Preparing your explanation') : video.provider === 'pi' ? 'Your explanation' : 'Sample animation · narration coming soon', subject: 'My ideas', duration: video.scenes.reduce((sum, scene) => sum + scene.duration, 0), artwork: 'vectors', color: 'sage', demo: video.provider === 'simulated' }
}

/** Keep browser-local curriculum context while refreshing server-owned job state. */
export function mergeVideoLessons(videos: VideoManifest[], previous: Lesson[]): Lesson[] {
  const saved = new Map(previous.filter(lesson => lesson.videoId).map(lesson => [lesson.videoId, lesson]))
  const refreshed = videos.map(video => {
    const lesson = videoLesson(video), local = saved.get(video.id)
    return local ? { ...lesson, subject: local.subject, subtitle: local.source ? local.subtitle : lesson.subtitle, color: local.color, artwork: local.artwork, source: local.source } : lesson
  })
  // A list request may finish after a newly submitted job has entered the library.
  const ids = new Set(videos.map(video => video.id))
  return [...refreshed, ...previous.filter(lesson => !lesson.videoId || !ids.has(lesson.videoId))]
}

export function watchVideo(id: string, onManifest: (manifest: VideoManifest) => void, onConnection: (message: string) => void) {
  const events = new EventSource(`/api/videos/${encodeURIComponent(id)}/events`)
  events.addEventListener('manifest', event => {
    try {
      const manifest = JSON.parse((event as MessageEvent).data) as VideoManifest
      if (manifest.schemaVersion !== 1 || manifest.id !== id || !Array.isArray(manifest.scenes)) throw new Error('Unsupported video response')
      onConnection(''); onManifest(manifest)
      if (manifest.status === 'complete' || manifest.status === 'script_ready' || manifest.status === 'failed') events.close()
    } catch { events.close(); onConnection('Could not read this video. Please reload.') }
  })
  events.onerror = () => onConnection('Reconnecting… Available scenes can still play.')
  return () => events.close()
}
