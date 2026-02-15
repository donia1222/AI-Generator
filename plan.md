# Plan: Historial de Generaciones con Tabs

## Resumen
Guardar las últimas 10 generaciones (videos, canciones, webs) en `localStorage` y crear una nueva página `/history` con tabs para navegar entre los tres tipos.

## Orden de implementación
1. Video generator → 2. Music generator → 3. Webs (al final, ya que hay un bot trabajando ahí)

---

## Paso 1: Crear utilidad de historial (`lib/history.ts`)

Un módulo compartido para leer/escribir historial en localStorage:

```ts
type HistoryType = "video" | "music" | "web";

interface HistoryItem {
  id: string;           // timestamp-based unique ID
  type: HistoryType;
  prompt: string;
  url: string;          // videoUrl, audioUrl, or previewUrl
  title?: string;       // song title, web title, etc.
  createdAt: string;    // ISO date
  metadata?: Record<string, string>; // styles, duration, genre, etc.
}
```

Funciones:
- `addToHistory(item)` — agrega al inicio, mantiene máximo 10 por tipo
- `getHistory(type)` — devuelve los items de un tipo
- `getAllHistory()` — devuelve todo
- `clearHistory(type?)` — limpia historial

Storage keys: `history_video`, `history_music`, `history_web`

## Paso 2: Guardar generaciones de Video

En `app/video-generator/page.tsx`, después de recibir `videoUrl` exitoso (línea ~119-122):
- Llamar `addToHistory({ type: "video", prompt, url: videoUrl, metadata: { duration, orientation, styles } })`

## Paso 3: Guardar generaciones de Música

En `app/music-generator/page.tsx`, después de recibir resultado exitoso:
- Para modo "create": guardar `audioUrl` con título, géneros, moods
- Para modo "upload"/"mix": guardar `mixedAudioUrl || audioUrl` con metadata

## Paso 4: Crear página de Historial (`app/history/page.tsx`)

- Ruta: `/history`
- Tabs: "Videos" | "Canciones" | "Webs"
- Cada tab muestra una grid de cards con:
  - **Video**: thumbnail placeholder + prompt + fecha + botón play
  - **Música**: icono de música + título + prompt + botón play
  - **Web**: thumbnail placeholder + prompt + fecha + link
- Si no hay items: mensaje "No hay historial todavía"
- Botón "Limpiar historial" por tab
- Máximo 10 items por tipo (los más recientes primero)

## Paso 5: Agregar tab "Historial" en la navegación

En `components/TabNav.tsx`, agregar:
```ts
{ label: "Historial", href: "/history" }
```

## Paso 6: (Después) Guardar generaciones de Web

En `app/web-creator/page.tsx`, después de generación exitosa, guardar en historial.
Esto se hace al final ya que hay un bot trabajando en web-creator.

---

## Archivos a crear
- `lib/history.ts` — utilidad de localStorage
- `app/history/page.tsx` — página de historial

## Archivos a modificar
- `app/video-generator/page.tsx` — agregar guardado en historial
- `app/music-generator/page.tsx` — agregar guardado en historial
- `components/TabNav.tsx` — agregar tab de historial
- `app/web-creator/page.tsx` — (al final) agregar guardado en historial

## Notas
- Todo en localStorage del navegador, no backend
- El historial persiste entre sesiones del navegador
- Diseño consistente con el estilo actual (gunpowder, gradients, rounded cards)
