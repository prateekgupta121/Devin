import { useState, type FormEvent } from 'react'
import { Screen } from '../components/Screen'
import { useMessage } from '../app/message'
import { Field } from '../components/Field'
import { Pager } from '../components/Pager'
import { paginate } from '../app/paginate'
import { useCommarea } from '../app/commarea'
import { LEN, isDigits, money } from '../app/format'
import { ROUTES } from '../app/menus'
import { MSG } from '../app/messages'
import { useStore } from '../app/store'

const DEFAULT_PAGE_SIZE = 10

export function TranList() {
  const { params } = useCommarea()
  return <TranListScreen key={params.get('tran') ?? ''} />
}

function TranListScreen() {
  const { transactions } = useStore()
  const { commarea, params, go, back, setParams } = useCommarea()
  const page = Number(params.get('page') ?? '1')
  const pageSize = Number(params.get('size') ?? DEFAULT_PAGE_SIZE)

  // Legacy browse starts at the entered Tran ID (STARTBR) and reads forward.
  const sorted = [...transactions].sort((a, b) => a.tranId.localeCompare(b.tranId))
  const filtered = commarea.tran ? sorted.filter((t) => t.tranId >= commarea.tran) : sorted
  const { rows, page: p, pageCount } = paginate(filtered, page, pageSize)

  const msg = useMessage()
  const [tranIn, setTranIn] = useState(commarea.tran)
  const [sel, setSel] = useState<Record<string, string>>({})
  const [invalid, setInvalid] = useState(false)

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const t = tranIn.trim()
    if (t && !isDigits(t)) { setInvalid(true); return msg.error(MSG.tranIdNumeric) }
    setInvalid(false)

    const chosen = Object.entries(sel).filter(([, v]) => v.trim() !== '')
    if (chosen.length > 0) {
      const [tranId, action] = chosen[0]
      if (action.trim().toUpperCase() !== 'S') return msg.error(MSG.tranInvalidSel)
      return go(ROUTES.tranView, { tran: tranId })
    }
    const padded = t ? t.padStart(LEN.tranId, '0') : ''
    if (padded !== commarea.tran) return setParams({ tran: padded }, { page: '1', size: String(pageSize) })
    msg.clear()
  }

  const gotoPage = (n: number) => setParams({}, { page: String(n), size: String(pageSize) })
  const pageBack = () => (p <= 1 ? msg.error(MSG.tranAlreadyTop) : gotoPage(p - 1))
  const pageFwd = () => (p >= pageCount ? msg.error(MSG.tranAlreadyBottom) : gotoPage(p + 1))

  return (
    <Screen
      tranId="CT00"
      program="COTRN00C"
      title="List Transactions"
      message={msg.message}
      wide
      keys={[
        { key: 'Enter', label: 'Continue', onPress: submit },
        { key: 'F3', label: 'Back', onPress: () => back(ROUTES.menu) },
        { key: 'F7', label: 'Backward', onPress: pageBack },
        { key: 'F8', label: 'Forward', onPress: pageFwd },
      ]}
    >
      <form onSubmit={submit} noValidate>
        <div className="filters">
          <Field label="Search Tran ID" value={tranIn} onChange={setTranIn} length={LEN.tranId} numeric invalid={invalid} autoFocus />
          <button type="submit" className="btn btn-primary">Continue <kbd>ENTER</kbd></button>
        </div>

        <Pager page={p} pageCount={pageCount} pageSize={pageSize} defaultPageSize={DEFAULT_PAGE_SIZE} onPageSize={(n) => setParams({}, { page: '1', size: String(n) })} />

        <table className="list">
          <thead>
            <tr>
              <th>Sel</th>
              <th>Transaction ID</th>
              <th>Date</th>
              <th>Description</th>
              <th className="num">Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="empty">No transactions to show</td></tr>
            )}
            {rows.map((t) => (
              <tr key={t.tranId}>
                <td>
                  <input
                    className="sel inline-input"
                    aria-label={`Select transaction ${t.tranId}`}
                    maxLength={1}
                    value={sel[t.tranId] ?? ''}
                    onChange={(e) => setSel({ [t.tranId]: e.target.value })}
                  />
                </td>
                <td>{t.tranId}</td>
                <td>{t.origTs.slice(2, 10).replace(/(\d{2})-(\d{2})-(\d{2})/, '$2/$3/$1')}</td>
                <td title={t.description}>{t.description.slice(0, 26)}</td>
                <td className="num">{money(t.amount)}</td>
                <td>
                  <span className="row-actions">
                    <button type="button" onClick={() => go(ROUTES.tranView, { tran: t.tranId })}>S View</button>
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
