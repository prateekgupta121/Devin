import { useState, type FormEvent } from 'react'
import { Screen } from '../components/Screen'
import { useMessage } from '../app/message'
import { Field } from '../components/Field'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useCommarea } from '../app/commarea'
import { isDigits, isValidDate, nowTs } from '../app/format'
import { ROUTES } from '../app/menus'
import { MSG } from '../app/messages'
import { submitReportJob, useStore } from '../app/store'
import type { ReportJob, ReportType } from '../app/types'

interface DateParts { m: string; d: string; y: string }
const EMPTY_DATE: DateParts = { m: '', d: '', y: '' }

type Which = 'Start' | 'End'

// CORPT00C custom-date edits: each part must be present, numeric and valid.
function validateDateParts(which: Which, p: DateParts): { part: keyof DateParts; error: string } | null {
  if (!p.m) return { part: 'm', error: MSG.dateEmpty(which, 'Month') }
  if (!p.d) return { part: 'd', error: MSG.dateEmpty(which, 'Day') }
  if (!p.y) return { part: 'y', error: MSG.dateEmpty(which, 'Year') }
  if (!isDigits(p.m) || Number(p.m) < 1 || Number(p.m) > 12) return { part: 'm', error: MSG.dateInvalidPart(which, 'Month') }
  if (!isDigits(p.d) || Number(p.d) < 1 || Number(p.d) > 31) return { part: 'd', error: MSG.dateInvalidPart(which, 'Day') }
  if (!isDigits(p.y) || p.y.length !== 4) return { part: 'y', error: MSG.dateInvalidPart(which, 'Year') }
  if (!isValidDate(toIso(p))) return { part: 'd', error: MSG.dateInvalid(which) }
  return null
}

const toIso = (p: DateParts) => `${p.y}-${p.m.padStart(2, '0')}-${p.d.padStart(2, '0')}`

function rangeFor(type: ReportType, start: DateParts, end: DateParts): [string, string] {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  if (type === 'Monthly') {
    const last = new Date(y, m, 0).getDate()
    return [`${y}-${String(m).padStart(2, '0')}-01`, `${y}-${String(m).padStart(2, '0')}-${last}`]
  }
  if (type === 'Yearly') return [`${y}-01-01`, `${y}-12-31`]
  return [toIso(start), toIso(end)]
}

export function Reports() {
  const { reportJobs } = useStore()
  const { commarea, back } = useCommarea()
  const msg = useMessage()
  const [type, setType] = useState<ReportType | null>(null)
  const [start, setStart] = useState<DateParts>(EMPTY_DATE)
  const [end, setEnd] = useState<DateParts>(EMPTY_DATE)
  const [bad, setBad] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<ReportType | null>(null)
  const [openJob, setOpenJob] = useState<string | null>(null)

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    if (!type) return msg.error(MSG.selectReportType)
    if (type === 'Custom') {
      const s = validateDateParts('Start', start)
      if (s) { setBad(`start-${s.part}`); return msg.error(s.error) }
      const en = validateDateParts('End', end)
      if (en) { setBad(`end-${en.part}`); return msg.error(en.error) }
    }
    setBad(null)
    msg.info(MSG.confirmReport(type))
    setConfirm(type)
  }

  const doSubmit = () => {
    if (!confirm) return
    const [s, e] = rangeFor(confirm, start, end)
    const job: ReportJob = {
      jobId: `JOB${String(Date.now()).slice(-8)}`,
      reportType: confirm,
      startDate: s,
      endDate: e,
      submittedAt: nowTs().slice(0, 19),
      submittedBy: commarea.user,
      status: 'SUBMITTED',
    }
    submitReportJob(job)
    setConfirm(null)
    msg.info(MSG.reportSubmitted(confirm))
  }

  const clear = () => {
    setType(null)
    setStart(EMPTY_DATE)
    setEnd(EMPTY_DATE)
    setBad(null)
    msg.clear()
  }

  const datePart = (which: 'start' | 'end', part: keyof DateParts, label: string, len: number) => {
    const v = which === 'start' ? start : end
    const set = which === 'start' ? setStart : setEnd
    return (
      <Field
        label={label}
        value={v[part]}
        onChange={(x) => set({ ...v, [part]: x })}
        length={len}
        numeric
        invalid={bad === `${which}-${part}`}
        disabled={type !== 'Custom'}
        id={`${which}-${part}`}
      />
    )
  }

  const shown = openJob ? reportJobs.find((j) => j.jobId === openJob) : undefined

  return (
    <Screen
      tranId="CR00"
      program="CORPT00C"
      title="Transaction Reports"
      message={msg.message}
      keysActive={!confirm}
      wide
      keys={[
        { key: 'Enter', label: 'Continue', onPress: submit },
        { key: 'F3', label: 'Back', onPress: () => back(ROUTES.menu) },
        { key: 'F4', label: 'Clear', onPress: clear },
      ]}
    >
      <form onSubmit={submit} noValidate>
        <div className="report-types" role="radiogroup" aria-label="Report type">
          {(['Monthly', 'Yearly', 'Custom'] as ReportType[]).map((t) => (
            <label key={t} className="radio">
              <input type="radio" name="rtype" checked={type === t} onChange={() => setType(t)} />
              <span>{t} (Current {t === 'Monthly' ? 'Month' : t === 'Yearly' ? 'Year' : 'range'})</span>
            </label>
          ))}
        </div>
        <div className="filters">
          <span className="field-label">Start Date</span>
          {datePart('start', 'm', 'MM', 2)}
          {datePart('start', 'd', 'DD', 2)}
          {datePart('start', 'y', 'YYYY', 4)}
        </div>
        <div className="filters">
          <span className="field-label">End Date</span>
          {datePart('end', 'm', 'MM', 2)}
          {datePart('end', 'd', 'DD', 2)}
          {datePart('end', 'y', 'YYYY', 4)}
        </div>
        <div className="btn-row">
          <button type="submit" className="btn btn-primary">Continue <kbd>ENTER</kbd></button>
          <button type="button" className="btn" onClick={clear}>Clear <kbd>F4</kbd></button>
        </div>
      </form>

      <section className="section jobs">
        <h2 className="section-title">Submitted report jobs</h2>
        {reportJobs.length === 0 ? (
          <p className="field-hint">No reports submitted yet. Jobs run asynchronously; status updates here automatically.</p>
        ) : (
          <table className="list">
            <thead>
              <tr><th>Job</th><th>Type</th><th>Range</th><th>Submitted</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {reportJobs.map((j) => (
                <tr key={j.jobId}>
                  <td>{j.jobId}</td>
                  <td>{j.reportType}</td>
                  <td>{j.startDate} .. {j.endDate}</td>
                  <td>{j.submittedAt}</td>
                  <td><span className={`status status-${j.status}`}>{j.status}</span></td>
                  <td>
                    {j.status === 'COMPLETE' && (
                      <button type="button" className="btn btn-small" onClick={() => setOpenJob(openJob === j.jobId ? null : j.jobId)}>
                        {openJob === j.jobId ? 'Hide' : 'View'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {shown?.output && (
          <div>
            <div className="btn-row">
              <a className="btn btn-small" download={`${shown.jobId}.txt`} href={`data:text/plain;charset=utf-8,${encodeURIComponent(shown.output)}`}>Download</a>
            </div>
            <pre className="report">{shown.output}</pre>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirm !== null}
        title={`Print ${confirm ?? ''} report?`}
        message={confirm ? MSG.confirmReport(confirm) : ''}
        confirmLabel="Yes"
        onConfirm={doSubmit}
        onCancel={() => { setConfirm(null); msg.clear() }}
      />
    </Screen>
  )
}
