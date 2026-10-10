/** Host-normalized SVG geometry. The browser never injects model-authored markup. */
export interface ThumbnailPath {
  d: string
  fill: 'none' | 'currentColor'
  stroke: 'none' | 'currentColor'
  strokeWidth: number
  transform?: string
}

export interface ThumbnailArtwork {
  styleVersion: 1
  paths: ThumbnailPath[]
}
