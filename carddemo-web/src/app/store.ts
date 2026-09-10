// Mock data layer. Phase 1 has no backend: fixtures derived from the legacy
// sample data seed an in-memory store that is persisted to localStorage so
// writes survive a refresh. Every mutation goes through this module so a
// later phase can swap it for real service calls.
import { useSyncExternalStore } from 'react'
import accountsFixture from '../fixtures/accounts.json'
import cardsFixture from '../fixtures/cards.json'
import cardXrefFixture from '../fixtures/cardXref.json'
import customersFixture from '../fixtures/customers.json'
import transactionsFixture from '../fixtures/transactions.json'
import tranTypesFixture from '../fixtures/tranTypes.json'
import tranCategoriesFixture from '../fixtures/tranCategories.json'
import usersFixture from '../fixtures/users.json'
import type {
  Account, Card, CardXref, Customer, PendingAuth, ReportJob, Transaction, TranCategory, TranType, User,
} from './types'

export interface StoreState {
  accounts: Account[]
  cards: Card[]
  cardXref: CardXref[]
  customers: Customer[]
  transactions: Transaction[]
  tranTypes: TranType[]
  tranCategories: TranCategory[]
  users: User[]
  reportJobs: ReportJob[]
  pendingAuths: PendingAuth[]
}

const STORAGE_KEY = 'carddemo.store.v1'

function seedPendingAuths(cards: Card[], xref: CardXref[]): PendingAuth[] {
  const merchants = ['Northwind Grocers', 'Contoso Fuel', 'Fabrikam Air', 'Tailspin Toys', 'Litware Books', 'Adatum Hotels']
  return cards.slice(0, 12).map((c, i) => {
    const x = xref.find((r) => r.cardNum === c.cardNum)
    return {
      authId: String(900000 + i).padStart(12, '0'),
      cardNum: c.cardNum,
      acctId: x?.acctId ?? c.acctId,
      merchantName: merchants[i % merchants.length],
      amount: Math.round((37 + i * 41.13) * 100) / 100,
      authTs: `2026-09-0${(i % 8) + 1} 1${i % 10}:2${i % 6}:05`,
      status: 'PENDING',
    }
  })
}

function seed(): StoreState {
  return {
    accounts: accountsFixture as Account[],
    cards: cardsFixture as Card[],
    cardXref: cardXrefFixture as CardXref[],
    customers: customersFixture as Customer[],
    transactions: transactionsFixture as Transaction[],
    tranTypes: tranTypesFixture as TranType[],
    tranCategories: tranCategoriesFixture as TranCategory[],
    users: usersFixture as User[],
    reportJobs: [],
    pendingAuths: seedPendingAuths(cardsFixture as Card[], cardXrefFixture as CardXref[]),
  }
}

function load(): StoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as StoreState
  } catch {
    // fall through to fresh seed
  }
  return seed()
}

let state: StoreState = load()
const listeners = new Set<() => void>()

// Re-read persisted state (if any) so no tab commits a stale copy of another tab's edits.
function syncFromStorage() {
  try {
    if (localStorage.getItem(STORAGE_KEY)) state = load()
  } catch {
    // storage unavailable; keep in-memory state
  }
}

window.addEventListener('storage', (e) => {
  if (e.key !== STORAGE_KEY) return
  syncFromStorage()
  listeners.forEach((l) => l())
})

function commit(next: StoreState) {
  state = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // storage unavailable; keep in-memory only
  }
  listeners.forEach((l) => l())
}

export function getState(): StoreState {
  return state
}

export function resetStore() {
  localStorage.removeItem(STORAGE_KEY)
  commit(seed())
}

export function useStore(): StoreState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

// ---- lookups -------------------------------------------------------------

export const findAccount = (id: string) => state.accounts.find((a) => a.acctId === id)
export const findCustomer = (id: string) => state.customers.find((c) => c.custId === id)
export const findCard = (num: string) => state.cards.find((c) => c.cardNum === num)
export const findXrefByAcct = (acctId: string) => state.cardXref.find((x) => x.acctId === acctId)
export const findXrefByCard = (cardNum: string) => state.cardXref.find((x) => x.cardNum === cardNum)
export const findTransaction = (id: string) => state.transactions.find((t) => t.tranId === id)
export const findUser = (id: string) => state.users.find((u) => u.userId === id)

// ---- mutations -----------------------------------------------------------

function replaceIn<T>(list: T[], pred: (t: T) => boolean, next: T): T[] {
  return list.map((t) => (pred(t) ? next : t))
}

export function updateAccountAndCustomer(account: Account, customer: Customer) {
  commit({
    ...state,
    accounts: replaceIn(state.accounts, (a) => a.acctId === account.acctId, account),
    customers: replaceIn(state.customers, (c) => c.custId === customer.custId, customer),
  })
}

export function updateCard(card: Card) {
  commit({ ...state, cards: replaceIn(state.cards, (c) => c.cardNum === card.cardNum, card) })
}

export function nextTranId(): string {
  const max = state.transactions.reduce((m, t) => Math.max(m, Number(t.tranId)), 0)
  return String(max + 1).padStart(16, '0')
}

export function addTransaction(tran: Transaction) {
  commit({ ...state, transactions: [...state.transactions, tran] })
}

export function payBill(acctId: string, tran: Transaction) {
  const acct = findAccount(acctId)
  if (!acct) return
  commit({
    ...state,
    accounts: replaceIn(state.accounts, (a) => a.acctId === acctId, { ...acct, currBal: 0 }),
    transactions: [...state.transactions, tran],
  })
}

export function addUser(user: User) {
  commit({ ...state, users: [...state.users, user] })
}

export function updateUser(user: User) {
  commit({ ...state, users: replaceIn(state.users, (u) => u.userId === user.userId, user) })
}

export function deleteUser(userId: string) {
  commit({ ...state, users: state.users.filter((u) => u.userId !== userId) })
}

const RUNNING_AFTER_MS = 1500
const COMPLETE_AFTER_MS = 4000

export function submitReportJob(job: ReportJob) {
  commit({ ...state, reportJobs: [job, ...state.reportJobs] })
  scheduleJob(job)
}

// Simulated batch: SUBMITTED -> RUNNING -> COMPLETE, timed from submittedAt so
// jobs persisted mid-flight resume (or finish immediately) after a reload.
function scheduleJob(job: ReportJob) {
  const elapsed = Date.now() - new Date(job.submittedAt.replace(' ', 'T') + 'Z').getTime()
  const at = (ms: number, fn: () => void) => setTimeout(fn, Math.max(0, ms - elapsed))
  if (job.status === 'SUBMITTED') at(RUNNING_AFTER_MS, () => setJobStatus(job.jobId, 'RUNNING'))
  if (job.status !== 'COMPLETE') at(COMPLETE_AFTER_MS, () => setJobStatus(job.jobId, 'COMPLETE', renderReport(job)))
}

for (const job of state.reportJobs) scheduleJob(job)

function setJobStatus(jobId: string, status: ReportJob['status'], output?: string) {
  syncFromStorage()
  const job = state.reportJobs.find((j) => j.jobId === jobId)
  if (!job || job.status === status || job.status === 'COMPLETE') return
  commit({
    ...state,
    reportJobs: replaceIn(state.reportJobs, (j) => j.jobId === jobId, { ...job, status, output: output ?? job.output }),
  })
}

function renderReport(job: ReportJob): string {
  const inRange = state.transactions.filter((t) => {
    const d = t.origTs.slice(0, 10)
    return d >= job.startDate && d <= job.endDate
  })
  const lines = [
    `TRANSACTION REPORT (${job.reportType})  ${job.startDate} .. ${job.endDate}`,
    `JOB ${job.jobId}  SUBMITTED BY ${job.submittedBy} AT ${job.submittedAt}`,
    '',
    'TRAN ID          TYPE CAT  DATE        AMOUNT        DESCRIPTION',
    ...inRange.map(
      (t) =>
        `${t.tranId} ${t.typeCd}   ${t.catCd} ${t.origTs.slice(0, 10)} ${t.amount.toFixed(2).padStart(13)} ${t.description.slice(0, 40)}`,
    ),
    '',
    `TOTAL RECORDS: ${inRange.length}`,
    `TOTAL AMOUNT : ${inRange.reduce((s, t) => s + t.amount, 0).toFixed(2)}`,
  ]
  return lines.join('\n')
}

export function updateTranType(tt: TranType) {
  const exists = state.tranTypes.some((t) => t.typeCd === tt.typeCd)
  commit({
    ...state,
    tranTypes: exists ? replaceIn(state.tranTypes, (t) => t.typeCd === tt.typeCd, tt) : [...state.tranTypes, tt],
  })
}

export function deleteTranType(typeCd: string) {
  commit({ ...state, tranTypes: state.tranTypes.filter((t) => t.typeCd !== typeCd) })
}

export function decidePendingAuth(authId: string, status: 'APPROVED' | 'DECLINED') {
  const auth = state.pendingAuths.find((a) => a.authId === authId)
  if (!auth) return
  commit({ ...state, pendingAuths: replaceIn(state.pendingAuths, (a) => a.authId === authId, { ...auth, status }) })
}
