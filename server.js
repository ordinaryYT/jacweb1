// server.js — flat layout (no folders). Serves static files from this directory.

try { require('dotenv').config(); } catch (_) {}

const path = require('path');
const express = require('express');
const pg = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

// --- Config ---
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Serve *this directory* as static
app.use(express.static(__dirname, { extensions: ['html'] }));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : undefined
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'tlj_sess';
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production'
};

// Seed admin from env (or defaults)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'ThatLegendJack';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'BooBear24/7';

// --- Helpers ---
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
function authRequired(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid session' });
  }
}
function adminOrStaff(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (req.user.role === 'admin' || req.user.role === 'staff') return next();
  return res.status(403).json({ error: 'Forbidden' });
}

// --- Schema & seed ---
async function ensureSchema() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin','staff')),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS site_state (
        id BOOLEAN PRIMARY KEY DEFAULT TRUE,
        about_html TEXT NOT NULL DEFAULT '',
        discord_status TEXT NOT NULL DEFAULT ''
      );
    `);
    await client.query(`INSERT INTO site_state (id) VALUES (TRUE)
                        ON CONFLICT (id) DO NOTHING;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS social_links (
        id BOOLEAN PRIMARY KEY DEFAULT TRUE,
        twitch_url TEXT,
        tiktok_url TEXT,
        kick_url TEXT,
        onlyfans_url TEXT,
        twitch_img TEXT,
        tiktok_img TEXT,
        kick_img TEXT
      );
    `);
    await client.query(`INSERT INTO social_links (id) VALUES (TRUE)
                        ON CONFLICT (id) DO NOTHING;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS gifted_subs (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        gifts INTEGER NOT NULL DEFAULT 0
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS twitch_creds (
        id BOOLEAN PRIMARY KEY DEFAULT TRUE,
        client_id TEXT,
        access_token TEXT
      );
    `);
    await client.query(`INSERT INTO twitch_creds (id) VALUES (TRUE)
                        ON CONFLICT (id) DO NOTHING;`);

    // Seed admin if missing
    const { rows } = await client.query('SELECT 1 FROM users WHERE username=$1', [ADMIN_USERNAME]);
    if (rows.length === 0) {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await client.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1,$2,$3)',
        [ADMIN_USERNAME, hash, 'admin']
      );
      console.log(`Seeded admin user "${ADMIN_USERNAME}"`);
    }

    await client.query('COMMIT');
    console.log('Schema ensured.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Schema init failed:', e);
    throw e;
  } finally {
    client.release();
  }
}

// --- Auth routes ---
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  const { rows } = await pool.query('SELECT id, password_hash, role FROM users WHERE username=$1', [username]);
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken({ id: user.id, username, role: user.role });
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS).json({ ok: true, username, role: user.role });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, COOKIE_OPTS).json({ ok: true });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.json({ user: null });
  try {
    const user = jwt.verify(token, JWT_SECRET);
    res.json({ user });
  } catch {
    res.json({ user: null });
  }
});

// --- Users (admin only) ---
app.post('/api/users', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { username, password, role } = req.body || {};
  if (!username || !password || !role) return res.status(400).json({ error: 'Missing fields' });
  if (!['admin','staff'].includes(role)) return res.status(400).json({ error: 'Bad role' });
  const hash = await bcrypt.hash(password, 12);
  try {
    await pool.query('INSERT INTO users (username, password_hash, role) VALUES ($1,$2,$3)', [username, hash, role]);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: 'User exists?' });
  }
});

app.get('/api/users', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { rows } = await pool.query('SELECT id, username, role, created_at FROM users ORDER BY id ASC');
  res.json(rows);
});

app.delete('/api/users/:id', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.params;
  await pool.query('DELETE FROM users WHERE id=$1 AND role<>$2', [id, 'admin']);
  res.json({ ok: true });
});

// --- Site state: About + Discord ---
app.get('/api/site', async (req, res) => {
  const { rows } = await pool.query('SELECT about_html, discord_status FROM site_state WHERE id=TRUE');
  res.json(rows[0] || { about_html: '', discord_status: '' });
});

app.put('/api/site', authRequired, adminOrStaff, async (req, res) => {
  const { about_html, discord_status } = req.body || {};
  await pool.query(
    'UPDATE site_state SET about_html=$1, discord_status=$2 WHERE id=TRUE',
    [about_html ?? '', discord_status ?? '']
  );
  res.json({ ok: true });
});

// --- Social links + profile images ---
app.get('/api/socials', async (req, res) => {
  const { rows } = await pool.query('SELECT twitch_url,tiktok_url,kick_url,onlyfans_url,twitch_img,tiktok_img,kick_img FROM social_links WHERE id=TRUE');
  res.json(rows[0] || {});
});

app.put('/api/socials', authRequired, adminOrStaff, async (req, res) => {
  const { twitch_url, tiktok_url, kick_url, onlyfans_url, twitch_img, tiktok_img, kick_img } = req.body || {};
  await pool.query(
    `UPDATE social_links SET
       twitch_url=$1, tiktok_url=$2, kick_url=$3, onlyfans_url=$4,
       twitch_img=$5, tiktok_img=$6, kick_img=$7
     WHERE id=TRUE`,
    [twitch_url, tiktok_url, kick_url, onlyfans_url, twitch_img, tiktok_img, kick_img]
  );
  res.json({ ok: true });
});

// --- Gifted subs (staff editable) ---
app.get('/api/subs', async (req, res) => {
  const { rows } = await pool.query('SELECT username, gifts FROM gifted_subs ORDER BY gifts DESC, username ASC');
  res.json(rows);
});

app.post('/api/subs', authRequired, adminOrStaff, async (req, res) => {
  const { username, gifts } = req.body || {};
  if (!username || gifts == null) return res.status(400).json({ error: 'Missing fields' });
  await pool.query(
    `INSERT INTO gifted_subs (username, gifts)
     VALUES ($1,$2)
     ON CONFLICT (username) DO UPDATE SET gifts=EXCLUDED.gifts`,
    [username, Number(gifts)]
  );
  res.json({ ok: true });
});

app.delete('/api/subs/:username', authRequired, adminOrStaff, async (req, res) => {
  await pool.query('DELETE FROM gifted_subs WHERE username=$1', [req.params.username]);
  res.json({ ok: true });
});

// --- Twitch creds + Bits proxy (server-side Helix call) ---
app.get('/api/twitch/creds', authRequired, async (req, res) => {
  const { rows } = await pool.query('SELECT client_id, access_token FROM twitch_creds WHERE id=TRUE');
  res.json(rows[0] || {});
});

app.put('/api/twitch/creds', authRequired, adminOrStaff, async (req, res) => {
  const { client_id, access_token } = req.body || {};
  await pool.query('UPDATE twitch_creds SET client_id=$1, access_token=$2 WHERE id=TRUE', [client_id || null, access_token || null]);
  res.json({ ok: true });
});

app.get('/api/twitch/bits', async (req, res) => {
  const count = Math.min(Math.max(parseInt(req.query.count || '10', 10), 1), 10);
  const period = (req.query.period || 'all'); // all/day/week/month/year

  const { rows } = await pool.query('SELECT client_id, access_token FROM twitch_creds WHERE id=TRUE');
  const creds = rows[0];
  if (!creds || !creds.client_id || !creds.access_token) {
    return res.status(400).json({ error: 'Missing Twitch credentials (client_id/access_token)' });
  }

  const url = new URL('https://api.twitch.tv/helix/bits/leaderboard');
  url.searchParams.set('count', String(count));
  url.searchParams.set('period', period);

  const r = await fetch(url, {
    headers: {
      'Client-Id': creds.client_id,
      'Authorization': `Bearer ${creds.access_token}`
    }
  });

  if (!r.ok) {
    const text = await r.text();
    return res.status(r.status).json({ error: text });
  }
  const data = await r.json();
  res.json(data);
});

// --- Root: serve index.html (flat) ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Start ---
const PORT = process.env.PORT || 3000;
ensureSchema()
  .then(() => app.listen(PORT, () => console.log(`Server listening on :${PORT}`)))
  .catch((e) => {
    console.error('Startup failed:', e);
    process.exit(1);
  });
