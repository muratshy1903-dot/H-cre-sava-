# Agarm 1.13 review package

The live service remains on 1.12.0. This package must remain on a review branch until the data migration gate in RELEASING.md is satisfied. Do not merge into agarm-render or trigger its automatic deployment before exporting the existing live database/uploads, placing them on confirmed durable storage, and verifying balances and records.

## Implemented

- Large yellow room-record line contains only the owner/display name. The distinct green global record notice still includes room, record label, name and score; its 60-minute lifetime is renewed only by the next record.
- Gold spend feedback sits immediately above the wallet; flag controls show SVG flags with accessible language labels and no letter overlays.
- MMA rewards count living, non-spectating human players: 0–4 = 50k, 5–9 = 100k, 10–14 = 150k, 15–19 = 200k, 20+ = 250k. Winner receives normal Gold; the personal 80M room wallet is preserved. Manual MMA reward changes are rejected to keep the tier authoritative.
- Profile scrolling and small black victory tiles / proportional colored bars follow the earlier supplied reference. Images used for comparison remain private and are not committed.
- Zirve Yolu has three fixed-per-season paths, 20 mission tiers, one reward per tier, choice of Gold/Premium/season skin at every fifth tier, and a permanent numbered title at tier 20. The 5M ticket is charged once; prior owned tickets and permanent collections remain valid. Reward skin ownership is enforced on the server. Seasonal skins use existing real gallery photos with season/path identification and an accent frame.

## AgarV guest-only observations, 3 November 2026

Played FFA-76 without signing into any account. The yellow record-name line and separate green scored global record notice were observed directly. A 100-score cell became two 50-score cells after one Space and four 25-score cells after two Space presses. The cell centre could reach the map boundary, leaving half the circle outside.

The browser displayed about 1 FPS; the guest had zero Gold. These conditions do not support reliable millisecond split latency, split-launch distance, virus burst mass threshold, virus feeding count/flight distance, or exact per-second score-decay calibration. These values are not claimed to match AgarV. Existing unverified physics constants were retained rather than replaced by guesses.

## Release prerequisites

Use scripts/export-data.mjs on the existing live host to obtain an application-consistent private export. Preserve the database (including uploaded image blobs), optional skins/uploads folders, and manifest. The connected Render tools do not expose a live filesystem export or SSH execution for this Free service. A confirmed durable destination and access to the current live data are still required; local test databases are not substitutes for production data.

## Validation

`npm run check` and all 87 tests passed. HTTP/WebSocket integration tests cover duplicate payment/claim prevention, private seasonal skin ownership, permanent title entry notices and MMA rewards. Browser checks cover flag switching, translated path missions and the profile victory layout.
