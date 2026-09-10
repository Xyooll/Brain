import * as THREE from 'three';
import './styles.css';
import { GAME_CONFIG } from './config.js';
import { EventBus } from './live/EventBus.js';
import { LiveEventNormalizer } from './live/LiveEventNormalizer.js';
import { MockLiveSource } from './live/MockLiveSource.js';
import { BoxWorld } from './game/BoxWorld.js';
import { DebrisSystem } from './game/DebrisSystem.js';
import { DestructionEngine } from './game/DestructionEngine.js';
import { Hud } from './ui/Hud.js';

const app = document.querySelector('#app');
app.innerHTML = '<div id="stage"></div><div id="hud-root"></div>';
const stage = document.querySelector('#stage');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050713);
scene.fog = new THREE.FogExp2(0x050713, 0.012);

const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 0.1, 300);
camera.position.set(31, 25, 36);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xbfd3ff, 0x15152b, 2.1));
const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(10, 25, 20);
scene.add(key);
const rim = new THREE.PointLight(0x7b4dff, 75, 90);
rim.position.set(-24, 16, -20);
scene.add(rim);

const grid = new THREE.GridHelper(90, 45, 0x26305e, 0x161b35);
grid.position.y = -GAME_CONFIG.world.height * GAME_CONFIG.world.spacing * 0.5 - 1.2;
scene.add(grid);

const bus = new EventBus();
const hud = new Hud(document.querySelector('#hud-root'), bus);
const debris = new DebrisSystem(scene, GAME_CONFIG.world.maxDebris);
const world = new BoxWorld(scene, GAME_CONFIG.world, {
  onWorldBuilt: (data) => hud.worldBuilt(data),
  onBoxDestroyed: (data) => {
    hud.boxDestroyed(data);
    bus.emit('BOX_DESTROYED', data);
  },
  onWorldCleared: ({ level }) => {
    bus.emit('WORLD_CLEARED', { level });
    setTimeout(() => world.build(level + 1), 1700);
  }
});
const destruction = new DestructionEngine(world, debris, GAME_CONFIG, bus);
const normalizer = new LiveEventNormalizer();

bus.on('ATTACK_QUEUED', (e) => hud.attackQueued(e));
bus.on('FRENZY', (e) => hud.frenzy(e));
bus.on('CHAIN_REACTION', (e) => hud.chain(e));

const mock = new MockLiveSource((raw) => {
  const event = normalizer.normalize(raw);
  if (event) bus.emit('LIVE_EVENT', event);
});
mock.start();
hud.bindHandlers({
  onMockToggle: () => {
    if (mock.enabled) mock.stop(); else mock.start();
    return mock.enabled;
  }
});

world.build(1);

let last = performance.now();
let angle = 0;
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  destruction.update();
  debris.update(dt);

  angle += dt * 0.055;
  const radius = 49;
  camera.position.x = Math.cos(angle) * radius;
  camera.position.z = Math.sin(angle) * radius;
  camera.position.y = 23 + Math.sin(angle * 1.7) * 4;
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

window.LiveBoxBreaker = {
  emitRaw(raw) {
    const event = normalizer.normalize(raw);
    if (event) bus.emit('LIVE_EVENT', event);
  },
  emit(event) {
    bus.emit('LIVE_EVENT', event);
  },
  stats() {
    return {
      world: world.level,
      totalBoxes: world.total,
      remainingBoxes: world.aliveCount,
      destroyedBoxes: world.destroyed,
      queuedAttacks: destruction.damageQueue.length,
      multiplier: destruction.multiplier
    };
  }
};
