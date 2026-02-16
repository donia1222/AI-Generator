export type HistoryType = "video" | "music" | "web" | "image";

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
  image: "history_image",
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

export function addToHistory(item: Omit<HistoryItem, "id" | "createdAt">): string {
  console.log("📝 addToHistory LLAMADO con:", item);
  if (typeof window === "undefined") {
    console.log("⚠️ window is undefined, no se guarda");
    return "";
  }
  const history = getHistory(item.type);
  console.log("📚 Historial actual tiene:", history.length, "items");
  const newItem: HistoryItem = {
    ...item,
    id: `${item.type}_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  console.log("🆕 Nuevo item creado:", newItem);
  const updated = [newItem, ...history].slice(0, MAX_ITEMS);
  console.log("💾 Guardando", updated.length, "items en localStorage");

  try {
    localStorage.setItem(STORAGE_KEYS[item.type], JSON.stringify(updated));
    console.log("✅ localStorage.setItem ejecutado para", STORAGE_KEYS[item.type]);
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn("⚠️ localStorage full - clearing old items");
      // Keep only the 3 most recent items to free space
      const reduced = updated.slice(0, 3);
      localStorage.setItem(STORAGE_KEYS[item.type], JSON.stringify(reduced));
    }
  }

  return newItem.id;
}

export function updateLatestHistory(type: HistoryType, metadata: Record<string, string>): void {
  if (typeof window === "undefined") return;
  const history = getHistory(type);
  if (history.length === 0) return;
  history[0].metadata = { ...history[0].metadata, ...metadata };

  try {
    localStorage.setItem(STORAGE_KEYS[type], JSON.stringify(history));
  } catch (e) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn("⚠️ localStorage full - keeping only recent items");
      const reduced = history.slice(0, 3);
      localStorage.setItem(STORAGE_KEYS[type], JSON.stringify(reduced));
    }
  }
}

export function updateHistoryById(id: string, metadata: Record<string, string>): void {
  if (typeof window === "undefined") return;

  // Find the item across all history types
  for (const type of Object.keys(STORAGE_KEYS) as HistoryType[]) {
    const history = getHistory(type);
    const index = history.findIndex(item => item.id === id);

    if (index !== -1) {
      history[index].metadata = { ...history[index].metadata, ...metadata };

      try {
        localStorage.setItem(STORAGE_KEYS[type], JSON.stringify(history));
        console.log(`✅ Updated history item ${id} in localStorage`);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          console.warn("⚠️ localStorage full - keeping only 3 items");
          const reduced = history.slice(0, 3);
          localStorage.setItem(STORAGE_KEYS[type], JSON.stringify(reduced));
        }
      }
      return;
    }
  }

  console.warn(`⚠️ History item ${id} not found`);
}

export function getHistoryById(id: string): HistoryItem | null {
  if (typeof window === "undefined") return null;

  for (const type of Object.keys(STORAGE_KEYS) as HistoryType[]) {
    const history = getHistory(type);
    const item = history.find(item => item.id === id);
    if (item) return item;
  }

  return null;
}

export function clearHistory(type?: HistoryType): void {
  if (typeof window === "undefined") return;
  if (type) {
    localStorage.removeItem(STORAGE_KEYS[type]);
  } else {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  }
}
