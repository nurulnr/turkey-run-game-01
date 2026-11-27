// The screenshot scenes behind ?shot=title|play|kitchen|end. Each one plays
// the real rules forward from a fresh world for a fixed stretch, steered by
// an autopilot (jump the fences and the low knives, slide under the swinging
// ones, time the oven's fire, dash when the farmer closes in), so the frame
// is what a real game looks like and the same seed always gives the same
// frame.
import { FIELD, STEP, THROW, TURKEY } from './config.js';
import {
  EVENT_OVER, KIND_CORN, KIND_FEATHER, KIND_GOLDEN, KIND_MUD, KIND_OVEN,
  KIND_SWING, KIND_THROWN,
} from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const TITLE_SECONDS = 6;
const PLAY_SECONDS = 11;
const KITCHEN_DISTANCE = 900;
const END_LIMIT_SECONDS = 600;

/** How far ahead, in pixels, the autopilot looks for trouble. */
const LOOKAHEAD = 460;
const SLIDE_AT = 210;
/** The jump's rise and fall, in px/s and px/s^2, matching the world's physics. */
const JUMP_VELOCITY = TURKEY.jumpVelocity;
const GRAVITY = TURKEY.gravity;

/** True when the oven's fire jet is lit at `seconds` into the future. */
function jetLitAt(item, elapsed, seconds) {
  return ((elapsed + item.phase + seconds) % 2.4) < 1.0;
}

/**
 * The window of distances (in pixels) from which a jump now clears an
 * obstacle `height` tall: the turkey must be above the obstacle's top from
 * the moment it first touches the turkey until it has passed the turkey's
 * back foot, a span of `span` pixels at the given closing speed. The window
 * is padded on both sides, because the world's discrete steps jump a little
 * lower than the continuous arc.
 */
function jumpWindow(height, span, speed) {
  const discriminant = JUMP_VELOCITY * JUMP_VELOCITY - 2 * GRAVITY * height;
  if (discriminant <= 0) return null;
  const root = Math.sqrt(discriminant);
  const rise = (JUMP_VELOCITY - root) / GRAVITY;
  const fall = (JUMP_VELOCITY + root) / GRAVITY;
  return { earliest: rise * speed + 8, latest: fall * speed - span - 30 };
}

export function autopilot(state) {
  const turkey = state.turkey;
  const speed = state.scrollSpeed;
  let jumpTarget = null;
  let slideAt = null;
  let oven = null;
  let headKnifeGap = Infinity;
  let swingGap = Infinity;

  for (let index = 0; index < state.items.length; index += 1) {
    const item = state.items[index];
    if (!item.active) continue;
    if (item.kind === KIND_CORN || item.kind === KIND_GOLDEN || item.kind === KIND_FEATHER) continue;
    if (item.kind === KIND_THROWN) {
      // A thrown knife flies at the turkey from behind: what matters is the
      // distance from its front edge to the turkey's back foot, and it closes
      // at its own speed minus the scroll.
      if (item.x > turkey.x + turkey.width) continue;
      const gap = turkey.x - (item.x + item.width);
      if (gap > LOOKAHEAD) continue;
      const headHeight = item.y < FIELD.groundY - 60;
      if (headHeight) {
        headKnifeGap = Math.min(headKnifeGap, gap);
      } else if (jumpTarget === null || gap < jumpTarget.gap) {
        jumpTarget = {
          item, gap,
          span: item.width + turkey.width,
          closing: Math.max(60, THROW.knifeSpeed - speed),
        };
      }
      continue;
    }
    // Everything else runs at the turkey from the right.
    if (item.x + item.width < turkey.x) continue;
    const gap = item.x - (turkey.x + turkey.width);
    if (gap > LOOKAHEAD) continue;
    if (item.kind === KIND_OVEN) {
      if (oven === null || gap < oven.gap) oven = { item, gap };
      continue;
    }
    if (item.kind === KIND_SWING) {
      if (slideAt === null || gap < slideAt) slideAt = gap;
      swingGap = Math.min(swingGap, gap);
      continue;
    }
    if (item.kind === KIND_MUD) continue;
    if (jumpTarget === null || gap < jumpTarget.gap) {
      jumpTarget = { item, gap, span: item.width + turkey.width, closing: speed };
    }
  }

  let wish = 1;
  let slide = false;
  let jump = false;
  let dash = false;

  // Slide under a swinging knife that is nearly overhead, and never jump
  // into one: a jump would carry the turkey's head straight through it.
  // A knife thrown at head height is the same danger: it sails clean over a
  // turkey on the ground and only catches one in the air.
  if (slideAt !== null && slideAt < SLIDE_AT && turkey.onGround) slide = true;
  const swingNear = swingGap < 340;
  const airDanger = (headKnifeGap < 300 && headKnifeGap > -80)
    || (swingGap < 300 && swingGap > -80);

  if (oven !== null) {
    const front = oven.gap / Math.max(1, speed);
    const back = (oven.gap + oven.item.width + turkey.width) / Math.max(1, speed);
    const litDuring = jetLitAt(oven.item, state.elapsed, front)
      || jetLitAt(oven.item, state.elapsed, (front + back) / 2)
      || jetLitAt(oven.item, state.elapsed, back);
    if (litDuring) {
      if (oven.gap < 40 && turkey.dashCooldown <= 0) {
        // Too late to wait: dash straight through the fire, invulnerable.
        dash = true;
        jump = turkey.onGround;
      } else if (oven.gap > 40) {
        // Hold back and let the fire die before jumping the oven.
        wish = -1;
      }
    } else if (turkey.onGround && !swingNear) {
      const window = jumpWindow(oven.item.height, oven.item.width + turkey.width, speed);
      if (window && oven.gap <= window.latest && oven.gap >= window.earliest - 20) {
        if (airDanger && oven.gap > 70 && turkey.dashCooldown <= 0) dash = true;
        else jump = true;
      }
    }
  }

  if (!slide && !swingNear && jumpTarget !== null && turkey.onGround) {
    const window = jumpWindow(jumpTarget.item.height, jumpTarget.span, jumpTarget.closing);
    if (window) {
      if (jumpTarget.gap <= window.latest && jumpTarget.gap >= window.earliest - 20) {
        if (airDanger && jumpTarget.gap > 70) {
          // A knife is crossing overhead: wait for it to pass, or dash
          // through the obstacle instead of jumping into the blade.
          if (turkey.dashCooldown <= 0) dash = true;
        } else {
          jump = true;
        }
      } else if (jumpTarget.gap < window.earliest - 20 && turkey.dashCooldown <= 0) {
        // Jumped too late to clear it: dash through instead.
        dash = true;
      }
    }
  }
  if (state.gap < 6 && turkey.dashCooldown <= 0) dash = true;

  return { wish, slide, jump, dash };
}

/**
 * Set `world` to the named scene (title, play, kitchen or end; any other name
 * is title) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'kitchen' && name !== 'end') {
    for (let index = 0; index < TITLE_SECONDS / STEP; index += 1) {
      world.step(STEP, { wish: 0, slide: false, jump: false, dash: false }, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    for (let index = 0; index < PLAY_SECONDS / STEP; index += 1) {
      if (world.step(STEP, autopilot(world.state), false) & EVENT_OVER) break;
    }
    return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'kitchen') {
    for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
      // Stage the kitchen shot on an oven with its fire lit, in frame.
      if (world.state.distance >= KITCHEN_DISTANCE) {
        const oven = world.state.items.find(
          (item) => item.active && item.kind === KIND_OVEN && item.x > 450 && item.x < 1050
            && ((world.state.elapsed + item.phase) % 2.4) < 1.0,
        );
        if (oven || world.state.distance >= 1080) break;
      }
      if (world.step(STEP, autopilot(world.state), false) & EVENT_OVER) break;
    }
    return { screen: world.state.over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
    if (world.step(STEP, autopilot(world.state), false) & EVENT_OVER) break;
  }
  return { screen: SCREEN_OVER, best: world.state.score };
}
