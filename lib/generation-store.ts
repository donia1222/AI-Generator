// Global generation store - persists across page navigations
// Module-level state survives Next.js client-side route changes

export type GenType = "video" | "music" | "web" | "image";

export type GenEntry = {
  status: "pending" | "done" | "error";
  promise: Promise<unknown>;
  result?: Record<string, unknown>;
  error?: string;
  startedAt: number;
};

const store: Partial<Record<GenType, GenEntry>> = {};
const listeners: Partial<Record<GenType, Set<() => void>>> = {};

export function startGeneration(
  type: GenType,
  fetchFn: () => Promise<Record<string, unknown>>
): Promise<Record<string, unknown>> {
  const promise = fetchFn();

  const entry: GenEntry = {
    status: "pending",
    promise,
    startedAt: Date.now(),
  };

  promise
    .then((result) => {
      entry.status = "done";
      entry.result = result;
      notify(type);
    })
    .catch((err) => {
      entry.status = "error";
      entry.error = err instanceof Error ? err.message : "Unknown error";
      notify(type);
    });

  store[type] = entry;
  notify(type);
  return promise;
}

export function getGeneration(type: GenType): GenEntry | undefined {
  return store[type];
}

export function clearGeneration(type: GenType): void {
  delete store[type];
  notify(type);
}

export function isGenerating(type: GenType): boolean {
  return store[type]?.status === "pending";
}

export function isAnyGenerating(): boolean {
  return Object.values(store).some((e) => e?.status === "pending");
}

// Simple listener system for React components
function notify(type: GenType) {
  listeners[type]?.forEach((fn) => fn());
}

export function subscribe(type: GenType, fn: () => void): () => void {
  if (!listeners[type]) listeners[type] = new Set();
  listeners[type]!.add(fn);
  return () => listeners[type]!.delete(fn);
}
