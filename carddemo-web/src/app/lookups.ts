// Shared key validation / record resolution used by more than one screen.
import { LEN, isValidId } from './format'
import { MSG } from './messages'
import { findAccount, findCard, findCustomer, findXrefByAcct } from './store'
import type { Account, Card, Customer, User } from './types'

// Resolves account -> xref -> customer the way COACTVWC does, returning the
// legacy error message on failure.
export function lookupAccount(acctId: string): { account: Account; customer: Customer } | { error: string } {
  const xref = findXrefByAcct(acctId)
  if (!xref) return { error: MSG.acctNotInXref }
  const account = findAccount(acctId)
  if (!account) return { error: MSG.acctNotInMaster }
  const customer = findCustomer(xref.custId)
  if (!customer) return { error: MSG.custNotInMaster }
  return { account, customer }
}

export function validateCardKeys(acct: string, card: string): { field: 'acct' | 'card'; error: string } | null {
  if (!acct && !card) return { field: 'acct', error: MSG.enterAcctAndCard }
  if (!acct) return { field: 'acct', error: MSG.acctNotProvided }
  if (!isValidId(acct, LEN.acctId)) return { field: 'acct', error: MSG.acctMustBe11 }
  if (!card) return { field: 'card', error: MSG.cardNotProvided }
  if (!isValidId(card, LEN.cardNum)) return { field: 'card', error: MSG.cardMustBe16 }
  return null
}

export function lookupCard(acct: string, card: string): { card: Card } | { error: string } {
  const c = findCard(card)
  if (!c || c.acctId !== acct) return { error: MSG.cardsNotFound }
  return { card: c }
}

export type UserForm = Pick<User, 'firstName' | 'lastName' | 'password' | 'type'> & { userId?: string }

// Edit checks in COUSR01C / COUSR02C order.
export function validateUserForm(f: UserForm, requireId = true): { field: keyof UserForm; error: string } | null {
  if (!f.firstName.trim()) return { field: 'firstName', error: MSG.firstNameEmpty }
  if (!f.lastName.trim()) return { field: 'lastName', error: MSG.lastNameEmpty }
  if (requireId && !f.userId?.trim()) return { field: 'userId', error: MSG.userIdEmpty }
  if (!f.password.trim()) return { field: 'password', error: MSG.passwordEmpty }
  if (!f.type.trim()) return { field: 'type', error: MSG.userTypeEmpty }
  if (f.type !== 'A' && f.type !== 'U') return { field: 'type', error: 'User Type must be A or U' }
  return null
}
