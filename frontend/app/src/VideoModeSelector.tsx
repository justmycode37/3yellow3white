import { Check } from './Icons'
import type { VideoMode } from './data'

export default function VideoModeSelector({ value, onChange, disabled = false }: { value: VideoMode; onChange: (mode: VideoMode) => void; disabled?: boolean }) {
  return <label className={`interactive-toggle ${value === 'interactive' ? 'selected' : ''}`}>
    <input type="checkbox" name="videoMode" value="interactive" checked={value === 'interactive'} disabled={disabled} onChange={event => onChange(event.target.checked ? 'interactive' : 'classic')}/>
    <span>Interactive</span>
    <span className="selection-check" aria-hidden="true"><Check size={12}/></span>
  </label>
}
