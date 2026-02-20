# Balance Notes (Runtime)

This build introduces a clearer economy lane split across care/minigames/exploration/competition.

## Intended Economy Lanes

- Treasure Hunts:
  - Supplemental loop only.
  - Shared global cooldown, energy cost, and anti-room-rotation penalties.
  - Best used occasionally between other activities.

- Expeditions:
  - Mid-to-late economy anchor, but no longer dominant.
  - Duration rewards now have diminishing roll scaling.
  - Late biomes have slightly tougher rarity odds.
  - Expedition upkeep and expedition-only sell multiplier reduce runaway EV.

- Minigames:
  - Skill/streak should feel rewarding over long sessions.
  - Daily cap is soft diminishing (slows gains, does not hard-stop).
  - Replay difficulty and reward scaling are now better aligned.

- Competitions:
  - Added explicit coin/tradable reward lane for victories.
  - Happiness/care rewards remain, but wins now contribute to economy progression.

## Prestige Hooks

All prestige purchases now have active runtime effects (coins, care, loot quality, decay, caps, etc.) and are visible in the prestige UI.

## Profiles

- `NORMAL` (default): player-facing balance.
- `QUICK_ITERATION_BUILD`: dev/testing profile with softened decay and offline pressure.

## Debugging

Set `BALANCE_DEBUG` in `js/constants.js` to `true` to print payout/EV diagnostics for:

- Treasure hunts
- Expeditions
- Minigames
- Competition rewards
