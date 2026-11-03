# Agarm 1.14

Current room-record owners receive a gold crown above every cell, in the owned room only. Crown identity uses the server-provided numeric owner and authenticated player ID; names, selected skins, premium status and client claims cannot grant it. Existing record rename/transfer/market actions immediately update the snapshot ownership used for crowns.

The private authenticated profile-records endpoint returns all current owned room records without a room-menu join or market-listing limit. It uses the same canonical earliest matching record as the room banner, avoiding duplicate ownership on equal scores; higher guest records and superseded records do not count. Records transferred to a player appear in that player's profile. Historical round wins remain the victory list.

Victory bars follow the newly supplied reference: centered wrapping rows, 32px height, room label, proportional width, existing score colors and small black tiles below one million. Score and date remain accessible by hover, focus and tap.

Validation: npm run check and all 89 tests passed. Tests include HTTP ownership changes after transfer, 110 profile records, tied scores, superseded/guest records and crown identity restricted to the correct account and room. The canvas and victory CSS were visually checked with explicitly labeled temporary example data; the fixture and user's photograph are excluded from publication.

AgarV guest-only check, 3 November 2026: tested FFA-76 and FFA-1; rendering stayed around 1 FPS even after disabling GL and enabling Hızlı. Guest Gold remained zero. No controlled complete virus-feeding/launch cycle could be measured. Exact virus diameter, feed count and launch distance are therefore not claimed to match. Existing radius 48, seven-feed threshold and launch motion remain unchanged. No synthetic measurement was substituted.

Deployment is authorized by the user's request to upload the changes, following the earlier explicit acceptance of record/Gold loss. The Free Render ephemeral-storage limitation remains unresolved; this release does not provide durable production backups or restore old lost records.
