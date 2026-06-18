/* ===== NAVBAR ===== */
const navbar = document.querySelector('.navbar');
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
});

if (hamburger) {
  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
  });
}

/* ===== ACTIVE NAV LINK ===== */
const currentPage = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(a => {
  if (a.getAttribute('href') === currentPage) a.classList.add('active');
});

/* ===== SCROLL REVEAL ===== */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

/* ===== PARTICLES ===== */
function initParticles(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = canvas.width = canvas.offsetWidth;
  let H = canvas.height = canvas.offsetHeight;
  window.addEventListener('resize', () => { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; });

  const particles = Array.from({ length: 60 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 1.5 + 0.5,
    alpha: Math.random() * 0.5 + 0.1
  }));

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(201,168,76,${p.alpha})`; ctx.fill();
    });
    // draw connections
    particles.forEach((a, i) => {
      particles.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 120) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(201,168,76,${0.08 * (1 - d / 120)})`; ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });
    });
    requestAnimationFrame(draw);
  }
  draw();
}
initParticles('particles-canvas');

/* ===== ABOUT CANVAS ===== */
function initAboutCanvas() {
  const canvas = document.getElementById('about-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W = canvas.width = canvas.offsetWidth;
  let H = canvas.height = canvas.offsetHeight;

  const nodes = [
    { label: '📊', x: 0.5, y: 0.5, size: 60, main: true },
    { label: '🏦', x: 0.2, y: 0.2, size: 44 },
    { label: '📋', x: 0.8, y: 0.2, size: 44 },
    { label: '🌍', x: 0.15, y: 0.65, size: 44 },
    { label: '📈', x: 0.85, y: 0.65, size: 44 },
    { label: '✅', x: 0.5, y: 0.85, size: 38 },
  ];
  let t = 0;
  function draw() {
    ctx.clearRect(0, 0, W, H);
    const offsets = nodes.map((_, i) => ({ dy: Math.sin(t * 0.02 + i) * 8 }));

    // connections
    nodes.forEach((a, i) => {
      if (i === 0) return;
      const ax = a.x * W, ay = a.y * H + offsets[i].dy;
      const bx = nodes[0].x * W, by = nodes[0].y * H + offsets[0].dy;
      const grad = ctx.createLinearGradient(ax, ay, bx, by);
      grad.addColorStop(0, 'rgba(201,168,76,0.1)');
      grad.addColorStop(1, 'rgba(201,168,76,0.3)');
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      ctx.strokeStyle = grad; ctx.lineWidth = 1.5; ctx.stroke();
    });

    // nodes
    nodes.forEach((n, i) => {
      const x = n.x * W, y = n.y * H + offsets[i].dy;
      ctx.beginPath(); ctx.arc(x, y, n.size / 2, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(x, y, 0, x, y, n.size / 2);
      grad.addColorStop(0, n.main ? 'rgba(201,168,76,0.25)' : 'rgba(201,168,76,0.12)');
      grad.addColorStop(1, 'rgba(201,168,76,0.02)');
      ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = n.main ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.25)';
      ctx.lineWidth = n.main ? 2 : 1; ctx.stroke();
      ctx.font = `${n.main ? 1.6 : 1.2}rem sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(n.label, x, y);
    });
    t++; requestAnimationFrame(draw);
  }
  draw();
}
initAboutCanvas();

/* ===== TESTIMONIALS SLIDER ===== */
function initSlider() {
  const track = document.querySelector('.testimonials-track');
  if (!track) return;
  const cards = track.querySelectorAll('.testimonial-card');
  const dots = document.querySelectorAll('.t-dot');
  let current = 0;
  const total = cards.length;

  function goTo(idx) {
    current = idx;
    const cardW = cards[0].offsetWidth + 24;
    const offset = -current * cardW;
    track.style.transform = `translateX(${offset}px)`;
    track.style.transition = 'transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  dots.forEach((d, i) => d.addEventListener('click', () => goTo(i)));
  setInterval(() => goTo((current + 1) % total), 4500);
}
initSlider();

/* ===== FAQ ACCORDION ===== */
document.querySelectorAll('.faq-q').forEach(q => {
  q.addEventListener('click', () => {
    const item = q.parentElement;
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

/* ===== CONTACT FORM ===== */
const form = document.getElementById('contact-form');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('.btn-primary');
    btn.textContent = 'Sending…'; btn.disabled = true;
    setTimeout(() => {
      document.getElementById('form-success').classList.add('show');
      form.reset(); btn.textContent = 'Send Message'; btn.disabled = false;
    }, 1200);
  });
}

/* ===== COUNTER ANIMATION ===== */
function animateCounter(el) {
  const target = parseInt(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  const duration = 2000;
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 4);
    el.textContent = Math.floor(ease * target) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { animateCounter(e.target); counterObserver.unobserve(e.target); }
  });
}, { threshold: 0.5 });
document.querySelectorAll('[data-count]').forEach(el => counterObserver.observe(el));

/* ===== CURSOR GLOW ===== */
const glow = document.createElement('div');
glow.style.cssText = 'position:fixed;width:300px;height:300px;border-radius:50%;pointer-events:none;z-index:0;transition:all 0.3s ease;background:radial-gradient(circle,rgba(201,168,76,0.04) 0%,transparent 70%);transform:translate(-50%,-50%)';
document.body.appendChild(glow);
document.addEventListener('mousemove', e => { glow.style.left = e.clientX + 'px'; glow.style.top = e.clientY + 'px'; });
