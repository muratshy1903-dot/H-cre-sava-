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
