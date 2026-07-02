'use strict';

/**
 * TrendAI Demo Platform — portal backend.
 *
 * Responsibilities:
 *   - Single gate credential (username fixed to "admin").
 *   - Ships with default password "admin"; forces a password change on first login.
 *   - Persists the (scrypt-hashed) password to a mounted volume so the reset survives restarts.
 *   - Serves the read-only demo hub. No content-editing surface is exposed.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const { createProxyMiddleware } = require('http-proxy-middleware');

const PORT = process.env.PORTAL_PORT || 3000;
const DATA_DIR = process.env.PORTAL_DATA_DIR || '/data';
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');
const USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin';
const MIN_PASSWORD_LENGTH = 8;

// ---------------------------------------------------------------------------
// Demo apps proxied under a path prefix, all gated behind the portal login.
// Each backend is reached by its docker-compose service name on the shared
// network. `secure:false` skips TLS verification for the self-signed Smish app.
// ---------------------------------------------------------------------------
const DEMOS = {
  v1fs:     { target: 'http://v1fs-scanner:8080', secure: true },
  appsec:   { target: 'http://app-sec:8000',      secure: true },
  smish:    { target: 'https://smish:5000',       secure: false },
  siemcalc: { target: 'http://siem-calc:80',      secure: true },
};

// ---------------------------------------------------------------------------
// Password storage (scrypt — no native deps, ships with Node core)
// ---------------------------------------------------------------------------

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, stored) {
  const [salt, derived] = String(stored).split(':');
  if (!salt || !derived) return false;
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(derived, 'hex');
  const b = Buffer.from(check, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function loadAuth() {
  try {
    return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
  } catch (_) {
    // First boot (or wiped volume): seed default admin/admin, force change.
    const seed = {
      username: USERNAME,
      passwordHash: hashPassword(DEFAULT_PASSWORD),
      mustChangePassword: true,
      updatedAt: new Date().toISOString(),
    };
    saveAuth(seed);
    return seed;
  }
}

function saveAuth(auth) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2));
}

// ---------------------------------------------------------------------------
// Sessions (in-memory; a restart just asks the user to log in again — the
// password reset itself is what must persist, and that lives on the volume)
// ---------------------------------------------------------------------------

const sessions = new Map(); // token -> { username, createdAt }
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function createSession(username) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { username, createdAt: Date.now() });
  return token;
}

function getSession(token) {
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() - s.createdAt > SESSION_TTL_MS) {
    sessions.delete(token);
    return null;
  }
  return s;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express();
// The portal's own responses are auth-dependent and must NEVER be cached — a
// fronting CDN (Cloudflare) that caches the logged-out page/session otherwise
// traps users in a login → bounce-back loop. Disable ETags and force no-store.
app.set('etag', false);
app.use(cookieParser());
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  next();
});
// JSON body parsing is applied per-route (below) — NOT globally — so it never
// consumes the body of a request that is about to be proxied to a demo backend.
const jsonParser = express.json();

// Serve a portal HTML page without letting sendFile re-add a cacheable header.
function sendPage(res, name) {
  res.sendFile(path.join(PUBLIC_DIR, name), { cacheControl: false, lastModified: false });
}

const PUBLIC_DIR = path.join(__dirname, 'public');

function currentSession(req) {
  const token = req.cookies && req.cookies.sid;
  return token ? getSession(token) : null;
}

function requireAuth(req, res, next) {
  const session = currentSession(req);
  if (!session) return res.status(401).json({ error: 'Not authenticated' });
  req.session = session;
  next();
}

// Gate demo traffic: navigations (GET html) redirect to the login page;
// XHR/asset requests get a 401 so they fail fast rather than returning HTML.
function requireSessionForDemo(req, res, next) {
  if (currentSession(req)) return next();
  const accept = req.headers.accept || '';
  if (req.method === 'GET' && accept.includes('text/html')) return res.redirect('/login');
  return res.status(401).send('Not authenticated');
}

// Which demo does a prefix-less request (e.g. /style.css, /api/scan) belong to?
// Prefer the Referer path; fall back to the x_app cookie set when an app page
// was served. Lets each backend keep its own root-absolute asset/API paths.
function demoFromContext(req) {
  const ref = req.headers.referer || '';
  try {
    const p = new URL(ref).pathname;
    for (const name of Object.keys(DEMOS)) {
      if (p === '/' + name || p.startsWith('/' + name + '/')) return name;
    }
  } catch (_) { /* no/invalid referer */ }
  const cookie = req.cookies && req.cookies.x_app;
  return DEMOS[cookie] ? cookie : null;
}

// Tag the browser with the active app so referer-less subresource requests can
// still be routed, and forward the prefix so prefix-aware backends (Flask) can
// build correct URLs.
function markActiveApp(proxyRes, _req, res, name) {
  if ((proxyRes.headers['content-type'] || '').includes('text/html')) {
    const prev = proxyRes.headers['set-cookie'] || [];
    proxyRes.headers['set-cookie'] = [].concat(prev, `x_app=${name}; Path=/; SameSite=Lax`);
  }
  // Stop Cloudflare/browsers caching demo assets so a redeploy is seen
  // immediately (the demo apps serve their own long-cached css/js otherwise).
  proxyRes.headers['cache-control'] = 'no-store, no-cache, must-revalidate';
  delete proxyRes.headers['etag'];
  delete proxyRes.headers['last-modified'];
  delete proxyRes.headers['expires'];
}

function makeProxy(name) {
  const cfg = DEMOS[name];
  return createProxyMiddleware({
    target: cfg.target,
    changeOrigin: true,
    secure: cfg.secure,
    xfwd: true,
    on: {
      proxyReq: (proxyReq) => proxyReq.setHeader('X-Forwarded-Prefix', '/' + name),
      proxyRes: (proxyRes, req, res) => markActiveApp(proxyRes, req, res, name),
    },
  });
}

// One configured proxy per demo. Prefix stripping is done by rewriting req.url
// before invoking the proxy (see below), so behaviour doesn't depend on how the
// proxy library treats Express mount paths.
const proxies = {};
for (const name of Object.keys(DEMOS)) proxies[name] = makeProxy(name);

// --- Auth API -------------------------------------------------------------

app.get('/api/session', (req, res) => {
  const session = currentSession(req);
  const auth = loadAuth();
  res.json({
    authenticated: Boolean(session),
    username: session ? session.username : null,
    mustChangePassword: session ? auth.mustChangePassword : false,
  });
});

app.post('/api/login', jsonParser, (req, res) => {
  // Single-user portal: the account is always "admin", so we don't reject on a
  // mis-autofilled username. Trim the password to absorb stray whitespace/newlines
  // that password managers sometimes append.
  const { password } = req.body || {};
  const auth = loadAuth();
  const pw = (password || '').trim();
  const ok = verifyPassword(pw, auth.passwordHash);
  console.log(`[auth] login attempt pwlen=${pw.length} result=${ok ? 'ok' : 'reject'} at ${new Date().toISOString()}`);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  const token = createSession(auth.username);
  res.cookie('sid', token, { httpOnly: true, sameSite: 'lax', maxAge: SESSION_TTL_MS });
  res.json({ ok: true, mustChangePassword: auth.mustChangePassword });
});

app.post('/api/logout', (req, res) => {
  const token = req.cookies && req.cookies.sid;
  if (token) sessions.delete(token);
  res.clearCookie('sid');
  res.json({ ok: true });
});

app.post('/api/change-password', jsonParser, requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const auth = loadAuth();
  // Trim consistently with login so a stored password always matches what the
  // user later types at the login form.
  const cur = (currentPassword || '').trim();
  const np = (newPassword || '').trim();
  if (!verifyPassword(cur, auth.passwordHash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  if (np.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }
  if (np === DEFAULT_PASSWORD) {
    return res.status(400).json({ error: 'Please choose a password other than the default.' });
  }
  if (verifyPassword(np, auth.passwordHash)) {
    return res.status(400).json({ error: 'New password must be different from the current one.' });
  }
  auth.passwordHash = hashPassword(np);
  auth.mustChangePassword = false;
  auth.updatedAt = new Date().toISOString();
  saveAuth(auth);
  console.log(`[auth] password changed newlen=${np.length} at ${auth.updatedAt}`);
  res.json({ ok: true });
});

// --- Page routing ---------------------------------------------------------
// Gate every page behind auth + the forced-reset flow before serving static.

// Serve the right page directly with a 200 (no server-side 302) so browsers
// that don't follow redirect bodies still render. The client-side scripts
// re-check /api/session and navigate as needed.
app.get(['/', '/index.html', '/dashboard', '/dashboard.html'], (req, res) => {
  const session = currentSession(req);
  if (!session) return sendPage(res, 'login.html');
  if (loadAuth().mustChangePassword) return sendPage(res, 'change-password.html');
  sendPage(res, 'dashboard.html');
});

app.get(['/login', '/login.html'], (req, res) => {
  sendPage(res, 'login.html');
});

app.get(['/change-password', '/change-password.html'], (req, res) => {
  sendPage(res, 'change-password.html');
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

// Static assets (css/js/svg). No directory listing; pages are routed above.
// The portal's own files (styles.css, logo.svg, demos.js) are served here;
// anything not found falls through to the demo proxy / catch-all below.
app.use(express.static(PUBLIC_DIR, {
  index: false,
  extensions: [],
  etag: false,
  lastModified: false,
  cacheControl: false, // the global no-store middleware above governs caching
}));

// --- Demo reverse proxy (auth-gated) --------------------------------------
// /v1fs, /appsec, /smish -> the demo backends, with the prefix stripped from
// req.url so the backend sees its own root paths.
for (const name of Object.keys(DEMOS)) {
  const pfx = '/' + name;
  app.use((req, res, next) => {
    if (req.path !== pfx && !req.path.startsWith(pfx + '/')) return next();
    // Normalise "/v1fs" -> "/v1fs/" so relative assets and the Referer resolve
    // against the prefix.
    if (req.path === pfx) return res.redirect(301, pfx + '/');
    return requireSessionForDemo(req, res, () => {
      req.url = req.url.slice(pfx.length) || '/';
      if (req.url[0] !== '/') req.url = '/' + req.url;
      proxies[name](req, res, next);
    });
  });
}

// Referer/cookie catch-all: routes an app's root-absolute requests
// (e.g. /style.css, /api/scan, /analytics) back to the backend that served the
// page — passed through unchanged. Portal routes and static files are matched
// earlier, so only unmatched paths reach here.
app.use((req, res, next) => {
  const name = demoFromContext(req);
  if (!name) return next(); // -> 404
  return requireSessionForDemo(req, res, () => proxies[name](req, res, next));
});

app.listen(PORT, () => {
  loadAuth(); // ensure the store is seeded on boot
  console.log(`TrendAI Demo portal listening on :${PORT}`);
});
