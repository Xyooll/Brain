import * as THREE from 'three';

export class DestructionEngine {
  constructor(world, debris, config, bus) {
    this.world = world;
    this.debris = debris;
    this.config = config;
    this.bus = bus;
    this.damageQueue = [];
    this.likeBuffer = 0;
    this.frenzyUntil = 0;
    this.damageApplied = 0;
    this.register();
  }

  register() {
    this.bus.on('LIVE_EVENT', (event) => this.ingest(event));
    this.bus.on('TRIGGER_ATTACK', (event) => this.ingest(event));
  }

  get multiplier() {
    return performance.now() < this.frenzyUntil ? this.config.frenzy.multiplier : 1;
  }

  ingest(event) {
    const a = this.config.attacks;
    switch (event.type) {
      case 'LIKE':
        this.likeBuffer += event.count ?? 1;
        if (this.likeBuffer >= a.likeBurstThreshold) {
          const count = this.likeBuffer;
          this.likeBuffer = 0;
          this.queueDamage(count * a.likeDamage, { ...event, attackLabel: 'Like Storm' }, 'scatter');
        }
        break;
      case 'FOLLOW': this.queueDamage(a.followDamage, { ...event, attackLabel: 'Follow Strike' }, 'scatter'); break;
      case 'SHARE': this.queueDamage(a.shareDamage, { ...event, attackLabel: 'Share Beam' }, 'beam'); break;
      case 'GIFT_SMALL': this.queueDamage(a.giftSmallDamage * (event.repeat ?? 1), event, 'rocket'); break;
      case 'GIFT_MEDIUM': this.queueDamage(a.giftMediumDamage * (event.repeat ?? 1), event, 'blast'); break;
      case 'GIFT_LARGE': this.queueDamage(a.giftLargeDamage * (event.repeat ?? 1), event, 'meteor'); break;
      case 'GIFT_HUGE': this.queueDamage(a.giftHugeDamage * (event.repeat ?? 1), event, 'cataclysm'); break;
      default: break;
    }
  }

  queueDamage(amount, source, mode) {
    const scaled = Math.floor(amount * this.multiplier);
    this.damageQueue.push({ remaining: scaled, source, mode });
    if (this.damageQueue.length > this.config.world.maxDamageQueue) this.damageQueue.splice(0, this.damageQueue.length - this.config.world.maxDamageQueue);
    this.bus.emit('ATTACK_QUEUED', { amount: scaled, source, mode });
  }

  update() {
    if (this.likeBuffer > 0) {
      const flush = Math.min(this.likeBuffer, 10);
      this.likeBuffer -= flush;
      this.queueDamage(flush * this.config.attacks.likeDamage, { type: 'LIKE', user: 'Community', attackLabel: 'Likes' }, 'scatter');
    }

    let budget = 220;
    while (budget > 0 && this.damageQueue.length && this.world.aliveCount) {
      const attack = this.damageQueue[0];
      const idx = this.chooseTarget(attack.mode);
      if (idx < 0) break;
      const box = this.world.boxes[idx];
      const amount = Math.min(attack.remaining, Math.max(1, box.hp));
      const result = this.world.damageIndex(idx, amount, attack.source);
      attack.remaining -= result.spent;
      this.damageApplied += result.spent;
      budget--;

      if (result.destroyed) {
        this.debris.burst(new THREE.Vector3(box.x, box.y, box.z), this.powerFor(attack.mode), this.debrisCountFor(attack.mode));
        if (result.type === 1) this.activateFrenzy(attack.source);
        if (result.type === 2) {
          const chain = this.world.chainExplosion(box, 3.0, box.maxHp * 2, { ...attack.source, attackLabel: 'Chain Bomb' });
          if (chain) this.bus.emit('CHAIN_REACTION', { count: chain, user: attack.source.user });
        }
      }

      if (attack.remaining <= 0) this.damageQueue.shift();
    }
  }

  chooseTarget(mode) {
    if (mode === 'beam') {
      const alive = this.world.aliveIndices;
      let best = -1;
      let score = -Infinity;
      for (let i = 0; i < Math.min(300, alive.length); i++) {
        const idx = alive[Math.floor(Math.random() * alive.length)];
        const b = this.world.boxes[idx];
        const s = b.y + Math.random() * 2;
        if (s > score) { score = s; best = idx; }
      }
      return best;
    }
    return this.world.getRandomAliveIndex();
  }

  activateFrenzy(source) {
    this.frenzyUntil = performance.now() + this.config.frenzy.durationMs;
    this.bus.emit('FRENZY', { multiplier: this.config.frenzy.multiplier, durationMs: this.config.frenzy.durationMs, user: source.user });
  }

  powerFor(mode) {
    return ({ scatter: 2.2, rocket: 4, beam: 2, blast: 5, meteor: 7, cataclysm: 10 })[mode] ?? 3;
  }

  debrisCountFor(mode) {
    return ({ scatter: 2, rocket: 5, beam: 3, blast: 8, meteor: 12, cataclysm: 16 })[mode] ?? 4;
  }
}
