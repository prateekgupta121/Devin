// Menu tables transcribed from app/cpy/COMEN02Y.cpy and COADM02Y.cpy.
import type { FeatureFlag } from './flags'
import type { UserType } from './types'

export interface MenuOption {
  num: number
  name: string
  program: string
  userType: UserType
  route?: string
  /** Optional module; shown only when the flag is enabled. */
  flag?: FeatureFlag
}

export const ROUTES = {
  signon: '/signon',
  menu: '/menu',
  admin: '/admin',
  acctView: '/accounts/view',
  acctUpdate: '/accounts/update',
  cardList: '/cards',
  cardView: '/cards/view',
  cardUpdate: '/cards/update',
  tranList: '/transactions',
  tranView: '/transactions/view',
  tranAdd: '/transactions/add',
  reports: '/reports',
  billPay: '/billpay',
  pendingAuth: '/authorizations',
  userList: '/users',
  userAdd: '/users/add',
  userUpdate: '/users/update',
  userDelete: '/users/delete',
  tranTypeList: '/trantypes',
  tranTypeUpdate: '/trantypes/update',
} as const

export const MAIN_MENU: MenuOption[] = [
  { num: 1, name: 'Account View', program: 'COACTVWC', userType: 'U', route: ROUTES.acctView },
  { num: 2, name: 'Account Update', program: 'COACTUPC', userType: 'U', route: ROUTES.acctUpdate },
  { num: 3, name: 'Credit Card List', program: 'COCRDLIC', userType: 'U', route: ROUTES.cardList },
  { num: 4, name: 'Credit Card View', program: 'COCRDSLC', userType: 'U', route: ROUTES.cardView },
  { num: 5, name: 'Credit Card Update', program: 'COCRDUPC', userType: 'U', route: ROUTES.cardUpdate },
  { num: 6, name: 'Transaction List', program: 'COTRN00C', userType: 'U', route: ROUTES.tranList },
  { num: 7, name: 'Transaction View', program: 'COTRN01C', userType: 'U', route: ROUTES.tranView },
  { num: 8, name: 'Transaction Add', program: 'COTRN02C', userType: 'U', route: ROUTES.tranAdd },
  { num: 9, name: 'Transaction Reports', program: 'CORPT00C', userType: 'U', route: ROUTES.reports },
  { num: 10, name: 'Bill Payment', program: 'COBIL00C', userType: 'U', route: ROUTES.billPay },
  { num: 11, name: 'Pending Authorization View', program: 'COPAUS0C', userType: 'U', route: ROUTES.pendingAuth, flag: 'pendingAuth' },
]

export const ADMIN_MENU: MenuOption[] = [
  { num: 1, name: 'User List (Security)', program: 'COUSR00C', userType: 'A', route: ROUTES.userList },
  { num: 2, name: 'User Add (Security)', program: 'COUSR01C', userType: 'A', route: ROUTES.userAdd },
  { num: 3, name: 'User Update (Security)', program: 'COUSR02C', userType: 'A', route: ROUTES.userUpdate },
  { num: 4, name: 'User Delete (Security)', program: 'COUSR03C', userType: 'A', route: ROUTES.userDelete },
  { num: 5, name: 'Transaction Type List/Update (Db2)', program: 'COTRTLIC', userType: 'A', route: ROUTES.tranTypeList, flag: 'tranType' },
  { num: 6, name: 'Transaction Type Maintenance (Db2)', program: 'COTRTUPC', userType: 'A', route: ROUTES.tranTypeUpdate, flag: 'tranType' },
]
