import { useState, type FormEvent } from 'react'
import { Screen } from '../components/Screen'
import { useMessage } from '../app/message'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Pager } from '../components/Pager'
import { paginate } from '../app/paginate'
import { useCommarea } from '../app/commarea'
import { ROUTES } from '../app/menus'
import { deleteTranType, useStore } from '../app/store'
import type { TranType } from '../app/types'

const DEFAULT_PAGE_SIZE = 10

// Optional module (feature flag `tranType`): transaction type list with
// U (update) / D (delete) selection, mirroring the user-list interaction.
export function TranTypeList() {
  const { tranTypes, tranCategories } = useStore()
  const { params, go, back, setParams } = useCommarea()
  const page = Number(params.get('page') ?? '1')
  const pageSize = Number(params.get('size') ?? DEFAULT_PAGE_SIZE)
  const sorted = [...tranTypes].sort((a, b) => a.typeCd.localeCompare(b.typeCd))
  const { rows, page: p, pageCount } = paginate(sorted, page, pageSize)

  const msg = useMessage()
  const [sel, setSel] = useState<Record<string, string>>({})
  const [toDelete, setToDelete] = useState<TranType | null>(null)

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const picked = Object.entries(sel).find(([, v]) => v.trim())
    if (!picked) return msg.clear()
    const [typeCd, action] = picked
    const a = action.trim().toUpperCase()
    const tt = tranTypes.find((t) => t.typeCd === typeCd)
    if (a === 'U') return go(ROUTES.tranTypeUpdate, {}, { extra: { type: typeCd } })
    if (a === 'D' && tt) return setToDelete(tt)
    msg.error('Invalid selection. Valid values are U and D')
  }

  const commitDelete = () => {
    if (!toDelete) return
    deleteTranType(toDelete.typeCd)
    msg.info(`Transaction type ${toDelete.typeCd} has been deleted ...`)
    setToDelete(null)
    setSel({})
  }

  const catCount = (typeCd: string) => tranCategories.filter((c) => c.typeCd === typeCd).length

  return (
    <Screen
      tranId="CTTL"
      program="COTRTLIC"
      title="Transaction Type List"
      message={msg.message}
      keysActive={!toDelete}
      wide
      keys={[
        { key: 'Enter', label: 'Continue', onPress: submit },
        { key: 'F3', label: 'Back', onPress: () => back(ROUTES.admin) },
        { key: 'F7', label: 'Backward', onPress: () => setParams({}, { page: String(Math.max(1, p - 1)), size: params.get('size') ?? undefined }) },
        { key: 'F8', label: 'Forward', onPress: () => setParams({}, { page: String(Math.min(pageCount, p + 1)), size: params.get('size') ?? undefined }) },
      ]}
    >
      <form onSubmit={submit} noValidate>
        <div className="filters">
          <button type="submit" className="btn btn-primary">Continue <kbd>ENTER</kbd></button>
          <button type="button" className="btn" onClick={() => go(ROUTES.tranTypeUpdate)}>Add Type</button>
        </div>
        <Pager page={p} pageCount={pageCount} pageSize={pageSize} defaultPageSize={DEFAULT_PAGE_SIZE} onPageSize={(n) => setParams({}, { page: '1', size: String(n) })} />
        <table className="list">
          <thead>
            <tr><th>Sel</th><th>Type</th><th>Description</th><th className="num">Categories</th><th></th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="empty">No transaction types to show</td></tr>}
            {rows.map((t) => (
              <tr key={t.typeCd}>
                <td>
                  <input
                    className="sel inline-input"
                    aria-label={`Select type ${t.typeCd}`}
                    maxLength={1}
                    value={sel[t.typeCd] ?? ''}
                    onChange={(e) => setSel({ [t.typeCd]: e.target.value })}
                  />
                </td>
                <td>{t.typeCd}</td>
                <td>{t.description}</td>
                <td className="num">{catCount(t.typeCd)}</td>
                <td>
                  <span className="row-actions">
                    <button type="button" onClick={() => go(ROUTES.tranTypeUpdate, {}, { extra: { type: t.typeCd } })}>U Update</button>
                    <button type="button" onClick={() => setToDelete(t)}>D Delete</button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </form>

      <ConfirmDialog
        open={toDelete !== null}
        title="Delete transaction type?"
        message={toDelete ? `${toDelete.typeCd} - ${toDelete.description}` : ''}
        confirmLabel="Delete"
        onConfirm={commitDelete}
        onCancel={() => setToDelete(null)}
      />
    </Screen>
  )
}
