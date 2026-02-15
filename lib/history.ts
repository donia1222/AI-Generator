export type HistoryType = "video" | "music" | "web";

export interface HistoryItem {
  id: string;
  type: HistoryType;
  prompt: string;
  url: string;
  title?: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

const STORAGE_KEYS: Record<HistoryType, string> = {
  video: "history_video",
  music: "history_music",
  web: "history_web",
};

const MAX_ITEMS = 10;

export function getHistory(type: HistoryType): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[type]);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getAllHistory(): HistoryItem[] {
  const all = [
    ...getHistory("video"),
    ...getHistory("music"),
    ...getHistory("web"),
  ];
  return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function addToHistory(item: Omit<HistoryItem, "id" | "createdAt">): void {
  if (typeof window === "undefined") return;
  const history = getHistory(item.type);
  const newItem: HistoryItem = {
    ...item,
    id: `${item.type}_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [newItem, ...history].slice(0, MAX_ITEMS);
  localStorage.setItem(STORAGE_KEYS[item.type], JSON.stringify(updated));
}

export function updateLatestHistory(type: HistoryType, metadata: Record<string, string>): void {
  if (typeof window === "undefined") return;
  const history = getHistory(type);
  if (history.length === 0) return;
  history[0].metadata = { ...history[0].metadata, ...metadata };
  localStorage.setItem(STORAGE_KEYS[type], JSON.stringify(history));
}

export function clearHistory(type?: HistoryType): void {
  if (typeof window === "undefined") return;
  if (type) {
    localStorage.removeItem(STORAGE_KEYS[type]);
  } else {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  }
}
