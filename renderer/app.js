const api = window.ps4ftp;

let connected = false;
let entries = [];
let history = [];
let selected = new Set();
let dragCount = 0;
let toastTimer = null;
let payloadPath = null;

const el = (id) => document.getElementById(id);

function showLoader(msg) {
  el('loader-text').textContent = msg || 'Loading...';
  el('loading').classList.add('active');
}

function hideLoader() {
  el('loading').classList.remove('active');
}

function toast(msg, type) {
  const t = el('toast');
  clearTimeout(toastTimer);
  t.className = `toast ${type || 'info'}`;
  t.textContent = msg;
  t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

function setConnected(state) {
  connected = state;
  el('status-dot').classList.toggle('connected', state);
  el('status-text').textContent = state ? 'Connected' : 'Disconnected';
  el('sidebar-actions').style.display = state ? 'flex' : 'none';
  el('path-bar').style.display = state ? 'block' : 'none';
  el('connect-label').textContent = state ? 'Connected' : 'Connect';
  el('connect-icon').textContent = state ? '✓' : '⚡';
  el('btn-connect').disabled = state;
  el('btn-connect').style.opacity = state ? '0.6' : '1';
  if (!state) { history = []; el('nav-row').style.display = 'none'; showEmpty(); }
}

function showEmpty() {
  el('empty-state').style.display = 'flex';
  el('file-browser').style.display = 'none';
  el('content-title').textContent = 'PS4 File Explorer';
  el('content-subtitle').textContent = 'Connect to your PS4 via FTP to browse files';
}

function fmtBytes(n) {
  if (!n) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
  return (n / 1073741824).toFixed(2) + ' GB';
}

const icons = {
  directory:`<svg width="46" height="46" viewBox="0 0 46 46" fill="none"><rect x="2" y="14" width="42" height="27" rx="5" fill="#0055a5"/><path d="M2 18C2 15.8 3.8 14 6 14H19L23 19H40C42.2 19 44 20.8 44 23V38C44 40.2 42.2 42 40 42H6C3.8 42 2 40.2 2 38V18Z" fill="#0070d1"/><rect x="13" y="28" width="20" height="2" rx="1" fill="rgba(255,255,255,0.3)"/><rect x="13" y="32" width="14" height="2" rx="1" fill="rgba(255,255,255,0.18)"/></svg>`,
  pkg:`<svg width="46" height="46" viewBox="0 0 46 46" fill="none"><rect x="4" y="4" width="38" height="38" rx="7" fill="#1a0a2e"/><path d="M23 10L36 17V29L23 36L10 29V17L23 10Z" fill="none" stroke="#a855f7" stroke-width="1.5"/><path d="M23 10L36 17L23 24L10 17Z" fill="#6b21a8" opacity="0.85"/><path d="M23 24V36L10 29V17Z" fill="#7c3aed" opacity="0.65"/><path d="M23 24V36L36 29V17Z" fill="#8b5cf6" opacity="0.75"/><circle cx="23" cy="24" r="3.5" fill="#c084fc"/></svg>`,
  bin:`<svg width="46" height="46" viewBox="0 0 46 46" fill="none"><rect x="4" y="4" width="38" height="38" rx="7" fill="#061828"/><rect x="10" y="14" width="5" height="18" rx="2.5" fill="#22d3ee"/><rect x="18" y="14" width="5" height="18" rx="2.5" fill="#22d3ee" opacity="0.7"/><rect x="26" y="14" width="5" height="18" rx="2.5" fill="#22d3ee"/><rect x="34" y="18" width="5" height="10" rx="2.5" fill="#22d3ee" opacity="0.45"/></svg>`,
  self:`<svg width="46" height="46" viewBox="0 0 46 46" fill="none"><rect x="4" y="4" width="38" height="38" rx="7" fill="#0b1a0b"/><circle cx="23" cy="23" r="13" fill="none" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="4 2.5"/><circle cx="23" cy="23" r="8" fill="#14532d" opacity="0.8"/><path d="M20 19L30 23L20 27V19Z" fill="#4ade80"/></svg>`,
  image:`<svg width="46" height="46" viewBox="0 0 46 46" fill="none"><rect x="4" y="8" width="38" height="30" rx="5" fill="#1a1028"/><circle cx="15" cy="18" r="4.5" fill="#fbbf24"/><path d="M4 30L15 21L22 28L31 19L42 31V35C42 36.7 40.7 38 39 38H7C5.3 38 4 36.7 4 35V30Z" fill="#7c3aed" opacity="0.6"/></svg>`,
  video:`<svg width="46" height="46" viewBox="0 0 46 46" fill="none"><rect x="4" y="8" width="38" height="30" rx="5" fill="#1a0808"/><path d="M19 18L32 23L19 28V18Z" fill="#ef4444"/><circle cx="23" cy="23" r="10" fill="none" stroke="#f87171" stroke-width="1.5" opacity="0.4"/></svg>`,
  audio:`<svg width="46" height="46" viewBox="0 0 46 46" fill="none"><rect x="4" y="4" width="38" height="38" rx="19" fill="#0a1428"/><circle cx="23" cy="23" r="7" fill="#1e40af"/><circle cx="23" cy="23" r="2.5" fill="#93c5fd"/><path d="M23 8C23 8 32 13 32 23C32 33 23 38 23 38" stroke="#3b82f6" stroke-width="1.2" fill="none" opacity="0.5"/><path d="M23 8C23 8 14 13 14 23C14 33 23 38 23 38" stroke="#3b82f6" stroke-width="1.2" fill="none" opacity="0.5"/></svg>`,
  archive:`<svg width="46" height="46" viewBox="0 0 46 46" fill="none"><rect x="6" y="6" width="34" height="34" rx="5" fill="#1c1408"/><rect x="18" y="6" width="10" height="34" fill="rgba(251,191,36,0.1)"/><rect x="6" y="12" width="34" height="7" rx="2" fill="#92400e" opacity="0.6"/><circle cx="23" cy="29" r="5" fill="none" stroke="#fbbf24" stroke-width="1.5"/></svg>`,
  key:`<svg width="46" height="46" viewBox="0 0 46 46" fill="none"><rect x="4" y="4" width="38" height="38" rx="7" fill="#1a1205"/><circle cx="17" cy="22" r="8" fill="none" stroke="#fcd34d" stroke-width="2"/><path d="M23 24L38 24" stroke="#fcd34d" stroke-width="2.2" stroke-linecap="round"/><path d="M34 24V28" stroke="#fcd34d" stroke-width="2" stroke-linecap="round"/><path d="M38 24V27" stroke="#fcd34d" stroke-width="2" stroke-linecap="round"/></svg>`,
  text:`<svg width="46" height="46" viewBox="0 0 46 46" fill="none"><rect x="6" y="4" width="28" height="38" rx="3" fill="#0f1923"/><path d="M34 4L40 10V42H10V38H34V4Z" fill="#1e293b" opacity="0.7"/><path d="M34 4H40L34 10V4Z" fill="#334155"/><rect x="12" y="15" width="16" height="2.5" rx="1.2" fill="#64748b"/><rect x="12" y="21" width="20" height="2.5" rx="1.2" fill="#64748b" opacity="0.8"/><rect x="12" y="27" width="14" height="2.5" rx="1.2" fill="#64748b" opacity="0.6"/></svg>`,
  default:`<svg width="46" height="46" viewBox="0 0 46 46" fill="none"><rect x="6" y="4" width="28" height="38" rx="3" fill="#111827"/><path d="M34 4L40 10V42H10V38H34V4Z" fill="#1f2937" opacity="0.7"/><path d="M34 4H40L34 10V4Z" fill="#374151"/><rect x="12" y="17" width="14" height="2.5" rx="1.2" fill="#4b5563"/><rect x="12" y="23" width="18" height="2.5" rx="1.2" fill="#4b5563" opacity="0.7"/><rect x="12" y="29" width="10" height="2.5" rx="1.2" fill="#4b5563" opacity="0.5"/></svg>`
};

const extMap = { pkg:'pkg',psarc:'pkg',bin:'bin',elf:'bin',self:'self',png:'image',jpg:'image',jpeg:'image',bmp:'image',webp:'image',mp4:'video',avi:'video',mkv:'video',mov:'video',mp3:'audio',wav:'audio',ogg:'audio',flac:'audio',zip:'archive',rar:'archive','7z':'archive',tar:'archive',edat:'key',rif:'key',rap:'key',dat:'text',sav:'text',txt:'text',log:'text',cfg:'text',xml:'text',json:'text',toc:'text' };

function iconFor(entry) {
  if (entry.type === 'directory') return icons.directory;
  const ext = entry.name.split('.').pop().toLowerCase();
  return icons[extMap[ext] || 'default'];
}

function makeCard(entry) {
  const isDir = entry.type === 'directory';
  const tag = isDir ? 'DIR' : (entry.name.split('.').pop().toUpperCase().slice(0,6) || 'FILE');
  const name = entry.name.replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  return `<div class="hm-fcard" data-name="${name}" data-type="${entry.type}">
    <div class="hm-fcard-glow"></div>
    <div class="hm-fcard-thumb"><div class="hm-fcard-svg">${iconFor(entry)}</div></div>
    <div class="hm-fcard-body">
      <div class="hm-fcard-name" title="${entry.name}">${entry.name}</div>
      <div class="hm-fcard-meta">
        ${!isDir ? `<div class="hm-fcard-size">${fmtBytes(entry.size)}</div>` : ''}
        <span class="hm-fcard-type-tag ${isDir ? 'dir' : 'file'}">${tag}</span>
      </div>
    </div>
    <div class="hm-fcard-hover-actions">
      ${!isDir ? `<button class="hm-action-btn download" data-action="dl" data-name="${name}">↓</button>` : ''}
      <button class="hm-action-btn del" data-action="del" data-name="${name}">✕</button>
    </div>
  </div>`;
}

function renderSection(title, count, html) {
  return `<div class="hm-featured"><div class="hm-featured-header"><div class="hm-section-title">${title}</div><span class="hm-count-badge">${count}</span></div><div class="hm-track">${html}</div></div>`;
}

function renderBrowser(data, path) {
  el('path-display').textContent = path;
  el('content-title').textContent = path === '/' ? 'Root Directory' : path.split('/').filter(Boolean).pop();
  const dirs = data.filter(e => e.type === 'directory');
  const files = data.filter(e => e.type === 'file');
  el('content-subtitle').textContent = `${dirs.length} folders · ${files.length} files`;
  el('empty-state').style.display = 'none';
  const browser = el('file-browser');
  browser.style.display = 'block';
  let html = '';
  if (dirs.length) html += renderSection('Folders', dirs.length, dirs.map(makeCard).join(''));
  if (files.length) html += renderSection('Files', files.length, files.map(makeCard).join(''));
  if (!dirs.length && !files.length) html = `<div class="hm-featured"><div class="empty-dir-msg">Empty directory</div></div>`;
  browser.innerHTML = html;
  bindCardEvents();
}

function realName(encoded) {
  const d = document.createElement('div');
  d.innerHTML = encoded;
  return d.textContent;
}

function bindCardEvents() {
  document.querySelectorAll('.hm-fcard').forEach(card => {
    card.addEventListener('click', onCardClick);
    card.addEventListener('contextmenu', onCardRightClick);
  });

  document.querySelectorAll('.hm-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = realName(btn.dataset.name);
      if (btn.dataset.action === 'dl') downloadFile(name);
      if (btn.dataset.action === 'del') deleteFile(name);
    });
  });

  const browser = el('file-browser');
  browser.addEventListener('contextmenu', (e) => {
    if (!connected) return;
    if (e.target.closest('.hm-fcard')) return;
    e.preventDefault();
    openBgMenu(e.clientX, e.clientY);
  });

  browser.addEventListener('click', (e) => {
    if (!e.target.closest('.hm-fcard')) clearSel();
  });
}

function onCardClick(e) {
  if (e.target.closest('.hm-action-btn')) return;
  const card = e.currentTarget;
  const name = realName(card.dataset.name);
  if (e.ctrlKey || e.metaKey) {
    card.classList.toggle('selected');
    card.classList.contains('selected') ? selected.add(name) : selected.delete(name);
    return;
  }
  clearSel();
  if (card.dataset.type === 'directory') openFolder(name);
}

function onCardRightClick(e) {
  e.preventDefault();
  const card = e.currentTarget;
  openFileMenu(e.clientX, e.clientY, realName(card.dataset.name), card.dataset.type);
}

function clearSel() {
  document.querySelectorAll('.hm-fcard.selected').forEach(c => c.classList.remove('selected'));
  selected.clear();
}

function placeMenu(menu, x, y) {
  menu.style.display = 'block';
  menu.style.left = '-9999px';
  menu.style.top = '-9999px';
  requestAnimationFrame(() => {
    const left = Math.min(x, window.innerWidth - menu.offsetWidth - 10);
    const top = Math.min(y, window.innerHeight - menu.offsetHeight - 10);
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  });
}

function closeMenu() { el('ctx-menu').style.display = 'none'; }

function openFileMenu(x, y, name, type) {
  const menu = el('ctx-menu');
  const isDir = type === 'directory';
  menu.innerHTML = `
    <div class="ctx-header"><span class="ctx-fname">${name}</span></div>
    <div class="ctx-sep"></div>
    ${isDir
      ? `<div class="ctx-item" data-a="open"><span class="ctx-ico">↗</span>Open Folder</div>`
      : `<div class="ctx-item" data-a="dl"><span class="ctx-ico">↓</span>Download<span class="ctx-sc">Save to PC</span></div>`
    }
    <div class="ctx-item" data-a="rename"><span class="ctx-ico">✎</span>Rename<span class="ctx-sc">F2</span></div>
    ${!isDir ? `<div class="ctx-item" data-a="dup"><span class="ctx-ico">⧉</span>Duplicate</div>` : ''}
    <div class="ctx-item" data-a="move"><span class="ctx-ico">→</span>Move To…</div>
    <div class="ctx-item" data-a="copy"><span class="ctx-ico">⎘</span>Copy Path</div>
    <div class="ctx-sep"></div>
    <div class="ctx-item" data-a="props"><span class="ctx-ico">ℹ</span>Properties</div>
    <div class="ctx-sep"></div>
    <div class="ctx-item" data-a="selall"><span class="ctx-ico">◻</span>Select All<span class="ctx-sc">Ctrl+A</span></div>
    <div class="ctx-sep"></div>
    <div class="ctx-item danger" data-a="del"><span class="ctx-ico">✕</span>Delete<span class="ctx-sc">Del</span></div>`;
  placeMenu(menu, x, y);
  menu.querySelectorAll('.ctx-item[data-a]').forEach(item => {
    item.addEventListener('click', () => {
      closeMenu();
      const a = item.dataset.a;
      if (a === 'open') openFolder(name);
      else if (a === 'dl') downloadFile(name);
      else if (a === 'rename') modalRename(name);
      else if (a === 'dup') dupFile(name);
      else if (a === 'move') modalMove(name);
      else if (a === 'copy') copyPath(name);
      else if (a === 'props') showProps(name);
      else if (a === 'selall') selectAll();
      else if (a === 'del') deleteFile(name);
    });
  });
}

function openBgMenu(x, y) {
  const menu = el('ctx-menu');
  menu.innerHTML = `
    <div class="ctx-header"><span class="ctx-fname">Current Directory</span></div>
    <div class="ctx-sep"></div>
    <div class="ctx-item" data-a="upload"><span class="ctx-ico">↑</span>Upload Files…</div>
    <div class="ctx-item" data-a="mkdir"><span class="ctx-ico">📁</span>New Folder…</div>
    <div class="ctx-item" data-a="mkfile"><span class="ctx-ico">📄</span>New File…</div>
    <div class="ctx-sep"></div>
    <div class="ctx-item" data-a="selall"><span class="ctx-ico">◻</span>Select All<span class="ctx-sc">Ctrl+A</span></div>
    <div class="ctx-item" data-a="refresh"><span class="ctx-ico">↻</span>Refresh<span class="ctx-sc">F5</span></div>
    <div class="ctx-sep"></div>
    <div class="ctx-item" data-a="copy"><span class="ctx-ico">⎘</span>Copy Current Path</div>`;
  placeMenu(menu, x, y);
  menu.querySelectorAll('.ctx-item[data-a]').forEach(item => {
    item.addEventListener('click', () => {
      closeMenu();
      const a = item.dataset.a;
      if (a === 'upload') el('btn-upload').click();
      else if (a === 'mkdir') modalMkdir();
      else if (a === 'mkfile') modalNewFile();
      else if (a === 'selall') selectAll();
      else if (a === 'refresh') el('btn-refresh').click();
      else if (a === 'copy') navigator.clipboard.writeText(el('path-display').textContent).then(() => toast('Path copied', 'info'));
    });
  });
}

function openModal(title, body, onOk, okLabel, hideCancel) {
  let wrap = el('app-modal');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'app-modal';
    wrap.className = 'modal-overlay';
    document.body.appendChild(wrap);
  }
  wrap.innerHTML = `
    <div class="modal-box">
      <div class="modal-top">
        <span class="modal-title">${title}</span>
        <button class="modal-x" id="mx">✕</button>
      </div>
      <div class="modal-body">${body}</div>
      <div class="modal-footer">
        ${hideCancel ? '' : `<button class="btn btn-secondary" id="mcancel">Cancel</button>`}
        <button class="btn btn-primary" id="mok">${okLabel || 'OK'}</button>
      </div>
    </div>`;
  wrap.style.display = 'flex';
  requestAnimationFrame(() => wrap.classList.add('open'));
  el('mx').addEventListener('click', closeModal);
  if (el('mcancel')) el('mcancel').addEventListener('click', closeModal);
  el('mok').addEventListener('click', onOk);
  wrap.addEventListener('click', (e) => { if (e.target === wrap) closeModal(); });
  const inp = wrap.querySelector('#modal-input');
  if (inp) inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') el('mok').click(); if (e.key === 'Escape') closeModal(); });
}

function closeModal() {
  const wrap = el('app-modal');
  if (!wrap) return;
  wrap.classList.remove('open');
  setTimeout(() => { wrap.style.display = 'none'; }, 200);
}

function modalRename(oldName) {
  openModal('Rename', `
    <div class="modal-field"><label class="modal-label">Current name</label><div class="modal-static">${oldName}</div></div>
    <div class="modal-field"><label class="modal-label">New name</label><input class="input-field" id="modal-input" type="text" value="${oldName}" spellcheck="false"/></div>`,
  async () => {
    const newName = el('modal-input').value.trim();
    if (!newName || newName === oldName) return closeModal();
    closeModal();
    showLoader('Renaming…');
    const r = await api.rename(oldName, newName);
    hideLoader();
    if (r.success) { entries = r.entries; renderBrowser(r.entries, r.currentPath); toast(`Renamed: ${newName}`, 'success'); }
    else toast(r.error || 'Failed', 'error');
  }, 'Rename');
  setTimeout(() => {
    const inp = el('modal-input');
    if (!inp) return;
    inp.focus();
    const dot = inp.value.lastIndexOf('.');
    inp.setSelectionRange(0, dot > 0 ? dot : inp.value.length);
  }, 50);
}

function modalMkdir() {
  openModal('New Folder', `
    <div class="modal-field"><label class="modal-label">Folder name</label><input class="input-field" id="modal-input" type="text" placeholder="NewFolder" spellcheck="false"/></div>`,
  async () => {
    const name = el('modal-input').value.trim();
    if (!name) return;
    closeModal();
    showLoader('Creating…');
    const r = await api.mkdir(name);
    hideLoader();
    if (r.success) { entries = r.entries; renderBrowser(r.entries, r.currentPath); toast(`Created: ${name}`, 'success'); }
    else toast(r.error || 'Failed', 'error');
  }, 'Create');
  setTimeout(() => { const i = el('modal-input'); if (i) i.focus(); }, 50);
}

function modalNewFile() {
  openModal('New File', `
    <div class="modal-field"><label class="modal-label">File name</label><input class="input-field" id="modal-input" type="text" placeholder="filename.txt" spellcheck="false"/></div>`,
  async () => {
    const name = el('modal-input').value.trim();
    if (!name) return;
    closeModal();
    showLoader('Creating file…');
    const r = await api.newFile(name);
    hideLoader();
    if (r.success) { entries = r.entries; renderBrowser(r.entries, r.currentPath); toast(`Created: ${name}`, 'success'); }
    else toast(r.error || 'Failed', 'error');
  }, 'Create');
  setTimeout(() => { const i = el('modal-input'); if (i) { i.focus(); const dot = i.value.lastIndexOf('.'); if (dot > 0) i.setSelectionRange(0, dot); else i.select(); } }, 50);
}

function modalMove(filename) {
  const dirs = entries.filter(e => e.type === 'directory').map(e => e.name);
  const opts = dirs.map(d => `<option value="${d}">${d}</option>`).join('');
  openModal('Move To', `
    <div class="modal-field"><label class="modal-label">Moving</label><div class="modal-static">${filename}</div></div>
    <div class="modal-field"><label class="modal-label">Destination</label>${dirs.length ? `<select class="input-field" id="modal-sel"><option value="">— select folder —</option>${opts}</select>` : `<div class="modal-static" style="color:var(--warning)">No folders available</div>`}</div>
    <div class="modal-field"><label class="modal-label">Or type custom path</label><input class="input-field" id="modal-input" type="text" placeholder="/path/to/folder" spellcheck="false"/></div>`,
  async () => {
    const sel = el('modal-sel');
    const inp = el('modal-input');
    const target = (inp && inp.value.trim()) || (sel && sel.value);
    if (!target) { toast('Select destination', 'error'); return; }
    closeModal();
    showLoader('Moving…');
    const r = await api.moveto(filename, target);
    hideLoader();
    if (r.success) { entries = r.entries; renderBrowser(r.entries, r.currentPath); toast(`Moved to: ${target}`, 'success'); }
    else toast(r.error || 'Failed', 'error');
  }, 'Move');
}

async function showProps(filename) {
  showLoader('Loading…');
  const r = await api.getprops(filename);
  hideLoader();
  if (!r.success) { toast(r.error || 'Failed', 'error'); return; }
  const p = r.props;
  openModal('Properties', `
    <div class="props-grid">
      <div class="props-row"><span class="props-key">Name</span><span class="props-val">${p.name}</span></div>
      <div class="props-row"><span class="props-key">Type</span><span class="props-val">${p.type}</span></div>
      <div class="props-row"><span class="props-key">Size</span><span class="props-val">${fmtBytes(p.size)}</span></div>
      <div class="props-row"><span class="props-key">Path</span><span class="props-val props-mono">${p.path}</span></div>
      <div class="props-row"><span class="props-key">Modified</span><span class="props-val">${p.date ? new Date(p.date).toLocaleString() : '—'}</span></div>
      <div class="props-row"><span class="props-key">Permissions</span><span class="props-val props-mono">${p.permissions}</span></div>
    </div>`, () => closeModal(), 'Close', true);
}

function selectAll() {
  document.querySelectorAll('.hm-fcard').forEach(c => { c.classList.add('selected'); selected.add(c.dataset.name); });
  toast(`Selected ${selected.size} items`, 'info');
}

function copyPath(name) {
  const base = el('path-display').textContent;
  const full = base === '/' ? `/${name}` : `${base}/${name}`;
  navigator.clipboard.writeText(full).then(() => toast('Path copied', 'info'));
}

async function openFolder(name) {
  if (!connected) return;
  showLoader(`Opening ${name}…`);
  const r = await api.navigate(name);
  hideLoader();
  if (r.success) { history.push(r.currentPath); entries = r.entries; renderBrowser(r.entries, r.currentPath); el('nav-row').style.display = history.length > 1 ? 'block' : 'none'; }
  else toast(r.error || 'Cannot open', 'error');
}

async function deleteFile(name) {
  if (!connected) return;
  if (!confirm(`Delete "${name}"?\nThis cannot be undone.`)) return;
  showLoader('Deleting…');
  const r = await api.delete(name);
  hideLoader();
  if (r.success) { entries = r.entries; renderBrowser(r.entries, r.currentPath); toast(`Deleted: ${name}`, 'success'); }
  else toast(r.error || 'Failed', 'error');
}

async function downloadFile(name) {
  if (!connected) return;
  showLoader(`Downloading ${name}…`);
  const r = await api.download(name);
  hideLoader();
  if (r.success) toast(`Downloaded: ${name}`, 'success');
  else if (r.error !== 'Cancelled') toast(r.error || 'Failed', 'error');
}

async function dupFile(name) {
  if (!connected) return;
  showLoader('Duplicating…');
  const r = await api.duplicate(name);
  hideLoader();
  if (r.success) { entries = r.entries; renderBrowser(r.entries, r.currentPath); toast(`Duplicated as: ${r.copyName}`, 'success'); }
  else toast(r.error || 'Failed', 'error');
}

async function loadDir(path) {
  showLoader('Loading files…');
  const r = await api.list(path);
  hideLoader();
  if (r.success) { entries = r.entries; history = [r.currentPath]; renderBrowser(r.entries, r.currentPath); el('nav-row').style.display = 'none'; }
  else toast(r.error || 'Failed', 'error');
}

el('btn-connect').addEventListener('click', async () => {
  const host = el('ftp-host').value.trim();
  const user = el('ftp-user').value.trim() || 'anonymous';
  const pass = el('ftp-pass').value;
  const port = parseInt(el('ftp-port').value) || 21;
  if (!host) { toast('Enter PS4 IP address', 'error'); return; }
  showLoader(`Connecting to ${host}:${port}…`);
  const r = await api.connect({ host, user, password: pass, port });
  hideLoader();
  if (r.success) { setConnected(true); toast('Connected to PS4', 'success'); await loadDir('/'); }
  else toast(r.error || 'Connection failed', 'error');
});

el('btn-disconnect').addEventListener('click', async () => {
  showLoader('Disconnecting…');
  await api.disconnect();
  hideLoader();
  setConnected(false);
  toast('Disconnected', 'info');
});

el('btn-back').addEventListener('click', async () => {
  if (!connected) return;
  showLoader('Going back…');
  const r = await api.navigate('..');
  hideLoader();
  if (r.success) { if (history.length) history.pop(); entries = r.entries; renderBrowser(r.entries, r.currentPath); el('nav-row').style.display = history.length > 1 ? 'block' : 'none'; }
  else toast(r.error || 'Cannot go back', 'error');
});

el('btn-refresh').addEventListener('click', async () => {
  if (!connected) return;
  showLoader('Refreshing…');
  const r = await api.list();
  hideLoader();
  if (r.success) { entries = r.entries; renderBrowser(r.entries, r.currentPath); toast('Refreshed', 'info'); }
  else toast(r.error || 'Failed', 'error');
});

el('btn-upload').addEventListener('click', async () => {
  if (!connected) return;
  showLoader('Uploading…');
  const r = await api.upload();
  hideLoader();
  if (r.success) { entries = r.entries; renderBrowser(r.entries, r.currentPath); toast(`Uploaded ${r.uploaded} file${r.uploaded !== 1 ? 's' : ''}`, 'success'); }
  else if (r.error !== 'Cancelled') toast(r.error || 'Failed', 'error');
});

const scrollCont = el('scroll-container');
const dropZone = el('drop-zone');

scrollCont.addEventListener('dragenter', (e) => {
  e.preventDefault();
  if (!connected) return;
  if (++dragCount === 1) dropZone.classList.add('active');
});

scrollCont.addEventListener('dragleave', () => {
  if (--dragCount <= 0) { dragCount = 0; dropZone.classList.remove('active'); }
});

document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

dropZone.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
dropZone.addEventListener('dragleave', () => { dragCount = 0; dropZone.classList.remove('active'); });
dropZone.addEventListener('drop', async (e) => {
  e.preventDefault();
  dragCount = 0;
  dropZone.classList.remove('active');
  if (!connected) { toast('Connect to PS4 first', 'error'); return; }
  const files = Array.from(e.dataTransfer.files);
  if (!files.length) return;
  showLoader(`Uploading ${files.length} file${files.length > 1 ? 's' : ''}…`);
  const r = await api.uploadPaths(files.map(f => f.path));
  hideLoader();
  if (r.success) { entries = r.entries; renderBrowser(r.entries, r.currentPath); toast(`Uploaded ${r.uploaded} file${r.uploaded !== 1 ? 's' : ''}`, 'success'); }
  else toast(r.error || 'Failed', 'error');
});

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.getElementById('panel-' + btn.dataset.tab);
    if (panel) panel.classList.add('active');
  });
});

el('btn-pl-pick').addEventListener('click', async () => {
  const r = await api.payloadPickFile();
  if (!r.success) return;
  payloadPath = r.filePath;
  el('pl-file-name').textContent = r.name;
  el('pl-file-display').classList.add('has-file');
  logEntry(`File selected: ${r.name}`, 'info');
});

el('btn-pl-send').addEventListener('click', async () => {
  const host = el('pl-host').value.trim();
  const port = el('pl-port').value.trim();
  if (!host) { toast('Enter PS4 IP address', 'error'); return; }
  if (!port) { toast('Enter port number', 'error'); return; }
  if (!payloadPath) { toast('Select a payload file first', 'error'); return; }
  el('pl-status-dot').className = 'pl-status-dot sending';
  el('pl-status-text').textContent = 'Sending…';
  el('pl-status-extra').textContent = '';
  el('btn-pl-send').disabled = true;
  logEntry(`Connecting to ${host}:${port}…`, 'info');
  const r = await api.payloadSend({ host, port: parseInt(port), filePath: payloadPath });
  el('btn-pl-send').disabled = false;
  if (r.success) {
    el('pl-status-dot').className = 'pl-status-dot success';
    el('pl-status-text').textContent = 'Sent successfully';
    el('pl-status-extra').textContent = fmtBytes(r.size);
    logEntry(`✓ Payload sent! ${fmtBytes(r.size)} → ${host}:${port}`, 'success');
    toast('Payload sent!', 'success');
  } else {
    el('pl-status-dot').className = 'pl-status-dot error';
    el('pl-status-text').textContent = 'Failed';
    el('pl-status-extra').textContent = r.error;
    logEntry(`✗ ${r.error}`, 'error');
    toast(r.error || 'Failed', 'error');
  }
});

el('btn-log-clear').addEventListener('click', () => {
  el('payload-log').innerHTML = '<div class="log-entry info">Log cleared</div>';
});

function logEntry(msg, type) {
  const log = el('payload-log');
  const time = new Date().toLocaleTimeString();
  const row = document.createElement('div');
  row.className = `log-entry ${type || 'info'}`;
  row.innerHTML = `<span class="log-time">${time}</span>${msg}`;
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
}

['btn-telegram','footer-tg-btn','footer-tg-payload','about-tg-btn'].forEach(id => {
  const node = el(id);
  if (node) node.addEventListener('click', (e) => { e.preventDefault(); api.openExternal('https://t.me/C2_9H'); });
});

document.addEventListener('click', closeMenu);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeMenu(); closeModal(); }
  if (e.key === 'F2') { const s = document.querySelector('.hm-fcard.selected'); if (s) modalRename(realName(s.dataset.name)); }
  if (e.key === 'F5') el('btn-refresh').click();
  if (e.ctrlKey && e.key === 'a') { e.preventDefault(); selectAll(); }
  if (e.key === 'Delete') { const s = document.querySelector('.hm-fcard.selected'); if (s) deleteFile(realName(s.dataset.name)); }
});

[el('ftp-host'), el('ftp-pass')].forEach(node => {
  node.addEventListener('keydown', (e) => { if (e.key === 'Enter') el('btn-connect').click(); });
});

el('btn-min').addEventListener('click', () => api.minimizeWindow());
el('btn-max').addEventListener('click', () => api.maximizeWindow());
el('btn-close').addEventListener('click', () => api.closeWindow());
