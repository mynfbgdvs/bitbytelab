const blocksEl = document.getElementById('blocks');
const statusEl = document.getElementById('status');
let blocks = [];

function renderBlocks() {
  blocksEl.innerHTML = blocks.map((b, i) => `<div class="card">#${i+1} x:${b.x} y:${b.y} z:${b.z} color:${b.color}</div>`).join('');
}

document.getElementById('addBlock').addEventListener('click', () => {
  const b = { x: 0, y: 0, z: 0, sx: 1, sy:1, sz:1, color: '#'+Math.floor(Math.random()*16777215).toString(16) };
  blocks.push(b);
  renderBlocks();
});

document.getElementById('save').addEventListener('click', async () => {
  const token = localStorage.getItem('token');
  const title = document.getElementById('title').value || 'Untitled';
  statusEl.textContent = 'Saving...';
  const res = await fetch('/api/games', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }, body: JSON.stringify({ title, data: { blocks } }) });
  const data = await res.json();
  if (res.ok) { statusEl.textContent = 'Saved!'; } else { statusEl.textContent = data.error || 'Failed'; }
});