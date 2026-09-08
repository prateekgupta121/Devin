
interface PagerProps {
  page: number
  pageCount: number
  pageSize: number
  defaultPageSize: number
  onPageSize: (n: number) => void
}

// Page indicator plus user-overridable page size (legacy default kept).
export function Pager({ page, pageCount, pageSize, defaultPageSize, onPageSize }: PagerProps) {
  return (
    <div className="pager">
      <span>
        Page: <strong data-testid="page-no">{pageCount === 0 ? 0 : page}</strong> / {pageCount}
      </span>
      <label className="pager-size">
        Rows
        <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
          {[defaultPageSize, 5, 7, 10, 15, 25, 50]
            .filter((v, i, a) => a.indexOf(v) === i)
            .sort((a, b) => a - b)
            .map((n) => (
              <option key={n} value={n}>
                {n}
                {n === defaultPageSize ? ' (default)' : ''}
              </option>
            ))}
        </select>
      </label>
    </div>
  )
}
