// Meridian Run — tuning constants for the flight model, the course and the look.
// One place for every number a designer would want to tweak.

export const CONFIG = {
  // --- flight model ---------------------------------------------------------
  minSpeed: 38, // m/s, stall speed: slower than this and the nose drops
  maxSpeed: 96, // m/s at full throttle, level flight
  cruiseSpeed: 62, // m/s the plane settles at with half throttle
  climbRate: 9.5, // m/s gained per second at full pitch up
  sinkRate: 12.0, // m/s lost per second in a steep dive
  turnRate: 0.55, // rad/s of heading change at full bank
  maxBank: 0.9, // rad of visual roll
  throttleStep: 0.55, // per second while a throttle key is held
  fuelDrain: 0.55, // percent per second at full throttle
  fuelPerRing: 14, // percent refunded for each ring flown through
  startFuel: 100,
  startAltitude: 120, // metres above the sea
  crashAltitude: 2.5, // metres above local terrain: below this is a crash

  // --- course ---------------------------------------------------------------
  ringCount: 16,
  ringSpacing: 420, // metres between consecutive rings
  ringRadius: 20, // metres, the torus the plane must pass through
  ringFirstAt: 500, // metres along the course to the first ring
  courseSeed: 20261126,
  roundSeconds: 150, // the clock the pilot races against
  ringTimeBonus: 4, // seconds added per ring
  ringScore: 100,
  streakBonus: 25, // extra points per consecutive ring, times the streak

  // --- rendering ------------------------------------------------------------
  viewWidth: 1280,
  viewHeight: 720,
  focal: 640, // perspective focal length in pixels at 1280x720
  cameraBehind: 17, // metres behind the plane
  cameraAbove: 5.5, // metres above the plane
  cameraLookAhead: 46, // metres ahead of the plane the camera aims at
  farDistance: 5200, // metres: nothing is drawn beyond this
  sunAzimuth: 0.62, // rad, where the low sun sits in the sky
  sunElevation: 0.16, // rad above the horizon

  // --- palette: golden hour over a coral sea --------------------------------
  skyTop: '#1d3a6e',
  skyMid: '#e8825a',
  skyLow: '#f7b267',
  seaDeep: '#0e4d6b',
  seaShallow: '#2fa8a0',
  sand: '#f2d8a0',
  palmGreen: '#2f7d4f',
  hillGreen: '#4d9a5f',
  rockGrey: '#8a7f72',
  ringGold: '#ffc53d',
  ringBlue: '#6fd3ff',
  hudAmber: '#ffb347',
  hudGreen: '#7dffb0',
  hudRed: '#ff6b5e',
  planeRed: '#d9392b',
  planeCream: '#f6ead2',
};
