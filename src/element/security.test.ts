import { describe, expect, it } from 'vitest'
import { escapeHtml, sanitizeAvatarUrl } from './security'

describe('sanitizeAvatarUrl', () => {
  it('allows plain https and http URLs', () => {
    expect(sanitizeAvatarUrl('https://example.com/avatar.png')).toBe('https://example.com/avatar.png')
    expect(sanitizeAvatarUrl('http://example.com/avatar.png')).toBe('http://example.com/avatar.png')
  })

  it('allows data:image base64 URLs', () => {
    expect(sanitizeAvatarUrl('data:image/png;base64,abc123==')).toBe('data:image/png;base64,abc123==')
    expect(sanitizeAvatarUrl('data:image/jpeg;base64,abc123')).toBe('data:image/jpeg;base64,abc123')
  })

  it('rejects javascript, blob, and relative URLs', () => {
    expect(sanitizeAvatarUrl('javascript:alert(1)')).toBeUndefined()
    expect(sanitizeAvatarUrl('blob:https://example.com/abc')).toBeUndefined()
    expect(sanitizeAvatarUrl('/avatar.png')).toBeUndefined()
    expect(sanitizeAvatarUrl('data:text/html;base64,abc')).toBeUndefined()
  })

  it('trims whitespace and rejects empty values', () => {
    expect(sanitizeAvatarUrl('  https://x.com/a.png  ')).toBe('https://x.com/a.png')
    expect(sanitizeAvatarUrl('   ')).toBeUndefined()
    expect(sanitizeAvatarUrl(undefined)).toBeUndefined()
  })
})

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
  })

  it('escapes single quotes', () => {
    expect(escapeHtml("'")).toBe('&#39;')
  })
})
