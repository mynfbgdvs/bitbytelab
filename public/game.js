const socket = io();
const params = new URLSearchParams(location.search);
const id = params.get('id');
const titleEl = document.getElementById('title');

let scene, camera, renderer;
function initScene() {
  const container = document.getElementById('canvas');
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, 500);
  container.innerHTML = '';
  container.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, container.clientWidth / 500, 0.1, 1000);
  camera.position.set(0, 10, 20);
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 20, 10);
  scene.add(light);
}

async function loadGame() {
  const res = await fetch('/api/games/' + id);
  if (!res.ok) { titleEl.textContent = 'Game not found'; return; }
  const game = await res.json();
  titleEl.textContent = game.title;
  initScene();
  // simple block rendering
  (game.data.blocks || []).forEach(b => {
    const g = new THREE.BoxGeometry(b.sx, b.sy, b.sz);
    const m = new THREE.MeshStandardMaterial({ color: b.color || 0x00ff00 });
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(b.x, b.y, b.z);
    scene.add(mesh);
  });
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

let joined = false;
document.getElementById('join').addEventListener('click', () => {
  socket.emit('join', id);
  joined = true;
});
document.getElementById('leave').addEventListener('click', () => {
  socket.emit('leave', id);
  joined = false;
});

socket.on('player_update', (data) => {
  // For MVP we just log other players' updates
  console.log('player update:', data);
});

loadGame();