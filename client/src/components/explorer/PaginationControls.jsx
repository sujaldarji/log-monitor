import { useState } from 'react'
import clsx         from 'clsx'

// TODO: switch to from/size for instant random access if sequential walk becomes too slow
export default function PaginationControls({
  isDark,
  currentPage,
  nextAfter,
  total,
  logsCount,
  cursors,
  onPrev,
  onNext,
  onPageInput,
}) {
  const [pageInput, setPageInput] = useState('')
  const [jumpError, setJumpError] = useState('')

  const totalPages = total > 0 ? Math.ceil(total / 50) : null
  const maxReached = cursors.length - 1

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return
    const num = parseInt(pageInput, 10)
    if (isNaN(num) || num < 1) return
    if (totalPages && num > totalPages) {
      setJumpError(`Max page is ${totalPages}`)
      setTimeout(() => setJumpError(''), 3000)
      return
    }
    setJumpError('')
    setPageInput('')
    onPageInput(num - 1)
  }

  return (
    <div className="flex items-center justify-between">

      {/* Left — record count */}
      <span className={clsx('text-sm font-mono', isDark ? 'text-ink-muted' : 'text-gray-400')}>
        {logsCount > 0 ? `${logsCount} records · ${total.toLocaleString()} total` : ''}
      </span>

      {/* Right — controls */}
      <div className="flex items-center gap-3">

        <button
          onClick={onPrev}
          disabled={currentPage === 0}
          className={clsx(
            'text-sm font-mono px-3 py-1.5 rounded-sm border transition-all disabled:opacity-30 disabled:cursor-not-allowed',
            isDark ? 'border-surface-border text-ink-secondary hover:border-accent hover:text-accent' : 'border-gray-200 text-gray-500 hover:border-accent hover:text-accent'
          )}
        >
          ← Prev
        </button>

        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className={clsx('text-sm font-mono', isDark ? 'text-ink-muted' : 'text-gray-400')}>Page</span>
            <input
              type="text"
              inputMode="numeric"
              value={pageInput !== '' ? pageInput : String(currentPage + 1)}
              onChange={e => { if (e.target.value === '' || /^\d+$/.test(e.target.value)) setPageInput(e.target.value) }}
              onFocus={e => { setPageInput(''); e.target.select() }}
              onKeyDown={handleKeyDown}
              onBlur={() => setPageInput('')}
              className={clsx(
                'w-14 text-center text-sm font-mono px-2 py-1 rounded-sm border outline-none transition-all',
                isDark ? 'bg-surface border-surface-border text-ink-primary focus:border-accent/50' : 'bg-white border-gray-200 text-gray-700 focus:border-accent/50',
                jumpError && 'border-amber-500/60'
              )}
              title="Type a page number and press Enter"
            />
            {totalPages && (
              <span className={clsx('text-sm font-mono', isDark ? 'text-ink-muted' : 'text-gray-400')}>
                of {totalPages.toLocaleString()}
              </span>
            )}
          </div>
          {jumpError && (
            <span className="text-xs font-mono text-amber-400">{jumpError}</span>
          )}
          {!jumpError && pageInput && parseInt(pageInput) - 1 > maxReached && (
            <span className={clsx('text-xs font-mono', isDark ? 'text-ink-muted' : 'text-gray-400')}>
              will walk {parseInt(pageInput) - 1 - maxReached} pages to get there
            </span>
          )}
        </div>

        <button
          onClick={onNext}
          disabled={!nextAfter}
          className={clsx(
            'text-sm font-mono px-3 py-1.5 rounded-sm border transition-all disabled:opacity-30 disabled:cursor-not-allowed',
            isDark ? 'border-surface-border text-ink-secondary hover:border-accent hover:text-accent' : 'border-gray-200 text-gray-500 hover:border-accent hover:text-accent'
          )}
        >
          Next →
        </button>

      </div>
    </div>
  )
}