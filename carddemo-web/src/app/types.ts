export type UserType = 'A' | 'U'

export interface Account {
  acctId: string
  activeStatus: string
  currBal: number
  creditLimit: number
  cashCreditLimit: number
  openDate: string
  expirationDate: string
  reissueDate: string
  currCycCredit: number
  currCycDebit: number
  addrZip: string
  groupId: string
}

export interface Card {
  cardNum: string
  acctId: string
  cvv: string
  embossedName: string
  expirationDate: string
  activeStatus: string
}

export interface CardXref {
  cardNum: string
  custId: string
  acctId: string
}

export interface Customer {
  custId: string
  firstName: string
  middleName: string
  lastName: string
  addrLine1: string
  addrLine2: string
  addrLine3: string
  addrStateCd: string
  addrCountryCd: string
  addrZip: string
  phone1: string
  phone2: string
  ssn: string
  govtIssuedId: string
  dob: string
  eftAccountId: string
  priCardHolderInd: string
  ficoScore: number
}

export interface Transaction {
  tranId: string
  typeCd: string
  catCd: string
  source: string
  description: string
  amount: number
  merchantId: string
  merchantName: string
  merchantCity: string
  merchantZip: string
  cardNum: string
  origTs: string
  procTs: string
}

export interface TranType {
  typeCd: string
  description: string
}

export interface TranCategory {
  typeCd: string
  catCd: string
  description: string
}

export interface User {
  userId: string
  firstName: string
  lastName: string
  password: string
  type: string
}

export type ReportType = 'Monthly' | 'Yearly' | 'Custom'
export type JobStatus = 'SUBMITTED' | 'RUNNING' | 'COMPLETE'

export interface ReportJob {
  jobId: string
  reportType: ReportType
  startDate: string
  endDate: string
  submittedAt: string
  submittedBy: string
  status: JobStatus
  output?: string
}

export interface PendingAuth {
  authId: string
  cardNum: string
  acctId: string
  merchantName: string
  amount: number
  authTs: string
  status: 'PENDING' | 'APPROVED' | 'DECLINED'
}
