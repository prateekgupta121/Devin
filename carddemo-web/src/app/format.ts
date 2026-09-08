export const LEN = {
  acctId: 11,
  cardNum: 16,
  custId: 9,
  tranId: 16,
  userId: 8,
  password: 8,
} as const

export const isDigits = (s: string) => /^\d+$/.test(s)

export const isValidId = (s: string, len: number) => s.length === len && isDigits(s) && Number(s) !== 0

export const padId = (s: string, len: number) => (isDigits(s) ? s.padStart(len, '0') : s)

export const money = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const fixedMoney = (n: number) => n.toFixed(2)

export const isValidDate = (s: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
}

export const todayIso = () => new Date().toISOString().slice(0, 10)

export const nowTs = () => new Date().toISOString().replace('T', ' ').slice(0, 19) + '.000000'

// Legacy clock text: mm/dd/yy and hh:mm:ss
export const clockDate = (d: Date) =>
  `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`
export const clockTime = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`

export const maskSsn = (ssn: string) => `${ssn.slice(0, 3)}-${ssn.slice(3, 5)}-${ssn.slice(5)}`
