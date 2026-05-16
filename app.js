// ===== CONFIG =====
const TOTAL_FRAMES = 840;   // 7 clips × 120 frames
const PAGE_COUNT   = 6;     // sections 0–5
const LERP         = 0.07;
const CONCURRENCY  = 48;
const isMobile     = innerWidth < 768;
const FRAME_DIR    = isMobile ? 'frames-mobile' : 'frames-webp';

// ===== STATE =====
let frames       = new Array(TOTAL_FRAMES).fill(null);
let currentFrame = 0;
let targetFrame  = 0;
let loadedCount  = 0;
let isReady      = false;

// ===== CANVAS =====
const canvas = document.getElementById('gl-canvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas, { passive: true });

// ===== DRAW FRAME =====
function drawFrame(idx) {
  const img = frames[Math.max(0, Math.min(idx, TOTAL_FRAMES - 1))];
  if (!img) return;
  const cw = canvas.width, ch = canvas.height;
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale, dh = ih * scale;
  const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

// ===== FRAME LOADER =====
function loadFrame(idx) {
  return new Promise(resolve => {
    const img = new Image();
    const num = String(idx + 1).padStart(6, '0');
    img.src = `${FRAME_DIR}/frame_${num}.webp`;
    img.onload = () => {
      frames[idx] = img;
      loadedCount++;
      updateLoader();
      resolve();
    };
    img.onerror = () => { loadedCount++; updateLoader(); resolve(); };
  });
}

async function loadAllFrames() {
  const queue = Array.from({ length: TOTAL_FRAMES }, (_, i) => i);
  async function worker() {
    while (queue.length > 0) { await loadFrame(queue.shift()); }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
}

// ===== LOADER UI =====
const loaderEl  = document.getElementById('loader');
const loaderBar = document.getElementById('loaderBar');
const loaderPct = document.getElementById('loaderPct');

function updateLoader() {
  const pct = Math.round((loadedCount / TOTAL_FRAMES) * 100);
  loaderBar.style.width = pct + '%';
  loaderPct.textContent = pct + '%';
  if (loadedCount >= TOTAL_FRAMES && !isReady) {
    isReady = true;
    loaderEl.classList.add('hidden');
    setTimeout(() => { loaderEl.style.display = 'none'; }, 700);
    document.querySelector('.floating-cta').classList.add('visible');
  }
}

// ===== SCROLL HANDLER =====
window.addEventListener('scroll', () => {
  if (!isReady) return;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress  = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  targetFrame = progress * (TOTAL_FRAMES - 1);
}, { passive: true });

// ===== RAF LOOP =====
function animate() {
  requestAnimationFrame(animate);
  currentFrame += (targetFrame - currentFrame) * LERP;
  drawFrame(Math.round(currentFrame));
}
animate();

// ===== SECTION OBSERVER =====
const pages    = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.nav-link');

const sectionObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const idx = [...pages].indexOf(entry.target);
    navLinks.forEach((l, i) => l.classList.toggle('active', i === idx - 1));
  });
}, { root: null, rootMargin: '-40% 0px -40% 0px' });
pages.forEach(p => sectionObs.observe(p));

// ===== REVEAL OBSERVER =====
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObs.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal-3d').forEach(el => revealObs.observe(el));

// ===== SCROLL TO SECTION =====
function scrollToSection(idx) {
  const page = pages[idx];
  if (page) page.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
document.querySelectorAll('[data-scroll]').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    scrollToSection(parseInt(el.dataset.scroll));
    closeDrawer();
  });
});

// ===== BURGER =====
const burger    = document.getElementById('burger');
const navDrawer = document.getElementById('navDrawer');
const navScrim  = document.getElementById('navScrim');
const drawerClose = document.getElementById('drawerClose');

function openDrawer()  { navDrawer.hidden = false; navScrim.hidden = false; document.body.style.overflow = 'hidden'; }
function closeDrawer() { navDrawer.hidden = true;  navScrim.hidden = true;  document.body.style.overflow = ''; }
burger.addEventListener('click', openDrawer);
drawerClose.addEventListener('click', closeDrawer);
navScrim.addEventListener('click', closeDrawer);

// ===== CONTACT FORM =====
const contactForm = document.getElementById('contactForm');
const formOk      = document.getElementById('formOk');
if (contactForm) {
  contactForm.addEventListener('submit', e => {
    e.preventDefault();
    const btn = contactForm.querySelector('.btn-submit');
    btn.textContent = '⏳ Отправляем...';
    btn.disabled = true;
    setTimeout(() => {
      contactForm.style.display = 'none';
      formOk.style.display = 'block';
    }, 1200);
  });
}

// ===== FLOATING CTA =====
window.addEventListener('scroll', () => {
  const cta = document.querySelector('.floating-cta');
  if (window.scrollY > 400) cta.classList.add('visible');
  else cta.classList.remove('visible');
}, { passive: true });

// ===== START =====
loadAllFrames();
