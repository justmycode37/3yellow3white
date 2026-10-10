import { useEffect, useState } from 'react'

/** Display the gateway identity without introducing an app login or stored session. */
export default function CurrentUser({ open }: { open: boolean }) {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null)

  useEffect(() => {
    setUser(null)
    if (!open) return
    const controller = new AbortController()
    void fetch('/api/me', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) return
        const { user: identity } = await response.json()
        if (!controller.signal.aborted && typeof identity?.id === 'string' && identity.id && typeof identity?.name === 'string') {
          setUser({ id: identity.id, name: identity.name })
        }
      })
      .catch(() => { /* Identity is optional in local previews; navigation remains available. */ })
    return () => controller.abort()
  }, [open])

  return user ? <p className="drawer-user"><span>Signed in via VIScon</span><strong>{user.name}</strong></p> : null
}
