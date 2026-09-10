import { useEffect } from 'react'

export type FKey = 'Enter' | 'F3' | 'F4' | 'F5' | 'F7' | 'F8' | 'F12'

export interface KeyBinding {
  key: FKey
  label: string
  onPress: () => void
  disabled?: boolean
}

// Registers legacy AID key bindings on the window. Enter inside a form is left
// to the form's own submit handler unless the target is not an input.
export function useFunctionKeys(bindings: KeyBinding[], active = true) {
  useEffect(() => {
    if (!active) return
    const handler = (e: KeyboardEvent) => {
      const b = bindings.find((x) => x.key === e.key)
      if (!b || b.disabled) return
      if (e.key === 'Enter') {
        const t = e.target as HTMLElement | null
        if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.tagName === 'BUTTON')) return
      }
      e.preventDefault()
      b.onPress()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [bindings, active])
}
