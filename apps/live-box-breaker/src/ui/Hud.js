export class Hud {
  constructor(root, bus) {
    this.root = root;
    this.bus = bus;
    this.state = { level: 1, total: 0, remaining: 0, destroyed: 0, lastAttack: 'Waiting for viewers…', multiplier: 1 };
    this.root.innerHTML = `
      <div class="hud">
        <div class="brand">LIVE BOX BREAKER</div>
        <div class="stats">
          <div><span>WORLD</span><strong id="world">1</strong></div>
          <div><span>BOXES LEFT</span><strong id="remaining">0</strong></div>
          <div><span>DESTROYED</span><strong id="destroyed">0</strong></div>
          <div><span>MULTIPLIER</span><strong id="multiplier">1×</strong></div>
        </div>
        <div id="attack" class="attack">Waiting for viewers…</div>
        <div class="controls">
          <button data-action="likes">+100 Likes</button>
          <button data-action="small">Small Gift</button>
          <button data-action="medium">Medium Gift</button>
          <button data-action="large">Meteor Gift</button>
          <button data-action="huge">Huge Gift</button>
          <button data-action="mock">Pause Mock Live</button>
        </div>
      </div>`;
    this.els = {
      world: root.querySelector('#world'),
      remaining: root.querySelector('#remaining'),
      destroyed: root.querySelector('#destroyed'),
      multiplier: root.querySelector('#multiplier'),
      attack: root.querySelector('#attack')
    };
  }

  bindHandlers({ onMockToggle }) {
    this.root.addEventListener('click', (e) => {
      const action = e.target?.dataset?.action;
      if (!action) return;
      const user = 'TEST_VIEWER';
      const map = {
        likes: { type: 'LIKE', count: 100, user },
        small: { type: 'GIFT_SMALL', user, attackLabel: 'Rocket' },
        medium: { type: 'GIFT_MEDIUM', user, attackLabel: 'Bomb' },
        large: { type: 'GIFT_LARGE', user, attackLabel: 'Meteor' },
        huge: { type: 'GIFT_HUGE', user, attackLabel: 'Cataclysm' }
      };
      if (action === 'mock') {
        const running = onMockToggle();
        e.target.textContent = running ? 'Pause Mock Live' : 'Resume Mock Live';
      } else {
        this.bus.emit('TRIGGER_ATTACK', map[action]);
      }
    });
  }

  worldBuilt({ level, total }) {
    this.state.level = level;
    this.state.total = total;
    this.state.remaining = total;
    this.state.destroyed = 0;
    this.render();
  }

  boxDestroyed({ remaining, total, source }) {
    this.state.remaining = remaining;
    this.state.destroyed = total - remaining;
    if (source?.user) this.state.lastAttack = `${source.user} • ${source.attackLabel ?? source.type ?? 'attack'}`;
    this.render();
  }

  frenzy({ multiplier, durationMs, user }) {
    this.state.multiplier = multiplier;
    this.state.lastAttack = `GOLD BOX! ${multiplier}× FRENZY${user ? ` • ${user}` : ''}`;
    this.render();
    clearTimeout(this.frenzyTimer);
    this.frenzyTimer = setTimeout(() => {
      this.state.multiplier = 1;
      this.render();
    }, durationMs);
  }

  attackQueued({ source, mode }) {
    if (!source?.user) return;
    this.state.lastAttack = `${source.user} launched ${source.attackLabel ?? mode}`;
    this.render();
  }

  chain({ count, user }) {
    this.state.lastAttack = `${user ?? 'Community'} triggered a ${count}-box chain reaction!`;
    this.render();
  }

  render() {
    this.els.world.textContent = this.state.level;
    this.els.remaining.textContent = this.state.remaining.toLocaleString();
    this.els.destroyed.textContent = this.state.destroyed.toLocaleString();
    this.els.multiplier.textContent = `${this.state.multiplier}×`;
    this.els.attack.textContent = this.state.lastAttack;
  }
}
