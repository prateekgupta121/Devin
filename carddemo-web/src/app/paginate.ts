export function paginate<T>(items: T[], page: number, size: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / size))
  const p = Math.min(Math.max(1, page), pageCount)
  return { rows: items.slice((p - 1) * size, p * size), page: p, pageCount: items.length === 0 ? 0 : pageCount }
}
