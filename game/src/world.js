// The game's rules and state, with no drawing and no browser in it: the
// turkey's run, the farmer chasing behind, the obstacles and corn of each
// stage, the oven's fire and the farmer's thrown knives, collisions, score,
// lives, distance and the gap that decides caught or escaped. step() advances
// one fixed step and returns what happened as bit flags, so the caller can
// react without the world knowing about screens or sound. Nothing here
// allocates after createWorld returns.
import {
  DASH, ESCAPE_DISTANCE, FIELD, GAP_CORN, GAP_DRIFT_BASE, GAP_DRIFT_FAST,
  GAP_DRIFT_SLOW, GAP_GOLDEN, GAP_MAX, GAP_START, GAP_STUMBLE, LIVES,
  POOL_SIZE, PX_PER_METRE, SCORE, SCROLL, SPAWN, STAGE_COUNT, STAGE_METRES,
  THROW, TURKEY,
} from './config.js';

export const KIND_FENCE = 0;
export const KIND_HAY = 1;
export const KIND_PUMPKIN = 2;
export const KIND_STALK = 3;
export const KIND_SCARECROW = 4;
export const KIND_OVEN = 5;
export const KIND_PIN = 6;
export const KIND_SWING = 7;
export const KIND_MUD = 8;
export const KIND_CORN = 9;
export const KIND_GOLDEN = 10;
export const KIND_FEATHER = 11;
export const KIND_THROWN = 12;

// Jumpable obstacles, by stage: the farmyard's fences and hay, the
// cornfield's stalks and scarecrow, the kitchen's oven and rolling pins.
// The swinging knife (slide under it) joins from stage 2; mud slows.
const STAGE_OBSTACLES = [
  [KIND_FENCE, KIND_HAY, KIND_PUMPKIN, KIND_MUD],
  [KIND_STALK, KIND_SCARECROW, KIND_FENCE, KIND_PUMPKIN, KIND_SWING, KIND_MUD],
  [KIND_OVEN, KIND_PIN, KIND_SWING, KIND_FENCE, KIND_STALK],
];

const OBSTACLE_SIZE = {
  [KIND_FENCE]: { width: 46, height: 72 },
  [KIND_HAY]: { width: 72, height: 64 },
  [KIND_PUMPKIN]: { width: 56, height: 46 },
  [KIND_STALK]: { width: 62, height: 92 },
  [KIND_SCARECROW]: { width: 52, height: 112 },
  [KIND_OVEN]: { width: 104, height: 104 },
  [KIND_PIN]: { width: 84, height: 30 },
  [KIND_SWING]: { width: 26, height: 64 },
  [KIND_MUD]: { width: 130, height: 14 },
  [KIND_CORN]: { width: 30, height: 30 },
  [KIND_GOLDEN]: { width: 34, height: 34 },
  [KIND_FEATHER]: { width: 30, height: 30 },
  [KIND_THROWN]: { width: 64, height: 18 },
};

export const EVENT_HIT = 1;
export const EVENT_CORN = 2;
export const EVENT_GOLDEN = 4;
export const EVENT_FEATHER = 8;
export const EVENT_OVER = 16;
export const EVENT_THROW = 32;
export const EVENT_DODGE = 64;

function overlaps(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function createWorld(random) {
  const turkey = {
    x: TURKEY.x, y: FIELD.groundY - TURKEY.height, width: TURKEY.width,
    height: TURKEY.height, vy: 0, onGround: true, sliding: false,
    invulnerable: 0, dashTime: 0, dashCooldown: 0, runPhase: 0, stumble: 0,
  };
  const farmer = { throwTimer: THROW.delay, windup: 0, armUp: false };
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({ active: false, kind: KIND_FENCE, x: 0, y: 0, width: 0, height: 0, phase: 0, passed: false });
  }
  const state = {
    turkey, farmer, items,
    score: 0, scoreFloat: 0, bonus: 0, lives: LIVES, distance: 0, stage: 1,
    gap: GAP_START, elapsed: 0, over: null, scrollSpeed: SCROLL.base,
    obstacleTimer: SPAWN.interval, cornTimer: SPAWN.cornInterval, onMud: false,
  };

  function reset() {
    turkey.y = FIELD.groundY - TURKEY.height;
    turkey.vy = 0;
    turkey.onGround = true;
    turkey.sliding = false;
    turkey.invulnerable = 0;
    turkey.dashTime = 0;
    turkey.dashCooldown = 0;
    turkey.runPhase = 0;
    turkey.stumble = 0;
    farmer.throwTimer = THROW.delay;
    farmer.windup = 0;
    farmer.armUp = false;
    for (const item of items) item.active = false;
    state.score = 0;
    state.scoreFloat = 0;
    state.bonus = 0;
    state.lives = LIVES;
    state.distance = 0;
    state.stage = 1;
    state.gap = GAP_START;
    state.elapsed = 0;
    state.over = null;
    state.scrollSpeed = SCROLL.base;
    state.obstacleTimer = SPAWN.interval;
    state.cornTimer = SPAWN.cornInterval;
    state.onMud = false;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) {
      if (!items[index].active) return items[index];
    }
    return null;
  }

  function place(item, kind, x, y) {
    const size = OBSTACLE_SIZE[kind];
    item.active = true;
    item.kind = kind;
    item.width = size.width;
    item.height = size.height;
    item.x = x;
    item.y = y;
    item.phase = random() * Math.PI * 2;
    item.passed = false;
  }

  function spawnObstacle() {
    const item = freeItem();
    if (item === null) return;
    const table = STAGE_OBSTACLES[state.stage - 1];
    const kind = table[Math.floor(random() * table.length)];
    const size = OBSTACLE_SIZE[kind];
    let y = FIELD.groundY - size.height;
    // The swinging knife hangs at head height: slide under it, never jump into it.
    if (kind === KIND_SWING) y = FIELD.groundY - 118;
    place(item, kind, FIELD.width + 40, y);
  }

  function spawnPickup() {
    const item = freeItem();
    if (item === null) return;
    const roll = random();
    const kind = roll < SPAWN.goldenChance ? KIND_GOLDEN
      : roll < SPAWN.goldenChance + SPAWN.featherChance ? KIND_FEATHER : KIND_CORN;
    // Corn floats at ground level, at jump height, or high up for a brave leap.
    const heights = [FIELD.groundY - 40, FIELD.groundY - 150, FIELD.groundY - 230];
    const y = heights[Math.floor(random() * heights.length)];
    place(item, kind, FIELD.width + 40, y);
  }

  function spawnThrownKnife() {
    const item = freeItem();
    if (item === null) return;
    const size = OBSTACLE_SIZE[KIND_THROWN];
    // Thrown at the turkey's feet (jump it) or at head height (slide under it).
    const y = random() < 0.5 ? FIELD.groundY - size.height : FIELD.groundY - 96;
    place(item, KIND_THROWN, Math.max(0, turkey.x - state.gap * 12), y);
  }

  function scrollSpeedFor(wish, dashing) {
    let speed = SCROLL.base + SCROLL.perStage * (state.stage - 1);
    if (wish > 0) speed += SCROLL.fastBonus;
    else if (wish < 0) speed -= SCROLL.slowPenalty;
    if (state.onMud) speed *= SCROLL.mudFactor;
    if (turkey.stumble > 0) speed *= 0.55;
    if (dashing) speed += DASH.boost;
    return Math.max(SCROLL.min, speed);
  }

  /**
   * One fixed step. `controls` carries the steering: wish (-1, 0, 1), slide,
   * jump and dash (one-shot). With `harmless` set (the title screen's
   * backdrop) the world scrolls and things pass by, but nothing touches the
   * turkey and nothing scores.
   */
  function step(dt, controls, harmless) {
    let events = 0;
    state.elapsed += dt;
    state.stage = Math.min(STAGE_COUNT, 1 + Math.floor(state.distance / STAGE_METRES));

    // --- the turkey ---
    if (controls.dash && turkey.dashCooldown <= 0 && !harmless) {
      turkey.dashTime = DASH.time;
      turkey.dashCooldown = DASH.recharge;
      turkey.invulnerable = Math.max(turkey.invulnerable, DASH.time);
      state.gap = Math.min(GAP_MAX, state.gap + DASH.gapGain);
    }
    if (turkey.dashCooldown > 0) turkey.dashCooldown -= dt;
    if (turkey.dashTime > 0) turkey.dashTime -= dt;
    if (turkey.stumble > 0) turkey.stumble -= dt;
    if (turkey.invulnerable > 0) turkey.invulnerable = Math.max(0, turkey.invulnerable - dt);

    if (controls.jump && turkey.onGround && !harmless) {
      turkey.vy = -TURKEY.jumpVelocity;
      turkey.onGround = false;
    }
    turkey.sliding = controls.slide && turkey.onGround;
    turkey.height = turkey.sliding ? TURKEY.slideHeight : TURKEY.height;
    if (!turkey.onGround) {
      turkey.vy += TURKEY.gravity * dt;
      turkey.y += turkey.vy * dt;
      if (turkey.y >= FIELD.groundY - turkey.height) {
        turkey.y = FIELD.groundY - turkey.height;
        turkey.vy = 0;
        turkey.onGround = true;
      }
    } else {
      turkey.y = FIELD.groundY - turkey.height;
    }
    turkey.runPhase += dt * (state.scrollSpeed / 40);

    // --- the scroll, the distance and the farmer's gap ---
    const dashing = turkey.dashTime > 0;
    state.scrollSpeed = scrollSpeedFor(controls.wish, dashing);
    state.distance += (state.scrollSpeed * dt) / PX_PER_METRE;
    state.scoreFloat += (state.scrollSpeed * dt) / PX_PER_METRE;
    // The score is the metres run plus the bonus points (corn, dodges).
    state.score = Math.floor(state.scoreFloat) + state.bonus;
    if (!harmless) {
      const drift = controls.wish > 0 ? GAP_DRIFT_FAST : controls.wish < 0 ? GAP_DRIFT_SLOW : GAP_DRIFT_BASE;
      state.gap = Math.min(GAP_MAX, Math.max(0, state.gap + drift * dt + (dashing ? 0.9 * dt : 0)));
    }

    // --- the farmer throws a knife when he is close ---
    if (!harmless && state.gap < THROW.gap) {
      if (farmer.windup > 0) {
        farmer.windup -= dt;
        if (farmer.windup <= 0) {
          farmer.armUp = false;
          spawnThrownKnife();
          events |= EVENT_THROW;
        }
      } else {
        farmer.throwTimer -= dt;
        if (farmer.throwTimer <= 0) {
          farmer.windup = THROW.windup;
          farmer.armUp = true;
          farmer.throwTimer = Math.max(THROW.minDelay, THROW.delay - THROW.delayPerStage * (state.stage - 1));
        }
      }
    } else {
      farmer.armUp = false;
      farmer.windup = 0;
    }

    // --- spawning ---
    state.obstacleTimer -= dt;
    if (state.obstacleTimer <= 0) {
      spawnObstacle();
      const interval = Math.max(
        SPAWN.minInterval,
        SPAWN.interval * SPAWN.intervalPerStage ** (state.stage - 1),
      );
      state.obstacleTimer += interval;
    }
    state.cornTimer -= dt;
    if (state.cornTimer <= 0) {
      spawnPickup();
      state.cornTimer += SPAWN.cornInterval + random() * 0.7;
    }

    // --- items move, collide and score ---
    state.onMud = false;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      if (item.kind === KIND_THROWN) {
        item.x += (THROW.knifeSpeed - state.scrollSpeed) * dt;
      } else {
        item.x -= state.scrollSpeed * dt;
      }
      if (item.x + item.width < -40 || item.x > FIELD.width + 200) {
        item.active = false;
        continue;
      }
      // An oven's fire jet breathes on a cycle; it is only dangerous while lit.
      const jetLit = item.kind === KIND_OVEN
        && ((state.elapsed + item.phase) % 2.4) < 1.0;
      if (!item.passed && item.x + item.width < turkey.x && item.kind < KIND_CORN) {
        item.passed = true;
        if (!harmless) {
          state.bonus += SCORE.dodge;
          events |= EVENT_DODGE;
        }
      }
      if (harmless) continue;
      const box = { x: item.x, y: item.y, width: item.width, height: item.height };
      if (item.kind === KIND_OVEN && jetLit) {
        box.y = item.y - 92;
        box.height = item.height + 92;
      }
      if (!overlaps(box, turkey)) {
        if (item.kind === KIND_MUD && overlaps({ x: item.x, y: FIELD.groundY - 14, width: item.width, height: 14 }, turkey)) {
          state.onMud = true;
        }
        continue;
      }
      if (item.kind === KIND_MUD) {
        state.onMud = true;
        continue;
      }
      if (item.kind === KIND_CORN || item.kind === KIND_GOLDEN || item.kind === KIND_FEATHER) {
        item.active = false;
        if (item.kind === KIND_CORN) {
          state.bonus += SCORE.corn;
          state.gap = Math.min(GAP_MAX, state.gap + GAP_CORN);
          events |= EVENT_CORN;
        } else if (item.kind === KIND_GOLDEN) {
          state.bonus += SCORE.goldenCorn;
          state.gap = Math.min(GAP_MAX, state.gap + GAP_GOLDEN);
          events |= EVENT_GOLDEN;
        } else {
          state.bonus += SCORE.feather;
          turkey.dashCooldown = 0;
          events |= EVENT_FEATHER;
        }
        continue;
      }
      if (turkey.invulnerable > 0) continue;
      item.active = false;
      state.lives -= 1;
      state.gap = Math.max(0, state.gap - GAP_STUMBLE);
      turkey.invulnerable = TURKEY.invulnerable;
      turkey.stumble = 0.6;
      events |= EVENT_HIT;
      if (state.lives <= 0 || state.gap <= 0) {
        state.over = 'caught';
        events |= EVENT_OVER;
        break;
      }
    }

    if (!harmless && state.gap <= 0 && state.over === null) {
      state.over = 'caught';
      events |= EVENT_OVER;
    }
    if (!harmless && state.distance >= ESCAPE_DISTANCE && state.over === null) {
      state.over = 'escaped';
      events |= EVENT_OVER;
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
