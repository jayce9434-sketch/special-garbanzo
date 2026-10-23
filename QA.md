# QA Report

Final release validation:

- JavaScript syntax: PASS for `app.js`, `audio.js`, `state.js`, `data.js`, and `sw.js`.
- JSON parsing: PASS for manifest and asset/audio manifests.
- Destinations: 13 total = 10 islands + 3 islets.
- Species: 104 total / 104 unique IDs.
- Every destination roster: exactly 8 species.
- Every roster reference resolves to a species.
- Purchasable starters: exactly 4 per destination.
- Castle invariant: PASS on all 13 destinations.
- Minimum final-castle headroom over one-of-every-native requirement: 1.267x.
- Maximum breeding timer: 9.2 minutes.
- Maximum incubation timer: about 6.62 minutes.
- Browser UI harness: 13 map cards and 104 collection cards rendered.
- Audio scheduler: real WAV buffers decoded; Play Song entered running state; synchronized articulated performance cues were observed.
- Browser console/page errors during tested flows: 0.
- Mobile viewport: 390x844; horizontal overflow: 0 px.
- Mobile visible button targets under 40 px: 0.
- Five screenshots were captured from the running shipped HTML/CSS/JS through the QA harness.
- Final ZIP is flat: no directories.
- Final ZIP file count: 99.

The execution environment blocks normal localhost/file browser navigation, so browser QA used an in-memory document containing the exact shipped HTML/CSS/JavaScript and the exact shipped image/audio bytes. The harness only inlined those files so Chromium could load them; gameplay/render/audio logic was not replaced.
