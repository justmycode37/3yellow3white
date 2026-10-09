import type { Artwork as ArtworkType } from './data'

export function Spark({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 80 80" fill="none" aria-hidden="true"><path d="M40 5c2 23 9 30 35 35-25 2-33 10-35 35C36 50 30 44 5 40c24-4 32-11 35-35Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><path d="m61 9 2 11m-5-6 11 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
}

export default function Artwork({ kind, animated = false }: { kind: ArtworkType, animated?: boolean }) {
  return <svg className={`lesson-art ${animated ? 'animated-art' : ''}`} viewBox="0 0 420 270" fill="none" aria-hidden="true">
    <defs><marker id={`arrow-${kind}`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="m1 1 7 4-7 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></marker></defs>
    {kind === 'molecule' && <g className="molecule-drawing" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m149 167 1-68 59-35 59 35v68l-59 35-60-35Z"/><path d="m160 110 1 47m17 18 31 18m48-37v-47m-48-33-40 23" opacity=".45"/>
      <path d="m269 99 49-30m-168 99-50 31m109 4v38"/>
      <text x="324" y="70" stroke="none" fill="currentColor" fontSize="25" fontFamily="DM Sans">OH</text><text x="62" y="215" stroke="none" fill="currentColor" fontSize="23" fontFamily="DM Sans">H₃C</text><text x="199" y="265" stroke="none" fill="currentColor" fontSize="23" fontFamily="DM Sans">H</text>
      <circle cx="150" cy="99" r="8" fill="var(--art-bg)"/><circle cx="209" cy="64" r="8" fill="var(--art-bg)"/><circle cx="268" cy="99" r="8" fill="var(--art-bg)"/><circle cx="268" cy="167" r="8" fill="var(--art-bg)"/><circle cx="209" cy="202" r="8" fill="var(--art-bg)"/><circle cx="149" cy="167" r="8" fill="var(--art-bg)"/>
      <path d="m82 66 7-13m-21 11 13 4m246 129 12 5m-17 3 5 12" strokeWidth="2" opacity=".35"/>
    </g>}
    {kind === 'orbitals' && <g className="orbital-drawing" stroke="currentColor" strokeWidth="2.5">
      <ellipse cx="210" cy="134" rx="115" ry="42" transform="rotate(-35 210 134)"/><ellipse cx="210" cy="134" rx="115" ry="42" transform="rotate(35 210 134)"/><ellipse cx="210" cy="134" rx="42" ry="115"/><circle cx="210" cy="134" r="19" fill="currentColor"/><circle cx="290" cy="69" r="10" fill="var(--art-bg)"/><circle cx="135" cy="73" r="10" fill="currentColor"/><circle cx="226" cy="238" r="10" fill="var(--art-bg)"/><path d="m316 191 7 13m-13-4 15-5m-185-7-3 9" opacity=".3" strokeLinecap="round"/>
    </g>}
    {kind === 'reaction' && <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m66 159 49-29 49 29 49-29m-94-13 40 24"/><text x="207" y="128" fill="currentColor" stroke="none" fontSize="26">O</text><path d="M214 98c-12-53 64-60 76-14" markerEnd={`url(#arrow-${kind})`}/><path d="M236 163h76" markerEnd={`url(#arrow-${kind})`}/><text x="319" y="169" fill="currentColor" stroke="none" fontSize="26">OH</text><circle cx="223" cy="78" r="3" fill="currentColor"/><circle cx="233" cy="80" r="3" fill="currentColor"/><path d="M132 207c34 14 81 18 111 2" opacity=".3"/>
    </g>}
    {['vectors', 'matrix', 'eigen'].includes(kind) && <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <g opacity=".12">{[85, 125, 165, 205, 245, 285, 325].map(x => <path key={`x${x}`} d={`M${x} 25v220`}/>)}{[45, 85, 125, 165, 205, 245].map(y => <path key={`y${y}`} d={`M65 ${y}h285`}/>)}</g>
      <path d="M80 205h265M125 235V35" opacity=".35" markerEnd={`url(#arrow-${kind})`}/>
      {kind === 'vectors' && <><path d="m125 205 165-135" strokeWidth="4" markerEnd={`url(#arrow-${kind})`}/><path d="m125 205 120-5" strokeWidth="3" opacity=".5" markerEnd={`url(#arrow-${kind})`}/><path d="M290 70v135H125" strokeDasharray="5 8" opacity=".4"/><text x="296" y="60" fill="currentColor" stroke="none" fontSize="25" fontStyle="italic">v</text><path d="m247 216-4 5m-99-185 5-6" opacity=".3"/></>}
      {kind === 'matrix' && <><path d="m125 205 58-135 135 15-58 135-135-15Z" fill="currentColor" fillOpacity=".08" strokeWidth="3"/><path d="m125 205 58-135m-58 135 135 15" strokeWidth="4" markerEnd={`url(#arrow-${kind})`}/><path d="m155 138 135 15m-98 60 58-135" opacity=".4"/><text x="270" y="61" fill="currentColor" stroke="none" fontSize="26">A</text></>}
      {kind === 'eigen' && <><path d="m100 225 205-185" strokeWidth="3" opacity=".3"/><path d="m125 205 134-121" strokeWidth="4" markerEnd={`url(#arrow-${kind})`}/><path d="m125 205 74-67" strokeWidth="6" markerEnd={`url(#arrow-${kind})`}/><text x="258" y="94" fill="currentColor" stroke="none" fontSize="24">λv</text><text x="192" y="156" fill="currentColor" stroke="none" fontSize="22">v</text></>}
    </g>}
  </svg>
}
