import { useState, type FormEvent } from 'react'
import { Screen } from '../components/Screen'
import { useMessage } from '../app/message'
import { Field, Value } from '../components/Field'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Pager } from '../components/Pager'
import { paginate } from '../app/paginate'
import { useCommarea } from '../app/commarea'
import { LEN, isValidId, money } from '../app/format'
import { ROUTES } from '../app/menus'
import { MSG } from '../app/messages'
import { decidePendingAuth, findAccount, useStore } from '../app/store'
import type { PendingAuth } from '../app/types'

const DEFAULT_PAGE_SIZE = 7

// Optional module (feature flag `pendingAuth`): summary of pending
// authorizations for an account with approve/decline actions.
export function PendingAuthView() {
  const { commarea } = useCommarea()
  return <PendingAuthScreen key={commarea.acct} />
}

function PendingAuthScreen() {
  const { pendingAuths } = useStore()
  const { commarea, params, setParams, back } = useCommarea()
  const account = commarea.acct ? findAccount(commarea.acct) : undefined
  const msg = useMessage(
    !commarea.acct ? 'Enter account id to view pending authorizations' : !account ? MSG.acctNotInMaster : undefined,
    commarea.acct && !account ? 'error' : 'info',
  )
  const [acctIn, setAcctIn] = useState(commarea.acct)
  const [invalid, setInvalid] = useState(false)
  const [decision, setDecision] = useState<{ auth: PendingAuth; status: 'APPROVED' | 'DECLINED' } | null>(null)

  const page = Number(params.get('page') ?? '1')
  const pageSize = Number(params.get('size') ?? DEFAULT_PAGE_SIZE)
  const list = account ? pendingAuths.filter((a) => a.acctId === account.acctId) : []
  const { rows, page: p, pageCount } = paginate(list, page, pageSize)
  const pending = list.filter((a) => a.status === 'PENDING')

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const a = acctIn.trim()
    if (!a) { setInvalid(true); return msg.error(MSG.acctNotProvided) }
    if (!isValidId(a, LEN.acctId)) { setInvalid(true); return msg.error(MSG.acctMustBe11) }
    setInvalid(false)
    if (a !== commarea.acct) return setParams({ acct: a }, { page: '1' })
    if (!account) return msg.error(MSG.acctNotInMaster)
    msg.info(list.length ? `${pending.length} pending authorization(s) for this account` : 'No pending authorizations for this account')
  }

  const commit = () => {
    if (!decision) return
    decidePendingAuth(decision.auth.authId, decision.status)
    msg.info(`Authorization ${decision.auth.authId} ${decision.status.toLowerCase()}`)
    setDecision(null)
  }

  const pageBack = () => (p <= 1 ? msg.error(MSG.cardNoPrevPages) : setParams({}, { page: String(p - 1), size: params.get('size') ?? undefined }))
  const pageFwd = () => (p >= pageCount ? msg.error(MSG.cardNoMorePages) : setParams({}, { page: String(p + 1), size: params.get('size') ?? undefined }))

  return (
    <Screen
      tranId="CPVS"
      program="COPAUS0C"
      title="Pending Authorization View"
      message={msg.message}
      keysActive={!decision}
      wide
      keys={[
        { key: 'Enter', label: 'Fetch', onPress: submit },
        { key: 'F3', label: 'Back', onPress: () => back(ROUTES.menu) },
        { key: 'F7', label: 'Backward', onPress: pageBack },
        { key: 'F8', label: 'Forward', onPress: pageFwd },
      ]}
    >
      <form onSubmit={submit} noValidate>
        <div className="filters">
          <Field label="Account Number" value={acctIn} onChange={setAcctIn} length={LEN.acctId} numeric invalid={invalid} autoFocus />
          <button type="submit" className="btn btn-primary">Fetch <kbd>ENTER</kbd></button>
        </div>
        {account && (
          <div className="form-grid">
            <Value label="Credit Limit" value={money(account.creditLimit)} />
            <Value label="Current Balance" value={money(account.currBal)} />
            <Value label="Pending Count" value={pending.length} />
            <Value label="Pending Amount" value={money(pending.reduce((s, a) => s + a.amount, 0))} />
          </div>
        )}

        <Pager page={p} pageCount={pageCount} pageSize={pageSize} defaultPageSize={DEFAULT_PAGE_SIZE} onPageSize={(n) => setParams({}, { page: '1', size: String(n) })} />
        <table className="list">
          <thead>
            <tr><th>Auth ID</th><th>Card</th><th>Merchant</th><th>Time</th><th className="num">Amount</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} className="empty">No authorizations to show</td></tr>}
            {rows.map((a) => (
              <tr key={a.authId}>
                <td>{a.authId}</td>
                <td>{a.cardNum}</td>
                <td>{a.merchantName}</td>
                <td>{a.authTs}</td>
                <td className="num">{money(a.amount)}</td>
                <td><span className={`status status-${a.status}`}>{a.status}</span></td>
                <td>
                  {a.status === 'PENDING' && (
                    <span className="row-actions">
                      <button type="button" onClick={() => setDecision({ auth: a, status: 'APPROVED' })}>Approve</button>
                      <button type="button" onClick={() => setDecision({ auth: a, status: 'DECLINED' })}>Decline</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </form>

      <ConfirmDialog
        open={decision !== null}
        title={decision?.status === 'APPROVED' ? 'Approve authorization?' : 'Decline authorization?'}
        message={decision ? `${decision.auth.merchantName} ${money(decision.auth.amount)}` : ''}
        confirmLabel={decision?.status === 'APPROVED' ? 'Approve' : 'Decline'}
        onConfirm={commit}
        onCancel={() => setDecision(null)}
      />
    </Screen>
  )
}
