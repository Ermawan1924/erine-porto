const grid = document.getElementById('project-grid');
const dialog = document.getElementById('project-dialog');
const gallery = document.getElementById('dialog-gallery');
const title = document.getElementById('dialog-title');
const category = document.getElementById('dialog-category');
const description = document.getElementById('dialog-description');
const tags = document.getElementById('dialog-tags');
let projects = [];

fetch('/api/content')
  .then(r => r.ok ? r.json() : Promise.reject(new Error('Could not load portfolio data')))
  .then(data => { projects = data.projects || []; })
  .catch(() => {});

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function openProject(id) {
  const project = projects.find(p => p.id === id);
  if (!project) return;
  gallery.innerHTML = project.pages.map((page, i) => `<img src="${escapeHtml(page)}" alt="${escapeHtml(project.title)}${project.pages.length > 1 ? ` — page ${i + 1}` : ''}" />`).join('');
  title.textContent = project.title;
  category.textContent = project.label;
  description.textContent = project.description;
  tags.innerHTML = project.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('');
  dialog.showModal();
  document.body.classList.add('modal-open');
}

function handleProjectOpen(element) {
  if (!projects.length) {
    fetch('/api/content').then(r => r.json()).then(data => {
      projects = data.projects || [];
      openProject(element.dataset.id || element.dataset.project);
    });
  } else {
    openProject(element.dataset.id || element.dataset.project);
  }
}

document.querySelectorAll('.project-card').forEach(card => {
  card.addEventListener('click', () => handleProjectOpen(card));
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleProjectOpen(card);
    }
  });
});

document.querySelectorAll('.open-project').forEach(btn => btn.addEventListener('click', () => handleProjectOpen(btn)));

document.querySelector('.dialog-close')?.addEventListener('click', () => dialog.close());
dialog?.addEventListener('click', e => {
  const rect = dialog.getBoundingClientRect();
  if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close();
});
dialog?.addEventListener('close', () => document.body.classList.remove('modal-open'));

document.querySelectorAll('.filter').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(b => b.classList.remove('is-active'));
    button.classList.add('is-active');
    const value = button.dataset.filter;
    document.querySelectorAll('.project-card').forEach(card => {
      card.classList.toggle('hidden', value !== 'all' && card.dataset.category !== value);
    });
  });
});

const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.main-nav');
menuButton?.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  menuButton.setAttribute('aria-expanded', String(open));
});
nav?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
}));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: .08 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
