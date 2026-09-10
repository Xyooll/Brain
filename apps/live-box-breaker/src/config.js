export const GAME_CONFIG = {
  world: {
    width: 28,
    height: 22,
    depth: 18,
    spacing: 1.03,
    boxSize: 0.94,
    baseHp: 3,
    hpGrowthPerWorld: 0.22,
    goldChance: 0.0015,
    bombChance: 0.004,
    maxDebris: 900,
    maxDamageQueue: 20000
  },
  attacks: {
    likeDamage: 1,
    followDamage: 55,
    shareDamage: 150,
    giftSmallDamage: 300,
    giftMediumDamage: 1400,
    giftLargeDamage: 7000,
    giftHugeDamage: 30000,
    likeBurstThreshold: 50
  },
  frenzy: {
    durationMs: 30000,
    multiplier: 10
  }
};

export const GIFT_TIERS = [
  { maxCoins: 9, type: 'GIFT_SMALL', label: 'Rocket' },
  { maxCoins: 99, type: 'GIFT_MEDIUM', label: 'Bomb' },
  { maxCoins: 999, type: 'GIFT_LARGE', label: 'Meteor' },
  { maxCoins: Infinity, type: 'GIFT_HUGE', label: 'Cataclysm' }
];
