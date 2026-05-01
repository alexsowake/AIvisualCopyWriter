# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server (uses --webpack flag explicitly)
npm run build    # Production build
npm start        # Production server
npm run lint     # ESLint
```

Path alias: `@/*` → `./src/*`

## Architecture

**Purpose**: AI photo caption generator ("时间胶囊"). Users upload photos; vision LLMs generate minimalist Chinese captions or matched literary quotes.

**Tech stack**: Next.js 16 App Router, React 18, Tailwind CSS, Framer Motion, TypeScript (strict).

### Two App Modes

**Classic mode** (`appMode: 'classic'`): Up to 6 images, 1 caption each.

**Multi-gen mode** (`appMode: 'multi-gen'`): 1 image → 6 captions (3 ai-original + 3 quote-style). Mobile batches these as 2×3 instead of 6 concurrent to reduce OOM risk.

### State Management

All state lives in [src/hooks/useImageProcessor.ts](src/hooks/useImageProcessor.ts). Key state:
- `images: ImageItem[]` — classic mode images with lifecycle (`idle` → `processing-image` → `loading` → `success`/`error`)
- `multiGenResults: MultiGenResult[]` — separate state for multi-gen mode (not mixed with `images[]`)
- `copyMode`: `'ai-original'` | `'quote-style'` — controls both system prompt and export layout
- `modelProvider`: `'gemini'` | `'gemini-flash'` | `'qwen'` | `'kimi'`
- `activeRequests: useRef<Map<string, AbortController>>` — per-image in-flight tracking for cancellation

### Image Processing Pipeline

1. EXIF extraction (`exifr`) → GPS → Nominatim reverse-geocoding (async, non-blocking)
2. HEIC 3-tier fallback: `createImageBitmap()` → `heic2any` (client) → `POST /api/convert-heic` (server)
3. WebP compression via `browser-image-compression` (0.3 MB max, 1024px, quality 0.75)
4. `URL.createObjectURL()` for preview; must call `revokeObjectURL()` on removal

### API Routes

**`POST /api/generate-copy`** — Main LLM inference (60s timeout).
- FormData: `image`, `modelProvider`, `copyMode`, `metadataDate`, `metadataLocation`, optional `prompt`
- Multi-model: Gemini Flash via proxy (`GEMINI_PROXY_URL`/`GEMINI_PROXY_SECRET`), Kimi K2.5 via proxy (`KIMI_PROXY_URL`/`KIMI_PROXY_SECRET`), Qwen-VL-Max direct (`QWEN_API_KEY`)
- Response cleaning: strips markdown, JSON wrappers, thought markers (`<thought>`, `thinking:`, etc.)

**`POST /api/convert-heic`** — Server-side HEIC→JPEG (Node.js runtime, not edge).

### System Prompts ([src/config/systemPrompt.ts](src/config/systemPrompt.ts))

**`SYSTEM_PROMPT`** (ai-original): Minimalist caption philosophy, 8–24 Chinese chars, no English/Markdown. Banned words: 世界, 梦, 时光, 岁月, 温柔, etc. Forbidden structures: "…里…着整个XX", "…得像…", 排比句. Metadata (date/location) injected into prompt.

**`QUOTE_SYSTEM_PROMPT`** (quote-style): Match verifiable literary quotes/film dialogue/lyrics. 50-char max, attribution required (——作品, 作者). Strict anti-hallucination: reject if unsure.

### Export Flow

[src/components/results/ExportCardTemplate.tsx](src/components/results/ExportCardTemplate.tsx) is an invisible DOM component rendered for `html2canvas`. It uses native `<img>` (not Next.js `<Image>`) — do not refactor this. 4:3 aspect ratio (`paddingTop: 75%`). Quote-style shows attribution; ai-original shows date/location.

### Retry Logic

```typescript
// 3 retries, exponential backoff for 503/429
delay(1500 * Math.pow(2, retryCount - 1))
```

### Styling

OKLCH color system in [src/app/globals.css](src/app/globals.css): `--bg`, `--fg`, `--accent`, `--border`, `--surface`. Mix of CSS variables, inline styles, and Tailwind (not pure Tailwind). Fonts: LXGW WenKai (Chinese serif), Playfair Display, DM Sans.

## Environment Variables

```
GEMINI_PROXY_URL=
GEMINI_PROXY_SECRET=
KIMI_PROXY_URL=
KIMI_PROXY_SECRET=
QWEN_API_KEY=
```

## Non-Obvious Constraints

- **ExportCardTemplate must use native `<img>`** — html2canvas breaks with Next.js `<Image>`
- **`/api/convert-heic` must stay Node.js runtime** — heic-convert uses native bindings, not edge-compatible
- Android's `createImageBitmap` can hang indefinitely on HEIC files; the 5s timeout handles this
- `multiGenResults` is completely separate from `images[]` — don't conflate them when adding features
- `isGlobalGenerating` blocks simultaneous generation across images to prevent race conditions
