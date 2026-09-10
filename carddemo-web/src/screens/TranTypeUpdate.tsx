import { useState, type FormEvent } from 'react'
import { Screen } from '../components/Screen'
import { useMessage } from '../app/message'
import { Field } from '../components/Field'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useCommarea } from '../app/commarea'
import { isDigits } from '../app/format'
import { ROUTES } from '../app/menus'
import { updateTranType, useStore } from '../app/store'

// Optional module (feature flag `tranType`): add or update a transaction
// type. Pre-filled when reached with ?type= from the list.
export function TranTypeUpdate() {
  const { params } = useCommarea()
  return <TranTypeUpdateScreen key={params.get('type') ?? ''} />
}

function TranTypeUpdateScreen() {
  const { tranTypes, tranCategories } = useStore()
  const { params, back } = useCommarea()
  const preset = params.get('type') ?? ''
  const existing = tranTypes.find((t) => t.typeCd === preset)
  const msg = useMessage(existing ? 'Press PF5 key to save your updates ...' : undefined)
  const [typeCd, setTypeCd] = useState(preset)
  const [description, setDescription] = useState(existing?.description ?? '')
  const [bad, setBad] = useState<'typeCd' | 'description' | null>(null)
  const [confirm, setConfirm] = useState(false)

  const validate = (): boolean => {
    if (!typeCd.trim()) { setBad('typeCd'); msg.error('Type CD can NOT be empty...'); return false }
    if (!isDigits(typeCd) || typeCd.length !== 2) { setBad('typeCd'); msg.error('Type CD must be Numeric...'); return false }
    if (!description.trim()) { setBad('description'); msg.error('Description can NOT be empty...'); return false }
    const current = tranTypes.find((t) => t.typeCd === typeCd)
    if (current && current.description === description.trim()) { msg.error('Please modify to update ...'); return false }
    setBad(null)
    return true
  }

  const save = (e?: FormEvent) => {
    e?.preventDefault()
    if (validate()) setConfirm(true)
  }

  const commit = () => {
    setConfirm(false)
    const isNew = !tranTypes.some((t) => t.typeCd === typeCd)
    updateTranType({ typeCd, description: description.trim().toUpperCase() })
    msg.info(isNew ? `Transaction type ${typeCd} has been added ...` : `Transaction type ${typeCd} has been updated ...`)
  }

  const clear = () => { setTypeCd(existing ? preset : ''); setDescription(existing?.description ?? ''); setBad(null); msg.clear() }
  const cats = tranCategories.filter((c) => c.typeCd === typeCd)

  return (
    <Screen
      tranId="CTTU"
      program="COTRTUPC"
      title="Transaction Type Maintenance"
      message={msg.message}
      keysActive={!confirm}
      keys={[
        { key: 'Enter', label: 'Save', onPress: save },
        { key: 'F3', label: 'Back', onPress: () => back(ROUTES.tranTypeList) },
        { key: 'F4', label: 'Clear', onPress: clear },
        { key: 'F5', label: 'Save', onPress: save },
        { key: 'F12', label: 'Cancel', onPress: () => back(ROUTES.tranTypeList) },
      ]}
    >
      <form onSubmit={save} noValidate>
        <div className="form-grid">
          <Field label="Type CD" value={typeCd} onChange={existing ? undefined : setTypeCd} length={2} numeric invalid={bad === 'typeCd'} autoFocus={!existing} />
          <Field label="Description" value={description} onChange={setDescription} length={50} invalid={bad === 'description'} className="span-2" autoFocus={!!existing} />
        </div>
        {cats.length > 0 && (
          <section className="section">
            <h2 className="section-title">Categories for type {typeCd}</h2>
            <table className="list">
              <thead><tr><th>Category</th><th>Description</th></tr></thead>
              <tbody>
                {cats.map((c) => (
                  <tr key={c.catCd}><td>{c.catCd}</td><td>{c.description}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
        <div className="btn-row">
          <button type="submit" className="btn btn-primary">Save <kbd>F5</kbd></button>
          <button type="button" className="btn" onClick={clear}>Clear <kbd>F4</kbd></button>
        </div>
      </form>

      <ConfirmDialog
        open={confirm}
        title={existing ? 'Save transaction type changes?' : 'Add transaction type?'}
        message={`${typeCd} - ${description.trim().toUpperCase()}`}
        confirmLabel="Save"
        onConfirm={commit}
        onCancel={() => setConfirm(false)}
      />
    </Screen>
  )
}
