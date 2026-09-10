// Mock sign-on session: the URL carries `user` for linkability, but a route is
// only authorized when it matches the id that completed sign-on in this tab.
const KEY = 'carddemo.session.user'

export const signIn = (userId: string) => sessionStorage.setItem(KEY, userId)
export const signOut = () => sessionStorage.removeItem(KEY)
export const signedOnUser = () => sessionStorage.getItem(KEY) ?? ''
