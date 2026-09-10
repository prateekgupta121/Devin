import { useState, type FormEvent } from 'react'
import { Screen } from '../components/Screen'
import { useMessage } from '../app/message'
import { Field, Value } from '../components/Field'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useCommarea } from '../app/commarea'
import { LEN } from '../app/format'
import { ROUTES } from '../app/menus'
import { MSG } from '../app/messages'
import { findCard, updateCard, useStore } from '../app/store'
import type { Card } from '../app/types'
import { lookupCard, validateCardKeys } from '../app/lookups'

interface Form {
  embossedName: string
  activeStatus: string
  expMonth: string
  expYear: string
}

const toForm = (c: Card): Form => ({
  embossedName: c.embossedName,
  activeStatus: c.activeStatus,
  expMonth: c.expirationDate.slice(5, 7),
  expYear: c.expirationDate.slice(0, 4),
})

// Edit checks in COCRDUPC order.
function validateCardForm(f: Form): { field: keyof Form; error: string } | null {
  if (!f.embossedName.trim()) return { field: 'embossedName', error: MSG.cardNameRequired }
  if (!/^[A-Za-z ]+$/.test(f.embossedName)) return { field: 'embossedName', error: MSG.cardNameAlphaOnly }
  if (f.activeStatus !== 'Y' && f.activeStatus !== 'N') return { field: 'activeStatus', error: MSG.cardStatusYN }
  const m = Number(f.expMonth)
  if (!/^\d{2}$/.test(f.expMonth) || m < 1 || m > 12) return { field: 'expMonth', error: MSG.expiryMonth }
  const y = Number(f.expYear)
  if (!/^\d{4}$/.test(f.expYear) || y < 1950 || y > 2099) return { field: 'expYear', error: MSG.expiryYear }
  return null
}

export function CardUpdate() {
  const { commarea } = useCommarea()
  return <CardUpdateScreen key={`${commarea.acct}|${commarea.card}`} />
}

function CardUpdateScreen() {
  useStore()
  const { commarea, setParams, back } = useCommarea()
  const result = commarea.acct && commarea.card ? lookupCard(commarea.acct, commarea.card) : null
  const card = result && !('error' in result) ? result.card : null
  const msg = useMessage(
    !result ? MSG.enterAcctAndCard : 'error' in result ? result.error : MSG.cardUpdateAbove,
    result && 'error' in result ? 'error' : 'info',
  )
  const [acctIn, setAcctIn] = useState(commarea.acct)
  const [cardIn, setCardIn] = useState(commarea.card)
  const [keyInvalid, setKeyInvalid] = useState<'acct' | 'card' | null>(null)
  const [form, setForm] = useState<Form | null>(card ? toForm(card) : null)
  const [badField, setBadField] = useState<keyof Form | null>(null)
  const [confirm, setConfirm] = useState(false)

  const set = (k: keyof Form) => (v: string) => setForm((f) => (f ? { ...f, [k]: v } : f))

  const process = (e?: FormEvent) => {
    e?.preventDefault()
    const a = acctIn.trim()
    const c = cardIn.trim()
    const v = validateCardKeys(a, c)
    if (v) { setKeyInvalid(v.field); return msg.error(v.error) }
    setKeyInvalid(null)
    if (a !== commarea.acct || c !== commarea.card) return setParams({ acct: a, card: c })
    validate()
  }

  const validate = (): boolean => {
    if (!form || !card) return false
    if (JSON.stringify(toForm(card)) === JSON.stringify(form)) { msg.info(MSG.noChange); return false }
    const v = validateCardForm(form)
    if (v) { setBadField(v.field); msg.error(v.error); return false }
    setBadField(null)
    msg.info(MSG.changesValidated)
    return true
  }

  const save = () => validate() && setConfirm(true)

  const commitChanges = () => {
    setConfirm(false)
    if (!form || !card) return
    const fresh = findCard(card.cardNum)
    if (!fresh || JSON.stringify(toForm(fresh)) !== JSON.stringify(toForm(card))) return msg.error(MSG.recordChanged)
    updateCard({
      ...card,
      embossedName: form.embossedName.toUpperCase(),
      activeStatus: form.activeStatus,
      expirationDate: `${form.expYear}-${form.expMonth}-${card.expirationDate.slice(8, 10) || '01'}`,
    })
    msg.info(MSG.changesCommitted)
  }

  const cancel = () => {
    if (card) setForm(toForm(card))
    setBadField(null)
    msg.info(MSG.cardUpdateAbove)
  }

  const ro = !form

  return (
    <Screen
      tranId="CCUP"
      program="COCRDUPC"
      title="Update Credit Card Details"
      message={msg.message}
      keysActive={!confirm}
      keys={[
        { key: 'Enter', label: 'Process', onPress: process },
        { key: 'F3', label: 'Exit', onPress: () => back(ROUTES.menu) },
        { key: 'F5', label: 'Save', onPress: () => void save(), disabled: ro },
        { key: 'F12', label: 'Cancel', onPress: cancel, disabled: ro },
      ]}
    >
      <form onSubmit={process} noValidate>
        <div className="form-grid">
          <Field label="Account Number" value={acctIn} onChange={setAcctIn} length={LEN.acctId} numeric invalid={keyInvalid === 'acct'} autoFocus />
          <Field label="Card Number" value={cardIn} onChange={setCardIn} length={LEN.cardNum} numeric invalid={keyInvalid === 'card'} />
        </div>
        <hr className="hr" />
        <div className="form-grid">
          <Field label="Name on card" value={form?.embossedName ?? ''} onChange={ro ? undefined : set('embossedName')} length={50} uppercase invalid={badField === 'embossedName'} className="span-2" />
          <Field label="Card Active Y/N" value={form?.activeStatus ?? ''} onChange={ro ? undefined : set('activeStatus')} length={1} uppercase invalid={badField === 'activeStatus'} />
          <Field label="Expiry Month" value={form?.expMonth ?? ''} onChange={ro ? undefined : set('expMonth')} length={2} numeric invalid={badField === 'expMonth'} hint="MM" />
          <Field label="Expiry Year" value={form?.expYear ?? ''} onChange={ro ? undefined : set('expYear')} length={4} numeric invalid={badField === 'expYear'} hint="YYYY" />
          <Value label="CVV" value={card ? '***' : ''} />
        </div>
        <div className="btn-row">
          <button type="submit" className="btn">Process <kbd>ENTER</kbd></button>
          <button type="button" className="btn btn-primary" disabled={ro} onClick={() => void save()}>Save <kbd>F5</kbd></button>
          <button type="button" className="btn" disabled={ro} onClick={cancel}>Cancel <kbd>F12</kbd></button>
        </div>
      </form>

      <ConfirmDialog
        open={confirm}
        title="Save card changes?"
        message={MSG.changesValidated}
        confirmLabel="Save"
        onConfirm={commitChanges}
        onCancel={() => setConfirm(false)}
      >
        <p className="confirm-detail">Card {card?.cardNum}</p>
      </ConfirmDialog>
    </Screen>
  )
}
