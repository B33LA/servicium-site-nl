'use strict';

// ── Auth ───────────────────────────────────────────────────────────────────

const token = localStorage.getItem('cms_token');
if (!token) window.location.href = '/admin';

async function authFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      ...(options.headers || {})
    }
  });
  if (res.status === 401) {
    localStorage.removeItem('cms_token');
    window.location.href = '/admin';
  }
  return res;
}

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('cms_token');
  window.location.href = '/admin';
});

// ── Toast ──────────────────────────────────────────────────────────────────

function toast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> ${message}`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

// ── Navigation ─────────────────────────────────────────────────────────────

let currentPanel = 'dashboard';

function showPanel(panelId) {
  // Hide all panels
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show target panel
  const panel = document.getElementById('panel-' + panelId);
  if (panel) panel.classList.add('active');

  // Highlight nav
  document.querySelectorAll(`.nav-item[data-panel="${panelId}"]`).forEach(n => n.classList.add('active'));

  currentPanel = panelId;
  populatePanel(panelId);
}

// Attach nav click handlers
document.querySelectorAll('.nav-item[data-panel]').forEach(item => {
  item.addEventListener('click', () => showPanel(item.dataset.panel));
});

document.querySelectorAll('.quick-link[data-panel]').forEach(item => {
  item.addEventListener('click', () => showPanel(item.dataset.panel));
});

// ── Content state ──────────────────────────────────────────────────────────

let content = null;

async function loadContent() {
  try {
    const res = await authFetch('/api/content');
    content = await res.json();
    updateDashboardStats();
    populatePanel(currentPanel);
  } catch (err) {
    toast('Failed to load content', 'error');
  }
}

function updateDashboardStats() {
  if (!content) return;
  const t = document.getElementById('stat-testimonials');
  const f = document.getElementById('stat-faq');
  const tm = document.getElementById('stat-team');
  if (t) t.textContent = (content.pages.home.testimonials || []).length;
  if (f) f.textContent = (content.pages.about.faq || []).length;
  if (tm) tm.textContent = (content.pages.about.team || []).length;
}

// ── Panel population dispatcher ────────────────────────────────────────────

function populatePanel(panelId) {
  if (!content) return;
  switch (panelId) {
    case 'site': populateSite(); break;
    case 'home-meta': renderMetaCard('home', 'meta-card-home'); break;
    case 'home-hero': populateHomeHero(); break;
    case 'home-whyus': populateWhyUs(); break;
    case 'home-testimonials': populateTestimonials(); break;
    case 'home-cta': populateHomeCta(); break;
    case 'services-meta': renderMetaCard('services', 'meta-card-services'); break;
    case 'services-hero': populateServicesHero(); break;
    case 'services-bookkeeping': renderServiceEditor('bookkeeping'); break;
    case 'services-tax': renderServiceEditor('tax'); break;
    case 'services-expat': renderServiceEditor('expat'); break;
    case 'services-planning': renderServiceEditor('planning'); break;
    case 'about-meta': renderMetaCard('about', 'meta-card-about'); break;
    case 'about-hero': populateAboutHero(); break;
    case 'about-story': populateAboutStory(); break;
    case 'about-team': populateTeam(); break;
    case 'about-faq': populateFaq(); break;
    case 'about-cta': populateAboutCta(); break;
    case 'contact-meta': renderMetaCard('contact', 'meta-card-contact'); break;
    case 'contact-hero': populateContactHero(); break;
    case 'contact-hours': populateContactHours(); break;
  }
}

// ── Generic API save helpers ────────────────────────────────────────────────

async function saveSection(page, section, getData) {
  const data = getData();
  try {
    const res = await authFetch(`/api/content/pages/${page}/${section}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (res.ok) {
      // Update local content cache
      content.pages[page][section] = data;
      toast('Saved successfully!');
      updateDashboardStats();
    } else {
      const err = await res.json();
      toast(err.error || 'Save failed', 'error');
    }
  } catch {
    toast('Network error', 'error');
  }
}

async function saveMeta(page) {
  const prefix = `meta-${page}-`;
  const data = {
    title: document.getElementById(prefix + 'title').value,
    description: document.getElementById(prefix + 'description').value,
    ogTitle: document.getElementById(prefix + 'ogTitle').value,
    ogDescription: document.getElementById(prefix + 'ogDescription').value,
    ogUrl: document.getElementById(prefix + 'ogUrl').value
  };
  try {
    const res = await authFetch(`/api/content/pages/${page}/meta`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (res.ok) {
      content.pages[page].meta = data;
      toast('Meta tags saved!');
    } else {
      toast('Save failed', 'error');
    }
  } catch {
    toast('Network error', 'error');
  }
}

// ── Meta tag card renderer ─────────────────────────────────────────────────

function renderMetaCard(page, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const meta = content.pages[page].meta || {};
  container.innerHTML = `
    <div class="card-header"><span class="card-title">Meta Tags</span></div>
    <div class="form-group">
      <label>Page Title</label>
      <input type="text" id="meta-${page}-title" value="${esc(meta.title || '')}" />
    </div>
    <div class="form-group">
      <label>Meta Description</label>
      <textarea id="meta-${page}-description" rows="3">${esc(meta.description || '')}</textarea>
    </div>
    <div class="form-group">
      <label>OG Title</label>
      <input type="text" id="meta-${page}-ogTitle" value="${esc(meta.ogTitle || '')}" />
    </div>
    <div class="form-group">
      <label>OG Description</label>
      <textarea id="meta-${page}-ogDescription" rows="2">${esc(meta.ogDescription || '')}</textarea>
    </div>
    <div class="form-group">
      <label>OG URL</label>
      <input type="url" id="meta-${page}-ogUrl" value="${esc(meta.ogUrl || '')}" />
    </div>
    <button class="btn btn-primary" onclick="saveMeta('${page}')">Save Meta Tags</button>
  `;
}

// ── Site settings ──────────────────────────────────────────────────────────

function populateSite() {
  if (!content) return;
  const s = content.site;
  setValue('site-name', s.name);
  setValue('site-email', s.email);
  setValue('site-location', s.location);
  setValue('site-booking-url', s.bookingUrl);
}

async function saveSiteSettings() {
  const data = {
    name: document.getElementById('site-name').value,
    email: document.getElementById('site-email').value,
    location: document.getElementById('site-location').value,
    bookingUrl: document.getElementById('site-booking-url').value
  };
  try {
    const res = await authFetch('/api/content/site', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (res.ok) {
      content.site = { ...content.site, ...data };
      toast('Site settings saved!');
    } else {
      toast('Save failed', 'error');
    }
  } catch {
    toast('Network error', 'error');
  }
}

// ── Home Hero ──────────────────────────────────────────────────────────────

function populateHomeHero() {
  const h = content.pages.home.hero;
  setValue('home-hero-badge', h.badge);
  setValue('home-hero-heading', h.heading);
  setValue('home-hero-subheading', h.subheading);
  setValue('home-hero-stat1Value', h.stat1Value);
  setValue('home-hero-stat1Label', h.stat1Label);
  setValue('home-hero-stat2Value', h.stat2Value);
  setValue('home-hero-stat2Label', h.stat2Label);
  setValue('home-hero-stat3Value', h.stat3Value);
  setValue('home-hero-stat3Label', h.stat3Label);
}

function getHomeHero() {
  return {
    badge: val('home-hero-badge'),
    heading: val('home-hero-heading'),
    subheading: val('home-hero-subheading'),
    stat1Value: val('home-hero-stat1Value'),
    stat1Label: val('home-hero-stat1Label'),
    stat2Value: val('home-hero-stat2Value'),
    stat2Label: val('home-hero-stat2Label'),
    stat3Value: val('home-hero-stat3Value'),
    stat3Label: val('home-hero-stat3Label')
  };
}

// ── Home Why Us ────────────────────────────────────────────────────────────

function populateWhyUs() {
  const w = content.pages.home.whyUs;
  setValue('whyus-heading', w.heading);
  setValue('whyus-subtitle', w.subtitle);
  renderWhyUsItems(w.items || []);
}

function renderWhyUsItems(items) {
  const container = document.getElementById('whyus-items-list');
  container.innerHTML = '';
  items.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'array-item';
    el.innerHTML = `
      <div class="array-item-header">
        <span class="array-item-label">Item ${i + 1}</span>
        <button class="btn btn-danger" onclick="removeWhyUsItem(${i})">Remove</button>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Tag</label><input type="text" data-field="tag" value="${esc(item.tag || '')}" /></div>
        <div class="form-group"><label>Title</label><input type="text" data-field="title" value="${esc(item.title || '')}" /></div>
      </div>
      <div class="form-group"><label>Text</label><textarea data-field="text" rows="2">${esc(item.text || '')}</textarea></div>
    `;
    container.appendChild(el);
  });
}

function getWhyUsItems() {
  return Array.from(document.querySelectorAll('#whyus-items-list .array-item')).map(el => ({
    tag: el.querySelector('[data-field="tag"]').value,
    title: el.querySelector('[data-field="title"]').value,
    text: el.querySelector('[data-field="text"]').value
  }));
}

function addWhyUsItem() {
  const items = getWhyUsItems();
  items.push({ tag: '', title: '', text: '' });
  renderWhyUsItems(items);
}

function removeWhyUsItem(index) {
  const items = getWhyUsItems();
  items.splice(index, 1);
  renderWhyUsItems(items);
}

function saveWhyUs() {
  const data = {
    heading: val('whyus-heading'),
    subtitle: val('whyus-subtitle'),
    items: getWhyUsItems()
  };
  saveSection('home', 'whyUs', () => data);
}

// ── Testimonials ───────────────────────────────────────────────────────────

function populateTestimonials() {
  renderTestimonials(content.pages.home.testimonials || []);
}

function renderTestimonials(items) {
  const container = document.getElementById('testimonials-list');
  container.innerHTML = '';
  items.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'array-item';
    el.innerHTML = `
      <div class="array-item-header">
        <span class="array-item-label">Testimonial ${i + 1}</span>
        <button class="btn btn-danger" onclick="removeTestimonial(${i})">Remove</button>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Initials</label><input type="text" data-field="initials" value="${esc(item.initials || '')}" maxlength="3" /></div>
        <div class="form-group"><label>Name</label><input type="text" data-field="name" value="${esc(item.name || '')}" /></div>
      </div>
      <div class="form-group"><label>Role</label><input type="text" data-field="role" value="${esc(item.role || '')}" /></div>
      <div class="form-group"><label>Quote</label><textarea data-field="text" rows="3">${esc(item.text || '')}</textarea></div>
    `;
    container.appendChild(el);
  });
}

function getTestimonials() {
  return Array.from(document.querySelectorAll('#testimonials-list .array-item')).map(el => ({
    initials: el.querySelector('[data-field="initials"]').value,
    name: el.querySelector('[data-field="name"]').value,
    role: el.querySelector('[data-field="role"]').value,
    text: el.querySelector('[data-field="text"]').value
  }));
}

function addTestimonial() {
  const items = getTestimonials();
  items.push({ initials: '', name: '', role: '', text: '' });
  renderTestimonials(items);
}

function removeTestimonial(index) {
  const items = getTestimonials();
  items.splice(index, 1);
  renderTestimonials(items);
}

function saveTestimonials() {
  const data = getTestimonials();
  saveSection('home', 'testimonials', () => data);
}

// ── Home CTA ───────────────────────────────────────────────────────────────

function populateHomeCta() {
  const c = content.pages.home.cta;
  setValue('home-cta-heading', c.heading);
  setValue('home-cta-text', c.text);
  setValue('home-cta-buttonText', c.buttonText);
}

function getHomeCta() {
  return {
    heading: val('home-cta-heading'),
    text: val('home-cta-text'),
    buttonText: val('home-cta-buttonText')
  };
}

// ── Services Hero ──────────────────────────────────────────────────────────

function populateServicesHero() {
  const h = content.pages.services.hero;
  setValue('services-hero-badge', h.badge);
  setValue('services-hero-heading', h.heading);
  setValue('services-hero-subheading', h.subheading);
}

function getServicesHero() {
  return {
    badge: val('services-hero-badge'),
    heading: val('services-hero-heading'),
    subheading: val('services-hero-subheading')
  };
}

// ── Service Editor ─────────────────────────────────────────────────────────

function renderServiceEditor(serviceId) {
  const items = content.pages.services.items || [];
  const service = items.find(s => s.id === serviceId);
  const containerId = `service-editor-${serviceId}`;
  const container = document.getElementById(containerId);
  if (!container || !service) return;

  const featuresHtml = (service.features || []).map((f, i) => `
    <div class="array-item" style="padding:0.6rem 0.75rem;margin-bottom:0.5rem;">
      <div style="display:flex;align-items:center;gap:0.5rem;">
        <input type="text" data-feature="${i}" value="${esc(f)}" style="flex:1;" />
        <button class="btn btn-danger" onclick="removeServiceFeature('${serviceId}', ${i})" style="padding:0.3rem 0.6rem;">✕</button>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="card">
      <div class="card-header"><span class="card-title">Service Details</span></div>
      <div class="form-row">
        <div class="form-group"><label>Emoji</label><input type="text" id="svc-${serviceId}-emoji" value="${esc(service.emoji || '')}" /></div>
        <div class="form-group"><label>Number</label><input type="text" id="svc-${serviceId}-number" value="${esc(service.number || '')}" /></div>
      </div>
      <div class="form-group"><label>Tag / Short Name</label><input type="text" id="svc-${serviceId}-tag" value="${esc(service.tag || '')}" /></div>
      <div class="form-group"><label>Badge Text</label><input type="text" id="svc-${serviceId}-badge" value="${esc(service.badge || '')}" /></div>
      <div class="form-group"><label>Sub-text (card tagline)</label><input type="text" id="svc-${serviceId}-subtext" value="${esc(service.subtext || '')}" /></div>
      <div class="form-group"><label>Heading</label><input type="text" id="svc-${serviceId}-heading" value="${esc(service.heading || '')}" /></div>
      <div class="form-group"><label>Description</label><textarea id="svc-${serviceId}-text" rows="3">${esc(service.text || '')}</textarea></div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Features Checklist</span></div>
      <div id="svc-${serviceId}-features">${featuresHtml}</div>
      <button class="btn btn-add" onclick="addServiceFeature('${serviceId}')">+ Add Feature</button>
      <div style="margin-top:1rem"><button class="btn btn-primary" onclick="saveService('${serviceId}')">Save Service</button></div>
    </div>
  `;
}

function getServiceFeatures(serviceId) {
  return Array.from(document.querySelectorAll(`[data-feature]`))
    .filter(el => el.closest(`#service-editor-${serviceId}`))
    .map(el => el.value)
    .filter(v => v.trim());
}

function addServiceFeature(serviceId) {
  const items = content.pages.services.items || [];
  const service = items.find(s => s.id === serviceId);
  if (service) {
    // Save current state first
    service.features = getServiceFeatures(serviceId);
    service.features.push('');
    renderServiceEditor(serviceId);
  }
}

function removeServiceFeature(serviceId, index) {
  const items = content.pages.services.items || [];
  const service = items.find(s => s.id === serviceId);
  if (service) {
    service.features = getServiceFeatures(serviceId);
    service.features.splice(index, 1);
    renderServiceEditor(serviceId);
  }
}

async function saveService(serviceId) {
  const items = [...(content.pages.services.items || [])];
  const idx = items.findIndex(s => s.id === serviceId);
  if (idx === -1) return;

  const updated = {
    ...items[idx],
    emoji: val(`svc-${serviceId}-emoji`),
    number: val(`svc-${serviceId}-number`),
    tag: val(`svc-${serviceId}-tag`),
    badge: val(`svc-${serviceId}-badge`),
    subtext: val(`svc-${serviceId}-subtext`),
    heading: val(`svc-${serviceId}-heading`),
    text: val(`svc-${serviceId}-text`),
    features: getServiceFeatures(serviceId)
  };

  items[idx] = updated;

  try {
    const res = await authFetch('/api/content/pages/services/items', {
      method: 'PUT',
      body: JSON.stringify(items)
    });
    if (res.ok) {
      content.pages.services.items = items;
      toast('Service saved!');
    } else {
      toast('Save failed', 'error');
    }
  } catch {
    toast('Network error', 'error');
  }
}

// ── About Hero ─────────────────────────────────────────────────────────────

function populateAboutHero() {
  const h = content.pages.about.hero;
  setValue('about-hero-badge', h.badge);
  setValue('about-hero-heading', h.heading);
  setValue('about-hero-subheading', h.subheading);
}

function getAboutHero() {
  return {
    badge: val('about-hero-badge'),
    heading: val('about-hero-heading'),
    subheading: val('about-hero-subheading')
  };
}

// ── About Story ────────────────────────────────────────────────────────────

function populateAboutStory() {
  const s = content.pages.about.story;
  setValue('about-story-heading', s.heading);
  setValue('about-story-para1', s.para1);
  setValue('about-story-para2', s.para2);
}

function getAboutStory() {
  return {
    heading: val('about-story-heading'),
    para1: val('about-story-para1'),
    para2: val('about-story-para2')
  };
}

// ── About Team ─────────────────────────────────────────────────────────────

function populateTeam() {
  renderTeam(content.pages.about.team || []);
}

function renderTeam(items) {
  const container = document.getElementById('team-list');
  container.innerHTML = '';
  items.forEach((member, i) => {
    const el = document.createElement('div');
    el.className = 'array-item';
    el.innerHTML = `
      <div class="array-item-header">
        <span class="array-item-label">Team Member ${i + 1}</span>
        <button class="btn btn-danger" onclick="removeTeamMember(${i})">Remove</button>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Initials</label><input type="text" data-field="initials" value="${esc(member.initials || '')}" maxlength="3" /></div>
        <div class="form-group"><label>Name</label><input type="text" data-field="name" value="${esc(member.name || '')}" /></div>
      </div>
      <div class="form-group"><label>Role</label><input type="text" data-field="role" value="${esc(member.role || '')}" /></div>
      <div class="form-group"><label>Bio</label><textarea data-field="bio" rows="2">${esc(member.bio || '')}</textarea></div>
    `;
    container.appendChild(el);
  });
}

function getTeamMembers() {
  return Array.from(document.querySelectorAll('#team-list .array-item')).map(el => ({
    initials: el.querySelector('[data-field="initials"]').value,
    name: el.querySelector('[data-field="name"]').value,
    role: el.querySelector('[data-field="role"]').value,
    bio: el.querySelector('[data-field="bio"]').value
  }));
}

function addTeamMember() {
  const items = getTeamMembers();
  items.push({ initials: '', name: '', role: '', bio: '' });
  renderTeam(items);
}

function removeTeamMember(index) {
  const items = getTeamMembers();
  items.splice(index, 1);
  renderTeam(items);
}

function saveTeam() {
  const data = getTeamMembers();
  saveSection('about', 'team', () => data);
}

// ── About FAQ ──────────────────────────────────────────────────────────────

function populateFaq() {
  renderFaq(content.pages.about.faq || []);
}

function renderFaq(items) {
  const container = document.getElementById('faq-list');
  container.innerHTML = '';
  items.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'array-item';
    el.innerHTML = `
      <div class="array-item-header">
        <span class="array-item-label">FAQ ${i + 1}</span>
        <button class="btn btn-danger" onclick="removeFaqItem(${i})">Remove</button>
      </div>
      <div class="form-group"><label>Question</label><input type="text" data-field="question" value="${esc(item.question || '')}" /></div>
      <div class="form-group"><label>Answer</label><textarea data-field="answer" rows="3">${esc(item.answer || '')}</textarea></div>
    `;
    container.appendChild(el);
  });
}

function getFaqItems() {
  return Array.from(document.querySelectorAll('#faq-list .array-item')).map(el => ({
    question: el.querySelector('[data-field="question"]').value,
    answer: el.querySelector('[data-field="answer"]').value
  }));
}

function addFaqItem() {
  const items = getFaqItems();
  items.push({ question: '', answer: '' });
  renderFaq(items);
}

function removeFaqItem(index) {
  const items = getFaqItems();
  items.splice(index, 1);
  renderFaq(items);
}

function saveFaq() {
  const data = getFaqItems();
  saveSection('about', 'faq', () => data);
}

// ── About CTA ──────────────────────────────────────────────────────────────

function populateAboutCta() {
  const c = content.pages.about.cta;
  setValue('about-cta-heading', c.heading);
  setValue('about-cta-text', c.text);
  setValue('about-cta-buttonText', c.buttonText);
}

function getAboutCta() {
  return {
    heading: val('about-cta-heading'),
    text: val('about-cta-text'),
    buttonText: val('about-cta-buttonText')
  };
}

// ── Contact Hero ───────────────────────────────────────────────────────────

function populateContactHero() {
  const h = content.pages.contact.hero;
  setValue('contact-hero-badge', h.badge);
  setValue('contact-hero-heading', h.heading);
  setValue('contact-hero-subheading', h.subheading);
}

function getContactHero() {
  return {
    badge: val('contact-hero-badge'),
    heading: val('contact-hero-heading'),
    subheading: val('contact-hero-subheading')
  };
}

// ── Contact Hours ──────────────────────────────────────────────────────────

function populateContactHours() {
  const h = content.pages.contact.hours;
  setValue('contact-hours-weekdays', h.weekdays);
  setValue('contact-hours-saturday', h.saturday);
  setValue('contact-hours-sunday', h.sunday);
}

function getContactHours() {
  return {
    weekdays: val('contact-hours-weekdays'),
    saturday: val('contact-hours-saturday'),
    sunday: val('contact-hours-sunday')
  };
}

// ── Utility helpers ────────────────────────────────────────────────────────

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ── Init ───────────────────────────────────────────────────────────────────

async function init() {
  // Verify token first
  try {
    const res = await authFetch('/api/auth/verify');
    if (!res.ok) {
      localStorage.removeItem('cms_token');
      window.location.href = '/admin';
      return;
    }
  } catch {
    localStorage.removeItem('cms_token');
    window.location.href = '/admin';
    return;
  }
  await loadContent();
}

init();
