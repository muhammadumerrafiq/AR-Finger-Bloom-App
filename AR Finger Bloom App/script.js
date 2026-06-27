/**
 * Finger Bloom Pro - Creative AR Art Installation
 * Author: Antigravity
 * Technology: HTML5 Canvas, Web Audio API, MediaPipe Hands (CDN)
 */

// --- LOCAL STORAGE PERSISTENCE HELPERS ---
function saveSettingsToLocalStorage() {
  const settings = {
    flowerStyle: STATE.flowerStyle,
    flowerSize: STATE.flowerSize,
    particleRate: STATE.particleRate,
    trailLength: STATE.trailLength,
    glowAmount: STATE.glowAmount,
    particleGravity: STATE.particleGravity,
    detectionConfidence: STATE.detectionConfidence,
    randomMode: STATE.randomMode,
    particlesEnabled: STATE.particlesEnabled,
    trailsEnabled: STATE.trailsEnabled,
    toggleGlow: STATE.toggleGlow,
    ambientEnabled: STATE.ambientEnabled,
    toggleDebug: STATE.toggleDebug,
    toggleFps: STATE.toggleFps,
    autoThrottle: STATE.autoThrottle,
    soundMuted: FingerBloomApp.instance ? FingerBloomApp.instance.soundSynth.muted : true,
    facingMode: FingerBloomApp.instance ? FingerBloomApp.instance.facingMode : 'user',
    selectedDeviceId: FingerBloomApp.instance ? FingerBloomApp.instance.selectedDeviceId : ''
  };
  localStorage.setItem('finger_bloom_settings', JSON.stringify(settings));
}

function loadSettingsFromLocalStorage() {
  try {
    const raw = localStorage.getItem('finger_bloom_settings');
    if (raw) {
      const data = JSON.parse(raw);
      if (data.flowerStyle !== undefined) STATE.flowerStyle = data.flowerStyle;
      if (data.flowerSize !== undefined) STATE.flowerSize = data.flowerSize;
      if (data.particleRate !== undefined) STATE.particleRate = data.particleRate;
      if (data.trailLength !== undefined) STATE.trailLength = data.trailLength;
      if (data.glowAmount !== undefined) STATE.glowAmount = data.glowAmount;
      if (data.particleGravity !== undefined) STATE.particleGravity = data.particleGravity;
      if (data.detectionConfidence !== undefined) STATE.detectionConfidence = data.detectionConfidence;
      if (data.randomMode !== undefined) STATE.randomMode = data.randomMode;
      if (data.particlesEnabled !== undefined) STATE.particlesEnabled = data.particlesEnabled;
      if (data.trailsEnabled !== undefined) STATE.trailsEnabled = data.trailsEnabled;
      if (data.toggleGlow !== undefined) STATE.toggleGlow = data.toggleGlow;
      if (data.ambientEnabled !== undefined) STATE.ambientEnabled = data.ambientEnabled;
      if (data.toggleDebug !== undefined) STATE.toggleDebug = data.toggleDebug;
      if (data.toggleFps !== undefined) STATE.toggleFps = data.toggleFps;
      if (data.autoThrottle !== undefined) STATE.autoThrottle = data.autoThrottle;

      if (FingerBloomApp.instance) {
        if (data.soundMuted !== undefined) {
          FingerBloomApp.instance.soundSynth.muted = data.soundMuted;
          const audioIcon = document.getElementById('audio-icon');
          if (audioIcon) {
            audioIcon.textContent = data.soundMuted ? '🔇' : '🔊';
          }
        }
        if (data.facingMode !== undefined) {
          FingerBloomApp.instance.facingMode = data.facingMode;
        }
        if (data.selectedDeviceId !== undefined) {
          FingerBloomApp.instance.selectedDeviceId = data.selectedDeviceId;
        }
        if (data.detectionConfidence !== undefined) {
          FingerBloomApp.instance.updateTrackerConfidence(data.detectionConfidence);
        }
      }
    }
  } catch (err) {
    console.error("Error loading settings from localStorage:", err);
  }
}

// --- GLOBAL APP STATE ---
const STATE = {
  flowerStyle: 'cherry',      // Active flower: cherry, rose, daisy, sunflower, tulip, lotus, lavender, hibiscus, crystal, magical
  flowerSize: 22,             // Base flower size
  particleRate: 2,            // Particle emission rate
  trailLength: 8,             // Trail history size
  glowAmount: 25,             // Glow overlay opacity percentage (0-100)
  particleGravity: -0.03,     // Gravity drift direction (negative = floats up)
  particleWind: 0.0,          // Current lateral wind force
  detectionConfidence: 0.70,   // MediaPipe tracker minimum detection confidence

  // Toggles
  randomMode: false,          // Random Flower Mode
  particlesEnabled: true,
  trailsEnabled: true,
  toggleGlow: true,
  ambientEnabled: true,
  toggleDebug: false,
  toggleFps: true,
  autoThrottle: true
};

// Base hues for color palettes relative to flower styles
const FLOWER_HUES = {
  cherry: 340,     // Pink
  rose: 355,       // Deep Crimson
  daisy: 60,       // Golden Yellow
  sunflower: 45,   // Bright Gold
  tulip: 330,      // Hot Pink
  lotus: 310,      // Lotus Magenta
  lavender: 270,   // Purple Lavender
  hibiscus: 345,   // Tropical Rose
  crystal: 195,    // Glowing Cyan
  magical: 45,     // Astral Gold
  leaf: 120,       // Soft Green
  vine_segment: 120,// Vine Green
  petal: 340       // Soft Petal Pink
};

// Hand landmarks connection mapping
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16], // Ring
  [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [0, 17]                               // Palm base
];

// --- 1. WEB AUDIO SYNTHESIZER ---
class SoundSynth {
  constructor() {
    this.ctx = null;
    this.muted = true;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playBloom() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(650, this.ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
  }

  playSparkle() {
    if (this.muted) return;
    this.init();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2200, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playBurst() {
    if (this.muted) return;
    this.init();

    // Low frequency triangle synth for explosion
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.6);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.6);
  }
}

// --- 2. PERFORMANCE MONITOR ---
class PerformanceMonitor {
  constructor(app) {
    this.app = app;
    this.fps = 60;
    this.lastTime = performance.now();
    this.frames = 0;
    this.mode = 'quality'; // low, performance, quality, ultra
    this.lastThrottleTime = 0;
  }

  update(timestamp) {
    this.frames++;
    if (timestamp > this.lastTime + 1000) {
      this.fps = Math.round((this.frames * 1000) / (timestamp - this.lastTime));
      this.frames = 0;
      this.lastTime = timestamp;

      // Update HUD Display
      if (this.app.uiManager) {
        this.app.uiManager.updateFPS(this.fps);
      }

      // Auto throttling triggers if FPS drops below 35 in Quality/Ultra mode
      if (STATE.autoThrottle && this.fps < 35 && (timestamp - this.lastThrottleTime > 5000)) {
        this.lastThrottleTime = timestamp;
        this.autoThrottleDown();
      }
    }
  }

  setMode(mode) {
    this.mode = mode;
    console.log(`Performance mode shifted: ${mode}`);

    const presetBtns = document.querySelectorAll('.btn-preset-opt');
    presetBtns.forEach(btn => {
      if (btn.getAttribute('data-preset') === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (mode === 'low') {
      STATE.particlesEnabled = true;
      STATE.trailsEnabled = false;
      STATE.toggleGlow = false;
      STATE.ambientEnabled = false;
      STATE.particleRate = 2;
      STATE.trailLength = 4;
      STATE.flowerSize = 18;
    } else if (mode === 'performance') {
      STATE.particlesEnabled = true;
      STATE.trailsEnabled = true;
      STATE.toggleGlow = true;
      STATE.ambientEnabled = false;
      STATE.particleRate = 3;
      STATE.trailLength = 8;
      STATE.flowerSize = 20;
    } else if (mode === 'quality') {
      STATE.particlesEnabled = true;
      STATE.trailsEnabled = true;
      STATE.toggleGlow = true;
      STATE.ambientEnabled = true;
      STATE.particleRate = 5;
      STATE.trailLength = 15;
      STATE.flowerSize = 22;
    } else if (mode === 'ultra') {
      STATE.particlesEnabled = true;
      STATE.trailsEnabled = true;
      STATE.toggleGlow = true;
      STATE.ambientEnabled = true;
      STATE.particleRate = 8;
      STATE.trailLength = 26;
      STATE.flowerSize = 28;
    }

    if (this.app.uiManager) {
      this.app.uiManager.syncSlidersWithState();
    }
  }

  autoThrottleDown() {
    if (this.mode === 'ultra') {
      this.setMode('quality');
      this.app.uiManager.showGestureToast("⚡ Optimized to Quality Mode");
    } else if (this.mode === 'quality') {
      this.setMode('performance');
      this.app.uiManager.showGestureToast("⚡ Optimized to Performance Mode");
    } else if (this.mode === 'performance') {
      this.setMode('low');
      this.app.uiManager.showGestureToast("⚡ Optimized to Low Power Mode");
    }
  }
}

// --- 3. PROCEDURAL FLOWER RENDERER ---
class FlowerRenderer {
  static drawFlower(ctx, type, x, y, size, rotation, hueOffset = 0, opacity = 1) {
    if (size <= 0.05) return;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Apply glow effect locally if active
    if (STATE.toggleGlow) {
      const activeHue = FLOWER_HUES[type] || 340;
      ctx.shadowColor = `hsla(${(activeHue + hueOffset) % 360}, 100%, 75%, ${0.35 * opacity})`;
      ctx.shadowBlur = size * 0.35 * opacity;
    }

    switch (type) {
      case 'cherry':
        this.drawCherry(ctx, size, hueOffset, opacity);
        break;
      case 'rose':
        this.drawRose(ctx, size, hueOffset, opacity);
        break;
      case 'daisy':
        this.drawDaisy(ctx, size, hueOffset, opacity);
        break;
      case 'sunflower':
        this.drawSunflower(ctx, size, hueOffset, opacity);
        break;
      case 'tulip':
        this.drawTulip(ctx, size, hueOffset, opacity);
        break;
      case 'lotus':
        this.drawLotus(ctx, size, hueOffset, opacity);
        break;
      case 'lavender':
        this.drawLavender(ctx, size, hueOffset, opacity);
        break;
      case 'hibiscus':
        this.drawHibiscus(ctx, size, hueOffset, opacity);
        break;
      case 'crystal':
        this.drawCrystal(ctx, size, hueOffset, opacity);
        break;
      case 'magical':
        this.drawMagical(ctx, size, hueOffset, opacity);
        break;
      case 'leaf':
        this.drawLeaf(ctx, size, opacity);
        break;
      case 'vine_segment':
        this.drawVineSegment(ctx, size, opacity);
        break;
      case 'petal':
        this.drawPetal(ctx, size, hueOffset, opacity);
        break;
      default:
        this.drawCherry(ctx, size, hueOffset, opacity);
    }

    ctx.restore();
  }

  // Helper to draw standard yellow pistil core
  static drawGoldenCenter(ctx, size) {
    const centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    centerGrad.addColorStop(0, '#ffffff');
    centerGrad.addColorStop(0.5, '#ffd54f'); // gold yellow
    centerGrad.addColorStop(1, '#e65100'); // deep border

    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();

    // Subtle stamen lines
    ctx.strokeStyle = 'rgba(230, 81, 0, 0.45)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 6; i++) {
      const ang = (i * 2 * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(ang) * (size * 0.6), Math.sin(ang) * (size * 0.6));
      ctx.stroke();
    }
  }

  // 1. Cherry Blossom
  static drawCherry(ctx, size, hueOffset, opacity = 1) {
    const hue = 340 + hueOffset;
    const numPetals = 5;
    for (let i = 0; i < numPetals; i++) {
      ctx.save();
      ctx.rotate((i * 2 * Math.PI) / numPetals);

      const gradient = ctx.createRadialGradient(0, -size * 0.4 * opacity, 0, 0, -size * 0.4 * opacity, size * 0.55 * opacity);
      gradient.addColorStop(0, `hsl(${hue}, 100%, 90%)`);
      gradient.addColorStop(0.6, `hsl(${hue}, 90%, 78%)`);
      gradient.addColorStop(1, `hsl(${(hue - 20 + 360) % 360}, 85%, 65%)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      // Heart shaped bezier curve petal
      ctx.bezierCurveTo(-size * 0.35 * opacity, -size * 0.15 * opacity, -size * 0.45 * opacity, -size * 0.75 * opacity, 0, -size * opacity);
      ctx.bezierCurveTo(size * 0.45 * opacity, -size * 0.75 * opacity, size * 0.35 * opacity, -size * 0.15 * opacity, 0, 0);
      ctx.fill();
      ctx.restore();
    }
    this.drawGoldenCenter(ctx, size * 0.28 * opacity);
  }

  // 2. Realistic Red Rose with detailed layered petals, green stem and small leaves
  static drawRose(ctx, size, hueOffset, opacity = 1) {
    const hue = 355 + hueOffset;

    // Stem and leaves background pass
    ctx.save();
    ctx.strokeStyle = '#2e7d32'; // Forest Green
    ctx.lineWidth = size * 0.08;
    ctx.lineCap = 'round';

    // Curved stem hanging down
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-size * 0.15, size * 0.6, -size * 0.05, size * 1.2);
    ctx.stroke();

    // Leaf 1
    ctx.save();
    ctx.translate(-size * 0.1, size * 0.5);
    ctx.rotate(-Math.PI / 4);
    const leafGrad = ctx.createLinearGradient(0, 0, size * 0.3, 0);
    leafGrad.addColorStop(0, '#4caf50');
    leafGrad.addColorStop(1, '#1b5e20');
    ctx.fillStyle = leafGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.15, -size * 0.1, size * 0.3, 0);
    ctx.quadraticCurveTo(size * 0.15, size * 0.1, 0, 0);
    ctx.fill();
    ctx.restore();

    // Leaf 2
    ctx.save();
    ctx.translate(-size * 0.08, size * 0.85);
    ctx.rotate(Math.PI / 6);
    ctx.fillStyle = leafGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.15, -size * 0.08, size * 0.25, 0);
    ctx.quadraticCurveTo(size * 0.15, size * 0.08, 0, 0);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    // Layer 1: Base Outer Petals (deep crimson red)
    ctx.fillStyle = `hsl(${hue}, 95%, 28%)`;
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((i * 2 * Math.PI) / 6);
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.5, size * 0.45, size * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Layer 2: Mid Petals (crimson red) - unfolds after opacity > 0.2
    const midScale = Math.max(0, (opacity - 0.2) / 0.8);
    if (midScale > 0) {
      ctx.fillStyle = `hsl(${hue}, 100%, 38%)`;
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate((i * 2 * Math.PI) / 5 + 0.35);
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.38 * midScale, size * 0.35 * midScale, size * 0.28 * midScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Layer 3: Inner Petals (bright red) - unfolds after opacity > 0.4
    const innerScale = Math.max(0, (opacity - 0.4) / 0.6);
    if (innerScale > 0) {
      ctx.fillStyle = `hsl(${hue}, 100%, 48%)`;
      for (let i = 0; i < 5; i++) {
        ctx.save();
        ctx.rotate((i * 2 * Math.PI) / 5 - 0.2);
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.3 * innerScale, size * 0.3 * innerScale, size * 0.23 * innerScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Layer 4: Core Petals - unfolds after opacity > 0.6
    const coreScale = Math.max(0, (opacity - 0.6) / 0.4);
    if (coreScale > 0) {
      ctx.fillStyle = `hsl(${hue}, 100%, 58%)`;
      for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((i * 2 * Math.PI) / 4 + 0.5);
        ctx.beginPath();
        ctx.ellipse(0, -size * 0.2 * coreScale, size * 0.22 * coreScale, size * 0.16 * coreScale, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // Spiral core - unfolds after opacity > 0.8
    const spiralScale = Math.max(0, (opacity - 0.8) / 0.2);
    if (spiralScale > 0) {
      ctx.strokeStyle = `hsl(${hue}, 100%, 75%)`;
      ctx.lineWidth = 2 * spiralScale;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.1 * spiralScale, 0, Math.PI * 1.5);
      ctx.stroke();
    }
  }

  // 3. Daisy
  static drawDaisy(ctx, size, hueOffset, opacity = 1) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    const numPetals = 16;
    for (let i = 0; i < numPetals; i++) {
      ctx.save();
      ctx.rotate((i * 2 * Math.PI) / numPetals);
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.5 * opacity, size * 0.11 * opacity, size * 0.5 * opacity, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const centerScale = Math.max(0, (opacity - 0.2) / 0.8);
    if (centerScale > 0) {
      const centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.28 * centerScale);
      centerGrad.addColorStop(0, '#fff4b8');
      centerGrad.addColorStop(0.7, '#ffb300');
      centerGrad.addColorStop(1, '#ff6f00');
      ctx.fillStyle = centerGrad;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.25 * centerScale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 4. Sunflower
  static drawSunflower(ctx, size, hueOffset, opacity = 1) {
    const hue = 45 + hueOffset;
    const numPetals = 24;

    // Back Petals
    ctx.fillStyle = `hsl(${hue - 10}, 100%, 48%)`;
    for (let i = 0; i < numPetals; i++) {
      ctx.save();
      ctx.rotate((i * 2 * Math.PI) / numPetals);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size * 0.15 * opacity, -size * 0.35 * opacity);
      ctx.lineTo(0, -size * 0.95 * opacity);
      ctx.lineTo(size * 0.15 * opacity, -size * 0.35 * opacity);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Fore Petals
    const foreScale = Math.max(0, (opacity - 0.2) / 0.8);
    if (foreScale > 0) {
      ctx.fillStyle = `hsl(${hue}, 100%, 58%)`;
      for (let i = 0; i < numPetals; i++) {
        ctx.save();
        ctx.rotate((i * 2 * Math.PI) / numPetals + Math.PI / numPetals);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-size * 0.12 * foreScale, -size * 0.3 * foreScale);
        ctx.lineTo(0, -size * 0.85 * foreScale);
        ctx.lineTo(size * 0.12 * foreScale, -size * 0.3 * foreScale);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // Large bronze center
    const centerScale = Math.max(0, (opacity - 0.4) / 0.6);
    if (centerScale > 0) {
      const centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.45 * centerScale);
      centerGrad.addColorStop(0, '#3e2723');
      centerGrad.addColorStop(0.7, '#4e342e');
      centerGrad.addColorStop(1, '#251200');
      ctx.fillStyle = centerGrad;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.38 * centerScale, 0, Math.PI * 2);
      ctx.fill();

      // Center dash ring
      ctx.strokeStyle = 'rgba(255, 235, 59, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.24 * centerScale, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 5. Tulip
  static drawTulip(ctx, size, hueOffset, opacity = 1) {
    const hue = 350 + hueOffset;

    // Left petal
    const gradLeft = ctx.createLinearGradient(-size * 0.4 * opacity, 0, 0, -size * opacity);
    gradLeft.addColorStop(0, `hsl(${hue}, 92%, 52%)`);
    gradLeft.addColorStop(1, `hsl(${(hue + 25) % 360}, 100%, 75%)`);
    ctx.fillStyle = gradLeft;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-size * 0.5 * opacity, -size * 0.25 * opacity, -size * 0.6 * opacity, -size * 0.8 * opacity, -size * 0.25 * opacity, -size * opacity);
    ctx.bezierCurveTo(0, -size * 0.6 * opacity, 0, 0, 0, 0);
    ctx.fill();

    // Right petal
    const gradRight = ctx.createLinearGradient(size * 0.4 * opacity, 0, 0, -size * opacity);
    gradRight.addColorStop(0, `hsl(${hue}, 92%, 52%)`);
    gradRight.addColorStop(1, `hsl(${(hue + 25) % 360}, 100%, 75%)`);
    ctx.fillStyle = gradRight;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(size * 0.5 * opacity, -size * 0.25 * opacity, size * 0.6 * opacity, -size * 0.8 * opacity, size * 0.25 * opacity, -size * opacity);
    ctx.bezierCurveTo(0, -size * 0.6 * opacity, 0, 0, 0, 0);
    ctx.fill();

    // Center petal
    const centerScale = Math.max(0, (opacity - 0.3) / 0.7);
    if (centerScale > 0) {
      const gradCenter = ctx.createLinearGradient(0, 0, 0, -size * centerScale);
      gradCenter.addColorStop(0, `hsl(${(hue - 15 + 360) % 360}, 95%, 44%)`);
      gradCenter.addColorStop(1, `hsl(${hue}, 100%, 68%)`);
      ctx.fillStyle = gradCenter;
      ctx.beginPath();
      ctx.moveTo(-size * 0.22 * centerScale, -size * 0.2 * centerScale);
      ctx.quadraticCurveTo(0, -size * 1.05 * centerScale, size * 0.22 * centerScale, -size * 0.2 * centerScale);
      ctx.quadraticCurveTo(0, 0, -size * 0.22 * centerScale, -size * 0.2 * centerScale);
      ctx.fill();
    }
  }

  // 6. Lotus
  static drawLotus(ctx, size, hueOffset, opacity = 1) {
    const hue = 310 + hueOffset;
    const numPetals = 12;

    // Background layer
    ctx.fillStyle = `hsl(${(hue - 18 + 360) % 360}, 85%, 42%)`;
    for (let i = 0; i < numPetals; i++) {
      ctx.save();
      ctx.rotate((i * 2 * Math.PI) / numPetals);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-size * 0.32 * opacity, -size * 0.45 * opacity, 0, -size * 0.95 * opacity);
      ctx.quadraticCurveTo(size * 0.32 * opacity, -size * 0.45 * opacity, 0, 0);
      ctx.fill();
      ctx.restore();
    }

    // Foreground layer
    const foreScale = Math.max(0, (opacity - 0.3) / 0.7);
    if (foreScale > 0) {
      ctx.fillStyle = `hsl(${hue}, 100%, 68%)`;
      for (let i = 0; i < numPetals; i++) {
        ctx.save();
        ctx.rotate((i * 2 * Math.PI) / numPetals + Math.PI / numPetals);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-size * 0.25 * foreScale, -size * 0.35 * foreScale, 0, -size * 0.78 * foreScale);
        ctx.quadraticCurveTo(size * 0.25 * foreScale, -size * 0.35 * foreScale, 0, 0);
        ctx.fill();
        ctx.restore();
      }
    }

    // Lotus gold base pod
    const centerScale = Math.max(0, (opacity - 0.5) / 0.5);
    if (centerScale > 0) {
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.18 * centerScale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 7. Lavender stem profile
  static drawLavender(ctx, size, hueOffset, opacity = 1) {
    const hue = 270 + hueOffset;

    // Stem line
    ctx.strokeStyle = '#558b2f';
    ctx.lineWidth = 2.5 * opacity;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, size * 1.4 * opacity);
    ctx.stroke();

    // Stacked lavender buds
    const steps = 6;
    for (let i = 0; i < steps; i++) {
      const budTrigger = i / steps;
      if (opacity < budTrigger) continue;

      const budOpacity = (opacity - budTrigger) / (1 - budTrigger);
      const y = -i * (size * 0.24);
      const podSize = size * (0.16 - i * 0.015) * budOpacity;
      if (podSize <= 0) continue;

      ctx.fillStyle = `hsl(${(hue - 20 + i * 6) % 360}, 85%, ${48 + i * 4}%)`;

      // Left bud node
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(-size * 0.16, y, podSize * 1.2, podSize * 0.75, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Right bud node
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(size * 0.16, y, podSize * 1.2, podSize * 0.75, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Top center bud node
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, y - size * 0.08, podSize * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 8. Hibiscus
  static drawHibiscus(ctx, size, hueOffset, opacity = 1) {
    const hue = 345 + hueOffset;
    const numPetals = 5;

    for (let i = 0; i < numPetals; i++) {
      ctx.save();
      ctx.rotate((i * 2 * Math.PI) / numPetals);

      const grad = ctx.createLinearGradient(0, 0, 0, -size * opacity);
      grad.addColorStop(0, `hsl(${(hue - 15 + 360) % 360}, 95%, 45%)`);
      grad.addColorStop(0.7, `hsl(${hue}, 90%, 58%)`);
      grad.addColorStop(1, `hsl(${(hue + 20) % 360}, 100%, 75%)`);
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-size * 0.48 * opacity, -size * 0.1 * opacity, -size * 0.65 * opacity, -size * 0.72 * opacity, -size * 0.15 * opacity, -size * 0.88 * opacity);
      ctx.bezierCurveTo(size * 0.15 * opacity, -size * 0.88 * opacity, size * 0.65 * opacity, -size * 0.72 * opacity, size * 0.48 * opacity, -size * 0.1 * opacity);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Leaning long red stamen column
    const stamenScale = Math.max(0, (opacity - 0.3) / 0.7);
    if (stamenScale > 0) {
      ctx.save();
      ctx.rotate(-Math.PI / 7);
      ctx.strokeStyle = '#d50000';
      ctx.lineWidth = 3.5 * stamenScale;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -size * 1.15 * stamenScale);
      ctx.stroke();

      // Golden tip stamen nodes
      ctx.fillStyle = '#ffca28';
      for (let j = 0; j < 5; j++) {
        const ang = (j / 5) * Math.PI * 2;
        const px = Math.cos(ang) * (size * 0.11 * stamenScale);
        const py = -size * 1.15 * stamenScale + Math.sin(ang) * (size * 0.11 * stamenScale);
        ctx.beginPath();
        ctx.arc(px, py, size * 0.06 * stamenScale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // 9. Fantasy Crystal Flower
  static drawCrystal(ctx, size, hueOffset, opacity = 1) {
    const hue = 195 + hueOffset;
    ctx.globalCompositeOperation = 'lighter';

    const numPetals = 6;
    for (let i = 0; i < numPetals; i++) {
      ctx.save();
      ctx.rotate((i * 2 * Math.PI) / numPetals);

      const grad = ctx.createLinearGradient(0, 0, 0, -size * opacity);
      grad.addColorStop(0, `hsla(${hue}, 100%, 50%, ${0.15 * opacity})`);
      grad.addColorStop(0.5, `hsla(${(hue + 60) % 360}, 100%, 65%, ${0.45 * opacity})`);
      grad.addColorStop(1, `hsla(${(hue + 120) % 360}, 100%, 80%, ${0.75 * opacity})`);
      ctx.fillStyle = grad;
      ctx.strokeStyle = `hsla(${hue}, 100%, 85%, ${0.65 * opacity})`;
      ctx.lineWidth = 1;

      // Diamond cut shape
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size * 0.28 * opacity, -size * 0.45 * opacity);
      ctx.lineTo(0, -size * opacity);
      ctx.lineTo(size * 0.28 * opacity, -size * 0.45 * opacity);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner bisecting line
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -size * opacity);
      ctx.stroke();
      ctx.restore();
    }

    // Glowing core
    ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * opacity})`;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.14 * opacity, 0, Math.PI * 2);
    ctx.fill();
  }

  // 10. Golden Magical Star Flower
  static drawMagical(ctx, size, hueOffset, opacity = 1) {
    const hue = 45 + hueOffset;
    ctx.globalCompositeOperation = 'lighter';

    // 8 star points
    ctx.fillStyle = `rgba(255, 224, 130, ${opacity})`;
    ctx.strokeStyle = `rgba(255, 160, 0, ${opacity})`;
    ctx.lineWidth = 1.5;

    const numPoints = 8;
    for (let i = 0; i < numPoints; i++) {
      ctx.save();
      ctx.rotate((i * 2 * Math.PI) / numPoints);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-size * 0.16 * opacity, -size * 0.35 * opacity);
      ctx.lineTo(0, -size * 1.15 * opacity); // Long energy spike
      ctx.lineTo(size * 0.16 * opacity, -size * 0.35 * opacity);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Outer faint energy rings
    const ringScale = Math.max(0, (opacity - 0.4) / 0.6);
    if (ringScale > 0) {
      ctx.strokeStyle = `rgba(255, 202, 40, ${0.35 * ringScale})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.58 * ringScale, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Rich gradient center
    const coreScale = Math.max(0, (opacity - 0.2) / 0.8);
    if (coreScale > 0) {
      const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.24 * coreScale);
      coreGrad.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
      coreGrad.addColorStop(0.5, `hsla(${hue}, 100%, 82%, ${opacity})`);
      coreGrad.addColorStop(1, `hsla(${hue + 20}, 100%, 50%, 0)`);
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.24 * coreScale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 11. Leaf
  static drawLeaf(ctx, size, opacity = 1) {
    const leafGrad = ctx.createLinearGradient(0, 0, size, 0);
    leafGrad.addColorStop(0, '#81c784');
    leafGrad.addColorStop(1, '#2e7d32');
    ctx.fillStyle = leafGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.5, -size * 0.35, size, 0);
    ctx.quadraticCurveTo(size * 0.5, size * 0.35, 0, 0);
    ctx.fill();
  }

  // 12. Vine Segment
  static drawVineSegment(ctx, size, opacity = 1) {
    ctx.strokeStyle = '#388e3c';
    ctx.lineWidth = Math.max(1.5, size * 0.12);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-size * 0.5, 0);
    ctx.quadraticCurveTo(0, -size * 0.3, size * 0.5, 0);
    ctx.stroke();
  }

  // 13. Petal
  static drawPetal(ctx, size, hueOffset, opacity = 1) {
    const hue = (340 + hueOffset + 360) % 360;
    const gradient = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
    gradient.addColorStop(0, `hsl(${hue}, 100%, 88%)`);
    gradient.addColorStop(1, `hsl(${(hue - 20 + 360) % 360}, 90%, 65%)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.5);
    ctx.quadraticCurveTo(-size * 0.35, 0, 0, size * 0.5);
    ctx.quadraticCurveTo(size * 0.35, 0, 0, -size * 0.5);
    ctx.fill();
  }
}

// --- 4. OPTIMIZED RECYCLED PARTICLE SYSTEM ---
class Particle {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.size = 0;
    this.maxSize = 0;
    this.life = 0;
    this.maxLife = 0;
    this.alpha = 1.0;
    this.rotation = 0;
    this.vRotation = 0;
    this.type = 'petal'; // petal, sparkle, dust, pollen, ring, charge
    this.hue = 340;
    this.wobbleSpeed = 0.05;
    this.wobbleRange = 1;
  }

  spawn(x, y, vx, vy, size, life, type, hue) {
    this.active = true;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.maxSize = size;
    this.size = size;
    this.maxLife = life;
    this.life = life;
    this.alpha = 1.0;
    this.rotation = Math.random() * Math.PI * 2;
    this.vRotation = (Math.random() - 0.5) * 0.08;
    this.type = type;
    this.hue = hue;
    this.wobbleSpeed = 0.04 + Math.random() * 0.06;
    this.wobbleRange = 0.5 + Math.random() * 1.5;
  }

  update(gravity, wind) {
    if (!this.active) return;

    this.life--;
    const lifeRatio = this.life / this.maxLife;
    this.alpha = lifeRatio;

    switch (this.type) {
      case 'petal':
        this.vx += wind * 0.08;
        this.vy += gravity;
        // Side to side flutter wobble
        this.vx += Math.sin(this.life * this.wobbleSpeed) * (this.wobbleRange * 0.15);
        this.size = this.maxSize * (0.4 + 0.6 * lifeRatio);
        break;

      case 'sparkle':
      case 'ring':
        this.vx *= 0.94;
        this.vy *= 0.94;
        this.size = this.maxSize * lifeRatio;
        break;

      case 'pollen':
        this.vy -= 0.28 + Math.random() * 0.18; // Drifts upward
        this.vx += Math.sin(this.life * this.wobbleSpeed) * 0.24;
        this.size = this.maxSize * lifeRatio;
        break;

      case 'dust':
        this.vx += (Math.random() - 0.5) * 0.04 + wind * 0.01;
        this.vy += (Math.random() - 0.5) * 0.04 - 0.08; // Slow upward float
        this.vx *= 0.97;
        this.vy *= 0.97;
        this.size = this.maxSize * (0.8 + 0.2 * Math.sin(this.life * 0.04));
        break;

      case 'charge':
        this.vx *= 0.98;
        this.vy *= 0.98;
        this.size = this.maxSize * (1.0 - lifeRatio * 0.4);
        break;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.vRotation;

    if (this.life <= 0) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;

    ctx.save();
    ctx.globalAlpha = this.alpha;

    if (this.type === 'sparkle' || this.type === 'ring') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.size);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.35, `hsla(${this.hue}, 100%, 82%, 1)`);
      grad.addColorStop(1, `hsla(${this.hue}, 100%, 50%, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      // Draw 4 point star path
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.moveTo(0, 0);
        ctx.lineTo(this.size, 0);
        ctx.lineTo(0, this.size * 0.16);
        ctx.lineTo(0, 0);
      }
      ctx.fill();

    } else if (this.type === 'pollen') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.45, '#ffd54f'); // golden yellow
      grad.addColorStop(1, 'rgba(255, 213, 79, 0)');
      ctx.fillStyle = grad;
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'dust') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
      grad.addColorStop(0, `hsla(${this.hue}, 100%, 90%, 0.12)`);
      grad.addColorStop(0.55, `hsla(${this.hue}, 90%, 75%, 0.04)`);
      grad.addColorStop(1, `hsla(${this.hue}, 90%, 75%, 0)`);
      ctx.fillStyle = grad;
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'charge') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.35, `hsla(${this.hue}, 100%, 80%, 0.4)`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'butterfly') {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      const wingFlap = Math.abs(Math.sin(performance.now() * 0.025 + this.x * 0.1)) * 0.85 + 0.15;
      const activeColor = `hsl(${this.hue}, 95%, 72%)`;
      const darkColor = `hsl(${this.hue}, 95%, 45%)`;

      ctx.fillStyle = activeColor;
      ctx.strokeStyle = darkColor;
      ctx.lineWidth = 1;

      // Left Wing
      ctx.save();
      ctx.scale(wingFlap, 1);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-this.size * 1.2, -this.size * 0.8, -this.size * 0.8, -this.size * 1.5, 0, -this.size * 0.3);
      ctx.bezierCurveTo(-this.size * 0.8, 0, -this.size * 1.0, this.size * 0.8, 0, 0);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Right Wing
      ctx.save();
      ctx.scale(-wingFlap, 1);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-this.size * 1.2, -this.size * 0.8, -this.size * 0.8, -this.size * 1.5, 0, -this.size * 0.3);
      ctx.bezierCurveTo(-this.size * 0.8, 0, -this.size * 1.0, this.size * 0.8, 0, 0);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Butterfly Body
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, -this.size * 0.2, 1.2, this.size * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

    } else {
      // Petal shape
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      const gradient = ctx.createLinearGradient(0, -this.size * 0.5, 0, this.size * 0.5);
      gradient.addColorStop(0, `hsl(${this.hue}, 100%, 88%)`);
      gradient.addColorStop(1, `hsl(${(this.hue - 20 + 360) % 360}, 90%, 65%)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, -this.size * 0.5);
      ctx.quadraticCurveTo(-this.size * 0.35, 0, 0, this.size * 0.5);
      ctx.quadraticCurveTo(this.size * 0.35, 0, 0, -this.size * 0.5);
      ctx.fill();
    }

    ctx.restore();
  }
}

class ParticleEngine {
  constructor(size = 1200) {
    this.pool = Array.from({ length: size }, () => new Particle());
    this.nextIndex = 0;
  }

  spawn(x, y, vx, vy, size, life, type, hue) {
    const len = this.pool.length;
    let count = 0;
    while (count < len) {
      const p = this.pool[this.nextIndex];
      this.nextIndex = (this.nextIndex + 1) % len;
      if (!p.active) {
        p.spawn(x, y, vx, vy, size, life, type, hue);
        return p;
      }
      count++;
    }

    // Override oldest active
    const p = this.pool[this.nextIndex];
    this.nextIndex = (this.nextIndex + 1) % len;
    p.spawn(x, y, vx, vy, size, life, type, hue);
    return p;
  }

  update(gravity, wind) {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        this.pool[i].update(gravity, wind);
      }
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.pool.length; i++) {
      if (this.pool[i].active) {
        this.pool[i].draw(ctx);
      }
    }
  }

  clear() {
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].active = false;
    }
  }
}

// --- 5. HEURISTIC GESTURE RECOGNIZER ---
class GestureRecognizer {
  static recognize(landmarks) {
    if (!landmarks || landmarks.length < 21) return 'none';

    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
    const scale = dist(landmarks[0], landmarks[9]); // Wrist to middle knuckle knuckle-scale reference
    if (scale === 0) return 'none';

    // Ratios of tips to wrist relative to scale
    const thumbRatio = dist(landmarks[4], landmarks[2]) / scale;
    const indexRatio = dist(landmarks[8], landmarks[0]) / scale;
    const middleRatio = dist(landmarks[12], landmarks[0]) / scale;
    const ringRatio = dist(landmarks[16], landmarks[0]) / scale;
    const pinkyRatio = dist(landmarks[20], landmarks[0]) / scale;

    // Extension thresholds
    const isThumbExt = thumbRatio > 0.85;
    const isIndexExt = indexRatio > 1.45;
    const isMiddleExt = middleRatio > 1.45;
    const isRingExt = ringRatio > 1.35;
    const isPinkyExt = pinkyRatio > 1.3;

    // Checks directional finger straightness (knuckle reference alignment)
    const isIndexStraight = dist(landmarks[8], landmarks[0]) > dist(landmarks[6], landmarks[0]);
    const isMiddleStraight = dist(landmarks[12], landmarks[0]) > dist(landmarks[10], landmarks[0]);
    const isRingStraight = dist(landmarks[16], landmarks[0]) > dist(landmarks[14], landmarks[0]);
    const isPinkyStraight = dist(landmarks[20], landmarks[0]) > dist(landmarks[18], landmarks[0]);
    const isThumbStraight = dist(landmarks[4], landmarks[0]) > dist(landmarks[2], landmarks[0]);

    // A. Fist
    if (!isIndexStraight && !isMiddleStraight && !isRingStraight && !isPinkyStraight) {
      return 'fist';
    }

    const indexThumbDist = dist(landmarks[4], landmarks[8]) / scale;

    // B. Pinch
    if (indexThumbDist < 0.28 && !isMiddleStraight && !isRingStraight && !isPinkyStraight) {
      return 'pinch';
    }

    // C. OK Sign
    if (indexThumbDist < 0.28 && isMiddleStraight && isRingStraight && isPinkyStraight) {
      return 'ok';
    }

    // D. Peace Sign
    if (isIndexStraight && isMiddleStraight && !isRingStraight && !isPinkyStraight) {
      return 'peace';
    }

    // E. Thumbs Up
    if (isThumbExt && !isIndexStraight && !isMiddleStraight && !isRingStraight && !isPinkyStraight) {
      if (landmarks[4].y < landmarks[3].y && landmarks[3].y < landmarks[2].y) {
        return 'thumbsup';
      }
    }

    // F. Spread Fingers vs Open Palm
    if (isIndexStraight && isMiddleStraight && isRingStraight && isPinkyStraight) {
      const indexPinkyDist = dist(landmarks[8], landmarks[20]) / scale;
      if (indexPinkyDist > 1.7) {
        return 'spread';
      }
      return 'palm';
    }

    return 'none';
  }

  static detectTwoHandHeart(leftLms, rightLms) {
    if (!leftLms || !rightLms) return 'none';

    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
    const scale = (dist(leftLms[0], leftLms[9]) + dist(rightLms[0], rightLms[9])) / 2;
    if (scale === 0) return 'none';

    const indexTipsDist = dist(leftLms[8], rightLms[8]) / scale;
    const thumbTipsDist = dist(leftLms[4], rightLms[4]) / scale;

    // Heart is formed when index tips and thumb tips are locked close to one another
    if (indexTipsDist < 0.65 && thumbTipsDist < 0.65) {
      return 'heart';
    }

    return 'none';
  }
}

// --- 6. USER INTERFACE MANAGER ---
class UIManager {
  constructor(app) {
    this.app = app;
    this.toast = document.getElementById('gesture-toast');
    this.toastTimeout = null;

    this.bindEvents();
    this.syncSlidersWithState();
    // Start minimized by default
    this.minimizeFlowerSelector();
  }

  bindEvents() {
    // Guide panel trigger (new floating panel)
    document.getElementById('btn-trigger-guide').addEventListener('click', () => {
      const panel = document.getElementById('gesture-guide-panel');
      const settings = document.getElementById('settings-drawer');
      panel.classList.toggle('guide-open');
      settings.classList.remove('open');
      this.minimizeFlowerSelector();
    });

    document.getElementById('btn-trigger-settings').addEventListener('click', () => {
      document.getElementById('settings-drawer').classList.add('open');
      document.getElementById('gesture-guide-panel').classList.remove('guide-open');
      this.minimizeFlowerSelector();
    });

    document.getElementById('btn-close-guide').addEventListener('click', () => {
      document.getElementById('gesture-guide-panel').classList.remove('guide-open');
    });

    document.getElementById('btn-close-settings').addEventListener('click', () => {
      document.getElementById('settings-drawer').classList.remove('open');
    });

    // Close panels/drawers when clicking outside
    document.addEventListener('mousedown', (e) => {
      const guidePanel = document.getElementById('gesture-guide-panel');
      const settings = document.getElementById('settings-drawer');
      const topBar = document.getElementById('top-action-bar');
      const botBar = document.getElementById('flower-selector-container');
      const cameraDropdownContainer = document.getElementById('camera-dropdown-container');
      const cameraDropdownList = document.getElementById('camera-dropdown-list');
      const openSelectorBtn = document.getElementById('btn-open-flower-selector');
      const debugTracker = document.getElementById('debug-tracker');

      if (cameraDropdownList && cameraDropdownContainer && !cameraDropdownContainer.contains(e.target)) {
        cameraDropdownList.classList.remove('show');
      }

      if (!guidePanel.contains(e.target) && !settings.contains(e.target) &&
        !topBar.contains(e.target) && !botBar.contains(e.target) &&
        !e.target.classList.contains('btn-preset-opt') &&
        (!openSelectorBtn || !openSelectorBtn.contains(e.target)) &&
        (!debugTracker || !debugTracker.contains(e.target))) {
        guidePanel.classList.remove('guide-open');
        settings.classList.remove('open');
        this.minimizeFlowerSelector();
      }
    });

    // Preset options clicks
    const presetBtns = document.querySelectorAll('.btn-preset-opt');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.target.getAttribute('data-preset');
        this.app.performanceMonitor.setMode(mode);
        saveSettingsToLocalStorage();
      });
    });

    // Open flower selector button click
    const openSelectorBtn = document.getElementById('btn-open-flower-selector');
    if (openSelectorBtn) {
      openSelectorBtn.addEventListener('click', () => {
        this.maximizeFlowerSelector();
      });
    }

    // Horizontal Carousel click events
    const carouselItems = document.querySelectorAll('.flower-item');
    carouselItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const target = e.currentTarget;
        carouselItems.forEach(i => i.classList.remove('active'));
        target.classList.add('active');

        const type = target.getAttribute('data-type');
        STATE.flowerStyle = type;

        // Update floating open button icon
        const openSelectorBtn = document.getElementById('btn-open-flower-selector');
        if (openSelectorBtn) {
          const iconEl = target.querySelector('.flower-item-icon');
          if (iconEl) openSelectorBtn.textContent = iconEl.textContent;
        }

        // Trigger bloom audio chime and sparkle splash on select
        this.app.soundSynth.playBloom();
        this.showGestureToast(`Selected: ${type.toUpperCase()}`);
        saveSettingsToLocalStorage();

        // Auto-minimize after a flower is selected (about 1 second)
        setTimeout(() => {
          this.minimizeFlowerSelector();
        }, 1000);
      });
    });

    // Control slider inputs
    this.setupSlider('flower-size', 'val-flower-size', 'px', (val) => STATE.flowerSize = parseInt(val));
    this.setupSlider('particle-rate', 'val-particle-rate', '', (val) => STATE.particleRate = parseInt(val));
    this.setupSlider('trail-length', 'val-trail-length', '', (val) => STATE.trailLength = parseInt(val));
    this.setupSlider('glow-amount', 'val-glow-amount', '%', (val) => STATE.glowAmount = parseInt(val));
    this.setupSlider('particle-gravity', 'val-particle-gravity', '', (val) => STATE.particleGravity = parseFloat(val));
    this.setupSlider('detection-confidence', 'val-detection-confidence', '', (val) => {
      STATE.detectionConfidence = parseFloat(val);
      this.app.updateTrackerConfidence(parseFloat(val));
    });

    // Toggle switch inputs
    this.setupToggle('toggle-random-mode', (checked) => {
      STATE.randomMode = checked;
      if (checked) {
        this.app.randomizeAllActiveHandFlowers();
      }
    });
    this.setupToggle('toggle-particles', (checked) => STATE.particlesEnabled = checked);
    this.setupToggle('toggle-trails', (checked) => STATE.trailsEnabled = checked);
    this.setupToggle('toggle-glow', (checked) => STATE.toggleGlow = checked);
    this.setupToggle('toggle-ambient', (checked) => STATE.ambientEnabled = checked);
    this.setupToggle('toggle-debug', (checked) => STATE.toggleDebug = checked);

    this.setupToggle('toggle-fps', (checked) => {
      STATE.toggleFps = checked;
      const dbg = document.getElementById('debug-tracker');
      if (dbg) dbg.style.display = checked ? '' : 'none';
    });

    this.setupToggle('toggle-throttle', (checked) => STATE.autoThrottle = checked);

    // Audio toggling
    document.getElementById('btn-audio-toggle').addEventListener('click', () => {
      this.app.soundSynth.muted = !this.app.soundSynth.muted;
      document.getElementById('audio-icon').textContent = this.app.soundSynth.muted ? '🔇' : '🔊';
      saveSettingsToLocalStorage();
      if (!this.app.soundSynth.muted) {
        this.app.soundSynth.playSparkle();
        this.showGestureToast("Audio Unmuted");
      }
    });

    // Photo Snapshot triggers
    document.getElementById('btn-ui-snapshot').addEventListener('click', () => this.app.takeSnapshot());
    // Camera toggle button click triggers dropdown display
    document.getElementById('btn-camera-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      const listEl = document.getElementById('camera-dropdown-list');
      if (listEl) {
        listEl.classList.toggle('show');
      }
    });
    document.getElementById('btn-reset-settings').addEventListener('click', () => this.resetToDefaults());
    // --- Debug Tracker: Toggle expand/collapse ---
    const debugTracker = document.getElementById('debug-tracker');
    const debugToggleBtn = document.getElementById('debug-toggle-btn');
    const debugBody = document.getElementById('debug-body');

    if (debugTracker) {
      // Force minimized by default on boot
      debugTracker.classList.remove('debug-expanded');
      if (debugToggleBtn) {
        debugToggleBtn.textContent = '⤢';
      }
      if (debugBody) {
        debugBody.style.display = 'none';
      }

      const togglePanel = (e) => {
        if (debugTracker.dataset.wasDragged === 'true') {
          debugTracker.dataset.wasDragged = 'false';
          return;
        }
        e.stopPropagation();

        const isExpanded = debugTracker.classList.contains('debug-expanded');
        if (isExpanded) {
          debugTracker.classList.remove('debug-expanded');
          if (debugToggleBtn) debugToggleBtn.textContent = '⤢';
          setTimeout(() => {
            if (!debugTracker.classList.contains('debug-expanded') && debugBody) {
              debugBody.style.display = 'none';
            }
          }, 350);
        } else {
          if (debugBody) {
            debugBody.style.display = 'block';
            debugBody.offsetHeight; // force reflow
          }
          debugTracker.classList.add('debug-expanded');
          if (debugToggleBtn) debugToggleBtn.textContent = '⤡';
        }
      };

      const debugHeader = document.getElementById('debug-header');
      if (debugHeader) {
        debugHeader.addEventListener('click', togglePanel);
      }
    }

    // --- Debug Tracker: Draggable (with viewport constraints and touch support) ---
    if (debugTracker) {
      let dragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;
      let hasDragged = false;
      const savedPos = sessionStorage.getItem('debugTrackerPos');
      if (savedPos) {
        const p = JSON.parse(savedPos);
        debugTracker.style.left = p.left;
        debugTracker.style.top = p.top;
        debugTracker.style.right = 'auto';
      }

      const dragStart = (clientX, clientY) => {
        dragging = true;
        hasDragged = false;
        startX = clientX;
        startY = clientY;
        const rect = debugTracker.getBoundingClientRect();
        origLeft = rect.left;
        origTop = rect.top;
        debugTracker.style.transition = 'none';
      };

      const dragMove = (clientX, clientY) => {
        if (!dragging) return;
        const dx = clientX - startX;
        const dy = clientY - startY;
        if (Math.hypot(dx, dy) > 5) {
          hasDragged = true;
        }
        const nx = origLeft + dx;
        const ny = origTop + dy;
        const maxX = window.innerWidth - debugTracker.offsetWidth;
        const maxY = window.innerHeight - debugTracker.offsetHeight;
        debugTracker.style.left = Math.min(Math.max(0, nx), maxX) + 'px';
        debugTracker.style.top = Math.min(Math.max(0, ny), maxY) + 'px';
        debugTracker.style.right = 'auto';
      };

      const dragEnd = () => {
        if (dragging) {
          dragging = false;
          debugTracker.style.transition = '';
          sessionStorage.setItem('debugTrackerPos', JSON.stringify({ left: debugTracker.style.left, top: debugTracker.style.top }));
          debugTracker.dataset.wasDragged = hasDragged ? 'true' : 'false';
        }
      };

      debugTracker.addEventListener('mousedown', (e) => {
        if (e.target === debugToggleBtn || e.target.closest('#debug-toggle-btn')) return;
        dragStart(e.clientX, e.clientY);
      });

      document.addEventListener('mousemove', (e) => {
        dragMove(e.clientX, e.clientY);
      });

      document.addEventListener('mouseup', () => {
        dragEnd();
      });

      // Touch events support for mobile devices
      debugTracker.addEventListener('touchstart', (e) => {
        if (e.target === debugToggleBtn || e.target.closest('#debug-toggle-btn')) return;
        const touch = e.touches[0];
        dragStart(touch.clientX, touch.clientY);
      }, { passive: true });

      document.addEventListener('touchmove', (e) => {
        if (!dragging) return;
        const touch = e.touches[0];
        dragMove(touch.clientX, touch.clientY);
      }, { passive: true });

      document.addEventListener('touchend', () => {
        dragEnd();
      });
    }
  }

  setupSlider(id, valId, suffix, callback) {
    const slider = document.getElementById(id);
    const label = document.getElementById(valId);
    slider.addEventListener('input', (e) => {
      const v = e.target.value;
      label.textContent = v + suffix;
      callback(v);
      saveSettingsToLocalStorage();
    });
  }

  setupToggle(id, callback) {
    const toggle = document.getElementById(id);
    toggle.addEventListener('change', (e) => {
      callback(e.target.checked);
      saveSettingsToLocalStorage();
    });
  }

  syncSlidersWithState() {
    this.setSlider('flower-size', 'val-flower-size', STATE.flowerSize, 'px');
    this.setSlider('particle-rate', 'val-particle-rate', STATE.particleRate, '');
    this.setSlider('trail-length', 'val-trail-length', STATE.trailLength, '');
    this.setSlider('glow-amount', 'val-glow-amount', STATE.glowAmount, '%');
    this.setSlider('particle-gravity', 'val-particle-gravity', STATE.particleGravity, '');
    this.setSlider('detection-confidence', 'val-detection-confidence', STATE.detectionConfidence, '');

    document.getElementById('toggle-random-mode').checked = STATE.randomMode;
    document.getElementById('toggle-particles').checked = STATE.particlesEnabled;
    document.getElementById('toggle-trails').checked = STATE.trailsEnabled;
    document.getElementById('toggle-glow').checked = STATE.toggleGlow;
    document.getElementById('toggle-ambient').checked = STATE.ambientEnabled;
    document.getElementById('toggle-debug').checked = STATE.toggleDebug;
    document.getElementById('toggle-fps').checked = STATE.toggleFps;
    document.getElementById('toggle-throttle').checked = STATE.autoThrottle;

    const dbgEl = document.getElementById('debug-tracker');
    if (dbgEl) dbgEl.style.display = STATE.toggleFps ? '' : 'none';

    // Sync flower carousel selection
    const carouselItems = document.querySelectorAll('.flower-item');
    carouselItems.forEach(item => {
      if (item.getAttribute('data-type') === STATE.flowerStyle) {
        item.classList.add('active');
        // Update floating open button icon too
        const openBtn = document.getElementById('btn-open-flower-selector');
        if (openBtn) {
          const iconEl = item.querySelector('.flower-item-icon');
          if (iconEl) openBtn.textContent = iconEl.textContent;
        }
      } else {
        item.classList.remove('active');
      }
    });

    // Update preset buttons visual active state
    const presetBtns = document.querySelectorAll('.btn-preset-opt');
    presetBtns.forEach(btn => {
      if (btn.getAttribute('data-preset') === this.app.performanceMonitor.mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  setSlider(id, valId, val, suffix) {
    const slider = document.getElementById(id);
    const label = document.getElementById(valId);
    if (slider && label) {
      slider.value = val;
      label.textContent = val + suffix;
    }
  }

  resetToDefaults() {
    STATE.flowerStyle = 'cherry';
    STATE.flowerSize = 22;
    STATE.particleRate = 2;
    STATE.trailLength = 8;
    STATE.glowAmount = 25;
    STATE.particleGravity = -0.03;
    STATE.detectionConfidence = 0.70;
    this.app.updateTrackerConfidence(0.70);
    STATE.randomMode = false;
    STATE.particlesEnabled = true;
    STATE.trailsEnabled = true;
    STATE.toggleGlow = true;
    STATE.ambientEnabled = true;
    STATE.toggleDebug = false;
    STATE.toggleFps = true;
    STATE.autoThrottle = true;

    this.app.performanceMonitor.mode = 'quality';
    this.syncSlidersWithState();
    this.app.particlePool.clear();
    saveSettingsToLocalStorage();

    this.showGestureToast("Settings Reset");
  }

  minimizeFlowerSelector() {
    const container = document.getElementById('flower-selector-container');
    const openBtn = document.getElementById('btn-open-flower-selector');
    if (container && openBtn) {
      container.classList.add('minimized');
      openBtn.style.display = 'flex';
    }
  }

  maximizeFlowerSelector() {
    const container = document.getElementById('flower-selector-container');
    const openBtn = document.getElementById('btn-open-flower-selector');
    if (container && openBtn) {
      container.classList.remove('minimized');
      openBtn.style.display = 'none';
    }
  }

  showGestureToast(text) {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toast.textContent = text;
    this.toast.classList.add('show');
    this.toastTimeout = setTimeout(() => {
      this.toast.classList.remove('show');
    }, 2000);
  }

  updateFPS(fps) {
    // Update both the debug header fps-val spans
    document.querySelectorAll('#fps-val').forEach(el => el.textContent = fps);
    // Update expanded debug rows too
    const dbgFps = document.getElementById('dbg-fps');
    if (dbgFps) dbgFps.textContent = fps;
  }

  updateDebugTracker(app, frameDelta) {
    const tracker = document.getElementById('debug-tracker');
    if (!tracker || !tracker.classList.contains('debug-expanded')) return;

    const hands = app.activeHandsThisFrame ? app.activeHandsThisFrame.size : 0;
    const gestureL = app.gesturesThisFrame ? (app.gesturesThisFrame.Left || 'none') : 'none';
    const gestureR = app.gesturesThisFrame ? (app.gesturesThisFrame.Right || 'none') : 'none';
    const particles = app.particlePool ? app.particlePool.pool.filter(p => p.active).length : 0;
    const heartPhase = app.animationController ? (app.animationController.heartPhase || 'none') : 'none';

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('dbg-hands', hands);
    set('dbg-gesture-l', gestureL);
    set('dbg-gesture-r', gestureR);
    set('dbg-particles', particles);
    set('dbg-framedelta', Math.round(frameDelta) + 'ms');
    set('dbg-heart', heartPhase);
  }

  renderCameraDropdownList() {
    const listEl = document.getElementById('camera-dropdown-list');
    if (!listEl) return;

    listEl.innerHTML = '';

    this.app.videoDevices.forEach((device, index) => {
      const btn = document.createElement('button');
      btn.className = 'dropdown-item';
      if (this.app.selectedDeviceId === device.deviceId) {
        btn.classList.add('active');
      }

      let name = device.label || `Camera ${index + 1}`;
      name = name.replace(/\([0-9a-f]{4}:[0-9a-f]{4}\)/i, '').trim();

      const isFront = name.toLowerCase().includes('front') || name.toLowerCase().includes('selfie') || name.toLowerCase().includes('user');
      const emoji = isFront ? '🤳' : '📷';

      btn.innerHTML = `<span>${emoji}</span> <span>${name}</span>`;
      btn.addEventListener('click', () => {
        listEl.classList.remove('show');
        if (this.app.selectedDeviceId !== device.deviceId) {
          this.app.switchCamera(device.deviceId);
        }
      });
      listEl.appendChild(btn);
    });
  }
}

// --- 7. TRANSITION ANIMATION CONTROLLER ---
class AnimationController {
  constructor() {
    this.fingerScales = {};
    // OK Ring opacities transition state
    this.okRingOpacity = { Left: 0, Right: 0 };
    // Thumbs Up Giant flower scale transition state
    this.thumbsUpScale = { Left: 0, Right: 0 };
    // Pinch particles scale transition state
    this.pinchScale = { Left: 0, Right: 0 };
    // Fist closed energy gather parameters
    this.fistChargeLevel = { Left: 0, Right: 0 };

    // --- NEW INTERACTIVE ECOSYSTEM STATES ---
    this.thumbsUpPhase = { Left: 'none', Right: 'none' };
    this.thumbsUpTimer = { Left: 0, Right: 0 };

    this.okPhase = { Left: 'none', Right: 'none' };
    this.okTimer = { Left: 0, Right: 0 };

    this.heartPhase = 'none';
    this.heartTimer = 0;
    this.heartConfidence = 0;
    this.heartElements = [];
    this.heartGestureActive = false;
    this.smoothedHeartCenter = { x: 0, y: 0, inited: false };
    this.smoothedHeartScale = 0;
    this.smoothedHeartSize = 0;

    this.flowerPositions = {
      Left: Array.from({ length: 5 }, () => ({ x: 0, y: 0, inited: false })),
      Right: Array.from({ length: 5 }, () => ({ x: 0, y: 0, inited: false }))
    };

    this.flowerScales = {
      Left: [0, 0, 0, 0, 0],
      Right: [0, 0, 0, 0, 0]
    };
  }

  initializeHeartElements() {
    this.heartElements = [];

    const flowerStyles = ['cherry', 'rose', 'daisy', 'sunflower', 'tulip', 'lotus', 'lavender', 'hibiscus'];
    const totalElements = 120; // lush but performant

    for (let i = 0; i < totalElements; i++) {
      const theta = (i / totalElements) * Math.PI * 2;

      // Outer outline vs inner filling
      const isFill = Math.random() < 0.35;
      const scaleFactor = isFill ? (0.35 + Math.random() * 0.5) : (0.95 + (Math.random() - 0.5) * 0.08);

      const randType = Math.random();
      let type = 'flower';
      if (randType < 0.45) {
        type = 'flower';
      } else if (randType < 0.75) {
        type = 'leaf';
      } else if (randType < 0.90) {
        type = 'vine_segment';
      } else {
        type = 'petal';
      }

      const flowerStyle = flowerStyles[Math.floor(Math.random() * flowerStyles.length)];
      const sizeMultiplier = (isFill ? 0.35 : 0.6) + Math.random() * 0.35;
      const fingerIdx = Math.floor(Math.random() * 5);
      const baseHue = FLOWER_HUES[flowerStyle] || 340;

      const hx_base = 16 * Math.pow(Math.sin(theta), 3);
      const hy_base = -(13 * Math.cos(theta) - 5 * Math.cos(2 * theta) - 2 * Math.cos(3 * theta) - Math.cos(4 * theta));

      this.heartElements.push({
        theta: theta,
        hx_base: hx_base,
        hy_base: hy_base,
        type: type,
        flowerStyle: flowerStyle,
        scaleFactor: scaleFactor,
        sizeMultiplier: sizeMultiplier,
        fingerIdx: fingerIdx,
        angle: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.04,
        phaseOffset: Math.random() * Math.PI * 2,
        baseHue: baseHue,
        x: 0,
        y: 0
      });
    }
  }

  getFatimaPoint(letterIdx, pointIdx) {
    let x = 0;
    let y = 0;

    switch (letterIdx) {
      case 0: // F
        if (pointIdx < 10) {
          // Vertical stem: from (0, -2.0) to (0, 2.0)
          const ratio = pointIdx / 9;
          x = 0;
          y = -2.0 + 4.0 * ratio;
        } else if (pointIdx < 16) {
          // Top bar: from (0, -2.0) to (1.8, -2.0)
          const ratio = (pointIdx - 10) / 5;
          x = 1.8 * ratio;
          y = -2.0;
        } else {
          // Mid bar: from (0, -0.2) to (1.3, -0.2)
          const ratio = (pointIdx - 16) / 3;
          x = 1.3 * ratio;
          y = -0.2;
        }
        x -= 0.5;
        break;

      case 1: // a
        if (pointIdx < 12) {
          const angle = (pointIdx / 11) * Math.PI * 2;
          x = 0.8 + Math.cos(angle) * 0.9;
          y = 0.8 + Math.sin(angle) * 0.9;
        } else {
          const ratio = (pointIdx - 12) / 7;
          x = 1.7;
          y = 0 + 1.7 * ratio;
        }
        x -= 0.85;
        break;

      case 2: // t
        if (pointIdx < 10) {
          const ratio = pointIdx / 9;
          x = 0.6;
          y = -1.8 + 3.2 * ratio;
        } else if (pointIdx < 16) {
          const ratio = (pointIdx - 10) / 5;
          x = -0.2 + 1.6 * ratio;
          y = -0.8;
        } else {
          const ratio = (pointIdx - 16) / 3;
          x = 0.6 + 0.6 * ratio;
          y = 1.4 + 0.3 * ratio;
        }
        x -= 0.6;
        break;

      case 3: // i
        if (pointIdx < 16) {
          const ratio = pointIdx / 15;
          x = 0;
          y = -0.3 + 2.0 * ratio;
        } else {
          const detOffset = (pointIdx % 4) / 4 * Math.PI * 2;
          x = Math.cos(detOffset) * 0.08;
          y = -1.4 + Math.sin(detOffset) * 0.08;
        }
        break;

      case 4: // m
        if (pointIdx < 6) {
          const ratio = pointIdx / 5;
          x = 0;
          y = 0 + 1.7 * ratio;
        } else if (pointIdx < 13) {
          const ratio = (pointIdx - 6) / 6;
          const angle = Math.PI + ratio * Math.PI;
          x = 0.65 + Math.cos(angle) * 0.65;
          y = 0.65 + Math.sin(angle) * 1.05;
        } else {
          const ratio = (pointIdx - 13) / 6;
          const angle = Math.PI + ratio * Math.PI;
          x = 1.95 + Math.cos(angle) * 0.65;
          y = 0.65 + Math.sin(angle) * 1.05;
        }
        x -= 1.3;
        break;

      case 5: // a
        if (pointIdx < 12) {
          const angle = (pointIdx / 11) * Math.PI * 2;
          x = 0.8 + Math.cos(angle) * 0.9;
          y = 0.8 + Math.sin(angle) * 0.9;
        } else {
          const ratio = (pointIdx - 12) / 7;
          x = 1.7;
          y = 0 + 1.7 * ratio;
        }
        x -= 0.85;
        break;
    }

    return { x, y };
  }

  update(activeHands, gestures, smoothedLandmarks, getCanvasCoords, timestamp) {
    const handKeys = ['Left', 'Right'];
    const tipIndexMap = [4, 8, 12, 16, 20];

    // Check Two Hand Heart configuration
    let twoHandHeart = false;
    if (activeHands.has('Left') && activeHands.has('Right') &&
      gestures.Left === 'heart' && gestures.Right === 'heart') {
      twoHandHeart = true;
    }

    if (this.heartConfidence === undefined) this.heartConfidence = 0;
    if (twoHandHeart) {
      this.heartConfidence = Math.min(1.0, this.heartConfidence + 0.05); // Stable trigger after ~20 frames
    } else {
      this.heartConfidence = Math.max(0.0, this.heartConfidence - 0.08);
    }

    const isHeartStable = this.heartConfidence > 0.8;

    if (isHeartStable) {
      if (!this.heartGestureActive) {
        this.heartGestureActive = true;
        this.heartPhase = 'travel';
        this.heartTimer = timestamp;
        this.initializeHeartElements();
      }
    } else {
      if (this.heartGestureActive) {
        this.heartGestureActive = false;
        if (this.heartPhase === 'surprise_ended') {
          this.heartPhase = 'none';
          this.heartElements = [];
        } else {
          this.heartPhase = 'dissolve';
          this.heartTimer = timestamp;
        }
      }
    }

    // Heart State machine
    if (this.heartPhase !== 'none') {
      const elapsed = timestamp - this.heartTimer;
      if (this.heartPhase === 'travel') {
        if (elapsed > 1200) {
          this.heartPhase = 'bloom_heart';
          this.heartTimer = timestamp;
        }
      } else if (this.heartPhase === 'bloom_heart') {
        if (elapsed > 1000) {
          this.heartPhase = 'surprise_fly';
          this.heartTimer = timestamp;
        }
      } else if (this.heartPhase === 'surprise_fly') {
        if (elapsed > 1400) {
          this.heartPhase = 'surprise_bloom';
          this.heartTimer = timestamp;
        }
      } else if (this.heartPhase === 'surprise_bloom') {
        if (elapsed > 3500) {
          this.heartPhase = 'surprise_dissolve';
          this.heartTimer = timestamp;
        }
      } else if (this.heartPhase === 'surprise_dissolve') {
        if (elapsed > 1200) {
          this.heartPhase = 'surprise_ended';
          this.heartTimer = timestamp;
          this.heartElements = [];
        }
      } else if (this.heartPhase === 'dissolve') {
        if (elapsed > 1000) {
          this.heartPhase = 'none';
          this.heartElements = [];
        }
      }
    }

    // Smoothly update heart center, scale, and size
    const hasLeft = activeHands.has('Left');
    const hasRight = activeHands.has('Right');
    if (hasLeft && hasRight && smoothedLandmarks.Left && smoothedLandmarks.Right) {
      const leftPalm = getCanvasCoords(smoothedLandmarks.Left[9]);
      const rightPalm = getCanvasCoords(smoothedLandmarks.Right[9]);
      const targetCenter = { x: (leftPalm.x + rightPalm.x) / 2, y: (leftPalm.y + rightPalm.y) / 2 };

      const wristDist = (Math.hypot(smoothedLandmarks.Left[0].x - smoothedLandmarks.Left[9].x, smoothedLandmarks.Left[0].y - smoothedLandmarks.Left[9].y) +
        Math.hypot(smoothedLandmarks.Right[0].x - smoothedLandmarks.Right[9].x, smoothedLandmarks.Right[0].y - smoothedLandmarks.Right[9].y)) / 2;
      const targetScale = wristDist * 500;
      const targetHeartSize = Math.max(targetScale * 2.8, Math.abs(leftPalm.x - rightPalm.x) * 1.15);

      if (!this.smoothedHeartCenter.inited) {
        this.smoothedHeartCenter.x = targetCenter.x;
        this.smoothedHeartCenter.y = targetCenter.y;
        this.smoothedHeartCenter.inited = true;
        this.smoothedHeartScale = targetScale;
        this.smoothedHeartSize = targetHeartSize;
      } else {
        this.smoothedHeartCenter.x += (targetCenter.x - this.smoothedHeartCenter.x) * 0.15;
        this.smoothedHeartCenter.y += (targetCenter.y - this.smoothedHeartCenter.y) * 0.15;
        this.smoothedHeartScale += (targetScale - this.smoothedHeartScale) * 0.15;
        this.smoothedHeartSize += (targetHeartSize - this.smoothedHeartSize) * 0.15;
      }
    }

    handKeys.forEach(handKey => {
      const active = activeHands.has(handKey);
      let gesture = gestures[handKey] || 'none';
      const lms = smoothedLandmarks[handKey];

      if (twoHandHeart) gesture = 'heart';

      // 1. OK Ring transition
      if (active && gesture === 'ok') {
        this.okRingOpacity[handKey] += (1.0 - this.okRingOpacity[handKey]) * 0.12;
      } else {
        this.okRingOpacity[handKey] += (0.0 - this.okRingOpacity[handKey]) * 0.18;
      }

      // 2. Thumbs Up Giant rose scale transition
      if (active && gesture === 'thumbsup') {
        this.thumbsUpScale[handKey] += (1.0 - this.thumbsUpScale[handKey]) * 0.1;
      } else {
        this.thumbsUpScale[handKey] += (0.0 - this.thumbsUpScale[handKey]) * 0.15;
      }

      // 3. Pinch Seed scaling transition
      if (active && gesture === 'pinch') {
        this.pinchScale[handKey] += (1.0 - this.pinchScale[handKey]) * 0.15;
      } else {
        this.pinchScale[handKey] += (0.0 - this.pinchScale[handKey]) * 0.2;
      }

      // 4. Fist charging core level transition
      if (active && gesture === 'fist') {
        this.fistChargeLevel[handKey] = Math.min(1.0, this.fistChargeLevel[handKey] + 0.015);
      } else {
        this.fistChargeLevel[handKey] = 0;
      }

      // 5. Individual finger scales grow/shrink transition
      for (let f = 0; f < 5; f++) {
        const key = `${handKey}_${f}`;
        if (this.fingerScales[key] === undefined) {
          this.fingerScales[key] = 0;
        }

        let shouldBloom = active;
        if (active) {
          if (gesture === 'peace' && f !== 1 && f !== 2) shouldBloom = false;
          if (gesture === 'thumbsup') shouldBloom = false;
          if (gesture === 'ok') shouldBloom = false;
          if (gesture === 'pinch') shouldBloom = false;
          if (gesture === 'fist') shouldBloom = false;
          // Keep fingertip flowers visible when forming a heart!
        }

        if (shouldBloom) {
          this.fingerScales[key] += (1.0 - this.fingerScales[key]) * 0.08; // slow organic growth
        } else {
          this.fingerScales[key] += (0.0 - this.fingerScales[key]) * 0.12; // fade out / dissolve
        }

        // Coordinate Interpolation
        if (active && lms && lms[tipIndexMap[f]]) {
          const rawTip = lms[tipIndexMap[f]];
          const realTipPos = getCanvasCoords(rawTip);
          const fPos = this.flowerPositions[handKey][f];

          if (!fPos.inited) {
            fPos.x = realTipPos.x;
            fPos.y = realTipPos.y;
            fPos.inited = true;
          }

          let targetX = realTipPos.x;
          let targetY = realTipPos.y;
          let flowerScale = this.fingerScales[key];

          const wristDist = Math.hypot(lms[0].x - lms[9].x, lms[0].y - lms[9].y);
          const scale = wristDist * 500;

          if (gesture === 'thumbsup') {
            targetX = realTipPos.x;
            targetY = realTipPos.y;
            flowerScale = 0;
          } else if (gesture === 'ok') {
            targetX = realTipPos.x;
            targetY = realTipPos.y;
            flowerScale = 0;
          }

          // Apply easing to flower coordinates
          fPos.x += (targetX - fPos.x) * 0.22;
          fPos.y += (targetY - fPos.y) * 0.22;
          this.flowerScales[handKey][f] = flowerScale;
        } else {
          this.flowerPositions[handKey][f].inited = false;
        }
      }
    });
  }

  getFingerScale(handLabel, fingerIdx) {
    const key = `${handLabel}_${fingerIdx}`;
    return this.fingerScales[key] || 0;
  }
}

// --- 8. CORE APPLICATION CONTROLLER ---
class FingerBloomApp {
  constructor() {
    this.video = document.getElementById('webcam');
    this.canvas = document.getElementById('ar-canvas');
    this.ctx = this.canvas.getContext('2d');

    // Dual-pass Bloom compositing layer
    this.offscreenCanvas = document.createElement('canvas');
    this.offCtx = this.offscreenCanvas.getContext('2d');

    // Boot Overlay Elements
    this.loadingOverlay = document.getElementById('loading-overlay');
    this.loadingStatus = document.getElementById('loading-status');
    this.loadingBar = document.getElementById('loading-bar');
    this.errorOverlay = document.getElementById('error-overlay');
    this.errorMessage = document.getElementById('error-message');
    this.btnRetry = document.getElementById('btn-retry');

    // Synthesizer, Managers, physics, and controllers
    FingerBloomApp.instance = this;
    this.soundSynth = new SoundSynth();
    this.particlePool = new ParticleEngine(1200);
    this.animationController = new AnimationController();
    this.performanceMonitor = new PerformanceMonitor(this);
    // Camera properties setup before loadSettingsFromLocalStorage
    this.facingMode = 'user';
    this.selectedDeviceId = '';
    this.videoDevices = [];

    loadSettingsFromLocalStorage();
    this.uiManager = new UIManager(this);
    this.windX = 0;
    this.windY = 0;
    this.handSpeeds = { Left: 0, Right: 0 };
    this.speedGlow = { Left: 1.0, Right: 1.0 };

    // Dynamic hand state caches
    this.activeHandsThisFrame = new Set();
    this.activeHandsLastFrame = new Set();
    this.gesturesThisFrame = { Left: 'none', Right: 'none' };
    this.prevGestures = { Left: 'none', Right: 'none' };
    this.gestureHistory = {
      Left: Array(8).fill('none'),
      Right: Array(8).fill('none')
    };
    this.stableGestures = { Left: 'none', Right: 'none' };

    // Per-finger flower styles for Random Flower Mode
    this.handFingerFlowers = {
      Left: ['cherry', 'cherry', 'cherry', 'cherry', 'cherry'],
      Right: ['cherry', 'cherry', 'cherry', 'cherry', 'cherry']
    };

    // Hand charged state tracker for fist release bursts
    this.handCharged = { Left: false, Right: false };

    // Coordinates history lists for fingertip tapered ribbons
    this.trails = {
      Left: Array.from({ length: 5 }, () => []),
      Right: Array.from({ length: 5 }, () => [])
    };

    // Velocity calculation caches
    this.lastFingerPos = {
      Left: Array.from({ length: 5 }, () => ({ x: 0, y: 0, inited: false })),
      Right: Array.from({ length: 5 }, () => ({ x: 0, y: 0, inited: false }))
    };

    // Landmark smoothing cache (Exponential Filter LERP)
    this.smoothedLandmarks = {
      Left: Array.from({ length: 21 }, () => ({ x: 0, y: 0, inited: false })),
      Right: Array.from({ length: 21 }, () => ({ x: 0, y: 0, inited: false }))
    };

    // Floating seeded flowers array (pinching result)
    this.floatingFlowers = [];

    // Hysteresis & tracking stabilization
    this.handCooldowns = { Left: 0, Right: 0 };
    this.handDetectionCount = { Left: 0, Right: 0 };
    this.lastSavedLandmarks = { Left: null, Right: null };
    this.lastSavedGestures = { Left: 'none', Right: 'none' };

    // MediaPipe tracking
    this.handsTracker = null;
    this.isTrackerReady = false;
    this.isCameraActive = false;
    this.currentRawLandmarks = [];

    // Bind event retry and resize triggers
    window.addEventListener('resize', () => this.resizeCanvas());
    this.btnRetry.addEventListener('click', () => {
      this.errorOverlay.style.display = 'none';
      this.loadingOverlay.style.opacity = '1';
      this.loadingOverlay.style.display = 'flex';
      this.bootSequence();
    });

    this.resizeCanvas();
  }

  resizeCanvas() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = w;
    this.canvas.height = h;
    this.offscreenCanvas.width = w;
    this.offscreenCanvas.height = h;
  }

  // --- AR COVER CODES ALIGNMENT ---
  // Maps a MediaPipe normalized landmark point to the horizontally mirrored cropped viewport
  getCanvasCoords(landmark) {
    const videoWidth = this.video.videoWidth;
    const videoHeight = this.video.videoHeight;
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    if (!videoWidth || !videoHeight) {
      return { x: landmark.x * canvasWidth, y: landmark.y * canvasHeight };
    }

    const videoAspect = videoWidth / videoHeight;
    const canvasAspect = canvasWidth / canvasHeight;

    let drawWidth, drawHeight;
    let sx, sy;

    // Aspect cover mapping math
    if (canvasAspect > videoAspect) {
      drawWidth = videoWidth;
      drawHeight = videoWidth / canvasAspect;
      sx = 0;
      sy = (videoHeight - drawHeight) / 2;
    } else {
      drawWidth = videoHeight * canvasAspect;
      drawHeight = videoHeight;
      sx = (videoWidth - drawWidth) / 2;
      sy = 0;
    }

    const rx = (landmark.x * videoWidth - sx) / drawWidth;
    const ry = (landmark.y * videoHeight - sy) / drawHeight;

    // Horizontally mirrored coordinate return
    return {
      x: (1 - rx) * canvasWidth,
      y: ry * canvasHeight
    };
  }

  // --- BOOT PROCESS SEQUENCE ---
  async initCamera() {
    this.updateLoaderStatus("Opening camera sensors...", 20);
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      // Auto-configure lower preset for mobile performance on initial boot
      if (isMobile && !this.mobileConfigured) {
        this.mobileConfigured = true;
        // Run performance preset by default on mobile devices
        setTimeout(() => this.performanceMonitor.setMode('performance'), 100);
      }

      // Build video constraints
      const videoConstraints = {
        width: isMobile ? { ideal: 640 } : { ideal: 1280 },
        height: isMobile ? { ideal: 480 } : { ideal: 720 }
      };

      if (this.selectedDeviceId) {
        videoConstraints.deviceId = { exact: this.selectedDeviceId };
      } else {
        videoConstraints.facingMode = this.facingMode;
      }

      const constraints = {
        video: videoConstraints,
        audio: false
      };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err) {
        console.warn("Failed to open camera with specified deviceId/facingMode constraints, trying default:", err);
        // Fallback constraint
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: isMobile ? { ideal: 640 } : { ideal: 1280 },
            height: isMobile ? { ideal: 480 } : { ideal: 720 },
            facingMode: 'user'
          },
          audio: false
        });
      }

      // If the stream is active, update the active facingMode / device ID
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        if (settings.deviceId) {
          this.selectedDeviceId = settings.deviceId;
        }
        if (settings.facingMode) {
          this.facingMode = settings.facingMode;
        }
        saveSettingsToLocalStorage();
      }

      this.video.srcObject = stream;

      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => resolve();
      });

      await this.video.play();
      this.isCameraActive = true;
      this.updateLoaderStatus("Camera ready. Loading tracker model...", 50);
    } catch (err) {
      console.error("Camera access failed:", err);
      this.showError("Camera sensor blocked or denied. Please grant webcam permissions to interact with Augmented Reality features.");
      throw err;
    }
  }

  async detectCameras() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        this.videoDevices = [];
        return;
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.videoDevices = devices.filter(device => device.kind === 'videoinput');

      // Update UI camera button visibility based on number of devices
      const switchBtn = document.getElementById('camera-dropdown-container') || document.getElementById('btn-camera-toggle');
      if (switchBtn) {
        if (this.videoDevices.length <= 1) {
          switchBtn.style.display = 'none';
        } else {
          switchBtn.style.display = 'inline-block';
        }
      }

      if (this.uiManager) {
        this.uiManager.renderCameraDropdownList();
      }
    } catch (err) {
      console.error("Error enumerating video devices:", err);
      this.videoDevices = [];
    }
  }

  async switchCamera(deviceId) {
    if (this.uiManager) {
      this.uiManager.showGestureToast(`Switching camera...`);
    }
    this.isCameraActive = false;

    // Stop all active tracks to cleanly release camera lock
    if (this.video.srcObject) {
      this.video.srcObject.getTracks().forEach(track => track.stop());
      this.video.srcObject = null;
    }

    this.selectedDeviceId = deviceId;
    saveSettingsToLocalStorage();

    try {
      await this.initCamera();
      // Re-run camera detection to update dropdown labels
      await this.detectCameras();
      if (this.uiManager) {
        this.uiManager.showGestureToast(`Camera switched successfully!`);
      }
    } catch (err) {
      console.error("Camera switch error:", err);
      if (this.uiManager) {
        this.uiManager.showGestureToast(`Camera switch failed`);
      }
    }
  }

  initMediaPipe() {
    if (typeof Hands === 'undefined') {
      this.showError("MediaPipe Hands library could not be loaded. Please inspect your internet connectivity.");
      return;
    }

    this.updateLoaderStatus("Initializing MediaPipe Hands...", 75);

    this.handsTracker = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    this.handsTracker.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: STATE.detectionConfidence,
      minTrackingConfidence: STATE.detectionConfidence
    });

    this.handsTracker.onResults((results) => this.onHandTrackingResults(results));
    this.isTrackerReady = true;

    this.updateLoaderStatus("Bloom tracker loaded! Booting...", 100);

    setTimeout(() => {
      this.loadingOverlay.style.opacity = '0';
      setTimeout(() => {
        this.loadingOverlay.style.display = 'none';
        // Auto-minimize the flower selector after 3 seconds of active view
        setTimeout(() => {
          this.uiManager.minimizeFlowerSelector();
        }, 3000);
      }, 700);
    }, 450);

    // Boot pipeline processes
    this.startVideoFeedLoop();
  }

  updateTrackerConfidence(val) {
    if (this.handsTracker) {
      this.handsTracker.setOptions({
        minDetectionConfidence: val,
        minTrackingConfidence: val
      });
    }
  }

  startVideoFeedLoop() {
    let isFeeding = false;

    const feedFrame = async () => {
      if (this.video.paused || this.video.ended || !this.isCameraActive) {
        requestAnimationFrame(feedFrame);
        return;
      }

      if (!isFeeding && this.isTrackerReady) {
        isFeeding = true;
        try {
          await this.handsTracker.send({ image: this.video });
        } catch (err) {
          console.error("MediaPipe send frame error:", err);
        }
        isFeeding = false;
      }
      requestAnimationFrame(feedFrame);
    };

    requestAnimationFrame(feedFrame);
    requestAnimationFrame((ts) => this.renderCycle(ts));
  }

  // --- MEDIAPIPE PIPELINE CALLBACK RESULTS ---
  onHandTrackingResults(results) {
    this.activeHandsThisFrame.clear();
    this.gesturesThisFrame.Left = 'none';
    this.gesturesThisFrame.Right = 'none';

    const detectedInFrame = { Left: false, Right: false };
    const rawLandmarksMap = { Left: null, Right: null };

    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let handIdx = 0; handIdx < results.multiHandLandmarks.length; handIdx++) {
        const rawLandmarks = results.multiHandLandmarks[handIdx];
        const handedness = results.multiHandedness[handIdx];
        const handLabel = handedness.label; // Left or Right (physical mapping)
        detectedInFrame[handLabel] = true;
        rawLandmarksMap[handLabel] = rawLandmarks;
      }
    }

    const handKeys = ['Left', 'Right'];
    handKeys.forEach(handLabel => {
      if (detectedInFrame[handLabel]) {
        this.handDetectionCount[handLabel]++;
        if (this.handDetectionCount[handLabel] >= 3) {
          this.activeHandsThisFrame.add(handLabel);
          this.handCooldowns[handLabel] = 8;
          this.lastSavedLandmarks[handLabel] = rawLandmarksMap[handLabel];
        }
      } else {
        this.handDetectionCount[handLabel] = 0;
        if (this.handCooldowns[handLabel] > 0) {
          this.handCooldowns[handLabel]--;
          this.activeHandsThisFrame.add(handLabel);
          rawLandmarksMap[handLabel] = this.lastSavedLandmarks[handLabel];
        } else {
          this.lastSavedLandmarks[handLabel] = null;
        }
      }
    });

    // Populate currentRawLandmarks for skeleton rendering using active hands
    this.currentRawLandmarks = [];
    handKeys.forEach(handLabel => {
      if (this.activeHandsThisFrame.has(handLabel) && rawLandmarksMap[handLabel]) {
        this.currentRawLandmarks.push(rawLandmarksMap[handLabel]);
      }
    });

    handKeys.forEach(handLabel => {
      if (!this.activeHandsThisFrame.has(handLabel)) return;

      const rawLandmarks = rawLandmarksMap[handLabel];
      if (!rawLandmarks) return;

      // Detect if hand just appeared to trigger random flower selection and restart bloom scale
      const handJustAppeared = !this.activeHandsLastFrame.has(handLabel);
      if (handJustAppeared) {
        if (STATE.randomMode) {
          this.randomizeHandFlowers(handLabel);
        }
        // Force flower scale transitions to start at 0% to animate bloom properly on appearance
        for (let f = 0; f < 5; f++) {
          this.animationController.fingerScales[`${handLabel}_${f}`] = 0.0;
        }
      }

      // 1. Exponential Smoothing Filter (LERP Jitter Reduction)
      const smoothedHand = this.smoothedLandmarks[handLabel];
      for (let i = 0; i < 21; i++) {
        const raw = rawLandmarks[i];
        const smooth = smoothedHand[i];

        if (!smooth.inited) {
          smooth.x = raw.x;
          smooth.y = raw.y;
          smooth.inited = true;
        } else {
          const dx = raw.x - smooth.x;
          const dy = raw.y - smooth.y;
          const distance = Math.hypot(dx, dy);

          // Scale smoothing factor dynamically: 0.15 (still hand) to 0.70 (fast sweeping movements)
          const alpha = Math.min(0.15 + distance * 3.5, 0.70);
          smooth.x += dx * alpha;
          smooth.y += dy * alpha;
        }
      }

      // 2. Heuristic Gesture Recognition with Sliding Window Vote Stabilization
      let rawGesture = 'none';
      if (detectedInFrame[handLabel]) {
        rawGesture = GestureRecognizer.recognize(smoothedHand);
      }

      // Add to gesture history window
      this.gestureHistory[handLabel].push(rawGesture);
      this.gestureHistory[handLabel].shift();

      // Count votes in the history window
      const counts = {};
      this.gestureHistory[handLabel].forEach(g => {
        counts[g] = (counts[g] || 0) + 1;
      });

      // Find the gesture with the most votes
      let maxG = 'none';
      let maxCount = 0;
      for (const g in counts) {
        if (counts[g] > maxCount) {
          maxCount = counts[g];
          maxG = g;
        }
      }

      // Transition to new gesture only if it meets threshold (>= 6 votes out of 8 frames)
      if (maxCount >= 6) {
        this.stableGestures[handLabel] = maxG;
      }

      const gesture = this.stableGestures[handLabel];
      this.gesturesThisFrame[handLabel] = gesture;

      // 3. Coordinate translation and physical emissions on fingertips
      const tips = [4, 8, 12, 16, 20];
      let totalSpeed = 0;
      let speedCount = 0;

      tips.forEach((landmarkIndex, fingerIdx) => {
        const rawSmoothPt = smoothedHand[landmarkIndex];
        const coords = this.getCanvasCoords(rawSmoothPt);

        const trail = this.trails[handLabel][fingerIdx];
        const lastPos = this.lastFingerPos[handLabel][fingerIdx];

        // Speed and Velocity Tracking
        let speed = 0;
        if (lastPos.inited) {
          const dx = coords.x - lastPos.x;
          const dy = coords.y - lastPos.y;
          speed = Math.sqrt(dx * dx + dy * dy);
          totalSpeed += speed;
          speedCount++;
        }
        lastPos.x = coords.x;
        lastPos.y = coords.y;
        lastPos.inited = true;

        // Save trail positions history
        if (STATE.trailsEnabled) {
          trail.push(coords);
          while (trail.length > STATE.trailLength) {
            trail.shift();
          }
        } else {
          trail.length = 0;
        }

        // Spawning Spells and Particles
        const baseHue = this.getFlowerHue(handLabel, fingerIdx, performance.now());
        const flowerScale = this.animationController.flowerScales[handLabel][fingerIdx];

        // If fist folded, shed petals slowly
        if (gesture === 'fist' && flowerScale > 0.05 && Math.random() < 0.28) {
          const vx = STATE.particleWind * 1.5 + (Math.random() - 0.5) * 1.5;
          const vy = 0.8 + Math.random() * 1.6;
          this.particlePool.spawn(
            coords.x,
            coords.y,
            vx,
            vy,
            STATE.flowerSize * 0.7,
            75,
            'petal',
            baseHue
          );
        }

        if (STATE.particlesEnabled) {
          let emissionRate = STATE.particleRate;

          // Adjust rate dynamically based on fingertip motion velocity (reduced for cleaner visual)
          emissionRate += Math.min(speed * 0.15, 3);

          // Double emissions on index and middle fingertips if Peace gesture is active
          if (gesture === 'peace' && (fingerIdx === 1 || fingerIdx === 2)) {
            emissionRate *= 2.5;
          }

          for (let k = 0; k < Math.floor(emissionRate); k++) {
            if (Math.random() < (emissionRate % 1 || 1)) {
              // Sparks inherit fraction of hand sweep direction
              let vx = (Math.random() - 0.5) * 2.8 + STATE.particleWind * 1.5;
              let vy = (Math.random() - 0.5) * 2.8 - 0.3;

              // Scatter petals dynamically with stronger velocity on fast sweep
              if (speed > 8) {
                vx += (Math.random() - 0.5) * speed * 0.25;
                vy += (Math.random() - 0.5) * speed * 0.25;
              }

              // Pick random particle visual style (heavily favoring natural petals)
              let type = 'petal';
              const rnd = Math.random();
              if (rnd < 0.08) type = 'sparkle';
              else if (rnd < 0.15) type = 'pollen';

              this.particlePool.spawn(
                coords.x + (Math.random() - 0.5) * 12,
                coords.y + (Math.random() - 0.5) * 12,
                vx,
                vy,
                STATE.flowerSize * 0.8,
                70,
                type,
                baseHue
              );
            }
          }
        }
      });

      if (speedCount > 0) {
        const avgSpeed = totalSpeed / speedCount;
        this.handSpeeds[handLabel] = avgSpeed;
        const targetGlow = 1.0 + Math.min(avgSpeed * 0.035, 0.4);
        this.speedGlow[handLabel] += (targetGlow - this.speedGlow[handLabel]) * 0.15;
      }
    });

    // Check Two Hand gestures (Heart path linking)
    if (this.activeHandsThisFrame.has('Left') && this.activeHandsThisFrame.has('Right')) {
      const twoHandGesture = GestureRecognizer.detectTwoHandHeart(
        this.smoothedLandmarks.Left,
        this.smoothedLandmarks.Right
      );
      if (twoHandGesture === 'heart') {
        this.gesturesThisFrame.Left = 'heart';
        this.gesturesThisFrame.Right = 'heart';
      }
    }

    // Shrink history of hands no longer visible to dissolve trails smoothly
    // handKeys is already declared above, reuse it
    handKeys.forEach(handKey => {
      if (!this.activeHandsThisFrame.has(handKey)) {
        for (let f = 0; f < 5; f++) {
          const trail = this.trails[handKey][f];
          if (trail.length > 0) {
            trail.shift();
          }
          this.lastFingerPos[handKey][f].inited = false;
        }
        // Prune smoothed cache
        this.smoothedLandmarks[handKey].forEach(lm => lm.inited = false);
      }
    });

    // Save active hands for appearance transition detection next frame
    this.activeHandsLastFrame = new Set(this.activeHandsThisFrame);

    // 4. Handle State Transitions / Audio feedback triggers
    handKeys.forEach(handKey => {
      const prevG = this.prevGestures[handKey];
      const curG = this.gesturesThisFrame[handKey];

      if (curG !== prevG) {
        this.handleGestureTransitions(handKey, prevG, curG);
        this.prevGestures[handKey] = curG;
      }
    });
  }

  handleGestureTransitions(handKey, prev, cur) {
    if (cur === 'none') return;

    // Fist gathers energy charging state
    if (cur === 'fist') {
      this.handCharged[handKey] = true;
      this.uiManager.showGestureToast("✊ ENERGY GATHERING...");
      this.soundSynth.playBloom();
    }

    // Explode charge when changing from Fist to Open Palm
    if (prev === 'fist' && cur === 'palm' && this.handCharged[handKey]) {
      this.handCharged[handKey] = false;
      this.triggerBlossomBurst(handKey);
    }

    // Sparkle chime alerts on specific gestures
    if (cur === 'peace') {
      this.soundSynth.playSparkle();
      this.uiManager.showGestureToast("✌️ PETALS EXPLOSION!");
      this.triggerPeaceBlast(handKey);
    }

    if (cur === 'thumbsup') {
      this.soundSynth.playBloom();
      this.uiManager.showGestureToast("👍 GIANT ROSE SPELL");
    }

    if (cur === 'ok') {
      this.soundSynth.playSparkle();
      this.uiManager.showGestureToast("👌 ALIGNMENT SHIELD");
    }

    if (cur === 'heart') {
      this.soundSynth.playBloom();
      this.uiManager.showGestureToast("🫶 FLOWERING HEART LINK");
    }

    if (cur === 'pinch') {
      this.uiManager.showGestureToast("🤏 PLANTING SEED...");
    }

    // Seed floating flower upon Pinch Release
    if (prev === 'pinch' && cur !== 'pinch') {
      this.seedFloatingFlower(handKey);
    }

    if (cur === 'spread') {
      this.soundSynth.playSparkle();
      this.uiManager.showGestureToast("👐 CHROMA SPECTRUM");
    }
  }

  // Blossom burst radial explosion from palm center
  triggerBlossomBurst(handKey) {
    const lm = this.smoothedLandmarks[handKey];
    // Knuckle index 9 center coordinate
    const center = this.getCanvasCoords(lm[9]);
    const flowerStyle = STATE.randomMode ? this.handFingerFlowers[handKey][1] : STATE.flowerStyle;
    const baseHue = FLOWER_HUES[flowerStyle] || 340;

    this.soundSynth.playBurst();
    this.uiManager.showGestureToast("✊ BLOSSOM BURST!");

    const count = 45;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      const speed = 2.5 + Math.random() * 6.5;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      this.particlePool.spawn(
        center.x,
        center.y,
        vx,
        vy,
        STATE.flowerSize * 0.9,
        65,
        'petal',
        (baseHue + (Math.random() - 0.5) * 20 + 360) % 360
      );
    }
  }

  // Radial shower of sparkles on peace trigger
  triggerPeaceBlast(handKey) {
    const lm = this.smoothedLandmarks[handKey];
    const tipIndex = this.getCanvasCoords(lm[8]);
    const tipMiddle = this.getCanvasCoords(lm[12]);
    const flowerStyle = STATE.randomMode ? this.handFingerFlowers[handKey][1] : STATE.flowerStyle;
    const baseHue = FLOWER_HUES[flowerStyle] || 340;

    const spawnBlast = (pos) => {
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 4;
        this.particlePool.spawn(
          pos.x,
          pos.y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          10,
          40,
          'sparkle',
          baseHue
        );
      }
    };

    spawnBlast(tipIndex);
    spawnBlast(tipMiddle);
  }

  // Seed pinch release floating flower
  seedFloatingFlower(handKey) {
    const lm = this.smoothedLandmarks[handKey];
    // Center point between thumb (4) and index (8) tips
    const tX = (lm[4].x + lm[8].x) / 2;
    const tY = (lm[4].y + lm[8].y) / 2;
    const coords = this.getCanvasCoords({ x: tX, y: tY });
    const flowerStyle = STATE.randomMode ? this.handFingerFlowers[handKey][1] : STATE.flowerStyle;
    const baseHue = FLOWER_HUES[flowerStyle] || 340;

    this.soundSynth.playBloom();
    this.uiManager.showGestureToast("✨ SEEDED FLOWER!");

    // Spawns a floating flower in air
    this.floatingFlowers.push({
      x: coords.x,
      y: coords.y,
      vx: (Math.random() - 0.5) * 0.7 + STATE.particleWind * 1.5,
      vy: -1.2 - Math.random() * 0.7, // floats up
      size: STATE.flowerSize * 1.3,
      rotation: Math.random() * Math.PI * 2,
      vRotation: (Math.random() - 0.5) * 0.05,
      type: flowerStyle,
      hueOffset: (Math.random() - 0.5) * 20,
      life: 250,
      maxLife: 250
    });
  }

  getFlowerHue(handLabel, fingerIdx, timestamp) {
    const gesture = this.gesturesThisFrame[handLabel] || 'none';
    if (gesture === 'spread') {
      // Rapid shifting chroma rainbow
      return (timestamp * 0.35 + fingerIdx * 35) % 360;
    }
    const flowerStyle = STATE.randomMode ? this.handFingerFlowers[handLabel][fingerIdx] : STATE.flowerStyle;
    const baseHue = FLOWER_HUES[flowerStyle] || 340;
    // Shimmering color hue shifts
    const shimmer = Math.sin(timestamp * 0.0018 + fingerIdx) * 12;
    return (baseHue + shimmer + 360) % 360;
  }

  // --- RENDER PIPELINE CYCLE ---
  renderCycle(timestamp) {
    // Keep FPS updated
    this.performanceMonitor.update(timestamp);

    // Natural multi-frequency organic wind simulation
    const windTime = timestamp * 0.001;
    this.windX = 0.4 * Math.sin(windTime * 0.6) + 0.12 * Math.sin(windTime * 1.8) + STATE.particleWind * 1.2;
    this.windY = 0.15 * Math.sin(windTime * 0.8) + 0.05 * Math.sin(windTime * 2.2);

    // 1. Draw horizontal mirror webcam cropped cover direct to main canvas
    if (this.isCameraActive) {
      this.drawVideoCover(this.ctx);
    } else {
      // Black background fallback
      this.ctx.fillStyle = '#030305';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // 2. Clear Offscreen Canvas to draw isolated visual graphics
    this.offCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update animations transition parameters
    this.animationController.update(
      this.activeHandsThisFrame,
      this.gesturesThisFrame,
      this.smoothedLandmarks,
      (lm) => this.getCanvasCoords(lm),
      timestamp
    );

    // 3. Spawns ambient background fireflies/bokeh circles (reduced frequency for less clutter)
    if (STATE.ambientEnabled) {
      const flowerStyle = STATE.randomMode ? (this.activeHandsThisFrame.has('Right') ? this.handFingerFlowers['Right'][2] : (this.activeHandsThisFrame.has('Left') ? this.handFingerFlowers['Left'][2] : STATE.flowerStyle)) : STATE.flowerStyle;
      const baseHue = FLOWER_HUES[flowerStyle] || 340;
      if (Math.random() < 0.03) {
        const rx = Math.random() * this.canvas.width;
        const ry = this.canvas.height + 20; // spawn below bottom edge
        const vx = (Math.random() - 0.5) * 0.4 + STATE.particleWind * 1.5;
        const vy = -0.5 - Math.random() * 0.9;

        const size = 5 + Math.random() * 15;

        this.particlePool.spawn(rx, ry, vx, vy, size, 380, 'dust', baseHue);
      }
    }

    // 4. Render fingertip tapered ribbon trails
    const handKeys = ['Left', 'Right'];
    if (STATE.trailsEnabled) {
      handKeys.forEach(handKey => {
        for (let f = 0; f < 5; f++) {
          const trail = this.trails[handKey][f];
          const hue = this.getFlowerHue(handKey, f, timestamp);
          if (trail.length > 1) {
            this.drawTaperedTrailBezier(this.offCtx, trail, hue);
          }
        }
      });
    }

    // 5. Update and Draw Particles
    this.particlePool.update(STATE.particleGravity, STATE.particleWind);
    this.particlePool.draw(this.offCtx);

    // 6. Draw floating flowers seeded from Pinches
    this.updateAndDrawFloatingFlowers();

    // 7. Draw OK Magic spell alignment rings
    this.drawOKAlignmentRings(timestamp);

    // 8. Draw Fist Closed Energy charge visual cores
    this.drawFistEnergyCharges(timestamp);

    // 9. Draw Two-Hand Linking Heart curve
    this.drawTwoHandLinkingHeart(timestamp);

    // 10. Render Active Flowers on fingertips
    handKeys.forEach(handKey => {
      if (this.activeHandsThisFrame.has(handKey)) {
        const gesture = this.gesturesThisFrame[handKey];
        const lm = this.smoothedLandmarks[handKey];

        for (let f = 0; f < 5; f++) {
          const scaleTransition = this.animationController.flowerScales[handKey][f];
          const pos = this.animationController.flowerPositions[handKey][f];

          if (pos.inited && scaleTransition > 0.01) {
            const flowerStyle = STATE.randomMode ? this.handFingerFlowers[handKey][f] : STATE.flowerStyle;
            const baseHue = this.getFlowerHue(handKey, f, timestamp);

            // Breathing animation calculations
            const rot = (f * Math.PI / 2.5) + (timestamp * 0.0008 * (f % 2 === 0 ? 1 : -1));
            const breath = 1.0 + 0.12 * Math.sin(timestamp * 0.004 + f);

            // Wind sway and speed scaling tilts
            const windSway = this.windX * 0.14 + Math.sin(timestamp * 0.0018 + f) * 0.05;
            const speedScale = this.speedGlow[handKey] || 1.0;

            let currentSize = STATE.flowerSize * 2.2 * breath * speedScale * scaleTransition;

            // Render style type
            FlowerRenderer.drawFlower(
              this.offCtx,
              flowerStyle,
              pos.x,
              pos.y,
              currentSize,
              rot + windSway,
              baseHue - FLOWER_HUES[flowerStyle],
              scaleTransition
            );
          }
        }

        // Draw Peace sign connected vines and butterfly spawns
        if (gesture === 'peace') {
          this.drawPeaceVines(handKey, lm, timestamp);
        }

        // Draw Thumbs Up giant flower
        const thumbsUpOpacity = this.animationController.thumbsUpScale[handKey];
        if (thumbsUpOpacity > 0.01) {
          const thumbTip = this.getCanvasCoords(lm[4]);
          const scaleDist = Math.hypot(lm[0].x - lm[9].x, lm[0].y - lm[9].y);
          const scale = this.getCanvasScaleWidth() * scaleDist;
          const baseHue = this.getFlowerHue(handKey, 0, timestamp);
          const giantSize = STATE.flowerSize * 5.5 * thumbsUpOpacity;
          const giantRot = timestamp * 0.0007;

          // Renders a giant Rose centered above thumb tip
          const flowerY = thumbTip.y - scale * 0.5;
          FlowerRenderer.drawFlower(
            this.offCtx,
            'rose',
            thumbTip.x,
            flowerY,
            giantSize,
            giantRot,
            baseHue - FLOWER_HUES.rose,
            thumbsUpOpacity
          );

          // Golden spark particle bursts during bloom peak
          if (thumbsUpOpacity > 0.85 && Math.random() < 0.2) {
            this.particlePool.spawn(
              thumbTip.x + (Math.random() - 0.5) * 20,
              flowerY + (Math.random() - 0.5) * 20,
              (Math.random() - 0.5) * 1.5,
              -0.5 - Math.random() * 1.2,
              6 + Math.random() * 8,
              50,
              'sparkle',
              45
            );
          }
        }
      }
    });

    // 11. Render Skeletal connections and on-screen debug metrics panel if debug mode is active
    if (STATE.toggleDebug) {
      if (this.currentRawLandmarks.length > 0) {
        this.drawDebugSkeleton(this.offCtx);
      }
      // Legacy debug panel is replaced by floating HTML tracker
      // this.drawDebugPanel(this.offCtx);
    }

    // 12. Composite offscreen overlay graphics onto the main webcam canvas
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);

    // Apply soft dual-pass screen bloom if toggled active
    if (STATE.toggleGlow && STATE.glowAmount > 0) {
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'screen';
      this.ctx.filter = 'blur(10px) brightness(1.25)';
      this.ctx.globalAlpha = STATE.glowAmount / 100 * 0.40; // Map intensity slider to global alpha (reduced intensity)
      this.ctx.drawImage(this.offscreenCanvas, 0, 0);
      this.ctx.restore();
    }

    // 13. Update debug tracker rows (cheap, only runs when panel is expanded)
    if (this.uiManager) {
      const frameDelta = this._lastRenderTs !== undefined ? (timestamp - this._lastRenderTs) : 16.7;
      this.uiManager.updateDebugTracker(this, frameDelta);
    }
    this._lastRenderTs = timestamp;

    requestAnimationFrame((ts) => this.renderCycle(ts));
  }

  // Fits webcam horizontally mirrored cover scale crop parameters
  drawVideoCover(ctx) {
    const videoWidth = this.video.videoWidth;
    const videoHeight = this.video.videoHeight;
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

    const videoAspect = videoWidth / videoHeight;
    const canvasAspect = canvasWidth / canvasHeight;

    let drawWidth, drawHeight;
    let sx, sy;

    if (canvasAspect > videoAspect) {
      drawWidth = videoWidth;
      drawHeight = videoWidth / canvasAspect;
      sx = 0;
      sy = (videoHeight - drawHeight) / 2;
    } else {
      drawWidth = videoHeight * canvasAspect;
      drawHeight = videoHeight;
      sx = (videoWidth - drawWidth) / 2;
      sy = 0;
    }

    ctx.save();
    ctx.translate(canvasWidth, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(
      this.video,
      sx, sy, drawWidth, drawHeight,
      0, 0, canvasWidth, canvasHeight
    );
    ctx.restore();
  }


  // Tapered and glowing trail renderer with subdivided bezier curves
  drawTaperedTrailBezier(ctx, points, hue) {
    if (points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Subdivide coordinate segments to guarantee buttery-smooth curvatures
    const smoothPoints = this.subdivideTrailPoints(points);

    for (let i = 1; i < smoothPoints.length; i++) {
      const p1 = smoothPoints[i - 1];
      const p2 = smoothPoints[i];
      const ratio = i / smoothPoints.length; // tapered fade weight

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);

      // Glowing outer color shadow ribbon layer
      ctx.strokeStyle = `hsla(${hue}, 100%, 75%, ${ratio * 0.35})`;
      ctx.lineWidth = ratio * (STATE.flowerSize * 0.7);
      ctx.shadowColor = `hsla(${hue}, 100%, 70%, ${ratio * 0.6})`;
      ctx.shadowBlur = ratio * 12;
      ctx.stroke();

      // Sharp bright core
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.strokeStyle = `rgba(255, 255, 255, ${ratio * 0.78})`;
      ctx.lineWidth = ratio * (STATE.flowerSize * 0.2);
      ctx.shadowBlur = 0;
      ctx.stroke();
    }
    ctx.restore();
  }

  // Quadratic Bezier subdivision algorithm to smooth trail connections
  subdivideTrailPoints(points) {
    if (points.length < 3) return points;
    const result = [points[0]];
    const steps = 2; // division segments factor

    for (let i = 1; i < points.length - 1; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];

      for (let t = 0.5 / steps; t < 1.0; t += 1.0 / steps) {
        const mt = 1.0 - t;
        const rx = mt * mt * p0.x + 2.0 * mt * t * p1.x + t * t * p2.x;
        const ry = mt * mt * p0.y + 2.0 * mt * t * p1.y + t * t * p2.y;
        result.push({ x: rx, y: ry });
      }
    }
    result.push(points[points.length - 1]);
    return result;
  }

  // Float flowers seeded from Pinch gestures Y-upward
  updateAndDrawFloatingFlowers() {
    for (let i = this.floatingFlowers.length - 1; i >= 0; i--) {
      const f = this.floatingFlowers[i];

      f.life--;
      if (f.life <= 0) {
        this.floatingFlowers.splice(i, 1);
        continue;
      }

      // Drift in physics coordinates
      f.vx += STATE.particleWind * 0.05;
      f.vy += STATE.particleGravity * 0.1; // rise velocity
      f.x += f.vx;
      f.y += f.vy;
      f.rotation += f.vRotation;

      const sizeRatio = f.life / f.maxLife;
      // Shrink scale to dissolve
      const size = f.size * (0.4 + 0.6 * sizeRatio);
      const activeHue = FLOWER_HUES[f.type] || 340;

      FlowerRenderer.drawFlower(
        this.offCtx,
        f.type,
        f.x,
        f.y,
        size,
        f.rotation,
        f.hueOffset,
        sizeRatio
      );

      // Emit small sparkles along floating path
      if (STATE.particlesEnabled && Math.random() < 0.15) {
        this.particlePool.spawn(
          f.x + (Math.random() - 0.5) * 10,
          f.y + (Math.random() - 0.5) * 10,
          f.vx * 0.5,
          f.vy * 0.5 + 0.2,
          6,
          40,
          'sparkle',
          (activeHue + f.hueOffset) % 360
        );
      }
    }
  }

  // Draw OK Spell shield rings and wreath calligraphy connections
  drawOKAlignmentRings(timestamp) {
    const handKeys = ['Left', 'Right'];
    handKeys.forEach(handKey => {
      const opacity = this.animationController.okRingOpacity[handKey];
      if (opacity > 0.01 && this.activeHandsThisFrame.has(handKey)) {
        const lm = this.smoothedLandmarks[handKey];

        // Calculate palm center using average knuckles coordinates
        const cX = (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5;
        const cY = (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5;
        const palmCenter = this.getCanvasCoords({ x: cX, y: cY });

        // Compute hand scale reference
        const scaleDist = Math.hypot(lm[0].x - lm[9].x, lm[0].y - lm[9].y);
        const scale = this.getCanvasScaleWidth() * scaleDist;
        const wreathCenter = palmCenter;

        this.offCtx.save();
        this.offCtx.globalAlpha = opacity;
        this.offCtx.strokeStyle = '#ffe49e';
        this.offCtx.shadowColor = 'rgba(255, 228, 158, 0.6)';
        this.offCtx.shadowBlur = 15;

        // Solid energy circle connecting wreath flowers
        this.offCtx.lineWidth = scale * 0.04;
        this.offCtx.beginPath();
        this.offCtx.arc(wreathCenter.x, wreathCenter.y, scale * 1.0, 0, Math.PI * 2);
        this.offCtx.stroke();

        // Inner dashed details
        this.offCtx.save();
        this.offCtx.lineWidth = scale * 0.02;
        this.offCtx.setLineDash([8, 12]);
        this.offCtx.lineDashOffset = -timestamp * 0.03;
        this.offCtx.beginPath();
        this.offCtx.arc(wreathCenter.x, wreathCenter.y, scale * 0.85, 0, Math.PI * 2);
        this.offCtx.stroke();
        this.offCtx.restore();

        // Spawn ring sparks along borders
        if (STATE.particlesEnabled && Math.random() < 0.35) {
          const angle = Math.random() * Math.PI * 2;
          const sx = wreathCenter.x + Math.cos(angle) * (scale * 1.0);
          const sy = wreathCenter.y + Math.sin(angle) * (scale * 1.0);
          const vx = Math.cos(angle) * 0.5 + (Math.random() - 0.5) * 0.2;
          const vy = Math.sin(angle) * 0.5 + (Math.random() - 0.5) * 0.2;

          this.particlePool.spawn(sx, sy, vx, vy, 4.5, 30, 'ring', 45); // golden spark hue
        }

        this.offCtx.restore();
      }
    });
  }

  // Draw Peace sign connected vines and butterfly spawns
  drawPeaceVines(handKey, lm, timestamp) {
    const idxTip = this.getCanvasCoords(lm[8]);
    const midTip = this.getCanvasCoords(lm[12]);
    const scale = Math.hypot(lm[0].x - lm[9].x, lm[0].y - lm[9].y) * 500;

    // Draw connecting vine curve
    this.offCtx.save();
    this.offCtx.strokeStyle = 'rgba(76, 175, 80, 0.75)'; // soft vine green
    this.offCtx.lineWidth = scale * 0.08;
    this.offCtx.lineCap = 'round';

    const midPointX = (idxTip.x + midTip.x) / 2;
    const midPointY = (idxTip.y + midTip.y) / 2;
    // Add curved control point
    const ctrlX = midPointX - (midTip.y - idxTip.y) * 0.25 + this.windX * scale * 0.25;
    const ctrlY = midPointY + (midTip.x - idxTip.x) * 0.25;

    this.offCtx.beginPath();
    this.offCtx.moveTo(idxTip.x, idxTip.y);
    this.offCtx.quadraticCurveTo(ctrlX, ctrlY, midTip.x, midTip.y);
    this.offCtx.stroke();

    // Draw leaves and small cherry blossoms along the vine
    const steps = 4;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      // Quadratic bezier formula
      const px = (1 - t) * (1 - t) * idxTip.x + 2 * (1 - t) * t * ctrlX + t * t * midTip.x;
      const py = (1 - t) * (1 - t) * idxTip.y + 2 * (1 - t) * t * ctrlY + t * t * midTip.y;

      // Draw small leaf
      this.offCtx.save();
      this.offCtx.translate(px, py);
      this.offCtx.rotate(Math.sin(timestamp * 0.003 + i) * 0.15 + this.windX * 0.1);
      this.offCtx.fillStyle = '#81c784';
      this.offCtx.beginPath();
      this.offCtx.ellipse(0, 0, scale * 0.12, scale * 0.06, Math.PI / 4, 0, Math.PI * 2);
      this.offCtx.fill();

      // Draw tiny secondary flower bud blooming
      const budSize = scale * 0.16 * (0.8 + 0.2 * Math.sin(timestamp * 0.005 + i));
      FlowerRenderer.drawFlower(this.offCtx, 'cherry', 0, 0, budSize, timestamp * 0.001 * i, 340, 1.0);
      this.offCtx.restore();
    }

    this.offCtx.restore();

    // Spawn butterfly particles erratically
    if (Math.random() < 0.08) {
      const px = midPointX + (Math.random() - 0.5) * 30;
      const py = midPointY + (Math.random() - 0.5) * 30;
      const vx = (Math.random() - 0.5) * 1.5 + this.windX;
      const vy = -0.5 - Math.random() * 1.2;
      this.particlePool.spawn(px, py, vx, vy, 14 + Math.random() * 8, 120, 'butterfly', (timestamp * 0.04) % 360);
    }

    // Spawn falling cherry petals
    if (Math.random() < 0.12) {
      const rx = Math.random() * this.canvas.width;
      const ry = -20;
      const vx = 1.0 + Math.random() * 2.0 + this.windX * 1.5;
      const vy = 0.5 + Math.random() * 1.5;
      this.particlePool.spawn(rx, ry, vx, vy, 12 + Math.random() * 6, 200, 'petal', 340);
    }
  }

  // Draw Fist closed charge indicators
  drawFistEnergyCharges(timestamp) {
    const handKeys = ['Left', 'Right'];
    handKeys.forEach(handKey => {
      const charge = this.animationController.fistChargeLevel[handKey];
      if (charge > 0.01 && this.activeHandsThisFrame.has(handKey)) {
        const lm = this.smoothedLandmarks[handKey];

        // Calculate palm center using average knuckles coordinates
        const cX = (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5;
        const cY = (lm[0].y + lm[5].y + lm[9].y + lm[13].y + lm[17].y) / 5;
        const palmCenter = this.getCanvasCoords({ x: cX, y: cY });

        // Compute hand scale reference
        const scaleDist = Math.hypot(lm[0].x - lm[9].x, lm[0].y - lm[9].y);
        const scale = this.getCanvasScaleWidth() * scaleDist;
        const baseHue = FLOWER_HUES[STATE.flowerStyle] || 340;

        // Emit particles pulled into palm center core
        if (STATE.particlesEnabled && Math.random() < 0.4 + charge * 0.6) {
          const angle = Math.random() * Math.PI * 2;
          const radius = scale * (1.8 - charge * 0.8);
          const px = palmCenter.x + Math.cos(angle) * radius;
          const py = palmCenter.y + Math.sin(angle) * radius;

          // velocity vector directed inward to palm center
          const vx = (palmCenter.x - px) * 0.12;
          const vy = (palmCenter.y - py) * 0.12;

          this.particlePool.spawn(px, py, vx, vy, 3 + charge * 4, 15, 'charge', baseHue);
        }

        // Draw glowing energy core centered in fist
        this.offCtx.save();
        this.offCtx.globalAlpha = charge * 0.85;
        const grad = this.offCtx.createRadialGradient(
          palmCenter.x, palmCenter.y, 0,
          palmCenter.x, palmCenter.y, scale * 0.52 * charge
        );
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, `hsla(${baseHue}, 100%, 75%, 0.9)`);
        grad.addColorStop(1, `hsla(${baseHue}, 100%, 50%, 0)`);

        this.offCtx.fillStyle = grad;
        this.offCtx.beginPath();
        this.offCtx.arc(palmCenter.x, palmCenter.y, scale * 0.52 * charge, 0, Math.PI * 2);
        this.offCtx.fill();
        this.offCtx.restore();
      }
    });
  }

  drawTwoHandLinkingHeart(timestamp) {
    const phase = this.animationController.heartPhase;
    if (phase === 'none' || phase === 'surprise_ended') return;

    const hasLeft = this.activeHandsThisFrame.has('Left');
    const hasRight = this.activeHandsThisFrame.has('Right');

    // 1. Smoothly track overall opacity
    if (this.animationController.heartOpacity === undefined) {
      this.animationController.heartOpacity = 0;
    }

    if (phase === 'dissolve' || phase === 'surprise_dissolve') {
      this.animationController.heartOpacity += (0.0 - this.animationController.heartOpacity) * 0.08;
    } else {
      this.animationController.heartOpacity += (1.0 - this.animationController.heartOpacity) * 0.1;
    }

    // 2. Capture coordinates or use last saved coordinates (smoothed)
    if (this.animationController.smoothedHeartCenter.inited) {
      this.lastHeartCenter = { x: this.animationController.smoothedHeartCenter.x, y: this.animationController.smoothedHeartCenter.y };
      this.lastHeartScale = this.animationController.smoothedHeartScale;
      this.lastHeartSize = this.animationController.smoothedHeartSize;
    }

    if (!this.lastHeartCenter) return;

    const center = this.lastHeartCenter;
    const scale = this.lastHeartScale;
    const heartSize = this.lastHeartSize;
    const elapsed = timestamp - this.animationController.heartTimer;

    // If dissolve sound burst is needed
    if ((phase === 'dissolve' || phase === 'surprise_dissolve') && elapsed < 80 && !this.dissolveTriggered) {
      this.dissolveTriggered = true;
      this.soundSynth.playBurst();
      for (let i = 0; i < 35; i++) {
        const theta = Math.random() * Math.PI * 2;
        const hx = center.x + 16 * Math.pow(Math.sin(theta), 3) * (heartSize / 16);
        const hy = center.y - (13 * Math.cos(theta) - 5 * Math.cos(2 * theta) - 2 * Math.cos(3 * theta) - Math.cos(4 * theta)) * (heartSize / 16);
        const vx = (Math.random() - 0.5) * 3.0 + STATE.particleWind * 1.5;
        const vy = (Math.random() - 0.5) * 3.0 - 0.5;
        this.particlePool.spawn(hx, hy, vx, vy, STATE.flowerSize * 0.8, 80, 'petal', 345);
      }
    }
    if (phase !== 'dissolve' && phase !== 'surprise_dissolve') {
      this.dissolveTriggered = false;
    }

    // Draw the heart components utilizing smooth globalAlpha fade out
    if (this.animationController.heartOpacity > 0.01) {
      this.offCtx.save();
      this.offCtx.globalAlpha = this.animationController.heartOpacity;

      // 1. Draw a soft pink glowing background path under the heart
      const pulse = 1.0 + 0.03 * Math.sin(timestamp * 0.0035);
      const swayX = Math.sin(timestamp * 0.001) * 12;
      const swayY = Math.cos(timestamp * 0.0015) * 6;

      if (STATE.toggleGlow && (phase === 'travel' || phase === 'bloom_heart')) {
        this.offCtx.save();
        this.offCtx.strokeStyle = 'rgba(255, 183, 197, 0.4)'; // soft pink
        this.offCtx.lineWidth = scale * 0.45;
        this.offCtx.lineCap = 'round';
        this.offCtx.lineJoin = 'round';
        this.offCtx.shadowColor = 'rgba(255, 105, 180, 0.8)'; // pink glow
        this.offCtx.shadowBlur = scale * 0.3;

        this.offCtx.beginPath();
        const glowSteps = 60;
        for (let i = 0; i <= glowSteps; i++) {
          const theta = (i / glowSteps) * Math.PI * 2;
          const hx = center.x + 16 * Math.pow(Math.sin(theta), 3) * (heartSize / 16) * pulse + swayX;
          const hy = center.y - (13 * Math.cos(theta) - 5 * Math.cos(2 * theta) - 2 * Math.cos(3 * theta) - Math.cos(4 * theta)) * (heartSize / 16) * pulse + swayY;
          if (i === 0) this.offCtx.moveTo(hx, hy);
          else this.offCtx.lineTo(hx, hy);
        }
        this.offCtx.closePath();
        this.offCtx.stroke();
        this.offCtx.restore();
      }

      // 2. Update and draw each HeartElement
      const elements = this.animationController.heartElements || [];
      const getFingertipCoords = (handKey, fingerIdx) => {
        const fPos = this.animationController.flowerPositions[handKey] && this.animationController.flowerPositions[handKey][fingerIdx];
        if (fPos && fPos.inited) {
          return { x: fPos.x, y: fPos.y };
        }
        const otherHandKey = handKey === 'Left' ? 'Right' : 'Left';
        const fPosOther = this.animationController.flowerPositions[otherHandKey] && this.animationController.flowerPositions[otherHandKey][fingerIdx];
        if (fPosOther && fPosOther.inited) {
          return { x: fPosOther.x, y: fPosOther.y };
        }
        return { x: center.x, y: center.y };
      };

      elements.forEach((el, idx) => {
        const heartX = center.x + el.hx_base * (heartSize / 16) * el.scaleFactor * pulse + swayX;
        const heartY = center.y + el.hy_base * (heartSize / 16) * el.scaleFactor * pulse + swayY;

        // Calculate Fatima target position
        const letterIdx = Math.floor(idx / 20);
        const pointIdx = idx % 20;
        const localPt = this.animationController.getFatimaPoint(letterIdx, pointIdx);

        // Horizontal spacing offsets for F-a-t-i-m-a
        const letterXOffsets = [-10.5, -6.3, -2.1, 1.5, 6.0, 10.5];

        // Scale Fatima word to be beautiful relative to the current tracking heartSize
        const finalLocalX = localPt.x * 1.55 + letterXOffsets[letterIdx];
        const finalLocalY = localPt.y * 1.55 - 0.45;

        const fatimaX = center.x + finalLocalX * (heartSize / 28) * pulse + swayX;
        const fatimaY = center.y + finalLocalY * (heartSize / 28) * pulse + swayY;

        const elementSide = el.hx_base < 0 ? 'Left' : 'Right';

        if (phase === 'travel') {
          const t = Math.min(1.0, elapsed / 1200);
          const easeT = 1 - Math.pow(1 - t, 3); // easeOutCubic
          const fingertip = getFingertipCoords(elementSide, el.fingerIdx);
          el.x = fingertip.x + (heartX - fingertip.x) * easeT;
          el.y = fingertip.y + (heartY - fingertip.y) * easeT;
          el.currentScale = easeT;
          el.dissolveStartX = null;
        } else if (phase === 'bloom_heart') {
          el.x = heartX;
          el.y = heartY;
          el.currentScale = 1.0;
          el.dissolveStartX = null;
        } else if (phase === 'surprise_fly') {
          const t = Math.min(1.0, elapsed / 1400);
          const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic

          // Fly along beautifully curved paths
          const dx = fatimaX - heartX;
          const dy = fatimaY - heartY;
          const normalX = -dy;
          const normalY = dx;
          const len = Math.hypot(normalX, normalY) || 1;
          const amp = Math.sin(t * Math.PI) * (el.hx_base * 4.5);

          el.x = heartX + dx * easeT + (normalX / len) * amp;
          el.y = heartY + dy * easeT + (normalY / len) * amp;
          el.currentScale = 1.0;
          el.dissolveStartX = null;
        } else if (phase === 'surprise_bloom') {
          el.x = fatimaX;
          el.y = fatimaY;
          el.currentScale = 1.0;
          el.dissolveStartX = null;
        } else if (phase === 'surprise_dissolve') {
          const t = Math.min(1.0, elapsed / 1200);
          const easeT = t * t; // easeInQuad
          const fingertip = getFingertipCoords(elementSide, el.fingerIdx);
          el.x = fatimaX + (fingertip.x - fatimaX) * easeT;
          el.y = fatimaY + (fingertip.y - fatimaY) * easeT;
          el.currentScale = 1.0 - t;
          el.dissolveStartX = null;
        } else if (phase === 'dissolve') {
          const t = Math.min(1.0, elapsed / 1000);
          const easeT = t * t; // easeInQuad
          const fingertip = getFingertipCoords(elementSide, el.fingerIdx);
          if (!el.dissolveStartX) {
            el.dissolveStartX = el.x;
            el.dissolveStartY = el.y;
          }
          el.x = el.dissolveStartX + (fingertip.x - el.dissolveStartX) * easeT;
          el.y = el.dissolveStartY + (fingertip.y - el.dissolveStartY) * easeT;
          el.currentScale = 1.0 - t;
        }

        const size = STATE.flowerSize * el.sizeMultiplier * el.currentScale;
        const rotation = el.angle + el.rotSpeed * (timestamp * 0.05);

        let activeStyle = el.flowerStyle;
        let activeHueOffset = el.baseHue - FLOWER_HUES[el.flowerStyle];

        // Transition to soft cherry blossom pink in surprise phases
        if (phase === 'surprise_fly' || phase === 'surprise_bloom' || phase === 'surprise_dissolve') {
          activeStyle = 'cherry';
          const pinkHue = 345 + (idx % 5) * 4;
          activeHueOffset = pinkHue - FLOWER_HUES.cherry;
        }

        if (activeStyle === 'cherry' || activeStyle === 'flower') {
          FlowerRenderer.drawFlower(
            this.offCtx,
            activeStyle,
            el.x,
            el.y,
            size * 1.5,
            rotation,
            activeHueOffset,
            el.currentScale
          );
        } else if (activeStyle === 'leaf') {
          FlowerRenderer.drawFlower(
            this.offCtx,
            'leaf',
            el.x,
            el.y,
            size * 1.2,
            rotation,
            0,
            el.currentScale
          );
        } else if (activeStyle === 'vine_segment') {
          const tangentAngle = el.theta + Math.PI / 2; // Fixed the undefined theta bug!
          FlowerRenderer.drawFlower(
            this.offCtx,
            'vine_segment',
            el.x,
            el.y,
            size * 1.6,
            tangentAngle + rotation * 0.1,
            0,
            el.currentScale
          );
        } else if (activeStyle === 'petal') {
          FlowerRenderer.drawFlower(
            this.offCtx,
            'petal',
            el.x,
            el.y,
            size * 1.1,
            rotation,
            activeHueOffset,
            el.currentScale
          );
        }
      });

      this.offCtx.restore();
    }

    // 3. Spawn subtle golden sparkles around the heart only, or soft pink petals/glow around surprise
    if ((phase === 'bloom_heart' || phase === 'travel') && STATE.particlesEnabled && Math.random() < 0.25) {
      const theta = Math.random() * Math.PI * 2;
      const hx_base = 16 * Math.pow(Math.sin(theta), 3);
      const hy_base = -(13 * Math.cos(theta) - 5 * Math.cos(2 * theta) - 2 * Math.cos(3 * theta) - Math.cos(4 * theta));

      const pulse = 1.0 + 0.03 * Math.sin(timestamp * 0.0035);
      const swayX = Math.sin(timestamp * 0.001) * 12;
      const swayY = Math.cos(timestamp * 0.0015) * 6;

      const offsetFactor = 0.85 + Math.random() * 0.3;
      const hx = center.x + hx_base * (heartSize / 16) * offsetFactor * pulse + swayX + (Math.random() - 0.5) * 10;
      const hy = center.y + hy_base * (heartSize / 16) * offsetFactor * pulse + swayY + (Math.random() - 0.5) * 10;

      this.particlePool.spawn(
        hx,
        hy,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5 - 0.25, // slow upward float
        4 + Math.random() * 4,
        30 + Math.random() * 20,
        'sparkle',
        45 // gold hue
      );
    } else if (phase === 'surprise_bloom' && STATE.particlesEnabled && Math.random() < 0.35) {
      // Spawn soft pink sparkles/glow around letters
      const rx = center.x + (Math.random() - 0.5) * heartSize;
      const ry = center.y + (Math.random() - 0.5) * (heartSize * 0.4) - 20;

      this.particlePool.spawn(
        rx,
        ry,
        (Math.random() - 0.5) * 0.8 + this.windX * 0.8,
        0.3 + Math.random() * 0.8,
        4 + Math.random() * 4,
        80,
        'sparkle',
        345 // soft pink
      );
    }

    // 4. Slowly emit a few falling petals from the heart or surprise Fatima
    if ((phase === 'bloom_heart' || phase === 'travel') && STATE.particlesEnabled && Math.random() < 0.08) {
      const theta = Math.random() * Math.PI * 2;
      const hx_base = 16 * Math.pow(Math.sin(theta), 3);
      const hy_base = -(13 * Math.cos(theta) - 5 * Math.cos(2 * theta) - 2 * Math.cos(3 * theta) - Math.cos(4 * theta));

      const pulse = 1.0 + 0.03 * Math.sin(timestamp * 0.0035);
      const swayX = Math.sin(timestamp * 0.001) * 12;
      const swayY = Math.cos(timestamp * 0.0015) * 6;

      const hx = center.x + hx_base * (heartSize / 16) * pulse + swayX;
      const hy = center.y + hy_base * (heartSize / 16) * pulse + swayY;

      this.particlePool.spawn(
        hx,
        hy,
        (Math.random() - 0.5) * 0.6 + this.windX,
        0.5 + Math.random() * 0.8,
        8 + Math.random() * 6,
        120 + Math.random() * 60,
        'petal',
        340 // pink hue
      );
    } else if (phase === 'surprise_bloom' && STATE.particlesEnabled && Math.random() < 0.12) {
      // Tiny falling petals under the word Fatima
      const rx = center.x + (Math.random() - 0.5) * heartSize;
      const ry = center.y + (Math.random() - 0.5) * (heartSize * 0.3) - 10;

      this.particlePool.spawn(
        rx,
        ry,
        (Math.random() - 0.5) * 0.8 + this.windX,
        0.4 + Math.random() * 0.8,
        6 + Math.random() * 5,
        150 + Math.random() * 50,
        'petal',
        345 // soft cherry blossom pink
      );
    }
  }

  // Help calculate scale dimensions depending on camera sizing aspect
  getCanvasScaleWidth() {
    const videoWidth = this.video.videoWidth;
    const videoHeight = this.video.videoHeight;
    if (!videoWidth || !videoHeight) return this.canvas.width;

    const videoAspect = videoWidth / videoHeight;
    const canvasAspect = this.canvas.width / this.canvas.height;

    if (canvasAspect > videoAspect) {
      return this.canvas.width;
    } else {
      return this.canvas.height * videoAspect;
    }
  }

  // Draw structural debugging bones skeleton
  drawDebugSkeleton(ctx) {
    this.currentRawLandmarks.forEach((handLandmarks) => {
      ctx.save();
      ctx.strokeStyle = 'rgba(209, 179, 255, 0.45)';
      ctx.lineWidth = 2.0;

      HAND_CONNECTIONS.forEach(([start, end]) => {
        const p1 = handLandmarks[start];
        const p2 = handLandmarks[end];

        if (p1 && p2) {
          const c1 = this.getCanvasCoords(p1);
          const c2 = this.getCanvasCoords(p2);
          ctx.beginPath();
          ctx.moveTo(c1.x, c1.y);
          ctx.lineTo(c2.x, c2.y);
          ctx.stroke();
        }
      });
      ctx.restore();

      // Render structural joints nodes
      ctx.save();
      handLandmarks.forEach((lm, idx) => {
        const c = this.getCanvasCoords(lm);
        ctx.beginPath();
        ctx.arc(c.x, c.y, 4, 0, Math.PI * 2);

        if ([4, 8, 12, 16, 20].includes(idx)) {
          ctx.fillStyle = '#ffb7c5'; // fingertips
        } else {
          ctx.fillStyle = '#d1b3ff'; // nodes
        }
        ctx.fill();
      });
      ctx.restore();
    });
  }

  drawDebugPanel(ctx) {
    ctx.save();

    // Position parameters
    const x = 20;
    const y = 100;
    const w = 260;
    const h = 180;
    const radius = 12;

    // Draw glassmorphic container background
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(209, 179, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Header
    ctx.font = 'bold 11px "Outfit", sans-serif';
    ctx.fillStyle = '#ffb7c5';
    ctx.fillText('🌸 FINGER BLOOM DEBUG TRACKER', x + 15, y + 25);

    // Draw separator line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(x + 15, y + 35);
    ctx.lineTo(x + w - 15, y + 35);
    ctx.stroke();

    // Data list
    ctx.font = '11px "Inter", sans-serif';

    // Row renderer helper
    const drawRow = (label, val, rowIdx, color = '#f8f8fa') => {
      const rowY = y + 55 + rowIdx * 16;
      ctx.fillStyle = '#a2a2b5';
      ctx.fillText(label, x + 15, rowY);
      ctx.fillStyle = color;
      ctx.fillText(val, x + w - 15 - ctx.measureText(val).width, rowY);
    };

    const activeHands = Array.from(this.activeHandsThisFrame);
    const handLabelVal = activeHands.length > 0 ? activeHands.join(' + ') : 'None';

    // Left/Right gestures
    const leftG = this.gesturesThisFrame.Left || 'none';
    const rightG = this.gesturesThisFrame.Right || 'none';
    const gestureVal = `L: ${leftG.toUpperCase()} | R: ${rightG.toUpperCase()}`;

    const confidenceVal = STATE.detectionConfidence.toFixed(2);
    const particleCount = this.particlePool.pool.filter(p => p.active).length;
    const facingVal = this.facingMode === 'user' ? 'Front (Mirrored)' : 'Rear';

    drawRow('Camera Orientation', facingVal, 0);
    drawRow('Tracked Hands', handLabelVal, 1, activeHands.length > 0 ? '#9effeb' : '#a2a2b5');
    drawRow('Gestures Recognized', gestureVal, 2, (leftG !== 'none' || rightG !== 'none') ? '#ffe49e' : '#a2a2b5');
    drawRow('Detection Confidence', confidenceVal, 3);
    drawRow('Flower Style Spec', STATE.flowerStyle.toUpperCase(), 4, '#ffb7c5');
    drawRow('Active Particles', `${particleCount} / 1200`, 5);
    drawRow('Engine Mode', this.performanceMonitor.mode.toUpperCase(), 6, '#d1b3ff');

    ctx.restore();
  }

  // Captures current viewport canvas rendering data and triggers direct download
  takeSnapshot() {
    // Sparkle confirmation play chime
    this.soundSynth.playSparkle();

    // Save image trigger download
    const link = document.createElement('a');
    link.download = `finger-bloom-pro-${Date.now()}.png`;
    link.href = this.canvas.toDataURL('image/png');
    link.click();

    this.uiManager.showGestureToast("📸 Snapshot Taken!");
  }

  randomizeHandFlowers(handLabel) {
    const styles = ['cherry', 'rose', 'daisy', 'sunflower', 'tulip', 'lotus', 'lavender', 'hibiscus', 'crystal', 'magical'];
    for (let f = 0; f < 5; f++) {
      this.handFingerFlowers[handLabel][f] = styles[Math.floor(Math.random() * styles.length)];
    }
  }

  randomizeAllActiveHandFlowers() {
    const handKeys = ['Left', 'Right'];
    handKeys.forEach(handKey => {
      if (this.activeHandsThisFrame.has(handKey)) {
        this.randomizeHandFlowers(handKey);
      }
    });
  }

  updateLoaderStatus(message, percentage) {
    this.loadingStatus.textContent = message;
    this.loadingBar.style.width = `${percentage}%`;
  }

  showError(message) {
    this.loadingOverlay.style.display = 'none';
    this.errorMessage.textContent = message;
    this.errorOverlay.style.display = 'flex';
  }

  async bootSequence() {
    try {
      await this.initCamera();
      await this.detectCameras();
      this.initMediaPipe();
    } catch (err) {
      // Error handling executed in sub-routines
    }
  }
}

// --- BOOTSTRAP INITIALIZATION ENGINE ---
window.addEventListener('DOMContentLoaded', () => {
  const app = new FingerBloomApp();
  app.bootSequence();
});
