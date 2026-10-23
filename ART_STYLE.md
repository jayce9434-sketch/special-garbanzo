# Art Style

The shipped art direction is bright painterly fantasy creature-game art with readable silhouettes, rounded forms, saturated natural colors, soft 3D shading, crisp cutout edges, and consistent front/three-quarter character presentation.

## Creature art

The roster originates from 104 original generated 480x480 transparent source renders. The shipping build packs them into high-resolution WebP atlases to stay below the flat-ZIP file limit.

Performance art is not a single wobbling PNG. Each creature is reconstructed from separate texture atlases for:
- core / instrument
- head / face region
- left active appendage
- right active appendage
- left lower-body region
- right lower-body region

Those layers use independent pivots and performance motion. Scaling may appear as secondary squash/stretch, but strike, shake, pluck, blow, ring, and sing performances primarily use articulated translation and rotation tied to the sound event.

## Environments

All 13 destination backgrounds are generated project artwork with no baked-in UI or text. Runtime versions are 1600x900 WebP scenes with a clear central placement area.

Lighting is generally upper-front with warm highlights and cool ambient fill. Creature assets use transparency; only island and cover art contain full backgrounds.
