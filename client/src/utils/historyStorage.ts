export type HistoryItem = {
  ingestionId: string;
  fileName: string;
  isUrl: boolean;
  createdAt: number;
};

export const HISTORY_STORAGE_KEY = "lssai.history.v1";
export const HISTORY_LIMIT = 10;

export function loadHistoryFromStorage(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    const items: HistoryItem[] = [];
    for (const v of parsed) {
      if (!v || typeof v !== "object") continue;
      const obj = v as Record<string, unknown>;

      // Support some older shapes (id/name/createdAtMs).
      const ingestionId =
        (typeof obj.ingestionId === "string" && obj.ingestionId) ||
        (typeof obj.id === "string" && obj.id) ||
        "";
      if (!ingestionId) continue;

      const fileName =
        (typeof obj.fileName === "string" && obj.fileName) ||
        (typeof obj.name === "string" && obj.name) ||
        "audio";

      const isUrl =
        typeof obj.isUrl === "boolean"
          ? obj.isUrl
          : typeof obj.url === "string" && Boolean(obj.url);

      const createdAt =
        typeof obj.createdAt === "number"
          ? obj.createdAt
          : typeof obj.createdAtMs === "number"
            ? obj.createdAtMs
            : Date.now();

      items.push({ ingestionId, fileName, isUrl, createdAt });
    }

    return items.slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function saveHistoryToStorage(items: HistoryItem[]): void {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function clearHistoryStorage(): void {
  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function upsertHistoryItem(
  prev: HistoryItem[],
  item: HistoryItem,
): HistoryItem[] {
  return [
    item,
    ...prev.filter((h) => h.ingestionId !== item.ingestionId),
  ].slice(0, HISTORY_LIMIT);
}
