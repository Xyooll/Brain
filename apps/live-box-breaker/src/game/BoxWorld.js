import * as THREE from 'three';

const TYPE_NORMAL = 0;
const TYPE_GOLD = 1;
const TYPE_BOMB = 2;

export class BoxWorld {
  constructor(scene, config, callbacks = {}) {
    this.scene = scene;
    this.config = config;
    this.callbacks = callbacks;
    this.level = 1;
    this.boxes = [];
    this.aliveIndices = [];
    this.alivePosition = new Int32Array(0);
    this.mesh = null;
    this.dummy = new THREE.Object3D();
    this.normalColor = new THREE.Color(0x5d7cff);
    this.goldColor = new THREE.Color(0xffd35a);
    this.bombColor = new THREE.Color(0xff4a66);
    this.destroyed = 0;
    this.total = 0;
    this._center = new THREE.Vector3();
  }

  build(level = 1) {
    this.disposeMesh();
    this.level = level;
    this.destroyed = 0;
    const { width, height, depth, spacing, boxSize, baseHp, hpGrowthPerWorld, goldChance, bombChance } = this.config;
    this.total = width * height * depth;
    this.boxes = new Array(this.total);
    this.aliveIndices = new Array(this.total);
    this.alivePosition = new Int32Array(this.total);

    const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.08, vertexColors: true });
    this.mesh = new THREE.InstancedMesh(geometry, material, this.total);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;

    const hp = Math.max(1, Math.ceil(baseHp * (1 + (level - 1) * hpGrowthPerWorld)));
    let i = 0;
    for (let y = 0; y < height; y++) {
      for (let z = 0; z < depth; z++) {
        for (let x = 0; x < width; x++) {
          const px = (x - (width - 1) / 2) * spacing;
          const py = (y - (height - 1) / 2) * spacing;
          const pz = (z - (depth - 1) / 2) * spacing;
          const roll = Math.random();
          const type = roll < goldChance ? TYPE_GOLD : roll < goldChance + bombChance ? TYPE_BOMB : TYPE_NORMAL;
          this.boxes[i] = { hp, maxHp: hp, alive: true, type, x: px, y: py, z: pz };
          this.aliveIndices[i] = i;
          this.alivePosition[i] = i;
          this.setInstanceTransform(i, this.boxes[i]);
          this.mesh.setColorAt(i, this.colorFor(type));
          i++;
        }
      }
    }

    this.mesh.count = this.total;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
    this.scene.add(this.mesh);
    this.callbacks.onWorldBuilt?.({ level, total: this.total, hp });
  }

  colorFor(type) {
    if (type === TYPE_GOLD) return this.goldColor;
    if (type === TYPE_BOMB) return this.bombColor;
    return this.normalColor;
  }

  setInstanceTransform(instanceIndex, box) {
    this.dummy.position.set(box.x, box.y, box.z);
    this.dummy.rotation.set(0, 0, 0);
    this.dummy.scale.setScalar(1);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(instanceIndex, this.dummy.matrix);
  }

  get aliveCount() {
    return this.aliveIndices.length;
  }

  getRandomAliveIndex() {
    if (!this.aliveIndices.length) return -1;
    return this.aliveIndices[Math.floor(Math.random() * this.aliveIndices.length)];
  }

  getAliveClosestTo(position, radius = Infinity) {
    if (!this.aliveIndices.length) return [];
    const radiusSq = radius * radius;
    const hits = [];
    for (let p = 0; p < this.aliveIndices.length; p++) {
      const idx = this.aliveIndices[p];
      const b = this.boxes[idx];
      const dx = b.x - position.x;
      const dy = b.y - position.y;
      const dz = b.z - position.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 <= radiusSq) hits.push([idx, d2]);
    }
    hits.sort((a, b) => a[1] - b[1]);
    return hits.map((x) => x[0]);
  }

  damageIndex(boxIndex, amount, source = {}) {
    const box = this.boxes[boxIndex];
    if (!box?.alive || amount <= 0) return { spent: 0, destroyed: false };
    const spent = Math.min(box.hp, amount);
    box.hp -= amount;
    if (box.hp <= 0) {
      this.kill(boxIndex, source);
      return { spent, destroyed: true, type: box.type, box };
    }
    return { spent, destroyed: false };
  }

  kill(boxIndex, source = {}) {
    const box = this.boxes[boxIndex];
    if (!box?.alive) return;
    box.alive = false;
    this.destroyed++;

    const positionInAlive = this.alivePosition[boxIndex];
    const lastPosition = this.aliveIndices.length - 1;
    const lastBoxIndex = this.aliveIndices[lastPosition];
    this.aliveIndices[positionInAlive] = lastBoxIndex;
    this.alivePosition[lastBoxIndex] = positionInAlive;
    this.aliveIndices.pop();
    this.alivePosition[boxIndex] = -1;

    this.hideInstance(boxIndex);
    this.callbacks.onBoxDestroyed?.({ box, boxIndex, source, remaining: this.aliveCount, total: this.total });
    if (!this.aliveCount) this.callbacks.onWorldCleared?.({ level: this.level });
  }

  hideInstance(index) {
    this.dummy.position.set(0, -99999, 0);
    this.dummy.scale.setScalar(0.0001);
    this.dummy.updateMatrix();
    this.mesh.setMatrixAt(index, this.dummy.matrix);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  chainExplosion(originBox, radius, damage, source = {}) {
    this._center.set(originBox.x, originBox.y, originBox.z);
    const targets = this.getAliveClosestTo(this._center, radius);
    let destroyed = 0;
    for (const idx of targets) {
      if (this.damageIndex(idx, damage, source).destroyed) destroyed++;
    }
    return destroyed;
  }

  disposeMesh() {
    if (!this.mesh) return;
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh = null;
  }
}
