# BugSong Islands

BugSong Islands is an original static browser musical-creature collection game built from scratch for GitHub Pages.

## Upload to GitHub

The release ZIP is intentionally flat. Unzip it and upload every file directly to the repository root, then enable GitHub Pages from the main branch root. No build step, package manager, CDN, or subfolder is required.

## Game scope

- 10 full islands and 3 islets.
- 104 unique species, eight native species per destination.
- 104 original generated creature source renders packed into two portrait atlases for efficient loading.
- Articulated performance atlases split every creature into core/instrument, head, left/right active appendages, and left/right lower-body layers.
- Six performance families: strike, shake, pluck, blow, ring, and sing.
- Sample-based AudioContext scheduler with ahead-of-time timing, round-robin WAV assets, gain staging, stereo panning, convolution reverb, compression, and final limiting.
- Buying, feeding, leveling, breeding, incubation, hatching, placement, touch dragging, coin production, castles, collection, world unlocking, offline coin accrual, and save export/import.
- iPhone, iPad, and desktop responsive controls.
- Master, music, and SFX controls from 0 to 2000 percent.
- PWA manifest, app icon, and service worker.
- Five browser-captured QA screenshots included in the release.

## Owner console

Open Settings, then Owner Console. The access code is `SONGBUG-ADMIN`.

This is a static GitHub Pages game. Client-side code cannot provide genuine server-side authentication because every shipped browser file is public. The owner console is therefore a local development/testing console, not secure moderation authentication.

## Saving

Progress is stored in localStorage with save versioning and validation. Settings > Export creates a backup code; Import validates before restoring it.

## Controls

Tap or click a placed creature to open its details. Use Move Mode to drag performers with touch or mouse. Play Song starts the current island arrangement; only placed, unmuted performers contribute their parts.
