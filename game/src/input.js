// Keyboard and pointer input. Held keys steer (run faster or slower, duck);
// one-shot presses (jump, dash, start, pause, mute) are queued as bit flags
// and taken once by the loop, so a press between two frames is never lost
// and never counted twice.
export const ACTION_JUMP = 1;
export const ACTION_DASH = 2;
export const ACTION_CONFIRM = 4;
export const ACTION_PAUSE = 8;
export const ACTION_MUTE = 16;

const JUMP = new Set(['ArrowUp', 'KeyW', 'Space']);
const DASH = new Set(['ShiftLeft', 'ShiftRight', 'KeyX']);
const CONFIRM = new Set(['Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const SLOW = new Set(['ArrowLeft', 'KeyA']);
const FAST = new Set(['ArrowRight', 'KeyD']);
const SLIDE = new Set(['ArrowDown', 'KeyS']);

export function createInput(target) {
  let slow = false;
  let fast = false;
  let slide = false;
  let actions = 0;

  window.addEventListener('keydown', (event) => {
    if (JUMP.has(event.code)) {
      if (!event.repeat) actions |= ACTION_JUMP;
    } else if (DASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_DASH;
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (SLOW.has(event.code)) slow = true;
    else if (FAST.has(event.code)) fast = true;
    else if (SLIDE.has(event.code)) slide = true;
    else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (SLOW.has(event.code)) slow = false;
    else if (FAST.has(event.code)) fast = false;
    else if (SLIDE.has(event.code)) slide = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of
  // everything on blur.
  window.addEventListener('blur', () => {
    slow = false;
    fast = false;
    slide = false;
  });
  // A click or tap jumps (and starts the game from a panel); a right-click
  // dashes instead.
  target.addEventListener('pointerdown', (event) => {
    if (event.button === 2) actions |= ACTION_DASH;
    else actions |= ACTION_JUMP | ACTION_CONFIRM;
  });
  target.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    /** +1 running fast, -1 dawdling, 0 cruising. */
    speedWish() {
      return (fast ? 1 : 0) - (slow ? 1 : 0);
    },
    sliding() {
      return slide;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
