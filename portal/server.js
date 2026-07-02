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

const PORT = process.env.PORTAL_PORT || 3000;
const DATA_DIR = process.env.PORTAL_DATA_DIR || '/data';
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');
const USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin';
const MIN_PASSWORD_LENGTH = 8;

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
app.use(express.json());
app.use(cookieParser());

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

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const auth = loadAuth();
  if (username !== auth.username || !verifyPassword(password || '', auth.passwordHash)) {
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

app.post('/api/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const auth = loadAuth();
  if (!verifyPassword(currentPassword || '', auth.passwordHash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
  }
  if (newPassword === DEFAULT_PASSWORD) {
    return res.status(400).json({ error: 'Please choose a password other than the default.' });
  }
  if (verifyPassword(newPassword, auth.passwordHash)) {
    return res.status(400).json({ error: 'New password must be different from the current one.' });
  }
  auth.passwordHash = hashPassword(newPassword);
  auth.mustChangePassword = false;
  auth.updatedAt = new Date().toISOString();
  saveAuth(auth);
  res.json({ ok: true });
});

// --- Page routing ---------------------------------------------------------
// Gate every page behind auth + the forced-reset flow before serving static.

app.get(['/', '/index.html', '/dashboard', '/dashboard.html'], (req, res) => {
  const session = currentSession(req);
  if (!session) return res.redirect('/login');
  if (loadAuth().mustChangePassword) return res.redirect('/change-password');
  res.sendFile(path.join(PUBLIC_DIR, 'dashboard.html'));
});

app.get(['/login', '/login.html'], (req, res) => {
  if (currentSession(req) && !loadAuth().mustChangePassword) return res.redirect('/');
  res.sendFile(path.join(PUBLIC_DIR, 'login.html'));
});

app.get(['/change-password', '/change-password.html'], (req, res) => {
  if (!currentSession(req)) return res.redirect('/login');
  res.sendFile(path.join(PUBLIC_DIR, 'change-password.html'));
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

// Static assets (css/js/svg). No directory listing; pages are routed above.
app.use(express.static(PUBLIC_DIR, { index: false, extensions: [] }));

app.listen(PORT, () => {
  loadAuth(); // ensure the store is seeded on boot
  console.log(`TrendAI Demo portal listening on :${PORT}`);
});
