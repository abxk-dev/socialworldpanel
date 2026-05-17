import React from 'react';

/**
 * Bulk selection bar. Pass `children` for action buttons (e.g. Suspend / Export).
 * If `children` is omitted, shows optional legacy Apply button when `onApplied` is set.
 */
export default function BulkActionsBar({
  type,
  selectedIds = [],
  onClear,
  onApplied,
  children,
}) {
  const count = Array.isArray(selectedIds) ? selectedIds.length : 0;
  if (!count) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-[var(--text-muted)] text-xs">
        <span className="text-white font-semibold">{count}</span> selected
        {type ? ` · ${type}` : ''}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        {onApplied && !children ? (
          <button
            type="button"
            className="px-3 py-1.5 rounded-md bg-cyber-purple hover:bg-cyber-purple/90 text-white text-xs"
            onClick={() => onApplied && onApplied()}
          >
            Apply
          </button>
        ) : null}
        <button
          type="button"
          className="px-3 py-1.5 rounded-md border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--bg-card)] text-xs"
          onClick={() => onClear && onClear()}
        >
          Clear selection
        </button>
      </div>
    </div>
  );
}
