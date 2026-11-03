# AgarV observations and Gold effect change

Live UI tests used a signed-in account in FFA-77 and FFA-76 on 3 November 2026. Do not publish the account identity, credentials, chat, or balances with this report.

| Item | Evidence | Status |
| --- | --- | --- |
| A cost / gain | Balance decreased by 10; AgarV `/howtoplay` explicitly states 10 Gold for 50 score. | Confirmed |
| S cost / gain | Balance decreased by 100; `/howtoplay` explicitly states 100 Gold for 250 score. | Confirmed |
| Expense appearance | Yellow `-100` amounts appear individually above the wallet, beside the minimap, rising/overlapping during repeated Gold input. No currency suffix on each amount. | Observed; animation duration and spread are approximations |
| Virus collision | After approaching a visible green virus with several large fragments, the HUD reached 25/25. Large unaffected fragments and much smaller fragments were visible together. | Observed; not a single-virus isolated threshold test |
| Virus radius | Green virus appeared about 46 screen pixels in radius at that view. No calibrated world-coordinate scale was available. | Screen observation only; do not substitute for an engine radius |
| Minimum burst score | Could not isolate the exact collision frame or lower/upper bounds. | Unverified |
| Feed count to launch | Could not reliably count pellets actually absorbed by one stationary virus. | Unverified |
| Launch distance | No isolated launch with stationary camera and calibrated scale. | Unverified |

The browser rendered approximately 1 FPS, including with the GL option temporarily enabled. The GL option was restored. Manual navigation was not precise enough to establish the missing measurements; they are not inferred from another Agar game. Existing virus constants and burst algorithm remain unchanged.

The Gold change uses successful authoritative transaction receipts. Separate A/S costs survive bundled state packets without inventing costs from net wallet changes, which can also include earnings. Receipts are limited to 64 and expire after 1.5 seconds. Older snapshots retain cumulative-delta compatibility. Effects are bounded, removed after display, and respect reduced motion.

Validation: `npm run check`, all 92 tests, and local browser UI inspection. The local Gold effect had separate yellow 24px deductions, the rising animation, and automatic removal. No claim that all AgarV physics now match.

Publication remains blocked by the repository's RELEASING.md data-preservation requirement: the selected live Render service is Free and durable account/skin storage plus an application-consistent export were not verified. This change must not trigger the live `agarm-render` auto-deploy until those requirements are satisfied.

## Follow-up measurements

Subsequent manual tests in FFA-77 and FFA-76 achieved approximately 30–60 FPS during active input.

- Five absorbed pellets triggered a new virus and reset the parent's visible size. This was repeated in FFA-77 and independently in FFA-76; FFA-76 count increased from 75 to 76 after the fifth individually delivered pellet. Missed pellets were excluded.
- After the FFA-76 launch, the camera was repositioned so both settled viruses were visible together. Parent centre was approximately (535,463); child centre approximately (763,526), giving sqrt(228²+63²) = 236.5 screen pixels. Both radii were approximately 48 pixels, giving 2.46 diameters. The implementation rounds this observed ratio to 2.5 diameters (240 world units for the current radius 48). Screen pixels are not claimed to be universal world coordinates.
- In FFA-76 a fresh-virus overlap at 268 displayed score did not burst the single cell. A preceding contact at approximately 330–350 score burst into 21 cells: a large remainder and around twenty small cells near 16 displayed score. The exact contact score was between snapshots. This bounds the minimum but does not establish an exact threshold. The existing threshold and equal-fragment algorithm therefore remain unmodified and are known outstanding mismatches.
- The launch duration and easing were not timed accurately. The existing 1.2-second duration is retained with smooth exponential easing; only the settled distance is fitted. Natural spawning counts and the 800-virus cap remain unchanged.

Changes: five-hit trigger and deterministic settled displacement independent of simulation step size. Tests cover four-versus-five hits, direction, multiple tick sizes, the final distance, and stopping. This is a partial physics match, not a claim of identical AgarV gameplay.
