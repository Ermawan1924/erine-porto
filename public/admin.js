const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
let content = null;
let editingProjectId = null;
let galleryDraft = [];
let toastTimer;

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];
const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

function showToast(message, isError = false) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.toggle('error', isError);
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

function markDirty() {
  $('#save-state').textContent = 'Unsaved changes';
}
function markSaved() {
  $('#save-state').textContent = 'All changes saved';
}

async function api(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.method && options.method !== 'GET') headers['X-CSRF-Token'] = csrf;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try { const data = await res.json(); message = data.error || message; } catch {}
    throw new Error(message);
  }
  const type = res.headers.get('content-type') || '';
  return type.includes('application/json') ? res.json() : res.text();
}

async function uploadFiles(files) {
  if (!files?.length) return [];
  const form = new FormData();
  [...files].forEach(file => form.append('images', file));
  const res = await fetch('/admin/api/upload', { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: form });
  if (!res.ok) {
    let message = 'Upload failed';
    try { message = (await res.json()).error || message; } catch {}
    throw new Error(message);
  }
  return (await res.json()).files || [];
}

function value(id) { return $(id).value.trim(); }
function setValue(id, val = '') { $(id).value = val ?? ''; }

function fillGeneral() {
  const s = content.site;
  setValue('#site-name', s.name); setValue('#site-role', s.role); setValue('#site-location', s.location);
  setValue('#site-hero-eyebrow', s.heroEyebrow); setValue('#site-hero-title', s.heroTitle); setValue('#site-hero-intro', s.heroIntro);
  setValue('#site-availability', s.availability); setValue('#site-email', s.email); setValue('#site-phone', s.phone);
  setValue('#site-instagram', s.instagram); setValue('#site-instagram-label', s.instagramLabel);
  setValue('#site-behance', s.behance); setValue('#site-behance-label', s.behanceLabel);
  setValue('#site-hero-image', s.heroImage); setValue('#site-portrait-image', s.portraitImage); setValue('#site-contact-image', s.contactImage);
  $('#preview-hero').src = s.heroImage; $('#preview-portrait').src = s.portraitImage; $('#preview-contact').src = s.contactImage;
  renderFeaturedSelect();
}

function fillAbout() {
  setValue('#about-eyebrow', content.about.eyebrow); setValue('#about-title', content.about.title);
  setValue('#about-lead', content.about.lead); setValue('#about-body', content.about.body); setValue('#about-statement', content.about.statement);
  setValue('#skills', content.skills.join(', '));
}

function collectGeneral() {
  content.site = {
    ...content.site,
    name: value('#site-name'), role: value('#site-role'), location: value('#site-location'),
    heroEyebrow: value('#site-hero-eyebrow'), heroTitle: value('#site-hero-title'), heroIntro: value('#site-hero-intro'),
    availability: value('#site-availability'), email: value('#site-email'), phone: value('#site-phone'),
    instagram: value('#site-instagram'), instagramLabel: value('#site-instagram-label'),
    behance: value('#site-behance'), behanceLabel: value('#site-behance-label'),
    heroImage: value('#site-hero-image'), portraitImage: value('#site-portrait-image'), contactImage: value('#site-contact-image'),
    featuredProjectId: value('#site-featured')
  };
  content.about = {
    eyebrow: value('#about-eyebrow'), title: value('#about-title'), lead: value('#about-lead'), body: value('#about-body'), statement: value('#about-statement')
  };
  content.skills = value('#skills').split(',').map(x => x.trim()).filter(Boolean);
}

function renderFeaturedSelect() {
  const select = $('#site-featured');
  select.innerHTML = content.projects.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.title)}</option>`).join('');
  select.value = content.site.featuredProjectId || content.projects[0]?.id || '';
}

function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function renderProjects() {
  $('#project-count').textContent = content.projects.length;
  const grid = $('#project-admin-grid');
  grid.innerHTML = content.projects.map((p, idx) => `
    <article class="project-admin-card" data-id="${escapeHtml(p.id)}">
      <img src="${escapeHtml(p.cover)}" alt="${escapeHtml(p.title)}" />
      <div class="project-card-body">
        <div class="project-meta"><span class="pill">${escapeHtml(p.category)}</span>${p.visible ? '' : '<span class="pill hidden-pill">Hidden</span>'}</div>
        <h3>${escapeHtml(p.title)}</h3>
        <div class="card-actions">
          <div class="order-actions"><button type="button" data-move="up" title="Move up" ${idx===0?'disabled':''}>↑</button><button type="button" data-move="down" title="Move down" ${idx===content.projects.length-1?'disabled':''}>↓</button></div>
          <div><button type="button" data-edit>Edit</button><button class="danger" type="button" data-delete>Delete</button></div>
        </div>
      </div>
    </article>`).join('');
  renderFeaturedSelect();
}

function renderExperiences() {
  $('#experience-list').innerHTML = content.experiences.map((e, idx) => `
    <article class="inline-row" data-id="${escapeHtml(e.id)}">
      <label>Period<input data-field="period" value="${escapeHtml(e.period)}" /></label>
      <label>Role<input data-field="title" value="${escapeHtml(e.title)}" /></label>
      <label>Company<input data-field="company" value="${escapeHtml(e.company)}" /></label>
      <div class="row-actions"><button type="button" data-up ${idx===0?'disabled':''}>↑</button><button type="button" data-down ${idx===content.experiences.length-1?'disabled':''}>↓</button><button class="danger" type="button" data-remove>×</button></div>
    </article>`).join('');
}

function renderAchievements() {
  $('#achievement-list').innerHTML = content.achievements.map((a, idx) => `
    <article class="inline-row achievement-row" data-id="${escapeHtml(a.id)}">
      <label>Rank<input data-field="rank" value="${escapeHtml(a.rank)}" /></label>
      <label>Achievement<input data-field="title" value="${escapeHtml(a.title)}" /></label>
      <div class="row-actions"><button type="button" data-up ${idx===0?'disabled':''}>↑</button><button type="button" data-down ${idx===content.achievements.length-1?'disabled':''}>↓</button><button class="danger" type="button" data-remove>×</button></div>
    </article>`).join('');
}

function collectList(containerSelector, source) {
  return $$(containerSelector + ' .inline-row').map(row => {
    const original = source.find(x => x.id === row.dataset.id) || { id: row.dataset.id };
    const item = { ...original };
    row.querySelectorAll('[data-field]').forEach(input => item[input.dataset.field] = input.value.trim());
    return item;
  });
}

function openProjectEditor(id = null) {
  editingProjectId = id;
  const p = id ? content.projects.find(x => x.id === id) : null;
  $('#project-editor-title').textContent = p ? 'Edit project' : 'Add project';
  setValue('#project-id', p?.id || '');
  setValue('#project-title', p?.title || '');
  setValue('#project-label', p?.label || '');
  setValue('#project-description', p?.description || '');
  setValue('#project-tags', (p?.tags || []).join(', '));
  $('#project-category').value = p?.category || 'illustration';
  $('#project-visible').checked = p ? p.visible !== false : true;
  setValue('#project-cover', p?.cover || '');
  $('#project-cover-preview').src = p?.cover || '/assets/page-01.jpg';
  galleryDraft = [...(p?.pages || [])];
  renderGalleryDraft();
  $('#project-cover-file').value = '';
  $('#project-gallery-files').value = '';
  $('#project-editor').showModal();
}

function renderGalleryDraft() {
  $('#project-gallery').innerHTML = galleryDraft.length ? galleryDraft.map((src, idx) => `
    <div class="gallery-item"><img src="${escapeHtml(src)}" alt="Gallery image ${idx + 1}" /><button type="button" data-gallery-remove="${idx}" aria-label="Remove image">×</button></div>`).join('') : '<p class="muted">No gallery images yet.</p>';
}

async function saveProjectDraft() {
  const title = value('#project-title');
  if (!title) throw new Error('Project title is required.');
  const coverFiles = $('#project-cover-file').files;
  const galleryFiles = $('#project-gallery-files').files;
  let cover = value('#project-cover');
  if (coverFiles.length) {
    const uploaded = await uploadFiles(coverFiles);
    cover = uploaded[0]?.path || cover;
  }
  if (galleryFiles.length) {
    const uploaded = await uploadFiles(galleryFiles);
    galleryDraft.push(...uploaded.map(x => x.path));
  }
  if (!cover) cover = galleryDraft[0] || '/assets/page-01.jpg';
  if (!galleryDraft.length) galleryDraft = [cover];
  const id = editingProjectId || uid('project');
  const project = {
    id,
    title,
    category: $('#project-category').value,
    label: value('#project-label'),
    description: value('#project-description'),
    tags: value('#project-tags').split(',').map(x => x.trim()).filter(Boolean),
    visible: $('#project-visible').checked,
    cover,
    pages: galleryDraft
  };
  if (editingProjectId) {
    const idx = content.projects.findIndex(x => x.id === editingProjectId);
    content.projects[idx] = project;
  } else {
    content.projects.push(project);
  }
  renderProjects();
  markDirty();
  $('#project-editor').close();
}

async function saveAll() {
  try {
    $('#save-all').disabled = true;
    $('#save-state').textContent = 'Saving…';
    collectGeneral();
    content.experiences = collectList('#experience-list', content.experiences);
    content.achievements = collectList('#achievement-list', content.achievements);
    const result = await api('/admin/api/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content)
    });
    content = result.content;
    fillGeneral(); fillAbout(); renderProjects(); renderExperiences(); renderAchievements();
    markSaved();
    showToast('Portfolio saved successfully.');
  } catch (err) {
    $('#save-state').textContent = 'Save failed';
    showToast(err.message, true);
  } finally {
    $('#save-all').disabled = false;
  }
}

function moveItem(list, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
}

function bindEvents() {
  $$('.nav-item').forEach(btn => btn.addEventListener('click', () => {
    $$('.nav-item').forEach(x => x.classList.remove('is-active'));
    $$('.admin-tab').forEach(x => x.classList.remove('is-active'));
    btn.classList.add('is-active');
    $(`[data-panel="${btn.dataset.tab}"]`).classList.add('is-active');
    $('#page-title').textContent = btn.textContent.trim().replace(/\d+$/, '').trim();
  }));

  $$('.admin-tab input, .admin-tab textarea, .admin-tab select').forEach(el => el.addEventListener('input', markDirty));
  $('#save-all').addEventListener('click', saveAll);

  $$('[data-upload]').forEach(input => input.addEventListener('change', async () => {
    if (!input.files.length) return;
    try {
      const uploaded = await uploadFiles(input.files);
      if (!uploaded.length) return;
      const target = $('#' + input.dataset.upload);
      const preview = $('#' + input.dataset.preview);
      target.value = uploaded[0].path;
      preview.src = uploaded[0].path;
      markDirty();
      showToast('Image uploaded. Save changes to publish it.');
    } catch (err) { showToast(err.message, true); }
  }));

  $('#add-project').addEventListener('click', () => openProjectEditor());
  $('#project-admin-grid').addEventListener('click', e => {
    const card = e.target.closest('.project-admin-card');
    if (!card) return;
    const idx = content.projects.findIndex(x => x.id === card.dataset.id);
    if (e.target.matches('[data-edit]')) openProjectEditor(card.dataset.id);
    if (e.target.matches('[data-delete]')) {
      if (!confirm(`Delete “${content.projects[idx].title}”?`)) return;
      content.projects.splice(idx, 1); renderProjects(); markDirty();
    }
    if (e.target.matches('[data-move="up"]')) { moveItem(content.projects, idx, -1); renderProjects(); markDirty(); }
    if (e.target.matches('[data-move="down"]')) { moveItem(content.projects, idx, 1); renderProjects(); markDirty(); }
  });

  $('#close-project-editor').addEventListener('click', () => $('#project-editor').close());
  $('#cancel-project').addEventListener('click', () => $('#project-editor').close());
  $('#project-form').addEventListener('submit', async e => {
    e.preventDefault();
    try { await saveProjectDraft(); showToast('Project updated locally. Click Save changes to publish.'); }
    catch (err) { showToast(err.message, true); }
  });
  $('#project-cover-file').addEventListener('change', () => {
    const file = $('#project-cover-file').files[0];
    if (file) $('#project-cover-preview').src = URL.createObjectURL(file);
  });
  $('#project-gallery-files').addEventListener('change', () => markDirty());
  $('#project-gallery').addEventListener('click', e => {
    const btn = e.target.closest('[data-gallery-remove]');
    if (!btn) return;
    galleryDraft.splice(Number(btn.dataset.galleryRemove), 1); renderGalleryDraft();
  });

  $('#add-experience').addEventListener('click', () => {
    content.experiences.push({ id: uid('exp'), period: '', title: '', company: '' }); renderExperiences(); markDirty();
  });
  $('#experience-list').addEventListener('click', e => handleInlineListClick(e, 'experiences', renderExperiences));
  $('#experience-list').addEventListener('input', markDirty);

  $('#add-achievement').addEventListener('click', () => {
    content.achievements.push({ id: uid('ach'), rank: '', title: '' }); renderAchievements(); markDirty();
  });
  $('#achievement-list').addEventListener('click', e => handleInlineListClick(e, 'achievements', renderAchievements));
  $('#achievement-list').addEventListener('input', markDirty);

  $('#import-json').addEventListener('change', async () => {
    const file = $('#import-json').files[0];
    if (!file) return;
    try {
      const restored = JSON.parse(await file.text());
      if (!restored.site || !Array.isArray(restored.projects)) throw new Error('This does not look like a valid portfolio backup.');
      content = restored;
      fillGeneral(); fillAbout(); renderProjects(); renderExperiences(); renderAchievements(); markDirty();
      showToast('Backup loaded. Review it, then click Save changes.');
    } catch (err) { showToast(err.message, true); }
  });
}

function handleInlineListClick(e, key, renderer) {
  const row = e.target.closest('.inline-row');
  if (!row) return;
  if (key === 'experiences') content.experiences = collectList('#experience-list', content.experiences);
  else content.achievements = collectList('#achievement-list', content.achievements);
  const list = content[key];
  const idx = list.findIndex(x => x.id === row.dataset.id);
  if (e.target.matches('[data-remove]')) list.splice(idx, 1);
  if (e.target.matches('[data-up]')) moveItem(list, idx, -1);
  if (e.target.matches('[data-down]')) moveItem(list, idx, 1);
  renderer(); markDirty();
}

async function init() {
  try {
    content = await api('/admin/api/content');
    fillGeneral(); fillAbout(); renderProjects(); renderExperiences(); renderAchievements(); bindEvents(); markSaved();
  } catch (err) {
    showToast(err.message, true);
  }
}

init();
