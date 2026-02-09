# Kaleidoscope - Session Summary
**Last Updated:** 2026-02-08
**Branch:** `claude/project-review-rmygA`
**Status:** Week 1-2 Complete ✅ | Ready for Week 3-4

---

## 🎯 Project Overview

**What is Kaleidoscope?**
- Responsive design preview tool for multiple device sizes simultaneously
- Target users: Claude Code developers who can't preview localhost before pushing to production
- Self-hosted web application (users run locally)
- Monorepo: `mosaic-client` (React frontend) + `server` (Express backend)

**Business Model:**
- Free tier + Pro ($9/mo) + Team ($29/mo)
- Web-only platform (no mobile apps)
- Self-hosted (users run on their machines)

---

## 🏗️ Tech Stack

### Frontend (mosaic-client)
- **Framework:** React 19.1 + TypeScript + Vite
- **Styling:** Tailwind CSS v4 + shadcn/ui components
- **State Management:** @tanstack/react-query
- **WebSocket:** socket.io-client
- **Testing:** Vitest (unit) + Playwright (E2E)

### Backend (server)
- **Framework:** Express.js + TypeScript
- **Real-time:** Socket.IO (WebSocket server)
- **File Watching:** chokidar
- **Tunneling:** localtunnel (primary), ngrok/cloudflared (fallbacks)
- **Testing:** Vitest

### Infrastructure
- **Monorepo:** npm workspaces
- **Dev Tools:** tsx (TypeScript execution), nodemon (hot reload)
- **Containerization:** Docker Compose (setup ready, not required)

---

## ✅ What's Been Built (Week 1-2)

### 1. 🌐 Tunnel System - "Share Your Localhost"
**Problem Solved:** Make localhost:3000 accessible from anywhere

**Implementation:**
- **Backend:** `server/services/tunnel.service.ts` (181 lines)
  - Multi-provider architecture: localtunnel → ngrok → cloudflared
  - Singleton service with lifecycle management
  - Auto-cleanup on process exit
  - API: `/api/tunnel/create`, `/api/tunnel/:port`, `/api/tunnel/auto-detect`

- **Frontend:** `mosaic-client/src/hooks/use-tunnel.tsx` (125 lines)
  - React Query-based state management
  - Real-time status polling (10s interval)
  - Automatic error handling and retry logic

- **UI:** `mosaic-client/src/components/tunnel-button.tsx` (118 lines)
  - One-click tunnel creation
  - Public URL display with copy/open buttons
  - Visual status indicators (grey → green)

**How It Works:**
```
localhost:3000 → localtunnel → https://random-name.loca.lt → Public Internet
```

**Key Decision:** Used localtunnel (pure JS) as primary because ngrok installation failed (HTTP 403 from equinox.io)

---

### 2. 🔄 Live Reload System - "Instant Preview Updates"
**Problem Solved:** Eliminate manual refresh after code changes

**Implementation:**
- **Backend Watcher:** `server/services/watcher.service.ts` (124 lines)
  - chokidar-based file watching
  - Debounced change events (500ms default) to prevent "reload storms"
  - Smart ignore patterns (node_modules, .git, dist, build)
  - API: `/api/watcher/start`, `/api/watcher/stop/:id`, `/api/watcher`

- **Backend WebSocket:** Modified `server/index.ts`
  - Socket.IO server setup with CORS
  - Emits `reload` events on file changes
  - Global `io` instance accessible to services
  - Ping/pong heartbeat for connection health

- **Frontend Socket:** `mosaic-client/src/hooks/use-socket.tsx` (63 lines)
  - WebSocket connection management
  - Auto-reconnection with exponential backoff
  - Event handler registration (on/off/emit)
  - Connection status tracking

- **UI:** `mosaic-client/src/components/live-reload-toggle.tsx` (108 lines)
  - Enable/disable live reload toggle
  - Connection status indicator (Connected ✓ / Disconnected)
  - Last reload timestamp display

**How It Works:**
```
File System → chokidar → Debounce (500ms) → Socket.IO → Frontend → Reload iframes
```

**Reload Mechanism:** Uses iframe `key` prop to force React remount
```typescript
<iframe key={iframeKey} src={url} />
// Changing key destroys and recreates iframe (forces fresh load)
```

---

### 3. 🔐 Auth Wizard - "Preview Authenticated Pages"
**Problem Solved:** Preview pages that require login (dashboards, admin panels)

**Implementation:**
- **UI:** `mosaic-client/src/components/auth-wizard.tsx` (224 lines)
  - Two-tab interface: Simple (1 cookie) & Advanced (multiple cookies)
  - Clear DevTools instructions for cookie capture
  - Password-style value hiding for security
  - Add/remove multiple cookies
  - Clear and apply actions

**Cookie Injection Strategy:**
```typescript
interface AuthCookie {
  name: string;   // e.g., "session_token"
  value: string;  // e.g., "abc123xyz..."
}
```

**How It Works:**
1. User logs into site in separate tab
2. Opens DevTools → Application → Cookies
3. Copies cookie name/value
4. Enters in Auth Wizard
5. Clicks "Apply & Preview"
6. All device frames receive cookies and attempt injection

**Critical Limitation - Browser Security:**
- ✅ **Works:** localhost:5173 (Kaleidoscope) → localhost:3000 (user app)
- ❌ **Blocked:** localhost:5173 → https://production-site.com (cross-origin)
- **Why:** Browsers block cross-origin cookie injection for security
- **Future Solution:** Proxy server (deferred to later phase)

**Documentation:** Clear warning shown in UI about cross-origin limitations

---

## 📁 File Structure

### New Files Created (12 files)

**Backend Services:**
```
server/
├── services/
│   ├── tunnel.service.ts       (181 lines) - Tunnel management
│   └── watcher.service.ts      (124 lines) - File watching
└── routes/
    ├── tunnel.routes.ts        (112 lines) - Tunnel API
    └── watcher.routes.ts       (76 lines)  - Watcher API
```

**Frontend Hooks:**
```
mosaic-client/src/hooks/
├── use-tunnel.tsx              (125 lines) - Tunnel state management
└── use-socket.tsx              (63 lines)  - WebSocket connection
```

**Frontend Components:**
```
mosaic-client/src/components/
├── tunnel-button.tsx           (118 lines) - Tunnel UI
├── live-reload-toggle.tsx      (108 lines) - Live reload UI
└── auth-wizard.tsx             (224 lines) - Auth cookie capture UI
```

**Documentation:**
```
docs/
├── WEEK1-2-SUMMARY.md          - Week 1-2 progress report
└── WEEK1-2-COMPLETE.md         - Completion summary
```

**Examples:**
```
examples/
├── sample-site/                - Test site (port 3000)
│   └── server.js
└── auth-demo/                  - Auth demo (port 3001)
    └── server.js
```

### Modified Files (8 files)

**Backend Integration:**
- `server/index.ts` - Added Socket.IO server, HTTP server wrapper
- `server/routes.ts` - Registered tunnel and watcher routes
- `server/package.json` - Added dependencies (localtunnel, chokidar, socket.io)

**Frontend Integration:**
- `mosaic-client/src/pages/home.tsx` - Added reloadTrigger, authCookies state
- `mosaic-client/src/components/sidebar.tsx` - Integrated 3 new components
- `mosaic-client/src/components/preview-area.tsx` - Pass reload/auth props
- `mosaic-client/src/components/device-frame.tsx` - **CRITICAL:** Removed localhost blocking, added reload/auth handling
- `mosaic-client/package.json` - Added dependencies (socket.io-client, @tanstack/react-query)

---

## 🔑 Critical Changes

### 1. Localhost Blocking Removed
**File:** `mosaic-client/src/components/device-frame.tsx`

**Before:**
```typescript
// Blocked localhost URLs for security
if (url.includes('localhost') || url.includes('127.0.0.1')) {
  return <div>Error: localhost URLs not supported</div>;
}
```

**After:**
```typescript
// Removed blocking - users can now preview localhost!
<iframe src={url} ... />
```

**Impact:** This was the #1 blocker for the core use case - previewing local development servers.

### 2. State Flow Architecture
**Component Hierarchy:**
```
home.tsx (state container)
├── reloadTrigger: number
├── authCookies: AuthCookie[]
└── currentUrl: string
    ↓
sidebar.tsx (controls)
├── TunnelButton (creates public URLs)
├── LiveReloadToggle (triggers reloadTrigger++)
└── AuthWizard (captures authCookies)
    ↓
preview-area.tsx (layout)
├── Passes props to all frames
    ↓
device-frame.tsx (renderer)
├── Watches reloadTrigger → changes iframeKey
├── Watches authCookies → attempts injection
└── iframe key={iframeKey} (forces reload on key change)
```

---

## 🐛 Issues Encountered & Solutions

### Issue 1: ngrok Installation Failed
**Error:** `HTTP 403` when downloading ngrok binary from equinox.io
**Root Cause:** npm postinstall script couldn't access download server
**Solution:**
- Pivoted to `localtunnel` as primary provider (pure JavaScript, no binary)
- Kept ngrok as fallback for users who manually install it
- Added cloudflared as third fallback option
**Impact:** Zero user impact, tunnel feature works perfectly

### Issue 2: Module Resolution (.js extensions)
**Error:** TypeScript ES modules require `.js` extensions in imports
**Example:** `import { tunnel } from "./services/tunnel.service"`
**Solution:** Added `.js` extensions to all imports
**Fixed:** `import { tunnel } from "./services/tunnel.service.js"`

### Issue 3: File Read Before Edit
**Error:** Attempted to edit files without reading them first (tool requirement)
**Solution:** Always read files before editing
**Process:** `Read → Edit` (never skip the Read step)

---

## 📊 Statistics

### Code Volume
- **Total Lines Added:** ~1,700 lines
- **Backend Code:** ~500 lines (services + routes)
- **Frontend Code:** ~640 lines (hooks + components)
- **Integration Code:** ~200 lines (modified files)
- **Documentation:** ~360 lines

### Commits Pushed
**Branch:** `claude/project-review-rmygA`

1. `ef02714` - Initial setup (testing, Docker, samples)
2. `ed4d56c` - Documentation (README, DEVELOPMENT)
3. `3cbd354` - Tunnel system implementation
4. `d5cf1ce` - Live reload system implementation
5. `41decd7` - Integration of tunnel + live reload
6. `adccf6e` - Auth wizard implementation
7. `5649af0` - Week 1-2 completion summary

**Status:** All changes committed and pushed ✅

---

## 🚀 How to Use (User Workflow)

### Scenario: Preview a Dashboard with Authentication

**Setup (Terminal):**
```bash
# Terminal 1: User's dev server
cd my-dashboard-app
npm run dev  # Runs on localhost:3000

# Terminal 2: Kaleidoscope
cd Kaleidoscope
npm run dev:all  # mosaic-client on :5173, server on :5000
```

**In Kaleidoscope UI:**

1. **Enter URL**
   - Type: `http://localhost:3000`
   - See preview across 8 device frames

2. **Share with Team** (optional)
   - Click "Enable Tunnel" in "Share Localhost" section
   - Get public URL: `https://cool-tiger-42.loca.lt`
   - Copy/share URL → teammates can view on their devices
   - Tunnel stays active as long as Kaleidoscope runs

3. **Enable Auto-Refresh**
   - Toggle "Enable Live Reload" in "Auto Refresh" section
   - Status shows "Connected ✓"
   - Edit `my-dashboard-app/src/Dashboard.tsx` → save
   - All 8 frames refresh instantly (~500ms after save)

4. **Add Authentication** (if app requires login)
   - Log into localhost:3000 in separate browser tab
   - Open DevTools (F12) → Application → Cookies
   - Find session cookie (e.g., "session_token")
   - Copy name and value
   - In Kaleidoscope: Click "Preview with Auth"
   - Enter cookie name: `session_token`
   - Enter cookie value: `abc123...`
   - Click "Apply & Preview"
   - All frames reload with cookies → see logged-in content

5. **Develop**
   - Make changes in code editor
   - See instant updates across all devices
   - Share tunnel URL for real-time collaboration
   - Test responsive behavior (iPhone, iPad, Desktop, etc.)

---

## 🎯 Current State

### What Works ✅
- Tunnel creation with localtunnel (public URL for localhost)
- Live reload on file changes (debounced, WebSocket-based)
- Auth cookie capture and injection (localhost-to-localhost)
- Full UI integration in sidebar
- 8 device preview frames (iPhone, iPad, Desktop, etc.)
- Real-time status indicators
- Copy/open/share functionality
- Connection health monitoring

### Known Limitations ⚠️
1. **Cross-origin auth cookies blocked** by browser security
   - Works: localhost → localhost ✅
   - Blocked: localhost → production site ❌
   - Future: Proxy server required

2. **X-Frame-Options blocks some sites**
   - Sites with `X-Frame-Options: DENY` won't load in iframes
   - This is their security policy
   - Cannot be bypassed without proxy

3. **Tunnel URLs are temporary**
   - localtunnel URLs expire after inactivity
   - Meant for short-term sharing
   - Not for permanent deployment

### Testing Status
- **Infrastructure:** Vitest + Playwright configured ✅
- **Sample Projects:** 2 examples created (sample-site, auth-demo) ✅
- **Test Files:** Basic tests written ✅
- **Manual Testing:** All features tested manually ✅
- **CI/CD:** Not configured yet

---

## 📋 What's Next (Week 3-4)

### Planned Features

#### 1. MCP Server Integration (Priority 1)
**Goal:** Let Claude Code control Kaleidoscope via Model Context Protocol

**Tools to Implement:**
```typescript
// Tool 1: Start responsive preview
preview_responsive(url: string, devices?: string[])
→ Returns: Preview URL + status

// Tool 2: Capture screenshots
capture_screenshots(url: string, devices: string[], quality: 'basic' | 'hd')
→ Returns: Array of screenshot paths
```

**Architecture:**
```
Claude Code → MCP Server → Kaleidoscope Server → Preview
```

**Files to Create:**
- `mcp-server/src/index.ts` - MCP server entry point
- `mcp-server/src/tools/preview.ts` - preview_responsive tool
- `mcp-server/src/tools/screenshot.ts` - capture_screenshots tool
- `mcp-server/src/process-manager.ts` - Start/stop Kaleidoscope
- `mcp-server/package.json` - MCP server dependencies

**Dependencies:**
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- Process management for starting Kaleidoscope server

#### 2. Screenshot Tools (Priority 2)
**Two Quality Options:**

**Basic Screenshots (Fast):**
- Library: html2canvas
- Client-side rendering
- Fast but lower quality
- Good for quick checks

**HD Screenshots (High Quality):**
- Library: Puppeteer
- Server-side rendering
- Slower but perfect quality
- Good for production assets

**API:**
```
POST /api/screenshots
{
  url: string,
  devices: string[],
  quality: 'basic' | 'hd'
}
→ Returns: { screenshots: [{ device, path, url }] }
```

#### 3. Flow Diagrams with Search (Priority 3)
**Goal:** Visualize component flows + interactive search

**Technology:** React Flow
- Drag-and-drop node editor
- Pan/zoom canvas
- Component flow visualization

**Search Feature:**
- Type component name in search bar
- Matching nodes highlight
- All flows connected to that component spotlight
- "Focus mode" to dim unrelated nodes

**Storage:**
- localStorage (auto-save every 30s)
- File export (JSON format)
- File import (restore saved flows)

**UI Components:**
- Flow editor canvas
- Component search bar
- Node palette (add components)
- Export/import buttons

---

## 🔧 Development Commands

### Start Everything
```bash
npm run dev:all          # Starts both client (:5173) and server (:5000)
```

### Individual Services
```bash
cd mosaic-client && npm run dev    # Client only (:5173)
cd server && npm run dev           # Server only (:5000)
```

### Testing
```bash
npm test                 # Run all tests
npm run test:unit        # Vitest unit tests
npm run test:e2e         # Playwright E2E tests
```

### Sample Projects
```bash
cd examples/sample-site && node server.js      # Port 3000
cd examples/auth-demo && node server.js        # Port 3001
```

### Git Operations
```bash
git status                                     # Check current state
git log --oneline -10                          # Recent commits
git push -u origin claude/project-review-rmygA # Push to branch
```

---

## 📚 Documentation Files

### User-Facing
- `README.md` - Quick start guide, features, usage
- `DEVELOPMENT.md` - Architecture, setup, contribution guide

### Progress Tracking
- `PROGRESS.md` - Overall development timeline
- `WEEK1-2-SUMMARY.md` - Week 1-2 progress report
- `WEEK1-2-COMPLETE.md` - Completion summary with stats

### Session Management
- `SESSION-SUMMARY.md` (this file) - Complete context for resuming work

---

## 🎓 Key Learnings & Decisions

### Architectural Decisions

1. **Multi-Provider Tunnel Fallback**
   - Don't depend on single provider
   - Graceful degradation if primary fails
   - Users can add their own providers

2. **Debounced File Watching**
   - 500ms delay prevents reload storms
   - Better UX than instant but spammy reloads
   - Configurable per watcher instance

3. **iframe Key-Based Reload**
   - React's key prop forces unmount/remount
   - Cleaner than iframe.contentWindow.location.reload()
   - Works with all iframe security settings

4. **React Query for Tunnel State**
   - Automatic polling (10s interval)
   - Optimistic updates with rollback
   - Built-in retry and error handling

5. **Socket.IO Over Raw WebSocket**
   - Auto-reconnection out of the box
   - Fallback to polling if WS blocked
   - Better browser compatibility

### Security Considerations

1. **Cross-Origin Cookie Injection**
   - Deliberately limited by browsers
   - Can't bypass without proxy server
   - Honest documentation of limitations

2. **iframe Sandbox Attributes**
   - Using `sandbox="allow-same-origin allow-scripts"`
   - Prevents malicious content from escaping
   - Still allows full functionality for trusted localhost

3. **Tunnel Security**
   - localtunnel URLs are random (hard to guess)
   - Temporary by nature (expire on inactivity)
   - No authentication (by design for ease of use)

### Performance Optimizations

1. **Debounced Events**
   - File watching: 500ms
   - Prevents excessive reloads
   - Configurable per use case

2. **React Query Caching**
   - 10s stale time for tunnel status
   - Reduces API calls
   - Background refetching for freshness

3. **WebSocket Over Polling**
   - Lower latency (~50ms vs 1000ms+)
   - Less server load
   - Better battery life on mobile

---

## 🎯 Critical Context for Next Session

### Must Remember

1. **Branch Name:** `claude/project-review-rmygA`
   - ALL commits go here
   - Do NOT push to main/master
   - Branch must start with `claude/` and end with session ID

2. **Localhost Blocking Is Fixed**
   - Core blocker removed in device-frame.tsx
   - Users can preview localhost URLs now
   - Don't re-add this "security feature"

3. **ngrok Is Fallback, Not Primary**
   - localtunnel is primary (pure JS, no install issues)
   - ngrok had HTTP 403 installation errors
   - Users can manually install ngrok if they prefer

4. **Auth Cookies: Localhost-to-Localhost Only**
   - Browser security blocks cross-origin injection
   - This is documented and intentional
   - Proxy server required for production sites (future phase)

5. **State Flows Through home.tsx**
   - home.tsx is the state container
   - sidebar.tsx triggers state changes
   - preview-area.tsx and device-frame.tsx consume state
   - Don't create redundant state in other components

### What NOT to Do

❌ Don't remove the .js extensions from imports (required for ES modules)
❌ Don't re-add localhost blocking (it was intentionally removed)
❌ Don't switch from localtunnel to ngrok (ngrok install fails)
❌ Don't bypass git hooks (user has stop-hook for safety)
❌ Don't push to main/master (always use feature branch)
❌ Don't create new state management (React Query + React state is enough)

### Git Push Protocol

**Always use:**
```bash
git push -u origin claude/project-review-rmygA
```

**If push fails with network error:**
- Retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s)
- Branch must start with `claude/` and end with session ID
- 403 errors mean wrong branch name

---

## 💡 Quick Reference

### Port Assignments
- `5173` - mosaic-client (Vite dev server)
- `5000` - server (Express + Socket.IO)
- `3000` - examples/sample-site (test content)
- `3001` - examples/auth-demo (auth test)

### Key Dependencies
```json
{
  "backend": [
    "express", "cors", "socket.io",
    "localtunnel", "chokidar"
  ],
  "frontend": [
    "react@19.1", "vite", "typescript",
    "@tanstack/react-query", "socket.io-client",
    "tailwindcss@4", "shadcn/ui"
  ]
}
```

### API Endpoints
```
# Tunnel
POST   /api/tunnel/create          - Create tunnel
GET    /api/tunnel/:port           - Get tunnel info
DELETE /api/tunnel/:port           - Close tunnel
POST   /api/tunnel/auto-detect     - Auto-detect dev server

# Watcher
POST   /api/watcher/start          - Start watching files
DELETE /api/watcher/stop/:id       - Stop watcher
GET    /api/watcher                - List active watchers

# WebSocket Events
→ reload                           - File changed, reload frames
→ ping                             - Heartbeat check
← pong                             - Heartbeat response
```

### Component Props Flow
```typescript
// home.tsx
const [reloadTrigger, setReloadTrigger] = useState(0);
const [authCookies, setAuthCookies] = useState<AuthCookie[]>([]);

// sidebar.tsx
<LiveReloadToggle onReload={() => setReloadTrigger(p => p + 1)} />
<AuthWizard onAuthCapture={setAuthCookies} />

// preview-area.tsx
<PreviewArea reloadTrigger={reloadTrigger} authCookies={authCookies} />

// device-frame.tsx
useEffect(() => {
  if (reloadTrigger > 0) setIframeKey(p => p + 1);
}, [reloadTrigger]);
```

---

## 📞 Questions for User (When They Return)

1. **Week 3-4 Priorities:**
   - Start with MCP server integration? (highest impact for Claude Code users)
   - Or screenshot tools first? (more visual/tangible)
   - Or flow diagrams? (most complex feature)

2. **Testing Preferences:**
   - Write comprehensive tests as we go?
   - Or build features first, test later?
   - Manual testing sufficient for now?

3. **Documentation Updates:**
   - Update README.md with new features?
   - Add API documentation to DEVELOPMENT.md?
   - Or keep building and document later?

4. **MCP Server Details:**
   - Should it auto-start Kaleidoscope if not running?
   - Process management strategy (pm2, systemd, manual)?
   - Error handling if Kaleidoscope crashes?

---

## ✅ Week 3-4 Completed Features

### MCP Server (`mcp-server/`)
- **5 MCP tools**: `preview_responsive`, `capture_screenshots`, `kaleidoscope_status`, `kaleidoscope_start`, `kaleidoscope_stop`
- **Process manager**: Auto-starts Kaleidoscope client/server when tools are invoked
- **Stdio transport**: Standard MCP server compatible with Claude Code
- **Package**: `kaleidoscope-mcp-server` with build/dev/start scripts

### Screenshot System
- **Backend service**: `server/services/screenshot.service.ts` using Playwright + Chromium
- **API endpoint**: `POST /api/screenshots` + `GET /api/screenshots/devices`
- **Frontend panel**: `mosaic-client/src/components/screenshot-panel.tsx` in sidebar
- **Toolbar integration**: Screenshot button in preview-area now calls the API
- **Features**: Multi-device capture, full-page option, PNG output

### Bug Fixes
- Fixed TypeScript `verbatimModuleSyntax` errors in server routes (type-only imports)
- Fixed `localtunnel` missing type declarations
- Fixed `err` implicit `any` type in tunnel service

### Tests
- 16 unit tests passing (devices + screenshot-panel)
- Screenshot panel: device selection, API calls, error handling, full-page toggle

## 🏁 Session End State

**Timestamp:** 2026-02-08
**Branch:** claude/continue-kaleidoscope-qeMSu
**Working Directory:** Changes ready to commit
**Test Status:** 16/16 tests passing ✅

**Ready to Resume:** YES ✅

**Next Action:** Week 5-7 - Flow diagrams with React Flow

---

*This summary contains all context needed to resume development. Share this document when starting a new session.*
