import { useState, type FormEvent } from 'react'
import { Screen } from '../components/Screen'
import { useMessage } from '../app/message'
import { Field } from '../components/Field'
import { Pager } from '../components/Pager'
import { paginate } from '../app/paginate'
import { useCommarea } from '../app/commarea'
import { LEN } from '../app/format'
import { ROUTES } from '../app/menus'
import { MSG } from '../app/messages'
import { useStore } from '../app/store'

const DEFAULT_PAGE_SIZE = 10

export function UserList() {
  const { params } = useCommarea()
  return <UserListScreen key={params.get('q') ?? ''} />
}

function UserListScreen() {
  const { users } = useStore()
  const { params, go, back, setParams } = useCommarea()
  const q = params.get('q') ?? ''
  const page = Number(params.get('page') ?? '1')
  const pageSize = Number(params.get('size') ?? DEFAULT_PAGE_SIZE)

  const sorted = [...users].sort((a, b) => a.userId.localeCompare(b.userId))
  const filtered = q ? sorted.filter((u) => u.userId >= q) : sorted
  const { rows, page: p, pageCount } = paginate(filtered, page, pageSize)

  const msg = useMessage()
  const [qIn, setQIn] = useState(q)
  const [sel, setSel] = useState<Record<string, string>>({})

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const picked = Object.entries(sel).filter(([, v]) => v.trim())
    if (picked.length > 0) {
      const [userId, action] = picked[0]
      const a = action.trim().toUpperCase()
      if (a === 'U') return go(ROUTES.userUpdate, {}, { extra: { uid: userId } })
      if (a === 'D') return go(ROUTES.userDelete, {}, { extra: { uid: userId } })
      return msg.error(MSG.userInvalidSel)
    }
    const next = qIn.trim().toUpperCase()
    if (next !== q) return setParams({}, { q: next || undefined, page: '1', size: params.get('size') ?? undefined })
    msg.clear()
  }

  const pageBack = () => {
    if (p <= 1) return msg.error(MSG.tranAlreadyTop)
    setParams({}, { q: q || undefined, page: String(p - 1), size: params.get('size') ?? undefined })
  }
  const pageFwd = () => {
    if (p >= pageCount) return msg.error(MSG.tranAlreadyBottom)
    setParams({}, { q: q || undefined, page: String(p + 1), size: params.get('size') ?? undefined })
  }

  return (
    <Screen
      tranId="CU00"
      program="COUSR00C"
      title="List Users"
      message={msg.message}
      wide
      keys={[
        { key: 'Enter', label: 'Continue', onPress: submit },
        { key: 'F3', label: 'Back', onPress: () => back(ROUTES.admin) },
        { key: 'F7', label: 'Backward', onPress: pageBack },
        { key: 'F8', label: 'Forward', onPress: pageFwd },
      ]}
    >
      <form onSubmit={submit} noValidate>
        <div className="filters">
          <Field label="Search User ID" value={qIn} onChange={setQIn} length={LEN.userId} uppercase autoFocus />
          <button type="submit" className="btn btn-primary">Continue <kbd>ENTER</kbd></button>
          <button type="button" className="btn" onClick={() => go(ROUTES.userAdd)}>Add User</button>
        </div>

        <Pager page={p} pageCount={pageCount} pageSize={pageSize} defaultPageSize={DEFAULT_PAGE_SIZE} onPageSize={(n) => setParams({}, { q: q || undefined, page: '1', size: String(n) })} />

        <table className="list">
          <thead>
            <tr>
              <th>Sel</th>
              <th>User ID</th>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Type</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="empty">No users to show</td></tr>}
            {rows.map((u) => (
              <tr key={u.userId}>
                <td>
                  <input
                    className="sel inline-input"
                    aria-label={`Select user ${u.userId}`}
                    maxLength={1}
                    value={sel[u.userId] ?? ''}
                    onChange={(e) => setSel({ [u.userId]: e.target.value })}
                  />
                </td>
                <td>{u.userId}</td>
                <td>{u.firstName}</td>
                <td>{u.lastName}</td>
                <td>{u.type === 'A' ? 'A (Admin)' : 'U (User)'}</td>
                <td>
                  <span className="row-actions">
                    <button type="button" onClick={() => go(ROUTES.userUpdate, {}, { extra: { uid: u.userId } })}>U Update</button>
                    <button type="button" onClick={() => go(ROUTES.userDelete, {}, { extra: { uid: u.userId } })}>D Delete</button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="field-hint">Type U to update or D to delete a user, then press Enter.</p>
      </form>
    </Screen>
  )
}
