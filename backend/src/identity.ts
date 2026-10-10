/** Storage namespace for the shared lesson library; never a signed-in identity. */
export const SHARED_OWNER = 'shared-user'

/** Trust these headers only behind VIScon's managed proxy with access control enabled. */
export function proxyUser(request: Request): { id: string; name: string } | null {
  const id = request.headers.get('x-user-id')?.trim()
  // A name alone is not an identity. Reject ambiguous duplicate ID headers.
  if (!id || /[,\u0000-\u001f\u007f]/.test(id)) return null
  let name = request.headers.get('x-user-name')?.trim()
  if (!name) return { id, name: id }
  try { name = decodeURIComponent(name) }
  catch { /* Keep a literal or malformed percent sign readable, without failing the request. */ }
  name = name.trim()
  return { id, name: name && !/[\u0000-\u001f\u007f]/.test(name) ? name : id }
}
