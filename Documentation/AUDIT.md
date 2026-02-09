# Kaleidoscope Codebase Audit

**Date:** 2026-02-09
**Branch:** `origin/master` @ `863be09`
**Auditor:** Claude (automated)

---

## Executive Summary

Kaleidoscope is a multi-device responsive design preview tool built as a monorepo (React 19 frontend + Express 4 backend + MCP server). It allows developers to preview websites across different device viewports, share localhost via tunnels, capture screenshots, authenticate through a server-side proxy, inject mock data, and build user flow diagrams.

**Overall health:** Good. Tests pass (218/218), TypeScript compiles cleanly across all 3 projects, and the architecture is sound. Seven bugs were found and fixed during this audit. Several lower-severity issues are documented below with recommended fixes.

---

## Automated Check Results

| Check | Result |
|-------|--------|
| Unit Tests (vitest) | **218 passed** / 16 test files |
| Client TypeScript (`tsc --noEmit`) | **CLEAN** (0 errors) |
| Server TypeScript (`tsc --noEmit`) | **CLEAN** (0 errors) |
| MCP Server TypeScript (`tsc --noEmit`) | **CLEAN** (0 errors) |
| ESLint | **10 errors** (all in test files / generated UI) |

ESLint breakdown (remaining 10 — all non-source):
- `button.tsx` — `react-refresh/only-export-components` (shadcn/ui generated, do not modify)
- Test files — unused vars (`iframe1`, `iframe2`, `afterEach`, `rerender`, `waitFor`), `no-explicit-any` in mocks/setup

---

## Bugs Found & Fixed

### 1. `device-frame.tsx:76-83` — handleRetry uses global querySelector **(CRITICAL)**
**Problem:** `document.querySelector('iframe[data-device-frame]')` selects the **first** matching iframe in the DOM. In comparison mode with multiple DeviceFrame instances, clicking "Retry" on device #3 would reload device #1's iframe.
Additionally, `iframe.src = iframe.src` triggered ESLint `no-self-assign`.

**Fix:** Replaced with `setIframeKey(k => k + 1)` — the same key-based remount pattern already used by `reloadTrigger` and `proxyUrl` changes in the same component.

### 2. `preview-area.tsx:120-124` — handleRefresh uses global querySelector **(CRITICAL)**
**Problem:** Same bug as #1. The "Refresh" button in PreviewArea used `document.querySelector('iframe[data-device-frame]')`, which only refreshes the first iframe in comparison mode.

**Fix:** Added `localReloadTrigger` state to PreviewArea. Combined with the parent's `reloadTrigger` prop when passing to DeviceFrame: `reloadTrigger={reloadTrigger + localReloadTrigger}`. This correctly refreshes all visible iframes.

### 3. `sidebar.tsx:80-82` — URL validation commented out **(MEDIUM)**
**Problem:** The `new URL(finalUrl)` validation was commented out. The surrounding try/catch could never trigger on invalid URLs, allowing malformed URLs to be loaded and added to recent URLs.

**Fix:** Uncommented the validation: `new URL(finalUrl);` now runs before `addRecentUrl` and `onLoadUrl`.

### 4. `flow-diagrams.tsx:28` — Module-level `nodeIdCounter` **(MEDIUM)**
**Problem:** `let nodeIdCounter = 0` at module scope is shared across HMR reloads, React StrictMode double-renders, and navigation cycles. If the component unmounts/remounts, IDs continue from stale values instead of resetting.

**Fix:** Moved to `useRef` inside FlowEditor: `const nodeIdCounterRef = useRef(0)`. The `getNextId()` function is now a component-local function that reads/writes the ref.

### 5. `flow-diagrams.tsx:53` — `reactFlowInstance` typed as `any` **(LOW)**
**Problem:** ESLint `no-explicit-any` violation. The `reactFlowInstance` state lacked a proper type.

**Fix:** Imported `ReactFlowInstance` from `@xyflow/react` and typed the state: `useState<ReactFlowInstance | null>(null)`.

### 6. `tunnel.service.ts:122-128` — Error handler doesn't clean up tunnelClosers **(MEDIUM)**
**Problem:** When a tunnel errors, its status is set to `'error'` but the `tunnelClosers` Map retains a stale closer function. Subsequent `closeTunnel()` calls try to invoke the closer on a dead tunnel, and new `createTunnel()` calls on the same port would see a stale entry.

**Fix:** Added `this.tunnelClosers.delete(port)` in the error handler.

### 7. `live-reload-toggle.tsx:15` / `home.tsx:52,58` — Unused variables **(LOW)**
**Problem:** `currentUrl` prop declared but never used in LiveReloadToggle. `_cookies` and `_session` params unused in Home handlers.

**Fix:** Removed `currentUrl` from LiveReloadToggle's props interface and destructuring. Simplified Home handlers to omit unused params and removed unused `AuthCookie` import.

---

## Remaining Issues (Not Fixed — Documented for Review)

### Architecture / Design

#### A1. Device list duplicated 5 times
The same 8-device list appears in:
1. `mosaic-client/src/lib/devices.ts` (canonical)
2. `server/services/screenshot.service.ts` (DEVICE_MAP)
3. `server/routes/screenshot.routes.ts` (GET /devices response)
4. `mosaic-client/src/components/screenshot-panel.tsx` (DEVICE_OPTIONS)
5. `mcp-server/src/tools/preview.ts` (ALL_DEVICE_IDS)

**Risk:** Adding a device requires changes in 5 files. Drift between lists is likely.
**Recommendation:** Create a shared `devices.json` or `shared/devices.ts` at the monorepo root. Import from all consumers.

#### A2. `home.tsx` — `handleUrlChange` and `handleLoadUrl` are identical
```tsx
const handleUrlChange = (url: string) => { setCurrentUrl(url); };
const handleLoadUrl = (url: string) => { setCurrentUrl(url); };
```
The sidebar calls both on submit: `onLoadUrl(finalUrl); onUrlChange(finalUrl);` — two state updates with identical effect.
**Recommendation:** Consolidate into a single callback. The semantic distinction (typing vs submitting) is not reflected in the implementation.

#### A3. `handleKeyNavigation` useCallback deps
```tsx
}, [selectedDevice]);
```
References `handleDevicePin` and `handleViewModeToggle` which are not in deps. This is technically safe because both use functional state updaters internally, but it's a fragile pattern and would cause ESLint `react-hooks/exhaustive-deps` to warn if the rule were active on the `useCallback` level.

#### A4. State management — prop drilling depth
Home passes 14 props to Sidebar and 8 to PreviewArea. Zustand is installed but unused. `next-themes` is installed but dark mode is done via manual `document.body.classList` manipulation + MutationObserver.
**Recommendation:** For current complexity this is fine. If features grow (e.g., persistent preferences, multiple URL tabs), extract shared state to Zustand.

#### A5. Unused packages
The following are installed but never imported anywhere in the source:
- `next-themes` — dark mode is manual
- `react-hook-form` — forms use raw `useState`
- `zustand` — state is `useState` + props
- `dayjs` — no date formatting
- `vaul` — drawer component unused

**Recommendation:** Remove to reduce bundle size and dependency surface.

#### A6. `queryClient.ts` — Boilerplate utilities
`apiRequest()` is exported but never used. `getQueryFn` is only used as the default `queryFn` but has an auth flow (`on401: "throw"`) that doesn't match any backend endpoint (there is no user authentication on the server itself).
**Recommendation:** Simplify `queryClient` or remove unused exports.

#### A7. `use-recent-urls.tsx:75-112` — `useValidateUrl` defined but never used
The hook is exported but not imported anywhere. It duplicates validation that `new URL()` already provides in sidebar.
**Recommendation:** Remove the dead code.

### Security

#### S1. SSRF protection covers basics but not all edge cases
`proxy.routes.ts` and `screenshot.routes.ts` both block cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`) and non-HTTP protocols. Missing coverage:
- Private IPs (10.x, 172.16-31.x, 192.168.x) — attacker can proxy to internal services
- IPv6 loopback/private addresses
- DNS rebinding (a domain resolving to a private IP)

**Recommendation:** For a local dev tool the current level is adequate. For any production deployment, add private IP range blocking and consider DNS resolution validation.

#### S2. Proxy session IDs use `Math.random()`
`proxy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` is predictable.
**Recommendation:** Use `crypto.randomUUID()` for session IDs if the proxy is exposed beyond localhost.

#### S3. CORS is `*` in development
`Access-Control-Allow-Origin: *` allows any origin to call the API. Fine for local dev, but the production path falls through to `*` when `CORS_ORIGIN` is not set.
**Recommendation:** Default to the client origin in production rather than `*`.

### Memory / Resource

#### M1. `preview-area.tsx:42-49` — MutationObserver for dark mode
Creates a MutationObserver per PreviewArea mount. This observer never fires unless `document.body.classList` changes, which happens rarely. Not a leak (cleaned up on unmount), but an inefficient pattern.
**Recommendation:** Use a shared React context or store for dark mode state.

#### M2. `screenshot.service.ts` — Browser instance lifecycle
The Playwright browser is kept alive as a singleton (`this.browser`). Graceful shutdown handles cleanup. However, if a screenshot capture throws during `page.goto()`, the `finally` block correctly calls `page.close()`. This is well-handled.

#### M3. `watcher.service.ts` — Debounce timer accumulation
Debounce timers are keyed by `${id}:${filePath}`. For a large project with many files changing simultaneously, this map can grow. Timers are cleaned up after firing (`this.debounceTimers.delete(timerKey)`), and the `unwatch()` method clears all timers for a watcher ID. This is well-handled.

---

## Architectural Decisions vs Similar Apps

### Comparison targets
- **Responsively App** — Open-source, Electron-based responsive viewer
- **Sizzy** — Commercial browser for responsive development
- **BrowserStack** — Cloud-based multi-device testing
- **Polypane** — Commercial multi-pane browser
- **Storybook** — Component preview/testing

### Decision Matrix

| Decision | Kaleidoscope | Industry Standard | Verdict |
|----------|-------------|-------------------|---------|
| **Live reload transport** | SSE (EventSource) | WebSocket (BrowserSync, Storybook) | **Good choice.** SSE is simpler for unidirectional file-change notifications. Less overhead than WebSocket. |
| **Preview method** | iframes in browser | Dedicated webviews (Responsively, Polypane), cloud VMs (BrowserStack) | **Standard approach.** Same as Sizzy. X-Frame-Options proxy is a smart mitigation for the main iframe limitation. |
| **State management** | `useState` + prop drilling | Context/Zustand/Redux (most React apps of this size) | **Acceptable for now.** 14 props to Sidebar is the pain point. Would benefit from extraction as features grow. |
| **Dark mode** | Manual `document.body.classList` + MutationObserver | `next-themes`, CSS `prefers-color-scheme`, React context | **Deviation.** `next-themes` is installed but unused. The MutationObserver pattern is fragile and non-standard. |
| **Auth handling** | Server-side proxy with cookie injection + mock data fallback | Not typically offered in responsive preview tools | **Novel and valuable.** No competitors offer this. The fallback to mock data injection when auth fails is particularly clever. |
| **MCP integration** | Full MCP server with preview, screenshot, and proxy tools | Unique — no responsive preview tool has AI integration | **Differentiator.** Well-structured with proper error handling and process management. |
| **Screenshot capture** | Server-side Playwright | Cloud services (BrowserStack), Puppeteer | **Good choice.** Playwright has better defaults and cross-browser support than Puppeteer. |
| **Tunneling** | localtunnel (pure JS) | ngrok (Responsively), BrowserSync built-in | **Fine for default.** Provider fallback chain (localtunnel → ngrok → cloudflared) is well-designed. |
| **Routing** | wouter | react-router (industry default) | **Good choice.** wouter is 2KB vs react-router's 20KB+, appropriate for a 2-route app. |
| **Flow diagrams** | @xyflow/react with localStorage persistence | Not typical for this app category | **Interesting addition.** Well-implemented. The module-level counter was the only issue (now fixed). |
| **Build system** | Vite 7 + esbuild | Vite or webpack | **Current best practice.** |
| **Testing** | Vitest + happy-dom + Playwright | Jest/Vitest + jsdom/happy-dom | **Good.** 218 behavioral tests with happy-dom is solid coverage. |
| **Docker** | Multi-stage Dockerfile + docker-compose for prod | Standard for production deployment | **Good.** Proper separation of build and runtime stages. |

### Key Deviations

1. **Dark mode via DOM manipulation instead of `next-themes`**: `next-themes` is installed but bypassed. The manual approach works but creates coupling between components via global DOM state. This is the clearest "unnecessary deviation" in the codebase.

2. **No global state library despite installing Zustand**: The prop drilling in `home.tsx` (14 props to Sidebar) suggests Zustand was intended but never adopted. Given the current feature set, this is acceptable but will become painful with additional features.

3. **Auth proxy as a first-class feature**: This is unusual for the category and a genuine differentiator. The mock data injection fallback is particularly innovative — it allows previewing auth-gated pages without real credentials.

---

## Test Quality Assessment

**Coverage:** The 218 tests across 16 files provide good behavioral coverage:
- Device selection, preview flow, URL submission
- Live reload (SSE connection, watcher start/stop, reload events)
- Tunnel creation/closing
- Auth wizard (proxy session creation, mock data injection)
- Screenshot flow (device selection, capture, results)
- Flow diagrams (node CRUD, search, save/load)
- Keyboard navigation (arrow keys, spacebar pin, C for compare)
- Edge cases (error states, empty states, loading states)

**Warnings:** Several non-critical warnings in test output:
- `act()` warnings in live-reload tests (SSE mock timing)
- `Query data cannot be undefined` in keyboard-navigation tests (QueryClient default behavior)
- happy-dom `AsyncTaskManager` abort errors in device-preview-flow tests (iframe navigation after cleanup)

These are test-environment artifacts and do not indicate production bugs.

---

## File Structure Summary

```
Kaleidoscope/
├── server/                          # Express 4 backend
│   ├── index.ts                     # Entry: CORS, SSE endpoint, graceful shutdown
│   ├── routes.ts                    # Route registration
│   ├── types.ts                     # HealthResponse interface
│   ├── routes/
│   │   ├── proxy.routes.ts          # SSRF-protected auth proxy endpoints
│   │   ├── screenshot.routes.ts     # Playwright screenshot endpoints
│   │   ├── tunnel.routes.ts         # localtunnel CRUD
│   │   └── watcher.routes.ts        # File watcher with SSE broadcast
│   └── services/
│       ├── sse.service.ts           # SSE client management + broadcast
│       ├── proxy.service.ts         # Reverse proxy with cookie injection + mock data
│       ├── screenshot.service.ts    # Playwright browser lifecycle + capture
│       ├── tunnel.service.ts        # Multi-provider tunnel management
│       └── watcher.service.ts       # chokidar file watching with debounce
├── mosaic-client/                   # React 19 + Vite 7 frontend
│   └── src/
│       ├── App.tsx                  # ErrorBoundary, QueryClient, lazy routes
│       ├── pages/
│       │   ├── home.tsx             # Main preview page (14 props to sidebar)
│       │   ├── flow-diagrams.tsx    # XYFlow editor
│       │   └── a-home.tsx           # Catch-all/404
│       ├── components/
│       │   ├── device-frame.tsx     # Iframe-based device preview with key remount
│       │   ├── preview-area.tsx     # Single/comparison view with drag positioning
│       │   ├── sidebar.tsx          # URL input, device list, tunnel, live reload, auth, screenshots
│       │   ├── header.tsx           # Nav + dark mode toggle
│       │   ├── auth-wizard.tsx      # Cookie injection + proxy session + mock data UI
│       │   ├── screenshot-panel.tsx # Multi-device screenshot capture UI
│       │   ├── live-reload-toggle.tsx # SSE-based live reload with file watcher
│       │   ├── tunnel-button.tsx    # Tunnel creation UI
│       │   ├── error-boundary.tsx   # React error boundary
│       │   └── flow/               # Flow diagram components
│       ├── hooks/
│       │   ├── use-socket.tsx       # SSE EventSource with callback refs
│       │   ├── use-tunnel.tsx       # Tunnel state management
│       │   ├── use-recent-urls.tsx  # localStorage recent URLs
│       │   └── use-flow-storage.ts  # localStorage flow persistence
│       ├── lib/
│       │   ├── devices.ts           # Device definitions (canonical source)
│       │   ├── queryClient.ts       # TanStack Query client
│       │   └── utils.ts             # cn() helper
│       └── tests/                   # 16 test files, 218 tests
├── mcp-server/                      # MCP server for AI integration
│   └── src/
│       ├── index.ts                 # McpServer setup + tool registration
│       ├── process-manager.ts       # Spawn/manage client + server processes
│       └── tools/
│           ├── preview.ts           # preview_responsive, kaleidoscope_status/start/stop
│           ├── proxy.ts             # preview_with_auth, inject_mock_data
│           └── screenshot.ts        # capture_screenshots
├── examples/                        # Sample apps for testing
├── Dockerfile                       # Multi-stage production build
├── docker-compose.yml               # Development compose
└── docker-compose.prod.yml          # Production compose
```
