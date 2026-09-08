import { useState, type FormEvent } from 'react'
import { Screen } from '../components/Screen'
import { useMessage } from '../app/message'
import { Field, Value } from '../components/Field'
import { useCommarea } from '../app/commarea'
import { LEN } from '../app/format'
import { ROUTES } from '../app/menus'
import { MSG } from '../app/messages'
import { useStore } from '../app/store'
import { lookupCard, validateCardKeys } from '../app/lookups'

export function CardView() {
  const { commarea } = useCommarea()
  return <CardViewScreen key={`${commarea.acct}|${commarea.card}`} />
}

function CardViewScreen() {
  useStore()
  const { commarea, setParams, back } = useCommarea()
  const result = commarea.acct && commarea.card ? lookupCard(commarea.acct, commarea.card) : null
  const msg = useMessage(
    !result ? MSG.enterAcctAndCard : 'error' in result ? result.error : MSG.cardDisplaying.trim(),
    result && 'error' in result ? 'error' : 'info',
  )
  const [acctIn, setAcctIn] = useState(commarea.acct)
  const [cardIn, setCardIn] = useState(commarea.card)
  const [invalid, setInvalid] = useState<'acct' | 'card' | null>(null)

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const a = acctIn.trim()
    const c = cardIn.trim()
    const v = validateCardKeys(a, c)
    if (v) { setInvalid(v.field); return msg.error(v.error) }
    setInvalid(null)
    if (a === commarea.acct && c === commarea.card) {
      const r = lookupCard(a, c)
      return 'error' in r ? msg.error(r.error) : msg.info(MSG.cardDisplaying.trim())
    }
    setParams({ acct: a, card: c })
  }

  const card = result && !('error' in result) ? result.card : null
  const [expY, expM] = card ? card.expirationDate.split('-') : ['', '']

  return (
    <Screen
      tranId="CCDL"
      program="COCRDSLC"
      title="View Credit Card Detail"
      message={msg.message}
      keys={[
        { key: 'Enter', label: 'Search Cards', onPress: submit },
        { key: 'F3', label: 'Exit', onPress: () => back(ROUTES.menu) },
      ]}
    >
      <form onSubmit={submit} noValidate>
        <div className="form-grid form-grid-1">
          <Field label="Account Number" value={acctIn} onChange={setAcctIn} length={LEN.acctId} numeric invalid={invalid === 'acct'} autoFocus />
          <Field label="Card Number" value={cardIn} onChange={setCardIn} length={LEN.cardNum} numeric invalid={invalid === 'card'} />
          <Value label="Name on card" value={card?.embossedName ?? ''} />
          <Value label="Card Active Y/N" value={card?.activeStatus ?? ''} />
          <Value label="Expiry Date" value={card ? `${expM} / ${expY}` : ''} />
        </div>
        <div className="btn-row">
          <button type="submit" className="btn btn-primary">Search Cards <kbd>ENTER</kbd></button>
        </div>
      </form>
    </Screen>
  )
}
