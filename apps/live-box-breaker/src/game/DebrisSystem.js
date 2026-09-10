import * as THREE from 'three';

export class DebrisSystem {
  constructor(scene, maxParticles = 900) {
    this.scene = scene;
    this.maxParticles = maxParticles;
    this.particles = [];
    this.geometry = new THREE.BoxGeometry(0.18, 0.18, 0.18);
    this.material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, maxParticles);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.dummy = new THREE.Object3D();
    scene.add(this.mesh);
  }

  burst(position, power = 1, count = 6) {
    const n = Math.min(count, 20);
    for (let i = 0; i < n; i++) {
      if (this.particles.length >= this.maxParticles) this.particles.shift();
      this.particles.push({
        position: position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5)),
        velocity: new THREE.Vector3((Math.random() - 0.5) * power, (0.4 + Math.random()) * power, (Math.random() - 0.5) * power),
        life: 0.65 + Math.random() * 0.9,
        spin: new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6)
      });
    }
  }

  update(dt) {
    const gravity = 7.5;
    let write = 0;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.velocity.y -= gravity * dt;
      p.position.addScaledVector(p.velocity, dt);
      this.particles[write++] = p;
    }
    this.particles.length = write;

    this.mesh.count = this.particles.length;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      this.dummy.position.copy(p.position);
      this.dummy.rotation.x += p.spin.x * dt;
      this.dummy.rotation.y += p.spin.y * dt;
      this.dummy.rotation.z += p.spin.z * dt;
      const s = Math.min(1, p.life * 1.5);
      this.dummy.scale.setScalar(s);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (this.particles.length) this.mesh.instanceMatrix.needsUpdate = true;
  }
}
