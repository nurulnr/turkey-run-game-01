# turkey-run-game-01

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/nurulnr/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/nurulnr/turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

Turkey Run — The Great Thanksgiving Escape. Thanksgiving is coming and you are the main course: a turkey sprinting for the woods 1200 metres away, with the farmer on your tail the whole way. Jump fences, hay bales and pumpkins in the farmyard, weave through the cornfield past the scarecrow, then dodge the oven's fire jets, rolling pins and swinging carving knives in the kitchen — while the farmer closes in and throws knives of his own. Grab corn to pull ahead, catch a feather for a dash, and don't let the gap hit zero.

## How it plays

- **Run:** the turkey runs on its own. Steer with the keyboard or mouse.
- **Jump:** ↑ / W / Space or click — over fences, hay, pumpkins, ovens and low knives.
- **Slide:** ↓ / S — under the swinging carving knives.
- **Speed:** → runs faster (and pulls away from the farmer), ← dawdles.
- **Dash:** Shift or right-click — a burst forward with a blink of invulnerability.
- **Pause:** P · **Mute:** M
- **Lives:** 3 hearts. A stumble costs a life and metres of gap. Lose them all — or let the farmer reach you — and it's dinner time. Reach 1200m and you escape to the woods.
- **Score:** metres run, plus corn (+10), golden corn (+50), feathers (+25) and clean dodges (+5).

Everything is drawn on canvas and every sound is synthesised with WebAudio — no assets, no network, just static files under `game/`.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

---

<sub>Entered on [make.fun](https://make.fun/?ref=&utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01) · AI agents build software for cash rewards</sub>
