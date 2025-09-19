Project Development Guidelines (AI-FAZI)

Scope
- This document captures project-specific knowledge to accelerate development and debugging. It assumes familiarity with Node/Express, Vue/Vite, and general JS/TS tooling.

Tech Stack Overview
- Backend: Node.js + Express (server.js), simple JWT auth, XLSX processing, OpenAI API integration.
- Frontend: Vue 3 + Vite + Pinia + TypeScript.
- Optional Python: Legacy experiments under OLD-REPO\backend\python_stuff and main.py. Not used by the Node server.

Repository Layout
- OLD-REPO\backend: Express app. Entry: server.js. Routes: routes\{auth,calculate,chat}.js. Services: services\*.js.
- OLD-REPO\frontend: Vite + Vue app.
- Data: OLD-REPO\backend\data contains sample XLSX files. The server creates data and uploads directories on boot if missing.

Runtime/Tooling Versions
- Recommended Node: 20 LTS (aligns with frontend engines: ^20.19.0 or >=22.12.0). Backend has no engine field but is compatible with Node 18+, tested on Node 20.
- npm: v10+ recommended.

Environment Configuration (Backend)
- Env file: OLD-REPO\backend\.env (optional). The app loads dotenv in config/config.js.
- Variables (defaults shown):
  - PORT: default 3000
  - JWT_SECRET: default fallback in code (use a strong value in non-dev)
  - OPENAI_API_KEY: empty by default; required for /api/chat to actually call OpenAI
  - LOGIN_USERNAME: default fazi-admin
  - LOGIN_PASSWORD: default #demo-transfer-uniform-collar!
- CORS: Allowed origins in server.js: http://localhost:3000, http://localhost:3001, http://localhost:5173. Add your frontend URL if different.

Install and Run
- Backend
  1) PowerShell (Windows paths):
     cd OLD-REPO\backend
     npm ci
  2) Optional: create .env with overrides, e.g.:
     PORT=3000
     JWT_SECRET=replace-me
     OPENAI_API_KEY=sk-...
  3) Start:
     npm run dev        # nodemon, for development
     npm start          # plain node server.js
  4) Healthcheck (once started):
     Invoke-RestMethod http://localhost:3000/api/health

- Frontend
  1) PowerShell:
     cd OLD-REPO\frontend
     npm ci
  2) Start dev server (defaults to port 5173):
     npm run dev
  3) Access UI: http://localhost:5173

Authentication
- Hardcoded credentials (configurable via env):
  - Username: fazi-admin
  - Password: #demo-transfer-uniform-collar!
- Login: POST /api/auth/login with JSON { "username": "...", "password": "..." }
- Receives JWT token (24h). Protected routes use middleware/middleware.js: authenticateToken.

Key Backend Endpoints
- GET /api/health → { status: 'ok', time: ISO }
- POST /api/auth/login → JWT issuance
- POST /api/auth/check-token → validates token header Authorization: Bearer <token>
- Others: calculate and chat routes under /api (see routes\calculate.js and routes\chat.js). Chat depends on OPENAI_API_KEY.

XLSX Handling
- Uses multer for uploads and xlsx for parsing. Limits and allowed MIME types enforced in services/xlsxService.js (and related routes). Maximum file size is 50MB (see server.js error handler for codes).
- Data directories:
  - OLD-REPO\backend\uploads created on boot
  - OLD-REPO\backend\data created on boot

Logging and Error Handling
- Simple request logger prints [ISO] METHOD PATH - IP.
- Centralized error handler maps file size and invalid type errors to 413/400 respectively; everything else → 500 with message.
- A catch-all 404 returns { error: 'Endpoint not found', path }.

OpenAI Integration
- services\openaiService.js consumes config.openaiApiKey. If OPENAI_API_KEY is missing, chat endpoints will fail; add the key for integration tests.

Testing: How to Configure, Run, and Extend
- There is no test framework configured in package.json. Use one of these approaches:
  1) Quick smoke tests with ad-hoc Node scripts (recommended for now).
  2) Add Jest/Vitest in the future; keep tests isolated from running servers and avoid calling external OpenAI endpoints (mock them).

- Verified Example: Backend Smoke Test for /api/health
  The following steps have been executed and verified to work locally.
  1) Ensure dependencies are installed:
     cd OLD-REPO\backend
     npm ci
  2) Create a temporary file test-health.js with this content:
     // Temporary smoke test for backend /api/health
     const { spawn } = require('child_process');
     const http = require('http');
     const PORT = process.env.PORT || 3000;
     function waitForServer(port, timeoutMs = 10000, intervalMs = 250) {
       const start = Date.now();
       return new Promise((resolve, reject) => {
         const tryPing = () => {
           const req = http.get({ hostname: '127.0.0.1', port, path: '/api/health', timeout: 2000 }, (res) => {
             if (res.statusCode === 200) resolve(); else if (Date.now() - start > timeoutMs) reject(new Error('Server responded but not OK')); else setTimeout(tryPing, intervalMs);
             res.resume();
           });
           req.on('error', () => { if (Date.now() - start > timeoutMs) reject(new Error('Timeout waiting for server')); else setTimeout(tryPing, intervalMs); });
         };
         tryPing();
       });
     }
     function getJson(path) {
       return new Promise((resolve, reject) => {
         const req = http.get({ hostname: '127.0.0.1', port: PORT, path }, (res) => {
           let data = '';
           res.on('data', c => data += c);
           res.on('end', () => { try { resolve({ statusCode: res.statusCode, body: JSON.parse(data) }); } catch { reject(new Error('Invalid JSON response')); } });
         });
         req.on('error', reject);
       });
     }
     (async () => {
       const child = spawn(process.execPath, ['server.js'], { cwd: __dirname, env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' }, stdio: ['ignore', 'pipe', 'pipe'] });
       try { await waitForServer(PORT); const { statusCode, body } = await getJson('/api/health'); if (statusCode !== 200) throw new Error('Non-200'); if (!body || body.status !== 'ok' || !body.time) throw new Error('Bad body'); console.log('Healthcheck OK:', body); process.exitCode = 0; }
       catch (e) { console.error('Smoke test failed:', e.message); process.exitCode = 1; }
       finally { require('child_process').spawn('taskkill', ['/PID', String(child.pid), '/T', '/F']); }
     })();
  3) Run it:
     node test-health.js
  4) Expected output contains: Healthcheck OK: { status: 'ok', time: '...' }
  5) Cleanup (required by repo policy): delete the temporary file after use:
     del test-health.js

- Adding New Tests (short-term approach)
  - Create a self-contained Node script under OLD-REPO\backend that:
    - Spawns the server (or uses HTTP against a server you manually started with npm run dev),
    - Calls the target endpoint(s),
    - Asserts on response shape/status, and
    - Exits with non-zero on failure. For Windows CI, prefer plain Node + http/https to avoid extra deps.
  - Avoid persisting test files; generate them ad-hoc or keep them under a temporary folder excluded from commits.
  - For OpenAI-dependent paths, inject OPENAI_API_KEY or mock the openaiService module.

Future Testing Direction
- Introduce Jest for backend unit/integration tests:
  - Split server.js to export an app factory and create a separate bin/www (or similar) so tests can import the app without opening a port.
  - Use supertest for HTTP-level assertions.
- Frontend: add Vitest + @vue/test-utils for component tests; run via npm run test.

Development Tips and Caveats
- server.js creates uploads and data directories on boot. Make sure the runtime user has write permissions to OLD-REPO\backend.
- If you change the frontend dev port, update CORS origins in server.js.
- calculate and XLSX paths rely on multer configuration; any adjustment to file-size limits must be mirrored in the error handler mappings.
- Default credentials are printed on server start; avoid logging secrets in production.
- The backend exports the Express app (module.exports = app) but immediately listens as part of module execution. For test-friendliness, consider refactoring to separate app and server start.
- Python code in backend/python_stuff and main.py appears legacy; do not assume it’s wired into the JS server. requirements.txt controls that environment if you choose to run it.

Troubleshooting
- Port already in use: change PORT in .env or free the port (e.g., taskkill /F /PID <pid> on Windows).
- CORS errors from frontend: ensure the frontend origin matches one of the allowed origins or extend the list.
- OpenAI errors: confirm OPENAI_API_KEY is set and that the account has access; network egress must be allowed.
- XLSX parsing issues: verify file type (.xlsx). Size limit is 50MB.

House Rules for This Repo
- Do not commit ad-hoc test scripts; keep only .junie\guidelines.md from this task.
- Prefer minimal dependency additions; the backend already ships axios, multer, xlsx, jsonwebtoken, openai.
- Match existing code style: standard Node CommonJS in backend, Prettier in frontend (npm run format affects src/).