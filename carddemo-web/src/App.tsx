import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { ROUTES } from './app/menus'
import { findUser, useStore } from './app/store'
import { isEnabled, type FeatureFlag } from './app/flags'
import { MSG } from './app/messages'
import { SignOn } from './screens/SignOn'
import { Menu } from './screens/Menu'
import { AccountView } from './screens/AccountView'
import { AccountUpdate } from './screens/AccountUpdate'
import { CardList } from './screens/CardList'
import { CardView } from './screens/CardView'
import { CardUpdate } from './screens/CardUpdate'
import { TranList } from './screens/TranList'
import { TranView } from './screens/TranView'
import { TranAdd } from './screens/TranAdd'
import { BillPay } from './screens/BillPay'
import { Reports } from './screens/Reports'
import { UserList } from './screens/UserList'
import { UserAdd } from './screens/UserAdd'
import { UserUpdate } from './screens/UserUpdate'
import { UserDelete } from './screens/UserDelete'
import { PendingAuthView } from './screens/PendingAuthView'
import { TranTypeList } from './screens/TranTypeList'
import { TranTypeUpdate } from './screens/TranTypeUpdate'

function Guard({ admin, flag, children }: { admin?: boolean; flag?: FeatureFlag; children: ReactNode }) {
  useStore()
  const [params] = useSearchParams()
  const location = useLocation()
  const user = findUser(params.get('user') ?? '')
  if (!user) return <Navigate to={ROUTES.signon} replace state={{ message: MSG.enterUserId }} />
  if (admin && user.type !== 'A') {
    return <Navigate to={`${ROUTES.menu}?user=${encodeURIComponent(user.userId)}`} replace state={{ message: MSG.adminOnly }} />
  }
  if (flag && !isEnabled(flag)) {
    const home = user.type === 'A' ? ROUTES.admin : ROUTES.menu
    return (
      <Navigate
        to={`${home}?user=${encodeURIComponent(user.userId)}`}
        replace
        state={{ message: MSG.notInstalled('', location.pathname.slice(1) + ' ') }}
      />
    )
  }
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={ROUTES.signon} replace />} />
        <Route path={ROUTES.signon} element={<SignOn />} />
        <Route path={ROUTES.menu} element={<Guard><Menu variant="main" /></Guard>} />
        <Route path={ROUTES.admin} element={<Guard admin><Menu variant="admin" /></Guard>} />

        <Route path={ROUTES.acctView} element={<Guard><AccountView /></Guard>} />
        <Route path={ROUTES.acctUpdate} element={<Guard><AccountUpdate /></Guard>} />
        <Route path={ROUTES.cardList} element={<Guard><CardList /></Guard>} />
        <Route path={ROUTES.cardView} element={<Guard><CardView /></Guard>} />
        <Route path={ROUTES.cardUpdate} element={<Guard><CardUpdate /></Guard>} />
        <Route path={ROUTES.tranList} element={<Guard><TranList /></Guard>} />
        <Route path={ROUTES.tranView} element={<Guard><TranView /></Guard>} />
        <Route path={ROUTES.tranAdd} element={<Guard><TranAdd /></Guard>} />
        <Route path={ROUTES.reports} element={<Guard><Reports /></Guard>} />
        <Route path={ROUTES.billPay} element={<Guard><BillPay /></Guard>} />
        <Route path={ROUTES.pendingAuth} element={<Guard flag="pendingAuth"><PendingAuthView /></Guard>} />

        <Route path={ROUTES.userList} element={<Guard admin><UserList /></Guard>} />
        <Route path={ROUTES.userAdd} element={<Guard admin><UserAdd /></Guard>} />
        <Route path={ROUTES.userUpdate} element={<Guard admin><UserUpdate /></Guard>} />
        <Route path={ROUTES.userDelete} element={<Guard admin><UserDelete /></Guard>} />
        <Route path={ROUTES.tranTypeList} element={<Guard admin flag="tranType"><TranTypeList /></Guard>} />
        <Route path={ROUTES.tranTypeUpdate} element={<Guard admin flag="tranType"><TranTypeUpdate /></Guard>} />

        <Route path="*" element={<Navigate to={ROUTES.signon} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
