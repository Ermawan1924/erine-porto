const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'public', 'uploads');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const DEFAULT_CONTENT_FILE = path.join(__dirname, 'data', 'content.default.json');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-me-now';
const SESSION_SECRET = process.env.SESSION_SECRET || 'please-change-this-session-secret';
const COOKIE_SECURE = String(process.env.COOKIE_SECURE || 'false').toLowerCase() === 'true';

function safeEqual(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function cleanString(value, max = 5000) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function cleanPath(value, fallback = '') {
  const v = cleanString(value, 1024);
  if (!v) return fallback;
  if (v.startsWith('/assets/') || v.startsWith('/uploads/')) return v;
  return fallback;
}

function normalizeContent(input) {
  const site = input && typeof input.site === 'object' ? input.site : {};
  const about = input && typeof input.about === 'object' ? input.about : {};
  const validCategories = new Set(['illustration', 'mascot', 'printing', 'apparel', 'character', 'packaging', 'social']);

  const projects = Array.isArray(input?.projects) ? input.projects.slice(0, 200).map((p, i) => {
    const id = cleanString(p?.id, 120) || `project-${i + 1}-${crypto.randomUUID().slice(0, 8)}`;
    const pages = Array.isArray(p?.pages)
      ? p.pages.map(x => cleanPath(x)).filter(Boolean).slice(0, 30)
      : [];
    const cover = cleanPath(p?.cover, pages[0] || '/assets/page-01.jpg');
    return {
      id,
      title: cleanString(p?.title, 200) || 'Untitled Project',
      category: validCategories.has(p?.category) ? p.category : 'illustration',
      label: cleanString(p?.label, 200),
      cover,
      pages: pages.length ? pages : [cover],
      description: cleanString(p?.description, 10000),
      tags: Array.isArray(p?.tags) ? p.tags.map(t => cleanString(t, 80)).filter(Boolean).slice(0, 20) : [],
      visible: p?.visible !== false
    };
  }) : [];

  const experiences = Array.isArray(input?.experiences) ? input.experiences.slice(0, 100).map((e, i) => ({
    id: cleanString(e?.id, 120) || `exp-${i + 1}-${crypto.randomUUID().slice(0, 8)}`,
    period: cleanString(e?.period, 100),
    title: cleanString(e?.title, 250),
    company: cleanString(e?.company, 250)
  })) : [];

  const achievements = Array.isArray(input?.achievements) ? input.achievements.slice(0, 100).map((a, i) => ({
    id: cleanString(a?.id, 120) || `ach-${i + 1}-${crypto.randomUUID().slice(0, 8)}`,
    rank: cleanString(a?.rank, 120),
    title: cleanString(a?.title, 300)
  })) : [];

  const featuredExists = projects.some(p => p.id === site.featuredProjectId && p.visible);

  return {
    site: {
      name: cleanString(site.name, 200) || 'Erine Palba Febmiani',
      role: cleanString(site.role, 200) || 'Illustrator & Graphic Designer',
      location: cleanString(site.location, 200),
      heroEyebrow: cleanString(site.heroEyebrow, 300),
      heroTitle: cleanString(site.heroTitle, 500),
      heroIntro: cleanString(site.heroIntro, 2000),
      availability: cleanString(site.availability, 300),
      email: cleanString(site.email, 300),
      phone: cleanString(site.phone, 100),
      instagram: cleanString(site.instagram, 1000),
      instagramLabel: cleanString(site.instagramLabel, 300),
      behance: cleanString(site.behance, 1000),
      behanceLabel: cleanString(site.behanceLabel, 300),
      heroImage: cleanPath(site.heroImage, '/assets/page-01.jpg'),
      portraitImage: cleanPath(site.portraitImage, '/assets/portrait-erine.jpg'),
      contactImage: cleanPath(site.contactImage, '/assets/page-37.jpg'),
      featuredProjectId: featuredExists ? cleanString(site.featuredProjectId, 120) : (projects.find(p => p.visible)?.id || '')
    },
    about: {
      eyebrow: cleanString(about.eyebrow, 200),
      title: cleanString(about.title, 200),
      lead: cleanString(about.lead, 3000),
      body: cleanString(about.body, 5000),
      statement: cleanString(about.statement, 1000)
    },
    skills: Array.isArray(input?.skills) ? input.skills.map(s => cleanString(s, 100)).filter(Boolean).slice(0, 50) : [],
    projects,
    experiences,
    achievements
  };
}

async function ensureStorage() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.mkdir(UPLOAD_DIR, { recursive: true });
  try {
    await fsp.access(CONTENT_FILE);
  } catch {
    const initial = await fsp.readFile(DEFAULT_CONTENT_FILE, 'utf8');
    await fsp.writeFile(CONTENT_FILE, initial, 'utf8');
  }
}

async function readContent() {
  try {
    const raw = await fsp.readFile(CONTENT_FILE, 'utf8');
    return normalizeContent(JSON.parse(raw));
  } catch (error) {
    console.error('Failed to read content.json, using defaults:', error.message);
    const raw = await fsp.readFile(DEFAULT_CONTENT_FILE, 'utf8');
    return normalizeContent(JSON.parse(raw));
  }
}

let writeChain = Promise.resolve();
function writeContent(content) {
  const normalized = normalizeContent(content);
  writeChain = writeChain.then(async () => {
    const tmp = `${CONTENT_FILE}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify(normalized, null, 2), 'utf8');
    await fsp.rename(tmp, CONTENT_FILE);
  });
  return writeChain.then(() => normalized);
}

function ensureCsrf(req) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  return req.session.csrfToken;
}

function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  return res.redirect('/admin/login');
}

function requireCsrf(req, res, next) {
  const token = req.get('x-csrf-token') || req.body?._csrf;
  if (token && req.session?.csrfToken && safeEqual(token, req.session.csrfToken)) return next();
  return res.status(403).json({ error: 'Invalid CSRF token' });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${crypto.randomUUID().slice(0, 12)}${safeExt}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) return cb(null, true);
    cb(new Error('Only JPG, PNG, WEBP, and GIF images are allowed.'));
  }
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));
app.use(express.json({ limit: '2mb' }));
app.use(session({
  name: 'erine_admin',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000
  }
}));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/', async (_req, res, next) => {
  try {
    const content = await readContent();
    const visibleProjects = content.projects.filter(p => p.visible);
    const featured = visibleProjects.find(p => p.id === content.site.featuredProjectId) || visibleProjects[0] || null;
    res.render('index', { content, projects: visibleProjects, featured, year: new Date().getFullYear() });
  } catch (error) {
    next(error);
  }
});

app.get('/api/content', async (_req, res, next) => {
  try {
    const content = await readContent();
    content.projects = content.projects.filter(p => p.visible);
    res.json(content);
  } catch (error) {
    next(error);
  }
});

app.get('/admin/login', (req, res) => {
  if (req.session?.isAdmin) return res.redirect('/admin');
  res.render('admin-login', { error: null });
});

const loginAttempts = new Map();
app.post('/admin/login', (req, res) => {
  const key = req.ip || 'unknown';
  const now = Date.now();
  const state = loginAttempts.get(key) || { count: 0, until: 0 };
  if (state.until > now) {
    return res.status(429).render('admin-login', { error: 'Too many login attempts. Try again in a few minutes.' });
  }

  const ok = safeEqual(req.body.username || '', ADMIN_USER) && safeEqual(req.body.password || '', ADMIN_PASSWORD);
  if (!ok) {
    state.count += 1;
    if (state.count >= 5) {
      state.until = now + 5 * 60 * 1000;
      state.count = 0;
    }
    loginAttempts.set(key, state);
    return res.status(401).render('admin-login', { error: 'Username or password is incorrect.' });
  }

  loginAttempts.delete(key);
  req.session.regenerate(err => {
    if (err) return res.status(500).send('Could not start admin session.');
    req.session.isAdmin = true;
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
    res.redirect('/admin');
  });
});

app.get('/admin', requireAdmin, async (req, res, next) => {
  try {
    const content = await readContent();
    res.render('admin', { csrfToken: ensureCsrf(req), content, adminUser: ADMIN_USER });
  } catch (error) {
    next(error);
  }
});

app.post('/admin/logout', requireAdmin, requireCsrf, (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

app.get('/admin/api/content', requireAdmin, async (_req, res, next) => {
  try {
    res.json(await readContent());
  } catch (error) {
    next(error);
  }
});

app.put('/admin/api/content', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const saved = await writeContent(req.body);
    res.json({ ok: true, content: saved });
  } catch (error) {
    next(error);
  }
});

app.post('/admin/api/upload', requireAdmin, requireCsrf, upload.array('images', 20), (req, res) => {
  const files = (req.files || []).map(file => ({
    name: file.originalname,
    path: `/uploads/${file.filename}`,
    size: file.size
  }));
  res.json({ ok: true, files });
});

app.get('/admin/api/export', requireAdmin, async (_req, res, next) => {
  try {
    const content = await readContent();
    res.setHeader('Content-Disposition', `attachment; filename="erine-portfolio-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    res.type('application/json').send(JSON.stringify(content, null, 2));
  } catch (error) {
    next(error);
  }
});

app.use((err, req, res, _next) => {
  console.error(err);
  const message = err?.message || 'Internal server error';
  if (req.path.startsWith('/admin/api/') || req.path.startsWith('/api/')) {
    return res.status(err.status || 500).json({ error: message });
  }
  res.status(500).send('Internal server error');
});

ensureStorage().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Erine Portfolio CMS listening on http://0.0.0.0:${PORT}`);
    if (ADMIN_PASSWORD === 'change-me-now') {
      console.warn('WARNING: default admin password is in use. Change ADMIN_PASSWORD before exposing this service.');
    }
  });
}).catch(error => {
  console.error('Failed to initialize storage:', error);
  process.exit(1);
});
