# Kaleidoscope Extension Roadmap

Ways the project can be extended and made even more valuable.

---

## Tier 1 — High Impact, Low Effort

### 1. Visual Regression Testing
**What:** Compare screenshots before/after a code change and highlight pixel differences.
**Why:** Every responsive preview tool user eventually wants "did my CSS change break anything?". This is a natural extension of the existing screenshot system.
**How:** After capturing screenshots, store them as baselines. On the next capture, diff against baselines using `pixelmatch` or `resemble.js`. Surface the diff overlay in the UI.
**Builds on:** `screenshot.service.ts`, `screenshot-panel.tsx`

### 2. Shared Device List (Single Source of Truth)
**What:** Extract the device definitions to a shared package/JSON at the monorepo root.
**Why:** The same 8 devices are currently duplicated in 5 files. Any addition or change requires updating all 5.
**How:** Create `shared/devices.json`. Import it from client, server, and MCP server. The screenshot service and routes should read from this shared source.
**Builds on:** `lib/devices.ts`, `screenshot.service.ts`, `screenshot.routes.ts`, `screenshot-panel.tsx`, `mcp-server/src/tools/preview.ts`

### 3. URL History Sync & Bookmarks
**What:** Allow users to bookmark frequently tested URLs, organize them into groups (e.g., "Production", "Staging", "PR Preview"), and optionally sync across sessions via the server.
**Why:** Developers repeatedly test the same URLs. The current "recent URLs" list is basic localStorage.
**How:** Add a bookmarks system with labels/groups. Optionally persist to server for team sharing.
**Builds on:** `use-recent-urls.tsx`, `sidebar.tsx`

### 4. Annotation & Comments on Previews
**What:** Click on a specific point in the device preview and leave a comment/annotation (like Figma comments).
**Why:** Design review workflows need feedback pinned to specific elements/locations.
**How:** Overlay a transparent canvas on each DeviceFrame. Click to place markers. Store annotations with screenshot coordinates, device ID, and URL.
**Builds on:** `device-frame.tsx`, `preview-area.tsx`

### 5. Custom Device Profiles
**What:** Let users define their own device profiles (name, width, height, type, pixel ratio).
**Why:** New devices launch constantly. Custom breakpoints matter for specific projects.
**How:** Add a "Custom Device" form in the sidebar. Save to localStorage or server. Feed into the shared device list.
**Builds on:** `lib/devices.ts`, `sidebar.tsx`

---

## Tier 2 — High Impact, Medium Effort

### 6. Performance Metrics Dashboard
**What:** Show Core Web Vitals (LCP, FID, CLS), page load time, and resource sizes for each device preview.
**Why:** Responsive performance varies dramatically by device. A 4K desktop loads differently than an iPhone.
**How:** Use the Playwright `page.evaluate()` to collect `PerformanceObserver` data during screenshot capture. Add a Performance tab to the sidebar showing metrics per device.
**Builds on:** `screenshot.service.ts`, sidebar

### 7. Team Collaboration (Shared Sessions)
**What:** Allow multiple users to view the same preview session in real-time, with cursor tracking and annotations.
**Why:** Remote design reviews require shared context. Currently each user runs their own instance.
**How:** Use the existing SSE infrastructure to broadcast session state. Add room/session concepts. Share current URL, device selection, and annotations via SSE events.
**Builds on:** `sse.service.ts`, server infrastructure

### 8. CSS Breakpoint Visualizer
**What:** Parse the target site's CSS and visualize which media queries are active at each device width. Show a "breakpoint ruler" indicating where designs shift.
**Why:** Understanding which breakpoints fire at which widths is fundamental to responsive design debugging.
**How:** Inject a script via the proxy that reads `document.styleSheets`, extracts `@media` rules, and reports which are active. Overlay breakpoint indicators on the preview.
**Builds on:** `proxy.service.ts`, `device-frame.tsx`

### 9. Accessibility Audit per Device
**What:** Run `axe-core` or similar accessibility checks on each device viewport and report issues per device.
**Why:** Accessibility issues can be viewport-specific (e.g., touch targets too small on mobile, contrast issues with different layouts).
**How:** Inject `axe-core` via the proxy or use Playwright to run `axe.run()` during screenshot capture. Surface results in a dedicated Accessibility panel.
**Builds on:** `proxy.service.ts`, `screenshot.service.ts`

### 10. Network Throttling Simulation
**What:** Simulate different network speeds (3G, 4G, WiFi) to see how pages load on slower connections per device type.
**Why:** Mobile users often have slower connections. A page that loads instantly on desktop WiFi may be unusable on 3G.
**How:** Use Playwright's `page.route()` or Chrome DevTools Protocol to throttle network in screenshots. For live preview, add a network profile selector that configures proxy response delays.
**Builds on:** `screenshot.service.ts`, `proxy.service.ts`

---

## Tier 3 — Medium Impact, Medium Effort

### 11. Dark Mode / Theme Preview Toggle
**What:** Toggle between light mode, dark mode, and system preference for previewed sites, directly from the Kaleidoscope UI.
**Why:** Testing light/dark modes across devices is a common workflow. Currently requires the target site to handle it.
**How:** Inject `prefers-color-scheme` media override via the proxy (using CSS `@media` injection or Playwright's `page.emulateMedia`). Add a light/dark/system toggle to the toolbar.
**Builds on:** `proxy.service.ts`, header/toolbar

### 12. Export Design Report (PDF/HTML)
**What:** Generate a polished report with all device screenshots, annotations, performance metrics, and accessibility findings.
**Why:** Design reviews need shareable artifacts. A "responsive audit report" is valuable for client presentations.
**How:** Use Playwright to render a report template to PDF. Include screenshots, metrics, and any annotations. Expose via MCP tool and UI button.
**Builds on:** `screenshot.service.ts`, MCP tools

### 13. Plugin System
**What:** Allow third-party extensions (CSS injection, custom device frames, theme overrides, custom analysis).
**Why:** The inspection/analysis possibilities are infinite. A plugin system lets the community extend without core changes.
**How:** Define a plugin interface with hooks (onPageLoad, onDeviceChange, onScreenshot). Load plugins from a `plugins/` directory. Expose plugin API for injecting UI panels and proxy middleware.
**Builds on:** Core architecture

### 14. Storybook Integration
**What:** Browse and preview Storybook stories across devices instead of just URLs.
**Why:** Component-level responsive testing is as important as page-level. Storybook is the de facto component workshop.
**How:** Detect Storybook instances, list available stories via Storybook API, and preview each story's iframe URL across devices.
**Builds on:** Sidebar, device preview system

### 15. CI/CD Integration
**What:** Run Kaleidoscope as a CLI tool in CI pipelines to capture screenshots, run visual regression tests, and post results as PR comments.
**Why:** Catching responsive regressions before merge is the ultimate workflow integration.
**How:** Create a `kaleidoscope` CLI that wraps the server + screenshot service. Accept a config file listing URLs and devices. Output results as JSON. Build a GitHub Action that posts screenshot comparisons on PRs.
**Builds on:** `screenshot.service.ts`, MCP tools, server

---

## Tier 4 — Moonshots

### 16. AI-Powered Layout Analysis
**What:** Use Claude to analyze screenshots and identify responsive layout issues (overlapping elements, clipped text, inaccessible touch targets, inconsistent spacing).
**Why:** Manual visual inspection across 8 devices is tedious. AI can flag issues humans miss.
**How:** Capture screenshots via existing system. Send to Claude Vision API with a prompt asking for responsive layout critique. Surface findings in the UI.
**Builds on:** MCP server, `screenshot.service.ts`

### 17. Real Device Cloud
**What:** Connect to BrowserStack/Sauce Labs APIs to preview on real devices instead of simulated viewports.
**Why:** iframe-based simulation can't capture real browser rendering differences, font rendering, or native scrolling behavior.
**How:** Add a "Real Device" provider alongside the iframe previews. Stream real device screenshots back via WebSocket.
**Builds on:** Core architecture, new service

### 18. Figma/Design Token Comparison
**What:** Import Figma designs and overlay them semi-transparently on the live preview to compare implementation vs design.
**Why:** "Does this match the design?" is the most common question in responsive development.
**How:** Use the Figma API to export frames at device-specific sizes. Overlay on the preview with adjustable opacity. Highlight pixel differences.
**Builds on:** `preview-area.tsx`, new Figma integration

---

## Priority Matrix

```
                    Low Effort ──────────────────── High Effort
                    │                                        │
High Impact         │  [1] Visual Regression                 │
                    │  [2] Shared Device List                 │
                    │  [3] URL Bookmarks                     │
                    │  [5] Custom Devices                    │
                    │              [6] Performance Metrics    │
                    │              [7] Team Collaboration     │
                    │              [8] CSS Breakpoints        │
                    │              [9] Accessibility Audit    │
                    │              [10] Network Throttling    │
                    │                                        │
                    │                                        │
Medium Impact       │  [4] Annotations                       │
                    │              [11] Dark Mode Toggle      │
                    │              [12] Export Report          │
                    │              [14] Storybook Integration │
                    │              [15] CI/CD Integration     │
                    │                        [13] Plugins     │
                    │                        [16] AI Analysis │
                    │                        [17] Real Devices│
                    │                        [18] Figma       │
                    │                                        │
```

## Recommended Implementation Order

1. **Shared Device List** (#2) — Immediate technical debt fix, 30 min
2. **Custom Device Profiles** (#5) — Natural user request, unlocks flexibility
3. **Visual Regression Testing** (#1) — Highest value feature, builds on existing screenshot system
4. **URL Bookmarks** (#3) — Quality of life, fast to implement
5. **CSS Breakpoint Visualizer** (#8) — Unique differentiator in the space
6. **Performance Metrics** (#6) — Leverages existing Playwright, high perceived value
7. **Accessibility Audit** (#9) — Increasingly demanded, pairs well with responsive testing
8. **CI/CD Integration** (#15) — Opens the tool to team/enterprise adoption
9. **Export Report** (#12) — Pulls together screenshots + metrics + a11y into deliverable output
10. **AI Layout Analysis** (#16) — Leverages the MCP server differentiator uniquely

---

## Competitive Landscape

| Feature | Kaleidoscope | Responsively | Sizzy | BrowserStack | Polypane |
|---------|:---:|:---:|:---:|:---:|:---:|
| Multi-device preview | Yes | Yes | Yes | Yes | Yes |
| Free / open source | Yes | Yes | No | No | No |
| Auth proxy + mock data | **Yes** | No | No | No | No |
| MCP / AI integration | **Yes** | No | No | No | No |
| Screenshots | Yes | No | Yes | Yes | Yes |
| Tunneling | Yes | No | No | BrowserStack Local | No |
| Flow diagrams | **Yes** | No | No | No | No |
| Visual regression | Planned | No | No | Yes | Yes |
| Performance metrics | Planned | No | No | Yes | Yes |
| Real devices | No | No | No | **Yes** | No |

Kaleidoscope's unique advantages are the auth proxy with mock data injection, MCP AI integration, and the flow diagram editor. These are genuine differentiators that no competitor offers.
