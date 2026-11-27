// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin
// filled with the backdrop colour. Every character is drawn from shapes: the
// turkey with its fanned tail, the farmer in overalls and a straw hat, the
// farmyard, the cornfield and the kitchen, each stage with its own sky.
import {
  DASH, ESCAPE_DISTANCE, FIELD, FONT, GAP_MAX, LIVES, PALETTE,
  STAGE_NAMES, TURKEY,
} from './config.js';
import {
  KIND_CORN, KIND_FEATHER, KIND_FENCE, KIND_GOLDEN, KIND_HAY, KIND_MUD,
  KIND_OVEN, KIND_PIN, KIND_PUMPKIN, KIND_SCARECROW, KIND_STALK,
  KIND_SWING, KIND_THROWN,
} from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

/** The panel's width; its height grows with its lines. */
const PANEL = { width: 660, top: 150, line: 34, bottom: 76 };

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('SCORE ');
  const distanceLabel = cachedLabel('');
  const bestLabel = cachedLabel('BEST ');
  const finalLabel = cachedLabel('SCORE ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align, baseline) {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align ?? 'left';
    context.textBaseline = baseline ?? 'alphabetic';
    context.fillText(value, x, y);
  }
  function plainText(value, x, y, size, color, align, baseline) {
    if (!fonts.has(`p${size}`)) fonts.set(`p${size}`, `${size}px ${FONT}`);
    context.font = fonts.get(`p${size}`);
    context.fillStyle = color;
    context.textAlign = align ?? 'left';
    context.textBaseline = baseline ?? 'alphabetic';
    context.fillText(value, x, y);
  }

  // --- scenery ---

  function drawSky(state) {
    const pal = PALETTE.stage[state.stage - 1];
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.groundY);
    gradient.addColorStop(0, pal.skyTop);
    gradient.addColorStop(1, pal.skyBottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.groundY);
    // The kitchen is indoors: no sun, clouds or hills, just the warm wall.
    if (state.stage === 3) return;
    // The low autumn sun.
    context.fillStyle = pal.sun;
    context.beginPath();
    context.arc(1080, 110, 52, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255, 233, 168, 0.35)';
    context.beginPath();
    context.arc(1080, 110, 74, 0, Math.PI * 2);
    context.fill();
    // Drifting clouds, placed by the distance run so they scroll slowly.
    context.fillStyle = 'rgba(255, 247, 232, 0.85)';
    for (let i = 0; i < 5; i += 1) {
      const cx = (((i * 317 + 120 - state.distance * 6) % 1500) + 1500) % 1500 - 110;
      const cy = 70 + i * 34;
      context.beginPath();
      context.ellipse(cx, cy, 64, 18, 0, 0, Math.PI * 2);
      context.ellipse(cx + 44, cy + 6, 44, 14, 0, 0, Math.PI * 2);
      context.fill();
    }
    // Rolling hills, two layers.
    context.fillStyle = pal.hillFar;
    context.beginPath();
    context.moveTo(0, FIELD.groundY);
    for (let x = 0; x <= FIELD.width; x += 80) {
      context.lineTo(x, FIELD.groundY - 120 - Math.sin((x + state.distance * 2) * 0.004) * 36);
    }
    context.lineTo(FIELD.width, FIELD.groundY);
    context.closePath();
    context.fill();
    context.fillStyle = pal.hillNear;
    context.beginPath();
    context.moveTo(0, FIELD.groundY);
    for (let x = 0; x <= FIELD.width; x += 80) {
      context.lineTo(x, FIELD.groundY - 46 - Math.sin((x + state.distance * 4) * 0.006 + 2) * 22);
    }
    context.lineTo(FIELD.width, FIELD.groundY);
    context.closePath();
    context.fill();
  }

  function drawStageScenery(state) {
    const pal = PALETTE.stage[state.stage - 1];
    const offset = state.distance * 10;
    if (state.stage === 1) {
      // The red barn and its fence, drifting past in the background.
      const barnX = 900 - ((offset * 0.3) % 1700);
      context.fillStyle = '#a83226';
      context.fillRect(barnX, 420, 190, 150);
      context.fillStyle = '#7c241a';
      context.beginPath();
      context.moveTo(barnX - 12, 420);
      context.lineTo(barnX + 95, 340);
      context.lineTo(barnX + 202, 420);
      context.closePath();
      context.fill();
      context.fillStyle = '#f2c94c';
      context.fillRect(barnX + 78, 470, 34, 100);
      context.strokeStyle = '#7a4a22';
      context.lineWidth = 5;
      for (let i = 0; i < 5; i += 1) {
        const fx = ((i * 260 - offset * 0.5) % 1400 + 1400) % 1400 - 60;
        context.beginPath();
        context.moveTo(fx, 560);
        context.lineTo(fx, 606);
        context.stroke();
      }
      context.beginPath();
      context.moveTo(0, 578);
      context.lineTo(FIELD.width, 578);
      context.stroke();
    } else if (state.stage === 2) {
      // Rows of tall corn stalks behind the track.
      for (let i = 0; i < 14; i += 1) {
        const sx = ((i * 97 - offset * 0.6) % 1400 + 1400) % 1400 - 60;
        const sway = Math.sin(state.elapsed * 2 + i) * 6;
        context.strokeStyle = '#7a9a2e';
        context.lineWidth = 7;
        context.beginPath();
        context.moveTo(sx, FIELD.groundY);
        context.quadraticCurveTo(sx + sway, 480, sx + sway * 2, 420);
        context.stroke();
        context.fillStyle = '#c9a227';
        context.beginPath();
        context.ellipse(sx + 8, 470, 10, 26, 0.4, 0, Math.PI * 2);
        context.fill();
      }
      // The scarecrow watches from the field.
      const scX = 700 - ((offset * 0.35) % 1600);
      context.strokeStyle = '#6b4a26';
      context.lineWidth = 6;
      context.beginPath();
      context.moveTo(scX - 40, 470);
      context.lineTo(scX + 40, 470);
      context.moveTo(scX, 440);
      context.lineTo(scX, 560);
      context.stroke();
      context.fillStyle = '#c0392b';
      context.beginPath();
      context.arc(scX, 430, 18, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#d9b23c';
      context.beginPath();
      context.moveTo(scX - 26, 420);
      context.lineTo(scX + 26, 420);
      context.lineTo(scX + 16, 402);
      context.lineTo(scX - 16, 402);
      context.closePath();
      context.fill();
    } else {
      // The kitchen: a warm wall, a window onto the yard, and a table.
      context.fillStyle = 'rgba(0, 0, 0, 0.18)';
      context.fillRect(0, 0, FIELD.width, FIELD.groundY);
      context.fillStyle = '#f2e3c8';
      context.fillRect(120, 120, 220, 180);
      context.fillStyle = '#f7b267';
      context.fillRect(136, 136, 188, 148);
      context.fillStyle = '#8a5a28';
      context.fillRect(222, 136, 12, 148);
      context.fillRect(136, 202, 188, 12);
      context.fillStyle = '#7c4a1e';
      context.fillRect(60, 470, 1160, 26);
      context.fillRect(90, 496, 26, 126);
      context.fillRect(1164, 496, 26, 126);
      // Hanging pans and a shelf of jars.
      context.strokeStyle = '#3a3a42';
      context.lineWidth = 4;
      for (let i = 0; i < 3; i += 1) {
        const px = 480 + i * 130;
        context.beginPath();
        context.arc(px, 180, 26, 0, Math.PI * 2);
        context.stroke();
      }
      context.fillStyle = '#c98a2e';
      context.fillRect(980, 150, 180, 14);
      for (let i = 0; i < 3; i += 1) {
        context.fillStyle = ['#d2691e', '#7bc96f', '#e5534b'][i];
        context.fillRect(990 + i * 56, 116, 34, 34);
      }
    }
  }

  function drawGround(state) {
    const pal = PALETTE.stage[state.stage - 1];
    context.fillStyle = pal.ground;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.fillStyle = pal.groundTop;
    context.fillRect(0, FIELD.groundY, FIELD.width, 8);
    // Pebbles and leaves rushing past underfoot.
    const offset = state.distance * 10;
    for (let i = 0; i < 22; i += 1) {
      const px = ((i * 173 - offset) % 1400 + 1400) % 1400 - 60;
      context.fillStyle = i % 3 === 0 ? '#d9a441' : '#5d3a1e';
      context.beginPath();
      context.ellipse(px, FIELD.groundY + 30 + (i % 4) * 16, 7, 4, 0, 0, Math.PI * 2);
      context.fill();
    }
  }

  // --- the turkey and the farmer ---

  /** The turkey, side-on and facing right: fanned tail, brown body, head and wattle, running legs. */
  function drawTurkey(turkey) {
    const cx = turkey.x + turkey.width / 2;
    const base = turkey.y + turkey.height;
    const phase = turkey.runPhase;
    const bob = turkey.onGround ? Math.sin(phase) * 2 : 0;
    // Tail fan, five feathers.
    for (let i = 0; i < 5; i += 1) {
      const spread = (i - 2) * 0.42;
      const len = 52 - Math.abs(i - 2) * 7;
      context.fillStyle = PALETTE.tail[i];
      context.beginPath();
      context.moveTo(cx - 16, base - 26 + bob);
      context.quadraticCurveTo(
        cx - 16 - Math.cos(spread) * len, base - 26 - Math.sin(spread) * len - 18 + bob,
        cx - 16 - Math.cos(spread) * (len + 12), base - 26 - Math.sin(spread) * (len + 12) - 8 + bob,
      );
      context.quadraticCurveTo(
        cx - 16 - Math.cos(spread) * len * 0.4, base - 14 + bob,
        cx - 16, base - 26 + bob,
      );
      context.fill();
    }
    // Legs: two striding sticks, or tucked when sliding.
    context.strokeStyle = '#e8a33c';
    context.lineWidth = 5;
    context.lineCap = 'round';
    if (turkey.sliding) {
      context.beginPath();
      context.moveTo(cx - 6, base - 8);
      context.lineTo(cx + 14, base - 2);
      context.moveTo(cx + 6, base - 8);
      context.lineTo(cx + 22, base - 2);
      context.stroke();
    } else if (turkey.onGround) {
      const swing = Math.sin(phase) * 12;
      context.beginPath();
      context.moveTo(cx - 8, base - 14);
      context.lineTo(cx - 8 + swing, base);
      context.moveTo(cx + 8, base - 14);
      context.lineTo(cx + 8 - swing, base);
      context.stroke();
    } else {
      context.beginPath();
      context.moveTo(cx - 8, base - 14);
      context.lineTo(cx - 2, base + 2);
      context.moveTo(cx + 8, base - 14);
      context.lineTo(cx + 14, base + 2);
      context.stroke();
    }
    // Body.
    context.fillStyle = PALETTE.turkeyBody;
    context.beginPath();
    context.ellipse(cx, base - 28 + bob, 34, 26, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.turkeyDark;
    context.beginPath();
    context.ellipse(cx - 4, base - 20 + bob, 22, 14, 0, 0, Math.PI * 2);
    context.fill();
    // Wing.
    context.fillStyle = '#6b3d20';
    context.beginPath();
    context.ellipse(cx - 2, base - 26 + bob, 20, 12, -0.3, 0, Math.PI * 2);
    context.fill();
    // Neck, head, beak and wattle at the front.
    const headX = cx + 26;
    const headY = base - 58 + bob;
    context.fillStyle = PALETTE.head;
    context.fillRect(headX - 6, headY - 4, 12, 22);
    context.beginPath();
    context.arc(headX, headY - 6, 12, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.beak;
    context.beginPath();
    context.moveTo(headX + 8, headY - 8);
    context.lineTo(headX + 24, headY - 3);
    context.lineTo(headX + 8, headY + 1);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.wattle;
    context.beginPath();
    context.ellipse(headX + 2, headY + 10, 4, 8, 0, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#1c1c1c';
    context.beginPath();
    context.arc(headX + 5, headY - 8, 2.5, 0, Math.PI * 2);
    context.fill();
  }

  /** The farmer, chasing from the left: straw hat, red shirt, blue overalls, beard, and a raised arm when he is about to throw. */
  function drawFarmer(state) {
    const turkey = state.turkey;
    const gapPx = state.gap * 12;
    const x = turkey.x - gapPx - 40;
    if (x < -120) return;
    const base = FIELD.groundY;
    const phase = turkey.runPhase * 1.15;
    const bob = Math.sin(phase) * 2;
    const armUp = state.farmer.armUp;
    // Legs.
    context.strokeStyle = PALETTE.farmerOveralls;
    context.lineWidth = 9;
    context.lineCap = 'round';
    const swing = Math.sin(phase) * 16;
    context.beginPath();
    context.moveTo(x + 14, base - 52);
    context.lineTo(x + 14 + swing, base);
    context.moveTo(x + 30, base - 52);
    context.lineTo(x + 30 - swing, base);
    context.stroke();
    // Body: overalls over a red shirt.
    context.fillStyle = PALETTE.farmerShirt;
    context.fillRect(x, base - 108 + bob, 46, 58);
    context.fillStyle = PALETTE.farmerOveralls;
    context.fillRect(x + 6, base - 104 + bob, 34, 56);
    context.fillStyle = '#f2c94c';
    context.fillRect(x + 14, base - 104 + bob, 6, 20);
    context.fillRect(x + 26, base - 104 + bob, 6, 20);
    // The throwing arm: raised and cocked when a knife is coming.
    context.strokeStyle = PALETTE.farmerShirt;
    context.lineWidth = 10;
    context.beginPath();
    if (armUp) {
      context.moveTo(x + 40, base - 96 + bob);
      context.lineTo(x + 66, base - 138 + bob);
    } else {
      context.moveTo(x + 40, base - 96 + bob);
      context.lineTo(x + 58, base - 70 + bob);
    }
    context.stroke();
    if (armUp) {
      context.fillStyle = PALETTE.knife;
      context.beginPath();
      context.moveTo(x + 62, base - 150 + bob);
      context.lineTo(x + 78, base - 142 + bob);
      context.lineTo(x + 66, base - 132 + bob);
      context.closePath();
      context.fill();
      // The warning shout.
      context.fillStyle = '#fff';
      context.beginPath();
      context.arc(x + 84, base - 168 + bob, 15, 0, Math.PI * 2);
      context.fill();
      text('!', x + 84, base - 160 + bob, 24, '#e5534b', 'center');
    }
    // Head, beard and straw hat.
    context.fillStyle = PALETTE.farmerSkin;
    context.beginPath();
    context.arc(x + 24, base - 122 + bob, 16, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#e8e0d0';
    context.beginPath();
    context.arc(x + 26, base - 112 + bob, 12, 0, Math.PI);
    context.fill();
    context.fillStyle = PALETTE.farmerHat;
    context.beginPath();
    context.ellipse(x + 24, base - 134 + bob, 26, 7, 0, 0, Math.PI * 2);
    context.fill();
    context.fillRect(x + 10, base - 150 + bob, 28, 16);
    context.fillStyle = '#1c1c1c';
    context.beginPath();
    context.arc(x + 32, base - 124 + bob, 2.5, 0, Math.PI * 2);
    context.fill();
  }

  // --- obstacles and pickups ---

  function drawKnifeBlade(x, y, w, h, angle) {
    context.save();
    context.translate(x + w / 2, y + h / 2);
    context.rotate(angle);
    context.fillStyle = PALETTE.handle;
    context.fillRect(-w / 2, -h / 2, w * 0.32, h);
    context.fillStyle = PALETTE.knife;
    context.beginPath();
    context.moveTo(-w / 2 + w * 0.32, -h / 2);
    context.lineTo(w / 2, -h * 0.1);
    context.lineTo(w / 2 - 4, h / 2);
    context.lineTo(-w / 2 + w * 0.32, h / 2);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.knifeEdge;
    context.fillRect(w / 2 - 5, -h / 2, 2, h);
    context.restore();
  }

  function drawItem(item, state) {
    const { x, y, width: w, height: h } = item;
    switch (item.kind) {
      case KIND_FENCE: {
        context.fillStyle = '#8a5a28';
        context.fillRect(x, y + 8, w, h - 8);
        context.fillStyle = '#a9713a';
        context.fillRect(x - 4, y + 14, w + 8, 10);
        context.fillRect(x - 4, y + 40, w + 8, 10);
        context.fillStyle = '#6b3d20';
        context.beginPath();
        context.moveTo(x, y + 8);
        context.lineTo(x + w / 2, y - 6);
        context.lineTo(x + w, y + 8);
        context.closePath();
        context.fill();
        break;
      }
      case KIND_HAY: {
        context.fillStyle = '#d9a441';
        context.beginPath();
        context.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = '#a97a1e';
        context.lineWidth = 3;
        context.beginPath();
        context.arc(x + w / 2, y + h / 2, w / 2 - 8, 0, Math.PI * 2);
        context.stroke();
        context.beginPath();
        context.arc(x + w / 2, y + h / 2, w / 4, 0, Math.PI * 2);
        context.stroke();
        break;
      }
      case KIND_PUMPKIN: {
        context.fillStyle = '#e8734a';
        context.beginPath();
        context.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = '#c85a2e';
        context.lineWidth = 3;
        for (let i = -1; i <= 1; i += 1) {
          context.beginPath();
          context.ellipse(x + w / 2 + i * 12, y + h / 2, 10, h / 2 - 4, 0, 0, Math.PI * 2);
          context.stroke();
        }
        context.strokeStyle = '#4a7a2e';
        context.lineWidth = 5;
        context.beginPath();
        context.moveTo(x + w / 2, y + 4);
        context.quadraticCurveTo(x + w / 2 + 8, y - 8, x + w / 2 + 16, y - 6);
        context.stroke();
        break;
      }
      case KIND_STALK: {
        context.strokeStyle = '#5d8a2e';
        context.lineWidth = 8;
        for (let i = 0; i < 3; i += 1) {
          const sx = x + 10 + i * 20;
          const sway = Math.sin(state.elapsed * 2 + item.phase + i) * 5;
          context.beginPath();
          context.moveTo(sx, y + h);
          context.quadraticCurveTo(sx + sway, y + h / 2, sx + sway * 2, y + 6);
          context.stroke();
        }
        context.fillStyle = '#f2c94c';
        context.beginPath();
        context.ellipse(x + w / 2, y + h - 26, 10, 24, 0.3, 0, Math.PI * 2);
        context.fill();
        break;
      }
      case KIND_SCARECROW: {
        context.strokeStyle = '#6b4a26';
        context.lineWidth = 6;
        context.beginPath();
        context.moveTo(x + 6, y + 40);
        context.lineTo(x + w - 6, y + 40);
        context.moveTo(x + w / 2, y + 20);
        context.lineTo(x + w / 2, y + h);
        context.stroke();
        context.fillStyle = '#c0392b';
        context.beginPath();
        context.arc(x + w / 2, y + 14, 14, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#d9b23c';
        context.beginPath();
        context.moveTo(x + w / 2 - 20, y + 8);
        context.lineTo(x + w / 2 + 20, y + 8);
        context.lineTo(x + w / 2 + 12, y - 6);
        context.lineTo(x + w / 2 - 12, y - 6);
        context.closePath();
        context.fill();
        context.fillStyle = '#2e5fa3';
        context.fillRect(x + 8, y + 40, w - 16, 34);
        break;
      }
      case KIND_OVEN: {
        const lit = ((state.elapsed + item.phase) % 2.4) < 1.0;
        context.fillStyle = PALETTE.oven;
        context.fillRect(x, y, w, h);
        context.fillStyle = '#3a3a42';
        context.fillRect(x + 8, y + 12, w - 16, h - 24);
        context.fillStyle = lit ? '#ff9d2e' : '#2c2c34';
        context.fillRect(x + 16, y + 26, w - 32, h - 56);
        context.fillStyle = '#dfe3ea';
        for (let i = 0; i < 3; i += 1) {
          context.beginPath();
          context.arc(x + 26 + i * 28, y + 8, 5, 0, Math.PI * 2);
          context.fill();
        }
        if (lit) {
          // The fire jet breathing out of the oven door: jump it late or not at all.
          context.fillStyle = PALETTE.fire;
          context.beginPath();
          context.moveTo(x + 14, y);
          context.quadraticCurveTo(x + w * 0.3, y - 70, x + w * 0.5, y - 92);
          context.quadraticCurveTo(x + w * 0.7, y - 70, x + w - 14, y);
          context.closePath();
          context.fill();
          context.fillStyle = PALETTE.fireCore;
          context.beginPath();
          context.moveTo(x + 30, y);
          context.quadraticCurveTo(x + w * 0.42, y - 42, x + w * 0.5, y - 56);
          context.quadraticCurveTo(x + w * 0.58, y - 42, x + w - 30, y);
          context.closePath();
          context.fill();
        }
        break;
      }
      case KIND_PIN: {
        context.fillStyle = '#c9a06a';
        context.beginPath();
        context.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#8a5a28';
        context.beginPath();
        context.ellipse(x + 8, y + h / 2, 8, h / 2 - 2, 0, 0, Math.PI * 2);
        context.ellipse(x + w - 8, y + h / 2, 8, h / 2 - 2, 0, 0, Math.PI * 2);
        context.fill();
        break;
      }
      case KIND_SWING: {
        // A carving knife on a string, swinging at head height: slide under it.
        const swing = Math.sin(state.elapsed * 2.2 + item.phase) * 14;
        context.strokeStyle = '#d8c49a';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(x + w / 2, 0);
        context.lineTo(x + w / 2 + swing, y);
        context.stroke();
        drawKnifeBlade(x + swing - 8, y, w + 16, h, 0.5);
        break;
      }
      case KIND_MUD: {
        context.fillStyle = '#5d3a1e';
        context.beginPath();
        context.ellipse(x + w / 2, y + h / 2, w / 2, h / 2 + 6, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#7a4a22';
        context.beginPath();
        context.ellipse(x + w / 2 - 16, y + h / 2, 14, 5, 0, 0, Math.PI * 2);
        context.ellipse(x + w / 2 + 20, y + h / 2 + 2, 10, 4, 0, 0, Math.PI * 2);
        context.fill();
        break;
      }
      case KIND_CORN:
      case KIND_GOLDEN: {
        const golden = item.kind === KIND_GOLDEN;
        const pulse = golden ? 1 + Math.sin(state.elapsed * 6) * 0.12 : 1;
        const cx = x + w / 2;
        const cy = y + h / 2;
        if (golden) {
          context.fillStyle = 'rgba(255, 217, 77, 0.3)';
          context.beginPath();
          context.arc(cx, cy, 26 * pulse, 0, Math.PI * 2);
          context.fill();
        }
        context.fillStyle = golden ? PALETTE.golden : PALETTE.corn;
        context.beginPath();
        context.ellipse(cx, cy, 11 * pulse, 15 * pulse, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = 'rgba(120, 80, 10, 0.55)';
        for (let i = -1; i <= 1; i += 1) {
          context.fillRect(cx - 6 + i * 6, cy - 10, 2, 20);
        }
        context.fillStyle = '#7bc96f';
        context.beginPath();
        context.ellipse(cx - 4, cy - 16, 8, 5, -0.5, 0, Math.PI * 2);
        context.ellipse(cx + 6, cy - 15, 8, 5, 0.5, 0, Math.PI * 2);
        context.fill();
        break;
      }
      case KIND_FEATHER: {
        const cx = x + w / 2;
        const cy = y + h / 2;
        context.fillStyle = 'rgba(255, 255, 255, 0.25)';
        context.beginPath();
        context.arc(cx, cy, 20 + Math.sin(state.elapsed * 5) * 3, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = PALETTE.feather;
        context.beginPath();
        context.ellipse(cx, cy, 7, 14, 0.5, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = '#c9c2b2';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(cx - 4, cy + 12);
        context.lineTo(cx + 4, cy - 12);
        context.stroke();
        break;
      }
      case KIND_THROWN: {
        drawKnifeBlade(x, y, w, h, 0.15 + Math.sin(state.elapsed * 20 + item.phase) * 0.1);
        break;
      }
      default:
        break;
    }
  }

  // --- HUD and panels ---

  function drawHeart(x, y, filled, size) {
    context.fillStyle = filled ? PALETTE.heart : PALETTE.heartEmpty;
    context.beginPath();
    context.moveTo(x, y + size * 0.35);
    context.bezierCurveTo(x, y, x - size * 0.5, y - size * 0.1, x - size * 0.5, y + size * 0.2);
    context.bezierCurveTo(x - size * 0.5, y + size * 0.55, x, y + size * 0.75, x, y + size);
    context.bezierCurveTo(x, y + size * 0.75, x + size * 0.5, y + size * 0.55, x + size * 0.5, y + size * 0.2);
    context.bezierCurveTo(x + size * 0.5, y - size * 0.1, x, y, x, y + size * 0.35);
    context.fill();
  }

  function drawHud(state) {
    // Top bar: score, the escape progress, lives.
    context.fillStyle = 'rgba(28, 16, 6, 0.55)';
    context.fillRect(0, 0, FIELD.width, 64);
    text(scoreLabel(state.score), 24, 42, 28, PALETTE.text, 'left');
    const barX = 330;
    const barW = 620;
    const barY = 22;
    context.fillStyle = PALETTE.hudBar;
    context.fillRect(barX, barY, barW, 20);
    context.fillStyle = '#7bc96f';
    context.fillRect(barX, barY, barW * Math.min(1, state.distance / ESCAPE_DISTANCE), 20);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(barX, barY, barW, 20);
    for (let i = 1; i < 3; i += 1) {
      const tx = barX + (barW * i) / 3;
      context.beginPath();
      context.moveTo(tx, barY - 4);
      context.lineTo(tx, barY + 24);
      context.stroke();
    }
    plainText(`DISTANCE ${Math.floor(state.distance)}m / ${ESCAPE_DISTANCE}m`, barX + barW / 2, 52, 15, PALETTE.muted, 'center');
    const stageName = state.over === 'escaped' ? 'THE WOODS' : STAGE_NAMES[state.stage - 1].toUpperCase();
    plainText(stageName, barX + barW / 2, 12, 13, PALETTE.corn, 'center');
    const heartSize = 22;
    for (let life = 0; life < LIVES; life += 1) {
      drawHeart(FIELD.width - 40 - life * 34, 18, life < state.lives, heartSize);
    }
    // Dash meter, under the score, on its own dark pill so it reads over any sky.
    context.fillStyle = 'rgba(28, 16, 6, 0.55)';
    context.fillRect(16, 66, 184, 26);
    plainText('DASH', 24, 84, 13, PALETTE.muted, 'left');
    context.fillStyle = PALETTE.hudBar;
    context.fillRect(70, 72, 120, 12);
    const dashReady = state.turkey.dashCooldown <= 0;
    context.fillStyle = dashReady ? '#7bc96f' : PALETTE.corn;
    const dashFill = dashReady ? 1 : 1 - state.turkey.dashCooldown / DASH.recharge;
    context.fillRect(70, 72, 120 * dashFill, 12);
    // The farmer gap meter along the bottom: turkey ahead, farmer behind.
    const meterY = FIELD.height - 34;
    context.fillStyle = 'rgba(28, 16, 6, 0.55)';
    context.fillRect(24, meterY - 12, 330, 30);
    const gapRatio = state.gap / GAP_MAX;
    const farmerX = 40 + (1 - gapRatio) * 220;
    context.fillStyle = gapRatio < 0.35 ? PALETTE.gapBad : PALETTE.gapGood;
    context.fillRect(40, meterY + 2, 240, 4);
    context.fillStyle = PALETTE.farmerHat;
    context.beginPath();
    context.arc(farmerX, meterY - 4, 9, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.turkeyBody;
    context.beginPath();
    context.arc(292, meterY - 4, 9, 0, Math.PI * 2);
    context.fill();
    plainText(
      state.gap < 8 ? `FARMER ${state.gap.toFixed(0)}m BEHIND — RUN!` : `Farmer ${state.gap.toFixed(0)}m behind`,
      40, meterY - 18, 13, state.gap < 8 ? '#ff9d8a' : PALETTE.muted, 'left',
    );
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(20, 10, 2, 0.45)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = accent ?? PALETTE.panelEdge;
    context.lineWidth = 4;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 82, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      plainText(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.corn, 'center');
  }

  /** The woods the turkey escapes to: green hills, pine trees, a clear sky. */
  function drawForest(state) {
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.groundY);
    gradient.addColorStop(0, '#7ec8e3');
    gradient.addColorStop(1, '#c8ecc8');
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.groundY);
    context.fillStyle = '#fff3c4';
    context.beginPath();
    context.arc(1080, 110, 48, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#5d8a4a';
    context.beginPath();
    context.moveTo(0, FIELD.groundY);
    for (let x = 0; x <= FIELD.width; x += 80) {
      context.lineTo(x, FIELD.groundY - 90 - Math.sin(x * 0.005 + 1) * 30);
    }
    context.lineTo(FIELD.width, FIELD.groundY);
    context.closePath();
    context.fill();
    // Pines along the treeline.
    for (let i = 0; i < 12; i += 1) {
      const px = 40 + i * 108;
      const ph = 90 + (i % 3) * 26;
      context.fillStyle = '#2e5d33';
      context.beginPath();
      context.moveTo(px, FIELD.groundY - ph);
      context.lineTo(px + 34, FIELD.groundY - ph + 70);
      context.lineTo(px - 34, FIELD.groundY - ph + 70);
      context.closePath();
      context.fill();
      context.beginPath();
      context.moveTo(px, FIELD.groundY - ph - 34);
      context.lineTo(px + 26, FIELD.groundY - ph + 26);
      context.lineTo(px - 26, FIELD.groundY - ph + 26);
      context.closePath();
      context.fill();
      context.fillStyle = '#6b4a26';
      context.fillRect(px - 5, FIELD.groundY - 26, 10, 26);
    }
    context.fillStyle = '#4a7a3a';
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.fillStyle = '#6b9a4a';
    context.fillRect(0, FIELD.groundY, FIELD.width, 8);
  }

  function drawField(state) {
    if (state.over === 'escaped') {
      drawForest(state);
    } else {
      drawSky(state);
      drawStageScenery(state);
      drawGround(state);
    }
    for (let index = 0; index < state.items.length; index += 1) {
      const item = state.items[index];
      if (item.active) drawItem(item, state);
    }
    drawFarmer(state);
    const turkey = state.turkey;
    if (turkey.invulnerable === 0 || Math.floor(turkey.invulnerable * 10) % 2 === 1) {
      drawTurkey(turkey);
    }
  }

  const TITLE_LINES = [
    'Thanksgiving is coming — and you are the main course.',
    'Outrun the farmer: farmyard, cornfield, kitchen.',
    'Jump the fences, slide under the knives, dodge the oven fire.',
    'Grab corn to pull ahead. Reach the woods 1200m away!',
    '↑ / W / Space jump · ↓ / S slide · → run faster',
    'Shift dash · P pause · M mute',
    '',
  ];
  const PAUSED_LINES = ['The farmer waits. The oven stays hot.', ''];
  const CAUGHT_LINES = ['The farmer caught you — dinner is served.', '', ''];
  const ESCAPED_LINES = ['You made it to the woods. No dinner today!', '', ''];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[6] = best > 0 ? bestLabel(best) : 'No best escape yet — make this one count.';
      drawPanel('TURKEY RUN', TITLE_LINES, 'Press Space or click to run for your life');
      return;
    }
    drawHud(state);
    if (screen === SCREEN_PAUSED) {
      PAUSED_LINES[1] = `Score ${state.score} · ${Math.floor(state.distance)}m run`;
      drawPanel('Paused', PAUSED_LINES, 'Press P to keep running');
    } else if (screen === SCREEN_OVER) {
      if (state.over === 'escaped') {
        ESCAPED_LINES[1] = finalLabel(state.score);
        ESCAPED_LINES[2] = bestLabel(best);
        drawPanel('ESCAPED!', ESCAPED_LINES, 'Press Space or click to run again', '#7bc96f');
      } else {
        CAUGHT_LINES[1] = finalLabel(state.score);
        CAUGHT_LINES[2] = bestLabel(best);
        drawPanel('CAUGHT!', CAUGHT_LINES, 'Press Space or click to try again', '#e5534b');
      }
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
