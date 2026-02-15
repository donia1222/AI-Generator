# Lweb KI Creator Suite

KI-gestützte Creative Suite von [Lweb.ch](https://www.lweb.ch) — generiere Websites, Videos und Musik mit modernster KI-Technologie.

## Features

### KI Web Creator
- Beschreibe deine Traumwebsite in Worten und erhalte in Sekunden eine vollständige, responsive Website
- 8+ professionelle Vorlagen (Restaurant, Fitness, Portfolio, Arztpraxis, Tech, Bäckerei, Immobilien, Yoga)
- Vorlagen anpassen oder komplett neue Designs generieren
- Generierte Websites herunterladen als HTML
- Powered by **Gemini AI**

### Sora Video Generator
- Text-zu-Video-Generierung mit OpenAI Sora
- Verschiedene Auflösungen und Seitenverhältnisse (16:9, 9:16, 1:1)
- Generierte Videos herunterladen

### KI Musik Generator
- Songs erstellen aus Lyrics und/oder Beschreibungen
- Getrennte Eingabe für Lyrics und KI-Anweisungen
- Genres: Pop, Rock, Hip-Hop, Electronic, Jazz, Classical und mehr
- Stimmenwahl (Männlich / Weiblich / Instrumental)
- Audio-Upload & Instrumental-Mix (Upload-Cover-Modus)
- Powered by **Suno V5** via Kie.ai

### Verlauf
- Letzte 10 Generierungen pro Kategorie gespeichert (Browser-Speicher)
- Vorschau und Download früherer Generierungen

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Sprache:** TypeScript
- **APIs:** OpenAI Sora, Kie.ai (Suno V5), Gemini (via PHP Proxy)
- **Deployment:** Vercel

## Setup

### 1. Repository klonen

```bash
git clone https://github.com/DEIN-USER/sora-app.git
cd sora-app
```

### 2. Dependencies installieren

```bash
npm install
```

### 3. Umgebungsvariablen konfigurieren

Erstelle eine `.env.local` Datei:

```env
OPENAI_API_KEY=dein-openai-key
KIE_API_KEY=dein-kie-api-key
HF_API_TOKEN=dein-huggingface-token
GEMINI_PHP_URL=dein-gemini-endpoint-url
```

### 4. Entwicklungsserver starten

```bash
npm run dev
```

Die App läuft unter [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

1. Repository mit Vercel verbinden
2. Umgebungsvariablen in Vercel Dashboard konfigurieren (Settings > Environment Variables)
3. Automatisches Deployment bei jedem Push

## Projektstruktur

```
app/
  page.tsx              # Startseite mit Übersicht
  web-creator/          # KI Web Creator
  video-generator/      # Sora Video Generator
  music-generator/      # KI Musik Generator
  history/              # Verlauf aller Generierungen
  api/
    generate-website/   # Gemini API Route
    generate-video/     # Sora API Route
    generate-music/     # Kie.ai API Route
    mix-audio/          # Audio-Mixing Route
    upload-audio/       # Audio-Upload Route
    transcribe-audio/   # Whisper Transkription
components/             # Wiederverwendbare UI-Komponenten
lib/                    # Utilities, Prompts, Stores
```

## Lizenz

Proprietary — [Lweb.ch](https://www.lweb.ch)
