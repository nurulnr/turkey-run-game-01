// Every tuning number and colour for Turkey Run, in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// fit the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720, groundY: 622 };

// The simulation's fixed step, in seconds: 60 updates a second, whatever the
// display's rate.
export const STEP = 1 / 60;

// Pixels the turkey covers for one metre of the escape.
export const PX_PER_METRE = 10;

// How far the turkey has to run to reach the woods and be free.
export const ESCAPE_DISTANCE = 1200;

// The farmer starts this many metres behind the turkey. A stumble costs metres;
// corn and fast running win them back. At zero metres he grabs the turkey.
export const GAP_START = 20;
export const GAP_MAX = 30;
export const GAP_STUMBLE = 4;
export const GAP_CORN = 0.6;
export const GAP_GOLDEN = 2;
export const GAP_DRIFT_FAST = 0.25;
export const GAP_DRIFT_SLOW = -0.55;
export const GAP_DRIFT_BASE = -0.12;

export const TURKEY = {
  x: 250,
  width: 64,
  height: 58,
  slideHeight: 30,
  jumpVelocity: 1050,
  gravity: 2500,
  // Seconds of no harm after a hit, while the turkey blinks.
  invulnerable: 1.5,
};

export const LIVES = 3;

// The world scrolls left at this base speed (px/s); holding right runs faster,
// holding left dawdles, and each stage adds a little more hurry.
export const SCROLL = {
  base: 300,
  perStage: 26,
  fastBonus: 70,
  slowPenalty: 95,
  min: 140,
  mudFactor: 0.55,
};

// A dash bursts the turkey forward, wins a little gap and grants a blink of
// invulnerability. It recharges over DASH_RECHARGE seconds.
export const DASH = {
  boost: 260,
  time: 0.35,
  recharge: 3.2,
  gapGain: 1.2,
};

// Obstacles: how often they appear, and how fast that gets. spawnInterval is
// seconds between spawns at stage 1; each later stage multiplies it down.
export const SPAWN = {
  interval: 1.15,
  intervalPerStage: 0.86,
  minInterval: 0.5,
  cornInterval: 1.5,
  goldenChance: 0.12,
  featherChance: 0.1,
};

// The farmer throws a carving knife when he is close enough. throwGap is the
// gap in metres inside which he starts throwing; the delay between throws
// shrinks as the stages go on.
export const THROW = {
  gap: 24,
  delay: 3.6,
  delayPerStage: 0.8,
  minDelay: 1.9,
  windup: 0.55,
  knifeSpeed: 640,
};

// One stage every STAGE_METRES metres: farmyard, cornfield, then the kitchen.
export const STAGE_METRES = 400;
export const STAGE_COUNT = 3;
export const STAGE_NAMES = ['The Farmyard', 'The Cornfield', 'The Kitchen'];

export const SCORE = {
  corn: 10,
  goldenCorn: 50,
  feather: 25,
  dodge: 5,
  metre: 1,
};

// How many obstacles, pickups and thrown knives can exist at once; the pools
// are allocated once at boot and never grow.
export const POOL_SIZE = 48;

export const PALETTE = {
  backdrop: '#241608',
  text: '#fff7e8',
  muted: '#d8c49a',
  panel: '#3a2410',
  panelEdge: '#c98a2e',
  hudBar: '#2c1a08',
  corn: '#f2c94c',
  golden: '#ffd94d',
  feather: '#f5f0e6',
  // One sky, ground and accent per stage: farmyard dusk, cornfield gold, kitchen warm.
  stage: [
    {
      skyTop: '#f7b267', skyBottom: '#f4845f', sun: '#ffe9a8',
      hillFar: '#b4763b', hillNear: '#8a5a28', ground: '#7a4a22',
      groundTop: '#a9713a', accent: '#e5534b',
    },
    {
      skyTop: '#f9c86b', skyBottom: '#ef8354', sun: '#fff3c4',
      hillFar: '#c08a3e', hillNear: '#96682a', ground: '#8a5c26',
      groundTop: '#c08a44', accent: '#d9a441',
    },
    {
      skyTop: '#8a4a2e', skyBottom: '#5d2f1d', sun: '#ffd9a0',
      hillFar: '#4a2418', hillNear: '#3a1c12', ground: '#6b3a22',
      groundTop: '#96603a', accent: '#e8734a',
    },
  ],
  turkeyBody: '#8a5230',
  turkeyDark: '#6b3d20',
  tail: ['#a0522d', '#d2691e', '#e8a33c', '#c96a1e', '#8a4a1e'],
  head: '#e8dcc8',
  beak: '#e8a33c',
  wattle: '#e5534b',
  farmerShirt: '#c0392b',
  farmerOveralls: '#2e5fa3',
  farmerHat: '#d9b23c',
  farmerSkin: '#e8b98a',
  knife: '#dfe3ea',
  knifeEdge: '#ffffff',
  handle: '#4a2c14',
  fire: '#ff9d2e',
  fireCore: '#ffe066',
  oven: '#5d5d66',
  heart: '#e5534b',
  heartEmpty: '#5d4030',
  gapGood: '#7bc96f',
  gapBad: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'turkey-run.best';
