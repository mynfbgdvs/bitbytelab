async function loadGames() {
  const el = document.getElementById('gameList');
  el.innerHTML = 'Loading...';
  const res = await fetch('/api/games');
  const data = await res.json();
  if (!Array.isArray(data)) { el.textContent = 'Failed to load games'; return; }
  el.innerHTML = data.map(g => `<div class="card"><h4>${g.title}</h4><a href="/game.html?id=${g.id}" class="btn">Play</a></div>`).join('');
}
window.addEventListener('DOMContentLoaded', loadGames);