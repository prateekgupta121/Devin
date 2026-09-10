import { useState, type FormEvent } from 'react'
import { Screen } from '../components/Screen'
import { useMessage } from '../app/message'
import { Field, Value } from '../components/Field'
import { useCommarea } from '../app/commarea'
import { LEN, isDigits, money } from '../app/format'
import { ROUTES } from '../app/menus'
import { MSG } from '../app/messages'
import { findTransaction, useStore } from '../app/store'

export function TranView() {
  const { commarea } = useCommarea()
  return <TranViewScreen key={commarea.tran} />
}

function TranViewScreen() {
  useStore()
  const { commarea, setParams, back, go } = useCommarea()
  const tran = commarea.tran ? findTransaction(commarea.tran) : undefined
  const msg = useMessage(commarea.tran && !tran ? MSG.tranNotFound : undefined, 'error')
  const [tranIn, setTranIn] = useState(commarea.tran)
  const [invalid, setInvalid] = useState(false)

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const t = tranIn.trim()
    if (!t) { setInvalid(true); return msg.error(MSG.tranIdEmpty) }
    if (!isDigits(t)) { setInvalid(true); return msg.error(MSG.tranIdNumeric) }
    setInvalid(false)
    const padded = t.padStart(LEN.tranId, '0')
    if (padded === commarea.tran) return tran ? msg.clear() : msg.error(MSG.tranNotFound)
    setParams({ tran: padded })
  }

  const clear = () => {
    setTranIn('')
    setInvalid(false)
    if (commarea.tran) setParams({ tran: '' })
    else msg.clear()
  }

  return (
    <Screen
      tranId="CT01"
      program="COTRN01C"
      title="View Transaction"
      message={msg.message}
      keys={[
        { key: 'Enter', label: 'Fetch', onPress: submit },
        { key: 'F3', label: 'Back', onPress: () => back(ROUTES.menu) },
        { key: 'F4', label: 'Clear', onPress: clear },
        { key: 'F5', label: 'Browse Tran.', onPress: () => go(ROUTES.tranList, { tran: commarea.tran }) },
      ]}
    >
      <form onSubmit={submit} noValidate>
        <div className="form-grid form-grid-1">
          <Field label="Enter Tran ID" value={tranIn} onChange={setTranIn} length={LEN.tranId} numeric invalid={invalid} autoFocus />
        </div>
        <hr className="hr" />
        <div className="form-grid">
          <Value label="Card Number" value={tran?.cardNum ?? ''} />
          <Value label="Type CD" value={tran?.typeCd ?? ''} />
          <Value label="Category CD" value={tran?.catCd ?? ''} />
          <Value label="Source" value={tran?.source ?? ''} />
          <Value label="Description" value={tran?.description ?? ''} className="span-2" />
          <Value label="Amount" value={tran ? money(tran.amount) : ''} />
          <Value label="Orig Date" value={tran?.origTs.slice(0, 10) ?? ''} />
          <Value label="Proc Date" value={tran?.procTs.slice(0, 10) ?? ''} />
          <Value label="Merchant ID" value={tran?.merchantId ?? ''} />
          <Value label="Merchant Name" value={tran?.merchantName ?? ''} />
          <Value label="Merchant City" value={tran?.merchantCity ?? ''} />
          <Value label="Merchant Zip" value={tran?.merchantZip ?? ''} />
        </div>
        <div className="btn-row">
          <button type="submit" className="btn btn-primary">Fetch <kbd>ENTER</kbd></button>
        </div>
      </form>
    </Screen>
  )
}
