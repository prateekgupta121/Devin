import { useState, type FormEvent } from 'react'
import { Screen } from '../components/Screen'
import { useMessage } from '../app/message'
import { Field } from '../components/Field'
import { Pager } from '../components/Pager'
import { paginate } from '../app/paginate'
import { useCommarea } from '../app/commarea'
import { LEN, isDigits } from '../app/format'
import { ROUTES } from '../app/menus'
import { MSG } from '../app/messages'
import { useStore } from '../app/store'

const DEFAULT_PAGE_SIZE = 7

export function CardList() {
  const { params } = useCommarea()
  return <CardListScreen key={`${params.get('acct')}|${params.get('card')}`} />
}

function CardListScreen() {
  const { cards } = useStore()
  const { commarea, params, go, back, setParams } = useCommarea()
  const page = Number(params.get('page') ?? '1')
  const pageSize = Number(params.get('size') ?? DEFAULT_PAGE_SIZE)

  const filtered = cards
    .filter((c) => !commarea.acct || c.acctId === commarea.acct)
    .filter((c) => !commarea.card || c.cardNum === commarea.card)
    .sort((a, b) => a.cardNum.localeCompare(b.cardNum))
  const { rows, page: p, pageCount } = paginate(filtered, page, pageSize)

  const msg = useMessage(filtered.length === 0 ? MSG.cardNoRecords : MSG.cardListPrompt, filtered.length === 0 ? 'error' : 'info')
  const [acctIn, setAcctIn] = useState(commarea.acct)
  const [cardIn, setCardIn] = useState(commarea.card)
  const [sel, setSel] = useState<Record<string, string>>({})
  const [invalid, setInvalid] = useState<'acct' | 'card' | null>(null)

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const a = acctIn.trim()
    const c = cardIn.trim()
    if (a && !(a.length === LEN.acctId && isDigits(a) && Number(a) !== 0)) { setInvalid('acct'); return msg.error(MSG.cardAcctFilter) }
    if (c && !(c.length === LEN.cardNum && isDigits(c) && Number(c) !== 0)) { setInvalid('card'); return msg.error(MSG.cardIdFilter) }
    setInvalid(null)

    const chosen = Object.entries(sel).filter(([, v]) => v.trim() !== '')
    if (chosen.length > 1) return msg.error(MSG.cardSelectOne)
    if (chosen.length === 1) {
      const [cardNum, action] = chosen[0]
      const row = rows.find((r) => r.cardNum === cardNum)
      if (!row) return
      const act = action.trim().toUpperCase()
      if (act === 'S') return go(ROUTES.cardView, { acct: row.acctId, card: row.cardNum })
      if (act === 'U') return go(ROUTES.cardUpdate, { acct: row.acctId, card: row.cardNum })
      return msg.error(MSG.cardInvalidAction)
    }
    if (a !== commarea.acct || c !== commarea.card) setParams({ acct: a, card: c }, { page: '1', size: String(pageSize) })
  }

  const gotoPage = (n: number) => setParams({}, { page: String(n), size: String(pageSize) })
  const pageBack = () => (p <= 1 ? msg.error(MSG.cardNoPrevPages) : gotoPage(p - 1))
  const pageFwd = () => (p >= pageCount ? msg.error(MSG.cardNoMorePages) : gotoPage(p + 1))

  return (
    <Screen
      tranId="CCLI"
      program="COCRDLIC"
      title="List Credit Cards"
      message={msg.message}
      wide
      keys={[
        { key: 'Enter', label: 'Continue', onPress: submit },
        { key: 'F3', label: 'Exit', onPress: () => back(ROUTES.menu) },
        { key: 'F7', label: 'Backward', onPress: pageBack },
        { key: 'F8', label: 'Forward', onPress: pageFwd },
      ]}
    >
      <form onSubmit={submit} noValidate>
        <div className="filters">
          <Field label="Account Number" value={acctIn} onChange={setAcctIn} length={LEN.acctId} numeric invalid={invalid === 'acct'} autoFocus />
          <Field label="Credit Card Number" value={cardIn} onChange={setCardIn} length={LEN.cardNum} numeric invalid={invalid === 'card'} />
          <button type="submit" className="btn btn-primary">Continue <kbd>ENTER</kbd></button>
        </div>

        <Pager page={p} pageCount={pageCount} pageSize={pageSize} defaultPageSize={DEFAULT_PAGE_SIZE} onPageSize={(n) => setParams({}, { page: '1', size: String(n) })} />

        <table className="list">
          <thead>
            <tr>
              <th>Select</th>
              <th>Account Number</th>
              <th>Card Number</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={5} className="empty">{MSG.cardNoRecords}</td></tr>
            )}
            {rows.map((c) => (
              <tr key={c.cardNum}>
                <td>
                  <input
                    className="sel inline-input"
                    aria-label={`Select card ${c.cardNum}`}
                    maxLength={1}
                    value={sel[c.cardNum] ?? ''}
                    onChange={(e) => setSel({ ...sel, [c.cardNum]: e.target.value })}
                  />
                </td>
                <td>{c.acctId}</td>
                <td>{c.cardNum}</td>
                <td>{c.activeStatus}</td>
                <td>
                  <span className="row-actions">
                    <button type="button" onClick={() => go(ROUTES.cardView, { acct: c.acctId, card: c.cardNum })}>S View</button>
                    <button type="button" onClick={() => go(ROUTES.cardUpdate, { acct: c.acctId, card: c.cardNum })}>U Update</button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </form>
    </Screen>
  )
}
