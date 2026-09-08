import { useState, type FormEvent } from 'react'
import { Screen } from '../components/Screen'
import { useMessage } from '../app/message'
import { Field, Value } from '../components/Field'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useCommarea } from '../app/commarea'
import { LEN, isDigits, money, nowTs } from '../app/format'
import { ROUTES } from '../app/menus'
import { MSG } from '../app/messages'
import { findAccount, findXrefByAcct, nextTranId, payBill, useStore } from '../app/store'

export function BillPay() {
  const { commarea } = useCommarea()
  return <BillPayScreen key={commarea.acct} />
}

function BillPayScreen() {
  useStore()
  const { commarea, setParams, back } = useCommarea()
  const account = commarea.acct ? findAccount(commarea.acct) : undefined
  const msg = useMessage(commarea.acct && !account ? MSG.acctIdNotFound : undefined, 'error')
  const [acctIn, setAcctIn] = useState(commarea.acct)
  const [invalid, setInvalid] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const a = acctIn.trim()
    if (!a) { setInvalid(true); return msg.error(MSG.acctIdEmpty) }
    if (!isDigits(a)) { setInvalid(true); return msg.error(MSG.acctIdNumeric) }
    setInvalid(false)
    const padded = a.padStart(LEN.acctId, '0')
    if (padded !== commarea.acct) return setParams({ acct: padded })
    if (!account) return msg.error(MSG.acctIdNotFound)
    if (account.currBal <= 0) return msg.error(MSG.nothingToPay)
    msg.info(MSG.confirmBillPay)
    setConfirm(true)
  }

  const pay = () => {
    setConfirm(false)
    if (!account) return
    const xref = findXrefByAcct(account.acctId)
    if (!xref) return msg.error(MSG.cardNumNotFound)
    const tranId = nextTranId()
    payBill(account.acctId, {
      tranId,
      typeCd: '02',
      catCd: '0002',
      source: 'POS TERM',
      description: 'BILL PAYMENT - ONLINE',
      amount: -account.currBal,
      merchantId: '999999999',
      merchantName: 'BILL PAYMENT',
      merchantCity: 'N/A',
      merchantZip: 'N/A',
      cardNum: xref.cardNum,
      origTs: nowTs(),
      procTs: nowTs(),
    })
    msg.info(MSG.paymentOk(tranId))
  }

  return (
    <Screen
      tranId="CB00"
      program="COBIL00C"
      title="Bill Payment"
      message={msg.message}
      keysActive={!confirm}
      keys={[
        { key: 'Enter', label: 'Continue', onPress: submit },
        { key: 'F3', label: 'Back', onPress: () => back(ROUTES.menu) },
        { key: 'F4', label: 'Clear', onPress: () => { setAcctIn(''); setInvalid(false); if (commarea.acct) setParams({ acct: '' }); else msg.clear() } },
      ]}
    >
      <form onSubmit={submit} noValidate>
        <p className="signon-intro">Pay your account balance in full.</p>
        <div className="form-grid">
          <Field label="Enter Acct ID" value={acctIn} onChange={setAcctIn} length={LEN.acctId} numeric invalid={invalid} autoFocus />
          <Value label="Your current balance is" value={account ? money(account.currBal) : ''} />
        </div>
        <div className="btn-row">
          <button type="submit" className="btn btn-primary">Continue <kbd>ENTER</kbd></button>
        </div>
      </form>

      <ConfirmDialog
        open={confirm}
        title="Do you want to pay your balance now?"
        message={MSG.confirmBillPay}
        confirmLabel="Yes"
        onConfirm={pay}
        onCancel={() => { setConfirm(false); msg.clear() }}
      >
        <p className="confirm-detail">Account {account?.acctId}: {account ? money(account.currBal) : ''}</p>
      </ConfirmDialog>
    </Screen>
  )
}
