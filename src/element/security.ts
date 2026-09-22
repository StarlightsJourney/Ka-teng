const allowedDataUrlPattern = /^data:image\/[a-zA-Z0-9.+]+;base64,[a-zA-Z0-9+/]+={0,2}$/
const allowedHttpPattern = /^https?:\/\//i

export function sanitizeAvatarUrl(value: string | undefined): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (allowedDataUrlPattern.test(trimmed)) return trimmed
  if (allowedHttpPattern.test(trimmed)) return trimmed
  return undefined
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case "'": return '&#39;'
      default: return character
    }
  })
}
