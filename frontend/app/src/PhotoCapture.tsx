import { useEffect, useRef, useState } from 'react'
import { Camera, X } from './Icons'

export default function PhotoCapture({ onCapture, onClose }: { onCapture: (file: File) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [capturing, setCapturing] = useState(false)
  const active = useRef(true)

  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | undefined
    active.current = true
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unavailable')
        const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (cancelled) { media.getTracks().forEach(track => track.stop()); return }
        stream = media
        if (video.current) { video.current.srcObject = media; await video.current.play() }
      } catch (reason) {
        stream?.getTracks().forEach(track => track.stop())
        if (cancelled) return
        setError(reason instanceof DOMException && reason.name === 'NotAllowedError' ? 'Camera access wasn’t allowed. You can choose a photo instead.' : 'The camera isn’t available. You can choose a photo instead.')
      }
    }
    void start()
    return () => { cancelled = true; active.current = false; stream?.getTracks().forEach(track => track.stop()) }
  }, [])

  const capture = () => {
    const frame = video.current
    if (!frame || !ready || capturing) return
    const canvas = document.createElement('canvas')
    canvas.width = frame.videoWidth
    canvas.height = frame.videoHeight
    const context = canvas.getContext('2d')
    if (!context || !canvas.width || !canvas.height) { setError('Couldn’t take that photo. Please try again.'); return }
    context.drawImage(frame, 0, 0)
    setCapturing(true)
    canvas.toBlob(blob => {
      if (!active.current) return
      if (blob) onCapture(new File([blob], `Photo ${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`, { type: 'image/jpeg' }))
      else { setError('Couldn’t take that photo. Please try again.'); setCapturing(false) }
    }, 'image/jpeg', .9)
  }

  return <div className="photo-capture">
    {error ? <p role="alert">{error}</p> : <><video ref={video} muted playsInline aria-label="Camera preview" onCanPlay={() => setReady(true)}/>{!ready && <span role="status">Opening camera…</span>}</>}
    <div className="photo-input-actions"><button type="button" onClick={onClose}><X size={16}/>{error ? 'Back to photos' : 'Cancel'}</button>{!error && <button type="button" disabled={!ready || capturing} onClick={capture}><Camera size={17}/>{capturing ? 'Capturing…' : 'Capture photo'}</button>}</div>
  </div>
}
