import { useState, type FormEvent } from 'react'
import { Screen } from '../components/Screen'
import { useMessage } from '../app/message'
import { Field } from '../components/Field'
import { useCommarea } from '../app/commarea'
import { LEN } from '../app/format'
import { ROUTES } from '../app/menus'
import { MSG } from '../app/messages'
import { addUser, findUser, useStore } from '../app/store'
import type { User } from '../app/types'
import { validateUserForm } from '../app/lookups'

interface Form {
  firstName: string
  lastName: string
  userId: string
  password: string
  type: string
}
const EMPTY: Form = { firstName: '', lastName: '', userId: '', password: '', type: '' }

export function UserAdd() {
  useStore()
  const { back } = useCommarea()
  const msg = useMessage()
  const [form, setForm] = useState<Form>(EMPTY)
  const [badField, setBadField] = useState<keyof Form | null>(null)
  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const v = validateUserForm(form)
    if (v) { setBadField(v.field); return msg.error(v.error) }
    const id = form.userId.trim().toUpperCase()
    if (findUser(id)) { setBadField('userId'); return msg.error(MSG.userExists) }
    const user: User = { userId: id, firstName: form.firstName.trim(), lastName: form.lastName.trim(), password: form.password, type: form.type }
    addUser(user)
    setForm(EMPTY)
    setBadField(null)
    msg.info(MSG.userAdded(id))
  }

  const clear = () => { setForm(EMPTY); setBadField(null); msg.clear() }

  return (
    <Screen
      tranId="CU01"
      program="COUSR01C"
      title="Add User"
      message={msg.message}
      keys={[
        { key: 'Enter', label: 'Add', onPress: submit },
        { key: 'F3', label: 'Back', onPress: () => back(ROUTES.admin) },
        { key: 'F4', label: 'Clear', onPress: clear },
      ]}
    >
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="First Name" value={form.firstName} onChange={set('firstName')} length={20} invalid={badField === 'firstName'} autoFocus />
          <Field label="Last Name" value={form.lastName} onChange={set('lastName')} length={20} invalid={badField === 'lastName'} />
          <Field label="User ID" value={form.userId} onChange={set('userId')} length={LEN.userId} uppercase invalid={badField === 'userId'} hint="8 Char" />
          <Field label="Password" value={form.password} onChange={set('password')} length={LEN.password} type="password" invalid={badField === 'password'} hint="8 Char" autoComplete="new-password" />
          <Field label="User Type" value={form.type} onChange={set('type')} length={1} uppercase invalid={badField === 'type'} hint="A=Admin, U=User" />
        </div>
        <div className="btn-row">
          <button type="submit" className="btn btn-primary">Add <kbd>ENTER</kbd></button>
          <button type="button" className="btn" onClick={clear}>Clear <kbd>F4</kbd></button>
        </div>
      </form>
    </Screen>
  )
}
