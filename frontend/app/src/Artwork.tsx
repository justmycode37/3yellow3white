import type { Artwork as ArtworkType } from './data'

export function Spark({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"/></svg>
}

function SoftArrow() {
  return <g strokeWidth="18">
    <path d="M135 195c48-35 87-83 139-118"/>
    <path d="M231 74c13-3 29-4 41-2 8 1 11 5 11 13 1 13 0 27-2 39"/>
  </g>
}

// Each title gets one simple idea, drawn with the soft, slightly uneven curves
// of the wordmark and menu. Shared by thumbnails and the lesson canvas.
export default function Artwork({ kind, animated = false }: { kind: ArtworkType, animated?: boolean }) {
  return <svg className={`lesson-art ${animated ? 'animated-art' : ''}`} viewBox="0 0 420 270" fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'molecule' && <g className="molecule-drawing">
      {/* Carbon's four connections. */}
      <path d="M191 117c-13-19-30-29-47-38m87 39c15-15 30-25 46-34m-86 67c-16 15-34 27-49 38m87-35c12 17 29 26 47 37"/>
      <path d="M210 108c17-1 29 12 27 29-1 17-13 28-30 26-16-1-25-13-24-29 1-15 11-25 27-26Z"/>
      <g fill="currentColor" stroke="none">
        <path d="M145 67c8 1 12 7 11 14s-8 12-15 10-11-7-10-14 7-11 14-10Z"/>
        <path d="M278 72c8 0 13 6 12 13s-6 12-14 11-12-6-11-13 6-11 13-11Z"/>
        <path d="M142 177c8-1 13 5 12 13s-7 12-14 11-12-6-11-13 6-11 13-11Z"/>
        <path d="M278 179c7 1 12 6 11 14s-7 12-14 10-12-7-11-14 6-11 14-10Z"/>
      </g>
    </g>}
    {kind === 'orbitals' && <g className="orbital-drawing">
      {/* Two soft orbital lobes, meeting around the nucleus. */}
      <path d="M193 118c-23 1-63-7-73-32-10-23 8-40 30-34 28 7 47 32 51 52 2 9-1 13-8 14Z"/>
      <path d="M226 152c25-1 64 9 73 35 7 23-11 38-32 31-26-8-46-32-49-51-1-9 1-14 8-15Z"/>
      <path d="M211 124c7 0 12 5 11 12s-5 11-12 11-12-5-11-12 5-11 12-11Z" fill="currentColor" stroke="none"/>
    </g>}
    {kind === 'reaction' && <g>
      {/* Follow a pair of electrons along one flowing arrow. */}
      <path d="M151 153c8-42 36-71 78-68 31 2 50 23 55 48"/>
      <path d="M259 119c7 7 14 14 22 19 4 3 7 2 10-2 6-8 10-17 14-25"/>
      <g fill="currentColor" stroke="none">
        <path d="M135 174c8-1 14 5 14 13s-6 13-13 13-14-5-14-12 5-13 13-14Z"/>
        <path d="M164 190c7 0 12 6 11 13s-6 12-13 11-12-7-11-13 6-11 13-11Z"/>
      </g>
    </g>}
    {kind === 'vectors' && <SoftArrow/>}
    {kind === 'matrix' && <g strokeWidth="11">
      {/* A little patch of space, stretched and sheared. */}
      <path d="M173 65c34-3 71-2 106 1 14 1 21 10 16 24-11 28-19 58-28 88-4 14-11 21-26 21-34 2-70 1-103-3-14-1-20-10-16-23 10-30 20-60 29-88 4-13 9-18 22-20Z"/>
      <path d="M226 65c-9 43-26 90-34 134M139 132c43 1 93 6 142 3" strokeWidth="9"/>
      <path d="M135 223c38 15 95 17 136-1m-16-11c7 2 14 5 19 9 3 2 3 5 1 8l-13 15" strokeWidth="9"/>
    </g>}
    {kind === 'eigen' && <g>
      {/* Different lengths, the same direction and curve. */}
      <g transform="translate(30 65) scale(.66)"><SoftArrow/></g>
      <g transform="translate(78 4)"><SoftArrow/></g>
    </g>}
  </svg>
}
