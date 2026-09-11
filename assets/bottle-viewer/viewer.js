import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const el = id => document.getElementById(id);
const viewer = el('viewer');
const allButtons = [...document.querySelectorAll('.toolbar button, .angle-picker button')];
const angleButtons = [...document.querySelectorAll('.angle-picker button')];
allButtons.forEach(button => button.disabled = true);
el('retry').onclick = () => location.reload();

try { await start(); } catch (error) {
  console.error('Bottle viewer:', error);
  el('loading').hidden = true;
  el('fallback').hidden = false;
  el('studio').classList.add('has-error');
  document.querySelector('.toolbar').hidden = true;
  document.querySelector('.angle-picker').hidden = true;
}

async function start() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.8));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);
  viewer.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 3.35, 0);
  controls.enableDamping = true;
  controls.dampingFactor = .075;
  controls.enablePan = false;
  controls.rotateSpeed = .58;
  controls.zoomSpeed = .7;
  controls.minPolarAngle = .42;
  controls.maxPolarAngle = Math.PI - .42;
  controls.autoRotateSpeed = .65;
  controls.autoRotate = false;

  const environment = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTarget = pmrem.fromScene(environment, .04);
  scene.environment = envTarget.texture;
  environment.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xe9fff5, 0x173f40, 2.15));
  const key = new THREE.DirectionalLight(0xffffff, 2.45); key.position.set(-4, 8, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xa2dacd, 2.35); rim.position.set(4, 5, -3); scene.add(rim);

  const sources = await loadSources({
    front: './bottle-front.webp', side1: './bottle-side-1.webp',
    back: './bottle-back.webp', side2: './bottle-side-2.webp',
    top: './bottle-top.webp', bottom: './bottle-bottom.webp'
  });
  const bottle = makeBottle(sources, 6.7);
  scene.add(bottle.group);
  const inspection = makeInspectionPlane(sources);
  scene.add(inspection.mesh);

  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowCtx = shadowCanvas.getContext('2d');
  const gradient = shadowCtx.createRadialGradient(64, 64, 8, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(0,12,12,0.62)');
  gradient.addColorStop(.45, 'rgba(0,12,12,0.25)');
  gradient.addColorStop(1, 'rgba(0,12,12,0)');
  shadowCtx.fillStyle = gradient; shadowCtx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(4, 3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.045; scene.add(shadow);

  let homeDistance = 16, firstSize = true, photoMode = null, lastState = '';
  function resize() {
    const { width, height } = viewer.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
    const previousHome = homeDistance;
    homeDistance = Math.max(14.1, 4.8 / camera.aspect);
    controls.minDistance = Math.max(5.1, homeDistance * .36); controls.maxDistance = homeDistance * 1.65;
    if (firstSize) { camera.position.set(0, 3.5, homeDistance); firstSize = false; }
    else camera.position.sub(controls.target).multiplyScalar(homeDistance / previousHome).add(controls.target);
    controls.update();
  }
  function hideInspection() {
    if (!photoMode) return;
    photoMode = null; inspection.mesh.visible = false; bottle.group.visible = true; shadow.visible = true;
  }
  function setSpin(spinning) {
    hideInspection(); controls.autoRotate = spinning;
    el('spin').setAttribute('aria-pressed', String(spinning));
    el('spin').title = spinning ? 'Pause automatic rotation' : 'Start automatic rotation';
    el('spin').querySelector('span').textContent = spinning ? 'Pause spin' : 'Auto spin';
    el('spin').querySelector('path').setAttribute('d', spinning ? 'M8 5v14M16 5v14' : 'M8 5l11 7-11 7z');
  }
  function setView(name) {
    setSpin(false);
    if (name === 'top' || name === 'bottom') {
      photoMode = name; inspection.material.map = inspection.textures[name]; inspection.material.needsUpdate = true;
      inspection.mesh.visible = true; bottle.group.visible = false; shadow.visible = false; updateUi(name); return;
    }
    hideInspection();
    const angles = { front: 0, side1: Math.PI / 2, back: Math.PI, side2: -Math.PI / 2 };
    const distance = camera.position.distanceTo(controls.target);
    const offset = new THREE.Vector3().setFromSpherical(new THREE.Spherical(distance, Math.PI / 2 - .01, angles[name]));
    camera.position.copy(controls.target).add(offset); controls.update(); updateUi(name);
  }
  function front() { setView('front'); }
  function zoom(factor) {
    const offset = camera.position.clone().sub(controls.target);
    offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
    camera.position.copy(controls.target).add(offset); controls.update();
  }
  function rotate(horizontal, vertical) {
    setSpin(false);
    const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    spherical.theta += horizontal;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + vertical, controls.minPolarAngle, controls.maxPolarAngle);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical)); controls.update();
  }
  function updateUi(name) {
    if (name === lastState) return;
    lastState = name;
    const labels = { front: 'FRONT VIEW', side1: 'SIDE VIEW', back: 'BACK VIEW', side2: 'OTHER SIDE', top: 'TOP DETAIL', bottom: 'BASE DETAIL' };
    el('view-badge').textContent = labels[name];
    angleButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === name)));
  }

  el('spin').onclick = () => setSpin(!controls.autoRotate);
  el('front').onclick = front;
  el('zoom-in').onclick = () => zoom(.84);
  el('zoom-out').onclick = () => zoom(1.19);
  angleButtons.forEach(button => button.onclick = () => setView(button.dataset.view));
  controls.addEventListener('start', () => setSpin(false));
  viewer.addEventListener('keydown', event => {
    const actions = { ArrowLeft: () => rotate(-.15, 0), ArrowRight: () => rotate(.15, 0), ArrowUp: () => rotate(0, -.12), ArrowDown: () => rotate(0, .12), '+': () => zoom(.84), '=': () => zoom(.84), '-': () => zoom(1.19), Home: front, ' ': () => setSpin(!controls.autoRotate) };
    if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
  });
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault(); renderer.setAnimationLoop(null); el('fallback').hidden = false;
    el('studio').classList.add('has-error'); document.querySelector('.toolbar').hidden = true; document.querySelector('.angle-picker').hidden = true;
  });

  const observer = new ResizeObserver(resize); observer.observe(viewer); resize();
  allButtons.forEach(button => button.disabled = false); el('loading').hidden = true;
  let previousTime = 0;
  renderer.setAnimationLoop(time => {
    const delta = Math.min((time - previousTime) / 1000, .05); previousTime = time; controls.update(delta);
    if (photoMode) {
      inspection.mesh.position.copy(controls.target); inspection.mesh.quaternion.copy(camera.quaternion); updateUi(photoMode);
    } else {
      const angle = Math.atan2(camera.position.x, camera.position.z); bottle.update(angle); updateUi(nearestView(angle));
    }
    renderer.render(scene, camera);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setSpin(false); });

  const lifecycle = new AbortController();
  if (document.modelContext?.registerTool) try {
    await document.modelContext.registerTool({
      name: 'configure_bottle_view', title: 'Configure bottle view',
      description: 'Choose a photographed angle of the Sueños bottle, zoom, or control automatic rotation.',
      inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['front', 'side', 'back', 'other_side', 'top', 'base', 'zoom_in', 'zoom_out', 'spin', 'pause'] } }, required: ['action'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        if (!input || typeof input !== 'object' || Object.keys(input).some(key => key !== 'action')) throw new Error('Provide one valid action.');
        const actions = { front, side: () => setView('side1'), back: () => setView('back'), other_side: () => setView('side2'), top: () => setView('top'), base: () => setView('bottom'), zoom_in: () => zoom(.84), zoom_out: () => zoom(1.19), spin: () => setSpin(true), pause: () => setSpin(false) };
        if (!Object.hasOwn(actions, input.action)) throw new Error('Unknown bottle-view action.');
        actions[input.action]();
        return { view: photoMode || nearestView(Math.atan2(camera.position.x, camera.position.z)), autoRotate: controls.autoRotate };
      }
    }, { signal: lifecycle.signal });
  } catch (error) { console.warn('Optional bottle controls unavailable.', error); }
  window.addEventListener('pagehide', event => {
    if (event.persisted) return;
    lifecycle.abort(); observer.disconnect(); renderer.setAnimationLoop(null); controls.dispose(); envTarget.dispose(); renderer.dispose();
  });
}

async function loadSources(paths) {
  const entries = await Promise.all(Object.entries(paths).map(async ([name, path]) => {
    const image = new Image(); image.src = path; await image.decode(); return [name, removeConnectedWhite(image)];
  }));
  return Object.fromEntries(entries);
}

function removeConnectedWhite(image) {
  const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0);
  const frame = context.getImageData(0, 0, canvas.width, canvas.height), pixels = frame.data;
  const width = canvas.width, height = canvas.height, visited = new Uint8Array(width * height), queue = new Int32Array(width * height);
  let head = 0, tail = 0;
  const enqueue = index => {
    if (visited[index]) return;
    const offset = index * 4, r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2];
    if (r < 239 || g < 239 || b < 239 || Math.max(r, g, b) - Math.min(r, g, b) > 18) return;
    visited[index] = 1; queue[tail++] = index;
  };
  for (let x = 0; x < width; x++) { enqueue(x); enqueue((height - 1) * width + x); }
  for (let y = 1; y < height - 1; y++) { enqueue(y * width); enqueue(y * width + width - 1); }
  while (head < tail) {
    const index = queue[head++], x = index % width, y = (index / width) | 0;
    if (x) enqueue(index - 1); if (x < width - 1) enqueue(index + 1); if (y) enqueue(index - width); if (y < height - 1) enqueue(index + width);
  }
  for (let index = 0; index < visited.length; index++) {
    const offset = index * 4;
    if (visited[index]) { pixels[offset + 3] = 0; continue; }
    const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2], low = Math.min(r, g, b), spread = Math.max(r, g, b) - low;
    if (low > 190 && spread < 22) pixels[offset + 3] = Math.round(pixels[offset + 3] * THREE.MathUtils.clamp((255 - low) / 45, .06, 1));
  }
  context.putImageData(frame, 0, 0); return trimTransparent(canvas);
}

function trimTransparent(source) {
  const context = source.getContext('2d', { willReadFrequently: true });
  const pixels = context.getImageData(0, 0, source.width, source.height).data;
  let left = source.width, top = source.height, right = -1, bottom = -1;
  for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
    if (pixels[(y * source.width + x) * 4 + 3] < 20) continue;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  if (right < left || bottom < top) return source;
  const padding = 6;
  left = Math.max(0, left - padding); top = Math.max(0, top - padding);
  right = Math.min(source.width - 1, right + padding); bottom = Math.min(source.height - 1, bottom + padding);
  const canvas = document.createElement('canvas');
  canvas.width = right - left + 1; canvas.height = bottom - top + 1;
  canvas.getContext('2d').drawImage(source, left, top, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function silhouette(source) {
  const context = source.getContext('2d', { willReadFrequently: true }), { width, height } = source;
  const pixels = context.getImageData(0, 0, width, height).data, rows = [];
  for (let y = 0; y < height; y++) {
    let left = width, right = -1;
    for (let x = 0; x < width; x++) if (pixels[(y * width + x) * 4 + 3] > 40) { left = Math.min(left, x); right = x; }
    if (right >= left) rows.push({ pixelY: y, left, right });
  }
  if (rows.length < 100) throw new Error('Bottle silhouette could not be read.');
  const top = rows[0].pixelY, bottom = rows.at(-1).pixelY, samples = [];
  for (let index = rows.length - 1; index >= 0; index -= 5) {
    const start = Math.max(0, index - 2), end = Math.min(rows.length - 1, index + 2); let left = 0, right = 0;
    for (let cursor = start; cursor <= end; cursor++) { left += rows[cursor].left; right += rows[cursor].right; }
    samples.push({ pixelY: rows[index].pixelY, left: left / (end - start + 1), right: right / (end - start + 1) });
  }
  if (samples.at(-1).pixelY !== top) samples.push(rows[0]);
  return { samples, top, bottom, width, height };
}

function makeBottle(sources, height) {
  const profile = silhouette(sources.front), scale = height / (profile.bottom - profile.top);
  const points = profile.samples.map(row => new THREE.Vector2(Math.max(.003, (row.right - row.left) * .5 * scale), (profile.bottom - row.pixelY) * scale));
  points.unshift(new THREE.Vector2(0, 0)); points.push(new THREE.Vector2(0, height));
  const geometry = new THREE.LatheGeometry(points, 128); geometry.scale(1, 1, .78);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xe1f2ed, metalness: 0, roughness: .12, transmission: .76, thickness: .38, ior: 1.48, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1.25, attenuationColor: 0xc2e0d6, attenuationDistance: 5, side: THREE.DoubleSide });
  const group = new THREE.Group(); group.name = 'Suenos_Blanco_six_photo_model'; group.add(new THREE.Mesh(geometry, glass));
  const projections = [['front', 0], ['side1', Math.PI / 2], ['back', Math.PI], ['side2', -Math.PI / 2]].map(([name, angle]) => {
    const projection = makeProjection(sources[name], height, angle); group.add(projection.mesh); return { ...projection, angle };
  });
  function update(cameraAngle) {
    const raw = projections.map(item => Math.max(0, 1 - angularDistance(cameraAngle, item.angle) / (Math.PI / 2)));
    const total = raw.reduce((sum, weight) => sum + weight, 0) || 1;
    projections.forEach((item, index) => { const weight = raw[index] / total; item.material.opacity = weight; item.mesh.visible = weight > .002; });
  }
  update(0); return { group, update };
}

function makeProjection(source, height, orientation) {
  const profile = silhouette(source), scale = height / (profile.bottom - profile.top), positions = [], uvs = [], edgeAlpha = [], indices = [];
  const segments = 100, halfArc = Math.PI / 2;
  profile.samples.forEach((row, rowIndex) => {
    const radius = Math.max(.003, (row.right - row.left) * .5 * scale), centre = (row.right + row.left) * .5;
    for (let segment = 0; segment <= segments; segment++) {
      const angle = -halfArc + segment / segments * halfArc * 2, localX = Math.sin(angle) * radius, localZ = Math.cos(angle) * radius * .78;
      const worldX = localX * Math.cos(orientation) + localZ * Math.sin(orientation), worldZ = -localX * Math.sin(orientation) + localZ * Math.cos(orientation);
      positions.push(worldX * 1.003, (profile.bottom - row.pixelY) * scale, worldZ * 1.003);
      uvs.push((centre + localX / scale) / profile.width, 1 - row.pixelY / profile.height);
      edgeAlpha.push(THREE.MathUtils.smoothstep(Math.cos(angle), .015, .38));
      if (rowIndex < profile.samples.length - 1 && segment < segments) { const a = rowIndex * (segments + 1) + segment, b = a + segments + 1; indices.push(a, a + 1, b, a + 1, b + 1, b); }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geometry.setAttribute('edgeAlpha', new THREE.Float32BufferAttribute(edgeAlpha, 1)); geometry.setIndex(indices); geometry.computeVertexNormals();
  const texture = new THREE.CanvasTexture(source); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  const material = new THREE.MeshPhysicalMaterial({ map: texture, roughness: .31, metalness: .025, clearcoat: .28, clearcoatRoughness: .2, transparent: true, opacity: 1, depthWrite: false, envMapIntensity: .24, side: THREE.FrontSide });
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'attribute float edgeAlpha; varying float vEdgeAlpha;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvEdgeAlpha = edgeAlpha;');
    shader.fragmentShader = 'varying float vEdgeAlpha;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.a *= vEdgeAlpha;');
  };
  const mesh = new THREE.Mesh(geometry, material); mesh.renderOrder = 2; mesh.name = `Photographed_${orientation}`;
  return { mesh, material };
}

function makeInspectionPlane(sources) {
  const textures = {};
  for (const name of ['top', 'bottom']) { textures[name] = new THREE.CanvasTexture(sources[name]); textures[name].colorSpace = THREE.SRGBColorSpace; textures[name].anisotropy = 4; }
  const material = new THREE.MeshBasicMaterial({ map: textures.top, transparent: true, depthTest: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6.2 * sources.top.width / sources.top.height, 6.2), material);
  mesh.visible = false; mesh.renderOrder = 99; return { mesh, material, textures };
}

function nearestView(angle) {
  const entries = [['front', 0], ['side1', Math.PI / 2], ['back', Math.PI], ['side2', -Math.PI / 2]];
  return entries.sort((a, b) => angularDistance(angle, a[1]) - angularDistance(angle, b[1]))[0][0];
}
function angularDistance(a, b) { return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))); }
