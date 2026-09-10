import { useState } from 'react'
import { useCommarea } from './commarea'

export type MessageKind = 'error' | 'info'
export interface ScreenMessage {
  text: string
  kind: MessageKind
}

// Single message region: exactly one message is shown at a time.
export function useMessage(initial?: string, kind: MessageKind = 'info') {
  const { initialMessage } = useCommarea()
  const [message, setMessage] = useState<ScreenMessage | null>(
    initialMessage ? { text: initialMessage, kind: 'info' } : initial ? { text: initial, kind } : null,
  )
  return {
    message,
    error: (text: string) => setMessage({ text, kind: 'error' }),
    info: (text: string) => setMessage({ text, kind: 'info' }),
    clear: () => setMessage(null),
  }
}

