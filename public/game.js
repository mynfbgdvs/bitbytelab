const socket = io();
const params = new URLSearchParams(location.search);
const id = params.get('id');
const titleEl = document.getElementById('title');

let scene, camera, renderer;
let localPlayer = { id: null, x: 0, y: 2, z: 0, color: 0x00aaff };
const players = {}; // id -> {mesh, data}
const _tmpVec = new THREE.Vector3(); // reused temporary vector for interpolation

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
  // if the game contains a user script, prefer running it (2D or 3D) instead of static block rendering
  const loader = new THREE.TextureLoader();

  if (game.data && game.data.script && game.data.type === '2d') {
    // run a 2D script in the preview area
    runUser2DScript(game.data.script);
    return;
  }

  if (game.data && game.data.script && game.data.type === '3d') {
    runUser3DScript(game.data.script);
    return;
  }

  // fallback: simple block rendering
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

  // add local player avatar (if not running user script)
  const geometry = new THREE.SphereGeometry(0.6, 16, 16);
  const material = new THREE.MeshStandardMaterial({ color: localPlayer.color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(localPlayer.x, localPlayer.y, localPlayer.z);
  scene.add(mesh);
  localPlayer.mesh = mesh;

  // if we received remote states before scene was ready, create meshes for them now
  Object.keys(stateBuffers).forEach(pid => {
    if (!players[pid]) {
      const initial = stateBuffers[pid][stateBuffers[pid].length - 1] || {};
      const geometry = new THREE.SphereGeometry(0.6, 12, 12);
      const material = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(initial.x || 0, initial.y || 2, initial.z || 0);
      scene.add(mesh);
      players[pid] = { mesh, data: initial };
    }
  });

  animate();

  // user script runners (2D & 3D) -----------------------------------------------------------------
  function runUser2DScript(script) {
    // create full-screen canvas in canvas container
    const container = document.getElementById('canvas');
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth; canvas.height = 500;
    canvas.style.width = '100%'; canvas.style.height = '100%';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    const sprites = {};
    const engine2d = {
      spawnSprite(id, x, y, color) { sprites[id] = { x, y, color }; },
      moveSprite(id, dx, dy) { const s = sprites[id]; if (s) { s.x += dx; s.y += dy; } },
      clear() { Object.keys(sprites).forEach(k => delete sprites[k]); }
    };

    // sandbox run
    try { (new Function('engine', script))(engine2d); } catch (e) { console.error('Script error', e); }

    function loop() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      if (typeof onTick === 'function') { try { onTick(); } catch(e){ } }
      // draw sprites
      Object.keys(sprites).forEach(k => {
        const s = sprites[k];
        ctx.fillStyle = s.color || '#fff';
        ctx.fillRect(canvas.width/2 + s.x*20 - 10, canvas.height/2 + s.y*20 - 10, 20, 20);
      });
      requestAnimationFrame(loop);
    }
    loop();
  }

  function runUser3DScript(script) {
    const container = document.getElementById('canvas');
    container.innerHTML = '';
    const renderer2 = new THREE.WebGLRenderer({ antialias: true });
    renderer2.setSize(container.clientWidth, 500);
    container.appendChild(renderer2.domElement);
    const scene2 = new THREE.Scene();
    const camera2 = new THREE.PerspectiveCamera(60, container.clientWidth / 500, 0.1, 1000);
    camera2.position.set(0, 8, 12);
    const light2 = new THREE.DirectionalLight(0xffffff,1); light2.position.set(10,20,10); scene2.add(light2);

    const blocksMap = {};
    const engine3 = {
      spawnBlock(id, x, y, z, size, color) {
        const g = new THREE.BoxGeometry(size, size, size);
        const m = new THREE.MeshStandardMaterial({ color });
        const mesh = new THREE.Mesh(g, m);
        mesh.position.set(x, y, z);
        scene2.add(mesh);
        blocksMap[id] = mesh;
      },
      setBlockPos(id, x, y, z) { const m = blocksMap[id]; if (m) m.position.set(x, y, z); }
    };

    try { (new Function('engine', script))(engine3); } catch (e) { console.error('Script error', e); }

    function render2() { requestAnimationFrame(render2); renderer2.render(scene2, camera2); }
    render2();
  }
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

// Input sending & client-side prediction
let inputSeq = 0;
const pendingInputs = []; // unacked inputs
let lastSend = 0;
const SEND_INTERVAL = 50; // ms

function gatherInput() {
  const speed = 6;
  let vx = 0, vy = 0, vz = 0;
  if (keys['w'] || keys['arrowup']) { vz -= speed; }
  if (keys['s'] || keys['arrowdown']) { vz += speed; }
  if (keys['a'] || keys['arrowleft']) { vx -= speed; }
  if (keys['d'] || keys['arrowright']) { vx += speed; }
  return { vx, vy, vz };
}

function applyInputLocally(input, dt) {
  localPlayer.x += (input.vx || 0) * dt;
  localPlayer.y += (input.vy || 0) * dt;
  localPlayer.z += (input.vz || 0) * dt;
  if (localPlayer.mesh) localPlayer.mesh.position.set(localPlayer.x, localPlayer.y, localPlayer.z);
}

let lastTime = performance.now();
function tick() {
  const now = performance.now();
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  const input = gatherInput();
  // apply locally for prediction
  applyInputLocally(input, dt);

  // buffer and send periodically
  const seq = ++inputSeq;
  const inputPacket = { seq, ts: Date.now(), vx: input.vx, vy: input.vy, vz: input.vz };
  pendingInputs.push(inputPacket);

  if (joined && (Date.now() - lastSend) >= SEND_INTERVAL) {
    lastSend = Date.now();
    socket.emit('input', { room: id, input: inputPacket });
  }

  // interpolation for remote players (done in render loop via buffered states)

  requestAnimationFrame(tick);
}

// handle join/leave
let sendLoop = null;
document.getElementById('join').addEventListener('click', () => {
  socket.emit('join', id);
  joined = true;
});
document.getElementById('leave').addEventListener('click', () => {
  socket.emit('leave', id);
  joined = false;
});

// State handling and interpolation
const interpolationDelay = 120; // ms
const stateBuffers = {}; // id -> [{ts, x,y,z, vx,vy,vz}]

socket.on('room_state', (data) => {
  const arr = data.players || [];
  arr.forEach(p => { if (p.id !== socket.id) bufferState(p); });
});

socket.on('state', (snapshot) => {
  const serverTs = snapshot.ts;
  snapshot.players.forEach(p => {
    if (p.id === socket.id) {
      // reconciliation for local player
      const serverPos = { x: p.x, y: p.y, z: p.z };
      const dx = serverPos.x - localPlayer.x;
      const dy = serverPos.y - localPlayer.y;
      const dz = serverPos.z - localPlayer.z;
      const distSq = dx*dx + dy*dy + dz*dz;
      // if deviation large, correct and replay pending inputs
      if (distSq > 0.25) {
        localPlayer.x = serverPos.x; localPlayer.y = serverPos.y; localPlayer.z = serverPos.z;
        if (localPlayer.mesh) localPlayer.mesh.position.set(localPlayer.x, localPlayer.y, localPlayer.z);
        // remove acknowledged inputs
        while (pendingInputs.length && pendingInputs[0].seq <= p.lastInputSeq) pendingInputs.shift();
        // reapply remaining pending inputs locally
        pendingInputs.forEach(inp => applyInputLocally(inp, SEND_INTERVAL/1000));
      } else {
        // drop acked inputs
        while (pendingInputs.length && pendingInputs[0].seq <= p.lastInputSeq) pendingInputs.shift();
      }
    } else {
      bufferState(p);
    }
  });
});

function bufferState(p) {
  stateBuffers[p.id] = stateBuffers[p.id] || [];
  stateBuffers[p.id].push({ ts: Date.now(), x: p.x, y: p.y, z: p.z });
  // keep short buffer
  if (stateBuffers[p.id].length > 20) stateBuffers[p.id].shift();
}

// run interpolation in render loop
function interpolateRemote(dtRender) {
  const renderTs = Date.now() - interpolationDelay;
  Object.keys(stateBuffers).forEach(id => {
    const buf = stateBuffers[id];
    if (!buf || buf.length < 2) return;
    // find two snapshots surrounding renderTs
    let aIndex = -1;
    for (let i = 0; i < buf.length - 1; i++) {
      if (buf[i].ts <= renderTs && buf[i+1].ts >= renderTs) { aIndex = i; break; }
    }
    if (aIndex === -1) {
      // use last
      const last = buf[buf.length-1];
      if (players[id]) players[id].mesh.position.set(last.x, last.y, last.z);
      return;
    }
    const a = buf[aIndex], b = buf[aIndex+1];
    const t = (renderTs - a.ts) / (b.ts - a.ts);
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const z = a.z + (b.z - a.z) * t;
    if (players[id]) {
      // smooth toward the target position to reduce jitter
      _tmpVec.set(x, y, z);
      players[id].mesh.position.lerp(_tmpVec, 0.14);
    }
  });
}

// integrate interpolation into animation
function animate() {
  requestAnimationFrame(animate);
  // perform interpolation step (dt unused here)
  interpolateRemote();
  // guard: don't try to render before the renderer/scene are initialized
  if (!renderer || !scene || !camera) return;
  renderer.render(scene, camera);
}

socket.on('user_joined', (data) => addOrUpdateRemote(data));
socket.on('player_update', (data) => addOrUpdateRemote(data));
socket.on('user_left', (data) => removeRemote(data.id));

function addOrUpdateRemote(data) {
  // If scene isn't ready yet (loadGame not finished), only buffer the state. When scene is ready
  // the buffered states will be used to create meshes.
  if (!scene) { bufferState(data); return; }

  if (!players[data.id]) {
    const geometry = new THREE.SphereGeometry(0.6, 12, 12);
    const material = new THREE.MeshStandardMaterial({ color: data.color || 0xffaa00 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(data.x || 0, data.y || 2, data.z || 0);
    scene.add(mesh);
    players[data.id] = { mesh, data };
    stateBuffers[data.id] = stateBuffers[data.id] || [];
  } else {
    const p = players[data.id];
    // on direct update, buffer for interpolation
    bufferState(data);
    p.data = data;
  }
}

function removeRemote(id) {
  // if scene is not initialized, just remove buffered states
  if (!scene) { delete stateBuffers[id]; return; }
  const p = players[id];
  if (!p) return;
  scene.remove(p.mesh);
  delete players[id];
  delete stateBuffers[id];
}

// start loading the game (which will call `animate()` after scene init)
loadGame();
requestAnimationFrame(tick);
// NOTE: do NOT call `requestAnimationFrame(animate)` here — animation starts inside `loadGame()` once renderer is ready