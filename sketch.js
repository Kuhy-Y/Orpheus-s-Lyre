let port, reader;

let sounds = [];
let soundFiles = ["1.mp3", "2.mp3", "3.mp3", "4.mp3", "5.mp3", "6.mp3", "7.mp3"];

let tree;
let labels = [];
let driftingStars = [];
let forestBackdrop;
let mosaicField;

let lastInteraction = 0;
const IDLE_RETREAT_DELAY_MS = 10000;
const BRANCH_ROOT_HUE = 204;
const BRANCH_ROOT_SAT = 108;
const BRANCH_ROOT_BRI = 30;
const BRANCH_TIP_HUE = 210;
const BRANCH_TIP_SAT = 44;
const BRANCH_TIP_BRI = 122;
const GROUND_HUE = 184;
const GROUND_SAT = 94;
const GROUND_BRI = 14;
const MOSAIC_GRID_SIZE = 82;

function setupSounds() {
  sounds = soundFiles.map(() => null);

  for (let i = 0; i < soundFiles.length; i++) {
    const file = soundFiles[i];

    loadSound(
      file,
      sound => {
        sounds[i] = sound;
      },
      err => {
        sounds[i] = null;
        console.warn(`Sound file could not be loaded: ${file}`, err);
      }
    );
  }
}

async function ensureAudioReady() {
  try {
    const ctx = typeof getAudioContext === "function" ? getAudioContext() : null;
    if (!ctx) return false;

    if (ctx.state !== "running") {
      await userStartAudio();
    }

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    return ctx.state === "running";
  } catch (err) {
    console.warn("Audio context could not be resumed.", err);
    return false;
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 255);
  textFont("monospace");
  textSize(14);
  rectMode(CORNER);
  angleMode(RADIANS);

  setupSounds();
  rebuildEnvironment();
  resetScene();

  createButton("Connect Arduino")
    .position(16, 16)
    .mousePressed(connectSerial)
    .attribute("id", "connectButton");
}

function draw() {
  if (!forestBackdrop || !mosaicField) {
    rebuildEnvironment();
  }

  const backdropVibrance = forestBackdrop.display();
  mosaicField.update(forestBackdrop.mosaicSource, forestBackdrop.compositeVersion);
  mosaicField.display(backdropVibrance);

  if (!tree) resetScene();

  if (millis() - lastInteraction > IDLE_RETREAT_DELAY_MS) {
    tree.startRetreat();
  }

  tree.update();
  tree.display();
  drawIdlePrompt(backdropVibrance);

  updateAndDisplayLabels();
  updateAndDisplayDriftingStars();

  if (tree.shouldReset()) {
    resetScene();
  }
}

function rebuildEnvironment() {
  forestBackdrop = new ForestBackdrop(width, height);
  mosaicField = new MosaicField(width, height);
}

function resetScene() {
  labels = [];
  driftingStars = [];
  tree = new TreeSystem(width * 0.5, height * 0.82);
  lastInteraction = millis();
}

function drawIdlePrompt(vibrance) {
  const visibility = pow(constrain(1 - vibrance, 0, 1), 1.5);
  if (visibility <= 0.01) return;

  const horizonY = height * 0.82;
  const promptY = lerp(horizonY, height, 0.48);
  const pulse = sin(frameCount * 0.028) * 3 * visibility;
  const size = constrain(width * 0.024, 18, 30);

  push();
  textAlign(CENTER, CENTER);
  textSize(size);
  noStroke();
  fill(0, 0, 255, 225 * visibility);
  text("Try playing the lyre.", width * 0.5, promptY + pulse);
  pop();
}

function drawBreathingGradientBackground() {
  let t = frameCount * 0.012;

  let topHue = 145;
  let topSat = 220;
  let topBri = map(sin(t), -1, 1, 145, 170);

  let midHue = 148;
  let midSat = 205;
  let midBri = map(cos(t * 0.9), -1, 1, 180, 205);

  let botHue = 150;
  let botSat = 175;
  let botBri = map(sin(t * 0.8 + 1.1), -1, 1, 225, 245);

  noStroke();

  for (let y = 0; y < height; y += 3) {
    let p = y / height;

    let hVal;
    let sVal;
    let bVal;

    if (p < 0.58) {
      let pp = map(p, 0, 0.58, 0, 1);
      hVal = lerp(topHue, midHue, pp);
      sVal = lerp(topSat, midSat, pp);
      bVal = lerp(topBri, midBri, pp);
    } else {
      let pp = map(p, 0.58, 1, 0, 1);
      hVal = lerp(midHue, botHue, pp);
      sVal = lerp(midSat, botSat, pp);
      bVal = lerp(midBri, botBri, pp);
    }

    let waveZone = exp(-pow((p - 0.58) / 0.18, 2));
    let wave = sin(frameCount * 0.03 + y * 0.02) * 6 * waveZone;

    fill(hVal, sVal, bVal + wave);
    rect(0, y, width, 3);
  }

  for (let i = 0; i < 20; i++) {
    let x = noise(i * 120 + frameCount * 0.001) * width;
    let y = noise(i * 240 + frameCount * 0.0013) * height;
    fill(0, 0, 255, 22);
    ellipse(x, y, 1.5, 1.5);
  }
}

function drawBreathingGradientToGraphics(g, w, h) {
  let t = frameCount * 0.012;

  let topHue = 145;
  let topSat = 220;
  let topBri = map(sin(t), -1, 1, 145, 170);

  let midHue = 148;
  let midSat = 205;
  let midBri = map(cos(t * 0.9), -1, 1, 180, 205);

  let botHue = 150;
  let botSat = 175;
  let botBri = map(sin(t * 0.8 + 1.1), -1, 1, 225, 245);

  g.noStroke();

  for (let y = 0; y < h; y += 3) {
    let p = y / h;

    let hVal;
    let sVal;
    let bVal;

    if (p < 0.58) {
      let pp = map(p, 0, 0.58, 0, 1);
      hVal = lerp(topHue, midHue, pp);
      sVal = lerp(topSat, midSat, pp);
      bVal = lerp(topBri, midBri, pp);
    } else {
      let pp = map(p, 0.58, 1, 0, 1);
      hVal = lerp(midHue, botHue, pp);
      sVal = lerp(midSat, botSat, pp);
      bVal = lerp(midBri, botBri, pp);
    }

    let waveZone = exp(-pow((p - 0.58) / 0.18, 2));
    let wave = sin(frameCount * 0.03 + y * 0.02) * 6 * waveZone;

    g.fill(hVal, sVal, bVal + wave);
    g.rect(0, y, w, 3);
  }

  for (let i = 0; i < 20; i++) {
    let x = noise(i * 120 + frameCount * 0.001) * w;
    let y = noise(i * 240 + frameCount * 0.0013) * h;
    g.fill(0, 0, 255, 22);
    g.ellipse(x, y, 1.5, 1.5);
  }
}

class ForestBackdrop {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.scene = createGraphics(w, h);
    this.scene.pixelDensity(1);
    this.scene.colorMode(HSB, 255);
    this.restLayer = createGraphics(w, h);
    this.restLayer.pixelDensity(1);
    this.restLayer.colorMode(HSB, 255);
    this.layer = createGraphics(w, h);
    this.layer.pixelDensity(1);
    this.layer.colorMode(HSB, 255);
    this.composite = createGraphics(w, h);
    this.composite.pixelDensity(1);
    this.composite.colorMode(HSB, 255);
    this.mosaicSource = this.composite;
    this.willowStrands = [];
    this.horizonY = h * 0.82;
    this.vibrance = 0;
    this.targetVibrance = 0;
    this.segmentCount = 7;
    this.segmentDisplacement = Array(this.segmentCount).fill(0);
    this.segmentVelocity = Array(this.segmentCount).fill(0);
    this.motionEnergy = 0;
    this.layerIsRest = false;
    this.lastCompositeMotionKey = "";
    this.lastCompositeVibranceBucket = -1;
    this.compositeVersion = 0;
    this.build();
  }

  build() {
    this.scene.clear();
    this.restLayer.clear();
    this.layer.clear();
    this.composite.clear();
    const willowSeed = floor(random(1e9));

    drawReferenceSky(this.scene, this.w, this.h, this.horizonY);
    drawReferenceGround(this.scene, this.w, this.h, this.horizonY);

    randomSeed(willowSeed);
    this.willowStrands = buildBackgroundWillowStrands(this.w, this.h, this.horizonY);
    drawBackgroundWillowField(this.restLayer, this.willowStrands, 0, 1, null, 0);
    this.layer.image(this.restLayer, 0, 0);
    this.layerIsRest = true;
    this.refreshMosaicSource();
  }

  refreshMosaicSource() {
    this.refreshComposite(true);
  }

  flashToColor() {
    this.targetVibrance = 1;
  }

  pluck(note) {
    const center = constrain(int(note), 0, this.segmentCount - 1);
    let direction = center < (this.segmentCount - 1) * 0.5 ? -1 : 1;
    if (center === floor((this.segmentCount - 1) * 0.5)) {
      direction = random([-1, 1]);
    }

    for (let i = 0; i < this.segmentCount; i++) {
      const distToCenter = abs(i - center);
      const impulse =
        distToCenter === 0 ? random(7.2, 9.2) :
        distToCenter === 1 ? random(2.9, 4.2) :
        distToCenter === 2 ? random(0.9, 1.6) :
        distToCenter === 3 ? random(0.2, 0.45) : 0;

      if (impulse > 0) {
        this.segmentVelocity[i] += direction * impulse;
      }
    }

    this.motionEnergy = min(1, this.motionEnergy + 0.78);
  }

  stepClothMotion() {
    const nextDisplacement = this.segmentDisplacement.slice();
    const nextVelocity = this.segmentVelocity.slice();
    const settle = lerp(0.055, 0.018, this.motionEnergy);
    const drag = lerp(0.88, 0.95, this.motionEnergy);

    for (let i = 0; i < this.segmentCount; i++) {
      const current = this.segmentDisplacement[i];
      const left = this.segmentDisplacement[max(0, i - 1)];
      const right = this.segmentDisplacement[min(this.segmentCount - 1, i + 1)];
      const leftVel = this.segmentVelocity[max(0, i - 1)];
      const rightVel = this.segmentVelocity[min(this.segmentCount - 1, i + 1)];
      const neighborFlow = current * 0.74 + (left + right) * 0.13;
      const carry = this.segmentVelocity[i];
      const sharedVelocity = carry * 0.72 + (leftVel + rightVel) * 0.14;

      nextDisplacement[i] = lerp(current, neighborFlow + sharedVelocity, lerp(0.22, 0.34, this.motionEnergy));
      nextDisplacement[i] = lerp(nextDisplacement[i], 0, settle);
      nextVelocity[i] = sharedVelocity * drag;
    }

    this.segmentDisplacement = nextDisplacement;
    this.segmentVelocity = nextVelocity;
  }

  getMaxDisplacement() {
    let peak = 0;
    for (let i = 0; i < this.segmentDisplacement.length; i++) {
      peak = max(peak, abs(this.segmentDisplacement[i]));
    }
    return peak;
  }

  refreshLayer() {
    const isAtRest = this.motionEnergy < 0.0008 && this.getMaxDisplacement() < 0.04;
    if (isAtRest) {
      if (!this.layerIsRest) {
        this.layer.clear();
        this.layer.image(this.restLayer, 0, 0);
        this.layerIsRest = true;
        return true;
      }
      return false;
    }

    this.layer.clear();
    drawBackgroundWillowField(
      this.layer,
      this.willowStrands,
      frameCount,
      1,
      this.segmentDisplacement,
      this.motionEnergy
    );
    this.layerIsRest = false;
    return true;
  }

  refreshComposite(force = false) {
    const vibranceBucket = round(this.vibrance * 100);
    const motionKey = this.layerIsRest
      ? "rest"
      : this.segmentDisplacement.map(v => round(v * 10) / 10).join("|");

    if (!force && vibranceBucket === this.lastCompositeVibranceBucket && motionKey === this.lastCompositeMotionKey) {
      return false;
    }

    this.composite.clear();
    const ctx = this.composite.drawingContext;
    const gray = (1 - this.vibrance) * 92;
    const sat = 22 + this.vibrance * 78;
    const bright = 72 + this.vibrance * 28;

    ctx.save();
    ctx.filter = `grayscale(${gray}%) saturate(${sat}%) brightness(${bright}%)`;
    this.composite.image(this.scene, 0, 0);
    this.composite.image(this.layer, 0, 0);
    ctx.restore();

    if (this.vibrance < 0.999) {
      this.composite.noStroke();
      this.composite.fill(180, 8, 114, (1 - this.vibrance) * 40);
      this.composite.rect(0, 0, this.w, this.h);
    }

    this.lastCompositeVibranceBucket = vibranceBucket;
    this.lastCompositeMotionKey = motionKey;
    this.compositeVersion++;
    return true;
  }

  display() {
    let hasTreeVisual =
      !!tree &&
      (
        tree.branches.some(branch => branch.progress > 0.02) ||
        tree.blossoms.some(blossom => blossom.progress > 0.02) ||
        tree.birds.some(bird => bird.isVisible())
      );

    this.targetVibrance = hasTreeVisual ? 1 : 0;
    this.vibrance = lerp(this.vibrance, this.targetVibrance, 0.018);
    if (abs(this.vibrance - this.targetVibrance) < 0.002) {
      this.vibrance = this.targetVibrance;
    }

    this.motionEnergy = lerp(this.motionEnergy, 0, 0.014);
    if (this.motionEnergy < 0.0008) {
      this.motionEnergy = 0;
    }

    this.stepClothMotion();

    const layerChanged = this.refreshLayer();
    this.refreshComposite(layerChanged);
    image(this.composite, 0, 0);
    return this.vibrance;
  }
}

function drawReferenceSky(g, w, h, horizonY) {
  g.noStroke();

  for (let y = 0; y < h; y += 3) {
    const p = y / max(1, horizonY);
    const hue = lerp(170, 182, constrain(p, 0, 1));
    const sat = lerp(176, 136, constrain(p, 0, 1));
    const bri = lerp(64, 168, constrain(p, 0, 1));
    g.fill(hue, sat, bri);
    g.rect(0, y, w, 3);
  }
}

function buildBackgroundWillowStrands(w, h, horizonY) {
  const strands = [];
  const count = int(w / 34) + 6;
  const left = -w * 0.04;
  const right = w * 1.04;
  const segmentCount = 7;

  for (let i = 0; i < count; i++) {
    const t = count <= 1 ? 0 : i / (count - 1);
    const x = lerp(left, right, t);
    const phase = lerp(-0.72, 0.72, t);
    const segment = constrain(floor(t * segmentCount), 0, segmentCount - 1);

    strands.push({
      x,
      y: -h * 0.08,
      length: horizonY + h * 0.015,
      amp: 9.5 + sin(t * PI) * 1.8,
      phase,
      speed: 0.0056,
      width: 9.5 + sin(t * PI * 1.15) * 1.2,
      hue: 178 + random(-1.5, 1.5),
      sat: 132 + random(-6, 8),
      bri: 116 + random(-6, 10),
      alpha: 56 + random(-4, 6),
      segment,
      response: random(0.88, 1.16),
      lag: random(0.84, 1.12),
      topResponse: random(0.06, 0.12),
      midResponse: random(0.36, 0.52),
      lowResponse: random(0.9, 1.18),
      driftPhase: random(TWO_PI)
    });
  }

  return strands;
}

function drawBackgroundWillowField(g, strands, time, alphaScale, segmentDisplacement = null, motionEnergy = 1) {
  g.noFill();
  g.strokeCap(PROJECT);
  g.strokeJoin(ROUND);

  for (let strand of strands) {
    const sway = sin(time * strand.speed + strand.phase) * strand.amp * motionEnergy;
    let clothPull = 0;
    let left = 0;
    let right = 0;
    if (segmentDisplacement) {
      const current = segmentDisplacement[strand.segment] || 0;
      left = segmentDisplacement[max(0, strand.segment - 1)] || 0;
      right = segmentDisplacement[min(segmentDisplacement.length - 1, strand.segment + 1)] || 0;
      clothPull = (current * 0.78 + (left + right) * 0.11) * strand.response * motionEnergy;
    }

    const driftWave = sin(time * 0.012 + strand.driftPhase) * clothPull * 0.04 * motionEnergy;
    const upperSway = sway * 0.34 + (clothPull * strand.topResponse + left * 0.015 + right * 0.015) * strand.lag;
    const midSway = sway * 0.7 + (clothPull * strand.midResponse + left * 0.08 + right * 0.08 + driftWave) * strand.lag;
    const lowerSway = sway * 0.92 + (clothPull * strand.lowResponse + left * 0.18 + right * 0.18 + driftWave) * strand.lag;
    const startX = strand.x + upperSway;
    const endX = strand.x + lowerSway;
    const endY = strand.y + strand.length;
    const samples = 22;

    for (let i = 0; i < samples; i++) {
      const t1 = i / samples;
      const t2 = (i + 1) / samples;
      const x1 = bezierPoint(startX, strand.x + upperSway, strand.x + midSway, endX, t1);
      const y1 = bezierPoint(strand.y, strand.y + strand.length * 0.24, strand.y + strand.length * 0.72, endY, t1);
      const x2 = bezierPoint(startX, strand.x + upperSway, strand.x + midSway, endX, t2);
      const y2 = bezierPoint(strand.y, strand.y + strand.length * 0.24, strand.y + strand.length * 0.72, endY, t2);
      const segmentP = (t1 + t2) * 0.5;

      g.stroke(
        strand.hue,
        strand.sat,
        lerp(strand.bri - 12, strand.bri + 44, segmentP),
        strand.alpha * alphaScale
      );
      g.strokeWeight(strand.width);
      g.line(x1, y1, x2, y2);
    }
  }
}

function drawReferenceCanopyMasses(g, w, h) {
  const backLayer = [
    { x: w * 0.28, y: h * 0.78, w: w * 0.24, h: h * 0.18, fill: [214, 34, 250, 50], dots: [212, 40, 255, 24] },
    { x: w * 0.56, y: h * 0.77, w: w * 0.28, h: h * 0.22, fill: [213, 52, 246, 64], dots: [216, 54, 255, 28] },
    { x: w * 0.79, y: h * 0.79, w: w * 0.2, h: h * 0.18, fill: [214, 38, 248, 46], dots: [218, 40, 255, 22] }
  ];
  const midLayer = [
    { x: w * 0.44, y: h * 0.75, w: w * 0.24, h: h * 0.26, fill: [208, 140, 208, 220], dots: [214, 82, 248, 88] },
    { x: w * 0.72, y: h * 0.76, w: w * 0.2, h: h * 0.22, fill: [207, 132, 214, 214], dots: [219, 78, 252, 80] }
  ];
  const frontLayer = [
    { x: w * 0.57, y: h * 0.71, w: w * 0.36, h: h * 0.56, fill: [196, 198, 194, 255], dots: [214, 92, 250, 108] },
    { x: w * 0.43, y: h * 0.76, w: w * 0.24, h: h * 0.26, fill: [204, 156, 214, 220], dots: [219, 82, 255, 94] },
    { x: w * 0.78, y: h * 0.78, w: w * 0.2, h: h * 0.24, fill: [201, 150, 208, 214], dots: [219, 82, 255, 86] }
  ];

  const ctx = g.drawingContext;
  ctx.save();
  ctx.filter = "blur(14px)";
  for (let mass of backLayer) {
    g.noStroke();
    g.fill(...mass.fill);
    g.ellipse(mass.x, mass.y, mass.w, mass.h);
    g.ellipse(mass.x - mass.w * 0.18, mass.y - mass.h * 0.12, mass.w * 0.68, mass.h * 0.62);
    g.ellipse(mass.x + mass.w * 0.2, mass.y - mass.h * 0.1, mass.w * 0.56, mass.h * 0.56);
  }
  ctx.restore();

  for (let mass of midLayer) {
    g.noStroke();
    g.fill(...mass.fill);
    g.ellipse(mass.x, mass.y, mass.w, mass.h);
    g.ellipse(mass.x - mass.w * 0.18, mass.y - mass.h * 0.12, mass.w * 0.68, mass.h * 0.62);
    g.ellipse(mass.x + mass.w * 0.2, mass.y - mass.h * 0.1, mass.w * 0.56, mass.h * 0.56);
    drawReferenceDotCloud(g, mass, 2);
  }

  for (let mass of frontLayer) {
    g.noStroke();
    g.fill(...mass.fill);
    g.ellipse(mass.x, mass.y, mass.w, mass.h);
    g.ellipse(mass.x - mass.w * 0.18, mass.y - mass.h * 0.12, mass.w * 0.68, mass.h * 0.62);
    g.ellipse(mass.x + mass.w * 0.2, mass.y - mass.h * 0.1, mass.w * 0.56, mass.h * 0.56);
    drawReferenceDotCloud(g, mass, 2);
    drawReferenceBloomMarks(g, mass);
  }
}

function drawReferenceDotCloud(g, mass, dotSize) {
  g.noStroke();
  g.fill(...mass.dots);

  const rows = int(mass.h / 10);
  for (let row = 0; row < rows; row++) {
    const py = mass.y - mass.h * 0.46 + (row / max(1, rows - 1)) * mass.h * 0.9;
    const normalized = (py - (mass.y - mass.h * 0.46)) / (mass.h * 0.9);
    const arcWidth = sin(normalized * PI) * mass.w * 0.46;
    const cols = max(3, int(arcWidth / 8));

    for (let col = 0; col < cols; col++) {
      const px = mass.x - arcWidth + (col / max(1, cols - 1)) * arcWidth * 2;
      g.rect(px, py, dotSize, dotSize);
    }
  }
}

function drawReferenceBloomMarks(g, mass) {
  g.textFont("monospace");
  g.textAlign(CENTER, CENTER);
  g.noStroke();

  const marks = int(mass.w / 70);
  for (let i = 0; i < marks; i++) {
    const x = mass.x + random(-mass.w * 0.34, mass.w * 0.34);
    const y = mass.y + random(-mass.h * 0.22, mass.h * 0.08);
    const glyph = random() < 0.55 ? "*" : "+";
    const size = random(8, 14);
    g.fill(218 + random(-6, 6), 86 + random(-20, 8), 255, random(70, 130));
    g.textSize(size);
    g.text(glyph, x, y);
  }
}

function drawReferenceTreeFamilies(g, w, h, horizonY) {
  const paleTrees = [
    { x: w * 0.05, baseY: horizonY, height: h * 0.44, weight: 1.4, color: [210, 24, 255, 94] },
    { x: w * 0.16, baseY: horizonY, height: h * 0.38, weight: 1.45, color: [212, 28, 255, 120] },
    { x: w * 0.29, baseY: horizonY, height: h * 0.34, weight: 1.5, color: [214, 34, 255, 144] },
    { x: w * 0.46, baseY: horizonY, height: h * 0.32, weight: 1.6, color: [214, 40, 255, 156] },
    { x: w * 0.62, baseY: horizonY, height: h * 0.36, weight: 1.5, color: [214, 36, 255, 150] },
    { x: w * 0.78, baseY: horizonY, height: h * 0.33, weight: 1.42, color: [212, 26, 255, 122] },
    { x: w * 0.91, baseY: horizonY, height: h * 0.4, weight: 1.38, color: [206, 18, 248, 96] }
  ];

  const darkTrees = [
    { x: w * 0.18, baseY: horizonY, height: h * 0.56, weight: 3.4, color: [188, 18, 42, 236] },
    { x: w * 0.5, baseY: horizonY, height: h * 0.62, weight: 3.8, color: [188, 20, 36, 244] },
    { x: w * 0.84, baseY: horizonY, height: h * 0.55, weight: 3.5, color: [188, 18, 40, 238] }
  ];

  for (let tree of paleTrees) {
    drawReferenceTree(g, tree, 4, 0.15, 0.06);
  }

  for (let tree of darkTrees) {
    drawReferenceTree(g, tree, 4, 0.14, 0.045);
  }
}

function drawReferenceTree(g, tree, levels, reachScale, bendScale) {
  g.noFill();
  g.strokeCap(ROUND);
  g.strokeJoin(ROUND);
  g.stroke(...tree.color);

  const root = createVector(tree.x, tree.baseY);
  const top = createVector(tree.x + random(-tree.weight * 0.15, tree.weight * 0.15), tree.baseY - tree.height);

  g.strokeWeight(tree.weight);
  g.bezier(
    root.x,
    root.y,
    tree.x - tree.weight * bendScale,
    tree.baseY - tree.height * 0.3,
    tree.x + tree.weight * bendScale,
    tree.baseY - tree.height * 0.72,
    top.x,
    top.y
  );

  const anchors = [0.62, 0.72, 0.8, 0.88];
  for (let i = 0; i < anchors.length; i++) {
    const t = anchors[i];
    const start = bezierPointVec(
      root,
      createVector(tree.x - tree.weight * bendScale, tree.baseY - tree.height * 0.3),
      createVector(tree.x + tree.weight * bendScale, tree.baseY - tree.height * 0.72),
      top,
      t
    );
    const angle = bezierTangentAngle(
      root,
      createVector(tree.x - tree.weight * bendScale, tree.baseY - tree.height * 0.3),
      createVector(tree.x + tree.weight * bendScale, tree.baseY - tree.height * 0.72),
      top,
      t
    );

    drawReferenceBranchFan(
      g,
      start,
      angle,
      tree.height * reachScale * map(i, 0, anchors.length - 1, 1.16, 0.5),
      tree.weight * map(i, 0, anchors.length - 1, 0.42, 0.16),
      max(1, levels - (i > 1 ? 1 : 0)),
      tree.color
    );
  }
}

function drawReferenceBranchFan(g, start, angle, len, weight, levels, colorSpec) {
  if (levels <= 0 || len < 18) return;

  const spreads = levels >= 3 ? [-0.5, -0.2, 0.2, 0.5] : [-0.34, 0.34];
  for (let spread of spreads) {
    const endAngle = angle + spread * 0.42;
    const end = createVector(
      start.x + cos(endAngle) * len,
      start.y + sin(endAngle) * len
    );

    g.stroke(...colorSpec);
    g.strokeWeight(max(0.5, weight));
    g.bezier(
      start.x,
      start.y,
      start.x + cos(angle + spread * 0.1) * len * 0.18,
      start.y + sin(angle + spread * 0.1) * len * 0.18,
      end.x - cos(endAngle - spread * 0.05) * len * 0.24,
      end.y - sin(endAngle - spread * 0.05) * len * 0.24,
      end.x,
      end.y
    );

    drawReferenceBranchFan(
      g,
      end,
      endAngle - spread * 0.08,
      len * 0.62,
      weight * 0.68,
      levels - 1,
      colorSpec
    );
  }
}

function drawReferenceGround(g, w, h) {
  const horizonY = h * 0.82;

  g.noStroke();
  g.fill(0, 0, 0);
  g.rect(0, horizonY, w, h - horizonY);
}

class MosaicField {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.tiles = [];
    this.nextSpawnFrame = 0;
    this.gridSize = MOSAIC_GRID_SIZE;
    this.gridStartX = floor((this.w - floor((this.w - 56) / this.gridSize) * this.gridSize) * 0.5);
    this.gridStartY = floor(this.h * 0.22);
    this.gridCols = max(1, floor((this.w - this.gridStartX * 2) / this.gridSize));
    this.gridRows = max(1, floor((this.h * 0.72 - this.gridStartY) / this.gridSize));
  }

  update(source, sourceVersion = 0) {
    if (frameCount >= this.nextSpawnFrame) {
      if (this.tiles.length < 4 && random() < 0.72) {
        this.spawnRect(source, sourceVersion);
      }
      this.nextSpawnFrame = frameCount + int(random(18, 34));
    }

    for (let i = this.tiles.length - 1; i >= 0; i--) {
      this.tiles[i].update(source, sourceVersion);
      if (this.tiles[i].dead()) {
        this.tiles.splice(i, 1);
      }
    }
  }

  spawnRect(source, sourceVersion = 0) {
    for (let attempt = 0; attempt < 24; attempt++) {
      const col = floor(random(this.gridCols));
      const row = floor(random(this.gridRows));
      const x = this.gridStartX + col * this.gridSize;
      const y = this.gridStartY + row * this.gridSize;
      const rect = { x, y, w: this.gridSize, h: this.gridSize };

      if (!this.canPlace(rect)) {
        continue;
      }
      this.tiles.push(new MosaicTile(rect.x, rect.y, rect.w, rect.h, this.w, this.h, source, sourceVersion));
      return;
    }
  }

  canPlace(rect) {
    for (let tile of this.tiles) {
      if (rectsOverlap(rect, tile, 2)) {
        return false;
      }
    }
    return true;
  }

  display(vibrance = 1) {
    for (let tile of this.tiles) {
      tile.display(vibrance);
    }
  }
}

class MosaicTile {
  constructor(x, y, tileW, tileH, sceneW, sceneH, source, sourceVersion = 0) {
    this.x = x;
    this.y = y;
    this.w = tileW;
    this.h = tileH;
    this.sceneW = sceneW;
    this.sceneH = sceneH;
    this.age = 0;
    this.lifeMax = int(random(108, 176));
    this.refreshEvery = int(random(3, 6));
    this.pixelW = max(2, floor(tileW / random(14, 19)));
    this.pixelH = max(2, floor(tileH / random(14, 19)));
    this.softW = max(6, floor(tileW / 7));
    this.softH = max(6, floor(tileH / 7));
    this.buffer = createGraphics(this.pixelW, this.pixelH);
    this.buffer.pixelDensity(1);
    this.buffer.noSmooth();
    this.detailBuffer = createGraphics(this.softW, this.softH);
    this.detailBuffer.pixelDensity(1);
    this.lastSourceVersion = -1;
    this.capture(source, sourceVersion);
  }

  capture(source, sourceVersion = 0) {
    const sx = constrain(this.x, 0, this.sceneW - this.w);
    const sy = constrain(this.y, 0, this.sceneH - this.h);

    this.buffer.clear();
    this.buffer.image(source, 0, 0, this.pixelW, this.pixelH, sx, sy, this.w, this.h);
    this.detailBuffer.clear();
    this.detailBuffer.image(source, 0, 0, this.softW, this.softH, sx, sy, this.w, this.h);
    this.lastSourceVersion = sourceVersion;
  }

  update(source, sourceVersion = 0) {
    this.age++;

    if (this.age === 1 || (this.age % this.refreshEvery === 0 && sourceVersion !== this.lastSourceVersion)) {
      this.capture(source, sourceVersion);
    }
  }

  display(vibrance = 1) {
    const visible = this.visibility();
    if (visible <= 0) return;

    push();

    const ctx = drawingContext;
    ctx.save();
    ctx.globalAlpha = visible * 0.48;
    ctx.imageSmoothingEnabled = true;
    image(this.detailBuffer, this.x, this.y, this.w, this.h);
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = visible * 0.9;
    ctx.imageSmoothingEnabled = false;
    image(this.buffer, this.x, this.y, this.w, this.h);
    ctx.restore();

    pop();
  }

  visibility() {
    const fadeIn = constrain(this.age / 16, 0, 1);
    const fadeOut = constrain((this.lifeMax - this.age) / 28, 0, 1);
    return min(fadeIn, fadeOut);
  }

  dead() {
    return this.age >= this.lifeMax;
  }
}

function rectsOverlap(a, b, padding) {
  return !(
    a.x + (a.w || a.size) + padding <= b.x ||
    b.x + (b.w || b.size) + padding <= a.x ||
    a.y + (a.h || a.size) + padding <= b.y ||
    b.y + (b.h || b.size) + padding <= a.y
  );
}

class TreeSystem {
  constructor(rootX, rootY) {
    this.root = createVector(rootX, rootY);

    this.nodes = [];
    this.branches = [];
    this.fronds = [];
    this.blossoms = [];
    this.birds = [];
    this.returnRoots = [];
    this.groundPetals = [];
    this.isRetreating = false;
    this.triggersSinceBlossom = 0;
    this.birdsInvited = false;
    this.rootParticles = [];

    this.nextNodeId = 0;

    const rootNode = this.makeNode(rootX, rootY, -HALF_PI, 18.5, 0, "trunk");
    this.nodes.push(rootNode);
  }

  makeNode(x, y, angle, thickness, depth, kind = "terminal") {
    return {
      id: this.nextNodeId++,
      pos: createVector(x, y),
      angle: angle,
      thickness: thickness,
      depth: depth,
      kind,
      branchCount: 0,
      childAngles: [],
      hasBlossom: false
    };
  }

  trigger(note) {
    this.isRetreating = false;
    lastInteraction = millis();
    const shouldForceBlossom = this.triggersSinceBlossom >= 4;

    let baseNode = this.chooseNode();
    if (!baseNode) return;

    let branchRoll = random();
    let branchNum =
      branchRoll < 0.14 ? 4 :
      branchRoll < 0.52 ? 3 :
      branchRoll < 0.88 ? 2 : 1;

    if (baseNode.depth === 0 && this.branches.length === 0) {
      branchNum = 1;
      this.emitRootParticles();
    }

    let made = 0;
    let blossomed = false;
    let latestResult = null;

    for (let i = 0; i < branchNum; i++) {
      let result = this.makeBranch(baseNode, note, i, branchNum);
      if (!result) continue;

      this.branches.push(result.branch);
      this.nodes.push(result.newNode);
      if (result.interiorNode) {
        this.nodes.push(result.interiorNode);
      }
      made++;
      latestResult = result;
      baseNode.childAngles.push(result.endAngle);

      labels.push(new NodeLabel(result.branch, note));
      if (this.tryGrowBlossom(result.branch, result.newNode, false)) {
        blossomed = true;
      }
    }

    if (!blossomed && shouldForceBlossom && latestResult) {
      blossomed = this.tryGrowBlossom(latestResult.branch, latestResult.newNode, true);
    }

    this.triggersSinceBlossom = blossomed ? 0 : this.triggersSinceBlossom + 1;
    baseNode.branchCount += made;
  }

  chooseNode() {
    let candidates = this.nodes.filter(n =>
      n.thickness > 0.95 &&
      n.depth <= 12 &&
      n.branchCount < (n.kind === "interior" ? 2 : 5)
    );

    if (candidates.length === 0) return random(this.nodes);

    let weighted = [];

    for (let n of candidates) {
      let score = 1;

      if (n.depth === 0) score *= 0.08;
      else if (n.depth <= 2) score *= 0.62;
      else if (n.depth <= 5) score *= 1.02;
      else if (n.depth <= 8) score *= 1.36;
      else score *= 1.18;

      score *= map(n.branchCount, 0, 5, 1.34, 0.18, true);
      score *= map(n.thickness, 18.5, 1, 0.88, 1.08, true);
      score *= map(n.pos.y, this.root.y, height * 0.16, 0.58, 1.38, true);
      score *= map(abs(n.pos.x - width * 0.5), 0, width * 0.5, 1.08, 0.84, true);
      if (n.kind === "interior") score *= 0.96;

      let copies = max(1, floor(score * 12));
      for (let i = 0; i < copies; i++) weighted.push(n);
    }

    return random(weighted);
  }

  makeBranch(baseNode, note, idxInBurst, burstCount) {
    let start = baseNode.pos.copy();
    let baseAngle = baseNode.angle;

    let depth = baseNode.depth + 1;
    let startThickness = baseNode.thickness;
    let endThickness = max(0.96, startThickness * random(0.72, 0.86));
    let lenBase =
      map(startThickness, 18.5, 1.8, 192, 60, true) +
      map(note, 0, 6, -8, 14) +
      map(depth, 1, 12, 82, -20, true);
    let edgeClearance = min(start.x, width - start.x);
    let edgeFactor = map(edgeClearance, 0, width * 0.5, 0.4, 0.88, true);
    let heightFactor = map(start.y, height * 0.16, this.root.y, 0.76, 1.04, true);
    let lengthRoll = random();
    let lengthScale =
      lengthRoll < 0.18 ? random(0.18, 0.34) :
      lengthRoll < 0.46 ? random(0.48, 0.72) :
      lengthRoll < 0.8 ? random(0.82, 1.04) :
      random(1.16, 1.34);
    let burstBias = burstCount <= 1
      ? 1
      : map(
          abs(idxInBurst - (burstCount - 1) * 0.5),
          0,
          max(1, (burstCount - 1) * 0.5),
          1.06,
          0.8,
          true
        );
    let len = lenBase * edgeFactor * heightFactor * lengthScale * burstBias;

    let best = null;
    let bestScore = Infinity;
    let bestEndAngle = baseAngle;

    for (let attempt = 0; attempt < 40; attempt++) {
      let outwardDir = 0;
      if (abs(start.x - width * 0.5) < width * 0.08) {
        outwardDir = burstCount === 1 ? random([-1, 1]) : (idxInBurst < burstCount / 2 ? -1 : 1);
      } else {
        outwardDir = start.x < width * 0.5 ? -1 : 1;
      }

      let spread = 0;
      if (burstCount > 1) {
        spread = map(idxInBurst, 0, burstCount - 1, -0.36, 0.36);
      }

      let outwardSweep = map(depth, 1, 12, 0.94, 0.34, true);
      let desiredAngle =
        -HALF_PI +
        outwardDir * random(0.18, outwardSweep) +
        spread +
        map(note, 0, 6, -0.08, 0.08);
      let angleDelta = atan2(sin(desiredAngle - baseAngle), cos(desiredAngle - baseAngle));
      let endAngle = baseAngle + angleDelta * map(depth, 1, 12, 0.62, 0.84, true) + random(-0.08, 0.08);

      let end = createVector(
        start.x + cos(endAngle) * len,
        start.y + sin(endAngle) * len
      );

      let minRisePx = map(depth, 1, 12, 34, 10, true);
      if (end.y > start.y - minRisePx) {
        continue;
      }

      let topCeiling = height * 0.12;
      let margin = 34;
      end.x = constrain(end.x, margin, width - margin);
      end.y = constrain(end.y, topCeiling, height - 26);

      let c1T = random(0.22, 0.32);
      let c2T = random(0.66, 0.78);
      let baseC1 = p5.Vector.lerp(start, end, c1T);
      let baseC2 = p5.Vector.lerp(start, end, c2T);
      let bowSign = end.x >= start.x ? 1 : -1;
      let archDepth = len * map(depth, 1, 12, 0.14, 0.06, true);
      let sideSlide = len * map(depth, 1, 12, 0.06, 0.02, true);

      let c1 = createVector(
        baseC1.x + bowSign * sideSlide * 0.48,
        baseC1.y + archDepth * random(0.72, 1.02)
      );

      let c2 = createVector(
        baseC2.x - bowSign * sideSlide * 0.28,
        baseC2.y + archDepth * random(0.56, 0.88)
      );
      c1.y = min(c1.y, start.y + len * 0.04);
      c2.y = min(c2.y, start.y + len * 0.02);

      let candidate = {
        start: start.copy(),
        baseNode,
        c1,
        c2,
        end: end.copy(),
        startThickness,
        endThickness,
        progress: 0,
        duration: random(18, 30),
        frameAge: 0,
        depth,
        note,
        hasBlossom: false
      };

      let score = this.branchOverlapScore(candidate);

      let riseRatio = (start.y - end.y) / max(1, len);
      let targetRise = map(depth, 1, 12, 0.28, 0.12, true);
      if (riseRatio < targetRise) {
        score += (targetRise - riseRatio) * 190;
      }

      let upwardDelta = abs(atan2(sin(endAngle + HALF_PI), cos(endAngle + HALF_PI)));
      score += upwardDelta * map(depth, 1, 12, 10, 4, true);

      let outwardMove = abs(end.x - width * 0.5) - abs(start.x - width * 0.5);
      if (outwardMove > 0) {
        score -= outwardMove * map(depth, 1, 12, 0.42, 0.9, true);
      }

      for (let existingAngle of baseNode.childAngles) {
        let angleGap = abs(atan2(sin(endAngle - existingAngle), cos(endAngle - existingAngle)));
        if (angleGap < 0.94) {
          score += (0.94 - angleGap) * 380;
        }
      }

      for (let n of this.nodes) {
        if (n.id === baseNode.id) continue;
        let d = dist(end.x, end.y, n.pos.x, n.pos.y);
        let avoidRadius = map(depth, 1, 12, 86, 132, true);
        if (d < avoidRadius) {
          score += (avoidRadius - d) * map(depth, 1, 12, 1.4, 0.88, true);
        }
      }

      if (end.x <= margin + 12 || end.x >= width - margin - 12) {
        score += 180;
      }

      if (end.y <= topCeiling + 6) {
        score += 120;
      }

      if (score < bestScore) {
        bestScore = score;
        best = candidate;
        bestEndAngle = endAngle;
      }
    }

    if (!best) return null;

    let tangent = bezierTangentAngle(best.start, best.c1, best.c2, best.end, 1);

    let newNode = this.makeNode(
      best.end.x,
      best.end.y,
      tangent,
      endThickness,
      depth
    );

    let interiorNode = this.maybeCreateInteriorNode(best, baseNode);

    return { branch: best, newNode, interiorNode, endAngle: bestEndAngle };
  }

  maybeCreateInteriorNode(branch, baseNode) {
    if (baseNode.kind === "interior") return null;
    if (baseNode.depth < 1 || baseNode.depth > 8) return null;
    if (branch.startThickness < 1.5) return null;
    if (dist(branch.start.x, branch.start.y, branch.end.x, branch.end.y) < 92) return null;
    if (random() > map(baseNode.depth, 1, 8, 0.18, 0.34, true)) return null;

    let t = random(0.34, 0.74);
    let pos = bezierPointVec(branch.start, branch.c1, branch.c2, branch.end, t);
    let tangent = bezierTangentAngle(branch.start, branch.c1, branch.c2, branch.end, t);
    let angle = atan2(
      sin(tangent) * 0.92 + sin(-HALF_PI) * 0.08,
      cos(tangent) * 0.92 + cos(-HALF_PI) * 0.08
    );
    let thickness = lerp(branch.startThickness, branch.endThickness, t) * random(0.74, 0.88);
    let depth = baseNode.depth + 0.8;

    for (let node of this.nodes) {
      if (dist(pos.x, pos.y, node.pos.x, node.pos.y) < 54) {
        return null;
      }
    }

    return this.makeNode(pos.x, pos.y, angle, thickness, depth, "interior");
  }

  branchOverlapScore(candidate) {
    let candidatePts = sampleBezier(candidate, 18);
    let score = 0;

    for (let b of this.branches) {
      let pts = sampleBezier(b, 18);

      for (let cp of candidatePts) {
        for (let p of pts) {
          let d = dist(cp.x, cp.y, p.x, p.y);

          let nearRoot =
            dist(cp.x, cp.y, candidate.start.x, candidate.start.y) < 24 ||
            dist(p.x, p.y, b.start.x, b.start.y) < 24;

          if (!nearRoot && d < 24) {
            score += (24 - d) * 1.8;
          }
        }
      }
    }

    return score;
  }

  shouldInviteBirds() {
    if (this.isRetreating || this.birdsInvited) return false;
    if (this.branches.length < 8) return false;
    if (this.blossoms.length < 4) return false;

    let readyBranches = this.branches.filter(branch =>
      branch.progress > 0.98 &&
      branch.depth >= 3 &&
      branch.end.y < height * 0.68 &&
      dist(branch.start.x, branch.start.y, branch.end.x, branch.end.y) > 72
    );

    return readyBranches.length >= 2;
  }

  inviteBirds() {
    let candidates = [];

    for (let branch of this.branches) {
      if (branch.progress < 0.98 || branch.depth < 3) continue;
      if (branch.end.y > height * 0.7) continue;

      let t = random(0.58, 0.88);
      let point = bezierPointVec(branch.start, branch.c1, branch.c2, branch.end, t);
      let tangent = bezierTangentAngle(branch.start, branch.c1, branch.c2, branch.end, t);
      let normalA = createVector(cos(tangent + HALF_PI), sin(tangent + HALF_PI));
      let normalB = createVector(cos(tangent - HALF_PI), sin(tangent - HALF_PI));
      let normal = normalA.y < normalB.y ? normalA : normalB;
      let perch = createVector(
        point.x + normal.x * random(4, 10),
        point.y + normal.y * random(4, 10)
      );

      candidates.push({
        branch,
        perch,
        tangent
      });
    }

    candidates.sort((a, b) => a.perch.y - b.perch.y || a.perch.x - b.perch.x);

    let chosen = [];
    for (let candidate of candidates) {
      let tooClose = chosen.some(existing =>
        dist(candidate.perch.x, candidate.perch.y, existing.perch.x, existing.perch.y) < 96
      );
      if (tooClose) continue;
      chosen.push(candidate);
      if (chosen.length >= 3) break;
    }

    if (chosen.length === 0) return;

    for (let i = 0; i < chosen.length; i++) {
      let candidate = chosen[i];
      let arrivalSide =
        i === 0
          ? random([-1, 1])
          : (this.birds[i - 1]?.arrivalSide || random([-1, 1])) * -1;
      let size = random(20, 30);
      let delayFrames = i * int(random(10, 22));
      this.birds.push(
        new MigratoryBird(candidate.perch.x, candidate.perch.y, candidate.tangent, size, arrivalSide, delayFrames)
      );
    }

    this.birdsInvited = true;
  }

  tryGrowBlossom(branch, node, force) {
    if (branch.hasBlossom) return false;
    if (!force && node.depth < 1) return false;
    if (!force && node.thickness > 9.6) return false;

    let chance = map(node.thickness, 9.6, 1.1, 0.92, 1, true);
    if (!force && random() > chance) return false;

    let placements = this.findBlossomPlacements(branch, node);
    if (placements.length === 0) return false;

    for (let p of placements) {
      this.blossoms.push(new BlossomCluster(p.x, p.y, node.thickness, p.t, branch, p.appearAt));
      this.fronds.push(
        new WillowFrondCluster(
          p.x + random(-4, 4),
          p.y + random(8, 18),
          node.thickness,
          p.t,
          branch,
          p.appearAt
        )
      );
      this.tryScatterGroundPetals(p, branch);

      let starCount = int(random(2, 5));
      for (let i = 0; i < starCount; i++) {
        driftingStars.push(
          new DriftingStar(
            p.x + random(-10, 10),
            p.y + random(-10, 10),
            random(6, 9)
          )
        );
      }
    }

    branch.hasBlossom = true;
    return true;
  }

  findBlossomPlacements(branch, node) {
    let placements = [];
    let countRoll = random();
    let count =
      countRoll < 0.14 ? 7 :
      countRoll < 0.34 ? 6 :
      countRoll < 0.68 ? 5 :
      countRoll < 0.9 ? 4 : 3;
    let zones =
      count === 3
        ? [[0.16, 0.28], [0.42, 0.58], [0.7, 0.84]]
        : count === 4
          ? [[0.14, 0.24], [0.3, 0.42], [0.5, 0.64], [0.72, 0.86]]
          : count === 5
            ? [[0.12, 0.2], [0.24, 0.34], [0.42, 0.54], [0.6, 0.72], [0.78, 0.9]]
            : count === 6
              ? [[0.1, 0.18], [0.2, 0.3], [0.34, 0.46], [0.5, 0.62], [0.66, 0.78], [0.8, 0.92]]
              : [[0.08, 0.16], [0.18, 0.28], [0.3, 0.4], [0.44, 0.56], [0.6, 0.72], [0.74, 0.84], [0.86, 0.94]];

    for (let i = 0; i < zones.length; i++) {
      let zone = zones[i];
      let placed = false;

      for (let attempt = 0; attempt < 12; attempt++) {
        let t = random(zone[0], zone[1]);
        let point = bezierPointVec(branch.start, branch.c1, branch.c2, branch.end, t);
        let tangent = bezierTangentAngle(branch.start, branch.c1, branch.c2, branch.end, t);
        let normal = tangent + (attempt % 2 === 0 ? HALF_PI : -HALF_PI);
        let offset = map(node.thickness, 1.1, 9.6, 1.5, 4.5, true);
        let radius = this.estimateBlossomRadius(node.thickness, t);
        let candidate = {
          x: point.x + cos(normal) * offset,
          y: point.y + sin(normal) * offset,
          t,
          radius,
          appearAt: constrain(t + random(-0.01, 0.05), 0.1, 0.9)
        };

        if (this.blossomPlacementCollides(candidate, placements)) {
          continue;
        }

        placements.push(candidate);
        placed = true;
        break;
      }

      if (!placed) {
        continue;
      }
    }

    return placements;
  }

  tryScatterGroundPetals(placement, branch) {
    this.groundPetals.push(
      new GroundPetalScatter(
        placement.x + random(-4, 4),
        placement.y + random(-2, 4),
        branch,
        placement.appearAt
      )
    );
  }

  estimateBlossomRadius(thickness, branchT) {
    return map(thickness, 1.1, 9.6, 34, 18, true) * map(branchT, 0.1, 1, 1.06, 0.84, true);
  }

  blossomPlacementCollides(candidate, planned) {
    for (let blossom of this.blossoms) {
      let d = dist(candidate.x, candidate.y, blossom.x, blossom.y);
      if (d < candidate.radius + blossom.collisionRadius + 2) {
        return true;
      }
    }

    for (let placed of planned) {
      let d = dist(candidate.x, candidate.y, placed.x, placed.y);
      if (d < candidate.radius + placed.radius + 2) {
        return true;
      }
    }

    return false;
  }

  emitRootParticles() {
    for (let i = 0; i < 42; i++) {
      this.rootParticles.push(new RootSquareParticle(this.root.x, this.root.y - random(6, 18), "burst"));
    }
    for (let i = 0; i < 16; i++) {
      this.rootParticles.push(new RootSquareParticle(this.root.x, this.root.y - random(4, 14), "hover"));
    }
  }

  update() {
    if (this.isRetreating) {
      for (let b of this.branches) {
        if (b.progress > 0) {
          b.progress = max(0, b.progress - 1 / b.duration);
        }
      }

      for (let bl of this.blossoms) {
        bl.retreat();
      }

      for (let frond of this.fronds) {
        frond.retreat();
      }

      for (let root of this.returnRoots) {
        root.retreat();
      }

      for (let petals of this.groundPetals) {
        petals.retreat();
      }

      for (let bird of this.birds) {
        bird.depart();
        bird.update();
      }

      for (let particle of this.rootParticles) {
        particle.retreat();
        particle.update(this.root.x, this.root.y);
      }
      this.rootParticles = this.rootParticles.filter(particle => particle.isVisible());

      return;
    }

    for (let b of this.branches) {
      if (b.progress < 1) {
        b.frameAge++;
        let t = constrain(b.frameAge / b.duration, 0, 1);
        b.progress = easeOutCubic(t);
      }
    }

    for (let bl of this.blossoms) {
      bl.update();
    }

    for (let frond of this.fronds) {
      frond.update();
    }

    for (let root of this.returnRoots) {
      root.update();
    }

    for (let petals of this.groundPetals) {
      petals.update();
    }

    if (this.shouldInviteBirds()) {
      this.inviteBirds();
    }

    for (let bird of this.birds) {
      bird.update();
    }

    for (let particle of this.rootParticles) {
      particle.update(this.root.x, this.root.y);
    }
    this.rootParticles = this.rootParticles.filter(particle => particle.isVisible());
  }

  display() {
    const horizonY = height * 0.82;
    this.displayRootParticles("back");
    let ordered = this.branches.slice().sort((a, b) => b.startThickness - a.startThickness);
    for (let b of ordered) {
      drawReflectedBranchBezier(b, horizonY);
    }
    for (let b of ordered) {
      drawTaperedBranchBezier(b);
    }

    for (let root of this.returnRoots) {
      root.display();
    }

    this.displayRootParticles("front");

    for (let frond of this.fronds) {
      frond.display();
    }

    for (let bl of this.blossoms) {
      bl.display();
    }

    for (let petals of this.groundPetals) {
      petals.display();
    }

    for (let bird of this.birds) {
      bird.display();
    }
  }

  displayRootParticles(layer) {
    for (let particle of this.rootParticles) {
      particle.display(layer);
    }
  }

  startRetreat() {
    if (this.branches.length === 0 && this.blossoms.length === 0) return;
    this.isRetreating = true;
    for (let bird of this.birds) {
      bird.depart();
    }
  }

  shouldReset() {
    if (!this.isRetreating) return false;

    let hasVisibleBranches = this.branches.some(b => b.progress > 0.001);
    let hasVisibleRoots = this.returnRoots.some(root => root.progress > 0.001);
    let hasVisibleFronds = this.fronds.some(frond => frond.progress > 0.001);
    let hasVisibleBlossoms = this.blossoms.some(bl => bl.progress > 0.001);
    let hasVisibleGroundPetals = this.groundPetals.some(p => p.isVisible());
    let hasVisibleBirds = this.birds.some(bird => bird.isVisible());
    let hasVisibleRootParticles = this.rootParticles.some(particle => particle.isVisible());
    return !hasVisibleBranches && !hasVisibleRoots && !hasVisibleFronds && !hasVisibleBlossoms && !hasVisibleGroundPetals && !hasVisibleBirds && !hasVisibleRootParticles;
  }
}

class WillowFrondCluster {
  constructor(x, y, thickness, branchT, branch, appearAt) {
    this.x = x;
    this.y = y;
    this.progress = 0;
    this.branch = branch;
    this.appearAt = appearAt;
    this.phase = random(TWO_PI);
    this.speed = random(0.010, 0.017);
    this.swayAmount = map(thickness, 1.1, 5.5, 22, 14, true);
    this.strands = [];

    const lengthBase = map(thickness, 1.1, 5.5, 162, 108, true);
    const spreadBase = map(thickness, 1.1, 5.5, 58, 34, true);
    const count = int(map(thickness, 1.1, 5.5, 4, 3, true));
    const innerSpread = map(branchT, 0.18, 0.9, 0.82, 1.14, true);
    const spread = spreadBase * innerSpread;

    for (let i = 0; i < count; i++) {
      const slot = count <= 1 ? 0.5 : i / (count - 1);
      const offsetX = lerp(-spread, spread, slot) + random(-1.2, 1.2);
      const lengthScale = lerp(0.8, 1.14, 1 - abs(slot - 0.5) * 1.2);

      this.strands.push({
        offsetX,
        length: lengthBase * lengthScale * random(0.96, 1.08),
        drift: random(-3, 3),
        weight: random(4.2, 6.8),
        alpha: random(96, 154),
        anchorY: random(-3, 5)
      });
    }
  }

  update() {
    if (this.branch && this.branch.progress < this.appearAt) {
      return;
    }
    if (this.progress < 1) {
      this.progress += 0.045;
      if (this.progress > 1) this.progress = 1;
    }
  }

  retreat() {
    if (this.progress > 0) {
      this.progress = max(0, this.progress - 0.06);
    }
  }

  display() {
    if (this.progress <= 0) return;

    push();
    translate(this.x, this.y);
    noFill();
    strokeCap(PROJECT);
    strokeJoin(ROUND);

    for (let i = 0; i < this.strands.length; i++) {
      const strand = this.strands[i];
      const sway = sin(frameCount * this.speed + this.phase + i * 0.35) * this.swayAmount * this.progress;
      const drift = sin(frameCount * this.speed * 0.74 + this.phase * 1.4 + i) * this.swayAmount * 0.32 * this.progress;
      const upperSway = sway * 0.24;
      const midSway = sway * 0.7;
      const endY = strand.length * this.progress;
      const startX = strand.offsetX + upperSway * 0.18;
      const endX = strand.offsetX + strand.drift + sway;
      const samples = 16;

      for (let s = 0; s < samples; s++) {
        const t1 = s / samples;
        const t2 = (s + 1) / samples;
        const x1 = bezierPoint(
          startX,
          strand.offsetX + upperSway,
          strand.offsetX + midSway + drift * 0.5,
          endX,
          t1
        );
        const y1 = bezierPoint(
          strand.anchorY,
          strand.anchorY + strand.length * 0.24 * this.progress,
          strand.anchorY + strand.length * 0.72 * this.progress,
          strand.anchorY + endY,
          t1
        );
        const x2 = bezierPoint(
          startX,
          strand.offsetX + upperSway,
          strand.offsetX + midSway + drift * 0.5,
          endX,
          t2
        );
        const y2 = bezierPoint(
          strand.anchorY,
          strand.anchorY + strand.length * 0.24 * this.progress,
          strand.anchorY + strand.length * 0.72 * this.progress,
          strand.anchorY + endY,
          t2
        );
        const segmentP = (t1 + t2) * 0.5;

        stroke(0, 0, 255, lerp(strand.alpha * 0.72, strand.alpha, segmentP) * this.progress);
        strokeWeight(strand.weight);
        line(x1, y1, x2, y2);
      }
    }

    pop();
  }
}

class GroundReturnRoot {
  constructor(branch, anchorT) {
    this.branch = branch;
    this.anchorT = anchorT;
    this.progress = 0;
    this.phase = random(TWO_PI);
    this.swaySpeed = random(0.006, 0.012);
    this.swayAmount = random(3, 7);

    this.anchor = bezierPointVec(branch.start, branch.c1, branch.c2, branch.end, anchorT);
    this.groundY = height * 0.82;
    this.endX = this.anchor.x + random(-18, 18);
    this.c1 = createVector(
      this.anchor.x + random(-12, 12),
      lerp(this.anchor.y, this.groundY, 0.34)
    );
    this.c2 = createVector(
      this.endX + random(-10, 10),
      lerp(this.anchor.y, this.groundY, 0.78)
    );
  }

  update() {
    if (this.branch && this.branch.progress < this.anchorT + 0.08) {
      return;
    }
    if (this.progress < 1) {
      this.progress += 0.04;
      if (this.progress > 1) this.progress = 1;
    }
  }

  retreat() {
    if (this.progress > 0) {
      this.progress = max(0, this.progress - 0.06);
    }
  }

  display() {
    if (this.progress <= 0) return;

    const sway = sin(frameCount * this.swaySpeed + this.phase) * this.swayAmount * this.progress;
    const samples = 18;
    stroke(0, 0, 0, 218 * this.progress);
    strokeWeight(2.2);
    strokeCap(ROUND);

    for (let i = 0; i < samples; i++) {
      const t1 = (i / samples) * this.progress;
      const t2 = ((i + 1) / samples) * this.progress;
      const p1 = bezierPointVec(
        this.anchor,
        createVector(this.c1.x + sway * 0.24, this.c1.y),
        createVector(this.c2.x + sway * 0.76, this.c2.y),
        createVector(this.endX + sway, this.groundY),
        t1
      );
      const p2 = bezierPointVec(
        this.anchor,
        createVector(this.c1.x + sway * 0.24, this.c1.y),
        createVector(this.c2.x + sway * 0.76, this.c2.y),
        createVector(this.endX + sway, this.groundY),
        t2
      );
      line(p1.x, p1.y, p2.x, p2.y);
    }
  }
}

class GroundPetalScatter {
  constructor(x, y, branch, appearAt) {
    this.x = x;
    this.y = y;
    this.branch = branch;
    this.appearAt = appearAt;
    this.progress = 0;
    this.phase = random(TWO_PI);
    this.retreating = false;
    this.fallingPetals = [];
    this.groundSquares = [];
    this.groundY = height * 0.82 + random(10, 18);
    this.pileCenterX = this.x + random(-14, 14);
    this.squareSize = random(3.2, 4.8);
    this.columns = int(random(6, 10));
    this.columnHeights = Array(this.columns).fill(0);
    this.maxAirborne = int(random(2, 4));
    this.maxGroundSquares = int(random(18, 34));
    this.nextSpawnFrame = frameCount + int(random(12, 26));
    this.spawnIntervalMin = 18;
    this.spawnIntervalMax = 38;
  }

  spawnFallingPetal() {
    const driftSide = random(-1, 1);
    const targetX = this.pileCenterX + random(-this.squareSize * this.columns * 0.42, this.squareSize * this.columns * 0.42);
    this.fallingPetals.push({
      x: this.x + random(-10, 10),
      y: this.y + random(-6, 6),
      targetX,
      vx: random(-0.16, 0.16),
      vy: random(0.44, 0.92),
      spin: random(-0.045, 0.045),
      rot: random(TWO_PI),
      phase: random(TWO_PI),
      driftSide,
      size: this.squareSize * random(0.9, 1.36),
      life: 1
    });
  }

  choosePileColumn(targetX) {
    let bestCol = 0;
    let bestScore = Infinity;
    const center = (this.columns - 1) * 0.5;

    for (let col = 0; col < this.columns; col++) {
      const columnX = this.pileCenterX + (col - center) * this.squareSize * 0.96;
      const score =
        this.columnHeights[col] * 1.14 +
        abs(col - center) * 0.24 +
        abs(columnX - targetX) / max(1, this.squareSize * 2.2) +
        random(0, 0.35);

      if (score < bestScore) {
        bestScore = score;
        bestCol = col;
      }
    }

    return bestCol;
  }

  addGroundSquare(fallingPetal) {
    if (this.groundSquares.length >= this.maxGroundSquares) {
      return;
    }

    const col = this.choosePileColumn(fallingPetal.targetX);
    const row = this.columnHeights[col];
    this.columnHeights[col]++;

    const center = (this.columns - 1) * 0.5;
    const x = this.pileCenterX + (col - center) * this.squareSize * 0.96 + random(-0.28, 0.28);
    const y = this.groundY - row * this.squareSize * 0.82 - this.squareSize * 0.5 + random(-0.18, 0.18);

    this.groundSquares.push({
      x,
      y,
      size: fallingPetal.size * random(0.88, 1.08)
    });
  }

  updateFallingPetals() {
    for (let i = this.fallingPetals.length - 1; i >= 0; i--) {
      const petal = this.fallingPetals[i];
      const glide = sin(frameCount * 0.024 + petal.phase) * 0.012 * petal.driftSide;
      petal.vx += glide + (petal.targetX - petal.x) * 0.0007;
      petal.vy += 0.018;
      petal.vx *= 0.992;
      petal.vy = min(petal.vy, 1.8);
      petal.x += petal.vx;
      petal.y += petal.vy;
      petal.rot += petal.spin;

      if (this.retreating) {
        petal.life = max(0, petal.life - 0.024);
      }

      const pilePeak = this.columnHeights.length === 0 ? 0 : max(...this.columnHeights);
      const landingY = this.groundY - min(pilePeak, 9) * this.squareSize * 0.18;
      if (petal.y >= landingY && !this.retreating) {
        this.addGroundSquare(petal);
        this.fallingPetals.splice(i, 1);
        continue;
      }

      if (petal.life <= 0 || petal.y > height + 24) {
        this.fallingPetals.splice(i, 1);
      }
    }
  }

  update() {
    if (this.branch && this.branch.progress < this.appearAt) {
      return;
    }

    if (!this.retreating && this.progress < 1) {
      this.progress += 0.032;
      if (this.progress > 1) this.progress = 1;
    }

    if (!this.retreating && this.progress > 0.64 && frameCount >= this.nextSpawnFrame) {
      if (this.fallingPetals.length < this.maxAirborne) {
        this.spawnFallingPetal();
      }
      this.nextSpawnFrame = frameCount + int(random(this.spawnIntervalMin, this.spawnIntervalMax));
    }

    this.updateFallingPetals();
  }

  retreat() {
    this.retreating = true;

    if (this.progress > 0) {
      this.progress = max(0, this.progress - 0.014);
    }

    this.updateFallingPetals();

    if (frameCount % 6 === 0 && this.groundSquares.length > 0) {
      this.groundSquares.pop();
    }
  }

  isVisible() {
    return this.progress > 0.001 || this.fallingPetals.length > 0 || this.groundSquares.length > 0;
  }

  display() {
    if (this.progress <= 0 && this.fallingPetals.length === 0 && this.groundSquares.length === 0) return;

    push();
    noStroke();
    rectMode(CENTER);

    const squareAlpha = 255 * this.progress;
    for (let i = 0; i < this.groundSquares.length; i++) {
      const square = this.groundSquares[i];
      fill(0, 0, 255, squareAlpha);
      rect(square.x, square.y, square.size, square.size);
    }

    for (let i = 0; i < this.fallingPetals.length; i++) {
      const petal = this.fallingPetals[i];
      fill(0, 0, 255, 255 * petal.life * this.progress);
      push();
      translate(petal.x, petal.y);
      rotate(petal.rot);
      rect(0, 0, petal.size, petal.size);
      pop();
    }

    pop();
  }
}

class BlossomCluster {
  constructor(x, y, thickness, branchT, branch, appearAt) {
    this.x = x;
    this.y = y;
    this.progress = 0;
    this.branch = branch;
    this.appearAt = appearAt;
    this.radius = map(thickness, 1.1, 9.6, 50, 24, true);
    this.collisionRadius = this.radius * 0.92;
    this.flowers = [];
    this.swayPhase = random(TWO_PI);
    this.swaySpeed = random(0.018, 0.03);
    this.swayAmount = map(thickness, 1.1, 5.5, 3.1, 1.8, true);
    this.tiltAmount = random(0.03, 0.06);
    const singleBloom = random() < 0.2;
    let count = singleBloom ? 1 : int(map(thickness, 1.1, 9.6, 13, 6, true));
    let baseAngle = random(TWO_PI);

    for (let i = 0; i < count; i++) {
      let a = singleBloom
        ? random(TWO_PI)
        : baseAngle + TWO_PI * (i / count) + random(-0.12, 0.12);
      let r = singleBloom
        ? random(this.radius * 0.06, this.radius * 0.2)
        : random(this.radius * 0.38, this.radius * 0.98);
      let isLarge = random() < 0.22;
      let isPlus = random() < 0.1;
      const starScale = map(branchT, 0.1, 0.9, 1.26, 0.98, true);

      this.flowers.push({
        x: cos(a) * r,
        y: sin(a) * r * 0.85,
        size: isPlus
          ? random(10, 14)
          : isLarge
            ? random(42, 56) * starScale
            : random(32, 44) * starScale,
        type: isPlus ? "plus" : "star",
        motionAmp: isLarge ? random(2.6, 4.8) : random(0.4, 1.2),
        motionSpeed: isLarge ? random(0.032, 0.05) : random(0.02, 0.034)
      });
    }
  }

  update() {
    if (this.branch && this.branch.progress < this.appearAt) {
      return;
    }
    if (this.progress < 1) {
      this.progress += 0.05;
      if (this.progress > 1) this.progress = 1;
    }
  }

  retreat() {
    if (this.progress > 0) {
      this.progress = max(0, this.progress - 0.07);
    }
  }

  display() {
    if (this.progress <= 0) return;

    let sway = sin(frameCount * this.swaySpeed + this.swayPhase);
    let driftX = sway * this.swayAmount * this.progress;
    let driftY = sin(frameCount * this.swaySpeed * 0.65 + this.swayPhase + 0.8) * 0.45 * this.progress;
    let tilt = sway * this.tiltAmount * this.progress;

    push();
    translate(this.x + driftX, this.y + driftY);
    rotate(tilt);
    textAlign(CENTER, CENTER);
    noStroke();

    for (let i = 0; i < this.flowers.length; i++) {
      let f = this.flowers[i];
      let flutter = sin(frameCount * 0.05 + this.swayPhase * 1.7 + i * 0.8);
      let bloomMotion = sin(frameCount * f.motionSpeed + this.swayPhase + i * 0.46) * f.motionAmp;
      let px = f.x * this.progress + flutter * 0.6 * this.progress + bloomMotion * this.progress;
      let py = f.y * this.progress + cos(frameCount * 0.042 + this.swayPhase + i) * 0.35 * this.progress + cos(frameCount * f.motionSpeed * 0.82 + i) * f.motionAmp * 0.26 * this.progress;
      let alpha = 235 * this.progress;

      drawBlossomGlyph(f.type, px, py, f.size * this.progress, alpha);
    }

    pop();
  }
}

function drawBlossomGlyph(type, x, y, size, alpha) {
  if (type === "plus") {
    const half = size * 0.42;
    const gap = size * 0.14;
    stroke(0, 0, 255, alpha);
    strokeWeight(max(1.2, size * 0.1));
    line(x - half, y, x - gap, y);
    line(x + gap, y, x + half, y);
    line(x, y - half, x, y - gap);
    line(x, y + gap, x, y + half);
    noStroke();
    return;
  }

  fill(0, 0, 255, alpha);
  textSize(size);
  text("*", x, y);
}

class DriftingStar {
  constructor(x, y, s) {
    this.x = x;
    this.y = y;
    this.s = s;

    this.vx = random(-0.18, 0.18);
    this.vy = random(0.4, 0.9);
    this.gravity = 0.02;
    this.life = 255;
  }

  update() {
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 2.6;
  }

  display() {
    push();
    textAlign(CENTER, CENTER);
    noStroke();
    fill(0, 0, 255, this.life * 0.82);
    textSize(this.s * 2.1);
    text("*", this.x, this.y);
    pop();
  }

  dead() {
    return this.life <= 0 || this.y > height + 30;
  }
}

class MigratoryBird {
  constructor(x, y, perchAngle, size, arrivalSide, delayFrames = 0) {
    this.perch = createVector(x, y);
    this.perchAngle = perchAngle;
    this.size = size;
    this.delayFrames = delayFrames;
    this.arrivalSide = arrivalSide;
    this.phase = random(TWO_PI);
    this.flapSpeed = random(0.08, 0.15);
    this.bobSpeed = random(0.012, 0.022);
    this.arrivalSpeed = random(0.0045, 0.0075);
    this.departureSpeed = random(0.005, 0.008);
    this.perchSwayX = random(1.2, 3.4);
    this.perchSwayY = random(0.4, 1.1);
    this.flightArcAmp = random(24, 68);
    this.flightArcSign = random([-1, 1]);
    this.departArcSign = random([-1, 1]);
    this.state = "arriving";
    this.progress = 0;
    this.settleProgress = 0;
    this.settleStartPos = createVector(x, y);
    this.settleStartAngle = perchAngle * 0.7;
    this.lastPos = createVector(x, y);

    this.arrivalStart = createVector(
      arrivalSide < 0 ? -90 : width + 90,
      y - random(90, 220)
    );
    this.arrivalC1 = createVector(
      lerp(this.arrivalStart.x, x, random(0.18, 0.34)),
      this.arrivalStart.y - random(24, 92)
    );
    this.arrivalC2 = createVector(
      lerp(this.arrivalStart.x, x, random(0.56, 0.78)),
      y - random(38, 110)
    );

    this.departStart = null;
    this.departC1 = null;
    this.departC2 = null;
    this.departEnd = null;
  }

  depart() {
    if (this.state === "leaving" || this.state === "gone") return;

    let current = this.getPosition();
    let leaveSide = random([-1, 1]);

    this.state = "leaving";
    this.progress = 0;
    this.departStart = current.copy();
    this.departEnd = createVector(
      leaveSide < 0 ? -120 : width + 120,
      current.y - random(120, 240)
    );
    this.departC1 = createVector(
      current.x + leaveSide * random(54, 132),
      current.y - random(56, 120)
    );
    this.departC2 = createVector(
      lerp(current.x, this.departEnd.x, random(0.56, 0.76)),
      this.departEnd.y + random(22, 70)
    );
  }

  update() {
    if (this.state === "gone") return;

    if (this.delayFrames > 0) {
      this.delayFrames--;
      return;
    }

    this.lastPos = this.getPosition().copy();

    if (this.state === "arriving") {
      this.progress += this.arrivalSpeed;
      if (this.progress >= 1) {
        this.progress = 1;
        this.settleStartPos = this.getPosition().copy();
        this.settleStartAngle = bezierTangentAngle(
          this.arrivalStart,
          this.arrivalC1,
          this.arrivalC2,
          this.perch,
          1
        );
        this.settleProgress = 0;
        this.state = "settling";
      }
      return;
    }

    if (this.state === "settling") {
      this.settleProgress += 0.085;
      if (this.settleProgress >= 1) {
        this.settleProgress = 1;
        this.state = "perched";
      }
      return;
    }

    if (this.state === "perched") {
      this.progress = 1;
      return;
    }

    if (this.state === "leaving") {
      this.progress += this.departureSpeed;
      if (this.progress >= 1) {
        this.progress = 1;
        this.state = "gone";
      }
    }
  }

  isVisible() {
    return this.state !== "gone";
  }

  getPosition() {
    if (this.delayFrames > 0) {
      return this.arrivalStart.copy();
    }

    if (this.state === "arriving") {
      let basePos = bezierPointVec(
        this.arrivalStart,
        this.arrivalC1,
        this.arrivalC2,
        this.perch,
        this.progress
      );
      let tangent = bezierTangentAngle(
        this.arrivalStart,
        this.arrivalC1,
        this.arrivalC2,
        this.perch,
        constrain(this.progress, 0, 1)
      );
      let normal = createVector(cos(tangent + HALF_PI), sin(tangent + HALF_PI));
      let wave = sin(this.progress * PI) * this.flightArcAmp * this.flightArcSign;
      basePos.add(normal.mult(wave));
      return basePos;
    }

    if (this.state === "settling") {
      let perchSwayX = sin(frameCount * this.bobSpeed + this.phase) * this.perchSwayX * 0.24 * this.settleProgress;
      let perchSwayY = cos(frameCount * this.bobSpeed * 0.7 + this.phase * 1.2) * this.perchSwayY * 0.24 * this.settleProgress;
      let dip = sin(this.settleProgress * PI) * 1.6;
      return createVector(
        lerp(this.settleStartPos.x, this.perch.x, this.settleProgress) + perchSwayX,
        lerp(this.settleStartPos.y, this.perch.y, this.settleProgress) + perchSwayY + dip
      );
    }

    if (this.state === "leaving" && this.departStart) {
      let basePos = bezierPointVec(
        this.departStart,
        this.departC1,
        this.departC2,
        this.departEnd,
        this.progress
      );
      let tangent = bezierTangentAngle(
        this.departStart,
        this.departC1,
        this.departC2,
        this.departEnd,
        constrain(this.progress, 0, 1)
      );
      let normal = createVector(cos(tangent + HALF_PI), sin(tangent + HALF_PI));
      let wave = sin(this.progress * PI) * this.flightArcAmp * 0.82 * this.departArcSign;
      basePos.add(normal.mult(wave));
      return basePos;
    }

    let swayX = sin(frameCount * this.bobSpeed + this.phase) * this.perchSwayX;
    let swayY = cos(frameCount * this.bobSpeed * 0.7 + this.phase * 1.2) * this.perchSwayY;
    return createVector(this.perch.x + swayX, this.perch.y + swayY);
  }

  getAngle() {
    if (this.state === "arriving") {
      return bezierTangentAngle(
        this.arrivalStart,
        this.arrivalC1,
        this.arrivalC2,
        this.perch,
        constrain(this.progress, 0, 1)
      );
    }

    if (this.state === "leaving" && this.departStart) {
      return bezierTangentAngle(
        this.departStart,
        this.departC1,
        this.departC2,
        this.departEnd,
        constrain(this.progress, 0, 1)
      );
    }

    if (this.state === "settling") {
      return angleLerp(this.settleStartAngle, this.perchAngle * 0.26, this.settleProgress);
    }

    return this.perchAngle * 0.26;
  }

  display() {
    if (!this.isVisible() || this.delayFrames > 0) return;

    let pos = this.getPosition();
    let angle = this.getAngle();
    let flip = 1;
    if (cos(angle) < 0) {
      angle += PI;
      flip = -1;
    }

    let wingOpen;
    if (this.state === "perched") {
      wingOpen = 0.08;
      angle += sin(frameCount * this.bobSpeed * 0.8 + this.phase) * 0.035;
    } else if (this.state === "settling") {
      wingOpen = lerp(0.4, 0.08, this.settleProgress);
      angle += sin(frameCount * this.bobSpeed * 0.8 + this.phase) * 0.02;
    } else {
      wingOpen = map(sin(frameCount * this.flapSpeed + this.phase), -1, 1, 0.12, 1);
    }

    push();
    translate(pos.x, pos.y);
    rotate(angle);
    scale(flip, 1);
    drawMigratoryBirdGlyph(this.size, wingOpen, this.state === "perched" || this.state === "settling");
    pop();
  }
}

function updateAndDisplayDriftingStars() {
  for (let i = driftingStars.length - 1; i >= 0; i--) {
    driftingStars[i].update();
    driftingStars[i].display();

    if (driftingStars[i].dead()) {
      driftingStars.splice(i, 1);
    }
  }
}

function drawTaperedBranchBezier(branch) {
  let samples = 28;
  let maxT = branch.progress;

  if (maxT <= 0) return;

  for (let i = 0; i < samples; i++) {
    let t1 = map(i, 0, samples, 0, maxT);
    let t2 = map(i + 1, 0, samples, 0, maxT);

    if (t2 > maxT) t2 = maxT;
    if (t2 <= t1) continue;

    let p1 = bezierPointVec(branch.start, branch.c1, branch.c2, branch.end, t1);
    let p2 = bezierPointVec(branch.start, branch.c1, branch.c2, branch.end, t2);
    let w = lerp(branch.startThickness, branch.endThickness, (t1 + t2) * 0.5);
    let trunkBoost = map(branch.start.y, height * 0.82, height * 0.12, 1.22, 0.82, true);
    let centralBoost = map(abs(branch.start.x - width * 0.5), 0, width * 0.5, 1.04, 0.86, true);
    let supportBoost = branch.baseNode
      ? map(branch.baseNode.branchCount, 0, 7, 1, 1.08, true)
      : 1;
    stroke(0, 0, 0, 246);
    strokeWeight(w * map(branch.depth, 0, 13, 0.98, 0.76, true) * trunkBoost * centralBoost * supportBoost);
    strokeCap(ROUND);
    line(p1.x, p1.y, p2.x, p2.y);
  }
}

function drawReflectedBranchBezier(branch, horizonY) {
  let samples = 24;
  let maxT = branch.progress;

  if (maxT <= 0) return;

  for (let i = 0; i < samples; i++) {
    let t1 = map(i, 0, samples, 0, maxT);
    let t2 = map(i + 1, 0, samples, 0, maxT);

    if (t2 > maxT) t2 = maxT;
    if (t2 <= t1) continue;

    let p1 = bezierPointVec(branch.start, branch.c1, branch.c2, branch.end, t1);
    let p2 = bezierPointVec(branch.start, branch.c1, branch.c2, branch.end, t2);
    let rp1y = horizonY + (horizonY - p1.y);
    let rp2y = horizonY + (horizonY - p2.y);
    let fade1 = map(rp1y, horizonY, height, 72, 0, true);
    let fade2 = map(rp2y, horizonY, height, 72, 0, true);
    let alpha = min(fade1, fade2) * branch.progress;
    if (alpha <= 0.4) continue;

    let w = lerp(branch.startThickness, branch.endThickness, (t1 + t2) * 0.5);
    stroke(194, 68, 112, alpha);
    strokeWeight(w * 0.42);
    strokeCap(ROUND);
    line(p1.x, rp1y, p2.x, rp2y);
  }
}

class RootSquareParticle {
  constructor(x, y, kind) {
    this.kind = kind;
    this.origin = createVector(x, y);
    this.pos = createVector(x, y);
    this.phase = random(TWO_PI);
    this.ageFrames = 0;
    this.life = 1;
    this.retreating = false;
    this.minLife = kind === "hover" ? random(0.24, 0.42) : 0;
    this.fadeRate = kind === "burst" ? random(0.01, 0.018) : random(0.0009, 0.0022);
    this.size = kind === "burst" ? random(2.8, 4.8) : random(2.6, 4.2);
    this.alpha = 255;

    if (kind === "burst") {
      const angle = -HALF_PI + random(-0.95, 0.95);
      const speed = random(0.8, 2.4);
      this.vel = p5.Vector.fromAngle(angle).mult(speed);
      this.vel.x *= random(0.75, 1.15);
      this.vel.y *= random(0.86, 1.12);
      this.drag = random(0.942, 0.972);
      this.swirl = random(-0.02, 0.02);
    } else {
      this.vel = createVector(random(-0.08, 0.08), random(-0.04, 0.03));
      this.drag = 0.992;
      this.anchorOffsetX = random(-110, 110);
      this.anchorLift = random(32, 220);
      this.orbitRadiusX = random(34, 132);
      this.orbitRadiusY = random(14, 58);
      this.orbitSpeed = random(0.0024, 0.0052);
      this.driftSpan = random(10, 28);
      this.depthPhase = random(TWO_PI);
      this.layerThreshold = random(-0.14, 0.2);
    }
  }

  update(rootX, rootY) {
    this.origin.set(rootX, rootY);
    this.ageFrames++;

    if (this.kind === "burst") {
      this.pos.add(this.vel);
      this.vel.x += sin(frameCount * 0.08 + this.phase) * this.swirl;
      this.vel.y -= 0.006;
      this.vel.mult(this.drag);
    } else {
      const orbitTime = frameCount * this.orbitSpeed + this.phase;
      const target = createVector(
        this.origin.x +
          this.anchorOffsetX +
          sin(orbitTime) * this.orbitRadiusX +
          sin(orbitTime * 0.43 + this.phase * 1.4) * this.driftSpan,
        this.origin.y -
          this.anchorLift +
          cos(orbitTime * 0.82 + this.phase * 1.3) * this.orbitRadiusY +
          sin(orbitTime * 0.28 + this.phase * 0.8) * this.driftSpan
      );
      const drift = p5.Vector.sub(target, this.pos).mult(0.012);
      this.vel.add(drift);
      this.vel.limit(0.24);
      this.pos.add(this.vel);
      this.vel.mult(this.drag);
    }

    if (this.kind === "burst" || this.retreating) {
      this.life = max(0, this.life - this.fadeRate);
    } else {
      this.life = max(this.minLife, this.life - this.fadeRate);
    }
  }

  retreat() {
    this.retreating = true;
    this.life = max(0, this.life - (this.kind === "burst" ? 0.018 : 0.005));
  }

  isVisible() {
    return this.life > 0.01;
  }

  currentLayer() {
    if (this.kind === "burst") {
      return "back";
    }
    if (this.ageFrames < 42) {
      return "back";
    }

    const depthWave =
      sin(frameCount * this.orbitSpeed * 1.2 + this.depthPhase) +
      sin(frameCount * this.orbitSpeed * 0.54 + this.phase) * 0.38;
    return depthWave > this.layerThreshold ? "front" : "back";
  }

  display(layer = "all") {
    if (!this.isVisible()) return;
    const currentLayer = this.currentLayer();
    if (layer !== "all" && currentLayer !== layer) return;

    const depthScale = currentLayer === "front" ? 1.04 : 0.84;
    const fadeWindow = this.kind === "burst" ? 0.2 : 0.14;
    const coreAlpha = this.life > fadeWindow ? this.alpha : map(this.life, 0, fadeWindow, 0, this.alpha, true);

    push();
    rectMode(CENTER);
    noStroke();
    fill(0, 0, 255, coreAlpha);
    rect(this.pos.x, this.pos.y, this.size * depthScale, this.size * depthScale);
    pop();
  }
}

function drawMigratoryBirdGlyph(size, wingOpen, perched) {
  let span = size * lerp(0.38, 1.26, wingOpen);
  let lift = size * lerp(0.04, 0.72, wingOpen);
  let bodyLen = size * 0.42;
  let headX = bodyLen * 0.62;
  let alpha = perched ? 240 : 228;

  noFill();
  stroke(0, 0, 255, alpha);
  strokeWeight(max(1.4, size * 0.1));
  strokeCap(ROUND);
  strokeJoin(ROUND);

  bezier(
    0,
    0,
    -span * 0.14,
    -lift * 0.18,
    -span * 0.58,
    -lift,
    -span,
    -lift * 0.34
  );
  bezier(
    0,
    0,
    span * 0.14,
    -lift * 0.18,
    span * 0.58,
    -lift,
    span,
    -lift * 0.34
  );

  line(-bodyLen * 0.22, 0, bodyLen * 0.34, 0);
  line(bodyLen * 0.1, 0, headX, -size * 0.08);
  line(-bodyLen * 0.24, 0, -bodyLen * 0.48, -size * 0.08);
  line(-bodyLen * 0.24, 0, -bodyLen * 0.48, size * 0.08);

  if (perched) {
    line(-size * 0.06, size * 0.06, size * 0.02, size * 0.24);
    line(size * 0.02, size * 0.06, size * 0.1, size * 0.24);
  }
}

class NodeLabel {
  constructor(branch, note) {
    this.branch = branch;
    this.note = note;
    this.life = 255;
    this.floatY = 0;

    let finalAnchor = branch.end.copy();
    let placed = this.findTextPlacement(finalAnchor);

    this.textX = placed.x;
    this.textY = placed.y;
  }

  findTextPlacement(finalAnchor) {
    let options = [
      { x: finalAnchor.x + 34, y: finalAnchor.y - 12 },
      { x: finalAnchor.x + 42, y: finalAnchor.y - 24 },
      { x: finalAnchor.x - 56, y: finalAnchor.y - 12 },
      { x: finalAnchor.x - 60, y: finalAnchor.y - 24 },
      { x: finalAnchor.x + 22, y: finalAnchor.y + 18 },
      { x: finalAnchor.x - 44, y: finalAnchor.y + 16 }
    ];

    for (let o of options) {
      if (!this.textCollides(o.x, o.y)) return o;
    }
    return options[0];
  }

  textCollides(x, y) {
    for (let lb of labels) {
      if (dist(x, y, lb.textX || 0, lb.textY || 0) < 44) return true;
    }
    return false;
  }

  update() {
    this.life -= 2.2;
    this.floatY -= 0.05;
  }

  display() {
    let anchor = bezierPointVec(
      this.branch.start,
      this.branch.c1,
      this.branch.c2,
      this.branch.end,
      this.branch.progress
    );

    let boxSize = 12;
    let nodeBoxX = anchor.x - boxSize * 0.5;
    let nodeBoxY = anchor.y - boxSize * 0.5;

    let tx = this.textX;
    let ty = this.textY + this.floatY;

    drawingContext.setLineDash([4, 4]);
    stroke(0, 0, 220, this.life * 0.72);
    strokeWeight(1);
    noFill();

    rect(nodeBoxX, nodeBoxY, boxSize, boxSize, 1.5);
    line(tx, ty, anchor.x, anchor.y);

    drawingContext.setLineDash([]);

    noStroke();
    fill(0, 0, 245, this.life);
    text(getKeyName(this.note), tx + 4, ty + 4);
  }

  dead() {
    return this.life <= 0;
  }
}

function updateAndDisplayLabels() {
  for (let i = labels.length - 1; i >= 0; i--) {
    labels[i].update();
    labels[i].display();

    if (labels[i].dead()) {
      labels.splice(i, 1);
    }
  }
}

function easeOutCubic(t) {
  return 1 - pow(1 - t, 3);
}

function angleLerp(a, b, t) {
  let delta = atan2(sin(b - a), cos(b - a));
  return a + delta * t;
}

function sampleBezier(branch, count) {
  let pts = [];
  for (let i = 0; i <= count; i++) {
    let t = i / count;
    pts.push(bezierPointVec(branch.start, branch.c1, branch.c2, branch.end, t));
  }
  return pts;
}

function bezierPointVec(p0, p1, p2, p3, t) {
  return createVector(
    bezierPoint(p0.x, p1.x, p2.x, p3.x, t),
    bezierPoint(p0.y, p1.y, p2.y, p3.y, t)
  );
}

function bezierTangentAngle(p0, p1, p2, p3, t) {
  let tx = bezierTangent(p0.x, p1.x, p2.x, p3.x, t);
  let ty = bezierTangent(p0.y, p1.y, p2.y, p3.y, t);
  return atan2(ty, tx);
}

function getKeyName(note) {
  let names = ["DO", "RE", "MI", "FA", "SO", "LA", "TI"];
  return names[note % names.length];
}

function triggerGrowth(note) {
  if (!tree || tree.isRetreating) resetScene();
  if (forestBackdrop) forestBackdrop.flashToColor();
  if (forestBackdrop) forestBackdrop.pluck(note);
  tree.trigger(note);
}

async function connectSerial() {
  const btn = document.getElementById("connectButton");
  btn.style.display = "none";

  try {
    await ensureAudioReady();
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 9600 });
    reader = port.readable.getReader();
    readLoop();
  } catch (err) {
    console.error("Serial connection failed:", err);
  }
}

async function readLoop() {
  if (!reader) return;

  try {
    const { value, done } = await reader.read();

    if (done) {
      reader.releaseLock();
      return;
    }

    if (value) {
      for (let b of value) {
        if (b >= 0 && b <= 6) {
          playTone(b);
          triggerGrowth(b);
        }
      }
    }

    readLoop();
  } catch (err) {
    console.error("Serial read error:", err);
  }
}

async function playTone(idx) {
  await ensureAudioReady();
  if (!sounds[idx] || !sounds[idx].isLoaded()) return;

  if (sounds[idx].isPlaying()) {
    sounds[idx].stop();
  }
  sounds[idx].play();
}

async function mousePressed() {
  if (!tree) resetScene();

  await ensureAudioReady();
  let n = int(random(0, 7));
  playTone(n);
  triggerGrowth(n);
}

async function keyPressed() {
  if (!tree) resetScene();

  await ensureAudioReady();
  if (key === "1") { playTone(0); triggerGrowth(0); }
  if (key === "2") { playTone(1); triggerGrowth(1); }
  if (key === "3") { playTone(2); triggerGrowth(2); }
  if (key === "4") { playTone(3); triggerGrowth(3); }
  if (key === "5") { playTone(4); triggerGrowth(4); }
  if (key === "6") { playTone(5); triggerGrowth(5); }
  if (key === "7") { playTone(6); triggerGrowth(6); }

  if (key === "r" || key === "R") {
    resetScene();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  rebuildEnvironment();
  resetScene();
}
