import { useState, type FormEvent } from 'react'
import { Screen } from '../components/Screen'
import { useMessage } from '../app/message'
import { Field, Value } from '../components/Field'
import { useCommarea } from '../app/commarea'
import { LEN, isValidId, maskSsn, money } from '../app/format'
import { ROUTES } from '../app/menus'
import { MSG } from '../app/messages'
import { useStore } from '../app/store'
import { lookupAccount } from '../app/lookups'

export function AccountView() {
  const { commarea } = useCommarea()
  // Remount on account change so the screen re-initialises like a fresh XCTL.
  return <AccountViewScreen key={commarea.acct} />
}

function AccountViewScreen() {
  useStore()
  const { commarea, setParams, back } = useCommarea()
  const result = commarea.acct ? lookupAccount(commarea.acct) : null
  const msg = useMessage(
    !result ? MSG.acctViewPrompt : 'error' in result ? result.error : MSG.acctDisplaying,
    result && 'error' in result ? 'error' : 'info',
  )
  const [acctIn, setAcctIn] = useState(commarea.acct)
  const [invalid, setInvalid] = useState(false)

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const v = acctIn.trim()
    if (!v) { setInvalid(true); return msg.error(MSG.acctNotProvided) }
    if (!isValidId(v, LEN.acctId)) { setInvalid(true); return msg.error(MSG.acctMustBe11) }
    setInvalid(false)
    if (v === commarea.acct) {
      const r = lookupAccount(v)
      return 'error' in r ? msg.error(r.error) : msg.info(MSG.acctDisplaying)
    }
    setParams({ acct: v, cust: '' })
  }

  const a = result && !('error' in result) ? result.account : null
  const c = result && !('error' in result) ? result.customer : null

  return (
    <Screen
      tranId="CAVW"
      program="COACTVWC"
      title="View Account"
      message={msg.message}
      keys={[
        { key: 'Enter', label: 'Fetch', onPress: submit },
        { key: 'F3', label: 'Exit', onPress: () => back(ROUTES.menu) },
      ]}
    >
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="Account Number" value={acctIn} onChange={setAcctIn} length={LEN.acctId} numeric invalid={invalid} autoFocus />
          <Value label="Active Y/N" value={a?.activeStatus ?? ''} />
          <Value label="Opened" value={a?.openDate ?? ''} />
          <Value label="Credit Limit" value={a ? money(a.creditLimit) : ''} />
          <Value label="Expiry" value={a?.expirationDate ?? ''} />
          <Value label="Cash credit Limit" value={a ? money(a.cashCreditLimit) : ''} />
          <Value label="Reissue" value={a?.reissueDate ?? ''} />
          <Value label="Current Balance" value={a ? money(a.currBal) : ''} />
          <Value label="Current Cycle Credit" value={a ? money(a.currCycCredit) : ''} />
          <Value label="Account Group" value={a?.groupId ?? ''} />
          <Value label="Current Cycle Debit" value={a ? money(a.currCycDebit) : ''} />
        </div>
        <button type="submit" hidden>Fetch</button>
      </form>

      <section className="section">
        <h2 className="section-title">Customer Details</h2>
        <div className="form-grid">
          <Value label="Customer id" value={c?.custId ?? ''} />
          <Value label="SSN" value={c ? maskSsn(c.ssn) : ''} />
          <Value label="Date of birth" value={c?.dob ?? ''} />
          <Value label="FICO Score" value={c ? String(c.ficoScore) : ''} />
          <Value label="First Name" value={c?.firstName ?? ''} />
          <Value label="Middle Name" value={c?.middleName ?? ''} />
          <Value label="Last Name" value={c?.lastName ?? ''} />
          <Value label="Address" value={c?.addrLine1 ?? ''} />
          <Value label="State" value={c?.addrStateCd ?? ''} />
          <Value label="" value={c?.addrLine2 ?? ''} />
          <Value label="Zip" value={c?.addrZip ?? ''} />
          <Value label="City" value={c?.addrLine3 ?? ''} />
          <Value label="Country" value={c?.addrCountryCd ?? ''} />
          <Value label="Phone 1" value={c?.phone1 ?? ''} />
          <Value label="Government Issued Id Ref" value={c?.govtIssuedId ?? ''} />
          <Value label="Phone 2" value={c?.phone2 ?? ''} />
          <Value label="EFT Account Id" value={c?.eftAccountId ?? ''} />
          <Value label="Primary Card Holder Y/N" value={c?.priCardHolderInd ?? ''} />
        </div>
      </section>
    </Screen>
  )
}
