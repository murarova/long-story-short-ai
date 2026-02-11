import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearHistoryStorage,
  loadHistoryFromStorage,
  saveHistoryToStorage,
  type HistoryItem,
  upsertHistoryItem,
  HISTORY_STORAGE_KEY,
} from "@/utils/historyStorage";
import {
  deleteAllIngestions,
  deleteIngestion,
} from "@/lib/ragApi";

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>(() =>
    loadHistoryFromStorage(),
  );

  const historyRef = useRef(history);
  historyRef.current = history;

  const refreshHistory = useCallback(() => {
    setHistory(loadHistoryFromStorage());
  }, []);

  const clearHistory = useCallback(() => {
    const items = historyRef.current;
    setHistory([]);
    clearHistoryStorage();

    if (items.length > 0) {
      deleteAllIngestions().catch(() => {
        for (const item of items) {
          deleteIngestion(item.ingestionId).catch(() => {});
        }
      });
    }
  }, []);

  const upsertHistory = useCallback((item: HistoryItem) => {
    setHistory((prev) => {
      const next = upsertHistoryItem(prev, item);
      saveHistoryToStorage(next);
      return next;
    });
  }, []);

  useEffect(() => {
    refreshHistory();
    const onStorage = (e: StorageEvent) => {
      if (e.key === HISTORY_STORAGE_KEY) refreshHistory();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshHistory]);

  return { history, clearHistory, upsertHistory };
}
