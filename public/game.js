const socket = io();
const params = new URLSearchParams(location.search);
const id = params.get('id');
const titleEl = document.getElementById('title');

let scene, camera, renderer;
let localPlayer = { id: null, x: 0, y: 2, z: 0, color: 0x00aaff };
const players = {}; // id -> {mesh, data}

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
  const loader = new THREE.TextureLoader();
  (game.data.blocks || []).forEach(b => {
    const g = new THREE.BoxGeometry(b.sx, b.sy, b.sz);
    if (b.asset && b.asset.url) {
      const texture = loader.load(b.asset.url);
      const m = new THREE.MeshStandardMaterial({ map: texture });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(b.x, b.y, b.z);
      scene.add(mesh);
    } else {
      const m = new THREE.MeshStandardMaterial({ color: b.color || 0x00ff00 });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(b.x, b.y, b.z);
      scene.add(mesh);
    }
  });

  // add local player avatar
  const geometry = new THREE.SphereGeometry(0.6, 16, 16);
  const material = new THREE.MeshStandardMaterial({ color: localPlayer.color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(localPlayer.x, localPlayer.y, localPlayer.z);
  scene.add(mesh);
  localPlayer.mesh = mesh;

  animate();
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

let joined = false;
let controlling = true;
const keys = {};
window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

function updateLocalPlayer(dt) {
  const speed = 6; // units per second
  let moved = false;
  if (keys['w'] || keys['arrowup']) { localPlayer.z -= speed * dt; moved = true; }
  if (keys['s'] || keys['arrowdown']) { localPlayer.z += speed * dt; moved = true; }
  if (keys['a'] || keys['arrowleft']) { localPlayer.x -= speed * dt; moved = true; }
  if (keys['d'] || keys['arrowright']) { localPlayer.x += speed * dt; moved = true; }
  if (moved && localPlayer.mesh) localPlayer.mesh.position.set(localPlayer.x, localPlayer.y, localPlayer.z);
}

let lastTime = performance.now();
function tick() {
  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  updateLocalPlayer(dt);
  requestAnimationFrame(tick);
}

let sendInterval = null;
document.getElementById('join').addEventListener('click', () => {
  socket.emit('join', id);
  joined = true;
  // send updates frequently
  if (!sendInterval) {
    sendInterval = setInterval(() => {
      socket.emit('player_update', { room: id, payload: { x: localPlayer.x, y: localPlayer.y, z: localPlayer.z, color: localPlayer.color } });
    }, 100);
  }
});
document.getElementById('leave').addEventListener('click', () => {
  socket.emit('leave', id);
  joined = false;
  if (sendInterval) { clearInterval(sendInterval); sendInterval = null; }
});

socket.on('room_state', (arr) => {
  arr.forEach(p => {
    if (p.id === socket.id) return;
    addOrUpdateRemote(p);
  });
});

socket.on('user_joined', (data) => addOrUpdateRemote(data));
socket.on('player_update', (data) => addOrUpdateRemote(data));
socket.on('user_left', (data) => removeRemote(data.id));

function addOrUpdateRemote(data) {
  if (!players[data.id]) {
    const geometry = new THREE.SphereGeometry(0.6, 12, 12);
    const material = new THREE.MeshStandardMaterial({ color: data.color || 0xffaa00 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(data.x || 0, data.y || 2, data.z || 0);
    scene.add(mesh);
    players[data.id] = { mesh, data };
  } else {
    const p = players[data.id];
    p.mesh.position.set(data.x || 0, data.y || 2, data.z || 0);
    if (data.color) p.mesh.material.color.setHex(data.color);
    p.data = data;
  }
}

function removeRemote(id) {
  const p = players[id];
  if (!p) return;
  scene.remove(p.mesh);
  delete players[id];
}

loadGame();
requestAnimationFrame(tick);