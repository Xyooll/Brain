# Live Box Breaker

A stream-interactive destruction game prototype. Thousands of GPU-instanced boxes are destroyed by likes, follows, shares and gifts. The included mock live source lets the game run without a platform connection.

## Current prototype

- 11,088 boxes per world by default (`28 × 22 × 18`).
- GPU-instanced rendering with `THREE.InstancedMesh`.
- Likes are aggregated instead of creating one physics object per interaction.
- Follow, share and four gift tiers map to progressively stronger attacks.
- Gold boxes trigger a 30-second 10× frenzy.
- Red bomb boxes create chain explosions.
- Lightweight debris particles give destruction feedback without full rigid-body physics.
- Automatic world progression; HP rises each world.
- Mock live traffic generator plus manual test buttons.
- Platform-independent event normalization.
- Browser integration API: `window.LiveBoxBreaker.emitRaw(...)`.

## Run

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Inject live events

From a live-platform bridge, call:

```js
window.LiveBoxBreaker.emitRaw({ kind: 'like', count: 25, user: 'viewer123' });
window.LiveBoxBreaker.emitRaw({ kind: 'follow', user: 'viewer123' });
window.LiveBoxBreaker.emitRaw({ kind: 'share', user: 'viewer123' });
window.LiveBoxBreaker.emitRaw({
  kind: 'gift',
  coins: 500,
  repeat: 1,
  user: 'viewer123',
  giftName: 'Example Gift'
});
```

The platform bridge should run separately from the render loop. Its job is only to convert live-platform events into the raw schema above.

## Architecture

```text
Live platform / MockLiveSource
            ↓
    LiveEventNormalizer
            ↓
         EventBus
            ↓
    DestructionEngine
       ↙          ↘
   BoxWorld     DebrisSystem
       ↓
      HUD
```

## Scaling strategy

The visible boxes are one instanced mesh, not thousands of independent Three.js meshes. Box state lives in arrays. Destruction is processed through a damage queue with a per-frame work budget. Likes are aggregated. Debris is capped. This lets the visual count scale much farther than a naïve one-object-per-box design.

For worlds beyond roughly hundreds of thousands to millions of logical boxes, the next step is chunking: keep large regions as aggregate voxel/chunk state and materialize individual instanced boxes only around active damage zones.

## Next platform step

Implement a server-side adapter for the target live platform (TikTok LIVE, Twitch, YouTube Live, etc.). The adapter must respect that platform's API/authentication and terms. The game itself does not need to change.
