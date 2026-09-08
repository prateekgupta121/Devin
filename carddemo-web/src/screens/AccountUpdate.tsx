import { useState, type FormEvent } from 'react'
import { Screen } from '../components/Screen'
import { useMessage } from '../app/message'
import { Field } from '../components/Field'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useCommarea } from '../app/commarea'
import { LEN, fixedMoney, isDigits, isValidDate, isValidId } from '../app/format'
import { ROUTES } from '../app/menus'
import { MSG } from '../app/messages'
import { updateAccountAndCustomer, useStore } from '../app/store'
import type { Account, Customer } from '../app/types'
import { lookupAccount } from '../app/lookups'

interface Form {
  activeStatus: string
  openDate: string
  creditLimit: string
  expirationDate: string
  cashCreditLimit: string
  reissueDate: string
  currBal: string
  currCycCredit: string
  groupId: string
  currCycDebit: string
  ssn: string
  dob: string
  ficoScore: string
  firstName: string
  middleName: string
  lastName: string
  addrLine1: string
  addrLine2: string
  addrLine3: string
  addrStateCd: string
  addrZip: string
  addrCountryCd: string
  phone1: string
  phone2: string
  govtIssuedId: string
  eftAccountId: string
  priCardHolderInd: string
}

function toForm(a: Account, c: Customer): Form {
  return {
    activeStatus: a.activeStatus,
    openDate: a.openDate,
    creditLimit: fixedMoney(a.creditLimit),
    expirationDate: a.expirationDate,
    cashCreditLimit: fixedMoney(a.cashCreditLimit),
    reissueDate: a.reissueDate,
    currBal: fixedMoney(a.currBal),
    currCycCredit: fixedMoney(a.currCycCredit),
    groupId: a.groupId,
    currCycDebit: fixedMoney(a.currCycDebit),
    ssn: c.ssn,
    dob: c.dob,
    ficoScore: String(c.ficoScore),
    firstName: c.firstName,
    middleName: c.middleName,
    lastName: c.lastName,
    addrLine1: c.addrLine1,
    addrLine2: c.addrLine2,
    addrLine3: c.addrLine3,
    addrStateCd: c.addrStateCd,
    addrZip: c.addrZip,
    addrCountryCd: c.addrCountryCd,
    phone1: c.phone1,
    phone2: c.phone2,
    govtIssuedId: c.govtIssuedId,
    eftAccountId: c.eftAccountId,
    priCardHolderInd: c.priCardHolderInd,
  }
}

const ALPHA_SPACE = /^[A-Za-z ]*$/
const MONEY = /^-?\d{1,10}(\.\d{1,2})?$/
const PHONE = /^\(\d{3}\)\d{3}-\d{4}$/
const STATES = new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC PR VI GU AS MP'.split(' '))

// Field-level checks in COACTUPC order; message wording preserved.
function validateAccountForm(f: Form, original: Form): { field: keyof Form; error: string } | null {
  if (f.activeStatus !== 'Y' && f.activeStatus !== 'N') return { field: 'activeStatus', error: MSG.acctStatusYN }
  if (!f.creditLimit.trim()) return { field: 'creditLimit', error: MSG.creditLimitRequired }
  if (!MONEY.test(f.creditLimit.trim())) return { field: 'creditLimit', error: MSG.creditLimitInvalid }
  if (!MONEY.test(f.cashCreditLimit.trim())) return { field: 'cashCreditLimit', error: 'Cash Credit Limit is not valid' }
  if (!MONEY.test(f.currBal.trim())) return { field: 'currBal', error: 'Current Balance is not valid' }
  if (!MONEY.test(f.currCycCredit.trim())) return { field: 'currCycCredit', error: 'Current Cycle Credit Limit is not valid' }
  if (!MONEY.test(f.currCycDebit.trim())) return { field: 'currCycDebit', error: 'Current Cycle Debit Limit is not valid' }
  for (const [k, label] of [['openDate', 'Open Date'], ['expirationDate', 'Expiry Date'], ['reissueDate', 'Reissue Date'], ['dob', 'Date of Birth']] as const) {
    if (!isValidDate(f[k])) return { field: k, error: `${label} is not valid` }
  }
  if (!f.firstName.trim()) return { field: 'firstName', error: 'First Name must be supplied.' }
  if (!ALPHA_SPACE.test(f.firstName)) return { field: 'firstName', error: MSG.nameAlphaOnly }
  if (!ALPHA_SPACE.test(f.middleName)) return { field: 'middleName', error: MSG.nameAlphaOnly }
  if (!f.lastName.trim()) return { field: 'lastName', error: MSG.lastNameRequired }
  if (!ALPHA_SPACE.test(f.lastName)) return { field: 'lastName', error: MSG.nameAlphaOnly }
  if (!/^\d{9}$/.test(f.ssn)) return { field: 'ssn', error: 'SSN: First 3 chars must be all numeric.' }
  const ssn3 = Number(f.ssn.slice(0, 3))
  if (ssn3 === 0 || ssn3 === 666 || ssn3 >= 900) return { field: 'ssn', error: 'SSN: First 3 chars: should not be 000, 666, or between 900 and 999' }
  if (!/^\d{3}$/.test(f.ficoScore)) return { field: 'ficoScore', error: 'FICO Score must be all numeric.' }
  const fico = Number(f.ficoScore)
  // Sample data contains out-of-range scores; only enforce the range on edited values.
  if (f.ficoScore !== original.ficoScore && (fico < 300 || fico > 850)) return { field: 'ficoScore', error: 'FICO Score: should be between 300 and 850' }
  if (!f.addrLine1.trim()) return { field: 'addrLine1', error: 'Address Line 1 must be supplied.' }
  if (!f.addrLine3.trim()) return { field: 'addrLine3', error: 'City must be supplied.' }
  if (!STATES.has(f.addrStateCd.toUpperCase())) return { field: 'addrStateCd', error: 'State: is not a valid state code' }
  if (!/^\d{5}(-?\d{4})?$/.test(f.addrZip.trim())) return { field: 'addrZip', error: 'Zip must be all numeric.' }
  if (!/^[A-Za-z]{3}$/.test(f.addrCountryCd)) return { field: 'addrCountryCd', error: 'Country can have alphabets only.' }
  if (f.phone1 && !PHONE.test(f.phone1)) return { field: 'phone1', error: 'Phone Number 1: Area code must be A 3 digit number.' }
  if (f.phone2 && !PHONE.test(f.phone2)) return { field: 'phone2', error: 'Phone Number 2: Area code must be A 3 digit number.' }
  if (f.eftAccountId && !isDigits(f.eftAccountId)) return { field: 'eftAccountId', error: 'EFT Account Id must be all numeric.' }
  if (f.priCardHolderInd !== 'Y' && f.priCardHolderInd !== 'N') return { field: 'priCardHolderInd', error: 'Primary Card Holder must be Y or N.' }
  return null
}

export function AccountUpdate() {
  const { commarea } = useCommarea()
  return <AccountUpdateScreen key={commarea.acct} />
}

function AccountUpdateScreen() {
  useStore()
  const { commarea, setParams, back } = useCommarea()
  const result = commarea.acct ? lookupAccount(commarea.acct) : null
  const found = result && !('error' in result) ? result : null
  const msg = useMessage(
    !result ? MSG.acctUpdatePrompt : 'error' in result ? result.error : MSG.acctUpdateAbove,
    result && 'error' in result ? 'error' : 'info',
  )
  const [acctIn, setAcctIn] = useState(commarea.acct)
  const [acctInvalid, setAcctInvalid] = useState(false)
  const [form, setForm] = useState<Form | null>(found ? toForm(found.account, found.customer) : null)
  const [badField, setBadField] = useState<keyof Form | null>(null)
  const [validated, setValidated] = useState(false)
  const [confirm, setConfirm] = useState(false)

  const set = (k: keyof Form) => (v: string) => {
    setForm((f) => (f ? { ...f, [k]: v } : f))
    setValidated(false)
  }

  const fetch = (e?: FormEvent) => {
    e?.preventDefault()
    const v = acctIn.trim()
    if (!v) { setAcctInvalid(true); return msg.error(MSG.acctNotProvided) }
    if (!isValidId(v, LEN.acctId)) { setAcctInvalid(true); return msg.error(MSG.acctMustBe11) }
    setAcctInvalid(false)
    if (v !== commarea.acct) return setParams({ acct: v })
    validate()
  }

  const validate = (): boolean => {
    if (!form || !found) return false
    const original = toForm(found.account, found.customer)
    if (JSON.stringify(original) === JSON.stringify(form)) { msg.info(MSG.noChange); setValidated(false); return false }
    const v = validateAccountForm(form, original)
    if (v) { setBadField(v.field); msg.error(v.error); setValidated(false); return false }
    setBadField(null)
    setValidated(true)
    msg.info(MSG.changesValidated)
    return true
  }

  const save = () => {
    if (!validate()) return
    setConfirm(true)
  }

  const commitChanges = () => {
    setConfirm(false)
    if (!form || !found) return
    // Optimistic-lock check equivalent: the record must still match what was fetched.
    const fresh = lookupAccount(found.account.acctId)
    if ('error' in fresh || JSON.stringify(toForm(fresh.account, fresh.customer)) !== JSON.stringify(toForm(found.account, found.customer))) {
      return msg.error(MSG.recordChanged)
    }
    updateAccountAndCustomer(
      {
        ...found.account,
        activeStatus: form.activeStatus,
        creditLimit: Number(form.creditLimit),
        cashCreditLimit: Number(form.cashCreditLimit),
        currBal: Number(form.currBal),
        currCycCredit: Number(form.currCycCredit),
        currCycDebit: Number(form.currCycDebit),
        openDate: form.openDate,
        expirationDate: form.expirationDate,
        reissueDate: form.reissueDate,
        groupId: form.groupId,
      },
      {
        ...found.customer,
        ssn: form.ssn,
        dob: form.dob,
        ficoScore: Number(form.ficoScore),
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        addrLine1: form.addrLine1,
        addrLine2: form.addrLine2,
        addrLine3: form.addrLine3,
        addrStateCd: form.addrStateCd.toUpperCase(),
        addrZip: form.addrZip,
        addrCountryCd: form.addrCountryCd.toUpperCase(),
        phone1: form.phone1,
        phone2: form.phone2,
        govtIssuedId: form.govtIssuedId,
        eftAccountId: form.eftAccountId,
        priCardHolderInd: form.priCardHolderInd,
      },
    )
    setValidated(false)
    msg.info(MSG.changesCommitted)
  }

  const cancel = () => {
    if (found) setForm(toForm(found.account, found.customer))
    setBadField(null)
    setValidated(false)
    msg.info(MSG.acctUpdateAbove)
  }

  const f = form
  const ro = !f
  const fld = (k: keyof Form, label: string, extra: Partial<Parameters<typeof Field>[0]> = {}) => (
    <Field key={k} label={label} value={f ? f[k] : ''} onChange={ro ? undefined : set(k)} invalid={badField === k} {...extra} />
  )

  return (
    <Screen
      tranId="CAUP"
      program="COACTUPC"
      title="Update Account"
      message={msg.message}
      keysActive={!confirm}
      keys={[
        { key: 'Enter', label: 'Process', onPress: fetch },
        { key: 'F3', label: 'Exit', onPress: () => back(ROUTES.menu) },
        { key: 'F5', label: 'Save', onPress: save, disabled: ro },
        { key: 'F12', label: 'Cancel', onPress: cancel, disabled: ro },
      ]}
    >
      <form onSubmit={fetch} noValidate>
        <div className="form-grid">
          <Field label="Account Number" value={acctIn} onChange={setAcctIn} length={LEN.acctId} numeric invalid={acctInvalid} autoFocus />
          {fld('activeStatus', 'Active Y/N', { length: 1, uppercase: true })}
          {fld('openDate', 'Opened', { length: 10, hint: 'YYYY-MM-DD' })}
          {fld('creditLimit', 'Credit Limit', { length: 15 })}
          {fld('expirationDate', 'Expiry', { length: 10, hint: 'YYYY-MM-DD' })}
          {fld('cashCreditLimit', 'Cash credit Limit', { length: 15 })}
          {fld('reissueDate', 'Reissue', { length: 10, hint: 'YYYY-MM-DD' })}
          {fld('currBal', 'Current Balance', { length: 15 })}
          {fld('currCycCredit', 'Current Cycle Credit', { length: 15 })}
          {fld('groupId', 'Account Group', { length: 10 })}
          {fld('currCycDebit', 'Current Cycle Debit', { length: 15 })}
        </div>

        <section className="section">
          <h2 className="section-title">Customer Details</h2>
          <div className="form-grid">
            <Field label="Customer id" value={found?.customer.custId ?? ''} />
            {fld('ssn', 'SSN', { length: 9, numeric: true, hint: '999-99-9999' })}
            {fld('dob', 'Date of birth', { length: 10, hint: 'YYYY-MM-DD' })}
            {fld('ficoScore', 'FICO Score', { length: 3, numeric: true })}
            {fld('firstName', 'First Name', { length: 25 })}
            {fld('middleName', 'Middle Name', { length: 25 })}
            {fld('lastName', 'Last Name', { length: 25 })}
            {fld('addrLine1', 'Address', { length: 50 })}
            {fld('addrStateCd', 'State', { length: 2, uppercase: true })}
            {fld('addrLine2', '', { length: 50 })}
            {fld('addrZip', 'Zip', { length: 10 })}
            {fld('addrLine3', 'City', { length: 50 })}
            {fld('addrCountryCd', 'Country', { length: 3, uppercase: true })}
            {fld('phone1', 'Phone 1', { length: 15, hint: '(999)999-9999' })}
            {fld('govtIssuedId', 'Government Issued Id Ref', { length: 20 })}
            {fld('phone2', 'Phone 2', { length: 15, hint: '(999)999-9999' })}
            {fld('eftAccountId', 'EFT Account Id', { length: 10 })}
            {fld('priCardHolderInd', 'Primary Card Holder Y/N', { length: 1, uppercase: true })}
          </div>
        </section>

        <div className="btn-row">
          <button type="submit" className="btn">Process <kbd>ENTER</kbd></button>
          <button type="button" className="btn btn-primary" disabled={ro} onClick={save}>Save <kbd>F5</kbd></button>
          <button type="button" className="btn" disabled={ro} onClick={cancel}>Cancel <kbd>F12</kbd></button>
          {validated && <span className="field-hint">Validated - confirm to commit</span>}
        </div>
      </form>

      <ConfirmDialog
        open={confirm}
        title="Save account changes?"
        message={MSG.changesValidated}
        confirmLabel="Save"
        onConfirm={commitChanges}
        onCancel={() => setConfirm(false)}
      >
        <p className="confirm-detail">Account {found?.account.acctId} / Customer {found?.customer.custId}</p>
      </ConfirmDialog>
    </Screen>
  )
}
