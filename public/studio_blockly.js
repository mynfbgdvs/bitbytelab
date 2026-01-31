// Simple Scratch-like blocks editor using Blockly
const modeEl = document.getElementById('mode');
const previewBtn = document.getElementById('preview');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');
const previewArea = document.getElementById('previewArea');

// toolbox definition with a few blocks for 2D and 3D
const toolbox = {
  "kind": "flyoutToolbox",
  "contents": [
    { "kind": "block", "type": "on_start" },
    { "kind": "block", "type": "on_tick" },
    { "kind": "block", "type": "math_number" },
    { "kind": "block", "type": "controls_repeat_ext" },
    { "kind": "block", "type": "text" },
    { "kind": "block", "type": "spawn_sprite_2d" },
    { "kind": "block", "type": "move_sprite_2d" },
    { "kind": "block", "type": "spawn_block_3d" },
    { "kind": "block", "type": "set_block_pos_3d" }
  ]
};

Blockly.defineBlocksWithJsonArray([
  {
    "type": "on_start",
    "message0": "on start %1",
    "args0": [ { "type": "input_statement", "name": "DO" } ],
    "colour": 230
  },
  {
    "type": "on_tick",
    "message0": "on tick %1",
    "args0": [ { "type": "input_statement", "name": "DO" } ],
    "colour": 120
  },
  {
    "type": "spawn_sprite_2d",
    "message0": "spawn sprite %1 x %2 y %3 color %4 id %5",
    "args0": [ {"type":"field_input","name":"NAME","text":"s1"},{"type":"field_number","name":"X", "value":0},{"type":"field_number","name":"Y","value":0},{"type":"field_colour","name":"COLOR","colour":"#ff0000"},{"type":"field_input","name":"ID","text":"s1"} ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 20
  },
  {
    "type": "move_sprite_2d",
    "message0": "move sprite %1 by dx %2 dy %3",
    "args0": [ {"type":"field_input","name":"ID","text":"s1"},{"type":"field_number","name":"DX","value":0},{"type":"field_number","name":"DY","value":0} ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 20
  },
  {
    "type": "spawn_block_3d",
    "message0": "spawn block3d %1 x %2 y %3 z %4 size %5 color %6 id %7",
    "args0": [ {"type":"field_input","name":"NAME","text":"b1"},{"type":"field_number","name":"X","value":0},{"type":"field_number","name":"Y","value":0},{"type":"field_number","name":"Z","value":0},{"type":"field_number","name":"SIZE","value":1},{"type":"field_colour","name":"COLOR","colour":"#00ff00"},{"type":"field_input","name":"ID","text":"b1"} ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 45
  },
  {
    "type": "set_block_pos_3d",
    "message0": "set block %1 pos x %2 y %3 z %4",
    "args0": [ {"type":"field_input","name":"ID","text":"b1"},{"type":"field_number","name":"X","value":0},{"type":"field_number","name":"Y","value":0},{"type":"field_number","name":"Z","value":0} ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 45
  }
]);

// Generators
Blockly.JavaScript['on_start'] = function(block) {
  const statements = Blockly.JavaScript.statementToCode(block, 'DO');
  return `if (typeof onStart === 'function') { (function(){ ${statements} })(); }\n`;
};
Blockly.JavaScript['on_tick'] = function(block) {
  const statements = Blockly.JavaScript.statementToCode(block, 'DO');
  return `if (typeof onTick === 'function') { (function(){ ${statements} })(); }\n`;
};

Blockly.JavaScript['spawn_sprite_2d'] = function(block) {
  const name = block.getFieldValue('NAME');
  const x = block.getFieldValue('X');
  const y = block.getFieldValue('Y');
  const color = block.getFieldValue('COLOR');
  const id = block.getFieldValue('ID');
  return `engine.spawnSprite(${JSON.stringify(id)}, ${x}, ${y}, ${JSON.stringify(color)});\n`;
};

Blockly.JavaScript['move_sprite_2d'] = function(block) {
  const id = block.getFieldValue('ID');
  const dx = block.getFieldValue('DX');
  const dy = block.getFieldValue('DY');
  return `engine.moveSprite(${JSON.stringify(id)}, ${dx}, ${dy});\n`;
};

Blockly.JavaScript['spawn_block_3d'] = function(block) {
  const id = block.getFieldValue('ID');
  const x = block.getFieldValue('X');
  const y = block.getFieldValue('Y');
  const z = block.getFieldValue('Z');
  const size = block.getFieldValue('SIZE');
  const color = block.getFieldValue('COLOR');
  return `engine.spawnBlock(${JSON.stringify(id)}, ${x}, ${y}, ${z}, ${size}, ${JSON.stringify(color)});\n`;
};

// variable helpers
Blockly.defineBlocksWithJsonArray([
  {
    "type": "var_set",
    "message0": "set %1 to %2",
    "args0": [ {"type":"field_input","name":"NAME","text":"v"}, {"type":"field_input","name":"VALUE","text":"0"} ],
    "previousStatement": null,
    "nextStatement": null,
    "colour": 330
  },
  {
    "type": "var_get",
    "message0": "get %1",
    "args0": [ {"type":"field_input","name":"NAME","text":"v"} ],
    "output": null,
    "colour": 330
  },
  {
    "type": "math_arith",
    "message0": "%1 %2 %3",
    "args0": [ {"type":"field_number","name":"A","value":0}, {"type":"field_dropdown","name":"OP","options":[["+","+"],["-","-"],["*","*"],["/","/"]]}, {"type":"field_number","name":"B","value":0} ],
    "output": null,
    "colour": 230
  }
]);

Blockly.JavaScript['var_set'] = function(block) {
  const name = block.getFieldValue('NAME');
  const val = block.getFieldValue('VALUE');
  return `engine.vars = engine.vars || {}; engine.vars[${JSON.stringify(name)}] = ${JSON.stringify(val)};\n`;
};
Blockly.JavaScript['var_get'] = function(block) {
  const name = block.getFieldValue('NAME');
  return [`(function(){ engine.vars = engine.vars || {}; return engine.vars[${JSON.stringify(name)}] || 0; })()`, Blockly.JavaScript.ORDER_FUNCTION_CALL];
};
Blockly.JavaScript['math_arith'] = function(block) {
  const a = block.getFieldValue('A');
  const op = block.getFieldValue('OP');
  const b = block.getFieldValue('B');
  return [`(${a}${op}${b})`, Blockly.JavaScript.ORDER_ATOMIC];
};

Blockly.JavaScript['set_block_pos_3d'] = function(block) {
  const id = block.getFieldValue('ID');
  const x = block.getFieldValue('X');
  const y = block.getFieldValue('Y');
  const z = block.getFieldValue('Z');
  return `engine.setBlockPos(${JSON.stringify(id)}, ${x}, ${y}, ${z});\n`;
};

// Initialize workspace
const workspace = Blockly.inject('blocklyDiv', {
  toolbox: toolbox,
  media: '/vendor/blockly_media/',
  scrollbars: true,
});

function generateCode() {
  const code = Blockly.JavaScript.workspaceToCode(workspace);
  return code;
}

previewBtn.addEventListener('click', () => {
  const type = modeEl.value;
  const code = generateCode();
  previewArea.innerHTML = '';
  if (type === '2d') {
    run2DPreview(code);
  } else {
    run3DPreview(code);
  }
});

// helper: capture thumbnail of preview area (2D canvas or 3D renderer)
async function captureThumbnail() {
  // 2D canvas
  const canvas = previewArea.querySelector('canvas');
  if (canvas) return canvas.toDataURL('image/png');
  // 3D renderer
  const rendererEl = previewArea.querySelector('canvas');
  if (rendererEl) return rendererEl.toDataURL('image/png');
  return null;
}

saveBtn.addEventListener('click', async () => {
  statusEl.textContent = 'Saving...';
  const code = generateCode();
  const title = prompt('Game title', 'Untitled');
  const type = modeEl.value;
  const thumbnail = await captureThumbnail();
  const payload = { title, authorId: 'local', data: { blocks: [], script: code, type, thumbnail } };
  const token = localStorage.getItem('token');
  const res = await fetch('/api/games', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': token ? `Bearer ${token}` : '' }, body: JSON.stringify(payload) });
  const data = await res.json();
  if (res.ok) { statusEl.textContent = 'Saved'; } else { statusEl.textContent = data.error || 'Failed'; }
});

// Export / Import
const exportBtn = document.createElement('button'); exportBtn.className='btn'; exportBtn.textContent='Export';
const importBtn = document.createElement('button'); importBtn.className='btn'; importBtn.textContent='Import';
const importFile = document.createElement('input'); importFile.type='file'; importFile.style.display='none';
previewBtn.parentNode.appendChild(exportBtn); previewBtn.parentNode.appendChild(importBtn); previewBtn.parentNode.appendChild(importFile);

exportBtn.addEventListener('click', () => {
  const xml = Blockly.Xml.workspaceToDom(workspace);
  const text = Blockly.Xml.domToPrettyText(xml);
  const blob = new Blob([text], { type: 'text/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = (prompt('Export filename','project.xml') || 'project') + '.xml'; a.click();
});

importBtn.addEventListener('click', () => importFile.click());
importFile.addEventListener('change', (e) => {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader(); r.onload = () => {
    try {
      const xml = Blockly.Xml.textToDom(r.result);
      Blockly.Xml.domToWorkspace(xml, workspace);
      statusEl.textContent = 'Imported';
    } catch (e) { statusEl.textContent = 'Import failed'; }
  }; r.readAsText(f);
});

// Simple 2D preview runtime
function run2DPreview(script) {
  const canvas = document.createElement('canvas');
  canvas.width = previewArea.clientWidth; canvas.height = previewArea.clientHeight;
  previewArea.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const sprites = {};
  const engine = {
    spawnSprite(id, x, y, color) { sprites[id] = { x, y, color }; },
    moveSprite(id, dx, dy) { const s = sprites[id]; if (s) { s.x += dx; s.y += dy; } }
  };

  // bind user-defined hooks
  try {
    (new Function('engine', script))(engine);
  } catch (e) {
    console.error('Runtime error', e); alert('Script error: '+e.message);
  }

  // simple loop: call onTick (if defined) and draw
  function loop() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if (typeof onTick === 'function') {
      try { onTick(); } catch (e) { console.error(e); }
    }
    Object.keys(sprites).forEach(k => {
      const s = sprites[k];
      ctx.fillStyle = s.color || '#fff';
      ctx.fillRect(canvas.width/2 + s.x*20 - 10, canvas.height/2 + s.y*20 - 10, 20, 20);
    });
    requestAnimationFrame(loop);
  }
  loop();
}

// Simple 3D preview runtime using existing three.js renderer
function run3DPreview(script) {
  const div = document.createElement('div');
  div.style.width = '100%'; div.style.height = '100%';
  previewArea.appendChild(div);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(div.clientWidth, div.clientHeight);
  div.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, div.clientWidth/div.clientHeight, 0.1, 1000);
  camera.position.set(0, 8, 12);
  const light = new THREE.DirectionalLight(0xffffff,1); light.position.set(10,20,10); scene.add(light);

  const blocks = {};
  const engine = {
    spawnBlock(id, x, y, z, size, color) {
      const g = new THREE.BoxGeometry(size,size,size);
      const m = new THREE.MeshStandardMaterial({ color });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(x,y,z);
      scene.add(mesh);
      blocks[id] = mesh;
    },
    setBlockPos(id,x,y,z) { const m = blocks[id]; if (m) m.position.set(x,y,z); }
  };

  try {
    (new Function('engine', script))(engine);
  } catch (e) { console.error('Script error', e); alert('Script error:'+e.message); }

  function render() {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
  }
  render();
}
