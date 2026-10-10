import type { ThumbnailArtwork as Drawing } from '../../../shared/video/thumbnail'
import type { Artwork as ArtworkType } from './data'
import Artwork from './Artwork'

export default function ThumbnailArtwork({ drawing, fallback }: { drawing?: Drawing; fallback: ArtworkType }) {
  if (!drawing || drawing.styleVersion !== 1 || !Array.isArray(drawing.paths) || !drawing.paths.length) return <Artwork kind={fallback}/>
  return <svg className="lesson-art" viewBox="0 0 420 270" fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {drawing.paths.map((path, index) => <path key={index} d={path.d} transform={path.transform}
      fill={path.fill === 'currentColor' ? 'currentColor' : 'none'} stroke={path.stroke === 'none' ? 'none' : 'currentColor'} strokeWidth={path.strokeWidth}/>)}
  </svg>
}
