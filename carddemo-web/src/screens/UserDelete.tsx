import { useState, type FormEvent } from 'react'
import { Screen } from '../components/Screen'
import { useMessage } from '../app/message'
import { Field, Value } from '../components/Field'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useCommarea } from '../app/commarea'
import { LEN } from '../app/format'
import { ROUTES } from '../app/menus'
import { MSG } from '../app/messages'
import { deleteUser, findUser, useStore } from '../app/store'

export function UserDelete() {
  const { params } = useCommarea()
  return <UserDeleteScreen key={params.get('uid') ?? ''} />
}

function UserDeleteScreen() {
  useStore()
  const { commarea, params, setParams, back } = useCommarea()
  const uid = params.get('uid') ?? ''
  const user = uid ? findUser(uid) : undefined
  const msg = useMessage(uid && !user ? MSG.userIdNotFound : user ? MSG.pressF5ToDelete : undefined, uid && !user ? 'error' : 'info')
  const [uidIn, setUidIn] = useState(uid)
  const [invalid, setInvalid] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const fetch = (e?: FormEvent) => {
    e?.preventDefault()
    const id = uidIn.trim().toUpperCase()
    if (!id) { setInvalid(true); return msg.error(MSG.userIdEmpty) }
    setInvalid(false)
    if (id !== uid) return setParams({}, { uid: id })
    if (!user) return msg.error(MSG.userIdNotFound)
    msg.info(MSG.pressF5ToDelete)
  }

  const askDelete = () => {
    if (!user || deleted) return
    if (user.userId === commarea.user) return msg.error('You cannot delete the user you are signed on as ...')
    setConfirm(true)
  }

  const commit = () => {
    setConfirm(false)
    if (!user) return
    deleteUser(user.userId)
    setDeleted(true)
    msg.info(MSG.userDeleted(user.userId))
  }

  const clear = () => {
    setUidIn('')
    setInvalid(false)
    if (uid) setParams({}, { uid: undefined })
    else msg.clear()
  }

  const shown = deleted ? undefined : user

  return (
    <Screen
      tranId="CU03"
      program="COUSR03C"
      title="Delete User"
      message={msg.message}
      keysActive={!confirm}
      keys={[
        { key: 'Enter', label: 'Fetch', onPress: fetch },
        { key: 'F3', label: 'Back', onPress: () => back(ROUTES.admin) },
        { key: 'F4', label: 'Clear', onPress: clear },
        { key: 'F5', label: 'Delete', onPress: askDelete, disabled: !shown },
        { key: 'F12', label: 'Cancel', onPress: () => back(ROUTES.userList) },
      ]}
    >
      <form onSubmit={fetch} noValidate>
        <div className="form-grid form-grid-1">
          <Field label="Enter User ID" value={uidIn} onChange={setUidIn} length={LEN.userId} uppercase invalid={invalid} autoFocus />
        </div>
        <hr className="hr" />
        <div className="form-grid">
          <Value label="First Name" value={shown?.firstName ?? ''} />
          <Value label="Last Name" value={shown?.lastName ?? ''} />
          <Value label="User Type" value={shown ? (shown.type === 'A' ? 'A (Admin)' : 'U (User)') : ''} />
        </div>
        <div className="btn-row">
          <button type="submit" className="btn">Fetch <kbd>ENTER</kbd></button>
          <button type="button" className="btn btn-danger" disabled={!shown} onClick={askDelete}>Delete <kbd>F5</kbd></button>
          <button type="button" className="btn" onClick={clear}>Clear <kbd>F4</kbd></button>
        </div>
      </form>

      <ConfirmDialog
        open={confirm}
        title="Delete this user?"
        message={MSG.pressF5ToDelete}
        confirmLabel="Delete"
        onConfirm={commit}
        onCancel={() => setConfirm(false)}
      >
        <p className="confirm-detail">{user?.userId} — {user?.firstName} {user?.lastName}</p>
      </ConfirmDialog>
    </Screen>
  )
}
