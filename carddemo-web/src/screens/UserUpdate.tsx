import { useState, type FormEvent } from 'react'
import { Screen } from '../components/Screen'
import { useMessage } from '../app/message'
import { Field } from '../components/Field'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useCommarea } from '../app/commarea'
import { LEN } from '../app/format'
import { ROUTES } from '../app/menus'
import { MSG } from '../app/messages'
import { findUser, updateUser, useStore } from '../app/store'
import type { User } from '../app/types'
import { validateUserForm } from '../app/lookups'

type Form = Pick<User, 'firstName' | 'lastName' | 'password' | 'type'>
const toForm = (u: User): Form => ({ firstName: u.firstName, lastName: u.lastName, password: u.password, type: u.type })

export function UserUpdate() {
  const { params } = useCommarea()
  return <UserUpdateScreen key={params.get('uid') ?? ''} />
}

function UserUpdateScreen() {
  useStore()
  const { params, setParams, back } = useCommarea()
  const uid = params.get('uid') ?? ''
  const user = uid ? findUser(uid) : undefined
  const msg = useMessage(uid && !user ? MSG.userIdNotFound : user ? MSG.pressF5ToSave : undefined, uid && !user ? 'error' : 'info')
  const [uidIn, setUidIn] = useState(uid)
  const [uidInvalid, setUidInvalid] = useState(false)
  const [form, setForm] = useState<Form | null>(user ? toForm(user) : null)
  const [badField, setBadField] = useState<keyof Form | 'userId' | null>(null)
  const [confirm, setConfirm] = useState(false)

  const set = (k: keyof Form) => (v: string) => setForm((f) => (f ? { ...f, [k]: v } : f))

  const fetch = (e?: FormEvent) => {
    e?.preventDefault()
    const id = uidIn.trim().toUpperCase()
    if (!id) { setUidInvalid(true); return msg.error(MSG.userIdEmpty) }
    setUidInvalid(false)
    if (id !== uid) return setParams({}, { uid: id })
    if (!user) return msg.error(MSG.userIdNotFound)
    msg.info(MSG.pressF5ToSave)
  }

  const save = () => {
    if (!form || !user) return
    if (JSON.stringify(toForm(user)) === JSON.stringify(form)) return msg.error(MSG.modifyToUpdate)
    const v = validateUserForm({ ...form, userId: user.userId }, false)
    if (v) { setBadField(v.field); return msg.error(v.error) }
    setBadField(null)
    setConfirm(true)
  }

  const commit = () => {
    setConfirm(false)
    if (!form || !user) return
    updateUser({ ...user, ...form, firstName: form.firstName.trim(), lastName: form.lastName.trim(), password: form.password.toUpperCase() })
    msg.info(MSG.userUpdated(user.userId))
  }

  const clear = () => {
    setUidIn('')
    setForm(null)
    setBadField(null)
    if (uid) setParams({}, { uid: undefined })
    else msg.clear()
  }

  const ro = !form

  return (
    <Screen
      tranId="CU02"
      program="COUSR02C"
      title="Update User"
      message={msg.message}
      keysActive={!confirm}
      keys={[
        { key: 'Enter', label: 'Fetch', onPress: fetch },
        { key: 'F3', label: 'Back', onPress: () => back(ROUTES.admin) },
        { key: 'F4', label: 'Clear', onPress: clear },
        { key: 'F5', label: 'Save', onPress: save, disabled: ro },
        { key: 'F12', label: 'Cancel', onPress: () => back(ROUTES.userList) },
      ]}
    >
      <form onSubmit={fetch} noValidate>
        <div className="form-grid form-grid-1">
          <Field label="Enter User ID" value={uidIn} onChange={setUidIn} length={LEN.userId} uppercase invalid={uidInvalid} autoFocus />
        </div>
        <hr className="hr" />
        <div className="form-grid">
          <Field label="First Name" value={form?.firstName ?? ''} onChange={ro ? undefined : set('firstName')} length={20} invalid={badField === 'firstName'} />
          <Field label="Last Name" value={form?.lastName ?? ''} onChange={ro ? undefined : set('lastName')} length={20} invalid={badField === 'lastName'} />
          <Field label="Password" value={form?.password ?? ''} onChange={ro ? undefined : set('password')} length={LEN.password} type="password" invalid={badField === 'password'} hint="8 Char" autoComplete="new-password" />
          <Field label="User Type" value={form?.type ?? ''} onChange={ro ? undefined : set('type')} length={1} uppercase invalid={badField === 'type'} hint="A=Admin, U=User" />
        </div>
        <div className="btn-row">
          <button type="submit" className="btn">Fetch <kbd>ENTER</kbd></button>
          <button type="button" className="btn btn-primary" disabled={ro} onClick={save}>Save <kbd>F5</kbd></button>
          <button type="button" className="btn" onClick={clear}>Clear <kbd>F4</kbd></button>
        </div>
      </form>

      <ConfirmDialog
        open={confirm}
        title="Save user changes?"
        message={MSG.pressF5ToSave}
        confirmLabel="Save"
        onConfirm={commit}
        onCancel={() => setConfirm(false)}
      >
        <p className="confirm-detail">User {user?.userId}</p>
      </ConfirmDialog>
    </Screen>
  )
}
