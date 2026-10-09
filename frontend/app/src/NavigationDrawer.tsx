import { useEffect, useRef } from 'react'
import { ArrowUpRight, FolderOpen, Heart, Library, ListTree, Plus, Settings, X } from 'lucide-react'

type NavigationDrawerProps = {
  open: boolean
  current: 'workspace' | 'library' | 'plan' | 'settings' | 'lesson'
  onClose: () => void
  onWorkspace: () => void
  onLibrary: () => void
  onPlan: () => void
  onCreate: () => void
  onAbout: () => void
  onSettings: () => void
}

export default function NavigationDrawer({ open, current, onClose, onWorkspace, onLibrary, onPlan, onCreate, onAbout, onSettings }: NavigationDrawerProps) {
  const drawer = useRef<HTMLElement>(null)
  const close = useRef(onClose)
  close.current = onClose

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const buttons = () => Array.from(drawer.current?.querySelectorAll<HTMLButtonElement>('button') || [])
    buttons()[0]?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close.current()
      }
      if (event.key === 'Tab') {
        const items = buttons()
        const first = items[0], last = items[items.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKey)
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [open])

  return <div className={`navigation-layer ${open ? 'is-open' : ''}`} inert={!open} aria-hidden={!open}>
    <button className="drawer-scrim" aria-label="Close navigation backdrop" tabIndex={-1} onClick={onClose}/>
    <aside id="navigation-drawer" className="navigation-drawer" role="dialog" aria-modal="true" aria-label="Navigation" ref={drawer}>
      <div className="drawer-header">
        <div className="drawer-brand">Aha!</div>
        <button className="icon-button drawer-close" aria-label="Close navigation" onClick={onClose}><X size={21}/></button>
      </div>
      <p className="drawer-tagline">A little more understanding.</p>
      <nav className="drawer-links" aria-label="Your space">
        <button className={current === 'workspace' ? 'active' : ''} aria-current={current === 'workspace' ? 'page' : undefined} onClick={onWorkspace}><span className="drawer-icon butter"><FolderOpen size={22}/></span><span>Your workspace</span><ArrowUpRight size={18}/></button>
        <button className={current === 'library' ? 'active' : ''} aria-current={current === 'library' ? 'page' : undefined} onClick={onLibrary}><span className="drawer-icon lavender"><Library size={22}/></span><span>Your library</span><ArrowUpRight size={18}/></button>
        <button className={current === 'plan' ? 'active' : ''} aria-current={current === 'plan' ? 'page' : undefined} onClick={onPlan}><span className="drawer-icon blue"><ListTree size={22}/></span><span>Plan</span><ArrowUpRight size={18}/></button>
        <button onClick={onCreate}><span className="drawer-icon sage"><Plus size={22}/></span><span>New video</span><ArrowUpRight size={18}/></button>
        <button onClick={onAbout}><span className="drawer-icon peach"><Heart size={21}/></span><span>About Aha!</span><ArrowUpRight size={18}/></button>
      </nav>
      <div className="drawer-bottom">
        <button className={`drawer-settings ${current === 'settings' ? 'active' : ''}`} aria-current={current === 'settings' ? 'page' : undefined} onClick={onSettings}><Settings size={22}/><span>Settings</span><ArrowUpRight size={18}/></button>
      </div>
    </aside>
  </div>
}
