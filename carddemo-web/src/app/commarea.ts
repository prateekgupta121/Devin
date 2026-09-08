// The legacy CICS commarea (current user, customer, account, card,
// transaction, from-screen) is carried as URL search params so every screen
// is linkable and refresh-safe. `from` is a stack of originating routes so F3
// returns to the actual caller rather than a fixed parent.
import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

export interface Commarea {
  user: string
  cust: string
  acct: string
  card: string
  tran: string
  from: string[]
}

export type CommareaPatch = Partial<Omit<Commarea, 'from'>>

const KEYS = ['user', 'cust', 'acct', 'card', 'tran'] as const

export interface NavOptions {
  /** Message to show on the destination screen (transient, via history state). */
  message?: string
  /** Do not push the current route onto the `from` stack. */
  replaceFrom?: boolean
  /** Extra query params specific to the destination screen. */
  extra?: Record<string, string | undefined>
}

export function useCommarea() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  const commarea = useMemo<Commarea>(
    () => ({
      user: params.get('user') ?? '',
      cust: params.get('cust') ?? '',
      acct: params.get('acct') ?? '',
      card: params.get('card') ?? '',
      tran: params.get('tran') ?? '',
      from: (params.get('from') ?? '').split(',').filter(Boolean),
    }),
    [params],
  )

  // Caller entry: pathname plus the caller's full query state (commarea keys and
  // screen-specific params such as page/size), encoded as `path;k=v;k=v` so F3
  // restores the exact originating view rather than the callee's selection.
  const callerEntry = useCallback(() => {
    const entries = [...params.entries()].filter(([k]) => k !== 'from')
    return [location.pathname, ...entries.map(([k, v]) => `${k}=${v}`)].join(';')
  }, [location.pathname, params])

  const build = useCallback(
    (path: string, patch: CommareaPatch, from: string[], extra?: Record<string, string | undefined>) => {
      const next = new URLSearchParams()
      for (const k of KEYS) {
        const v = patch[k] !== undefined ? patch[k] : commarea[k]
        if (v) next.set(k, v)
      }
      if (from.length) next.set('from', from.join(','))
      if (extra) for (const [k, v] of Object.entries(extra)) if (v) next.set(k, v)
      const qs = next.toString()
      return qs ? `${path}?${qs}` : path
    },
    [commarea],
  )

  /** Transfer to another screen (XCTL), recording the current screen as caller. */
  const go = useCallback(
    (path: string, patch: CommareaPatch = {}, opts: NavOptions = {}) => {
      const from = opts.replaceFrom ? commarea.from : [...commarea.from, callerEntry()].slice(-8)
      navigate(build(path, patch, from, opts.extra), { state: opts.message ? { message: opts.message } : undefined })
    },
    [build, callerEntry, commarea.from, navigate],
  )

  /** F3: return to the originating screen, or to `fallback` when none was recorded. */
  const back = useCallback(
    (fallback: string, patch: CommareaPatch = {}, message?: string) => {
      const stack = [...commarea.from]
      const [dest, ...pairs] = (stack.pop() ?? fallback).split(';')
      const saved = Object.fromEntries(pairs.map((p) => p.split('=') as [string, string]))
      const extra: Record<string, string> = {}
      const restored: CommareaPatch = {}
      for (const [k, v] of Object.entries(saved)) {
        if ((KEYS as readonly string[]).includes(k)) restored[k as (typeof KEYS)[number]] = v
        else extra[k] = v
      }
      if (pairs.length) for (const k of KEYS) if (k !== 'user' && restored[k] === undefined) restored[k] = ''
      navigate(build(dest, { ...restored, ...patch }, stack, extra), { state: message ? { message } : undefined })
    },
    [build, commarea.from, navigate],
  )

  /** Update context/extra params on the current screen without navigating away. */
  const setParams = useCallback(
    (patch: CommareaPatch, extra?: Record<string, string | undefined>) => {
      const current = Object.fromEntries(params.entries())
      const merged: Record<string, string | undefined> = {}
      for (const [k, v] of Object.entries(current)) {
        if (!(KEYS as readonly string[]).includes(k) && k !== 'from') merged[k] = v
      }
      Object.assign(merged, extra)
      navigate(build(location.pathname, patch, commarea.from, merged), { replace: true })
    },
    [build, commarea.from, location.pathname, navigate, params],
  )

  /** Sign off: drop all context. */
  const signOff = useCallback(
    (message?: string) => navigate('/signon', { state: message ? { message } : undefined }),
    [navigate],
  )

  const initialMessage = (location.state as { message?: string } | null)?.message

  return { commarea, params, go, back, setParams, signOff, initialMessage }
}
