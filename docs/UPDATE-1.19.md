# Agarm 1.19.0

Kristal Bahçesi removed from navigation, page controller, client assets, server initialization and routes, and management permissions/settings. Old `/api/crystal` routes respond 410; removed assets respond 404. Existing account profiles, wallets, ledger, historical round tables and bonus records are not migrated or deleted. Historical documents and release notes remain archival.

## Requested rules

The user's three screenshots supplied the numeric source of truth, superseding uncertain visual estimates from live games. The shared `dist/game-rules.js` is used by the simulation and the management rules display.

- World: 32000 × 32000; standard round 3600 seconds, no countdown, final 3 seconds without decay.
- Player: 100 starting mass, 25 cells, standard 220000 per-cell cap; speed coefficient 48, mass exponent 0.2222222222; exponential decay 0.006/second above a 100 floor.
- Split: minimum parent mass 36, speed multiplier 3.75, 32 impulse steps, 0.85 damping per step. Merge deadline is 15 + 0.02 × child mass seconds.
- Ejection: minimum 32, emitted mass 12, cost 16 per eligible cell, speed coefficient 160. Initial food count 450, each mass 10.
- Viruses: initial/renewal target 75, fed-virus cap 1000, mass 250, five feeds to launch, full virus-mass reward.

Agarm interprets the screenshots' legacy speed and launch-step coefficients using its existing 50 ms simulation step. Movement is `48 / mass^0.2222222222` per reference step, split impulse is 3.75 times the new child's movement speed, and feed impulse is 160 per reference step. Launch damping is time normalized and displacement is integrated exponentially, stopping after 32 steps (1.6 seconds). The screenshots do not establish AgarNex's server tick duration or speed formula; this conversion is an implementation interpretation, not a verified identical trajectory.

Existing per-room durations and Boost settings remain; MMA-2/3 keep their previously requested 250000/350000 mass caps. Virus collision threshold remains the user's previously selected 335. The previously measured settled virus-launch distance remains 2.5 virus diameters. Split input buffering preserves each press's direction. Starting E/R feed now sends the current aim and attempts the first shot immediately, respecting the existing rate limit.

## Live comparison and validation

AgarV and AgarNex were joined as guests. A single 100-score cell split into two 50-score cells in AgarNex; AgarV's 84-score cell split into two 42-score cells. W and E were exercised. Low render rate (~2 FPS) and 200–470 ms reported ping prevented a reliable measurement of launch time, distance or feed cadence. Subsequent collection/merging also prevented treating arbitrary net score deltas as isolated pellet costs. The supplied screenshots, rather than those uncertain deltas, determine the settings above.

AgarZ rendered a white canvas with its chat bar, including after one reload, and could not be played in this session. No claim that it was measured.

All 100 tests passed, including requested thresholds, mass conservation, the merge deadline, impulse damping/expiry, ejected mass/cost, initial world counts, decay at multiple tick sizes, the final-three-second pause, account balance preservation and old API/asset removal. Syntax checks and diff whitespace checks passed. Managed browser preview showed the removed menu entry, 75 viruses, Space preserving 100 total score across two cells, and W reducing the total to 68 (16 per cell).

## Publication

The existing Render service is still Free. No verified live database export or durable data migration is available. This revision must remain on its feature branch pending the account-data preservation requirement in RELEASING.md. A source PR does not trigger the production branch's auto-deploy.
