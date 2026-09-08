import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Screen } from '../components/Screen'
import { useMessage } from '../app/message'
import { Field } from '../components/Field'
import { LEN } from '../app/format'
import { MSG, THANK_YOU } from '../app/messages'
import { findUser, resetStore } from '../app/store'
import { useCommarea } from '../app/commarea'

const BANNER = `+========================================+
|%%%%%%%  NATIONAL RESERVE NOTE  %%%%%%%%|
|%(1)  THE UNITED STATES OF KICSLAND (1)%|
|%$$              ___       ********  $$%|
|%$    {x}       (o o)                 $%|
|%$     ******  (  V  )      O N E     $%|
|%(1)          ---m-m---             (1)%|
|%%~~~~~~~~~~~ ONE DOLLAR ~~~~~~~~~~~~~%%|
+========================================+`

export function SignOn() {
  const navigate = useNavigate()
  const { initialMessage } = useCommarea()
  const msg = useMessage(initialMessage)
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [bad, setBad] = useState<'user' | 'pwd' | null>(null)

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const uid = userId.trim().toUpperCase()
    if (!uid) { setBad('user'); return msg.error(MSG.enterUserId) }
    if (!password) { setBad('pwd'); return msg.error(MSG.enterPassword) }
    const user = findUser(uid)
    if (!user) { setBad('user'); return msg.error(MSG.userNotFound) }
    if (user.password !== password.toUpperCase()) { setBad('pwd'); return msg.error(MSG.wrongPassword) }
    setBad(null)
    navigate(`${user.type === 'A' ? '/admin' : '/menu'}?user=${encodeURIComponent(user.userId)}`)
  }

  const exit = () => {
    msg.info(THANK_YOU)
    setUserId('')
    setPassword('')
  }

  return (
    <Screen
      tranId="CC00"
      program="COSGN00C"
      title="Sign-on"
      message={msg.message}
      keys={[
        { key: 'Enter', label: 'Sign-on', onPress: submit },
        { key: 'F3', label: 'Exit', onPress: exit },
      ]}
    >
      <div className="signon">
        <div>
          <p className="signon-intro">This is a Credit Card Demo Application for Mainframe Modernization</p>
          <pre className="banner">{BANNER}</pre>
        </div>
        <form className="signon-form" onSubmit={submit} noValidate>
          <p className="signon-intro">Type your User ID and Password, then press ENTER:</p>
          <Field label="User ID" value={userId} onChange={setUserId} length={LEN.userId} uppercase hint="(8 Char)" invalid={bad === 'user'} autoFocus autoComplete="username" />
          <Field label="Password" value={password} onChange={setPassword} length={LEN.password} type="password" hint="(8 Char)" invalid={bad === 'pwd'} autoComplete="current-password" />
          <div className="btn-row">
            <button type="submit" className="btn btn-primary">Sign-on <kbd>ENTER</kbd></button>
          </div>
          <p className="signon-help">
            Mock data: <code>ADMIN001</code> / <code>PASSWORD</code> (admin), <code>USER0001</code> / <code>PASSWORD</code> (user).{' '}
            <button type="button" className="btn btn-small" onClick={() => { resetStore(); msg.info('Mock data reset to legacy sample fixtures.') }}>
              Reset mock data
            </button>
          </p>
        </form>
      </div>
    </Screen>
  )
}
