// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between four screens: title,
// play, paused and over — caught by the farmer, or escaped to the woods.
//
// ?seed=N fixes the random pattern. ?shot=title|play|kitchen|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { BEST_KEY, ESCAPE_DISTANCE, LIVES, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CORN, EVENT_FEATHER, EVENT_GOLDEN, EVENT_HIT, EVENT_OVER, EVENT_THROW } from './world.js';
import {
  ACTION_CONFIRM, ACTION_DASH, ACTION_JUMP, ACTION_MUTE, ACTION_PAUSE,
  createInput,
} from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    audio.gobble();
    announce(`Running! ${LIVES} lives. Reach the woods ${ESCAPE_DISTANCE} metres away.`);
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (world.state.over === 'escaped') {
      audio.escaped();
      announce(`Escaped! Score ${world.state.score}. Best ${best}.`);
    } else {
      audio.caught();
      announce(`Caught for dinner. Score ${world.state.score}. Best ${best}.`);
    }
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & (ACTION_CONFIRM | ACTION_JUMP) && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM | ACTION_JUMP) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Running.');
    }
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { wish: 0, slide: false, jump: false, dash: false }, true);
      return;
    }
    const controls = {
      wish: input.speedWish(),
      slide: input.sliding(),
      jump: Boolean(actions & ACTION_JUMP),
      dash: Boolean(actions & ACTION_DASH),
    };
    if (controls.jump) audio.jump();
    if (controls.dash) audio.dash();
    const events = world.step(STEP, controls, false);
    if (events & EVENT_OVER) endGame();
    else if (events & EVENT_HIT) {
      audio.hit();
      audio.farmerYell();
      announce(world.state.lives === 1 ? 'Hit! 1 life left.' : `Hit! ${world.state.lives} lives left.`);
    } else if (events & EVENT_GOLDEN) audio.golden();
    else if (events & EVENT_CORN) audio.corn();
    else if (events & EVENT_FEATHER) audio.feather();
    else if (events & EVENT_THROW) audio.throwKnife();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // One-shot presses are taken once per frame and spent on the first step;
    // later catch-up steps in the same frame get none.
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      let first = true;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(first ? actions : 0);
        first = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting the farmer catch the turkey unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // A handle for automated play-testing: the live state, never the visuals.
  window.__turkeyRun = {
    screen: () => screen,
    state: () => world.state,
  };

  announce('Turkey Run. Press Space or click to run for your life.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
