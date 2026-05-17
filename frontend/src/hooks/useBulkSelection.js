import { useCallback, useMemo, useState } from "react";

export function useBulkSelection() {
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);

  const isSelected = useCallback((id) => selectedIds.has(String(id)), [selectedIds]);

  const toggleOne = useCallback((id) => {
    const key = String(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  const setMany = useCallback((ids, checked) => {
    const keys = (Array.isArray(ids) ? ids : []).map(String);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (checked) next.add(k);
        else next.delete(k);
      }
      return next;
    });
  }, []);

  const replaceAll = useCallback((ids) => {
    const keys = (Array.isArray(ids) ? ids : []).map(String);
    setSelectedIds(new Set(keys));
  }, []);

  return {
    selectedIds: selectedArray,
    selectedSet: selectedIds,
    isSelected,
    toggleOne,
    setMany,
    replaceAll,
    clear,
  };
}

