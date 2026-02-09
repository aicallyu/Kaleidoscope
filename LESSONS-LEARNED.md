# Kaleidoscope — Lessons Learned

Mistakes made, decisions taken, and what we learned from building this project.

---

## Mistakes

### 1. Socket.IO for one-way communication
**What happened:** Used Socket.IO (a bidirectional WebSocket library) for live reload events, which only flow one direction: server → client. The client never sends anything back over the socket.

**Why it was wrong:** Socket.IO adds ~410 lines of dependency for something the native browser `EventSource` API does in zero dependencies. It also required configuring CORS separately for the socket server.

**What we did:** Replaced Socket.IO with Server-Sent Events (SSE). Created a lightweight `sseService` that manages connected clients and broadcasts events. The `useSocket` hook now uses native `EventSource`. Removed `socket.io` and `socket.io-client` from both packages.

**Lesson:** Choose the simplest tool that solves the actual problem. If communication is one-way, SSE is always sufficient. Only reach for WebSockets when the client needs to send data back.

---

### 2. Watcher route logged but never emitted
**What happened:** The file watcher route handler had:
```typescript
(event) => {
  console.log(`File ${event.type}: ${event.path}`);
  // Never actually pushed the event to clients
}
```
The Socket.IO connection was established, `isConnected` showed `true`, the toggle button looked functional — but file changes were silently swallowed.

**Why it was wrong:** The feature appeared to work at every level (UI showed "Connected", SSE/WebSocket handshake succeeded) but the actual behavior (iframe reloads on file change) never happened.

**What we did:** Added `sseService.broadcast('reload', ...)` to the handler. Also discovered the client never called `POST /api/watcher/start` — so even with the emit fix, the watcher was never initialized.

**Lesson:** "Connected" doesn't mean "working." Test the full chain end-to-end: file changes → server detects → server pushes event → client receives → iframe remounts. Unit tests that mock the middle layers will never catch this.

---

### 3. authCookies prop passed through but never used
**What happened:** `home.tsx` captured auth cookies from the AuthWizard, stored them in state, and passed them down through `PreviewArea` → `DeviceFrame`. In DeviceFrame, the prop was assigned to a variable `authApplied` that was never read.

**Why it was wrong:** Auth actually works through the proxy URL — the server injects cookies server-side. The client-side prop chain was dead code that made it look like cookies were being applied to iframes (they weren't and can't be due to same-origin policy).

**What we did:** Removed the `authCookies` prop from `DeviceFrame` and `PreviewArea`. Cleaned up `home.tsx` to stop storing cookies in state (the `handleAuthCapture` callback still triggers a reload, which is the useful part).

**Lesson:** Understand the security model. Browser same-origin policy means you can't inject cookies into cross-origin iframes from JavaScript. The only way is server-side proxy injection. Once you understand that, the client-side prop chain is obviously dead code.

---

### 4. Screenshots ignored the proxy URL
**What happened:** Both `PreviewArea`'s screenshot handler and `ScreenshotPanel` always sent `currentUrl` (the direct URL) to the screenshot API, even when a proxy session was active. So screenshots of auth-protected pages captured the login screen instead of the actual content.

**What we did:** Changed both to use `proxyUrl || currentUrl`. Threaded `proxyUrl` from `home.tsx` → `Sidebar` → `ScreenshotPanel`.

**Lesson:** When you add a "proxy mode" to an app, audit every place that uses the original URL. Screenshots, reloads, status checks — anything that hits the URL needs to be aware of the proxy.

---

### 5. autoDetectPort was a stub
**What happened:** `autoDetectPort()` had a comment saying "In a real implementation, we'd check if ports are actually listening" and just returned `3000` unconditionally.

**What we did:** Replaced with actual port probing using `fetch()` with a 1-second timeout against each common port (3000, 5173, 8080, 4200, 8000, 3001).

**Lesson:** Don't leave stubs with TODO comments. Either implement the feature or don't expose the API endpoint. A stub that returns hardcoded data is worse than a missing feature — it silently gives wrong answers.

---

### 6. Proxy session cleanup defined but never called
**What happened:** `proxyService.cleanExpired()` was a fully implemented method that iterated sessions and removed ones older than 1 hour. It was never called from anywhere.

**What we did:** Added a `setInterval` in `server/index.ts` that calls `cleanExpired()` every 10 minutes. The interval is cleared on graceful shutdown.

**Lesson:** After writing a utility method, immediately wire it up. If you plan to "add the call later," add a failing test now that reminds you.

---

### 7. Non-functional layout buttons
**What happened:** Comparison mode had "Rows" and "Grid" buttons that visually indicated layout state (based on device count) but had no `onClick` handlers. Users could see them but clicking did nothing.

**What we did:** Removed them. The layout auto-adapts based on device count, and manual override wasn't needed.

**Lesson:** Don't render UI elements that promise interaction but deliver nothing. Either wire them up or don't show them.

---

### 8. Tests tested "does it run" not "does it work"
**What happened:** The initial 90 tests verified that components render, buttons fire callbacks, and mocked API calls succeed. But they never tested:
- Does enabling live reload actually start the file watcher?
- Do screenshots use the proxy URL when auth is active?
- Does the auth cookie flow actually reach the iframe?

Every test mocked the integration boundary and only tested one side.

**What we did:** Added 128 behavioral tests across 8 new test files that test cross-component flows: live reload end-to-end, proxy URL propagation, screenshot with auth, tunnel lifecycle, flow diagram sidebar + search.

**Lesson:** The question isn't "does the component render with these props?" — it's "when the user does X, does Y happen?" Test the behavior the user expects, not the implementation you wrote.

---

## Key Architecture Decisions

### Server-side proxy over browser extension
Auth-protected sites block iframe embedding with `X-Frame-Options` and `Content-Security-Policy`. We chose a server-side proxy that strips these headers, rather than a browser extension.

**Tradeoff:** More complex (full proxy service) but works universally without requiring users to install anything. Claude can also control it via MCP.

### Mock data at the proxy layer, not source code modification
When auth fails, Claude generates mock API responses and injects them into the proxy. The proxy intercepts matching requests and returns mocks at runtime.

**Tradeoff:** Mocks are ephemeral (lost when session ends) but the user's codebase is never touched. This is safer than modifying source files and hoping you can clean up.

### SSE over WebSocket for live reload
Communication is strictly one-directional (server → client). SSE uses native `EventSource`, auto-reconnects, and works over standard HTTP with no extra dependencies.

**Tradeoff:** Can't send data client → server over the same connection. But we never needed to — the client talks to the server via REST API.

### All state in home.tsx, no global store
The component tree is 2-3 levels deep. Props flow down, callbacks flow up. No Redux, no Zustand, no Context (except for React Query's server state cache).

**Tradeoff:** Prop drilling is verbose but fully traceable. Every data flow is visible in the JSX. This caught the dead `authCookies` prop quickly once we looked.

### playwright-core instead of full Playwright
Full Playwright downloads its own Chromium (~150MB) which fails in sandboxed environments. We use `playwright-core` and point it at a pre-cached binary.

**Tradeoff:** Requires a Chromium binary to already exist on the system. Works perfectly in environments that have one (CI, Docker images, dev machines with Playwright installed).

---

## Testing Principles (learned the hard way)

1. **Test behavior, not implementation.** "When I click Enable, does the watcher start?" not "Does the hook pass `autoConnect: true`?"

2. **Test the integration boundaries.** If Component A passes data to Component B via props, test that the data arrives and is used — don't mock B away entirely.

3. **If a feature looks functional in the UI but doesn't actually work, your tests are lying to you.** The watcher bug proved this — "Connected" status + passing tests + broken feature.

4. **Audit every URL usage when adding proxy mode.** Anywhere the app uses a URL (iframes, screenshots, API calls) needs to be aware that the URL might be proxied.

5. **Don't leave stubs in production code.** If `autoDetectPort` returns hardcoded `3000`, either implement it or remove the endpoint. A stub is a bug that passes all your tests.

6. **Run the full chain at least once.** Even if you can't write automated E2E tests for everything, manually verify: file change → watcher → SSE → iframe reload. That one manual test would have caught 3 of our bugs.
