import { useState, type FormEvent } from 'react'
import { Screen } from '../components/Screen'
import { useMessage } from '../app/message'
import { useCommarea } from '../app/commarea'
import { isEnabled, setEnabled, type FeatureFlag } from '../app/flags'
import { ADMIN_MENU, MAIN_MENU, ROUTES, type MenuOption } from '../app/menus'
import { MSG, THANK_YOU } from '../app/messages'
import { findUser, useStore } from '../app/store'

interface MenuProps {
  variant: 'main' | 'admin'
}

const FLAG_LABELS: Record<FeatureFlag, string> = {
  pendingAuth: 'Pending Authorization module',
  tranType: 'Transaction Type module',
}

export function Menu({ variant }: MenuProps) {
  useStore()
  const { commarea, go, signOff } = useCommarea()
  const msg = useMessage()
  const [option, setOption] = useState('')
  const [, bump] = useState(0)

  const user = findUser(commarea.user)
  const isAdmin = user?.type === 'A'
  const table = variant === 'admin' ? ADMIN_MENU : MAIN_MENU
  const options = table.filter((o) => !o.flag || isEnabled(o.flag))
  const flags = table.map((o) => o.flag).filter((f): f is FeatureFlag => Boolean(f)).filter((f, i, a) => a.indexOf(f) === i)

  const select = (opt: MenuOption) => {
    if (opt.userType === 'A' && !isAdmin) return msg.error(MSG.adminOnly)
    if (!opt.route) return msg.error(MSG.comingSoon(String(opt.num).padStart(2, '0'), opt.name.padEnd(35)))
    go(opt.route, {}, { replaceFrom: false })
  }

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const n = Number(option)
    if (!option.trim() || !Number.isInteger(n) || n < 1 || n > options.length) return msg.error(MSG.invalidOption)
    const opt = options.find((o) => o.num === n)
    if (!opt) return msg.error(MSG.invalidOption)
    select(opt)
  }

  const exit = () => signOff(THANK_YOU)

  return (
    <Screen
      tranId={variant === 'admin' ? 'CA00' : 'CM00'}
      program={variant === 'admin' ? 'COADM01C' : 'COMEN01C'}
      title={variant === 'admin' ? 'Admin Menu' : 'Main Menu'}
      message={msg.message}
      keys={[
        { key: 'Enter', label: 'Continue', onPress: submit },
        { key: 'F3', label: 'Exit', onPress: exit },
      ]}
    >
      <ul className="menu-list">
        {options.map((o) => {
          const locked = o.userType === 'A' && !isAdmin
          return (
            <li key={o.num}>
              <button type="button" className={`menu-item ${locked ? 'menu-locked' : ''}`} onClick={() => select(o)}>
                <span className="menu-num">{String(o.num).padStart(2, '0')}</span>
                <span>{o.name}{locked ? ' (Admin Only)' : ''}</span>
                <span className="menu-pgm">{o.program}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <form className="menu-prompt" onSubmit={submit} noValidate>
        <label htmlFor="menu-option">Please select an option :</label>
        <input
          id="menu-option"
          className="inline-input"
          value={option}
          onChange={(e) => setOption(e.target.value.replace(/\D/g, '').slice(0, 2))}
          inputMode="numeric"
          maxLength={2}
          autoFocus
        />
        <button type="submit" className="btn btn-primary">Continue <kbd>ENTER</kbd></button>
        {isAdmin && variant === 'main' && (
          <button type="button" className="btn" onClick={() => go(ROUTES.admin, {}, { replaceFrom: true })}>Admin Menu</button>
        )}
        {isAdmin && variant === 'admin' && (
          <button type="button" className="btn" onClick={() => go(ROUTES.menu, {}, { replaceFrom: true })}>Main Menu</button>
        )}
      </form>

      {flags.length > 0 && (
        <div className="menu-flags">
          <span>Optional modules:</span>
          {flags.map((f) => (
            <label key={f}>
              <input
                type="checkbox"
                checked={isEnabled(f)}
                onChange={(e) => { setEnabled(f, e.target.checked); bump((n) => n + 1) }}
              />{' '}
              {FLAG_LABELS[f]}
            </label>
          ))}
        </div>
      )}
    </Screen>
  )
}
