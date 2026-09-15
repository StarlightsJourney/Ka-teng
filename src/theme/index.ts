import { useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark'
const storageKey = 'ka-teng-theme'

function storedTheme(): ThemeMode | null {
  try {
    const saved = window.localStorage.getItem(storageKey)
    return saved === 'light' || saved === 'dark' ? saved : null
  } catch {
    return null
  }
}

export function useTheme(): [ThemeMode, () => void] {
  const [theme, setTheme] = useState<ThemeMode>(() => storedTheme() ?? 'light')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      window.localStorage.setItem(storageKey, theme)
    } catch {
      // Storage can be unavailable in private browsing.
    }
  }, [theme])
  return [theme, () => setTheme((current) => current === 'dark' ? 'light' : 'dark')]
}
