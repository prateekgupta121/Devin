// Converts the legacy CardDemo ASCII sample files (fixed-width COBOL record
// layouts from app/cpy/*.cpy) into JSON fixtures consumed by the mock store.
//   node scripts/gen-fixtures.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = (f) => readFileSync(join(root, 'legacy-data', f), 'latin1').split(/\r?\n/).filter((l) => l.length > 0)
const out = (f, data) => writeFileSync(join(root, 'src', 'fixtures', f), JSON.stringify(data, null, 2) + '\n')

// Builds a cursor over a fixed-width record.
function reader(line) {
  let pos = 0
  return {
    x(n) { const v = line.slice(pos, pos + n); pos += n; return v.trimEnd() },
    n(n) { const v = line.slice(pos, pos + n); pos += n; return v },
    skip(n) { pos += n },
  }
}

// Zoned decimal PIC S9(n)V99: last byte carries the sign (ASCII rendering of
// the EBCDIC zone nibble): '{' = +0, A..I = +1..+9, '}' = -0, J..R = -1..-9.
function zoned(s, scale) {
  const last = s[s.length - 1]
  let sign = 1
  let digit
  if (last === '{') digit = 0
  else if (last === '}') { digit = 0; sign = -1 }
  else if (last >= 'A' && last <= 'I') digit = last.charCodeAt(0) - 64
  else if (last >= 'J' && last <= 'R') { digit = last.charCodeAt(0) - 73; sign = -1 }
  else if (last >= '0' && last <= '9') digit = Number(last)
  else throw new Error(`bad zoned sign byte ${JSON.stringify(last)} in ${s}`)
  const digits = s.slice(0, -1) + String(digit)
  return (sign * Number(digits)) / 10 ** scale
}

// CVACT01Y ACCOUNT-RECORD (300 bytes)
const accounts = src('acctdata.txt').map((l) => {
  const r = reader(l)
  return {
    acctId: r.n(11),
    activeStatus: r.x(1),
    currBal: zoned(r.n(12), 2),
    creditLimit: zoned(r.n(12), 2),
    cashCreditLimit: zoned(r.n(12), 2),
    openDate: r.x(10),
    expirationDate: r.x(10),
    reissueDate: r.x(10),
    currCycCredit: zoned(r.n(12), 2),
    currCycDebit: zoned(r.n(12), 2),
    addrZip: r.x(10),
    groupId: r.x(10),
  }
})

// CVACT02Y CARD-RECORD (150 bytes)
const cards = src('carddata.txt').map((l) => {
  const r = reader(l)
  return {
    cardNum: r.n(16),
    acctId: r.n(11),
    cvv: r.n(3),
    embossedName: r.x(50),
    expirationDate: r.x(10),
    activeStatus: r.x(1),
  }
})

// CVACT03Y CARD-XREF-RECORD
const cardXref = src('cardxref.txt').map((l) => {
  const r = reader(l)
  return { cardNum: r.n(16), custId: r.n(9), acctId: r.n(11) }
})

// CVCUS01Y CUSTOMER-RECORD (500 bytes)
const customers = src('custdata.txt').map((l) => {
  const r = reader(l)
  return {
    custId: r.n(9),
    firstName: r.x(25),
    middleName: r.x(25),
    lastName: r.x(25),
    addrLine1: r.x(50),
    addrLine2: r.x(50),
    addrLine3: r.x(50),
    addrStateCd: r.x(2),
    addrCountryCd: r.x(3),
    addrZip: r.x(10),
    phone1: r.x(15),
    phone2: r.x(15),
    ssn: r.n(9),
    govtIssuedId: r.x(20),
    dob: r.x(10),
    eftAccountId: r.x(10),
    priCardHolderInd: r.x(1),
    ficoScore: Number(r.n(3)),
  }
})

// CVTRA05Y TRAN-RECORD (350 bytes)
const transactions = src('dailytran.txt').map((l) => {
  const r = reader(l)
  return {
    tranId: r.n(16),
    typeCd: r.n(2),
    catCd: r.n(4),
    source: r.x(10),
    description: r.x(100),
    amount: zoned(r.n(11), 2),
    merchantId: r.n(9),
    merchantName: r.x(50),
    merchantCity: r.x(50),
    merchantZip: r.x(10),
    cardNum: r.n(16),
    origTs: r.x(26),
    procTs: r.x(26),
  }
})

// CVTRA03Y TRAN-TYPE-RECORD
const tranTypes = src('trantype.txt').map((l) => {
  const r = reader(l)
  return { typeCd: r.n(2), description: r.x(50) }
})

// CVTRA04Y TRAN-CAT-RECORD
const tranCategories = src('trancatg.txt').map((l) => {
  const r = reader(l)
  return { typeCd: r.n(2), catCd: r.n(4), description: r.x(50) }
})

// CSUSR01Y SEC-USER-DATA seeded from jcl/DUSRSECJ.jcl
const usersRaw = `ADMIN001MARGARET            GOLD                PASSWORDA
ADMIN002RUSSELL             RUSSELL             PASSWORDA
ADMIN003RAYMOND             WHITMORE            PASSWORDA
ADMIN004EMMANUEL            CASGRAIN            PASSWORDA
ADMIN005GRANVILLE           LACHAPELLE          PASSWORDA
USER0001LAWRENCE            THOMAS              PASSWORDU
USER0002AJITH               KUMAR               PASSWORDU
USER0003LAURITZ             ALME                PASSWORDU
USER0004AVERARDO            MAZZI               PASSWORDU
USER0005LEE                 TING                PASSWORDU`
const users = usersRaw.split('\n').map((l) => {
  const r = reader(l)
  return { userId: r.x(8), firstName: r.x(20), lastName: r.x(20), password: r.x(8), type: r.x(1) }
})

out('accounts.json', accounts)
out('cards.json', cards)
out('cardXref.json', cardXref)
out('customers.json', customers)
out('transactions.json', transactions)
out('tranTypes.json', tranTypes)
out('tranCategories.json', tranCategories)
out('users.json', users)
console.log(`accounts=${accounts.length} cards=${cards.length} xref=${cardXref.length} customers=${customers.length} transactions=${transactions.length} users=${users.length}`)
