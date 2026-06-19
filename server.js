'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'servicium-secret-2025';
const ROOT = __dirname;
const CONTENT_PATH = path.join(ROOT, 'data', 'content.json');

app.use(cors());
app.use(express.json());

// ── Helpers ────────────────────────────────────────────────────────────────

function readContent() {
  return JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8'));
}

function writeContent(data) {
  fs.writeFileSync(CONTENT_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function injectMeta(html, meta) {
  // Replace <title>
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${meta.title || ''}</title>`);

  // Replace or insert meta description
  if (html.includes('name="description"')) {
    html = html.replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
      `<meta name="description" content="${meta.description || ''}" />`
    );
  } else {
    html = html.replace('</head>', `  <meta name="description" content="${meta.description || ''}" />\n</head>`);
  }

  // Build OG tags
  const ogTags = [];
  if (meta.ogTitle) ogTags.push(`  <meta property="og:title" content="${meta.ogTitle}" />`);
  if (meta.ogDescription) ogTags.push(`  <meta property="og:description" content="${meta.ogDescription}" />`);
  if (meta.ogUrl) ogTags.push(`  <meta property="og:url" content="${meta.ogUrl}" />`);
  ogTags.push(`  <meta property="og:type" content="website" />`);

  // Remove any existing OG tags first
  html = html.replace(/<meta property="og:[^"]*"[^>]*\/>\n?/g, '');

  // Insert before </head>
  html = html.replace('</head>', ogTags.join('\n') + '\n</head>');

  return html;
}

function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Static assets (CSS, JS, images, favicon — NOT html pages) ──────────────
// Serve non-HTML static files from root
app.use((req, res, next) => {
  const ext = path.extname(req.path);
  // Skip HTML and admin routes — handled separately
  if (!ext || ext === '.html' || req.path.startsWith('/admin') || req.path.startsWith('/api')) {
    return next();
  }
  const filePath = path.join(ROOT, req.path);
  if (fs.existsSync(filePath)) {
    return res.sendFile(filePath);
  }
  next();
});

// ── Page routes ────────────────────────────────────────────────────────────

function servePage(htmlFile, pageKey) {
  return (req, res) => {
    try {
      const content = readContent();
      const meta = content.pages[pageKey] && content.pages[pageKey].meta ? content.pages[pageKey].meta : {};
      let html = fs.readFileSync(path.join(ROOT, htmlFile), 'utf8');
      html = injectMeta(html, meta);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  };
}

app.get('/', servePage('index.html', 'home'));
app.get('/index.html', servePage('index.html', 'home'));
app.get('/services', servePage('services.html', 'services'));
app.get('/services.html', servePage('services.html', 'services'));
app.get('/about', servePage('about.html', 'about'));
app.get('/about.html', servePage('about.html', 'about'));
app.get('/contact', servePage('contact.html', 'contact'));
app.get('/contact.html', servePage('contact.html', 'contact'));

// ── Admin routes ───────────────────────────────────────────────────────────

app.get('/admin', (req, res) => {
  res.sendFile(path.join(ROOT, 'admin', 'index.html'));
});

app.get('/admin/', (req, res) => {
  res.sendFile(path.join(ROOT, 'admin', 'index.html'));
});

app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(ROOT, 'admin', 'dashboard.html'));
});

// Serve admin static assets (css, js)
app.use('/admin', express.static(path.join(ROOT, 'admin')));

// ── Auth API ───────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Password required' });

  try {
    const content = readContent();
    const hash = content.site.adminPassword;
    const valid = await bcrypt.compare(password, hash);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign({ user: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/verify', requireAuth, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ── Content API ────────────────────────────────────────────────────────────

// GET full content
app.get('/api/content', requireAuth, (req, res) => {
  try {
    const content = readContent();
    res.json(content);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read content' });
  }
});

// PUT full content replacement
app.put('/api/content', requireAuth, (req, res) => {
  try {
    writeContent(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to write content' });
  }
});

// PUT site settings
app.put('/api/content/site', requireAuth, (req, res) => {
  try {
    const content = readContent();
    // Don't overwrite adminPassword unless explicitly provided and non-empty
    const incoming = req.body;
    if (!incoming.adminPassword) {
      incoming.adminPassword = content.site.adminPassword;
    }
    content.site = { ...content.site, ...incoming };
    writeContent(content);
    res.json({ success: true, site: content.site });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update site settings' });
  }
});

// GET page meta
app.get('/api/content/pages/:page/meta', requireAuth, (req, res) => {
  try {
    const content = readContent();
    const page = content.pages[req.params.page];
    if (!page) return res.status(404).json({ error: 'Page not found' });
    res.json(page.meta || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to read content' });
  }
});

// PUT page meta
app.put('/api/content/pages/:page/meta', requireAuth, (req, res) => {
  try {
    const content = readContent();
    if (!content.pages[req.params.page]) return res.status(404).json({ error: 'Page not found' });
    content.pages[req.params.page].meta = { ...content.pages[req.params.page].meta, ...req.body };
    writeContent(content);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update meta' });
  }
});

// PUT any page section
app.put('/api/content/pages/:page/:section', requireAuth, (req, res) => {
  try {
    const content = readContent();
    const { page, section } = req.params;
    if (!content.pages[page]) return res.status(404).json({ error: 'Page not found' });
    content.pages[page][section] = req.body;
    writeContent(content);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Servicium CMS running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin`);
});
