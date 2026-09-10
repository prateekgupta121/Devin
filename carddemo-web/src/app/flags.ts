// Feature flags for optional modules. Defaults come from Vite env
// (VITE_FEATURE_PENDING_AUTH, VITE_FEATURE_TRAN_TYPE); a localStorage
// override lets the flag be toggled at runtime from the menu footer.
export type FeatureFlag = 'pendingAuth' | 'tranType'

const ENV_DEFAULTS: Record<FeatureFlag, boolean> = {
  pendingAuth: import.meta.env.VITE_FEATURE_PENDING_AUTH === 'true',
  tranType: import.meta.env.VITE_FEATURE_TRAN_TYPE === 'true',
}

const key = (f: FeatureFlag) => `carddemo.flag.${f}`

export function isEnabled(flag: FeatureFlag): boolean {
  const override = localStorage.getItem(key(flag))
  if (override === 'true') return true
  if (override === 'false') return false
  return ENV_DEFAULTS[flag]
}

export function setEnabled(flag: FeatureFlag, on: boolean) {
  localStorage.setItem(key(flag), String(on))
}
