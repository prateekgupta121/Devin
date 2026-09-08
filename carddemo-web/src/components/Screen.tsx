import { useEffect, useState, type ReactNode } from 'react'
import type { ScreenMessage } from '../app/message'
import { clockDate, clockTime } from '../app/format'
import { TITLE01, TITLE02 } from '../app/messages'
import { useFunctionKeys, type KeyBinding } from '../app/keys'
import { useCommarea } from '../app/commarea'

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <>
      <div className="chrome-cell">
        <span className="chrome-label">Date:</span> <span data-testid="clock-date">{clockDate(now)}</span>
      </div>
      <div className="chrome-cell">
        <span className="chrome-label">Time:</span> <span data-testid="clock-time">{clockTime(now)}</span>
      </div>
    </>
  )
}

interface ScreenProps {
  tranId: string
  program: string
  title: string
  message: ScreenMessage | null
  keys: KeyBinding[]
  keysActive?: boolean
  children: ReactNode
  wide?: boolean
}

export function Screen({ tranId, program, title, message, keys, keysActive = true, children, wide }: ScreenProps) {
  const { commarea } = useCommarea()
  useFunctionKeys(keys, keysActive)
  return (
    <div className={`screen ${wide ? 'screen-wide' : ''}`}>
      <header className="chrome">
        <div className="chrome-row">
          <div className="chrome-cell">
            <span className="chrome-label">Tran:</span> <span data-testid="tran-id">{tranId}</span>
          </div>
          <div className="chrome-title">{TITLE01}</div>
          <Clock />
        </div>
        <div className="chrome-row">
          <div className="chrome-cell">
            <span className="chrome-label">Prog:</span> <span data-testid="program">{program}</span>
          </div>
          <div className="chrome-title chrome-title2">{TITLE02}</div>
          <div className="chrome-cell chrome-user">{commarea.user ? `User: ${commarea.user}` : ''}</div>
        </div>
        <h1 className="screen-title">{title}</h1>
      </header>

      <main className="screen-body">{children}</main>

      <footer className="screen-footer">
        <div
          className={`message-region ${message ? `message-${message.kind}` : ''}`}
          role={message?.kind === 'error' ? 'alert' : 'status'}
          data-testid="message"
        >
          {message?.text ?? '\u00a0'}
        </div>
        <div className="fkeys">
          {keys.map((k) => (
            <button
              key={k.key}
              type="button"
              className="fkey"
              disabled={k.disabled}
              onClick={k.onPress}
              title={`${k.key} = ${k.label}`}
            >
              <kbd>{k.key === 'Enter' ? 'ENTER' : k.key}</kbd>
              <span>{k.label}</span>
            </button>
          ))}
        </div>
      </footer>
    </div>
  )
}
