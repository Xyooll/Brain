import { GIFT_TIERS } from '../config.js';

export class LiveEventNormalizer {
  normalize(raw) {
    if (!raw || !raw.kind) return null;

    switch (raw.kind) {
      case 'like':
        return { type: 'LIKE', count: Math.max(1, raw.count ?? 1), user: raw.user ?? 'viewer' };
      case 'follow':
        return { type: 'FOLLOW', user: raw.user ?? 'viewer' };
      case 'share':
        return { type: 'SHARE', user: raw.user ?? 'viewer' };
      case 'gift': {
        const coins = Math.max(1, raw.coins ?? 1);
        const tier = GIFT_TIERS.find((entry) => coins <= entry.maxCoins);
        return {
          type: tier.type,
          attackLabel: tier.label,
          coins,
          repeat: Math.max(1, raw.repeat ?? 1),
          user: raw.user ?? 'viewer',
          giftName: raw.giftName ?? 'Gift'
        };
      }
      default:
        return null;
    }
  }
}
