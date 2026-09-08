import { useState, type FormEvent } from 'react'
import { Screen } from '../components/Screen'
import { useMessage } from '../app/message'
import { Field } from '../components/Field'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useCommarea } from '../app/commarea'
import { LEN, isDigits, isValidDate, nowTs, todayIso } from '../app/format'
import { ROUTES } from '../app/menus'
import { MSG } from '../app/messages'
import { addTransaction, findAccount, findCard, findTransaction, findXrefByAcct, getState, nextTranId, useStore } from '../app/store'
import type { Transaction } from '../app/types'

interface Form {
  acctId: string
  cardNum: string
  typeCd: string
  catCd: string
  source: string
  description: string
  amount: string
  origDate: string
  procDate: string
  merchantId: string
  merchantName: string
  merchantCity: string
  merchantZip: string
}

const EMPTY: Form = {
  acctId: '', cardNum: '', typeCd: '', catCd: '', source: '', description: '', amount: '',
  origDate: '', procDate: '', merchantId: '', merchantName: '', merchantCity: '', merchantZip: '',
}

type Check = { field: keyof Form; error: string }

// Key resolution as in COTRN02C: account id -> card via xref, or card -> account.
function resolveKeys(f: Form): Check | { acctId: string; cardNum: string } {
  if (!f.acctId && !f.cardNum) return { field: 'acctId', error: MSG.acctOrCardRequired }
  if (f.acctId) {
    if (!isDigits(f.acctId)) return { field: 'acctId', error: MSG.acctIdNumeric }
    const x = findXrefByAcct(f.acctId.padStart(LEN.acctId, '0'))
    if (!x) return { field: 'acctId', error: MSG.acctIdNotFound }
    return { acctId: x.acctId, cardNum: x.cardNum }
  }
  if (!isDigits(f.cardNum)) return { field: 'cardNum', error: MSG.cardNumNumeric }
  const c = findCard(f.cardNum.padStart(LEN.cardNum, '0'))
  if (!c) return { field: 'cardNum', error: MSG.cardNumNotFound }
  return { acctId: c.acctId, cardNum: c.cardNum }
}

function validateTranForm(f: Form): Check | null {
  if (!f.typeCd.trim()) return { field: 'typeCd', error: MSG.typeCdEmpty }
  if (!isDigits(f.typeCd)) return { field: 'typeCd', error: MSG.typeCdNumeric }
  if (!f.catCd.trim()) return { field: 'catCd', error: MSG.catCdEmpty }
  if (!isDigits(f.catCd)) return { field: 'catCd', error: MSG.catCdNumeric }
  if (!f.source.trim()) return { field: 'source', error: MSG.sourceEmpty }
  if (!f.description.trim()) return { field: 'description', error: MSG.descEmpty }
  if (!f.amount.trim()) return { field: 'amount', error: MSG.amountEmpty }
  if (!/^[-+]\d{8}\.\d{2}$/.test(f.amount)) return { field: 'amount', error: MSG.amountFormat }
  if (!f.origDate.trim()) return { field: 'origDate', error: MSG.origDateEmpty }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.origDate)) return { field: 'origDate', error: MSG.origDateFormat }
  if (!isValidDate(f.origDate)) return { field: 'origDate', error: MSG.origDateInvalid }
  if (!f.procDate.trim()) return { field: 'procDate', error: MSG.procDateEmpty }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.procDate)) return { field: 'procDate', error: MSG.procDateFormat }
  if (!isValidDate(f.procDate)) return { field: 'procDate', error: MSG.procDateInvalid }
  if (!f.merchantId.trim()) return { field: 'merchantId', error: MSG.merchIdEmpty }
  if (!isDigits(f.merchantId)) return { field: 'merchantId', error: MSG.merchIdNumeric }
  if (!f.merchantName.trim()) return { field: 'merchantName', error: MSG.merchNameEmpty }
  if (!f.merchantCity.trim()) return { field: 'merchantCity', error: MSG.merchCityEmpty }
  if (!f.merchantZip.trim()) return { field: 'merchantZip', error: MSG.merchZipEmpty }
  return null
}

export function TranAdd() {
  useStore()
  const { commarea, back } = useCommarea()
  const msg = useMessage()
  const [form, setForm] = useState<Form>({
    ...EMPTY,
    acctId: commarea.acct,
    cardNum: commarea.acct ? '' : commarea.card,
    origDate: todayIso(),
    procDate: todayIso(),
  })
  const [badField, setBadField] = useState<keyof Form | null>(null)
  const [confirm, setConfirm] = useState(false)

  const set = (k: keyof Form) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const validate = (): { acctId: string; cardNum: string } | null => {
    const keys = resolveKeys(form)
    if ('error' in keys) { setBadField(keys.field); msg.error(keys.error); return null }
    const v = validateTranForm(form)
    if (v) { setBadField(v.field); msg.error(v.error); return null }
    setBadField(null)
    return keys
  }

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const keys = validate()
    if (!keys) return
    setForm((f) => ({ ...f, acctId: keys.acctId, cardNum: keys.cardNum }))
    msg.info(MSG.confirmAddTran)
    setConfirm(true)
  }

  const commitAdd = () => {
    setConfirm(false)
    const keys = resolveKeys(form)
    if ('error' in keys) return msg.error(keys.error)
    const tranId = nextTranId()
    if (findTransaction(tranId)) return msg.error(MSG.tranExists)
    const tran: Transaction = {
      tranId,
      typeCd: form.typeCd.padStart(2, '0'),
      catCd: form.catCd.padStart(4, '0'),
      source: form.source.trim(),
      description: form.description.trim(),
      amount: Number(form.amount),
      merchantId: form.merchantId,
      merchantName: form.merchantName.trim(),
      merchantCity: form.merchantCity.trim(),
      merchantZip: form.merchantZip.trim(),
      cardNum: keys.cardNum,
      origTs: `${form.origDate} ${nowTs().slice(11)}`,
      procTs: `${form.procDate} ${nowTs().slice(11)}`,
    }
    addTransaction(tran)
    setForm({ ...EMPTY, origDate: todayIso(), procDate: todayIso() })
    setBadField(null)
    msg.info(MSG.tranAdded(tranId))
  }

  const clear = () => {
    setForm({ ...EMPTY, origDate: todayIso(), procDate: todayIso() })
    setBadField(null)
    msg.clear()
  }

  // F5 copies the most recent transaction on the same account/card into the form.
  const copyLast = () => {
    const keys = resolveKeys(form)
    if ('error' in keys) { setBadField(keys.field); return msg.error(keys.error) }
    const last = [...getState().transactions]
      .filter((t) => t.cardNum === keys.cardNum)
      .sort((a, b) => b.tranId.localeCompare(a.tranId))[0]
    if (!last) return msg.error(MSG.tranNotFound)
    setForm({
      acctId: keys.acctId,
      cardNum: keys.cardNum,
      typeCd: last.typeCd,
      catCd: last.catCd,
      source: last.source,
      description: last.description,
      amount: `${last.amount < 0 ? '-' : '+'}${Math.abs(last.amount).toFixed(2).padStart(11, '0')}`,
      origDate: todayIso(),
      procDate: todayIso(),
      merchantId: last.merchantId,
      merchantName: last.merchantName,
      merchantCity: last.merchantCity,
      merchantZip: last.merchantZip,
    })
    setBadField(null)
    msg.info(`Copied last transaction ${last.tranId} for this card`)
  }

  const acctKnown = form.acctId && findAccount(form.acctId.padStart(LEN.acctId, '0'))
  const f = (k: keyof Form, label: string, extra: Partial<Parameters<typeof Field>[0]> = {}) => (
    <Field key={k} label={label} value={form[k]} onChange={set(k)} invalid={badField === k} {...extra} />
  )

  return (
    <Screen
      tranId="CT02"
      program="COTRN02C"
      title="Add Transaction"
      message={msg.message}
      keysActive={!confirm}
      keys={[
        { key: 'Enter', label: 'Add', onPress: submit },
        { key: 'F3', label: 'Back', onPress: () => back(ROUTES.menu) },
        { key: 'F4', label: 'Clear', onPress: clear },
        { key: 'F5', label: 'Copy Last Tran.', onPress: copyLast },
      ]}
    >
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          {f('acctId', 'Enter Acct #', { length: LEN.acctId, numeric: true, autoFocus: true, hint: acctKnown ? 'Account on file' : undefined })}
          {f('cardNum', '(or) Card #', { length: LEN.cardNum, numeric: true })}
          {f('typeCd', 'Type CD', { length: 2, numeric: true })}
          {f('catCd', 'Category CD', { length: 4, numeric: true })}
          {f('source', 'Source', { length: 10 })}
          {f('description', 'Description', { length: 100, className: 'span-2' })}
          {f('amount', 'Amount', { length: 12, hint: '-99999999.99' })}
          {f('origDate', 'Orig Date', { length: 10, hint: 'YYYY-MM-DD' })}
          {f('procDate', 'Proc Date', { length: 10, hint: 'YYYY-MM-DD' })}
          {f('merchantId', 'Merchant ID', { length: 9, numeric: true })}
          {f('merchantName', 'Merchant Name', { length: 50 })}
          {f('merchantCity', 'Merchant City', { length: 50 })}
          {f('merchantZip', 'Merchant Zip', { length: 10 })}
        </div>
        <div className="btn-row">
          <button type="submit" className="btn btn-primary">Add <kbd>ENTER</kbd></button>
          <button type="button" className="btn" onClick={clear}>Clear <kbd>F4</kbd></button>
          <button type="button" className="btn" onClick={copyLast}>Copy Last Tran. <kbd>F5</kbd></button>
        </div>
      </form>

      <ConfirmDialog
        open={confirm}
        title="Add transaction?"
        message={MSG.confirmAddTran}
        confirmLabel="Yes"
        onConfirm={commitAdd}
        onCancel={() => { setConfirm(false); msg.clear() }}
      >
        <p className="confirm-detail">{form.description} — {form.amount} on card {form.cardNum}</p>
      </ConfirmDialog>
    </Screen>
  )
}
