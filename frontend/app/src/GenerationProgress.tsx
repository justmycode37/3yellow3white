import type { VideoManifest } from '../../../shared/video/contract'
import './generation-progress.css'

const number = new Intl.NumberFormat('en-US')

export default function GenerationProgress({ usage, queued = false, compact = false, buffering = false }: {
  usage?: VideoManifest['tokenUsage']; queued?: boolean; compact?: boolean; buffering?: boolean
}) {
  const estimated = Boolean(usage && usage.estimatedOutputTokens > 0)
  const total = usage ? usage.totalTokens + usage.estimatedOutputTokens : undefined
  const status = queued ? 'Your video is queued' : buffering ? 'Preparing the next scene' : 'Generating your video'
  const description = total === undefined ? 'Waiting for token usage' : `${estimated ? 'Approximately ' : ''}${number.format(total)} tokens used`

  return <div className={`generation-progress ${compact ? 'generation-progress-compact' : 'player-status'}`} role="group" aria-label={status}>
    <div className="generation-usage" role="group" aria-live="off" aria-label={description} title={estimated ? 'Estimated while the model is working; reconciled with reported usage after each response' : description}>
      <span className="generation-count">{estimated ? '~' : ''}{total === undefined ? '—' : number.format(total)}</span>
      <span className="generation-unit">tokens</span>
    </div>
  </div>
}
