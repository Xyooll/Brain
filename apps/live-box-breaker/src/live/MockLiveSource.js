const NAMES = ['Nova', 'Jay', 'Mika', 'Zee', 'Luna', 'Kai', 'Ace', 'Rae'];

export class MockLiveSource {
  constructor(onRawEvent) {
    this.onRawEvent = onRawEvent;
    this.timer = null;
    this.enabled = false;
  }

  start() {
    if (this.enabled) return;
    this.enabled = true;
    this.schedule();
  }

  stop() {
    this.enabled = false;
    clearTimeout(this.timer);
  }

  schedule() {
    if (!this.enabled) return;
    const delay = 80 + Math.random() * 260;
    this.timer = setTimeout(() => {
      this.tick();
      this.schedule();
    }, delay);
  }

  tick() {
    const r = Math.random();
    const user = NAMES[Math.floor(Math.random() * NAMES.length)];
    if (r < 0.80) {
      this.onRawEvent({ kind: 'like', count: 1 + Math.floor(Math.random() * 14), user });
    } else if (r < 0.88) {
      this.onRawEvent({ kind: 'follow', user });
    } else if (r < 0.94) {
      this.onRawEvent({ kind: 'share', user });
    } else {
      const coinsPool = [1, 5, 20, 100, 500, 1000, 5000];
      const coins = coinsPool[Math.floor(Math.random() * coinsPool.length)];
      this.onRawEvent({ kind: 'gift', coins, repeat: 1, user, giftName: `${coins}-coin gift` });
    }
  }
}
