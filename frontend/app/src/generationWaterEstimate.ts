import type { VideoTokenUsage } from '../../../shared/video/contract'

// Illustrative comparison, not a measurement of this provider/model. Mistral's
// July 2025 Le Chat lifecycle study reports 45 mL per 400-token response:
// https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/
// Scaling that reference by output tokens is a UI assumption, not a universal
// per-token water factor. Input/cached tokens are excluded from this comparison.
export function illustrativeWaterMl(usage: VideoTokenUsage): number {
  const tokens = (value: number) => Number.isFinite(value) && value > 0 ? value : 0
  return (tokens(usage.outputTokens) + tokens(usage.estimatedOutputTokens)) * (45 / 400)
}
