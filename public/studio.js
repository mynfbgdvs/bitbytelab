const blocksEl = document.getElementById('blocks');
const statusEl = document.getElementById('status');
const assetListEl = document.getElementById('assetList');
const fileEl = document.getElementById('assetFile');
let blocks = [];

function renderBlocks() {
  blocksEl.innerHTML = blocks.map((b, i) => `<div class="card">#${i+1} x:${b.x} y:${b.y} z:${b.z} color:${b.color} ${b.asset ? 'asset:' + b.asset.filename : ''}</div>`).join('');
}

async function loadAssets() {
  const res = await fetch('/api/assets');
  const assets = await res.json();
  assetListEl.innerHTML = assets.map(a => `<div class="card"><img src="${a.url}" style="max-width:120px;display:block" /><div>${a.filename}</div><button class="btn use" data-id="${a.id}" data-url="${a.url}" data-filename="${a.filename}">Use</button></div>`).join('');
}

assetListEl.addEventListener('click', (e) => {
  const btn = e.target.closest('button.use');
  if (!btn) return;
  const id = btn.dataset.id;
  const url = btn.dataset.url;
  const filename = btn.dataset.filename;
  // add a block that references the selected asset
  const b = { x: 0, y: 0, z: 0, sx: 2, sy:2, sz:2, color: '#ffffff', asset: { id, url, filename } };
  blocks.push(b);
  renderBlocks();
});

document.getElementById('addBlock').addEventListener('click', () => {
  const b = { x: 0, y: 0, z: 0, sx: 1, sy:1, sz:1, color: '#'+Math.floor(Math.random()*16777215).toString(16) };
  blocks.push(b);
  renderBlocks();
});

document.getElementById('uploadAsset').addEventListener('click', async () => {
  if (!fileEl.files[0]) { statusEl.textContent = 'Select a file first'; return; }
  const token = localStorage.getItem('token');
  const fd = new FormData();
  fd.append('file', fileEl.files[0]);
  statusEl.textContent = 'Uploading...';
  const res = await fetch('/api/assets/upload', { method: 'POST', headers: { 'Authorization': token ? `Bearer ${token}` : '' }, body: fd });
  const data = await res.json();
  if (res.ok) { statusEl.textContent = 'Uploaded!'; loadAssets(); } else { statusEl.textContent = data.error || 'Upload failed'; }
});

document.getElementById('save').addEventListener('click', async () => {
  const token = localStorage.getItem('token');
  const title = document.getElementById('title').value || 'Untitled';
  statusEl.textContent = 'Saving...';
  const res = await fetch('/api/games', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }, body: JSON.stringify({ title, data: { blocks } }) });
  const data = await res.json();
  if (res.ok) { statusEl.textContent = 'Saved!'; } else { statusEl.textContent = data.error || 'Failed'; }
});

loadAssets();